# Combo (layered geoms)

A combo chart is just multiple geom layers in one spec. Each layer can carry its own `aes` mapping (merged over the spec-level mapping), its own `transforms` (applied to that layer's view of the data only), and its own y-axis binding (`yScaleType: 'primary' | 'secondary'`).

| Variant | Spec delta |
|---|---|
| Stacked bars + total line | `geom.bar` with a `transform.reshape` + `geom.line({ aes: { y: 'total', … }, yScaleType: 'secondary' })` |
| Bars + rate line (dual axis) | two single-column layers, line gets `yScaleType: 'secondary'` + `scale.ySecondary()` |
| Dodged bars + reference line (shared axis) | line layer omits `yScaleType` — both layers share the primary y scale |
| Area + threshold line | `geom.area` instead of `geom.bar`, line on the secondary axis |

## Base: stacked bars + total line

The bar layer reshapes three wide region columns into long rows. The line layer reads the pre-computed `total` column; `transform.constant` synthesizes a categorical series-label column and maps it to `color`, giving the line its own legend entry and palette color. The variable name is arbitrary — any name that doesn't collide with a data column key works.

```tsx
import { config, createSpec, geom, pipe, scale, transform } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const data = {
  columns: [{ key: 'month' }, { key: 'North' }, { key: 'South' }, { key: 'West' }, { key: 'total' }],
  rows: [
    { month: 'Jan', North: '$350', South: '$200', West: '$500', total: '$1050' },
    { month: 'Feb', North: '$300', South: '$250', West: '$350', total: '$900' },
    { month: 'Mar', North: '$400', South: '$300', West: '$300', total: '$1000' },
    { month: 'Apr', North: '$200', South: '$150', West: '$400', total: '$750' },
  ],
};

const input = pipe(
  createSpec({ x: 'month' }),
  geom.bar({
    transforms: [
      transform.reshape({ keep: ['month'], reshape: ['North', 'South', 'West'], keyName: 'region', valueName: 'sales' }),
    ],
    aes: { y: 'sales', color: 'region' },
    position: 'stack',
  }),
  geom.line({
    transforms: [transform.constant({ variableName: 'lineSeriesLabel', type: 'categorical', value: 'total' })],
    aes: { y: 'total', color: 'lineSeriesLabel' },
    yScaleType: 'secondary',
  }),
  scale.x(),
  scale.y(),
  scale.ySecondary(),
  scale.color.palette(),
  config({ axes: { y: { label: 'sales' } } })
);

export function RegionalSalesCombo() {
  return (
    <GraphProvider data={data} input={input}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Variants

Bars + rate line, dual axis — both layers read plain columns, each synthesizing a series label; different units ($ vs %) force the line onto the secondary axis:

```ts
geom.bar({
  transforms: [transform.constant({ variableName: 'barSeriesLabel', type: 'categorical', value: 'Revenue' })],
  aes: { y: 'Revenue', color: 'barSeriesLabel' },
}),
geom.line({
  transforms: [transform.constant({ variableName: 'lineSeriesLabel', type: 'categorical', value: 'Growth' })],
  aes: { y: 'Growth', color: 'lineSeriesLabel' },
  yScaleType: 'secondary',
}),
scale.ySecondary(),
```

Dodged bars + reference line, shared axis — same units, so the line simply omits `yScaleType` and rides the primary scale:

```ts
geom.bar({ /* reshape as above */ position: 'dodge' }),
geom.line({
  transforms: [transform.constant({ variableName: 'lineSeriesLabel', type: 'categorical', value: 'average' })],
  aes: { y: 'average', color: 'lineSeriesLabel' },
}),
```

Area + threshold line:

```ts
geom.area({ aes: { y: 'cumulative', color: 'areaSeriesLabel' }, transforms: [/* constant label */] }),
geom.line({ aes: { y: 'targetPct', color: 'lineSeriesLabel' }, yScaleType: 'secondary', transforms: [/* constant label */] }),
scale.ySecondary(),
```

## Dual axis vs shared axis

- **Secondary axis** (`yScaleType: 'secondary'` on the layer) when the overlay carries a different unit or magnitude ($ vs %, totals vs per-segment values). Each axis gets an independent domain.
- **Shared axis** (omit `yScaleType`) when both layers measure the same thing — e.g. an average or reference line over bars. A dual axis here would silently decouple the line from the bars it annotates.

## Gotchas

- The secondary y config key in `config()` is `axes.ySecondary` (a full axis config: `isVisible`, `label`, `position`, …) — there is no `hasDualYAxis` key in the viz-engine config.
- `scale.ySecondary()` is auto-injected when any layer declares `yScaleType: 'secondary'`, but add it explicitly (or use `scale.ySecondary.continuous({ … })`) when you want to control its domain.
- Map the synthesized constant column to `color` even for a single-series layer — without a `color` mapping the layer gets no legend entry and no palette slot.
- Layer `transforms` reshape only that layer's view of the data; the sibling layers still see the original wide columns (the total line reads `total` untouched while the bars see reshaped rows).
