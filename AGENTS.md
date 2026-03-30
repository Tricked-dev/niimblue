# Niimblue - Agent Guide

Label designer web app (Svelte + fabric.js) for Niimbot thermal printers.

## Stack

- **Framework**: Svelte (not SvelteKit), TypeScript
- **Canvas**: fabric.js for label design canvas
- **Runtime/Package manager**: Bun (`bun run dev`, `bun add <x>`, `bun run <file.ts>`)
- **Build**: Vite
- **UI**: shadcn-svelte (Radix-based components via `$lib/components/ui/`). Use existing shadcn components before building custom ones. Add new ones with `bunx shadcn-svelte@latest add <component>`.

## Project Structure

- `src/components/` — Svelte UI components
- `src/components/designer-controls/` — Controls panel for selected objects
- `src/fabric-object/` — Custom fabric.js objects (QR, barcode, datamatrix, canvas)
- `src/utils/` — Helpers (image processing, file utils, label object helpers)
- `src/types.ts` — Shared types
- `src/defaults.ts` — App defaults (grid size, etc.)

## shadcn-svelte

Components live in `src/lib/components/ui/`. Currently installed: **accordion, badge, button, input, select, separator, tooltip**.

Add new components: `bunx shadcn-svelte@latest add <name>`

Available (not yet installed): alert, alert-dialog, avatar, breadcrumb, button-group, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, data-table, dialog, drawer, dropdown-menu, field, form, hover-card, input-group, input-otp, kbd, label, menubar, native-select, navigation-menu, pagination, popover, progress, radio-group, range-calendar, resizable, scroll-area, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toggle, toggle-group.

Import pattern: `import { Button } from "$lib/components/ui/button";`

## Key Patterns

- **fabric.js objects must render synchronously** — async image loading breaks `canvas.toDataURL()` for print/preview. Always render in `_render()` with `ctx.fillRect()` etc.
- **Image reprocessing** — Images store original element in `_niimImageData` on the fabric object. Always reprocess from original to avoid quality loss.
- **Crisp rendering** — Use `ctx.imageSmoothingEnabled = false` and `ctx.translate(-0.5, -0.5)` for pixel-perfect output.
- **Grid rendering** — In `custom_canvas.ts` `renderCutFoldMirror()` method.

## Common Entry Points

| Task | Start here |
|------|-----------|
| Add/modify canvas objects | `src/fabric-object/` |
| Image import/processing | `src/utils/image_process.ts`, `ImageImportModal.svelte` |
| Object property controls | `GenericObjectParamsControls.svelte` |
| Canvas behavior/grid | `src/fabric-object/custom_canvas.ts` |
| Adding objects to canvas | `src/utils/label_designer_object_helper.ts` |
| Main designer layout | `src/components/LabelDesigner.svelte` |
