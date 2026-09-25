# Styling

Every paint decision on a graph goes through one stylesheet: geoms, axes, labels, tooltip, legend, headline, annotations and the graph frame. This file is the full vocabulary. Exact types are in `types.md` under "Styling API".

Contents

- Where styles live
- Style entries
- Property values
- Style targets
- Geom paint and the encoding
- Conditions: where and layer
- States: hovered and dimmed
- Tokens and colour schemes
- The graph target
- Palettes and colour scales
- Themes and presets
- Built-in stylesheet
- Pitfalls

## Where styles live

A stylesheet is a spec item. Pipe it in with `styles()`.

```ts
import { createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'sales' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  styles({
    defaults: [style.geom.bar({ fill: '#c9ced8', cornerRadius: 'full' }), style.gridLine({ dashArray: [] })],
    overrides: [style.geom.bar({ fill: '#e5484d' }, { where: { variable: 'sales', gt: 500 } })],
  })
);
```

A stylesheet has four optional fields.

- `defaults`: entries that apply where nothing else decided. A mapped aesthetic (say `color: 'region'`) beats a default.
- `overrides`: entries that replace what the encoding decided.
- `tokens`: named colours that entries reference with `token('name')`.
- `extends`: other stylesheets composed under this one. See "Themes and presets".

Piping several `styles()` items stacks them. Each later item sits above everything before it, so it is more specific. Within one list, order is specificity too: for each property, the last matching entry that declares it decides.

## Style entries

`style.<target>(declarations, options)` builds one entry. The path names what you paint. The first argument is the declarations. The second holds conditions and an optional stable `id`.

```ts
import { style } from '@graphysdk/react';

style.geom.line({ strokeWidth: 3 });
style.geom.bar({ fill: '#e5484d' }, { where: { variable: 'sales', gt: 500 } });
style.geom({ alpha: 0.2 }, { state: 'dimmed' });
style.geom.point({ size: 12 }, { layer: 'actual', id: 'actual-points' });
style.tooltip.heading({ fontWeight: 700 });
style.panelBorder.bottom({ strokeWidth: 1, dashArray: [] });
style.annotation.shape({ fill: '#3b82f6' }, { annotation: 'q3-box' });
```

Targets nest two ways.

- By kind: `style.geom` is the paint every geom shares, `style.geom.bar` opens the bar vocabulary. Annotations nest the same way: `style.annotation.arrow`.
- By partition: `style.gridLine.x`, `style.panelBorder.top`, `style.tooltip.heading`, `style.dataLabel.observation.inside`, `style.heading.h1`.

A bare entry addresses the whole target. `style.tooltip` is the popover box, not its text parts. `style.heading` is a wildcard over `h1` and `h2`. `style.source` is the label only, not the link. `style.legend` is the pill row, `style.legendItem` the pill.

Only geom entries take `where`, `state` and `layer`. A rule label takes `layer` only. Annotation entries take `annotation`. Chrome entries (axes, labels, tooltip, legend, graph) take only `id`. TypeScript rejects the rest.

## Property values

Each property has one value shape. A property can mean a different domain on different targets: `cornerRadius` is a token on a bar and pixels on a tile.

| Shape | Value | Properties |
| --- | --- | --- |
| colour | CSS colour string, `{ light, dark }` pair, or `token('name')` | `stroke`, `textColor`, `textOutlineColor` |
| paint | a colour, or a gradient, pattern or image (below) | `fill`, on every target that accepts it |
| 0 to 1 | number | `alpha`, `fillAlpha`, `strokeAlpha` |
| pixels | number, 0 or more | `strokeWidth`, `size`, `fontSize`, `offset`, `gap`, `length`, `paddingInline`, `paddingBlock`, `blur`, `textOutlineWidth`, and `cornerRadius` on tile, panelBorder, graph, editOutline |
| bar radius | `'none'`, `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'full'`, or pixels | `cornerRadius` on `geom.bar` |
| box radius | pixels, or `{ topLeft, topRight, bottomRight, bottomLeft }` | `cornerRadius` on tooltip, legend popover, legend item, data label, text annotation, image annotation, difference arrow label, callout labels |
| dash array | `number[]` in stroke widths, `[]` is solid | `dashArray` |
| multiplier | number, 1 is unchanged | `saturation`, `brightness`, `contrast`, `lineHeight`, `textScale` |
| signed pixels | number, negative allowed | `letterSpacing` |
| shadow | `'none'` or `{ offsetX, offsetY, blur, color }` | `shadow`, `textShadow` |
| sides | number for every side, or `{ top, right, bottom, left }` with any subset | `padding`, `margin` |
| words | see below | `fontStyle`, `textTransform`, `textDecoration`, `lineCap`, `lineJoin`, `blendMode`, `symbol` |
| font family | CSS family list | `fontFamily` |
| font weight | number 1 to 1000 | `fontWeight` |

