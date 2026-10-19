# Sankey

Flows between nodes, each flow as wide as its amount: energy from its sources to its uses, a budget from income to spending, visitors from a landing page to a sale. Ships as `@graphysdk/geom-sankey`; do not write a plugin for it. A stage-by-stage funnel is `@graphysdk/geom-funnel`.

## Install

```bash
npm install @graphysdk/geom-sankey
```

Peers: `@graphysdk/react` and React.

## Basic

One row per flow. Map the node it leaves to `source`, the node it reaches to `target` and its amount to `value`. The geom lays itself out across the panel, so it takes no scales and draws no axes.

```tsx
import { sankey } from '@graphysdk/geom-sankey';
import { createGraphyKit, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const energyData: Data = {
  columns: [{ key: 'from' }, { key: 'to' }, { key: 'twh', label: 'Energy (TWh)' }],
  rows: [
    { from: 'Coal', to: 'Electricity', twh: 110 },
    { from: 'Gas', to: 'Electricity', twh: 90 },
    { from: 'Gas', to: 'Heat', twh: 120 },
    { from: 'Solar', to: 'Electricity', twh: 40 },
    { from: 'Electricity', to: 'Homes', twh: 120 },
    { from: 'Electricity', to: 'Industry', twh: 100 },
    { from: 'Electricity', to: 'Transport', twh: 20 },
    { from: 'Heat', to: 'Homes', twh: 80 },
    { from: 'Heat', to: 'Industry', twh: 40 },
  ],
};

const kit = createGraphyKit({ plugins: [sankey] });

const spec = kit.pipe(kit.createSpec({ source: 'from', target: 'to', value: 'twh' }), kit.geom.sankey());

export function Energy() {
  return (
    <kit.GraphProvider data={energyData} spec={spec}>
      <GraphRenderer />
    </kit.GraphProvider>
  );
}
```

Create the kit once at module scope. `kit.GraphProvider` shows "Made with Graphy" by default; `config({ content: { brandMark: { enabled: false } } })` turns it off. The nodes are the names the flows share, each as tall as the larger of what flows in and what flows out. Flows run left to right, a node in the column after every node that flows into it. A missing, zero or negative amount draws no flow. A flow from a node to itself, or one that would close a loop, is left out.

## Variants

### Color

Each node takes its own color and each flow the color of the node it leaves. Color always groups by node, so `color` accepts only the source or the target column; any other column is refused with `UNSUPPORTED_MAPPING`. Map the target to color a flow as the node it reaches.

```ts
const byTargetSpec = kit.pipe(
  kit.createSpec({ source: 'from', target: 'to', value: 'twh', color: 'to' }),
  kit.geom.sankey()
);
```

`color: { value: '#1f2933' }` paints every node and flow one color. Each node carries its name, so there is no legend unless `config({ legend: { position: 'bottom' } })` asks for one.

### Alignment

`params.align` chooses the column a node sits in.

| `align`               | A node sits                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `'justify'` (default) | As far left as its inflows allow, except a node no flow leaves, which takes the last column        |
| `'left'`              | As far left as its inflows allow                                                                   |
| `'right'`             | As far right as its outflows allow                                                                 |
| `'center'`            | As far left as its inflows allow, except a node no flow reaches, which sits as far right as it can |

```ts
const leftAlignedLayer = kit.geom.sankey({ params: { align: 'left' } });
```

### Styling

The flows are the observations. The nodes and their names are parts.

```ts
const styledSpec = kit.pipe(
  kit.createSpec({ source: 'from', target: 'to', value: 'twh' }),
  kit.geom.sankey(),
  kit.styles({
    defaults: [
      kit.style.geom.sankey({ fillAlpha: 0.5 }),
      kit.style.geom.sankey.node({ stroke: '#ffffff', strokeWidth: 1 }),
      kit.style.geom.sankey.label({ fontWeight: 700, fontSize: 13 }),
    ],
    overrides: [kit.style.geom.sankey.node({ fill: '#1f2933' })],
  })
);
```

| Builder                         | Paints         | Properties                                                                                  | Default                                                                    |
| ------------------------------- | -------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `kit.style.geom.sankey()`       | The flows      | `fill`, `fillAlpha`, `alpha`, `stroke`, `strokeAlpha`, and the shared geom vocabulary       | The `color` scale's color at `fillAlpha` 0.4, 0.65 while hovered           |
| `kit.style.geom.sankey.node()`  | The nodes      | `fill`, `fillAlpha`, `alpha`, `stroke`, `strokeWidth`                                       | The `color` scale's color, no border                                       |
| `kit.style.geom.sankey.label()` | The node names | `fontFamily`, `fontSize`, `fontWeight`, `textColor`, `textOutlineColor`, `textOutlineWidth` | 12px, weight 500, the primary text color, outlined in the background color |

The flows and the nodes read the `color` scale, and the scale beats an entry in `defaults`, so an entry that replaces their color is an override. Every entry takes a `where`, tested against the observation it paints. A `fill` on a flow or a node takes a pattern or a gradient as well as a color.

### Hover and highlight

Hovering a node raises it with every flow in and out of it; hovering a flow raises it with the two nodes it joins. The rest dims. A node's tooltip is headed by its name and gives its total; a flow's is headed by the node it leaves and names where it goes.

A node holds its own name in the source column and its total in the amount column, so a highlight reaches nodes and flows alike: `highlight({ variable: 'from', eq: 'Gas' })` raises the Gas node with the flows leaving it, and `highlight({ variable: 'twh', gt: 100 })` raises every node and flow over 100.

## Pitfalls

- No `scale.x()` or `scale.y()`. The geom has no axes.
- `color` takes the source column, the target column or a fixed value. Anything else is `UNSUPPORTED_MAPPING`.
- A flow takes one color. It does not fade from its source's color to its target's.
- Node width and spacing are sized to the panel and are not options.
- Loops are left out, not drawn back around.
- The names of two short nodes in one column can meet.
- `plugins` are read once at mount. Keep the kit at module scope.
