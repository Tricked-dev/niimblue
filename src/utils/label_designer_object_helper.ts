import * as fabric from "fabric";
import { OBJECT_DEFAULTS, OBJECT_DEFAULTS_TEXT, OBJECT_DEFAULTS_VECTOR, OBJECT_SIZE_DEFAULTS } from "$/defaults";
import { ArUcoMarker } from "$/fabric-object/aruco";
import Barcode from "$/fabric-object/barcode";
import { QRCode } from "$/fabric-object/qrcode";
import { Datamatrix } from "$/fabric-object/datamatrix";
import type { OjectType, PostProcessType } from "$/types";
import { Toasts } from "$/utils/toasts";
import { FileUtils } from "$/utils/file_utils";
import { CanvasUtils } from "$/utils/canvas_utils";
import { TextboxExt, TextboxExtProps } from "$/fabric-object/textbox-ext";
import { calculateFitScale, processImageElement, type ImageProcessOptions } from "$/utils/image_process";

interface ProcessedImageData {
  originalBlob: Blob;
  originalUrl: string;
  originalElement: HTMLImageElement;
  processOptions: ImageProcessOptions;
  lastScale: number;
  lastWidth: number;
  lastHeight: number;
}

export class LabelDesignerObjectHelper {
  static async addSvg(canvas: fabric.Canvas, svgCode: string): Promise<fabric.FabricObject | fabric.Group> {
    const { objects, options } = await fabric.loadSVGFromString(svgCode);
    const obj = fabric.util.groupSVGElements(
      objects.filter((o) => o !== null),
      options,
    );
    obj.set({ ...OBJECT_DEFAULTS });
    CanvasUtils.fitObjectIntoCanvas(canvas, obj, OBJECT_DEFAULTS.left, OBJECT_DEFAULTS.top);
    canvas.add(obj);
    canvas.renderAll();
    return obj;
  }

  static async addImageFile(canvas: fabric.Canvas, file: File): Promise<fabric.FabricObject | fabric.Group> {
    if (file.type.startsWith("image/svg")) {
      const data = await file.text();
      return await this.addSvg(canvas, data);
    }

    if (
      file.type === "image/png" ||
      file.type === "image/jpeg" ||
      file.type === "image/bmp" ||
      file.type === "image/gif"
    ) {
      const url = await FileUtils.blobToDataUrl(file);
      const fabricImg = await fabric.FabricImage.fromURL(url);
      fabricImg.set({ ...OBJECT_DEFAULTS, imageSmoothing: false });
      CanvasUtils.fitObjectIntoCanvas(canvas, fabricImg, OBJECT_DEFAULTS.left, OBJECT_DEFAULTS.top);
      canvas.add(fabricImg);

      const originalImg = new Image();
      originalImg.src = url;
      await new Promise<void>((resolve) => {
        originalImg.onload = () => resolve();
        originalImg.onerror = () => resolve();
      });

      const imgData: ProcessedImageData = {
        originalBlob: file,
        originalUrl: url,
        originalElement: originalImg,
        processOptions: { method: "none", threshold: 50, contrast: 80 },
        lastScale: fabricImg.scaleX ?? 1,
        lastWidth: Math.round((fabricImg.width ?? 0) * (fabricImg.scaleX ?? 1)),
        lastHeight: Math.round((fabricImg.height ?? 0) * (fabricImg.scaleY ?? 1)),
      };
      (fabricImg as any)._niimImageData = imgData;

      return fabricImg;
    }

    throw new Error("Unsupported image");
  }

  static async addImageWithFilePicker(fabricCanvas: fabric.Canvas): Promise<fabric.FabricObject | fabric.Group | null> {
    return new Promise((resolve, reject) => {
      const handleFile = async (blob: Blob) => {
        try {
          const obj = await this.addImageBlob(fabricCanvas, blob);
          resolve(obj);
        } catch (e) {
          Toasts.error(e);
          reject(e);
        }
      };

      const handleCancel = () => {
        resolve(null);
      };

      const event = new CustomEvent("openImageImportModal", {
        detail: { onSubmit: handleFile, onCancel: handleCancel },
        bubbles: true,
      });
      document.dispatchEvent(event);
    });
  }

