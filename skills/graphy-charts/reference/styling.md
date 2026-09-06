# Styling

Chart paint lives in a **stylesheet on the spec** — `styles({ ... })`, piped like any other spec
item. It owns everything the chart draws: marks, grid, ticks, panel border, graph background, all
chart text, the tooltip, the legend pills, the headline cards, direct labels, and annotations. It is
serializable and travels with the spec.

The `themeOverrides` prop on `GraphProvider` survives for the few HTML-chrome details the stylesheet
has no target for (header/footer type, tooltip row gap, hover guide, legend overflow pill) — see
**Theme tokens** at the end.

> Full signatures, every declaration vocabulary and the serialized `StyleRule` shape: `reference/types.md` → **Styling API**.

## The shape

```tsx
import { pipe, createSpec, mapping, geom, scale, styles, style, token } from '@graphysdk/viz-engine';

const input = pipe(
  createSpec(),
  mapping({ x: 'month', y: 'sales' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  styles({
    tokens: { brand: { light: '#0B5FFF', dark: '#6AA1FF' } },
    defaults: [style.geom({ color: token('brand') }), style.tooltip({ borderRadius: 10 })],
    overrides: [style.geom.bar({ borderRadius: 'full' }, { where: { variable: 'sales', gt: 500 } })],
  }),
);
```

A `Stylesheet` has four keys:

| Key | Meaning |
|---|---|
| `defaults` | apply **only where no mapped aesthetic decided the value** |
| `overrides` | **replace** what a mapping decided |
| `tokens` | named colors that entries reference via `token('name')` |
| `extends` | compose other stylesheets underneath this one — tokens merge name-by-name, lists concatenate, later wins |

Piping several `styles()` items stacks them in order; each sits above everything piped before it.
Within one list, **order is specificity** — the last matching entry that declares a property wins.

## The cascade

Per property, resolution runs **override → data → default**:

1. **override** — a stylesheet `overrides` entry.
2. **data** — the encoding: a mapped aesthetic (`color`, `size`, `alpha`, …) resolved through its scale.
3. **default** — a stylesheet `defaults` entry, with the engine's `BUILTIN_STYLES` at the front.

So `defaults` never fight your mappings, and `overrides` always do. To recolor a series **that is
mapped to `color`**, use `overrides` — a `defaults` entry loses to the scale. Chrome targets have no
data tier; for them `defaults` is simply the lower list.

State-scoped entries (`{ state: 'hovered' | 'dimmed' }`) sit above the whole stateless cascade.
States are paint-only and never move layout.

## Targets

`style.<target>(declarations, options?)`. Geom targets take `{ where, state, layer, id }`. **Chrome
targets are chart-scoped and condition-free** — `{ id }` only. Annotation targets take
`{ annotation: id }` to address one annotation; without it the entry styles every annotation of that kind.

Text vocabulary, shared by every text target: `fontFamily`, `fontSize` (px, before `textScale`),
`fontWeight`, `lineHeight` (multiple of `fontSize`), `textColor`. Box vocabulary, shared by labels
in a box: `paddingInline`, `paddingBlock`, `background`, `borderColor`, `borderWidth`, `borderRadius` (px).

