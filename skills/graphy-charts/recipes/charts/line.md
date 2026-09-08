# Line charts

| Variant | Delta from base |
|---|---|
| Simple | base recipe below |
| Multi-series | `transform.reshape` wide→long, map `color`, add `scale.color.palette()` |
| Per-series dash patterns | also map `lineType`, add `scale.lineType.discrete({ domain, range })` |
| Smooth | `geom.line({ params: { interpolate: 'catmull-rom' } })` |
| Missing values | `geom.line({ params: { missingValues: 'gap' \| 'connect' \| 'zero' } })` |
| Vertex points | add a companion layer `geom.point({ interactive: false })` |
| Fill beneath the line | `styles({ defaults: [style.geom.line({ fillAlpha: 0.15 })] })` |
| One series painted differently | `geom.line({ id: 'trend' })` + `style.geom.line({ … }, { layer: 'trend' })` |
| Trend overlay | second `geom.line({ stat: stat.smooth({ method: 'linear' }), interactive: false })` |
| Radar | append `coord.polar({ theta: 'x' })` — `recipes/charts/radar.md` |

## Base: simple line

```tsx
import { createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', revenue: 1200 },
    { month: 'Feb', revenue: 1800 },
    { month: 'Mar', revenue: 2400 },
    { month: 'Apr', revenue: 1600 },
    { month: 'May', revenue: 3200 },
  ],
};

const input = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.line(), scale.x(), scale.y());

export function LineChart() {
  return (
    <GraphProvider data={data} input={input}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

`createSpec({ x, y })` is shorthand for `createSpec()` + `mapping({ x, y })`.

## Multi-series (wide data)

```ts
const wideData = {
  columns: [{ key: 'month' }, { key: 'North' }, { key: 'South' }, { key: 'East' }],
  rows: [
    { month: 'Jan', North: 600, South: 900, East: 1400 },
    { month: 'Feb', North: 700, South: 1050, East: 1600 },
    { month: 'Mar', North: 800, South: 1200, East: 1800 },
  ],
};

const input = pipe(
  createSpec(
    transform.reshape({ keep: ['month'], reshape: ['North', 'South', 'East'], keyName: 'region', valueName: 'sales' }),
    mapping({ x: 'month', y: 'sales', color: 'region' })
  ),
  geom.line(),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  config({ legend: { position: 'top' } })
);
```

## Per-series dash patterns

Map `lineType` to the series variable and pin the pattern per series with a discrete scale:

```ts
mapping({ x: 'month', y: 'sales', color: 'region', lineType: 'region' }),
geom.line(),
scale.color.palette(),
scale.lineType.discrete({ domain: ['North', 'South', 'East'], range: ['solid', 'dashed', 'dotted'] }),
```

## Smooth interpolation

```ts
geom.line({ params: { interpolate: 'catmull-rom' } }) // default 'linear'
```

## Missing values

For rows where y is `null`:

```ts
geom.line({ params: { missingValues: 'gap' } })     // break the path at nulls (default)
geom.line({ params: { missingValues: 'connect' } }) // drop nulls, span the gap
geom.line({ params: { missingValues: 'zero' } })    // substitute zero
```

## Vertex points

Add a point layer that reuses the spec-level mapping; `interactive: false` keeps hover hit-detection on the line:

```ts
geom.line(),
geom.point({ interactive: false }),
```

## Trend overlay

A second line layer with a `smooth` stat draws a regression over the data (`stat` is exported from `@graphysdk/viz-engine`). A non-numeric **y** raises `INCOMPATIBLE_TYPE`; a categorical x is ranked in data order and a temporal x rebased to days. Methods: `'linear' | 'loess' | 'exponential' | 'logarithmic' | 'quadratic' | 'power' | 'polynomial'`, with `order` (default `3`, polynomial only) and `bandwidth` (default `0.3`, loess only). Output: a discrete x emits one fitted point per category; a continuous/datetime x emits the sampled curve (a linear fit is two endpoints):

```ts
geom.line(),
geom.line({ id: 'trend', stat: stat.smooth({ method: 'linear' }), interactive: false }),
styles({ overrides: [style.geom.line({ lineType: 'dashed' }, { layer: 'trend' })] }),
```

## Geometry and paint

`params` carries the path geometry; the stylesheet carries the paint (`reference/styling.md`).

| Surface | Key | Type | Default | Notes |
|---|---|---|---|---|
| `geom.line({ params })` | `interpolate` | `'linear' \| 'catmull-rom'` | `'linear'` | d3 curve family |
| `geom.line({ params })` | `missingValues` | `'gap' \| 'connect' \| 'zero'` | `'gap'` | see above |
| `style.geom.line` | `strokeWidth` | number (px) | `2` | |
| `style.geom.line` | `lineType` | `'solid' \| 'dashed' \| 'dotted'` | `'solid'` | |
| `style.geom.line` | `fillAlpha` | `0..1` | unset | peak opacity of the gradient wash beneath the path; undeclared draws no wash. Cartesian/flipped lines only — inert on a radar |
| `style.geom.line` | `color` / `alpha` / `saturation` | | | `alpha` is the stroke's opacity, independent of `fillAlpha` |

```ts
geom.line({ params: { interpolate: 'catmull-rom' } }),
styles({ defaults: [style.geom.line({ strokeWidth: 3, fillAlpha: 0.15 })] }),
```

Scope an entry to one series by giving the layer an id:

```ts
geom.line({ id: 'trend' }),
styles({ overrides: [style.geom.line({ strokeWidth: 4, lineType: 'dashed' }, { layer: 'trend' })] }),
```

The built-in look is token-backed — `styles({ tokens: { geom: '#0B5FFF', geomBorder: '#1A1A1A33', gridLine: '#E9E9E9', textPrimary: '#1A1A1A' } })` restyles the defaults with no entries.

`strokeWidth`, `lineType` and `alpha` are also mappable aesthetics — `scale.strokeWidth.continuous({ range: [1, 6] })`, `scale.lineType.discrete({ … })`, `scale.alpha.continuous({ … })`. Default ranges: `strokeWidth` `[1, 4]`, `alpha` `[0.1, 1]`, `size` `[4, 20]` (for a companion point layer).

Line's default position is `identity`. Data labels: `geom.line({ dataLabels: { showDataLabels: true } })`, offset `8` px from the vertex; under `coord.polar` they warn `DATA_LABELS_UNSUPPORTED` and render nothing.

## Intro animation

On mount, under cartesian or flipped coords, the layer is revealed by a wipe travelling along the
main axis; every series in the layer enters together. A polar line (radar) has no entrance. The
renderer's `animation` prop tunes it:

```tsx
<GraphRenderer animation={{ intro: { durationScale: 0.5 } }} />
```

`animation={{ intro: { maxAnimatedGeoms } }}` (default `1500`) counts geoms across **all** layers — bar/point/tile layers one per observation, line/area layers one per series; above it the intro is skipped entirely.

## Gotchas

- Month-name columns like the base data's `'Jan'` parse as temporal, so `scale.x()` infers a datetime scale; `scale.x.discrete()` keeps them as categories.
- Wide data needs `transform.reshape` before `color` (or `lineType`) can map to the series variable.
- `lineType` scales are discrete-only — mapping `lineType` to a numeric variable errors at compile time. Valid range values: `'solid' | 'dashed' | 'dotted'`.
- A mapped `alpha` dims the stroke; the wash beneath it follows `fillAlpha`, so the two are set separately.
- Companion point layers should set `interactive: false` so they do not compete with the line in hover hit-detection.
