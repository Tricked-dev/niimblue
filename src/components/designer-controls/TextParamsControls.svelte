<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import FontFamilyPicker from "$/components/designer-controls/FontFamilyPicker.svelte";
  import { TextboxExt } from "$/fabric-object/textbox-ext";

  let vAlignOpen = $state(false);
  let colorOpen = $state(false);
  let splitOpen = $state(false);

  interface Props {
    selectedText: fabric.IText;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedText, editRevision, valueUpdated }: Props = $props();

  const sizeMin = 1;
  const sizeMax = 999;

  const setXAlign = (align: fabric.TOriginX) => {
    selectedText.set({ textAlign: align });
    valueUpdated();
  };

  const setYAlign = (align: fabric.TOriginY) => {
    const pos = selectedText.getPointByOrigin("left", "top");
    selectedText.set({ originY: align });
    selectedText.setPositionByOrigin(pos, "left", "top");
    vAlignOpen = false;
    valueUpdated();
  };

  const toggleBold = () => {
    selectedText.fontWeight = selectedText.fontWeight === "bold" ? "normal" : "bold";
    valueUpdated();
  };

  const toggleItalic = () => {
    selectedText.fontStyle = selectedText.fontStyle === "italic" ? "normal" : "italic";
    valueUpdated();
  };

  const toggleFontAutoSize = () => {
    if (selectedText instanceof TextboxExt) {
      selectedText.set({ fontAutoSize: !selectedText.fontAutoSize });
    }
    valueUpdated();
  };

  const fontSizeUp = () => {
    let s = selectedText.fontSize;
    selectedText.set({ fontSize: Math.min(s > 40 ? Math.round(s * 1.1) : s + 2, sizeMax) });
    valueUpdated();
  };

  const fontSizeDown = () => {
    let s = selectedText.fontSize;
    selectedText.set({ fontSize: Math.max(s > 40 ? Math.round(s * 0.9) : s - 2, sizeMin) });
    valueUpdated();
  };

  const fontSizeChange = (v: number) => {
    v = isNaN(v) ? 1 : Math.min(Math.max(v, sizeMin), sizeMax);
    selectedText.set({ fontSize: v });
    valueUpdated();
  };

  const lineHeightChange = (v: number) => {
    selectedText.set({ lineHeight: isNaN(v) ? 1 : v });
    valueUpdated();
  };

  const fillChanged = (value: string) => {
    selectedText.set({ fill: value });
    valueUpdated();
  };

  const backgroundColorChanged = (value: string) => {
    selectedText.set({ backgroundColor: value });
    valueUpdated();
  };

  const splitChanged = (value: string) => {
    if (selectedText instanceof fabric.Textbox) {
      selectedText.set({ splitByGrapheme: value === "grapheme" });
      splitOpen = false;
      valueUpdated();
    }
  };

  const updateFontFamily = (v: string) => {
    selectedText.set({ fontFamily: v });
    valueUpdated();
  };

  const b = "inline-flex items-center justify-center px-2 h-7 rounded border text-xs transition-colors";
  const on = "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300";
  const off = "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500";
</script>

<svelte:window onclick={() => { vAlignOpen = false; colorOpen = false; splitOpen = false; }} />
<input type="hidden" value={editRevision}>

