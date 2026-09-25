# Force-directed

A node and edge network laid out by a live d3-force simulation. Nodes can be dragged, hovering a node or edge fades everything outside its neighbourhood, and the central tooltip follows the hovered mark. Use it for dependency graphs, collaboration networks, or any relational data with a source, a target, and a weight per row.

## Usage

```tsx
import { config, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './force-directed-geom';

const services: Data = {
  columns: [{ key: 'source' }, { key: 'target' }, { key: 'value' }],
  rows: [
    { source: 'Gateway', target: 'Auth', value: 120 },
    { source: 'Gateway', target: 'Catalog', value: 200 },
    { source: 'Gateway', target: 'Cart', value: 90 },
    { source: 'Gateway', target: 'Orders', value: 85 },
    { source: 'Auth', target: 'Sessions', value: 100 },
    { source: 'Catalog', target: 'Search', value: 150 },
    { source: 'Catalog', target: 'Inventory', value: 110 },
    { source: 'Search', target: 'Inventory', value: 80 },
    { source: 'Cart', target: 'Inventory', value: 70 },
    { source: 'Cart', target: 'Payments', value: 60 },
    { source: 'Orders', target: 'Payments', value: 65 },
    { source: 'Orders', target: 'Inventory', value: 50 },
    { source: 'Payments', target: 'Ledger', value: 55 },
    { source: 'Payments', target: 'Notifications', value: 40 },
    { source: 'Notifications', target: 'Sessions', value: 30 },
  ],
};

// `color` maps the geom's derived `node` identity, so the colour scale colours each node and its outgoing
// edges. Every node is labelled in place, so the legend is hidden.
const spec = kit.pipe(
  kit.createSpec({}),
  kit.geom.forceDirected({ aes: { source: 'source', target: 'target', value: 'value', color: 'node' } }),
  config({ legend: { position: 'none' } })
);

export const ForceDirectedGraph = () => (
  <kit.GraphProvider spec={spec} data={services}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `force-layout.ts`.

```ts
/**
 * A force-directed layout run render-side as a live simulation. It settles frame by frame and accepts
 * node drags, so it has no resolution-independent form to precompute in the compile half. The physics is
 * d3-force (charge, link springs, centring). This wrapper owns the panel-pixel concerns d3 leaves to the
 * caller: seeding around the panel centre, clamping nodes to the panel rect, pinning a dragged node, and
 * rescaling on resize. `tick()` is driven from the plugin's `requestAnimationFrame` loop.
 */
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3-force';

/** Alpha below which the system is at rest and the animation clock can stop. */
export const ALPHA_MIN = 0.005;

/** One edge as a pair of node indices into the node list. */
export interface SimEdge {
  sourceIndex: number;
  targetIndex: number;
}

export interface ForceLayoutOptions {
  width: number;
  height: number;
  /** Repulsion magnitude applied between every node pair; larger spreads the graph wider. */
  chargeStrength: number;
  /** Spring rest length between linked nodes, in pixels. */
  linkDistance: number;
  /** Distance from the panel edge nodes are clamped to, in pixels. */
  margin: number;
}

/** d3 mutates these in place: `x` and `y` are the live position, `fx` and `fy` pin a dragged node. */
interface SimNode extends SimulationNodeDatum {
  x: number;
  y: number;
}

/** d3's link record after binding: `source` and `target` start as indices and become node references. */
interface ForceLink {
  source: number | SimNode;
  target: number | SimNode;
}

const LINK_STRENGTH = 0.5;
const REHEAT_ALPHA = 0.5;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * A d3-force simulation steered manually. Owns its node array; callers read `positions` each frame and
 * steer drags through `startDrag`, `drag`, and `endDrag`.
 */
export class ForceSimulation {
  private readonly simulation: Simulation<SimNode, ForceLink>;
  private readonly simNodes: SimNode[];
  private options: ForceLayoutOptions;

