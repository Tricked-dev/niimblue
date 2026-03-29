# NiimBlue Label Designer — Full Redesign

**Date:** 2026-03-29
**Status:** Approved

## Overview

Redesign the NiimBlue label designer from a centered Bootstrap web form into a professional, full-viewport label design application. Inspired by P-touch Editor: vertical tool rail, ruler-framed canvas with pan/zoom, and a collapsible right properties panel. Full mobile support via a compact top bar + pull-up sheet. Replace Bootstrap with Tailwind CSS v4 + shadcn-svelte.

---

## Layout Architecture

### Desktop (≥ 640px)

CSS Grid full-viewport shell with three columns and two rows:

```
┌─────────────────────────────────────────────────────┐
│  Top Bar (spans all 3 columns)                      │
├──────┬───────────────────────────────────┬──────────┤
│ Rail │  Canvas Area (rulers + fabric.js) │  Panel   │
│ 42px │  flex:1                           │  220px   │
└──────┴───────────────────────────────────┴──────────┘
```

- **Top bar** (38px): Logo, Save, Open | Undo, Redo | Clear | spacer | printer connection badge | Preview | Print
- **Left rail** (42px): Icon buttons for each object type, CSV toggle, separator, ⚙ label settings, 📁 saved labels at bottom
- **Canvas area**: horizontal ruler (18px) + vertical ruler (18px) + scrollable canvas viewport, zoom overlay (−/+/fit), status bar (22px)
- **Right panel** (220px): scrollable shadcn Accordion with collapsible sections

### Mobile (< 640px)

```
┌─────────────────────────────────────┐
│  Top Bar (tool icons + undo/print)  │
├─────────────────────────────────────┤
│  Canvas (fills remaining height)    │
├─────────────────────────────────────┤
│  Pull-up sheet (tabbed panels)      │
└─────────────────────────────────────┘
```

- Top bar: logo + insert tool icons (Text, Barcode, QR, Shape, Image, Icon) + Undo + Print button
- Canvas fills remaining screen space; rulers are hidden on mobile to maximize space
- Bottom pull-up sheet: drag handle + 4 tabs: **Text · Position · Label · Printer**
- Sheet collapses to a minimal strip (32px) when no object is selected; expands to ~50% viewport height when a tab is active
- Pinch-to-zoom on canvas enabled via Pointer Events API

---

## New Components

### `DesignerShell.svelte`
Full-viewport container replacing the Bootstrap `container` in `MainPage.svelte`. Owns the CSS Grid layout. Receives all the same props/callbacks that `LabelDesigner.svelte` currently handles internally. On mobile, renders the compact top bar and bottom sheet instead of the rail and right panel.

### `DesignerTopBar.svelte`
Top bar with logo, action buttons (save/open/undo/redo/clear), printer connection badge, preview, and print buttons. Printer badge shows connection state reactively (green dot when connected, grey when not).

### `DesignerRail.svelte`
Left vertical icon rail. Each button calls the same `onObjectPicked` / `onIconPicked` callbacks currently in `LabelDesigner`. Click on a tool type that has sub-options (e.g. Barcode, QR) opens a shadcn `Popover` anchored to the button. Bottom section: ⚙ opens label settings sheet/modal, 📁 opens saved labels menu.

### `DesignerPanel.svelte`
Right panel on desktop / bottom sheet on mobile. Contains shadcn `Accordion` sections:

1. **Text** — font family, size, bold/italic/underline, text alignment (visible when `selectedObject` is `fabric.IText`)
2. **Barcode** — barcode params (visible when `selectedObject` is `Barcode`)
3. **QR Code** — qr params (visible when `selectedObject` is `QRCode`)
4. **ArUco** — aruco params (visible when `selectedObject` is `ArUcoMarker`)
5. **Vector** — vector/color params (always visible when any object selected)
6. **Position & Size** — X, Y, W, H inputs + center-H / center-V buttons + layer order (always visible when any object selected)
7. **Label** — width, height, DPI, shape, split, tail, mirror, print direction (always visible, collapsed by default)
8. **Printer** — connection status badge, printer model, printhead pixels, connect/disconnect button (always visible, collapsed by default)

On mobile, sections map to the 4 sheet tabs: Text/Barcode/QR/ArUco/Vector → **Text** tab; Position → **Position** tab; Label → **Label** tab; Printer → **Printer** tab.

### `CanvasRuler.svelte`
SVG-based ruler component. Takes `zoom`, `panOffset`, `lengthPx`, `axis: 'horizontal' | 'vertical'`, and `dpmm` as props. Renders major ticks (every 5mm) and minor ticks (every 1mm) with mm labels. Updates reactively when canvas zoom or pan changes.