<div class="flex flex-col gap-2">

  <!-- Row 1: X-align, Y-align popup, Bold, Italic -->
  <div class="flex flex-wrap gap-1">
    <button title={$tr("params.text.align.left")}   class="{b} {selectedText.textAlign === 'left'   ? on : off}" onclick={() => setXAlign("left")}><MdIcon icon="format_align_left" /></button>
    <button title={$tr("params.text.align.center")} class="{b} {selectedText.textAlign === 'center' ? on : off}" onclick={() => setXAlign("center")}><MdIcon icon="format_align_center" /></button>
    <button title={$tr("params.text.align.right")}  class="{b} {selectedText.textAlign === 'right'  ? on : off}" onclick={() => setXAlign("right")}><MdIcon icon="format_align_right" /></button>

    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="relative" onclick={(e) => e.stopPropagation()}>
      <button class="{b} {off}" type="button" onclick={() => vAlignOpen = !vAlignOpen} title={$tr("params.text.vorigin")}>
        {#if selectedText.originY === "top"}<MdIcon icon="vertical_align_top" />
        {:else if selectedText.originY === "center"}<MdIcon icon="vertical_align_center" />
        {:else}<MdIcon icon="vertical_align_bottom" />{/if}
      </button>
      {#if vAlignOpen}
        <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 p-1.5 flex gap-1">
          <button class="{b} {selectedText.originY === 'top'    ? on : off}" onclick={() => setYAlign("top")}    title={$tr("params.text.vorigin.top")}><MdIcon icon="vertical_align_top" /></button>
          <button class="{b} {selectedText.originY === 'center' ? on : off}" onclick={() => setYAlign("center")} title={$tr("params.text.vorigin.center")}><MdIcon icon="vertical_align_center" /></button>
          <button class="{b} {selectedText.originY === 'bottom' ? on : off}" onclick={() => setYAlign("bottom")} title={$tr("params.text.vorigin.bottom")}><MdIcon icon="vertical_align_bottom" /></button>
        </div>
      {/if}
    </div>

    <button class="{b} {selectedText.fontWeight === 'bold'   ? on : off}" title={$tr("params.text.bold")}   onclick={toggleBold}><MdIcon icon="format_bold" /></button>
    <button class="{b} {selectedText.fontStyle === 'italic'  ? on : off}" title={$tr("params.text.italic")} onclick={toggleItalic}><MdIcon icon="format_italic" /></button>
  </div>

  <!-- Row 2: Color popup, Split popup, AutoSize -->
  <div class="flex flex-wrap gap-1">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="relative" onclick={(e) => e.stopPropagation()}>
      <button class="{b} {off}" type="button" onclick={() => colorOpen = !colorOpen} title={$tr("params.color")}><MdIcon icon="format_color_fill" /></button>
      {#if colorOpen}
        <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 p-2 flex flex-col gap-2" style="min-width:160px">
          <div>
            <div class="text-[10px] text-zinc-500 mb-1 flex items-center gap-1"><MdIcon icon="format_color_text" /> Text</div>
            <div class="flex gap-1">
              <button class="{b} flex-1 {selectedText.fill === 'white' ? on : off}" onclick={() => fillChanged("white")}>{$tr("params.color.white")}</button>
              <button class="{b} flex-1 {selectedText.fill === 'black' ? on : off}" onclick={() => fillChanged("black")}>{$tr("params.color.black")}</button>
            </div>
          </div>
          <div>
            <div class="text-[10px] text-zinc-500 mb-1 flex items-center gap-1"><MdIcon icon="format_color_fill" /> Background</div>
            <div class="flex gap-1">
              <button class="{b} flex-1 {(selectedText.backgroundColor || '') === 'white'       ? on : off}" onclick={() => backgroundColorChanged("white")}>{$tr("params.color.white")}</button>
              <button class="{b} flex-1 {(selectedText.backgroundColor || '') === 'black'       ? on : off}" onclick={() => backgroundColorChanged("black")}>{$tr("params.color.black")}</button>
              <button class="{b} flex-1 {!(selectedText.backgroundColor) || selectedText.backgroundColor === 'transparent' ? on : off}" onclick={() => backgroundColorChanged("transparent")}>{$tr("params.color.transparent")}</button>
            </div>
          </div>
        </div>
      {/if}
    </div>

    {#if selectedText instanceof fabric.Textbox}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="relative" onclick={(e) => e.stopPropagation()}>
        <button class="{b} {off}" type="button" onclick={() => splitOpen = !splitOpen} title={$tr("params.params.text.split")}><MdIcon icon="wrap_text" /></button>
        {#if splitOpen}
          <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 p-1.5 flex gap-1">
            <button class="{b} {!selectedText.splitByGrapheme ? on : off}" onclick={() => splitChanged("space")}>{$tr("params.params.text.split.spaces")}</button>
            <button class="{b} {selectedText.splitByGrapheme  ? on : off}" onclick={() => splitChanged("grapheme")}>{$tr("params.params.text.split.grapheme")}</button>
          </div>
        {/if}
      </div>
    {/if}

    {#if selectedText instanceof TextboxExt}
      <button class="{b} {selectedText.fontAutoSize ? on : off}" title={$tr("params.text.autosize")} data-ver={editRevision} onclick={toggleFontAutoSize}><MdIcon icon="expand" class="r-90" /></button>
    {/if}
  </div>

  <!-- Row 3: Font size -->
  <div class="flex items-stretch">
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.text.font_size")}><MdIcon icon="format_size" /></span>
    <input type="number" min={sizeMin} max={sizeMax} step="2"
      class="w-full bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
      value={selectedText.fontSize}
      oninput={(e) => fontSizeChange(e.currentTarget.valueAsNumber)} />
    <button class="inline-flex items-center px-2 h-7 bg-zinc-800 hover:bg-zinc-700 border border-l-0 border-zinc-700 text-zinc-300 text-xs transition-colors" title={$tr("params.text.font_size.up")} onclick={fontSizeUp}><MdIcon icon="text_increase" /></button>
    <button class="inline-flex items-center px-2 h-7 rounded-r bg-zinc-800 hover:bg-zinc-700 border border-l-0 border-zinc-700 text-zinc-300 text-xs transition-colors" title={$tr("params.text.font_size.down")} onclick={fontSizeDown}><MdIcon icon="text_decrease" /></button>
  </div>

  <!-- Row 4: Line height -->
  <div class="flex items-stretch">
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.text.line_height")}><MdIcon icon="density_medium" /></span>
    <input type="number" min="0.1" step="0.1" max="10"
      class="w-full bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
      value={selectedText.lineHeight}
      oninput={(e) => lineHeightChange(e.currentTarget.valueAsNumber)} />
  </div>

  <!-- Row 5: Font family -->
  <FontFamilyPicker {editRevision} value={selectedText.fontFamily} valueUpdated={updateFontFamily} />

  <!-- Row 6: Inline text editor -->
  <textarea
    class="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 resize-none"
    rows="3"
    data-ver={editRevision}
    value={selectedText.text ?? ""}
    oninput={(e) => {
      selectedText.set({ text: e.currentTarget.value });
      selectedText.isEditing = false;
      valueUpdated();
    }}></textarea>

</div>
