# Themes

A theme supplies shared styles, colours, config defaults and optional geom renderers. Apply it through `createGraphyKit({ theme })` or the provider's `theme` prop. It stays outside the spec, so the same spec can render under different themes.

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

| Field         | Purpose                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `name`        | Diagnostic name; also useful as the provider's React `key` when switching themes                                          |
| `styles`      | A `Stylesheet` with tokens, defaults and overrides, layered above the built-in stylesheet and below the spec's stylesheet |
| `palette`     | Default group colours, used by discrete colour scales without an explicit `range`                                         |
| `colormap`    | Continuous colour stops, low to high, used when the scale has no `range` or `scheme`                                      |
| `config`      | `ConfigSpec` defaults, excluding `content`; the spec's config takes precedence                                            |
| `colorScheme` | Fixed `'light'` or `'dark'` scheme, overriding the provider's `colorScheme`                                               |
| `plugins`     | Built-in geom repaints; the host's plugins take precedence for the same geom and coordinate system                        |
| `shapes`      | Replacements for the shared circle, line, rect and path components used by custom geoms                                   |

## Built-in themes

Each package exports one `Theme` and requires `@graphysdk/react` and React 19 as peer dependencies.

| Theme         | Package                          | Export         | Scheme               | Fonts                       | Look                                                        |
| ------------- | -------------------------------- | -------------- | -------------------- | --------------------------- | ----------------------------------------------------------- |
| Bauhaus       | `@graphysdk/theme-bauhaus`       | `bauhaus`      | light                | Jost                        | Primary colours, heavy black rules, geometric group symbols |
| Blueprint     | `@graphysdk/theme-blueprint`     | `blueprint`    | dark                 | IBM Plex Mono               | White lines on dark blue, technical drawing style           |
| Botanical     | `@graphysdk/theme-botanical`     | `botanical`    | light                | Cormorant Garamond, Kalam   | Ivory paper, leaf greens, botanical illustration            |
| Chalkboard    | `@graphysdk/theme-chalkboard`    | `chalkboard`   | dark                 | Gochi Hand                  | Coloured chalk on a dark green-grey board                   |
| Comic         | `@graphysdk/theme-comic`         | `comic`        | light                | Bangers, Comic Neue         | Black outlines, printed dots, hard shadows                  |
| Financial     | `@graphysdk/theme-financial`     | `financial`    | light                | Source Sans 3               | Salmon paper, ruled baseline, right-side value axis         |
| Graphite      | `@graphysdk/theme-graphite`      | `graphite`     | follows the provider | IBM Plex Sans               | Cool greys with groups distinguished by lightness           |
| Halloween     | `@graphysdk/theme-halloween`     | `halloween`    | dark                 | Cinzel, Creepster, Nunito   | Animated pumpkins and glowing lines on a dark background    |
| Neo Brutalist | `@graphysdk/theme-neo-brutalist` | `neoBrutalist` | light                | Space Grotesk               | Thick borders, offset shadows, bold colours                 |
| Phosphor      | `@graphysdk/theme-phosphor`      | `phosphor`     | dark                 | VT323                       | Dark screen, green glow, scanlines                          |
| Shiny         | `@graphysdk/theme-shiny`         | `shiny`        | dark                 | Inter Tight, JetBrains Mono | Dark background, holographic border, glowing lines          |
| Solarized     | `@graphysdk/theme-solarized`     | `solarized`    | follows the provider | Source Code Pro             | Solarized colours on light or dark backgrounds              |
| Spreadsheet   | `@graphysdk/theme-spreadsheet`   | `spreadsheet`  | light                | Arial (system font)         | White background, grey grid, flat colours                   |
| Typewriter    | `@graphysdk/theme-typewriter`    | `typewriter`   | light                | Special Elite               | Manila paper with black and red type                        |
| Watercolor    | `@graphysdk/theme-watercolor`    | `watercolor`   | light                | Caveat                      | Paint washes, pen lines, handwriting on white paper         |

Graphite and Solarized follow the provider's `colorScheme`; the others use a fixed scheme. Halloween's animation respects `animation={false}` and reduced motion.

## Install and apply

```bash
npm install @graphysdk/theme-watercolor
```

Pass the theme to `createGraphyKit` and import its fonts once. Every chart using `kit.GraphProvider` gets the theme.

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

