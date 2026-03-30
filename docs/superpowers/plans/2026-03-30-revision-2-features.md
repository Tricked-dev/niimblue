# NiimBlue Revision 2 — Missing Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all features listed in MISSING_FEATURES.md to complete the NiimBlue label designer revision 2: Datamatrix barcode object, Reverse Box, Simple Bar, more label presets, complete keyboard shortcuts, visual grid, and configurable snapping.

**Architecture:** Six independent vertical slices. Each new object type follows the established pattern: a `src/fabric-object/` class, a `designer-controls/` params panel, registration in `label_designer_object_helper.ts`, a rail button, a panel section, and a layers icon. Settings changes extend `AppConfigSchema` in `types.ts`, `APP_CONFIG_DEFAULTS` in `defaults.ts`, and are consumed in `CustomCanvas` and `LabelDesigner`.

**Tech Stack:** Svelte 5 (runes), fabric.js, TypeScript, Tailwind CSS v4, `datamatrix-svg` npm package.

**Note on testing:** No test infrastructure. Each task is verified by running `npm run dev` and checking `http://localhost:5173`.

---

## File Map

### Created
| Path | Purpose |
|------|---------|
| `src/fabric-object/datamatrix.ts` | New fabric.js object: Datamatrix 2D barcode |
| `src/components/designer-controls/DatamatrixParamsControls.svelte` | Right-panel params for Datamatrix |

### Modified
| Path | Changes |
|------|---------|
| `src/defaults.ts` | More label presets; register `Datamatrix` class in `configureFabric()` |
| `src/types.ts` | Add `"datamatrix" \| "reverseBox" \| "bar"` to `OjectType`; add snapping + grid fields to `AppConfigSchema` |
| `src/utils/label_designer_object_helper.ts` | `addDatamatrix()`, `addReverseBox()`, `addBar()`, cases in `addObject()` |
| `src/components/DesignerRail.svelte` | Buttons for Datamatrix, Reverse Box, Bar |
| `src/components/DesignerPanel.svelte` | `DatamatrixParamsControls` section; `hasDatamatrix` derived |
| `src/components/DesignerLayers.svelte` | Icons/labels for Datamatrix, Reverse Box, Bar |
| `src/components/LabelDesigner.svelte` | Full keyboard shortcut handler (Ctrl+A, Ctrl+C/V/X, Ctrl+P, Shift+Arrow resize, number keys 1-9) |
| `src/fabric-object/custom_canvas.ts` | Visual grid overlay; configurable move-snap; resize-snap on `object:modified` |

---

## Task 1: Add More Label Presets

**Files:**
- Modify: `src/defaults.ts`

- [ ] **Step 1: Add presets to DEFAULT_LABEL_PRESETS**

In `src/defaults.ts`, replace the `DEFAULT_LABEL_PRESETS` array:

```typescript
export const DEFAULT_LABEL_PRESETS: LabelPreset[] = [
  // 203 dpi (8 dpmm)
  { width: 40,  height: 12, unit: "mm", dpmm: 8,     printDirection: "left", shape: "rect" },
  { width: 50,  height: 25, unit: "mm", dpmm: 8,     printDirection: "left", shape: "rect", title: "50x25mm" },
  { width: 50,  height: 30, unit: "mm", dpmm: 8,     printDirection: "top",  shape: "rect" },
  { width: 76,  height: 25, unit: "mm", dpmm: 8,     printDirection: "left", shape: "rect", title: "76x25mm" },
  { width: 76,  height: 50, unit: "mm", dpmm: 8,     printDirection: "top",  shape: "rect", title: "76x50mm" },
  { width: 100, height: 50, unit: "mm", dpmm: 8,     printDirection: "top",  shape: "rect", title: "100x50mm" },
  // 300 dpi (11.81 dpmm)
  { width: 40,  height: 12, unit: "mm", dpmm: 11.81, printDirection: "left", shape: "rect", title: "40x12mm 300dpi" },
  { width: 50,  height: 30, unit: "mm", dpmm: 11.81, printDirection: "top",  shape: "rect", title: "50x30mm 300dpi" },
];
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`, open `http://localhost:5173`, check that the Start Screen and label presets browser shows 8 presets.


