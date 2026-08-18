# Radar (spider)

A radar chart is a line/point/area chart bent around a circle: `coord.polar({ theta: 'x' })` puts categories on the angle (one spoke per category) and the value on the radius. Data is long format — one row per (category, series) — with `color` splitting the series into one polygon each.

| Variant | Spec delta |
|---|---|
| Spider (outline + vertex dots) | base below: `geom.line()` + `geom.point({ interactive: false })` |
| Points only | single `geom.point()` layer, no line |
| Filled | `geom.area({ position: 'identity' })` + `geom.point({ interactive: false })` instead of the line |

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
  scale.y({ zero: true }),
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

## Gotchas

- Always pass `scale.y({ zero: true })`. Without it the domain starts at the data minimum, which maps to the center of the circle and wildly exaggerates differences.
- The filled variant needs `position: 'identity'` — `geom.area` defaults to `'stack'`, which would pile the series' radii on top of each other instead of overlapping them.
- Use `scale.x.discrete()` explicitly for the spokes; under `coord.polar` the compiler zeroes discrete-scale padding so the spokes distribute evenly around the full circle.
- Mark the decorative point layer `interactive: false` so hover hit-detection stays on the primary line/area layer instead of competing with the dots.
- The intro animation reaches the vertex dots (they pop in staggered, tuned by `animation` on `GraphRenderer`); a polar line or area polygon has no entrance of its own. `maxAnimatedGeoms` (default `1500`) counts geoms across all layers.
