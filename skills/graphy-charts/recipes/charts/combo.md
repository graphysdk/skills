# Combo graph

Use a combo graph when two measures share an x but need different geoms, or different units on two y axes.

Each layer picks its own y with a layer-local `aes`, and a layer can run its own transforms before it reads the data.

## Data

Wide data with one column per measure. Currency and percent strings are read as numbers with a format.

```ts
import type { Data } from '@graphysdk/react';

const revenueGrowthData: Data = {
  columns: [{ key: 'quarter' }, { key: 'Revenue' }, { key: 'Growth' }],
  rows: [
    { quarter: 'Q1', Revenue: '$12000', Growth: '5%' },
    { quarter: 'Q2', Revenue: '$15000', Growth: '25%' },
    { quarter: 'Q3', Revenue: '$14000', Growth: '-7%' },
    { quarter: 'Q4', Revenue: '$18500', Growth: '32%' },
    { quarter: 'Q5', Revenue: '$21000', Growth: '14%' },
    { quarter: 'Q6', Revenue: '$19500', Growth: '-7%' },
  ],
};
```

## Basic

Revenue bars on the left axis, growth line on the right axis.

```tsx
import { createSpec, geom, GraphProvider, GraphRenderer, pipe, scale, transform } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const revenueGrowthData: Data = {
  columns: [{ key: 'quarter' }, { key: 'Revenue' }, { key: 'Growth' }],
  rows: [
    { quarter: 'Q1', Revenue: '$12000', Growth: '5%' },
    { quarter: 'Q2', Revenue: '$15000', Growth: '25%' },
    { quarter: 'Q3', Revenue: '$14000', Growth: '-7%' },
    { quarter: 'Q4', Revenue: '$18500', Growth: '32%' },
    { quarter: 'Q5', Revenue: '$21000', Growth: '14%' },
    { quarter: 'Q6', Revenue: '$19500', Growth: '-7%' },
  ],
};

const spec = pipe(
  createSpec({ x: 'quarter' }),
  geom.bar({
    transforms: [transform.constant({ variableName: 'barLabel', type: 'categorical', value: 'Revenue' })],
    aes: { y: 'Revenue', color: 'barLabel' },
  }),
  geom.line({
    transforms: [transform.constant({ variableName: 'lineLabel', type: 'categorical', value: 'Growth' })],
    aes: { y: 'Growth', color: 'lineLabel' },
    yScaleType: 'secondary',
  }),
  scale.x(),
  scale.y(),
  scale.ySecondary(),
  scale.color.palette()
);

export function RevenueAndGrowth() {
  return (
    <GraphProvider data={revenueGrowthData} spec={spec}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

The constant transforms add a label column to each layer so each geom gets its own legend entry and colour. `yScaleType: 'secondary'` sends the line to the right axis, and `scale.ySecondary()` declares that axis.

## Variants

### Stacked bars with a total line

The bar layer reshapes the region columns to long form. The line reads the total on its own axis on the right.

```ts
import { createSpec, geom, pipe, scale, transform } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const regionalData: Data = {
  columns: [{ key: 'month' }, { key: 'North' }, { key: 'South' }, { key: 'West' }, { key: 'total' }],
  rows: [
    { month: 'Jan', North: 350, South: 200, West: 500, total: 1050 },
    { month: 'Feb', North: 300, South: 250, West: 350, total: 900 },
    { month: 'Mar', North: 400, South: 300, West: 300, total: 1000 },
    { month: 'Apr', North: 200, South: 150, West: 400, total: 750 },
  ],
};

const spec = pipe(
  createSpec({ x: 'month' }),
  geom.bar({
    transforms: [
      transform.reshape({ keep: ['month'], reshape: ['North', 'South', 'West'], keyName: 'region', valueName: 'sales' }),
    ],
    aes: { y: 'sales', color: 'region' },
    position: 'stack',
  }),
  geom.line({
    transforms: [transform.constant({ variableName: 'lineLabel', type: 'categorical', value: 'Total' })],
    aes: { y: 'total', color: 'lineLabel' },
    yScaleType: 'secondary',
  }),
  scale.x(),
  scale.y(),
  scale.ySecondary(),
  scale.color.palette()
);
```

### Grouped bars with an average line

Both layers share the left axis. The line reads a constant `average` column.

```ts
import { createSpec, geom, pipe, scale, transform } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const regionQuarterData: Data = {
  columns: [{ key: 'quarter' }, { key: 'North' }, { key: 'South' }, { key: 'West' }, { key: 'average' }],
  rows: [
    { quarter: 'Q1', North: 350, South: 200, West: 500, average: 350 },
    { quarter: 'Q2', North: 300, South: 250, West: 350, average: 300 },
    { quarter: 'Q3', North: 400, South: 300, West: 300, average: 333 },
    { quarter: 'Q4', North: 200, South: 150, West: 400, average: 250 },
  ],
};

