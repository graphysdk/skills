# Beeswarm

Technique: simulation-driven layout.

Reach for this pattern when a geom's geometry depends on the panel's **pixel** size and therefore cannot be precomputed in the DOM-free compiler. Here, each point's x comes from the engine's scale, but the off-axis dodge is a pixel-radius collision computed render-side; the placed geometry lives in component state and the geom registers its spatial query with the `useGeomHitTest` hook instead of the declarative `hitTest` factory.

No third-party dependencies.

## Plugin

```tsx
import { useMemo } from 'react';

import {
  createGraphyKit,
  defineGeomRenderer,
  type RenderHitTester,
  useGeomHitTest,
  useHoverState,
  usePanelScreenRect,
} from '@graphysdk/react-renderer';
import type {
  CompiledGeom,
  CompiledLayer,
  Dataset,
  GeomCompilerInput,
  IdentityKey,
} from '@graphysdk/viz-engine';
import { Geom, getColor, getX } from '@graphysdk/viz-engine';

/** Circle radius in pixels — the collision diameter the dodge clears. */
const POINT_RADIUS = 3.5;
/** Hover hit radius — a touch larger than the drawn dot so dense points stay easy to target. */
const POINT_HIT_RADIUS = POINT_RADIUS + 2;
const FALLBACK_COLOR = '#888888';
const EPSILON = 1e-6;

/** One observation to place: row index (the `'index'` identity), scaled x in [0, 1], resolved fill. */
interface SwarmPoint {
  index: number;
  x01: number;
  color: string;
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
 * render-side, not in the compiler that owns the scale-derived x.
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
  // the data through keeps row order, so the `'index'` identity the hit-test returns lines up with the
  // engine's `byKey` map.
  compile({ data }: GeomCompilerInput): CompiledGeom {
    return { data, mapping: {} };
  }
}

/** Reads each row's scaled x and resolved colour, preserving the row index as the identity key. */
function readPoints(data: Dataset): SwarmPoint[] {
  const points: SwarmPoint[] = [];
  let index = 0;
  for (const observation of data) {
    const x01 = getX(observation);
    if (x01 !== null) {
      points.push({ index, x01, color: getColor(observation) ?? FALLBACK_COLOR });
    }
    index += 1;
  }
  return points;
}

/** The cursor query over the placed circles — nearest-first from the top, so the drawn-last point wins. */
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

/**
 * Paints the swarm and owns its hover. Measures the panel (`usePanelScreenRect`), lays the circles out
 * in pixel space, and registers the spatial query with `useGeomHitTest`. The hovered point is read from
 * the shared hover store and repainted on top, so the geom inherits the central tooltip and needs no
 * `renderHover` overlay.
 */
const BeeswarmLayer = ({ layer }: { layer: CompiledLayer }) => {
  const { ref, rect } = usePanelScreenRect();
  const points = useMemo(() => readPoints(layer.data), [layer.data]);
  const placed = useMemo(
    () => (rect ? computeSwarm(points, rect.width, rect.height, POINT_RADIUS) : []),
    [points, rect]
  );
  const tester = useMemo<RenderHitTester>(
    () => (rect ? buildSwarmTester(placed, rect.width, rect.height, POINT_HIT_RADIUS) : () => null),
    [placed, rect]
  );
  useGeomHitTest(layer.id, tester);

  const hoveredIndex = useHoverState((state) =>
    state.hover.primary && state.hover.primary.layerId === layer.id ? state.hover.primary.pointIndex : null
  );
  const hovered = hoveredIndex === null ? null : (placed.find((point) => point.index === hoveredIndex) ?? null);

  return (
    <>
      <rect ref={ref} width="100%" height="100%" fill="transparent" pointerEvents="none" />
      {placed.map((point) => (
        <circle
          key={point.index}
          cx={point.cx}
          cy={point.cy}
          r={POINT_RADIUS}
          fill={point.color}
          stroke="#fff"
          strokeWidth={0.5}
        />
      ))}
      {hovered && (
        <circle
          cx={hovered.cx}
          cy={hovered.cy}
          r={POINT_RADIUS + 2}
          fill={hovered.color}
          stroke="#1f2937"
          strokeWidth={1.5}
        />
      )}
    </>
  );
};

export const kit = createGraphyKit({
  plugins: [
    defineGeomRenderer(new BeeswarmGeom(), {
      coord: 'cartesian',
      swatchShape: 'circle',
      // No `hitTest` factory: the dodge is computed render-side, so the tester is registered through
      // the `useGeomHitTest` hook inside the layer. Hover paint is inline.
      render: ({ layer }) => <BeeswarmLayer layer={layer} />,
      renderHover: () => null,
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

- Swap `computeSwarm` for any pixel-space placement (jitter, violin-density dodge, a d3-force collision pass); keep the row-index identity aligned with the compiled data order so hover keys resolve.
- Tune `POINT_RADIUS` / `POINT_HIT_RADIUS` for density; the hit radius can exceed the drawn radius to keep small marks targetable.
- To swarm vertically, declare the position role on `axis: 'y'` and dodge along x instead — the layout and tester swap coordinates, the geom contract is otherwise unchanged.
