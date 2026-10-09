# Voronoi

Each observation is a seed point. Its cell is the territory closer to it than to any other seed. Use it for nearest-facility maps or to make the hover regions of a scatter visible. An optional Delaunay overlay draws one edge per pair of adjacent cells.

## Usage

```tsx
import { config, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './voronoi-geom';

// Coffee shops on a city grid, colored by brand. Each cell is a shop's catchment area.
const coffeeShops: Data = {
  columns: [{ key: 'x' }, { key: 'y' }, { key: 'label' }, { key: 'brand' }],
  rows: [
    { x: 2, y: 8.5, label: 'Downtown', brand: 'Bluebird' },
    { x: 8.4, y: 9, label: 'Harbor', brand: 'Bluebird' },
    { x: 6.6, y: 1.4, label: 'South', brand: 'Bluebird' },
    { x: 4.8, y: 5.6, label: 'Midtown', brand: 'Roastery' },
    { x: 1.3, y: 3.8, label: 'West', brand: 'Roastery' },
    { x: 9.2, y: 6.2, label: 'Heights', brand: 'Roastery' },
    { x: 9.1, y: 2, label: 'Quay', brand: 'Cup & Co' },
    { x: 3.7, y: 1.6, label: 'Park', brand: 'Cup & Co' },
    { x: 5.2, y: 9.3, label: 'Garden', brand: 'Cup & Co' },
  ],
};

// `color` maps the brand column, so the color scale colors each cell.
const aes = { x: 'x', y: 'y', label: 'label', category: 'brand', color: 'brand' };

const catchmentsSpec = kit.pipe(
  kit.createSpec({}),
  kit.geom.voronoi({ aes, params: { showLabels: true, showDelaunay: false } }),
  config({ legend: { position: 'none' } })
);

const clustersSpec = kit.pipe(
  kit.createSpec({}),
  kit.geom.voronoi({ aes, params: { showLabels: false, showDelaunay: true } }),
  config({ legend: { position: 'none' } })
);

export const VoronoiGraph = ({ showDelaunay = false }: { showDelaunay?: boolean }) => (
  <kit.GraphProvider spec={showDelaunay ? clustersSpec : catchmentsSpec} data={coffeeShops}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `voronoi-layout.ts`.

```ts
/**
 * The Voronoi layout runs in the compile half, in [0, 1] unit space with a top-left origin, so the cells
 * ride in the scene as plain data. d3-delaunay computes the tessellation, clipped to the unit box.
 * `voronoi.neighbors(i)` gives the Delaunay adjacency.
 */
import { Delaunay } from 'd3-delaunay';

export interface VoronoiPoint {
  x: number;
  y: number;
}

export interface VoronoiCell {
  /** Seed position in the padded [0, 1] box, top-left origin. */
  siteX: number;
  siteY: number;
  /** The cell outline in unit space, without the closing duplicate vertex. */
  polygon: Array<[number, number]>;
  /** Indices of the sites whose cells share an edge with this one. */
  neighbors: number[];
}

type Vertex = [number, number];

const EPSILON = 1e-12;

export function computeVoronoiLayout(points: VoronoiPoint[], options: { padding: number }): VoronoiCell[] {
  const sites = normalizeSites(points, options.padding);
  const voronoi = Delaunay.from(sites).voronoi([0, 0, 1, 1]);

  return sites.map((site, index) => {
    // d3 types cellPolygon as non-null, but it returns null for a site that coincides with another.
    const outline = voronoi.cellPolygon(index) as Delaunay.Polygon | null;
    return {
      siteX: site[0],
      siteY: site[1],
      polygon: outline ? outline.slice(0, -1) : [],
      neighbors: [...voronoi.neighbors(index)],
    };
  });
}

/**
 * Min-max normalizes the points into a [padding, 1 - padding] box so the cells fill the panel. Larger y
 * is higher on screen, as on the other geoms, so y is flipped into the top-left frame.
 */
function normalizeSites(points: VoronoiPoint[], padding: number): Vertex[] {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const span = 1 - 2 * padding;
  const project = (value: number, min: number, max: number): number =>
    max - min < EPSILON ? 0.5 : padding + ((value - min) / (max - min)) * span;

  const [minX, maxX] = extent(xs);
  const [minY, maxY] = extent(ys);

  return points.map((point) => [project(point.x, minX, maxX), 1 - project(point.y, minY, maxY)]);
}

/** Min and max in one pass. A spread into `Math.min` would overflow the argument limit for a large cloud. */
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

Save as `voronoi-geom.tsx`.

