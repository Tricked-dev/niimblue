<script lang="ts">
  import {
    LabelPresetSchema,
    type LabelPreset,
    type LabelProps,
    type LabelShape,
    type LabelSplit,
    type LabelUnit,
    type MirrorType,
    type TailPosition,
  } from "$/types";
  import LabelPresetsBrowser from "$/components/designer-controls/LabelPresetsBrowser.svelte";
  import { printerMeta } from "$/stores";
  import { tr } from "$/utils/i18n";
  import { DEFAULT_LABEL_PRESETS } from "$/defaults";
  import { onMount, tick } from "svelte";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import type { PrintDirection } from "@mmote/niimbluelib";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Toasts } from "$/utils/toasts";
  import { FileUtils } from "$/utils/file_utils";
  import { z } from "zod";
  import DpiSelector from "$/components/designer-controls/DpiSelector.svelte";

  interface Props {
    labelProps: LabelProps;
    onChange: (newProps: LabelProps) => void;
  }

  let { labelProps, onChange }: Props = $props();

  const tailPositions: TailPosition[] = ["right", "bottom", "left", "top"];
  const printDirections: PrintDirection[] = ["left", "top"];
  const labelShapes: LabelShape[] = ["rect", "rounded_rect", "circle"];
  const labelSplits: LabelSplit[] = ["none", "vertical", "horizontal"];
  const mirrorTypes: MirrorType[] = ["none", "flip", "copy"];

  let labelPresets = $state<LabelPreset[]>(DEFAULT_LABEL_PRESETS);

  let title = $state<string | undefined>("");
  let prevUnit: LabelUnit = "mm";
  let unit = $state<LabelUnit>("mm");
  let dpmm = $state<number>(8);
  let width = $state<number>(0);
  let height = $state<number>(0);
  let printDirection = $state<PrintDirection>("left");
  let shape = $state<LabelShape>("rect");
  let split = $state<LabelSplit>("none");
  let splitParts = $state<number>(2);
  let tailLength = $state<number>(0);
  let tailPos = $state<TailPosition>("right");
  let mirror = $state<MirrorType>("none");

  let error = $derived.by<string>(() => {
    let error = "";

    const headSize = labelProps.printDirection == "left" ? labelProps.size.height : labelProps.size.width;
    if ($printerMeta !== undefined) {
      if (headSize > $printerMeta.printheadPixels) {
        error += $tr("params.label.warning.width") + " ";
        error += `(${headSize} > ${$printerMeta.printheadPixels})`;
        error += "\n";
      }

      if ($printerMeta.printDirection !== labelProps.printDirection) {
        error += $tr("params.label.warning.direction") + " ";
        if ($printerMeta.printDirection == "left") {
          error += $tr("params.label.direction.left");
        } else {
          error += $tr("params.label.direction.top");
        }
      }
    }

    if (headSize % 8 !== 0) {
      error += $tr("params.label.warning.div8");
    }

    return error;
  });

  const onApply = () => {
    let newWidth = width;
    let newHeight = height;
    let newTailLength = tailLength;

    // mm to px
    if (unit === "mm") {
      newWidth *= dpmm;
      newHeight *= dpmm;
      newTailLength *= dpmm;
    }

    // limit min size
    newWidth = newWidth < dpmm ? dpmm : newWidth;
    newHeight = newHeight < dpmm ? dpmm : newHeight;

    // width must me multiple of 8
    if (printDirection === "left") {
      newHeight -= newHeight % 8;
    } else {
      newWidth -= newWidth % 8;
    }

    onChange({
      printDirection: printDirection,
      size: {
        width: Math.floor(newWidth),
        height: Math.floor(newHeight),
      },
      shape,
      split,
      splitParts,
      tailPos,
      tailLength: Math.floor(newTailLength),
      mirror,
    });
  };

  const onLabelPresetSelected = (index: number) => {
    const preset = labelPresets[index];

    if (preset !== undefined) {
      dpmm = preset.dpmm;
      prevUnit = preset.unit;
      unit = preset.unit;
      printDirection = preset.printDirection;
      width = preset.width;
      height = preset.height;
      title = preset.title ?? "";
      shape = preset.shape ?? "rect";
      split = preset.split ?? "none";
      splitParts = preset.splitParts ?? 2;
      tailPos = preset.tailPos ?? "right";
      tailLength = preset.tailLength ?? 0;
      mirror = preset.mirror ?? "none";
    }

    onApply();
  };

  const onLabelPresetDelete = (idx: number) => {
    const result = [...labelPresets];
    result.splice(idx, 1);
    labelPresets = result;
    LocalStoragePersistence.saveLabelPresets(labelPresets);
  };

  const onLabelPresetAdd = () => {
    const newPreset: LabelPreset = {
      dpmm,
      printDirection,
      unit,
      width,
      height,
      title,
      shape,
      split,
      splitParts,
      tailPos,
      tailLength,
      mirror,
    };
    const newPresets = [...labelPresets, newPreset];
    try {
      LocalStoragePersistence.saveLabelPresets(newPresets);
      labelPresets = newPresets;
    } catch (e) {
      Toasts.zodErrors(e, "Presets save error:");
    }
  };

  const onFlip = () => {
    let widthTmp = width;
    width = height;
    height = widthTmp;
    printDirection = printDirection === "top" ? "left" : "top";
  };

  const onUnitChange = () => {
    if (prevUnit === "mm" && unit === "px") {
      width = Math.floor(width * dpmm);
      height = Math.floor(height * dpmm);
      tailLength = Math.floor(tailLength * dpmm);
    } else if (prevUnit === "px" && unit === "mm") {
      width = Math.floor(width / dpmm);
      height = Math.floor(height / dpmm);
      tailLength = Math.floor(tailLength / dpmm);
    }
    prevUnit = unit;
  };

  const fillWithCurrentParams = () => {
    prevUnit = "px";
    width = labelProps.size.width;
    height = labelProps.size.height;
    printDirection = labelProps.printDirection;
    shape = labelProps.shape ?? "rect";
    split = labelProps.split ?? "none";
    splitParts = labelProps.splitParts ?? 2;
    tailPos = labelProps.tailPos ?? "right";
    tailLength = labelProps.tailLength ?? 0;
    mirror = labelProps.mirror ?? "none";
    onUnitChange();
  };

  const onImportClicked = async () => {
    const contents = await FileUtils.pickAndReadSingleTextFile("json");
    const rawData = JSON.parse(contents);

    if (!confirm($tr("params.label.warning.import"))) {
      return;
    }

    try {
      const presets = z.array(LabelPresetSchema).parse(rawData);
      LocalStoragePersistence.saveLabelPresets(presets);
      labelPresets = presets;
    } catch (e) {
      Toasts.zodErrors(e, "Presets load error:");
    }
  };

  const onExportClicked = () => {
    try {
      FileUtils.saveLabelPresetsAsJson(labelPresets);
    } catch (e) {
      Toasts.zodErrors(e, "Presets save error:");
    }
  };

  onMount(() => {
    const defaultPreset: LabelPreset = DEFAULT_LABEL_PRESETS[0];
    width = defaultPreset.width;
    height = defaultPreset.height;
    prevUnit = defaultPreset.unit;
    unit = defaultPreset.unit;
    printDirection = defaultPreset.printDirection;
    shape = defaultPreset.shape ?? "rect";
    split = defaultPreset.split ?? "none";
    tailPos = defaultPreset.tailPos ?? "right";
    tailLength = defaultPreset.tailLength ?? 0;
    mirror = defaultPreset.mirror ?? "none";

    try {
      const savedPresets: LabelPreset[] | null = LocalStoragePersistence.loadLabelPresets();
      if (savedPresets !== null) {
        labelPresets = savedPresets;
      }
    } catch (e) {
      Toasts.zodErrors(e, "Presets load error:");
    }

    tick().then(() => fillWithCurrentParams());
  });

  $effect(() => {
    if (shape === "circle" && split !== "none") split = "none";
  });

  $effect(() => {
    if (split === "none" || tailLength < 0) tailLength = 0;
  });

  $effect(() => {
    if (mirror === "flip" && splitParts !== 2) mirror = "copy";
  });
