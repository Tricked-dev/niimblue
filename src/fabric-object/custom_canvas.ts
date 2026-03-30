import * as fabric from "fabric";
import { DEFAULT_LABEL_PROPS } from "$/defaults";
import type { LabelProps } from "$/types";

type LabelBounds = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  height: number;
};
type FoldSegment = { start: number; end: number };
type FoldInfo = {
  axis: "vertical" | "horizontal" | "none";
  points: number[];
  segments: FoldSegment[];
};
type MirrorInfo = { pos: fabric.Point; flip: boolean };

export class CustomCanvas extends fabric.Canvas {
  private labelProps: LabelProps = DEFAULT_LABEL_PROPS;
  private readonly SEPARATOR_LINE_WIDTH = 2;
  private readonly ROUND_RADIUS = 10;
  private readonly TAIL_WIDTH = 40;
  private readonly GRAY = "#CFCFCF";
  private readonly MIRROR_GHOST_COLOR = "rgba(0, 0, 0, 0.3)";
  private customBackground: boolean = true;
  private highlightMirror: boolean = true;
  private virtualZoomRatio: number = 1;
  private scrollWrapper: HTMLElement | null = null;
  private pinchPointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist: number = 0;
  private pinchStartZoom: number = 1;
  private isMiddleDragging: boolean = false;
  private middleDragStartClient: { x: number; y: number } = { x: 0, y: 0 };
  private middleDragStartScroll: { x: number; y: number } = { x: 0, y: 0 };
  private canvasContainerPadding: number = 3000;
  private middleClickActive: boolean = false;

  constructor(
    el?: string | HTMLCanvasElement,
    options?: fabric.TOptions<fabric.CanvasOptions>,
  ) {
    super(el, options);
    this.setupZoom();
    this.preserveObjectStacking = true;
    // Prevent CSS scaling blur when the canvas element is zoomed
    this.getElement().style.imageRendering = "pixelated";
  }

  setScrollWrapper(wrapper: HTMLElement, containerPadding = 3000) {
    this.scrollWrapper = wrapper;
    this.canvasContainerPadding = containerPadding;
    this.setupPinch(wrapper);
    this.setupWrapperWheel(wrapper);
    this.setupMiddleDrag(wrapper);
  }

  private setupZoom() {
    this.on("mouse:wheel", (opt) => {
      const event = opt.e as WheelEvent;
      event.preventDefault();

      // Shift + scroll → horizontal pan (no zoom)
      if (event.shiftKey && !event.ctrlKey && !event.altKey) {
        if (this.scrollWrapper) {
          this.scrollWrapper.scrollLeft += event.deltaY;
        }
        return;
      }

      const rect = this.getElement().getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;

      // Ctrl / Alt → 3× faster zoom
      const speed = event.ctrlKey || event.altKey ? 3 : 1;
      const step = 0.05 * speed;
      const factor = event.deltaY > 0 ? 1 - step : 1 + step;
      this.zoomAroundPoint(cursorX, cursorY, factor);
    });
  }

  /** Zoom via scroll wheel even when cursor is over the wrapper (not the canvas) */
  private setupWrapperWheel(wrapper: HTMLElement) {
    wrapper.addEventListener("wheel", (e: WheelEvent) => {
      // Skip if the event originated from inside the canvas container —
      // fabric's own handler already deals with that.
      const canvasContainer = this.getElement().parentElement;
      if (canvasContainer && canvasContainer.contains(e.target as Node)) return;

      e.preventDefault();

      if (e.shiftKey && !e.ctrlKey && !e.altKey) {
        wrapper.scrollLeft += e.deltaY;
        return;
      }

      // Use canvas position as zoom reference even when cursor is outside
      const canvasRect = this.getElement().getBoundingClientRect();
      const canvasX = e.clientX - canvasRect.left;
      const canvasY = e.clientY - canvasRect.top;

      const speed = e.ctrlKey || e.altKey ? 3 : 1;
      const step = 0.05 * speed;
      const factor = e.deltaY > 0 ? 1 - step : 1 + step;
      this.zoomAroundPoint(canvasX, canvasY, factor);
    }, { passive: false });
  }

