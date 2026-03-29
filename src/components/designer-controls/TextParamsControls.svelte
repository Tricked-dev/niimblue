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

  let sizeMin: number = 1;
  let sizeMax: number = 999;

  const setXAlign = (align: fabric.TOriginX) => {
    selectedText.set({ textAlign: align });
    valueUpdated();
  };

  const setYAlign = (align: fabric.TOriginY) => {
    // change object origin, but keep position
    const pos = selectedText.getPointByOrigin("left", "top");
    selectedText.set({ originY: align });
    selectedText.setPositionByOrigin(pos, "left", "top");
    valueUpdated();
  };

  const toggleBold = () => {
    if (selectedText.fontWeight === "bold") {
      selectedText.fontWeight = "normal";
    } else {
      selectedText.fontWeight = "bold";
    }
    valueUpdated();
  };

  const toggleItalic = () => {
    if (selectedText.fontStyle === "italic") {
      selectedText.fontStyle = "normal";
    } else {
      selectedText.fontStyle = "italic";
    }
    valueUpdated();
  };

  const toggleFontAutoSize = () => {
    if (selectedText instanceof TextboxExt) {
      selectedText.set({ fontAutoSize: !selectedText.fontAutoSize });
    }
    valueUpdated();
  };

  const updateFontFamily = (v: string) => {
    selectedText.set({ fontFamily: v });
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

  const lineHeightChange = (v: number) => {
    v = isNaN(v) ? 1 : v;
    selectedText.set({ lineHeight: v });
    valueUpdated();
  };

  const fontSizeChange = (v: number) => {
    v = isNaN(v) ? 1 : Math.min(Math.max(v, sizeMin), sizeMax);
    selectedText.set({ fontSize: v });
    valueUpdated();
  };

  const fillChanged = (value: string) => {
    selectedText.set({ fill: value });
    valueUpdated();
  };

  const splitChanged = (value: string) => {
    if (selectedText instanceof fabric.Textbox) {
      selectedText.set({ splitByGrapheme: value === "grapheme" });
      valueUpdated();
    }
  };

  const backgroundColorChanged = (value: string) => {
    selectedText.set({ backgroundColor: value });
    valueUpdated();
  };

  const editInPopup = () => {
    const text = prompt($tr("params.text.edit.title"), selectedText.text);
    if (text !== null) {
      selectedText.set({ text });
      selectedText.isEditing = false;
      valueUpdated();
    }
  };
</script>

<svelte:window onclick={() => { vAlignOpen = false; colorOpen = false; splitOpen = false; }} />

<!-- Fix component not updating when selectedText changes. I didn't find a better way to do this. -->
<input type="hidden" value={editRevision}>

<button
  title={$tr("params.text.align.left")}
  class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {selectedText.textAlign === 'left' ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
  onclick={() => setXAlign("left")}><MdIcon icon="format_align_left" /></button>
<button
  title={$tr("params.text.align.center")}
  class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {selectedText.textAlign === 'center' ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
  onclick={() => setXAlign("center")}><MdIcon icon="format_align_center" /></button>
<button
  title={$tr("params.text.align.right")}
  class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {selectedText.textAlign === 'right' ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
  onclick={() => setXAlign("right")}><MdIcon icon="format_align_right" /></button>

<div class="relative" onclick={(e) => e.stopPropagation()}>
  <button class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors" type="button" onclick={() => vAlignOpen = !vAlignOpen} title={$tr("params.text.vorigin")}>
    {#if selectedText.originY === "top"}
      <MdIcon icon="vertical_align_top" />
    {:else if selectedText.originY === "center"}
      <MdIcon icon="vertical_align_center" />
    {:else if selectedText.originY === "bottom"}
      <MdIcon icon="vertical_align_bottom" />
    {/if}
  </button>
  {#if vAlignOpen}
  <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 p-2 flex gap-1">
    <button
      class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {selectedText.originY === 'top' ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
      onclick={() => setYAlign("top")}
      title={$tr("params.text.vorigin.top")}>
      <MdIcon icon="vertical_align_top" />
    </button>
    <button
      class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {selectedText.originY === 'center' ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
      onclick={() => setYAlign("center")}
      title={$tr("params.text.vorigin.center")}>
      <MdIcon icon="vertical_align_center" />
    </button>
    <button
      class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {selectedText.originY === 'bottom' ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
      onclick={() => setYAlign("bottom")}
      title={$tr("params.text.vorigin.bottom")}>
      <MdIcon icon="vertical_align_bottom" />
    </button>
  </div>
  {/if}
</div>

<button
  class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {selectedText.fontWeight === 'bold' ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
  title={$tr("params.text.bold")}
  onclick={toggleBold}>
  <MdIcon icon="format_bold" />
</button>

<button
  class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {selectedText.fontStyle === 'italic' ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
  title={$tr("params.text.italic")}
  onclick={toggleItalic}>
  <MdIcon icon="format_italic" />
</button>

<div class="relative" onclick={(e) => e.stopPropagation()}>
  <button class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors" type="button" onclick={() => colorOpen = !colorOpen} title={$tr("params.color")}>
    <MdIcon icon="format_color_fill" />
  </button>
  {#if colorOpen}
  <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 p-2 flex flex-col gap-2">
    <div class="flex items-stretch flex-nowrap" style="width: 12em">
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">
        <MdIcon icon="format_color_text" />
      </span>
      <select class="bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 flex-1" value={selectedText.fill} onchange={(e) => fillChanged(e.currentTarget.value)}>
        <option value="white">{$tr("params.color.white")}</option>
        <option value="black">{$tr("params.color.black")}</option>
      </select>
    </div>
    <div class="flex items-stretch flex-nowrap" style="width: 12em">
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">
        <MdIcon icon="format_color_fill" />
      </span>
      <select
        class="bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 flex-1"
        value={selectedText.backgroundColor || "transparent"}
        onchange={(e) => backgroundColorChanged(e.currentTarget.value)}>
        <option value="white">{$tr("params.color.white")}</option>
        <option value="black">{$tr("params.color.black")}</option>
        <option value="transparent">{$tr("params.color.transparent")}</option>
      </select>
    </div>
  </div>
  {/if}
</div>

{#if selectedText instanceof fabric.Textbox}
  <div class="relative" onclick={(e) => e.stopPropagation()}>
    <button class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors" type="button" onclick={() => splitOpen = !splitOpen} title={$tr("params.params.text.split")}>
      <MdIcon icon="wrap_text" />
    </button>
    {#if splitOpen}
    <div class="absolute z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl top-full mt-1 p-2">
      <div class="flex items-stretch flex-nowrap" style="width: 14em">
        <select class="bg-zinc-800 border border-zinc-700 rounded px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 w-full" value={selectedText.splitByGrapheme ? "grapheme" : "space"} onchange={(e) => splitChanged(e.currentTarget.value)}>
          <option value="space">{$tr("params.params.text.split.spaces")}</option>
          <option value="grapheme">{$tr("params.params.text.split.grapheme")}</option>
        </select>
      </div>
    </div>
    {/if}
  </div>
{/if}

{#if selectedText instanceof TextboxExt}
  <!-- fixme: Custom property not auto-rendered for some reason -->
  <button
    class="inline-flex items-center gap-1 px-2 h-7 rounded border text-xs transition-colors {selectedText.fontAutoSize ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
    title={$tr("params.text.autosize")}
    data-ver={editRevision}
    onclick={toggleFontAutoSize}>
    <MdIcon icon="expand" class="r-90" />
  </button>
{/if}


<div class="flex items-stretch flex-nowrap" style="width: 12em">
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.text.font_size")}><MdIcon icon="format_size" /></span>
  <input
    type="number"
    min={sizeMin}
    max={sizeMax}
    step="2"
    class="w-full bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
    value={selectedText.fontSize}
    oninput={(e) => fontSizeChange(e.currentTarget.valueAsNumber)} />
  <button class="inline-flex items-center gap-1 px-2 h-7 bg-zinc-800 hover:bg-zinc-700 border border-l-0 border-zinc-700 text-zinc-300 text-xs transition-colors" title={$tr("params.text.font_size.up")} onclick={fontSizeUp}>
    <MdIcon icon="text_increase" />
  </button>
  <button class="inline-flex items-center gap-1 px-2 h-7 rounded-r bg-zinc-800 hover:bg-zinc-700 border border-l-0 border-zinc-700 text-zinc-300 text-xs transition-colors" title={$tr("params.text.font_size.down")} onclick={fontSizeDown}>
    <MdIcon icon="text_decrease" />
  </button>
</div>

<div class="flex items-stretch flex-nowrap" style="width: 7em">
  <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l" title={$tr("params.text.line_height")}>
    <MdIcon icon="density_medium" />
  </span>
  <input
    type="number"
    min="0.1"
    step="0.1"
    max="10"
    class="w-full bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
    value={selectedText.lineHeight}
    oninput={(e) => lineHeightChange(e.currentTarget.valueAsNumber)} />
</div>

<FontFamilyPicker {editRevision} value={selectedText.fontFamily} valueUpdated={updateFontFamily} />

<button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={editInPopup} title={$tr("params.text.edit")}>
  <MdIcon icon="edit" />
</button>
