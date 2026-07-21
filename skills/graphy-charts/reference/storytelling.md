# Storytelling: emphasis and narrative

Highlights, annotations, reference lines, trendlines, headline numbers, and data labels are all spec-level and serializable — they pipe into `createSpec`/`pipe` like any other item and re-resolve on every compile (resize, data change).

## Narrative goal → mechanism

| Goal | Mechanism |
|---|---|
| Call out one observation | `annotation.text` / `annotation.comment` pinned to it, plus `highlight()` on it |
| Show the change between two observations | `annotation.differenceArrow` (labels the measured gap) |
| Mark a threshold or target | `geom.rule()` with a constant value |
| Show the average | `geom.rule({ stat: stat.mean() })` |
| Shade a band or era | `annotation.shape` (panel-region rectangle, `zOrder: 'background'`) |
| Emphasize one series among many | `highlight(predicate, { scope: 'series' })` |
| Emphasize one time slice across series | `highlight(predicate, { scope: 'x-value' })` |
| Show the trend through noisy points | second layer with `stat.smooth` |
| Surface the total / latest value | `config({ headline: { show: 'total' \| 'current' } })` |
| Label every value on the marks | layer `dataLabels: { showDataLabels: true }` |
| Point at something / react to it | `annotation.arrow`, `annotation.sticker`, `annotation.image` |
| Pin a live value bubble to an observation | `annotation.pinnedNumber` |

## Highlights

`highlight(predicate, options?)` emphasizes the observations a predicate matches; everything else recedes.

```ts
import { pipe, createSpec, geom, scale, highlight, config } from '@graphysdk/viz-engine';

pipe(
  createSpec({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'dodge' }),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  highlight({ variable: 'region', eq: 'EU' }, { scope: 'series' }),
  config({ appearance: { highlightStyle: 'desaturate' } })
);
```

### Predicate algebra

Predicates test post-transform user columns by `variable` (a column key):

| Predicate | Matches when |
|---|---|
| `{ variable, eq: value }` | value equals |
| `{ variable, oneOf: [a, b] }` | value is any of |
| `{ variable, lt: v }` / `{ variable, lte: v }` | value below (or equal) |
| `{ variable, gt: v }` / `{ variable, gte: v }` | value above (or equal) |
| `{ variable, range: [lo, hi] }` | value within bounds |
| `{ and: [p, q] }` / `{ or: [p, q] }` / `{ not: p }` | logical composition, nestable to any depth |

Ordering operators (`lt`…`range`) coerce their operand by the column's data type; using them on a categorical column is a resolve-time validation error. A single observation is usually pinned with `and`: `{ and: [{ variable: 'quarter', eq: 'Q2' }, { variable: 'region', eq: 'EU' }] }`.

### Options

| Option | Type | Effect |
|---|---|---|
| `scope` | `'data-point'` (default) `\| 'series' \| 'x-value'` | `data-point` matches rows individually; `series` expands any match to its whole group (highlight a whole line/bar group); `x-value` expands to every row sharing the same x (a vertical slice across series) |
| `layerIndex` | `number` | Evaluate against one layer only (e.g. bind to the bar layer of a combo so the trend line stays untouched). Omit to evaluate against every layer |
| `id` | `string` | Stable id; auto-assigned when omitted |

Multiple `highlight()` calls accumulate and the engine **unions** their matches — two separate highlights behave like `or`.

### How emphasis paints

`config({ appearance: { highlightStyle } })` sets the chart-global de-emphasis for non-matched observations: `'dim'` (default) lowers opacity, `'desaturate'` swaps fill/stroke for neutral grey. Matched observations render at full strength in their own series color; there is no per-highlight color.

Per geom: bar and rule re-render the matched observations on top of the dimmed base. Line, area, and point re-render only for `series`-scope matches; `data-point` and `x-value` matches surface instead as a **dot + value label overlay** placed at the geom's anchor for that observation — a matched point on a line becomes a marked, labelled dot while the path dims.

## Annotations

