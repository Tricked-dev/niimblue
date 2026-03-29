<script lang="ts">
  import { onMount } from "svelte";
  import { OBJECT_DEFAULTS_TEXT } from "$/defaults";
  import { tr } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { fontCache, userFonts } from "$/stores";
  import FontsMenu from "$/components/designer-controls/FontsMenu.svelte";

  let open = $state(false);

  interface Props {
    editRevision?: number;
    value: string;
    valueUpdated: (v: string) => void;
  }

  let { value, valueUpdated, editRevision }: Props = $props();

  let fontQuerySupported = typeof queryLocalFonts !== "undefined";
  let searchString = $state<string>("");

  let systemFontsFiltered = $derived.by<string[]>(() => {
    return $fontCache.filter((e) => e.toLowerCase().includes(searchString.toLowerCase()));
  });

  let userFontsFiltered = $derived.by<string[]>(() => {
    return $userFonts.map((e) => e.family).filter((e) => e.toLowerCase().includes(searchString.toLowerCase()));
  });

  const getSystemFonts = async () => {
    try {
      const fonts = await queryLocalFonts();
      const fontListSorted = [OBJECT_DEFAULTS_TEXT.fontFamily, ...new Set(fonts.map((f: FontData) => f.family))].sort();
      fontCache.update(() => fontListSorted);
      LocalStoragePersistence.saveCachedFonts(fontListSorted);
    } catch (e) {
      Toasts.error(e);
    }
  };

  const fontClick = (family: string) => {
    searchString = "";
    open = false;
    valueUpdated(family);
  };

  onMount(() => {
    try {
      let stored = LocalStoragePersistence.loadCachedFonts();
      if (stored.length > 0) {
        const uniqueFonts = new Set([OBJECT_DEFAULTS_TEXT.fontFamily, ...stored]);
        fontCache.update(() => [...uniqueFonts].sort());
      }
    } catch (e) {
      Toasts.error(e);
    }
  });
</script>

<svelte:window onclick={() => open = false} />

<div class="flex items-stretch flex-nowrap" onclick={(e) => e.stopPropagation()}>
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.text.font_family")}>
    <MdIcon icon="text_format" />
  </span>

  <input
    type="text"
    class="bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
    style="width: 14em"
    data-ver={editRevision}
    {value}
    oninput={(e) => valueUpdated(e.currentTarget.value)} />

  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button class="inline-flex items-center px-2 h-7 bg-zinc-800 hover:bg-zinc-700 border border-l-0 border-zinc-700 text-zinc-300 text-xs transition-colors" type="button" onclick={() => open = !open}></button>

  {#if open}
  <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl mt-8 min-w-[300px]" style="max-height: 240px; overflow-y: auto;">
    <div class="px-3 py-1">
      <input
        type="text"
        class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        placeholder={$tr("params.text.font_family.search")}
        bind:value={searchString} />
    </div>

    {#if userFontsFiltered.length > 0}
      <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{$tr("params.text.user_fonts")}</div>
      {#each userFontsFiltered as family (family)}
        <button class="block w-full px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors text-left" style="font-family: {family}" type="button" onclick={() => fontClick(family)}>
          {family}
        </button>
      {/each}
    {/if}

    {#if systemFontsFiltered.length > 0}
      <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{$tr("params.text.system_fonts")}</div>
      {#each systemFontsFiltered as family (family)}
        <button class="block w-full px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors text-left" style="font-family: {family}" type="button" onclick={() => fontClick(family)}>
          {family}
        </button>
      {/each}
    {/if}

    {#if fontQuerySupported}
      <div class="border-t border-zinc-800 my-1"></div>
      <button class="block w-full px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-zinc-700 transition-colors text-left" type="button" onclick={getSystemFonts}>
        <MdIcon icon="refresh" />
        {$tr("params.text.fetch_fonts")}
      </button>
    {/if}
  </div>
  {/if}

  <FontsMenu />
</div>