  constructor(nodeCount: number, edges: SimEdge[], options: ForceLayoutOptions) {
    this.options = options;
    this.simNodes = seedNodes(nodeCount, options.width, options.height);
    const links: ForceLink[] = edges.map((edge) => ({ source: edge.sourceIndex, target: edge.targetIndex }));
    this.simulation = forceSimulation<SimNode, ForceLink>(this.simNodes)
      .force('charge', forceManyBody().strength(-options.chargeStrength))
      .force('link', forceLink<SimNode, ForceLink>(links).distance(options.linkDistance).strength(LINK_STRENGTH))
      .force('center', forceCenter(options.width / 2, options.height / 2))
      .alphaMin(ALPHA_MIN)
      .stop();
  }

  get alpha(): number {
    return this.simulation.alpha();
  }

  /** Live node positions in panel pixels, read each frame by the plugin. */
  get positions(): ReadonlyArray<{ x: number; y: number }> {
    return this.simNodes;
  }

  /** Advances one frame, then clamps every free node back inside the panel. */
  tick(): void {
    this.simulation.tick();
    const { margin, width, height } = this.options;
    for (const node of this.simNodes) {
      node.x = clamp(node.x, margin, width - margin);
      node.y = clamp(node.y, margin, height - margin);
    }
  }

  /** Re-energises the system so it re-settles around a change (a grab or a resize). */
  reheat(): void {
    if (this.simulation.alpha() < REHEAT_ALPHA) this.simulation.alpha(REHEAT_ALPHA);
  }

  /** Pins the grabbed node to the cursor and reheats. */
  startDrag(index: number, x: number, y: number): void {
    this.pin(index, x, y);
    this.reheat();
  }

  /** Moves the pinned node with the cursor. */
  drag(index: number, x: number, y: number): void {
    this.pin(index, x, y);
    this.reheat();
  }

  /** Releases the pin so the node rejoins the free simulation. */
  endDrag(index: number): void {
    const node = this.simNodes[index];
    if (!node) return;
    node.fx = null;
    node.fy = null;
  }

  /** Rescales positions into a resized panel and reheats so the layout re-settles. */
  resize(width: number, height: number): void {
    const scaleX = this.options.width > 0 ? width / this.options.width : 1;
    const scaleY = this.options.height > 0 ? height / this.options.height : 1;
    for (const node of this.simNodes) {
      node.x *= scaleX;
      node.y *= scaleY;
      if (node.fx !== null && node.fx !== undefined) node.fx *= scaleX;
      if (node.fy !== null && node.fy !== undefined) node.fy *= scaleY;
    }

    // The link rest length was set as a fraction of the smaller panel side at build, so it must track the
    // panel on resize too. Otherwise the springs keep pulling nodes toward the pre-resize spacing.
    const oldMinSide = Math.min(this.options.width, this.options.height);
    const nextMinSide = Math.min(width, height);
    const nextLinkDistance =
      oldMinSide > 0 ? (this.options.linkDistance * nextMinSide) / oldMinSide : this.options.linkDistance;
    const link = this.simulation.force('link') as ReturnType<typeof forceLink<SimNode, ForceLink>> | undefined;
    link?.distance(nextLinkDistance);

    this.options = { ...this.options, width, height, linkDistance: nextLinkDistance };
    const center = this.simulation.force('center') as ReturnType<typeof forceCenter> | undefined;
    center?.x(width / 2).y(height / 2);
    this.reheat();
  }

  private pin(index: number, x: number, y: number): void {
    const node = this.simNodes[index];
    if (!node) return;
    const { margin, width, height } = this.options;
    node.fx = clamp(x, margin, width - margin);
    node.fy = clamp(y, margin, height - margin);
  }
}

/** Seeds nodes on a phyllotaxis spiral around the panel centre, so the first tick is never degenerate. */
function seedNodes(count: number, width: number, height: number): SimNode[] {
  const centreX = width / 2;
  const centreY = height / 2;
  const initialRadius = Math.min(width, height) * 0.18;
  const nodes: SimNode[] = [];
  for (let index = 0; index < count; index += 1) {
    const radius = initialRadius * Math.sqrt(0.5 + index);
    const angle = index * GOLDEN_ANGLE;
    nodes.push({ x: centreX + radius * Math.cos(angle), y: centreY + radius * Math.sin(angle) });
  }
  return nodes;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}
