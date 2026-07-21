# Area charts

| Variant | Delta from base |
|---|---|
| Simple | base recipe below |
| Stacked | `transform.reshape` wide→long, map `color`, add `scale.color.palette()` (stack is area's default position) |
| Flipped | append `coord.flip()` |
| Smooth | `geom.area({ params: { interpolate: 'catmull-rom' } })` |
| Missing values | `geom.area({ params: { missingValues: 'zero' \| 'connect' } })` |
| Vertex dots | add `geom.point({ position: 'stack', interactive: false })` |

## Base: simple area

```tsx
import { createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import '@graphysdk/react-renderer/styles.css';

const data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', revenue: 1200 },
    { month: 'Feb', revenue: 1800 },
    { month: 'Mar', revenue: 2400 },
    { month: 'Apr', revenue: 1600 },
    { month: 'May', revenue: 3200 },
  ],
};

const input = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.area(), scale.x(), scale.y());

export function AreaChart() {
  return (
    <GraphProvider data={data} input={input}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Stacked (wide data)

`transform.reshape()` with no options collapses all numeric columns into `key`/`value` and keeps the categorical/temporal columns:

```ts
const wideData = {
  columns: [{ key: 'month' }, { key: 'North' }, { key: 'South' }],
  rows: [
    { month: 'Jan', North: 300, South: 200 },
    { month: 'Feb', North: 400, South: 350 },
    { month: 'Mar', North: 350, South: 300 },
  ],
};

const input = pipe(
  createSpec(transform.reshape(), mapping({ x: 'month', y: 'value', color: 'key' })),
  geom.area(), // default position is 'stack' — no need to pass it
  geom.point({ position: 'stack', interactive: false }), // optional vertex dots
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

## Flipped

```ts
// append after the scales
coord.flip()
```

## Area params

`geom.area({ params: { ... } })`: `lineWidth` (outline stroke px or `'auto'`), `interpolate` (`'linear'` default \| `'catmull-rom'`), `missingValues` (`'zero'` default \| `'connect'`; `'gap'` is accepted but normalised to `'zero'` — areas cannot render gaps mid-stack).

```ts
geom.area({ params: { interpolate: 'catmull-rom' } })
geom.area({ params: { missingValues: 'connect' } })
```

## Gotchas

- **Area fills render at 30% opacity by default** (the renderer's `DEFAULT_AREA_FILL_OPACITY`) — colors look washed-out/dimmed compared to their palette hex. Good for overlapping areas; wrong for stacked bands or a saturated house style. Opt out with a constant `alpha` mapping: `mapping({ x, y, color: 'region', alpha: { value: 1 } })`. The outline stroke is unaffected (opacity 1).
- Area's default position is **`stack`** — multi-series areas stack without an explicit `position`.
- Wide data needs `transform.reshape` before mapping `color`; with the no-option reshape the output columns are named `key` and `value`.
- A companion dot layer on a stacked area must repeat `position: 'stack'` — point's own default is identity, so dots would otherwise sit at raw y values off the stacked surface.
- Unlike `geom.line`, area has no `showFill` param — the fill is the mark.
- Unlike `geom.line`, area's `missingValues` default is `'zero'`, not `'gap'` — `'gap'` is normalised to `'zero'` because areas cannot render gaps mid-stack.
