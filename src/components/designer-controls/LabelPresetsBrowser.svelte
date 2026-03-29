<script lang="ts">
  import type { LabelPreset } from "$/types";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  interface Props {
    onItemSelected: (index: number) => void;
    onItemDelete: (index: number) => void;
    presets: LabelPreset[];
    class?: string;
  }

  let { class: className = "", onItemDelete, onItemSelected, presets }: Props = $props();
  let deleteIndex = $state<number>(-1);

  const scaleDimensions = (preset: LabelPreset): { width: number; height: number } => {
    const scaleFactor = Math.min(100 / preset.width, 100 / preset.height);
    return {
      width: Math.round(preset.width * scaleFactor),
      height: Math.round(preset.height * scaleFactor),
    };
  };

  const deleteConfirmed = (e: MouseEvent, idx: number) => {
    e.stopPropagation();
    deleteIndex = -1;
    onItemDelete(idx);
  };

  const deleteRejected = (e: MouseEvent) => {
    e.stopPropagation();
    deleteIndex = -1;
  };

  const deleteRequested = (e: MouseEvent, idx: number) => {
    e.stopPropagation();
    deleteIndex = idx;
  };
</script>

<div class="overflow-y-auto border border-zinc-800 flex p-2 gap-1 flex-wrap {className}" style="max-height: 200px; max-width: 100%; min-height: 96px;">
  <!-- fixme: key -->
  {#each presets as item, idx (item)}
    <div
      role="button"
      class="p-0 flex justify-center items-center cursor-pointer"
      style="width: 96px; height: 96px;"
      tabindex="0"
      onkeydown={() => onItemSelected(idx)}
      onclick={() => onItemSelected(idx)}>
      <div
        class="bg-white relative flex justify-center items-center print-start-{item.printDirection}"
        style="width: {scaleDimensions(item).width}%; height: {scaleDimensions(item).height}%; border-left: {item.printDirection === 'left' ? '2px solid #ff4646' : ''}; border-top: {item.printDirection === 'top' ? '2px solid #ff4646' : ''};">
        <div class="absolute top-0 right-0 flex">
          {#if deleteIndex === idx}
            <button class="p-0 leading-none text-red-500" onclick={(e) => deleteConfirmed(e, idx)}>
              <MdIcon icon="delete" />
            </button>
            <button class="p-0 leading-none text-green-400" onclick={(e) => deleteRejected(e)}>
              <MdIcon icon="close" />
            </button>
          {:else}
            <button class="p-0 leading-none text-red-500" onclick={(e) => deleteRequested(e, idx)}>
              <MdIcon icon="delete" />
            </button>
          {/if}
        </div>

        <span class="p-1 bg-white/80 text-black rounded-lg text-[10px]">
          {#if item.title}
            {item.title}
          {:else}
            {item.width}x{item.height}{#if item.unit === "mm"}{$tr("params.label.mm")}{:else if item.unit === "px"}{$tr(
                "params.label.px",
              )}{/if}
          {/if}
        </span>
      </div>
    </div>
  {/each}
</div>
