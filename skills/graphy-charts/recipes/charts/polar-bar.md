# Polar bar (rose / coxcomb / radial)

`geom.bar` inside `coord.polar`. The `theta` param picks the layout: `theta: 'x'` puts categories on the angle and grows values outward (rose/coxcomb); `theta: 'y'` puts categories on the radius and sweeps values around the arc (radial bar / racetrack). Data is long format — one row per (category, series) — with `color` splitting series.

| Variant | Spec delta |
|---|---|
| Rose (coxcomb) | base below: `geom.bar({ position: 'dodge' })` + `coord.polar({ theta: 'x' })` |
| Stacked rose | `geom.bar({ position: 'stack' })` — series stack outward along the radius |
| Radial bar (racetrack) | `geom.bar({ position: 'stack' })` + `coord.polar({ theta: 'y', innerRadius: 0.15 })` — one concentric track per category, series as consecutive arc segments |
| Rotated start | `coord.polar({ theta: 'x', startAngle: -90 })` — first spoke lands on the given angle in degrees (default `0`) |
| Segment styling | `geom.bar({ params: { width: 0.7, borderColor: '#fff', borderWidth: 1 } })` |

## Base rose

```tsx
import { config, coord, createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const data = {
  columns: [{ key: 'day' }, { key: 'signups' }, { key: 'channel' }],
  rows: [
    { day: 'Mon', signups: 5, channel: 'Organic' },
    { day: 'Mon', signups: 3, channel: 'Referral' },
    { day: 'Tue', signups: 7, channel: 'Organic' },
    { day: 'Tue', signups: 4, channel: 'Referral' },
    { day: 'Wed', signups: 6, channel: 'Organic' },
    { day: 'Wed', signups: 5, channel: 'Referral' },
    { day: 'Thu', signups: 9, channel: 'Organic' },
    { day: 'Thu', signups: 3, channel: 'Referral' },
  ],
};

const input = pipe(
  createSpec({ x: 'day', y: 'signups', color: 'channel' }),
  geom.bar({ position: 'dodge' }),
  coord.polar({ theta: 'x' }),
  scale.x.discrete(),
  scale.y({ zero: true }),
  scale.color.palette(),
  config({ legend: { position: 'top' } })
);

export function SignupsRose() {
  return (
    <GraphProvider data={data} input={input}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Variants

Stacked rose — same wedge-per-category layout, series stack outward instead of dodging:

```ts
geom.bar({ position: 'stack' }),
coord.polar({ theta: 'x' }),
```

Radial bar / racetrack — category picks the radius, value sweeps the angle; `innerRadius` keeps the innermost track off the center:

```ts
geom.bar({ position: 'stack' }),
coord.polar({ theta: 'y', innerRadius: 0.15 }),
```

Bar params under polar — `width` is the fraction of the category band in `(0, 1]` (angular for rose petals, radial for tracks); borders separate segments:

```ts
geom.bar({ position: 'dodge', params: { width: 0.7, borderColor: '#ffffff', borderWidth: 1 } }),
```

## Gotchas

- Pass `scale.y({ zero: true })` so petal length / arc sweep is proportional from zero; a data-min domain start makes the smallest value vanish into the center.
- Under `coord.polar` the compiler zeroes discrete-scale padding automatically — spoke bands span the full circle; control gaps via the bar `width` param instead.
- `startAngle` is in degrees and rotates where the first discrete spoke lands (rose) or where arcs begin sweeping (racetrack).
- Unlike pie/donut (which never draw axes), these charts keep a real categorical `x` mapping, so both axes render by default; hide or tune them via `config({ axes: { x: { isVisible: false } } })` etc.
