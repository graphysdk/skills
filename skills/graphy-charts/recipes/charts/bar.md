# Bar charts

| Variant | Delta from base |
|---|---|
| Simple | base recipe below |
| Grouped (dodge) | map `color`, `geom.bar({ position: 'dodge' })`, add `scale.color.palette()` |
| Stacked | map `color`, `geom.bar({ position: 'stack' })`, add `scale.color.palette()` |
| 100% stacked | map `color`, `geom.bar({ position: 'fill' })`, add `scale.color.palette()` |
| Negative values | `geom.bar({ position: 'identity' })` — bars grow down from the zero baseline |
| Horizontal | append `coord.flip()` |
| Single bar | one row, `geom.bar({ position: 'identity' })` |
| Count stat | `mapping({ x: 'category' })` only (no `y`), `geom.bar({ stat: 'count' })` |
| Pill bars | `styles({ defaults: [style.geom.bar({ borderRadius: 'full' })] })` |
| Data labels | `geom.bar({ dataLabels: { showDataLabels: true } })` — see below |
| Polar | append `coord.polar()` — `recipes/charts/pie-donut.md`, `recipes/charts/polar-bar.md` |

## Base: simple bar

```tsx
import { createSpec, geom, mapping, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const data = {
  columns: [{ key: 'category' }, { key: 'revenue' }],
  rows: [
    { category: 'Product A', revenue: 1200 },
    { category: 'Product B', revenue: 1800 },
    { category: 'Product C', revenue: 2400 },
    { category: 'Product D', revenue: 1600 },
  ],
};

const input = pipe(createSpec(), mapping({ x: 'category', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

export function BarChart() {
  return (
    <GraphProvider data={data} input={input}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Grouped / stacked / 100% (wide data)

Wide data — one column per series — needs `transform.reshape` to long form before `color` can map to the series:

```ts
const wideData = {
  columns: [{ key: 'quarter' }, { key: 'North' }, { key: 'South' }, { key: 'West' }],
  rows: [
    { quarter: 'Q1', North: 350, South: 200, West: 500 },
    { quarter: 'Q2', North: 300, South: 250, West: 350 },
    { quarter: 'Q3', North: 400, South: 300, West: 300 },
  ],
};

const input = pipe(
  createSpec(),
  transform.reshape({ keep: ['quarter'], reshape: ['North', 'South', 'West'], keyName: 'region', valueName: 'sales' }),
  mapping({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'stack' }), // or 'dodge' | 'fill'
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

With no `palette` option, `scale.color.palette()` resolves `{ type: 'default' }` per chart: stacked or filled bars touch, so those charts get the single-hue `brick` mono ramp, while dodged bars (nothing touches) get the 8-colour multicolour set. `scale.color.palette({ palette: { type: 'graphy' } })` forces the multicolour set.

Data already in long form (a series column per row) skips the reshape — map `color` directly:

```ts
mapping({ x: 'month', y: 'revenue', color: 'product' }),
geom.bar({ position: 'stack' }),
```

## Negative values

```ts
mapping({ x: 'month', y: 'pnl' }), // pnl rows may be negative
geom.bar({ position: 'identity' }),
```

## Horizontal

```ts
// append after the scales
coord.flip()
```

## Single bar

```ts
// data: rows: [{ item: 'Revenue', amount: 42000 }]
mapping({ x: 'item', y: 'amount' }),
geom.bar({ position: 'identity' }),
```

## Count stat (no y mapping)

Raw observations — one row per event; the `count` stat tallies observations per x value:

```ts
mapping({ x: 'category' }),
geom.bar({ stat: 'count' }),
scale.x(),
scale.y(),
config({ axes: { y: { label: 'Count' } } })
```

## Geometry and paint

`params` carries the band geometry; the stylesheet carries the paint (`reference/styling.md`).

| Surface | Key | Type | Default | Notes |
|---|---|---|---|---|
| `geom.bar({ params })` | `width` | number in `(0, 1]` | `0.7` (`1` under `coord.polar`) | fraction of the category band |
| `style.geom.bar` | `borderRadius` | `'none' \| 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'sm'` | `'full'` = pill; a stack rounds the outer corners of the whole column |
| `style.geom.bar` | `borderColor` | color | `token('geomBorder')` | translucent ink, light/dark aware — the border is drawn by default |
| `style.geom.bar` | `borderWidth` | number | `1` | `0` removes the border |

```ts
geom.bar({ params: { width: 0.5 } }),
styles({ defaults: [style.geom.bar({ borderRadius: 'full', borderColor: '#1e293b', borderWidth: 2 })] }),
```

`style.geom.bar` also takes the shared `color`, `alpha` and `saturation`, and scopes to one layer or
one data subset via `{ layer }` / `{ where }`.

The built-in look is token-backed — `styles({ tokens: { geom: '#0B5FFF', geomBorder: '#1A1A1A33', gridLine: '#E9E9E9', textPrimary: '#1A1A1A' } })` restyles the defaults with no entries. The built-in hovered state is `style.geom.bar({ borderColor: token('hoverAffordance') }, { state: 'hovered' })`.

Stats available on a bar layer: `'count' | 'sum' | 'mean' | 'smooth'`. Bars also render under `coord.polar` (`recipes/charts/pie-donut.md`, `recipes/charts/polar-bar.md`), where the `width` default becomes `1`.

## Data labels

```ts
geom.bar({
  position: 'stack',
  dataLabels: { showDataLabels: true, showStackTotals: true, showCategoryLabels: true, position: 'inside', justify: 'center', align: 'center', offset: 4 },
}),
```

- Stacked/filled segments coerce `position: 'outside'` to `'inside'` (`DATA_LABEL_PLACEMENT_COERCED`) — every segment edge borders a neighbour; use `showStackTotals` for stack-end totals.
- `showStackTotals` on anything but a stacked cartesian bar warns `DATA_LABEL_SETTING_IGNORED`.
- `justify` defaults to `'end'`, `'center'` on stacked/filled bars; `offset` defaults to `4`.

## Intro animation

On mount bars grow out of the zero baseline, staggered in visual order along the main axis; the
segments of one stack share a delay so the column rises as one. The renderer's `animation` prop tunes it:

```tsx
<GraphRenderer animation={{ intro: { stagger: false, durationScale: 0.5 } }} />
```

`animation={{ intro: { maxAnimatedGeoms } }}` (default `1500`) counts geoms across **all** layers — bar/point/tile layers one per observation, line/area layers one per series; above it the intro is skipped entirely.

## Gotchas

- Horizontal bars are `coord.flip()`, never a swapped mapping. `y` must stay numeric in every orientation; swapping the axes fails with `INCOMPATIBLE_TYPE`.
- Bar's default position is `dodge`, not `stack` — a multi-series bar with no `position` renders grouped bars.
- Wide data must go through `transform.reshape` before mapping `color` to the series; a long-form series column maps directly.
- With negative values use `position: 'identity'` so bars hang below the zero baseline instead of being position-adjusted.
- `stat: 'count'` supplies y itself — do not also map `y`, but still add `scale.y()`.
- A `width` outside `(0, 1]` renders with a substitute (`1` for anything above `1`, otherwise `0.7`) and an `INVALID_GEOM_PARAM` warning.
