<script lang="ts">
  import { tr } from "$/utils/i18n";
  import { onMount } from "svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import SavedLabelsBrowser from "$/components/designer-controls/SavedLabelsBrowser.svelte";
  import { ExportedLabelTemplateSchema, type ExportedLabelTemplate } from "$/types";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";
  import { FileUtils } from "$/utils/file_utils";
  import * as fabric from "fabric";
  import { Utils } from "@mmote/niimbluelib";

  interface Props {
    onRequestLabelTemplate: () => ExportedLabelTemplate;
    onLoadRequested: (label: ExportedLabelTemplate) => void;
    canvas: fabric.Canvas;
    csvEnabled: boolean;
  }

  let { onRequestLabelTemplate, onLoadRequested, canvas, csvEnabled }: Props = $props();

  let open = $state(false);
  let savedLabels = $state<ExportedLabelTemplate[]>([]);
  let selectedIndex = $state<number>(-1);
  let title = $state<string>("");
  let usedSpace = $state<number>(0);
  let customDefaultTemplate = $state<boolean>(LocalStoragePersistence.hasCustomDefaultTemplate());
  let isStandalone = Utils.getAvailableTransports().capacitorBle;

  const calcUsedSpace = () => {
    usedSpace = LocalStoragePersistence.usedSpace();
  };

  const onLabelSelected = (index: number) => {
    selectedIndex = index;
    title = savedLabels[index]?.title ?? "";
  };

  const onLabelExport = (idx: number) => {
    try {
      FileUtils.saveLabelAsJson(savedLabels[idx]);
    } catch (e) {
      Toasts.zodErrors(e, "Canvas save error:");
    }
  };

  const onLabelDelete = (idx: number) => {
    selectedIndex = -1;
    const result = [...savedLabels];
    result.splice(idx, 1);
    LocalStoragePersistence.saveLabels(result);

    savedLabels = result;
    title = "";
    calcUsedSpace();
  };

  const saveLabels = (labels: ExportedLabelTemplate[]) => {
    const { zodErrors, otherErrors } = LocalStoragePersistence.saveLabels(labels);
    zodErrors.forEach((e) => Toasts.zodErrors(e, "Label save error"));
    otherErrors.forEach((e) => Toasts.error(e));

    if (zodErrors.length === 0 && otherErrors.length === 0) {
      savedLabels = labels;
    }

    calcUsedSpace();
  };

  const onSaveReplaceClicked = () => {
    if (selectedIndex === -1) {
      return;
    }

    if (!confirm($tr("editor.warning.save"))) {
      return;
    }

    const label = onRequestLabelTemplate();
    label.title = title;

    const result = [...savedLabels];
    result[selectedIndex] = label;

    saveLabels(result);
  };

  const onMakeDefaultClicked = () => {
    const label = onRequestLabelTemplate();
    label.title = title;
    label.thumbnailBase64 = undefined;
    LocalStoragePersistence.saveDefaultTemplate(label);
    customDefaultTemplate = true;
    calcUsedSpace();
  };

  const onRemoveDefaultClicked = () => {
    LocalStoragePersistence.saveDefaultTemplate(undefined);
    customDefaultTemplate = false;
    calcUsedSpace();
  };

  const onSaveClicked = () => {
    const label = onRequestLabelTemplate();
    label.title = title;
    const result = [...savedLabels, label];
    saveLabels(result);
  };

  const onLoadClicked = () => {
    if (selectedIndex === -1) {
      return;
    }

    const label = savedLabels[selectedIndex];

    let message = $tr("editor.warning.load");

    if (label.csv) {
      message += "\n" + $tr("editor.warning.load.csv");
    }

    if (!confirm(message)) {
      return;
    }

    onLoadRequested(label);
    new Dropdown(dropdownRef).hide();
  };

  const onImportClicked = async () => {
    const contents = await FileUtils.pickAndReadSingleTextFile("json");
    const rawData = JSON.parse(contents);


    try {
      const label = ExportedLabelTemplateSchema.parse(rawData);

      let message = $tr("editor.warning.load");

      if (label.csv) {
        message += "\n" + $tr("editor.warning.load.csv");
      }

      if (!confirm(message)) {
        return;
      }

      onLoadRequested(label);

      if (label.title) {
        title = label.title;
      }

      open = false;
    } catch (e) {
      Toasts.zodErrors(e, "Canvas load error:");
    }
  };

  const onExportClicked = () => {
    try {
      const label = onRequestLabelTemplate();
      if (title) {
        label.title = title.replaceAll(/[\\/:*?"<>|]/g, "_");
      }
      FileUtils.saveLabelAsJson(label);
    } catch (e) {
      Toasts.zodErrors(e, "Canvas save error:");
    }
  };

  const onExportPngClicked = () => {
    try {
      FileUtils.saveCanvasAsPng(canvas);
    } catch (e) {
      Toasts.zodErrors(e, "Canvas save error:");
    }
  };

  const onExportUrlClicked = async () => {
    try {
      const label = onRequestLabelTemplate();
      const url = await FileUtils.makeLabelUrl(label);

      if (url.length > 2000 && !confirm($tr("params.saved_labels.save.url.warn"))) {
        return;
      }

      navigator.clipboard.writeText(url);
      Toasts.message($tr("params.saved_labels.save.url.copied"));
    } catch (e) {
      Toasts.error(e);
    }
  };

  onMount(() => {
    savedLabels = LocalStoragePersistence.loadLabels();
    calcUsedSpace();
  });
</script>

<svelte:window onclick={() => { open = false; }} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="relative" onclick={(e) => e.stopPropagation()}>

  <button
    class="w-8 h-8 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
    onclick={() => (open = !open)}
  >
    <MdIcon icon="sd_storage" />
  </button>

  {#if open}
    <div class="absolute left-full top-0 ml-1 w-[min(95vw,440px)] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50">
      <div class="px-4 py-2 border-b border-zinc-800">
        <p class="text-xs font-semibold text-zinc-300">
          {$tr("params.saved_labels.menu_title")} — {usedSpace} {$tr("params.saved_labels.kb_used")}
        </p>
        {#if csvEnabled}
          <p class="text-[10px] text-yellow-400 mt-1">{$tr("params.saved_labels.save.withcsv")}</p>
        {/if}
      </div>

      <div class="p-3 flex flex-col gap-3">
        <div class="flex gap-1 flex-wrap">
          <button
            class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors"
            onclick={onImportClicked}
          >
            <MdIcon icon="data_object" />
            {$tr("params.saved_labels.load.json")}
          </button>
          <button
            class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors"
            onclick={onExportClicked}
          >
            <MdIcon icon="data_object" />
            {$tr("params.saved_labels.save.json")}
          </button>
          <button
            class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors"
            onclick={onExportPngClicked}
          >PNG</button>
          {#if !isStandalone}
            <button
              class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors"
              onclick={onExportUrlClicked}
            >{$tr("params.saved_labels.save.url")}</button>
          {/if}
        </div>

        <SavedLabelsBrowser
          class="mb-1"
          {selectedIndex}
          labels={savedLabels}
          onItemClicked={onLabelSelected}
          onItemDelete={onLabelDelete}
          onItemExport={onLabelExport} />

        <div class="flex items-center gap-1">
          <span class="text-[11px] text-zinc-500 shrink-0">{$tr("params.saved_labels.label_title")}</span>
          <input
            class="flex-1 h-7 px-2 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            type="text"
            placeholder={$tr("params.saved_labels.label_title.placeholder")}
            bind:value={title} />
        </div>

        <div class="flex gap-1 flex-wrap items-center">
          <div class="flex items-center gap-1 mr-auto">
            <button
              class="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
              onclick={onMakeDefaultClicked}
            >{$tr("params.saved_labels.make_default")}</button>
            {#if customDefaultTemplate}
              <button
                class="w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 text-xs transition-colors"
                onclick={onRemoveDefaultClicked}
              ><MdIcon icon="close" /></button>
            {/if}
          </div>

          <button
            class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors"
            onclick={onSaveClicked}
          >
            <MdIcon icon="save" />
            {$tr("params.saved_labels.save.browser")}
          </button>

          {#if selectedIndex !== -1}
            <button
              class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors"
              onclick={onSaveReplaceClicked}
            >
              <MdIcon icon="edit_note" />
              {$tr("params.saved_labels.save.browser.replace")}
            </button>
            <button
              class="inline-flex items-center gap-1 px-2 h-7 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
              onclick={onLoadClicked}
            >
              <MdIcon icon="folder" />
              {$tr("params.saved_labels.load.browser")}
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
