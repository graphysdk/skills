# Theming

Theme tokens are CSS custom properties (`--graphy-*`) that style chart chrome: backgrounds, grid, tooltip, legend geometry, fonts. They never color data series — series colors come from scales in the spec (see "Data colors" below).

## Applying a theme

Both props live on `GraphProvider`:

```tsx
import { GraphProvider, GraphRenderer, type ThemeOverrides } from '@graphysdk/react-renderer';

const overrides: ThemeOverrides = {
  graphBackground: '#0B1020',
  gridLineColor: 'rgba(255, 255, 255, 0.08)',
  tooltipBackground: '#151B2E',
  tooltipBorderRadius: '10px',
  fontFamilyDefault: "'IBM Plex Sans', sans-serif",
  fontTickLabel: { weight: 500, size: { value: 12, unit: 'px' } },
};

<GraphProvider data={data} input={input} theme="dark" themeOverrides={overrides}>
  <GraphRenderer />
</GraphProvider>;
```

- `theme?: 'light' | 'dark'` (default `'light'`) picks the base theme — a complete value set for every token.
- `themeOverrides?: ThemeOverrides` layers a partial token map on top; overridden tokens become inline CSS variables on the chart wrapper, everything else keeps the base value.
- Both are reactive — change them without remounting.

## The `ThemeOverrides` type

```ts
type ThemeOverrides = Partial<Omit<ThemeValues, MeasuredFontTokenKey>> & {
  [Key in MeasuredFontTokenKey]?: FontTokenOverride;
};
```

Every token takes a raw CSS string (`'#0B1020'`, `'1px'`, `'2 3'`, `'0 4px 12px rgba(0,0,0,0.18)'`), **except** the 7 measured font tokens, which take a structured `FontTokenOverride` object. Many token defaults reference other tokens (e.g. `gridLineColor` defaults to `border10`, which derives from `grey0`), so overriding a base token cascades into everything built on it. `vars` (exported) gives you the `var(--graphy-*)` reference for any token if you need it in your own CSS.

## Token categories

The full contract lives on the exported `ThemeValues` type. Most-used tokens per category:

| Category | Tokens |
|---|---|
| Base colors | `white`, `black`, `grey100`…`grey0` (100 = surface, 0 = ink; flipped in dark), `red50`/`red60`, `green50`/`green60`, `amber50`, `blue60`, `purple50` |
| Semantic colors | `textPrimary`, `textSecondary`, `textDisabled`, `border100`/`border50`/`border10`, `defaultBackground`, `raisedBackground`, `sunkenBackground`, `brand`, `success`, `warning`, `alert` |
| Element colors | `graphBackground`, `gridLineColor`, `originLineColor`, `targetLineColor`, `legendBackground`, `legendBorderColor`, `legendTextColor`, `dataLabelTextColor`, `dataLabelInsideTextColor`, `dataLabelOutsideBackground`, `stackTotalTextColor`, `stackTotalBackground`, `stackTotalStroke`, `tooltipBackground`, `tooltipBorderColor`, `tooltipHeadingTextColor`, `tooltipLabelTextColor`, `tooltipValueTextColor`, `hoverGuideLineColor`, `hoverGuideFillColor`, `trendPositiveColor`, `trendNegativeColor` |
| Chrome (geometry) | `gridLineWidth`, `gridLineDash`, `gridLineDotted`, `tooltipBorderRadius`, `tooltipBorderWidth`, `tooltipPaddingBlock`, `tooltipPaddingInline`, `tooltipRowGap`, `tooltipShadow`, `tickLabelOffset`, `legendItemGap`, `legendSwatchGap`, `legendSwatchWidth`, `legendSwatchHeight`, `legendPillPaddingInline`, `legendPillPaddingBlock`, `legendPillBorderWidth`, `headlineRowGap`, `headlineItemGap` |
| Typography | `fontFamilyDefault`, `fontFamilyHeading`, `fontWeightRegular`…`fontWeightBlack`, `fontSizeXxs`…`fontSizeXl` (em), `fontLineHeightXxs`…`fontLineHeightXl`, `textScale`, plus element fonts as CSS `font` shorthand strings (`fontTooltipLabel`, `fontTooltipHeading`, `fontPieLabel`, `fontPieChartTotal`, `fontSeriesLabel`, …) and the 7 measured font tokens below |
| Surface/shared | `elevationXs`…`elevationLg` (box-shadow), `radiiXs`…`radiiLg`, `spaceXxs`…`spaceXl` |

