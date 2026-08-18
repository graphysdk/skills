# Storytelling: emphasis and narrative

Highlights, annotations, reference lines, trendlines, headline numbers, and data labels are all spec-level and serializable — they pipe into `createSpec`/`pipe` like any other item and re-resolve on every compile (resize, data change).

## Narrative goal → mechanism

| Goal | Mechanism |
|---|---|
| Call out one observation | `annotation.text` / `annotation.comment` pinned to it, plus `highlight()` on it |
| Show the change between two observations | `annotation.differenceArrow` (labels the measured gap) |
| Mark a threshold or target | `geom.rule()` with a constant value |
| Show the average | `geom.rule({ stat: stat.mean() })` |
| Shade a band or era | `annotation.shape` with `zOrder: 'background'` and a `fillColor` |
| Box the marks a predicate matches | `annotation.shape` over a `selection` region |
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
import { pipe, createSpec, geom, scale, highlight, styles, style } from '@graphysdk/viz-engine';

pipe(
  createSpec({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ id: 'sales', position: 'dodge' }),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  highlight({ variable: 'region', eq: 'EU' }, { scope: 'series' }),
  styles({ overrides: [style.geom({ alpha: 0.35 }, { state: 'dimmed' })] })
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

The same predicate language drives `selection` annotation anchors and the `where` condition on style entries.

### Options

| Option | Type | Effect |
|---|---|---|
| `scope` | `'data-point'` (default) `\| 'series' \| 'x-value'` | `data-point` matches rows individually; `series` expands any match to its whole group (highlight a whole line/bar group); `x-value` expands to every row sharing the same x (a vertical slice across series) |
| `layerId` | `string` | Evaluate against one layer only — the layer's authored `id`, e.g. `geom.bar({ id: 'sales' })`, so a combo's trend line stays untouched. Omit to evaluate against every layer |
| `id` | `string` | Stable id; auto-assigned when omitted |

Options are matched by name — an unrecognised key is dropped without complaint, and the highlight then evaluates against every layer, so spell `layerId` exactly.

Multiple `highlight()` calls accumulate and the engine **unions** their matches — two separate highlights behave like `or`.

### How emphasis paints

Every non-matched observation carries the `dimmed` **style state**. What dimming looks like is a stylesheet entry:

```ts
styles({ overrides: [style.geom({ alpha: 0.35 }, { state: 'dimmed' })] });          // fade
styles({ overrides: [style.geom({ saturation: 0, alpha: 0.6 }, { state: 'dimmed' })] }); // grey out
```

The built-in entry is `alpha: 0.4`. State-scoped entries sit above the whole stateless cascade — see `reference/styling.md`. Matched observations render at full strength in their own series color; there is no per-highlight color.

Per geom: `bar` re-renders the matched observations on top of the dimmed base. `line`, `area` and `point` re-render that way only for `series`-scope matches; their `data-point` and `x-value` matches surface as a **dot + value label overlay** placed at the geom's anchor for that observation, so a matched point on a line becomes a marked, labelled dot while the path dims. `rule` takes no part in highlighting.

## Annotations

Eight kinds, all built with the `annotation` factory and piped into the spec. Multiple calls of the same kind accumulate. Every annotation takes an optional stable `id`, auto-generated when omitted; only an **explicitly authored** id is addressable by an `annotation` anchor. All eight compile and paint in `@graphysdk/react-renderer`.

| Kind | Builder | Positioned by | Required input | Optional input → default |
|---|---|---|---|---|
| `differenceArrow` | `annotation.differenceArrow` | `start` + `end`: observation anchors | `start`, `end`, `label` | `color` → `null` (theme); `size` → `'small'`; `labelCrossPosition` → `0.5` |
| `shape` | `annotation.shape` | `region`: region anchor | `region` | `kind` → `'rectangle'`; `zOrder` → `'foreground'`; `fillColor` → `'transparent'`; `fillOpacity` → `1`; `strokeWidth` → `1`; `strokeColor` → `null` (theme) |
| `arrow` | `annotation.arrow` | `start` + `end`: point anchors | `start`, `end` | `color` → `null` (theme); `thickness` → `'medium'`; `startArrowheadStyle` → `'none'`; `endArrowheadStyle` → `'line-arrow'`; `lineStyle` → `'solid'`; `hasStickerStyle` → `false` |
| `text` | `annotation.text` | `at`: point anchor | `content`, `at`, `width` | `align` → `'center'`; `backgroundColor` → `null` (transparent); `backgroundColorStyle` → `'opaque'` |
| `image` | `annotation.image` | `region`: region anchor | `src`, `region` | `zOrder` → `'foreground'`; `fit` → `'contain'`; `opacity` → `1` |
| `sticker` | `annotation.sticker` | `at`: point anchor | `at`, `sticker` | `id` only |
| `pinnedNumber` | `annotation.pinnedNumber` | `at`: observation anchor | `at` | `id` only |
| `comment` | `annotation.comment` | `at`: observation anchor | `at`, `content` | `id` only |

Serialized on the spec they sit in `annotations` buckets whose names are not a mechanical transform of the kind: `differenceArrows`, `shapes`, `arrows`, `textAnnotations`, `images`, `stickers`, `pinnedNumbers`, `comments`.

**One attachment per observation.** `sticker`, `pinnedNumber`, `comment` and `image` form the observation-attachment family, and an observation carries **at most one** of them: adding a second through `AddAnnotationCommand` displaces the incumbent rather than stacking. The rule lives in the command path, not the resolver — a hand-authored spec that breaks it paints both. `image` belongs to the family by intent only; its region anchor has no observation form, so an image neither displaces nor is displaced.

**Failure is soft.** An annotation is a decoration, never a hard failure: every annotation diagnostic is a warning that drops that one annotation and renders the rest of the chart. The codes an author hits: `UNKNOWN_LAYER_ID`, `ANNOTATION_ANCHOR_UNRESOLVED`, `ANNOTATION_REF_NOT_FOUND`, `INCOMPARABLE_ARROW_ENDPOINTS`, and `ANNOTATION_DUPLICATE_ID` (the first annotation to declare an id keeps it; later claimants get a generated one, which silently breaks any `annotation` anchor pointed at them).

### The anchor system

Annotations position through anchors that re-resolve every compile — they re-flow on resize and track the data. Three families.

**Observation anchor** (`ObservationAnchorInput`) — one observation:

```ts
{ layerId: 'sales', anchorValue: 'Q4', groupValue: 'EU', align: 'top' } // only anchorValue is required
```

| Field | Meaning |
|---|---|
| `anchorValue` | value on the main axis (x in cartesian, y under `coord.flip()`) |
| `groupValue` | the series to match; omitted matches any group |
| `layerId` | a layer's authored `id`; picks one out when several layers share the same `(anchorValue, groupValue)` pair. An id no layer carries raises `UNKNOWN_LAYER_ID` and drops the annotation |
| `align` | which point of the matched geom's box to resolve to; omitted means the geom-natural point (e.g. a bar's top-edge midpoint) |

