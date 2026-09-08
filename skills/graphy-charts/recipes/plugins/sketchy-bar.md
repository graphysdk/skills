# Sketchy bar

Technique: render-only paint override of a built-in geom.

Reach for this when the chart's *structure* is already a built-in geom and only its look must change — here every bar keeps the built-in `bar` compile half (positions, stacking, scales, axes), and `defineGeomRenderer('bar', contract)` swaps in a rough.js hand-drawn paint. Because no compile definition is registered, the ordinary spec builders (`geom.bar()`) keep working; only the render registry changes. Works with any bar spec, including stacked/dodged multi-series.

Requires the `roughjs` package.

```tsx
import { type ReactNode, useMemo } from 'react';
import rough from 'roughjs';

import { defineGeomRenderer } from '@graphysdk/react-renderer';
import type {
  BarStyleReaders,
  BorderRadiusToken,
  CartesianCoordSystem,
  CompiledLayer,
  MainAxis,
  Observation,
  Rect,
  StyleState,
} from '@graphysdk/viz-engine';
import { getBarRectBounds } from '@graphysdk/viz-engine';

// The nominal square canvas the bars paint into; the browser stretches it to the panel via
// `preserveAspectRatio="none"`, so the renderer never needs the panel's pixel size (`input.panelRect`,
// the panel's layout-pixel `Rect` with x/y already applied — paint in local 0…width / 0…height — is the
// escape hatch when it does). 100 (not 1) keeps rough.js's pixel-scale internals (wobble, hachure gap)
// in their intuitive range.
const VIEWBOX_SIZE = 100;
// One shared generator — `toPaths` is stateless (produces path data, touches no DOM).
const generator = rough.generator();

type RoughPath = ReturnType<typeof generator.toPaths>[number];

/** The hand-drawn knobs — the one kind of paint the stylesheet has no vocabulary for, so constants are fair. */
interface SketchStyle {
  roughness: number;
  fillWeight: number;
  hachureGap: number;
}

const BASE_SKETCH: SketchStyle = { roughness: 0.8, fillWeight: 1.2, hachureGap: 2.2 };
// Hover: a denser fill, drawn over the dimmed base bar so the focused one reads as inked-in. Sharing the
// base bar's seed keeps the heavier strokes registered to the bar underneath.
const HOVER_SKETCH: SketchStyle = { roughness: 0.8, fillWeight: 2.4, hachureGap: 1.4 };

/** Everything else comes through the cascade: user `style.geom.bar` entries, tokens, the active scheme. */
interface BarPaint {
  color: string;
  stroke: string;
  strokeWidth: number;
  radius: BorderRadiusToken;
}

// A render-only `'bar'` override receives the bar layer's readers, so the bar built-ins (`borderRadius`,
// `borderWidth`) are typed non-null. The built-in stylesheet declares `borderColor` too (`geomBorder`
// token), but the reader type does not guarantee it — hence the fallback.
const readBarPaint = (readers: BarStyleReaders, observation: Observation, state?: StyleState): BarPaint => {
  const color = readers.get('color', observation, state);
  return {
    color,
    stroke: readers.get('borderColor', observation, state) ?? color,
    strokeWidth: readers.get('borderWidth', observation, state),
    radius: readers.get('borderRadius', observation, state),
  };
};

// `borderRadius` is a token, not pixels. The engine's pixel radii are `none 0, xs 2, sm 4, md 8, lg 12,
// xl 16` px, and `'full'` is half the band-side thickness on the band axis only. This table keeps those
// ratios at ¼ the pixel values in the nominal 100-unit panel-relative viewBox — exact only on a 400 px
// side, anisotropic on a non-square panel — and `'full'` is approximated. For pixel-exact radii paint
// from `input.panelRect` instead and clamp with `Math.min(radius, width / 2)` on the band axis.
const RADIUS_UNITS: Record<BorderRadiusToken, number> = { none: 0, xs: 0.5, sm: 1, md: 2, lg: 3, xl: 4, full: 50 };

const roundedRectPath = (x: number, y: number, width: number, height: number, radius: number): string => {
  const r = Math.min(radius, width / 2, height / 2);
  return `M${x + r},${y} h${width - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${height - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${2 * r - width} a${r},${r} 0 0 1 ${-r},${-r} v${2 * r - height} a${r},${r} 0 0 1 ${r},${-r} Z`;
};

