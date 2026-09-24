# Storytelling

How to make a graph say one thing: highlight the observations that matter, mark thresholds, show trends, put a number in front, and pin notes to the data. Exact types: `reference/types.md` § Highlights and § Annotations.

Contents

- Highlights
- Dimming styles
- Reference lines
- Trendlines
- Headlines
- Data labels
- Direct labels
- Hover guide and tooltips
- Anchors
- Text annotations
- Arrows
- Difference arrows
- Shapes and images
- Stickers, pinned numbers, comments
- Worked examples
- Pitfalls

## Highlights

`highlight(predicate, options)` marks the observations that match. What the renderer draws depends on the geom.

- Bar and tile: unmatched observations dim, matched ones are redrawn at full strength.
- Line, area and point: a `'data-point'` or `'x-value'` match draws a marker dot with a value label at each matched observation and dims nothing. Only scope `'series'` dims the other groups.
- Rule: never highlights.

```ts
import { createSpec, geom, highlight, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'dodge' }),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  highlight({ variable: 'region', eq: 'EU' })
);
```

The predicate tests one variable, or combines tests:

```ts
import { highlight } from '@graphysdk/react';

highlight({ variable: 'region', eq: 'EU' });
highlight({ variable: 'quarter', oneOf: ['Q3', 'Q4'] });
highlight({ variable: 'sales', gte: 2000 });
highlight({ variable: 'sales', range: [1500, 2500] });
highlight({ and: [{ variable: 'region', eq: 'EU' }, { variable: 'quarter', oneOf: ['Q3', 'Q4'] }] });
highlight({ or: [{ variable: 'region', eq: 'EU' }, { variable: 'quarter', eq: 'Q1' }] });
highlight({ not: { variable: 'region', eq: 'EU' } });
```

Comparison keys: `eq`, `oneOf`, `lt`, `lte`, `gt`, `gte`, `range`. A test on the y variable reads the value before stacking, so `{ variable: 'sales', gte: 2000 }` means the observation's own value, not the stack top. An ordering key on a text variable, or an unknown variable name, drops that highlight with a warning and the graph still renders. Predicates are checked per layer, so the highlight is dropped only on the layer where the variable is missing and still applies on the others. The same predicate language drives style rules (`where`) and selection anchors.

Options:

- `scope`: how far a match spreads. `'data-point'` (default) keeps only the matched observations. `'series'` keeps every observation in the same group as a match. `'x-value'` keeps every observation at the same x value.
- `layerId`: only evaluate on the layer with that id (`geom.bar({ id: 'bars' })`). Other layers are untouched.
- `id`: a stable id for the highlight.

Several `highlight()` calls union their matches. To put one line in focus and fade the others, use scope `'series'`:

```ts
import { createSpec, geom, highlight, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue', color: 'product' }),
  geom.line({ id: 'lines' }),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  highlight({ variable: 'product', eq: 'Alpha' }, { scope: 'series', layerId: 'lines' })
);
```

## Dimming styles

Dimmed observations use the built-in dimmed alpha. Change it with a style entry in the `dimmed` state. `style.geom` covers every geom; `style.geom.bar` and friends narrow to one kind. The only states are `'dimmed'` and `'hovered'`.

```ts
import { createSpec, geom, highlight, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'dodge' }),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  highlight({ variable: 'region', eq: 'EU' }),
  styles({
    defaults: [
      style.geom({ saturation: 0, alpha: 0.5 }, { state: 'dimmed' }),
      style.geom.bar({ stroke: '#1d2129', strokeWidth: 1 }, { where: { variable: 'region', eq: 'EU' } }),
    ],
  })
);
```

`saturation: 0` greys the dimmed geoms. A `where` entry paints the matched observations without a highlight at all, on any geom. Combine `state` and `where` to dim some observations more than others.

The paint words are `fill` and `stroke`. A bar, point, area and tile fill; a line and a rule stroke. There is no `color` property. A property outside the target's vocabulary is dropped with a warning and the rest of the entry still applies.

## Reference lines

`geom.rule` draws one line across the panel. Give it one numeric constant, on `y` for a horizontal line or on `x` for a vertical one.

