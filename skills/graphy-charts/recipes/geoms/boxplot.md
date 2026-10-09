# Boxplot

How values spread across bands: a box from the first to the third quartile, a line at the median, whiskers to the furthest values near the box, and every value beyond them as an outlier. Ships as `@graphysdk/geom-boxplot`; do not write a plugin for it.

## Install

```bash
npm install @graphysdk/geom-boxplot
```

Peers: `@graphysdk/react` and React.

## Basic

Raw values, one row per value. Map the band to `x` and the value to `y`. The geom's default `boxplot` stat computes the summary.

```tsx
import { boxplot } from '@graphysdk/geom-boxplot';
import { createGraphyKit, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const latencyData: Data = {
  columns: [{ key: 'service' }, { key: 'region' }, { key: 'ms' }],
  rows: [
    { service: 'Search', region: 'EU', ms: 128 },
    { service: 'Search', region: 'EU', ms: 141 },
    { service: 'Search', region: 'EU', ms: 119 },
    { service: 'Search', region: 'EU', ms: 265 },
    { service: 'Search', region: 'US', ms: 152 },
    { service: 'Search', region: 'US', ms: 160 },
    { service: 'Search', region: 'US', ms: 147 },
    { service: 'Checkout', region: 'EU', ms: 204 },
    { service: 'Checkout', region: 'EU', ms: 230 },
    { service: 'Checkout', region: 'EU', ms: 188 },
    { service: 'Checkout', region: 'US', ms: 241 },
    { service: 'Checkout', region: 'US', ms: 256 },
    { service: 'Checkout', region: 'US', ms: 480 },
  ],
};

const kit = createGraphyKit({ plugins: [boxplot] });

const spec = kit.pipe(
  kit.createSpec({ x: 'service', y: 'ms' }),
  kit.geom.boxplot(),
  kit.scale.x.discrete(),
  kit.scale.y.continuous()
);

export function ResponseTimes() {
  return (
    <kit.GraphProvider data={latencyData} spec={spec}>
      <GraphRenderer />
    </kit.GraphProvider>
  );
}
```

Create the kit once at module scope. `kit.GraphProvider` shows "Made with Graphy" by default; `config({ content: { brandMark: { enabled: false } } })` turns it off. Quartiles interpolate as R, NumPy and d3 do. Whiskers reach the furthest value within 1.5 interquartile ranges of the box. The value axis fits every value, outliers included; it does not hold zero.

## Variants

### Groups

Map a group to `color`. Each band draws one box per group, dodged across it.

```ts
const groupedSpec = kit.pipe(
  kit.createSpec({ x: 'service', y: 'ms', color: 'region' }),
  kit.geom.boxplot(),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.scale.color.palette()
);
```

`position: 'dodge'` is the default. `'identity'` draws a band's boxes over one another. `'stack'` is rejected.

### Horizontal

Add `kit.coord.flip()`.

### Params

```ts
const tunedLayer = kit.geom.boxplot({
  params: { extent: 3, width: 0.8, outliers: true, notch: true, showMean: true, varwidth: true },
});
```

| Param      | Default | Meaning                                                                                              |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `extent`   | `1.5`   | Whisker reach in interquartile ranges. `'min-max'` runs whiskers to the extremes, with no outliers.  |
| `width`    | `0.6`   | Fraction of the band a band's boxes span, in `(0, 1]`. Above `1` clamps; at or below `0` falls back. |
| `outliers` | `true`  | `false` hides them and the room they held on the value axis.                                         |
| `notch`    | `false` | Notch each box at its median's rough 95% interval.                                                   |
| `showMean` | `false` | Mark each box's mean.                                                                                |
| `varwidth` | `false` | Scale each box's width by the square root of its count, against the largest box.                     |

### Summarized data

One row per box, with `stat: kit.stat.identity()`. `lowerWhisker`, `q1`, `median`, `q3` and `upperWhisker` are required. `outlier`, `mean`, `notchLower`, `notchUpper` and `count` are optional. A row holding only `outlier` draws as an outlier on its band's box.

```ts
const summarizedLayer = kit.geom.boxplot({
  stat: kit.stat.identity(),
  aes: {
    lowerWhisker: 'low',
    q1: 'lower',
    median: 'middle',
    q3: 'upper',
    upperWhisker: 'high',
    count: 'requests',
    outlier: 'slow',
  },
});
```

Under the default stat, mapping any summary aesthetic is an error (`CONFLICTING_STAT_MAPPING`).

### Styling

The boxes are the observations. Each other piece is a part. Every piece takes its group's color from the scale unless an entry names one.

```ts
import { styles } from '@graphysdk/react';

const styledSpec = kit.pipe(
  kit.createSpec({ x: 'service', y: 'ms' }),
  kit.geom.boxplot(),
  styles({
    defaults: [
      kit.style.geom.boxplot({ fillAlpha: 0.85, stroke: 'transparent' }),
      kit.style.geom.boxplot.median({ stroke: '#3a3833', strokeWidth: 2.5 }),
      kit.style.geom.boxplot.whisker({ stroke: '#898373', dashArray: [3, 3] }),
      kit.style.geom.boxplot.cap({ strokeWidth: 0 }),
      kit.style.geom.boxplot.outlier({ fillAlpha: 1, size: 5 }),
    ],
  }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous()
);
```

| Builder                            | Properties                                                    | Default                         |
| ---------------------------------- | ------------------------------------------------------------- | ------------------------------- |
| `kit.style.geom.boxplot()`         | `fill`, `stroke`, `strokeWidth`, their alphas                 | Fill at 0.3 alpha, 1.5px border |
| `kit.style.geom.boxplot.median()`  | `stroke`, `alpha`, `strokeWidth`, `dashArray`                 | 2px                             |
| `kit.style.geom.boxplot.whisker()` | `stroke`, `alpha`, `strokeWidth`, `dashArray`                 | 1.5px                           |
| `kit.style.geom.boxplot.cap()`     | `stroke`, `alpha`, `strokeWidth`, `dashArray`                 | 1.5px                           |
| `kit.style.geom.boxplot.outlier()` | `fill`, `fillAlpha`, `stroke`, `alpha`, `size`, `strokeWidth` | A hollow 6px dot                |
| `kit.style.geom.boxplot.mean()`    | `fill`, `fillAlpha`, `stroke`, `alpha`, `size`, `strokeWidth` | A solid 7px dot with a border   |

### Summary columns

The stat writes `boxplotQ1`, `boxplotMedian`, `boxplotQ3`, `boxplotLowerWhisker`, `boxplotUpperWhisker`, `boxplotCount`, `boxplotMean`, `boxplotNotchLower`, `boxplotNotchUpper`, `boxplotRelativeWidth` and `boxplotOutlier`, in the units of `y`. The package exports the names as `BOXPLOT_COLUMNS`. Name them in a `highlight` or a `where`: `highlight({ variable: 'boxplotQ3', gt: 250 })`. An outlier keeps its own row, `y` included.

### Hover and highlight

The tooltip lists the whiskers, quartiles, median and count, then the mean when `showMean` is on. An outlier shows its own value. A highlight raises each matched box with its outliers.

## Pitfalls

- The x axis is always a band. Declare `kit.scale.x.discrete()`.
- A layer `stat` that computes `y` (`count`, `mean`, `sum`) is rejected. Use the default stat or `identity`.
- `y` must be numeric under the default stat (`INCOMPATIBLE_TYPE` otherwise).
- No data labels: `dataLabels` prints nothing on a box.
- No polar coordinates. No jittered points or violins; draw raw points as a separate point layer.
- `plugins` are read once at mount. Keep the kit at module scope.