Word values:

- `fontStyle`: `normal`, `italic`, `oblique`
- `textTransform`: `none`, `uppercase`, `lowercase`, `capitalize`
- `textDecoration`: `none`, `underline`, `line-through`
- `lineCap`: `butt`, `round`, `square`
- `lineJoin`: `miter`, `round`, `bevel`
- `blendMode`: `normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`
- `symbol`: `circle`, `square`, `diamond`, `triangle`, `cross`, `star`, `wye`

Paint shapes:

```ts
import { style, token } from '@graphysdk/react';

style.geom.bar({ fill: { gradient: 'linear', angle: 180, stops: [{ offset: 0, color: '#ff6719' }, { offset: 1, color: '#ffd6c2' }] } });
style.geom.area({ fill: { gradient: 'radial', stops: [{ offset: 0, color: token('brand') }, { offset: 1, color: 'white' }] } });
style.geom.bar({ fill: { pattern: 'diagonal', color: '#1d2129', background: '#ffffff', size: 8 } });
style.geom.tile({ fill: { image: 'data:image/png;base64,iVBORw0KGgo=', fit: 'tile', size: 24, alpha: 0.8, fallback: '#cccccc' } });
```

A gradient angle follows CSS: `180` runs top to bottom. Patterns are `diagonal`, `dots` or `crosshatch`. An image is a `data:image/` URI; `fit` is `tile` (default) or `stretch`; `fallback` paints until the image decodes.

Notes on a few properties:

- `alpha` is the geom's main opacity: the fill on a bar, area, point or tile, the stroke on a line. On a line, `fillAlpha` is the wash under the path and draws nothing unless declared. On an area, `strokeAlpha` is the outline's opacity, separate from the fill.
- `strokeWidth: 0` is an explicit no border. On chrome it also reserves no space.
- `offset` on a tick label is the distance from the panel edge, 10px by default and 14px on the left and right edges. `margin` on chrome closes or opens the space a slot reserves. Where two margins meet, say a bottom axis title's `margin.bottom` and a bottom legend's `margin.top`, the larger one is used, not the sum. `padding` is the graph's outer padding and does not scale with `textScale`.
- `lineHeight` is a multiple of `fontSize`. `textScale` on the graph multiplies every text size.
- A per-corner `cornerRadius` object must name all four corners, or the declaration is dropped. `padding` and `margin` objects may name any subset of sides.
- Pixel and multiplier values reject negatives. Alpha values must sit in 0 to 1. A pattern or image `size` must be above 0. A gradient needs at least two stops with offsets in 0 to 1.
- A declaration outside the target's vocabulary, or with a malformed value, is dropped on its own with a warning. An unknown target, partition, kind or state drops the whole entry.

## Style targets

Every target and the properties it accepts. Shorthands used in the table:

- GEOM: `fill`, `stroke`, `alpha`, `fillAlpha`, `strokeAlpha`, `saturation`, `blur`, `brightness`, `contrast`, `shadow`, `blendMode`
- TEXT: `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `letterSpacing`, `textTransform`, `textDecoration`, `textOutlineColor`, `textOutlineWidth`, `textShadow`, `lineHeight`, `textColor`
- BOXED: TEXT plus `paddingInline`, `paddingBlock`, `fill`, `stroke`, `strokeWidth`, `cornerRadius`, `shadow`, `alpha`
- BOX: `fill`, `stroke`, `strokeWidth`, `cornerRadius`, `paddingInline`, `paddingBlock`, `shadow`, `alpha`
- STROKE: `stroke`, `strokeWidth`, `dashArray`

| Target | Properties | Options |
| --- | --- | --- |
| `geom` | GEOM | `where`, `state`, `layer` |
| `geom.bar` | GEOM, `cornerRadius` (bar radius), `strokeWidth` | same |
| `geom.line` | GEOM, `strokeWidth`, `dashArray`, `lineCap`, `lineJoin` | same |
| `geom.area` | GEOM, `strokeWidth`, `dashArray`, `lineCap`, `lineJoin` | same |
| `geom.point` | GEOM, `size`, `symbol`, `strokeWidth` | same |
| `geom.rule` | `stroke`, `strokeAlpha`, `strokeWidth`, `dashArray`, `lineCap`, `lineJoin`, `shadow`, `blendMode` | same |
| `geom.rule.label` | TEXT | `layer` |
| `geom.tile` | GEOM, `cornerRadius` (pixels), `strokeWidth` | `where`, `state`, `layer` |
| `panelBorder` | STROKE, `cornerRadius` | |
| `panelBorder.top` `.right` `.bottom` `.left` | STROKE | |
| `gridLine`, `gridLine.x`, `gridLine.y` | STROKE | |
| `tickLine`, `tickLine.x`, `tickLine.y` | STROKE, `length` | |
| `axisLabel`, `.x`, `.y`, `.top`, `.bottom`, `.left`, `.right` | TEXT, `margin` | |
| `tickLabel`, `.x`, `.y`, `.top`, `.bottom`, `.left`, `.right` | TEXT, `offset`, `margin` | |
| `dataLabel` | BOXED | |
| `dataLabel.observation`, `dataLabel.category` | BOXED | |
| `dataLabel.observation.inside` `.outside`, `dataLabel.category.inside` `.outside` | BOXED | |
| `dataLabel.aggregate` | BOXED | |
| `graph` | `fill`, `stroke`, `strokeWidth`, `cornerRadius`, `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `textColor`, `textScale`, `padding`, `blendMode`, `shadow`, `alpha` | |
| `heading`, `heading.h1`, `heading.h2` | TEXT | |
| `caption` | TEXT | |
| `source`, `source.link` | TEXT | |
| `header`, `footer` | `margin` | |
| `hoverGuide` | `stroke`, `fill` | |
| `editOutline`, `.hover`, `.selected` | `stroke`, `strokeWidth`, `offset`, `cornerRadius` | |
| `tooltip` | BOX | |
| `tooltip.heading`, `tooltip.label`, `tooltip.value` | TEXT | |
| `tooltip.primaryRow` | `fill` | |
| `headline` | `gap`, `margin` | |
| `headlineItem.number`, `headlineItem.number.center` | TEXT | |
| `headlineItem.caption`, `headlineItem.label`, `headlineItem.trend` | TEXT | |
| `headlineItem.swatch` | `size` | |
| `headlineItem.trend.up`, `.down`, `.flat` | `textColor` | |
| `legend`, `legend.top`, `.bottom`, `.left`, `.right` | `gap`, `margin` | |
| `legend.popover` | BOX | |
| `legendItem` | BOXED | |
| `legendItem.swatch` | `size`, `strokeWidth` | |
| `directLabel` | TEXT, `stroke`, `strokeWidth`, `dashArray` | |
| `annotation` | `fill`, `stroke`, `alpha`, `fillAlpha` | `annotation` |
| `annotation.shape` | `fill`, `alpha`, `fillAlpha`, `stroke`, `strokeWidth` | `annotation` |
| `annotation.arrow` | STROKE | `annotation` |
| `annotation.arrow.outline` | `stroke`, `strokeWidth`, `shadow` | `annotation` |
| `annotation.differenceArrow` | `stroke`, `strokeWidth` | `annotation` |
| `annotation.differenceArrow.label` | BOXED | `annotation` |
| `annotation.text` | BOXED, `fillAlpha` | `annotation` |
| `annotation.image` | `alpha`, `cornerRadius` (box radius) | `annotation` |
| `annotation.pinnedNumber`, `annotation.comment` | `fill`, `size`, `stroke`, `strokeWidth`, `shadow` | `annotation` |
| `annotation.pinnedNumber.label`, `annotation.comment.label` | BOXED | `annotation` |