const spec = pipe(
  createSpec({ x: 'quarter' }),
  geom.bar({
    transforms: [
      transform.reshape({ keep: ['quarter'], reshape: ['North', 'South', 'West'], keyName: 'region', valueName: 'sales' }),
    ],
    aes: { y: 'sales', color: 'region' },
    position: 'dodge',
  }),
  geom.line({
    transforms: [transform.constant({ variableName: 'lineLabel', type: 'categorical', value: 'Average' })],
    aes: { y: 'average', color: 'lineLabel' },
  }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

### Area with a target line on the secondary axis

```ts
import { createSpec, geom, pipe, scale, transform } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const cumulativeData: Data = {
  columns: [{ key: 'month' }, { key: 'cumulative' }, { key: 'targetPct' }],
  rows: [
    { month: 'Jan', cumulative: '$1200', targetPct: '80%' },
    { month: 'Feb', cumulative: '$3000', targetPct: '80%' },
    { month: 'Mar', cumulative: '$5400', targetPct: '80%' },
    { month: 'Apr', cumulative: '$7000', targetPct: '80%' },
  ],
};

const spec = pipe(
  createSpec({ x: 'month' }),
  geom.area({
    transforms: [transform.constant({ variableName: 'areaLabel', type: 'categorical', value: 'Cumulative' })],
    aes: { y: 'cumulative', color: 'areaLabel' },
  }),
  geom.line({
    transforms: [transform.constant({ variableName: 'lineLabel', type: 'categorical', value: 'Target %' })],
    aes: { y: 'targetPct', color: 'lineLabel' },
    yScaleType: 'secondary',
  }),
  scale.x(),
  scale.y(),
  scale.ySecondary(),
  scale.color.palette()
);
```

### Two currencies in one bar layer

Reshaping columns with different formats keeps each observation's own format, so tooltips show `$12,000` for USD bars and `€10,500` for EUR bars. A share line on the right axis keeps this a combo.

```ts
import { createSpec, geom, pipe, scale, transform } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const multiCurrencyData: Data = {
  columns: [{ key: 'quarter' }, { key: 'USD' }, { key: 'EUR' }, { key: 'Share' }],
  rows: [
    { quarter: 'Q1', USD: '$12,000', EUR: '€10,500', Share: '12%' },
    { quarter: 'Q2', USD: '$15,000', EUR: '€13,200', Share: '15%' },
    { quarter: 'Q3', USD: '$14,000', EUR: '€12,800', Share: '12%' },
    { quarter: 'Q4', USD: '$18,500', EUR: '€16,000', Share: '16%' },
  ],
};

const spec = pipe(
  createSpec({ x: 'quarter' }),
  geom.bar({
    transforms: [transform.reshape({ keep: ['quarter'], reshape: ['USD', 'EUR'], keyName: 'currency', valueName: 'revenue' })],
    aes: { y: 'revenue', color: 'currency' },
    position: 'dodge',
  }),
  geom.line({
    transforms: [transform.constant({ variableName: 'lineLabel', type: 'categorical', value: 'Share' })],
    aes: { y: 'Share', color: 'lineLabel' },
    yScaleType: 'secondary',
  }),
  scale.x(),
  scale.y(),
  scale.ySecondary(),
  scale.color.palette()
);
```

## Pitfalls

- Only x goes in `createSpec`. Each layer maps its own y in `aes`.
- `yScaleType: 'secondary'` on a layer is enough to get a right axis; an inferred `ySecondary` scale is added for you. Declare `scale.ySecondary()` yourself when you want to set its options.
- A layer with a single measure has no color mapping, so it gets no legend entry. The constant transform gives it one.
- Layer transforms run for that layer only. A spec-level transform runs for every layer.