```ts
import { createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.bar(),
  geom.rule({ aes: { y: { value: 2500 } }, params: { label: 'Target', labelPosition: 'start' } }),
  scale.x(),
  scale.y(),
  styles({ defaults: [style.geom.rule({ stroke: '#e5484d', strokeWidth: 1.5, dashArray: [4, 4] })] })
);
```

- Exactly one of `x` or `y` takes the constant. Under `coord.flip()` the orientation flips with the axes. Under `coord.polar()` a rule is rejected with `UNSUPPORTED_COORD`.
- Keep vertical rules to a numeric x scale. What a band or date x does with one is not documented.
- The rule value takes part in the scale domain, so a target above the data extends the axis. Next to a `position: 'fill'` layer on the same y scale the value is clamped to `[0, 1]`.
- `params.label` is optional. `labelPosition` is `'start'` (default) or `'end'`.
- A rule is not interactive: no hover, no tooltip, and it cannot be the target of an observation anchor.
- The label's text colour is picked for readability against the rule's stroke unless `style.geom.rule.label({ textColor })` sets it.
- Layers paint in spec order. Add the rule after the bars to draw it on top.

An average line is a rule with `stat.mean()`. The stat fills `y` with the mean of the mapped y variable.

```ts
import { createSpec, geom, pipe, scale, stat } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.bar(),
  geom.rule({ stat: stat.mean(), params: { label: 'Average' } }),
  scale.x(),
  scale.y()
);
```

Several rules stack. Give them ids to style them one by one.

```ts
import { createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.bar(),
  geom.rule({ id: 'floor', aes: { y: { value: 1000 } }, params: { label: 'Floor', labelPosition: 'start' } }),
  geom.rule({ id: 'target', aes: { y: { value: 2500 } }, params: { label: 'Target' } }),
  scale.x(),
  scale.y(),
  styles({
    defaults: [
      style.geom.rule({ dashArray: [0, 2] }, { layer: 'floor' }),
      style.geom.rule.label({ fontSize: 11, fontWeight: 600 }),
    ],
  })
);
```

## Trendlines

A trendline is a line layer with the `smooth` stat. Keep the raw observations as points and add a fitted line on top.

```ts
import { createSpec, geom, pipe, scale, stat, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'weight', y: 'power' }),
  geom.point(),
  geom.line({
    stat: stat.smooth({ method: 'linear' }),
    interactive: false,
    aes: { color: { value: '#e5484d' }, lineType: { value: 'dashed' } },
  }),
  styles({ defaults: [style.geom.line({ strokeWidth: 2 })] }),
  scale.x(),
  scale.y()
);
```

`method` is required in `stat.smooth({ method })`; only the string shorthand `stat: 'smooth'` defaults to `'linear'`. Methods: `'linear'`, `'loess'`, `'exponential'`, `'logarithmic'`, `'quadratic'`, `'power'`, `'polynomial'`. `order` applies to `'polynomial'` only (default 3), `bandwidth` to `'loess'` only (default 0.3).

```ts
import { stat } from '@graphysdk/react';

stat.smooth({ method: 'polynomial', order: 3 });
stat.smooth({ method: 'loess', bandwidth: 0.5 });
```

`interactive: false` keeps the fitted line out of hover and tooltips. With a `color` mapping, one trendline is fitted per group. A group with fewer than two observations is skipped. The fit also works over a band x (each band counts as its position in data order) and a date x (dates are converted for the fit and back, so the line rides the datetime scale).

## Headlines

A headline is a large number above the panel. On a cartesian graph there is one per group and the strip takes the legend's place, unless direct labels are drawn. On a pie or donut there is a single grand total. Turn it on in `config`.

```ts
import { config, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'date', y: 'revenue' }),
  geom.line(),
  scale.x(),
  scale.y(),
  config({ headline: { show: 'current', compareWith: 'previous', size: 'auto' } })
);
```