Some reading notes:

- `geom.rule.label` styles the text of a reference line's label. `directLabel` is the label at the end of a line or area group, plus the connector drawn when labels overlap.
- `dataLabel.observation` is the value label, `dataLabel.category` the band text next to it, `dataLabel.aggregate` a stack total. `inside` and `outside` partition by placement.
- `editOutline` and `hoverGuide` only draw in editable and interactive modes. A bare `style.editOutline` is a wildcard over `.hover` and `.selected`, like `style.heading`.
- A pill legend draws only the pills that fit its edge. The rest collapse into a `+N` pill, and pressing it opens a popover that lists them; `legend.popover` styles that box.
- A bare `style.annotation` entry reaches every annotation kind, and each kind keeps only the properties in its own vocabulary. Stickers cannot be styled. An entry whose `annotation` id names a sticker, a missing annotation, or an annotation of another kind is dropped with a warning.
- A `layer` id that names no layer warns and styles nothing. A kind entry, say `style.geom.bar`, is skipped silently on layers of another kind.
- A custom geom from a plugin reads the shared `geom` vocabulary. `style.geom` entries reach it; there is no `style.geom.<customName>` builder.

## Geom paint and the encoding

A geom property can come from three places. For each property, the first that answers decides.

1. Overrides: the last matching `overrides` entry that declares the property.
2. The encoding: the value a mapped aesthetic produced. `color: 'region'` fills a bar per group.
3. Defaults: the last matching `defaults` entry. The built-in stylesheet sits at the front of this list, so your defaults beat it.

Which properties the encoding can decide depends on the kind:

| Kind | From `color` | From `alpha` | From `strokeWidth` | From `lineType` | From `size` |
| --- | --- | --- | --- | --- | --- |
| bar, tile | `fill` | `alpha` | `strokeWidth` | | |
| line | `stroke` | `strokeAlpha` | `strokeWidth` | `dashArray` | |
| area | `fill` | `fillAlpha` | `strokeWidth` | `dashArray` | |
| point | `fill` | `alpha` | `strokeWidth` | | `size` |
| rule | `stroke` | | `strokeWidth` | `dashArray` | |

So `style.geom.bar({ fill: '#ccc' })` in `defaults` does nothing while `color` is mapped. Put it in `overrides` to repaint every bar, or add a `where` to repaint some.

```ts
import { createSpec, geom, mapping, pipe, scale, style, styles, transform } from '@graphysdk/react';

const spec = pipe(
  createSpec(),
  transform.reshape({ keep: ['quarter'], reshape: ['North', 'South'], keyName: 'region', valueName: 'sales' }),
  mapping({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'dodge' }),
  scale.x(),
  scale.y(),
  scale.color.palette(),
  styles({
    defaults: [style.geom.bar({ cornerRadius: 'md', strokeWidth: 0 })],
    overrides: [style.geom.bar({ fill: '#1d2129' }, { where: { variable: 'region', eq: 'North' } })],
  })
);
```

The bar keeps its palette colour for South. North is repainted by the override.

## Conditions: where and layer

`where` matches observations over the layer's variables after transforms. It is the same predicate language highlights use.

```ts
import { style } from '@graphysdk/react';

style.geom.point({ size: 14 }, { where: { variable: 'sales', gt: 500 } });
style.geom.bar({ fill: '#e5484d' }, { where: { variable: 'region', oneOf: ['North', 'West'] } });
style.geom.line({ dashArray: [4, 2] }, { where: { variable: 'kind', eq: 'forecast' } });
style.geom.tile({ alpha: 0.3 }, { where: { variable: 'value', range: [0, 10] } });
style.geom.bar(
  { fill: '#ffcc00' },
  { where: { and: [{ variable: 'sales', gte: 200 }, { not: { variable: 'region', eq: 'South' } }] } }
);
```

