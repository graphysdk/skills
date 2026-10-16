# Scatter and bubble

Use a scatter to show the relationship between two numeric variables. Map a third variable to size for a bubble graph.

## Basic

One row per observation: both x and y are numeric.

```tsx
import { createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const bodyData: Data = {
  columns: [{ key: 'weight' }, { key: 'height' }, { key: 'group' }],
  rows: [
    { weight: 60, height: 160, group: 'A' },
    { weight: 65, height: 165, group: 'A' },
    { weight: 70, height: 175, group: 'B' },
    { weight: 75, height: 170, group: 'B' },
    { weight: 80, height: 180, group: 'B' },
    { weight: 85, height: 178, group: 'B' },
    { weight: 90, height: 185, group: 'A' },
  ],
};

const spec = pipe(createSpec({ x: 'weight', y: 'height' }), geom.point(), scale.x(), scale.y());

export function HeightByWeight() {
  return (
    <GraphProvider data={bodyData} spec={spec}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Variants

### Color by group

```ts
const spec = pipe(
  createSpec({ x: 'weight', y: 'height', color: 'group' }),
  geom.point(),
  scale.x(),
  scale.y(),
  scale.color.discrete()
);
```

### Bubble: size by a third variable

A size mapping needs a size scale. `scale.size.continuous()` uses a square-root transform, so bubble area tracks the value. It adds a legend of two sized pills, the smallest and largest value.

```ts
const gdpData: Data = {
  columns: [{ key: 'gdp' }, { key: 'lifeExpectancy' }, { key: 'population' }],
  rows: [
    { gdp: 2000, lifeExpectancy: 55, population: 200 },
    { gdp: 5000, lifeExpectancy: 60, population: 50 },
    { gdp: 10000, lifeExpectancy: 65, population: 300 },
    { gdp: 25000, lifeExpectancy: 75, population: 30 },
    { gdp: 40000, lifeExpectancy: 80, population: 60 },
  ],
};

const bubbleSpec = pipe(
  createSpec({ x: 'gdp', y: 'lifeExpectancy', size: 'population' }),
  geom.point(),
  scale.x(),
  scale.y(),
  scale.size.continuous()
);
```

### Bubble with color

```ts
const countryData: Data = {
  columns: [{ key: 'gdp' }, { key: 'lifeExpectancy' }, { key: 'population' }, { key: 'continent' }],
  rows: [
    { gdp: 2000, lifeExpectancy: 55, population: 200, continent: 'Africa' },
    { gdp: 5000, lifeExpectancy: 60, population: 50, continent: 'Asia' },
    { gdp: 10000, lifeExpectancy: 65, population: 300, continent: 'Asia' },
    { gdp: 15000, lifeExpectancy: 70, population: 100, continent: 'Europe' },
    { gdp: 25000, lifeExpectancy: 75, population: 30, continent: 'Europe' },
    { gdp: 40000, lifeExpectancy: 80, population: 60, continent: 'Europe' },
    { gdp: 8000, lifeExpectancy: 62, population: 180, continent: 'Americas' },
  ],
};

const spec = pipe(
  createSpec({ x: 'gdp', y: 'lifeExpectancy', size: 'population', color: 'continent' }),
  geom.point(),
  scale.x(),
  scale.y(),
  scale.size.continuous(),
  scale.color.discrete()
);
```

Every mapped visual aesthetic needs its scale: `scale.size.continuous()` and `scale.color.discrete()` here.

### Log scale

```ts
const spec = pipe(
  createSpec({ x: 'gdp', y: 'lifeExpectancy' }),
  geom.point(),
  scale.x.log({ domainMin: 1000 }),
  scale.y()
);
```

### Marker size, symbol and border

```ts
const spec = pipe(
  createSpec({ x: 'weight', y: 'height' }),
  geom.point(),
  styles({ defaults: [style.geom.point({ size: 10, symbol: 'diamond', stroke: '#111827', strokeWidth: 1 })] }),
  scale.x(),
  scale.y()
);
```

Symbols: `'circle'`, `'square'`, `'diamond'`, `'triangle'`, `'cross'`, `'star'`, `'wye'`.

### Trend line

Add a second layer with the smooth stat.

```ts
const spec = pipe(
  createSpec({ x: 'weight', y: 'height' }),
  geom.point(),
  geom.line({ stat: stat.smooth({ method: 'linear' }), interactive: false }),
  scale.x(),
  scale.y()
);
```

### Flipped axes

```ts
const spec = pipe(createSpec({ x: 'weight', y: 'height' }), geom.point(), scale.x(), scale.y(), coord.flip());
```

### Missing values

Rows with `null` on x or y are skipped.

## Pitfalls

- Declare `scale.x()` and `scale.y()`. Position scales are never created for you.
- A string x column becomes a band axis and the points line up in columns. Keep both axes numeric.
- `size` in `style.geom.point` is the marker diameter in pixels, default 8. Mapped sizes go through `scale.size`.
- On a bubble graph a `defaults` entry for `size` is ignored, because the mapping decides it. Put the entry in `overrides` to replace mapped sizes.
- Two observations can share an x. Nothing is stacked or dodged for points.
- Mapped `size` and `label` do not appear in the default tooltip. The heading is the x value; the rows are the color group and y. Add a row with `geom.point({ tooltip: { size: true } })`.