/** FNV-1a hash → a stable positive rough.js seed, so a bar's wobble is deterministic across re-render/hover. */
const hashSeed = (key: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483647 || 1;
};

// Seed derived from the bar's geometry — base paint and hover highlight independently compute the same
// one for the same observation, so the heavier hover wobble lands exactly over the base bar. It hashes
// the scaled bounds, so a domain change (new data, a rescaled axis) re-seeds every bar's wobble.
const rectSeed = (bounds: Rect): number => hashSeed(`${bounds.x}:${bounds.y}:${bounds.width}:${bounds.height}`);

/** rough.js path set for one normalized [0,1] bar rect, scaled into the nominal viewBox. */
const buildBarPaths = (bounds: Rect, paint: BarPaint, sketch: SketchStyle): RoughPath[] =>
  generator.toPaths(
    generator.path(
      roundedRectPath(
        bounds.x * VIEWBOX_SIZE,
        bounds.y * VIEWBOX_SIZE,
        bounds.width * VIEWBOX_SIZE,
        bounds.height * VIEWBOX_SIZE,
        RADIUS_UNITS[paint.radius]
      ),
      {
        seed: rectSeed(bounds),
        bowing: 1.2,
        stroke: paint.stroke,
        strokeWidth: paint.strokeWidth,
        fill: paint.color,
        fillStyle: 'hachure',
        ...sketch,
      }
    )
  );

/** The nominal-viewBox canvas every sketchy bar (and its hover overlay) paints into. */
const SketchyCanvas = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
    preserveAspectRatio="none"
    width="100%"
    height="100%"
    style={{ overflow: 'visible' }}
    data-geom="sketchy-bar"
  >
    {children}
  </svg>
);

const RoughPathSet = ({ paths }: { paths: RoughPath[] }) => (
  <>
    {paths.map((path, index) => (
      <path
        key={index}
        d={path.d}
        stroke={path.stroke}
        strokeWidth={path.strokeWidth}
        fill={path.fill ?? 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    ))}
  </>
);

interface SketchyBar {
  key: number;
  opacity: number;
  paths: RoughPath[];
}

// The geom renderer receives normalized [0,1] bounds, so the bars paint into the nominal viewBox
// square that the browser stretches to the panel. `vectorEffect="non-scaling-stroke"` keeps the ink
// weight constant through that non-uniform stretch — no panel measurement needed. Only the stroke
// width is size-invariant, though: rough.js consumes `roughness`/`bowing`/`hachureGap`/`fillWeight` in
// path units, so the wobble and hatch density scale with the panel. Each stack segment is painted as
// its own rounded, hachured rect (the built-in bar rounds the stack silhouette and merges internal
// borders).
const SketchyBars = ({
  layer,
  coordSystem,
  styleReaders,
}: {
  layer: CompiledLayer;
  coordSystem: CartesianCoordSystem;
  styleReaders: BarStyleReaders;
}) => {
  const bars = useMemo<SketchyBar[]>(() => {
    const result: SketchyBar[] = [];
    let index = 0;
    for (const observation of layer.data) {
      const key = index;
      index += 1;
      const bounds = getBarRectBounds(coordSystem.mainAxis, observation);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) continue;

      result.push({
        key,
        opacity: styleReaders.get('alpha', observation),
        paths: buildBarPaths(bounds, readBarPaint(styleReaders, observation), BASE_SKETCH),
      });
    }
    return result;
  }, [layer.data, coordSystem.mainAxis, styleReaders]);

  return (
    <SketchyCanvas>
      {bars.map((bar) => (
        <g key={bar.key} opacity={bar.opacity}>
          <RoughPathSet paths={bar.paths} />
        </g>
      ))}
    </SketchyCanvas>
  );
};

