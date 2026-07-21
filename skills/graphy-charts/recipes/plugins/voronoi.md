# Voronoi

Technique: computed-geometry hit regions.

Reach for this pattern when the hover region is a computed shape rather than the painted mark: a Voronoi cell is the locus of points nearest its seed site, so the rule that defines the painted polygon and the rule that hit-tests it are the same function — a nearest-site scan never misses and needs no polygon containment test. The geometry is computed once in `compile()`, rides in the compiled spec as plain columns (polygons as JSON strings), and the render half paints it and answers cursor queries via the `hitTest` factory. Requires `d3-delaunay`.

## Layout (`voronoi-layout.ts`)

Pure tessellation in unit `[0, 1]` space, free of any Graphy import.

```ts
import { Delaunay } from 'd3-delaunay';

export interface VoronoiPoint {
  x: number;
  y: number;
}

export interface VoronoiCell {
  /** Seed-site position, normalised into the padded `[0, 1]` box. */
  siteX: number;
  siteY: number;
  /** The cell ring in `[0, 1]` unit space (no closing duplicate vertex). */
  polygon: Array<[number, number]>;
  /** Indices of the Delaunay-adjacent sites (cells that share an edge with this one). */
  neighbors: number[];
}

type Vertex = [number, number];

const EPSILON = 1e-12;

export function computeVoronoiLayout(points: VoronoiPoint[], options: { padding: number }): VoronoiCell[] {
  const sites = normalizeSites(points, options.padding);
  const voronoi = Delaunay.from(sites).voronoi([0, 0, 1, 1]);

  return sites.map((site, index) => {
    // d3 types cellPolygon as non-null, but it returns null for a degenerate (e.g. coincident) site.
    const ring = voronoi.cellPolygon(index) as Delaunay.Polygon | null;
    return {
      siteX: site[0],
      siteY: site[1],
      polygon: ring ? ring.slice(0, -1) : [],
      neighbors: [...voronoi.neighbors(index)],
    };
  });
}

/** Min–max normalises the raw points into a `[padding, 1 - padding]` box so cells fill the panel. */
function normalizeSites(points: VoronoiPoint[], padding: number): Vertex[] {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const span = 1 - 2 * padding;
  const project = (value: number, min: number, max: number): number =>
    max - min < EPSILON ? 0.5 : padding + ((value - min) / (max - min)) * span;

  const [minX, maxX] = extent(xs);
  const [minY, maxY] = extent(ys);

  return points.map((point) => [project(point.x, minX, maxX), project(point.y, minY, maxY)]);
}

/** Min/max in a single pass — a spread over a large point cloud would overflow the call-argument limit. */
function extent(values: number[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}
```

## Plugin

