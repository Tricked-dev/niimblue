<script lang="ts">
  import { Utils } from "@mmote/niimbluelib";
  import BrowserWarning from "$/components/basic/BrowserWarning.svelte";
  import LabelDesigner from "$/components/LabelDesigner.svelte";
  import { locale, locales, tr } from "$/utils/i18n";
  import DebugStuff from "$/components/DebugStuff.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  // eslint-disable-next-line no-undef
  const appCommit = __APP_COMMIT__;
  // eslint-disable-next-line no-undef
  const buildDate = __BUILD_DATE__;

  let isStandalone = Utils.getAvailableTransports().capacitorBle || "__TAURI__" in window;
  let debugStuffShow = $state<boolean>(false);
</script>

<!-- Full-viewport label designer -->
<LabelDesigner />

<!-- Browser compatibility warning — overlaid top-center -->
<BrowserWarning />

<!-- Footer overlay — bottom-right, low z-index so canvas interaction takes priority -->
<div class="fixed bottom-0 right-0 z-[-1] p-3 text-right pointer-events-none select-none">
  <div class="pointer-events-auto flex items-center justify-end gap-2">
    <select
      class="bg-zinc-900 border border-zinc-700 text-zinc-500 text-[10px] rounded px-1 py-0.5 hover:border-zinc-500 transition-colors focus:outline-none"
      bind:value={$locale}
    >
      {#each Object.entries(locales) as [key, name] (key)}
        <option value={key}>{name}</option>
      {/each}
    </select>

    {#if appCommit}
      <a
        class="text-zinc-600 text-[10px] hover:text-zinc-400 transition-colors"
        href="https://github.com/MultiMote/niimblue/commit/{appCommit}"
      >{appCommit.slice(0, 6)}</a>
    {/if}

    <span class="text-zinc-600 text-[10px]">{$tr("main.built")} {buildDate}</span>

    <a
      class="text-zinc-600 text-[10px] hover:text-zinc-400 transition-colors"
      href="https://github.com/MultiMote/niimblue"
    >{$tr("main.code")}</a>

    <button
      class="text-zinc-600 hover:text-zinc-400 transition-colors"
      onclick={() => (debugStuffShow = true)}
    ><MdIcon icon="bug_report" /></button>
  </div>
</div>

{#if debugStuffShow}
  <DebugStuff bind:show={debugStuffShow} />
{/if}
