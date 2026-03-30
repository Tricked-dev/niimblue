<script lang="ts">
  import * as fabric from "fabric";
  import { onDestroy, onMount, tick } from "svelte";
  import { ArUcoMarker } from "$/fabric-object/aruco";
  import { Barcode } from "$/fabric-object/barcode";
  import { QRCode } from "$/fabric-object/qrcode";
  import { iconCodepoints, type MaterialIcon } from "$/styles/mdi_icons";
  import { automation, connectionState, csvData, labelDpmm, loadedFonts, appConfig } from "$/stores";
  import {
    ExportedLabelTemplateSchema,
    type ExportedLabelTemplate,
    type FabricJson,
    type LabelProps,
    type MoveDirection,
    type OjectType,
  } from "$/types";
  import { FileUtils } from "$/utils/file_utils";
  import { tr } from "$/utils/i18n";
  import { LabelDesignerObjectHelper } from "$/utils/label_designer_object_helper";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";
  import { UndoRedo, type UndoState } from "$/utils/undo_redo";
  import { DEFAULT_LABEL_PROPS, GRID_SIZE, OBJECT_DEFAULTS } from "$/defaults";
  import { LabelDesignerUtils } from "$/utils/label_designer_utils";
  import { CustomCanvas } from "$/fabric-object/custom_canvas";
  import { CanvasUtils } from "$/utils/canvas_utils";
  import DesignerShell from "$/components/DesignerShell.svelte";
  import PrintPreview from "$/components/PrintPreview.svelte";
  import type { LabelPreset } from "$/types";

  interface Props {
    initialPreset?: LabelPreset;
    initialLabel?: ExportedLabelTemplate;
  }

  let { initialPreset, initialLabel }: Props = $props();

  let htmlCanvas = $state<HTMLCanvasElement | undefined>();
  let fabricCanvas = $state<CustomCanvas>();
  let labelProps = $state<LabelProps>(DEFAULT_LABEL_PROPS);
  let previewOpened = $state<boolean>(false);
  let selectedObject = $state<fabric.FabricObject | undefined>(undefined);
  let selectedCount = $state<number>(0);
  let editRevision = $state<number>(0);
  let printNow = $state<boolean>(false);
  let csvEnabled = $state<boolean>(false);
  let undoState = $state<UndoState>({ undoDisabled: false, redoDisabled: false });

  const undo = new UndoRedo();

  const discardSelection = () => {
    fabricCanvas!.discardActiveObject();
    fabricCanvas!.requestRenderAll();
    selectedObject = undefined;
    selectedCount = 0;
    editRevision = 0;
  };

  const loadLabelData = async (data: ExportedLabelTemplate) => {
    undo.paused = true;
    onUpdateLabelProps(data.label);
    if (data.csv) {
      $csvData = data.csv;
      csvEnabled = true;
    }
    await FileUtils.loadCanvasState(fabricCanvas!, data.canvas);
    undo.paused = false;
  };

  undo.onLabelUpdate = loadLabelData;
  undo.onStateUpdate = (state: UndoState) => {
    undoState = state;
  };

  const deleteSelected = () => {
    LabelDesignerUtils.deleteSelection(fabricCanvas!);
    discardSelection();
  };

  const cloneSelected = () => {
    LabelDesignerUtils.cloneSelection(fabricCanvas!).then(() => undo.push(fabricCanvas!, labelProps));
  };

  const moveSelected = (direction: MoveDirection, ctrl?: boolean) => {
    LabelDesignerUtils.moveSelection(fabricCanvas!, direction, ctrl);
    undo.push(fabricCanvas!, labelProps);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const key: string = e.key.toLowerCase();
    const cmdOrCtrl = e.metaKey || e.ctrlKey;
    const shift = e.shiftKey;

    if (key === "escape") {
      discardSelection();
      return;
    }

    if (cmdOrCtrl && key === "p") {
      e.preventDefault();
      previewOpened = true;
      return;
    }

    if (LabelDesignerUtils.isAnyInputFocused(fabricCanvas!)) {
      return;
    }

    if (key.startsWith("arrow")) {
      e.preventDefault();
      const dir = key.slice("arrow".length) as MoveDirection;
      if (shift) {
        LabelDesignerUtils.resizeSelection(fabricCanvas!, dir, cmdOrCtrl);
      } else {
        moveSelected(dir, cmdOrCtrl);
      }
      return;
    }

    if (e.repeat) return;

    if (!cmdOrCtrl && !shift && key >= "1" && key <= "9") {
      const quickTypes: OjectType[] = [
        "text",
        "barcode",
        "qrcode",
        "datamatrix",
        "aruco",
        "rectangle",
        "reverseBox",
        "bar",
        "circle",
      ];
      const idx = parseInt(key, 10) - 1;
      if (idx < quickTypes.length) {
        const obj = LabelDesignerObjectHelper.addObject(fabricCanvas!, quickTypes[idx]);
        if (obj) {
          fabricCanvas!.setActiveObject(obj);
          selectedObject = obj;
          selectedCount = 1;
          undo.push(fabricCanvas!, labelProps);
        }
      }
      return;
    }

    if (cmdOrCtrl && key === "a") {
      e.preventDefault();
      const objs = fabricCanvas!.getObjects();
      if (objs.length > 0) {
        fabricCanvas!.setActiveObject(new fabric.ActiveSelection(objs, { canvas: fabricCanvas! }));
        fabricCanvas!.requestRenderAll();
        selectedObject = fabricCanvas!.getActiveObject() as fabric.FabricObject | undefined;
        selectedCount = objs.length;
      }
      return;
    }

    if (cmdOrCtrl && key === "d") {
      e.preventDefault();
      cloneSelected();
      return;
    }

    if ((cmdOrCtrl && key === "y") || (cmdOrCtrl && shift && key === "z")) {
      e.preventDefault();
      if (!undoState.redoDisabled) undo.redo();
      return;
    }

    if (cmdOrCtrl && key === "z") {
      e.preventDefault();
      if (!undoState.undoDisabled) undo.undo();
      return;
    }

    if (key === "delete" || key === "backspace") {
      deleteSelected();
      return;
    }
  };

  const onUpdateLabelProps = (newProps: LabelProps) => {
    labelProps = newProps;
    fabricCanvas!.setDimensions(labelProps.size);
    fabricCanvas!.fitToWrapper();
    try {
      LocalStoragePersistence.saveLastLabelProps(labelProps);
      undo.push(fabricCanvas!, labelProps);
    } catch (e) {
      Toasts.zodErrors(e, "Label parameters save error:");
    }
  };

  const exportCurrentLabel = (): ExportedLabelTemplate => {
    return FileUtils.makeExportedLabel(fabricCanvas!, labelProps, csvEnabled);
  };

  const onLoadRequested = (label: ExportedLabelTemplate) => {
    loadLabelData(label).then(() => undo.push(fabricCanvas!, labelProps));
  };

  const zplImageReady = async (img: Blob) => {
    await LabelDesignerObjectHelper.addImageBlob(fabricCanvas!, img);
    undo.push(fabricCanvas!, labelProps);
  };

  const pdfImageReady = async (el: HTMLCanvasElement) => {
    const img = new fabric.FabricImage(el, {
      ...OBJECT_DEFAULTS,
      left: 0,
      top: 0,
    });
    fabricCanvas!.add(img);
    fabricCanvas!.setActiveObject(img);
    undo.push(fabricCanvas!, labelProps);
  };

  const onObjectPicked = (objectType: OjectType) => {
    const obj = LabelDesignerObjectHelper.addObject(fabricCanvas!, objectType);
    if (obj !== undefined) {
      fabricCanvas!.setActiveObject(obj);
      undo.push(fabricCanvas!, labelProps);
    }
  };

  const onIconPicked = (i: MaterialIcon) => {
    LabelDesignerObjectHelper.addStaticText(fabricCanvas!, String.fromCodePoint(iconCodepoints[i]), {
      fontFamily: "Material Icons",
      fontSize: 100,
    });
    undo.push(fabricCanvas!, labelProps);
  };

  const onSvgIconPicked = (i: string) => {
    LabelDesignerObjectHelper.addSvg(fabricCanvas!, i);
    undo.push(fabricCanvas!, labelProps);
  };

  const openPreview = () => {
    printNow = false;
    previewOpened = true;
  };

  const openPreviewAndPrint = () => {
    printNow = true;
    previewOpened = true;
  };

  const controlValueUpdated = () => {
    if (selectedObject) {
      selectedObject.setCoords();
      selectedObject.dirty = true;
      undo.push(fabricCanvas!, labelProps);
    }
    fabricCanvas!.requestRenderAll();
    editRevision++;
  };

  const getCanvasForPreview = (): FabricJson => {
    return fabricCanvas!.toJSON();
  };

  const onCsvPlaceholderPicked = (name: string) => {
    const obj = LabelDesignerObjectHelper.addText(fabricCanvas!, `{${name}}`, {
      textAlign: "left",
      originX: "left",
      originY: "top",
    });
    fabricCanvas!.setActiveObject(obj);
    undo.push(fabricCanvas!, labelProps);
  };

  const onPaste = async (event: ClipboardEvent) => {
    if (LabelDesignerUtils.isAnyInputFocused(fabricCanvas!)) return;

    if (event.clipboardData != null) {
      event.preventDefault();
      const obj = await LabelDesignerObjectHelper.addObjectFromClipboard(fabricCanvas!, event.clipboardData);
      if (obj !== undefined) {
        fabricCanvas!.setActiveObject(obj);
        undo.push(fabricCanvas!, labelProps);
      }
    }
  };

  const clearCanvas = () => {
    if (!confirm($tr("editor.clear.confirm"))) return;
    undo.push(fabricCanvas!, labelProps);
    fabricCanvas!.clear();
  };

  const onSave = () => {
    try {
      FileUtils.saveLabelAsJson(exportCurrentLabel());
    } catch (e) {
      Toasts.error(e);
    }
  };

  const onOpen = async () => {
    try {
      const contents = await FileUtils.pickAndReadSingleTextFile("json");
      const rawData = JSON.parse(contents);
      const label = ExportedLabelTemplateSchema.parse(rawData);
      let message = $tr("editor.warning.load");
      if (label.csv) message += "\n" + $tr("editor.warning.load.csv");
      if (!confirm(message)) return;
      onLoadRequested(label);
    } catch (e) {
      Toasts.zodErrors(e, "Canvas load error:");
    }
  };

  const loadLabelFromUrl = async () => {
    try {
      const urlTemplate = await FileUtils.readLabelFromUrl();
      if (urlTemplate !== null && confirm($tr("params.saved_labels.load.url.warn"))) {
        onLoadRequested(urlTemplate);
        Toasts.message($tr("params.saved_labels.load.url.loaded"));
        return true;
      }
    } catch (e) {
      Toasts.error(e);
    }
    return false;
  };

  const loadDefaultLabel = async () => {
    const urlLoaded = await loadLabelFromUrl();
    if (urlLoaded) return;

    try {
      const defaultTemplate = LocalStoragePersistence.loadDefaultTemplate();
      if (defaultTemplate !== null) {
        onLoadRequested(defaultTemplate);
        return;
      }
    } catch (e) {
      Toasts.error(e);
    }

    LabelDesignerObjectHelper.addText(fabricCanvas!, $tr("editor.default_text"));
  };

  const renderOnFontsChanged = () => {
    fabricCanvas?.forEachObject((o) => {
      if (o instanceof fabric.Textbox) o.dirty = true;
    });
    fabricCanvas?.requestRenderAll();
  };

  onMount(async () => {
    try {
      const savedLabelProps = LocalStoragePersistence.loadLastLabelProps();
      if (savedLabelProps !== null) labelProps = savedLabelProps;
    } catch (e) {
      Toasts.zodErrors(e, "Label parameters load error:");
    }

    fabricCanvas = new CustomCanvas(htmlCanvas, {
      width: labelProps.size.width,
      height: labelProps.size.height,
    });
    fabricCanvas.setLabelProps(labelProps);

    if (initialLabel !== undefined) {
      await loadLabelData(initialLabel);
    } else {
      if (initialPreset !== undefined) {
        onUpdateLabelProps({
          printDirection: initialPreset.printDirection,
          size: {
            width: Math.floor(
              initialPreset.unit === "mm" ? initialPreset.width * initialPreset.dpmm : initialPreset.width,
            ),
            height: Math.floor(
              initialPreset.unit === "mm" ? initialPreset.height * initialPreset.dpmm : initialPreset.height,
            ),
          },
          shape: initialPreset.shape ?? "rect",
          split: initialPreset.split ?? "none",
          splitParts: initialPreset.splitParts ?? 2,
          tailPos: initialPreset.tailPos ?? "right",
          tailLength: Math.floor(
            initialPreset.unit === "mm"
              ? (initialPreset.tailLength ?? 0) * initialPreset.dpmm
              : (initialPreset.tailLength ?? 0),
          ),
          mirror: initialPreset.mirror ?? "none",
        });
      }
      await loadDefaultLabel();
    }

    window.addEventListener("hashchange", loadLabelFromUrl);

    undo.push(fabricCanvas, labelProps);

    fabricCanvas.on("object:moving", (e): void => {
      const snap = $appConfig.moveSnap;
      if (snap > 0 && e.target && e.target.left !== undefined && e.target.top !== undefined) {
        e.target.set({
          left: Math.round(e.target.left / snap) * snap,
          top: Math.round(e.target.top / snap) * snap,
        });
      }
    });

    fabricCanvas.on("object:modified", (e): void => {
      const snap = $appConfig.resizeSnap;
      if (snap > 0 && e.target) {
        const obj = e.target;
        const snapped = {
          left: Math.round(obj.left / snap) * snap,
          top: Math.round(obj.top / snap) * snap,
          width: Math.max(snap, Math.round((obj.width * obj.scaleX) / snap) * snap),
          height: Math.max(snap, Math.round((obj.height * obj.scaleY) / snap) * snap),
        };
        obj.set({ ...snapped, scaleX: 1, scaleY: 1 });
        obj.setCoords();
        fabricCanvas.requestRenderAll();
      }
      undo.push(fabricCanvas!, labelProps);
    });

    fabricCanvas.on("text:changed", () => {
      editRevision++;
    });

    fabricCanvas.on("object:removed", (): void => {
      undo.push(fabricCanvas!, labelProps);
    });

    fabricCanvas.on("selection:created", (e): void => {
      selectedCount = e.selected?.length ?? 0;
      selectedObject = e.selected?.length === 1 ? e.selected[0] : undefined;
      editRevision++;
    });

    fabricCanvas.on("selection:updated", (e): void => {
      selectedCount = e.selected?.length ?? 0;
      selectedObject = e.selected?.length === 1 ? e.selected[0] : undefined;
      editRevision++;
    });

    fabricCanvas.on("selection:cleared", (): void => {
      selectedObject = undefined;
      selectedCount = 0;
      editRevision++;
    });

    fabricCanvas.on("dragover", (e): void => {
      e.e.preventDefault();
    });

    fabricCanvas.on("drop:after", async (e): Promise<void> => {
      const dragEvt = e.e as DragEvent;
      dragEvt.preventDefault();
      let dropped = false;
      if (dragEvt.dataTransfer?.files) {
        for (const file of dragEvt.dataTransfer.files) {
          try {
            await LabelDesignerObjectHelper.addImageFile(fabricCanvas!, file);
            dropped = true;
          } catch (e) {
            Toasts.error(e);
          }
        }
        if (dropped) undo.push(fabricCanvas!, labelProps);
      }
    });

    fabricCanvas.on("object:scaling", (e): void => {
      if (!e.target) return;
      CanvasUtils.fixFabricObjectScale(e.target);
    });

    if ($automation !== undefined) {
      if ($automation.startPrint === "immediately") {
        openPreview();
      } else if ($automation.startPrint === "after_connect") {
        const unsubscribe = connectionState.subscribe((st) => {
          if (st === "connected") {
            tick().then(() => unsubscribe());
            openPreviewAndPrint();
          }
        });
      }
    }
  });

  onDestroy(() => {
    fabricCanvas!.dispose();
    window.removeEventListener("hashchange", loadLabelFromUrl);
  });

  $effect(() => {
    fabricCanvas?.setLabelProps(labelProps);
  });

  $effect(() => {
    if (!previewOpened) printNow = false;
  });

  $effect(() => {
    fabricCanvas?.setGrid($appConfig.visualGrid, $appConfig.moveSnap);
  });

  $effect(() => {
    fabricCanvas?.setNonPrintableColor($appConfig.nonPrintableColor ?? "#CFCFCF");
  });

  $effect(() => {
    if ($loadedFonts) renderOnFontsChanged();
  });