- `show`: `'total'`, `'average'`, `'current'` (last value), or `'none'`. `'conversion'` exists but compiles to no headline. On a pie or donut only `'total'` draws anything, and `'total'` is suppressed on a `position: 'fill'` layer.
- `compareWith`: `'previous'` or `'first'`. A `'current'` headline always carries a trend when the x variable holds dates, whatever its scale, so a bar with a date x trends too. `'none'` does not switch the trend off; it behaves like `'first'`.
- `size`: `'auto'`, `'small'`, `'medium'`, `'large'`.
- `position`: `'above'` (default) or `'center'`, which only applies inside a donut hole.
- In a combo graph each headline item follows the value format of the layer it summarises.

Headline paint lives under `style.headline` and `style.headlineItem`, with parts `style.headlineItem.number`, `.number.center`, `.caption`, `.label`, `.swatch`, `.trend`, `.trend.up`, `.trend.down`, `.trend.flat`. See `reference/styling.md`.

## Data labels

Each geom layer takes a `dataLabels` option.

```ts
import { createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue', color: 'region' }),
  geom.bar({
    position: 'stack',
    dataLabels: { showDataLabels: true, showStackTotals: true, format: 'absolute' },
  }),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  styles({
    defaults: [
      style.dataLabel({ fontSize: 11, fontWeight: 700 }),
      style.dataLabel.observation.inside({ textColor: '#ffffff' }),
      style.dataLabel.aggregate({ fontWeight: 800 }),
    ],
  })
);
```

- `position`: `'auto'` (default, the engine fits, flips or drops labels), `'inside'` or `'outside'`.
- `justify` and `align` place an explicit label on the geom's box. `justify` runs along the value axis (`'start'`, `'center'`, `'end'`, `'panel-start'`, `'panel-end'`). `align` runs across it (`'start'`, `'center'`, `'end'`).
- `offset`: pixels between the geom and the label.
- `format`: `'absolute'` or `'percentage'`.
- `showStackTotals`: one total per stack, styled by `style.dataLabel.aggregate`.
- `showCategoryLabels` with `categoryPosition`, `categoryJustify`, `categoryAlign`, `categoryOffset`: a second label per bar with the band value. On stacked and filled bars `categoryPosition: 'outside'` becomes `'inside'`. On a pie or donut `showCategoryLabels` instead prepends the band to the value label, and the `category*` fields do not apply.

A label that spills past the panel edge stays inside by default. Change that with `config({ panel: { overflow: { dataLabels: { x: 'outside', y: 'outside' } } } })`; the values are `'outside'`, `'inside'` or `'none'`.

Style roles: `style.dataLabel.observation`, `.category`, `.aggregate`. The `observation` and `category` roles split into `.inside` and `.outside`.

## Direct labels

Direct labels replace the legend with a label at the end of each group.

```ts
import { config, createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue', color: 'region' }),
  geom.line(),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  config({ legend: { position: 'right', display: 'direct' } }),
  styles({ defaults: [style.directLabel({ fontSize: 12, fontWeight: 600 })] })
);
```

Direct labels are drawn whenever the graph can anchor them: the legend position is `'right'`, the graph is cartesian and not flipped, and exactly one layer can carry the labels. `display` defaults to `'auto'`, so a right legend on a single line layer gets direct labels without asking. `'direct'` asks for the same; `'pill'` keeps the pill legend. When the graph cannot anchor them the legend silently stays a pill legend. Line and area layers carry direct labels at any position. Bars only under `position: 'stack'` or `'fill'`. Points never.

`style.directLabel` takes text properties plus `stroke`, `strokeWidth` and `dashArray` for the connector drawn when labels overlap.

## Hover guide and tooltips

Hovering draws a guide on its own: bars draw a band across the whole x band, lines and areas draw a crosshair snapped to the nearest observation, points and tiles draw no guide. Under `coord.polar()` lines and areas draw a spoke from the centre to the edge and bars draw a translucent wedge. In a combo graph each layer draws its own guide. Style it with `style.hoverGuide({ stroke, fill })`, where `stroke` is the crosshair and `fill` is the band.

Tooltips are on by default. Turn them off with `<GraphRenderer showTooltips={false} />`. A layer with `interactive: false` never hovers.

## Anchors

Every annotation is positioned by an anchor that re-resolves on each compile, so it follows resizes and data changes. Point anchors, by `anchorType`:

