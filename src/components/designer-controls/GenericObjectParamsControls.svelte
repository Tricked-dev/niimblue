<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import { appConfig } from "$/stores";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import ObjectPositionControls from "$/components/designer-controls/ObjectPositionControls.svelte";

  interface Props {
    selectedObject: fabric.FabricObject;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedObject, editRevision, valueUpdated }: Props = $props();

  const putToCenterV = () => { selectedObject.canvas!.centerObjectV(selectedObject); valueUpdated(); };
  const putToCenterH = () => { selectedObject.canvas!.centerObjectH(selectedObject); valueUpdated(); };

  const moveToLeftEdge = () => {
    selectedObject.setPositionByOrigin(new fabric.Point(0, selectedObject.getPointByOrigin("left","top").y), "left", "top");
    selectedObject.setCoords();
    selectedObject.canvas?.requestRenderAll();
    valueUpdated();
  };

  const moveToRightEdge = () => {
    const cw = selectedObject.canvas!.width;
    const ow = selectedObject.getBoundingRect().width;
    selectedObject.setPositionByOrigin(new fabric.Point(cw - ow, selectedObject.getPointByOrigin("left","top").y), "left", "top");
    selectedObject.setCoords();
    selectedObject.canvas?.requestRenderAll();
    valueUpdated();
  };

  const bringToFront = () => {
    selectedObject.canvas?.bringObjectToFront(selectedObject);
    selectedObject.canvas?.requestRenderAll();
  };

  const sendToBack = () => {
    selectedObject.canvas?.sendObjectToBack(selectedObject);
    selectedObject.canvas?.requestRenderAll();
  };

  const fit = () => {
    const imageRatio = selectedObject.width / selectedObject.height;
    const canvasRatio = selectedObject.canvas!.width / selectedObject.canvas!.height;
    if ($appConfig.fitMode === "ratio_min") {
      if (imageRatio > canvasRatio) selectedObject.scaleToWidth(selectedObject.canvas!.width);
      else selectedObject.scaleToHeight(selectedObject.canvas!.height);
      selectedObject.canvas!.centerObject(selectedObject);
    } else if ($appConfig.fitMode === "ratio_max") {
      if (imageRatio > canvasRatio) selectedObject.scaleToHeight(selectedObject.canvas!.height);
      else selectedObject.scaleToWidth(selectedObject.canvas!.width);
      selectedObject.canvas!.centerObject(selectedObject);
    } else {
      selectedObject.set({ left: 0, top: 0,
        scaleX: selectedObject.canvas!.width / selectedObject.width,
        scaleY: selectedObject.canvas!.height / selectedObject.height,
      });
    }
    valueUpdated();
  };

  const b = "inline-flex items-center justify-center px-2 h-7 rounded border text-xs transition-colors";
  const bn = "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300";
  const bi = "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500";
</script>

<input type="hidden" value={editRevision}>

<!-- Row 1: align + position + arrange -->
<div class="flex flex-wrap gap-1">
  <button class="{b} {bn}" onclick={putToCenterV} title={$tr("params.generic.center.vertical")}><MdIcon icon="vertical_distribute" /></button>
  <button class="{b} {bn}" onclick={putToCenterH} title={$tr("params.generic.center.horizontal")}><MdIcon icon="horizontal_distribute" /></button>
  <button class="{b} {bn}" onclick={moveToLeftEdge} title="Move to left edge"><MdIcon icon="align_horizontal_left" /></button>
  <button class="{b} {bn}" onclick={moveToRightEdge} title="Move to right edge"><MdIcon icon="align_horizontal_right" /></button>
  <ObjectPositionControls {selectedObject} />
</div>

<!-- Row 2: layer order -->
<div class="flex flex-wrap gap-1">
  <button class="{b} {bn}" onclick={bringToFront} title={$tr("params.generic.arrange.top")}><MdIcon icon="flip_to_front" /></button>
  <button class="{b} {bn}" onclick={sendToBack}  title={$tr("params.generic.arrange.bottom")}><MdIcon icon="flip_to_back" /></button>
</div>

{#if selectedObject instanceof fabric.FabricImage}
  <!-- Row 3: fit + mode buttons -->
  <div class="flex flex-wrap gap-1 items-center">
    <button class="{b} {bn}" onclick={fit} title={$tr("params.generic.fit")}><MdIcon icon="fit_screen" /></button>
    {#each [["stretch", $tr("params.generic.fit.mode.stretch")], ["ratio_min", $tr("params.generic.fit.mode.ratio_min")], ["ratio_max", $tr("params.generic.fit.mode.ratio_max")]] as [val, label] (val)}
      <button
        class="{b} {($appConfig.fitMode ?? 'stretch') === val ? bn : bi}"
        onclick={() => appConfig.update(v => ({ ...v, fitMode: val as "stretch" | "ratio_min" | "ratio_max" }))}>
        {label}
      </button>
    {/each}
  </div>
{/if}
