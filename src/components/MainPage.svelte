<script lang="ts">
  import { Utils } from "@mmote/niimbluelib";
  import LabelDesigner from "$/components/LabelDesigner.svelte";
  import StartScreen from "$/components/StartScreen.svelte";
  import { tr } from "$/utils/i18n";
  import DebugStuff from "$/components/DebugStuff.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { type LabelPreset, type ExportedLabelTemplate } from "$/types";
  import { onMount } from "svelte";

  // eslint-disable-next-line no-undef
  const appCommit = __APP_COMMIT__;
  // eslint-disable-next-line no-undef
  const buildDate = __BUILD_DATE__;

  let isStandalone = Utils.getAvailableTransports().capacitorBle || "__TAURI__" in window;
  let debugStuffShow = $state<boolean>(false);

  let currentHash = $state<string>(window.location.hash);
  let initialPreset = $state<LabelPreset | undefined>(undefined);
  let initialLabel = $state<ExportedLabelTemplate | undefined>(undefined);

  const isEditor = $derived(currentHash === "#/editor");

  const onHashChange = () => {
    currentHash = window.location.hash;
  };

  const onStart = (preset?: LabelPreset) => {
    initialPreset = preset;
    initialLabel = undefined;
    window.location.hash = "#/editor";
  };

  const onLoadLabel = (label: ExportedLabelTemplate) => {
    initialLabel = label;
    initialPreset = undefined;
    window.location.hash = "#/editor";
  };

  onMount(() => {
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  });
</script>

<!-- Full-viewport content -->
{#if isEditor}
  <LabelDesigner {initialPreset} {initialLabel} />
{:else}
  <StartScreen {onStart} {onLoadLabel} />
{/if}

<!-- Footer overlay — bottom-right, low z-index so canvas interaction takes priority -->
<div class="fixed bottom-0 right-0 z-[-1] p-3 text-right pointer-events-none select-none">
  <div class="pointer-events-auto flex items-center justify-end gap-2">
    {#if appCommit}
      <a
        class="text-zinc-600 text-[10px] hover:text-zinc-400 transition-colors"
        href="https://github.com/MultiMote/niimblue/commit/{appCommit}">{appCommit.slice(0, 6)}</a>
    {/if}

    <span class="text-zinc-600 text-[10px]">{$tr("main.built")} {buildDate}</span>

    <a
      class="text-zinc-600 text-[10px] hover:text-zinc-400 transition-colors"
      href="https://github.com/MultiMote/niimblue">{$tr("main.code")}</a>

    <button class="text-zinc-600 hover:text-zinc-400 transition-colors" onclick={() => (debugStuffShow = true)}
      ><MdIcon icon="bug_report" /></button>
  </div>
</div>

{#if debugStuffShow}
  <DebugStuff bind:show={debugStuffShow} />
{/if}
