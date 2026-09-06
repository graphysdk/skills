# Polar bar (rose / coxcomb / radial)

`geom.bar` inside `coord.polar`. The `theta` param picks the layout: `theta: 'x'` puts categories on the angle and grows values outward (rose/coxcomb); `theta: 'y'` puts categories on the radius and sweeps values around the arc (radial bar / racetrack). Data is long format — one row per (category, series) — with `color` splitting series.

| Variant | Spec delta |
|---|---|
| Rose (coxcomb) | base below: `geom.bar({ position: 'dodge' })` + `coord.polar({ theta: 'x' })` |
| Stacked rose | `geom.bar({ position: 'stack' })` — series stack outward along the radius |
| Radial bar (racetrack) | `geom.bar({ position: 'stack' })` + `coord.polar({ theta: 'y', innerRadius: 0.15 })` — one concentric track per category, series as consecutive arc segments; needs a discrete radial (x) scale and no `fill` layer |
| Rotated start | `coord.polar({ theta: 'x', startAngle: -90 })` — first spoke lands on the given angle in degrees (default `0`) |
| Segment styling | `geom.bar({ params: { width: 0.7 } })` (polar default is `1`, the full band) + `styles({ defaults: [style.geom.bar({ borderColor: '#fff', borderWidth: 1 })] })` |
| Rounded ends | `styles({ defaults: [style.geom.bar({ borderRadius: 'full' })] })` |
| Count labels | `geom.bar({ dataLabels: { showDataLabels: true, format: 'absolute' } })` — polar bars default to `'percentage'`, but a stacked layer has no total and silently falls back to absolute |

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
  scale.y(),
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

Position scales are never auto-added: omit `scale.y()` and the petals render with raw, unscaled radii and no diagnostic. Every variant below keeps the base's `scale.x.discrete()` + `scale.y()`.

## Variants

Stacked rose — same wedge-per-category layout, series stack outward instead of dodging:

```ts
geom.bar({ position: 'stack' }),
coord.polar({ theta: 'x' }),
```

Radial bar / racetrack — category picks the radius, value sweeps the angle; `innerRadius` keeps the innermost track off the center. It needs a discrete radial (x) scale and no `fill` layer, else it degenerates to a pie-style sweep with no axes:

```ts
geom.bar({ position: 'stack' }),
coord.polar({ theta: 'y', innerRadius: 0.15 }),
```

`innerRadius` is not racetrack-only — `coord.polar({ theta: 'x', innerRadius: 0.2 })` hollows the centre of a rose too.

Both stacked variants have touching geoms, so a bare `scale.color.palette()` (`{ type: 'default' }`) always resolves to the single-hue `brick` mono ramp for the whole chart — the 8-colour default set is unreachable there; the dodged rose gets it. Escape hatches: `{ type: 'graphy' }` (the 10-colour Graphy brand palette, a different hue set), `{ type: 'pastel' }`, `{ type: 'custom', id }`, or `position: 'dodge'`.

Geometry and paint — `width` is the fraction of the category band in `(0, 1]` (angular for rose petals, radial for tracks); the polar default is `1`, the full band, so the cartesian `0.7` must be asked for. Borders are on by default (`borderColor: token('geomBorder')`, `borderWidth: 1`) — this entry swaps in another colour/width, `borderWidth: 0` removes them, and a hovered segment gets a `token('hoverAffordance')` outline. Everything else the bar paints lives in the stylesheet (`reference/styling.md`):

```ts
geom.bar({ position: 'dodge', params: { width: 0.7 } }),
styles({ defaults: [style.geom.bar({ borderColor: '#ffffff', borderWidth: 1 })] }),
```

Rounded segments — `borderRadius` is a token (`'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`, default `'sm'`) applied to the whole segment silhouette. `'full'` rounds to half the segment's cross-axis thickness — radial for `theta: 'y'`, which gives a racetrack its capsule ends, angular for `theta: 'x'`:

```ts
geom.bar({ position: 'stack' }),
coord.polar({ theta: 'y', innerRadius: 0.15 }),
styles({ defaults: [style.geom.bar({ borderRadius: 'full' })] }),
```

Data labels — `format` defaults to `'percentage'` on every polar bar (share of the layer total), but a **stacked** rose/racetrack has no layer total, so its labels silently fall back to absolute — pass `format: 'absolute'` explicitly there, or use `dodge` for real percentages. `showStackTotals` warns `DATA_LABEL_SETTING_IGNORED` under polar:

```ts
geom.bar({ position: 'dodge', dataLabels: { showDataLabels: true, format: 'absolute' } }),
```

## Intro animation

A rose grows outward along the radius, staggered around the circle in visual order (a stacked wedge
rises as one); `stagger: false` disables that stagger. A racetrack sweeps its arcs open from `startAngle`
on one shared clock, unstaggered. The renderer's `animation` prop tunes both:

```tsx
<GraphRenderer animation={{ intro: { stagger: false, durationScale: 0.5 } }} />
```

`animation={{ intro: { maxAnimatedGeoms } }}` (default `1500`) counts geoms across **all** layers — one per observation for bar/point/tile layers, one per series for line/area; above it the entrance is skipped.

## Gotchas

- Position scales are never auto-added — a layer that maps `y` without `scale.y()` renders raw, unscaled radii with no diagnostic.
- Bars hold zero on their value axis, so petal length / arc sweep is proportional from zero without asking.
- Under `coord.polar` the compiler zeroes discrete-scale padding automatically — spoke bands span the full circle; control gaps via the bar `width` param instead. Under polar the default `width` is `1` (the full band) and any out-of-range value — above `1` or otherwise invalid — is replaced with that same `1` plus an `INVALID_GEOM_PARAM` warning; `0.7` is the cartesian default, so petal gaps must be asked for explicitly.
- `startAngle` is in degrees and rotates where the first discrete spoke lands (rose) or where arcs begin sweeping (racetrack).
- Unlike pie/donut (which never draw axes), these charts keep a real categorical `x` mapping, so both axes render by default; hide or tune them via `config({ axes: { x: { isVisible: false } } })` etc.