```

Save as `force-directed-geom.tsx`.

```tsx
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createGraphyKit,
  defineGeomRenderer,
  Geom,
  type GeomHoverPush,
  getColor,
  type ScreenRect,
} from '@graphysdk/react';
import type { Dataset, GeomCompileResult, GeomCompilerInput, SceneLayer } from '@graphysdk/react';
import {
  createDatasetFromKindPartitions,
  type IdentityKey,
  readAuthoredNumber,
  readAuthoredString,
  readVariableName,
} from '@graphysdk/viz-engine';

import { ALPHA_MIN, ForceSimulation, type SimEdge } from './force-layout';

/** The column vocabulary shared by the compile half and the render half. */
const FORCE_COLUMNS = {
  kind: 'kind',
  markId: 'markId',
  label: 'label',
  value: 'value',
  // The geom's derived node identity: the field an author maps `color` to, which the colour scale keys on.
  // A node carries its own identity; an edge carries its source node's, so it inherits that hue.
  node: 'node',
  sourceIndex: 'sourceIndex',
  targetIndex: 'targetIndex',
} as const;

interface ForceDirectedParams {
  /** Repulsion magnitude between every node pair; larger spreads the graph wider. Consumed render-side. */
  chargeStrength: number;
  /** Spring rest length between linked nodes, as a fraction of the smaller panel side. Consumed render-side. */
  linkDistance: number;
}

interface InputEdge {
  source: string;
  target: string;
  value: number;
}

interface Topology {
  nodes: Array<{ name: string; value: number }>;
  edges: Array<{
    markId: string;
    label: string;
    value: number;
    node: string;
    sourceIndex: number;
    targetIndex: number;
  }>;
}

class ForceDirectedGeom extends Geom<ForceDirectedParams> {
  readonly type = 'forceDirected';
  override readonly defaultParams: ForceDirectedParams = {
    chargeStrength: 450,
    linkDistance: 0.22,
  };
  override readonly identityKey: IdentityKey = { variable: FORCE_COLUMNS.markId };
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly highlightStrategy = null;
  // `source`, `target`, and `value` are relational inputs read straight from the mapped columns, not
  // scaled. `color` is author-mapped and usually targets the derived `node`.
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

  // The compile half derives only the resolution-independent topology (nodes, weights) and emits no
  // positions. The render half runs the simulation that turns it into moving geometry.
  compile({ data, mapping }: GeomCompilerInput): GeomCompileResult {
    const topology = buildTopology(readEdges(data, mapping));

    const table = createDatasetFromKindPartitions(
      [
        {
          kind: 'node',
          observations: topology.nodes.map((node) => ({
            [FORCE_COLUMNS.markId]: `node:${node.name}`,
            [FORCE_COLUMNS.label]: node.name,
            [FORCE_COLUMNS.value]: node.value,
            [FORCE_COLUMNS.node]: node.name,
          })),
        },
        {
          kind: 'edge',
          observations: topology.edges.map((edge) => ({
            [FORCE_COLUMNS.markId]: edge.markId,
            [FORCE_COLUMNS.label]: edge.label,
            [FORCE_COLUMNS.value]: edge.value,
            [FORCE_COLUMNS.node]: edge.node,
            [FORCE_COLUMNS.sourceIndex]: edge.sourceIndex,
            [FORCE_COLUMNS.targetIndex]: edge.targetIndex,
          })),
        },
      ],
      FORCE_COLUMNS.kind
    );

    // Colour is not forced here. The author maps `color` to the derived `node` field and the engine's
    // categorical scale resolves it per observation.
    return {
      data: table,
      mapping: { label: { variable: FORCE_COLUMNS.label }, value: { variable: FORCE_COLUMNS.value } },
    };
  }
}

