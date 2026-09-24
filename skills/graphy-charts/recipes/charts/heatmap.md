# Heatmap

Use a heatmap to show one value across two bands. Each cell is a tile, and the value rides the colour.

## Data

One row per cell, in long form: an x band, a y band, and the value.

```ts
import type { Data } from '@graphysdk/react';

const shippedData: Data = {
  columns: [{ key: 'team' }, { key: 'quarter' }, { key: 'shipped' }],
  rows: [
    { team: 'Alpha', quarter: 'Q1', shipped: 5 },
    { team: 'Alpha', quarter: 'Q2', shipped: 8 },
    { team: 'Alpha', quarter: 'Q3', shipped: 6 },
    { team: 'Alpha', quarter: 'Q4', shipped: 11 },
    { team: 'Beta', quarter: 'Q1', shipped: 2 },
    { team: 'Beta', quarter: 'Q2', shipped: 3 },
    { team: 'Beta', quarter: 'Q3', shipped: 6 },
    { team: 'Beta', quarter: 'Q4', shipped: 7 },
  ],
};
```

## Basic

```tsx
import { config, createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const shippedData: Data = {
  columns: [{ key: 'team' }, { key: 'quarter' }, { key: 'shipped' }],
  rows: [
    { team: 'Alpha', quarter: 'Q1', shipped: 5 },
    { team: 'Alpha', quarter: 'Q2', shipped: 8 },
    { team: 'Alpha', quarter: 'Q3', shipped: 6 },
    { team: 'Alpha', quarter: 'Q4', shipped: 11 },
    { team: 'Beta', quarter: 'Q1', shipped: 2 },
    { team: 'Beta', quarter: 'Q2', shipped: 3 },
    { team: 'Beta', quarter: 'Q3', shipped: 6 },
    { team: 'Beta', quarter: 'Q4', shipped: 7 },
  ],
};

const spec = pipe(
  createSpec({ x: 'quarter', y: 'team', color: 'shipped' }),
  geom.tile(),
  scale.x(),
  scale.y(),
  scale.color.continuous(),
  config({
    axes: { x: { label: 'Quarter', position: 'top' }, y: { label: 'Team', position: 'left' } },
    legend: { position: 'none' },
  })
);

export function ShippedHeatmap() {
  return (
    <GraphProvider data={shippedData} spec={spec}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

Tiles show their value as a data label by default. Turn it off with `geom.tile({ dataLabels: { showDataLabels: false } })`.

## Variants

### Named colour scheme

```ts
import { scale } from '@graphysdk/react';

const colorScale = scale.color.continuous({ scheme: 'viridis' });
```

### Custom colour range

Two or more stops. A range replaces the scheme.

```ts
import { scale } from '@graphysdk/react';

const colorScale = scale.color.continuous({ range: ['#f7fbff', '#08306b'] });
```

### Diverging values around zero

Pin the neutral colour to zero and balance the domain so equal magnitudes get equal intensity.

```ts
import { scale } from '@graphysdk/react';

const colorScale = scale.color.continuous({ scheme: 'RdBu', domainMid: 0, symmetric: true });
```

### Wide matrix from a spreadsheet

One column per x band needs a reshape before the mapping.

```ts
import { createSpec, geom, mapping, pipe, scale, transform } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const revenueData: Data = {
  columns: [{ key: 'product' }, { key: 'North' }, { key: 'South' }, { key: 'East' }, { key: 'West' }],
  rows: [
    { product: 'Coffee', North: 18, South: 12, East: 15, West: 9 },
    { product: 'Tea', North: 7, South: 11, East: 6, West: 14 },
    { product: 'Pastry', North: 22, South: 19, East: 12, West: 10 },
    { product: 'Sandwich', North: 14, South: 8, East: 17, West: 13 },
  ],
};

const spec = pipe(
  createSpec(),
  transform.reshape({ keep: ['product'], reshape: ['North', 'South', 'East', 'West'], keyName: 'region', valueName: 'revenue' }),
  mapping({ x: 'region', y: 'product', color: 'revenue' }),
  geom.tile(),
  scale.x(),
  scale.y(),
  scale.color.continuous()
);
```

### Percent strings

Values like `'86%'` are read as percentages and the colour ramp and labels follow.

### Sparse grid

Only rows that exist paint a tile. A missing cell stays empty, which keeps absent and zero apart.

### Waffle

The same tile geom with the value on a discrete colour scale. Each cell is one percentage point, and the grid indices are hidden.

```ts
import { config, createSpec, geom, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const channels = [
  { channel: 'Organic', share: 38, color: '#4c78a8' },
  { channel: 'Direct', share: 24, color: '#f58518' },
  { channel: 'Social', share: 18, color: '#54a24b' },
  { channel: 'Referral', share: 12, color: '#b279a2' },
  { channel: 'Paid', share: 8, color: '#e45756' },
];
const size = 10;
const indices = Array.from({ length: size }, (_unused, index) => index);
const cells = channels.flatMap((entry) => Array.from({ length: entry.share }, () => entry.channel));

const waffleData: Data = {
  columns: [{ key: 'col' }, { key: 'row' }, { key: 'channel' }],
  rows: cells.map((channel, index) => ({ col: Math.floor(index / size), row: size - 1 - (index % size), channel })),
};

const spec = pipe(
  createSpec({ x: 'col', y: 'row', color: 'channel' }),
  geom.tile({ dataLabels: { showDataLabels: false } }),
  scale.x.discrete({ domain: indices }),
  scale.y.discrete({ domain: indices }),
  scale.color.discrete({ domain: channels.map((entry) => entry.channel), range: channels.map((entry) => entry.color) }),
  config({ axes: { x: { isVisible: false }, y: { isVisible: false } }, legend: { position: 'right' } })
);
```

### Cell corner radius and borders

```ts
import { style, styles } from '@graphysdk/react';

const cellStyles = styles({ defaults: [style.geom.tile({ cornerRadius: 4, stroke: '#ffffff', strokeWidth: 2 })] });
```

`cornerRadius` on a tile is a pixel number, not a token.

## Pitfalls

- Both x and y are always bands under a tile, whatever the values. An explicit continuous scale is replaced by a band with a warning. Use `scale.x.discrete({ domain })` only to pin the order or the set of bands.
- The colour scale is inferred from the value. Declare `scale.color.continuous(...)` to pick a scheme, a range or a diverging midpoint.
- A diverging scheme only reads well when the data crosses zero. Use a sequential scheme otherwise.
