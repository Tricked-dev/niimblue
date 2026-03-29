<script lang="ts">
  import type { UndoState } from "$/utils/undo_redo";
  import { connectionState, connectedPrinterName } from "$/stores";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";

  interface Props {
    undoState: UndoState;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    onPreview: () => void;
    onPrint: () => void;
    onSave: () => void;
    onOpen: () => void;
  }

  let {
    undoState,
    onUndo,
    onRedo,
    onClear,
    onPreview,
    onPrint,
    onSave,
    onOpen,
  }: Props = $props();

  const btn =
    "inline-flex items-center gap-1 px-2 h-7 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed";
  const btnPrimary =
    "inline-flex items-center gap-1 px-2.5 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed";
</script>

<header class="h-10 flex items-center gap-1 px-3 bg-zinc-900 border-b border-zinc-800 shrink-0 z-20">
  <!-- Logo -->
  <span class="font-bold text-[15px] mr-2 select-none">
    <span class="text-red-400">Niim</span><span class="text-blue-400">Blue</span>
  </span>

  <!-- Divider -->
  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

  <!-- Save -->
  <button class={btn} title={$tr("editor.save")} onclick={onSave}>
    <MdIcon icon="save" />
  </button>

  <!-- Open -->
  <button class={btn} onclick={onOpen}>
    <MdIcon icon="folder_open" />
  </button>

  <!-- Divider -->
  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

  <!-- Undo -->
  <button class={btn} title={$tr("editor.undo")} onclick={onUndo} disabled={undoState.undoDisabled}>
    <MdIcon icon="undo" />
  </button>

  <!-- Redo -->
  <button class={btn} title={$tr("editor.redo")} onclick={onRedo} disabled={undoState.redoDisabled}>
    <MdIcon icon="redo" />
  </button>

  <!-- Divider -->
  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

  <!-- Clear -->
  <button class={btn} title={$tr("editor.clear")} onclick={onClear}>
    <MdIcon icon="cancel_presentation" />
  </button>

  <!-- Spacer -->
  <div class="flex-1"></div>

  <!-- Printer badge -->
  {#if $connectionState === "connected"}
    <span class="text-[10px] px-2 py-0.5 bg-green-900 text-green-300 rounded-full border border-green-700 font-medium">
      ● {$connectedPrinterName || "Connected"}
    </span>
  {:else if $connectionState === "connecting"}
    <span class="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700">
      ○ Connecting…
    </span>
  {:else}
    <span class="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700">
      ○ Not connected
    </span>
  {/if}

  <!-- Divider -->
  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

  <!-- Preview -->
  <button class={btn} title={$tr("editor.preview")} onclick={onPreview}>
    <MdIcon icon="visibility" />
    Preview
  </button>

  <!-- Print -->
  <button
    class={btnPrimary}
    title={$tr("editor.print")}
    onclick={onPrint}
    disabled={$connectionState !== "connected"}
  >
    <MdIcon icon="print" />
    Print
  </button>
</header>