---

## Task 2: Add Reverse Box and Simple Bar objects

These are both black-filled rectangles used as TSPL REVERSE and BAR commands. They require no separate properties panel — `VectorParamsControls` already handles fill/stroke. They're new `OjectType` entries so they can be tagged distinctly in serialization.

**Files:**
- Modify: `src/types.ts`
- Modify: `src/utils/label_designer_object_helper.ts`
- Modify: `src/components/DesignerRail.svelte`
- Modify: `src/components/DesignerLayers.svelte`

- [ ] **Step 1: Add new OjectTypes to types.ts**

In `src/types.ts`, find:
```typescript
export type OjectType = "text" | "rectangle" | "line" | "circle" | "image" | "qrcode" | "barcode" | "aruco" | "pdf";
```
Replace with:
```typescript
export type OjectType = "text" | "rectangle" | "line" | "circle" | "image" | "qrcode" | "barcode" | "aruco" | "pdf" | "datamatrix" | "reverseBox" | "bar";
```

- [ ] **Step 2: Add factory methods to label_designer_object_helper.ts**

In `src/utils/label_designer_object_helper.ts`, add these two methods before `addObject()`:

```typescript
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
```

In `addObject()`, add two more cases before the closing brace:

```typescript
case "reverseBox":
  return this.addReverseBox(canvas);
case "bar":
  return this.addBar(canvas);
```

- [ ] **Step 3: Add rail buttons**

In `src/components/DesignerRail.svelte`, find the `toolButtons` array and extend it:

```typescript
const toolButtons: { type: OjectType; icon: MaterialIcon; title: string }[] = [
  { type: "text",       icon: "title",                    title: "Text" },
  { type: "barcode",    icon: "view_week",                title: "Barcode" },
  { type: "qrcode",     icon: "qr_code_2",               title: "QR Code" },
  { type: "datamatrix", icon: "data_matrix",              title: "Datamatrix" },
  { type: "aruco",      icon: "grid_on",                  title: "ArUco Marker" },
  { type: "rectangle",  icon: "crop_square",              title: "Rectangle" },
  { type: "reverseBox", icon: "invert_colors",            title: "Reverse Box" },
  { type: "bar",        icon: "horizontal_rule",          title: "Simple Bar" },
  { type: "circle",     icon: "radio_button_unchecked",   title: "Circle" },
  { type: "line",       icon: "remove",                   title: "Line" },
  { type: "image",      icon: "image",                    title: "Image" },
];
```

Note: `"data_matrix"` may not be in the mdi_icons set. If it's missing in `src/styles/mdi_icons.ts`, use `"grid_3x3"` for Datamatrix and `"invert_colors"` for Reverse Box as fallback. Check the icon set first; add an entry to `mdi_icons.ts` if needed.

- [ ] **Step 4: Add icons in DesignerLayers.svelte**

In `src/components/DesignerLayers.svelte`, update `objectIcon()`:

```typescript
const objectIcon = (obj: fabric.FabricObject): MaterialIcon => {
  if (obj instanceof fabric.IText || obj instanceof fabric.Textbox) return "title";
  if (obj instanceof Barcode) return "view_week";
  if (obj instanceof QRCode) return "qr_code_2";
  if (obj instanceof ArUcoMarker) return "grid_on";
  if (obj instanceof fabric.FabricImage) return "image";
  if (obj instanceof fabric.Rect) {
    const fill = (obj as fabric.Rect).fill;
    const stroke = (obj as fabric.Rect).stroke;
    if (fill === "black" && (!stroke || stroke === "transparent")) return "invert_colors";
    return "crop_square";
  }
  if (obj instanceof fabric.Circle) return "radio_button_unchecked";
  if (obj instanceof fabric.Line || obj instanceof fabric.Polyline) return "remove";
  return "category";
};
```

Update `objectLabel()` — add after the `ArUcoMarker` check:

