# Error bar

The uncertainty around an estimate: a line from an interval's lower end to its upper, with a cap across each end, drawn over the bars or points that show the estimates. Confidence intervals, standard errors, min–max ranges. Ships as `@graphysdk/geom-error-bar`; do not write a plugin for it. A distribution from raw values is `@graphysdk/geom-boxplot`.

## Install

```bash
npm install @graphysdk/geom-error-bar
```

Peers: `@graphysdk/react` and React.

## Basic

One row per estimate. Map the category to `x`, the estimate to `y` and the interval's ends to `lower` and `upper`. Add the error bar as a layer after the bars so it paints on top. A `color` group dodges each error bar onto its own bar.

```tsx
import { errorbar } from '@graphysdk/geom-error-bar';
import { createGraphyKit, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const trialData: Data = {
  columns: [
    { key: 'treatment' },
    { key: 'age' },
    { key: 'days', label: 'Mean days' },
    { key: 'ciLow' },
    { key: 'ciHigh' },
    { key: 'se' },
  ],
  rows: [
    { treatment: 'Placebo', age: 'Under 50', days: 12, ciLow: 10.5, ciHigh: 13.5, se: 0.8 },
    { treatment: 'Placebo', age: '50 and over', days: 15, ciLow: 12, ciHigh: 18, se: 1.5 },
    { treatment: 'Drug A', age: 'Under 50', days: 8, ciLow: 7, ciHigh: 9, se: 0.5 },
    { treatment: 'Drug A', age: '50 and over', days: 10, ciLow: 8.5, ciHigh: 11.5, se: 0.75 },
    { treatment: 'Drug B', age: 'Under 50', days: 9, ciLow: 8, ciHigh: 10, se: 0.5 },
    { treatment: 'Drug B', age: '50 and over', days: 11, ciLow: 9, ciHigh: 13, se: 1 },
  ],
};

const kit = createGraphyKit({ plugins: [errorbar] });

const spec = kit.pipe(
  kit.createSpec({ x: 'treatment', y: 'days', color: 'age' }),
  kit.geom.bar(),
  kit.geom.errorbar({ aes: { lower: 'ciLow', upper: 'ciHigh' } }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous()
);

export function Recovery() {
  return (
    <kit.GraphProvider data={trialData} spec={spec}>
      <GraphRenderer />
    </kit.GraphProvider>
  );
}
```

Create the kit once at module scope. `kit.GraphProvider` shows "Made with Graphy" by default; `config({ content: { brandMark: { enabled: false } } })` turns it off. The value axis fits the intervals. On its own an error bar does not hold zero; under bars, the bars hold it.

## Variants

### An error either side

Map `error` instead of the two ends. The interval runs from `y - error` to `y + error`.

```ts
const standardErrorLayer = kit.geom.errorbar({ aes: { error: 'se' } });
```

Map `error`, or both `lower` and `upper`. Mixing them is `CONFLICTING_STAT_MAPPING`; one end alone is `MISSING_AESTHETIC`. The ends may be written in either order. A row with a missing end, a missing estimate or a negative error draws no error bar.

### Dot and whisker

A point per estimate over its interval. Draw the error bar first so the point paints over it.

```ts
const surveyData: Data = {
  columns: [{ key: 'region' }, { key: 'score', label: 'Mean score' }, { key: 'low' }, { key: 'high' }],
  rows: [
    { region: 'North', score: 7.2, low: 6.8, high: 7.6 },
    { region: 'South', score: 6.4, low: 5.7, high: 7.1 },
    { region: 'East', score: 7.8, low: 7.5, high: 8.1 },
    { region: 'West', score: 6.9, low: 6.1, high: 7.7 },
  ],
};

const dotSpec = kit.pipe(
  kit.createSpec({ x: 'region', y: 'score' }),
  kit.geom.errorbar({ aes: { lower: 'low', upper: 'high' }, params: { width: 0.3 } }),
  kit.geom.point(),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.coord.flip()
);
```

Points do not dodge, so a dot-and-whisker chart takes one group per category.

### Horizontal

Add `kit.coord.flip()`. The categories move to the vertical axis and the intervals run across.

### Caps

`params.width` is the fraction of its band share each cap spans, from `0` to `1`; `0.5` by default. `0` draws a bare line. A value outside `[0, 1]` warns `INVALID_GEOM_PARAM` and falls back to `0.5`.

```ts
const bareLayer = kit.geom.errorbar({ aes: { lower: 'ciLow', upper: 'ciHigh' }, params: { width: 0 } });
```

### Styling

The line and its caps are one observation.

```ts
const styledSpec = kit.pipe(
  kit.createSpec({ x: 'treatment', y: 'days', color: 'age' }),
  kit.geom.bar(),
  kit.geom.errorbar({ aes: { lower: 'ciLow', upper: 'ciHigh' } }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.styles({
    defaults: [
      kit.style.geom.bar({ fillAlpha: 0.35 }),
      kit.style.geom.errorbar({ stroke: '#1f1e1b', strokeWidth: 2.5 }),
      kit.style.geom.errorbar({ stroke: '#b84737' }, { where: { variable: 'age', eq: 'Under 50' } }),
    ],
  })
);
```

| Builder                     | Properties                                    | Default                   |
| --------------------------- | --------------------------------------------- | ------------------------- |
| `kit.style.geom.errorbar()` | `stroke`, `alpha`, `strokeWidth`, `dashArray` | Primary text color, 1.5px |

Error bars ignore the `color` scale, so they stay visible over a bar of the same group; `color` still groups and dodges them. Color a group's error bars with `where`. A chart-wide `style.geom()` fill, overlay or shadow does not reach them; a chart-wide `stroke`, `alpha`, `strokeWidth` or `dashArray` does.

### Hover and highlight

An error bar attaches to the layer before it. Hovering a bar raises it with its own error bar, and the tooltip adds an `Interval` row under each group's row. Drawn first or alone, as a forest plot, the error bar answers the hover itself. `attachTo: '<layer id>'` attaches it to another layer; `attachTo: false` detaches it. Rename the row with the layer's `tooltip`: `{ Interval: { title: '95% CI' } }`.

The geom writes each interval's ends as `errorbarLower` and `errorbarUpper`, in `y`'s units, however the interval was mapped. A highlight on them reaches only the error bars: `highlight({ variable: 'errorbarUpper', gt: 12 })`. A highlight on a column the bars share, such as `age`, raises both layers.

## Pitfalls

- The category axis is always a band. Declare `kit.scale.x.discrete()`; error bars over a line on a time axis are not drawn.
- Pass the estimate and its interval. The geom does not compute a mean or a confidence interval from raw rows.
- Error bars line up with bars of the default width. A bar with its own `width` param leaves its error bar where it was.
- `position: 'stack'` and `coord.polar()` are rejected.
- `dataLabels` prints nothing on an error bar.
- `plugins` are read once at mount. Keep the kit at module scope.
