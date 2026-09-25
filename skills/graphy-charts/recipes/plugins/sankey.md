# Sankey

Flows between nodes drawn as ribbons whose width is the flow's value. Nodes are coloured by the colour scale and each ribbon fades from its source node's colour to its target's. Use it for energy, budget, or funnel flows given as source, target, and value rows.

## Usage

```tsx
import { config, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './sankey-geom';

const energy: Data = {
  columns: [{ key: 'source' }, { key: 'target' }, { key: 'value' }],
  rows: [
    { source: 'Coal', target: 'Electricity', value: 24 },
    { source: 'Gas', target: 'Electricity', value: 18 },
    { source: 'Gas', target: 'Heating', value: 12 },
    { source: 'Solar', target: 'Electricity', value: 8 },
    { source: 'Electricity', target: 'Industry', value: 22 },
    { source: 'Electricity', target: 'Residential', value: 18 },
    { source: 'Electricity', target: 'Transport', value: 10 },
    { source: 'Heating', target: 'Residential', value: 12 },
  ],
};

// One colour family for every node and ribbon gradient.
const COOL_PALETTE = ['#3F8EEB', '#5AA9E6', '#6C6CE0', '#8A5CD8', '#A64BC4', '#C13C9E', '#D6478A', '#2E3A8C', '#1F2A6B'];

// `color` maps the geom's derived `node` identity, so the colour scale colours each node from the range.
// Drop `color` and nodes render neutral. Nodes carry their names, so the legend is hidden.
const spec = kit.pipe(
  kit.createSpec({}),
  kit.geom.sankey({ aes: { source: 'source', target: 'target', value: 'value', color: 'node' } }),
  kit.scale.color.discrete({ range: COOL_PALETTE }),
  config({ legend: { position: 'none' } })
);

export const SankeyGraph = () => (
  <kit.GraphProvider spec={spec} data={energy}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `sankey-layout.ts`.

```ts
import type { SankeyNode } from 'd3-sankey';
import { sankey as d3Sankey } from 'd3-sankey';

