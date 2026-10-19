# From a request to a command

Use these commands for common editing requests. Import them from `@graphysdk/react/editable`; see [types](types.md) for parameters. The last column lists UI controls for the same edit.

Inspect the chart before choosing a command. `readChartType(scene.spec)` returns its type. `scene.spec.layers` gives the layer ids and geoms. `scene.spec.mapping` gives the mapped columns. `readMappableAesthetics(scene.spec, ['x', 'y', 'color', 'size', 'label'])` says which columns each aesthetic accepts. A command that targets a missing layer or sets the current value does nothing, so check the target and current value before dispatching.

Before writing code, replay the commands with `scripts/replay-commands.mjs`. See the end of this file.

## The chart

| Request                                        | Command                                                                                                              | Also                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Make it a line chart, a donut, stacked bars    | `SetChartTypeCommand({ coordType, geom, position })` or `{ coordType: 'polar', geom, position, theta, innerRadius }` | panel `GraphTypeSection`                 |
| Make it a combo, bars plus a line              | `SetChartTypeCommand({ coordType: 'cartesian', comboType: 'grouped-bars' })`, when `canBecomeCombo(spec)`            | panel `GraphTypeSection`, `ComboSection` |
| Make it a heatmap                              | `SetChartTypeCommand({ coordType: 'cartesian', geom: 'tile', position: 'identity' })`, when `canBecomeHeatmap(spec)` | panel `GraphTypeSection`                 |
| Plot revenue instead of sales, color by region | `SetMappingCommand({ aesthetic: 'y', variable: 'revenue' })`, `null` to unmap                                        | panel `MappingSection`                   |
| Make the donut hole bigger, rotate the pie     | `SetPolarInnerRadiusCommand({ innerRadius })`, `SetPolarStartAngleCommand({ startAngle })`                           | panel `PolarSection`                     |
| Use my palette                                 | `SetScaleRangeCommand({ scaledAesthetic: 'color', range: [...] })`, `null` for the theme's                           | menu Chart with `palettePresets`         |
| Bigger text everywhere                         | `SetStyleRuleCommand({ list: 'overrides', rule: style.graph({ ...current, textScale: 1.2 }) })`, see the note below  | panel `TextSizeSection`                  |
| Rounded chart frame                            | `SetStyleRuleCommand` with `style.graph({ ...current, cornerRadius })`, see the note below                           | panel `AppearanceSection`                |

`SetStyleRuleCommand` replaces the whole entry at its `select` and `when` address. The text scale and corner radius rows above write the same `style.graph` entry. Read its current declarations from `scene.spec.styles` and include them with the new value. Sending only the changed value removes the other declarations.

## Titles and text

| Request                             | Command                                                                                                                                   | Also                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Change the title, subtitle, caption | `SetContentTitleCommand({ title })`, `SetContentSubtitleCommand`, `SetContentCaptionCommand`, `null` clears                               | panel sections, inline in editable mode |
| Add a source line                   | `SetContentSourceCommand({ source: { label, url } })`                                                                                     | panel `SourceSection`                   |
| Hide the title                      | `ToggleContentVisibilityCommand({ part: 'title', isVisible: false })`                                                                     | panel `TitleSection`                    |
| Show the total above the chart      | `SetHeadlineShowCommand({ show: 'total' })`, then `SetHeadlineSizeCommand`, `SetHeadlinePositionCommand`, `SetHeadlineCompareWithCommand` | panel `HeadlineSection`                 |
| One decimal, thousands as k         | `SetNumberFormatDecimalsCommand({ decimals: 1 })`, `SetNumberFormatAbbreviationCommand({ abbreviation: 'k' })`                            | panel `NumberFormatSection`             |

## Bars, lines and points

Assign layer IDs when authoring so commands can target the correct layer. `layerId` is required on `SetLineStyleCommand`, `SetPointSizeCommand`, `SetBarCornerRadiusCommand` and `RemoveLayerCommand`.

