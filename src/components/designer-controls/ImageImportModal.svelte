<script lang="ts">
  import { tr } from "$/utils/i18n";
  import { FileUtils } from "$/utils/file_utils";
  import { processImage, type ImageProcessOptions, processFullImage } from "$/utils/image_process";
  import type { PostProcessType } from "$/types";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  interface Props {
    onSubmit: (blob: Blob, options: ImageProcessOptions) => void;
    onCancel: () => void;
  }

  let { onSubmit, onCancel }: Props = $props();

  let selectedFile = $state<File | null>(null);
  let previewUrl = $state<string | null>(null);
  let previewData = $state<{ blob: Blob; width: number; height: number } | null>(null);
  let loading = $state(false);
  let processing = $state(false);

  let method = $state<PostProcessType | "none">("dither");
  let contrast = $state(80);
  let threshold = $state(50);

  const methods: { value: PostProcessType | "none"; label: string }[] = [
    { value: "none", label: "None" },
    { value: "threshold", label: "Threshold" },
    { value: "dither", label: "Dither (Floyd-Steinberg)" },
    { value: "bayer", label: "Bayer" },
  ];

  const pickFile = async () => {
    try {
      const files = await FileUtils.pickFileAsync("image", true);
      if (files[0]) {
        selectedFile = files[0];
        await loadPreview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPreview = async () => {
    if (!selectedFile) return;

    loading = true;
    try {
      const result = await processImage(selectedFile, {
        method,
        threshold,
        contrast,
      });
      previewData = result;
      previewUrl = URL.createObjectURL(result.blob);
    } catch (e) {
      console.error(e);
    }
    loading = false;
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    processing = true;
    try {
      const options: ImageProcessOptions = { method, threshold, contrast };
      const blob = await processFullImage(selectedFile, options);
      onSubmit(blob, options);
    } catch (e) {
      console.error(e);
    }
    processing = false;
  };

  const updatePreview = async () => {
    if (selectedFile) {
      await loadPreview();
    }
  };

  $effect(() => {
    if (selectedFile) {
      updatePreview();
    }
  });

  const cancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onCancel();
  };
</script>

<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onclick={cancel}>
  <div
    class="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-[480px] max-h-[90vh] overflow-hidden"
    onclick={(e) => e.stopPropagation()}>
    <div class="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
      <h2 class="text-sm font-semibold text-zinc-200">{$tr("editor.objectpicker.image")}</h2>
      <button class="text-zinc-400 hover:text-zinc-200" onclick={cancel}>
        <MdIcon icon="close" />
      </button>
    </div>

    <div class="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
      {#if !selectedFile}
        <button
          class="w-full h-32 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-2 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
          onclick={pickFile}>
          <MdIcon icon="add_photo_alternate" class="text-3xl" />
          <span class="text-sm">Click to select an image</span>
        </button>
      {:else}
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-zinc-400">{selectedFile.name}</span>
            <button class="text-xs text-zinc-400 hover:text-zinc-200" onclick={pickFile}>Change</button>
          </div>

          <div class="bg-zinc-800 rounded-lg p-2 flex items-center justify-center min-h-[200px]">
            {#if loading}
              <div class="text-zinc-400">Loading...</div>
            {:else if previewUrl}
              <img
                src={previewUrl}
                alt="Preview"
                class="max-w-full max-h-[200px] object-contain"
                style="image-rendering: pixelated;" />
            {/if}
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs text-zinc-400 mb-1">Method</label>
            <div class="flex flex-wrap gap-1">
              {#each methods as m (m.value)}
                <button
                  class="px-2 py-1 rounded text-xs border transition-colors {method === m.value
                    ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                    : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
                  onclick={() => (method = m.value)}>
                  {m.label}
                </button>
              {/each}
            </div>
          </div>

          <div>
            <label class="block text-xs text-zinc-400 mb-1">
              Threshold: {threshold}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              bind:value={threshold}
              class="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
          </div>

          <div>
            <label class="block text-xs text-zinc-400 mb-1">
              Contrast: {contrast}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              bind:value={contrast}
              class="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
          </div>
        </div>
      {/if}
    </div>

    <div class="px-4 py-3 border-t border-zinc-700 flex justify-end gap-2">
      <button
        class="px-3 py-1.5 rounded text-xs border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
        onclick={cancel}>
        Cancel
      </button>
      <button
        class="px-3 py-1.5 rounded text-xs bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!selectedFile || processing}
        onclick={handleImport}>
        {processing ? "Processing..." : "Import"}
      </button>
    </div>
  </div>
</div>
