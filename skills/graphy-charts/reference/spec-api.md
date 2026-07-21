# Spec builder API reference

All builders import from `@graphysdk/viz-engine`. Verified against `packages/viz-engine/src/spec/`.

## Composition model: `createSpec` + `pipe`

A spec is built by folding **spec items** onto an immutable seed, left to right:

```ts
import { createSpec, pipe, mapping, geom, scale, coord, config } from '@graphysdk/viz-engine';

const input = pipe(
  createSpec({ x: 'month', y: 'revenue', color: 'region' }), // first arg may be a bare mapping
  geom.bar(),
  scale.x(),
  scale.y(),
  config({ legend: { position: 'top' } })
);
```

`createSpec(...items)` also accepts items directly (`createSpec(transform.reshape(...), mapping(...), geom.bar(), ...)`) — useful when a transform must run before the mapping reads its output columns. Every item carries a `type` discriminant; folding rules (`spec/spec.ts`):

| Item | Fold behavior |
|---|---|
| `geom.*` (layer) | appends — one layer per call |
| `scale.*` | appends; duplicate scales for the same aesthetic — last wins |
| `transform.*` | appends, applied in order |
| `mapping(...)` | shallow-merges into the global mapping |
| `config(...)` | deep-merges |
| `coord.*` | overwrites (one coord per spec) |
| `highlight(...)`, `annotation.*` | append (see `reference/storytelling.md`) |

## `mapping()` — aesthetics

`mapping(aes)` sets/merges the global aesthetic mapping. Built-in channels (`spec/mapping/mapping.ts`):

| Aesthetic | Drives |
|---|---|
| `x`, `y` | position |
| `label` | data-label text source |
| `color` | fill/stroke color |
| `size` | mark size (point diameter) |
| `alpha` | opacity 0–1 |
| `group` | series splitting only — no visual channel |
| `strokeWidth` | stroke width |
| `lineType` | dash pattern (solid/dashed/dotted) |

Plugin geoms may declare extra positional channels (e.g. `open`/`high`/`low`/`close`); they scale like built-ins.

Each value is an `AestheticValue`, one of three forms:

```ts
mapping({
  x: 'month',                 // string shorthand for { variable: 'month' }
  y: { variable: 'revenue' }, // explicit column reference
  color: { value: '#e64' },   // constant applied to every observation
});
```

**Merge**: the global mapping applies to every layer; a layer's `aes` option shallow-merges over it per aesthetic (`geom.line({ aes: { y: 'forecast' } })` keeps the global `x`).

**Implicit grouping** (`utils/group.utils.ts`): if `group` is mapped, it is the sole group variable. Otherwise observations group by each unique combination of **categorical visual** aesthetics (color, size, alpha, strokeWidth, lineType). Positional aesthetics never split series, and a visual aesthetic bound to the same variable as `x`/`y` is ignored for grouping. Map `group` explicitly to split lines/areas without assigning a visual channel.

## `geom` — layers

Each `geom.<name>(options)` produces one layer. Common options (all optional, `spec/layer/layer.ts`):

| Option | Type | Default | Effect |
|---|---|---|---|
| `id` | `string` | auto UUID | stable layer identifier |
| `aes` | `AesMapping` | `{}` | layer-local mapping, merged over global |
| `stat` | `StatName \| StatInput` | `'identity'` | per-layer statistical transform |
| `position` | `'identity' \| 'stack' \| 'dodge' \| 'fill'` | per geom (below) | overlap arrangement; `fill` normalizes stacks to 100% |
| `yScaleType` | `'primary' \| 'secondary'` | `'primary'` | binds the layer to the secondary y axis |
| `params` | per geom | below | geom-specific rendering knobs |
| `transforms` | `TransformInput[]` | `[]` | layer-only data transforms, applied after spec-level ones |
| `interactive` | `boolean` | `true` (`false` for rule) | include in hover hit-detection |
| `dataLabels` | `DataLabelsInput` | all off | see below |

### Geom params and defaults (`spec/layer/layer.defaults.ts`)

**`geom.point()`** — default position `'identity'`.

| Param | Default | Effect |
|---|---|---|
| `size` | `8` | marker diameter in px (overridden per observation when `size` is mapped) |