  static async addImageBlob(
    fabricCanvas: fabric.Canvas,
    img: Blob,
    processOptions?: ImageProcessOptions,
  ): Promise<fabric.FabricImage> {
    const url = await FileUtils.blobToDataUrl(img);

    const originalImg = new Image();
    originalImg.src = url;
    await new Promise<void>((resolve) => {
      originalImg.onload = () => resolve();
      originalImg.onerror = () => resolve();
    });

    const canvasWidth = fabricCanvas.width ?? 240;
    const canvasHeight = fabricCanvas.height ?? 96;

    const fit = calculateFitScale(originalImg.width, originalImg.height, canvasWidth, canvasHeight, 10);

    let finalWidth = fit.width;
    let finalHeight = fit.height;
    let finalSrc = url;

    if (processOptions && processOptions.method !== "none") {
      const processedCanvas = await processImageElement(originalImg, processOptions, fit.width, fit.height);
      finalSrc = processedCanvas.toDataURL("image/png");
    }

    const fabricImg = await fabric.FabricImage.fromURL(finalSrc);
    fabricImg.set({ imageSmoothing: false });

    fabricImg.set({
      left: (canvasWidth - fit.width) / 2,
      top: (canvasHeight - fit.height) / 2,
      width: finalWidth,
      height: finalHeight,
      scaleX: 1,
      scaleY: 1,
      snapAngle: OBJECT_DEFAULTS.snapAngle,
      lockUniScaling: true,
    });

    const imgData: ProcessedImageData = {
      originalBlob: img,
      originalUrl: url,
      originalElement: originalImg,
      processOptions: processOptions ?? { method: "none", threshold: 50, contrast: 80 },
      lastScale: 1,
      lastWidth: finalWidth,
      lastHeight: finalHeight,
    };

    (fabricImg as any)._niimImageData = imgData;

    this.setupImageScalingHandler(fabricCanvas, fabricImg);

    fabricCanvas.add(fabricImg);
    return fabricImg;
  }

  private static setupImageScalingHandler(canvas: fabric.Canvas, fabricImg: fabric.FabricImage) {
    const reprocessImage = async () => {
      const imgData = (fabricImg as any)._niimImageData as ProcessedImageData | undefined;
      if (!imgData || imgData.processOptions.method === "none") return;

      const currentScale = fabricImg.scaleX ?? 1;
      const currentWidth = Math.round((fabricImg.width ?? 0) * currentScale);
      const currentHeight = Math.round((fabricImg.height ?? 0) * currentScale);

      if (currentWidth < 1 || currentHeight < 1) return;

      try {
        const processedCanvas = await processImageElement(
          imgData.originalElement,
          imgData.processOptions,
          currentWidth,
          currentHeight,
        );

        const newUrl = processedCanvas.toDataURL("image/png");
        const newImg = await fabric.FabricImage.fromURL(newUrl);
        newImg.set({ imageSmoothing: false });

        fabricImg.set({
          width: currentWidth,
          height: currentHeight,
          scaleX: 1,
          scaleY: 1,
        });
        fabricImg.setElement(newImg.getElement());

        imgData.lastScale = 1;
        imgData.lastWidth = currentWidth;
        imgData.lastHeight = currentHeight;

        canvas.requestRenderAll();
      } catch (e) {
        console.error("Failed to reprocess image:", e);
      }
    };

    const handler = () => {
      reprocessImage();
    };

    fabricImg.on("modified", handler);
    (fabricImg as any)._niimScaleHandler = handler;
  }

  static async addObjectFromClipboard(
    fabricCanvas: fabric.Canvas,
    data: DataTransfer,
  ): Promise<fabric.FabricObject | undefined> {
    // paste image
    for (const item of data.items) {
      if (item.type.includes("image")) {
        const file = item.getAsFile();
        if (file) {
          return await LabelDesignerObjectHelper.addImageFile(fabricCanvas, file);
        }
      }
    }

    // paste text
    const text = data.getData("text");
    if (text) {
      const obj = LabelDesignerObjectHelper.addText(fabricCanvas, text);
      fabricCanvas.setActiveObject(obj);
      return obj;
    }
  }

  static addText(canvas: fabric.Canvas, text?: string, options?: Partial<TextboxExtProps>): TextboxExt {
    const obj = new TextboxExt(text ?? "Text", {
      ...OBJECT_DEFAULTS_TEXT,
      ...options,
    });
    canvas.add(obj);
    canvas.centerObject(obj);
    return obj;
  }

