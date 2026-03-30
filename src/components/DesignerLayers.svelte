<script lang="ts">
  import * as fabric from "fabric";
  import { Barcode } from "$/fabric-object/barcode";
  import { QRCode } from "$/fabric-object/qrcode";
  import { ArUcoMarker } from "$/fabric-object/aruco";
  import { Datamatrix } from "$/fabric-object/datamatrix";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import type { MaterialIcon } from "$/styles/mdi_icons";

  interface Props {
    canvas: fabric.Canvas | undefined;
    /** increments whenever canvas objects change — drives re-render */
    revision: number;
    onSelectionChange?: () => void;
  }

  let { canvas, revision, onSelectionChange }: Props = $props();

  const objectIcon = (obj: fabric.FabricObject): MaterialIcon => {
    if (obj instanceof fabric.IText || obj instanceof fabric.Textbox) return "title";
    if (obj instanceof Barcode) return "view_week";
    if (obj instanceof QRCode) return "qr_code_2";
    if (obj instanceof Datamatrix) return "grid_3x3";
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

  const objectLabel = (obj: fabric.FabricObject): string => {
    if (obj instanceof fabric.IText || obj instanceof fabric.Textbox) {
      const t = (obj as fabric.IText).text ?? "";
      return t.length > 20 ? t.slice(0, 20) + "…" : t || "Text";
    }
    if (obj instanceof Barcode) return `Barcode (${(obj as any).encoding ?? ""})`;
    if (obj instanceof QRCode) return "QR Code";
    if (obj instanceof Datamatrix) return `Datamatrix: ${(obj as Datamatrix).text.slice(0, 12)}`;
    if (obj instanceof ArUcoMarker) return `ArUco #${(obj as any).markerId ?? 0}`;
    if (obj instanceof fabric.FabricImage) return "Image";
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
    if (obj instanceof fabric.Circle) return "Circle";
    if (obj instanceof fabric.Line) return "Line";
    return obj.type ?? "Object";
  };

  const objects = $derived.by(() => {
    void revision; // track changes
    if (!canvas) return [];
    return [...canvas.getObjects()].reverse(); // top-most first
  });

  const isSelected = (obj: fabric.FabricObject) => {
    if (!canvas) return false;
    const active = canvas.getActiveObjects();
    return active.includes(obj);
  };

  const selectObject = (obj: fabric.FabricObject) => {
    if (!canvas) return;
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    onSelectionChange?.();
  };

  const toggleVisibility = (obj: fabric.FabricObject, e: MouseEvent) => {
    e.stopPropagation();
    obj.visible = !obj.visible;
    canvas?.requestRenderAll();
  };

  const moveUp = (obj: fabric.FabricObject, e: MouseEvent) => {
    e.stopPropagation();
    canvas?.bringObjectForward(obj);
    canvas?.requestRenderAll();
  };

  const moveDown = (obj: fabric.FabricObject, e: MouseEvent) => {
    e.stopPropagation();
    canvas?.sendObjectBackwards(obj);
    canvas?.requestRenderAll();
  };
</script>

<div class="flex flex-col">
  {#each objects as obj (obj)}
    {@const selected = isSelected(obj)}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="flex items-center gap-1 px-2 py-1 cursor-pointer group border-b border-zinc-800/50 transition-colors
             {selected ? 'bg-zinc-700/60' : 'hover:bg-zinc-800/40'}"
      onclick={() => selectObject(obj)}>
      <span class="text-zinc-500 shrink-0 text-[14px]">
        <MdIcon icon={objectIcon(obj)} />
      </span>
      <span class="flex-1 text-[11px] text-zinc-300 truncate leading-none py-0.5">
        {objectLabel(obj)}
      </span>
      <span class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          class="w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors text-[11px]"
          title="Move up"
          onclick={(e) => moveUp(obj, e)}><MdIcon icon="keyboard_arrow_up" /></button>
        <button
          class="w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors text-[11px]"
          title="Move down"
          onclick={(e) => moveDown(obj, e)}><MdIcon icon="keyboard_arrow_down" /></button>
        <button
          class="w-4 h-4 flex items-center justify-center transition-colors text-[11px] {obj.visible
            ? 'text-zinc-500 hover:text-zinc-200'
            : 'text-zinc-600 hover:text-zinc-400'}"
          title={obj.visible ? "Hide" : "Show"}
          onclick={(e) => toggleVisibility(obj, e)}
          ><MdIcon icon={obj.visible ? "visibility" : "visibility_off"} /></button>
      </span>
    </div>
  {:else}
    <p class="text-[11px] text-zinc-600 px-3 py-2">No objects</p>
  {/each}
</div>
