# Spec

The spec is a plain JSON object that says what to draw. You build it with small functions, then hand it to `GraphProvider` with the data. Exact types: types.md § Spec builders.

Contents

- Build a spec
- Mapping
- Geoms
- Data labels
- Scales
- Coordinate systems
- Stats
- Transforms
- Config
- Pitfalls

## Build a spec

`createSpec` seeds the spec. `pipe` folds items onto it, left to right. Every item is a plain object, so a spec can be stored, diffed, and sent over the wire.

```ts
import { createSpec, pipe, geom, scale } from '@graphysdk/react';

const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.bar(), scale.x(), scale.y());
```

The first argument to `createSpec` may be a mapping. Any further arguments are spec items, so `createSpec({ x: 'month', y: 'revenue' }, geom.bar(), scale.x(), scale.y())` is the same spec. The mapping can also be left out and added later as an item: `createSpec(transform.reshape(), mapping({ x: 'key', y: 'value' }), geom.bar())`.

A fuller spec, touching most parts of this file:

```ts
import { createSpec, pipe, geom, scale, coord, config, transform, mapping } from '@graphysdk/react';

const spec = pipe(
  createSpec(),
  transform.reshape({ keep: ['quarter'], reshape: ['North', 'South', 'West'], keyName: 'region', valueName: 'sales' }),
  mapping({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'stack', dataLabels: { showStackTotals: true } }),
  coord.cartesian(),
  scale.x(),
  scale.y(),
  scale.color.palette({ palette: { type: 'graphy' } }),
  config({
    legend: { position: 'top' },
    axes: { y: { label: 'Sales' } },
    numberFormat: { abbreviation: 'k' },
    content: { title: 'Sales by region', subtitle: 'Last four quarters' },
  })
);
```

How items combine:

- `geom.*` and `scale.*` accumulate. One call per layer, one per scale.
- `config()` deep merges. Later calls add to earlier ones.
- `mapping()` shallow merges over the current mapping.
- `coord.*` replaces the coordinate system.
- `transform.*` items run in order before any layer reads the data.
- `styles()` stacks stylesheets (see styling.md). `highlight()` and `annotation.*` accumulate (see storytelling.md).

## Mapping

A mapping ties a data variable to a visual channel. The channels are `x`, `y`, `color`, `size`, `alpha`, `group`, `label`, `strokeWidth`, and `lineType`.

Three ways to write a channel:

```ts
import { createSpec } from '@graphysdk/react';

const spec = createSpec({
  x: 'month', // shorthand for a variable
  y: { variable: 'revenue' }, // explicit variable
  color: { value: '#3D63A8' }, // one constant for every observation
});
```

`group` splits geoms into separate lines or areas without giving each group a visual channel. `color` does the same and colours each group.

A layer can override the spec mapping for itself with `aes`. The layer mapping merges over the spec mapping:

```ts
import { createSpec, pipe, geom, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.bar(),
  geom.line({ aes: { y: 'forecast', lineType: { value: 'dashed' } } }),
  scale.x(),
  scale.y()
);
```

Use the `mapping()` item instead of the `createSpec` argument when a transform must create the variables first. See Transforms.

## Geoms

There are six geoms: `point`, `line`, `area`, `bar`, `rule`, and `tile`. Each `geom.*` call adds one layer. Anything else (candlestick, lollipop, treemap) is a plugin, see plugins.md.

Every geom takes the same option object. All fields are optional.

```ts
import { createSpec, pipe, geom, scale, stat, transform } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue', color: 'region' }),
  geom.line({
    id: 'revenue-line', // stable id, used by highlights and annotation anchors
    aes: { lineType: { value: 'dashed' } }, // layer mapping, merged over the spec mapping
    stat: stat.smooth({ method: 'linear' }), // or a name: 'identity' | 'count' | 'mean' | 'sum' | 'smooth'
    position: 'identity', // 'stack' | 'dodge' | 'identity' | 'fill'
    yScaleType: 'primary', // 'primary' | 'secondary'
    params: { curve: 'smooth' }, // geom-specific, see below
    transforms: [transform.filter({ variableName: 'region', operator: 'eq', value: 'North' })], // this layer only
    interactive: false, // skip hover hit testing
    dataLabels: { showDataLabels: true },
  }),
  scale.x(),
  scale.y()
);
```

