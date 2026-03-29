<script lang="ts">
  import { onDestroy, type Snippet } from "svelte";

  interface Props {
    show: boolean;
    title: string;
    onClose?: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let { show = $bindable(false), title, onClose, children, footer }: Props = $props();

  let dialogEl: HTMLDialogElement;

  $effect(() => {
    if (!dialogEl) return;
    if (show) {
      if (!dialogEl.open) dialogEl.showModal();
    } else {
      if (dialogEl.open) dialogEl.close();
    }
  });

  const handleClose = () => {
    show = false;
    onClose?.();
  };

  onDestroy(() => {
    if (dialogEl?.open) dialogEl.close();
  });

  export const hide = () => {
    show = false;
  };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialogEl}
  onclose={handleClose}
  onclick={(e) => { if (e.target === dialogEl) dialogEl.close(); }}
  class="fixed inset-0 m-auto w-full max-w-2xl rounded-lg bg-zinc-900 border border-zinc-700 shadow-2xl p-0 backdrop:bg-black/60 open:flex open:flex-col"
>
  <div class="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
    <h2 class="text-sm font-semibold text-zinc-100">{title}</h2>
    <button
      onclick={() => dialogEl.close()}
      aria-label="Close"
      class="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors text-lg leading-none"
    >×</button>
  </div>

  <div class="overflow-y-auto flex-1 p-5">
    {@render children()}
  </div>

  {#if footer}
    <div class="px-5 py-3 border-t border-zinc-800 flex justify-end gap-2 shrink-0">
      {@render footer()}
    </div>
  {/if}
</dialog>
