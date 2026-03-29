<script lang="ts">
  import { tr } from "$/utils/i18n";
  import { iconCodepoints, type MaterialIcon } from "$/styles/mdi_icons";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { appConfig, userIcons } from "$/stores";
  import { FileUtils } from "$/utils/file_utils";
  import { Toasts } from "$/utils/toasts";

  let open = $state(false);

  interface Props {
    onSubmit: (i: MaterialIcon) => void;
    onSubmitSvg: (i: string) => void;
  }

  let { onSubmit, onSubmitSvg }: Props = $props();

  let iconNames = $state<MaterialIcon[]>([]);
  let search = $state<string>("");
  let deleteMode = $state<boolean>(false);

  const onShow = () => {
    if (iconNames.length === 0) {
      iconNames = Object.keys(iconCodepoints) as MaterialIcon[];
    }
  };

  const addOwn = async () => {
    try {
      let counter = 0;
      const xmls = await FileUtils.pickAndReadTextFile("svg", true);
      const iconsToAdd = xmls.map((xml) => ({
        name: `i_${FileUtils.timestampFloat()}_${counter++}`,
        data: xml,
      }));

      userIcons.update((prev) => [...prev, ...iconsToAdd]);
    } catch (e) {
      Toasts.error(e);
    }
  };

  const svgClicked = (name: string, data: string) => {
    if (deleteMode) {
      userIcons.update((prev) => prev.filter((e) => e.name !== name));
      return;
    }

    onSubmitSvg(data);
  };

  const iconClicked = (i: MaterialIcon) => {
    if (deleteMode) {
      return;
    }

    onSubmit(i);
  };

  $effect(() => {
    if (open) {
      onShow();
    }
  });
</script>

<svelte:window onclick={() => open = false} />

<div class="relative" onclick={(e) => e.stopPropagation()}>
  <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={() => open = !open}>
    <MdIcon icon="emoji_emotions" />
    <MdIcon icon="add" />
  </button>

  {#if open}
  <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl left-full top-0 ml-1" style="width: 100vw; max-width: 450px;">
    <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{$tr("editor.iconpicker.title")}</div>
    <div class="p-3">
      <input
        disabled={$appConfig.iconListMode === "user"}
        type="text"
        class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 mb-1"
        placeholder={$tr("editor.iconpicker.search")}
        bind:value={search} />

      <div class="flex items-stretch mb-1">
        <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">{$tr("editor.iconpicker.show")}</span>
        <select class="bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500" bind:value={$appConfig.iconListMode}>
          <option value="both">{$tr("editor.iconpicker.show.both")}</option>
          <option value="user">{$tr("editor.iconpicker.show.user")}</option>
          <option value="pack">{$tr("editor.iconpicker.show.pack")}</option>
        </select>
      </div>

      <div class="mb-1 flex flex-wrap gap-1" style="max-height: 400px; overflow-y: scroll;">
        {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "user"}
          {#each $userIcons as { name, data } (name)}
            <button
              class="inline-flex items-center gap-1 px-1 h-7 rounded border text-xs transition-colors mr-1 mb-1 {deleteMode ? 'bg-red-700 hover:bg-red-600 border-red-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 border-zinc-600 text-zinc-200'}"
              onclick={() => svgClicked(name, data)}>
              <img src="data:image/svg+xml;base64,{FileUtils.base64str(data)}" alt="user-svg" style="width: 24px;" />
            </button>
          {/each}
        {/if}

        {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "pack"}
          {#each iconNames as name (name)}
            {#if !search || name.includes(search.toLowerCase())}
              <button class="inline-flex items-center gap-1 px-1 h-7 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-700 text-xs transition-colors mr-1" title={name} onclick={() => iconClicked(name)}>
                <MdIcon icon={name} />
              </button>
            {/if}
          {/each}
        {/if}
      </div>

      <div class="flex items-stretch mb-1 gap-1">
        <button class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors" onclick={addOwn}>
          <MdIcon icon="add" />
          {$tr("editor.iconpicker.add")}
        </button>
        <button
          class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {deleteMode ? 'bg-red-700 hover:bg-red-600 border-red-600 text-white' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
          onclick={() => (deleteMode = !deleteMode)}>
          <MdIcon icon="delete" />
          {$tr("editor.iconpicker.delete_mode")}
        </button>
      </div>

      <a
        href="https://fonts.google.com/icons?icon.set=Material+Icons&icon.style=Filled"
        target="_blank"
        class="text-zinc-500 text-xs">
        {$tr("editor.iconpicker.mdi_link_title")}
      </a>
    </div>
  </div>
  {/if}
</div>
