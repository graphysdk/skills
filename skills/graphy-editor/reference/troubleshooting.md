# Troubleshooting

Contents

- Nothing happens when I click a bar
- The menu opens with a title and no rows
- The Palette row is missing from the Chart menu
- Cmd+Z does nothing
- My edits disappear, or undo is always empty
- `onSpecChange` fires late, or not at all after a slider
- A panel section renders nothing
- A section or control throws about `IntlProvider`
- The panel is light on a dark page
- The point and edit menu ignores my CSS
- A section I wrote with `defaultExpandedSection` stays closed
- The accordion state leaks between tabs
- Two sections open at once, or one never opens
- Tooltips are gone
- Annotations are gone
- The chart remounted and lost its selection and hover
- A command does nothing
- The restored chart looks unthemed
- Importing `editable.css` fails
- The read-only bundle grew

## Nothing happens when I click a bar

- `mode` is not `'point-and-edit'`. In `editable`, annotations, the title, the caption and the (+) button support editing; bars do not. In `readonly`, canvas editing is disabled.
- The chart uses a plain `GraphRenderer`. Only `EditableGraphRenderer` from `@graphysdk/react/editable` has the editing layer.
- The target has no editing controls: a line's single point, a heatmap tile, a layer colored by a number, a band of stacked bars, a geom from a geom package. Only targets with a menu row or visibility toggle can be hovered and selected. Register a menu with `editMenus` to make it selectable.

## The menu opens with a title and no rows

Some targets have a visibility button but no settings rows, such as a polar chart's axis or grid lines. A custom menu can also render no rows. The visibility button still shows or hides the target.

## The Palette row is missing from the Chart menu

Pass `palettePresets` to `EditableGraphRenderer`. The row also requires a discrete color scale with a theme palette, so it is hidden for heatmaps. The Chart menu opens only when a layer supports data labels or the chart draws a line or area.

## Cmd+Z does nothing

- The host must bind shortcuts. Call `useGraphHistoryShortcuts(handleRef)` with the `handleRef` you gave `GraphProvider`.
- Focus is in a text input, textarea or contenteditable element anywhere on the page. The hook leaves those shortcuts to the field. Fields in the pre-built panel handle chart undo themselves. Fields in the point and edit menu keep their native undo.
- The previous spec no longer compiles, for example because its data lost a required column. `undo()` returns `false` and keeps the undo entry so you can retry when the data supports it.
- A new `spec` object cleared the history. See the next section.

## My edits disappear, or undo is always empty

The provider compares `spec` by reference. A different object replaces the edited state and clears history. This happens if you rebuild the spec on every render or pass the original object after returning an edited one. Keep `spec` in state, memoize it, and pass back the value from `onSpecChange`.

## `onSpecChange` fires late, or not at all after a slider

Transient edits dispatched with `{ transient: true }` are pending. Call `commit()` when the gesture ends to fire `onSpecChange`. The next normal dispatch also commits pending edits. Undo or redo discards the pending notification instead.

## A panel section renders nothing

- The section does not apply to the chart: `LineSection` on a bar chart, `PolarSection` on a cartesian chart, `ComboSection` outside a combo, `BarSection` on a pie. You can mount all sections; unsupported sections render nothing.
- The chart has not compiled yet. Sections render after the first successful compile.
- `usePanelGraph()` threw because the root has no chart. Inside `GraphProvider`, it gets the chart from context. Outside, pass `handle`.

## A section or control throws about `IntlProvider`

It is rendered outside `EditorPanel.Root`. The root mounts the editor's translation context. Put the section inside a root, or wrap your own editing UI in `IntlProvider` from `@graphysdk/react/editable`. React-intl's provider uses a different context and cannot replace it.

## The panel is light on a dark page

- Inside the provider the panel follows the chart's `colorScheme`. Set it on `GraphProvider`.
- Outside the provider, with only a `handle`, the chart's color scheme is unavailable. Wrap the panel in `ThemeProvider` from `@graphysdk/react` with the scheme.

## The point and edit menu ignores my CSS

- The menu renders in a portal outside the chart element, so it does not inherit CSS variables set only on that element. Set `--graphy-editor-*` and `--graphy-editor-menu-*` on `:root`, or on `[data-graphy-color-scheme='dark']` for dark charts.
- The chart's stylesheet does not style the editor. Editor fonts and colors are separate to keep controls readable.

## A section I wrote with `defaultExpandedSection` stays closed

The prop matches the section's translated title. Pass the title as it renders in the current locale.

## The accordion state leaks between tabs

Give `EditorPanel.Root` a new `key` per tab. Each mount starts from its own `defaultExpandedSection`.

## Two sections open at once, or one never opens

Two sections share a title. The accordion identifies sections by title. Make them distinct.

## Tooltips are gone

Both editing modes hide tooltips regardless of `showTooltips`. They return in `readonly`.

## Annotations are gone

Point and edit does not draw annotations. Switch to `editable` to see and edit them.

## The chart remounted and lost its selection and hover

The renderer component was swapped, or the provider got a new `key`. Toggle `mode` instead of swapping components. Use a new `key` only to change `theme` or `plugins`, which are read at mount.

## A command does nothing

- The target is missing: a wrong `layerId`, an axis the chart lacks, a scale that is not discrete for `SetScaleRangeCommand`.
- The value is already set, so the command creates no history entry.
- The command requires a `layerId`, but none was supplied: `SetLineStyleCommand`, `SetPointSizeCommand`, `SetBarCornerRadiusCommand`, `RemoveLayerCommand`.
- `RemoveLayerCommand` cannot remove the last layer; a chart requires at least one.
- `SetLineStyleCommand` on a bar layer. Only line and area layers have a path to dash, thicken or fill.

Replay commands with `scripts/replay-commands.mjs` to inspect their results.

## The restored chart looks unthemed

Saved specs omit the theme. Pass the same `theme` to `GraphProvider` when you restore.

## Importing `editable.css` fails

There is no such subpath on either package. Each entry includes its styles. Delete the import.

## The read-only bundle grew

Something on the page imports from `/editable`, which includes TipTap and the panel. Keep that import behind a code-split boundary on pages that only sometimes edit, and out of pages that never do.