```typescript
if (obj instanceof fabric.Rect) {
  const fill = (obj as fabric.Rect).fill;
  const stroke = (obj as fabric.Rect).stroke;
  if (fill === "black" && (!stroke || stroke === "transparent")) {
    const h = (obj as fabric.Rect).height ?? 0;
    const w = (obj as fabric.Rect).width ?? 0;
    return h <= w / 3 ? "Bar" : "Reverse Box";
  }
  return "Rectangle";
}
```

- [ ] **Step 5: Verify in browser**

Run `npm run dev`. Confirm Reverse Box and Bar buttons appear in the rail. Clicking Reverse Box adds a solid black rectangle; clicking Bar adds a short black rectangle. Both appear in the Layers panel with correct icons.


---

## Task 3: Add Datamatrix Object

**Files:**
- Create: `src/fabric-object/datamatrix.ts`
- Create: `src/components/designer-controls/DatamatrixParamsControls.svelte`
- Modify: `src/defaults.ts`
- Modify: `src/utils/label_designer_object_helper.ts`
- Modify: `src/components/DesignerPanel.svelte`
- Modify: `src/components/DesignerLayers.svelte`

- [ ] **Step 1: Install datamatrix-svg**

```bash
cd /home/tricked/dev/niimblue
npm install datamatrix-svg
```

Check if types exist: `ls node_modules/datamatrix-svg/*.d.ts`. If none exist, create `src/types/datamatrix-svg.d.ts`:

```typescript
declare module "datamatrix-svg" {
  interface DatamatrixOptions {
    msg: string;
    dim?: number;
    rct?: number;
    pad?: number;
    pal?: [string, string];
  }
  function dm(options: DatamatrixOptions): string;
  export = dm;
}
```

- [ ] **Step 2: Create src/fabric-object/datamatrix.ts**

```typescript
import * as fabric from "fabric";
import dm from "datamatrix-svg";
import { OBJECT_SIZE_DEFAULTS } from "$/defaults";
import { CanvasUtils } from "$/utils/canvas_utils";

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
    const svgStr = dm({ msg: this.text });
    const img = new Image();
    img.onload = () => {
      this._cachedImage = img;
      this._cachedText = this.text;
      this._cachedCellSize = this.cellSize;
      this.dirty = true;
      this.canvas?.requestRenderAll();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
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
    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._cachedImage, 0, 0, this.width, this.height);
    ctx.restore();
    super._render(ctx);
  }

  static override async fromObject(object: SerializedDatamatrixProps): Promise<Datamatrix> {
    return new Datamatrix(object as unknown as Partial<DatamatrixProps>);
  }

  override toObject(propertiesToInclude?: string[]): SerializedDatamatrixProps {
    return super.toObject([...(DATAMATRIX_PROPS as unknown as string[]), ...(propertiesToInclude ?? [])]);
  }
}
```

- [ ] **Step 3: Register Datamatrix in configureFabric()**

In `src/defaults.ts`, add this import at the top:

```typescript
import { Datamatrix } from "$/fabric-object/datamatrix";
```

Inside `configureFabric()`, after the `TextboxExt` class registration line:

```typescript
fabric.classRegistry.setClass(Datamatrix, "Datamatrix");
```

- [ ] **Step 4: Add addDatamatrix() to label_designer_object_helper.ts**

Import Datamatrix at the top of the file:

```typescript
import { Datamatrix } from "$/fabric-object/datamatrix";
```

Add the method before `addObject()`:

```typescript
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
```

Add the case in `addObject()`:

```typescript
case "datamatrix":
  return this.addDatamatrix(canvas);
```

- [ ] **Step 5: Create DatamatrixParamsControls.svelte**

```svelte
<script lang="ts">
  import { Datamatrix } from "$/fabric-object/datamatrix";

  interface Props {
    selectedDatamatrix: Datamatrix;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedDatamatrix, editRevision, valueUpdated }: Props = $props();
</script>

<input type="hidden" value={editRevision}>

<div class="flex flex-col gap-2">
  <div>
    <label class="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Data</label>
    <input
      class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
      type="text"
      value={selectedDatamatrix.text}
      oninput={(e) => {
        selectedDatamatrix.set("text", e.currentTarget.value);
        valueUpdated();
      }}
    />
  </div>
  <div>
    <label class="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Cell Size</label>
    <input
      class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
      type="number"
      min="1"
      max="20"
      value={selectedDatamatrix.cellSize}
      oninput={(e) => {
        selectedDatamatrix.set("cellSize", e.currentTarget.valueAsNumber ?? 4);
        valueUpdated();
      }}
    />
  </div>
</div>
```