- `panel`: `{ anchorType: 'panel', x: 0.5, y: 0.1 }`, fractions of the plot rect from the top left.
- `observation`: `{ anchorType: 'observation', anchorValue: 'Q3' }`. `anchorValue` is the value on the main axis. Add `groupValue` when several groups share that value, `crossValue` on tiles and scatters, and `layerId` when several layers match. Without `align`, it lands on the geom's natural point, such as the top of a bar.
- `axis`: `{ anchorType: 'axis', x: 'Q2', y: 2600 }`, data values mapped through the scales without snapping to an observation. Dropped under polar coordinates, with a missing scale, or with a value outside a band scale's domain.
- `selection`: `{ anchorType: 'selection', predicate, align: 'top' }`, a point on the box around every observation the predicate matches. `align` is required here.
- `annotation`: `{ anchorType: 'annotation', ref: 'note', align: 'bottom' }`, a point on another annotation's box.

`align` picks a point on the box: `'center'`, `'top'`, `'right'`, `'bottom'`, `'left'`, `'top-left'`, `'top-right'`, `'bottom-left'`, `'bottom-right'`. Axis and annotation anchors default to `'center'`. `offset` nudges the result: `{ x, y, unit: 'panel' | 'px' }`, panel fractions by default. The y axis points down, so a negative `y` moves up. Under `coord.polar()` a point anchor's offset is ignored.

Region anchors, for shapes and images:

- `{ anchorType: 'panel', x, y, width, height }` in panel fractions.
- `{ anchorType: 'selection', predicate, padding }`, the box around the matched observations. `padding` as a number or `{ x, y }` without a unit is a fraction of the panel; `{ x, y, unit: 'px' }` is pixels. Default 8 px.
- `{ anchorType: 'annotation', ref }`, another annotation's box.

Observation anchors skip layers with `interactive: false` unless `layerId` names the layer. Selection anchors take no `layerId` and always skip them. An observation anchor without `groupValue` that matches several observations takes the first in layer order; on a tile layer `groupValue` is ignored. An anchor that resolves to nothing, a `ref` to a missing id, or two annotations with the same id each produce a warning (`ANNOTATION_ANCHOR_UNRESOLVED`, `ANNOTATION_REF_NOT_FOUND`, `ANNOTATION_DUPLICATE_ID`) and the annotation is not drawn.

Difference arrows, pinned numbers and comments use the short observation form without `anchorType` and without `offset`: `{ anchorValue: 'Q3', groupValue: 'EU' }`.

## Text annotations

`annotation.text` places rich text at a point. `width` is a fraction of the plot width. `align` says which point of the text box sits on the anchor (default `'center'`).

```ts
import { annotation, createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'revenue' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  annotation.text({
    id: 'note',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'center' },
          content: [{ type: 'text', text: 'Best quarter so far', marks: [{ type: 'bold' }] }],
        },
      ],
    },
    at: { anchorType: 'observation', anchorValue: 'Q3', align: 'top', offset: { y: -0.08 } },
    width: 0.22,
    align: 'bottom',
  }),
  styles({ overrides: [style.annotation.text({ fill: '#fff3bf', stroke: '#e6b800', cornerRadius: 6 }, { annotation: 'note' })] })
);
```

The content shape is a document tree. `doc` holds block nodes: `paragraph`, `heading` (`attrs.level` 1 to 3), `blockquote`, `bulletList`, `orderedList`, `listItem`. Blocks hold `text` nodes and `hardBreak`. Marks on a text node: `bold`, `italic`, `underline`, `strike`, `code`, `link` (`attrs.href`, an unsafe href renders as plain text), and `textStyle` with `attrs` `color`, `fontSize` (a number in pixels) and `font` (or `fontFamily`). `paragraph.attrs.textAlign` is `left`, `right`, `center` or `justify`. A heading level outside 1 to 3 is clamped.

`style.annotation.text` takes text properties plus `fill`, `fillAlpha`, `alpha`, `stroke`, `strokeWidth`, `cornerRadius`, `paddingInline`, `paddingBlock`, `shadow`. `{ annotation: id }` narrows an entry to one annotation.

