# Scatter / point charts

| Variant | Delta from base |
|---|---|
| Simple scatter | base recipe below |
| Color-grouped | map `color`, add `scale.color.palette()` |
| Bubble (size-mapped) | map `size`, add `scale.size.continuous()` |
| Size + color | map both, add both scales |
| Flipped | append `coord.flip()` |
| Fixed marker size | `styles({ defaults: [style.geom.point({ size: 12 })] })` |
| Stepped sizes | map `size`, add `scale.size.discrete({ range: [4, 8, 12] })` |
| Data labels | `geom.point({ dataLabels: { showDataLabels: true } })` — a bubble prints its mapped `size`; `offset` defaults to `4` (not `8` like line/area); unsupported under polar |
| Trend line | add `geom.line({ stat: stat.smooth({ method: 'linear' }), interactive: false })` over the same mapping — below |

## Base: simple scatter

```tsx
import { createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const data = {
  columns: [{ key: 'weight' }, { key: 'height' }],
  rows: [
    { weight: 60, height: 160 },
    { weight: 70, height: 175 },
    { weight: 80, height: 180 },
    { weight: 85, height: 178 },
    { weight: 90, height: 185 },
  ],
};

const input = pipe(createSpec({ x: 'weight', y: 'height' }), geom.point(), scale.x(), scale.y());

export function ScatterChart() {
  return (
    <GraphProvider data={data} input={input}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Color-grouped

```ts
// data rows carry a categorical column, e.g. { weight: 60, height: 160, gender: 'F' }
createSpec({ x: 'weight', y: 'height', color: 'gender' }),
geom.point(),
scale.x(),
scale.y(),
scale.color.palette(),
```

## Bubble (size mapped to a variable)

```ts
// e.g. { gdp: 2000, lifeExpectancy: 55, population: 200 }
createSpec({ x: 'gdp', y: 'lifeExpectancy', size: 'population' }),
geom.point(),
scale.x(),
scale.y(),
scale.size.continuous(),
```

## Size + color together

```ts
createSpec({ x: 'gdp', y: 'lifeExpectancy', size: 'population', color: 'continent' }),
geom.point(),
scale.x(),
scale.y(),
scale.size.continuous(),
scale.color.palette(),
```

## Flipped

```ts
// append after the scales
coord.flip()
```

## Trend line

A companion line layer with a `smooth` stat (`stat` is exported from `@graphysdk/viz-engine`) fits a regression over the same mapping; `interactive: false` keeps hover on the points:

```ts
geom.point(),
geom.line({ stat: stat.smooth({ method: 'linear' }), interactive: false }),
```

## Marker paint

`geom.point` takes no params — the marker is entirely a stylesheet target (`reference/styling.md`):

| Key | Type | Default | Notes |
|---|---|---|---|
| `size` | number (px) | `8` | marker diameter |
| `borderColor` | color | `token('hoverAffordance')` (`#ffffff`) | the white ring that keeps overlapping markers legible; redefining the token moves this ring and the hovered-bar outline together |
| `borderWidth` | number | `1` | |
| `color` / `alpha` / `saturation` | | | `alpha` below `1` is the usual fix for a dense cloud |

```ts
geom.point(),
styles({ defaults: [style.geom.point({ size: 12, alpha: 0.6, borderWidth: 0 })] }),
```

A mapped `size` sits above `defaults` in the cascade, so a `size` mapping wins over the entry above
and an `overrides` entry wins over the mapping.

The built-in look is token-backed — `styles({ tokens: { geom: '#0B5FFF', geomBorder: '#1A1A1A33', gridLine: '#E9E9E9', textPrimary: '#1A1A1A' } })` restyles the defaults with no entries.

`scale.size.continuous()`'s default range `[4, 20]` and `style.geom.point({ size })` are the **same diameter units** — the renderer halves once for the radius. `scale.size.discrete({ range: [4, 8, 12] })` and `scale.size.identity()` also exist; `alpha` is mappable too (`scale.alpha.continuous()`). Points render under `coord.polar` as radar vertex points (`recipes/charts/radar.md`).

## Intro animation

Markers pop in from zero radius, staggered. `staggerOrder` picks the order — `'main-axis'` (default,
reading order along x), `'value-ascending'` or `'value-descending'` (by mapped `size`, falling back to x):

```tsx
<GraphRenderer animation={{ intro: { staggerOrder: 'value-descending' } }} />
```

`animation={{ intro: { stagger: false } }}` pops every marker together; `animation={{ intro: { enabled: false } }}` disables the entrance. `animation={{ intro: { maxAnimatedGeoms } }}` (default `1500`) counts geoms across **all** layers — bar/point/tile layers one per observation, line/area layers one per series. Scatter is the chart that hits it: above the limit the intro is dropped wholesale, not degraded.

## Gotchas

- A mapped `size` needs `scale.size.continuous()`; the scale defaults to a sqrt transform so marker **area** (not diameter) tracks the value.
- A bubble layer's data label defaults to the `size` variable, not `y`; point labels default to `offset: 4` and warn `DATA_LABELS_UNSUPPORTED` under `coord.polar`.
- Point declares no `strokeWidth` aesthetic — a mapped `strokeWidth` warns `UNDECLARED_AESTHETIC` and is ignored.
- Observations with a `null` x or y are simply not drawn — no `missingValues` param on point.
