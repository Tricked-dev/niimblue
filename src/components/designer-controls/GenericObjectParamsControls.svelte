<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import { appConfig } from "$/stores";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import ObjectPositionControls from "$/components/designer-controls/ObjectPositionControls.svelte";
  import { processImageElement } from "$/utils/image_process";
  import type { PostProcessType } from "$/types";

  interface Props {
    selectedObject: fabric.FabricObject;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedObject, editRevision, valueUpdated }: Props = $props();

  interface ProcessedImageData {
    originalBlob: Blob;
    originalUrl: string;
    processOptions: {
      method: PostProcessType | "none";
      threshold: number;
      contrast: number;
    };
    lastScale: number;
    lastWidth: number;
    lastHeight: number;
  }

  const getImageData = (): ProcessedImageData | undefined => {
    return (selectedObject as any)._niimImageData as ProcessedImageData | undefined;
  };

  const isProcessedImage = (): boolean => {
    return !!getImageData();
  };

  const updateProcessOptions = async (options: Partial<ProcessedImageData["processOptions"]>) => {
    const imgData = getImageData();
    if (!imgData) return;

    Object.assign(imgData.processOptions, options);

    const img = selectedObject as fabric.FabricImage;
    const currentWidth = Math.round((img.width ?? 0) * (img.scaleX ?? 1));
    const currentHeight = Math.round((img.height ?? 0) * (img.scaleY ?? 1));

    if (currentWidth < 1 || currentHeight < 1) return;

    try {
      const element = img.getElement();
      if (element && element instanceof HTMLImageElement) {
        const processedCanvas = await processImageElement(element, imgData.processOptions, currentWidth, currentHeight);

        const newUrl = processedCanvas.toDataURL("image/png");
        const newImg = await fabric.FabricImage.fromURL(newUrl);

        img.set({
          width: currentWidth,
          height: currentHeight,
          scaleX: 1,
          scaleY: 1,
        });
        img.setElement(newImg.getElement());

        imgData.lastScale = 1;
        imgData.lastWidth = currentWidth;
        imgData.lastHeight = currentHeight;

        selectedObject.canvas?.requestRenderAll();
        valueUpdated();
      }
    } catch (e) {
      console.error("Failed to update image:", e);
    }
  };

  let currentMethod = $state<PostProcessType | "none">("none");
  let currentThreshold = $state(50);
  let currentContrast = $state(80);

  $effect(() => {
    const imgData = getImageData();
    if (imgData) {
      currentMethod = imgData.processOptions.method;
      currentThreshold = imgData.processOptions.threshold;
      currentContrast = imgData.processOptions.contrast;
    }
  });

  const putToCenterV = () => {
    selectedObject.canvas!.centerObjectV(selectedObject);
    valueUpdated();
  };
  const putToCenterH = () => {
    selectedObject.canvas!.centerObjectH(selectedObject);
    valueUpdated();
  };

  const moveToLeftEdge = () => {
    selectedObject.setPositionByOrigin(
      new fabric.Point(0, selectedObject.getPointByOrigin("left", "top").y),
      "left",
      "top",
    );
    selectedObject.setCoords();
    selectedObject.canvas?.requestRenderAll();
    valueUpdated();
  };

  const moveToRightEdge = () => {
    const cw = selectedObject.canvas!.width;
    const ow = selectedObject.getBoundingRect().width;
    selectedObject.setPositionByOrigin(
      new fabric.Point(cw - ow, selectedObject.getPointByOrigin("left", "top").y),
      "left",
      "top",
    );
    selectedObject.setCoords();
    selectedObject.canvas?.requestRenderAll();
    valueUpdated();
  };

  const bringToFront = () => {
    selectedObject.canvas?.bringObjectToFront(selectedObject);
    selectedObject.canvas?.requestRenderAll();
  };

  const sendToBack = () => {
    selectedObject.canvas?.sendObjectToBack(selectedObject);
    selectedObject.canvas?.requestRenderAll();
  };

  const fit = () => {
    const imageRatio = selectedObject.width / selectedObject.height;
    const canvasRatio = selectedObject.canvas!.width / selectedObject.canvas!.height;
    if ($appConfig.fitMode === "ratio_min") {
      if (imageRatio > canvasRatio) selectedObject.scaleToWidth(selectedObject.canvas!.width);
      else selectedObject.scaleToHeight(selectedObject.canvas!.height);
      selectedObject.canvas!.centerObject(selectedObject);
    } else if ($appConfig.fitMode === "ratio_max") {
      if (imageRatio > canvasRatio) selectedObject.scaleToHeight(selectedObject.canvas!.height);
      else selectedObject.scaleToWidth(selectedObject.canvas!.width);
      selectedObject.canvas!.centerObject(selectedObject);
    } else {
      selectedObject.set({
        left: 0,
        top: 0,
        scaleX: selectedObject.canvas!.width / selectedObject.width,
        scaleY: selectedObject.canvas!.height / selectedObject.height,
      });
    }
    valueUpdated();
  };

  const b = "inline-flex items-center justify-center px-2 h-7 rounded border text-xs transition-colors";
  const bn = "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300";
  const bi = "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500";
