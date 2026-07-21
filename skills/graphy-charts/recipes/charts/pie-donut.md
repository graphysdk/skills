# Pie & donut

A pie is a stacked-to-100% bar bent around a circle: `geom.bar({ position: 'fill' })` + `coord.polar({ theta: 'y' })`, with an **empty x mapping** so every row lands in one column and each row becomes a slice. `color` carries the category.

| Variant | Spec delta |
|---|---|
| Pie | base below |
| Donut | `coord.polar({ theta: 'y', innerRadius: 0.55 })` |
| Slice borders | `geom.bar({ position: 'fill', params: { borderColor: '#fff', borderWidth: 2 } })` |
| Data labels on slices | `geom.bar({ position: 'fill', dataLabels: { showDataLabels: true, format: 'percentage', showCategoryLabels: true } })` |
| Headline total in the hole | donut + `config({ headline: { show: 'total', position: 'center' } })` |

## Base pie

```tsx
import { config, coord, createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const data = {
  columns: [{ key: 'department' }, { key: 'spend' }],
  rows: [
    { department: 'Engineering', spend: 420 },
    { department: 'Marketing', spend: 180 },
    { department: 'Sales', spend: 150 },
    { department: 'Operations', spend: 95 },
  ],
};

const input = pipe(
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
    <GraphProvider data={data} input={input}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Variants

Donut — hole radius is a fraction of the outer radius in `(0, 1)`:

```ts
coord.polar({ theta: 'y', innerRadius: 0.55 })
```

Slice borders — also separates adjacent slices; border only drawn when `borderColor` is set:

```ts
geom.bar({ position: 'fill', params: { borderColor: '#ffffff', borderWidth: 2 } })
```

Data labels on slices — `format: 'percentage'` divides each value by the layer total (sum of absolute values, so negative slices don't shrink the denominator); `showCategoryLabels: true` prepends the category ("Engineering · 42.0%"):

```ts
geom.bar({
  position: 'fill',
  dataLabels: { showDataLabels: true, format: 'percentage', showCategoryLabels: true },
})
```

Headline number in the donut hole — on a polar chart `show: 'total'` compiles to a single grand total (signed sum of `y`); `position: 'center'` places it inside the hole:

```ts
coord.polar({ theta: 'y', innerRadius: 0.55 }),
// …
config({ headline: { show: 'total', position: 'center' } })
```

## Gotchas

- Keep `x: ''` in the mapping and still add `scale.x()` and `scale.y()`. With no x variable all rows share one band, and `position: 'fill'` turns them into proportional slices.
- The headline grand total only exists for `show: 'total'` and only on non-`stack` layers — the pie's `fill` position qualifies. `position: 'center'` overlays the hole only when `innerRadius > 0`; on a plain pie it falls back to the strip above the chart.
- A temporal `color` column (e.g. one `Date` per month) works: each distinct value becomes its own slice even though the values form no categorical group.
- Under `coord.polar` the compiler zeroes discrete-scale padding automatically — do not try to tune band padding for slice gaps; use `borderColor`/`borderWidth` instead.