Variable tests: `eq`, `oneOf`, `lt`, `lte`, `gt`, `gte`, `range: [low, high]`. Logic: `and`, `or`, `not`, nested freely. An ordering test on a categorical variable is a compile warning, and the entry is dropped for that layer.

`layer` restricts an entry to one layer by the id you gave the geom.

```ts
import { createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'sales' }),
  geom.bar({ id: 'actual' }),
  geom.line({ id: 'trend', stat: 'smooth' }),
  scale.x(),
  scale.y(),
  styles({ defaults: [style.geom.line({ strokeWidth: 1.5, dashArray: [2, 3] }, { layer: 'trend' })] })
);
```

## States: hovered and dimmed

Two runtime states can scope a geom entry. State entries are paint only and never move layout.

- `hovered`: the pointer is on the element.
- `dimmed`: something else is emphasised. A highlight matched other observations, or the pointer hovers another element.

```ts
import { style, styles } from '@graphysdk/react';

const sheet = styles({
  defaults: [
    style.geom({ alpha: 0.25, saturation: 0 }, { state: 'dimmed' }),
    style.geom.bar({ stroke: '#ffcc00', strokeWidth: 2 }, { state: 'hovered' }),
  ],
});
```

While a state is active, entries scoped to it are read first, overrides then defaults, and they sit above the encoding. Only then does the stateless cascade run. That is why a dimmed alpha still applies to a bar whose alpha is mapped.

Built-in state paint: every geom drops to alpha 0.4 when dimmed, and lifts with a soft shadow when hovered. Bars, points and tiles also draw a white outline against their neighbours when hovered. The hover guide (the band or crosshair under the pointer) is styled with `style.hoverGuide` and covered in `storytelling.md`.

## Tokens and colour schemes

A token is a named colour in the stylesheet. Entries reference it with `token('name')`. A token can be one colour or a `{ light, dark }` pair.

```tsx
import { createSpec, geom, GraphProvider, GraphRenderer, pipe, scale, style, styles, token } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'sales' }),
  geom.line(),
  scale.x(),
  scale.y(),
  styles({
    tokens: {
      brand: { light: '#1971c2', dark: '#74c0fc' },
      muted: '#8a8a8a',
    },
    defaults: [style.geom.line({ stroke: token('brand') }), style.tickLabel({ textColor: token('muted') })],
  })
);

export function Chart({ data, isDark }: { data: { columns: { key: string }[]; rows: Record<string, string | number>[] }; isDark: boolean }) {
  return (
    <GraphProvider data={data} spec={spec} colorScheme={isDark ? 'dark' : 'light'}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

`colorScheme` on `GraphProvider` is `'light'` (default) or `'dark'`. Every light-dark pair resolves against it at read time, whether the pair sits in a token or inline in a declaration. There is no separate dark stylesheet: one sheet, two schemes.

Any colour-valued property accepts a pair inline: `style.graph({ fill: { light: '#fff', dark: '#111' } })`.

Redefining a built-in token restyles every default that reads it. `tokens: { geom: '#ff6719' }` recolours every unmapped geom; `tokens: { textPrimary: '#000' }` recolours headings, axis labels, outside data labels and the tooltip heading and labels at once. The list is under "Built-in stylesheet".

A token that no table defines is a compile warning and the declaration is dropped. A token with an unusable value, such as an empty string, warns once and every reference to it is dropped.

## The graph target

`style.graph` is the frame and the base for text.

```ts
import { style, styles } from '@graphysdk/react';

const sheet = styles({
  defaults: [
    style.graph({
      fill: '#efede8',
      stroke: '#c9c6be',
      strokeWidth: 1,
      cornerRadius: 0,
      padding: { top: 24, right: 32, bottom: 24, left: 32 },
      fontFamily: "'Archivo', 'Inter', sans-serif",
      textScale: 1.1,
    }),
  ],
});
```

- `fill` is the background behind everything. `stroke` and `strokeWidth` draw the frame border, and the border's width shrinks the area the graph lays out in.
- `fontFamily` is the base family. A text target that declares none inherits it, and then the host page's font.
- `textScale` multiplies every text size. `padding` does not scale with it.

## Palettes and colour scales

Group colours come from the colour scale, not the stylesheet. Declare one whenever `color` is mapped.

```ts
import { scale } from '@graphysdk/react';