</script>

<input type="hidden" value={editRevision} />

<!-- Row 1: align + position + arrange -->
<div class="flex flex-wrap gap-1">
  <button class="{b} {bn}" onclick={putToCenterV} title={$tr("params.generic.center.vertical")}
    ><MdIcon icon="vertical_distribute" /></button>
  <button class="{b} {bn}" onclick={putToCenterH} title={$tr("params.generic.center.horizontal")}
    ><MdIcon icon="horizontal_distribute" /></button>
  <button class="{b} {bn}" onclick={moveToLeftEdge} title="Move to left edge"
    ><MdIcon icon="align_horizontal_left" /></button>
  <button class="{b} {bn}" onclick={moveToRightEdge} title="Move to right edge"
    ><MdIcon icon="align_horizontal_right" /></button>
  <ObjectPositionControls {selectedObject} />
</div>

<!-- Row 2: layer order -->
<div class="flex flex-wrap gap-1">
  <button class="{b} {bn}" onclick={bringToFront} title={$tr("params.generic.arrange.top")}
    ><MdIcon icon="flip_to_front" /></button>
  <button class="{b} {bn}" onclick={sendToBack} title={$tr("params.generic.arrange.bottom")}
    ><MdIcon icon="flip_to_back" /></button>
</div>

{#if selectedObject instanceof fabric.FabricImage}
  <!-- Row 3: fit + mode buttons -->
  <div class="flex flex-wrap gap-1 items-center">
    <button class="{b} {bn}" onclick={fit} title={$tr("params.generic.fit")}><MdIcon icon="fit_screen" /></button>
    {#each [["stretch", $tr("params.generic.fit.mode.stretch")], ["ratio_min", $tr("params.generic.fit.mode.ratio_min")], ["ratio_max", $tr("params.generic.fit.mode.ratio_max")]] as [val, label] (val)}
      <button
        class="{b} {($appConfig.fitMode ?? 'stretch') === val ? bn : bi}"
        onclick={() => appConfig.update((v) => ({ ...v, fitMode: val as "stretch" | "ratio_min" | "ratio_max" }))}>
        {label}
      </button>
    {/each}
  </div>

  {#if isProcessedImage()}
    <!-- Row 4: image processing controls -->
    <div class="flex flex-wrap gap-1 items-center mt-2">
      <span class="text-[10px] text-zinc-500 w-full">Dither</span>
      {#each [["none", "Off"], ["threshold", "Thresh"], ["dither", "Dither"], ["bayer", "Bayer"]] as [val, label] (val)}
        <button
          class="{b} {currentMethod === val ? bn : bi}"
          onclick={() => updateProcessOptions({ method: val as PostProcessType | "none" })}>
          {label}
        </button>
      {/each}
    </div>

    <div class="mt-2">
      <label class="block text-[10px] text-zinc-500">
        Threshold: {currentThreshold}%
      </label>
      <input
        type="range"
        min="0"
        max="100"
        bind:value={currentThreshold}
        onchange={() => updateProcessOptions({ threshold: currentThreshold })}
        class="w-full h-1.5 bg-zinc-700 rounded appearance-none cursor-pointer" />
    </div>

    <div class="mt-1">
      <label class="block text-[10px] text-zinc-500">
        Contrast: {currentContrast}%
      </label>
      <input
        type="range"
        min="0"
        max="100"
        bind:value={currentContrast}
        onchange={() => updateProcessOptions({ contrast: currentContrast })}
        class="w-full h-1.5 bg-zinc-700 rounded appearance-none cursor-pointer" />
    </div>
  {/if}
{/if}