```tsx
import { useMemo } from 'react';

import {
  createGraphyKit,
  Dataset,
  defineGeomRenderer,
  Geom,
  readVariableName,
  toPaintColor,
  toPercent,
  UnitSpaceSvg,
} from '@graphysdk/react';
import type {
  DataValue,
  GeomCompileResult,
  GeomCompilerInput,
  GeomHoverRendererInput,
  GeomRendererInput,
  Observation,
  RenderHitTester,
} from '@graphysdk/react';

import { computeVoronoiLayout, type VoronoiPoint } from './voronoi-layout';

/** The columns the compile half writes and the render half reads. */
const VORONOI_COLUMNS = {
  markId: 'markId',
  siteX: 'siteX',
  siteY: 'siteY',
  /** The outline and the neighbor indices ride as JSON strings; a dataset column holds scalars only. */
  cell: 'cell',
  neighbors: 'neighbors',
  label: 'label',
  category: 'category',
} as const;

/** Fill when no color is mapped and no stylesheet entry answers. */
const FALLBACK_COLOR = '#888888';

interface VoronoiParams {
  /** Inset of the seed points from the panel edge, as a fraction of the panel. */
  padding: number;
  /** Whether to draw the Delaunay triangulation, one edge per pair of adjacent cells. */
  showDelaunay: boolean;
  /** Whether to draw each label next to its seed. Off for dense clouds. */
  showLabels: boolean;
  /** Cell fill opacity. Cell borders and seed dots paint at full strength. */
  fillOpacity: number;
}

interface VoronoiRecord {
  /** The input row this record came from. */
  row: number;
  x: number;
  y: number;
  label: string;
  category: string;
}

class VoronoiGeom extends Geom<VoronoiParams> {
  readonly type = 'voronoi' as const;

  override readonly defaultParams: VoronoiParams = {
    padding: 0.04,
    showDelaunay: true,
    showLabels: false,
    fillOpacity: 0.35,
  };

  // The hit-test returns a cell's `markId`, so the identity is that column. The default `'x-group'`
  // would leave the hover lookup empty.
  override readonly identityKey = { variable: VORONOI_COLUMNS.markId } as const;

  override readonly supportedCoordTypes = ['cartesian'] as const;

  override readonly highlightStrategy = null;

  // `x`, `y`, `label` and `category` are read straight from their columns, not scaled. `color` goes
  // through the color scale. One site is one input row, so map `color` to an input column.
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

  // The cells are computed here, not from position scales, so the render half answers the hover query.
  override readonly spatialKind = 'render-hit-test';

  compile({ data, params, mapping }: GeomCompilerInput): GeomCompileResult {
    const resolved = { ...this.defaultParams, ...(params as Partial<VoronoiParams>) };
    const records = readRecords(data, mapping);
    const cells = computeVoronoiLayout(
      records.map((record): VoronoiPoint => ({ x: record.x, y: record.y })),
      { padding: resolved.padding }
    );

    // The output table replaces the input, so a mapped color column must be carried through under its own
    // name and type. The scale stage skips a variable the layer data lacks, and every cell would fall back.
    const colorVar = readVariableName(mapping.color);
    const colorSource = colorVar && data.hasVariable(colorVar) ? data.getValues(colorVar) : null;

    const markId: string[] = [];
    const siteX: number[] = [];
    const siteY: number[] = [];
    const cell: string[] = [];
    const neighbors: string[] = [];
    const label: string[] = [];
    const category: string[] = [];
    const color: DataValue[] = [];

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
      color.push(colorSource?.[record.row] ?? null);
    });

    const table = new Dataset({
      [VORONOI_COLUMNS.markId]: { type: 'categorical', values: markId },
      [VORONOI_COLUMNS.siteX]: { type: 'numeric', values: siteX },
      [VORONOI_COLUMNS.siteY]: { type: 'numeric', values: siteY },
      [VORONOI_COLUMNS.cell]: { type: 'categorical', values: cell },
      [VORONOI_COLUMNS.neighbors]: { type: 'categorical', values: neighbors },
      [VORONOI_COLUMNS.label]: { type: 'categorical', values: label },
      [VORONOI_COLUMNS.category]: { type: 'categorical', values: category },
      ...(colorVar && colorSource ? { [colorVar]: { type: data.getType(colorVar), values: color } } : {}),
    });

    // The tooltip aesthetics are pointed at the output columns. `color` keeps its author mapping.
    return {
      data: table,
      mapping: { label: { variable: VORONOI_COLUMNS.label }, category: { variable: VORONOI_COLUMNS.category } },
    };
  }
}

/**
 * Zips the coordinate, label and category columns into records. Rows with a missing coordinate are dropped.
 * A label falls back to a 1-based index, a category to the empty string.
 */
function readRecords(data: Dataset, mapping: GeomCompilerInput['mapping']): VoronoiRecord[] {
  const xVar = readVariableName(mapping.x);
  const yVar = readVariableName(mapping.y);
  const labelVar = readVariableName(mapping.label);
  const categoryVar = readVariableName(mapping.category);
  // Read untyped and filter by `typeof`, so a mapping pointed at a wrong-typed column gives an empty
  // graph instead of throwing.
  const xs = xVar && data.hasVariable(xVar) ? data.getValues(xVar) : [];
  const ys = yVar && data.hasVariable(yVar) ? data.getValues(yVar) : [];
  const labels = labelVar && data.hasVariable(labelVar) ? data.getValues(labelVar) : null;
  const categories = categoryVar && data.hasVariable(categoryVar) ? data.getValues(categoryVar) : null;

  const records: VoronoiRecord[] = [];
  for (let row = 0; row < xs.length; row += 1) {
    const x = xs[row];
    const y = ys[row];
    if (typeof x !== 'number' || typeof y !== 'number') continue;

    const rawCategory = categories?.[row];
    const rawLabel = labels?.[row];
    records.push({
      row,
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
  /** The row itself, so the paint can read its fill from the style cascade. */
  observation: Observation;
}

function readSites(data: Dataset): RenderSite[] {
  const sites: RenderSite[] = [];
  for (const observation of data) {
    sites.push({
      markId: readString(observation, VORONOI_COLUMNS.markId),
      label: readString(observation, VORONOI_COLUMNS.label),
      siteX: readNumber(observation, VORONOI_COLUMNS.siteX),
      siteY: readNumber(observation, VORONOI_COLUMNS.siteY),
      polygon: parseGeometry<Array<[number, number]>>(observation, VORONOI_COLUMNS.cell, []),
      neighbors: parseGeometry<number[]>(observation, VORONOI_COLUMNS.neighbors, []),
      observation,
    });
  }
  return sites;
}

function readString(observation: Observation, key: string): string {
  const raw = observation[key];
  return typeof raw === 'string' ? raw : '';
}

function readNumber(observation: Observation, key: string): number {
  const raw = observation[key];
  return typeof raw === 'number' ? raw : 0;
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

/**
 * The cursor query. The nearest site is the cell under the cursor, which is the rule that defines a cell.
 * The cursor arrives in the same top-left [0, 1] frame the sites are stored in.
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

interface DelaunayEdge {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** One edge per pair of adjacent cells, each pair once. */
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

type VoronoiLayerProps = Pick<GeomRendererInput, 'layer' | 'styleReaders'>;

const VoronoiLayer = ({ layer, styleReaders }: VoronoiLayerProps) => {
  const params = layer.params as unknown as VoronoiParams;
  const sites = useMemo(() => readSites(layer.data), [layer.data]);
  const delaunayLines = useMemo(() => (params.showDelaunay ? delaunayEdges(sites) : []), [sites, params.showDelaunay]);

  return (
    <>
      <UnitSpaceSvg>
        {sites.map((site) => (
          <path
            key={site.markId}
            d={cellPath(site.polygon)}
            fill={toPaintColor(styleReaders.get('fill', site.observation) ?? FALLBACK_COLOR)}
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
      {/* Circles and text stretch inside UnitSpaceSvg, so they sit in the panel SVG with percent positions. */}
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

type VoronoiHoverProps = Pick<GeomHoverRendererInput, 'primary' | 'styleReaders'>;

/** The hovered cell repainted stronger with a bold border, above the dimmed base layer. */
const VoronoiHover = ({ primary, styleReaders }: VoronoiHoverProps) => {
  const polygon = parseGeometry<Array<[number, number]>>(primary.observation, VORONOI_COLUMNS.cell, []);
  return (
    <UnitSpaceSvg>
      <path
        d={cellPath(polygon)}
        fill={toPaintColor(styleReaders.get('fill', primary.observation, 'hovered') ?? FALLBACK_COLOR)}
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
      render: ({ layer, styleReaders }) => <VoronoiLayer layer={layer} styleReaders={styleReaders} />,
      // Runs once per data change or panel resize, so the JSON parse of every cell runs once, not per cursor move.
      hitTest: ({ layer }) => buildVoronoiTester(readSites(layer.data)),
      renderHover: ({ primary, styleReaders }) => <VoronoiHover primary={primary} styleReaders={styleReaders} />,
      renderHoverCompanions: () => null,
    }),
  ],
});
```

## Notes

- Install `d3-delaunay` (`npm install d3-delaunay`, plus `@types/d3-delaunay` for TypeScript). Everything else imports from `@graphysdk/react`.
- The geom declares `x` and `y` as required data aesthetics, not scaled positions, plus optional `label` and `category`. Points are min-max normalized into the panel, so no `scale.x` or `scale.y` is needed and no axes are drawn.
- `compile` replaces the layer data with its own table. A mapped `color` column is copied into that table under its own name, because the color scale reads the layer data after `compile` and skips a column it cannot find.
- Larger y is higher on screen. The layout flips y into the top-left frame that `UnitSpaceSvg` and the hit-test cursor use.
- Params: `padding` (0.04), `showDelaunay` (true), `showLabels` (false), `fillOpacity` (0.35).
- Paint reads `styleReaders.get('fill', observation)`, so `style.geom({ fill })` overrides apply. On hover the base layer dims through the stylesheet's `dimmed` state and the hovered cell is drawn above it.
