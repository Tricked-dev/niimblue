<script lang="ts">
  import MdIcon from "$/components/basic/MdIcon.svelte";

  interface Props {
    propName: string;
    savedValue: any;
    value: any;
    onClick: (key: string, value: any) => void;
  }

  let {
    propName,
    savedValue,
    value,
    onClick
  }: Props = $props();
</script>

<button class="inline-flex items-center px-1.5 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors" onclick={() => onClick(propName, value)}>
  {#if savedValue !== undefined}
    <MdIcon icon="lock" class="text-warning" />
  {:else}
    <MdIcon icon="lock_open" />
  {/if}
</button>