  /** Middle-click drag → pan the scroll wrapper */
  private setupMiddleDrag(wrapper: HTMLElement) {
    // Prevent X11 primary-selection paste on Linux using multiple interception points.
    // auxclick covers modern browsers; mouseup covers older/distro-specific behaviour.
    window.addEventListener("auxclick", (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    }, { capture: true });
    window.addEventListener("mouseup", (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    }, { capture: true });
    // Block paste event when middle-click is active (belt-and-suspenders).
    window.addEventListener("paste", (e: ClipboardEvent) => {
      if (this.middleClickActive) { e.preventDefault(); e.stopPropagation(); }
    }, { capture: true });

    // Intercept before fabric sees the event, preventing accidental object creation.
    window.addEventListener("mousedown", (e: MouseEvent) => {
      if (e.button !== 1) return;
      this.middleClickActive = true;
      e.preventDefault();
    }, { capture: true });

    wrapper.addEventListener("mousedown", (e: MouseEvent) => {
      if (e.button !== 1) return;
      e.stopPropagation();
      this.isMiddleDragging = true;
      this.middleDragStartClient = { x: e.clientX, y: e.clientY };
      this.middleDragStartScroll = { x: wrapper.scrollLeft, y: wrapper.scrollTop };
      wrapper.style.cursor = "grabbing";
    }, { capture: true });

    document.addEventListener("mousemove", (e: MouseEvent) => {
      if (!this.isMiddleDragging || !this.scrollWrapper) return;
      const dx = e.clientX - this.middleDragStartClient.x;
      const dy = e.clientY - this.middleDragStartClient.y;
      this.scrollWrapper.scrollLeft = this.middleDragStartScroll.x - dx;
      this.scrollWrapper.scrollTop = this.middleDragStartScroll.y - dy;
    });

    document.addEventListener("mouseup", (e: MouseEvent) => {
      if (e.button !== 1) return;
      this.isMiddleDragging = false;
      if (this.scrollWrapper) this.scrollWrapper.style.cursor = "";
      // Keep paste suppression active briefly to catch late-firing X11 paste events
      setTimeout(() => { this.middleClickActive = false; }, 100);
    });
  }

  private setupPinch(wrapper: HTMLElement) {
    wrapper.addEventListener(
      "pointerdown",
      (e) => {
        this.pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pinchPointers.size === 2) {
          const pts = Array.from(this.pinchPointers.values());
          this.pinchStartDist = Math.hypot(
            pts[1].x - pts[0].x,
            pts[1].y - pts[0].y,
          );
          this.pinchStartZoom = this.virtualZoomRatio;
        }
      },
      { passive: true },
    );