### `ZoomControls.svelte`
Floating overlay on the canvas: − button, zoom % display (click to reset to 100%), + button, fit-to-screen button. Bound to `CustomCanvas` zoom state.

---

## Modified Components

### `CustomCanvas` (extended)
Add the following to the existing class:

- **`zoomToPoint(point: fabric.Point, zoom: number)`** — zoom canvas around a specific point (for scroll-to-zoom that centers on cursor position). Clamps zoom to 0.1–20.
- **`panBy(dx: number, dy: number)`** — shift canvas viewport by pixels.
- **`getPanOffset(): fabric.Point`** — returns current viewport transform offset.
- **`fitToScreen(containerW: number, containerH: number)`** — fit label to visible container.
- Replace existing `setupZoom()` with updated version: scroll-to-zoom uses `zoomToPoint` at cursor position. Middle-click resets to fit. Drag-to-pan (no object under cursor) uses `panBy`.
- Emit a `viewport:changed` event after any zoom/pan so rulers can update.
- Add pinch-to-zoom support via Pointer Events (two-pointer distance tracking).

### `LabelDesigner.svelte`
Becomes a thin coordinator: holds state (`fabricCanvas`, `labelProps`, `selectedObject`, `undoState`, etc.) and passes props/callbacks down to `DesignerShell`. No layout markup of its own.

### `MainPage.svelte`
Remove Bootstrap container wrapper. Render `DesignerShell` directly at full viewport. Move locale selector and footer info into the top bar or a settings popover.

---

## Styling / CSS

- **Remove**: `bootstrap` and `@popperjs/core` from dependencies. Remove `src/styles/style.scss` Bootstrap imports.
- **Add**: `tailwindcss` v4, `@tailwindcss/vite` plugin, `shadcn-svelte` (init with `zinc` base color, dark mode via `class`).
- Apply dark mode at the `html` element. The app is always dark — no light/dark toggle needed.
- shadcn components used: `Accordion`, `Button`, `Input`, `Select`, `Separator`, `Popover`, `Badge`, `Tooltip`.
- Noto Sans Variable font kept. Material Icons font kept.
- Toastify styles remain (separate from Bootstrap).

---

## Canvas Pan & Zoom — Interaction Design

| Input | Action |
|-------|--------|
| Scroll wheel | Zoom to cursor position |
| Middle click | Reset zoom to fit |
| Left drag (no object) | Pan canvas |
| Left drag (on object) | Move object (existing) |
| Pinch (touch) | Zoom to midpoint |
| Two-finger drag (touch) | Pan canvas |
| − / + buttons | Zoom in/out by 10% steps |
| Fit button | Fit label to container |

Rulers update on every `viewport:changed` event from `CustomCanvas`.
Status bar shows cursor position in mm (computed from canvas coords + dpmm).

---

## Mobile Sheet Behavior

- Sheet starts collapsed (32px strip with handle + "tap to open" hint)
- Tapping the handle or any tab expands to ~50% viewport height
- Selecting an object on canvas auto-expands the sheet to the relevant tab
- Deselecting collapses the sheet back to strip
- Sheet uses CSS `transform: translateY()` transition for smooth animation
- Rulers hidden on mobile; status bar hidden on mobile (coords shown on sheet when expanded)

---

## Files Created

| File | Purpose |
|------|---------|
| `src/components/DesignerShell.svelte` | Full-viewport grid container, mobile/desktop switching |
| `src/components/DesignerTopBar.svelte` | Top action bar |
| `src/components/DesignerRail.svelte` | Left tool rail |
| `src/components/DesignerPanel.svelte` | Right panel / bottom sheet |
| `src/components/CanvasRuler.svelte` | SVG ruler (H and V) |
| `src/components/ZoomControls.svelte` | Zoom overlay buttons |

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/LabelDesigner.svelte` | Becomes state coordinator only, no layout markup |
| `src/components/MainPage.svelte` | Remove Bootstrap container, render DesignerShell directly |
| `src/components/PrinterConnector.svelte` | Move from MainPage header into DesignerPanel Printer section |
| `src/fabric-object/custom_canvas.ts` | Add zoomToPoint, panBy, getPanOffset, fitToScreen, pinch support, viewport:changed event |
| `src/styles/style.scss` | Remove Bootstrap imports, keep only font + toast overrides |
| `vite.config.ts` | Add `@tailwindcss/vite` plugin |
| `package.json` | Add tailwindcss, shadcn-svelte; remove bootstrap, @popperjs/core |
| `tailwind.config.ts` | New — Tailwind v4 config with shadcn zinc dark theme |

---

## Out of Scope

- No changes to printing logic, print preview, or niimbluelib integration
- No changes to CSV functionality beyond moving its UI into the rail/panel
- No changes to undo/redo logic
- No new label object types
- No light mode toggle