**`geom.line()`** — default position `'identity'`.

| Param | Default | Effect |
|---|---|---|
| `lineWidth` | `'auto'` | px, or `'auto'` to read the mapped `strokeWidth` value |
| `interpolate` | `'linear'` | `'linear'` or `'catmull-rom'` (smooth spline) |
| `missingValues` | `'gap'` | `'zero'` (substitute 0), `'gap'` (break path), `'connect'` (span nulls) |
| `showFill` | `false` | gradient fill from the line down to the baseline |

**`geom.area()`** — default position `'stack'`. Same `lineWidth` / `interpolate` as line; `missingValues` defaults to `'zero'`.

**`geom.bar()`** — default position `'dodge'`. Bars render as pie wedges under `coord.polar`.

| Param | Default | Effect |
|---|---|---|
| `width` | `0.7` | bar width as a fraction `(0, 1]` of the category band |
| `borderRadius` | `'auto'` | corner rounding in px, or `'full'` for pill bars |
| `borderColor` | unset | border drawn only when set |
| `borderWidth` | `1` | px, only with `borderColor` |

**`geom.rule()`** — a single reference line; default position `'identity'`, `interactive: false`. Horizontal when the layer maps `y` (usually a constant: `aes: { y: { value: 100 } }`), vertical when it maps `x`; orientation flips with `coord.flip()`.

| Param | Default | Effect |
|---|---|---|
| `color` | theme token | stroke color |
| `strokeWidth` | `1` | px |
| `lineType` | `'dashed'` | `'solid' \| 'dashed' \| 'dotted'` |
| `label` | unset | inline text along the line |
| `labelPosition` | `'start'` | `'start' \| 'end'` |

```ts
geom.rule({ aes: { y: { value: 1500 } }, params: { label: 'Target', lineType: 'dotted' } });
```

### `dataLabels` (`DataLabelsConfig`)

| Key | Default | Effect |
|---|---|---|
| `showDataLabels` | `false` | show value labels on the layer |
| `format` | `'absolute'` (`'percentage'` for polar bars) | `'absolute'` or `'percentage'` |
| `showStackTotals` | `false` | totals at stack ends (stacked/filled bars) |
| `showCategoryLabels` | `false` | polar bars: prepend category ("Europe · 35%"); cartesian bars: second label per observation placed by the `category*` fields |
| `position` | `'auto'` | `'auto' \| 'inside' \| 'outside'`; only `'auto'` may drop/flip/rotate |
| `justify` | `'end'` (`'center'` for stacked/filled bars) | value-axis anchor: `'start' \| 'center' \| 'end' \| 'panel-start' \| 'panel-end'`; only consulted with explicit `position` |
| `align` | `'center'` | cross-axis anchor: `'start' \| 'center' \| 'end'` |
| `offset` | `4` (bars/wedges/points), `8` (line/area) | gap in px from geom edge |
| `categoryPosition` | `'inside'` | `'inside' \| 'outside'` for the cartesian category label |
| `categoryJustify` | `'start'` | as `justify`, incl. panel anchors |
| `categoryAlign` | `'center'` | cross-axis anchor |
| `categoryOffset` | `4` | px |

Label text comes from `mapping.label` when set, otherwise the layer's y value (segment magnitude for stacked positions).

## `scale`

Add `scale.x()` / `scale.y()` for every mapped positional aesthetic — **positional scales are never auto-added**; omitting them yields NaN positions. Two scales are auto-injected when omitted (`compiler/spec/resolver/scale.resolver.ts:189-190, 296-315`): a default **color palette scale**, and an inferred **ySecondary scale** when any layer sets `yScaleType: 'secondary'`.

Method sets per aesthetic (`spec/scales/scales.ts`):

| Aesthetic | Callable bare (inferred) | Methods |
|---|---|---|
| `x`, `y`, `ySecondary` | yes — `scale.x()` | `.continuous()`, `.discrete()`, `.datetime()`, `.log()`, `.sqrt()` |
| `color` | no | `.continuous()`, `.discrete()`, `.palette()` |
| `size`, `alpha`, `strokeWidth` | no | `.continuous()`, `.discrete()`, `.identity()` |
| `lineType` | no | `.discrete()`, `.identity()` (discrete-only; numeric variable errors) |

