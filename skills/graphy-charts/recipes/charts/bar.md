# Bar graph

Use a bar graph to compare values across bands: products, regions, months treated as labels.

## Data

One row per observation. A band column for x and a numeric column for y.

```ts
import type { Data } from '@graphysdk/react';

const revenueData: Data = {
  columns: [{ key: 'product' }, { key: 'revenue' }],
  rows: [
    { product: 'Product A', revenue: 1200 },
    { product: 'Product B', revenue: 1800 },
    { product: 'Product C', revenue: 2400 },
    { product: 'Product D', revenue: 1600 },
    { product: 'Product E', revenue: 3200 },
    { product: 'Product F', revenue: 2800 },
  ],
};
```

## Basic

```tsx
import { createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const revenueData: Data = {
  columns: [{ key: 'product' }, { key: 'revenue' }],
  rows: [
    { product: 'Product A', revenue: 1200 },
    { product: 'Product B', revenue: 1800 },
    { product: 'Product C', revenue: 2400 },
    { product: 'Product D', revenue: 1600 },
  ],
};

const spec = pipe(createSpec({ x: 'product', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

export function RevenueBars() {
  return (
    <GraphProvider data={revenueData} spec={spec}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Variants

### Horizontal bars

Flip the coordinate system. The x band runs down the left side.

```ts
import { coord, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(createSpec({ x: 'product', y: 'revenue' }), geom.bar(), scale.x(), scale.y(), coord.flip());
```

### Grouped bars

Wide data (one column per group) needs a reshape first. Then map the new key column to color and set the position to dodge.

```ts
import { createSpec, geom, mapping, pipe, scale, transform } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const regionData: Data = {
  columns: [{ key: 'quarter' }, { key: 'North' }, { key: 'South' }, { key: 'West' }],
  rows: [
    { quarter: 'Q1', North: 350, South: 200, West: 500 },
    { quarter: 'Q2', North: 300, South: 250, West: 350 },
    { quarter: 'Q3', North: 400, South: 300, West: 300 },
    { quarter: 'Q4', North: 200, South: 150, West: 400 },
  ],
};

const toLong = transform.reshape({
  keep: ['quarter'],
  reshape: ['North', 'South', 'West'],
  keyName: 'region',
  valueName: 'sales',
});

const spec = pipe(
  createSpec(),
  toLong,
  mapping({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'dodge' }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

If the data is already long (one row per quarter and region), skip the reshape and map the group column to color directly.

### Stacked bars

Same data and mapping as grouped. Change the position.

```ts
import { geom } from '@graphysdk/react';

const layer = geom.bar({ position: 'stack' });
```

### Percent stacked bars

Every bar fills the full height and segments show shares.

```ts
import { geom } from '@graphysdk/react';

const layer = geom.bar({ position: 'fill' });
```

### Bar width and corner radius

Width is a fraction of the band. Corner rounding and borders are style declarations, not geom params.

```ts
import { createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'product', y: 'revenue' }),
  geom.bar({ params: { width: 0.5 } }),
  styles({ defaults: [style.geom.bar({ cornerRadius: 'md', stroke: '#1f2937', strokeWidth: 1 })] }),
  scale.x(),
  scale.y()
);
```

Corner radius tokens run from `'none'` through `'xl'`, plus `'full'` for pills. A pixel number also works.

### Data labels

```ts
import { geom } from '@graphysdk/react';

const layer = geom.bar({ position: 'stack', dataLabels: { showDataLabels: true, showStackTotals: true } });
```

Use `format: 'percentage'` on a filled stack to label shares instead of values.

### Sorted bars

Sort the observations before the geom reads them.

```ts
import { createSpec, geom, pipe, scale, transform } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'product', y: 'revenue' }),
  transform.sort({ variableName: 'revenue', direction: 'desc' }),
  geom.bar(),
  scale.x(),
  scale.y()
);
```

### Count of observations

When each row is one event, the count stat tallies rows per band. No y mapping is needed.

```ts
import { config, createSpec, geom, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const ordersData: Data = {
  columns: [{ key: 'orderType' }],
  rows: [
    { orderType: 'Online' },
    { orderType: 'Online' },
    { orderType: 'Online' },
    { orderType: 'Store' },
    { orderType: 'Store' },
    { orderType: 'Phone' },
  ],
};

const spec = pipe(
  createSpec({ x: 'orderType' }),
  geom.bar({ stat: 'count' }),
  scale.x(),
  scale.y(),
  config({ axes: { y: { label: 'Orders' } } })
);
```

### Negative values

Nothing special. Bars grow down from zero.

### Single bar

One observation draws one bar. `position: 'identity'` skips the dodge layout, which has nothing to lay out here anyway.

```ts
import { createSpec, geom, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const singleBarData: Data = {
  columns: [{ key: 'item' }, { key: 'amount' }],
  rows: [{ item: 'Revenue', amount: 42000 }],
};

const spec = pipe(createSpec({ x: 'item', y: 'amount' }), geom.bar({ position: 'identity' }), scale.x(), scale.y());
```

### Month names without a year

Short month names are read as dates, but a bar keeps them as bands. Two groups whose `Jan` rows fall in different years still share one `Jan` band and stack there.

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
  geom.bar({ position: 'stack' }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

## Pitfalls

- Declare `scale.x()` and `scale.y()`. Position scales are never created for you.
- The x axis under a bar is always a band, even for numeric or date columns. Declaring `scale.x.continuous()` under a bar gets replaced by a band with a warning. Use a point or line geom for a continuous x.
- Bars with several observations per band sit side by side by default. Use `position: 'stack'` to stack them.
- Borders use `stroke` and `strokeWidth` in `style.geom.bar`. There is no `borderColor` property.
