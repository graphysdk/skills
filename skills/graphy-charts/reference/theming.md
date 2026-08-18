# Theming

Theme tokens are CSS custom properties (`--graphy-*`) on the chart wrapper. They style **the HTML
chrome around the plot** — legend, tooltip, headline, footer, editor UI — and the default font
family.

Everything the chart itself draws — marks, grid, tick lines, axis/tick/data labels, panel border,
graph background — is decided by the **stylesheet on the spec**. See `reference/styling.md`; that
file owns the whole paint story.

| Want to change | Surface |
|---|---|
| legend, tooltip, headline, footer, editor UI, default font family | `themeOverrides` (here) |
| anything drawn inside or around the plot frame | `styles()` on the spec (`reference/styling.md`) |
| series colors | the color scale + `customPalettes` (below) |

## Applying it

Both props live on `GraphProvider`, and both are reactive — change them without remounting.

```tsx
import { GraphProvider, GraphRenderer, type ThemeOverrides } from '@graphysdk/react-renderer';

const chrome: ThemeOverrides = {
  fontFamilyDefault: "'IBM Plex Sans', sans-serif",
  fontLegendLabel: { weight: 500, size: { value: 12, unit: 'px' } },
  legendTextColor: '#8F8F8F',
  tooltipBackground: '#151B2E',
  tooltipBorderRadius: '10px',
};

<GraphProvider data={data} input={input} colorScheme="dark" themeOverrides={chrome}>
  <GraphRenderer />
</GraphProvider>;
```

- `colorScheme?: ColorScheme` (`'light' | 'dark'`, default `'light'`) picks the base token set. The
  type comes from `@graphysdk/viz-engine`.
- The same prop is what `{ light, dark }` colors and light-dark tokens in the stylesheet resolve
  against — one prop drives both surfaces.
- `themeOverrides?: ThemeOverrides` layers a partial token map on top; overridden tokens become
  inline CSS variables on the wrapper, everything else keeps the base value.

## The `ThemeOverrides` type

```ts
type ThemeOverrides = Partial<Omit<ThemeValues, MeasuredFontTokenKey>> & {
  [Key in MeasuredFontTokenKey]?: FontTokenOverride;
};
```

Every token takes a raw CSS string (`'#0B1020'`, `'1px'`, `'0 4px 12px rgba(0,0,0,0.18)'`), with one
exception: the measured font token. Many defaults reference other tokens (`legendTextColor` derives
from `textSecondary`, which derives from a grey), so overriding a base token cascades into everything
built on it. `vars` (exported) gives the `var(--graphy-*)` reference for any token if you need it in
your own CSS.

### `fontLegendLabel` — the measured font token

```ts
type MeasuredFontTokenKey = 'fontLegendLabel';
```

The legend band is the one region whose text the layout solve measures in JS. A raw CSS `font` string
cannot be reliably re-parsed into metrics, so this token takes a structured object; the shorthand
painted on screen is serialized from the same object measurement reads, so paint and layout can never
disagree.

```ts
interface FontTokenOverride {
  family?: string;
  weight?: number;
  style?: 'normal' | 'italic' | 'oblique';
  size?: { value: number; unit: 'px' | 'em' }; // em scales with textScale, px is absolute
  lineHeight?: number; // sizes HTML line boxes; canvas measurement ignores it
}
```

Omitted fields keep the token's default, which still cascades from the leaf tokens (`fontSizeSm`,
`fontWeightMedium`, `fontLineHeightSm`), so `{ weight: 600 }` changes only the weight.

Every other element font token (`fontTooltipLabel`, `fontTooltipHeading`, `fontSeriesLabel`,
`fontPieLabel`, …) is a plain CSS `font` shorthand string. The fonts of tick labels, axis labels,
data labels and rule labels come from `style.tickLabel` / `style.axisLabel` / `style.dataLabel` /
`style.geom.rule.label` (`reference/styling.md`).

## Token categories

The full contract is the exported `ThemeValues` type (`Record<keyof typeof vars, string>`). Most-used
tokens per category:

| Category | Tokens |
|---|---|
| Base colors | `white`, `black`, `transparent`, `grey100`…`grey0` (100 = surface, 0 = ink; flipped in dark), `red50`/`red60`, `green50`/`green60`, `amber30`…`amber70`, `blue60`/`blue80`, `purple30`/`purple50` |
| Semantic colors | `textPrimary`, `textSecondary`, `textDisabled`, `iconPrimary`, `iconSecondary`, `border100`/`border50`/`border10`, `defaultBackground`, `raisedBackground`, `sunkenBackground`, `overlayBackground`, `brand`, `success`, `warning`, `alert` |
| Legend | `legendBackground`, `legendBorderColor`, `legendTextColor`, `legendFocusOutlineColor`, `dimmedSeriesLabelTextColor`, `dimmedSeriesLabelLineColor` |
| Tooltip | `tooltipBackground`, `tooltipBorderColor`, `tooltipHeadingTextColor`, `tooltipLabelTextColor`, `tooltipValueTextColor`, `tooltipPrimaryRowColor`, `tooltipBorderRadius`, `tooltipBorderWidth`, `tooltipPaddingBlock`, `tooltipPaddingInline`, `tooltipRowGap`, `tooltipShadow`, `hoverGuideLineColor`, `hoverGuideFillColor` |
| Headline / trend | `headlineRowGap`, `headlineItemGap`, `trendPositiveColor`, `trendNegativeColor`, `trendNeutralColor` |
| Annotations / editor | `defaultAnnotationArrowStroke`, `defaultAnnotationShapeFill`, `annotationFrameBorderColor`, `editMenuTriggerIconColor`, `editorControlHeight`, `toolbar*`, `zIndex*`, the `canvas*` color set |
| Typography | `fontFamilyDefault`, `fontFamilyHeading`, `fontWeightRegular`…`fontWeightBlack`, `fontSizeXxs`…`fontSizeXl` (em), `fontLineHeightXxs`…`fontLineHeightXl`, `textScale`, `fontLegendLabel`, plus ~50 element font shorthand strings (`fontTooltipLabel`, `fontTooltipHeading`, `fontSeriesLabel`, `fontPieLabel`, `fontSourceLabel`, `fontEditor*`, `fontTextEditor*`, …) |
| Surface/shared | `elevationXs`…`elevationLg` (box-shadow), `radiiXs`…`radiiLg`, `spaceXxs`…`spaceXl` |

Structural tokens — the ones the layout solve also reads, so an override moves reserved space and
paint together: `legendSwatchWidth`, `legendSwatchHeight`, `legendSwatchGap`, `legendItemGap`,
`legendPillPaddingInline`, `legendPillPaddingBlock`, `legendPillBorderWidth`, `headlineRowGap`,
`headlineItemGap`, and `fontLegendLabel`. Every other token is paint-only. You never handle the
distinction yourself — override either kind and the renderer keeps paint and layout in sync.

## Tokens that carry no paint

Four tokens are in the contract but drive nothing the renderer paints. Reach for the stylesheet
target instead:

| Token | What paints it |
|---|---|
| `gridLineColor` | `style.gridLine({ color })` |
| `gridLineWidth` | `style.gridLine({ strokeWidth })` — the token seeds the editor's grid width control |
| `originLineColor` | `style.gridLine` / `style.panelBorder` |
| `axisTickColor` | `style.tickLine({ color })` |

### `graphBackground`: the stylesheet decides

The chart background is `style.graph({ background })`. The renderer resolves it and writes it into
the `graphBackground` variable itself, after applying `themeOverrides` — so the stylesheet value is
what paints, and the built-in stylesheet always declares one.

```ts
// Sets the chart background:
styles({ defaults: [style.graph({ background: '#0B1020' })] });
// Does not reach the chart:
const overrides: ThemeOverrides = { graphBackground: '#0B1020' };
```

## Name collision — read this once

`textPrimary`, `textSecondary` and `gridLineColor` name a token in **both** surfaces. The two are
independent and do not talk to each other:

| Name | As a stylesheet token (`styles({ tokens })`) | As a theme token (`themeOverrides`) |
|---|---|---|
| `textPrimary` | axis labels, data labels | HTML chrome body text |
| `textSecondary` | tick labels | HTML chrome secondary text |
| `gridLineColor` | grid lines **and** the panel border | seeds the editor's grid controls |

If you set one by name and nothing moves, you set the other one.

## Data colors: `customPalettes`, not tokens

Series colors come from the spec's color scale:

```ts
scale.color.palette(); //                                            active palette
scale.color.palette({ palette: { type: 'pastel' } }); //             named palette
scale.color.palette({ palette: { type: 'custom', id: 'brand' } }); // custom palette by id
```

`customPalettes?: CustomPalettesInput` (`Record<string, CustomPaletteColor[]>`, each color
`{ id, hex, name? }`) on `GraphProvider` registers the palettes those ids resolve against. Per-group
override: `scale.color.palette({ overrides: { 1: { hex: '#FF5A5F' } } })` (1-indexed group number).

A stylesheet `overrides` entry declaring `color` beats the palette — see `reference/styling.md`.

## Custom fonts

Set families through tokens: `fontFamilyDefault` / `fontFamilyHeading` for the chrome, the `family`
field of `fontLegendLabel` for the legend, and `style.<textTarget>({ fontFamily })` for anything the
plot draws. Fonts must be loaded (`@font-face` + `document.fonts`) before the chart measures text, or
layout uses fallback-font metrics.

## Building a theme (checklist)

1. **Constants** — named color and font constants at the top so both maps read as intent.
2. **A `Stylesheet` constant** — tokens + defaults for everything the plot draws; specs `extends` it
   or pipe `styles()`. This is the bulk of a theme (`reference/styling.md`).
3. **A small `ThemeOverrides`** — legend, tooltip, headline, `fontFamilyDefault`, `fontLegendLabel`.
   Nine or ten keys is typical.
4. **A shared `config()` builder** — *structure* only: legend position, axis visibility, layout
   padding, number format.
5. Export the `colorScheme` alongside and apply as
   `<GraphProvider colorScheme={scheme} themeOverrides={chrome}>`.

Rule of thumb: if it is drawn inside the graph frame, it is a stylesheet entry. If it is HTML around
the plot, it is a theme token. Never both.
