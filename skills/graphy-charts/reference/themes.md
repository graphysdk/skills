# Themes

A theme supplies a stylesheet, colors, config defaults and optional geom repaints and shapes. Apply it through `createGraphyKit({ theme })` or the provider's `theme` prop. It stays outside the spec, so one spec renders under any theme.

Contents

- What a theme is
- Built-in themes
- Install and apply
- Changing one themed graph
- Without a bundler
- Writing a custom theme
- Light and dark
- Polar graphs
- Fonts
- Texture, glow and shadow
- Repainting built-in geoms
- Painting geoms from packages
- Motion
- Pitfalls

## What a theme is

Import `Theme` from `@graphysdk/react`. Only `name` and `styles` are required.

| Field         | Purpose                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | Names the theme in diagnostics. Also a good React `key` when switching themes                                                          |
| `styles`      | A `Stylesheet` with tokens, defaults and overrides. Sits above the built-in stylesheet and below the spec's `styles()`                 |
| `palette`     | Group colors in order. Used as the default palette, for touching geoms, and by discrete color scales without a `range`                 |
| `colormap`    | Continuous color stops, low to high. Used by continuous color scales without a `range` or `scheme`                                     |
| `config`      | `ThemeConfig`: a `ConfigSpec` without `content`. Sits below the spec's `config()`                                                      |
| `colorScheme` | `'light'` or `'dark'`. Overrides the provider's `colorScheme` prop. Omit it when the theme's colors are `{ light, dark }` pairs        |
| `plugins`     | Repaints of built-in geoms. The host's `plugins` are read after them, so a host repaint of the same geom and coordinate system decides |
| `shapes`      | Replacements for the shared `GeomCircle`, `GeomLine`, `GeomRect` and `GeomPath` that geoms from packages draw with                     |

## Built-in themes

Each package needs `@graphysdk/react` and React 19 as peer dependencies. Each exports one `Theme`.

| Theme         | Package                          | Export         | Scheme               | Fonts                       | Look                                                                       |
| ------------- | -------------------------------- | -------------- | -------------------- | --------------------------- | -------------------------------------------------------------------------- |
| Bauhaus       | `@graphysdk/theme-bauhaus`       | `bauhaus`      | light                | Jost                        | Primary colors, heavy black rules, a square, circle or triangle per group  |
| Blueprint     | `@graphysdk/theme-blueprint`     | `blueprint`    | dark                 | IBM Plex Mono               | White lines on dark blue, hatched shapes, drafting grid                    |
| Botanical     | `@graphysdk/theme-botanical`     | `botanical`    | light                | Kalam, Cormorant Garamond   | Grained paper, sepia outlines, watercolour washes, leaf-shaped bars        |
| Chalkboard    | `@graphysdk/theme-chalkboard`    | `chalkboard`   | dark                 | Gochi Hand                  | Colored chalk on a green-gray board in a wooden frame                      |
| Comic         | `@graphysdk/theme-comic`         | `comic`        | light                | Bangers, Comic Neue         | Black outlines, printed dots, hard shadows, burst-shaped pies and points   |
| Financial     | `@graphysdk/theme-financial`     | `financial`    | light                | Source Sans 3               | Salmon paper, ruled baseline, right-side value axis                        |
| Graphite      | `@graphysdk/theme-graphite`      | `graphite`     | follows the provider | IBM Plex Sans               | One cool gray, groups told apart by lightness                              |
| Halloween     | `@graphysdk/theme-halloween`     | `halloween`    | dark                 | Creepster, Cinzel, Nunito   | Moonlit churchyard: headstone bars, rose-window pies, a ghost on each line |
| Neo Brutalist | `@graphysdk/theme-neo-brutalist` | `neoBrutalist` | light                | Space Grotesk               | Thick black borders, offset solid shadows, loud flat colors                |
| Phosphor      | `@graphysdk/theme-phosphor`      | `phosphor`     | dark                 | VT323                       | Dark screen, green glow, scanlines                                         |
| Shiny         | `@graphysdk/theme-shiny`         | `shiny`        | dark                 | Inter Tight, JetBrains Mono | Dark starred card, holographic foil border, flat shapes, glowing lines     |
| Solarized     | `@graphysdk/theme-solarized`     | `solarized`    | follows the provider | Source Code Pro             | Solarized colors on a cream or deep teal background                        |
| Spreadsheet   | `@graphysdk/theme-spreadsheet`   | `spreadsheet`  | light                | Arial (system font)         | White background, gray grid, flat colors                                   |
| Typewriter    | `@graphysdk/theme-typewriter`    | `typewriter`   | light                | Special Elite               | Manila paper, black and red type, shapes typed from characters             |
| Watercolor    | `@graphysdk/theme-watercolor`    | `watercolor`   | light                | Caveat                      | Paint washes, pen lines, handwriting on white paper                        |