/** In-place hover highlight: the same bar redrawn bolder, registered via the shared rect seed. */
const SketchyBarHighlight = ({
  observation,
  mainAxis,
  styleReaders,
}: {
  observation: Observation;
  mainAxis: MainAxis;
  styleReaders: BarStyleReaders;
}) => {
  const bounds = getBarRectBounds(mainAxis, observation);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  // `'hovered'` resolves the built-in hover outline (`hoverAffordance` token) or the stylesheet's own
  // hovered entry; the extra stroke weight is the sketch's, not the stylesheet's.
  const paint = readBarPaint(styleReaders, observation, 'hovered');
  return (
    <SketchyCanvas>
      <RoughPathSet paths={buildBarPaths(bounds, { ...paint, strokeWidth: paint.strokeWidth + 1.5 }, HOVER_SKETCH)} />
    </SketchyCanvas>
  );
};

export const sketchyBar = defineGeomRenderer('bar', {
  coord: 'cartesian',
  guideMode: 'band',
  // `swatchShape` omitted → legend/tooltip swatches fall back to `'square'`, right for bars.
  // `renderHighlight` omitted → a spec `highlight()` repaints the matched subset through `render`.
  render: ({ layer, coordSystem, styleReaders }) => {
    if (coordSystem.type !== 'cartesian') return null;
    // The contract types the readers as the base `GeomStyleReaders`; a `'bar'` layer's are `BarStyleReaders`.
    return <SketchyBars layer={layer} coordSystem={coordSystem} styleReaders={styleReaders as BarStyleReaders} />;
  },
  renderHover: ({ primary, coordSystem, styleReaders }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return (
      <SketchyBarHighlight
        observation={primary.observation}
        mainAxis={coordSystem.mainAxis}
        styleReaders={styleReaders as BarStyleReaders}
      />
    );
  },
  renderHoverCompanions: () => null,
});
```

The bar layer's `spatialKind` is `'rects'`, so `input.intro` offers a grow plan; this renderer ignores it (plans are offered, never imposed), so the bars pop in while built-in layers animate.

## Usage

A render-only override needs no `createGraphyKit` — author the spec with the ordinary builders and pass the renderer via `plugins` (frozen at mount; remount with a React `key` to change it):

```tsx
import { createSpec, geom, mapping, pipe, scale, type Data } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const data: Data = {
  columns: [{ key: 'category' }, { key: 'revenue' }],
  rows: [
    { category: 'Product A', revenue: 1200 },
    { category: 'Product B', revenue: 1800 },
    { category: 'Product C', revenue: 2400 },
  ],
};

const input = pipe(createSpec(), mapping({ x: 'category', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

export const SketchyChart = () => (
  <GraphProvider input={input} data={data} plugins={[sketchyBar]}>
    <GraphRenderer />
  </GraphProvider>
);
```

Stacked bars need no plugin changes — `geom.bar({ position: 'stack' })` plus a `color` mapping and `scale.color.palette()` just works, because stacking happens in the untouched compile half. A render-only override keeps everything else built-in too: the bar's hover index, tooltip, identity and anchors are untouched, only the paint is replaced.

## Adapting

- Paint is inside the style cascade: `styleReaders.get('color', observation)` / `get('alpha', observation)` honour a user's `style.geom` entries and dark-scheme tokens (`getColor`/`getAlpha` expose the encoding only). Reserve constants and geom params for what the stylesheet has no vocabulary for — roughness, hachure. See `reference/styling.md`.
- A render-only override receives the bar layer's own readers, so the bar built-ins need no re-inventing: `borderRadius` (a token — `'none'` … `'full'`), `borderWidth`, `borderColor`, and `get('borderColor', observation, 'hovered')` for the hover outline. `renderHighlight` is omitted, so a spec `highlight()` repaints the matched subset via `render` — a lone mid-stack segment is drawn as an isolated rect (stack-segment fidelity lost) — while layer dimming still comes free from the wrapping group; add `renderHighlight` reading `sourceLayer` to restore it.
- Annotations keep anchoring to the bars: the built-in bar's `resolveAnchorPosition` is untouched, only its paint is replaced.
- Tune the hand-drawn look via `roughness`, `bowing`, `fillStyle` (e.g. `'cross-hatch'`, `'zigzag'`) and the `BASE_SKETCH`/`HOVER_SKETCH` weights — all consumed in path units, so they scale with the panel; paint from `input.panelRect` for a size-invariant look.
- The same pattern overrides any built-in geom name (`'point'`, `'line'`, `'area'`, `'rule'`) — pass a different name to `defineGeomRenderer` and read the geometry with that geom's accessors. A later `plugins` entry wins on a shared `(geom, coord)` key.