```tsx
import { useMemo } from 'react';
import {
  createGraphyKit,
  defineGeomRenderer,
  type RenderHitTester,
  UnitSpaceSvg,
} from '@graphysdk/react-renderer';
import type {
  CompiledGeom,
  CompiledLayer,
  GeomCompilerInput,
  IdentityKey,
  Observation,
} from '@graphysdk/viz-engine';
import {
  Dataset,
  extractVariableName,
  Geom,
  getColor,
  readAuthoredNumber,
  readAuthoredString,
  toPercent,
} from '@graphysdk/viz-engine';

import { computeVoronoiLayout, type VoronoiPoint } from './voronoi-layout';

/** The compile/render column vocabulary — the shared handshake between the two halves. */
const VORONOI_COLUMNS = {
  markId: 'markId',
  siteX: 'siteX',
  siteY: 'siteY',
  /** Cell ring and neighbour indices ride as JSON strings — a columnar dataset stores scalars only. */
  cell: 'cell',
  neighbors: 'neighbors',
  label: 'label',
  category: 'category',
} as const;

/** Fill used only if the colour scale is somehow absent — every cell is otherwise scale-coloured. */
const FALLBACK_COLOR = '#888888';

interface VoronoiParams {
  /** Inset of the seed points from the panel edge, as a fraction of the box. */
  padding: number;
  /** Whether to overlay the Delaunay triangulation (the dual: an edge per adjacent pair of cells). */
  showDelaunay: boolean;
  /** Whether to draw each point's label next to its seed (off for dense clouds). */
  showLabels: boolean;
  /** Cell fill opacity; cell borders and seed dots paint at full strength over it. */
  fillOpacity: number;
}

interface VoronoiRecord {
  x: number;
  y: number;
  label: string;
  category: string;
}

class VoronoiGeom extends Geom<VoronoiParams> {
  readonly type = 'voronoi';

  override readonly defaultParams: VoronoiParams = {
    padding: 0.04,
    showDelaunay: true,
    showLabels: false,
    fillOpacity: 0.35,
  };

  override readonly identityKey: IdentityKey = { variable: VORONOI_COLUMNS.markId };
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly highlightStrategy = null;

  // `x`/`y`/`label`/`category` are the point-cloud inputs the layout consumes (read from the mapped
  // columns, not scaled). `color` is author-mapped: a site is 1:1 with an input row, so the author maps
  // it to a real input column (e.g. `category`), which the engine's categorical scale resolves per cell.
  override readonly aesthetics = [
    { kind: 'data', name: 'x', required: true },
    { kind: 'data', name: 'y', required: true },
    { kind: 'data', name: 'label' },
    { kind: 'data', name: 'category' },
    { kind: 'visual', name: 'color' },
  ] as const;

  override readonly tooltip = [
    { key: 'Name', aes: 'label' },
    { key: 'Group', aes: 'category' },
  ];

  override readonly spatialKind = 'render-hit-test';

  compile({ data, params, mapping }: GeomCompilerInput): CompiledGeom {
    const resolved = { ...this.defaultParams, ...(params as Partial<VoronoiParams>) };
    const records = readRecords(data, mapping);
    const cells = computeVoronoiLayout(
      records.map((record): VoronoiPoint => ({ x: record.x, y: record.y })),
      { padding: resolved.padding }
    );

    const markId: string[] = [];
    const siteX: number[] = [];
    const siteY: number[] = [];
    const cell: string[] = [];
    const neighbors: string[] = [];
    const label: string[] = [];
    const category: string[] = [];

    records.forEach((record, index) => {
      const computed = cells[index];
      if (!computed) return;
      markId.push(`site:${index}`);
      siteX.push(computed.siteX);
      siteY.push(computed.siteY);
      cell.push(JSON.stringify(computed.polygon));
      neighbors.push(JSON.stringify(computed.neighbors));
      label.push(record.label);
      category.push(record.category);
    });

    const table = new Dataset({
      [VORONOI_COLUMNS.markId]: { type: 'categorical', values: markId },
      [VORONOI_COLUMNS.siteX]: { type: 'numeric', values: siteX },
      [VORONOI_COLUMNS.siteY]: { type: 'numeric', values: siteY },
      [VORONOI_COLUMNS.cell]: { type: 'categorical', values: cell },
      [VORONOI_COLUMNS.neighbors]: { type: 'categorical', values: neighbors },
      [VORONOI_COLUMNS.label]: { type: 'categorical', values: label },
      [VORONOI_COLUMNS.category]: { type: 'categorical', values: category },
    });

    // Geometry stays in the geom's own columns, unscaled. The tooltip reads `label`/`category`.
    return {
      data: table,
      mapping: { label: { variable: VORONOI_COLUMNS.label }, category: { variable: VORONOI_COLUMNS.category } },
    };
  }
}

/**
 * Zips the coordinate, label, and category columns into records, dropping rows with a missing
 * coordinate. Label falls back to a 1-based index; category to the empty string when unmapped.
 */
function readRecords(data: Dataset, mapping: GeomCompilerInput['mapping']): VoronoiRecord[] {
  const xVariable = extractVariableName(mapping.x);
  const yVariable = extractVariableName(mapping.y);
  const labelVariable = extractVariableName(mapping.label);
  const categoryVariable = extractVariableName(mapping.category);
  // Read untyped and filter by `typeof` below, rather than the type-asserting `getValues` overload: a
  // present-but-wrong-typed mapping degrades to an empty chart instead of an error panel.
  const xs = xVariable && data.hasVariable(xVariable) ? data.getValues(xVariable) : [];
  const ys = yVariable && data.hasVariable(yVariable) ? data.getValues(yVariable) : [];
  const labels = labelVariable && data.hasVariable(labelVariable) ? data.getValues(labelVariable) : null;
  const categories = categoryVariable && data.hasVariable(categoryVariable) ? data.getValues(categoryVariable) : null;

  const records: VoronoiRecord[] = [];
  for (let row = 0; row < xs.length; row += 1) {
    const x = xs[row];
    const y = ys[row];
    if (typeof x !== 'number' || typeof y !== 'number') continue;

    const rawCategory = categories?.[row];
    const rawLabel = labels?.[row];
    records.push({
      x,
      y,
      label: typeof rawLabel === 'string' ? rawLabel : String(records.length + 1),
      category: typeof rawCategory === 'string' ? rawCategory : '',
    });
  }
  return records;
}

interface RenderSite {
  markId: string;
  label: string;
  siteX: number;
  siteY: number;
  polygon: Array<[number, number]>;
  neighbors: number[];
  /** The cell's resolved fill, stamped by the engine's colour scale. */
  color: string;
}

function readSites(data: Dataset): RenderSite[] {
  const sites: RenderSite[] = [];
  for (const observation of data) {
    sites.push({
      markId: readAuthoredString(observation, VORONOI_COLUMNS.markId),
      label: readAuthoredString(observation, VORONOI_COLUMNS.label),
      siteX: readAuthoredNumber(observation, VORONOI_COLUMNS.siteX),
      siteY: readAuthoredNumber(observation, VORONOI_COLUMNS.siteY),
      polygon: parseGeometry<Array<[number, number]>>(observation, VORONOI_COLUMNS.cell, []),
      neighbors: parseGeometry<number[]>(observation, VORONOI_COLUMNS.neighbors, []),
      color: getColor(observation) ?? FALLBACK_COLOR,
    });
  }
  return sites;
}

/**
 * The cursor query over the sites — the nearest site by squared distance is the cell under the cursor,
 * which arrives in the cells' own top-left `[0, 1]` frame, so the rule that defines a cell also
 * hit-tests it and never misses. The renderer memoizes this on `layer.data`, so the `JSON.parse` of
 * every cell polygon in the read above runs once per data change, not per cursor move.
 */
function buildVoronoiTester(sites: RenderSite[]): RenderHitTester {
  return (cursor) => {
    let nearestKey: string | null = null;
    let nearestDistance = Infinity;
    for (const site of sites) {
      const distance = (site.siteX - cursor.x) ** 2 + (site.siteY - cursor.y) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestKey = site.markId;
      }
    }
    return nearestKey === null ? null : { key: nearestKey };
  };
}

/** A closed polygon path in unit space. */
function cellPath(polygon: Array<[number, number]>): string {
  const [head, ...tail] = polygon;
  if (!head) return '';
  return `M ${head[0]} ${head[1]} ${tail.map(([x, y]) => `L ${x} ${y}`).join(' ')} Z`;
}

function parseGeometry<T>(observation: Observation, key: string, fallback: T): T {
  const raw = observation[key];
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface DelaunayEdge {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** The Delaunay triangulation (the Voronoi dual): one edge per adjacent pair, de-duplicated by index. */
function delaunayEdges(sites: RenderSite[]): DelaunayEdge[] {
  const edges: DelaunayEdge[] = [];
  sites.forEach((site, index) => {
    for (const neighbor of site.neighbors) {
      if (neighbor <= index) continue;
      const target = sites[neighbor];
      if (!target) continue;
      edges.push({ key: `${index}-${neighbor}`, x1: site.siteX, y1: site.siteY, x2: target.siteX, y2: target.siteY });
    }
  });
  return edges;
}

const VoronoiLayer = ({ layer }: { layer: CompiledLayer }) => {
  const params = layer.params as unknown as VoronoiParams;
  const sites = useMemo(() => readSites(layer.data), [layer.data]);

  // Memoized on the already-memoized `sites` so the dual edge list isn't re-derived on every render.
  const delaunayLines = useMemo(() => (params.showDelaunay ? delaunayEdges(sites) : []), [sites, params.showDelaunay]);

  return (
    <>
      <UnitSpaceSvg>
        {sites.map((site) => (
          <path
            key={site.markId}
            d={cellPath(site.polygon)}
            fill={site.color}
            fillOpacity={params.fillOpacity}
            stroke="#fff"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {delaunayLines.map((edge) => (
          <line
            key={edge.key}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke="#1f2937"
            strokeOpacity={0.18}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </UnitSpaceSvg>
      {sites.map((site) => (
        <circle key={`dot:${site.markId}`} cx={toPercent(site.siteX)} cy={toPercent(site.siteY)} r={3} fill="#1f2937" />
      ))}
      {params.showLabels &&
        sites.map((site) => (
          <text
            key={`label:${site.markId}`}
            x={toPercent(site.siteX)}
            y={toPercent(site.siteY)}
            dx={6}
            dy={-6}
            fontSize={11}
            fill="#333"
            pointerEvents="none"
          >
            {site.label}
          </text>
        ))}
    </>
  );
};

/** Repaints the hovered cell brighter with a bold border, above the dimmed base layer, in unit space. */
const VoronoiHighlight = ({ observation }: { observation: Observation }) => {
  const polygon = parseGeometry<Array<[number, number]>>(observation, VORONOI_COLUMNS.cell, []);
  const fill = getColor(observation) ?? FALLBACK_COLOR;
  return (
    <UnitSpaceSvg>
      <path
        d={cellPath(polygon)}
        fill={fill}
        fillOpacity={0.7}
        stroke="#1f2937"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </UnitSpaceSvg>
  );
};

export const kit = createGraphyKit({
  plugins: [
    defineGeomRenderer(new VoronoiGeom(), {
      coord: 'cartesian',
      render: ({ layer }) => <VoronoiLayer layer={layer} />,
      hitTest: ({ layer }) => buildVoronoiTester(readSites(layer.data)),
      renderHover: ({ primary }) => <VoronoiHighlight observation={primary.observation} />,
      renderHoverCompanions: () => null,
    }),
  ],
});
```

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react-renderer';
import { config, type Data } from '@graphysdk/viz-engine';
import { kit } from './voronoi';

