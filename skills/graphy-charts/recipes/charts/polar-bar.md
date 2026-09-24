# Polar bar graph

Use a polar bar graph (rose, coxcomb or radial bar) for cyclic bands such as weekdays or months, or for a compact ranked track.

## Data

Long form: one row per band and group.

```ts
import type { Data } from '@graphysdk/react';

const signupsData: Data = {
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
    { day: 'Fri', signups: 8, channel: 'Organic' },
    { day: 'Fri', signups: 6, channel: 'Referral' },
  ],
};
```

## Basic

A rose: each band is a wedge, and the value grows the radius. Dodge splits a wedge into one petal per group.

```tsx
import { config, coord, createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const signupsData: Data = {
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
    { day: 'Fri', signups: 8, channel: 'Organic' },
    { day: 'Fri', signups: 6, channel: 'Referral' },
  ],
};

const spec = pipe(
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
    <GraphProvider data={signupsData} spec={spec}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

## Variants

### Stacked rose

Groups stack outward along the radius.

```ts
import { geom } from '@graphysdk/react';

const layer = geom.bar({ position: 'stack' });
```

### Radial bar (race track)

Swap theta to y. Each band becomes a concentric track and the value sweeps the angle. An inner radius clears the centre.

```ts
import { coord, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'day', y: 'signups', color: 'channel' }),
  geom.bar({ position: 'stack' }),
  coord.polar({ theta: 'y', innerRadius: 0.15 }),
  scale.x.discrete(),
  scale.y(),
  scale.color.palette()
);
```

### Wedge width and corner rounding

```ts
import { createSpec, geom, pipe, scale, style, styles, coord } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'day', y: 'signups', color: 'channel' }),
  geom.bar({ position: 'stack', params: { width: 0.6 } }),
  styles({ defaults: [style.geom.bar({ cornerRadius: 'md', stroke: '#ffffff', strokeWidth: 1 })] }),
  coord.polar({ theta: 'x' }),
  scale.x.discrete(),
  scale.y(),
  scale.color.palette()
);
```

Width is a fraction of the band: angular for a rose, radial for a track.

### Hide the axes

```ts
import { config } from '@graphysdk/react';

const noAxes = config({ axes: { x: { isVisible: false }, y: { isVisible: false } } });
```

## Pitfalls

- `theta: 'x'` gives a rose, `theta: 'y'` gives radial tracks. Both keep x as the band.
- Use `scale.x.discrete()` so every band gets an equal wedge or track.
- A pie is the special case with `x: ''`, `position: 'fill'` and `theta: 'y'`. See pie.md.
