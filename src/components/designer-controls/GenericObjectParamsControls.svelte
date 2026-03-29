<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import { appConfig } from "$/stores";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import ObjectPositionControls from "$/components/designer-controls/ObjectPositionControls.svelte";

  let open = $state(false);
  let fitOpen = $state(false);

  interface Props {
    selectedObject: fabric.FabricObject;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedObject, editRevision, valueUpdated }: Props = $props();

  const putToCenterV = () => {
    selectedObject.canvas!.centerObjectV(selectedObject);
    valueUpdated();
  };

  const putToCenterH = () => {
    selectedObject.canvas!.centerObjectH(selectedObject);
    valueUpdated();
  };

  const bringTo = (to: "top" | "bottom") => {
    if (to === "top") {
      selectedObject.canvas?.bringObjectToFront(selectedObject);
    } else if (to === "bottom") {
      selectedObject.canvas?.sendObjectToBack(selectedObject);
    }
  };

  const fit = () => {
    const imageRatio = selectedObject.width / selectedObject.height;
    const canvasRatio = selectedObject.canvas!.width / selectedObject.canvas!.height;

    if ($appConfig.fitMode === "ratio_min") {
      if (imageRatio > canvasRatio) {
        selectedObject.scaleToWidth(selectedObject.canvas!.width);
      } else {
        selectedObject.scaleToHeight(selectedObject.canvas!.height);
      }
      selectedObject.canvas!.centerObject(selectedObject);
    } else if ($appConfig.fitMode === "ratio_max") {
      if (imageRatio > canvasRatio) {
        selectedObject.scaleToHeight(selectedObject.canvas!.height);
      } else {
        selectedObject.scaleToWidth(selectedObject.canvas!.width);
      }
      selectedObject.canvas!.centerObject(selectedObject);
    } else {
      selectedObject.set({
        left: 0,
        top: 0,
        scaleX: selectedObject.canvas!.width / selectedObject.width,
        scaleY: selectedObject.canvas!.height / selectedObject.height,
      });
    }
    valueUpdated();
  };

  const fitModeChanged = (e: Event & { currentTarget: HTMLSelectElement }) => {
    const fitMode = e.currentTarget.value as "stretch" | "ratio_min" | "ratio_max";
    appConfig.update((v) => ({ ...v, fitMode: fitMode }));
  };
</script>

<svelte:window onclick={() => { open = false; fitOpen = false; }} />

<input type="hidden" value={editRevision}>

<button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={putToCenterV} title={$tr("params.generic.center.vertical")}>
  <MdIcon icon="vertical_distribute" />
</button>
<button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={putToCenterH} title={$tr("params.generic.center.horizontal")}>
  <MdIcon icon="horizontal_distribute" />
</button>

<ObjectPositionControls {selectedObject} />

<div class="relative" onclick={(e) => e.stopPropagation()}>
  <button
    class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors"
    type="button"
    onclick={() => open = !open}
    title={$tr("params.generic.arrange")}>
    <MdIcon icon="segment" />
  </button>
  {#if open}
  <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 min-w-[200px] p-2 text-center">
    <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => bringTo("top")}>
      {$tr("params.generic.arrange.top")}
    </button>
    <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => bringTo("bottom")}>
      {$tr("params.generic.arrange.bottom")}
    </button>
  </div>
  {/if}
</div>

{#if selectedObject instanceof fabric.FabricImage}
  <div class="flex items-stretch" onclick={(e) => e.stopPropagation()}>
    <button type="button" class="inline-flex items-center gap-1 px-2 h-7 rounded-l bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={fit} title={$tr("params.generic.fit")}>
      <MdIcon icon="fit_screen" />
    </button>
    <div class="relative">
      <button
        aria-label="Toggle"
        type="button"
        class="inline-flex items-center px-1 h-7 rounded-r bg-zinc-800 hover:bg-zinc-700 border border-l-0 border-zinc-700 text-zinc-300 text-xs transition-colors"
        onclick={() => fitOpen = !fitOpen}></button>
      {#if fitOpen}
      <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 p-1">
        <select class="bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500" value={$appConfig.fitMode ?? "stretch"} onchange={fitModeChanged}>
          <option value="stretch">{$tr("params.generic.fit.mode.stretch")}</option>
          <option value="ratio_min">{$tr("params.generic.fit.mode.ratio_min")}</option>
          <option value="ratio_max">{$tr("params.generic.fit.mode.ratio_max")}</option>
        </select>
      </div>
      {/if}
    </div>
  </div>
{/if}
