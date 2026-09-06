# Beeswarm

Technique: simulation-driven layout.

Reach for this pattern when a geom's geometry depends on the panel's **pixel** size and therefore cannot be precomputed in the DOM-free compiler. Here, each point's x comes from the engine's scale, but the off-axis dodge is a pixel-radius collision computed render-side from `input.panelRect` (the panel's layout-pixel size), which both `render` and the declarative `hitTest` factory receive. The factory is re-memoized on `layer.data` and the panel pixel rect, so a resize re-dodges the swarm; paint, hit-test, and hover repaint all derive from the same layout. The `useGeomHitTest` hook stays the escape hatch for geometry that only exists in live component state.

No third-party dependencies.

## Plugin

```tsx
import { useMemo } from 'react';

import { createGraphyKit, defineGeomRenderer, type RenderHitTester } from '@graphysdk/react-renderer';
import type {
  CompiledGeom,
  CompiledLayer,
  Dataset,
  GeomCompilerInput,
  GeomStyleReaders,
  HoverHit,
  IdentityKey,
  Observation,
  Rect,
} from '@graphysdk/viz-engine';
import { Geom, getX, readObservationIndex } from '@graphysdk/viz-engine';

/** Circle radius in pixels — the collision diameter the dodge clears. */
const POINT_RADIUS = 3.5;
/** Hover hit radius — a touch larger than the drawn dot so dense points stay easy to target. */
const POINT_HIT_RADIUS = POINT_RADIUS + 2;
const EPSILON = 1e-6;

/** One observation to place: row index (the `'index'` identity), scaled x in [0, 1], and the row for paint. */
interface SwarmPoint {
  index: number;
  x01: number;
  observation: Observation;
}

/** A placed point in panel pixel space. */
interface PlacedPoint extends SwarmPoint {
  cx: number;
  cy: number;
}

/**
 * The beeswarm dodge: every point sits at its scaled x and is nudged off the centre line just far
 * enough to clear each already-placed neighbour by one collision diameter. The collision radius is a
 * fixed pixel count, so clearance depends on the panel's pixel size — which is why this runs
 * render-side from `input.panelRect`, not in the compiler that owns the scale-derived x.
 */
function computeSwarm(points: SwarmPoint[], width: number, height: number, radius: number): PlacedPoint[] {
  const baseline = height / 2;
  const diameter = radius * 2;
  const diameterSq = diameter * diameter;
  const ordered = points
    .map((point) => ({ ...point, cx: point.x01 * width }))
    .sort((left, right) => left.cx - right.cx);

  const placed: PlacedPoint[] = [];
  for (const point of ordered) {
    const neighbours = placed.filter((other) => Math.abs(other.cx - point.cx) < diameter);
    const cy = resolveCy(point.cx, baseline, height, radius, diameterSq, neighbours);
    placed.push({ ...point, cy });
  }
  return placed;
}

/** Finds the y nearest the centre line where a circle at `cx` clears every near neighbour. */
function resolveCy(
  cx: number,
  baseline: number,
  height: number,
  radius: number,
  diameterSq: number,
  neighbours: PlacedPoint[]
): number {
  if (neighbours.length === 0) return baseline;

  const candidates = [baseline];
  for (const neighbour of neighbours) {
    const dx = cx - neighbour.cx;
    const span = Math.sqrt(diameterSq - dx * dx);
    candidates.push(neighbour.cy + span, neighbour.cy - span);
  }

  let best = baseline;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const cy of candidates) {
    if (cy < radius || cy > height - radius) continue;
    const clears = neighbours.every((neighbour) => {
      const dx = cx - neighbour.cx;
      const dy = cy - neighbour.cy;
      return dx * dx + dy * dy >= diameterSq - EPSILON;
    });
    if (!clears) continue;
    const distance = Math.abs(cy - baseline);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = cy;
    }
  }
  return best;
}

class BeeswarmGeom extends Geom {
  readonly type = 'beeswarm';
  override readonly defaultParams = {};
  override readonly identityKey: IdentityKey = 'index';
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly highlightStrategy = null;
  // Only x is a position the engine scales onto an axis; y is owned by the render-side dodge, so the
  // geom declares a single x role and no y mapping (the chart gets no y axis). `name` is a free `data`
  // input carried for the tooltip; `color` is author-mapped, so the engine's categorical scale assigns
  // the hues.
  override readonly positionRoles = [{ axis: 'x', role: 'point', valueKind: 'value' }] as const;
  override readonly aesthetics = [
    { kind: 'data', name: 'name' },
    { kind: 'visual', name: 'color' },
  ] as const;
  override readonly tooltip = [
    { key: 'Name', aes: 'name' },
    { key: 'Group', aes: 'color' },
  ] as const;

  override readonly spatialKind = 'render-hit-test';

  // The engine scales x and trains the colour scale; the geom adds nothing and injects no y. Passing
  // the data through keeps row order: `identityKey: 'index'` keys each hit as `String(datasetRow)`, so
  // the row the tester returns must be the row the engine's `byKey` map stored. `'index'` indexes every
  // row, including ones the layout skips for a null x — which is why `readPoints` advances its counter
  // unconditionally.
  compile({ data }: GeomCompilerInput): CompiledGeom {
    return { data, mapping: {} };
  }
}

/**
 * Reads each row's scaled x, preserving the row index as the identity key. Layout reads no colour: the
 * `hitTest` factory is memoized on `[hitTest, layer.data, panelRect]` — not `styleReaders` — so a
 * tester that read paint would go stale on a restyle. Paint resolves colour per point at render time.
 */
function readPoints(data: Dataset): SwarmPoint[] {
  const points: SwarmPoint[] = [];
  let index = 0;
  for (const observation of data) {
    const x01 = getX(observation);
    if (x01 !== null) {
      points.push({ index, x01, observation });
    }
    // Unconditional: `identityKey: 'index'` keys hits by dataset row, skipped rows included.
    index += 1;
  }
  return points;
}

/** The swarm for one panel size — the single layout that paint, the hit tester, and the hover repaint share. */
function layoutSwarm(data: Dataset, width: number, height: number): PlacedPoint[] {
  return computeSwarm(readPoints(data), width, height, POINT_RADIUS);
}

/**
 * The cursor query over the placed circles — walks the placed points in reverse paint order and returns
 * the first containment hit, so the drawn-last point wins.
 */
function buildSwarmTester(placed: PlacedPoint[], width: number, height: number, radius: number): RenderHitTester {
  const radiusSq = radius * radius;
  return (cursor) => {
    const px = cursor.x * width;
    const py = cursor.y * height;
    for (let index = placed.length - 1; index >= 0; index -= 1) {
      const point = placed[index];
      if (!point) continue;
      const dx = px - point.cx;
      const dy = py - point.cy;
      if (dx * dx + dy * dy <= radiusSq) return { key: String(point.index) };
    }
    return null;
  };
}

interface SwarmPaintProps {
  layer: CompiledLayer;
  styleReaders: GeomStyleReaders;
  /** Layout pixels; x/y are already applied, so marks paint in local `0…width` / `0…height`. */
  panelRect: Rect;
}

/**
 * Paints the swarm in panel pixel space. `panelRect` is the paint size the renderer hands every render
 * input — no measurement needed (`useElementScreenRect` is for client-coordinate overlays). Fill comes
 * from `styleReaders` (override → colour scale → default, resolved for the active scheme), not
 * `getColor`, which sees the data tier only and is `undefined` whenever `color` is unmapped.
 */
const BeeswarmLayer = ({ layer, styleReaders, panelRect: { width, height } }: SwarmPaintProps) => {
  const placed = useMemo(() => layoutSwarm(layer.data, width, height), [layer.data, width, height]);

  return (
    <>
      {placed.map((point) => (
        <circle
          key={point.index}
          cx={point.cx}
          cy={point.cy}
          r={POINT_RADIUS}
          fill={styleReaders.get('color', point.observation)}
          stroke="#fff"
          strokeWidth={0.5}
        />
      ))}
    </>
  );
};

/**
 * Repaints the hovered dot at full opacity above the auto-dimmed base layer. `primary` is an anchorless
 * hit (no `x`/`y`), so the dot is found by its dataset row from the same layout the base paint used.
 * `readObservationIndex(primary)` returns that row because a render-hit-test hit carries `pointIndex` only.
 */
const BeeswarmHover = ({ layer, styleReaders, panelRect: { width, height }, primary }: SwarmPaintProps & { primary: HoverHit }) => {
  const placed = useMemo(() => layoutSwarm(layer.data, width, height), [layer.data, width, height]);
  const row = readObservationIndex(primary);
  const hovered = placed.find((point) => point.index === row);
  if (!hovered) return null;
  return (
    <circle
      cx={hovered.cx}
      cy={hovered.cy}
      r={POINT_RADIUS + 2}
      fill={styleReaders.get('color', hovered.observation)}
      stroke="#1f2937"
      strokeWidth={1.5}
    />
  );
};

export const kit = createGraphyKit({
  plugins: [
    defineGeomRenderer(new BeeswarmGeom(), {
      coord: 'cartesian',
      swatchShape: 'circle',
      render: ({ layer, styleReaders, panelRect }) => (
        <BeeswarmLayer layer={layer} styleReaders={styleReaders} panelRect={panelRect} />
      ),
      // The factory gets the same `panelRect` as `render` and is memoized on `[hitTest, layer.data,
      // panelRect]`, so the dodge is recomputed on resize (and never on a restyle — hence no
      // `styleReaders` in the layout). Declaring it here (rather than registering through
      // `useGeomHitTest` at runtime) also satisfies the `MISSING_RENDER_HIT_TEST` check.
      hitTest: ({ layer, panelRect: { width, height } }) =>
        buildSwarmTester(layoutSwarm(layer.data, width, height), width, height, POINT_HIT_RADIUS),
      renderHover: ({ layer, styleReaders, panelRect, primary }) => (
        <BeeswarmHover layer={layer} styleReaders={styleReaders} panelRect={panelRect} primary={primary} />
      ),
      renderHoverCompanions: () => null,
    }),
  ],
});
```

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react-renderer';
import type { Data } from '@graphysdk/viz-engine';

import { kit } from './beeswarm-plugin';

// x is the scale-derived value axis; the off-axis spread is the render-side dodge, so no y axis.
const spec = kit.pipe(
  kit.createSpec({ x: 'value' }),
  kit.geom.beeswarm({ aes: { name: 'name', color: 'group' } }),
  kit.scale.x.continuous({ zero: false }),
  kit.scale.color.palette()
);

const data: Data = {
  columns: [{ key: 'name' }, { key: 'group' }, { key: 'value' }],
  rows: [
    { name: 'Adelie #1', group: 'Adelie', value: 3700 },
    { name: 'Adelie #2', group: 'Adelie', value: 3450 },
    { name: 'Gentoo #1', group: 'Gentoo', value: 5100 },
    { name: 'Gentoo #2', group: 'Gentoo', value: 4950 },
    { name: 'Chinstrap #1', group: 'Chinstrap', value: 3800 },
  ],
};

export const BeeswarmChart = () => (
  <kit.GraphProvider input={spec} data={data}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Adapting

- Swap `computeSwarm` for any pixel-space placement (jitter, violin-density dodge, a d3-force collision pass); keep the row-index identity aligned with the compiled data order so hover keys resolve. `identityKey: 'index'` keys each hit as `String(datasetRow)`, which is why `compile()` must preserve row order; under the `{ variable }` identity form the returned `key` must instead equal `getStableKey(identityValue)` (identity for strings, normalised for other types: a `Date` becomes its ISO string). A `'x-group'`/`'x-y'` identity on a render-hit-test geom, or a `{ variable }` column the compiled data lacks, raises `RENDER_HIT_TEST_IDENTITY` and every hit resolves to nothing. `defaultInteractive: false` on the geom opts a layer out of hover entirely and also silences `MISSING_RENDER_HIT_TEST`.
- Tune `POINT_RADIUS` / `POINT_HIT_RADIUS` for density; the hit radius can exceed the drawn radius to keep small marks targetable.
- To swarm vertically, declare the position role on `axis: 'y'` and dodge along x instead — the layout and tester swap coordinates, the geom contract is otherwise unchanged.
- The geom declares no `resolveAnchorPosition`, so the chart reports `MISSING_ANCHOR_CAPABILITY` (a warning; paint and hover are unaffected) and annotations cannot attach to its marks. Implement `resolveAnchorPosition(observation, context)` returning the normalized `[0, 1]` panel point an annotation belongs at, to make the marks annotatable and give the editor overlay a creation trigger on them. That frame is data-up (`y = 0` at the panel bottom), the opposite of the top-left pixel frame the dots are placed in: a dot at `(cx, cy)` becomes `{ x: cx / width, y: 1 - cy / height }`, though the dodge is knowable only render-side here. `context` is an `AnchorContext` — `{ coordSystem, position, purpose: 'pin' | 'value', align? }`.
- Dot fill reads through `input.styleReaders.get('color', observation)` — this layer's cascade (override → colour scale → default), resolved for the active scheme — so a `styles` override or a dark-scheme token reaches every dot. `getColor` exposes the data tier only and is `undefined` whenever `color` is unmapped. Only non-cascade decoration belongs in a geom param: the dot strokes (`#fff`, `#1f2937`) are contrast choices, so pick them from `input.colorScheme` or expose them as params. See `reference/styling.md`.
- Under hover the base layer auto-dims through the cascade's `dimmed` state (built-in `alpha: 0.4`) while the `renderHover` output paints at full opacity above it — which is why the hovered dot is repainted in `renderHover` rather than inline in the base layer, where it would dim too. `intro` is `null` for a `render-hit-test` layer — dots never animate in.
- The `hitTest` factory is the preferred route: `input.panelRect` is available in both `render` and the factory, and the factory is re-memoized on `layer.data` and the panel pixel rect, so a resize rebuilds it. `useGeomHitTest(layer.id, tester)` remains the escape hatch for geometry that only exists in live component state (a simulation that settles); it registers at runtime, invisible to the contract check, so that path still reports `MISSING_RENDER_HIT_TEST` even though hover works.