## Arrows

`annotation.arrow` connects two point anchors.

```ts
import { annotation, createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'revenue' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  annotation.arrow({
    id: 'to-q4',
    start: { anchorType: 'panel', x: 0.3, y: 0.15 },
    end: { anchorType: 'observation', anchorValue: 'Q4', align: 'top' },
    startArrowheadStyle: 'none',
    endArrowheadStyle: 'line-arrow',
  }),
  styles({ overrides: [style.annotation.arrow({ stroke: '#1c7ed6', strokeWidth: 3, dashArray: [] }, { annotation: 'to-q4' })] })
);
```

Arrowhead styles: `'none'` or `'line-arrow'`. Defaults: `'none'` at the start, `'line-arrow'` at the end. An endpoint on an observation, selection or annotation anchor with a directional `align` and no `offset` stops 4 px short of the edge, so the head does not touch the geom. An explicit `offset` replaces that gap. `style.annotation.arrow` takes `stroke`, `strokeWidth`, `dashArray`; `style.annotation.arrow.outline` paints a contrasting outline around the shaft.

## Difference arrows

`annotation.differenceArrow` measures the gap between two observations and labels it. Cartesian graphs only.

```ts
import { annotation, createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'sales', color: 'region' }),
  geom.bar({ position: 'dodge' }),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  annotation.differenceArrow({
    id: 'eu-growth',
    start: { anchorValue: 'Jan', groupValue: 'EU' },
    end: { anchorValue: 'Apr', groupValue: 'EU' },
    label: 'relative-difference',
    labelCrossPosition: 0.5,
  }),
  styles({
    overrides: [
      style.annotation.differenceArrow({ strokeWidth: 2 }, { annotation: 'eu-growth' }),
      style.annotation.differenceArrow.label({ fontSize: 12, fontWeight: 700 }, { annotation: 'eu-growth' }),
    ],
  })
);
```

`label`: `'absolute-difference'`, `'relative-difference'` or `'proportion'`. `labelCrossPosition` places the label along the arrow, 0 at the start, 1 at the end. Without a `stroke` override the arrow takes the group colour when both endpoints sit on the same layer and group and paint the same colour; otherwise the built-in. A label that spills past the panel edge stays outside by default; `config({ panel: { overflow: { differenceArrows: { x: 'inside', y: 'inside' } } } })` keeps it inside.

## Shapes and images

A shape is a rectangle over a region. Use it to shade a period or box a set of observations.

```ts
import { annotation, createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'revenue' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  annotation.shape({
    id: 'forecast',
    zOrder: 'background',
    region: { anchorType: 'panel', x: 0.75, y: 0, width: 0.25, height: 1 },
  }),
  annotation.shape({
    id: 'peak',
    region: {
      anchorType: 'selection',
      predicate: { variable: 'quarter', oneOf: ['Q3', 'Q4'] },
      padding: { x: 10, y: 10, unit: 'px' },
    },
  }),
  styles({
    overrides: [
      style.annotation.shape({ fill: '#4dabf7', fillAlpha: 0.16, strokeWidth: 0 }, { annotation: 'forecast' }),
      style.annotation.shape({ fill: 'transparent', stroke: '#1c7ed6', strokeWidth: 2 }, { annotation: 'peak' }),
    ],
  })
);
```

`kind` is only `'rectangle'`. `zOrder` is `'foreground'` (default, over the geoms) or `'background'`. An image works the same way with `src` and `fit` (`'fill'`, `'contain'` (default), `'cover'`):

```ts
import { annotation } from '@graphysdk/react';

annotation.image({
  id: 'logo',
  src: 'https://example.com/logo.png',
  region: { anchorType: 'panel', x: 0.8, y: 0.05, width: 0.15, height: 0.15 },
  fit: 'contain',
});
```

`style.annotation.image` takes `alpha` and `cornerRadius`.

## Stickers, pinned numbers, comments

A sticker is a built-in image at a point anchor. Ids: `'rocket'`, `'thumbs-up'`, `'thumbs-down'`, `'clapping-hands'`, `'grinning-face'`.