**Inference** (bare call, options forwarded to the resolved type): numeric → continuous, categorical → discrete, temporal → datetime (position) / continuous (elsewhere); `{ value }` constant mappings, unmapped aesthetics, and unknown variables → continuous. Bar layers force a discrete x band scale and a zero-anchored y regardless of inference.

Options per scale type:

| Scale type | Option | Default | Effect |
|---|---|---|---|
| continuous | `transform` | `'linear'` | `'linear' \| 'log' \| 'sqrt'` (`.log()`/`.sqrt()` are shorthands) |
| | `reverse` | `false` | flip direction |
| | `nice` | `true` | round domain to nice values |
| | `zero` | `false` | include 0 in the domain (bar layers force it on y) |
| | `clamp` | `false` position, `true` non-position | pin out-of-domain values to the range |
| | `domainMin` / `domainMax` | data | override one bound |
| | `range` | size `[4, 20]`, alpha `[0.1, 1]`, strokeWidth `[1, 4]` | output range, non-positional only |
| discrete | `domain` | data order | explicit category order and membership |
| | `range` | palette/bands | explicit output values, in domain order |
| | `padding` | `0.1` | band gap fraction (0 forced under polar) |
| | `reverse` | `false` | flip band order |
| datetime | `domainMin` / `domainMax` | data | epoch milliseconds |
| | `nice` | `false` | rounding temporal bounds is surprising, so off by default |
| | `reverse` / `clamp` | `false` | as continuous |
| palette | `palette` | `{ type: 'default' }` | `{ type: 'graphy' \| 'pastel' }`, `{ type: 'neon', base }`, `{ type: 'mono', base }`, `{ type: 'custom', id }`; graphy/pastel/neon accept `variant: 'waterfall'`, mono `variant: 'light' \| 'dark'`; neon/mono bases are hue names (`'cyan'`, `'blue'`, ...) |
| | `overrides` | none | `{ [groupNumber]: { hex?, id? } }` per-series color overrides (1-indexed); `id` looks up a color in the active custom palette, `hex` wins if both set |
| identity | — | — | data values pass through as visual values (`scale.size.identity()`: `{ size: 10 }` → 10 px) |

`size.continuous` defaults `transform: 'sqrt'` so value maps to mark **area**, not radius.

```ts
scale.y.continuous({ zero: true, domainMax: 100 });
scale.color.palette({ palette: { type: 'neon', base: 'cyan' } });
scale.lineType.discrete({ domain: ['actual', 'forecast'], range: ['solid', 'dashed'] });
```

## `coord`

One per spec; default is cartesian. All take optional `xLimits` / `yLimits` (`[min, max] | null`, default `null`).

| Builder | Extra params (default) | Yields |
|---|---|---|
| `coord.cartesian()` | — | standard x/y |
| `coord.flip()` | — | swapped axes — horizontal bars, long category labels |
| `coord.polar()` | `theta: 'x' \| 'y'` (`'x'`), `startAngle` degrees (`0`), `innerRadius` 0–1 (`0`) | angle + radius |

Compositions: pie = `geom.bar({ position: 'fill' })` + `coord.polar({ theta: 'y' })`; donut adds `innerRadius: 0.5`; radar = `geom.line()`/`geom.area()` + `coord.polar({ theta: 'x' })`.

## `stat`

A stat reshapes **one layer's** data after transforms run. Pass to a layer: `geom.line({ stat: stat.smooth({ method: 'linear' }) })` (string shorthands `'identity' | 'count' | 'mean' | 'smooth'` also work; bare `'smooth'` defaults to `method: 'linear'`).

| Builder | Effect |
|---|---|
| `stat.identity()` | pass-through (default) |
| `stat.count()` | one observation per x value (and series group) with the row count as y — requires a mapped `x`; errors if `y` is also mapped |
| `stat.mean()` | reduces the layer to a **single observation** holding the mean of y (no grouping) — pair with `geom.rule` for an average line; a layer that still maps `x` (line/bar) fails to compile |
| `stat.smooth({ method, order?, bandwidth? })` | regression curve — trendlines |

