<script lang="ts">
  import { onMount } from "svelte";
  import { derived } from "svelte/store";
  import {
    appConfig,
    automation,
    connectionState,
    initClient,
    printerClient,
    printerMeta,
    refreshRfidInfo,
  } from "$/stores";
  import * as effects from "$/utils/post_process";
  import {
    type AvailableTransports,
    type EncodedImage,
    ImageEncoder,
    LabelType,
    NiimbotCapacitorBleClient,
    printTaskNames,
    type PrintProgressEvent,
    type PrintTaskName,
    AbstractPrintTask,
    Utils,
  } from "@mmote/niimbluelib";
  import type {
    ConnectionType,
    LabelProps,
    PostProcessType,
    FabricJson,
    PreviewProps,
    PreviewPropsOffset,
  } from "$/types";
  import ParamLockButton from "$/components/basic/ParamLockButton.svelte";
  import { tr, type TranslationKey } from "$/utils/i18n";
  import { canvasPreprocess } from "$/utils/canvas_preprocess";
  import { type DSVRowArray, csvParse } from "d3-dsv";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Toasts } from "$/utils/toasts";
  import { CustomCanvas } from "$/fabric-object/custom_canvas";
  import { FileUtils } from "$/utils/file_utils";
  import AppModal from "$/components/basic/AppModal.svelte";
  import * as Popover from "$/lib/components/ui/popover";

  interface Props {
    labelProps: LabelProps;
    canvasCallback: () => FabricJson;
    printNow?: boolean;
    csvData: string;
    csvEnabled: boolean;
    show: boolean;
  }

  let { labelProps, canvasCallback, printNow = false, csvData, csvEnabled, show = $bindable() }: Props = $props();

  let previewCanvas: HTMLCanvasElement;
  let printState = $state<"idle" | "sending" | "printing">("idle");
  let printProgress = $state<number>(0); // todo: more progress data
  let density = $state<number>($printerMeta?.densityDefault ?? 3);
  let speed = $state<0 | 1>(1);
  let quantity = $state<number>(1);
  let postProcessType = $state<PostProcessType>();
  let postProcessInvert = $state<boolean>(false);
  let postProcessMirror = $state<boolean>(false);
  let thresholdValue = $state<number>(140);
  let strengthValue = $state<number>(1);
  let serpentineValue = $state<boolean>(true);
  let originalImage: ImageData;
  let previewContext: CanvasRenderingContext2D;
  let printTaskName = $state<PrintTaskName>("B1");
  let labelType = $state<LabelType>(LabelType.WithGaps);
  // eslint-disable-next-line no-undef
  let statusTimer: NodeJS.Timeout | undefined = undefined;
  let error = $state<string>("");
  let detectedPrintTaskName: PrintTaskName | undefined = $printerClient?.getPrintTaskType();
  let csvParsed: DSVRowArray<string>;
  let page = $state<number>(0);
  let pagesTotal = $state<number>(1);
  let offset = $state<PreviewPropsOffset>({ x: 0, y: 0, offsetType: "inner" });
  let offsetWarning = $state<string>("");
  let currentPrintTask: AbstractPrintTask | undefined;

  let savedProps = $state<PreviewProps>({});
  let featureSupport = $state<AvailableTransports>({ webBluetooth: false, webSerial: false, capacitorBle: false });

  let modalRef: AppModal;

  const disconnected = derived(connectionState, ($connectionState) => $connectionState !== "connected");

  const labelTypeTranslationKey = (labelType: string): TranslationKey =>
    `preview.label_type.${labelType}` as TranslationKey;

  const endPrint = async () => {
    clearInterval(statusTimer);

    if (!$disconnected && printState !== "idle") {
      if (currentPrintTask !== undefined) {
        await currentPrintTask.printEnd();
      } else {
        console.warn("Print task undefined, falling back to PrintEnd command");
        await $printerClient.abstraction.printEnd();
      }

      refreshRfidInfo();

      $printerClient.startHeartbeat();
    }

    printState = "idle";
    printProgress = 0;
  };

  const onConnectPrinter = async () => {
    const connectionType = (LocalStoragePersistence.loadLastConnectionType() ?? "bluetooth") as ConnectionType;
    await connectWithType(connectionType);
  };

  const hasAnyTransport = (): boolean =>
    featureSupport.capacitorBle || featureSupport.webBluetooth || featureSupport.webSerial;

  const connectWithType = async (connectionType: ConnectionType) => {
    LocalStoragePersistence.saveLastConnectionType(connectionType);

    initClient(connectionType);
    connectionState.set("connecting");

    try {
      if ($printerClient instanceof NiimbotCapacitorBleClient && $automation?.autoConnectDeviceId !== undefined) {
        await $printerClient.connect({ deviceId: $automation.autoConnectDeviceId });
      } else {
        await $printerClient.connect();
      }
    } catch (e) {
      connectionState.set("disconnected");
      Toasts.error(e);
    }
  };

  const onPrintOnSystemPrinter = async () => {
    const sources: string[] = [];

    for (let curPage = 0; curPage < pagesTotal; curPage++) {
      page = curPage;
      await generatePreviewData(page);
      sources.push(previewCanvas.toDataURL("image/png"));
    }

    FileUtils.printImageUrls(sources);
  };

  const onPrint = async () => {
    printState = "sending";
    error = "";

    // do it in a stupid way (multi-page print not finished yet)
    for (let curPage = 0; curPage < pagesTotal; curPage++) {
      $printerClient.stopHeartbeat();

      currentPrintTask = $printerClient.abstraction.newPrintTask(printTaskName, {
        totalPages: quantity,
        density,
        speed,
        labelType,
        statusPollIntervalMs: 100,
        statusTimeoutMs: 8_000,
      });

      page = curPage;
      console.log("Printing page", page);

      await generatePreviewData(page);

      try {
        const encoded: EncodedImage = ImageEncoder.encodeCanvas(previewCanvas, labelProps.printDirection);
        await currentPrintTask.printInit();
        await currentPrintTask.printPage(encoded, quantity);
      } catch (e) {
        error = `${e}`;
        console.error(e);
        return;
      }

      printState = "printing";

      const listener = (e: PrintProgressEvent) => {
        printProgress = Math.floor((e.page / quantity) * ((e.pagePrintProgress + e.pageFeedProgress) / 2));
      };

      $printerClient.on("printprogress", listener);

      try {
        await currentPrintTask.waitForFinished();
      } catch (e) {
        error = `${e}`;
        console.error(e);
      }

      $printerClient.off("printprogress", listener);

      await endPrint();

      if (
        $appConfig.pageDelay !== undefined &&
        $appConfig.pageDelay > 0 &&
        pagesTotal > 1 &&
        curPage < pagesTotal - 1
      ) {
        await Utils.sleep($appConfig.pageDelay);
      }
    }

    printState = "idle";
    $printerClient.startHeartbeat();

    if (printNow && !error) {
      modalRef.hide();
    }
  };

  const updatePreview = () => {
    let iData: ImageData = effects.copyImageData(originalImage);

    if (postProcessType === "threshold") {
      iData = effects.threshold(iData, thresholdValue);
    } else if (postProcessType === "dither") {
      iData = effects.atkinson(iData, { threshold: thresholdValue, strength: strengthValue, serpentine: serpentineValue });
    } else if (postProcessType === "bayer2") {
      iData = effects.bayer(iData, 2);
    } else if (postProcessType === "bayer4") {
      iData = effects.bayer(iData, 4);
    } else if (postProcessType === "bayer" || postProcessType === "bayer8") {
      iData = effects.bayer(iData, 8);
    } else if (postProcessType === "floyd_steinberg") {
      iData = effects.floydSteinberg(iData, { threshold: thresholdValue, strength: strengthValue, serpentine: serpentineValue });
    } else if (postProcessType === "jjn") {
      iData = effects.jarvisJudiceNinke(iData, { threshold: thresholdValue, strength: strengthValue, serpentine: serpentineValue });
    } else if (postProcessType === "stucki") {
      iData = effects.stucki(iData, { threshold: thresholdValue, strength: strengthValue, serpentine: serpentineValue });
    }

    if (postProcessInvert) {
      iData = effects.invert(iData);
    }

    if (postProcessMirror) {
      iData = effects.mirror(iData);
    }

    offsetWarning = "";

    if (offset.offsetType === "inner") {
      previewCanvas.width = originalImage.width;
      previewCanvas.height = originalImage.height;
      previewContext.fillStyle = "white";
      previewContext.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewContext.putImageData(iData, offset.x, offset.y);
    } else {
      previewCanvas.width = originalImage.width + Math.abs(offset.x);
      previewCanvas.height = originalImage.height + Math.abs(offset.y);
      previewContext.fillStyle = "white";
      previewContext.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewContext.putImageData(iData, Math.max(offset.x, 0), Math.max(offset.y, 0));
    }

    if ($printerMeta !== undefined) {
      const headSize = labelProps.printDirection == "left" ? previewCanvas.height : previewCanvas.width;
      if (headSize > $printerMeta.printheadPixels) {
        offsetWarning += $tr("params.label.warning.width") + " ";
        offsetWarning += `(${headSize} > ${$printerMeta.printheadPixels})`;
        offsetWarning += "\n";
      }
    }
  };

  const toggleSavedProp = (key: string, value: any) => {
    const keyObj = key as keyof typeof savedProps;
    savedProps[keyObj] = savedProps[keyObj] === undefined ? value : undefined;
    try {
      LocalStoragePersistence.savePreviewProps(savedProps);
    } catch (e) {
      Toasts.zodErrors(e, "Preview parameters save error:");
    }
  };

  const updateSavedProp = (key: string, value: any, refreshPreview: boolean = false) => {
    const keyObj = key as keyof typeof savedProps;

    if (savedProps[keyObj] !== undefined) {
      savedProps[keyObj] = value;
      try {
        LocalStoragePersistence.savePreviewProps(savedProps);
      } catch (e) {
        Toasts.zodErrors(e, "Preview parameters save error:");
      }
    }

    if (refreshPreview) {
      updatePreview();
    }
  };

  const loadProps = () => {
    try {
      const saved = LocalStoragePersistence.loadSavedPreviewProps();
      if (saved === null) {
        return;
      }
      savedProps = saved;
      if (saved.postProcess !== undefined) postProcessType = saved.postProcess === "bayer" ? "bayer8" : saved.postProcess;
      if (saved.postProcessInvert !== undefined) postProcessInvert = saved.postProcessInvert;
      if (saved.threshold !== undefined) thresholdValue = saved.threshold;
      if (saved.strength !== undefined) strengthValue = saved.strength;
      if (saved.serpentine !== undefined) serpentineValue = saved.serpentine;
      if (saved.quantity !== undefined) quantity = saved.quantity;
      if (saved.density !== undefined) density = saved.density;
      if (saved.speed !== undefined) speed = saved.speed;
      if (saved.labelType !== undefined) labelType = saved.labelType;
      if (saved.printTaskName !== undefined) printTaskName = saved.printTaskName;
      if (saved.offset !== undefined) offset = saved.offset;
    } catch (e) {
      Toasts.zodErrors(e, "Preview parameters load error:");
    }
  };

  const pageDown = () => {
    if (!csvEnabled) {
      page = 0;
      return;
    }
    page = Math.max(0, Math.min(csvParsed.length - 1, page - 1));
    generatePreviewData(page);
  };

  const pageUp = () => {
    if (!csvEnabled) {
      page = 0;
      return;
    }
    page = Math.min(csvParsed.length - 1, page + 1);
    generatePreviewData(page);
  };

  const generatePreviewData = async (page: number): Promise<void> => {
    const fabricTempCanvas = new CustomCanvas(undefined, {
      width: labelProps.size.width,
      height: labelProps.size.height,
    });

    fabricTempCanvas.setCustomBackground(false);
    fabricTempCanvas.setHighlightMirror(false);

    fabricTempCanvas.setLabelProps(labelProps);

    await fabricTempCanvas.loadFromJSON(canvasCallback());

    let variables = {};

    if (csvEnabled) {
      if (page >= 0 && page < csvParsed.length) {
        variables = csvParsed[page];
      } else {
        console.warn(`Page ${page} is out of csv bounds (csv length is ${csvParsed.length})`);
      }
    }

    console.log("Page variables:", variables);

    canvasPreprocess(fabricTempCanvas, variables);

    await fabricTempCanvas.createMirroredObjects();

    fabricTempCanvas.requestRenderAll();

    const preRenderedCanvas = fabricTempCanvas.toCanvasElement();
    const ctx = preRenderedCanvas.getContext("2d")!;
    previewCanvas.width = preRenderedCanvas.width;
    previewCanvas.height = preRenderedCanvas.height;
    previewContext = previewCanvas.getContext("2d")!;
    originalImage = ctx.getImageData(0, 0, preRenderedCanvas.width, preRenderedCanvas.height);

    updatePreview();

    fabricTempCanvas.dispose();
  };

  const onModalClose = () => {
    endPrint();
  };

  onMount(async () => {
    featureSupport = Utils.getAvailableTransports();

    if (csvEnabled) {
      const parseResult = csvParse(csvData);
      const spread: DSVRowArray<string> = Object.assign([], { columns: parseResult.columns });

      for (let row of parseResult) {
        for (const k of Object.keys(row)) {
          row[k] = row[k].replaceAll("\\n", "\n");
        }

        let times = 1;

        if ("$times" in row && row["$times"] !== "") {
          try {
            times = parseInt(row["$times"]);
          } catch (e) {
            console.warn("$times parse error", e);
          }
        }

        if (times < 0) {
          times = 0;
        }

        for (let i = 0; i < times; i++) {
          spread.push(row);
        }
      }

      csvParsed = spread;
      pagesTotal = csvParsed.length;
    }

    if (detectedPrintTaskName !== undefined) {
      console.log(`Detected print task version: ${detectedPrintTaskName}`);
      printTaskName = detectedPrintTaskName;
    }

    loadProps();

    await generatePreviewData(page);

    if (printNow && !$disconnected && printState === "idle") {
      onPrint();
    }
  });