</script>

<div class="px-3">
  <div class="p-1 flex gap-1 mb-2">
    <button class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors" onclick={onImportClicked}>
      <MdIcon icon="data_object" />
      {$tr("params.label.import")}
    </button>
    <button class="inline-flex items-center gap-1 px-2 h-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors" onclick={onExportClicked}>
      <MdIcon icon="data_object" />
      {$tr("params.label.export")}
    </button>
  </div>
  <div class="mb-3 {error ? 'cursor-help text-yellow-400' : 'text-zinc-500'} text-xs" title={error}>
    {$tr("params.label.current")}
    {labelProps.size.width}x{labelProps.size.height}
    {$tr("params.label.px")}
    {#if labelProps.printDirection === "top"}
      ({$tr("params.label.direction")} {$tr("params.label.direction.top")})
    {:else if labelProps.printDirection === "left"}
      ({$tr("params.label.direction")} {$tr("params.label.direction.left")})
    {/if}
    <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={fillWithCurrentParams}><MdIcon icon="arrow_downward" /></button>
  </div>

  <LabelPresetsBrowser
    class="mb-1"
    presets={labelPresets}
    onItemSelected={onLabelPresetSelected}
    onItemDelete={onLabelPresetDelete} />

  <div class="flex items-stretch flex-nowrap mb-2">
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">{$tr("params.label.size")}</span>
    <input class="w-full bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" type="number" min="1" step={unit === "px" ? 8 : 1} bind:value={width} />
    <button class="inline-flex items-center gap-1 px-2 h-7 bg-zinc-800 hover:bg-zinc-700 border border-l-0 border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={onFlip}><MdIcon icon="swap_horiz" /></button>
    <input class="w-full bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" type="number" min="1" step={unit === "px" ? 8 : 1} bind:value={height} />
    <select class="bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500" bind:value={unit} onchange={onUnitChange}>
      <option value="mm"> {$tr("params.label.mm")}</option>
      <option value="px"> {$tr("params.label.px")}</option>
    </select>
  </div>

  {#if unit !== "px"}
    <DpiSelector bind:value={dpmm} />
  {/if}

  <div class="flex items-stretch flex-nowrap mb-2 print-dir-switch" role="group">
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l w-full">{$tr("params.label.direction")}</span>
    {#each printDirections as v (v)}
      <input
        type="radio"
        class="sr-only"
        name="print-dir"
        id="print-dir-{v}"
        autocomplete="off"
        bind:group={printDirection}
        value={v} />
      <label class="inline-flex items-center gap-1 px-3 h-7 border border-l-0 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors cursor-pointer last:rounded-r {printDirection === v ? 'bg-zinc-700 text-zinc-200' : ''}" for="print-dir-{v}">
        <div class="svg-icon"></div>
      </label>
    {/each}
  </div>

  <div class="flex items-stretch flex-nowrap mb-2 label-shape-switch" role="group">
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l w-full">{$tr("params.label.shape")}</span>
    {#each labelShapes as v (v)}
      <input
        type="radio"
        class="sr-only"
        name="label-shape"
        id="label-shape-{v}"
        autocomplete="off"
        bind:group={shape}
        value={v} />
      <label class="inline-flex items-center gap-1 px-3 h-7 border border-l-0 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors cursor-pointer last:rounded-r {shape === v ? 'bg-zinc-700 text-zinc-200' : ''}" for="label-shape-{v}">
        <div class="svg-icon"></div>
      </label>
    {/each}
  </div>

  {#if shape !== "circle"}
    <div class="flex items-stretch flex-nowrap mb-2 label-split-switch" role="group">
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l w-full">{$tr("params.label.split")}</span>
      {#each labelSplits as v (v)}
        <input
          type="radio"
          class="sr-only"
          name="label-split"
          id="label-split-{v}"
          autocomplete="off"
          bind:group={split}
          value={v} />
        <label class="inline-flex items-center gap-1 px-3 h-7 border border-l-0 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors cursor-pointer last:rounded-r {split === v ? 'bg-zinc-700 text-zinc-200' : ''}" for="label-split-{v}">
          <div class="svg-icon"></div>
        </label>
      {/each}
    </div>

    {#if split !== "none"}
      <div class="flex items-stretch flex-nowrap mb-2">
        <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">{$tr("params.label.split.count")}</span>
        <input class="w-full bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" type="number" min="1" bind:value={splitParts} />
      </div>
    {/if}
  {/if}

  {#if split !== "none"}
    <div class="flex items-stretch flex-nowrap mb-2 mirror-switch" role="group">
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l w-full">{$tr("params.label.mirror")}</span>
      {#each mirrorTypes as v (v)}
        <input
          type="radio"
          class="sr-only"
          name="mirror"
          id="mirror-{v}"
          autocomplete="off"
          bind:group={mirror}
          value={v} />
        <label class="inline-flex items-center gap-1 px-3 h-7 border border-l-0 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors cursor-pointer last:rounded-r {mirror === v ? 'bg-zinc-700 text-zinc-200' : ''}" for="mirror-{v}">
          <div class="svg-icon"></div>
        </label>
      {/each}
    </div>

    <div class="flex items-stretch flex-nowrap mb-2 tail-pos-switch" role="group">
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l w-full">{$tr("params.label.tail.position")}</span>
      {#each tailPositions as v (v)}
        <input
          type="radio"
          class="sr-only"
          name="tail-pos"
          id="tail-{v}"
          autocomplete="off"
          bind:group={tailPos}
          value={v} />
        <label class="inline-flex items-center gap-1 px-3 h-7 border border-l-0 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors cursor-pointer last:rounded-r {tailPos === v ? 'bg-zinc-700 text-zinc-200' : ''}" for="tail-{v}">
          <div class="svg-icon"></div>
        </label>
      {/each}
    </div>

    <div class="flex items-stretch flex-nowrap mb-2">
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">{$tr("params.label.tail.length")}</span>
      <input class="w-full bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" type="number" min="1" bind:value={tailLength} />
      <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 border-l-0 text-zinc-500 text-[11px] shrink-0 rounded-r">
        {#if unit === "mm"}{$tr("params.label.mm")}{/if}
        {#if unit === "px"}{$tr("params.label.px")}{/if}
      </span>
    </div>
  {/if}

  <div class="flex items-stretch flex-nowrap mb-2">
    <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">{$tr("params.label.label_title")}</span>
    <input class="w-full bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" type="text" bind:value={title} />
  </div>

  <div class="text-right">
    <button class="inline-flex items-center gap-1 px-2 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors" onclick={onLabelPresetAdd}>
      {$tr("params.label.save_template")}
    </button>
    <button class="inline-flex items-center gap-1 px-2.5 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors" onclick={onApply}>{$tr("params.label.apply")}</button>
  </div>
</div>

<style>
  .svg-icon {
    height: 1.5em;
    width: 1.5em;
    background-size: cover;
  }

  .tail-pos-switch .svg-icon {
    background-image: url("../assets/tail-pos.svg");
  }
  .tail-pos-switch label[for="tail-bottom"] .svg-icon {
    transform: rotate(90deg);
  }
  .tail-pos-switch label[for="tail-left"] .svg-icon {
    transform: rotate(180deg);
  }
  .tail-pos-switch label[for="tail-top"] .svg-icon {
    transform: rotate(270deg);
  }
  .print-dir-switch .svg-icon {
    background-image: url("../assets/print-dir.svg");
  }
  .print-dir-switch label[for="print-dir-top"] .svg-icon {
    transform: rotate(90deg);
  }

  .label-shape-switch label[for="label-shape-rect"] .svg-icon {
    background-image: url("../assets/shape-rect.svg");
  }
  .label-shape-switch label[for="label-shape-rounded_rect"] .svg-icon {
    background-image: url("../assets/shape-rrect.svg");
  }
  .label-shape-switch label[for="label-shape-circle"] .svg-icon {
    background-image: url("../assets/shape-circle.svg");
  }

  .label-split-switch label[for="label-split-none"] .svg-icon {
    background-image: url("../assets/shape-rrect.svg");
  }
  .label-split-switch label[for="label-split-vertical"] .svg-icon {
    background-image: url("../assets/split-vertical.svg");
    transform: rotate(90deg);
  }
  .label-split-switch label[for="label-split-horizontal"] .svg-icon {
    background-image: url("../assets/split-vertical.svg");
  }

  .mirror-switch label[for="mirror-none"] .svg-icon {
    background-image: url("../assets/mirror-none.svg");
  }
  .mirror-switch label[for="mirror-copy"] .svg-icon {
    background-image: url("../assets/mirror-copy.svg");
  }
  .mirror-switch label[for="mirror-flip"] .svg-icon {
    background-image: url("../assets/mirror-flip.svg");
  }
</style>
