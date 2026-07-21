# Line charts

| Variant | Delta from base |
|---|---|
| Simple | base recipe below |
| Multi-series | `transform.reshape` wide→long, map `color`, add `scale.color.palette()` |
| Per-series dash patterns | also map `lineType`, add `scale.lineType.discrete({ domain, range })` |
| Smooth | `geom.line({ params: { interpolate: 'catmull-rom' } })` |
| Missing values | `geom.line({ params: { missingValues: 'gap' \| 'connect' \| 'zero' } })` |
| Vertex dots | add a companion layer `geom.point({ interactive: false })` |

## Base: simple line

```tsx
import { createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import '@graphysdk/react-renderer/styles.css';

const data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', revenue: 1200 },
    { month: 'Feb', revenue: 1800 },
    { month: 'Mar', revenue: 2400 },
    { month: 'Apr', revenue: 1600 },
    { month: 'May', revenue: 3200 },
  ],
};

const input = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.line(), scale.x(), scale.y());

export function LineChart() {
  return (
    <GraphProvider data={data} input={input}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

`createSpec({ x, y })` is shorthand for `createSpec()` + `mapping({ x, y })`.

## Multi-series (wide data)

```ts
const wideData = {
  columns: [{ key: 'month' }, { key: 'North' }, { key: 'South' }, { key: 'East' }],
  rows: [
    { month: 'Jan', North: 600, South: 900, East: 1400 },
    { month: 'Feb', North: 700, South: 1050, East: 1600 },
    { month: 'Mar', North: 800, South: 1200, East: 1800 },
  ],
};

const input = pipe(
  createSpec(
    transform.reshape({ keep: ['month'], reshape: ['North', 'South', 'East'], keyName: 'region', valueName: 'sales' }),
    mapping({ x: 'month', y: 'sales', color: 'region' })
  ),
  geom.line(),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  config({ legend: { position: 'top' } })
);
```

## Per-series dash patterns

Map `lineType` to the series variable and pin the pattern per series with a discrete scale:

```ts
mapping({ x: 'month', y: 'sales', color: 'region', lineType: 'region' }),
geom.line(),
scale.color.palette(),
scale.lineType.discrete({ domain: ['North', 'South', 'East'], range: ['solid', 'dashed', 'dotted'] }),
```

## Smooth interpolation

```ts
geom.line({ params: { interpolate: 'catmull-rom' } }) // default 'linear'
```

## Missing values

For rows where y is `null`:

```ts
geom.line({ params: { missingValues: 'gap' } })     // break the path at nulls (default)
geom.line({ params: { missingValues: 'connect' } }) // drop nulls, span the gap
geom.line({ params: { missingValues: 'zero' } })    // substitute zero
```

## Vertex dots

Add a point layer that reuses the spec-level mapping; `interactive: false` keeps hover hit-detection on the line:

```ts
geom.line(),
geom.point({ interactive: false }),
```

## Line params

`geom.line({ params: { ... } })`: `lineWidth` (px or `'auto'`), `interpolate` (`'linear'` default \| `'catmull-rom'`), `missingValues` (`'gap'` default \| `'connect'` \| `'zero'`), `showFill` (gradient fill beneath the line, default `false`).

## Gotchas

- Wide data needs `transform.reshape` before `color` (or `lineType`) can map to the series variable.
- `lineType` scales are discrete-only — mapping `lineType` to a numeric variable errors at compile time. Valid range values: `'solid' | 'dashed' | 'dotted'`.
- `showFill` defaults to `false`; pass `geom.line({ params: { showFill: true } })` for a gradient fill beneath the line. The fill's 15% opacity is fixed — a mapped `alpha` dims the whole series (stroke and fill together), it cannot make the fill more opaque.
- Companion dot layers should set `interactive: false` so they do not compete with the line in hover hit-detection.
