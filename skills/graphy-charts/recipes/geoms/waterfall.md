# Waterfall

How a running total gets from its start to its end: one floating bar per change, colored by whether it adds or takes away, totals standing on zero, and a connector carrying the total from each bar to the next. Ships as `@graphysdk/geom-waterfall`; do not write a plugin for it. `variant: 'waterfall'` on a palette only swaps colors.

## Install

```bash
npm install @graphysdk/geom-waterfall
```

Peers: `@graphysdk/react` and React.

## Basic

One row per bar, in the order the total runs. Map the band to `x` and the change to `y`. Map `measure` to a column that marks the totals.

```tsx
import { waterfall } from '@graphysdk/geom-waterfall';
import { createGraphyKit, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const bridgeData: Data = {
  columns: [{ key: 'item' }, { key: 'amount', valueFormat: { type: 'currency', iso: 'usd' } }, { key: 'measure' }],
  rows: [
    { item: 'Revenue', amount: 1250, measure: 'absolute' },
    { item: 'Cost of sales', amount: -480 },
    { item: 'Gross profit', measure: 'total' },
    { item: 'Sales & marketing', amount: -210 },
    { item: 'R&D', amount: -175 },
    { item: 'Operating profit', measure: 'total' },
    { item: 'Other income', amount: 42 },
    { item: 'Tax', amount: -71 },
    { item: 'Net income', measure: 'total' },
  ],
};

const kit = createGraphyKit({ plugins: [waterfall] });

const spec = kit.pipe(
  kit.createSpec({ x: 'item', y: 'amount' }),
  kit.geom.waterfall({ aes: { measure: 'measure' } }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous()
);

export function ProfitBridge() {
  return (
    <kit.GraphProvider data={bridgeData} spec={spec}>
      <GraphRenderer />
    </kit.GraphProvider>
  );
}
```

Create the kit once at module scope. `kit.GraphProvider` shows "Made with Graphy" by default; `config({ content: { brandMark: { enabled: false } } })` turns it off. The value axis fits the running totals and holds zero. The total runs in data order: sort the rows, not the axis. A discrete `domain` that reorders the bands moves the bars but not the total.

### Measures

| Measure      | The bar                                                       |
| ------------ | ------------------------------------------------------------- |
| `'relative'` | Moves the running total by `y`. An empty cell reads the same. |
| `'total'`    | Draws the running total so far, from zero. `y` may be empty.  |
| `'absolute'` | Draws `y` from zero and sets the running total to it.         |

Without `measure`, every row is a step. Any other value is an error.

## Variants

### Horizontal

Add `kit.coord.flip()`.

### Running totals already in the data

Set the stat to `identity` and map `start` and `end` instead of `y`. `measure` still marks the totals.

```ts
const precomputedLayer = kit.geom.waterfall({
  stat: kit.stat.identity(),
  aes: { start: 'opening', end: 'closing', measure: 'measure' },
});
```

Under `identity`, a missing `start` or `end` is an error. Under the default stat, mapping either is an error.

### Bar width and connectors

```ts
const tunedLayer = kit.geom.waterfall({ aes: { measure: 'measure' }, params: { width: 0.6, connector: 'between' } });
```

`width` is the fraction of its band a bar spans, in `(0, 1]`, default `0.8`. Above `1` clamps; at or below `0` falls back; both warn. `connector` is `'spanning'` (default, across both bars along their edges) or `'between'` (across the gap only). Hide connectors with style: `kit.style.geom.waterfall.connector({ alpha: 0 })`.

### Data labels

```ts
const labeledLayer = kit.geom.waterfall({ aes: { measure: 'measure' }, dataLabels: { showDataLabels: true } });
```

Prints each bar's figure: the change for a step, the running total for a total. Under `position: 'auto'` the label sits past the end the bar lands on. `showStackTotals` and `showCategoryLabels` do nothing here.

### Styling

The bars are the observations. Each kind and the connector is a part. A chart-wide `style.geom()` does not recolour the bars.

```ts
import { styles } from '@graphysdk/react';

const styledSpec = kit.pipe(
  kit.createSpec({ x: 'item', y: 'amount' }),
  kit.geom.waterfall({ aes: { measure: 'measure' } }),
  styles({
    defaults: [
      kit.style.geom.waterfall({ fillAlpha: 0.85 }),
      kit.style.geom.waterfall.increase({ fill: '#7fb685' }),
      kit.style.geom.waterfall.decrease({ fill: '#d98a7e' }),
      kit.style.geom.waterfall.total({ fill: '#3a3833' }),
      kit.style.geom.waterfall.connector({ stroke: '#898373', dashArray: [3, 3] }),
    ],
  }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous()
);
```

| Builder                                | Properties                                    | Default                  |
| -------------------------------------- | --------------------------------------------- | ------------------------ |
| `kit.style.geom.waterfall()`           | `alpha`, `fillAlpha`, `strokeWidth`           | Opaque, no border        |
| `kit.style.geom.waterfall.increase()`  | `fill`, `stroke`                              | The positive trend color |
| `kit.style.geom.waterfall.decrease()`  | `fill`, `stroke`                              | The negative trend color |
| `kit.style.geom.waterfall.total()`     | `fill`, `stroke`                              | The neutral trend color  |
| `kit.style.geom.waterfall.connector()` | `stroke`, `alpha`, `strokeWidth`, `dashArray` | A 1px line               |

A connector entry's `where` is tested against the bar it leaves.

### Color through a scale

`color` is opt-in. Map it to `waterfallKind` for a legend. A mapped color replaces the kind parts' colors and their `defaults` entries; an `overrides` entry replaces the mapped color. Connectors keep their own color.

```ts
const legendSpec = kit.pipe(
  kit.createSpec({ x: 'item', y: 'amount' }),
  kit.geom.waterfall({ aes: { measure: 'measure', color: 'waterfallKind' } }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.scale.color.discrete({ domain: ['increase', 'decrease', 'total'], range: ['#2a9d8f', '#e76f51', '#264653'] })
);
```

### Columns the geom writes

`waterfallStart`, `waterfallEnd`, `waterfallKind` (`'increase'`, `'decrease'` or `'total'`) and `waterfallValue`. Name them in a `highlight` or a `where`: `highlight({ variable: 'waterfallKind', eq: 'total' })`. An absolute bar is a `'total'` kind; highlight on your `measure` column to pick it out. The tooltip lists the value and the running total.

## Pitfalls

- The x axis is always a band. Declare `kit.scale.x.discrete()`.
- `position` is always `'identity'`. Groups mapped through `group` each run their own total but overlap on the same bands.
- `y` must be numeric under the default stat.
- No polar coordinates.
- `plugins` are read once at mount. Keep the kit at module scope.
