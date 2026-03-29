<script lang="ts">
  import { tr } from "$/utils/i18n";
  interface Props {
    value: number;
  }

  let { value = $bindable() }: Props = $props();
</script>

<div class="flex items-stretch flex-nowrap mb-2">
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">{$tr("params.label.head_density")}</span>

  <select class="bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500" bind:value>
    <option value={8}>203dpi</option>
    <option value={11.81}>300dpi</option>
  </select>

  <input class="w-full bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" type="number" min="1" bind:value />

  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-r cursor-help" title={$tr("params.label.head_density.help")}>
    {$tr("params.label.dpmm")}
  </span>
</div>
