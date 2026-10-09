# Dumbbell

Two or more values per band, drawn as dots joined by a connector. Shows the gap between groups: pay by sex across roles, a value in two years across regions. Ships as `@graphysdk/geom-dumbbell`; do not write a plugin for it.

## Install

```bash
npm install @graphysdk/geom-dumbbell
```

Peers: `@graphysdk/react` and React.

## Basic

Long data, one row per dot. Map the band to `x`, the value to `y` and the group to `color`. The geom groups a band's dots itself.

```tsx
import { dumbbell } from '@graphysdk/geom-dumbbell';
import { createGraphyKit, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const payGapData: Data = {
  columns: [{ key: 'role' }, { key: 'sex' }, { key: 'salary' }],
  rows: [
    { role: 'Product', sex: 'Women', salary: 125 },
    { role: 'Product', sex: 'Men', salary: 140 },
    { role: 'Eng', sex: 'Women', salary: 118 },
    { role: 'Eng', sex: 'Men', salary: 132 },
    { role: 'Design', sex: 'Women', salary: 95 },
    { role: 'Design', sex: 'Men', salary: 104 },
    { role: 'Sales', sex: 'Women', salary: 82 },
    { role: 'Sales', sex: 'Men', salary: 99 },
  ],
};

const kit = createGraphyKit({ plugins: [dumbbell] });

const spec = kit.pipe(
  kit.createSpec({ x: 'role', y: 'salary', color: 'sex' }),
  kit.geom.dumbbell(),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.scale.color.palette()
);

export function PayGap() {
  return (
    <kit.GraphProvider data={payGapData} spec={spec}>
      <GraphRenderer />
    </kit.GraphProvider>
  );
}
```

Create the kit once at module scope. `kit.GraphProvider` shows "Made with Graphy" by default; `config({ content: { brandMark: { enabled: false } } })` turns it off. The value axis fits the data; it does not hold zero. A band with one dot draws the dot and no connector. With three or more dots the connector spans the smallest to the largest. Leave `color` unmapped for one color and no legend.

## Variants

### Horizontal

```ts
const horizontalSpec = kit.pipe(
  kit.createSpec({ x: 'role', y: 'salary', color: 'sex' }),
  kit.geom.dumbbell(),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.scale.color.palette(),
  kit.coord.flip()
);
```

### Wide data

One column per group. Reshape to long in the spec.

```ts
const lifeExpectancyData: Data = {
  columns: [{ key: 'region' }, { key: '1970' }, { key: '2020' }],
  rows: [
    { region: 'Europe', 1970: 71, 2020: 81 },
    { region: 'E. Asia', 1970: 59, 2020: 77 },
    { region: 'Africa', 1970: 45, 2020: 61 },
  ],
};

const wideSpec = kit.pipe(
  kit.createSpec({ x: 'region', y: 'years', color: 'year' }),
  kit.transform.reshape({ keep: ['region'], reshape: ['1970', '2020'], keyName: 'year', valueName: 'years' }),
  kit.geom.dumbbell(),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.scale.color.palette(),
  kit.coord.flip()
);
```

### Data labels

```ts
const labeledLayer = kit.geom.dumbbell({ dataLabels: { showDataLabels: true } });
```

Under the default `position: 'auto'` each label sits on the far side of its dot from the connector. An explicit `position` puts every label on the side `justify` names. The label prints `y`; map `label` to print another column. `showStackTotals` and `showCategoryLabels` do nothing here.

### Styling

The dots are the observations. The connector is a part.

```ts
import { styles } from '@graphysdk/react';

const styledSpec = kit.pipe(
  kit.createSpec({ x: 'role', y: 'salary', color: 'sex' }),
  kit.geom.dumbbell(),
  styles({
    defaults: [
      kit.style.geom.dumbbell({ size: 14, strokeWidth: 2 }),
      kit.style.geom.dumbbell.connector({ strokeWidth: 6, stroke: '#d9d4c7' }),
    ],
  }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.scale.color.palette()
);
```

| Builder                               | Properties                                                                                 | Default                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------- |
| `kit.style.geom.dumbbell()`           | `fill`, `stroke`, `alpha`, `fillAlpha`, `strokeAlpha`, `saturation`, `size`, `strokeWidth` | Fill from the scale, 10px, white border |
| `kit.style.geom.dumbbell.connector()` | `stroke`, `alpha`, `strokeWidth`, `dashArray`                                              | A neutral gray, 2px, solid              |

A bare `style.geom({ fill })` styles the dots, never the connector. The connector takes no color from the scale: it joins dots of different groups. A connector entry's `where` is tested against the band's first dot, so write it against what every dot of the band shares, such as `x`.

### Highlight

A highlight matches dots. The connector is raised only when every dot it joins is raised: `highlight({ variable: 'role', eq: 'Eng' })` raises a whole dumbbell; `highlight({ variable: 'sex', eq: 'Men' })` raises one dot per band and no connector.

## Pitfalls

- The x axis is always a band. Declare `kit.scale.x.discrete()`.
- `position` is always `'identity'`. `'dodge'` and `'stack'` are rejected with `UNSUPPORTED_POSITION`.
- No polar coordinates.
- Duplicate rows for one band and group all draw. Aggregate first with `kit.transform.aggregate()`.
- `plugins` are read once at mount. Keep the kit at module scope.
