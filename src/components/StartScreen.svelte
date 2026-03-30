<script lang="ts">
  import { onMount } from "svelte";
  import LabelPresetsBrowser from "$/components/designer-controls/LabelPresetsBrowser.svelte";
  import PrinterConnector from "$/components/PrinterConnector.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { DEFAULT_LABEL_PRESETS } from "$/defaults";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { type LabelPreset, type ExportedLabelTemplate, ExportedLabelTemplateSchema } from "$/types";
  import { FileUtils } from "$/utils/file_utils";
  import { Toasts } from "$/utils/toasts";
  import { tr } from "$/utils/i18n";

  interface Props {
    onStart: (preset?: LabelPreset) => void;
    onLoadLabel: (label: ExportedLabelTemplate) => void;
  }

  let { onStart, onLoadLabel }: Props = $props();

  let savedLabels = $state<ExportedLabelTemplate[]>([]);
  let customPresets = $state<LabelPreset[]>([]);
  let allPresets = $derived<LabelPreset[]>([...DEFAULT_LABEL_PRESETS, ...customPresets]);

  onMount(() => {
    try {
      savedLabels = LocalStoragePersistence.loadLabels();
    } catch (e) {
      Toasts.error(e);
    }

    try {
      customPresets = LocalStoragePersistence.loadLabelPresets() ?? [];
    } catch (e) {
      Toasts.error(e);
    }
  });

  const onPresetSelected = (index: number) => {
    onStart(allPresets[index]);
  };

  const onPresetDelete = (index: number) => {
    // Only allow deleting custom presets (indices after DEFAULT_LABEL_PRESETS)
    const customIndex = index - DEFAULT_LABEL_PRESETS.length;
    if (customIndex >= 0) {
      customPresets = customPresets.filter((_, i) => i !== customIndex);
      try {
        LocalStoragePersistence.saveLabelPresets(customPresets);
      } catch (e) {
        Toasts.error(e);
      }
    }
  };

  const onOpenFile = async () => {
    try {
      const contents = await FileUtils.pickAndReadSingleTextFile("json");
      const rawData = JSON.parse(contents);
      const label = ExportedLabelTemplateSchema.parse(rawData);
      onLoadLabel(label);
    } catch (e) {
      Toasts.zodErrors(e, "File load error:");
    }
  };

  const formatLabelSize = (label: ExportedLabelTemplate): string => {
    const { width, height } = label.label.size;
    return `${width}×${height}px`;
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return "";
    return new Date(timestamp * 1000).toLocaleDateString();
  };
</script>

<div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
  <!-- Header -->
  <div class="flex flex-col items-center pt-16 pb-10">
    <h1 class="text-5xl font-bold tracking-tight mb-2">
      <span class="text-red-400">Niim</span><span class="text-blue-400">Blue</span>
    </h1>
    <p class="text-zinc-500 text-sm">Label Designer</p>
  </div>

  <!-- Main content -->
  <div class="flex-1 max-w-4xl mx-auto w-full px-6 pb-16 flex flex-col gap-8">

    <!-- New label section -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold text-zinc-200">New label</h2>
        <button
          class="inline-flex items-center gap-1.5 px-3 h-8 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          onclick={() => onStart(undefined)}
        >
          <MdIcon icon="add" />
          Blank label
        </button>
      </div>
      <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
        <LabelPresetsBrowser
          presets={allPresets}
          onItemSelected={onPresetSelected}
          onItemDelete={onPresetDelete}
        />
      </div>
    </section>

    <!-- Recent labels section -->
    {#if savedLabels.length > 0}
      <section>
        <h2 class="text-lg font-semibold text-zinc-200 mb-3">{$tr("params.saved_labels.menu_title")}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {#each savedLabels as label (label.id)}
            <button
              class="group bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-left hover:border-zinc-500 hover:bg-zinc-800 transition-colors"
              onclick={() => onLoadLabel(label)}
            >
              {#if label.thumbnailBase64}
                <div class="mb-3 flex justify-center bg-zinc-800 rounded border border-zinc-700 p-2 h-16 items-center overflow-hidden">
                  <img
                    src="data:image/jpeg;base64,{label.thumbnailBase64}"
                    alt="label thumbnail"
                    class="max-h-full max-w-full object-contain"
                    style="image-rendering: pixelated;"
                  />
                </div>
              {:else}
                <div class="mb-3 flex justify-center bg-zinc-800 rounded border border-zinc-700 p-2 h-16 items-center text-zinc-600">
                  <MdIcon icon="label" />
                </div>
              {/if}
              <div class="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                {label.title ?? "(untitled)"}
              </div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-zinc-500">{formatLabelSize(label)}</span>
                {#if label.timestamp}
                  <span class="text-xs text-zinc-600">{formatDate(label.timestamp)}</span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Open file section -->
    <section>
      <h2 class="text-lg font-semibold text-zinc-200 mb-3">{$tr("params.saved_labels.load.json")}</h2>
      <button
        class="inline-flex items-center gap-2 px-4 h-9 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 hover:border-zinc-500 transition-colors"
        onclick={onOpenFile}
      >
        <MdIcon icon="folder_open" />
        {$tr("params.saved_labels.load.json")}
      </button>
    </section>

    <!-- Printer connect section -->
    <section>
      <h2 class="text-lg font-semibold text-zinc-200 mb-3">Connect printer to auto-detect size</h2>
      <div class="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
        <PrinterConnector />
      </div>
    </section>

  </div>
</div>