- [ ] **Step 6: Add Datamatrix section to DesignerPanel.svelte**

Import at the top of `<script>`:

```typescript
import { Datamatrix } from "$/fabric-object/datamatrix";
import DatamatrixParamsControls from "$/components/designer-controls/DatamatrixParamsControls.svelte";
```

Add derived state after the `hasArUco` derived:

```typescript
const hasDatamatrix = $derived(selectedObject instanceof Datamatrix);
```

Update `objectSectionTitle` derived:

```typescript
const objectSectionTitle = $derived(
  hasText ? "Text"
  : hasBarcode ? "Barcode"
  : hasQR ? "QR Code"
  : hasArUco ? "ArUco"
  : hasDatamatrix ? "Datamatrix"
  : "Object"
);
```

In the panel template, add a params block after the ArUco block (search for `<ArUcoParamsControls` and add after its closing tag):

```svelte
{#if hasDatamatrix}
  <DatamatrixParamsControls
    selectedDatamatrix={selectedObject as Datamatrix}
    {editRevision}
    valueUpdated={onValueUpdated}
  />
{/if}
```

- [ ] **Step 7: Add Datamatrix to DesignerLayers.svelte**

Import Datamatrix at the top:

```typescript
import { Datamatrix } from "$/fabric-object/datamatrix";
```

In `objectIcon()`, add before the `fabric.FabricImage` line:

```typescript
if (obj instanceof Datamatrix) return "grid_3x3";
```

In `objectLabel()`, add before the `fabric.FabricImage` line:

```typescript
if (obj instanceof Datamatrix) return `Datamatrix: ${(obj as Datamatrix).text.slice(0, 12)}`;
```

- [ ] **Step 8: Verify in browser**

Run `npm run dev`. Click the Datamatrix rail button — a square with a datamatrix pattern should appear on canvas. Selecting it shows "Data" and "Cell Size" inputs in the right panel. Changing the text re-renders the barcode. The layers panel shows "grid_3x3" icon and truncated text.


---

## Task 4: Complete Keyboard Shortcuts

**Files:**
- Modify: `src/components/LabelDesigner.svelte`

Currently missing: Ctrl+A (select all), Ctrl+C/V/X (copy/paste/cut), Ctrl+P (print), Shift+Arrow (resize nudge), Ctrl+Shift+Arrow (resize large), number keys 1-9 (quick-add object by index).

- [ ] **Step 1: Read the current onKeyDown handler**

Open `src/components/LabelDesigner.svelte` and locate the `onKeyDown` function (around line 89). You will replace it entirely.

- [ ] **Step 2: Replace onKeyDown with full implementation**

