# Radar graph

Use a radar graph to compare a few groups across several measures on the same scale.

A radar is a line or area geom in polar coordinates with the band on the angle.

## Data

Long form: one row per group and measure.

```ts
import type { Data } from '@graphysdk/react';

const skillsData: Data = {
  columns: [{ key: 'skill' }, { key: 'score' }, { key: 'player' }],
  rows: [
    { skill: 'Speed', score: 8, player: 'Alice' },
    { skill: 'Power', score: 6, player: 'Alice' },
    { skill: 'Defense', score: 7, player: 'Alice' },
    { skill: 'Stamina', score: 9, player: 'Alice' },
    { skill: 'Technique', score: 5, player: 'Alice' },
    { skill: 'Speed', score: 6, player: 'Bob' },
    { skill: 'Power', score: 9, player: 'Bob' },
    { skill: 'Defense', score: 5, player: 'Bob' },
    { skill: 'Stamina', score: 6, player: 'Bob' },
    { skill: 'Technique', score: 8, player: 'Bob' },
  ],
};
```

## Basic

Outline per group with a dot at each vertex.

```tsx
import { config, coord, createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const skillsData: Data = {
  columns: [{ key: 'skill' }, { key: 'score' }, { key: 'player' }],
  rows: [
    { skill: 'Speed', score: 8, player: 'Alice' },
    { skill: 'Power', score: 6, player: 'Alice' },
    { skill: 'Defense', score: 7, player: 'Alice' },
    { skill: 'Stamina', score: 9, player: 'Alice' },
    { skill: 'Technique', score: 5, player: 'Alice' },
    { skill: 'Speed', score: 6, player: 'Bob' },
    { skill: 'Power', score: 9, player: 'Bob' },
    { skill: 'Defense', score: 5, player: 'Bob' },
    { skill: 'Stamina', score: 6, player: 'Bob' },
    { skill: 'Technique', score: 8, player: 'Bob' },
  ],
};

const spec = pipe(
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
    <GraphProvider data={skillsData} spec={spec}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

`theta: 'x'` puts one spoke per band. `domainMin: 0` keeps the centre at zero so shapes compare fairly.

## Variants

### Filled

Swap the line for an area with identity position, so the groups overlap instead of stacking.

```ts
import { config, coord, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'skill', y: 'score', color: 'player' }),
  geom.area({ position: 'identity' }),
  geom.point({ interactive: false }),
  coord.polar({ theta: 'x' }),
  scale.x.discrete(),
  scale.y({ domainMin: 0 }),
  scale.color.palette(),
  config({ legend: { position: 'top' } })
);
```

Lower the fill opacity when shapes overlap a lot: `styles({ defaults: [style.geom.area({ fillAlpha: 0.15 })] })`. The built-in area opacity is 0.3.

### Dots only

```ts
import { coord, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'skill', y: 'score', color: 'player' }),
  geom.point(),
  coord.polar({ theta: 'x' }),
  scale.x.discrete(),
  scale.y({ domainMin: 0 }),
  scale.color.palette()
);
```

### Fixed outer value

```ts
import { scale } from '@graphysdk/react';

const yScale = scale.y({ domainMin: 0, domainMax: 10 });
```

## Pitfalls

- Use `scale.x.discrete()` so the measures are evenly spaced spokes.
- An area in polar coordinates stacks by default. Use `position: 'identity'` for overlapping shapes.
- Give every group a row for every measure. A row with `null` on y leaves a gap in that group's outline, since the line default for missing values is `'gap'`.
