# Funnel

How many of a starting count reach each stage: one bar per stage centered on a common line, as long as its count, with a band joining each bar to the next. Ships as `@graphysdk/geom-funnel`; do not write a plugin for it.

## Install

```bash
npm install @graphysdk/geom-funnel
```

Peers: `@graphysdk/react` and React.

## Basic

One row per stage, in the order the funnel runs. Map the stage to `x` and the count to `y`. `kit.coord.flip()` gives the classic funnel, first stage at the top. Hide the value axis: it measures from the center line.

```tsx
import { funnel } from '@graphysdk/geom-funnel';
import { createGraphyKit, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const checkoutData: Data = {
  columns: [{ key: 'stage' }, { key: 'visitors', valueFormat: { type: 'integer' } }],
  rows: [
    { stage: 'Visited', visitors: 48200 },
    { stage: 'Viewed product', visitors: 31400 },
    { stage: 'Added to cart', visitors: 12900 },
    { stage: 'Started checkout', visitors: 7600 },
    { stage: 'Paid', visitors: 5100 },
  ],
};

const kit = createGraphyKit({ plugins: [funnel] });

const spec = kit.pipe(
  kit.createSpec({ x: 'stage', y: 'visitors' }),
  kit.geom.funnel({ dataLabels: { showDataLabels: true } }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.coord.flip(),
  kit.config({ axes: { y: { isVisible: false } } })
);

export function Checkout() {
  return (
    <kit.GraphProvider data={checkoutData} spec={spec}>
      <GraphRenderer />
    </kit.GraphProvider>
  );
}
```

Create the kit once at module scope. `kit.GraphProvider` shows "Made with Graphy" by default; `config({ content: { brandMark: { enabled: false } } })` turns it off. The geom hides the grid lines itself. A stage with no count, or a negative one, draws no bar; its neighbors are joined across the gap.

## Variants

### Upright

Leave out `kit.coord.flip()`. Stages run left to right.

### Conversion

The default `funnel` stat writes two columns, formatted as percentages: `funnelPercentOfFirst` and `funnelPercentOfPrevious` (100% for the first stage). Map `label` to one to print it in the bars.

```ts
const conversionLayer = kit.geom.funnel({
  aes: { label: 'funnelPercentOfFirst' },
  dataLabels: { showDataLabels: true },
});
```

A label sits in the middle of its bar and moves past the bar's end when the bar is too short. An explicit `dataLabels.position` is honored as written.

Shares already in the data: set the stat to `identity` and map them.

```ts
const precomputedLayer = kit.geom.funnel({
  stat: kit.stat.identity(),
  aes: { percentOfFirst: 'ofFirst', percentOfPrevious: 'ofPrevious' },
});
```

Under the default stat, mapping either share is an error (`CONFLICTING_STAT_MAPPING`).

### Bar width

`width` is the fraction of its band a bar spans, in `(0, 1]`, default `0.7`. The rest is the gap the connector crosses. Above `1` clamps; at or below `0` falls back; both warn.

```ts
const narrowLayer = kit.geom.funnel({ params: { width: 0.5 } });
```

### Color per stage

Map `color` to the stage. Each connector takes the color of the stage it leaves.

```ts
const coloredSpec = kit.pipe(
  kit.createSpec({ x: 'stage', y: 'visitors', color: 'stage' }),
  kit.geom.funnel({ dataLabels: { showDataLabels: true } }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.scale.color.palette(),
  kit.coord.flip(),
  kit.config({ axes: { y: { isVisible: false } }, legend: { position: 'none' } })
);
```

### Styling

The bars are the observations. The connector is a part. A chart-wide `style.geom()` reaches the bars.

```ts
import { styles } from '@graphysdk/react';

const styledSpec = kit.pipe(
  kit.createSpec({ x: 'stage', y: 'visitors' }),
  kit.geom.funnel(),
  styles({
    defaults: [
      kit.style.geom.funnel({ fill: '#3a3833' }),
      kit.style.geom.funnel.connector({ fill: '#d8d3c4', fillAlpha: 1, stroke: '#898373', strokeWidth: 1 }),
    ],
  }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.coord.flip()
);
```

| Builder                             | Properties                                    | Default                   |
| ----------------------------------- | --------------------------------------------- | ------------------------- |
| `kit.style.geom.funnel()`           | The shared geom properties, and `strokeWidth` | The geom color, no border |
| `kit.style.geom.funnel.connector()` | `fill`, `fillAlpha`, `stroke`, `strokeWidth`  | The geom color at 25%     |

A connector entry's `where` is tested against the stage it leaves.

### Hover and highlight

The tooltip lists the count and both shares. A highlight raises each matched bar; connectors stay dimmed. `highlight({ variable: 'funnelPercentOfPrevious', lt: 0.5 })` picks the steep drops.

## Pitfalls

- The x axis is always a band. Declare `kit.scale.x.discrete()`.
- `position` is always `'identity'`.
- One row per stage. A stage that appears twice in one funnel is an error (`INVALID_DATA_SHAPE`). Several funnels: map `group`, but they overlap on the same bands.
- `y` must be numeric under the default stat.
- Hiding the value axis takes the `config` line; the geom does not hide it.
- No polar coordinates.
- `plugins` are read once at mount. Keep the kit at module scope.