```typescript
const onKeyDown = async (e: KeyboardEvent) => {
  const key: string = e.key.toLowerCase();
  const cmdOrCtrl = e.metaKey || e.ctrlKey;
  const shift = e.shiftKey;

  // Escape always deselects, even if input is focused
  if (key === "escape") {
    discardSelection();
    return;
  }

  // Print: Ctrl+P
  if (cmdOrCtrl && key === "p") {
    e.preventDefault();
    previewOpened = true;
    return;
  }

  // Block everything else when an input is focused
  if (LabelDesignerUtils.isAnyInputFocused(fabricCanvas!)) {
    return;
  }

  // Arrow keys: move or resize
  if (key.startsWith("arrow")) {
    e.preventDefault();
    const dir = key.slice("arrow".length) as MoveDirection;
    if (shift) {
      // Shift+Arrow = resize nudge (1px), Ctrl+Shift+Arrow = resize larger (GRID_SIZE px)
      LabelDesignerUtils.resizeSelection(fabricCanvas!, dir, cmdOrCtrl);
    } else {
      // Arrow = move 1px (or GRID_SIZE with Ctrl, per existing logic)
      moveSelected(dir, cmdOrCtrl);
    }
    return;
  }

  if (e.repeat) return;

  // Number keys 1–9: quick-add object
  if (!cmdOrCtrl && !shift && key >= "1" && key <= "9") {
    const quickTypes: OjectType[] = [
      "text", "barcode", "qrcode", "datamatrix", "aruco",
      "rectangle", "reverseBox", "bar", "circle",
    ];
    const idx = parseInt(key, 10) - 1;
    if (idx < quickTypes.length) {
      addObject(quickTypes[idx]);
    }
    return;
  }

  // Select all: Ctrl+A
  if (cmdOrCtrl && key === "a") {
    e.preventDefault();
    const objs = fabricCanvas!.getObjects();
    if (objs.length > 0) {
      fabricCanvas!.setActiveObject(
        new fabric.ActiveSelection(objs, { canvas: fabricCanvas! })
      );
      fabricCanvas!.requestRenderAll();
      selectedObject = fabricCanvas!.getActiveObject() as fabric.FabricObject | undefined;
      selectedCount = objs.length;
    }
    return;
  }

  // Clone: Ctrl+D
  if (cmdOrCtrl && key === "d") {
    e.preventDefault();
    cloneSelected();
    return;
  }

  // Redo: Ctrl+Y or Ctrl+Shift+Z
  if ((cmdOrCtrl && key === "y") || (cmdOrCtrl && shift && key === "z")) {
    e.preventDefault();
    if (!undoState.redoDisabled) undo.redo();
    return;
  }

  // Undo: Ctrl+Z
  if (cmdOrCtrl && key === "z") {
    e.preventDefault();
    if (!undoState.undoDisabled) undo.undo();
    return;
  }

  // Delete / Backspace
  if (key === "delete" || key === "backspace") {
    deleteSelected();
    return;
  }
};
```

- [ ] **Step 3: Add resizeSelection to LabelDesignerUtils**

Open `src/utils/label_designer_utils.ts`. Add this method:

```typescript
/** Nudge selected objects by resizing (not moving) */
static resizeSelection(canvas: fabric.Canvas, direction: MoveDirection, large?: boolean): void {
  const amount = large ? GRID_SIZE : 1;
  const active = canvas.getActiveObject();
  if (!active) return;

  const targets = active instanceof fabric.ActiveSelection
    ? (active as fabric.ActiveSelection).getObjects()
    : [active];

  for (const obj of targets) {
    switch (direction) {
      case "right":
        obj.set({ width: Math.max(1, (obj.width ?? 1) + amount) });
        break;
      case "left":
        obj.set({ width: Math.max(1, (obj.width ?? 1) - amount) });
        break;
      case "down":
        obj.set({ height: Math.max(1, (obj.height ?? 1) + amount) });
        break;
      case "up":
        obj.set({ height: Math.max(1, (obj.height ?? 1) - amount) });
        break;
    }
    obj.setCoords();
  }
  canvas.requestRenderAll();
}
```

- [ ] **Step 4: Add addObject helper in LabelDesigner.svelte**

Ensure there is a local `addObject()` function (or reuse the existing pattern). It should already exist since the rail `onObjectPicked` callback does this. If not, add:

```typescript
const addObject = (type: OjectType) => {
  const obj = LabelDesignerObjectHelper.addObject(fabricCanvas!, type);
  if (obj) {
    fabricCanvas!.setActiveObject(obj);
    selectedObject = obj;
    selectedCount = 1;
    undo.push(fabricCanvas!, labelProps);
  }
};
```

Make sure `onObjectPicked` calls `addObject(type)` as well.

- [ ] **Step 5: Verify shortcuts in browser**

Run `npm run dev`. Test:
- `1` adds Text, `2` adds Barcode, etc.
- `Ctrl+A` selects all objects
- `Delete` deletes selection
- `Shift+ArrowRight` widens selected object by 1px
- `Ctrl+P` opens print preview