| Target | Partitions | Declarations |
|---|---|---|
| `style.geom` | `.bar` `.line` `.area` `.point` `.rule`, plus `{ layer }` | shared: `color`, `alpha`, `saturation` — `tile` has no partition of its own, only these |
| `style.geom.bar` | | + `borderRadius` (token), `borderColor`, `borderWidth` |
| `style.geom.line` | | + `strokeWidth`, `lineType`, `fillAlpha` (gradient wash under the line; undeclared draws none) |
| `style.geom.area` | | + `strokeWidth`, `lineType`, `strokeAlpha` |
| `style.geom.point` | | + `size`, `borderColor`, `borderWidth` |
| `style.geom.rule` | `.label` | `color`, `strokeWidth`, `lineType` |
| `style.geom.rule.label` | `{ layer }` | `fontFamily`, `fontSize`, `fontWeight`, `lineHeight` |
| `style.gridLine` | `.x` `.y` | `color`, `strokeWidth`, `lineType` |
| `style.tickLine` | `.x` `.y` | `color`, `strokeWidth`, `lineType`, `length` |
| `style.axisLabel` | `.x` `.y` | text |
| `style.tickLabel` | `.x` `.y` | text + `offset` (px from the panel edge) |
| `style.dataLabel` | `.observation` / `.category` (each `.inside` `.outside`), `.aggregate` | text + box |
| `style.panelBorder` | `.top` `.right` `.bottom` `.left` | `color`, `strokeWidth`, `lineType` (+ `borderRadius` on the bare builder) |
| `style.graph` | | `background`, `borderColor`, `borderWidth`, `borderRadius`, `fontFamily` (base family every text target inherits) |
| `style.tooltip` | `.heading` `.label` `.value` `.primaryRow` | box: `background`, `borderColor`, `borderWidth`, `borderRadius`, `paddingInline`, `paddingBlock`, `shadow`; parts: text; `primaryRow`: `background` |
| `style.headline` | | `gap` (between cards) |
| `style.headlineItem` | `.number` (`.center` for the donut hole), `.caption`, `.label`, `.trend`, `.swatch`, `.trend.up` `.trend.down` `.trend.flat` | text parts: text; `swatch`: `size`; `trend.*`: `textColor`. No bare `style.headlineItem` |
| `style.legend` | | `gap` (between pills) |
| `style.legendItem` | `.swatch` | pill: text + box; `swatch`: `size`, `strokeWidth` |
| `style.directLabel` | | text + `strokeWidth`, `lineType` (the overlap connector) |
| `style.annotation` | `.shape` `.arrow` `.differenceArrow` `.text` `.image` `.pinnedNumber` `.comment`, plus `{ annotation: id }` | shared: `color`, `alpha` |
| `style.annotation.shape` | | `color`, `alpha` (fill only), `borderColor`, `borderWidth` |
| `style.annotation.arrow` | | `color`, `strokeWidth`, `lineType`, `borderColor`, `borderWidth`, `shadow` |
| `style.annotation.differenceArrow` | `.label` | `color`, `strokeWidth`; label: text + box |
| `style.annotation.text` | | text + box + `alpha` (background only) |
| `style.annotation.image` | | `alpha`, `borderRadius` |
| `style.annotation.pinnedNumber` / `.comment` | `.label` | marker: `color`, `size`, `borderColor`, `borderWidth`, `shadow`; label: text + box + `shadow` |

`shadow` is `{ offsetX, offsetY, blur, color }` or `'none'`. `lineType` is `'solid' | 'dashed' | 'dotted'`.

Notes that bite:

- **`borderRadius` on a bar is a token, not pixels**: `'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`.
  Everywhere else it is a plain number.
- **Hide a panel-border edge with `strokeWidth: 0`** — it then reserves no space. Same for tick lines.
- `aggregate` data labels (stack totals) always sit outside, so they take no `.inside`/`.outside`.
- **A tile has no `style.geom.tile`** — its fill comes from the `color` scale, its radius and inset are fixed.
- A bare `style.tooltip` / `style.legendItem` entry is the box, not a wildcard over its parts.
- Declarations outside a target's vocabulary are dropped silently.

## Colors

Any color-valued property accepts three forms:

```ts
style.geom({ color: '#e5484d' })                              // literal
style.geom({ color: { light: '#e5484d', dark: '#ff6369' } }) // one per scheme
style.geom({ color: token('alert') })                         // token reference
```

`{ light, dark }` and light-dark tokens resolve against `colorScheme` on `GraphProvider`
(`'light' | 'dark'`). Prefer them over literals — a literal is the same in both schemes.

## Conditions

Geom entries take `where` (a predicate, same language as highlights) and `state`:

```ts
styles({
  overrides: [
    style.geom({ color: token('alert') }, { where: { variable: 'sales', lt: 0 } }),
    style.geom.line({ strokeWidth: 4 }, { layer: 'total' }),
    style.geom({ alpha: 0.15, saturation: 0 }, { state: 'dimmed' }),
  ],
});
```