Eight annotation kinds, all built with the `annotation` factory and piped into the spec. Multiple calls of the same kind accumulate. All eight compile and paint in `@graphysdk/react-renderer`. Every annotation takes an optional stable `id` (auto-generated when omitted).

### The anchor system

Annotations position through anchors that re-resolve every compile — they re-flow on resize and track the data.

**Observation anchor** (`ObservationAnchorInput`) — points at one observation:

```ts
{ anchorValue: 'Q4', groupValue: 'EU', layerIndex: 0 } // layerIndex, groupValue optional
```

- `anchorValue`: the value on the main axis (x in cartesian, y under `coord.flip()`).
- `groupValue`: the series to match; omitted matches any group.
- `layerIndex`: disambiguates when several layers share the same `(anchorValue, groupValue)` pair.
- **Survival semantics**: the anchor survives as long as the `(anchorValue, groupValue)` pair exists in the data — rows can be inserted, reordered, or revalued around it and the annotation stays pinned to the right observation. It detaches only when that pair disappears.

**Point anchor** (`PointAnchorInput`) — a single position, either form:

```ts
{ anchorType: 'panel', x: 0.25, y: 0.1 }                     // fractions of the plot rect [0,1], top-left origin; never snaps to data
{ anchorType: 'observation', anchorValue: 'Q4', groupValue: 'EU', align: 'top-right' } // pinned to an observation
```

- `align` (observation form): which point of the target's box the anchor resolves to — `'center'`, the four edges, the four corners; omitted means the geom-natural point (e.g. a bar's top-edge midpoint).
- Both forms take `offset?: { x?, y?, unit?: 'panel' | 'px' }` — a nudge applied after the target resolves (`'panel'` = plot-rect fraction, default; `'px'` = device pixels).

**Region anchor** (`RegionAnchorInput`) — an area: `{ anchorType: 'panel', x, y, width, height }`, all plot-rect fractions.

| Kind | Positioned by |
|---|---|
| `differenceArrow`, `pinnedNumber`, `comment` | observation anchors |
| `arrow`, `text`, `sticker` | point anchors (panel or observation) |
| `shape`, `image` | region anchors |

### `annotation.differenceArrow` — measured change between two observations

Reads the gap between two observations and labels it. Distinct from `arrow`, which is free-form and unlabelled.

```ts
annotation.differenceArrow({
  start: { anchorValue: 'Jan', groupValue: 'EU' },
  end: { anchorValue: 'Apr', groupValue: 'EU' },
  label: 'relative-difference', // 'absolute-difference' (raw gap) | 'relative-difference' (% change) | 'proportion' (one value as a share of the other)
  size: 'small',                // 'small' | 'medium' | 'large'
  color: null,                  // null → theme default
  labelCrossPosition: 0.5,      // label position along the arrow, fraction of its length
});
```

Overflow past the panel edge is governed by `config({ panel: { overflow: { differenceArrows: { x, y } } } })`.

### `annotation.shape` — shaded band / box

The shaded-band mechanism: a rectangle over a panel region, usually behind the geoms.

```ts
annotation.shape({
  region: { anchorType: 'panel', x: 0, y: 0.7, width: 1, height: 0.3 }, // full-width horizontal band
  fillColor: '#e15759',
  fillOpacity: 0.12,          // 0..1
  zOrder: 'background',       // 'background' (beneath geoms) | 'foreground'
  strokeWidth: 0,             // border; strokeColor: null → theme default
});
```

`kind` is `'rectangle'` (the only shape today).

### `annotation.arrow` — free-form arrow

Each endpoint is a point anchor, so an arrow can float in panel space, pin both ends to observations, or mix (label in panel space pointing at a data point).

```ts
annotation.arrow({
  start: { anchorType: 'panel', x: 0.15, y: 0.2 },
  end: { anchorType: 'observation', anchorValue: 'Q3', groupValue: 'EU' },
  thickness: 'medium',              // 'thin' | 'medium' | 'thick'
  startArrowheadStyle: 'none',      // 'none' | 'line-arrow'
  endArrowheadStyle: 'line-arrow',
  lineStyle: 'solid',               // 'solid' | 'dashed'
  color: null,                      // null → theme default
  hasStickerStyle: false,           // raised, outlined sticker look
});
```