</script>

<AppModal title={$tr("preview.title")} onClose={onModalClose} bind:show bind:this={modalRef}>
  <div class="preview-stage">
    {#if pagesTotal > 1}
      <button
        type="button"
        disabled={printState !== "idle"}
        class="preview-nav-button"
        aria-label="Previous page"
        onclick={pageDown}>
        <MdIcon icon="chevron_left" />
      </button>
    {/if}

    <div class="preview-canvas-shell">
      <canvas class="print-start-{labelProps.printDirection}" bind:this={previewCanvas}></canvas>
    </div>

    {#if pagesTotal > 1}
      <button
        type="button"
        disabled={printState !== "idle"}
        class="preview-nav-button"
        aria-label="Next page"
        onclick={pageUp}>
        <MdIcon icon="chevron_right" />
      </button>
    {/if}
  </div>

  <div class="preview-status text-xs text-zinc-300">
    {#if pagesTotal > 1}<div class="text-zinc-400">Page {page + 1} / {pagesTotal}</div>{/if}

    {#if printState === "sending"}
      <div>Sending...</div>
    {/if}
    {#if printState === "printing"}
      <div class="w-full">
        <div>Printing...</div>
        <div class="w-full bg-zinc-700 rounded-full h-4 mt-1 overflow-hidden" role="progressbar">
          <div
            class="bg-blue-600 h-full text-center text-[10px] leading-4 text-white transition-none"
            style="width: {printProgress}%">
            {printProgress}%
          </div>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="bg-red-900/30 border border-red-700 rounded px-4 py-3 text-red-400 w-full" role="alert">{error}</div>
    {/if}
  </div>

  {#snippet footer()}
    <div class="preview-footer">
      <div class="preview-controls-grid">
        <div class="flex items-stretch">
          <span
            class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l"
            >{$tr("preview.postprocess")}</span>

          <select
            class="bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 flex-1 min-w-0"
            bind:value={postProcessType}
            onchange={() => updateSavedProp("postProcess", postProcessType, true)}>
            <option value="threshold">{$tr("preview.postprocess.threshold")}</option>
            <option value="dither">{$tr("preview.postprocess.atkinson")}</option>
            <option value="bayer2">{$tr("preview.postprocess.bayer")} 2×2</option>
            <option value="bayer4">{$tr("preview.postprocess.bayer")} 4×4</option>
            <option value="bayer8">{$tr("preview.postprocess.bayer")} 8×8</option>
            <option value="floyd_steinberg">{$tr("preview.postprocess.floyd_steinberg")}</option>
            <option value="jjn">{$tr("preview.postprocess.jjn")}</option>
            <option value="stucki">{$tr("preview.postprocess.stucki")}</option>
          </select>

          <ParamLockButton
            propName="postProcess"
            value={postProcessType}
            savedValue={savedProps.postProcess}
            onClick={toggleSavedProp} />

          <button
            type="button"
            class="inline-flex items-center gap-1 px-2 h-7 border border-l-0 border-zinc-700 text-xs transition-colors {postProcessInvert
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              : 'text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
            onclick={() => {
              postProcessInvert = !postProcessInvert;
              updatePreview();
            }}>
            <MdIcon icon="invert_colors" />
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2 h-7 border border-l-0 border-zinc-700 text-xs transition-colors {postProcessMirror
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              : 'text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
            title="Mirror"
            aria-label="Mirror print"
            aria-pressed={postProcessMirror}
            onclick={() => {
              postProcessMirror = !postProcessMirror;
              updatePreview();
            }}>
            <MdIcon icon="flip" />
          </button>
        </div>

        {#if !["bayer2", "bayer4", "bayer8", "bayer"].includes(postProcessType ?? "")}
        <div class="flex items-stretch">
          <span
            class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l"
            >{$tr("preview.threshold")}</span>

          <input
            type="range"
            id="threshold"
            class="flex-1 h-7 px-4 min-w-0"
            min="1"
            max="255"
            bind:value={thresholdValue}
            onchange={() => updateSavedProp("threshold", thresholdValue, true)} />
          <span
            class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 border-l-0 text-zinc-500 text-[11px] shrink-0"
            >{thresholdValue}</span>

          <ParamLockButton
            propName="threshold"
            value={thresholdValue}
            savedValue={savedProps.threshold}
            onClick={toggleSavedProp} />
        </div>
        {/if}

        {#if ["dither", "floyd_steinberg", "jjn", "stucki"].includes(postProcessType ?? "")}
          <div class="flex items-stretch">
            <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l">{$tr("preview.strength")}</span>
            <input
              type="range"
              class="flex-1 h-7 px-4 min-w-0"
              min="0"
              max="1.5"
              step="0.1"
              bind:value={strengthValue}
              onchange={() => updateSavedProp("strength", strengthValue, true)} />
            <span class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 border-l-0 text-zinc-500 text-[11px] shrink-0">{strengthValue.toFixed(1)}</span>
            <ParamLockButton propName="strength" value={strengthValue} savedValue={savedProps.strength} onClick={toggleSavedProp} />
            <button
              type="button"
              class="inline-flex items-center px-2 h-7 border border-l-0 border-zinc-700 text-xs transition-colors {serpentineValue
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}"
              title={$tr("preview.serpentine")}
              aria-label={$tr("preview.serpentine")}
              aria-pressed={serpentineValue}
              onclick={() => {
                serpentineValue = !serpentineValue;
                updateSavedProp("serpentine", serpentineValue, true);
              }}>
              <MdIcon icon="swap_vert" />
            </button>
          </div>
        {/if}

        <div class="flex items-stretch flex-nowrap">
          <span
            class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l"
            >{$tr("preview.copies")}</span>
          <input
            class="w-full bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            type="number"
            min="1"
            bind:value={quantity}
            onchange={() => updateSavedProp("quantity", quantity)} />
          <ParamLockButton
            propName="quantity"
            value={quantity}
            savedValue={savedProps.quantity}
            onClick={toggleSavedProp} />
        </div>

        <div class="flex items-stretch flex-nowrap">
          <span
            class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l"
            >{$tr("preview.density")}</span>
          <input
            class="w-full bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            type="number"
            min={$printerMeta?.densityMin ?? 1}
            max={$printerMeta?.densityMax ?? 20}
            bind:value={density}
            onchange={() => updateSavedProp("density", density)} />
          <ParamLockButton
            propName="density"
            value={density}
            savedValue={savedProps.density}
            onClick={toggleSavedProp} />
        </div>

        {#if printTaskName === "D110M_V4"}
          <div class="flex items-stretch flex-nowrap">
            <span
              class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l"
              >{$tr("preview.speed")}</span>
            <select
              class="bg-zinc-800 border border-zinc-700 rounded-r border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 flex-1"
              bind:value={speed}
              onchange={() => updateSavedProp("speed", speed, true)}>
              <option value={0}>{$tr("preview.speed.0")}</option>
              <option value={1}>{$tr("preview.speed.1")}</option>
            </select>

            <ParamLockButton propName="speed" value={speed} savedValue={savedProps.speed} onClick={toggleSavedProp} />
          </div>
        {/if}

        <div class="flex items-stretch">
          <span
            class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l"
            >{$tr("preview.label_type")}</span>
          <select
            class="bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 flex-1 min-w-0"
            bind:value={labelType}
            onchange={() => updateSavedProp("labelType", labelType)}>
            {#each Object.values(LabelType) as lt (lt)}
              {#if typeof lt !== "string"}
                <option value={lt}>
                  {#if $printerMeta?.paperTypes.includes(lt)}✔{/if}
                  {$tr(labelTypeTranslationKey(LabelType[lt]))}
                </option>
              {/if}
            {/each}
          </select>

          <ParamLockButton
            propName="labelType"
            value={labelType}
            savedValue={savedProps.labelType}
            onClick={toggleSavedProp} />
        </div>

        <div class="flex items-stretch">
          <span
            class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l"
            >{$tr("preview.print_task")}</span>
          <select
            class="bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 flex-1 min-w-0"
            bind:value={printTaskName}
            onchange={() => updateSavedProp("printTaskName", printTaskName)}>
            {#each printTaskNames as name (name)}
              <option value={name}>
                {#if detectedPrintTaskName === name}✔{/if}
                {name}
              </option>
            {/each}
          </select>

          <ParamLockButton
            propName="printTaskName"
            value={printTaskName}
            savedValue={savedProps.printTaskName}
            onClick={toggleSavedProp} />
        </div>

        <div class="flex items-stretch col-span-full preview-offset-row">
          <span
            class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0 rounded-l"
            >{$tr("preview.offset")}</span>
          {#if offsetWarning}
            <span
              class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 border-l-0 text-yellow-400 text-[11px] shrink-0"
              title={offsetWarning}><MdIcon icon="warning" /></span>
          {/if}
          <div class="preview-offset-field">
            <span
              class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0"
              ><MdIcon icon="unfold_more" class="r-90" /></span>
            <input
              class="flex-1 bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 min-w-[4rem]"
              type="number"
              bind:value={offset.x}
              onchange={() => updateSavedProp("offset", offset, true)} />
          </div>
          <div class="preview-offset-field">
            <span
              class="inline-flex items-center px-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[11px] shrink-0"
              ><MdIcon icon="unfold_more" /></span>
            <input
              class="flex-1 bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 min-w-[4rem]"
              type="number"
              bind:value={offset.y}
              onchange={() => updateSavedProp("offset", offset, true)} />
          </div>
          <select
            class="bg-zinc-800 border border-zinc-700 border-l-0 px-2 h-7 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 min-w-[6rem]"
            bind:value={offset.offsetType}
            onchange={() => updateSavedProp("offset", offset, true)}>
            <option value="inner">{$tr("preview.offset.inner")}</option>
            <option value="outer">{$tr("preview.offset.outer")}</option>
          </select>

          <ParamLockButton propName="offset" value={offset} savedValue={savedProps.offset} onClick={toggleSavedProp} />
        </div>
      </div>

      <div class="preview-actions">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1 px-2.5 h-8 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors"
          onclick={() => modalRef.hide()}>
          {$tr("preview.close")}
        </button>

        {#if printState !== "idle"}
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1 px-2.5 h-8 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            disabled={$disconnected}
            onclick={endPrint}>
            {$tr("preview.print.cancel")}
          </button>
        {/if}

        <button
          type="button"
          class="inline-flex items-center justify-center gap-1 px-2.5 h-8 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition-colors"
          title={$tr("preview.print.system")}
          onclick={onPrintOnSystemPrinter}>
          <MdIcon icon="print" />
        </button>

        {#if $disconnected}
          <div class="preview-connect-desktop">
            <Popover.Root>
              <Popover.Trigger
                class="inline-flex items-center justify-center gap-1 px-2.5 h-8 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors whitespace-nowrap w-full disabled:opacity-50"
                disabled={$connectionState === "connecting"}
                title="Connect printer">
                <MdIcon icon={$connectionState === "connecting" ? "hourglass_top" : "bluetooth_searching"} />
                {$connectionState === "connecting" ? "Connecting..." : "Connect"}
                {#if $connectionState !== "connecting"}<MdIcon icon="expand_more" />{/if}
              </Popover.Trigger>

              <Popover.Content side="top" align="end" portalProps={{ disabled: true }} class="w-48 p-1">
                {#if featureSupport.webBluetooth}
                  <button type="button" class="preview-connect-option" onclick={() => connectWithType("bluetooth")}>
                    <MdIcon icon="bluetooth" />
                    {$tr("connector.bluetooth")}
                  </button>
                {/if}
                {#if featureSupport.webSerial}
                  <button type="button" class="preview-connect-option" onclick={() => connectWithType("serial")}>
                    <MdIcon icon="usb" />
                    {$tr("connector.serial")}
                  </button>
                {/if}
                {#if featureSupport.capacitorBle}
                  <button type="button" class="preview-connect-option" onclick={() => connectWithType("capacitor-ble")}>
                    <MdIcon icon="usb" /> Capacitor BLE
                  </button>
                {/if}
                {#if !hasAnyTransport()}
                  <div class="px-2 py-1.5 text-[11px] text-zinc-400">No supported connection methods</div>
                {/if}
              </Popover.Content>
            </Popover.Root>
          </div>

          <button
            type="button"
            class="preview-connect-mobile inline-flex items-center justify-center gap-1 px-2.5 h-8 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors whitespace-nowrap"
            disabled={$connectionState === "connecting" || !hasAnyTransport()}
            title="Connect printer"
            onclick={onConnectPrinter}>
            <MdIcon icon={$connectionState === "connecting" ? "hourglass_top" : "bluetooth_searching"} />
            {$connectionState === "connecting" ? "Connecting..." : "Connect"}
          </button>
        {/if}

        <button
          type="button"
          class="inline-flex items-center justify-center gap-1 px-2.5 h-8 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap"
          disabled={$disconnected || printState !== "idle"}
          onclick={onPrint}>
          {#if $disconnected}
            {$tr("preview.not_connected")}
          {:else}
            <MdIcon icon="print" /> {$tr("preview.print")}
          {/if}
        </button>
      </div>
    </div>
  {/snippet}
</AppModal>

<style>
  .preview-stage {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .preview-canvas-shell {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 10rem;
    max-height: min(55vh, 26rem);
    overflow: auto;
    border-radius: 0.5rem;
    border: 1px solid #3f3f46;
    background:
      linear-gradient(45deg, #191919 25%, transparent 25%), linear-gradient(-45deg, #191919 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #191919 75%), linear-gradient(-45deg, transparent 75%, #191919 75%);
    background-size: 20px 20px;
    background-position:
      0 0,
      0 10px,
      10px -10px,
      -10px 0;
    padding: 0.75rem;
  }

  .preview-nav-button {
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #a1a1aa;
    border: 1px solid #3f3f46;
    border-radius: 0.5rem;
    transition: color 120ms ease;
  }

  .preview-nav-button:hover:not(:disabled) {
    color: #f4f4f5;
  }

  .preview-nav-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .preview-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.25rem;
  }

  .preview-footer {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
  }

  .preview-controls-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .preview-actions {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
    width: 100%;
  }

  .preview-offset-field {
    display: flex;
    flex: 1 1 8rem;
    min-width: 8rem;
  }

  .preview-connect-desktop {
    display: inline-flex;
  }

  .preview-connect-mobile {
    display: none;
  }

  .preview-connect-option {
    height: 1.9rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0 0.5rem;
    border-radius: 0.35rem;
    color: #d4d4d8;
    font-size: 0.74rem;
    transition: background-color 120ms ease;
  }

  .preview-connect-option:hover {
    background: #3f3f46;
  }

  canvas {
    image-rendering: pixelated;
    border: 1px solid #6d6d6d;
    max-width: 100%;
    height: auto;
  }

  canvas.print-start-left {
    border-left: 2px solid #ff4646;
  }

  canvas.print-start-top {
    border-top: 2px solid #ff4646;
  }

  @media (max-width: 900px) {
    .preview-controls-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .preview-actions {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .preview-connect-desktop {
      display: none;
    }

    .preview-connect-mobile {
      display: inline-flex;
    }
  }

  @media (max-width: 640px) {
    .preview-stage {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .preview-nav-button {
      width: 100%;
      height: 2.25rem;
    }

    .preview-offset-row {
      flex-wrap: wrap;
      overflow-x: visible;
      row-gap: 0.5rem;
    }

    .preview-actions {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