| Request                                     | Command                                                                                                                                                                                     | Also                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Make the bars blue, the EU line red         | `SetObservationsColorCommand({ target, color })` with an `observations` target from `buildObservationsTarget`                                                                               | menu color row                            |
| Color one layer                             | `SetStyleRuleCommand({ list: 'overrides', rule: style.geom({ fill: '#0f62fe' }, { layer: 'bars' }) })`                                                                                      |                                           |
| Thinner bars, rounded bars                  | `SetBarWidthCommand({ layerId, width })`, `SetBarCornerRadiusCommand({ layerId, cornerRadius })`                                                                                            | panel `BarSection`                        |
| Stack the bars, put them side by side       | `SetLayerPositionCommand({ layerId, position: 'stack' \| 'dodge' })`                                                                                                                        | panel `GraphTypeSection`, as a chart type |
| Thicker line, smooth line, dashed line      | `SetLineStyleCommand({ layerId, strokeWidth: 3 })`, `SetLineCurveCommand({ layerId, curve: 'smooth' })`, `SetLineStyleCommand({ layerId, lineStyle: 'dashed' })`; add `where` for one group | menu line rows, panel `LineSection`       |
| Show points on the line, fill under it      | `ToggleLinePointsCommand({ layerId, showPoints: true })`, `SetLineStyleCommand({ layerId, showFill: true })`                                                                                | menu, panel `LineSection`                 |
| Break the line at missing months            | `SetLineMissingValuesCommand({ layerId, missingValues: 'gap' })`                                                                                                                            | menu Chart, panel `LineSection`           |
| Bigger dots                                 | `SetPointSizeCommand({ layerId, size })`                                                                                                                                                    | panel `PointSection`, menu line rows      |
| Show the values on the bars, as percentages | `ToggleDataLabelsCommand({ layerId, showDataLabels: true })`, `SetDataLabelsFormatCommand({ layerId, format: 'percentage' })`                                                               | menu Chart, panel `GraphOptionsSection`   |
| Show stack totals, label the pie slices     | `ToggleStackTotalsCommand`, `ToggleCategoryLabelsCommand`                                                                                                                                   | menu Chart, panel `GraphOptionsSection`   |
| Add a trend line, an average line           | `SetStatLineCommand({ line: 'trend', method: 'linear' })`, `{ line: 'average' }`, `{ line: 'none' }` removes                                                                                | panel `TrendsAndAveragesSection`          |
| Add a goal line at 2000                     | `ToggleGoalLineCommand({ showGoalLine: true, value: 2000, label: 'Goal' })`, then `SetRuleValueCommand`, `SetRuleLabelCommand`                                                              | panel `GoalSection`                       |
| Add a second series on its own axis         | `AddLayerCommand({ layer })` with `yScaleType: 'secondary'`, see [commands](commands.md)                                                                                                    |                                           |
| Put this series on the right axis           | `SetLayerYScaleTypeCommand({ layerId, yScaleType: 'secondary' })`                                                                                                                           | panel `AxisSection`                       |
| Remove a layer                              | `RemoveLayerCommand({ layerId })`                                                                                                                                                           |                                           |
| Highlight Q4, dim the rest                  | `AddHighlightCommand({ predicate: { variable: 'quarter', eq: 'Q4' }, scope: 'x-value' })`, `SetHighlightDimStyleCommand({ dimStyle })`                                                      | (+) menu in editable mode                 |

## Axes, grid, legend