scale.color.palette();
scale.color.palette({ palette: { type: 'graphy' } });
scale.color.palette({ palette: { type: 'pastel' } });
scale.color.palette({ palette: { type: 'neon', base: 'cyan' } });
scale.color.palette({ palette: { type: 'mono', base: 'blue', variant: 'dark' } });
scale.color.palette({ palette: { type: 'custom', id: 'brand-2026' } });
scale.color.palette({ palette: { type: 'graphy' }, overrides: { 1: { hex: '#1d2129' } } });
scale.color.palette({ palette: { type: 'custom', id: 'brand-2026' }, overrides: { 3: { id: 'accent' } } });
scale.color.discrete({ range: ['#ec008c', '#f7931e', '#662d91'] });
```

- `type: 'default'` (also what an empty call gives) is the engine's eight-colour group palette. Geoms that touch default to a single-hue brick ramp instead. Touching means any stacked or filled layer, or tiles with no gap between cells.
- `graphy` and `pastel` are fixed lists. `neon` and `mono` are built from a base hue, and `base` is required on both. Neon bases: `cyan`, `pink`, `purple`, `red`, `orange`, `yellow`, `green`, `blue`. Mono bases: `brick`, `gray`, `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `pink`. Mono `variant` is `light` or `dark`, for the background it sits on.
- `graphy`, `pastel` and `neon` accept `variant: 'waterfall'`, which swaps in positive, negative and total colours.
- `overrides` is keyed by group number, 1-indexed. `hex` is a literal. `id` looks up a colour in the active custom palette, so it needs `type: 'custom'`; otherwise it warns and the palette colour shows through. When both are set, `hex` wins.
- `variant: 'waterfall'` on a neon palette ignores `base`. A mono palette has a tone list for 1 to 7 groups; more groups use one default list of eight tones.
- An unregistered custom palette id warns and falls back to the default palette. The default palette's brick ramp for touching geoms reads `colorScheme`.
- `discrete({ range })` sets explicit colours in group order.

A custom palette is registered on the provider and referenced by id.

```tsx
import { createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';

const customPalettes = {
  'brand-2026': [
    { id: 'lead', hex: '#ec008c', name: 'Magenta' },
    { id: 'accent', hex: '#f7931e' },
    { id: 'third', hex: '#662d91' },
  ],
};

const spec = pipe(
  createSpec({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'stack' }),
  scale.x(),
  scale.y(),
  scale.color.palette({ palette: { type: 'custom', id: 'brand-2026' } })
);

export function Chart({ data }: { data: { columns: { key: string }[]; rows: Record<string, string | number>[] } }) {
  return (
    <GraphProvider data={data} spec={spec} customPalettes={customPalettes}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

A numeric `color` mapping takes a continuous scale.

```ts
import { scale } from '@graphysdk/react';

scale.color.continuous();
scale.color.continuous({ scheme: 'viridis' });
scale.color.continuous({ scheme: 'Blues', reverse: true });
scale.color.continuous({ scheme: 'RdBu', domainMid: 0 });
scale.color.continuous({ range: ['#fff5eb', '#ff6719', '#3a0a00'], interpolate: 'lab' });
```

- Sequential schemes: `viridis`, `magma`, `inferno`, `plasma`, `cividis`, `turbo`, `Blues`, `Greens`, `Greys`, `Oranges`, `Purples`, `Reds`. Names are case-insensitive.
- Diverging schemes: `RdBu`, `BrBG`, `PuOr`, `Spectral`, or the aliases `red-blue`, `brown-teal`, `purple-orange`, `spectral`. A diverging scheme reads as intended only with `domainMid`, the neutral value; nothing warns without it. The domain is made symmetric around `domainMid` unless `symmetric: false`.
- `range` is an explicit ramp of two or more stops and beats `scheme`. `interpolate` is `lab` (default), `rgb`, `hcl` or `hsl` and only applies to `range`.
- No scheme and no range gives the brand sequential ramp.

`sampleColorScheme(options?, count?)` from `@graphysdk/viz-engine` samples a scheme into `count` evenly spaced colours for a picker or legend preview. `options` takes `scheme`, `range`, `interpolate` and `reverse`.

## Themes and presets

A theme is a stylesheet you reuse. It is not a `GraphProvider` prop. Keep it as a constant and compose it under a spec's own styles with `extends`.

```ts
import { createSpec, geom, pipe, scale, style, styles, token } from '@graphysdk/react';
import type { Stylesheet } from '@graphysdk/viz-engine';

