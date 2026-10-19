# Troubleshooting

Use this to diagnose a broken or unexpected chart, not as a routine checklist.

Contents

- The panel is blank
- The panel says "This chart could not be rendered."
- A geom is missing or draws in the wrong place
- Dates are wrong
- Colors, theme, or plugins do not apply
- The chart flickers or loses undo history
- A tooltip or label misses a field
- Compiling a spec outside the browser

## The panel is blank

- **No height:** `GraphRenderer` fills its parent. Give the parent a height or pass `sizing={{ mode: 'fixed', width, height }}`.
- **Missing position scales:** add `scale.x()` and `scale.y()` for mapped positions. A missing one compiles with no warning and the layer gets no position.
- **CDN load failure:** check the console. If the host blocks jsDelivr, use the [offline vendor steps](setup.md#when-the-cdn-is-blocked). For 404s, use the [pinned import map](setup.md#cdn-without-a-bundler); `@graphysdk/react@1` does not exist. Use jsDelivr, not esm.sh.

## The panel says "This chart could not be rendered."

Read the diagnostics in the panel, console, or `onError`. Fix the first error first. The panel can report compile errors, plugin registration errors, or render crashes; see [React error handling](react.md).

- `MISSING_AESTHETIC`: add the geom's required mapping; check its recipe.
- `UNKNOWN_VARIABLE`: map a `data.columns` key, not its label. CSV keys are generated names such as `c1`.

## A geom is missing or draws in the wrong place

- **Pie or donut:** use a [polar bar](../recipes/charts/pie.md); there is no pie geom.
- **Waterfall, funnel, boxplot, candlestick, dumbbell, lollipop:** install `@graphysdk/geom-<name>` and register it with `createGraphyKit({ plugins })`.
- **Mekko or table:** unsupported; do not build a workaround plugin.
- **Missing data labels:** bars support all coords; points, lines, and areas support cartesian and flip; tiles support cartesian; rules support none. Other combinations warn `DATA_LABELS_UNSUPPORTED`.
- **Date or numeric x on bars:** bars force a band scale, warning when replacing a continuous scale. Use points or lines for continuous x.

## Dates are wrong

- **Day/month swapped:** parsing is day-first: `'02/01/2024'` means 2 January. Use ISO strings, `Date` objects, or column `valueFormat: { type: 'date', dateFormat: 'MM/dd/yyyy' }`.
- **Dates become `null`:** the first non-empty cell determines the column's format. Use uniform dates or an explicit `dateFormat`.
- **Years confused with numbers:** set the column's `valueFormat` explicitly; see [data](data.md).
- **Wrong display locale:** set the provider's `formattingLocale`; parsing and display are separate.

## Colors, theme, or plugins do not apply

- `theme` and `plugins` are read once at mount. Remount the provider with a new `key` to change them.
- A theme's fixed `colorScheme` overrides the provider's.
- The provider's `colorScheme` picks the side of every `{ light, dark }` pair; the default is `light`. A pair in the stylesheet does nothing until it is set. On a CDN page, wire it as in [light and dark](setup.md#light-and-dark-on-a-cdn-page).
- A color scale's `range` overrides the theme. Leave color scales bare unless specific colors are required.
- Theme fonts fall back to system faces on a CDN page: the host blocks the theme's `fonts.css`. Artifact sandboxes allow stylesheets from Google Fonts only, so link the Google Fonts URL that file names; see [themes](themes.md#without-a-bundler).
- Unknown style tokens are dropped with a warning. Check [styling](styling.md).

## The chart flickers or loses undo history

A new `spec` object recompiles the chart and clears undo history after a successful compile. Build it at module scope or use `useMemo` keyed on its inputs. Keep `data` stable too: a new data object recompiles but preserves history.

## A tooltip or label misses a field

Point and bubble tooltips show x as the heading and color plus y as the row; mapped `size` and `label` are omitted. Add a row with `geom.point({ tooltip: { size: { title: 'Population' } } })`, or replace the [Tooltip slot](slots.md).

## Compiling a spec outside the browser

For an unexplained failure, including in a chart built from a demo or recipe, follow [Checking a spec](../SKILL.md#checking-a-spec). A recipe that compiles with its example data can fail with different column keys or value types; validate the failing chart's actual data and spec.

[types.md](types.md) is a generated snapshot; the installed package takes precedence.
