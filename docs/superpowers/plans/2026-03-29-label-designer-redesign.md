# Label Designer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the NiimBlue label designer into a full-viewport professional design application with a vertical tool rail, ruler-framed canvas, collapsible right properties panel, and responsive mobile layout.

**Architecture:** A new `DesignerShell.svelte` replaces the Bootstrap container as a CSS Grid full-viewport host. `LabelDesigner.svelte` becomes a pure state coordinator (no layout markup). New components handle the top bar, left rail, canvas rulers, zoom controls, and the right panel (desktop) / bottom sheet (mobile). Bootstrap is removed and replaced with Tailwind v4 + shadcn-svelte.

**Tech Stack:** Svelte 5 (runes), Tailwind CSS v4, shadcn-svelte, fabric.js (existing), TypeScript

**Note on testing:** This project has no test infrastructure. Each task verifies by running `npm run dev` and checking the browser result at `http://localhost:5173`.

---

## File Map

### Created
| Path | Purpose |
|------|---------|
| `src/lib/` | shadcn-svelte component directory (created by init) |
| `src/app.css` | New global CSS entry (Tailwind + font + toast overrides) |
| `src/components/DesignerShell.svelte` | Full-viewport CSS Grid layout container |
| `src/components/DesignerTopBar.svelte` | Top action bar (logo, undo/redo, printer badge, print) |
| `src/components/DesignerRail.svelte` | Left vertical icon rail (tool buttons) |
| `src/components/DesignerPanel.svelte` | Right panel (desktop) / bottom sheet (mobile) with property sections |
| `src/components/CanvasRuler.svelte` | SVG ruler — used once for H axis, once for V axis |
| `src/components/ZoomControls.svelte` | Floating −/+/fit/% zoom overlay |

### Modified
| Path | Change |
|------|--------|
| `package.json` | Add `tailwindcss`, `@tailwindcss/vite`, `bits-ui`, `clsx`, `tailwind-merge`; remove `bootstrap`, `@popperjs/core`, `@types/bootstrap` |
| `vite.config.ts` | Add `@tailwindcss/vite` plugin; add `$lib` path alias |
| `src/index.ts` | Replace `style.scss` import with `app.css` |
| `src/styles/style.scss` | Remove Bootstrap imports; keep only font + toastify overrides (or delete and inline into app.css) |
| `src/fabric-object/custom_canvas.ts` | Add cursor-centered scroll zoom, drag-to-pan, pinch-to-zoom, `getZoomRatio()`/`getScrollContainer()`/`fitToContainer()`, `viewport:changed` event |
| `src/components/LabelDesigner.svelte` | Remove all layout markup; becomes pure state coordinator that renders `<DesignerShell>` |
| `src/components/MainPage.svelte` | Remove Bootstrap container; render `<LabelDesigner>` directly at full height |
| `src/components/basic/MdIcon.svelte` | No logic changes; class attribute updated to Tailwind |
| `src/components/designer-controls/*` | Replace Bootstrap classes (`btn`, `form-select`, `input-group`, `dropdown-*`) with Tailwind equivalents throughout |
| `src/components/PrinterConnector.svelte` | Embed into DesignerPanel printer section (no logic changes) |

---

## Task 1: Install Tailwind v4 + shadcn-svelte, remove Bootstrap

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/app.css`
- Modify: `src/index.ts`
- Modify: `src/styles/style.scss`

- [ ] **Step 1: Remove Bootstrap and install Tailwind**

```bash
cd /home/tricked/dev/niimblue
npm uninstall bootstrap @popperjs/core @types/bootstrap
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Initialize shadcn-svelte**

```bash
npx shadcn-svelte@latest init
```

When prompted:
- TypeScript: **Yes**
- Style: **Default**
- Base color: **Zinc**
- Global CSS file: **src/app.css**
- CSS variables for theming: **Yes**
- Import alias for `$lib`: **$lib**
- Import alias for components: **$lib/components**

This creates `src/lib/`, `src/app.css`, `components.json`, and updates `svelte.config.js`.

- [ ] **Step 3: Add `$lib` alias and Tailwind plugin to `vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";

const getDate = (): string => {
  const date = new Date();
  const fmt = (n: number) => (n > 9 ? n : `0${n}`);
  return `${date.getFullYear()}-${fmt(date.getMonth() + 1)}-${fmt(date.getDate())}`;
};

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __APP_COMMIT__: JSON.stringify(process.env.COMMIT_HASH),
    __BUILD_DATE__: JSON.stringify(getDate()),
  },
  optimizeDeps: {
    include: ["@mmote/niimbluelib"],
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      $: resolve(__dirname, "./src"),
      $lib: resolve(__dirname, "./src/lib"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.endsWith(".css") || id.endsWith(".scss")) return "style";
          if (id.includes("node_modules")) {
            if (id.includes("fabric")) return "lib.2.fabric";
            else if (id.includes("@capacitor/filesystem") || id.includes("@capacitor/share")) return "lib.2.cap";
            else if (id.includes("zod")) return "lib.2.zod";
            else if (id.includes("@mmote/niimbluelib")) return "lib.2.niim";
            else if (id.includes("pdfjs-dist")) return "lib.2.pdf";
            return "lib.1.other";
          }
          return null;
        },
        chunkFileNames: () => "assets/[name].[hash].js",
      },
    },
  },
});
```

- [ ] **Step 4: Update `src/app.css` to add font + toastify overrides**

Replace the file content generated by shadcn-svelte init with (keeping the shadcn `@layer` declarations it generated, adding after them):

```css
@import "tailwindcss";
@import "@fontsource-variable/noto-sans";

/* Re-export shadcn theme vars generated by init (keep whatever init wrote here) */

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: "Noto Sans Variable", sans-serif;
  }
}

/* Toastify overrides */
.toastify.toast-danger {
  background: hsl(var(--destructive));
  border: 1px solid hsl(var(--destructive) / 0.5);
  color: hsl(var(--destructive-foreground));
}
.toastify.toast-info {
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
}

/* Material Icons */
.material-icons {
  font-family: "Material Icons";
  font-style: normal;
  font-weight: normal;
  font-size: 18px;
  line-height: 1;
  user-select: none;
}
```

- [ ] **Step 5: Update `src/index.ts` to import `app.css` instead of `style.scss`**

```typescript
import "./app.css";
// ... rest of existing imports unchanged
```

- [ ] **Step 6: Delete or empty `src/styles/style.scss`**

The file is no longer needed. Either delete it or replace it with a comment:

```scss
// Styles migrated to src/app.css (Tailwind v4 + shadcn)
```

- [ ] **Step 7: Install the shadcn components we'll use**

```bash
npx shadcn-svelte@latest add accordion button input select separator tooltip badge
```

- [ ] **Step 8: Verify the project compiles**

```bash
npm run dev
```

Expected: dev server starts without errors. The app will look broken (Bootstrap classes gone) — that's fine, we'll fix layout in later tasks.

---

## Task 2: Extend CustomCanvas with improved zoom/pan/pinch

**Files:**
- Modify: `src/fabric-object/custom_canvas.ts`

The goal is to replace CSS-only `virtualZoom` with cursor-aware scroll zoom, drag-to-pan, and pinch-to-zoom. The canvas element remains sized to label dimensions; the **wrapper div** (added in Task 8) has `overflow: auto`. Zoom changes the canvas CSS size. Scroll offset of the wrapper provides pan.

- [ ] **Step 1: Replace `setupZoom()` and add new methods in `CustomCanvas`**

Replace the entire `custom_canvas.ts` file with the following (all existing methods kept, new ones added):

