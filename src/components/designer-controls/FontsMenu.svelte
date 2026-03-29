<script lang="ts">
  import AppModal from "$/components/basic/AppModal.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { userFonts } from "$/stores";
  import { FileUtils } from "$/utils/file_utils";
  import { tr } from "$/utils/i18n";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";

  let show = $state<boolean>(false);
  let usedSpace = $state<number>(0);
  let selectExt = $state<"ttf" | "woff2">("ttf");
  let overrideFamily = $state<string>("");

  const calcUsedSpace = () => {
    usedSpace = LocalStoragePersistence.usedSpace();
  };

  const browseFont = async () => {
    const result = await FileUtils.pickAndReadBinaryFile(selectExt);

    let fontName = result.name.split(".")[0];
    const mime = `text/${selectExt}`;

    if (overrideFamily.trim() !== "") {
      fontName = overrideFamily.trim();
    }

    if ($userFonts.some((e) => e.family == fontName)) {
      Toasts.error(`${fontName} already loaded`);
      return;
    }

    const compressed = await FileUtils.compressData(result.data);
    const b64data = await FileUtils.base64buf(compressed);

    userFonts.update((prev) => [...prev, { gzippedDataB64: b64data, family: fontName, mimeType: mime }]);

    calcUsedSpace();
    overrideFamily = "";
  };

  const removeFont = (family: string) => {
    userFonts.update((prev) => prev.filter((e) => e.family !== family));
    calcUsedSpace();
  };

  $effect(() => {
    if (show) calcUsedSpace();
  });
</script>

<button
  class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors"
  onclick={() => {
    show = true;
  }}>
  <MdIcon icon="settings" />
</button>

{#if show}
  <AppModal title={$tr("fonts.title")} bind:show>
    <div class="mb-1">
      {#each $userFonts as font (font.family)}
        <div class="flex items-stretch mb-1">
          <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l text-base" style="font-family: {font.family}">{font.family}</span>
          <button class="inline-flex items-center gap-1 px-2 h-7 rounded-r bg-red-700 hover:bg-red-600 text-white text-xs transition-colors border border-l-0 border-red-700" onclick={() => removeFont(font.family)}>
            <MdIcon icon="delete" />
          </button>
        </div>
      {:else}
        👀
      {/each}
    </div>

    <hr />

    <div class="flex items-stretch">
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">{$tr("fonts.add")}</span>

      <select class="bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500" bind:value={selectExt}>
        <option value="ttf">ttf</option>
        <option value="woff2">woff2</option>
      </select>

      <input type="text" class="w-1/4 bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder={$tr("fonts.title_override")} bind:value={overrideFamily} />

      <button class="inline-flex items-center gap-1 px-2 h-7 rounded-r bg-zinc-800 hover:bg-zinc-700 border border-l-0 border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={browseFont}>{$tr("fonts.browse")}</button>
    </div>

    {#snippet footer()}
      <div class="text-zinc-500 text-xs">
        {usedSpace}
        {$tr("params.saved_labels.kb_used")} |
        <a class="text-zinc-500 hover:text-zinc-300" href="https://fonts.google.com">{$tr("fonts.gfonts")}</a>
      </div>
    {/snippet}
  </AppModal>
{/if}
