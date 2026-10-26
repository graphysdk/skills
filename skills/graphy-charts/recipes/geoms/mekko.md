# Mekko

A 100% stacked column chart whose columns are as wide as their totals, so each cell's area is its share of the whole: how big each market is reads across, each company's share of it reads up. Also called a Marimekko chart. Ships as `@graphysdk/geom-mekko`; do not write a plugin for it.

## Install

```bash
npm install @graphysdk/geom-mekko
```

Peers: `@graphysdk/react` and React.

## Basic

One row per cell. Map the column to `x`, the cell's amount to `y` and its group to `color`. The axis along the columns is continuous: declare `kit.scale.x.continuous()`, not `discrete()`.

```tsx
import { mekko } from '@graphysdk/geom-mekko';
import { createGraphyKit, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const marketsData: Data = {
  columns: [{ key: 'market' }, { key: 'company' }, { key: 'revenue', valueFormat: { type: 'currency', iso: 'usd' } }],
  rows: [
    { market: 'Retail', company: 'Acme', revenue: 420 },
    { market: 'Retail', company: 'Globex', revenue: 260 },
    { market: 'Retail', company: 'Initech', revenue: 180 },
    { market: 'Energy', company: 'Acme', revenue: 90 },
    { market: 'Energy', company: 'Globex', revenue: 210 },
    { market: 'Energy', company: 'Initech', revenue: 60 },
    { market: 'Health', company: 'Acme', revenue: 150 },
    { market: 'Health', company: 'Globex', revenue: 70 },
    { market: 'Health', company: 'Initech', revenue: 130 },
  ],
};

const kit = createGraphyKit({ plugins: [mekko] });

const spec = kit.pipe(
  kit.createSpec({ x: 'market', y: 'revenue', color: 'company' }),
  kit.geom.mekko(),
  kit.scale.x.continuous(),
  kit.scale.y.continuous(),
  kit.scale.color.discrete()
);

export function Markets() {
  return (
    <kit.GraphProvider data={marketsData} spec={spec}>
      <GraphRenderer />
    </kit.GraphProvider>
  );
}
```

Create the kit once at module scope. `kit.GraphProvider` shows the Graphy badge by default; `config({ content: { graphyBadge: { visible: false } } })` turns it off. Each column is as wide as its total's share of the grand total and the columns run in data order. Each cell is as tall as its amount's share of its column; the cells stack in the order their group first appears, so a group holds the same place in every column. Rows that repeat a column and group are summed into one cell. A missing, zero or negative amount draws no cell.

Both axes run from 0 to 100%. The x axis is ticked with each column's name at its center and draws no grid line through the columns. The y axis reads each cell's share of its column and has no title by default; give it one with `config({ axes: { y: { label: 'Share of market' } } })`.

## Variants

### Column order

`sort` runs the columns largest first, smallest first, or in the order a list names them. A column the list leaves out follows in data order.

```ts
const descendingLayer = kit.geom.mekko({ params: { sort: 'descending' } });
const namedOrderLayer = kit.geom.mekko({ params: { sort: ['Energy', 'Retail'] } });
```

### Horizontal

```ts
const horizontalSpec = kit.pipe(
  kit.createSpec({ x: 'market', y: 'revenue', color: 'company' }),
  kit.geom.mekko(),
  kit.scale.x.continuous(),
  kit.scale.y.continuous(),
  kit.scale.color.discrete(),
  kit.coord.flip()
);
```

The columns run down the chart as rows, the first at the top.

### Data labels

```ts
const labeledLayer = kit.geom.mekko({ dataLabels: { showDataLabels: true } });
```

Under the default `position: 'auto'` each label sits in the center of its cell and is dropped when it does not fit, never moved onto a neighbor. An explicit `position` is honored as written. The label prints `y`; map `label` to `mekkoShareOfColumn` to print the share instead.

### Styling

Every cell is one observation. The cells abut, so the border is what parts them. A chart-wide `style.geom()` reaches the cells as it reaches a bar.

```ts
const styledSpec = kit.pipe(
  kit.createSpec({ x: 'market', y: 'revenue', color: 'company' }),
  kit.geom.mekko(),
  kit.styles({
    defaults: [kit.style.geom.mekko({ strokeWidth: 4 })],
    overrides: [
      kit.style.geom.mekko(
        { fill: { pattern: 'diagonal', color: '#1d4e89', background: '#eef3fa' } },
        { where: { variable: 'company', eq: 'Globex' } }
      ),
    ],
  }),
  kit.scale.x.continuous(),
  kit.scale.y.continuous(),
  kit.scale.color.discrete()
);
```

| Builder                  | Properties                                                                            | Default                                                         |
| ------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `kit.style.geom.mekko()` | `fill`, `fillAlpha`, `alpha`, `stroke`, `strokeWidth`, and the shared geom vocabulary | The `color` scale's color, a 1px border in the background color |

A `fill` takes a pattern (`diagonal`, `crosshatch`, `dots`) or a gradient as well as a color. A pattern replaces the scale's color, so write it as an override and pick the group out with `where`. The legend keeps the scale's colors.

### Share variables

The default stat writes two fractions, formatted as percentages. Name either in a `highlight`, a `where` or a `label` mapping.

| Variable             | Value                                      |
| -------------------- | ------------------------------------------ |
| `mekkoShareOfColumn` | The cell's share of its column: its height |
| `mekkoColumnShare`   | The column's share of the total: its width |

### Hover and highlight

The tooltip is headed by the column and lists each group's share of it, with the hovered cell marked. It gives shares, not amounts. A highlight raises each matched cell: `highlight({ variable: 'mekkoShareOfColumn', gt: 1 / 3 })` picks every cell over a third of its column.

## Pitfalls

- The x axis is continuous. `kit.scale.x.discrete()` draws the cells in the wrong places with no warning.
- A zero, negative or non-finite amount is dropped without a warning.
- A very narrow column's name can run into its neighbor's.
- No polar coordinates.
- `plugins` are read once at mount. Keep the kit at module scope.