</script>

<svelte:window onkeydown={onKeyDown} onpaste={onPaste} />

<DesignerShell
  canvas={fabricCanvas}
  {labelProps}
  {selectedObject}
  {selectedCount}
  {editRevision}
  {undoState}
  bind:csvEnabled
  onUndo={() => undo.undo()}
  onRedo={() => undo.redo()}
  onClear={clearCanvas}
  onPreview={openPreview}
  onPrint={openPreviewAndPrint}
  {onSave}
  {onOpen}
  {onObjectPicked}
  {onIconPicked}
  {onSvgIconPicked}
  onZplImageReady={zplImageReady}
  onPdfImageReady={pdfImageReady}
  onRequestLabelTemplate={exportCurrentLabel}
  {onLoadRequested}
  {onCsvPlaceholderPicked}
  onLabelSettingsOpen={() => {}}
  onValueUpdated={controlValueUpdated}
  onLabelPropsChange={onUpdateLabelProps}
  onDeleteSelected={deleteSelected}
  onCloneSelected={cloneSelected}>
  <!-- Canvas element lives here so bind:this stays in LabelDesigner scope -->
  <div
    class="border bg-zinc-800/50 shadow-lg"
    class:border-l-red-500={labelProps.printDirection === "left"}
    class:border-t-red-500={labelProps.printDirection === "top"}
    class:border-l-2={labelProps.printDirection === "left"}
    class:border-t-2={labelProps.printDirection === "top"}
    class:border-zinc-700={labelProps.printDirection !== "left" && labelProps.printDirection !== "top"}>
    <canvas bind:this={htmlCanvas} style="image-rendering:pixelated;display:block;"></canvas>
  </div>
</DesignerShell>

{#if previewOpened}
  <PrintPreview
    bind:show={previewOpened}
    canvasCallback={getCanvasForPreview}
    {labelProps}
    {printNow}
    {csvEnabled}
    csvData={$csvData.data} />
{/if}
