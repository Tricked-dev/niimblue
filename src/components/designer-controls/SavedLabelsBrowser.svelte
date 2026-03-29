<script lang="ts">
  import type { ExportedLabelTemplate, LabelProps } from "$/types";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  interface Props {
    onItemClicked: (index: number) => void;
    onItemDelete: (index: number) => void;
    onItemExport: (index: number) => void;
    labels: ExportedLabelTemplate[];
    selectedIndex?: number;
    class?: string;
  }

  let { onItemClicked, onItemDelete, onItemExport, labels, selectedIndex = -1, class: className }: Props = $props();

  let deleteIndex = $state<number>(-1);

  const scaleDimensions = (preset: LabelProps): { width: number; height: number } => {
    const scaleFactor = Math.min(100 / preset.size.width, 100 / preset.size.height);
    return {
      width: Math.round(preset.size.width * scaleFactor),
      height: Math.round(preset.size.height * scaleFactor),
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

  const exportRequested = (e: MouseEvent, idx: number) => {
    e.stopPropagation();
    onItemExport(idx);
  };
</script>

<div class="overflow-y-auto border border-zinc-800 flex p-2 gap-1 flex-wrap {className}" style="max-height: 200px; max-width: 100%; min-height: 96px;">
  {#each labels as item, idx (item.id ?? item.timestamp)}
    <div
      tabindex="0"
      class="p-0 flex justify-center items-center cursor-pointer border-2 {selectedIndex === idx ? 'border-blue-500' : 'border-transparent'}"
      style="width: 96px; height: 96px;"
      onkeydown={() => onItemClicked(idx)}
      onclick={() => onItemClicked(idx)}
      role="button">
      <div
        class="bg-white relative flex justify-center items-center"
        style="width: {scaleDimensions(item.label).width}%; height: {scaleDimensions(item.label).height}%; border-left: {item.label.printDirection === 'left' ? '2px solid #ff4646' : ''}; border-top: {item.label.printDirection === 'top' ? '2px solid #ff4646' : ''};">
        <div class="absolute top-0 right-0 z-[2] flex">
          <button
            class="p-0 leading-none text-blue-400"
            onclick={(e) => exportRequested(e, idx)}
            title={$tr("params.saved_labels.save.json")}>
            <MdIcon icon="download" />
          </button>

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

        {#if item.thumbnailBase64}
          <img class="w-full h-full absolute" src={item.thumbnailBase64} alt="thumbnail" />
        {/if}

        {#if item.title}
          <span class="p-1 bg-white/80 text-black rounded-lg z-[1] text-[10px]">
            {item.title}
          </span>
        {/if}
      </div>
    </div>
  {/each}
</div>