`position` defaults per geom: bar is `dodge`, area is `stack`, the rest are `identity`. Bar, line, and area layers sort their observations by x when x is numeric or temporal. `stack` piles groups on top of each other, `dodge` places them side by side, `fill` stacks and normalises every band to 100%.

### point

No params. Map `size` for a bubble graph, `color` for groups.

```ts
import { createSpec, pipe, geom, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'income', y: 'lifeExpectancy', size: 'population', color: 'continent' }),
  geom.point(),
  scale.x.log(),
  scale.y(),
  scale.size.continuous({ range: [3, 30] }),
  scale.color.palette()
);
```

### line

Params: `curve` (`'linear'` default, or `'smooth'`) and `missingValues` (`'gap'` default, `'zero'`, or `'connect'`).

```ts
import { createSpec, pipe, geom, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'date', y: 'price', color: 'ticker' }),
  geom.line({ params: { curve: 'smooth', missingValues: 'connect' } }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

### area

Same params as line. `missingValues` defaults to `'zero'`, and `'gap'` becomes `'zero'` because an area cannot break inside a stack. Position defaults to `stack`.

```ts
import { createSpec, pipe, geom, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'users', color: 'plan' }),
  geom.area({ position: 'fill' }), // 100% stacked
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

### bar

One param: `width`, the bar's share of its band, in `(0, 1]`. It defaults to 0.7, and to 1 under polar coords. A value above 1 becomes 1 and a value at or below 0 falls back to the default, both with an INVALID_GEOM_PARAM warning. Fill, border, and corner radius are styling, not params (styling.md § Style targets).

