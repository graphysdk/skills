# Area charts

| Variant | Delta from base |
|---|---|
| Simple | base recipe below |
| Stacked | `transform.reshape` wide→long, map `color`, add `scale.color.palette()` (stack is area's default position) |
| Flipped | append `coord.flip()` |
| Smooth | `geom.area({ params: { interpolate: 'catmull-rom' } })` |
| Missing values | `geom.area({ params: { missingValues: 'zero' \| 'connect' } })` |
| Vertex points | add `geom.point({ position: 'stack', interactive: false })` |
| Opaque fill | `styles({ defaults: [style.geom.area({ alpha: 1 })] })` |
| Data labels | `geom.area({ dataLabels: { showDataLabels: true } })` |
| Radar | `geom.area({ position: 'identity' })` (area stacks by default) + append `coord.polar({ theta: 'x' })` — `recipes/charts/radar.md` |

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
  geom.point({ position: 'stack', interactive: false }), // optional vertex points
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

With no `palette` option, `scale.color.palette()` resolves `{ type: 'default' }` per chart: stacked areas touch, so `{ type: 'default' }` always resolves to the single-hue `brick` mono ramp — the 8-color default set is unreachable here. Escape hatches: `{ type: 'graphy' }` (the 10-color Graphy brand palette, a different hue set), `{ type: 'pastel' }`, `{ type: 'custom', id }`, or a non-touching position.

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

The built-in look is token-backed — `styles({ tokens: { geom: '#0B5FFF', geomBorder: '#1A1A1A33', gridLine: '#E9E9E9', textPrimary: '#1A1A1A' } })` restyles the defaults with no entries. The built-in dimmed state is `alpha: 0.4`.

`color`, `strokeWidth`, `lineType` and `alpha` are also mappable aesthetics — `scale.strokeWidth.continuous()`, `scale.lineType.discrete({ … })`, `scale.alpha.continuous()`.

Like line, `geom.area` accepts a `stat` (e.g. `stat.smooth({ method: 'linear' })`) and an `id`, so `style.geom.area({ … }, { layer: 'trend' })` scopes paint to that layer.

Data labels: `geom.area({ dataLabels: { showDataLabels: true } })` — offset `8` px under cartesian/flip; area labels always use the outside styling (`style.dataLabel.observation.outside`), since the translucent fill cannot back white text. Under `coord.polar` (radar) they warn `DATA_LABELS_UNSUPPORTED` and render nothing.

## Intro animation

On mount, under cartesian or flipped coords, the layer is revealed by a wipe travelling along the
main axis; every band in the layer enters together. A polar area (radar) has no entrance. The
renderer's `animation` prop tunes it:

```tsx
<GraphRenderer animation={{ intro: { durationScale: 0.5 } }} />
```

`animation={{ intro: { maxAnimatedGeoms } }}` (default `1500`) counts geoms across **all** layers — bar/point/tile layers one per observation, line/area layers one per series; above it the intro is skipped entirely.

## Gotchas

- **Area fills draw at `alpha: 0.3`** (the built-in `style.geom.area` entry's `alpha`) — colors read lighter than their palette hex. Good for overlapping areas; wrong for stacked bands or a saturated house style. Set `styles({ defaults: [style.geom.area({ alpha: 1 })] })` for solid bands; `strokeAlpha` stays independently controllable.
- A `defaults` entry loses to a mapped aesthetic, so recoloring a series that is mapped to `color` needs an `overrides` entry (`reference/styling.md`).
- Area's default position is **`stack`** — multi-series areas stack without an explicit `position`.
- Wide data needs `transform.reshape` before mapping `color`; with the no-option reshape the output columns are named `key` and `value`.
- A companion point layer on a stacked area must repeat `position: 'stack'` — point's own default is identity, so the points would otherwise sit at raw y values off the stacked surface.
- Area's `missingValues` default is `'zero'`; `'gap'` normalises to `'zero'` because areas cannot render gaps mid-stack.