/** Zips the source, target, and value columns into edges, dropping rows with a missing field. */
function readEdges(data: Dataset, mapping: GeomCompilerInput['mapping']): InputEdge[] {
  const sourceVar = readVariableName(mapping.source);
  const targetVar = readVariableName(mapping.target);
  const valueVar = readVariableName(mapping.value);
  const sources = sourceVar ? data.getValues(sourceVar) : [];
  const targets = targetVar ? data.getValues(targetVar) : [];
  const values = valueVar ? data.getValues(valueVar) : [];

  const edges: InputEdge[] = [];
  for (let row = 0; row < sources.length; row += 1) {
    const source = sources[row];
    const target = targets[row];
    const value = values[row];
    if (typeof source === 'string' && typeof target === 'string' && typeof value === 'number') {
      edges.push({ source, target, value });
    }
  }
  return edges;
}

/**
 * Derives nodes from the edge list (first-appearance order, so seeding is stable), sums each node's
 * incident edge weight as its size, and rewrites edges as index pairs into the node list. Each edge also
 * carries its source node's identity so it inherits that node's resolved colour.
 */
function buildTopology(edges: InputEdge[]): Topology {
  const indexByName = new Map<string, number>();
  const names: string[] = [];
  for (const edge of edges) {
    for (const name of [edge.source, edge.target]) {
      if (indexByName.has(name)) continue;
      indexByName.set(name, names.length);
      names.push(name);
    }
  }

  const weight = new Array<number>(names.length).fill(0);
  const outEdges: Topology['edges'] = [];
  edges.forEach((edge, index) => {
    const sourceIndex = indexByName.get(edge.source);
    const targetIndex = indexByName.get(edge.target);
    if (sourceIndex === undefined || targetIndex === undefined) return;
    weight[sourceIndex] = (weight[sourceIndex] ?? 0) + edge.value;
    weight[targetIndex] = (weight[targetIndex] ?? 0) + edge.value;
    outEdges.push({
      markId: `edge:${edge.source}->${edge.target}#${index}`,
      label: `${edge.source} to ${edge.target}`,
      value: edge.value,
      node: edge.source,
      sourceIndex,
      targetIndex,
    });
  });

  const nodes = names.map((name, index) => ({ name, value: weight[index] ?? 0 }));
  return { nodes, edges: outEdges };
}

const MIN_NODE_RADIUS = 6;
const MAX_NODE_RADIUS = 20;
const MIN_EDGE_WIDTH = 1.5;
const MAX_EDGE_WIDTH = 6;
const EDGE_HIT_WIDTH = 14;
/** Fill used only if the colour scale is absent. */
const FALLBACK_COLOR = '#888888';

interface GraphNode {
  markId: string;
  label: string;
  value: number;
  /** The node's resolved fill, from the engine's colour scale. */
  color: string;
}

interface GraphEdge {
  markId: string;
  label: string;
  value: number;
  /** The edge's fill: its source node's resolved colour. */
  color: string;
  sourceIndex: number;
  targetIndex: number;
}

/** What the cursor is over, for the neighbourhood fade. This is the geom's own visual, separate from the engine hover. */
interface FocusHover {
  kind: 'node' | 'edge';
  index: number;
}

/** The node and edge indices kept fully opaque under a hover; `null` means no hover, everything active. */
interface Focus {
  nodes: Set<number> | null;
  edges: Set<number> | null;
}

