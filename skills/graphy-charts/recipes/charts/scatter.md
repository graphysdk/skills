# Scatter / point charts

| Variant | Delta from base |
|---|---|
| Simple scatter | base recipe below |
| Color-grouped | map `color`, add `scale.color.palette()` |
| Bubble (size-mapped) | map `size`, add `scale.size.continuous()` |
| Size + color | map both, add both scales |
| Flipped | append `coord.flip()` |
| Fixed marker size | `styles({ defaults: [style.geom.point({ size: 12 })] })` |

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

## Marker paint

`geom.point` takes no params — the marker is entirely a stylesheet target (`reference/styling.md`):

| Key | Type | Default | Notes |
|---|---|---|---|
| `size` | number (px) | `8` | marker diameter |
| `borderColor` | color | `#ffffff` | the white ring that keeps overlapping markers legible |
| `borderWidth` | number | `1` | |
| `color` / `alpha` / `saturation` | | | `alpha` below `1` is the usual fix for a dense cloud |

```ts
geom.point(),
styles({ defaults: [style.geom.point({ size: 12, alpha: 0.6, borderWidth: 0 })] }),
```

A mapped `size` sits above `defaults` in the cascade, so a `size` mapping wins over the entry above
and an `overrides` entry wins over the mapping.

## Intro animation

Markers pop in from zero radius, staggered. `staggerOrder` picks the order — `'main-axis'` (default,
reading order along x), `'value-ascending'` or `'value-descending'` (by mapped `size`, falling back to x):

```tsx
<GraphRenderer animation={{ intro: { staggerOrder: 'value-descending' } }} />
```

`maxAnimatedGeoms` (default `1500`) counts geoms across **all** layers; above it the entrance is skipped.

## Gotchas

- A mapped `size` needs `scale.size.continuous()`; the scale defaults to a sqrt transform so marker **area** (not diameter) tracks the value.
- A bubble layer's data label defaults to the `size` variable, not `y`.
- Observations with a `null` x or y are simply not drawn — no `missingValues` param on point.