- Graphite and Solarized follow the provider's `colorScheme`. The others fix one.
- Several themes set config defaults: `axes.y.position` (`'left'` in Bauhaus, Chalkboard, Neo Brutalist, Spreadsheet and Typewriter; `'right'` in Financial) and `legend.position: 'top'` (Bauhaus, Blueprint, Chalkboard, Financial, Graphite, Neo Brutalist, Spreadsheet). The spec's `config()` overrides them.
- Halloween animates only when the graph animates. With `animation={false}` or reduced motion it draws its final state at once.

## Install and apply

```bash
npm install @graphysdk/theme-watercolor
```

Pass the theme to `createGraphyKit` and import its fonts once. Every graph under `kit.GraphProvider` gets the theme.

```tsx
import { createGraphyKit, GraphRenderer, type Data } from '@graphysdk/react';
import { watercolor } from '@graphysdk/theme-watercolor';
import '@graphysdk/theme-watercolor/fonts.css';

const kit = createGraphyKit({ theme: watercolor });

const spec = kit.pipe(
  kit.createSpec({ x: 'quarter', y: 'revenue', color: 'region' }),
  kit.geom.bar({ position: 'dodge' }),
  kit.scale.x(),
  kit.scale.y()
);

export function Revenue({ data }: { data: Data }) {
  return (
    <div style={{ height: 360 }}>
      <kit.GraphProvider spec={spec} data={data}>
        <GraphRenderer />
      </kit.GraphProvider>
    </div>
  );
}
```

Without a kit, pass the theme to `GraphProvider`:

```tsx
import { GraphProvider, GraphRenderer, type Data, type Spec } from '@graphysdk/react';
import { watercolor } from '@graphysdk/theme-watercolor';

export const Themed = ({ data, spec }: { data: Data; spec: Spec }) => (
  <GraphProvider data={data} spec={spec} theme={watercolor}>
    <GraphRenderer />
  </GraphProvider>
);
```

