# Force-directed graph

Technique: overlay-hosted rendering (`{ fn, options: { overlay: true } }`) + push hover via `useGeomHover`.

Reach for this pattern when a geom's geometry keeps changing after it is drawn (a live simulation) and must own its own pointer events (dragging nodes). Declaring `render` as `{ fn, options: { overlay: true } }` makes the renderer mount the paint in a screen-aligned portal above the central capture layer and hand it `input.overlay` — `panelRect` (client pixels) plus a ready `pushHover` (built on the `useGeomHover` hook, which is also exported standalone as an escape hatch). The geom's own pointer handlers push the hovered observation's identity key; the engine resolves it through the same lookup the pull path uses, so the geom inherits the central tooltip.

Third-party dependency: `d3-force` (plus `@types/d3-force`).

## Plugin

```tsx
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createGraphyKit,
  defineGeomRenderer,
  type GeomHoverPush,
  type PanelScreenRect,
} from '@graphysdk/react-renderer';
import type {
  CompiledGeom,
  CompiledLayer,
  Dataset,
  GeomCompilerInput,
  IdentityKey,
} from '@graphysdk/viz-engine';
import {
  createDatasetFromKindPartitions,
  extractVariableName,
  Geom,
  getColor,
  readAuthoredNumber,
  readAuthoredString,
} from '@graphysdk/viz-engine';
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3-force';

// ---------- Simulation (render-side, panel pixels) ----------

/** Alpha below which the system is at rest and the animation clock can stop. */
const ALPHA_MIN = 0.005;

interface SimEdge {
  sourceIndex: number;
  targetIndex: number;
}

interface ForceLayoutOptions {
  width: number;
  height: number;
  /** Repulsion magnitude between every node pair; larger spreads the graph wider. */
  chargeStrength: number;
  /** Spring rest length between linked nodes, in pixels. */
  linkDistance: number;
  /** Distance from the panel edge nodes are clamped to, in pixels. */
  margin: number;
}

/** d3 mutates these in place: `x`/`y` are the live position, `fx`/`fy` pin a dragged node. */
interface SimulationNode extends SimulationNodeDatum {
  x: number;
  y: number;
}

interface ForceLink {
  source: number | SimulationNode;
  target: number | SimulationNode;
}

const LINK_STRENGTH = 0.5;
const REHEAT_ALPHA = 0.5;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * A d3-force simulation steered manually from the plugin's requestAnimationFrame loop (not d3's own
 * timer). Owns its node array; callers read `positions` each frame and steer drags through
 * `startDrag`/`drag`/`endDrag`. A force layout settles frame by frame and accepts drags, so it has no
 * resolution-independent form to precompute — it lives entirely in the render half.
 */
class ForceSimulation {
  private readonly simulation: Simulation<SimulationNode, ForceLink>;
  private readonly simNodes: SimulationNode[];
  private options: ForceLayoutOptions;

  constructor(nodeCount: number, edges: SimEdge[], options: ForceLayoutOptions) {
    this.options = options;
    this.simNodes = seedNodes(nodeCount, options.width, options.height);
    const links: ForceLink[] = edges.map((edge) => ({ source: edge.sourceIndex, target: edge.targetIndex }));
    this.simulation = forceSimulation<SimulationNode, ForceLink>(this.simNodes)
      .force('charge', forceManyBody().strength(-options.chargeStrength))
      .force('link', forceLink<SimulationNode, ForceLink>(links).distance(options.linkDistance).strength(LINK_STRENGTH))
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

  startDrag(index: number, x: number, y: number): void {
    this.pin(index, x, y);
    this.reheat();
  }

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

    // The link rest length was set as a fraction of the smaller panel side at build, so it must track
    // the panel on resize too.
    const oldMinSide = Math.min(this.options.width, this.options.height);
    const nextMinSide = Math.min(width, height);
    const nextLinkDistance =
      oldMinSide > 0 ? (this.options.linkDistance * nextMinSide) / oldMinSide : this.options.linkDistance;
    const link = this.simulation.force('link') as ReturnType<typeof forceLink<SimulationNode, ForceLink>> | undefined;
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
function seedNodes(count: number, width: number, height: number): SimulationNode[] {
  const centreX = width / 2;
  const centreY = height / 2;
  const initialRadius = Math.min(width, height) * 0.18;
  const nodes: SimulationNode[] = [];
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

// ---------- Geom (compile half: topology only, no positions) ----------

/** The compile/render column vocabulary — the shared handshake between the two halves. */
const FORCE_COLUMNS = {
  kind: 'kind',
  markId: 'markId',
  label: 'label',
  value: 'value',
  // The geom's derived node identity — the field an author maps `color` to. A node carries its own
  // identity; an edge carries its source node's, so it inherits its hue.
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

  // A live simulation: the compile half derives only the resolution-independent topology (nodes,
  // weights) and emits NO positions; the render half runs the simulation.
  compile({ data, mapping }: GeomCompilerInput): CompiledGeom {
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

    return {
      data: table,
      mapping: { label: { variable: FORCE_COLUMNS.label }, value: { variable: FORCE_COLUMNS.value } },
    };
  }
}

/** Zips the source/target/value columns into edges, dropping rows with a missing field. */
function readEdges(data: Dataset, mapping: GeomCompilerInput['mapping']): InputEdge[] {
  const sourceVar = extractVariableName(mapping.source);
  const targetVar = extractVariableName(mapping.target);
  const valueVar = extractVariableName(mapping.value);
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
 * incident edge weight as its size, and rewrites edges as index pairs into the node list.
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
      label: `${edge.source} → ${edge.target}`,
      value: edge.value,
      node: edge.source,
      sourceIndex,
      targetIndex,
    });
  });

  const nodes = names.map((name, index) => ({ name, value: weight[index] ?? 0 }));
  return { nodes, edges: outEdges };
}

// ---------- Renderer (render half: overlay-hosted) ----------

const MIN_NODE_RADIUS = 6;
const MAX_NODE_RADIUS = 20;
const MIN_EDGE_WIDTH = 1.5;
const MAX_EDGE_WIDTH = 6;
const EDGE_HIT_WIDTH = 14;
const FALLBACK_COLOR = '#888888';

interface GraphNode {
  markId: string;
  label: string;
  value: number;
  color: string;
}

interface GraphEdge {
  markId: string;
  label: string;
  value: number;
  /** The edge's fill — its source node's resolved colour. */
  color: string;
  sourceIndex: number;
  targetIndex: number;
}

/** What the cursor is over, for the neighbourhood fade — the geom's own visual, distinct from the engine hover. */
interface FocusHover {
  kind: 'node' | 'edge';
  index: number;
}

/** The node and edge indices kept fully opaque under a hover; `null` means "no hover, everything active". */
interface Focus {
  nodes: Set<number> | null;
  edges: Set<number> | null;
}

/** Splits the mixed node/edge dataset into the two mark sets, dispatching on `kind`. */
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
 * portal, so the screen-rect measurement, the portal, and the push wiring are the renderer's job —
 * this geom declares an overlay-hosted `render` and writes only the simulation.
 */
const ForceOverlay = ({
  layer,
  rect,
  pushHover,
}: {
  layer: CompiledLayer;
  rect: PanelScreenRect;
  pushHover: GeomHoverPush;
}) => {
  const { nodes, edges } = useMemo(() => partition(layer.data), [layer.data]);
  const params = layer.params as unknown as ForceDirectedParams;
  return <ForceCanvas rect={rect} pushHover={pushHover} nodes={nodes} edges={edges} params={params} />;
};

/**
 * The live canvas: an SVG fixed over the panel that runs the simulation and paints it each frame. The
 * SVG ignores pointer events; only the node circles and the invisible wide edge-hit lines capture
 * them, so gaps fall through to the chart below. Nodes paint after edges, so a node wins a pointer
 * over the edges it overlaps. Hover pushes through `pushHover` for the central tooltip; a local
 * `focusHover` state drives the neighbourhood fade (the geom's own visual).
 */
const ForceCanvas = ({
  rect,
  pushHover,
  nodes,
  edges,
  params,
}: {
  rect: PanelScreenRect;
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

  // Build (or rebuild) the simulation when the topology or its tuning changes — never every frame.
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
      // The rebuilt simulation has no active drag; clear the pin so the loop's keep-alive can't spin
      // forever if a topology change interrupts a drag before `onLostPointerCapture` fires.
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

  // Stable handlers (one per kind) that read the mark index off the event target's `data-index`, so
  // the ~60fps frame ticks don't reallocate a closure for every node and edge.
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
      // The push path: hand the engine the observation's identity key plus the cursor; the engine
      // resolves the hover and anchors the central tooltip at the cursor.
      if (node) pushHover(node.markId, { clientX: event.clientX, clientY: event.clientY });
    },
    [ensureRunning, nodes, pushHover]
  );

  // Pointer capture releases implicitly on pointerup/pointercancel, so ending the drag here also
  // covers an interrupted gesture; without it the rAF loop would never stop.
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
  // Memoized so the per-frame re-render doesn't rebuild the maxima or the focus Sets.
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
        return (
          <g key={edge.markId}>
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={edge.color}
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
// `Math.sqrt` to NaN and vanish the mark with no error.
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
      // The live, draggable simulation must own its pointer events, so `render` is overlay-hosted:
      // the renderer mounts it in a screen portal above the capture layer and supplies `overlay`
      // ({ panelRect, pushHover }). The central hover layer contributes nothing; the tooltip is
      // driven through the push path.
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

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react-renderer';
import { config, type Data } from '@graphysdk/viz-engine';

import { kit } from './force-directed-plugin';

// `color` maps to the derived `node` identity, so the categorical scale colours each node and its
// outgoing edges. The legend is suppressed: every node is labelled in place.
const spec = kit.pipe(
  kit.createSpec({}),
  kit.geom.forceDirected({ aes: { source: 'source', target: 'target', value: 'value', color: 'node' } }),
  config({ legend: { position: 'none' } })
);

const data: Data = {
  columns: [{ key: 'source' }, { key: 'target' }, { key: 'value' }],
  rows: [
    { source: 'Gateway', target: 'Auth', value: 120 },
    { source: 'Gateway', target: 'Catalog', value: 200 },
    { source: 'Auth', target: 'Sessions', value: 100 },
    { source: 'Catalog', target: 'Search', value: 150 },
    { source: 'Catalog', target: 'Inventory', value: 110 },
    { source: 'Search', target: 'Inventory', value: 80 },
  ],
};

export const ForceDirectedChart = () => (
  <kit.GraphProvider input={spec} data={data}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Adapting

- Tune the physics through geom params: `kit.geom.forceDirected({ params: { chargeStrength, linkDistance }, aes: { ... } })` — both are consumed render-side when the simulation is built.
- The overlay + push-hover mechanics generalise to any geom whose marks move after paint or need native pointer events (drag, pan, animation): declare `render: { fn, options: { overlay: true } }`, push identity keys through `overlay.pushHover(markId, { clientX, clientY })`, and pass `null` to clear. Geoms whose geometry is fixed once drawn should use the pull path (`hitTest` factory or `useGeomHitTest`) instead.
- Requires `d3-force` (`@types/d3-force` for TypeScript). Keep the simulation class free of Graphy imports so the physics stays swappable; only the plugin halves marshal topology in and positions out.