export const newsletterTheme: Stylesheet = {
  tokens: {
    brand: '#ff6719',
    ruleLine: { light: '#1c1b1a', dark: '#f5f2ec' },
  },
  defaults: [
    style.geom({ fill: token('brand'), stroke: token('brand') }),
    style.geom.bar({ cornerRadius: 'full' }),
    style.geom.line({ strokeWidth: 3, fillAlpha: 0.18 }),
    style.geom.rule({ dashArray: [], strokeWidth: 2 }),
    style.graph({ fontFamily: 'Georgia, serif', fill: '#fffaf3' }),
    style.gridLine({ dashArray: [] }),
    style.tickLabel({ textColor: '#8a8a8a' }),
  ],
};

const spec = pipe(
  createSpec({ x: 'month', y: 'sales' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  styles({ extends: [newsletterTheme], tokens: { brand: '#12b886' } })
);
```

How `extends` composes:

- Tokens merge by name, later wins. The spec's `brand` above replaces the theme's, and every theme default that reads `token('brand')` repaints.
- `defaults` and `overrides` lists concatenate, extended sheets first. A later entry beats an earlier one for the same property.
- A theme can itself extend other sheets. Composition is flat: one long list in order.
- A sheet reachable twice counts once, at its later place. A cycle is cut.

A root `style.geom({ stroke })` also reaches points and replaces their white border. Scope it with `style.geom.line` and `style.geom.rule` if points should keep theirs.

`Stylesheet` is a type from `@graphysdk/viz-engine`. Without the import, a plain object literal works as well since `styles()` and `extends` take the same shape.

The storybook style presets (Braun, Financial Times, Mexico 68 and the rest) are built this way: a `styles()` block for chrome (`style.graph`, `style.panelBorder`, `style.tickLabel`, `style.legendItem`, `style.dataLabel`), per-graph `styles()` blocks for geom paint, and a `config()` block for what to show. See `recipes/themes/` for the full sheets. One file per theme.

Cover the chrome a theme usually touches:

```ts
import { style, styles } from '@graphysdk/react';

const chrome = styles({
  defaults: [
    style.graph({ fill: '#efede8', fontFamily: "'Archivo', sans-serif", padding: 32 }),
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ strokeWidth: 1.2, stroke: '#c9c6be', dashArray: [] }),
    style.gridLine.y({ stroke: '#e1dac9', strokeWidth: 1, dashArray: [] }),
    style.axisLabel({ fontSize: 12, fontWeight: 500, textColor: '#1d1d1b' }),
    style.tickLabel({ fontSize: 12, textColor: '#87857f' }),
    style.heading.h1({ fontSize: 20, fontWeight: 700 }),
    style.heading.h2({ fontSize: 14, textColor: '#55534e' }),
    style.dataLabel({ fontSize: 13, fontWeight: 600 }),
    style.dataLabel.observation.outside({ fill: '#efede8' }),
    style.legendItem({ fontSize: 12, textColor: '#87857f', fill: 'transparent', stroke: 'transparent' }),
    style.tooltip({ fill: '#ffffff', stroke: '#c9c6be', cornerRadius: 0, shadow: 'none' }),
    style.header({ margin: { bottom: 20 } }),
  ],
});
```

## Built-in stylesheet

The engine ships one stylesheet that gives every target its look. It sits under every authored sheet: its defaults come first in the list, its tokens under yours. `BUILTIN_STYLES` from `@graphysdk/viz-engine` is that object, for inspection.

Built-in tokens, all light-dark pairs unless noted:

| Token | Read by |
| --- | --- |
| `graphBackground` | graph fill, tick label outline |
| `graphBorder` | graph frame stroke |
| `geom` | fill of bar, area, point, tile and stroke of line (one literal, `#B84737`) |
| `geomBorder` | bar border |
| `textPrimary` | headings, caption, axis labels, data labels except inside ones, tooltip heading and label, text annotation and difference arrow label text, callout marker fill and label text, direct labels |
| `textSecondary` | tick labels, source and its link, tooltip values, legend items, headline caption, label and trend |
| `ruleLine` | reference line stroke |
| `gridLine` | grid lines and panel border |
| `hoverAffordance` | the hover outline on bars, points and tiles, and the point border (`#ffffff`) |
| `hoverGuideLine`, `hoverGuideFill` | the hover guide |
| `editOutlineHover`, `editOutlineSelected` | edit outlines |
| `tooltipBackground`, `tooltipBorder`, `tooltipPrimaryRow` | tooltip and legend popover boxes, callout label boxes, and the stroke around callout markers |
| `annotationShape`, `annotationArrow` | shape fill, arrow and difference arrow stroke |
| `differenceLabelBackground` | difference arrow label fill |
| `trendPositive`, `trendNegative`, `trendNeutral` | headline trend colours |