### `annotation.text` — rich-text label

Top-left corner at a point anchor; `width` is a fraction of plot width; height is intrinsic to the content. `content` is a TipTap-compatible tree (`RichTextContent`): nodes with `type`, `content`, `text`, `marks`, `attrs`. Recognized attrs: `heading.level` (1–3), `paragraph.textAlign`; on the `textStyle` mark: `color`, `font`, `fontSize` (number read as n/10 em).

```ts
annotation.text({
  at: { anchorType: 'panel', x: 0.55, y: 0.08 },
  width: 0.3,
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { textAlign: 'left' },
        content: [{ type: 'text', text: 'Launch quarter', marks: [{ type: 'bold' }] }],
      },
    ],
  },
  backgroundColor: null,          // null → transparent
  backgroundColorStyle: 'fade',   // 'fade' | 'opaque'
});
```

### `annotation.image`

```ts
annotation.image({
  src: 'data:image/png;base64,...', // URL or data URI
  region: { anchorType: 'panel', x: 0.7, y: 0.05, width: 0.2, height: 0.3 },
  fit: 'contain',       // 'fill' (stretch) | 'contain' (letterbox) | 'cover' (crop to fill)
  opacity: 1,
  zOrder: 'foreground',
});
```

### `annotation.sticker` — built-in reaction image

```ts
annotation.sticker({
  sticker: 'rocket', // renderer ships: 'rocket' | 'clapping-hands' | 'thumbs-up' | 'thumbs-down' | 'grinning-face'
  at: { anchorType: 'observation', anchorValue: 'Q4' },
});
```

### `annotation.pinnedNumber` — live value bubble

A marker dot pinned to one observation whose mini view shows the observation's measurement value; hovering it reveals the full chart tooltip (x + y + trend). No content to author — the value is read live from the data.

```ts
annotation.pinnedNumber({ at: { anchorValue: 'Q4', groupValue: 'EU' } });
```

### `annotation.comment` — pinned rich-text note

Same marker-dot mechanism carrying rich text; the mini view shows a truncated comment, hover reveals the full text.

```ts
annotation.comment({
  at: { anchorValue: 'Q3' },
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Campaign started here' }] }] },
});
```

Pinned numbers and comments are placed together by the renderer so neighbouring bubbles avoid each other.

## Reference lines — `geom.rule()`

A rule is a layer drawing a single reference line from one value. Orientation follows the mapped aesthetic: mapping `y` gives a horizontal line spanning the panel; mapping `x` gives a vertical line (numeric x scales only — date and categorical x are unsupported). Under `coord.flip()` the painted orientation inverts with the axes. If the value sits outside the data, the scale's auto-domain extends to include it.

```ts
// Constant threshold
geom.rule({
  aes: { y: { value: 2500 } }, // constant-value aesthetic, not a column
  params: { label: 'Target', labelPosition: 'start', lineType: 'dashed', strokeWidth: 1 },
});

// Vertical event marker on a numeric x-axis
geom.rule({ aes: { x: { value: 40 } }, params: { label: 'Threshold' } });
```

Params (defaults): `color` (theme target-line color), `strokeWidth: 1`, `lineType: 'dashed'` (`'solid' | 'dashed' | 'dotted'`), `label` (omit to hide), `labelPosition: 'start'` (`'start' | 'end'`). Rules default to `interactive: false` and paint in spec order — declared after `geom.bar()` they render in front of the bars. Stack several rules for floor/target/ceiling.

### Average lines — `stat.mean`

`stat.mean` reduces a layer's data to one observation holding the mean of `y` — on a rule layer that is a data-driven average line. Requires a numeric `y` mapping.

```ts
geom.rule({
  aes: { y: 'revenue' },   // a column this time; stat.mean produces the constant
  stat: stat.mean(),
  params: { label: 'Average' },
});
```

For a per-series average, add a layer transform filtering to that series before the stat runs.

## Trendlines — `stat.smooth`

A trendline is a second layer (usually `geom.line`) whose stat replaces the raw observations with a fitted curve. With a `color` mapping, each series gets its own fit.

