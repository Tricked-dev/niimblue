<script lang="ts">
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import * as fabric from "fabric";

  interface Props {
    selectedObject: fabric.FabricObject;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedObject, editRevision, valueUpdated }: Props = $props();

  const roundRadiusChanged = (value: number) => {
    const rect = selectedObject as fabric.Rect;
    rect.set({
      rx: value,
      ry: value,
    });
    valueUpdated();
  };

  const strokeWidthChanged = (value: number) => {
    selectedObject.set({ strokeWidth: value });
    valueUpdated();
  };

  const fillChanged = (value: string) => {
    selectedObject.set({ fill: value });
    valueUpdated();
  };
</script>

<input type="hidden" value={editRevision}>

{#if selectedObject instanceof fabric.Rect}
  <div class="flex items-stretch flex-nowrap" style="width: 7em">
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.vector.round_radius")}>
      <MdIcon icon="rounded_corner" />
    </span>
    <input
      type="number"
      min="0"
      max={Math.min(selectedObject.width, selectedObject.height) / 2}
      class="w-full bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
      value={selectedObject.rx}
      oninput={(e) => roundRadiusChanged(e.currentTarget.valueAsNumber)} />
  </div>
{/if}

{#if selectedObject instanceof fabric.Rect || selectedObject instanceof fabric.Circle || selectedObject instanceof fabric.Line || selectedObject instanceof fabric.Polyline}
  <div class="flex items-stretch flex-nowrap" style="width: 7em">
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.vector.stroke_width")}>
      <MdIcon icon="line_weight" />
    </span>
    <input
      type="number"
      min="1"
      class="w-full bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
      value={selectedObject.strokeWidth}
      oninput={(e) => strokeWidthChanged(e.currentTarget.valueAsNumber)} />
  </div>
{/if}

{#if selectedObject instanceof fabric.Rect || selectedObject instanceof fabric.Circle}
  <div class="flex gap-1 flex-wrap">
    {#each [["transparent", $tr("params.color.transparent")], ["white", $tr("params.color.white")], ["black", $tr("params.color.black")]] as [val, label] (val)}
      <button
        class="inline-flex items-center justify-center px-2 h-7 rounded border text-xs transition-colors {selectedObject.fill === val ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
        title={$tr("params.vector.fill")}
        onclick={() => fillChanged(val)}>
        {label}
      </button>
    {/each}
  </div>
{/if}
