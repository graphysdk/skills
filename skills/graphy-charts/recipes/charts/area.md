# Area graph

Use an area graph to show a total over time and how groups make it up.

## Data

One row per point. Wide data with one column per group works with a reshape.

```ts
import type { Data } from '@graphysdk/react';

const regionData: Data = {
  columns: [{ key: 'month' }, { key: 'North' }, { key: 'South' }],
  rows: [
    { month: 'Jan', North: 300, South: 200 },
    { month: 'Feb', North: 400, South: 350 },
    { month: 'Mar', North: 350, South: 300 },
    { month: 'Apr', North: 500, South: 400 },
    { month: 'May', North: 450, South: 500 },
    { month: 'Jun', North: 600, South: 450 },
  ],
};
```

## Basic

A single area.

```tsx
import { createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const revenueData: Data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', revenue: 1200 },
    { month: 'Feb', revenue: 1800 },
    { month: 'Mar', revenue: 2400 },
    { month: 'Apr', revenue: 1600 },
    { month: 'May', revenue: 3200 },
    { month: 'Jun', revenue: 2800 },
  ],
};

const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.area(), scale.x(), scale.y());

export function RevenueArea() {
  return (
    <GraphProvider data={revenueData} spec={spec}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Variants

### Stacked areas

Areas stack by default when there is a color mapping. `transform.reshape()` with no options keeps the text and date columns and folds every numeric column into `key` and `value`.

```ts
import { createSpec, geom, mapping, pipe, scale, transform } from '@graphysdk/react';

const spec = pipe(
  createSpec(transform.reshape(), mapping({ x: 'month', y: 'value', color: 'key' })),
  geom.area(),
  geom.point({ position: 'stack', interactive: false }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

The point layer needs `position: 'stack'` too, so the markers sit on the stacked edges.

### Overlapping areas

Set the position to identity and lower the fill opacity so both groups stay visible.

```ts
import { createSpec, geom, mapping, pipe, scale, style, styles, transform } from '@graphysdk/react';

const spec = pipe(
  createSpec(transform.reshape(), mapping({ x: 'month', y: 'value', color: 'key' })),
  geom.area({ position: 'identity' }),
  styles({ defaults: [style.geom.area({ fillAlpha: 0.15 })] }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

### Percent stacked areas

```ts
import { geom } from '@graphysdk/react';

const layer = geom.area({ position: 'fill' });
```

### Smooth curve

```ts
import { geom } from '@graphysdk/react';

const layer = geom.area({ params: { curve: 'smooth' } });
```

### Missing values

Rows with `null` on y drop to zero by default. Use `'connect'` to bridge them instead. An area cannot show a gap, so `'gap'` is treated as `'zero'`.

```ts
import { geom } from '@graphysdk/react';

const connect = geom.area({ params: { missingValues: 'connect' } });
```

### Month names without a year

Short month names are read as dates. On the continuous time axis of an area, a group that starts in `Dec` and runs into `Jan` moves on to the next year, so groups covering different months do not stack on top of each other.

```ts
import { createSpec, geom, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const productData: Data = {
  columns: [{ key: 'month' }, { key: 'revenue' }, { key: 'product' }],
  rows: [
    { month: 'Dec', revenue: 100, product: 'Alpha' },
    { month: 'Jan', revenue: 120, product: 'Alpha' },
    { month: 'Feb', revenue: 280, product: 'Alpha' },
    { month: 'Jan', revenue: 90, product: 'Beta' },
    { month: 'Feb', revenue: 150, product: 'Beta' },
  ],
};

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue', color: 'product' }),
  geom.area(),
  geom.point({ position: 'stack', interactive: false }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

### Horizontal areas

```ts
import { coord, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.area(), scale.x(), scale.y(), coord.flip());
```

## Pitfalls

- Declare `scale.x()` and `scale.y()`. Position scales are never created for you.
- Area paint is `fill` and `fillAlpha` in `style.geom.area`. The outline uses `stroke`, `strokeWidth` and `strokeAlpha`.
- Stacking needs a `color` mapping. A single group with `position: 'stack'` is the same as a plain area.