**Survival semantics**: `anchorValue` and `groupValue` are re-parsed through the anchored column's `ValueFormat` before matching, so `'2024-01-05'`, a `Date`, and a stored ISO string all name the same observation. The anchor holds as long as that `(anchorValue, groupValue)` pair exists in the data — rows can be inserted, reordered, or revalued around it. It detaches only when the pair disappears.

**Point anchor** (`PointAnchorInput`) — a single position, five arms:

| `anchorType` | Shape | Notes |
|---|---|---|
| `panel` | `{ x, y }` | fractions of the plot rect `[0,1]`, top-left origin; never snaps to data. Takes no `align` |
| `observation` | `{ anchorValue, groupValue?, layerId?, align? }` | pinned to one observation, fields as above |
| `axis` | `{ x: DataValue, y: DataValue, align? }` | a point given in **axis values**, mapped through the position scales. Dropped when either coordinate fails to map: a value outside a discrete domain, a missing scale, or a polar coord |
| `selection` | `{ predicate, align }` | the box of **every** observation the predicate matches, reduced to the named box point. `align` is **required** here. Dropped when nothing matches |
| `annotation` | `{ ref, align? }` | a point on another annotation's box, named by its authored id. `align` defaults to `'center'`. Resolved in the runtime pass, because text boxes are measured in the browser. Dropped on a missing ref or a reference cycle |

**Region anchor** (`RegionAnchorInput`) — an area, three arms:

| `anchorType` | Shape | Notes |
|---|---|---|
| `panel` | `{ x, y, width, height }` | plot-rect fractions |
| `selection` | `{ predicate, padding? }` | the tight bounding box of every match, grown by `padding` — a number pads both axes in panel fractions, an `AnchorOffset` pads each axis in its own unit. Omitted padding is `{ x: 8, y: 8, unit: 'px' }`. Dropped when nothing matches |
| `annotation` | `{ ref }` | copies the referenced annotation's box. Dropped on a missing ref, a cycle, or a zero-area target |

