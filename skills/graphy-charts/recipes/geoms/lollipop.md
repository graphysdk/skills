# Lollipop

One value per band, drawn as a head at the value and a stem down to zero. Lighter than a bar when there are many bands of similar size. Ships as `@graphysdk/geom-lollipop`; do not write a plugin for it.

## Install

```bash
npm install @graphysdk/geom-lollipop
```

Peers: `@graphysdk/react` and React.

## Basic

```tsx
import { lollipop } from '@graphysdk/geom-lollipop';
import { createGraphyKit, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const readingData: Data = {
  columns: [{ key: 'country' }, { key: 'share' }],
  rows: [
    { country: 'Norway', share: 89 },
    { country: 'Sweden', share: 85 },
    { country: 'Finland', share: 83 },
    { country: 'Denmark', share: 80 },
    { country: 'Germany', share: 76 },
    { country: 'France', share: 71 },
    { country: 'Spain', share: 65 },
    { country: 'Italy', share: 58 },
  ],
};

const kit = createGraphyKit({ plugins: [lollipop] });

const spec = kit.pipe(
  kit.createSpec({ x: 'country', y: 'share' }),
  kit.geom.lollipop(),
  kit.scale.x.discrete(),
  kit.scale.y.continuous()
);

export function ReadingShare() {
  return (
    <kit.GraphProvider data={readingData} spec={spec}>
      <GraphRenderer />
    </kit.GraphProvider>
  );
}
```

Create the kit once at module scope. `kit.GraphProvider` shows "Made with Graphy" by default; `config({ content: { brandMark: { enabled: false } } })` turns it off. The value axis always holds zero. A negative value hangs its stem below the baseline.

## Variants

### Horizontal

```ts
const horizontalSpec = kit.pipe(
  kit.createSpec({ x: 'country', y: 'share' }),
  kit.geom.lollipop(),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.coord.flip()
);
```

### Grouped

Long data, one row per lollipop. Map the group to `color`. A band's lollipops dodge across it, as grouped bars do, and each stem takes its head's color.

```ts
const revenueData: Data = {
  columns: [{ key: 'quarter' }, { key: 'channel' }, { key: 'revenue' }],
  rows: [
    { quarter: 'Q1', channel: 'Online', revenue: 42 },
    { quarter: 'Q1', channel: 'Retail', revenue: 31 },
    { quarter: 'Q2', channel: 'Online', revenue: 48 },
    { quarter: 'Q2', channel: 'Retail', revenue: 29 },
  ],
};

const groupedSpec = kit.pipe(
  kit.createSpec({ x: 'quarter', y: 'revenue', color: 'channel' }),
  kit.geom.lollipop(),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.scale.color.palette()
);
```

`position: 'dodge'` is the default. `position: 'identity'` stands a band's lollipops on one line. `'stack'` is rejected with `UNSUPPORTED_POSITION`. Wide data needs `kit.transform.reshape()` first, as in the [dumbbell recipe](dumbbell.md).

### Data labels

```ts
const labeledLayer = kit.geom.lollipop({ dataLabels: { showDataLabels: true } });
```

Under the default `position: 'auto'` each label continues the stem past the head. An explicit `position` puts every label on the side `justify` names. The label prints `y`; map `label` to print another column. `showStackTotals` and `showCategoryLabels` do nothing here.

### Styling

The heads are the observations. The stem is a part.

```ts
import { styles } from '@graphysdk/react';

const styledSpec = kit.pipe(
  kit.createSpec({ x: 'country', y: 'share' }),
  kit.geom.lollipop(),
  styles({
    defaults: [
      kit.style.geom.lollipop({ size: 14, strokeWidth: 2 }),
      kit.style.geom.lollipop.stem({ strokeWidth: 1, stroke: '#b5b0a3', dashArray: [2, 3] }),
    ],
  }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous()
);
```

| Builder                          | Properties                                                                                 | Default                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------- |
| `kit.style.geom.lollipop()`      | `fill`, `stroke`, `alpha`, `fillAlpha`, `strokeAlpha`, `saturation`, `size`, `strokeWidth` | Fill from the scale, 10px, white border |
| `kit.style.geom.lollipop.stem()` | `stroke`, `alpha`, `strokeWidth`, `dashArray`                                              | Stroke from the scale, 2px, solid       |

A bare `style.geom({ fill })` styles the heads, never the stems. A stem entry's `stroke` replaces the scale color.

### Highlight

A highlight raises each matched lollipop whole, head and stem. `highlight({ variable: 'channel', eq: 'Online' })`.

## Pitfalls

- The x axis is always a band. Declare `kit.scale.x.discrete()`.
- No polar coordinates: `coord.polar()` is rejected with `UNSUPPORTED_COORD`.
- Duplicate rows for one band and group all draw. Aggregate first with `kit.transform.aggregate()`.
- `plugins` are read once at mount. Keep the kit at module scope.
