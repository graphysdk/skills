# Line graph

Use a line graph to show how a value changes over an ordered x, usually time.

## Data

One row per point on the line. Short month names, dates and ISO strings are all read as dates, so x becomes a time axis. Plain labels such as `'Q1'` become bands.

```ts
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
```

## Basic

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

const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.line(), scale.x(), scale.y());

export function RevenueLine() {
  return (
    <GraphProvider data={revenueData} spec={spec}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Variants

### Several groups

Wide data has one column per group. Reshape it to long form inside the spec, map the key column to color, and add a point layer for markers.

```ts
import { config, createSpec, geom, mapping, pipe, scale, transform } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const regionData: Data = {
  columns: [{ key: 'month' }, { key: 'North' }, { key: 'South' }, { key: 'East' }],
  rows: [
    { month: 'Jan', North: 600, South: 900, East: 1400 },
    { month: 'Feb', North: 700, South: 1050, East: 1600 },
    { month: 'Mar', North: 800, South: 1200, East: 1800 },
    { month: 'Apr', North: 900, South: 1350, East: 2000 },
    { month: 'May', North: 1000, South: 1500, East: 2200 },
    { month: 'Jun', North: 1100, South: 1650, East: 2400 },
  ],
};

const spec = pipe(
  createSpec(
    transform.reshape({ keep: ['month'], reshape: ['North', 'South', 'East'], keyName: 'region', valueName: 'sales' }),
    mapping({ x: 'month', y: 'sales', color: 'region' })
  ),
  geom.line(),
  geom.point({ interactive: false }),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  config({ legend: { position: 'top' } })
);
```

`interactive: false` on the point layer keeps hover on the line, so the tooltip is not doubled.

### Dashed and dotted lines per group

Map the group to `lineType` and give the scale an explicit domain and range.

```ts
import { createSpec, geom, mapping, pipe, scale, transform } from '@graphysdk/react';

const spec = pipe(
  createSpec(
    transform.reshape({ keep: ['month'], reshape: ['North', 'South', 'East'], keyName: 'region', valueName: 'sales' }),
    mapping({ x: 'month', y: 'sales', color: 'region', lineType: 'region' })
  ),
  geom.line(),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  scale.lineType.discrete({ domain: ['North', 'South', 'East'], range: ['solid', 'dashed', 'dotted'] })
);
```

### Smooth curve

```ts
import { geom } from '@graphysdk/react';

const layer = geom.line({ params: { curve: 'smooth' } });
```

### Fill under the line

The wash is a style declaration on the line geom.

```ts
import { createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.line(),
  styles({ defaults: [style.geom.line({ fillAlpha: 0.15 })] }),
  scale.x(),
  scale.y()
);
```

### Missing values

Rows with `null` on y can leave a gap (the default), connect across, or drop to zero.

```ts
import { geom } from '@graphysdk/react';

const gap = geom.line({ params: { missingValues: 'gap' } });
const connect = geom.line({ params: { missingValues: 'connect' } });
const zero = geom.line({ params: { missingValues: 'zero' } });
```

### Datetime x

Date values or ISO strings give a real time axis. Then `scale.x()` becomes datetime and ticks follow the calendar.

```ts
import { createSpec, geom, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const dailyData: Data = {
  columns: [{ key: 'day' }, { key: 'visits' }],
  rows: [
    { day: '2024-01-01', visits: 120 },
    { day: '2024-01-02', visits: 180 },
    { day: '2024-01-03', visits: 150 },
    { day: '2024-01-04', visits: 210 },
  ],
};

const spec = pipe(createSpec({ x: 'day', y: 'visits' }), geom.line(), scale.x.datetime(), scale.y());
```

### Horizontal

```ts
import { coord, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.line(), scale.x(), scale.y(), coord.flip());
```

### Fixed y domain

```ts
import { scale } from '@graphysdk/react';

const yScale = scale.y({ domainMin: 0 });
```

## Pitfalls

- Declare `scale.x()` and `scale.y()`. Position scales are never created for you.
- Several groups need a `color` mapping. Without it every row joins one line, which zigzags.
- Wide data must be reshaped before the mapping reads it. Put the reshape inside `createSpec(...)` or before `mapping(...)`.
- Line paint is `stroke` and `strokeWidth` in `style.geom.line`. `strokeAlpha` is the stroke opacity, `fillAlpha` the wash beneath, and `alpha` fades the whole geom.