`layer` scopes an entry to one authored layer id — the way to style one series of a multi-layer or
combo chart without touching the others. `style.geom.rule.label` takes `layer` too. A `where` entry
is evaluated per layer: on a layer that does not carry the variable (a constant-value rule) it is
dropped with an `INVALID_STYLE_RULE` warning — add `{ layer }` to scope it.

## Re-skinning without writing rules

`BUILTIN_STYLES` is the implicit base of every stylesheet, and its defaults are written in terms of
tokens. **Redefining a built-in token name restyles the default it backs**, with no entries at all:

```ts
styles({ tokens: { gridLine: '#E9E9E9', textPrimary: '#1A1A1A', geom: '#0B5FFF' } });
```

The built-in token names:

| Token | Backs |
|---|---|
| `geom` | every mark's fill when nothing is mapped to `color` |
| `geomBorder` | bar borders |
| `ruleLine` | reference/goal/average lines |
| `hoverAffordance` | the hovered outline on bars and points; point outlines |
| `gridLine` | grid lines **and** the panel border |
| `graphBackground`, `graphBorder` | the graph plate and its ring |
| `textPrimary` | axis labels, data labels, tooltip heading/label, headline numbers, direct labels, callout markers, text annotations |
| `textSecondary` | tick labels, legend pills, tooltip values, headline captions/labels |
| `tooltipBackground`, `tooltipBorder`, `tooltipPrimaryRow` | the tooltip box, and the callout label pills |
| `annotationShape`, `annotationArrow` | shape fill; arrow and difference-arrow strokes |
| `trendPositive`, `trendNegative`, `trendNeutral` | headline trend colors |
| `hoverGuideFill`, `hoverGuideLine` | declared, but the hover guide reads theme tokens (below) — redefining these moves nothing |

Built-in defaults worth knowing: graph background `#F5F1E9` light / `#1F1E1C` dark, border `1`,
radius `8`; bar `borderRadius: 'sm'`, border width `1`; line/area `strokeWidth: 2`, `lineType:
'solid'`; area `alpha: 0.3`; point `size: 8`; rule `lineType: 'dashed'`; y grid lines `1px dashed`;
panel border `dashed`, radius `6`; tick lines `strokeWidth: 0`; tick label `offset: 10`; labels
`11.5px / 500`, outside data labels `12.5px / 600`; tooltip radius `6`, padding `8 × 10`; headline
number `26px / 700`; dimmed state `alpha: 0.4`.

## Fonts

Chart text never inherits the container's font — every text node carries an inline family. The
resolution order for a stylesheet text target is: its own `fontFamily` → `style.graph({ fontFamily })`
→ the host CSS variable `--typography-chart-font-family` → `themeOverrides.fontFamilyDefault` → the
built-in stack.

- `style.graph({ fontFamily })` is the one spec-level knob and reaches every stylesheet text target,
  not the header/footer or the legend overflow pill (theme tokens).
- The CSS variable repaints only: layout measurement cannot read `var()`, so reserved space keeps the
  fallback metrics. Prefer `style.graph` or `fontFamilyDefault`, which move both.
- Fonts must be loaded before the chart measures text: the renderer waits for `document.fonts.ready`
  and re-measures on `loadingdone`. A family injected after that keeps fallback metrics.

## Series colors

Series colors come from the spec's color scale, not the stylesheet:

```ts
scale.color.palette();                                                 // { type: 'default' }
scale.color.palette({ palette: { type: 'mono', base: 'blue' } });
scale.color.palette({ palette: { type: 'custom', id: 'brand' } });   // registered below
scale.color.palette({ overrides: { 1: { hex: '#FF5A5F' } } });        // 1-indexed group
```

Palette types and bases are in `reference/spec-api.md` → `scale`. `customPalettes` on
`GraphProvider` (`Record<string, CustomPaletteColor[]>`, each `{ id, hex, name? }`) registers the
palettes a `custom` id resolves against; an unregistered id warns `PALETTE_NOT_FOUND` and falls back
to the default. A stylesheet `overrides` entry declaring `color` beats the palette.

