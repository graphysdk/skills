# Point and edit

Set `mode="point-and-edit"` on `EditableGraphRenderer` to let users click a chart element and edit it in a nearby menu. Menu edits use commands and share undo history and `onSpecChange` with the rest of the editor.

Contents: selection, menu rows, selection levels, visibility, keyboard controls, outlines, styling and custom menus.

## What a click selects

A click selects the first matching target in this order:

1. An axis tick label or axis title selects that axis.
2. A legend pill selects the legend. Pills in the overflow popover count too.
3. A bar, a point, a line or an area selects its group: every bar of one color, or one whole line. On a layer with no groups it selects the one observation.
4. A click in the gap beside a bar selects its band, every bar at that x value. Bands exist on a discrete or date x axis.
5. A grid line selects the grid lines of that axis.
6. The empty background selects the chart.
7. A click outside the frame clears the selection.

A double-click narrows the selection. On a bar, it selects that observation. On a discrete x-axis tick label, it selects that band if a layer has a row there. On a legend pill, it selects that group. One point of a line has no menu, so a double click on a line does nothing.

Only targets with editing controls can be selected. A line's single point, a heatmap tile, a layer colored by a number, a band of stacked bars, a rule layer and geoms from geom packages have no menu, so they are not hovered or selected. A polar chart's axis and grid lines have only the visibility button, which is enough to select them. The cursor becomes a pointer over selectable targets.

Selection is one target at a time. Clicking a different chart on the page clears this one.

## The menu

The menu opens beside the selection, on the right if there is room, then left, below or above. It stays open while something is selected. A click on another target moves it there. Escape, a click outside the frame, or a click on the background when the Chart menu has no rows clears the selection and the menu with it.

From top to bottom:

- A title: Observation, Band, Group, Axis, Legend, Grid lines or Chart.
- A visibility button for axes, the legend and grid lines. See "The visibility button".
- The level selector, on observations that can move between levels. See "Levels".
- The rows below.

Controls in the rows come from the control registry, so a `ControlRegistryProvider` around the chart restyles them. The title, the visibility button and the level selector are Graphy's own.

## Rows per target

Every row names the command it dispatches. Exact params are in [types](types.md).

### Bar and point groups

| Row        | Control                                                                                                    | Command                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Fill color | Six palette chips, the current color if it is not one of them, and a custom color chip that opens a picker | `SetObservationsColorCommand({ target, color })` |

The row requires an editable color. A layer is not selectable if its color encodes a number or its geom has no fill or stroke of its own.

The chips are the chart's palette. A chip click is one undo step. A picker drag streams and commits when the picker closes. The target is the selection, so a group, a band and one observation each write their own style rule. A band of stacked bars has no color row, since recoloring it would recolor every group.

### Line and area groups

| Row                                         | Control                 | Shown when                            | Command                                                |
| ------------------------------------------- | ----------------------- | ------------------------------------- | ------------------------------------------------------ |
| Line color on a line, Fill color on an area | Same as above           | always                                | `SetObservationsColorCommand`                          |
| Point size                                  | Slider, 1 to 20 px      | the line shows points                 | `SetPointSizeCommand({ layerId, size, where })`        |
| Fill under line                             | Switch                  | line, not polar                       | `SetLineStyleCommand({ layerId, showFill, where })`    |
| Line thickness                              | Three thickness presets | always                                | `SetLineStyleCommand({ layerId, strokeWidth, where })` |
| Line style                                  | Solid, Dashed, Dotted   | the selection has a line or area path | `SetLineStyleCommand({ layerId, lineStyle, where })`   |

These rows are available only for groups. One point of a line and a band of a line have no menu. Curve, show points and missing values apply to every line at once, so they sit in the Chart menu.

### Axis

Rows apply to a cartesian axis. On a polar chart the axis has only the visibility button.

| Row        | Control                                    | Shown when                                                         | Command                                                                                  |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Title      | Text field                                 | always                                                             | `SetAxisLabelCommand({ axis, label })`                                                   |
| Labels     | Auto, or Edges for the first and last only | continuous or date scale                                           | `SetAxisTickModeCommand({ axis, tickMode: 'auto' \| 'edges', keepSecondaryAxis: true })` |
| Position   | Left, Right                                | vertical axis with a continuous scale and no legend on either side | `SetAxisPositionCommand({ axis: 'y', position })`. The second axis takes the other side. |
| Scale      | Auto, Log                                  | vertical continuous axis that need not hold zero                   | `SetScaleTransformCommand({ scaledAesthetic, transform })`                               |
| Start from | Number field, empty means the data         | as Scale, and not log                                              | `SetScaleDomainCommand({ scaledAesthetic, domainMin })`                                  |
| End at     | Number field, empty means the data         | vertical continuous axis, not log                                  | `SetScaleDomainCommand({ scaledAesthetic, domainMax })`                                  |

Typing in Title updates the chart immediately and creates one undo step when the field commits. Clearing it restores the mapping's title. A second vertical axis has its own menu with the same rows. Rows are disabled while the axis is hidden.

### Grid lines