```ts
import { createSpec, pipe, geom, scale } from '@graphysdk/react';

const grouped = pipe(
  createSpec({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'dodge', params: { width: 0.7 } }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

Horizontal bars use `coord.flip()`. Pie and donut use `coord.polar()`. See Coordinate systems.

### rule

A single reference line. It reads one observation, so give it a constant through `aes`. A `y` mapping draws a horizontal line, an `x` mapping a vertical one. Params: `label` and `labelPosition` (`'start'` default or `'end'`).

```ts
import { createSpec, pipe, geom, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.bar(),
  geom.rule({ aes: { y: { value: 500 } }, params: { label: 'Target', labelPosition: 'end' } }),
  scale.x(),
  scale.y()
);
```

Rules are not interactive by default and draw under cartesian and flip coords only; polar errors. Their paint is set through `style.geom.rule` (styling.md). More uses in storytelling.md § Reference lines.

### tile

No params. A tile fills one cell of a band on x and a band on y. This is the heatmap geom. Map `color` to a numeric variable. The colour scale is inferred from that column when you declare none, so `scale.color.continuous()` is only needed to pick a scheme. The y band is reversed by default so the first band sits at the top. Tiles draw under cartesian coords only and accept only `position: 'identity'`; flip or polar fails with UNSUPPORTED_COORD and another position with UNSUPPORTED_POSITION. Tiles label every cell by default, so pass `dataLabels: { showDataLabels: false }` to turn labels off.

```ts
import { createSpec, pipe, geom, scale, config } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'cohort', y: 'week', color: 'retention' }),
  geom.tile(),
  scale.x(),
  scale.y(),
  scale.color.continuous({ scheme: 'viridis' }),
  config({ axes: { x: { position: 'top' }, y: { position: 'left' } }, legend: { position: 'none' } })
);
```

## Data labels

Every geom accepts `dataLabels`. Off by default, except tiles. The label text is the observation's value, or the `label` channel when the mapping sets one.

```ts
import { createSpec, pipe, geom, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({
    position: 'stack',
    dataLabels: {
      showDataLabels: true,
      format: 'percentage', // or 'absolute'
      showStackTotals: true, // one total per stack
      position: 'inside', // 'auto' | 'inside' | 'outside'
      justify: 'end', // along the value axis, only read when position is explicit
      align: 'center', // across the band
      offset: 4, // pixels between geom edge and label
    },
  }),
  scale.x(),
  scale.y()
);
```

`position: 'auto'` lets the engine fit, flip, or drop labels: labels on narrow vertical bars rotate together as a layer, labels that do not fit short grouped bars move outside, and labels on tiny fill segments are dropped. Flipped bars never rotate. An explicit position renders exactly as asked, except that `'outside'` on stacked or filled cartesian bars becomes `'inside'` with a warning. `justify` also accepts `'panel-start'` and `'panel-end'`, which pin labels to the panel edge. It defaults to `'center'` for stacked and filled bars. `offset` defaults to 4 for bars and points and 8 for lines and areas. Polar bars default `format` to `'percentage'`. Under polar coords and on stacked or filled bars the panel anchors are replaced by `'start'` and `'end'` with a DATA_LABEL_PLACEMENT_COERCED warning. `showStackTotals` only applies to `position: 'stack'`. Not every geom draws labels: rules never do, and points, lines, and areas not under polar. Turning them on there emits a DATA_LABELS_UNSUPPORTED warning and draws nothing. `showCategoryLabels` adds the band name to each bar (cartesian) or prefixes the wedge label (polar), placed by the `category*` fields. Full list: types.md § Mapping & layers, `ResolvedDataLabelsSpec`.

## Scales

A scale turns data values into positions or visual values. The x and y scales are never created for you. Declare `scale.x()` and `scale.y()` in every spec, or the geoms get no positions. Two other scales are added when missing: `ySecondary` when a layer uses `yScaleType: 'secondary'`, and `color`, which falls back to the default palette (or to a ramp inferred from the column under a tile). If a spec declares two scales for the same aesthetic, the last one is used.

### Position scales

`scale.x()`, `scale.y()`, and `scale.ySecondary()` infer the scale type. The geom decides first: a bar bands x whatever the column holds, and a tile bands both axes. Otherwise the column decides: numeric becomes continuous, text becomes a band scale (discrete), dates become datetime. An unmapped position or a `{ value }` mapping becomes continuous. Pass options to the inferred call, or pick the type yourself. An explicit continuous or datetime scale under a bar or tile is replaced by a band with an UNSUPPORTED_SCALE_TYPE warning.

```ts
import { scale } from '@graphysdk/react';

scale.x(); // inferred
scale.y({ domainMin: 0, nice: true }); // inferred, with options
scale.y.continuous({ domainMin: 0, domainMax: 100, nice: false, reverse: false, clamp: false });
scale.x.discrete({ domain: ['Q1', 'Q2', 'Q3', 'Q4'], padding: 0.2, reverse: false }); // fixes band order
scale.x.datetime({ domainMin: Date.parse('2024-01-01'), nice: true });
scale.y.log({ domainMin: 1 }); // continuous with base-10 log
scale.y.sqrt();
```

`domainMin` and `domainMax` pin one end, the other end still follows the data. Bars and areas already anchor y at zero, so `domainMin: 0` is redundant there. `nice` rounds the domain to round values (on by default for continuous, off for datetime, and forced off on y under `position: 'fill'`). `clamp` defaults to false for position scales and true for size, alpha, strokeWidth, and colour. A discrete `domain` lists the bands in order and drops everything else. `padding` defaults to 0.1 of the band step; tiles force it to 0, and so does `coord.polar()` for every discrete scale.

`scale.ySecondary()` is a second y axis. Bind a layer to it with `yScaleType: 'secondary'`:

```ts
import { createSpec, pipe, geom, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month' }),
  geom.bar({ aes: { y: 'revenue' } }),
  geom.line({ aes: { y: 'margin' }, yScaleType: 'secondary' }),
  scale.x(),
  scale.y(),
  scale.ySecondary()
);
```

### Colour scales

`scale.color` has no inferred form. Leave it out for the default palette, or pick one of three:

```ts
import { scale } from '@graphysdk/react';