## Theme tokens

`themeOverrides` on `GraphProvider` is a partial map of CSS custom properties (`--graphy-*`); every
token takes a raw CSS string except `fontLegendLabel`, which takes a structured object because layout
measures it. Both props are reactive.

```tsx
import type { ThemeOverrides } from '@graphysdk/react-renderer';

const chrome: ThemeOverrides = {
  fontFamilyDefault: "'IBM Plex Sans', sans-serif",
  fontTextEditorH3: "700 18px/1.3 'IBM Plex Sans', sans-serif", // chart title
  tooltipRowGap: '6px',
  hoverGuideLineColor: '#D5CDBA',
};

<GraphProvider data={data} input={input} colorScheme="dark" themeOverrides={chrome}>
  <GraphRenderer />
</GraphProvider>;
```

What only a theme token reaches on a read-only chart:

| Region | Tokens |
|---|---|
| Header and footer type | `fontTextEditorH3` (title), `fontTextEditorBody` (subtitle), `fontTextEditorH6` (caption), `fontSourceLabel`, `fontSourceLink`, `fontFamilyHeading` (family inside the title shorthand) |
| Chart root text color and secondary text | `textPrimary` (title/subtitle, headline flat-trend disc), `textSecondary` (footer, headline trend reference) |
| Base font family and measurement fallback | `fontFamilyDefault`, `textScale` |
| Tooltip row spacing | `tooltipRowGap` |
| Headline card internals | `headlineRowGap` (rows inside one card) |
| Legend swatch-to-label gap | `legendSwatchGap` |
| Hover guide | `hoverGuideLineColor`, `hoverGuideFillColor` |
| Legend overflow "+N" pill and popover | `legendBackground`, `legendBorderColor`, `legendTextColor`, `legendFocusOutlineColor`, `legendPill*`, `fontLegendLabel`, `tooltip*` |
| Callout icon disc, trend glyph ink | `iconStickerBackground`, `iconPrimary` |

`legendSwatchGap`, `legendPill*`, `headlineRowGap` and `fontLegendLabel` also move layout; give them
plain `px` values. `fontLegendLabel` is `{ family?, weight?, style?, size?: { value, unit: 'px' | 'em' }, lineHeight? }`.

Tokens with no effect on a rendered chart: `graphBackground` (the stylesheet writes over it),
`gridLineColor`, `gridLineWidth`, `axisTickColor`, `originLineColor`, `tooltipValueTextColor` and
the base color palette (`grey*`, `blue*`, …), which only the editor UI reads.

**Two namespaces.** `textPrimary`, `textSecondary`, `graphBackground`, `tooltipBackground` and the
hover-guide names exist as a stylesheet token *and* a theme token. They are independent values: the
stylesheet token drives the plot, the theme token the HTML chrome above. The grid token is
`gridLine` in the stylesheet and `gridLineColor` (dead) in the theme. When a change by name has no
visible effect, check which namespace you set.

## Failure mode

An invalid entry degrades with an `INVALID_STYLE_RULE` diagnostic and the chart still renders —
styling never takes a chart down. Run `scripts/validate-spec.mjs` to see diagnostics before rendering.

## Plugins

Custom geom renderers receive `styleReaders` (this layer's full cascade, resolved for the active
scheme) and `colorScheme` on every render input; `useStyleReaders(layer)` is the hook form. The bare
value readers (`getColor`, …) expose the data tier only. See `reference/plugins.md`.

## Building a theme (checklist)

1. **Constants** — named color and font constants so both maps read as intent.
2. **A `Stylesheet` constant** — tokens + defaults for everything the chart draws, including
   tooltip, legend pills, headline cards and `style.graph({ fontFamily })`. This is the bulk of a theme.
3. **A small `ThemeOverrides`** — header/footer type, `fontFamilyDefault`, hover guide. Often nothing.
4. **A shared `config()` builder** — *structure* only: legend position, axis visibility, layout
   padding, number format.
5. Apply as `<GraphProvider colorScheme={scheme} themeOverrides={chrome}>` with the stylesheet piped
   into every spec (or shared via `extends`).