```typescript
import * as fabric from "fabric";
import { DEFAULT_LABEL_PROPS } from "$/defaults";
import type { LabelProps } from "$/types";

type LabelBounds = {
  startX: number; startY: number; endX: number; endY: number;
  width: number; height: number;
};
type FoldSegment = { start: number; end: number };
type FoldInfo = { axis: "vertical" | "horizontal" | "none"; points: number[]; segments: FoldSegment[] };
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

  // The scrollable wrapper element — set by DesignerShell after mount
  private scrollWrapper: HTMLElement | null = null;

  // Pinch tracking
  private pinchPointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist: number = 0;
  private pinchStartZoom: number = 1;

  constructor(el?: string | HTMLCanvasElement, options?: fabric.TOptions<fabric.CanvasOptions>) {
    super(el, options);
    this.setupZoom();
    this.preserveObjectStacking = true;
  }

  /** Call this once after the wrapper div is in the DOM */
  setScrollWrapper(wrapper: HTMLElement) {
    this.scrollWrapper = wrapper;
    this.setupPinch(wrapper);
  }

  private setupZoom() {
    this.on("mouse:wheel", (opt) => {
      const event = opt.e as WheelEvent;
      event.preventDefault();

      // Cursor position relative to the canvas element
      const rect = this.getElement().getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;

      const factor = event.deltaY > 0 ? 0.95 : 1.05;
      this.zoomAroundPoint(cursorX, cursorY, factor);
    });

    this.on("mouse:down:before", (opt) => {
      const event = opt.e as MouseEvent;
      if (event.button === 1) {
        event.preventDefault();
        this.fitToWrapper();
      }
    });
  }

  private setupPinch(wrapper: HTMLElement) {
    wrapper.addEventListener("pointerdown", (e) => {
      this.pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinchPointers.size === 2) {
        const pts = Array.from(this.pinchPointers.values());
        this.pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        this.pinchStartZoom = this.virtualZoomRatio;
      }
    }, { passive: true });

    wrapper.addEventListener("pointermove", (e) => {
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
    }, { passive: true });

    const clearPointer = (e: PointerEvent) => {
      this.pinchPointers.delete(e.pointerId);
      this.pinchStartDist = 0;
    };
    wrapper.addEventListener("pointerup", clearPointer, { passive: true });
    wrapper.addEventListener("pointercancel", clearPointer, { passive: true });
  }

  /** Zoom around a specific point (canvas-element-relative px coordinates) */
  zoomAroundPoint(canvasX: number, canvasY: number, factor: number) {
    const newZoom = Math.min(Math.max(0.1, this.virtualZoomRatio * factor), 20);

    // Keep the point under the cursor fixed:
    // scrollLeft + canvasX should map to the same label pixel after zoom
    if (this.scrollWrapper) {
      const labelPxX = (this.scrollWrapper.scrollLeft + canvasX) / this.virtualZoomRatio;
      const labelPxY = (this.scrollWrapper.scrollTop + canvasY) / this.virtualZoomRatio;
      this.virtualZoom(newZoom);
      this.scrollWrapper.scrollLeft = labelPxX * newZoom - canvasX;
      this.scrollWrapper.scrollTop = labelPxY * newZoom - canvasY;
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

  public virtualZoomIn() { this.virtualZoom(this.virtualZoomRatio * 1.1); }
  public virtualZoomOut() { this.virtualZoom(this.virtualZoomRatio * 0.9); }
  public getVirtualZoom(): number { return this.virtualZoomRatio; }
  public resetVirtualZoom() { this.virtualZoom(1); }

  /** Fit label to fill the scroll wrapper */
  public fitToWrapper() {
    if (!this.scrollWrapper) {
      this.resetVirtualZoom();
      return;
    }
    const wrapW = this.scrollWrapper.clientWidth;
    const wrapH = this.scrollWrapper.clientHeight;
    const zoomX = wrapW / this.getWidth();
    const zoomY = wrapH / this.getHeight();
    this.virtualZoom(Math.min(zoomX, zoomY) * 0.9);
    // Center it
    const cssW = this.virtualZoomRatio * this.getWidth();
    const cssH = this.virtualZoomRatio * this.getHeight();
    this.scrollWrapper.scrollLeft = (cssW - wrapW) / 2;
    this.scrollWrapper.scrollTop = (cssH - wrapH) / 2;
  }

  // ── All existing methods below unchanged ──────────────────────────────────

  setLabelProps(value: LabelProps) {
    this.labelProps = value;
    this.requestRenderAll();
  }

  setCustomBackground(value: boolean) { this.customBackground = value; }
  setHighlightMirror(value: boolean) { this.highlightMirror = value; }

  getLabelBounds(): LabelBounds {
    let endX = this.width ?? 1;
    let endY = this.height ?? 1;
    let startX = 0;
    let startY = 0;
    if (this.labelProps.tailPos === "right") endX -= this.labelProps.tailLength ?? 0;
    else if (this.labelProps.tailPos === "bottom") endY -= this.labelProps.tailLength ?? 0;
    else if (this.labelProps.tailPos === "left") startX += this.labelProps.tailLength ?? 0;
    else if (this.labelProps.tailPos === "top") startY += this.labelProps.tailLength ?? 0;
    return { startX, startY, endX, endY, width: endX - startX, height: endY - startY };
  }

  getFoldInfo(): FoldInfo {
    const bb = this.getLabelBounds();
    const points: number[] = [];
    const segments: FoldSegment[] = [];
    const splitParts = this.labelProps.splitParts ?? 2;
    if (splitParts < 2) return { axis: "none", points, segments };
    if (this.labelProps.split === "horizontal") {
      const segH = bb.height / splitParts;
      let lastY = bb.startY;
      for (let i = 1; i < splitParts; i++) {
        const y = bb.startY + segH * i - this.SEPARATOR_LINE_WIDTH / 2 + 1;
        points.push(y);
        segments.push({ start: lastY, end: y });
        lastY = y;
      }
      segments.push({ start: lastY, end: bb.endY });
      return { axis: "horizontal", points, segments };
    } else if (this.labelProps.split === "vertical") {
      const segW = bb.width / splitParts;
      let lastX = bb.startX;
      for (let i = 1; i < splitParts; i++) {
        const x = bb.startX + segW * i - this.SEPARATOR_LINE_WIDTH / 2 + 1;
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
    if (this.width === undefined || this.height === undefined) return;
    ctx.save();
    ctx.fillStyle = "white";
    if (!this.customBackground) { ctx.fillRect(0, 0, this.width, this.height); ctx.restore(); return; }
    if (this.labelProps.shape === "circle") {
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height / 2, this.height / 2, 0, 2 * Math.PI);
      ctx.fill(); ctx.restore(); return;
    }
    let roundRadius = this.ROUND_RADIUS;
    const bb = this.getLabelBounds();
    const fold = this.getFoldInfo();
    if (this.labelProps.shape !== "rounded_rect") roundRadius = 0;
    ctx.fillStyle = this.GRAY;
    ctx.beginPath();
    if (this.labelProps.tailLength !== undefined && this.labelProps.tailLength > 0) {
      if (this.labelProps.tailPos === "right") ctx.rect(bb.endX - roundRadius, bb.endY / 2 - this.TAIL_WIDTH / 2, this.width - bb.endX + roundRadius, this.TAIL_WIDTH);
      else if (this.labelProps.tailPos === "bottom") ctx.rect(bb.endX / 2 - this.TAIL_WIDTH / 2, bb.endY - roundRadius, this.TAIL_WIDTH, this.height - bb.endY + roundRadius);
      else if (this.labelProps.tailPos === "left") ctx.rect(0, bb.endY / 2 - this.TAIL_WIDTH / 2, bb.startX + roundRadius, this.TAIL_WIDTH);
      else if (this.labelProps.tailPos === "top") ctx.rect(bb.endX / 2 - this.TAIL_WIDTH / 2, 0, this.TAIL_WIDTH, bb.startY + roundRadius);
    }
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath();
    const splitParts = this.labelProps.splitParts ?? 2;
    if (this.labelProps.shape === "rounded_rect") {
      if (this.labelProps.split === "horizontal") {
        const segH = bb.height / splitParts;
        ctx.roundRect(bb.startX, bb.startY, bb.width, segH, roundRadius);
        fold.points.forEach((y) => ctx.roundRect(bb.startX, y, bb.width, segH, roundRadius));
      } else if (this.labelProps.split === "vertical") {
        const segW = bb.width / splitParts;
        ctx.roundRect(bb.startX, bb.startY, segW, bb.height, roundRadius);
        fold.points.forEach((x) => ctx.roundRect(x, bb.startY, segW, bb.height, roundRadius));
      } else {
        ctx.roundRect(0, 0, this.width, this.height, roundRadius);
      }
    } else {
      ctx.rect(bb.startX, bb.startY, bb.width, bb.height);
    }
    ctx.fill();
    ctx.strokeStyle = this.GRAY;
    ctx.lineWidth = this.SEPARATOR_LINE_WIDTH;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    if (fold.axis === "horizontal") fold.points.forEach((x) => { ctx.moveTo(bb.startX + roundRadius, x); ctx.lineTo(bb.endX - roundRadius, x); });
    else if (fold.axis === "vertical") fold.points.forEach((y) => { ctx.moveTo(y, bb.startY + roundRadius); ctx.lineTo(y, bb.endY - roundRadius); });
    ctx.stroke();
    ctx.restore();
  }

  override _renderObjects(ctx: CanvasRenderingContext2D, objects: fabric.FabricObject[]) {
    super._renderObjects(ctx, objects);
    if (!this.highlightMirror || this.getActiveObjects().length > 1) return;
    ctx.save();
    objects.forEach((obj) => {
      const infos = this.getMirroredObjectCoords(obj);
      infos.forEach((info) => {
        const bbox = obj.getBoundingRect();
        ctx.fillStyle = this.MIRROR_GHOST_COLOR;
        ctx.fillRect(info.pos.x - bbox.width / 2, info.pos.y - bbox.height / 2, bbox.width, bbox.height);
        ctx.restore();
      });
    });
    ctx.restore();
  }

  getMirroredObjectCoords(obj: fabric.FabricObject): MirrorInfo[] {
    const fold = this.getFoldInfo();
    const result: MirrorInfo[] = [];
    if (fold.axis === "none" || !(this.labelProps.mirror === "flip" || this.labelProps.mirror === "copy")) return result;
    const bounds = this.getLabelBounds();
    if (fold.axis === "vertical") {
      if (this.labelProps.mirror === "copy") {
        fold.points.forEach((x) => { const pos = obj.getPointByOrigin("center", "center"); pos.setX(x + (pos.x - bounds.startX)); result.push({ pos, flip: false }); });
      } else if (this.labelProps.mirror === "flip" && fold.points.length === 1) {
        const axisX = fold.points[0];
        const pos = obj.getPointByOrigin("center", "center");
        pos.setX(axisX + (axisX - pos.x)); pos.setY(bounds.startY + bounds.endY - pos.y);
        result.push({ pos, flip: true });
      }
    } else if (fold.axis === "horizontal") {
      if (this.labelProps.mirror === "copy") {
        fold.points.forEach((y) => { const pos = obj.getPointByOrigin("center", "center"); pos.setY(y + (pos.y - bounds.startY)); result.push({ pos, flip: false }); });
      } else if (this.labelProps.mirror === "flip" && fold.points.length === 1) {
        const axisY = fold.points[0];
        const pos = obj.getPointByOrigin("center", "center");
        pos.setY(axisY + (axisY - pos.y)); pos.setX(bounds.startX + bounds.endX - pos.x);
        result.push({ pos, flip: true });
      }
    }
    return result;
  }

  async createMirroredObjects() {
    const objects = this.getObjects();
    for (const obj of objects) {
      const infos = this.getMirroredObjectCoords(obj);
      for (const info of infos) {
        const newObj = await obj.clone();
        newObj.setPositionByOrigin(info.pos, "center", "center");
        if (info.flip) { newObj.centeredRotation = true; newObj.rotate((newObj.angle + 180) % 360); }
        this.add(newObj);
      }
    }
  }

  override centerObjectH(object: fabric.FabricObject): void {
    if ((this.labelProps.split ?? "none") !== "none") {
      const pos = object.getPointByOrigin("center", "center");
      const bounds = this.getLabelBounds();
      const fold = this.getFoldInfo();
      let centerX = bounds.startX + bounds.width / 2;
      if (fold.axis !== "horizontal") fold.segments.forEach((seg) => { if (pos.x >= seg.start && pos.x <= seg.end) centerX = seg.start + (seg.end - seg.start) / 2; });
      pos.setX(centerX);
      object.setPositionByOrigin(pos, "center", "center");
      return;
    }
    super.centerObjectH(object);
  }

  override centerObjectV(object: fabric.FabricObject): void {
    if ((this.labelProps.split ?? "none") !== "none") {
      const pos = object.getPointByOrigin("center", "center");
      const bounds = this.getLabelBounds();
      const fold = this.getFoldInfo();
      let centerY = bounds.startY + bounds.height / 2;
      if (fold.axis !== "vertical") fold.segments.forEach((seg) => { if (pos.y >= seg.start && pos.y <= seg.end) centerY = seg.start + (seg.end - seg.start) / 2; });
      pos.setY(centerY);
      object.setPositionByOrigin(pos, "center", "center");
      return;
    }
    super.centerObjectV(object);
  }
}
```

