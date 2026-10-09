# Area graph

Use an area graph to show a total over time and how groups make it up.

## Data

One row per observation. Wide data with one column per group works after a reshape.

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

The point layer needs `position: 'stack'` too. Without it the markers sit at raw values, off the stacked edges.

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

Rows with `null` on y drop to zero by default. Use `'connect'` to bridge them. An area cannot show a gap, so `'gap'` is treated as `'zero'`.

```ts
import { geom } from '@graphysdk/react';

const connect = geom.area({ params: { missingValues: 'connect' } });
```

### Horizontal areas

```ts
import { coord, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.area(), scale.x(), scale.y(), coord.flip());
```

## Pitfalls

- Declare `scale.x()` and `scale.y()`. Position scales are never created for you.
- Area paint is `fill` and `fillAlpha` in `style.geom.area`. The built-in `fillAlpha` is 0.3. The outline uses `stroke`, `strokeWidth` and `strokeAlpha`.
- Stacking needs a `color` mapping. A single group with `position: 'stack'` is the same as a plain area.
- Short month names are read as dates and get a synthetic year, one sequence per group, counted from each group's first row. A group that starts in `Dec` puts its `Jan` in the next year; a group that starts in `Jan` stays in the first year. Their `Jan` values then sit a year apart and never stack. Give every group the same first month, or use full dates such as `'2025-12-01'`.