| Row            | Control                          | Command                                          |
| -------------- | -------------------------------- | ------------------------------------------------ |
| Grid style     | Solid, Dashed, Dotted            | `SetGridLineStyleCommand({ axis, lineStyle })`   |
| Grid thickness | Thin, Medium, Thick (1, 2, 4 px) | `SetGridLineStyleCommand({ axis, strokeWidth })` |

The rows apply to the direction clicked. There is no zero width. Hide the lines with the visibility button. Polar grids have only the visibility button.

### Legend

| Row      | Control                                        | Command                                          |
| -------- | ---------------------------------------------- | ------------------------------------------------ |
| Position | A 3 by 3 grid of eight places around the chart | `SetLegendPlacementCommand({ position, align })` |

Arrow keys move through positions clockwise. A held key is one undo step. The grid is disabled while the legend is hidden.

### Chart

Each row appears when at least one layer supports it. A switch is on if the setting is enabled on any layer. Clicking turns it off for all layers, or on for all if none had it enabled.

| Row              | Control                                                                                                                                     | Command                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Data labels      | Switch                                                                                                                                      | `ToggleDataLabelsCommand` per layer, as one `SequenceCommand` |
| Show percentages | Switch, while data labels are on                                                                                                            | `SetDataLabelsFormatCommand`                                  |
| Stack totals     | Switch, stacked bars                                                                                                                        | `ToggleStackTotalsCommand`                                    |
| Category labels  | Switch, pie and donut with data labels on                                                                                                   | `ToggleCategoryLabelsCommand`                                 |
| Show points      | Switch, lines and areas                                                                                                                     | `ToggleLinePointsCommand`                                     |
| Smooth lines     | Switch, lines and areas                                                                                                                     | `SetLineCurveCommand({ layerId, curve })`                     |
| Missing values   | Select: Leave gap in chart, Fill with zero, Connect across gaps. Areas omit Leave gap; stacks omit Connect. Shown with two or more options. | `SetLineMissingValuesCommand`                                 |
| Palette          | Theme, then one option per preset                                                                                                           | `SetScaleRangeCommand({ scaledAesthetic: 'color', range })`   |

The Palette row needs `palettePresets` on `EditableGraphRenderer`:

```tsx
<EditableGraphRenderer
  mode="point-and-edit"
  palettePresets={{ Warm: ['#E03030', '#E08A30', '#E0C030'], Cool: ['#2060E0', '#30A0E0', '#30D0C0'] }}
/>
```

The Theme option writes `range: null` to restore the theme's colors. The row is hidden without presets, and on a chart whose color scale is not discrete, such as a heatmap. The Chart menu itself opens only when a layer supports data labels or a line or area is drawn. The chart type is not in this menu. Change it with `SetChartTypeCommand` or the panel's `GraphTypeSection`.

## Levels

Clicking a bar selects its group. The level selector under the title moves the selection between the one bar, its band and its group without clicking again. Each option is an icon with a name in a tooltip: This bar, This slice, This bubble or This point; All of Q4; All of North.

Only levels that select something different are offered. A bar alone in its group offers no band. A pie slice offers nothing. A band on a date axis is not offered yet. A level with no rows is left out. With one level there is no selector. A selection set through `setSelection` has no clicked observation, so it has no level selector.

Use `readReachableLevels` from `@graphysdk/react/editable` to build a custom level selector.

## The visibility button

Axes, the legend and grid lines have a visibility button in the menu title. Clicking it hides the target and leaves the menu open with settings disabled. Clicking again restores the target, including its previous position. Each click creates one undo entry. After the menu closes, use undo to restore the previous state. A legend already hidden when selected is restored at `auto`.

| Target     | Hide                                                                          | Show                                             |
| ---------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| Legend     | `SetLegendPositionCommand({ position: 'none' })`                              | `SetLegendPositionCommand` with the old position |
| Axis       | `SetAxisVisibilityCommand({ axis, visible: false, keepSecondaryAxis: true })` | the same with `true`                             |
| Grid lines | `SetGridVisibilityCommand({ axis, visible: false })`                          | the value it had, else `true`                    |

Hiding one vertical axis leaves the other alone. The panel's y axis section hides both.

## Keyboard

- Escape with focus in the menu clears the selection and the menu at once. Elsewhere in the chart it steps back one level: cancels a drag or popup first, then moves focus back to the chart, then clears the selection.
- Tab moves through the menu's controls. While something is selected and the chart has controls of its own on screen, Tab cycles them instead of leaving the chart.
- Arrow keys move the choice in the legend grid and the palette row. A held key commits on key up as one undo step.
- Undo and redo are the host's job. Bind them with `useGraphHistoryShortcuts(handleRef)`.
- Delete and Backspace do nothing in point and edit. They remove annotations in editable mode only.

## The outline

Hovered and selected targets have dashed outlines in the chart's text color. The hover outline is fainter. It follows the geom's shape: a bar's rectangle, a line's path, a point's circle, a grid line's stroke, an inset frame for the chart.