/** Splits the mixed node/edge dataset into the two sets the canvas paints, dispatching on `kind`. */
function partition(data: Dataset): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const observation of data) {
    switch (readAuthoredString(observation, FORCE_COLUMNS.kind)) {
      case 'node':
        nodes.push({
          markId: readAuthoredString(observation, FORCE_COLUMNS.markId),
          label: readAuthoredString(observation, FORCE_COLUMNS.label),
          value: readAuthoredNumber(observation, FORCE_COLUMNS.value),
          color: getColor(observation) ?? FALLBACK_COLOR,
        });
        break;
      case 'edge':
        edges.push({
          markId: readAuthoredString(observation, FORCE_COLUMNS.markId),
          label: readAuthoredString(observation, FORCE_COLUMNS.label),
          value: readAuthoredNumber(observation, FORCE_COLUMNS.value),
          color: getColor(observation) ?? FALLBACK_COLOR,
          sourceIndex: readAuthoredNumber(observation, FORCE_COLUMNS.sourceIndex),
          targetIndex: readAuthoredNumber(observation, FORCE_COLUMNS.targetIndex),
        });
        break;
    }
  }
  return { nodes, edges };
}

/**
 * Partitions the live topology and hands it to the canvas. Mounted by the renderer inside the overlay
 * portal, so measuring the screen rect, the portal, and the hover push wiring are the renderer's job.
 */
const ForceOverlay = ({
  layer,
  rect,
  pushHover,
}: {
  layer: SceneLayer;
  rect: ScreenRect;
  pushHover: GeomHoverPush;
}) => {
  const { nodes, edges } = useMemo(() => partition(layer.data), [layer.data]);
  const params = layer.params as unknown as ForceDirectedParams;
  return <ForceCanvas rect={rect} pushHover={pushHover} nodes={nodes} edges={edges} params={params} />;
};

/**
 * The live canvas: an SVG fixed over the panel that runs the simulation and paints it each frame. The SVG
 * ignores pointer events; only the node circles and the invisible wide edge-hit lines capture them, so
 * gaps fall through to the graph below. Nodes paint after edges, so a node takes the pointer over the edges
 * it overlaps. Hover pushes through `pushHover` for the central tooltip; a local `focusHover` state drives
 * the neighbourhood fade.
 */
