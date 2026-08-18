# Area charts

| Variant | Delta from base |
|---|---|
| Simple | base recipe below |
| Stacked | `transform.reshape` wide→long, map `color`, add `scale.color.palette()` (stack is area's default position) |
| Flipped | append `coord.flip()` |
| Smooth | `geom.area({ params: { interpolate: 'catmull-rom' } })` |
| Missing values | `geom.area({ params: { missingValues: 'zero' \| 'connect' } })` |
| Vertex dots | add `geom.point({ position: 'stack', interactive: false })` |
| Opaque fill | `styles({ defaults: [style.geom.area({ alpha: 1 })] })` |

## Base: simple area

```tsx
import { createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

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

## Geometry and paint

`params` carries the path geometry; the stylesheet carries the paint (`reference/styling.md`).

| Surface | Key | Type | Default | Notes |
|---|---|---|---|---|
| `geom.area({ params })` | `interpolate` | `'linear' \| 'catmull-rom'` | `'linear'` | d3 curve family |
| `geom.area({ params })` | `missingValues` | `'zero' \| 'connect'` | `'zero'` | `'gap'` is accepted and normalised to `'zero'` — areas cannot render gaps mid-stack |
| `style.geom.area` | `alpha` | `0..1` | `0.3` | the **fill's** opacity |
| `style.geom.area` | `strokeAlpha` | `0..1` | `1` | the outline's opacity, independent of `alpha` |
| `style.geom.area` | `strokeWidth` | number (px) | `2` | outline width |
| `style.geom.area` | `lineType` | `'solid' \| 'dashed' \| 'dotted'` | `'solid'` | |
| `style.geom.area` | `color` / `saturation` | | | |

```ts
geom.area({ params: { interpolate: 'catmull-rom', missingValues: 'connect' } }),
styles({ defaults: [style.geom.area({ alpha: 1, strokeAlpha: 1, strokeWidth: 3 })] }),
```

## Intro animation

On mount the layer is revealed by a wipe travelling along the main axis; every band in the layer
enters together. The renderer's `animation` prop tunes it:

```tsx
<GraphRenderer animation={{ intro: { durationScale: 0.5 } }} />
```

`maxAnimatedGeoms` (default `1500`) counts geoms across **all** layers; above it the entrance is skipped.

## Gotchas

- **Area fills draw at `alpha: 0.3`** (the engine's `DEFAULT_AREA_ALPHA`) — colors read lighter than their palette hex. Good for overlapping areas; wrong for stacked bands or a saturated house style. Set `styles({ defaults: [style.geom.area({ alpha: 1 })] })` for solid bands; `strokeAlpha` stays independently controllable.
- A `defaults` entry loses to a mapped aesthetic, so recoloring a series that is mapped to `color` needs an `overrides` entry (`reference/styling.md`).
- Area's default position is **`stack`** — multi-series areas stack without an explicit `position`.
- Wide data needs `transform.reshape` before mapping `color`; with the no-option reshape the output columns are named `key` and `value`.
- A companion dot layer on a stacked area must repeat `position: 'stack'` — point's own default is identity, so dots would otherwise sit at raw y values off the stacked surface.
- Area's `missingValues` default is `'zero'`; `'gap'` normalises to `'zero'` because areas cannot render gaps mid-stack.