```ts
pipe(
  createSpec({ x: 'weight', y: 'power' }),
  geom.point(),
  geom.line({
    stat: stat.smooth({ method: 'linear' }),
    interactive: false,               // keep hover on the raw points
    aes: { lineType: { value: 'dashed' } },
  }),
  scale.x(),
  scale.y()
);
```

Methods: `'linear' | 'loess' | 'exponential' | 'logarithmic' | 'quadratic' | 'power' | 'polynomial'`. Extra params: `order` (polynomial only, default 3), `bandwidth` (loess only, default 0.3). The `stat.smooth()` builder requires `method`; only the string shorthand `stat: 'smooth'` defaults to `'linear'`.

## Headline numbers — `config({ headline })`

Big aggregate figures for the chart.

```ts
config({ headline: { show: 'current', compareWith: 'previous', size: 'auto', position: 'above' } });
```

| Key | Values | Notes |
|---|---|---|
| `show` | `'total' \| 'average' \| 'current' \| 'conversion' \| 'none'` (default `'none'`) | `current` = latest value on the main axis. `conversion` is accepted but not compiled yet — it renders nothing |
| `compareWith` | `'previous' \| 'first' \| 'none'` (default `'none'`) | Trend indicator; only shown for `show: 'current'` on a datetime main axis. `'none'` falls back to `'first'` — a `current` headline always trends |
| `size` | `'auto' \| 'small' \| 'medium' \| 'large'` | |
| `position` | `'above'` (header region, default) `\| 'center'` (inside a donut hole; donut charts only) | |

Mode split: **cartesian** charts show a **per-group** strip — one figure per color group, each with its swatch and label, computed from that group's values (a per-group headline replaces the legend, which would name the same groups). **Polar** charts (pie/donut) show a single **grand total** — the plain signed sum of every slice's measure; only `show: 'total'` applies there. `show: 'total'` is suppressed on a stack-fill layer (totalling shares of a whole is meaningless).

## Data labels — layer `dataLabels`

Per-layer config on any geom; all off by default.

```ts
geom.bar({
  position: 'stack',
  dataLabels: { showDataLabels: true, showStackTotals: true, position: 'inside', justify: 'center' },
});
```

| Key | Values (default) | Notes |
|---|---|---|
| `showDataLabels` | `boolean` (`false`) | one value label per observation |
| `format` | `'absolute' \| 'percentage'` (`'absolute'`) | |
| `position` | `'auto' \| 'inside' \| 'outside'` (`'auto'`) | `auto` fits/flips/drops/rotates as needed and ignores `justify`/`align`; explicit values render exactly as asked. Stacked/filled cartesian segments coerce `'outside'` to `'inside'` |
| `justify` | `'start' \| 'center' \| 'end' \| 'panel-start' \| 'panel-end'` (`'end'`; `'center'` for stacked/filled bars) | anchor along the value axis; `'end'` is the value tip regardless of orientation or sign; `panel-*` pins to the panel edge |
| `align` | `'start' \| 'center' \| 'end'` (`'center'`) | anchor across the geom: bandwidth for bars, angular for pie wedges, x for point/line/area |
| `offset` | px (`4` bars/wedges, `12` point/line/area) | gap between geom edge and label box; stack totals ignore it |
| `showStackTotals` | `boolean` (`false`) | total at the end of each stack — use instead of `'outside'` on stacked segments |
| `showCategoryLabels` | `boolean` (`false`) | polar bars prepend the category to the value ("Europe · 35%"); cartesian bars emit a second label per observation, placed by the `category*` fields independently of `showDataLabels` |
| `categoryPosition` / `categoryJustify` / `categoryAlign` / `categoryOffset` | as above, no `'auto'` (`'inside'` / `'start'` / `'center'` / `4`) | placement of the cartesian category label |

Styling follows the label's effective position: over the geom → inside styling (white text, no plate); off it → dark text on a plate. Area labels always use the plated styling. Labels overflowing the panel are governed by `config({ panel: { overflow: { dataLabels: { x, y } } } })`.
