import { OBJECT_SIZE_DEFAULTS } from "$/defaults";
import { CanvasUtils } from "$/utils/canvas_utils";
import { encodeToMatrix, matrixToSvg } from "datamatrix-svg-ts";
import * as fabric from "fabric";

export const datamatrixDefaultValues: Partial<fabric.TClassProperties<Datamatrix>> = {
  text: "Hello",
  cellSize: 4,
  ...OBJECT_SIZE_DEFAULTS,
};

interface UniqueDatamatrixProps {
  text: string;
  cellSize: number;
}
export interface DatamatrixProps extends fabric.FabricObjectProps, UniqueDatamatrixProps {}
export interface SerializedDatamatrixProps extends fabric.SerializedObjectProps, UniqueDatamatrixProps {}
const DATAMATRIX_PROPS = ["text", "cellSize"] as const;

export class Datamatrix<
    Props extends fabric.TOptions<DatamatrixProps> = Partial<DatamatrixProps>,
    SProps extends SerializedDatamatrixProps = SerializedDatamatrixProps,
    EventSpec extends fabric.ObjectEvents = fabric.ObjectEvents,
  >
  extends fabric.FabricObject<Props, SProps, EventSpec>
  implements DatamatrixProps
{
  static override readonly type = "Datamatrix";

  declare text: string;
  declare cellSize: number;

  private _cachedImage: HTMLImageElement | null = null;
  private _cachedText: string = "";
  private _cachedCellSize: number = 0;
  private _matrixSize: number = 0;

  constructor(options?: Props) {
    super();
    Object.assign(this, datamatrixDefaultValues);
    this.setOptions(options);
    this.lockScalingFlip = true;
    this.setControlsVisibility({ ml: false, mt: false, mr: false, mb: false });
    this._buildImage();
  }

  private _buildImage() {
    if (!this.text) {
      this._cachedImage = null;
      return;
    }
    const matrixResult = encodeToMatrix(this.text, false, true);
    const dimension = Math.max(matrixResult.width, matrixResult.height);
    const svgElement = matrixToSvg(matrixResult, {
      dimension,
      padding: 0,
    });
    this._matrixSize = dimension;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const img = new Image();
    img.onload = () => {
      this._cachedImage = img;
      this._cachedText = this.text;
      this._cachedCellSize = this.cellSize;
      this.dirty = true;
      this.canvas?.requestRenderAll();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  }

  override _set(key: string, value: any): this {
    super._set(key, value);
    if (key === "text" || key === "cellSize") {
      this._buildImage();
    }
    return this;
  }

  override _render(ctx: CanvasRenderingContext2D): void {
    if (!this._cachedImage) {
      CanvasUtils.renderError(ctx, this.width, this.height);
      super._render(ctx);
      return;
    }

    const matrixScale = Math.floor(this.width / this._matrixSize);
    let renderWidth = matrixScale * this._matrixSize;
    renderWidth -= renderWidth % 2;

    if (matrixScale < 1 || renderWidth > this.width) {
      CanvasUtils.renderError(ctx, this.width, this.height);
      super._render(ctx);
      return;
    }

    ctx.save();
    ctx.translate(-renderWidth / 2, -renderWidth / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._cachedImage, 0, 0, renderWidth, renderWidth);
    ctx.restore();
    super._render(ctx);
  }

  override toObject(propertiesToInclude?: string[]): SerializedDatamatrixProps {
    return super.toObject([...(DATAMATRIX_PROPS as unknown as string[]), ...(propertiesToInclude ?? [])]);
  }
}
