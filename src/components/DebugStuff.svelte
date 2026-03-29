<script lang="ts">
  import AppModal from "$/components/basic/AppModal.svelte";
  import { appConfig } from "$/stores";
  import { tr } from "$/utils/i18n";
  import { NIIMBOT_CLIENT_DEFAULTS } from "@mmote/niimbluelib";

  let { show = $bindable() } = $props();
</script>

<AppModal title={$tr("debug.title")} bind:show>
  <div class="mb-1 text-xs text-zinc-300">
    {$tr("debug.packet_interval.help")}
  </div>

  <div class="flex items-stretch flex-nowrap mb-3">
    <input
      class="w-full bg-zinc-800 border border-zinc-700 rounded-l px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
      type="number"
      min="1"
      placeholder={`${NIIMBOT_CLIENT_DEFAULTS.packetIntervalMs}`}
      bind:value={$appConfig.packetIntervalMs} />
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 border-l-0 text-zinc-500 text-[11px] shrink-0">ms</span>
    <button class="inline-flex items-center gap-1 px-2 h-7 rounded-r border border-l-0 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors" onclick={() => ($appConfig.packetIntervalMs = undefined)}
      >{$tr("debug.reset")}</button>
  </div>

  <div class="mb-1 text-xs text-zinc-300">
    {$tr("debug.page_delay.help")}
  </div>

  <div class="flex items-stretch flex-nowrap mb-3" role="group">
    <input class="w-full bg-zinc-800 border border-zinc-700 rounded-l px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" type="number" min="0" placeholder="0" bind:value={$appConfig.pageDelay} />
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 border-l-0 text-zinc-500 text-[11px] shrink-0">ms</span>
    <button class="inline-flex items-center gap-1 px-2 h-7 rounded-r border border-l-0 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors" onclick={() => ($appConfig.pageDelay = undefined)}
      >{$tr("debug.reset")}</button>
  </div>
</AppModal>
