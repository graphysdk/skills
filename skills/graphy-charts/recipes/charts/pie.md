# Pie and donut

Use a pie to show how a whole splits into a few parts. A donut is a pie with a hole.

A pie is a bar geom in polar coordinates: one filled stack, with the angle carrying the value.

## Data

One row per slice.

```ts
import type { Data } from '@graphysdk/react';

const budgetData: Data = {
  columns: [{ key: 'department' }, { key: 'spend' }],
  rows: [
    { department: 'Engineering', spend: 420 },
    { department: 'Marketing', spend: 180 },
    { department: 'Sales', spend: 150 },
    { department: 'Operations', spend: 95 },
    { department: 'HR', spend: 80 },
    { department: 'Legal', spend: 75 },
  ],
};
```

## Basic

```tsx
import { config, coord, createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const budgetData: Data = {
  columns: [{ key: 'department' }, { key: 'spend' }],
  rows: [
    { department: 'Engineering', spend: 420 },
    { department: 'Marketing', spend: 180 },
    { department: 'Sales', spend: 150 },
    { department: 'Operations', spend: 95 },
    { department: 'HR', spend: 80 },
    { department: 'Legal', spend: 75 },
  ],
};

const spec = pipe(
  createSpec({ x: '', y: 'spend', color: 'department' }),
  geom.bar({ position: 'fill' }),
  coord.polar({ theta: 'y' }),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  config({ legend: { position: 'right' } })
);

export function BudgetPie() {
  return (
    <GraphProvider data={budgetData} spec={spec}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

The empty x mapping puts every slice in one stack. `position: 'fill'` makes the stack span the full circle. `theta: 'y'` sends the value to the angle.

## Variants

### Donut

Give the polar coordinate an inner radius as a fraction of the outer radius.

```ts
import { coord } from '@graphysdk/react';

const donut = coord.polar({ theta: 'y', innerRadius: 0.55 });
```

### Slice borders

```ts
import { style, styles } from '@graphysdk/react';

const sliceBorders = styles({ defaults: [style.geom.bar({ stroke: '#ffffff', strokeWidth: 2 })] });
```

### Percent labels on slices

```ts
import { geom } from '@graphysdk/react';

const layer = geom.bar({ position: 'fill', dataLabels: { showDataLabels: true, format: 'percentage' } });
```

### Headline number in the donut hole

Turn on the headline with the centre position. It sits in the hole only when the coordinate has an inner radius. The default position is above the graph.

```ts
import { config, coord } from '@graphysdk/react';

const donut = coord.polar({ theta: 'y', innerRadius: 0.55 });
const headline = config({ headline: { show: 'total', position: 'center' } });
```

### Start angle

`startAngle` is in degrees.

```ts
import { coord } from '@graphysdk/react';

const rotated = coord.polar({ theta: 'y', startAngle: 90 });
```

### Slices from dates

A date column on color still gives one slice per row. The legend shows the formatted dates.

```ts
import { coord, createSpec, geom, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const monthlySalesData: Data = {
  columns: [{ key: 'month' }, { key: 'sales' }],
  rows: [
    { month: new Date('2024-01-01'), sales: 32 },
    { month: new Date('2024-02-01'), sales: 28 },
    { month: new Date('2024-03-01'), sales: 35 },
    { month: new Date('2024-04-01'), sales: 41 },
  ],
};

const spec = pipe(
  createSpec({ x: '', y: 'sales', color: 'month' }),
  geom.bar({ position: 'fill' }),
  coord.polar({ theta: 'y' }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

## Pitfalls

- Keep `x: ''`. A real x mapping splits the data into several concentric tracks, one per band.
- `position: 'fill'` is what closes the circle. With `'stack'` the value axis is rounded to a nice number, so the slices stop short of a full turn unless the total happens to be round.
- Both `scale.x()` and `scale.y()` are still required in polar coordinates.
- Slice paint lives in `style.geom.bar`, since a slice is a bar.