`AnchorAlign` is `'center' | 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'`.

**Offsets.** Every point-anchor arm takes `offset?: AnchorOffset` — `{ x?, y?, unit?: 'panel' | 'px' }`, `unit` defaulting to `'panel'` (a plot-rect fraction); `'px'` is device pixels, applied in the runtime pass. The offset is a nudge applied after the target resolves. Region anchors carry no offset; the `selection` region's `padding` takes the same type.

Arrow endpoints get an automatic **4 px stand-off** from the edge or corner they snap to, so an arrowhead points at a bar without touching it. It applies to a data anchor (`observation`, `selection`, `annotation`) with a directional `align` and no author-supplied `offset`; a `panel` or `axis` anchor, an `align: 'center'`, or an explicit `offset` gets none.

Anchoring one annotation to another:

```ts
pipe(
  createSpec({ x: 'quarter', y: 'sales' }),
  geom.line(),
  scale.x(),
  scale.y(),
  annotation.text({
    id: 'peak-note',
    at: { anchorType: 'panel', x: 0.5, y: 0.12 },
    width: 0.25,
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Peak quarter' }] }] },
  }),
  annotation.arrow({
    start: { anchorType: 'annotation', ref: 'peak-note', align: 'bottom' },
    end: { anchorType: 'observation', anchorValue: 'Q3', align: 'top' },
  })
);
```

### `annotation.differenceArrow` — measured change between two observations

Reads the gap between two observations and labels it. Distinct from `arrow`, which is free-form and unlabelled. `label` is required.

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

**Endpoints must be comparable.** A difference only means something when both ends measure one quantity, so the two observations must sit on the **same y scale** (primary or secondary, not one of each) **and** carry the **same value format** — currency compared including its `iso`, so `$` and `€` do not match either. Anything else raises `INCOMPARABLE_ARROW_ENDPOINTS` and the arrow is dropped.

Both halves are read per observation, so this catches an arrow inside a single layer too. That is the trap in the wide→long reshape `reference/data.md` recommends: melting revenue and margin into one value column puts `$` and `%` observations on one axis, and an arrow spanning them measures nothing. Reshape only columns that share a unit, or keep the two measures on separate layers with their own scales.

Overflow past the panel edge is governed by `config({ panel: { overflow: { differenceArrows: { x, y } } } })`.

### `annotation.shape` — band, box or outline

A rectangle over a region. Left alone it is an unfilled, 1 px-stroked rectangle drawn **on top of** the geoms — a shaded band behind them needs `zOrder` and `fillColor` set explicitly.

```ts
annotation.shape({
  region: { anchorType: 'panel', x: 0, y: 0.7, width: 1, height: 0.3 }, // full-width horizontal band
  zOrder: 'background',       // 'foreground' (default, over the geoms) | 'background' (beneath them)
  fillColor: '#e15759',
  fillOpacity: 0.12,          // 0..1
  strokeWidth: 0,             // border width; strokeColor: null → theme default
});
```

`fillColor` is a tri-state: omit it and the shape is unfilled; `null` takes the theme's `defaultAnnotationShapeFill`; a string paints that colour. `kind` is `'rectangle'`, the only shape.

A `selection` region wraps whatever the predicate matches, so the box tracks the data instead of a fixed rect:

```ts
annotation.shape({
  region: {
    anchorType: 'selection',
    predicate: { variable: 'region', eq: 'EU' },
    padding: { x: 12, y: 12, unit: 'px' },
  },
  fillColor: null,
  strokeWidth: 2,
});
```

### `annotation.arrow` — free-form arrow

Each endpoint is a point anchor, so an arrow can float in panel space, pin both ends to observations, or mix — a label in panel space pointing at a data point.

```ts
annotation.arrow({
  start: { anchorType: 'panel', x: 0.15, y: 0.2 },
  end: { anchorType: 'observation', anchorValue: 'Q3', groupValue: 'EU', align: 'top' },
  thickness: 'medium',              // 'thin' | 'medium' | 'thick'
  startArrowheadStyle: 'none',      // 'none' | 'line-arrow'
  endArrowheadStyle: 'line-arrow',
  lineStyle: 'solid',               // 'solid' | 'dashed'
  color: null,                      // null → theme default
  hasStickerStyle: false,           // raised, outlined sticker look
});
```

