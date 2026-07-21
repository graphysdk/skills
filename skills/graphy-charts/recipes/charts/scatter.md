# Scatter / point charts

| Variant | Delta from base |
|---|---|
| Simple scatter | base recipe below |
| Color-grouped | map `color`, add `scale.color.palette()` |
| Bubble (size-mapped) | map `size`, add `scale.size.continuous()` |
| Size + color | map both, add both scales |
| Flipped | append `coord.flip()` |
| Fixed marker size | `geom.point({ params: { size: 12 } })` |

## Base: simple scatter

```tsx
import { createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import '@graphysdk/react-renderer/styles.css';

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

## Point params

`geom.point({ params: { size: number } })` — fixed marker diameter in pixels (default `8`). Use the param for a uniform size; use the `size` mapping + a size scale to encode a variable.

## Gotchas

- A mapped `size` needs `scale.size.continuous()`; the scale defaults to a sqrt transform so marker **area** (not diameter) tracks the value.
- `params.size` and a `size` mapping are different mechanisms — a fixed pixel size vs a data encoding; do not set both.
- Observations with a `null` x or y are simply not drawn — no `missingValues` param on point.
