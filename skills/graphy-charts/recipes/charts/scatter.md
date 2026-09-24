# Scatter and bubble

Use a scatter to show the relationship between two numeric variables. Map a third variable to size for a bubble graph.

## Data

One row per observation. Both x and y are numeric.

```ts
import type { Data } from '@graphysdk/react';

const bodyData: Data = {
  columns: [{ key: 'weight' }, { key: 'height' }, { key: 'group' }],
  rows: [
    { weight: 60, height: 160, group: 'A' },
    { weight: 65, height: 165, group: 'A' },
    { weight: 70, height: 175, group: 'B' },
    { weight: 75, height: 170, group: 'B' },
    { weight: 80, height: 180, group: 'B' },
    { weight: 55, height: 158, group: 'A' },
    { weight: 72, height: 172, group: 'B' },
    { weight: 62, height: 162, group: 'A' },
  ],
};
```

## Basic

```tsx
import { createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const bodyData: Data = {
  columns: [{ key: 'weight' }, { key: 'height' }],
  rows: [
    { weight: 60, height: 160 },
    { weight: 65, height: 165 },
    { weight: 70, height: 175 },
    { weight: 75, height: 170 },
    { weight: 80, height: 180 },
    { weight: 85, height: 178 },
    { weight: 90, height: 185 },
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

### Colour by group

```ts
import { createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'weight', y: 'height', color: 'group' }),
  geom.point(),
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

### Bubble: size by a third variable

Size alone needs a size scale. `scale.size.continuous()` also adds a legend of sized symbols.

```ts
import { createSpec, geom, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

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

### Bubble with colour

```ts
import { createSpec, geom, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

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
  scale.color.palette()
);
```

Every mapped visual aesthetic needs its scale: `scale.size.continuous()` here.

### Log scale

```ts
import { createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'gdp', y: 'lifeExpectancy' }),
  geom.point(),
  scale.x.log({ domainMin: 1000 }),
  scale.y()
);
```

### Marker size, symbol and border

```ts
import { createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'weight', y: 'height' }),
  geom.point(),
  styles({ defaults: [style.geom.point({ size: 10, symbol: 'diamond', stroke: '#111827', strokeWidth: 1 })] }),
  scale.x(),
  scale.y()
);
```

### Trend line

Add a second layer with the smooth stat.

```ts
import { createSpec, geom, pipe, scale, stat } from '@graphysdk/react';

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
import { coord, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(createSpec({ x: 'weight', y: 'height' }), geom.point(), scale.x(), scale.y(), coord.flip());
```

### Missing values

Rows with `null` on x or y are skipped.

## Pitfalls

- Declare `scale.x()` and `scale.y()`. Position scales are never created for you.
- A string x column becomes a band axis and the points line up in columns. Keep both axes numeric.
- `size` on a point is the marker diameter in pixels when set as a style. Mapped sizes go through `scale.size`.
- Two observations can share an x. Nothing is stacked or dodged for points.