Built-in defaults worth knowing before you restyle:

- Bars: `cornerRadius: 'sm'`, a 1px `geomBorder` stroke. Lines: 2px solid. Areas: `fillAlpha: 0.3`, 2px outline. Points: 8px circles with a 1px white border. Tiles: 8px corner radius, no border. Rules: 1px dashed `[2, 3]`.
- Grid: y grid lines dashed `[2, 3]` at 1px, x grid lines hidden (`strokeWidth: 0`). Panel border dashed, 6px corners. Tick lines hidden.
- Text: 11.5px at weight 500 for tick labels, axis labels, legend items, rule labels and the data label base. Data labels placed outside and stack totals are 12.5px at weight 600. An inside data label with no authored `textColor` takes a light or dark text colour, whichever reads better against the fill under it. Headings 18px at 600, subtitles 15px, caption and source 12px, headline numbers 26px at 700, headline caption, label and trend 12px, tooltip heading 12.5px at 700, tooltip rows 12.5px at 500, direct labels and callout labels 12px at 500. Tick labels get a 1.5px outline in the graph background so they stay legible over geoms.
- Tooltip: 6px corners, 1px border, 8px block and 10px inline padding, a soft shadow. The legend popover shares it.
- Graph: 24px padding, 8px corners, 1px border, `textScale: 1`.
- Legend: 8px gap, items padded 2px inline and 4px block with no border. Headline: 24px gap.
- Annotations: arrows 4px solid with the outline hidden, difference arrows 2px, shapes at `fillAlpha: 0.25` with a 1px border, text annotations 15px at weight 500 with a 1.5px border and 9px corners, callout markers 8px with a 2px `tooltipBackground` stroke. Shapes, text annotations and difference arrow labels declare a `strokeWidth` but no `stroke`, so setting `strokeWidth` alone draws no border, and setting `stroke` alone draws one at the built-in width.

Dash presets the built-ins use, in stroke widths: solid `[]`, line dashed `[4, 2]`, line dotted `[1, 1]`, rule dashed `[2, 3]`, grid dashed `[2, 3]`, grid dotted `[1, 3]`. `DASH_PRESETS` from `@graphysdk/viz-engine` holds them.

## Pitfalls

- There is no `color` property. Fill a shape with `fill`, stroke a line with `stroke`, paint text with `textColor`.
- A `defaults` entry yields to a mapped aesthetic. To repaint bars whose `color` is mapped, use `overrides`.
- Position scales are separate from styling. `scale.color.palette()` decides group colours; the stylesheet cannot assign a colour per group except through `overrides` with `where`.
- `where`, `state` and `layer` are geom-only. On a chrome target they are a type error, and in serialized JSON the whole entry is dropped with a warning.
- `cornerRadius` on a bar is a token or pixels. On a tile, the graph, the panel border and the edit outline it is pixels only. On boxes it can be per corner.
- A bare `style.tooltip` is the box, `style.source` the label, `style.legend` the row. Reach the parts by name.
- A light-dark pair does nothing until `colorScheme` on `GraphProvider` says which side to read. The default is `light`.