`smooth` methods: `'linear' | 'loess' | 'exponential' | 'logarithmic' | 'quadratic' | 'power' | 'polynomial'`. `order` applies to `'polynomial'` only (default `3`); `bandwidth` to `'loess'` only (default `0.3`).

## `transform`

Transforms rewrite the dataset **before** mapping and stats read it. Spec-level transforms (piped items) feed every layer; a layer's `transforms` option applies extra ones to that layer only. Use a transform to change the table shape; use a stat to compute a per-layer summary of the mapped values.

| Builder | Example |
|---|---|
| `transform.reshape(options?)` — wide→long: collapse numeric columns into key/value rows | `transform.reshape({ reshape: ['revenue', 'cost'], keyName: 'metric', valueName: 'amount' })` then `mapping({ x: 'month', y: 'amount', color: 'metric' })`. Defaults: all numeric columns, `keyName: 'key'`, `valueName: 'value'`; `keep` carries columns through |
| `transform.filter({ variableName, operator, value })` — keep matching rows | `transform.filter({ variableName: 'region', operator: 'eq', value: 'EU' })`; operators `'eq' \| 'neq' \| 'gt' \| 'gte' \| 'lt' \| 'lte'` |
| `transform.sort({ variableName, direction? })` | `transform.sort({ variableName: 'revenue', direction: 'desc' })` (default `'asc'`) |
| `transform.aggregate({ groupby, operations })` — group rows and summarize | `transform.aggregate({ groupby: ['region'], operations: [{ op: 'sum', variableName: 'revenue', as: 'total' }] })`; ops `'count' \| 'sum' \| 'mean' \| 'median' \| 'mode' \| 'min' \| 'max'` |
| `transform.constant({ variableName, type, value })` — add a constant column | `transform.constant({ variableName: 'series', type: 'categorical', value: 'Actual' })`; types `'numeric' \| 'categorical' \| 'temporal'` |

## `config()`

`config(options)` deep-merges partial options; multiple `config()` items merge in order. Defaults from `spec/config/config.defaults.ts`.

Top level also accepts `parsingLocale` (default `'en-US'`) — used to parse annotation/highlight anchor and predicate values, and as the display-locale fallback when no `formattingLocale` is passed to `GraphProvider`. It does NOT control dataset cell parsing — that is `Data._metadata.parsingLocale`, which defaults to `'en-GB'` (see `reference/data.md`). When your data needs a non-default locale, set both to the same value.

### `legend`

| Key | Type | Default | Effect |
|---|---|---|---|
| `position` | `'auto' \| 'right' \| 'left' \| 'top' \| 'bottom' \| 'none'` | `'auto'` | legend placement; `'none'` hides |
| `display` | `'pill' \| 'direct' \| 'auto'` | `'auto'` | boxed pills vs labels at series endpoints |

### `axes` — `x`, `y`, and optional `ySecondary`

Each axis takes the same shape. Defaults: x below, y beside.

| Key | Type | x default | y default | Effect |
|---|---|---|---|---|
| `isVisible` | `boolean` | `true` | `true` | show the axis |
| `label` | `string \| null` | `null` | `null` | axis title |
| `position` | `'left' \| 'right' \| 'top' \| 'bottom'` | `'bottom'` | `'right'` | which edge |
| `grid.isVisible` | `boolean \| null` | `null` | `null` | `null` lets geom policy decide (bars hide the x grid) |
| `grid.lineStyle` | `'solid' \| 'dashed' \| 'dotted'` | `'dashed'` | `'dashed'` | grid stroke style |
| `grid.lineWidth` | `number \| null` | `null` | `null` | `null` inherits theme |
| `ticks.isVisible` | `boolean` | `true` | `false` | tick labels |
| `ticks.mode` | `'auto' \| 'edges'` | `'auto'` | `'auto'` | `'edges'` shows only first/last tick |

Dual axis: setting `yScaleType: 'secondary'` on a layer is the switch — it auto-injects the `ySecondary` scale and renders the second axis opposite the primary y. `axes.ySecondary` (same `YAxisConfig` shape, optional) configures it; its grid defaults to hidden.

