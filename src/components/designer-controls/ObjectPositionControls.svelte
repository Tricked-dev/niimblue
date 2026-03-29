<script lang="ts">
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { tr } from "$/utils/i18n";
  import * as fabric from "fabric";
  import { onDestroy } from "svelte";
  import QRCode from "$/fabric-object/qrcode";
  import Barcode from "$/fabric-object/barcode";

  let open = $state(false);

  interface Props {
    selectedObject: fabric.FabricObject;
  }

  let { selectedObject }: Props = $props();
  let prevObject: fabric.FabricObject | undefined;

  let x = $state<number>();
  let y = $state<number>();
  let width = $state<number>();
  let height = $state<number>();

  const objectDimensionsChanged = () => {
    const pos = selectedObject.getPointByOrigin("left", "top");
    x = pos.x;
    y = pos.y;
    width = selectedObject.width;
    height = selectedObject.height;
  };

  const objectChanged = (newObject: fabric.FabricObject) => {
    if (prevObject !== undefined) {
      prevObject.off("modified", objectDimensionsChanged);
    }

    newObject.on("modified", objectDimensionsChanged);
    objectDimensionsChanged();

    prevObject = newObject;
  };

  const updateObject = () => {
    const newPos = new fabric.Point(Math.round(x!), Math.round(y!));

    selectedObject.setPositionByOrigin(newPos, "left", "top");

    selectedObject.set({
      width: Math.round(Math.max(width!, 1)),
      height: Math.round(Math.max(height!, 1)),
    });

    selectedObject.setCoords();
    selectedObject.canvas?.requestRenderAll();
  };

  onDestroy(() => selectedObject.off("modified", objectDimensionsChanged));

  $effect(() => {
    objectChanged(selectedObject);
  });
</script>

<svelte:window onclick={() => open = false} />

<div class="relative" onclick={(e) => e.stopPropagation()}>
  <button
    class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors"
    type="button"
    onclick={() => open = !open}
    title={$tr("params.generic.position")}>
    <MdIcon icon="control_camera" />
  </button>
  {#if open}
  <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 p-2 flex flex-col gap-2">
    <div class="flex items-stretch flex-nowrap mb-2">
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">x</span>
      <input class="w-full bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" type="number" bind:value={x} onchange={updateObject} />
    </div>
    <div class="flex items-stretch flex-nowrap mb-2">
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">y</span>
      <input class="w-full bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" type="number" bind:value={y} onchange={updateObject} />
    </div>
    {#if !(selectedObject instanceof fabric.FabricText || selectedObject instanceof fabric.FabricImage || selectedObject instanceof QRCode || selectedObject instanceof Barcode)}
      <div class="flex items-stretch flex-nowrap mb-2">
        <input class="w-full bg-zinc-800 border border-zinc-700 rounded-l px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" type="number" min="1" bind:value={width} onchange={updateObject} />
        <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 border-l-0 text-zinc-500 text-[11px] shrink-0">x</span>
        <input class="w-full bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" type="number" min="1" bind:value={height} onchange={updateObject} />
      </div>
    {/if}
  </div>
  {/if}
</div>