## The 7 measured font tokens

`fontDataLabel`, `fontStackTotal`, `fontCategoryLabel`, `fontTickLabel`, `fontAxisLabel`, `fontLegendLabel`, `fontGoalLineLabel`.

These label the text the layout solve must measure (Canvas-based JS measurement decides tick density, reserved band sizes, label fit). A raw CSS `font` string cannot be reliably re-parsed into measurable metrics, so these tokens take a structured object instead — the CSS shorthand painted on screen is serialized from the same object measurement reads, so paint and layout can never disagree:

```ts
interface FontTokenOverride {
  family?: string; //          CSS font family
  weight?: number; //          1–1000
  style?: 'normal' | 'italic' | 'oblique';
  size?: { value: number; unit: 'px' | 'em' }; // em scales with textScale, px is absolute
  lineHeight?: number; //      unitless multiplier; sizes HTML line boxes, canvas measurement ignores it
}
```

Omitted fields keep the token's default, which still cascades from the leaf tokens (`fontSizeXs`, `fontWeightMedium`, …) — so `{ weight: 600 }` changes only the weight, and a later `fontSizeXs` override still flows through.

## Paint-only vs structural tokens

- **Paint-only** tokens change pixels but never geometry: all colors, `gridLineWidth`/`gridLineDash`, every `tooltip*` token.
- **Structural** tokens also feed the layout solve — changing one moves the reserved space and the painted result together: `tickLabelOffset`, `legendItemGap`, `legendSwatchGap`, `legendSwatchWidth`, `legendSwatchHeight`, `legendPill*`, `headlineRowGap`, `headlineItemGap`, and all 7 measured font tokens.

You never handle this distinction yourself — override either kind through `themeOverrides` and the renderer keeps paint and layout in sync. (Live playground: `apps/storybook/src/stories/features/StyleTokens.stories.tsx`.)

## Custom fonts: `fontList`

`fontList?: Array<{ id: string; fontFamily: string }>` on `GraphProvider` registers named fonts that chart input can reference by id. When authoring with the spec builders, set families directly instead: `fontFamilyDefault` / `fontFamilyHeading` overrides for everything at once, or the `family` field of a measured font token for one element. Fonts must be loaded (e.g. `@font-face` + `document.fonts`) before the chart measures text, or layout uses fallback-font metrics.

## Data colors: `customPalettes`, not tokens

Series colors are data styling and come from the spec's color scale, never from theme tokens:

```ts
scale.color.palette(); //                                          active theme palette
scale.color.palette({ palette: { type: 'pastel' } }); //           named palette
scale.color.palette({ palette: { type: 'custom', id: 'brand' } }); // custom palette by id
```

`customPalettes?: Record<string, Array<{ id: string; hex: string; name?: string }>>` on `GraphProvider` registers the custom palettes those ids resolve against. Per-group overrides: `scale.color.palette({ overrides: { 1: { hex: '#FF5A5F' } } })` (1-indexed group number).

## Building a theme (checklist)

Structure a reusable theme file the way `recipes/themes/*` does:

1. **Palette constants** — named color constants at the top (surface, ink, accent ramp) so the override map reads as intent, not hex soup.
2. **`ThemeOverrides` object** — one exported `const overrides: ThemeOverrides` covering: `graphBackground` + text colors, grid (`gridLineColor`, `gridLineWidth`), tooltip block (`tooltipBackground`, border/radius/shadow), legend chrome, font family (`fontFamilyDefault`) and any measured-font tweaks.
3. **Shared `config()` builder** — a function returning the spec-level `config(...)` piece (legend position, axis settings, number format) so every chart in the style composes it: structure in the spec, skin in the overrides.
4. Export the base theme choice (`'light'` or `'dark'`) alongside; apply as `<GraphProvider theme={base} themeOverrides={overrides}>` and pipe the shared `config()` into each spec.

Rule of thumb: if a style varies per observation or per group, it belongs in the spec (mappings, scales, geom params). If it is chart chrome, it belongs here. Never both.
