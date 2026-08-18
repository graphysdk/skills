# Combo (layered geoms)

A combo chart is just multiple geom layers in one spec. Each layer can carry its own `aes` mapping (merged over the spec-level mapping), its own `transforms` (applied to that layer's view of the data only), and its own y-axis binding (`yScaleType: 'primary' | 'secondary'`).

| Variant | Spec delta |
|---|---|
| Stacked bars + total line | `geom.bar` with a `transform.reshape` + `geom.line({ aes: { y: 'total', … }, yScaleType: 'secondary' })` |
| Bars + rate line (dual axis) | two single-column layers, line gets `yScaleType: 'secondary'` + `scale.ySecondary()` |
| Dodged bars + reference line (shared axis) | line layer omits `yScaleType` — both layers share the primary y scale |
| Area + threshold line | `geom.area` instead of `geom.bar`, line on the secondary axis |
| Constant reference line | `geom.rule({ aes: { y: { value: 2500 } } })` |
| Paint one layer differently | `geom.line({ id: 'total' })` + `style.geom.line({ … }, { layer: 'total' })` |

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

## Painting one layer

Give the layer an `id` and scope a stylesheet entry to it with `{ layer }` — the way to make the
overlay read differently from the marks beneath it without touching them (`reference/styling.md`):

```ts
geom.bar({ id: 'bars', position: 'stack', aes: { y: 'sales', color: 'region' } }),
geom.line({ id: 'total', aes: { y: 'total' }, yScaleType: 'secondary' }),
styles({
  overrides: [
    style.geom.line({ strokeWidth: 3, color: '#1e293b' }, { layer: 'total' }),
    style.geom.bar({ borderRadius: 'md' }, { layer: 'bars' }),
  ],
}),
```

An `overrides` entry beats the color scale, so the overlay does not need a synthesized series label
just to claim a palette slot. Keep the label when you also want the layer in the legend.

Constant reference line — `geom.rule` is the purpose-built geom. It reads a scalar from exactly one
of `x` or `y`, spans the panel, and is non-interactive:

```ts
geom.rule({ aes: { y: { value: 2500 } }, params: { label: 'Target', labelPosition: 'start' } }),
styles({ defaults: [style.geom.rule({ color: '#e5484d', strokeWidth: 2, lineType: 'dashed' })] }),
```

## Dual axis vs shared axis

- **Secondary axis** (`yScaleType: 'secondary'` on the layer) when the overlay carries a different unit or magnitude ($ vs %, totals vs per-segment values). Each axis gets an independent domain.
- **Shared axis** (omit `yScaleType`) when both layers measure the same thing — e.g. an average or reference line over bars. A dual axis here would silently decouple the line from the bars it annotates.

## Gotchas

- The secondary y config key in `config()` is `axes.ySecondary` — there is no `hasDualYAxis` key in the viz-engine config. It is a sparse override, not a resolved axis: an unset field is inherited (`position` from the side opposite `y`; `isVisible`, `grid` and `ticks` from `y` itself), and pinning one field ends that inheritance for it.
- `scale.ySecondary()` is auto-injected when any layer declares `yScaleType: 'secondary'`, but add it explicitly (or use `scale.ySecondary.continuous({ … })`) when you want to control its domain.
- Map the synthesized constant column to `color` even for a single-series layer — without a `color` mapping the layer gets no legend entry and no palette slot.
- Layer `transforms` reshape only that layer's view of the data; the sibling layers still see the original wide columns (the total line reads `total` untouched while the bars see reshaped rows).
- Each geom kind brings its own intro animation (bars grow, lines and areas wipe, points pop), tuned together by `animation` on `GraphRenderer`. `maxAnimatedGeoms` (default `1500`) counts geoms across **all** layers, so a combo reaches the skip threshold at a lower per-layer density than a single-layer chart.