| Request                                    | Command                                                                                                                                                                                    | Also                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Rename the axis                            | `SetAxisLabelCommand({ axis: 'y', label })`                                                                                                                                                | menu axis, panel `AxisSection`              |
| Start the axis at zero, end at 5000        | `SetScaleDomainCommand({ scaledAesthetic: 'y', domainMin: 0 })`, `{ domainMax: 5000 }`                                                                                                     | menu axis, panel `AxisSection`              |
| Log scale                                  | `SetScaleTransformCommand({ scaledAesthetic: 'y', transform: 'log' })`                                                                                                                     | menu axis, panel `AxisSection`              |
| Reverse the axis                           | `SetScaleReverseCommand({ scaledAesthetic: 'y', reverse: true })`                                                                                                                          | panel `AxisSection`                         |
| Axis on the right                          | `SetAxisPositionCommand({ axis: 'y', position: 'right' })`                                                                                                                                 | menu axis, panel `AxisSection`              |
| Only the first and last labels             | `SetAxisTickModeCommand({ axis: 'x', tickMode: 'edges' })`                                                                                                                                 | menu axis, panel `AxisSection`              |
| Hide the axis, hide the ticks              | `SetAxisVisibilityCommand({ axis, isVisible: false })`, `SetAxisTicksVisibilityCommand`                                                                                                    | menu visibility button, panel `AxisSection` |
| Hide the grid, dotted grid, thicker grid   | `SetGridVisibilityCommand({ axis: 'y', isVisible: false })`, `SetGridLineStyleCommand({ axis: 'both', lineStyle: 'dotted' })`, `SetGridLineStyleCommand({ axis: 'both', strokeWidth: 2 })` | menu grid, panel `GridSection`              |
| Legend at the bottom, on the right, hidden | `SetLegendPositionCommand({ position: 'bottom' })`, `'none'` hides; `SetLegendPlacementCommand({ position, align })` for a corner                                                          | menu legend, panel `LegendSection`          |
| Labels on the lines instead of a legend    | `SetLegendDisplayCommand({ display: 'direct' })`                                                                                                                                           | panel `LegendSection`                       |

## Annotations

| Request                                          | Command                                                                                                            | Also                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Add a note, an arrow, a box                      | `AddAnnotationCommand({ kind, annotation })` with the kind's defaults spread in, see [annotations](annotations.md) | panel `CalloutsSection`, editable mode |
| Pin the value, add a comment or sticker to a bar | `AddAnnotationCommand` with an observation anchor from `createObservationAnchorBuilder(layer)`                     | (+) menu in editable mode              |
| Move it, resize it, restyle it                   | `MoveAnnotationCommand`, `UpdateAnnotationCommand`, `SetStyleRuleCommand` with `style.annotation.*`                | drags and toolbars in editable mode    |
| Remove it                                        | `RemoveAnnotationCommand({ id })`                                                                                  | Delete in editable mode                |

## Several edits as one

Wrap commands in `SequenceCommand({ commands })` to undo them together. Pass `{ author }` as the second constructor argument to record the author in history.

## When no command fits

Build a new `Spec` with the authoring API from the graphy-charts skill and pass it as `spec`. That clears the history, so use a command when one exists.

## Validate commands by replaying them

`scripts/replay-commands.mjs` applies serialized commands through the same session as `GraphProvider`, without a browser or theme. It reports applied commands, no-ops and rejections with compile errors. It also merges transient changes and prints the final spec in the format used by `onSpecChange`.

```bash
node <path to this skill>/scripts/replay-commands.mjs ./chart.mjs ./commands.json --out ./final-spec.json
```

`chart.mjs` exports `data` and `spec`, built with the builders from `@graphysdk/react` or `@graphysdk/viz-engine`. `commands.json` is a list of `{ type, params }` objects as `commandRegistry.serialize` writes them, `metadata` optional, with `"transient": true` for a streamed step and the strings `"commit"`, `"undo"` and `"redo"` for those steps:

```json
[
  { "type": "set-content-title", "params": { "title": "Sales by quarter" } },
  { "type": "set-bar-width", "params": { "width": 0.5 }, "transient": true },
  "commit",
  { "type": "set-layer-position", "params": { "layerId": "bars", "position": "stack" } }
]
```

Run it from a folder where `@graphysdk/viz-engine` resolves, such as the project root when the package is a direct dependency, or a scratch folder with the exact version installed, as the graphy-charts skill's validate script explains. The exit code is 1 when a command was rejected or unknown, or the chart did not compile. No-ops exit 0. A themed chart's final spec can differ from `onSpecChange`'s, which leaves out what the theme supplies.