### `annotation.text` — rich-text label

The text's box is centred on its point anchor: `align` names which point of that box sits at `at`, and defaults to `'center'` — pass `'top-left'` to put the box's corner on the anchor. `width` is a fraction of plot width; height is intrinsic to the content. `content` is a TipTap-compatible tree (`RichTextContent`): nodes with `type`, `content`, `text`, `marks`, `attrs`. Recognized attrs: `heading.level` (1–3), `paragraph.textAlign`; on the `textStyle` mark: `color`, `font`, `fontSize` (number read as n/10 em).

```ts
annotation.text({
  at: { anchorType: 'panel', x: 0.55, y: 0.08 },
  width: 0.3,
  align: 'center',                // which point of the text's own box sits at `at`
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
  backgroundColorStyle: 'opaque', // 'opaque' | 'fade'
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

`at` is a full point anchor, so a sticker can also float in panel space. `sticker` is a plain string resolved against the renderer's catalogue, so an id the renderer does not ship simply paints nothing.

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

Pinned numbers and comments are placed together in one pass so neighbouring bubbles avoid each other. Stickers are placed by their own pass and take no part in that avoidance.

## Reference lines — `geom.rule()`

A rule is a layer drawing a single reference line from one value. Orientation follows the mapped aesthetic: mapping `y` gives a horizontal line spanning the panel; mapping `x` gives a vertical line (numeric x scales only — date and categorical x are unsupported). Under `coord.flip()` the painted orientation inverts with the axes. If the value sits outside the data, the scale's auto-domain extends to include it.

```ts
// Constant threshold
geom.rule({
  id: 'target',
  aes: { y: { value: 2500 } }, // constant-value aesthetic, not a column
  params: { label: 'Target', labelPosition: 'start' },
});

// Vertical event marker on a numeric x-axis
geom.rule({ aes: { x: { value: 40 } }, params: { label: 'Threshold' } });
```

`RuleGeomParams` holds two keys:

| Param | Values (default) | Notes |
|---|---|---|
| `label` | `string?` (omitted → the formatted value alone) | The painted text is `"<label>: <formatted value>"` — a rule at 2500 labelled `'Target'` reads **Target: 2,500**, formatted through the axis guide's value format |
| `labelPosition` | `'start' \| 'end'` (`'start'`) | which end of the line the label pill sits at |

Stroke paint and label typography are style targets:

```ts
styles({
  overrides: [
    style.geom.rule({ color: '#e15759', strokeWidth: 2, lineType: 'solid' }, { layer: 'target' }),
    style.geom.rule.label({ fontSize: 12, fontWeight: 600 }),
  ],
});
```

Built-in rule styling is `color: token('ruleColor')`, `strokeWidth: 1`, `lineType: 'dashed'`, label `fontSize: 11 / fontWeight: 500 / lineHeight: 1`; the label pill takes the rule's own colour and picks its text colour by contrast. See `reference/styling.md`.

Rules default to `interactive: false` and paint in spec order — declared after `geom.bar()` they render in front of the bars. Stack several rules for floor/target/ceiling.

### Average lines — `stat.mean`

`stat.mean` reduces a layer's data to one observation holding the mean of `y` — on a rule layer that is a data-driven average line. Requires a numeric `y` mapping.

```ts
geom.rule({
  aes: { y: 'revenue' },   // a column this time; stat.mean produces the constant
  stat: stat.mean(),
  params: { label: 'Average' },
});
```

For a per-series average, add a layer transform filtering to that series before the stat runs. When the chart has a categorical colour scale with more than one group, a `stat.mean` rule's label pill also carries the source geom's swatch shape in that group's colour, so a per-series average reads as belonging to its series.

Goal, trend and average lines are recognised by their shape — rule + identity stat + constant mapping, line + smooth stat, rule + mean stat — so the three recipes here are the canonical forms and the editor round-trips them.

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

These keys decide **where** a label goes. How it looks — font, text colour, background, padding, border, radius — is the `style.dataLabel` target, partitioned by role (`observation` / `category` / `aggregate`) and position (`inside` / `outside`), e.g. `style.dataLabel.observation.outside({ background: '#FFF', borderWidth: 1 })`. Stack totals are the `aggregate` role and always sit outside, so they take no position partition. See `reference/styling.md`.

Labels overflowing the panel are governed by `config({ panel: { overflow: { dataLabels: { x, y } } } })`.
