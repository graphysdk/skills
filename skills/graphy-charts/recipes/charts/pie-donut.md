# Pie & donut

A pie is a stacked-to-100% bar bent around a circle: `geom.bar({ position: 'fill' })` + `coord.polar({ theta: 'y' })`, with an **empty x mapping** so every row lands in one column and each row becomes a slice. `color` carries the category.

| Variant | Spec delta |
|---|---|
| Pie | base below |
| Donut | `coord.polar({ theta: 'y', innerRadius: 0.55 })` |
| Rotated start | `coord.polar({ theta: 'y', startAngle: -90 })` — first slice begins at the given angle in degrees (default `0`) |
| Slice borders | `styles({ defaults: [style.geom.bar({ borderColor: '#fff', borderWidth: 2 })] })` |
| Rounded wedges | `styles({ defaults: [style.geom.bar({ borderRadius: 'md' })] })` |
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

Every pie from this snippet is a single-hue ramp: with no `palette` option `scale.color.palette()` resolves `{ type: 'default' }`, and on a chart whose geoms touch (every pie, stacked/filled bars or areas, tiles) that always resolves to the `brick` mono ramp — the 8-color default set is unreachable. Escape hatches: `scale.color.palette({ palette: { type: 'graphy' } })` (the 10-color Graphy brand palette, a different hue set), `{ type: 'pastel' }` or `{ type: 'custom', id }`; `scale.color.palette({ overrides: { 1: { hex: '#FF5A5F' } } })` recolors one slice (1-indexed group).

## Variants

Donut — hole radius is a fraction of the outer radius in `(0, 1)`:

```ts
coord.polar({ theta: 'y', innerRadius: 0.55 })
```

Slice borders — on by default (`borderColor: token('geomBorder')`, `borderWidth: 1`); this entry swaps in another color/width, and `borderWidth: 0` removes them:

```ts
geom.bar({ position: 'fill' }),
styles({ defaults: [style.geom.bar({ borderColor: '#ffffff', borderWidth: 2 })] }),
```

Rounded wedges — `borderRadius` is a token (`'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`, default `'sm'`) and rounds the corners of each wedge; `'full'` rounds to half the wedge's cross-axis thickness — radial here, since `theta: 'y'`:

```ts
geom.bar({ position: 'fill' }),
styles({ defaults: [style.geom.bar({ borderRadius: 'md' })] }),
```

Data labels on slices — `format: 'percentage'` is already the default for a polar bar layer; it divides each value by the layer total (sum of absolute values, so negative slices don't shrink the denominator — the denominator exists only for non-stacked layers); `showCategoryLabels: true` prepends the category ("Engineering · 42.0%"). `position: 'outside'` is kept under polar, but an outside label crossing the footer band is dropped; the panel-edge `justify` values are coerced back with `DATA_LABEL_PLACEMENT_COERCED`, and `showStackTotals` warns `DATA_LABEL_SETTING_IGNORED`:

```ts
geom.bar({
  position: 'fill',
  dataLabels: { showDataLabels: true, format: 'percentage', showCategoryLabels: true },
})
```

Headline number in the donut hole — on a polar chart only `show: 'total'` renders, compiling to a single grand total (signed sum of `y`); `'average'`/`'current'` silently give no headline. `position: 'center'` places it inside the hole:

```ts
coord.polar({ theta: 'y', innerRadius: 0.55 }),
// …
config({ headline: { show: 'total', position: 'center' } })
```

## Intro animation

On mount the ring sweeps open from `startAngle` on one shared clock — slices enter in visual order,
not staggered. The renderer's `animation` prop tunes it:

```tsx
<GraphRenderer animation={{ intro: { durationScale: 0.5 } }} />
```

`animation={{ intro: { maxAnimatedGeoms } }}` (default `1500`) counts geoms across **all** layers — one per observation for bar/point/tile layers, one per series for line/area; above it the entrance is skipped.

## Gotchas

- Keep `x: ''` in the mapping and still add `scale.x()` and `scale.y()`. With no x variable all rows share one band, and `position: 'fill'` turns them into proportional slices.
- The headline grand total only exists for `show: 'total'` and only on non-`stack` layers — the pie's `fill` position qualifies. `position: 'center'` overlays the hole only when `innerRadius > 0`; on a plain pie it falls back to the strip above the chart.
- Pie and donut draw no axes, so `config({ axes })` is inert here.
- A temporal `color` column (e.g. one `Date` per month) works: each distinct value becomes its own slice even though the values form no categorical group.
- Under `coord.polar` the compiler zeroes discrete-scale padding automatically — do not try to tune band padding for slice gaps; use `style.geom.bar({ borderColor, borderWidth })` instead.