const ForceCanvas = ({
  rect,
  pushHover,
  nodes,
  edges,
  params,
}: {
  rect: ScreenRect;
  pushHover: GeomHoverPush;
  nodes: GraphNode[];
  edges: GraphEdge[];
  params: ForceDirectedParams;
}) => {
  const simRef = useRef<ForceSimulation | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const rectRef = useRef(rect);
  rectRef.current = rect;

  const [, setFrame] = useState(0);
  const [focusHover, setFocusHover] = useState<FocusHover | null>(null);

  const runLoop = useCallback(() => {
    const sim = simRef.current;
    if (!sim) {
      rafRef.current = null;
      return;
    }
    sim.tick();
    setFrame((value) => value + 1);
    rafRef.current = sim.alpha > ALPHA_MIN || dragIndexRef.current !== null ? requestAnimationFrame(runLoop) : null;
  }, []);

  const ensureRunning = useCallback(() => {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(runLoop);
  }, [runLoop]);

  // Build (or rebuild) the simulation when the topology or its tuning changes, never every frame.
  useEffect(() => {
    const simEdges: SimEdge[] = edges.map((edge) => ({ sourceIndex: edge.sourceIndex, targetIndex: edge.targetIndex }));
    const { width, height } = rectRef.current;
    simRef.current = new ForceSimulation(nodes.length, simEdges, {
      width,
      height,
      chargeStrength: params.chargeStrength,
      linkDistance: params.linkDistance * Math.min(width, height),
      margin: MAX_NODE_RADIUS + 2,
    });
    ensureRunning();
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      // The rebuilt simulation has no active drag. Clear the pin so the loop cannot spin forever if a
      // topology change interrupts a drag before `onLostPointerCapture` fires on the replaced element.
      dragIndexRef.current = null;
    };
  }, [nodes, edges, params.chargeStrength, params.linkDistance, ensureRunning]);

  // Reflow into a resized panel without reseeding the layout.
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.resize(rect.width, rect.height);
    ensureRunning();
  }, [rect.width, rect.height, ensureRunning]);

  // Stable handlers (one per kind) that read the index off the event target's `data-index`, so the
  // per-frame ticks do not reallocate a closure for every node and edge.
  const handleNodePointerDown = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>) => {
      const index = Number(event.currentTarget.dataset.index);
      event.currentTarget.setPointerCapture(event.pointerId);
      dragIndexRef.current = index;
      simRef.current?.startDrag(index, event.clientX - rectRef.current.left, event.clientY - rectRef.current.top);
      ensureRunning();
    },
    [ensureRunning]
  );

  const handleNodePointerMove = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>) => {
      const index = Number(event.currentTarget.dataset.index);
      if (dragIndexRef.current === index) {
        simRef.current?.drag(index, event.clientX - rectRef.current.left, event.clientY - rectRef.current.top);
        ensureRunning();
      }
      setFocusHover({ kind: 'node', index });
      const node = nodes[index];
      if (node) pushHover(node.markId, { clientX: event.clientX, clientY: event.clientY });
    },
    [ensureRunning, nodes, pushHover]
  );

  // Pointer capture releases on pointerup and pointercancel, so ending the drag here also covers an
  // interrupted gesture. Otherwise the drag index would stay set and the frame loop would never stop.
  const handleNodeDragEnd = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>) => {
      const index = Number(event.currentTarget.dataset.index);
      if (dragIndexRef.current === index) {
        simRef.current?.endDrag(index);
        dragIndexRef.current = null;
        ensureRunning();
      }
    },
    [ensureRunning]
  );

  const handleEdgePointerMove = useCallback(
    (event: ReactPointerEvent<SVGLineElement>) => {
      const index = Number(event.currentTarget.dataset.index);
      setFocusHover({ kind: 'edge', index });
      const edge = edges[index];
      if (edge) pushHover(edge.markId, { clientX: event.clientX, clientY: event.clientY });
    },
    [edges, pushHover]
  );

  const clearHover = useCallback(() => {
    if (dragIndexRef.current === null) {
      setFocusHover(null);
      pushHover(null);
    }
  }, [pushHover]);

  const positions = simRef.current?.positions ?? [];
  // Memoized so the per-frame re-render does not rebuild the maxima or the focus sets; only `positions`
  // changes each frame. A reduce, not a spread into `Math.max`, so a large graph cannot overflow the
  // call-argument limit.
  const maxNodeValue = useMemo(() => nodes.reduce((max, node) => Math.max(max, node.value), 1), [nodes]);
  const maxEdgeValue = useMemo(() => edges.reduce((max, edge) => Math.max(max, edge.value), 1), [edges]);
  const focus = useMemo(() => computeFocus(focusHover, edges), [focusHover, edges]);

  return (
    <svg width={rect.width} height={rect.height} style={{ pointerEvents: 'none', overflow: 'visible' }}>
      {edges.map((edge, index) => {
        const source = positions[edge.sourceIndex];
        const target = positions[edge.targetIndex];
        if (!source || !target) return null;
        const isActive = focus.edges ? focus.edges.has(index) : true;
        const color = edge.color;
        return (
          <g key={edge.markId}>
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={color}
              strokeWidth={edgeWidth(edge.value, maxEdgeValue)}
              strokeOpacity={isActive ? 0.55 : 0.08}
              strokeLinecap="round"
            />
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="transparent"
              strokeWidth={Math.max(edgeWidth(edge.value, maxEdgeValue), EDGE_HIT_WIDTH)}
              data-index={index}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onPointerMove={handleEdgePointerMove}
              onPointerLeave={clearHover}
            />
          </g>
        );
      })}
      {nodes.map((node, index) => {
        const position = positions[index];
        if (!position) return null;
        const isActive = focus.nodes ? focus.nodes.has(index) : true;
        const isDragging = dragIndexRef.current === index;
        return (
          <circle
            key={node.markId}
            data-index={index}
            cx={position.x}
            cy={position.y}
            r={nodeRadius(node.value, maxNodeValue)}
            fill={node.color}
            fillOpacity={isActive ? 1 : 0.2}
            stroke="#fff"
            strokeWidth={1.5}
            strokeOpacity={isActive ? 1 : 0.2}
            style={{ pointerEvents: 'all', cursor: isDragging ? 'grabbing' : 'grab' }}
            onPointerDown={handleNodePointerDown}
            onPointerMove={handleNodePointerMove}
            onLostPointerCapture={handleNodeDragEnd}
            onPointerLeave={clearHover}
          />
        );
      })}
      {nodes.map((node, index) => {
        const position = positions[index];
        if (!position) return null;
        const isActive = focus.nodes ? focus.nodes.has(index) : true;
        return (
          <text
            key={`label:${node.markId}`}
            x={position.x}
            y={position.y - nodeRadius(node.value, maxNodeValue) - 4}
            textAnchor="middle"
            fontSize={11}
            fill="#333"
            fillOpacity={isActive ? 1 : 0.25}
            pointerEvents="none"
          >
            {node.label}
          </text>
        );
      })}
    </svg>
  );
};