    wrapper.addEventListener(
      "pointermove",
      (e) => {
        if (!this.pinchPointers.has(e.pointerId)) return;
        this.pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pinchPointers.size === 2) {
          const pts = Array.from(this.pinchPointers.values());
          const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          if (this.pinchStartDist > 0) {
            const newZoom = this.pinchStartZoom * (dist / this.pinchStartDist);
            this.virtualZoom(newZoom);
          }
        }
      },
      { passive: true },
    );

    const clearPointer = (e: PointerEvent) => {
      this.pinchPointers.delete(e.pointerId);
      this.pinchStartDist = 0;
    };
    wrapper.addEventListener("pointerup", clearPointer, { passive: true });
    wrapper.addEventListener("pointercancel", clearPointer, { passive: true });
  }

  zoomAroundPoint(canvasX: number, canvasY: number, factor: number) {
    const oldZoom = this.virtualZoomRatio;
    const newZoom = Math.min(Math.max(0.1, oldZoom * factor), 20);
    if (this.scrollWrapper) {
      const P = this.canvasContainerPadding;
      const wrapW = this.scrollWrapper.clientWidth;
      const wrapH = this.scrollWrapper.clientHeight;
      const oldCssW = this.getWidth() * oldZoom;
      const oldCssH = this.getHeight() * oldZoom;
      // Canvas content-space position (padding + flexbox centering), purely from state — no DOM reads
      const oldCanvasContentX = P + Math.max(0, (wrapW - oldCssW) / 2);
      const oldCanvasContentY = P + Math.max(0, (wrapH - oldCssH) / 2);
      // Canvas screen position = content position - scroll
      const oldCanvasScreenX = oldCanvasContentX - this.scrollWrapper.scrollLeft;
      const oldCanvasScreenY = oldCanvasContentY - this.scrollWrapper.scrollTop;
      // Label pixel under cursor (invariant across zoom)
      const labelPxX = canvasX / oldZoom;
      const labelPxY = canvasY / oldZoom;
      this.virtualZoom(newZoom);
      const newCssW = this.getWidth() * newZoom;
      const newCssH = this.getHeight() * newZoom;
      const newCanvasContentX = P + Math.max(0, (wrapW - newCssW) / 2);
      const newCanvasContentY = P + Math.max(0, (wrapH - newCssH) / 2);
      // Keep cursor at same screen position
      this.scrollWrapper.scrollLeft = newCanvasContentX - oldCanvasScreenX - canvasX + labelPxX * newZoom;
      this.scrollWrapper.scrollTop  = newCanvasContentY - oldCanvasScreenY - canvasY + labelPxY * newZoom;
    } else {
      this.virtualZoom(newZoom);
    }
  }

  public virtualZoom(newZoom: number) {
    this.virtualZoomRatio = Math.min(Math.max(0.1, newZoom), 20);
    this.setDimensions(
      {
        width: this.virtualZoomRatio * this.getWidth() + "px",
        height: this.virtualZoomRatio * this.getHeight() + "px",
      },
      { cssOnly: true },
    );
    this.fire("viewport:changed" as any, { zoom: this.virtualZoomRatio });
  }

  public virtualZoomIn() {
    this.virtualZoom(this.virtualZoomRatio * 1.1);
  }

  public virtualZoomOut() {
    this.virtualZoom(this.virtualZoomRatio * 0.9);
  }

  public getVirtualZoom(): number {
    return this.virtualZoomRatio;
  }

  public resetVirtualZoom() {
    this.virtualZoom(1);
  }

  public fitToWrapper() {
    if (!this.scrollWrapper || this.scrollWrapper.clientWidth === 0) {
      // Wrapper not ready yet — retry next frame
      requestAnimationFrame(() => this.fitToWrapper());
      return;
    }
    const wrapW = this.scrollWrapper.clientWidth;
    const wrapH = this.scrollWrapper.clientHeight;
    const zoomX = wrapW / this.getWidth();
    const zoomY = wrapH / this.getHeight();
    this.virtualZoom(Math.min(zoomX, zoomY) * 0.9);
    // Reading scrollWidth/scrollHeight after setting CSS dimensions triggers a
    // synchronous reflow, giving the true content size — no need to predict it.
    this.scrollWrapper.scrollLeft = (this.scrollWrapper.scrollWidth - wrapW) / 2;
    this.scrollWrapper.scrollTop  = (this.scrollWrapper.scrollHeight - wrapH) / 2;
  }

  setLabelProps(value: LabelProps) {
    this.labelProps = value;
    this.requestRenderAll();
  }

  setCustomBackground(value: boolean) {
    this.customBackground = value;
  }

  setHighlightMirror(value: boolean) {
    this.highlightMirror = value;
  }

  /** Get label bounds without tail */
  getLabelBounds(): LabelBounds {
    let endX = this.width ?? 1;
    let endY = this.height ?? 1;
    let startX = 0;
    let startY = 0;

    if (this.labelProps.tailPos === "right") {
      endX -= this.labelProps.tailLength ?? 0;
    } else if (this.labelProps.tailPos === "bottom") {
      endY -= this.labelProps.tailLength ?? 0;
    } else if (this.labelProps.tailPos === "left") {
      startX += this.labelProps.tailLength ?? 0;
    } else if (this.labelProps.tailPos === "top") {
      startY += this.labelProps.tailLength ?? 0;
    }

    const width = endX - startX;
    const height = endY - startY;

    return { startX, startY, endX, endY, width, height };
  }

  /** Get fold line position for splitted labels */
  getFoldInfo(): FoldInfo {
    const bb = this.getLabelBounds();
    const points: number[] = [];
    const segments: FoldSegment[] = [];
    const splitParts = this.labelProps.splitParts ?? 2;

    if (splitParts < 2) {
      return { axis: "none", points, segments };
    }

    if (this.labelProps.split === "horizontal") {
      const segmentHeight = bb.height / splitParts;
      let lastY: number = bb.startY;

      for (let i = 1; i < splitParts; i++) {
        const y =
          bb.startY + segmentHeight * i - this.SEPARATOR_LINE_WIDTH / 2 + 1;
        points.push(y);
        segments.push({ start: lastY, end: y });
        lastY = y;
      }

      segments.push({ start: lastY, end: bb.endY });

      return { axis: "horizontal", points, segments };
    } else if (this.labelProps.split === "vertical") {
      const segmentWidth = bb.width / splitParts;
      let lastX: number = bb.startX;

      for (let i = 1; i < splitParts; i++) {
        const x =
          bb.startX + segmentWidth * i - this.SEPARATOR_LINE_WIDTH / 2 + 1;
        points.push(x);
        segments.push({ start: lastX, end: x });
        lastX = x;
      }

      segments.push({ start: lastX, end: bb.endX });

      return { axis: "vertical", points, segments };
    }

    return { axis: "none", points, segments };
  }

  override _renderBackground(ctx: CanvasRenderingContext2D) {
    if (this.width === undefined || this.height === undefined) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "white";

    // Draw simple white background and exit
    if (!this.customBackground) {
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
      return;
    }

    // Disable further actions for circle labels, just render
    if (this.labelProps.shape === "circle") {
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height / 2, this.height / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
      return;
    }

    let roundRadius = this.ROUND_RADIUS;
    const bb = this.getLabelBounds();
    const fold = this.getFoldInfo();

    if (this.labelProps.shape !== "rounded_rect") {
      roundRadius = 0;
    }

    // Draw tail
    ctx.fillStyle = this.GRAY;

    ctx.beginPath();
    if (
      this.labelProps.tailLength !== undefined &&
      this.labelProps.tailLength > 0
    ) {
      if (this.labelProps.tailPos === "right") {
        ctx.rect(
          bb.endX - roundRadius,
          bb.endY / 2 - this.TAIL_WIDTH / 2,
          this.width - bb.endX + roundRadius,
          this.TAIL_WIDTH,
        );
      } else if (this.labelProps.tailPos === "bottom") {
        ctx.rect(
          bb.endX / 2 - this.TAIL_WIDTH / 2,
          bb.endY - roundRadius,
          this.TAIL_WIDTH,
          this.height - bb.endY + roundRadius,
        );
      } else if (this.labelProps.tailPos === "left") {
        ctx.rect(
          0,
          bb.endY / 2 - this.TAIL_WIDTH / 2,
          bb.startX + roundRadius,
          this.TAIL_WIDTH,
        );
      } else if (this.labelProps.tailPos === "top") {
        ctx.rect(
          bb.endX / 2 - this.TAIL_WIDTH / 2,
          0,
          this.TAIL_WIDTH,
          bb.startY + roundRadius,
        );
      }
    }
    ctx.fill();

    // Draw label(s)
    ctx.fillStyle = "white";

    ctx.beginPath();

    const splitParts = this.labelProps.splitParts ?? 2;

    if (this.labelProps.shape === "rounded_rect") {
      if (this.labelProps.split === "horizontal") {
        const segmentHeight = bb.height / splitParts;
        ctx.roundRect(
          bb.startX,
          bb.startY,
          bb.width,
          segmentHeight,
          roundRadius,
        ); // First part
        fold.points.forEach((y) =>
          ctx.roundRect(bb.startX, y, bb.width, segmentHeight, roundRadius),
        ); // Other parts
      } else if (this.labelProps.split === "vertical") {
        const segmentWidth = bb.width / splitParts;
        ctx.roundRect(
          bb.startX,
          bb.startY,
          segmentWidth,
          bb.height,
          roundRadius,
        ); // First part
        fold.points.forEach((x) =>
          ctx.roundRect(x, bb.startY, segmentWidth, bb.height, roundRadius),
        ); // Other parts
      } else {
        ctx.roundRect(0, 0, this.width, this.height, roundRadius);
      }
    } else {
      ctx.rect(bb.startX, bb.startY, bb.width, bb.height);
    }

    ctx.fill();

    // Draw separator

    ctx.strokeStyle = this.GRAY;
    ctx.lineWidth = this.SEPARATOR_LINE_WIDTH;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();

    if (fold.axis === "horizontal") {
      fold.points.forEach((x) => {
        ctx.moveTo(bb.startX + roundRadius, x);
        ctx.lineTo(bb.endX - roundRadius, x);
      });
    } else if (fold.axis === "vertical") {
      fold.points.forEach((y) => {
        ctx.moveTo(y, bb.startY + roundRadius);
        ctx.lineTo(y, bb.endY - roundRadius);
      });
    }

    ctx.stroke();

    ctx.restore();
  }

  override _renderObjects(
    ctx: CanvasRenderingContext2D,
    objects: fabric.FabricObject[],
  ) {
    super._renderObjects(ctx, objects);

    if (!this.highlightMirror || this.getActiveObjects().length > 1) {
      return;
    }

    ctx.save();

    objects.forEach((obj) => {
      const infos = this.getMirroredObjectCoords(obj);
      infos.forEach((info) => {
        const bbox = obj.getBoundingRect();
        ctx.fillStyle = this.MIRROR_GHOST_COLOR;
        ctx.fillRect(
          info.pos.x - bbox.width / 2,
          info.pos.y - bbox.height / 2,
          bbox.width,
          bbox.height,
        );
        ctx.restore();
      });
    });
    ctx.restore();
  }

  /**
   * Return new object positions (origin is center) if object needs mirroring
   **/
  getMirroredObjectCoords(obj: fabric.FabricObject): MirrorInfo[] {
    const fold = this.getFoldInfo();
    const result: MirrorInfo[] = [];

    if (
      fold.axis === "none" ||
      !(this.labelProps.mirror === "flip" || this.labelProps.mirror === "copy")
    ) {
      return result;
    }

    const bounds = this.getLabelBounds();

    if (fold.axis === "vertical") {
      if (this.labelProps.mirror === "copy") {
        fold.points.forEach((x) => {
          const pos = obj.getPointByOrigin("center", "center");
          pos.setX(x + (pos.x - bounds.startX));
          result.push({ pos, flip: false });
        });
      } else if (
        this.labelProps.mirror === "flip" &&
        fold.points.length === 1
      ) {
        // Half split only supported
        const axisX = fold.points[0];
        const pos = obj.getPointByOrigin("center", "center");
        pos.setX(axisX + (axisX - pos.x));
        pos.setY(bounds.startY + bounds.endY - pos.y);
        result.push({ pos, flip: true });
      }
    } else if (fold.axis === "horizontal") {
      if (this.labelProps.mirror === "copy") {
        fold.points.forEach((y) => {
          const pos = obj.getPointByOrigin("center", "center");
          pos.setY(y + (pos.y - bounds.startY));
          result.push({ pos, flip: false });
        });
      } else if (
        this.labelProps.mirror === "flip" &&
        fold.points.length === 1
      ) {
        // Half split only supported
        const axisY = fold.points[0];
        const pos = obj.getPointByOrigin("center", "center");
        pos.setY(axisY + (axisY - pos.y));
        pos.setX(bounds.startX + bounds.endX - pos.x);
        result.push({ pos, flip: true });
      }
    }

    return result;
  }

  /** Clone mirrored objects and add them to canvas */
  async createMirroredObjects() {
    const objects = this.getObjects();
    for (const obj of objects) {
      const infos = this.getMirroredObjectCoords(obj);

      for (const info of infos) {
        const newObj = await obj.clone();
        newObj.setPositionByOrigin(info.pos, "center", "center");
        if (info.flip) {
          newObj.centeredRotation = true;
          newObj.rotate((newObj.angle + 180) % 360);
        }
        this.add(newObj);
      }
    }
  }

  /** Centers object horizontally in the canvas or label part */
  override centerObjectH(object: fabric.FabricObject): void {
    if ((this.labelProps.split ?? "none") !== "none") {
      const pos = object.getPointByOrigin("center", "center");
      const bounds = this.getLabelBounds();
      const fold = this.getFoldInfo();
      let centerX = bounds.startX + bounds.width / 2;

      if (fold.axis !== "horizontal") {
        fold.segments.forEach((seg) => {
          if (pos.x >= seg.start && pos.x <= seg.end) {
            centerX = seg.start + (seg.end - seg.start) / 2;
          }
        });
      }
      pos.setX(centerX);

      object.setPositionByOrigin(pos, "center", "center");
      return;
    }

    super.centerObjectH(object);
  }

  /** Centers object vertically in the canvas or label part */
  override centerObjectV(object: fabric.FabricObject): void {
    if ((this.labelProps.split ?? "none") !== "none") {
      const pos = object.getPointByOrigin("center", "center");
      const bounds = this.getLabelBounds();
      const fold = this.getFoldInfo();
      let centerY = bounds.startY + bounds.height / 2;

      if (fold.axis !== "vertical") {
        fold.segments.forEach((seg) => {
          if (pos.y >= seg.start && pos.y <= seg.end) {
            centerY = seg.start + (seg.end - seg.start) / 2;
          }
        });
      }

      pos.setY(centerY);
      object.setPositionByOrigin(pos, "center", "center");
      return;
    }

    super.centerObjectV(object);
  }
}
