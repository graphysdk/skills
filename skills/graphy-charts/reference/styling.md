# Styling

Chart paint lives in a **stylesheet on the spec** — `styles({ ... })`, piped like any other spec item.
This is where colors, stroke widths, corner radii, fonts and chrome appearance are decided.

Two surfaces, and the split is strict:

| Surface | Governs | Where |
|---|---|---|
| **Stylesheet** (`styles`) | everything the chart itself draws: marks, grid, ticks, axis/tick/data labels, panel border, graph background | on the spec, serializable |
| **Theme tokens** (`themeOverrides`) | the HTML chrome around the plot: legend, tooltip, headline, footer, editor UI, default font family | on `GraphProvider`, React-only |

If you are changing how a *mark or an axis* looks, it is the stylesheet. See `reference/theming.md`
for the token surface.

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
    defaults: [style.geom({ color: token('brand') })],
    overrides: [style.geom.bar({ borderRadius: 'full' }, { where: { variable: 'sales', gt: 500 } })],
  }),
);
```

A `Stylesheet` has four keys:

| Key | Meaning |
|---|---|
| `defaults` | apply **only where no mapped aesthetic decided the value** — the look when nothing else speaks |
| `overrides` | **replace** what a mapping decided |
| `tokens` | named colors that entries reference via `token('name')` |
| `extends` | compose other stylesheets underneath this one — tokens merge name-by-name, lists concatenate, later wins |

Piping several `styles()` items stacks them in order; each sits above everything piped before it,
including the presets it extends. Within one list, **order is specificity** — the last matching entry
that declares a property wins.

## The cascade

Per property, resolution runs **override → data → default**, and reports which tier answered
(`StyleResolutionTier` is `'override' | 'data' | 'default' | 'unresolved'`).

1. **override** — a stylesheet `overrides` entry.
2. **data** — the encoding: a mapped aesthetic (`color`, `size`, `alpha`, …) resolved through its scale.
3. **default** — a stylesheet `defaults` entry, with the engine's `BUILTIN_STYLES` at the front.

So `defaults` never fight your mappings, and `overrides` always do. To recolor a series **that is
mapped to `color`**, you need an `overrides` entry — a `defaults` entry loses to the scale.

State-scoped entries (`{ state: 'hovered' | 'dimmed' }`) sit above the whole stateless cascade.

## Targets

`style.<target>(declarations, options?)`. Geom targets take `options`; **chrome targets are
chart-scoped and condition-free** — they take no `where` and no `state`.

| Target | Partitions | Declarations |
|---|---|---|
| `style.geom` | `.bar` `.line` `.area` `.point` `.rule`, plus `{ layer }` | shared: `color`, `alpha`, `saturation` |
| `style.geom.bar` | | + `borderRadius`, `borderColor`, `borderWidth` |
| `style.geom.line` | | + `strokeWidth`, `lineType`, `fillAlpha` |
| `style.geom.area` | | + `strokeWidth`, `lineType`, `strokeAlpha` |
| `style.geom.point` | | + `size`, `borderColor`, `borderWidth` |
| `style.geom.rule` | `.label` | `color`, `strokeWidth`, `lineType` |
| `style.geom.rule.label` | | `fontFamily`, `fontSize`, `fontWeight`, `lineHeight` |
| `style.gridLine` | `.x` `.y` | `color`, `strokeWidth`, `lineType` |
| `style.tickLine` | `.x` `.y` | `color`, `strokeWidth`, `lineType`, `length` |
| `style.axisLabel` | `.x` `.y` | text: `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `textColor` |
| `style.tickLabel` | `.x` `.y` | text + `offset` |
| `style.dataLabel` | `.observation` / `.category` (each `.inside` `.outside`), `.aggregate` | text + `paddingInline`, `paddingBlock`, `background`, `borderColor`, `borderWidth`, `borderRadius` |
| `style.panelBorder` | `.top` `.right` `.bottom` `.left` | `color`, `strokeWidth`, `lineType` (+ `borderRadius` on the bare builder) |
| `style.graph` | | `background`, `borderColor`, `borderWidth`, `borderRadius` |