To apply a theme without a kit, pass it directly to `GraphProvider`:

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
- Combine a theme and plugins in one kit: `createGraphyKit({ theme: watercolor, plugins: [dumbbell] })`.
- `kit.GraphProvider` shows "Made with Graphy" by default. Disable it with `config({ content: { brandMark: { enabled: false } } })`.
- Spreadsheet uses Arial and needs no CSS import. The other themes load Google Fonts through `fonts.css`. For self-hosted fonts, omit that import and load the same font families yourself; see [Fonts](#fonts).

## Changing one themed graph

Use the spec's `styles()`, scales and `config()` to customise one chart. This example changes the colours, text size and legend position while keeping Watercolor's rendering.

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

The built-in themes target charts about 600 pixels wide. Adjust `textScale` for other sizes.

## Without a bundler

Start with the HTML page in [setup](setup.md). Merge this entry into its existing import map's `imports` object:

```json
{
  "@graphysdk/theme-watercolor": "https://cdn.jsdelivr.net/npm/@graphysdk/theme-watercolor@latest/dist/index.mjs"
}
```

The theme's ESM bundle imports `@graphysdk/react`, `react` and `react/jsx-runtime`, already covered by that map. Load its fonts in `<head>`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@graphysdk/theme-watercolor@latest/fonts.css" />
```

Then import the theme in the module script and add it to the provider's props:

```js
import { watercolor } from '@graphysdk/theme-watercolor';

createRoot(document.getElementById('graph')).render(
  createElement(GraphProvider, { data, spec, theme: watercolor }, createElement(GraphRenderer))
);
```

Load `dist/index.mjs` directly. If jsDelivr is blocked, follow [setup's vendor instructions](setup.md#when-the-cdn-is-blocked), save the theme bundle alongside the other vendor files, and point its import-map entry there. Load the fonts separately through Google Fonts if allowed, or self-host them.

## Writing a custom theme

Define a `Theme` object and pass it to the kit or provider. Start with tokens for shared colours and style entries for borders, spacing and typography. Add palette and config defaults as needed:

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

The five tokens above recolour most of the chart. See [Built-in stylesheet](styling.md#built-in-stylesheet) for the full token list.

- `palette` replaces the default palette, including the single-hue ramp used for touching geoms. List group colours in the desired order.
- `colormap` supplies continuous colour stops from low to high.
- `config` accepts `axes`, `legend`, `panel`, `headline`, `tooltip`, `numberFormat` and `parsingLocale`. Titles, sources and the brand mark belong in the spec's `content`.
- `colorScheme: 'light'` fixes this theme's scheme. To support both schemes, use the approach below.

Keep page cards and other surrounding UI in the host application.

For a complete theme, cover the frame, axes, headings, data labels, legend and tooltip. The [styling target table](styling.md#style-targets) lists their builders. Include hover styles: `style.geom({ shadow: 'none' }, { state: 'hovered' })` removes the default hover shadow; a hovered `stroke` on bars, points or tiles replaces the white outline.

## Light and dark

Use `{ light, dark }` colour pairs and omit the theme's `colorScheme` to follow the provider's scheme.

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
  // Palette colours must work on both backgrounds.
  palette: ['#5E646B', '#878D95', '#3D434A', '#ABB2BA'],
};
```

Colour pairs work in stylesheet tokens and declarations. `palette` and `colormap` accept plain strings, so choose colours that remain readable on both backgrounds.

## Polar graphs

Use `coord: 'polar'` entries to adapt borders, grids and labels for pies, donuts, roses and radars. Entries without `coord` apply to both polar and cartesian charts.

```ts
import { style, type Stylesheet } from '@graphysdk/react';

const sheet: Stylesheet = {
  defaults: [
    style.gridLine.x({ strokeWidth: 0 }),
    style.panelBorder.bottom({ strokeWidth: 1, dashArray: [] }),
    // Remove the baseline; add slice borders, spokes and rings.
    style.panelBorder.bottom({ strokeWidth: 0 }, { coord: 'polar' }),
    style.geom.bar({ stroke: '#FFFFFF', strokeWidth: 1 }, { coord: 'polar' }),
    style.gridLine.x({ strokeWidth: 1, dashArray: [] }, { coord: 'polar' }),
    style.gridLine.y({ strokeWidth: 1, dashArray: [] }, { coord: 'polar' }),
    // Outline labels so they remain readable over the shapes.
    style.tickLabel({ fontWeight: 600, textOutlineColor: '#FFFFFF', textOutlineWidth: 3 }, { coord: 'polar' }),
    // Keep overlapping radar areas visible.
    style.geom.area({ fillAlpha: 0.35, strokeWidth: 3 }, { coord: 'polar' }),
  ],
};
```

Place these entries after the shared defaults. Flipped charts count as cartesian.

## Fonts

Set font families in the stylesheet and load the fonts in the host page.

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
/* In the app's own CSS, loaded before the first graph is measured. */
@import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Playfair+Display:wght@700&display=swap');
```

A text target without `fontFamily` inherits the graph's font, then the host page's. Include a system fallback and load fonts before the chart is first measured: layout does not rerun when a font arrives later. A reusable theme package can export this CSS as `fonts.css`; an in-app theme can use the app's stylesheet.

## Texture, glow and shadow

Use style properties for textures, glow and shadows before writing a custom renderer. See [styling](styling.md#property-values) for paint options.

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
    // Overlays preserve the fill underneath. The first item in a list is on top.
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

`overlay` works on geoms and the graph. Geom overlays follow the layer's opacity; graph overlays cover the frame at full opacity, subject to the paint's own transparency.

Examples from the built-in themes:

| Theme                        | Implementation                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Phosphor                     | `shadow` and `textShadow` for glow; pattern and gradient overlays for scanlines and dark corners. No custom renderer. |
| Comic                        | Dot-pattern overlays on geoms; lines set `overlay: 'none'`.                                                           |
| Blueprint                    | Pattern overlays for hatching on bars and tiles.                                                                      |
| Chalkboard, Botanical, Shiny | Graph image overlays for the wooden frame, page texture and foil border, respectively.                                |

Use a repaint for geometry or rendering that style properties cannot express.

## Repainting built-in geoms

Add `defineGeomRenderer(name, contract)` definitions to `Theme.plugins` to replace built-in geom rendering. Compilation, scales, hover indexing and data labels remain unchanged. See [Repaint a built-in geom](plugins.md#repaint-a-built-in-geom) for the contract.

Share the drawing component between normal and hover rendering:

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

- Read paint through `useGeomStyleReader(layer)` or the render input's `styleReaders`, passing the current state. This preserves spec styles and mapped colours.
- Implement `renderHover` using `primary.observation` and the `'hovered'` state. Returning nothing leaves the hovered bar dimmed with the base layer.
- Use `createStableKeyGenerator`, or `createStableCellKeyGenerator` for tiles, to preserve shape identity across updates.
- Register a separate `coord: 'polar'` contract to repaint pies and roses. Without one, built-in polar rendering remains active.
- Host plugins override theme plugins for the same geom and coordinate system, without a warning.

## Painting geoms from packages

Custom geoms that use `GeomCircle`, `GeomLine`, `GeomRect` or `GeomPath` pick up the theme's `shapes` replacements. Wrap the corresponding `DefaultGeom*` component to preserve its transitions.

```tsx
import { DefaultGeomCircle, type GeomCircleProps, type GeomShapes, type Theme } from '@graphysdk/react';

// Apply a translucent fill and dark outline to shared circles.
const InkedCircle = ({ fill, fillOpacity, ...props }: GeomCircleProps) => (
  <DefaultGeomCircle {...props} fill={fill} fillOpacity={0.6} stroke="#3B2F2F" strokeWidth={0.9} />
);

const shapes: GeomShapes = { Circle: InkedCircle };

export const inked: Theme = {
  name: 'inked',
  styles: { defaults: [] },
  shapes,
};
```

Omitted shapes use the default component. Botanical replaces `Circle`; Watercolor replaces `Circle` and `Line`.

## Motion

The render input's optional `intro` contains a `LayerIntroPlan`. Use it to coordinate entrance animations with the chart. When it is absent, including with `animation={false}` or reduced motion, render the final state immediately.

Define the final geometry and paint in the component, then animate towards that state. Continuous effects should also respect disabled animation and reduced motion.

Halloween uses the chart's intro timing for rising bars and lighting lanterns. Its entrances end at the component's drawn state. When motion is enabled, candle flicker continues after the intro for as long as the chart is shown; with animation disabled or reduced motion, the chart stays in its final state.

## Pitfalls

- `styles({ extends: [theme.styles] })` copies only the stylesheet into the spec. It does not apply the theme's palette, config, plugins or shapes.
- Theme `defaults` yield to mapped aesthetics. Use `overrides` to force a fill even when `color` is mapped; that fill will hide the mapped colours.
- Editing omits config values equal to the theme's defaults. Put only shared defaults in theme config.
- Data labels on known surfaces, such as bars, may receive a different text colour when the theme's colour lacks contrast.