### `panel`

| Key | Type | Default | Effect |
|---|---|---|---|
| `border.top/right/bottom/left.isVisible` | `boolean` | `true` | draw that edge |
| `border.<edge>.lineStyle` | `'solid' \| 'dashed' \| 'dotted'` | `'dashed'` | edge style |
| `border.<edge>.lineWidth` | `number \| null` | `null` | `null` inherits theme grid width |
| `border.<edge>.color` | `string \| null` | `null` | any CSS color incl. theme tokens; `null` inherits |
| `cornerRadius` | `number` | `8` | px; a corner rounds only when both meeting edges are visible |
| `overflow.dataLabels` | `{ x, y }` of `'outside' \| 'inside' \| 'none'` | `{ x: 'inside', y: 'inside' }` | how the panel absorbs overflowing labels |
| `overflow.differenceArrows` | same | `{ x: 'outside', y: 'outside' }` | same, for difference arrows |

### `headline`

| Key | Type | Default | Effect |
|---|---|---|---|
| `show` | `'total' \| 'average' \| 'current' \| 'conversion' \| 'none'` | `'none'` | which aggregate number to display |
| `compareWith` | `'previous' \| 'first' \| 'none'` | `'none'` | trend indicator reference |
| `size` | `'auto' \| 'small' \| 'medium' \| 'large'` | `'auto'` | number size |
| `position` | `'above' \| 'center'` | `'above'` | `'center'` only valid inside a donut hole |

### `numberFormat`

| Key | Type | Default | Effect |
|---|---|---|---|
| `decimals` | `number \| 'auto'` | `'auto'` | decimal places |
| `abbreviation` | `'auto' \| 'k' \| 'm' \| 'b' \| 'none'` | `'auto'` | 1234567 → "1.2M" |
| `thousandsSeparator` | `string` | locale | separator character |
| `decimalSeparator` | `string` | locale | separator character |
| `prefix` / `suffix` | `string` | unset | e.g. `'$'` / `'%'` |

### `content`

| Key | Type | Default |
|---|---|---|
| `title` / `subtitle` / `caption` | `string \| RichTextContent \| null` | `null` |
| `isTitleVisible` / `isSubtitleVisible` | `boolean` | `true` |
| `isCaptionVisible` | `boolean` | `false` |
| `source` | `{ label?, url? } \| null` | `null` |
| `isSourceVisible` | `boolean` | `false` |

`null` means no content; the `is*Visible` flags toggle display without losing the stored text.

### `appearance`

| Key | Type | Default | Effect |
|---|---|---|---|
| `textScale` | `number` | `1` | multiplier on every text element |
| `background` | `{ type: 'theme' } \| { type: 'solid', color } \| { type: 'tinted', color? }` | `{ type: 'theme' }` | chart background; tinted mixes theme background with a color (defaults to first palette color) |
| `border` | `{ type: 'none' } \| { type: 'solid', color, width } \| { type: 'tinted', color?, width } \| { type: 'gradient', color?, width } \| { type: 'preset', preset, width }` | `{ type: 'none' }` | border ring drawn inside the chart bounds (width shrinks the panel) |
| `cornerRadius` | `number` | `8` | chart frame corner radius, px |
| `highlightStyle` | `'dim' \| 'desaturate'` | `'dim'` | how non-matched observations fade when a highlight is active |

`BORDER_PRESETS` (for `border.type: 'preset'`): `lilac`, `neon_pink`, `blackberry`, `sun`, `iceland`, `sunset`, `ultraviolet`, `purple`, `ice_cream`, `mint`, `cool`, `fresh`.

### `layout`

| Key | Type | Default | Effect |
|---|---|---|---|
| `padding` | `number \| null` | `null` | outer padding on all sides, px; `null` = engine default |
| `gaps` | `Record<regionName, number \| { before?, after? }>` | `{}` | per-region overrides of grid spacing; a bare number sets the trailing gap |

## See also

- `reference/storytelling.md` — `highlight()` predicates and every `annotation.*` builder (arrows, text, shapes, images, pinned numbers).
- `reference/plugins.md` — custom geoms, stats, and transforms via `createGraphyKit` / `defineGeomRenderer`.