const NODE_WIDTH = 0.13;
const NODE_PAD = 0.02;

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface LaidOutNode {
  id: string;
  value: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface LaidOutFlow {
  id: string;
  source: string;
  target: string;
  value: number;
  sx: number;
  sy0: number;
  sy1: number;
  tx: number;
  ty0: number;
  ty1: number;
}

/** The extra node and link properties d3-sankey carries alongside the geometry it computes. */
type LayoutNode = { name: string };
type LayoutLink = { value: number };

/** d3-sankey swaps each link's string endpoints for the laid-out node objects during layout. */
const resolveEndpoint = (
  endpoint: number | string | SankeyNode<LayoutNode, LayoutLink>
): SankeyNode<LayoutNode, LayoutLink> => endpoint as SankeyNode<LayoutNode, LayoutLink>;

/**
 * Lays the sankey out in unit [0, 1] space (top-left origin) with d3-sankey. The [0, 1] extent makes d3
 * emit coordinates directly in the frame the geom paints and hit-tests in. Only scalars are read out of
 * d3's mutated, circular node and link objects, so the scene stays serialisable.
 */
export function computeSankeyLayout(links: readonly SankeyLink[]): { nodes: LaidOutNode[]; flows: LaidOutFlow[] } {
  const nodeNames = [...new Set(links.flatMap((link) => [link.source, link.target]))];

  const layout = d3Sankey<LayoutNode, LayoutLink>()
    .nodeId((node) => node.name)
    .nodeWidth(NODE_WIDTH)
    .nodePadding(NODE_PAD)
    .extent([
      [0, 0],
      [1, 1],
    ]);

  const graph = layout({
    nodes: nodeNames.map((name) => ({ name })),
    links: links.map((link) => ({ ...link })),
  });

  const nodes: LaidOutNode[] = graph.nodes.map((node) => ({
    id: node.name,
    value: node.value ?? 0,
    x0: node.x0 ?? 0,
    y0: node.y0 ?? 0,
    x1: node.x1 ?? 0,
    y1: node.y1 ?? 0,
  }));

  // Each laid-out link already points at its endpoint nodes, so geometry is read straight off them.
  const flows: LaidOutFlow[] = graph.links.map((link, index) => {
    const source = resolveEndpoint(link.source);
    const target = resolveEndpoint(link.target);
    const half = (link.width ?? 0) / 2;
    const sourceY = link.y0 ?? 0;
    const targetY = link.y1 ?? 0;
    return {
      id: `flow:${source.name}->${target.name}#${index}`,
      source: source.name,
      target: target.name,
      value: link.value,
      sx: source.x1 ?? 0,
      sy0: sourceY - half,
      sy1: sourceY + half,
      tx: target.x0 ?? 0,
      ty0: targetY - half,
      ty1: targetY + half,
    };
  });

  return { nodes, flows };
}
```

Save as `sankey-geom.tsx`.

```tsx
import { useCallback, useMemo } from 'react';

import {
  createGraphyKit,
  defineGeomRenderer,
  Geom,
  getColor,
  type RenderHitTester,
  toPercent,
  UnitBoxSvg,
  UnitSpaceSvg,
  useSceneSelector,
} from '@graphysdk/react';
import type { Dataset, GeomCompileResult, GeomCompilerInput, Observation, SceneLayer } from '@graphysdk/react';
import {
  createDatasetFromKindPartitions,
  type IdentityKey,
  readAuthoredNumber,
  readAuthoredString,
  readVariableName,
} from '@graphysdk/viz-engine';

import { computeSankeyLayout } from './sankey-layout';

/** The column vocabulary shared by the compile half and the render half. */
const SANKEY_COLUMNS = {
  kind: 'kind',
  markId: 'markId',
  label: 'label',
  value: 'value',
  // The geom's derived node identity (a node's own id, a flow's source id): the field an author maps
  // `color` to and the colour scale keys on.
  node: 'node',
  // A flow's target node id, its gradient end, read off the same colour scale render-side.
  targetKey: 'targetKey',
  // Node rect (unit space, top-left origin).
  x0: 'x0',
  y0: 'y0',
  x1: 'x1',
  y1: 'y1',
  // Flow ribbon endpoints (unit space): source right edge to target left edge.
  sx: 'sx',
  sy0: 'sy0',
  sy1: 'sy1',
  tx: 'tx',
  ty0: 'ty0',
  ty1: 'ty1',
} as const;

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

class SankeyGeom extends Geom<Record<string, never>> {
  readonly type = 'sankey';
  override readonly defaultParams = {};
  override readonly identityKey: IdentityKey = { variable: SANKEY_COLUMNS.markId };
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly highlightStrategy = null;
  // `source`, `target`, and `value` are relational inputs the layout consumes, read straight from the
  // mapped columns, not scaled. `color` is author-mapped and usually targets the derived `node`.
  override readonly aesthetics = [
    { kind: 'data', name: 'source', required: true },
    { kind: 'data', name: 'target', required: true },
    { kind: 'data', name: 'value', required: true },
    { kind: 'visual', name: 'color' },
  ] as const;
  override readonly derivedVariables = ['node'] as const;
  override readonly tooltip = [
    { key: 'Name', aes: 'label' },
    { key: 'Value', aes: 'value' },
  ] as const;

  override readonly spatialKind = 'render-hit-test';

  compile({ data, mapping }: GeomCompilerInput): GeomCompileResult {
    const sourceVar = readVariableName(mapping.source);
    const targetVar = readVariableName(mapping.target);
    const valueVar = readVariableName(mapping.value);
    const sources = sourceVar ? data.getValues(sourceVar) : [];
    const targets = targetVar ? data.getValues(targetVar) : [];
    const values = valueVar ? data.getValues(valueVar) : [];

    const links: SankeyLink[] = [];
    for (let row = 0; row < sources.length; row += 1) {
      const source = sources[row];
      const target = targets[row];
      const value = values[row];
      if (typeof source === 'string' && typeof target === 'string' && typeof value === 'number') {
        links.push({ source, target, value });
      }
    }

    const { nodes, flows } = computeSankeyLayout(links);

    const table = createDatasetFromKindPartitions(
      [
        {
          kind: 'node',
          observations: nodes.map((node) => ({
            [SANKEY_COLUMNS.markId]: `node:${node.id}`,
            [SANKEY_COLUMNS.label]: node.id,
            [SANKEY_COLUMNS.value]: node.value,
            [SANKEY_COLUMNS.node]: node.id,
            [SANKEY_COLUMNS.x0]: node.x0,
            [SANKEY_COLUMNS.y0]: node.y0,
            [SANKEY_COLUMNS.x1]: node.x1,
            [SANKEY_COLUMNS.y1]: node.y1,
          })),
        },
        {
          kind: 'flow',
          observations: flows.map((flow) => ({
            [SANKEY_COLUMNS.markId]: flow.id,
            [SANKEY_COLUMNS.label]: `${flow.source} to ${flow.target}`,
            [SANKEY_COLUMNS.value]: flow.value,
            [SANKEY_COLUMNS.node]: flow.source,
            [SANKEY_COLUMNS.targetKey]: flow.target,
            [SANKEY_COLUMNS.sx]: flow.sx,
            [SANKEY_COLUMNS.sy0]: flow.sy0,
            [SANKEY_COLUMNS.sy1]: flow.sy1,
            [SANKEY_COLUMNS.tx]: flow.tx,
            [SANKEY_COLUMNS.ty0]: flow.ty0,
            [SANKEY_COLUMNS.ty1]: flow.ty1,
          })),
        },
      ],
      SANKEY_COLUMNS.kind
    );

    // Geometry stays in the geom's own columns, unscaled. The tooltip reads `label` and `value`. Colour is
    // not forced: the author maps `color` to the derived `node` field and the categorical scale resolves it.
    return {
      data: table,
      mapping: {
        label: { variable: SANKEY_COLUMNS.label },
        value: { variable: SANKEY_COLUMNS.value },
      },
    };
  }
}

interface RenderNode {
  markId: string;
  label: string;
  value: number;
  /** The node's resolved fill, from the engine's colour scale. */
  color: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface RenderFlow {
  markId: string;
  value: number;
  /** The flow's source-end fill (its own resolved colour); the target end is read off the colour scale. */
  sourceColor: string;
  /** The target node's identity, mapped to its colour through the compiled scale at paint time. */
  targetKey: string;
  sx: number;
  sy0: number;
  sy1: number;
  tx: number;
  ty0: number;
  ty1: number;
}

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/**
 * The ribbon's top and bottom edge at a given easing factor. The hit-test, the painted path, and the
 * value label all derive their geometry from this one function, so paint and hit-test stay identical.
 */
function ribbonEdges(flow: RenderFlow, ease: number): { yTop: number; yBottom: number } {
  return {
    yTop: flow.sy0 + (flow.ty0 - flow.sy0) * ease,
    yBottom: flow.sy1 + (flow.ty1 - flow.sy1) * ease,
  };
}

/** Reads the compiled dataset back into node rects and flow ribbons, dispatching on `kind`. */
function readSankey(data: Dataset): { nodes: RenderNode[]; flows: RenderFlow[] } {
  const nodes: RenderNode[] = [];
  const flows: RenderFlow[] = [];

  for (const observation of data) {
    switch (readAuthoredString(observation, SANKEY_COLUMNS.kind)) {
      case 'node':
        nodes.push({
          markId: readAuthoredString(observation, SANKEY_COLUMNS.markId),
          label: readAuthoredString(observation, SANKEY_COLUMNS.label),
          value: readAuthoredNumber(observation, SANKEY_COLUMNS.value),
          color: getColor(observation) ?? FALLBACK_COLOR,
          x0: readAuthoredNumber(observation, SANKEY_COLUMNS.x0),
          y0: readAuthoredNumber(observation, SANKEY_COLUMNS.y0),
          x1: readAuthoredNumber(observation, SANKEY_COLUMNS.x1),
          y1: readAuthoredNumber(observation, SANKEY_COLUMNS.y1),
        });
        break;
      case 'flow':
        flows.push({
          markId: readAuthoredString(observation, SANKEY_COLUMNS.markId),
          value: readAuthoredNumber(observation, SANKEY_COLUMNS.value),
          sourceColor: getColor(observation) ?? FALLBACK_COLOR,
          targetKey: readAuthoredString(observation, SANKEY_COLUMNS.targetKey),
          sx: readAuthoredNumber(observation, SANKEY_COLUMNS.sx),
          sy0: readAuthoredNumber(observation, SANKEY_COLUMNS.sy0),
          sy1: readAuthoredNumber(observation, SANKEY_COLUMNS.sy1),
          tx: readAuthoredNumber(observation, SANKEY_COLUMNS.tx),
          ty0: readAuthoredNumber(observation, SANKEY_COLUMNS.ty0),
          ty1: readAuthoredNumber(observation, SANKEY_COLUMNS.ty1),
        });
        break;
    }
  }
  return { nodes, flows };
}

/**
 * The cursor query: a node rect containment first, then a flow ribbon containment sampled with the same
 * smoothstep the ribbon is painted with. The renderer memoizes this on `layer.data`.
 */
function buildSankeyTester({ nodes, flows }: { nodes: RenderNode[]; flows: RenderFlow[] }): RenderHitTester {
  return (cursor) => {
    for (const node of nodes) {
      if (cursor.x >= node.x0 && cursor.x <= node.x1 && cursor.y >= node.y0 && cursor.y <= node.y1) {
        return { key: node.markId };
      }
    }
    for (const flow of flows) {
      // Bound by min/max so a backward or vertical ribbon stays hittable.
      if (cursor.x < Math.min(flow.sx, flow.tx) || cursor.x > Math.max(flow.sx, flow.tx)) continue;
      const span = flow.tx - flow.sx;
      const t = span === 0 ? 0 : (cursor.x - flow.sx) / span;
      const { yTop, yBottom } = ribbonEdges(flow, smoothstep(t));
      if (cursor.y >= yTop && cursor.y <= yBottom) return { key: flow.markId };
    }
    return null;
  };
}

const RIBBON_SAMPLES = 18;

/** Builds a filled ribbon path by sampling the same smoothstep the hit-test uses. */
function buildRibbonPath(flow: RenderFlow): string {
  const top: string[] = [];
  const bottom: string[] = [];
  for (let step = 0; step <= RIBBON_SAMPLES; step += 1) {
    const t = step / RIBBON_SAMPLES;
    const x = flow.sx + (flow.tx - flow.sx) * t;
    const { yTop, yBottom } = ribbonEdges(flow, smoothstep(t));
    top.push(`${x},${yTop}`);
    bottom.push(`${x},${yBottom}`);
  }
  bottom.reverse();
  return `M${top.join('L')}L${bottom.join('L')}Z`;
}

const LABEL_DARK = '#1f2933';
const LABEL_LIGHT = '#ffffff';
/** Fill used only if the colour scale is absent. */
const FALLBACK_COLOR = '#888888';
/** Left padding (px) of the in-node label from the block's left edge. */
const NODE_LABEL_PAD = 10;
/** Minimum source-band height (unit fraction) a flow needs before its value label is drawn. */
const FLOW_LABEL_MIN_BAND = 0.028;
/** Fraction along the ribbon to sit the value label, past the source node's own label. */
const FLOW_LABEL_T = 0.18;

/** Picks dark or white label text for legibility on a node's fill, by relative luminance. */
function readableTextColor(fill: string): string {
  const hex = fill.replace('#', '');
  if (hex.length !== 6) return LABEL_DARK;
  const toLinear = (channel: number): number => {
    const ratio = channel / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  };
  const red = toLinear(Number.parseInt(hex.slice(0, 2), 16));
  const green = toLinear(Number.parseInt(hex.slice(2, 4), 16));
  const blue = toLinear(Number.parseInt(hex.slice(4, 6), 16));
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance >= 0.3 ? LABEL_DARK : LABEL_LIGHT;
}

/** Node name plus total, drawn inside the block at the top-left with a contrast-aware fill. */
const NodeLabel = ({ node, fill }: { node: RenderNode; fill: string }) => (
  <text textAnchor="start" fontSize={12} fill={readableTextColor(fill)}>
    <tspan x={NODE_LABEL_PAD} dy={18}>
      {node.label}
    </tspan>
    <tspan x={NODE_LABEL_PAD} dy="1.35em" fontWeight={700}>
      {node.value.toLocaleString()}
    </tspan>
  </text>
);

/** Flow value, centred on the ribbon a fraction in from the source; hidden when the ribbon is thin. */
const FlowLabel = ({ flow }: { flow: RenderFlow }) => {
  if (flow.sy1 - flow.sy0 < FLOW_LABEL_MIN_BAND) return null;
  const x = flow.sx + (flow.tx - flow.sx) * FLOW_LABEL_T;
  const { yTop, yBottom } = ribbonEdges(flow, smoothstep(FLOW_LABEL_T));
  return (
    <text
      x={toPercent(x)}
      y={toPercent((yTop + yBottom) / 2)}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={11}
      fill={LABEL_DARK}
      pointerEvents="none"
    >
      {flow.value.toLocaleString()}
    </text>
  );
};

/**
 * A node block plus its in-block label, both placed in the node's own viewport so the label never spills
 * into the flows or a neighbour and stays undistorted. Used for both base and hover paint.
 */
const SankeyNode = ({ node, fill }: { node: RenderNode; fill: string }) => (
  <UnitBoxSvg box={node}>
    <rect width="100%" height="100%" fill={fill} />
    <NodeLabel node={node} fill={fill} />
  </UnitBoxSvg>
);

/**
 * A flow ribbon (path, unit space) plus its value label (pixel space). The ribbon fades from its source
 * node's colour to its target node's colour. Used for both base and hover paint.
 */
const SankeyFlow = ({
  flow,
  sourceFill,
  targetFill,
  isHighlighted = false,
}: {
  flow: RenderFlow;
  sourceFill: string;
  targetFill: string;
  isHighlighted?: boolean;
}) => {
  const gradientId = `sankey-flow-grad:${flow.markId}${isHighlighted ? ':hover' : ''}`;
  return (
    <>
      <UnitSpaceSvg>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={sourceFill} />
            <stop offset="100%" stopColor={targetFill} />
          </linearGradient>
        </defs>
        <path d={buildRibbonPath(flow)} fill={`url(#${gradientId})`} fillOpacity={0.9} stroke="none" />
      </UnitSpaceSvg>
      <FlowLabel flow={flow} />
    </>
  );
};

/** Reads a node identity's colour off the compiled categorical colour scale (a flow's target end). */
function useColorFor(): (key: string) => string {
  const colorScale = useSceneSelector((scene) => scene.scales.color);
  return useCallback((key: string) => (colorScale ? String(colorScale.map(key)) : FALLBACK_COLOR), [colorScale]);
}

const SankeyLayer = ({ layer }: { layer: SceneLayer }) => {
  const { nodes, flows } = useMemo(() => readSankey(layer.data), [layer.data]);
  const colorFor = useColorFor();

  return (
    <>
      {flows.map((flow) => (
        <SankeyFlow key={flow.markId} flow={flow} sourceFill={flow.sourceColor} targetFill={colorFor(flow.targetKey)} />
      ))}
      {nodes.map((node) => (
        <SankeyNode key={node.markId} node={node} fill={node.color} />
      ))}
    </>
  );
};

const SankeyHighlight = ({ layer, observation }: { layer: SceneLayer; observation: Observation }) => {
  const { nodes, flows } = useMemo(() => readSankey(layer.data), [layer.data]);
  const colorFor = useColorFor();
  const markId = readAuthoredString(observation, SANKEY_COLUMNS.markId);

  const node = nodes.find((candidate) => candidate.markId === markId);
  if (node) {
    return <SankeyNode node={node} fill={node.color} />;
  }

  const flow = flows.find((candidate) => candidate.markId === markId);
  if (flow) {
    return <SankeyFlow flow={flow} sourceFill={flow.sourceColor} targetFill={colorFor(flow.targetKey)} isHighlighted />;
  }
  return null;
};

export const kit = createGraphyKit({
  plugins: [
    defineGeomRenderer(new SankeyGeom(), {
      coord: 'cartesian',
      render: ({ layer }) => <SankeyLayer layer={layer} />,
      hitTest: ({ layer }) => buildSankeyTester(readSankey(layer.data)),
      renderHover: ({ layer, primary }) => <SankeyHighlight layer={layer} observation={primary.observation} />,
      renderHoverCompanions: () => null,
    }),
  ],
});
```

## Notes

- Install `d3-sankey` (`npm install d3-sankey`, plus `@types/d3-sankey` for TypeScript).
- From `@graphysdk/viz-engine`: `createDatasetFromKindPartitions`, `readAuthoredNumber`, `readAuthoredString`, `readVariableName`, and the `IdentityKey` type. Everything else comes from `@graphysdk/react`.
- The geom declares `source`, `target`, and `value` as required data aesthetics and derives a `node` variable. Map `color` to `node` to colour by node; `kit.scale.color.discrete({ range })` sets the palette.
- The layout is computed once in the compile half, so the geometry is part of the compiled scene and hover uses the `hitTest` factory. No positional scales are involved, so no `scale.x` or `scale.y` is needed.
