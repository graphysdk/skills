# Radar (spider)

A radar chart is a line/point/area chart bent around a circle: `coord.polar({ theta: 'x' })` puts categories on the angle (one spoke per category) and the value on the radius. Data is long format — one row per (category, series) — with `color` splitting the series into one polygon each.

| Variant | Spec delta |
|---|---|
| Spider (outline + vertex dots) | base below: `geom.line()` + `geom.point({ interactive: false })` |
| Points only | single `geom.point()` layer, no line |
| Filled | `geom.area({ position: 'identity' })` + `geom.point({ interactive: false })` instead of the line |
| Curved spider | `geom.line({ params: { interpolate: 'catmull-rom' } })` |
| Rotated / hollow centre | `coord.polar({ theta: 'x', startAngle: -90, innerRadius: 0.1 })` |
| Per-series dash | `lineType: 'player'` in the mapping + `scale.lineType.discrete({ range: ['solid', 'dashed'] })` |
| Bar-based rose | `geom.bar` instead — `recipes/charts/polar-bar.md` |

## Base spider

```tsx
import { config, coord, createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const data = {
  columns: [{ key: 'skill' }, { key: 'score' }, { key: 'player' }],
  rows: [
    { skill: 'Speed', score: 8, player: 'Alice' },
    { skill: 'Power', score: 6, player: 'Alice' },
    { skill: 'Defense', score: 7, player: 'Alice' },
    { skill: 'Stamina', score: 9, player: 'Alice' },
    { skill: 'Speed', score: 6, player: 'Bob' },
    { skill: 'Power', score: 9, player: 'Bob' },
    { skill: 'Defense', score: 5, player: 'Bob' },
    { skill: 'Stamina', score: 6, player: 'Bob' },
  ],
};

const input = pipe(
  createSpec({ x: 'skill', y: 'score', color: 'player' }),
  geom.line(),
  geom.point({ interactive: false }),
  coord.polar({ theta: 'x' }),
  scale.x.discrete(),
  scale.y({ domainMin: 0 }),
  scale.color.palette(),
  config({ legend: { position: 'top' } })
);

export function SkillsRadar() {
  return (
    <GraphProvider data={data} input={input}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Variants

Points only:

```ts
geom.point(),
```

Filled — a translucent polygon per series with vertex dots on top. The polygon's fill opacity is
`style.geom.area({ alpha })` (default `0.3`), its outline `strokeAlpha` / `strokeWidth`, and the dots
`style.geom.point({ size })` (default `8`) — see `reference/styling.md`:

```ts
geom.area({ position: 'identity' }),
geom.point({ id: 'vertices', interactive: false }),
styles({
  defaults: [
    style.geom.area({ alpha: 0.2, strokeAlpha: 1, strokeWidth: 2 }),
    style.geom.point({ size: 5 }, { layer: 'vertices' }),
  ],
}),
```

Curved spider — a Catmull-Rom spline through the vertices instead of straight segments:

```ts
geom.line({ params: { interpolate: 'catmull-rom' } }),
```

Missing spokes — `missingValues` defaults to `'gap'` on a line (the outline breaks) and `'zero'` on an area (the vertex drops to the centre); `'connect'` spans the hole:

```ts
geom.line({ params: { missingValues: 'connect' } }),
```

Rotated / hollow centre — `startAngle` (degrees, default `0`) picks where the first spoke lands; `innerRadius` in `(0, 1)` keeps the polygons off the centre:

```ts
coord.polar({ theta: 'x', startAngle: -90, innerRadius: 0.1 }),
```

Stroke — `style.geom.line({ strokeWidth, lineType })` (defaults `2` / `'solid'`) paints every outline; map `lineType` for a dash per series:

```ts
createSpec({ x: 'skill', y: 'score', color: 'player', lineType: 'player' }),
geom.line(),
scale.lineType.discrete({ domain: ['Alice', 'Bob'], range: ['solid', 'dashed'] }),
styles({ defaults: [style.geom.line({ strokeWidth: 3 })] }),
```

## Intro animation

Only the vertex dots have an entrance — they pop in staggered; a polar line or area polygon has none. `staggerOrder: 'value-descending'` lands the highest scores first:

```tsx
<GraphRenderer animation={{ intro: { staggerOrder: 'value-descending' } }} />
```

`animation={{ intro: { maxAnimatedGeoms } }}` (default `1500`) counts geoms across **all** layers — one per observation for point layers, one per series for line/area.

## Gotchas

- Always pass `scale.y({ domainMin: 0 })`. Without it the domain starts at the data minimum, which maps to the center of the circle and wildly exaggerates differences.
- The filled variant needs `position: 'identity'` — `geom.area` defaults to `'stack'`, which would pile the series' radii on top of each other instead of overlapping them.
- Use `scale.x.discrete()` explicitly for the spokes; under `coord.polar` the compiler zeroes discrete-scale padding so the spokes distribute evenly around the full circle.
- Mark the decorative point layer `interactive: false` so hover hit-detection stays on the primary line/area layer instead of competing with the dots.
- Data labels are unsupported under polar for line, area and point layers — `showDataLabels: true` warns `DATA_LABELS_UNSUPPORTED` and nothing renders.
- `style.geom.line({ fillAlpha })` is inert here: the gradient wash under a line is cartesian-only. Use the filled variant for a tinted polygon.
- No reference ring: `geom.rule` is cartesian/flip only and raises `UNSUPPORTED_COORD` under `coord.polar`.