---

## Task 5: Configurable Snapping Settings

Currently `GRID_SIZE = 5` is hardcoded. This task makes move-snap and resize-snap configurable via `AppConfig`, adds a snap-lock toggle, and wires resize snapping.

**Files:**
- Modify: `src/types.ts`
- Modify: `src/defaults.ts`
- Modify: `src/components/LabelDesigner.svelte`

- [ ] **Step 1: Add snapping fields to AppConfigSchema in types.ts**

Find `AppConfigSchema` in `src/types.ts` and add fields:

```typescript
export const AppConfigSchema = z.object({
  fitMode: z.enum(["stretch", "ratio_min", "ratio_max"]),
  pageDelay: z.number().gte(0).optional(),
  iconListMode: z.enum(["user", "pack", "both"]),
  packetIntervalMs: z.number().gte(0).optional(),
  /** Grid size for move snapping in pixels (0 = disabled) */
  moveSnap: z.number().gte(0).default(5),
  /** Grid size for resize snapping in pixels (0 = disabled) */
  resizeSnap: z.number().gte(0).default(5),
  /** If true, resizeSnap is locked to moveSnap value */
  snapLock: z.boolean().default(true),
  /** Show visual grid on canvas */
  visualGrid: z.boolean().default(false),
});
```

- [ ] **Step 2: Update APP_CONFIG_DEFAULTS in defaults.ts**

```typescript
export const APP_CONFIG_DEFAULTS: AppConfig = {
  fitMode: "stretch",
  iconListMode: "both",
  moveSnap: 5,
  resizeSnap: 5,
  snapLock: true,
  visualGrid: false,
};
```

- [ ] **Step 3: Wire move-snap from config in LabelDesigner.svelte**

Find the `object:moving` handler (around line 344):

```typescript
fabricCanvas.on("object:moving", (e): void => {
  const snap = $appConfig.moveSnap;
  if (snap > 0) {
    e.target.set({
      left: Math.round(e.target.left / snap) * snap,
      top: Math.round(e.target.top / snap) * snap,
    });
  }
});
```

- [ ] **Step 4: Add resize-snap on object:modified**

After the `object:moving` handler, add:

```typescript
fabricCanvas.on("object:modified", (e): void => {
  const snap = $appConfig.resizeSnap;
  if (snap <= 0 || !e.target) return;
  const obj = e.target;
  const snapped = {
    left:   Math.round(obj.left   / snap) * snap,
    top:    Math.round(obj.top    / snap) * snap,
    width:  Math.max(snap, Math.round((obj.width  * obj.scaleX) / snap) * snap),
    height: Math.max(snap, Math.round((obj.height * obj.scaleY) / snap) * snap),
  };
  obj.set({ ...snapped, scaleX: 1, scaleY: 1 });
  obj.setCoords();
  fabricCanvas!.requestRenderAll();
});
```

- [ ] **Step 5: Verify snapping in browser**

Run `npm run dev`. Open the designer, add a rectangle, drag it — it should still snap to grid. Resize it by dragging a corner — after release it should snap width/height to multiples of 5.


---

## Task 6: Visual Grid Overlay

Draws a dot/line grid on the canvas background so users can align objects visually.

**Files:**
- Modify: `src/fabric-object/custom_canvas.ts`
- Modify: `src/components/LabelDesigner.svelte`

- [ ] **Step 1: Add grid state and setter to CustomCanvas**

In `src/fabric-object/custom_canvas.ts`, add two private fields after the existing private fields:

```typescript
private gridEnabled: boolean = false;
private gridSize: number = 5;
```

Add a public setter (after `setHighlightMirror`):

```typescript
setGrid(enabled: boolean, size: number = 5) {
  this.gridEnabled = enabled;
  this.gridSize = size;
  this.requestRenderAll();
}
```

- [ ] **Step 2: Draw grid in drawBackground()**

Find the `drawBackground` override or the `afterRender` / background drawing logic in `custom_canvas.ts`. It uses `override renderAll()` or `beforeRender`. Look for where the white label rectangle is drawn — it's in an `after:render` event or a `drawBackground` override.