// Groups from a named palette. Default palette when the option is omitted.
scale.color.palette(); // default palette; goes single-hue when geoms touch (stacked, filled, or tiles)
scale.color.palette({ palette: { type: 'graphy' } });
scale.color.palette({ palette: { type: 'pastel' } });
scale.color.palette({ palette: { type: 'mono', base: 'blue' } });
scale.color.palette({ palette: { type: 'neon', base: 'cyan' } });
scale.color.palette({ palette: { type: 'graphy', variant: 'waterfall' } }); // graphy, pastel, and neon take variant 'waterfall'
scale.color.palette({ palette: { type: 'mono', base: 'blue', variant: 'dark' } }); // mono takes variant 'light' | 'dark'
scale.color.palette({ palette: { type: 'custom', id: 'brand' } }); // registered through GraphProvider customPalettes
scale.color.palette({ overrides: { 1: { hex: '#E83562' }, 3: { id: 'accent' } } }); // group number, 1-based; id looks up the active custom palette

// Groups with explicit colours, in band order.
scale.color.discrete({ range: ['#B84737', '#0B8666', '#3D63A8'] });

// A numeric variable on a colour ramp.
scale.color.continuous({ scheme: 'viridis' });
scale.color.continuous({ range: ['#F2D8CB', '#6E0500'], interpolate: 'lab' });
scale.color.continuous({ scheme: 'RdBu', domainMid: 0 }); // diverging, symmetric about 0 by default
```

Schemes: `viridis`, `magma`, `inferno`, `plasma`, `cividis`, `turbo`, `Blues`, `Greens`, `Greys`, `Oranges`, `Purples`, `Reds`, and the diverging `RdBu`, `BrBG`, `PuOr`, `Spectral` (aliases `'red-blue'`, `'brown-teal'`, `'purple-orange'`, `'spectral'`). A diverging scheme without `domainMid` warns DIVERGING_SCHEME_WITHOUT_MIDPOINT. `symmetric: false` keeps the raw extent. Setting both `scheme` and `range` warns CONFLICTING_COLOR_RAMP and uses the range. An unregistered custom palette or an unknown override id warns PALETTE_NOT_FOUND and falls back. `mono` bases: brick, gray, red, orange, yellow, green, cyan, blue, purple, pink. `neon` bases: cyan, pink, purple, red, orange, yellow, green, blue.

### Size, alpha, stroke width, line type

```ts
import { scale } from '@graphysdk/react';

scale.size.continuous({ range: [4, 20] }); // default range; size already uses a sqrt transform so area follows the value; adds a size legend
scale.size.identity(); // data values are pixels
scale.alpha.continuous({ range: [0.1, 1] });
scale.strokeWidth.discrete({ range: [1, 3, 6] });
scale.lineType.discrete({ domain: ['actual', 'forecast'], range: ['solid', 'dashed'] });
scale.lineType.identity(); // data values are 'solid' | 'dashed' | 'dotted'
```

`lineType` is discrete only. Mapping it to a numeric variable fails at compile time.

## Coordinate systems

Cartesian is the default. `coord.flip()` swaps the axes. `coord.polar()` maps one position to angle and the other to radius. Each takes optional `xLimits` and `yLimits` as `[min, max]`.

```ts
import { createSpec, pipe, geom, scale, coord } from '@graphysdk/react';

// Horizontal bars
const horizontal = pipe(
  createSpec({ x: 'country', y: 'gdp' }),
  geom.bar(),
  coord.flip(),
  scale.x(),
  scale.y()
);