```ts
import { annotation } from '@graphysdk/react';

annotation.sticker({ id: 's1', sticker: 'rocket', at: { anchorType: 'observation', anchorValue: 'Q4' } });
```

A pinned number shows an observation's value in a bubble next to a marker dot. Hovering the bubble opens the observation's tooltip. A comment does the same with your text, and hovering it shows the full comment. Both use the short observation anchor.

```ts
import { annotation, createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'revenue' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  annotation.pinnedNumber({ id: 'pin-q4', at: { anchorValue: 'Q4' } }),
  annotation.comment({
    id: 'note-q1',
    at: { anchorValue: 'Q1' },
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Soft start' }] }] },
  }),
  styles({
    defaults: [style.annotation.pinnedNumber.label({ fill: '#fff3bf', stroke: '#e6b800' })],
    overrides: [style.annotation.pinnedNumber({ fill: '#e5484d', size: 12 }, { annotation: 'pin-q4' })],
  })
);
```

`style.annotation.pinnedNumber` and `style.annotation.comment` paint the marker dot: `fill`, `size`, `stroke`, `strokeWidth`, `shadow`. Their `.label` parts paint the bubble.

## Worked examples

Call out the peak:

```ts
import { annotation, createSpec, geom, highlight, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  highlight({ variable: 'month', eq: 'May' }),
  annotation.text({
    id: 'peak',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Record month' }] }] },
    at: { anchorType: 'observation', anchorValue: 'May', align: 'top', offset: { y: -0.12 } },
    width: 0.2,
    align: 'bottom',
  }),
  annotation.arrow({
    start: { anchorType: 'annotation', ref: 'peak', align: 'bottom' },
    end: { anchorType: 'observation', anchorValue: 'May', align: 'top' },
  }),
  styles({ defaults: [style.geom({ alpha: 0.35 }, { state: 'dimmed' })] })
);
```

Goal line with the bars above it in a second colour:

```ts
import { createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const goal = 2500;

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.bar(),
  geom.rule({ aes: { y: { value: goal } }, params: { label: 'Goal', labelPosition: 'end' } }),
  scale.x(),
  scale.y(),
  styles({
    defaults: [style.geom.bar({ fill: '#c9ced8' }), style.geom.rule({ stroke: '#0b7a75', dashArray: [4, 3] })],
    overrides: [style.geom.bar({ fill: '#0b7a75' }, { where: { variable: 'revenue', gte: goal } })],
  })
);
```

Compare two bars:

```ts
import { annotation, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'year', y: 'users' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  annotation.differenceArrow({ start: { anchorValue: 2023 }, end: { anchorValue: 2025 }, label: 'relative-difference' })
);
```

One group in focus, the rest as context. The line geom only dims with scope `'series'`:

```ts
import { config, createSpec, geom, highlight, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'share', color: 'product' }),
  geom.line(),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  highlight({ variable: 'product', eq: 'Alpha' }, { scope: 'series' }),
  config({ legend: { position: 'right', display: 'direct' } }),
  styles({
    defaults: [style.geom({ saturation: 0, alpha: 0.3 }, { state: 'dimmed' }), style.geom.line({ strokeWidth: 3 })],
  })
);
```

## Pitfalls

- A `'data-point'` highlight on a line, area or point layer marks the observations instead of dimming the rest. Use scope `'series'` to fade the other groups.
- Use the same value as in your rows for `anchorValue` and predicate values. A month parsed as a date still matches by the text you passed in.
- Keep vertical `geom.rule` values on a numeric x scale.
- `style.geom.rule({ color })` is dropped with a warning. Rules and lines stroke, so declare `stroke`.
- `style.annotation.*` entries take only `{ annotation: id }`. `where`, `state` and `layer` belong to geom entries.
- A `selection` or `observation` anchor that matches nothing drops the annotation with a warning. Check the predicate first, and remember that `interactive: false` layers are skipped: always by selection anchors, and by observation anchors unless `layerId` names the layer.
- Annotations set by hand on `spec.annotations` are grouped by kind: `textAnnotations`, `arrows`, `shapes`, `images`, `stickers`, `differenceArrows`, `pinnedNumbers`, `comments`. Prefer the `annotation.*` builders.