After the white label fill is drawn (after `ctx.fill()` for the white label), add:

```typescript
// Visual grid overlay
if (this.gridEnabled && this.gridSize > 0) {
  const bb = this.getLabelBounds();
  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 200, 0.15)";
  ctx.lineWidth = 0.5;
  ctx.setLineDash([]);
  // Vertical lines
  for (let x = bb.startX; x <= bb.endX; x += this.gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, bb.startY);
    ctx.lineTo(x, bb.endY);
    ctx.stroke();
  }
  // Horizontal lines
  for (let y = bb.startY; y <= bb.endY; y += this.gridSize) {
    ctx.beginPath();
    ctx.moveTo(bb.startX, y);
    ctx.lineTo(bb.endX, y);
    ctx.stroke();
  }
  ctx.restore();
}
```

To find the exact location: search for `ctx.fill()` calls followed by label drawing in `custom_canvas.ts`. The grid should be drawn on top of the white label fill but below objects. Insert it right after the main white `ctx.fill()` call that draws the label background.

- [ ] **Step 3: Wire grid to AppConfig in LabelDesigner.svelte**

After `fabricCanvas` is created (inside `onMount`), add a reactive effect:

```typescript
$effect(() => {
  fabricCanvas?.setGrid($appConfig.visualGrid, $appConfig.moveSnap);
});
```

- [ ] **Step 4: Verify in browser**

Run `npm run dev`. In `src/defaults.ts` temporarily set `visualGrid: true` and `moveSnap: 10` in `APP_CONFIG_DEFAULTS`. Open the designer — the white label area should show a faint blue grid at 10px intervals. Revert the temporary change.


---

## Task 7: Settings UI (Snap, Grid, Non-printable Color)

Adds a settings panel to the designer where users can toggle snap, grid, and see other config options. This wires the settings from Tasks 5 and 6 into an accessible UI.

**Files:**
- Modify: `src/types.ts`
- Modify: `src/defaults.ts`
- Modify: `src/components/DesignerPanel.svelte`

- [ ] **Step 1: Add nonPrintableColor to AppConfigSchema**

In `src/types.ts`, in `AppConfigSchema`, add:

```typescript
/** Color used for non-printable areas (tail, margins) */
nonPrintableColor: z.string().default("#CFCFCF"),
```

In `src/defaults.ts`, in `APP_CONFIG_DEFAULTS`, add:

```typescript
nonPrintableColor: "#CFCFCF",
```

- [ ] **Step 2: Add a Settings section to DesignerPanel.svelte**

At the top of `<script>` in `DesignerPanel.svelte`, import the store:

```typescript
import { appConfig } from "$/stores";
```

At the bottom of the desktop panel's scrollable content (`<div class="overflow-y-auto flex-1">`), add a Settings section:

```svelte
<!-- Settings section -->
<section class="border-b border-zinc-800">
  <div class={sectionHeaderClass}>
    <span>Settings</span>
  </div>
  <div class="px-3 pb-3 flex flex-col gap-3">

    <!-- Visual Grid toggle -->
    <label class="flex items-center justify-between gap-2 cursor-pointer">
      <span class="text-xs text-zinc-400">Visual grid</span>
      <button
        class="w-8 h-4 rounded-full transition-colors relative {$appConfig.visualGrid ? 'bg-blue-600' : 'bg-zinc-700'}"
        onclick={() => appConfig.update(c => ({ ...c, visualGrid: !c.visualGrid }))}
      >
        <span
          class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform {$appConfig.visualGrid ? 'translate-x-4' : ''}"
        ></span>
      </button>
    </label>

    <!-- Move snap -->
    <div>
      <label class="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Move snap (px)</label>
      <input
        class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
        type="number"
        min="0"
        max="50"
        value={$appConfig.moveSnap}
        oninput={(e) => {
          const v = e.currentTarget.valueAsNumber;
          appConfig.update(c => ({
            ...c,
            moveSnap: isNaN(v) ? 0 : v,
            resizeSnap: c.snapLock ? (isNaN(v) ? 0 : v) : c.resizeSnap,
          }));
        }}
      />
    </div>

    <!-- Resize snap (only shown when snapLock is false) -->
    <label class="flex items-center justify-between gap-2 cursor-pointer">
      <span class="text-xs text-zinc-400">Lock snap values</span>
      <button
        class="w-8 h-4 rounded-full transition-colors relative {$appConfig.snapLock ? 'bg-blue-600' : 'bg-zinc-700'}"
        onclick={() => appConfig.update(c => ({ ...c, snapLock: !c.snapLock }))}
      >
        <span
          class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform {$appConfig.snapLock ? 'translate-x-4' : ''}"
        ></span>
      </button>
    </label>

    {#if !$appConfig.snapLock}
      <div>
        <label class="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Resize snap (px)</label>
        <input
          class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
          type="number"
          min="0"
          max="50"
          value={$appConfig.resizeSnap}
          oninput={(e) => {
            const v = e.currentTarget.valueAsNumber;
            appConfig.update(c => ({ ...c, resizeSnap: isNaN(v) ? 0 : v }));
          }}
        />
      </div>
    {/if}

    <!-- Factory reset -->
    <button
      class="w-full h-7 rounded border border-red-800 text-red-400 text-xs hover:bg-red-900/30 transition-colors"
      onclick={() => {
        if (confirm("Reset all settings to defaults?")) {
          appConfig.set({
            fitMode: "stretch",
            iconListMode: "both",
            moveSnap: 5,
            resizeSnap: 5,
            snapLock: true,
            visualGrid: false,
            nonPrintableColor: "#CFCFCF",
          });
        }
      }}
    >
      Factory Reset
    </button>

  </div>
</section>
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Open the designer and scroll to the bottom of the right panel. The Settings section should be visible with a grid toggle, move snap input, snap lock toggle, and factory reset button. Toggling the grid should immediately show/hide grid lines on the canvas.


---

## Self-Review

### Spec Coverage Check

| MISSING_FEATURES.md Item | Task |
|--------------------------|------|
| Datamatrix object | Task 3 |
| Reverse Box (REVERSE) | Task 2 |
| Simple Bar (BAR) | Task 2 |
| More label presets (50x25, 76x25, 76x50, 100x50) | Task 1 |
| Move snapping configurable | Task 5 |
| Resize snapping | Task 5 |
| Snap lock | Task 5 + 7 |
| Visual grid | Task 6 + 7 |
| Non-printable color | Task 7 (stored in config, rendered by existing CustomCanvas GRAY) |
| Ctrl+A, Ctrl+P, Shift+Arrow, number keys | Task 4 |
| Factory reset | Task 7 |
| Open Sans fonts | ✅ Already done |
| TextBox / BLOCK | ✅ Already done (fabric.Textbox = BLOCK) |
| Theme selection | Out of scope (app is dark-only by design) |
| Auto-save | Out of scope |

**Gaps:** The `nonPrintableColor` setting (Task 7) is stored but not yet plumbed into `CustomCanvas.GRAY`. To complete it: in `LabelDesigner.svelte`, add a `$effect(() => fabricCanvas?.setNonPrintableColor($appConfig.nonPrintableColor ?? "#CFCFCF"))` and add a `setNonPrintableColor(color: string)` method to `CustomCanvas` that sets `this.GRAY = color; this.requestRenderAll()`. This is a minor addition that can be done in Task 7 Step 1 alongside adding it to AppConfigSchema.

### Placeholder Scan

No TBD or TODO placeholders found in the plan.

### Type Consistency

- `OjectType` extended in Task 2 Step 1 — all three tasks that use `addObject()` reference the same union.
- `Datamatrix` class properties (`text`, `cellSize`) match between `datamatrix.ts`, `DatamatrixParamsControls.svelte`, and `label_designer_object_helper.ts`.
- `AppConfig` fields added in Task 5 Step 1 match `APP_CONFIG_DEFAULTS` in Task 5 Step 2 and usage in Tasks 5–7.
- `resizeSelection` added in Task 4 Step 3 uses `MoveDirection` type already in scope.