// Pie: one band on x, value on the angle
const pie = pipe(
  createSpec({ x: '', y: 'share', color: 'browser' }),
  geom.bar({ position: 'fill' }),
  coord.polar({ theta: 'y' }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);

// Donut: same with a hole
const donut = pipe(
  createSpec({ x: '', y: 'share', color: 'browser' }),
  geom.bar({ position: 'fill' }),
  coord.polar({ theta: 'y', innerRadius: 0.55, startAngle: 0 }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);

```

`theta` says which position sweeps the angle. `'y'` makes wedges of a pie. `'x'` is the default, so a bare `coord.polar()` is not a pie. `'x'` puts the bands around the circle, which gives a rose graph with bars or a radar with `geom.line` and `scale.x.discrete()` (recipes/charts/radar.md, polar-bar.md). `innerRadius` is a fraction of the radius, `startAngle` is in degrees. The pie maps `x` to `''` so every observation shares one band.

## Stats

A stat summarises the layer's observations before drawing. Set it per layer.

```ts
import { createSpec, pipe, geom, scale, stat, mapping } from '@graphysdk/react';

// Count observations per band; no y mapping needed
const counts = pipe(createSpec(), mapping({ x: 'category' }), geom.bar({ stat: 'count' }), scale.x(), scale.y());

// Sum of y per band and group
const sums = pipe(createSpec({ x: 'region', y: 'sales', color: 'channel' }), geom.bar({ stat: 'sum' }), scale.x(), scale.y());

// Trend line over the points
const trend = pipe(
  createSpec({ x: 'spend', y: 'revenue' }),
  geom.point(),
  geom.line({ stat: stat.smooth({ method: 'linear' }), interactive: false }),
  scale.x(),
  scale.y()
);
```

Smooth methods: `'linear'`, `'loess'` (option `bandwidth`, default 0.3), `'exponential'`, `'logarithmic'`, `'quadratic'`, `'power'`, `'polynomial'` (option `order`, default 3). The string forms `'identity'`, `'count'`, `'mean'`, `'sum'`, and `'smooth'` are the same as the builders with defaults, so `'smooth'` is a linear fit. `count` needs an x mapping and errors when y is also mapped (CONFLICTING_STAT_MAPPING). `sum` and `mean` need y (MISSING_STAT_VARIABLE). `count` and `sum` group by x and by the group variables. `mean` reduces the whole layer to one observation, so it suits a single reference value, not a bar per band. An explicit `group` mapping is the only group variable; otherwise every categorical visual channel (color, size, alpha, strokeWidth, lineType) splits the groups.

## Transforms

Transforms change the data before layers read it. A spec-level transform applies to every layer. A layer-level `transforms` list applies to that layer only and accepts built-in transforms; plugin transforms go at the spec level.

```ts
import { createSpec, pipe, geom, scale, transform, mapping } from '@graphysdk/react';

// Wide to long. Rows { quarter, North, South, West } become { quarter, region, sales }.
const reshaped = pipe(
  createSpec(),
  transform.reshape({ keep: ['quarter'], reshape: ['North', 'South', 'West'], keyName: 'region', valueName: 'sales' }),
  mapping({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'stack' }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);
```

`reshape()` with no options collapses every numeric variable and keeps the rest, under the names `key` and `value`. Put the `mapping()` after the transform so it can name the new variables.

The other transforms:

```ts
import { transform } from '@graphysdk/react';

transform.filter({ variableName: 'region', operator: 'eq', value: 'North' }); // eq | neq | gt | gte | lt | lte
transform.sort({ variableName: 'sales', direction: 'desc' }); // 'asc' default
transform.aggregate({
  groupby: ['region'],
  operations: [{ op: 'sum', variableName: 'sales', as: 'totalSales' }], // count | sum | mean | median | mode | min | max
});
transform.constant({ variableName: 'label', type: 'categorical', value: 'Total' }); // numeric | categorical | temporal
```

A layer-level `transforms` list lets two layers see different shapes of the same data, for example bars over reshaped regions and a line over an untouched total column (recipes/charts/combo.md).

## Config

`config()` sets everything that is not a geom, scale, or style: legend, axes, number format, text content, headline numbers, panel overflow, and the parsing locale. Every field is optional and deep merges onto the defaults. Exact shape: types.md § Config.

```ts
import { config } from '@graphysdk/react';

config({
  legend: {
    position: 'top', // 'auto' | 'right' | 'left' | 'top' | 'bottom' | 'none'
    display: 'pill', // 'pill' | 'direct' | 'auto'  ('direct' labels the line ends)
    align: 'start', // 'auto' | 'start' | 'center' | 'end'
  },
  axes: {
    x: { isVisible: true, label: 'Month', position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: true, mode: 'auto' } },
    y: { label: 'Revenue', position: 'left', ticks: { isVisible: true, mode: 'edges' } }, // y defaults to the right side with ticks hidden
    ySecondary: { label: 'Margin' }, // sparse; position defaults opposite y, label to none, the rest copies y
  },
  numberFormat: { // graph-wide; there is no per-axis or per-layer number format
    decimals: 1, // number or 'auto'
    abbreviation: 'auto', // 'auto' | 'k' | 'm' | 'b' | 'none'
    prefix: '$',
    suffix: '',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  content: {
    title: 'Revenue',
    isTitleVisible: true,
    subtitle: 'Monthly, 2024',
    isSubtitleVisible: true,
    caption: 'Excludes refunds',
    isCaptionVisible: true, // captions and sources are hidden by default
    source: { label: 'Finance team', url: 'https://example.com' },
    isSourceVisible: true,
    brandMark: { enabled: true, placement: 'footer', variant: 'full' },
  },
  headline: {
    show: 'total', // 'total' | 'average' | 'current' | 'none' ('conversion' exists but is not implemented)
    compareWith: 'previous', // 'previous' | 'first' | 'none'
    size: 'auto', // 'auto' | 'small' | 'medium' | 'large'
    position: 'above', // 'above' | 'center' (centre only inside a donut hole)
  },
  panel: {
    overflow: {
      dataLabels: { x: 'inside', y: 'inside' }, // 'outside' | 'inside' | 'none'
      differenceArrows: { x: 'outside', y: 'outside' },
    },
  },
  parsingLocale: 'en-US', // 'en-GB' | 'en-US' | 'pt-PT' | 'ar'
});
```

Notes:

- Axis `grid.isVisible` accepts `null`, which lets the geom decide (bars hide the x grid).
- `title`, `subtitle`, and `caption` accept a string or a rich text node (types.md § Config, `RichTextContent`).
- `isBrandMarkVisible` is an older alias of `brandMark.enabled`. The `@graphysdk/react` provider turns the mark on unless the spec says otherwise (react.md).
- `parsingLocale` is how the data is read. The display locale is the provider's `formattingLocale` (data.md § Parsing locale and formatting locale).
- Grid, axis, and legend paint (colours, fonts, dashes) is styling, not config. See styling.md.

## Unsupported chart types

Waterfall, funnel, mekko, and table are not chart types in this SDK. The old chart converter throws if you ask it for one. Say that they are unsupported and stop. Do not invent a plugin or a geom for them. `variant: 'waterfall'` on a palette only swaps in positive, negative, and total colours. It does not build a waterfall chart.

## Pitfalls

- The x and y scales are never inferred into existence. Add `scale.x()` and `scale.y()` to every spec. `ySecondary` and `color` are added for you when missing.
- Only six geoms exist. There is no text, pie, or candlestick geom. Pie is `geom.bar` under `coord.polar({ theta: 'y' })`. A new mark is a plugin, except waterfall, funnel, mekko, and table, which are unsupported.
- `createSpec` and `pipe` return new objects. Keep the result, they never mutate.
- Wide data (one column per group) needs `transform.reshape` before the mapping can name `color`. Put `mapping()` after the transform.
- A `rule` draws one line per layer. Several reference lines are several `geom.rule` calls.
- `area` cannot leave gaps. `missingValues: 'gap'` becomes `'zero'`.