  static addStaticText(canvas: fabric.Canvas, text?: string, options?: Partial<fabric.TextProps>): fabric.FabricText {
    const obj = new fabric.FabricText(text ?? "Text", {
      ...OBJECT_DEFAULTS_TEXT,
      ...options,
    });
    canvas.add(obj);
    canvas.centerObject(obj);
    return obj;
  }

  static addHLine(canvas: fabric.Canvas): fabric.Polyline {
    const obj = new fabric.Polyline(
      [
        { x: OBJECT_DEFAULTS.left, y: OBJECT_DEFAULTS.top },
        { x: OBJECT_DEFAULTS.left + OBJECT_SIZE_DEFAULTS.width, y: OBJECT_DEFAULTS.top },
      ],
      { ...OBJECT_DEFAULTS_VECTOR },
    );
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  static addCircle(canvas: fabric.Canvas): fabric.Circle {
    const obj = new fabric.Circle({
      ...OBJECT_DEFAULTS_VECTOR,
      radius: OBJECT_SIZE_DEFAULTS.width / 2,
    });
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  static addRect(canvas: fabric.Canvas): fabric.Rect {
    const obj = new fabric.Rect({
      ...OBJECT_SIZE_DEFAULTS,
      ...OBJECT_DEFAULTS_VECTOR,
    });
    canvas.add(obj);
    canvas.centerObjectV(obj);
    return obj;
  }

  static addQrCode(canvas: fabric.Canvas): QRCode {
    const qr = new QRCode({
      text: "NiimBlue",
      ...OBJECT_SIZE_DEFAULTS,
      ...OBJECT_DEFAULTS,
    });
    canvas.add(qr);
    return qr;
  }

  static addArUco(canvas: fabric.Canvas): ArUcoMarker {
    const aruco = new ArUcoMarker({
      ...OBJECT_SIZE_DEFAULTS,
      ...OBJECT_DEFAULTS,
    });
    canvas.add(aruco);
    return aruco;
  }

  static addBarcode(canvas: fabric.Canvas): Barcode {
    const barcode = new Barcode({
      ...OBJECT_DEFAULTS,
      text: "123456789012",
      height: OBJECT_SIZE_DEFAULTS.height,
      encoding: "CODE128B",
    });
    canvas.add(barcode);
    return barcode;
  }

  static addDatamatrix(canvas: fabric.Canvas): fabric.FabricObject {
    const dm = new Datamatrix({
      ...OBJECT_DEFAULTS,
      ...OBJECT_SIZE_DEFAULTS,
      text: "Hello",
      cellSize: 4,
    });
    canvas.add(dm);
    return dm;
  }

  static addReverseBox(canvas: fabric.Canvas): fabric.FabricObject {
    const rect = new fabric.Rect({
      ...OBJECT_DEFAULTS,
      ...OBJECT_SIZE_DEFAULTS,
      fill: "black",
      stroke: "transparent",
      strokeWidth: 0,
      strokeUniform: true,
    });
    canvas.add(rect);
    return rect;
  }

  static addBar(canvas: fabric.Canvas): fabric.FabricObject {
    const rect = new fabric.Rect({
      ...OBJECT_DEFAULTS,
      width: OBJECT_SIZE_DEFAULTS.width,
      height: Math.round(OBJECT_SIZE_DEFAULTS.height / 4),
      fill: "black",
      stroke: "transparent",
      strokeWidth: 0,
      strokeUniform: true,
    });
    canvas.add(rect);
    return rect;
  }

  static addObject(canvas: fabric.Canvas, objType: OjectType): fabric.FabricObject | undefined {
    switch (objType) {
      case "text":
        return this.addText(canvas);
      case "line":
        return this.addHLine(canvas);
      case "circle":
        return this.addCircle(canvas);
      case "rectangle":
        return this.addRect(canvas);
      case "image":
        this.addImageWithFilePicker(canvas);
        return;
      case "qrcode":
        return this.addQrCode(canvas);
      case "aruco":
        return this.addArUco(canvas);
      case "barcode":
        return this.addBarcode(canvas);
      case "datamatrix":
        return this.addDatamatrix(canvas);
      case "reverseBox":
        return this.addReverseBox(canvas);
      case "bar":
        return this.addBar(canvas);
    }
  }
}