- [ ] **Step 2: Verify the project still compiles**

```bash
npm run dev
```

Expected: no TypeScript errors. The `viewport:changed` event type cast is intentional.

---

## Task 3: CanvasRuler component

**Files:**
- Create: `src/components/CanvasRuler.svelte`

The ruler renders as an SVG. It reads `zoom` (virtualZoomRatio) and `scrollOffset` (the wrapper's `scrollLeft` or `scrollTop`) to compute which mm values are visible and where their ticks fall.

- [ ] **Step 1: Create `src/components/CanvasRuler.svelte`**

```svelte
<script lang="ts">
  interface Props {
    zoom: number;          // virtualZoomRatio from CustomCanvas
    scrollOffset: number;  // wrapper scrollLeft (H) or scrollTop (V)
    dpmm: number;          // dots per mm from labelProps
    length: number;        // ruler length in CSS pixels (container width or height)
    axis: "horizontal" | "vertical";
  }

  let { zoom, scrollOffset, dpmm, length, axis }: Props = $props();

  const RULER_THICKNESS = 18;
  const TICK_COLOR = "#45475a";
  const LABEL_COLOR = "#6c7086";

  // 1 mm in CSS pixels at current zoom
  const mmPx = $derived(zoom * dpmm);

  // The mm value at the start of the ruler (pixel 0 of the ruler)
  const startMm = $derived(scrollOffset / mmPx);

  // How many mm span the ruler
  const spanMm = $derived(length / mmPx);

  // Tick spacing: adaptive based on zoom
  const tickSpacingMm = $derived(
    mmPx >= 16 ? 1 :
    mmPx >= 8  ? 2 :
    mmPx >= 4  ? 5 : 10
  );
  const labelSpacingMm = $derived(tickSpacingMm * 5);

  interface Tick { pos: number; major: boolean; label?: string }

  const ticks = $derived.by<Tick[]>(() => {
    const result: Tick[] = [];
    const firstTick = Math.ceil(startMm / tickSpacingMm) * tickSpacingMm;
    for (let mm = firstTick; mm < startMm + spanMm + tickSpacingMm; mm += tickSpacingMm) {
      const pos = (mm - startMm) * mmPx;
      if (pos < 0 || pos > length + mmPx) continue;
      const major = mm % labelSpacingMm === 0;
      result.push({ pos, major, label: major ? String(Math.round(mm)) : undefined });
    }
    return result;
  });
</script>

{#if axis === "horizontal"}
  <svg
    width={length}
    height={RULER_THICKNESS}
    style="display:block;flex-shrink:0"
    class="bg-[#1e1e2e] border-b border-[#313244]"
  >
    {#each ticks as tick}
      <line
        x1={tick.pos} y1={tick.major ? 8 : 12}
        x2={tick.pos} y2={RULER_THICKNESS}
        stroke={tick.major ? LABEL_COLOR : TICK_COLOR}
        stroke-width="1"
      />
      {#if tick.label}
        <text
          x={tick.pos + 2} y={7}
          fill={LABEL_COLOR}
          font-size="7"
          font-family="monospace"
        >{tick.label}</text>
      {/if}
    {/each}
  </svg>
{:else}
  <svg
    width={RULER_THICKNESS}
    height={length}
    style="display:block;flex-shrink:0"
    class="bg-[#1e1e2e] border-r border-[#313244]"
  >
    {#each ticks as tick}
      <line
        x1={tick.major ? 8 : 12} y1={tick.pos}
        x2={RULER_THICKNESS} y2={tick.pos}
        stroke={tick.major ? LABEL_COLOR : TICK_COLOR}
        stroke-width="1"
      />
      {#if tick.label}
        <text
          x={7} y={tick.pos - 2}
          fill={LABEL_COLOR}
          font-size="7"
          font-family="monospace"
          transform={`rotate(-90, 7, ${tick.pos - 2})`}
        >{tick.label}</text>
      {/if}
    {/each}
  </svg>
{/if}
```

- [ ] **Step 2: Verify by importing into a test page temporarily**

We'll verify it properly when integrated in Task 8. No standalone check needed.

---

## Task 4: ZoomControls component

**Files:**
- Create: `src/components/ZoomControls.svelte`

Floating overlay with −, zoom %, +, and fit buttons. Positioned absolute bottom-right of the canvas area.

- [ ] **Step 1: Create `src/components/ZoomControls.svelte`**

```svelte
<script lang="ts">
  import type { CustomCanvas } from "$/fabric-object/custom_canvas";

  interface Props {
    canvas: CustomCanvas | undefined;
    zoom: number;
  }

  let { canvas, zoom }: Props = $props();
</script>

<div class="absolute bottom-6 right-3 flex items-center gap-1 z-10">
  <button
    class="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-300 text-sm flex items-center justify-center"
    onclick={() => canvas?.virtualZoomOut()}
    title="Zoom out"
  >−</button>

  <button
    class="h-7 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-400 text-[10px] min-w-[46px] text-center"
    onclick={() => canvas?.fitToWrapper()}
    title="Reset zoom"
  >{Math.round(zoom * 100)}%</button>

  <button
    class="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-300 text-sm flex items-center justify-center"
    onclick={() => canvas?.virtualZoomIn()}
    title="Zoom in"
  >+</button>

  <button
    class="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-300 text-xs flex items-center justify-center"
    onclick={() => canvas?.fitToWrapper()}
    title="Fit to screen"
  >⊡</button>
</div>
```

---

## Task 5: DesignerTopBar component

**Files:**
- Create: `src/components/DesignerTopBar.svelte`

The top bar: logo, save/open, undo/redo, clear, printer connection badge (reactive), preview, print.

- [ ] **Step 1: Create `src/components/DesignerTopBar.svelte`**

```svelte
<script lang="ts">
  import { connectionState, connectedPrinterName } from "$/stores";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import type { UndoState } from "$/utils/undo_redo";

  interface Props {
    undoState: UndoState;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    onPreview: () => void;
    onPrint: () => void;
    onSave: () => void;
    onOpen: () => void;
  }

  let { undoState, onUndo, onRedo, onClear, onPreview, onPrint, onSave, onOpen }: Props = $props();

  const connected = $derived($connectionState === "connected");
</script>

<header class="flex items-center gap-1.5 px-3 h-10 bg-zinc-900 border-b border-zinc-800 shrink-0 z-20">
  <!-- Logo -->
  <span class="font-bold text-[15px] mr-2 select-none">
    <span class="text-red-400">Niim</span><span class="text-blue-400">Blue</span>
  </span>

  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

  <!-- File actions -->
  <button class="tb-btn" onclick={onSave} title={$tr("editor.save")}>
    <MdIcon icon="save" />
  </button>
  <button class="tb-btn" onclick={onOpen} title={$tr("editor.open")}>
    <MdIcon icon="folder_open" />
  </button>

  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

  <!-- Undo / Redo -->
  <button class="tb-btn" disabled={undoState.undoDisabled} onclick={onUndo} title={$tr("editor.undo")}>
    <MdIcon icon="undo" />
  </button>
  <button class="tb-btn" disabled={undoState.redoDisabled} onclick={onRedo} title={$tr("editor.redo")}>
    <MdIcon icon="redo" />
  </button>

  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

  <!-- Clear -->
  <button class="tb-btn" onclick={onClear} title={$tr("editor.clear")}>
    <MdIcon icon="cancel_presentation" />
  </button>

  <div class="flex-1"></div>

  <!-- Printer badge -->
  {#if connected}
    <span class="text-[10px] px-2 py-0.5 bg-green-900 text-green-300 rounded-full border border-green-700 font-medium">
      ● {$connectedPrinterName || "Connected"}
    </span>
  {:else if $connectionState === "connecting"}
    <span class="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700">
      ○ Connecting…
    </span>
  {:else}
    <span class="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-full border border-zinc-700">
      ○ Not connected
    </span>
  {/if}

  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

  <!-- Preview / Print -->
  <button class="tb-btn" onclick={onPreview} title={$tr("editor.preview")}>
    <MdIcon icon="visibility" />
    <span class="text-xs">{$tr("editor.preview")}</span>
  </button>
  <button
    class="tb-btn-primary"
    onclick={onPrint}
    disabled={!connected}
    title={$tr("editor.print")}
  >
    <MdIcon icon="print" />
    <span class="text-xs">{$tr("editor.print")}</span>
  </button>
</header>

<style>
  :global(.tb-btn) {
    @apply flex items-center gap-1 px-2 h-7 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed;
  }
  :global(.tb-btn-primary) {
    @apply flex items-center gap-1 px-2.5 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed;
  }
</style>
```

---

## Task 6: DesignerRail component

**Files:**
- Create: `src/components/DesignerRail.svelte`

Left vertical rail. Each button adds an object type to the canvas. The "Label" and "Saved Labels" buttons live at the bottom. On mobile this component is NOT rendered — tools move into the top bar in `DesignerShell`.

- [ ] **Step 1: Create `src/components/DesignerRail.svelte`**

```svelte
<script lang="ts">
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import type { OjectType } from "$/types";
  import type { LabelProps } from "$/types";
  import type { ExportedLabelTemplate } from "$/types";
  import type * as fabric from "fabric";
  import SavedLabelsMenu from "$/components/designer-controls/SavedLabelsMenu.svelte";
  import ZplImportButton from "$/components/designer-controls/ZplImportButton.svelte";
  import PdfImportButton from "$/components/designer-controls/PdfImportButton.svelte";
  import IconPicker from "$/components/designer-controls/IconPicker.svelte";
  import CsvControl from "$/components/designer-controls/CsvControl.svelte";
  import type { MaterialIcon } from "$/styles/mdi_icons";

  interface Props {
    labelProps: LabelProps;
    canvas: fabric.Canvas | undefined;
    csvEnabled: boolean;
    onObjectPicked: (type: OjectType) => void;
    onIconPicked: (icon: MaterialIcon) => void;
    onSvgIconPicked: (svg: string) => void;
    onZplImageReady: (img: Blob) => void;
    onPdfImageReady: (el: HTMLCanvasElement) => void;
    onRequestLabelTemplate: () => ExportedLabelTemplate;
    onLoadRequested: (label: ExportedLabelTemplate) => void;
    onCsvPlaceholderPicked: (name: string) => void;
    onCsvEnabledChange: (enabled: boolean) => void;
    onLabelSettingsOpen: () => void;
  }

  let {
    labelProps, canvas, csvEnabled,
    onObjectPicked, onIconPicked, onSvgIconPicked,
    onZplImageReady, onPdfImageReady,
    onRequestLabelTemplate, onLoadRequested,
    onCsvPlaceholderPicked, onCsvEnabledChange,
    onLabelSettingsOpen,
  }: Props = $props();

  const tools: { type: OjectType; icon: string; labelKey: string }[] = [
    { type: "text",      icon: "title",                  labelKey: "editor.objectpicker.text"      },
    { type: "barcode",   icon: "view_week",               labelKey: "editor.objectpicker.barcode"   },
    { type: "qrcode",   icon: "qr_code_2",               labelKey: "editor.objectpicker.qrcode"    },
    { type: "aruco",    icon: "grid_on",                 labelKey: "editor.objectpicker.aruco"     },
    { type: "rectangle",icon: "crop_square",             labelKey: "editor.objectpicker.rectangle" },
    { type: "circle",   icon: "radio_button_unchecked",  labelKey: "editor.objectpicker.circle"    },
    { type: "line",     icon: "remove",                  labelKey: "editor.objectpicker.line"      },
    { type: "image",    icon: "image",                   labelKey: "editor.objectpicker.image"     },
  ];
</script>

<aside class="flex flex-col items-center w-[42px] bg-zinc-950 border-r border-zinc-800 py-1.5 gap-0.5 shrink-0">
  <!-- Object type buttons -->
  {#each tools as tool}
    <button
      class="rail-btn"
      onclick={() => onObjectPicked(tool.type)}
      title={$tr(tool.labelKey as any)}
    >
      <MdIcon icon={tool.icon as any} />
    </button>
  {/each}

  <!-- Icon picker (opens its own modal) -->
  <IconPicker onSubmit={onIconPicked} onSubmitSvg={onSvgIconPicked} />

  <!-- ZPL import -->
  <ZplImportButton {labelProps} onImageReady={onZplImageReady} />

  <!-- PDF import -->
  <PdfImportButton {labelProps} onImageReady={onPdfImageReady} />

  <div class="flex-1"></div>

  <div class="w-6 h-px bg-zinc-800 my-1"></div>

  <!-- CSV toggle -->
  <CsvControl bind:enabled={csvEnabled} onPlaceholderPicked={onCsvPlaceholderPicked} />

  <!-- Saved labels -->
  {#if canvas}
    <SavedLabelsMenu
      {canvas}
      onRequestLabelTemplate={onRequestLabelTemplate}
      {onLoadRequested}
      {csvEnabled}
    />
  {/if}

  <!-- Label settings -->
  <button class="rail-btn" onclick={onLabelSettingsOpen} title="Label settings">
    <MdIcon icon="settings" />
  </button>
</aside>

<style>
  :global(.rail-btn) {
    @apply w-8 h-8 flex items-center justify-content-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-sm;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
```

---

## Task 7: DesignerPanel component

**Files:**
- Create: `src/components/DesignerPanel.svelte`

The right panel on desktop. On mobile it's a bottom pull-up sheet. Contains shadcn Accordion sections: object properties (context-sensitive), Position & Size, Label, Printer.

- [ ] **Step 1: Install shadcn accordion if not already done (from Task 1 Step 7)**

Verify `src/lib/components/ui/accordion/` exists. If not:
```bash
npx shadcn-svelte@latest add accordion
```

- [ ] **Step 2: Create `src/components/DesignerPanel.svelte`**

```svelte
<script lang="ts">
  import * as fabric from "fabric";
  import { Barcode } from "$/fabric-object/barcode";
  import { QRCode } from "$/fabric-object/qrcode";
  import { ArUcoMarker } from "$/fabric-object/aruco";
  import { connectionState, connectedPrinterName, printerMeta } from "$/stores";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import TextParamsControls from "$/components/designer-controls/TextParamsControls.svelte";
  import BarcodeParamsControls from "$/components/designer-controls/BarcodeParamsControls.svelte";
  import QRCodeParamsControls from "$/components/designer-controls/QRCodeParamsControls.svelte";
  import ArUcoParamsControls from "$/components/designer-controls/ArUcoParamsControls.svelte";
  import VectorParamsControls from "$/components/designer-controls/VectorParamsControls.svelte";
  import GenericObjectParamsControls from "$/components/designer-controls/GenericObjectParamsControls.svelte";
  import VariableInsertControl from "$/components/designer-controls/VariableInsertControl.svelte";
  import LabelPropsEditor from "$/components/designer-controls/LabelPropsEditor.svelte";
  import PrinterConnector from "$/components/PrinterConnector.svelte";
  import type { LabelProps } from "$/types";

  interface Props {
    selectedObject: fabric.FabricObject | undefined;
    selectedCount: number;
    editRevision: number;
    labelProps: LabelProps;
    onValueUpdated: () => void;
    onLabelPropsChange: (props: LabelProps) => void;
    onDeleteSelected: () => void;
    onCloneSelected: () => void;
    /** true = rendered as bottom sheet (mobile), false = right panel (desktop) */
    sheet?: boolean;
  }

  let {
    selectedObject, selectedCount, editRevision, labelProps,
    onValueUpdated, onLabelPropsChange,
    onDeleteSelected, onCloneSelected,
    sheet = false,
  }: Props = $props();

  let activeTab = $state<"object" | "position" | "label" | "printer">("object");
  let sheetExpanded = $state(false);

  // Auto-expand sheet when object selected
  $effect(() => {
    if (selectedObject) sheetExpanded = true;
  });

  const connected = $derived($connectionState === "connected");

  const hasText    = $derived(selectedObject instanceof fabric.IText);
  const hasBarcode = $derived(selectedObject instanceof Barcode);
  const hasQR      = $derived(selectedObject instanceof QRCode);
  const hasArUco   = $derived(selectedObject instanceof ArUcoMarker);
  const hasVar     = $derived(
    selectedObject instanceof fabric.IText ||
    selectedObject instanceof QRCode ||
    (selectedObject instanceof Barcode && selectedObject.encoding === "CODE128B")
  );
</script>

{#if sheet}
  <!-- ── Mobile bottom sheet ─────────────────────────────── -->
  <div class="bg-zinc-900 border-t border-zinc-800 transition-all duration-200" style="height: {sheetExpanded ? '50vh' : '36px'}">
    <!-- Handle row + tabs -->
    <div class="flex items-center gap-0 border-b border-zinc-800 h-9 px-2 cursor-pointer" onclick={() => sheetExpanded = !sheetExpanded}>
      <div class="w-8 h-1 rounded bg-zinc-700 mx-auto absolute left-1/2 -translate-x-1/2 top-1"></div>
      {#if sheetExpanded}
        {#each (["object", "position", "label", "printer"] as const) as tab}
          <button
            class="px-3 h-full text-xs border-b-2 transition-colors {activeTab === tab ? 'border-blue-500 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'}"
            onclick|stopPropagation={() => { activeTab = tab; sheetExpanded = true; }}
          >
            {tab === "object" ? "Object" : tab === "position" ? "Position" : tab === "label" ? "Label" : "Printer"}
          </button>
        {/each}
      {:else}
        <span class="text-[10px] text-zinc-500 ml-auto">
          {selectedCount > 0 ? `${selectedCount} selected · tap to edit` : "tap to open panel"}
        </span>
      {/if}
    </div>

    {#if sheetExpanded}
      <div class="overflow-y-auto h-[calc(50vh-36px)] p-3">
        {#if activeTab === "object"}
          <svelte:component this={ObjectTabContent} {selectedObject} {selectedCount} {editRevision} {hasText} {hasBarcode} {hasQR} {hasArUco} {hasVar} {onValueUpdated} {onDeleteSelected} {onCloneSelected} />
        {:else if activeTab === "position"}
          {#if selectedObject && selectedCount === 1}
            <GenericObjectParamsControls {selectedObject} {editRevision} valueUpdated={onValueUpdated} />
          {:else}
            <p class="text-xs text-zinc-500">Select an object</p>
          {/if}
        {:else if activeTab === "label"}
          <LabelPropsEditor {labelProps} onChange={onLabelPropsChange} />
        {:else if activeTab === "printer"}
          <PrinterConnector />
        {/if}
      </div>
    {/if}
  </div>

{:else}
  <!-- ── Desktop right panel ────────────────────────────── -->
  <aside class="w-[220px] shrink-0 bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden">
    <div class="overflow-y-auto flex-1">

      <!-- Object section (context-sensitive) -->
      {#if selectedCount > 0}
        <section class="border-b border-zinc-800">
          <div class="panel-section-header">
            <span>
              {#if hasText}Text{:else if hasBarcode}Barcode{:else if hasQR}QR Code{:else if hasArUco}ArUco{:else}Object{/if}
            </span>
            <div class="flex gap-1">
              <button class="icon-btn text-red-400 hover:text-red-300" onclick={onDeleteSelected} title={$tr("editor.delete")}>
                <MdIcon icon="delete" />
              </button>
              <button class="icon-btn" onclick={onCloneSelected} title={$tr("editor.clone")}>
                <MdIcon icon="content_copy" />
              </button>
            </div>
          </div>
          <div class="px-3 pb-3 flex flex-col gap-2">
            {#if hasText}
              <TextParamsControls selectedText={selectedObject as fabric.IText} {editRevision} valueUpdated={onValueUpdated} />
            {/if}
            {#if hasBarcode}
              <BarcodeParamsControls selectedBarcode={selectedObject as Barcode} {editRevision} valueUpdated={onValueUpdated} />
            {/if}
            {#if hasQR}
              <QRCodeParamsControls selectedQRCode={selectedObject as QRCode} {editRevision} valueUpdated={onValueUpdated} />
            {/if}
            {#if hasArUco}
              <ArUcoParamsControls selectedArUco={selectedObject as ArUcoMarker} {editRevision} valueUpdated={onValueUpdated} />
            {/if}
            {#if selectedObject}
              <VectorParamsControls {selectedObject} {editRevision} valueUpdated={onValueUpdated} />
            {/if}
            {#if hasVar}
              <VariableInsertControl {selectedObject} valueUpdated={onValueUpdated} />
            {/if}
          </div>
        </section>
      {/if}

      <!-- Position & Size section -->
      {#if selectedObject && selectedCount === 1}
        <section class="border-b border-zinc-800">
          <div class="panel-section-header">Position &amp; Size</div>
          <div class="px-3 pb-3">
            <GenericObjectParamsControls {selectedObject} {editRevision} valueUpdated={onValueUpdated} />
          </div>
        </section>
      {/if}

      <!-- Label section -->
      <section class="border-b border-zinc-800">
        <div class="panel-section-header">Label</div>
        <div class="px-3 pb-3">
          <LabelPropsEditor {labelProps} onChange={onLabelPropsChange} />
        </div>
      </section>

      <!-- Printer section -->
      <section class="border-b border-zinc-800">
        <div class="panel-section-header flex justify-between">
          <span>Printer</span>
          {#if connected}
            <span class="text-[9px] px-1.5 py-0.5 bg-green-900/60 text-green-400 rounded-full border border-green-800">● {$connectedPrinterName}</span>
          {/if}
        </div>
        <div class="px-3 pb-3">
          <PrinterConnector />
        </div>
      </section>

    </div>
  </aside>
{/if}

<style>
  :global(.panel-section-header) {
    @apply flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 cursor-default;
  }
  :global(.icon-btn) {
    @apply w-6 h-6 flex items-center justify-content-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
```

**Note:** `LabelPropsEditor` and all the `*ParamsControls` components are used as-is (their Bootstrap classes will be replaced in Task 11). They'll look unstyled until then — that's acceptable.

---

## Task 8: DesignerShell component

**Files:**
- Create: `src/components/DesignerShell.svelte`

The full-viewport grid container. It owns the canvas element, the ruler scroll listener, and the responsive layout switching. It receives all state/callbacks from `LabelDesigner`.

- [ ] **Step 1: Create `src/components/DesignerShell.svelte`**

```svelte
<script lang="ts">
  import { onMount, tick } from "svelte";
  import type { CustomCanvas } from "$/fabric-object/custom_canvas";
  import type { LabelProps, ExportedLabelTemplate, OjectType } from "$/types";
  import type { UndoState } from "$/utils/undo_redo";
  import type { MaterialIcon } from "$/styles/mdi_icons";
  import type * as fabric from "fabric";
  import DesignerTopBar from "$/components/DesignerTopBar.svelte";
  import DesignerRail from "$/components/DesignerRail.svelte";
  import DesignerPanel from "$/components/DesignerPanel.svelte";
  import CanvasRuler from "$/components/CanvasRuler.svelte";
  import ZoomControls from "$/components/ZoomControls.svelte";
  import PrintPreview from "$/components/PrintPreview.svelte";
  import { csvData } from "$/stores";

  interface Props {
    fabricCanvas: CustomCanvas | undefined;
    htmlCanvas: HTMLCanvasElement | undefined;
    labelProps: LabelProps;
    selectedObject: fabric.FabricObject | undefined;
    selectedCount: number;
    editRevision: number;
    undoState: UndoState;
    previewOpened: boolean;
    printNow: boolean;
    csvEnabled: boolean;

    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    onPreview: () => void;
    onPrint: () => void;
    onSave: () => void;
    onOpen: () => void;
    onDeleteSelected: () => void;
    onCloneSelected: () => void;
    onValueUpdated: () => void;
    onLabelPropsChange: (props: LabelProps) => void;
    onObjectPicked: (type: OjectType) => void;
    onIconPicked: (icon: MaterialIcon) => void;
    onSvgIconPicked: (svg: string) => void;
    onZplImageReady: (img: Blob) => void;
    onPdfImageReady: (el: HTMLCanvasElement) => void;
    onRequestLabelTemplate: () => ExportedLabelTemplate;
    onLoadRequested: (label: ExportedLabelTemplate) => void;
    onCsvPlaceholderPicked: (name: string) => void;
    getCanvasForPreview: () => any;

    // Bindable
    bindHtmlCanvas: (el: HTMLCanvasElement) => void;
    bindScrollWrapper: (el: HTMLElement) => void;
  }

  let {
    fabricCanvas, htmlCanvas, labelProps, selectedObject, selectedCount,
    editRevision, undoState, previewOpened, printNow, csvEnabled,
    onUndo, onRedo, onClear, onPreview, onPrint, onSave, onOpen,
    onDeleteSelected, onCloneSelected, onValueUpdated, onLabelPropsChange,
    onObjectPicked, onIconPicked, onSvgIconPicked,
    onZplImageReady, onPdfImageReady,
    onRequestLabelTemplate, onLoadRequested,
    onCsvPlaceholderPicked, getCanvasForPreview,
    bindHtmlCanvas, bindScrollWrapper,
  }: Props = $props();

  let scrollWrapper: HTMLDivElement;
  let canvasAreaEl: HTMLDivElement;
  let zoom = $state(1);
  let scrollX = $state(0);
  let scrollY = $state(0);
  let canvasAreaW = $state(0);
  let canvasAreaH = $state(0);
  let labelSettingsOpen = $state(false);
  let isMobile = $state(false);

  // Track viewport:changed events from canvas
  $effect(() => {
    if (!fabricCanvas) return;
    const handler = (e: any) => { zoom = e.zoom; };
    (fabricCanvas as any).on("viewport:changed", handler);
    return () => { (fabricCanvas as any).off("viewport:changed", handler); };
  });

  const onScroll = () => {
    scrollX = scrollWrapper.scrollLeft;
    scrollY = scrollWrapper.scrollTop;
  };

  const checkMobile = () => { isMobile = window.innerWidth < 640; };

  onMount(() => {
    bindScrollWrapper(scrollWrapper);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        canvasAreaW = e.contentRect.width;
        canvasAreaH = e.contentRect.height;
      }
    });
    ro.observe(canvasAreaEl);

    return () => {
      window.removeEventListener("resize", checkMobile);
      ro.disconnect();
    };
  });

  const dpmm = $derived(labelProps.size.width > 0 ? labelProps.size.width / (labelProps.size.width / 8) : 8);
</script>

<div class="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-200">

  <!-- Top bar -->
  <DesignerTopBar
    {undoState}
    onUndo={onUndo}
    onRedo={onRedo}
    onClear={onClear}
    onPreview={onPreview}
    onPrint={onPrint}
    onSave={onSave}
    onOpen={onOpen}
  />

  <!-- Main body -->
  <div class="flex flex-1 overflow-hidden">

    <!-- Left rail (desktop only) -->
    {#if !isMobile}
      <DesignerRail
        {labelProps}
        canvas={fabricCanvas}
        {csvEnabled}
        {onObjectPicked}
        {onIconPicked}
        {onSvgIconPicked}
        {onZplImageReady}
        {onPdfImageReady}
        {onRequestLabelTemplate}
        {onLoadRequested}
        {onCsvPlaceholderPicked}
        onCsvEnabledChange={() => {}}
        onLabelSettingsOpen={() => { labelSettingsOpen = true; }}
      />
    {/if}

    <!-- Canvas area -->
    <div class="flex flex-col flex-1 overflow-hidden" bind:this={canvasAreaEl}>

      <!-- Ruler row: corner + horizontal ruler (desktop only) -->
      {#if !isMobile}
        <div class="flex shrink-0">
          <div class="w-[18px] h-[18px] shrink-0 bg-[#1e1e2e] border-b border-r border-[#313244]"></div>
          <CanvasRuler
            axis="horizontal"
            {zoom}
            scrollOffset={scrollX}
            dpmm={labelProps.size.width / (labelProps.size.width / 8)}
            length={canvasAreaW - 18}
          />
        </div>
      {/if}

      <!-- Canvas row: vertical ruler + scrollable canvas -->
      <div class="flex flex-1 overflow-hidden">

        <!-- Vertical ruler (desktop only) -->
        {#if !isMobile}
          <CanvasRuler
            axis="vertical"
            {zoom}
            scrollOffset={scrollY}
            dpmm={labelProps.size.width / (labelProps.size.width / 8)}
            length={canvasAreaH - 18}
          />
        {/if}

        <!-- Scrollable canvas viewport -->
        <div
          class="flex-1 overflow-auto bg-zinc-950 relative"
          bind:this={scrollWrapper}
          onscroll={onScroll}
        >
          <!-- Inner div sizes to canvas CSS size to enable scrolling -->
          <div class="flex items-center justify-center min-w-full min-h-full p-8">
            <div class="canvas-wrapper print-start-{labelProps.printDirection} shadow-2xl">
              <canvas use:bindHtmlCanvas></canvas>
            </div>
          </div>
        </div>

      </div>

      <!-- Status bar (desktop only) -->
      {#if !isMobile}
        <div class="flex items-center gap-4 h-[22px] px-3 bg-zinc-900 border-t border-zinc-800 text-[10px] text-zinc-500 shrink-0">
          <span>{labelProps.size.width / 8} × {labelProps.size.height / 8} mm</span>
          {#if selectedObject && selectedCount === 1}
            <span>
              X: {Math.round((selectedObject as any).left ?? 0)}
              Y: {Math.round((selectedObject as any).top ?? 0)}
              W: {Math.round((selectedObject as any).getScaledWidth?.() ?? 0)}
              H: {Math.round((selectedObject as any).getScaledHeight?.() ?? 0)}
            </span>
          {/if}
          <span class="flex-1"></span>
          <span>Scroll to zoom · Drag empty area to pan · Middle-click to fit</span>
        </div>
      {/if}

    </div>

    <!-- Right panel (desktop only) -->
    {#if !isMobile}
      <DesignerPanel
        {selectedObject}
        {selectedCount}
        {editRevision}
        {labelProps}
        onValueUpdated={onValueUpdated}
        onLabelPropsChange={onLabelPropsChange}
        onDeleteSelected={onDeleteSelected}
        onCloneSelected={onCloneSelected}
        sheet={false}
      />
    {/if}

  </div>

  <!-- Mobile bottom sheet -->
  {#if isMobile}
    <DesignerPanel
      {selectedObject}
      {selectedCount}
      {editRevision}
      {labelProps}
      onValueUpdated={onValueUpdated}
      onLabelPropsChange={onLabelPropsChange}
      onDeleteSelected={onDeleteSelected}
      onCloneSelected={onCloneSelected}
      sheet={true}
    />
  {/if}

  <!-- Zoom controls overlay (always) -->
  <div class="absolute" style="bottom: {isMobile ? '4px' : '28px'}; right: {isMobile ? '4px' : '228px'}">
    <ZoomControls canvas={fabricCanvas} {zoom} />
  </div>

  <!-- Print preview modal -->
  {#if previewOpened}
    <PrintPreview
      bind:show={previewOpened}
      canvasCallback={getCanvasForPreview}
      {labelProps}
      {printNow}
      {csvEnabled}
      csvData={$csvData.data}
    />
  {/if}

</div>

<style>
  .canvas-wrapper {
    border: 1px solid rgba(0, 0, 0, 0.4);
    background-color: rgba(60, 55, 63, 0.5);
  }
  .canvas-wrapper.print-start-left { border-left: 2px solid #ff4646; }
  .canvas-wrapper.print-start-top  { border-top:  2px solid #ff4646; }
  .canvas-wrapper canvas { image-rendering: pixelated; display: block; }
</style>
```

**Note:** The `use:bindHtmlCanvas` syntax requires a Svelte action. See the refactored `LabelDesigner.svelte` in Task 9 for how `bindHtmlCanvas` is passed.

---

## Task 9: Refactor LabelDesigner.svelte

**Files:**
- Modify: `src/components/LabelDesigner.svelte`

`LabelDesigner` becomes a pure state coordinator. It keeps all the existing state, logic, and event handlers — just removes all layout markup and renders `<DesignerShell>` instead.

- [ ] **Step 1: Replace `LabelDesigner.svelte` with the refactored version**

Keep the entire `<script>` block from the original **unchanged**, plus add these new handlers that DesignerShell expects. Replace only the template portion:

```svelte
<script lang="ts">
  // ... (keep ALL existing script content from the original LabelDesigner.svelte)
  // Add these new handlers:

  import DesignerShell from "$/components/DesignerShell.svelte";

  // Called by DesignerShell to bind the canvas element
  const bindHtmlCanvas = (el: HTMLCanvasElement) => {
    htmlCanvas = el;
  };

  // Called by DesignerShell to bind the scroll wrapper
  const bindScrollWrapper = (el: HTMLElement) => {
    if (fabricCanvas) {
      fabricCanvas.setScrollWrapper(el);
    }
    // Store for use after canvas is created in onMount
    (bindScrollWrapper as any)._el = el;
  };

  const onSave = () => {
    const label = exportCurrentLabel();
    FileUtils.downloadLabel(label);
  };

  const onOpen = () => {
    FileUtils.uploadLabel().then((label) => {
      if (label) onLoadRequested(label);
    });
  };
</script>

<!-- Remove the old <div class="image-editor">...</div> template -->
<!-- Replace with: -->

<DesignerShell
  {fabricCanvas}
  htmlCanvas={undefined}
  {labelProps}
  {selectedObject}
  {selectedCount}
  {editRevision}
  {undoState}
  bind:previewOpened
  {printNow}
  {csvEnabled}
  onUndo={() => undo.undo()}
  onRedo={() => undo.redo()}
  {onClear}={clearCanvas}
  onPreview={openPreview}
  onPrint={openPreviewAndPrint}
  {onSave}
  {onOpen}
  onDeleteSelected={deleteSelected}
  onCloneSelected={cloneSelected}
  onValueUpdated={controlValueUpdated}
  onLabelPropsChange={onUpdateLabelProps}
  onObjectPicked={onObjectPicked}
  onIconPicked={onIconPicked}
  onSvgIconPicked={onSvgIconPicked}
  onZplImageReady={zplImageReady}
  onPdfImageReady={pdfImageReady}
  onRequestLabelTemplate={exportCurrentLabel}
  {onLoadRequested}
  onCsvPlaceholderPicked={onCsvPlaceholderPicked}
  getCanvasForPreview={getCanvasForPreview}
  {bindHtmlCanvas}
  {bindScrollWrapper}
/>
```

- [ ] **Step 2: Fix onMount to use stored scroll wrapper element**

In the existing `onMount`, after `fabricCanvas = new CustomCanvas(...)`, add:

```typescript
// Connect the scroll wrapper that DesignerShell registered
const wrapperEl = (bindScrollWrapper as any)._el as HTMLElement | undefined;
if (wrapperEl) {
  fabricCanvas.setScrollWrapper(wrapperEl);
  fabricCanvas.fitToWrapper();
}
```

Also remove the `bind:this={htmlCanvas}` from the old canvas element (it's now handled via `bindHtmlCanvas` action in DesignerShell).

The `CustomCanvas` constructor needs `htmlCanvas` — update:
```typescript
// Instead of: fabricCanvas = new CustomCanvas(htmlCanvas, {...})
// Use: the canvas is bound via the action in DesignerShell
// htmlCanvas is set by bindHtmlCanvas before onMount runs (Svelte actions run on mount)
fabricCanvas = new CustomCanvas(htmlCanvas!, {
  width: labelProps.size.width,
  height: labelProps.size.height,
});
```

- [ ] **Step 3: Remove Bootstrap Dropdown import**

Delete this line from the script:
```typescript
import Dropdown from "bootstrap/js/dist/dropdown";
```

And replace the `fabricCanvas.on("mouse:down")` handler that closed Bootstrap dropdowns:
```typescript
// OLD (remove):
fabricCanvas.on("mouse:down", (): void => {
  const dropdowns = document.querySelectorAll("[data-bs-toggle='dropdown']");
  dropdowns.forEach((el) => new Dropdown(el).hide());
});

// NEW (keep mouse:down but just for blur, or remove entirely — shadcn popovers close themselves)
```

- [ ] **Step 4: Verify dev server starts without errors**

```bash
npm run dev
```

Expected: full-viewport dark layout visible. Canvas renders inside the shell.

---

## Task 10: Update MainPage.svelte

**Files:**
- Modify: `src/components/MainPage.svelte`

Remove the Bootstrap container wrapper. `LabelDesigner` now occupies the full viewport via `DesignerShell`. Move the locale selector and debug button into a minimal footer or remove from primary layout.

- [ ] **Step 1: Replace MainPage.svelte**

```svelte
<script lang="ts">
  import LabelDesigner from "$/components/LabelDesigner.svelte";
  import BrowserWarning from "$/components/basic/BrowserWarning.svelte";
  import DebugStuff from "$/components/DebugStuff.svelte";
  import { locale, locales } from "$/utils/i18n";

  // eslint-disable-next-line no-undef
  const appCommit = __APP_COMMIT__;

  let debugStuffShow = $state<boolean>(false);
</script>

<!-- Full-height body with no padding -->
<BrowserWarning />

<LabelDesigner />

<!-- Minimal overlay footer: locale + debug, bottom-right, z-index behind canvas -->
<div class="fixed bottom-0 left-0 z-0 p-2 flex gap-2 items-center opacity-40 hover:opacity-100 transition-opacity">
  <select
    class="text-[10px] bg-transparent text-zinc-400 border-0 outline-none cursor-pointer"
    bind:value={$locale}
  >
    {#each Object.entries(locales) as [key, name] (key)}
      <option value={key}>{name}</option>
    {/each}
  </select>
  {#if appCommit}
    <span class="text-[10px] text-zinc-600">{appCommit.slice(0, 6)}</span>
  {/if}
  <button class="text-[10px] text-zinc-600 hover:text-zinc-300" onclick={() => (debugStuffShow = true)}>
    🐞
  </button>
</div>

{#if debugStuffShow}
  <DebugStuff bind:show={debugStuffShow} />
{/if}
```

- [ ] **Step 2: Update `src/App.svelte` if it wraps with any container classes**

Check `src/App.svelte` for Bootstrap container markup and remove it, keeping only `<MainPage />`.

- [ ] **Step 3: Verify full layout in browser**

```bash
npm run dev
```

Expected: full-viewport dark designer with top bar, left rail, canvas area with rulers, right panel. Mobile (narrow browser window): compact top bar with tool icons, canvas fills screen, bottom sheet visible.

---

## Task 11: Migrate existing control components from Bootstrap to Tailwind

**Files:**
- Modify: all files in `src/components/designer-controls/`
- Modify: `src/components/basic/*.svelte`
- Modify: `src/components/PrinterConnector.svelte`

Bootstrap class → Tailwind equivalent mapping for this project:

| Bootstrap | Tailwind replacement |
|-----------|---------------------|
| `btn btn-sm btn-secondary` | `inline-flex items-center gap-1 px-2 h-7 rounded text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm transition-colors` |
| `btn btn-sm btn-primary` | `inline-flex items-center gap-1 px-2 h-7 rounded text-white bg-blue-600 hover:bg-blue-500 text-sm transition-colors` |
| `btn btn-sm btn-danger` | `inline-flex items-center gap-1 px-2 h-7 rounded text-white bg-red-700 hover:bg-red-600 text-sm transition-colors` |
| `btn btn-link` | `text-zinc-400 hover:text-zinc-200 underline cursor-pointer bg-transparent border-0` |
| `form-select form-select-sm` | `h-7 px-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500` |
| `form-control form-control-sm` | `h-7 px-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500` |
| `input-group input-group-sm` | `flex items-center gap-0` (children get adjacent borders) |
| `input-group-text` | `flex items-center px-2 h-7 bg-zinc-700 border border-zinc-700 rounded-l text-zinc-400 text-sm` |
| `dropdown` | remove; use inline `$state` boolean + `{#if}` popover div |
| `dropdown-menu` | `absolute z-50 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-lg p-2 min-w-[180px]` |
| `dropdown-toggle` | button with `onclick={() => open = !open}` |
| `form-check` / `form-check-input` | `flex items-center gap-2` / `w-4 h-4 rounded accent-blue-500` |
| `form-check-label` | `text-sm text-zinc-300` |
| `btn-group btn-group-sm` | `flex` (children share borders) |
| `alert alert-warning` | `px-3 py-2 rounded bg-yellow-900/40 border border-yellow-700 text-yellow-300 text-sm` |
| `text-danger` | `text-red-400` |
| `text-muted` | `text-zinc-500` |
| `mb-1`, `mb-2`, `mb-3` | `mb-1`, `mb-2`, `mb-3` (same in Tailwind) |
| `d-flex` | `flex` |
| `gap-1`, `gap-2` | `gap-1`, `gap-2` (same) |
| `align-items-center` | `items-center` |
| `flex-wrap` | `flex-wrap` (same) |
| `ms-1`, `me-1` | `ml-1`, `mr-1` |

**Bootstrap `Dropdown` JS import** (appears in `SavedLabelsMenu.svelte` and potentially others): Replace with Svelte `$state` boolean:

```svelte
<!-- OLD -->
import Dropdown from "bootstrap/js/dist/dropdown";
let dropdownRef: HTMLDivElement;
// and data-bs-toggle="dropdown" on buttons

<!-- NEW -->
let open = $state(false);
// button: onclick={() => open = !open}
// menu: {#if open}<div class="absolute z-50 ...">...</div>{/if}
// close on outside click: use svelte's clickoutside pattern or just close on any canvas click
```

- [ ] **Step 1: Update `TextParamsControls.svelte`**

Replace all Bootstrap classes using the mapping table above. The component's logic is unchanged — only class strings change.

- [ ] **Step 2: Update `BarcodeParamsControls.svelte`**

Replace `input-group`, `input-group-text`, `form-select` classes.

- [ ] **Step 3: Update `QRCodeParamsControls.svelte`**

Replace Bootstrap classes.

- [ ] **Step 4: Update `ArUcoParamsControls.svelte`**

Replace Bootstrap classes.

- [ ] **Step 5: Update `VectorParamsControls.svelte`**

Replace Bootstrap classes.

- [ ] **Step 6: Update `GenericObjectParamsControls.svelte`**

Replace Bootstrap classes. The `dropdown` menu becomes a `$state` boolean toggle.

- [ ] **Step 7: Update `ObjectPositionControls.svelte`**

Replace Bootstrap classes.

- [ ] **Step 8: Update `LabelPropsEditor.svelte`**

Replace Bootstrap classes. The `LabelPresetsBrowser` used inside it will also need updating.

- [ ] **Step 9: Update `LabelPresetsBrowser.svelte`**

Replace Bootstrap classes.

- [ ] **Step 10: Update `FontFamilyPicker.svelte` and `FontsMenu.svelte`**

Replace Bootstrap classes.

- [ ] **Step 11: Update `SavedLabelsMenu.svelte` and `SavedLabelsBrowser.svelte`**

Replace Bootstrap classes. Replace `Dropdown` JS import with `$state` boolean.

- [ ] **Step 12: Update `CsvControl.svelte`**

Replace Bootstrap classes.

- [ ] **Step 13: Update `VariableInsertControl.svelte`**

Replace Bootstrap classes.

- [ ] **Step 14: Update `DpiSelector.svelte`**

Replace Bootstrap classes.

- [ ] **Step 15: Update `IconPicker.svelte`**

Replace Bootstrap classes. Replace `data-bs-toggle="modal"` with Svelte `$state` boolean modal.

- [ ] **Step 16: Update `ZplImportButton.svelte` and `PdfImportButton.svelte`**

Replace Bootstrap classes.

- [ ] **Step 17: Update `PrinterConnector.svelte`**

Replace Bootstrap classes. This component now lives inside DesignerPanel's Printer section.

- [ ] **Step 18: Update `basic/AppModal.svelte`**

Replace Bootstrap modal with a Svelte-native modal using a `<dialog>` element or shadcn `Dialog`.

- [ ] **Step 19: Update `basic/BrowserWarning.svelte`**

Replace Bootstrap alert classes.

- [ ] **Step 20: Verify full app in browser**

```bash
npm run dev
```

Expected: all controls visible and styled in dark Tailwind theme. No Bootstrap classes remain. Full layout works on desktop and mobile (narrow viewport).

---

## Self-Review Notes

**Spec coverage check:**

| Spec requirement | Covered by task |
|-----------------|----------------|
| Full-viewport CSS grid | Task 8 (DesignerShell) |
| Left vertical tool rail | Task 6 (DesignerRail) |
| Top action bar | Task 5 (DesignerTopBar) |
| H + V rulers synced to zoom/pan | Tasks 2 + 3 |
| Zoom to cursor position | Task 2 (zoomAroundPoint) |
| Drag-to-pan | Task 2 (scroll wrapper overflow:auto) |
| Pinch-to-zoom | Task 2 (setupPinch) |
| Zoom controls overlay | Task 4 |
| Right panel — Text/Barcode/QR/ArUco sections | Task 7 |
| Right panel — Position & Size section | Task 7 |
| Right panel — Label section | Task 7 |
| Right panel — Printer section (replaces header connector) | Task 7 |
| Mobile: compact top bar with tool icons | Task 8 |
| Mobile: canvas fills screen | Task 8 |
| Mobile: bottom pull-up sheet (4 tabs) | Task 7 |
| Bootstrap removed | Tasks 1 + 11 |
| Tailwind v4 + shadcn-svelte | Task 1 |
| Delete/clone buttons when object selected | Task 7 |
| Undo/redo | Task 5 |
| Status bar (coords + size) | Task 8 |
| Middle-click to fit | Task 2 |
| fitToWrapper on initial load | Task 9 |

**All spec requirements are covered.**