Style it through the stylesheet as `style.editOutline`, with `hover` and `selected` parts: `stroke`, `strokeWidth`, `strokeAlpha`, `dashArray`, `offset`, `cornerRadius`, `haloColor` and `haloAlpha`. The defaults are the text color, 1.5 px, `[3.5, 2.5]`, an offset of 3 px, and the chart background behind the dashes. Set `dashArray: []` for a solid outline and `haloAlpha: 0` to drop the backing.

## Restyling the menu

The menu and panel share styles and follow the chart's `colorScheme`. The chart's stylesheet does not style the menu.

Set these CSS variables on `:root` to restyle the panel and the menu together: `--graphy-editor-accent`, `--graphy-editor-surface`, `--graphy-editor-text`, `--graphy-editor-border`, `--graphy-editor-font-family`, `--graphy-editor-padding-x`, `--graphy-editor-padding-y`.

Restyle the menu alone with `--graphy-editor-menu-background`, `-text`, `-border`, `-radius`, `-shadow`, `-padding`, `-min-width`, `-max-width` and `-title-font`. Tooltips read `--graphy-editor-tooltip-background`, `-text`, `-font` and `-radius`.

Every popup carries `data-graphy-color-scheme="light"` or `"dark"`, so one rule per scheme keeps a dark chart's menu dark:

```css
:root {
  --graphy-editor-accent: #0f62fe;
  --graphy-editor-font-family: 'Inter', sans-serif;
}
[data-graphy-color-scheme='dark'] {
  --graphy-editor-menu-background: #1c1c1e;
}
```

Swap the controls inside the rows with a `ControlRegistryProvider` from `@graphysdk/react/editable` around the chart. See [panel](panel.md) for the control contracts.

## Placing your own menu

`useTargetBoundary()` from `@graphysdk/react`, inside the provider, returns the box around the selection or `null`. `client` uses viewport coordinates; `frame` uses chart coordinates. `clientSpans` and `frameSpans` describe the selected range along each side, so menus can align with that part of the selection.

```tsx
import { useTargetBoundary } from '@graphysdk/react';

const MyMenu = () => {
  const boundary = useTargetBoundary();
  if (boundary === null) return null;
  const left = boundary.client.x + boundary.client.width + 8;
  return <div style={{ position: 'fixed', left, top: boundary.clientSpans.right.from }}>…</div>;
};
```

Read the selection with `useGraphSelection()` and dispatch with `useGraphCommands()`. The built-in menu also opens unless you replace it as described below.

## Replacing a menu

`editMenus` on `EditableGraphRenderer` registers your own edit menus. Custom menus take precedence over built-in menus. An entry set to `null` removes that menu, so the target is no longer selectable, and a missing entry leaves Graphy's in place.

```tsx
import type { EditMenus, ObservationsTarget } from '@graphysdk/react/editable';
import { EditableGraphRenderer, Row, SetObservationsColorCommand, useControls } from '@graphysdk/react/editable';
import { useGraphCommands } from '@graphysdk/react';

// Drawn under the menu title. It runs inside the chart's provider, so the hooks reach the chart.
const BrandBarsMenu = ({ target }: { target: ObservationsTarget }) => {
  const { dispatch } = useGraphCommands();
  const { ToggleGroup } = useControls();
  return (
    <Row label="Brand color">
      <ToggleGroup
        value=""
        options={[
          { value: '#0f62fe', label: 'Blue' },
          { value: '#da1e28', label: 'Red' },
        ]}
        onChange={(color) => dispatch(new SetObservationsColorCommand({ target, color }))}
      />
    </Row>
  );
};
// Optional: say when the menu has rows, so a target with none is not selectable.
BrandBarsMenu.hasRows = (target: ObservationsTarget) => target.scope === 'series';

const editMenus: EditMenus = {
  geoms: { bar: BrandBarsMenu, point: null },
  legend: null,
};

<EditableGraphRenderer mode="point-and-edit" editMenus={editMenus} />;
```

- `geoms` is keyed by geom name, a built-in or a custom one, and applies to every rendering of that geom. `layers` is keyed by geom, then the chart's coord, then the layer's position, so menus can vary by chart type, such as pie slices and columns.
- `legend`, `axis`, `grid` and `graph` take a component with a `target` prop of that kind.
- Lookup for observations: your `layers` entry, your `geoms` entry, Graphy's `layers` entry, Graphy's `geoms` entry. The first matching entry is used. Companion layers, such as points added to a line, use their host layer for lookup.
- Custom menus replace settings rows. The menu title, visibility button and level selector remain built in.

Define the components outside render. A new object per render remounts the menu.

Custom `AxisTicks`, `AxisLabel`, `Legend` and `Grid` slots join point and edit by stamping what they draw, from `@graphysdk/react`: `stampAxisEditTarget(axis, tickIndex?)` on a tick label or, without an index, the title; `stampLegendEditTarget({ legendIndex, itemIndex })` on a pill; `stampGridEditTarget(axis)` on the group holding one grid line. Spread the stamp and give the element a hit area only while `useGuidesTakePress()` returns true, as the built-in renderers do. Without the stamp a click on the slot's element selects the chart.