- `theme` is read once at mount, like `plugins`. To switch themes, remount the provider with a new `key`.
- Combine a theme and plugins in one kit: `createGraphyKit({ theme: watercolor, plugins: [dumbbell] })`, with `dumbbell` from `@graphysdk/geom-dumbbell`.
- `kit.GraphProvider` shows "Made with Graphy" by default. Disable it with `config({ content: { brandMark: { enabled: false } } })`.
- Every theme package except Spreadsheet has a `fonts.css` that loads its Google Fonts. Import it once per app. Spreadsheet uses Arial and has no `fonts.css`. To self-host, skip the import and load the same families yourself; see [Fonts](#fonts).

## Changing one themed graph

The spec's `styles()`, scales and `config()` sit above the theme. This example changes the colors, text size and legend position and keeps Watercolor's rendering.

```ts
import { createGraphyKit } from '@graphysdk/react';
import { watercolor } from '@graphysdk/theme-watercolor';

const kit = createGraphyKit({ theme: watercolor });

const spec = kit.pipe(
  kit.createSpec({ x: 'quarter', y: 'revenue', color: 'region' }),
  kit.geom.bar({ position: 'dodge' }),
  kit.scale.x(),
  kit.scale.y(),
  kit.scale.color.discrete({ range: ['#0B7285', '#E8590C'] }),
  kit.styles({ defaults: [kit.style.graph({ textScale: 1.5 })] }),
  kit.config({ legend: { position: 'bottom' } })
);
```

The built-in themes are drawn for graphs about 600 pixels wide. Set `textScale` for other sizes.

## Without a bundler

Start with the HTML page in [setup](setup.md). Add the theme to the import map's `imports` object. Use the `dist/index.mjs` path, not `/+esm`. `@latest` resolves to the beta on the `latest` dist-tag, as for `@graphysdk/react`.

```json
{
  "@graphysdk/theme-watercolor": "https://cdn.jsdelivr.net/npm/@graphysdk/theme-watercolor@latest/dist/index.mjs"
}
```

The theme bundle imports `@graphysdk/react`, `react` and `react/jsx-runtime` through that map, so it shares the page's engine and React. Load its fonts in `<head>`. The file sits at the package root. Spreadsheet has none.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@graphysdk/theme-watercolor@latest/fonts.css" />
```

Import the theme in the module script and pass it to the provider:

```js
import { watercolor } from '@graphysdk/theme-watercolor';

createRoot(document.getElementById('graph')).render(
  createElement(GraphProvider, { data, spec, theme: watercolor }, createElement(GraphRenderer))
);
```

If jsDelivr is blocked, follow [setup's vendor instructions](setup.md#when-the-cdn-is-blocked), save the theme bundle beside the other vendor files, and point its import-map entry there. Load the fonts from Google Fonts if allowed, or self-host them.

## Writing a custom theme

Define a `Theme` object and pass it to the kit or provider. Start with tokens for shared colors and style entries for borders, spacing and typography. Add palette and config defaults as needed:

```ts
import { createGraphyKit, style, token, type Theme } from '@graphysdk/react';

export const ledger: Theme = {
  name: 'ledger',
  styles: {
    tokens: {
      graphBackground: '#FBF8F1',
      textPrimary: '#1F2A37',
      textSecondary: '#6B7280',
      gridLine: '#E5E0D3',
      geom: '#1D4ED8',
    },
    defaults: [
      style.graph({ fontFamily: "'IBM Plex Sans', system-ui, sans-serif", cornerRadius: 0, padding: 24 }),
      style.geom.bar({ cornerRadius: 'none', strokeWidth: 0 }),
      style.gridLine({ dashArray: [] }),
      style.panelBorder({ strokeWidth: 0 }),
      style.panelBorder.bottom({ stroke: token('textSecondary'), strokeWidth: 1, dashArray: [] }),
      style.tickLabel({ fontSize: 12 }),
    ],
  },
  palette: ['#1D4ED8', '#DC2626', '#059669', '#D97706', '#7C3AED'],
  colormap: ['#DBEAFE', '#1D4ED8', '#1E3A8A'],
  config: { axes: { y: { position: 'left' } }, legend: { position: 'top', align: 'start' } },
  colorScheme: 'light',
};

const kit = createGraphyKit({ theme: ledger });
```

The five tokens above recolour most of the graph. See [Built-in stylesheet](styling.md#built-in-stylesheet) for the full token list.

- `palette` replaces the default palette, including the single-hue ramp used for touching geoms. List group colors in order.
- `colormap` supplies continuous color stops from low to high.
- `config` accepts `parsingLocale`, `legend`, `axes`, `panel`, `headline`, `tooltip` and `numberFormat`. It cannot set `content`: titles, sources and the brand mark belong to the spec.
- `colorScheme: 'light'` fixes the scheme. To support both, see [Light and dark](#light-and-dark).
- Keep page cards and other surrounding UI in the host application.

For a complete theme, cover the frame, axes, headings, data labels, legend and tooltip. The [styling target table](styling.md#style-targets) lists their builders. Include hover styles: the built-in hovered state adds a soft shadow and a white outline. `style.geom({ shadow: 'none' }, { state: 'hovered' })` removes the shadow; a hovered `stroke` on bars, points or tiles replaces the outline.

## Light and dark

Use `{ light, dark }` color pairs and omit the theme's `colorScheme`. The theme then follows the provider's scheme.

```ts
import { style, type Theme } from '@graphysdk/react';

const COLORS = {
  background: { light: '#F9FAFC', dark: '#0D1013' },
  text: { light: '#12161C', dark: '#E2E9F1' },
  secondary: { light: '#5E646B', dark: '#A5ABB4' },
  grid: { light: '#E2E5E9', dark: '#292B2E' },
};

export const graphiteLike: Theme = {
  name: 'graphite-like',
  styles: {
    tokens: {
      graphBackground: COLORS.background,
      textPrimary: COLORS.text,
      textSecondary: COLORS.secondary,
      gridLine: COLORS.grid,
    },
    defaults: [style.geom.bar({ stroke: COLORS.background, strokeWidth: 1 })],
  },
  // Palette colors must work on both backgrounds.
  palette: ['#5E646B', '#878D95', '#3D434A', '#ABB2BA'],
};
```

Color pairs work in stylesheet tokens and declarations. `palette` and `colormap` take plain strings only, so pick colors that read on both backgrounds.

## Polar graphs

Add `{ coord: 'polar' }` entries to adapt borders, grids and labels for pies, donuts, roses and radars. Entries without `coord` apply to both coordinate systems. Flipped graphs are cartesian.

```ts
import { style, type Stylesheet } from '@graphysdk/react';

const sheet: Stylesheet = {
  defaults: [
    style.gridLine.x({ strokeWidth: 0 }),
    style.panelBorder.bottom({ strokeWidth: 1, dashArray: [] }),
    // Remove the baseline; add slice borders, spokes and circles.
    style.panelBorder.bottom({ strokeWidth: 0 }, { coord: 'polar' }),
    style.geom.bar({ stroke: '#FFFFFF', strokeWidth: 1 }, { coord: 'polar' }),
    style.gridLine.x({ strokeWidth: 1, dashArray: [] }, { coord: 'polar' }),
    style.gridLine.y({ strokeWidth: 1, dashArray: [] }, { coord: 'polar' }),
    // Outline labels so they stay readable over the shapes.
    style.tickLabel({ fontWeight: 600, textOutlineColor: '#FFFFFF', textOutlineWidth: 3 }, { coord: 'polar' }),
    // Keep overlapping radar areas visible.
    style.geom.area({ fillAlpha: 0.35, strokeWidth: 3 }, { coord: 'polar' }),
  ],
};
```

Place these entries after the shared defaults: later entries decide.

## Fonts

Set font families in the stylesheet and load the fonts on the page.

```ts
import { style, type Theme } from '@graphysdk/react';

export const typed: Theme = {
  name: 'typed',
  styles: {
    defaults: [
      style.graph({ fontFamily: "'Special Elite', 'Courier New', monospace" }),
      // A second face for headings only.
      style.heading({ fontFamily: "'Playfair Display', Georgia, serif" }),
    ],
  },
};
```

```css
/* In the app's own CSS. */
@import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Playfair+Display:wght@700&display=swap');
```

- A text target without `fontFamily` uses `style.graph({ fontFamily })`. Always include a system fallback.
- The SDK references fonts and does not load them. Before the first layout the renderer waits for `document.fonts.ready`, up to three seconds, then measures and lays out again when more fonts finish loading. Fonts added later still land, but the graph repaints.
- A reusable theme package exports this CSS as `fonts.css`. An in-app theme uses the app's stylesheet.

## Texture, glow and shadow

Use style properties for textures, glow and shadows before writing a repaint. See [styling](styling.md#property-values) for paint values.

```ts
import { style, type Stylesheet } from '@graphysdk/react';

const effects: Stylesheet = {
  defaults: [
    // Glow: no offset, wide blur.
    style.geom.line({ shadow: { offsetX: 0, offsetY: 0, blur: 6, color: 'rgba(51, 255, 102, 0.6)' } }),
    style.heading({ textShadow: { offsetX: 0, offsetY: 0, blur: 8, color: 'rgba(51, 255, 102, 0.8)' } }),
    // A hard offset shadow, no blur.
    style.tooltip({ shadow: { offsetX: 4, offsetY: 4, blur: 0, color: '#000000' } }),
    // A pattern fill: diagonal, dots, crosshatch or lines.
    style.geom.bar({ fill: { pattern: 'dots', color: '#111111', background: '#F5D90A', size: 6 } }),
    // A gradient fill.
    style.geom.area({
      fill: {
        gradient: 'linear',
        angle: 180,
        stops: [
          { offset: 0, color: '#7C3AED' },
          { offset: 1, color: '#0EA5E9' },
        ],
      },
    }),
    // Overlays keep the fill underneath. The first item in a list is on top.
    style.geom({ overlay: { pattern: 'lines', color: 'rgba(0, 0, 0, 0.3)', size: 3 } }),
    style.graph({
      overlay: [
        {
          gradient: 'radial',
          stops: [
            { offset: 0, color: 'rgba(0, 0, 0, 0)' },
            { offset: 1, color: 'rgba(0, 0, 0, 0.5)' },
          ],
        },
        { image: 'data:image/png;base64,iVBORw0KGgo=', fit: 'tile', size: 96, alpha: 0.12, fallback: 'transparent' },
      ],
    }),
    // A hovered shape drops its overlay.
    style.geom({ overlay: 'none' }, { state: 'hovered' }),
  ],
};
```

`overlay` works on geoms and the graph. A geom overlay is masked by the layer's shapes and follows their opacity. A graph overlay covers the whole frame; only the paint's own transparency thins it.

How the built-in themes use them:

| Theme                        | Implementation                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Phosphor                     | `shadow` and `textShadow` for glow; pattern and gradient overlays for scanlines and dark corners. No repaint. |
| Comic                        | Dot-pattern overlay on every geom; lines set `overlay: 'none'`.                                               |
| Blueprint                    | Pattern overlays for hatching on bars and tiles.                                                              |
| Chalkboard, Botanical, Shiny | Graph image overlays for the wooden frame, the taped page and the foil border.                                |

Use a repaint for geometry that style properties cannot express.

## Repainting built-in geoms

Add `defineGeomRenderer(name, contract)` definitions to `Theme.plugins` to replace a built-in geom's drawing. Compilation, scales, hover indexing and data labels are unchanged. See [Repaint a built-in geom](plugins.md#repaint-a-built-in-geom) for the contract.

Share one drawing component between `render` and `renderHover`:

```tsx
import {
  createStableKeyGenerator,
  defineGeomRenderer,
  getBarRectBounds,
  readMainAxis,
  toPaintColor,
  toPercent,
  useGeomStyleReader,
  type MainAxis,
  type Observation,
  type SceneLayerFor,
  type StyleState,
  type Theme,
} from '@graphysdk/react';

interface CapsuleBarsProps {
  layer: SceneLayerFor<'bar'>;
  observations: Iterable<Observation>;
  mainAxis: MainAxis;
  state?: StyleState;
}

// Normal and hover rendering use the same geometry and style readers.
const CapsuleBars = ({ layer, observations, mainAxis, state }: CapsuleBarsProps) => {
  const styleReaders = useGeomStyleReader(layer);
  const generateKey = createStableKeyGenerator(layer.data, layer.mapping, layer.id);
  return (
    <g data-geom="bar">
      {Array.from(observations, (observation) => {
        const rect = getBarRectBounds(mainAxis, observation);
        if (rect === null) return null;
        return (
          <rect
            key={generateKey(observation)}
            x={toPercent(rect.x)}
            y={toPercent(rect.y)}
            width={toPercent(rect.width)}
            height={toPercent(rect.height)}
            rx="4%"
            fill={toPaintColor(styleReaders.get('fill', observation, state) ?? '#888888')}
            fillOpacity={styleReaders.get('alpha', observation, state) ?? 1}
            stroke={styleReaders.get('stroke', observation, state) ?? 'none'}
            strokeWidth={styleReaders.get('strokeWidth', observation, state) ?? 0}
          />
        );
      })}
    </g>
  );
};

const capsuleBars = defineGeomRenderer('bar', {
  coord: 'cartesian',
  swatchShape: 'square',
  guideMode: 'band',
  render: ({ layer, coordSystem }) => (
    <CapsuleBars layer={layer as SceneLayerFor<'bar'>} observations={layer.data} mainAxis={readMainAxis(coordSystem)} />
  ),
  // Redraw the hovered bar above the dimmed base layer.
  renderHover: ({ layer, coordSystem, primary }) => (
    <CapsuleBars
      layer={layer as SceneLayerFor<'bar'>}
      observations={[primary.observation]}
      mainAxis={readMainAxis(coordSystem)}
      state="hovered"
    />
  ),
  // No companion overlay for bars on other layers.
  renderHoverCompanions: () => null,
});

export const capsule: Theme = {
  name: 'capsule',
  styles: { defaults: [] },
  plugins: [capsuleBars],
};
```

- Read paint through `useGeomStyleReader(layer)` or the render input's `styleReaders`, passing the current state. Spec styles and mapped colors then reach the repaint.
- `renderHover` redraws `primary.observation` in the `'hovered'` state above the dimmed layer. Returning `null` leaves the hovered bar dimmed with the rest.
- Key shapes with `createStableKeyGenerator`, or `createStableCellKeyGenerator` for tiles, so they keep their identity across updates.
- A contract covers one coordinate system. Add a second with `coord: 'polar'` to repaint pies and roses. Without it the built-in polar drawing stays.
- A host plugin for the same geom and coordinate system replaces the theme's, with no warning.

## Painting geoms from packages

A geom from a package draws with the shared `GeomCircle`, `GeomLine`, `GeomRect` and `GeomPath`. `Theme.shapes` replaces them. Wrap the matching `DefaultGeom*` component to keep its transitions.

```tsx
import { DefaultGeomCircle, type GeomCircleProps, type GeomShapes, type Theme } from '@graphysdk/react';

// A translucent fill and a dark outline on every shared circle.
const OutlinedCircle = ({ fill, fillOpacity, ...props }: GeomCircleProps) => (
  <DefaultGeomCircle {...props} fill={fill} fillOpacity={0.6} stroke="#3B2F2F" strokeWidth={0.9} />
);

const shapes: GeomShapes = { Circle: OutlinedCircle };

export const outlined: Theme = {
  name: 'outlined',
  styles: { defaults: [] },
  shapes,
};
```

A shape left out keeps its default. Botanical and Chalkboard replace `Circle`; Watercolor replaces `Circle` and `Line`.

## Motion

The render input's optional `intro` is a `LayerIntroPlan`. Use it to time an entrance with the graph's own intro. It is absent when the graph does not animate, including with `animation={false}` and reduced motion: then draw the final state at once.

Draw the final geometry and paint first, then animate toward it. A continuous effect must also stop when `intro` is absent.

Halloween does this: headstones rise and candles light on the intro clock, and a candle's flicker continues after the intro only on a graph that played one.

## Pitfalls

- `styles({ extends: [theme.styles] })` copies only the stylesheet into the spec. It does not apply the theme's palette, config, plugins or shapes.
- Theme `defaults` yield to mapped aesthetics. Use `overrides` to force a fill when `color` is mapped; that fill then hides the mapped colors.
- A theme's `config` cannot set `content`. Titles, sources and the brand mark come from the spec.
- A theme's data label `textColor` is replaced by a readable one where it lacks contrast with the bar or slice under the label. A color set in the spec's `styles()` is kept.