// Coffee shops across a city grid: each cell is a shop's catchment area — the territory of points
// closer to it than to any rival.
const coffeeShops: Data = {
  columns: [{ key: 'x' }, { key: 'y' }, { key: 'label' }, { key: 'category' }],
  rows: [
    { x: 2, y: 8.5, label: 'Downtown', category: 'Bluebird' },
    { x: 8.4, y: 9, label: 'Harbor', category: 'Bluebird' },
    { x: 6.6, y: 1.4, label: 'South', category: 'Bluebird' },
    { x: 4.8, y: 5.6, label: 'Midtown', category: 'Roastery' },
    { x: 1.3, y: 3.8, label: 'West', category: 'Roastery' },
    { x: 9.2, y: 6.2, label: 'Heights', category: 'Roastery' },
    { x: 9.1, y: 2, label: 'Quay', category: 'Cup & Co' },
    { x: 3.7, y: 1.6, label: 'Park', category: 'Cup & Co' },
    { x: 5.2, y: 9.3, label: 'Garden', category: 'Cup & Co' },
  ],
};

// `color` maps to the real `category` column, so the engine's categorical scale colours each cell.
const catchmentsSpec = kit.pipe(
  kit.createSpec({}),
  kit.geom.voronoi({
    aes: { x: 'x', y: 'y', label: 'label', category: 'category', color: 'category' },
    params: { showLabels: true, showDelaunay: false },
  }),
  config({ legend: { position: 'none' } })
);

export const VoronoiGraph = () => (
  <kit.GraphProvider input={catchmentsSpec} data={coffeeShops}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Adapting

- The nearest-site shortcut only works because the painted region IS the nearest-site locus. For arbitrary computed shapes (ribbons, arcs), keep the same structure but replace the tester body with a containment or distance-to-path test over the parsed geometry — the cursor is always panel-local `[0, 1]`, top-left origin, the same frame the geom paints in.
- Serialise any non-scalar geometry into a categorical column via `JSON.stringify` in `compile()` and parse it back in the render half; the dataset stores scalars only.
- `UnitSpaceSvg` gives children the `[0, 1]` coordinate frame directly (use `vectorEffect="non-scaling-stroke"` so strokes stay pixel-constant); marks that must not distort with the panel's aspect ratio (dots, text) paint outside it via `toPercent`.
- Geom `params` (here `showDelaunay`/`showLabels`/`fillOpacity`) are the right home for render toggles: authors set them per layer in the spec, and the render half reads them from `layer.params`.