/** Resolves which nodes and edges stay opaque under the current hover (its neighbourhood). */
function computeFocus(hover: FocusHover | null, edges: GraphEdge[]): Focus {
  if (!hover) return { nodes: null, edges: null };
  const activeNodes = new Set<number>();
  const activeEdges = new Set<number>();

  if (hover.kind === 'node') {
    activeNodes.add(hover.index);
    edges.forEach((edge, index) => {
      if (edge.sourceIndex !== hover.index && edge.targetIndex !== hover.index) return;
      activeEdges.add(index);
      activeNodes.add(edge.sourceIndex);
      activeNodes.add(edge.targetIndex);
    });
  } else {
    activeEdges.add(hover.index);
    const edge = edges[hover.index];
    if (edge) {
      activeNodes.add(edge.sourceIndex);
      activeNodes.add(edge.targetIndex);
    }
  }

  return { nodes: activeNodes, edges: activeEdges };
}

// Clamp the value/max ratio to [0, 1] before scaling: a negative weight would otherwise drive
// `Math.sqrt` to NaN and hide the node with no error.
function nodeRadius(value: number, maxValue: number): number {
  const ratio = Math.min(1, Math.max(0, value / maxValue));
  return MIN_NODE_RADIUS + Math.sqrt(ratio) * (MAX_NODE_RADIUS - MIN_NODE_RADIUS);
}

function edgeWidth(value: number, maxValue: number): number {
  const ratio = Math.min(1, Math.max(0, value / maxValue));
  return MIN_EDGE_WIDTH + ratio * (MAX_EDGE_WIDTH - MIN_EDGE_WIDTH);
}

export const kit = createGraphyKit({
  plugins: [
    defineGeomRenderer(new ForceDirectedGeom(), {
      coord: 'cartesian',
      // The live, draggable simulation must own its pointer events, so `render` is overlay-hosted: the
      // renderer mounts it in a screen portal above the capture layer and supplies `overlay`. The tooltip
      // is driven through the push path the overlay supplies.
      render: {
        fn: ({ layer, overlay }) => (
          <ForceOverlay layer={layer} rect={overlay.panelRect} pushHover={overlay.pushHover} />
        ),
        options: { overlay: true },
      },
      renderHover: () => null,
      renderHoverCompanions: () => null,
    }),
  ],
});
```

## Notes

- Install `d3-force` (`npm install d3-force`, plus `@types/d3-force` for TypeScript).
- From `@graphysdk/viz-engine`: `createDatasetFromKindPartitions`, `readAuthoredNumber`, `readAuthoredString`, `readVariableName`, and the `IdentityKey` type. Everything else comes from `@graphysdk/react`.
- The geom declares `source`, `target`, and `value` as required data aesthetics and derives a `node` variable. Map `color` to `node` for one hue per node, or to a column of your own.
- The overlay-hosted `render` (`options: { overlay: true }`) owns pointer events, so drag and hover work without a `hitTest`. Positions are not in the spec: the layout re-settles on each mount and resize.
- Params: `chargeStrength` (default 450) and `linkDistance` (default 0.22 of the smaller panel side).
