# Heatmap (tile)

`geom.tile()` fills its `(x, y)` cell on both axes, with the value on **`color`** through a ramp
instead of on a length. `color` is required; there are no `params` — a cell's geometry is the two
bands it sits in. Data is **long**: one row per cell, carrying both coordinates and the value.

| Variant | Spec delta |
|---|---|
| Heatmap | base below |
| Named colormap | `scale.color.continuous({ scheme: 'viridis' })` |
| Explicit ramp | `scale.color.continuous({ range: ['#FFFFFF', '#0B5FFF'] })` |
| Diverging (crosses zero) | `scale.color.continuous({ scheme: 'RdBu', domainMid: 0 })` |
| No cell labels | `geom.tile({ dataLabels: { showDataLabels: false } })` |
| Force the full grid | `scale.x.discrete({ domain: [...] })`, same on y |
| First category at the bottom | `scale.y.discrete({ reverse: false })` |
| Wide matrix input | `transform.reshape({ … })` in front of the mapping — below |
| Waffle | `scale.color.discrete()` over an index grid — below |

## Base heatmap

```tsx
import { config, createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const data = {
  columns: [{ key: 'cohort' }, { key: 'week' }, { key: 'retention' }],
  rows: [
    { cohort: 'Cohort 1', week: 'Week 1', retention: 86 },
    { cohort: 'Cohort 1', week: 'Week 2', retention: 70 },
    { cohort: 'Cohort 2', week: 'Week 1', retention: 82 },
    { cohort: 'Cohort 2', week: 'Week 2', retention: 71 },
  ],
};

const input = pipe(
  createSpec({ x: 'cohort', y: 'week', color: 'retention' }),
  geom.tile(),
  scale.x(),
  scale.y(),
  scale.color.continuous({ scheme: 'viridis' }),
  config({ axes: { x: { position: 'top' } } })
);

export function CohortRetention() {
  return (
    <GraphProvider data={data} input={input}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Color is the encoding

**Declare the color scale.** With none in the spec the engine appends the *ordinal*
`scale.color.palette()` — a numeric column then gets one palette hue per distinct value instead of a
ramp.

```ts
scale.color.continuous();                                  // brand sequential ramp
scale.color.continuous({ scheme: 'viridis' });             // named colormap
scale.color.continuous({ range: ['#FFFFFF', '#0B5FFF'] }); // explicit ramp
```

Data that crosses zero wants a diverging scheme with `domainMid: 0`; without the pin the neutral
color lands on the data's midpoint rather than zero. It also turns `symmetric` on, so ±8 get equal
intensity. Full ramp options: `reference/spec-api.md` → `scale`.

## Wide matrix data

One column per grid column is the usual shape — reshape in front of the mapping:

```ts
const data = {
  columns: [{ key: 'product' }, { key: 'North' }, { key: 'South' }, { key: 'East' }, { key: 'West' }],
  rows: [
    { product: 'Coffee', North: 18, South: 12, East: 15, West: 9 },
    { product: 'Tea', North: 7, South: 11, East: 6, West: 14 },
  ],
};

const input = pipe(
  createSpec(),
  transform.reshape({
    keep: ['product'],
    reshape: ['North', 'South', 'East', 'West'],
    keyName: 'region',
    valueName: 'revenue',
  }),
  mapping({ x: 'region', y: 'product', color: 'revenue' }),
  geom.tile(),
  scale.x(),
  scale.y(),
  scale.color.continuous()
);
```

## Gaps stay gaps

Only the rows you supply paint a cell, so a missing combination stays a hole rather than the ramp's
low end — "absent" and "zero" read differently, and a hole answers no hover. Band domains come from
the data present, so force the full set with `domain`:

```ts
scale.x.discrete({ domain: ['Q1', 'Q2', 'Q3', 'Q4'] }),
```

## Value labels

On by default here — a heatmap is read cell by cell. Each label centres in its cell, is dropped when
the cell is too small to hold it, and flips ink dark/light against the fill beneath it.

```ts
geom.tile({ dataLabels: { showDataLabels: false } }),
```

Label text is the `color` value (or `mapping.label`), not a y value. `format: 'percentage'` has no
denominator and falls back to absolute; `showStackTotals` / `showCategoryLabels` warn as ignored.

## Waffle

The same geom with a **discrete** color scale: a 10×10 field, one cell per percentage point. The grid
indices are a layout device, so both axes are hidden.

```ts
// rows: one per cell — { col: 0..9, row: 0..9, channel: 'Organic search' | … }
const gridIndices = Array.from({ length: 10 }, (_unused, index) => index);

const input = pipe(
  createSpec({ x: 'col', y: 'row', color: 'channel' }),
  geom.tile({ dataLabels: { showDataLabels: false } }),
  scale.x.discrete({ domain: gridIndices }),
  scale.y.discrete({ domain: gridIndices }),
  scale.color.discrete({
    domain: ['Organic search', 'Direct', 'Social', 'Referral', 'Paid'],
    range: ['#4c78a8', '#f58518', '#54a24b', '#b279a2', '#e45756'],
  }),
  config({ axes: { x: { isVisible: false }, y: { isVisible: false } }, legend: { position: 'right' } })
);
```

## What the geom decides

| Default | Why |
|---|---|
| Both axes are **band** scales | A cell is addressed by a category on each. A declared continuous scale raises `UNSUPPORTED_SCALE_TYPE` and the band wins |
| Band `padding` is `0` | Cells tile the plane; the inset between painted tiles is render-side. An explicit `padding` still wins |
| The `y` band reads **top-down** | The matrix convention; `scale.y.discrete({ reverse: false })` flips it |
| Grid lines hidden on both axes | The cells already partition the panel |
| The legend is never suppressed | Its gradient color bar is the only place the value scale is written down |
| Data labels on | See above |
| Position is `identity` | No value axis to stack or dodge along |

## Paint and hover

No `style.geom.tile` target — the fill comes from the color scale, and the radius and inset are
fixed. `style.geom({ color, alpha, saturation })` and the `hovered` / `dimmed` states still apply.

Hover hit-tests the whole band, inset included, so the grid is live wherever a cell exists. The
tooltip heads with the cell's `x` category and lists the one value `color` encodes.

## Annotations

An observation anchor on a grid takes **two** values: `anchorValue` names a column, `crossValue`
picks the cell out of it. It resolves to the cell's centre, and a pinned number prints the `color`
value.

```ts
annotation.pinnedNumber({ at: { anchorValue: 'Cohort 5', crossValue: 'Week 1' } }),
```

Panel-anchored kinds (text, arrows, shapes) float free of any cell — give text an opaque background,
since the ramp runs light to dark underneath. `highlight()` predicates work as everywhere else.

## Intro animation

The value rides on the fill, so there is no extent to grow: the grid fades up as one, unstaggered.

```tsx
<GraphRenderer animation={{ intro: { durationScale: 0.5 } }} />
```

`maxAnimatedGeoms` (default `1500`) counts geoms across **all** layers; above it the entrance is skipped.

## Gotchas

- **Cartesian only.** `coord.flip()` and `coord.polar()` raise `UNSUPPORTED_COORD` — swap the two
  mappings instead of flipping.
- **`identity` position only.** `'stack'`, `'dodge'` and `'fill'` raise `UNSUPPORTED_POSITION`.
- Both axes are bands even for a numeric or temporal column — a year becomes a category, not an axis.
