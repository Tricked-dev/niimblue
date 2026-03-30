import { OBJECT_SIZE_DEFAULTS } from "$/defaults";
import { CanvasUtils } from "$/utils/canvas_utils";
import { encodeToMatrix } from "datamatrix-svg-ts";
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

  constructor(options?: Props) {
    super();
    Object.assign(this, datamatrixDefaultValues);
    this.setOptions(options);
    this.lockScalingFlip = true;
    this.setControlsVisibility({ ml: false, mt: false, mr: false, mb: false });
  }

  override _set(key: string, value: any): this {
    super._set(key, value);
    if (key === "text" || key === "cellSize") {
      this.dirty = true;
    }
    return this;
  }

  override _render(ctx: CanvasRenderingContext2D): void {
    if (!this.text) {
      CanvasUtils.renderError(ctx, this.width, this.height);
      super._render(ctx);
      return;
    }

    let matrixResult;
    try {
      matrixResult = encodeToMatrix(this.text, false, true);
    } catch (e) {
      CanvasUtils.renderError(ctx, this.width, this.height);
      super._render(ctx);
      return;
    }

    const matrixSize = Math.max(matrixResult.width, matrixResult.height);
    const scale = Math.floor(this.width / matrixSize);
    let renderWidth = scale * matrixSize;
    renderWidth -= renderWidth % 2;

    if (scale < 1 || renderWidth > this.width) {
      CanvasUtils.renderError(ctx, this.width, this.height);
      super._render(ctx);
      return;
    }

    ctx.save();
    ctx.translate(-renderWidth / 2, -renderWidth / 2);
    ctx.translate(-0.5, -0.5);
    ctx.fillStyle = "black";
    ctx.imageSmoothingEnabled = false;

    for (let row = 0; row < matrixResult.height; row++) {
      for (let col = 0; col < matrixResult.width; col++) {
        if (matrixResult.matrix[row]?.[col] === 1) {
          ctx.fillRect(col * scale, row * scale, scale, scale);
        }
      }
    }

    ctx.restore();
    super._render(ctx);
  }

  override toObject(propertiesToInclude?: string[]): SerializedDatamatrixProps {
    return super.toObject([...(DATAMATRIX_PROPS as unknown as string[]), ...(propertiesToInclude ?? [])]);
  }
}