Notes that bite:

- **`borderRadius` on a bar is a token, not pixels**: `'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`.
  On `dataLabel`, `panelBorder` and `graph` it is a plain number.
- **Hide a panel-border edge with `strokeWidth: 0`** — there is no `isVisible`.
- `aggregate` data labels (stack totals) always sit outside, so they take no `.inside`/`.outside`.

## Colors

Any color-valued property accepts three forms:

```ts
style.geom({ color: '#e5484d' })                          // literal
style.geom({ color: { light: '#e5484d', dark: '#ff6369' } }) // one per scheme
style.geom({ color: token('alert') })                      // token reference
```

`{ light, dark }` and `token(...)` resolve against the active `colorScheme` on `GraphProvider`
(`'light' | 'dark'`). Prefer them over literals — a literal is the same in both schemes.

## Conditions

Geom entries take `where` (a predicate, same language as highlights) and `state`:

```ts
styles({
  overrides: [
    style.geom({ color: token('alert') }, { where: { variable: 'sales', lt: 0 } }),
    style.geom.line({ strokeWidth: 4 }, { layer: 'total' }),
    style.geom({ alpha: 0.15 }, { state: 'dimmed' }),
  ],
});
```

`layer` scopes an entry to one authored layer id — the way to style one series of a multi-layer or
combo chart without touching the others.

## Re-skinning without writing rules

`BUILTIN_STYLES` is the implicit base of every stylesheet, and its defaults are written in terms of
tokens. **Redefining a built-in token name restyles the default it backs**, with no entries at all:

```ts
styles({ tokens: { gridLineColor: '#E9E9E9', textPrimary: '#1A1A1A' } });
```

The built-in token names:

| Token | Backs |
|---|---|
| `geomColor` | every mark's fill when nothing is mapped to `color` |
| `ruleColor` | reference/goal/average lines |
| `pointBorderColor` | point outlines |
| `hoverAffordanceColor` | the hovered outline on bars and points |
| `gridLineColor` | grid lines **and** the panel border |
| `tickLineColor` | tick marks |
| `graphBackground` | the graph plate |
| `textPrimary` | axis labels, data labels |
| `textSecondary` | tick labels |

The built-in defaults worth knowing: bar `borderRadius: 'sm'`, border width `1`; line/area
`strokeWidth: 2`, `lineType: 'solid'`; area `alpha: 0.3`; point `size: 8`; rule `lineType: 'dashed'`;
grid line `dashed`; panel border `dashed`, radius `8`; tick label `offset: 10`; dimmed state
`alpha: 0.4`.

## Two token namespaces

`textPrimary`, `textSecondary` and `gridLineColor` name a stylesheet token **and** a theme token.
They are separate values in separate namespaces. The stylesheet tokens above drive the plot; the
`themeOverrides` keys of the same name drive the surrounding HTML chrome. When a change by name has
no visible effect, check which namespace you set.

## Failure mode

An invalid entry degrades with an `INVALID_STYLE_RULE` diagnostic and the chart still renders —
styling never takes a chart down. Run `scripts/validate-spec.mjs` to see diagnostics before rendering.

## Plugins

Custom geom renderers read their paint through the accessors on the render input (`getColor`,
`getAlpha`, `getSize`, …), which expose the **data tier** — stylesheet `overrides` and the built-in
defaults resolve outside that path. To read the full cascade, build a resolver over the layer:

```tsx
import { createStyleResolver } from '@graphysdk/viz-engine';

const fill = createStyleResolver({ colorScheme }).geomReaders(layer).get('color', observation);
```

The plugin supplies `colorScheme` itself (it defaults to `'light'`); no exported hook carries the
chart's active scheme into a renderer. The `dimmed` state does not reach a custom geom either — the
layer-level dim comes from a highlight composition keyed on built-in geom names — so a custom geom
paints its own de-emphasis. See `reference/plugins.md`.
