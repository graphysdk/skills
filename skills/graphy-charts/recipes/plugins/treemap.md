# Treemap

Technique: custom compile logic + custom hit-testing via `useGeomHitTest`.

Reach for this pattern when a chart's geometry comes from a layout algorithm over the whole dataset, not from positional scales: `compile()` runs the layout and emits the finished geometry as the geom's own dataset columns, and the render side paints them and answers cursor queries itself. The geom declares `spatialKind: 'render-hit-test'` and supplies a `hitTest` factory on the render contract — the renderer registers it through `useGeomHitTest` on the geom's behalf, so the layer inherits central hover and the built-in tooltip with no pointer overlay. Requires `d3-hierarchy`.

## Layout (`treemap-layout.ts`)

Pure layout in unit `[0, 1]` space, `y = 0` at the top, free of any Graphy import.

```ts
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';

/** One leaf of the hierarchy. Input observations are leaves; the group is their parent. */
export interface TreemapLeaf {
  group: string;
  label: string;
  value: number;
}

export interface TreemapLayoutParams {
  /** Gap between sibling leaf tiles, as a unit fraction. */
  padding: number;
  /** Inset around each group cell, as a unit fraction. */
  groupGap: number;
  /** Height reserved at the top of a group cell for its name, as a unit fraction. */
  groupHeader: number;
}

/**
 * A laid-out tile in unit space. A `group` tile is a header-bearing cell containing leaves; a `leaf`
 * tile is a single rectangle whose area is proportional to its value. `shade` varies a leaf's lightness
 * within its group's hue (`0` for a group tile); the hue itself comes from the engine's colour scale.
 */
export interface LaidOutTile {
  kind: 'group' | 'leaf';
  group: string;
  label: string;
  value: number;
  shade: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Bottom edge of a group's header band; `null` for a leaf. */
  headerY1: number | null;
}

interface GroupAggregate {
  name: string;
  value: number;
  leaves: TreemapLeaf[];
}

/** The hierarchy d3 lays out: internal nodes carry no value, leaves carry theirs. */
interface TreeNodeInput {
  group: string;
  label: string;
  value: number;
  children?: TreeNodeInput[];
}

/**
 * Groups are squarified across the full unit square by total value; each group's leaves are then
 * squarified into that group's content rect (inset by `groupGap`, with `groupHeader` reserved for the
 * name). A single distinct group degrades to a flat treemap (no header level).
 */
export function computeTreemapLayout(leaves: TreemapLeaf[], params: TreemapLayoutParams): LaidOutTile[] {
  const groups = aggregateGroups(leaves);
  if (groups.length === 0) return [];
  const isFlat = groups.length <= 1;

  const root = hierarchy<TreeNodeInput>(buildHierarchy(groups, isFlat))
    .sum((node) => node.value)
    .sort((left, right) => (right.value ?? 0) - (left.value ?? 0));

  const laidRoot = treemap<TreeNodeInput>()
    .size([1, 1])
    .tile(treemapSquarify)
    .paddingOuter((node) => (node.depth === 0 ? params.groupGap : 0))
    .paddingInner((node) => (node.depth === 0 && !isFlat ? params.groupGap * 2 : params.padding))
    .paddingTop((node) => (node.depth === 1 && !isFlat ? params.groupHeader : 0))(root);

  // Reduce, not `Math.max(...leaves)`: a spread over a very large group overflows the call-argument limit.
  const maxValueByGroup = new Map(
    groups.map((group) => [group.name, group.leaves.reduce((max, leaf) => Math.max(max, leaf.value), 0)])
  );

  const tiles: LaidOutTile[] = [];
  laidRoot.each((node) => {
    if (node.depth === 1 && !isFlat) {
      const headerHeight = Math.min(params.groupHeader, node.y1 - node.y0);
      tiles.push({
        kind: 'group',
        group: node.data.group,
        label: node.data.label,
        value: node.value ?? 0,
        shade: 0,
        x0: node.x0,
        y0: node.y0,
        x1: node.x1,
        y1: node.y1,
        headerY1: node.y0 + headerHeight,
      });
    } else if (!node.children) {
      tiles.push({
        kind: 'leaf',
        group: node.data.group,
        label: node.data.label,
        value: node.data.value,
        shade: shadeFor(node.data.value, maxValueByGroup.get(node.data.group) ?? 0),
        x0: node.x0,
        y0: node.y0,
        x1: node.x1,
        y1: node.y1,
        headerY1: null,
      });
    }
  });

  return tiles;
}

/** Folds leaves into groups, then sorts groups (and leaves within each) by descending value. */
function aggregateGroups(leaves: TreemapLeaf[]): GroupAggregate[] {
  const groups: GroupAggregate[] = [];
  const indexByName = new Map<string, number>();

  for (const leaf of leaves) {
    const existing = indexByName.get(leaf.group);
    if (existing === undefined) {
      indexByName.set(leaf.group, groups.length);
      groups.push({ name: leaf.group, value: leaf.value, leaves: [leaf] });
    } else {
      const group = groups[existing];
      if (group) {
        group.value += leaf.value;
        group.leaves.push(leaf);
      }
    }
  }

  groups.sort((left, right) => right.value - left.value);
  for (const group of groups) {
    group.leaves.sort((left, right) => right.value - left.value);
  }
  return groups;
}

/** A flat treemap skips the group level entirely — leaves hang straight off the root, no header. */
function buildHierarchy(groups: GroupAggregate[], isFlat: boolean): TreeNodeInput {
  const groupNodes = groups.map((group) => ({
    group: group.name,
    label: group.name,
    value: 0,
    children: group.leaves.map((leaf) => ({
      group: group.name,
      label: leaf.label,
      value: leaf.value,
    })),
  }));

  const children = isFlat ? (groupNodes[0]?.children ?? []) : groupNodes;
  return { group: '', label: '', value: 0, children };
}

/** Larger leaves stay close to the base colour, smaller leaves lighten; clamped so every tile reads. */
function shadeFor(value: number, maxValue: number): number {
  if (maxValue <= 0) return 1;
  return 0.4 + 0.6 * (value / maxValue);
}
```

## Plugin

```tsx
import { type ReactNode, useMemo } from 'react';
import {
  createGraphyKit,
  defineGeomRenderer,
  lightenCss,
  type RenderHitTester,
} from '@graphysdk/react-renderer';
import {
  type CompiledGeom,
  type CompiledLayer,
  type Dataset,
  type GeomCompilerInput,
  type IdentityKey,
  type Observation,
  createDatasetFromKindPartitions,
  extractVariableName,
  Geom,
  getColor,
  readAuthoredNumber,
  readAuthoredString,
  toPercent,
} from '@graphysdk/viz-engine';

import { computeTreemapLayout, type TreemapLeaf } from './treemap-layout';

/** The compile/render column vocabulary — the shared handshake between the two halves. */
const TREEMAP_COLUMNS = {
  kind: 'kind',
  markId: 'markId',
  group: 'group',
  label: 'label',
  value: 'value',
  shade: 'shade',
  x0: 'x0',
  y0: 'y0',
  x1: 'x1',
  y1: 'y1',
  headerY1: 'headerY1',
} as const;

/** Fill used only if the colour scale is somehow absent — every tile is otherwise scale-coloured. */
const FALLBACK_COLOR = '#888888';

interface TreemapParams {
  /** Gap between sibling leaf tiles, as a unit fraction. */
  padding: number;
  /** Inset around each group cell, as a unit fraction. */
  groupGap: number;
  /** Header band height reserved for a group's name, as a unit fraction. */
  groupHeader: number;
}

class TreemapGeom extends Geom<TreemapParams> {
  readonly type = 'treemap';
  override readonly defaultParams: TreemapParams = {
    padding: 0.004,
    groupGap: 0.008,
    groupHeader: 0.032,
  };
  override readonly identityKey: IdentityKey = { variable: TREEMAP_COLUMNS.markId };
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly highlightStrategy = null;
  // `label`/`value` are the hierarchy inputs the layout consumes (read from the mapped columns, not
  // scaled). `group` is a universal aesthetic — recognised without declaring — that the layout reads
  // when mapped; absent, the leaves form a single flat treemap. `color` is author-mapped (no forced
  // encoding) to `group`, so the engine's categorical scale gives a group and its leaves one hue.
  override readonly aesthetics = [
    { kind: 'data', name: 'label', required: true },
    { kind: 'data', name: 'value', required: true },
    { kind: 'visual', name: 'color' },
  ] as const;
  override readonly tooltip = [
    { key: 'Item', aes: 'label' },
    { key: 'Value', aes: 'value' },
  ] as const;
  override readonly spatialKind = 'render-hit-test';

  compile({ data, params, mapping }: GeomCompilerInput): CompiledGeom {
    const resolved = { ...this.defaultParams, ...(params as Partial<TreemapParams>) };
    const leaves = readLeaves(data, mapping);
    const tiles = computeTreemapLayout(leaves, {
      padding: resolved.padding,
      groupGap: resolved.groupGap,
      groupHeader: resolved.groupHeader,
    });

    const table = createDatasetFromKindPartitions(
      [
        {
          kind: 'group',
          observations: tiles
            .filter((tile) => tile.kind === 'group')
            .map((tile) => ({
              [TREEMAP_COLUMNS.markId]: `group:${tile.group}`,
              [TREEMAP_COLUMNS.group]: tile.group,
              [TREEMAP_COLUMNS.label]: tile.label,
              [TREEMAP_COLUMNS.value]: tile.value,
              [TREEMAP_COLUMNS.shade]: tile.shade,
              [TREEMAP_COLUMNS.x0]: tile.x0,
              [TREEMAP_COLUMNS.y0]: tile.y0,
              [TREEMAP_COLUMNS.x1]: tile.x1,
              [TREEMAP_COLUMNS.y1]: tile.y1,
              [TREEMAP_COLUMNS.headerY1]: tile.headerY1,
            })),
        },
        {
          kind: 'leaf',
          observations: tiles
            .filter((tile) => tile.kind === 'leaf')
            .map((tile) => ({
              [TREEMAP_COLUMNS.markId]: `leaf:${tile.group}::${tile.label}`,
              [TREEMAP_COLUMNS.group]: tile.group,
              [TREEMAP_COLUMNS.label]: tile.label,
              [TREEMAP_COLUMNS.value]: tile.value,
              [TREEMAP_COLUMNS.shade]: tile.shade,
              [TREEMAP_COLUMNS.x0]: tile.x0,
              [TREEMAP_COLUMNS.y0]: tile.y0,
              [TREEMAP_COLUMNS.x1]: tile.x1,
              [TREEMAP_COLUMNS.y1]: tile.y1,
              [TREEMAP_COLUMNS.headerY1]: null,
            })),
        },
      ],
      TREEMAP_COLUMNS.kind
    );

    // Geometry stays in the geom's own columns, unscaled. The tooltip reads `label`/`value`.
    return {
      data: table,
      mapping: { label: { variable: TREEMAP_COLUMNS.label }, value: { variable: TREEMAP_COLUMNS.value } },
    };
  }
}

/** Zips the label/value (and optional group) columns into leaves, dropping rows missing a label or value. */
function readLeaves(data: Dataset, mapping: GeomCompilerInput['mapping']): TreemapLeaf[] {
  const groupVariable = extractVariableName(mapping.group);
  const labelVariable = extractVariableName(mapping.label);
  const valueVariable = extractVariableName(mapping.value);
  // Read untyped and filter by `typeof` below, rather than the type-asserting `getValues` overload: a
  // present-but-wrong-typed mapping degrades to an empty chart instead of an error panel.
  const groups = groupVariable && data.hasVariable(groupVariable) ? data.getValues(groupVariable) : null;
  const labels = labelVariable && data.hasVariable(labelVariable) ? data.getValues(labelVariable) : [];
  const values = valueVariable && data.hasVariable(valueVariable) ? data.getValues(valueVariable) : [];

  const leaves: TreemapLeaf[] = [];
  for (let row = 0; row < labels.length; row += 1) {
    const label = labels[row];
    const value = values[row];
    if (typeof label !== 'string' || typeof value !== 'number') continue;
    const group = groups?.[row];
    leaves.push({ group: typeof group === 'string' ? group : '', label, value });
  }
  return leaves;
}

interface RenderTile {
  markId: string;
  kind: 'group' | 'leaf';
  label: string;
  value: number;
  /** The tile's base hue (its group's), stamped by the engine's colour scale. */
  color: string;
  shade: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Group only: bottom of the saturated header band (which carries the name and the hit). */
  headerY1: number;
}

/** Reads the compiled dataset back into group cells and leaf tiles — the render-half inverse of compile. */
function readTiles(data: Dataset): { groups: RenderTile[]; leaves: RenderTile[] } {
  const groups: RenderTile[] = [];
  const leaves: RenderTile[] = [];
  const toTile = (observation: Observation, kind: 'group' | 'leaf'): RenderTile => ({
    markId: readAuthoredString(observation, TREEMAP_COLUMNS.markId),
    kind,
    label: readAuthoredString(observation, TREEMAP_COLUMNS.label),
    value: readAuthoredNumber(observation, TREEMAP_COLUMNS.value),
    color: getColor(observation) ?? FALLBACK_COLOR,
    shade: readAuthoredNumber(observation, TREEMAP_COLUMNS.shade),
    x0: readAuthoredNumber(observation, TREEMAP_COLUMNS.x0),
    y0: readAuthoredNumber(observation, TREEMAP_COLUMNS.y0),
    x1: readAuthoredNumber(observation, TREEMAP_COLUMNS.x1),
    y1: readAuthoredNumber(observation, TREEMAP_COLUMNS.y1),
    headerY1: readAuthoredNumber(observation, TREEMAP_COLUMNS.headerY1),
  });

  for (const observation of data) {
    switch (readAuthoredString(observation, TREEMAP_COLUMNS.kind)) {
      case 'group':
        groups.push(toTile(observation, 'group'));
        break;
      case 'leaf':
        leaves.push(toTile(observation, 'leaf'));
        break;
    }
  }
  return { groups, leaves };
}

/**
 * The cursor query over the tiles — a leaf rect first (leaves sit inside their group), then a group's
 * header band (the only part of a group cell that takes the hit; its body is the leaves). The renderer
 * memoizes this on `layer.data`, so the read above runs once per data change, not per cursor move.
 */
function buildTreemapTester({ groups, leaves }: { groups: RenderTile[]; leaves: RenderTile[] }): RenderHitTester {
  return (cursor) => {
    for (const leaf of leaves) {
      if (cursor.x >= leaf.x0 && cursor.x <= leaf.x1 && cursor.y >= leaf.y0 && cursor.y <= leaf.y1) {
        return { key: leaf.markId };
      }
    }
    for (const group of groups) {
      if (cursor.x >= group.x0 && cursor.x <= group.x1 && cursor.y >= group.y0 && cursor.y <= group.headerY1) {
        return { key: group.markId };
      }
    }
    return null;
  };
}

/** A leaf reads as its group's hue, lightened for smaller values; a group reads as the saturated hue. */
function tileFill(tile: RenderTile): string {
  return tile.kind === 'group' ? tile.color : lightenCss(tile.color, (1 - tile.shade) * 0.55);
}

// Unit-fraction thresholds for label culling — proportional to the panel, so they adapt under resize.
const GROUP_LABEL_MIN_WIDTH = 0.05;
const LEAF_LABEL_MIN_WIDTH = 0.045;
const LEAF_LABEL_MIN_HEIGHT = 0.035;
const LEAF_VALUE_MIN_WIDTH = 0.07;
const LEAF_VALUE_MIN_HEIGHT = 0.08;

interface UnitBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * A nested SVG viewport occupying a tile's unit-space box, placed in panel-relative percentages. Its
 * children live in the tile's OWN coordinate space — `100%` fills the box, `50%` is its centre — and
 * are clipped to the box (a nested SVG hides overflow by default). Glyphs keep their shape because the
 * box carries no distorting scale.
 */
const TileSvg = ({ box, children }: { box: UnitBox; children: ReactNode }) => (
  <svg
    x={toPercent(box.x0)}
    y={toPercent(box.y0)}
    width={toPercent(box.x1 - box.x0)}
    height={toPercent(box.y1 - box.y0)}
    overflow="hidden"
    pointerEvents="none"
  >
    {children}
  </svg>
);

/** Group name, padded in from the band's left edge and vertically centered in it; white for contrast. */
const GroupLabel = ({ label }: { label: string }) => (
  <text x={5} y="50%" textAnchor="start" dominantBaseline="middle" fontSize={11} fontWeight={600} fill="#fff">
    {label}
  </text>
);

function fitsLabel(width: number, height: number, minWidth: number, minHeight: number): boolean {
  return width >= minWidth && height >= minHeight;
}

/** Leaf label (name, plus value when the tile is large enough), centered in the tile, culled when small. */
const LeafLabel = ({ leaf }: { leaf: RenderTile }) => {
  const width = leaf.x1 - leaf.x0;
  const height = leaf.y1 - leaf.y0;
  if (!fitsLabel(width, height, LEAF_LABEL_MIN_WIDTH, LEAF_LABEL_MIN_HEIGHT)) return null;
  const showValue = fitsLabel(width, height, LEAF_VALUE_MIN_WIDTH, LEAF_VALUE_MIN_HEIGHT);
  return (
    <>
      <text
        x="50%"
        y="50%"
        dy={showValue ? -5 : 0}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fill="#1f2937"
      >
        {leaf.label}
      </text>
      {showValue && (
        <text
          x="50%"
          y="50%"
          dy={10}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9.5}
          fill="rgba(31, 41, 55, 0.62)"
        >
          {leaf.value.toLocaleString()}
        </text>
      )}
    </>
  );
};

/** A group cell: its saturated header band fills the band box, the group name clipped to it. */
const TreemapGroupCell = ({ group }: { group: RenderTile }) => (
  <TileSvg box={{ x0: group.x0, y0: group.y0, x1: group.x1, y1: group.headerY1 }}>
    <rect width="100%" height="100%" fill={group.color} />
    {group.x1 - group.x0 >= GROUP_LABEL_MIN_WIDTH && <GroupLabel label={group.label} />}
  </TileSvg>
);

/** A leaf tile: rect fills the tile box, name/value centred in it, clipped so a label never bleeds. */
const TreemapLeafTile = ({ leaf }: { leaf: RenderTile }) => (
  <TileSvg box={leaf}>
    <rect width="100%" height="100%" fill={tileFill(leaf)} />
    <LeafLabel leaf={leaf} />
  </TileSvg>
);

const TreemapLayer = ({ layer }: { layer: CompiledLayer }) => {
  const { groups, leaves } = useMemo(() => readTiles(layer.data), [layer.data]);

  return (
    <>
      {groups.map((group) => (
        <TreemapGroupCell key={group.markId} group={group} />
      ))}
      {leaves.map((leaf) => (
        <TreemapLeafTile key={leaf.markId} leaf={leaf} />
      ))}
    </>
  );
};

/** Repaints the hovered leaf tile or the hovered group header band, above the base layer. */
const TreemapHighlight = ({ layer, observation }: { layer: CompiledLayer; observation: Observation }) => {
  const { groups, leaves } = useMemo(() => readTiles(layer.data), [layer.data]);
  const markId = readAuthoredString(observation, TREEMAP_COLUMNS.markId);

  const group = groups.find((candidate) => candidate.markId === markId);
  if (group) {
    return <TreemapGroupCell group={group} />;
  }

  const leaf = leaves.find((candidate) => candidate.markId === markId);
  if (leaf) {
    return <TreemapLeafTile leaf={leaf} />;
  }
  return null;
};

export const kit = createGraphyKit({
  plugins: [
    defineGeomRenderer(new TreemapGeom(), {
      coord: 'cartesian',
      render: ({ layer }) => <TreemapLayer layer={layer} />,
      hitTest: ({ layer }) => buildTreemapTester(readTiles(layer.data)),
      renderHover: ({ layer, primary }) => <TreemapHighlight layer={layer} observation={primary.observation} />,
      renderHoverCompanions: () => null,
    }),
  ],
});
```

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react-renderer';
import { config, type Data } from '@graphysdk/viz-engine';
import { kit } from './treemap';

const marketCap: Data = {
  columns: [{ key: 'group' }, { key: 'label' }, { key: 'value' }],
  rows: [
    { group: 'Technology', label: 'Apple', value: 3300 },
    { group: 'Technology', label: 'Microsoft', value: 3100 },
    { group: 'Technology', label: 'Nvidia', value: 2900 },
    { group: 'Consumer', label: 'Amazon', value: 2000 },
    { group: 'Consumer', label: 'Tesla', value: 800 },
    { group: 'Financials', label: 'Berkshire', value: 900 },
    { group: 'Financials', label: 'JPMorgan', value: 650 },
    { group: 'Energy', label: 'Saudi Aramco', value: 1800 },
    { group: 'Energy', label: 'Exxon', value: 520 },
  ],
};

// `color` maps to the real `group` column, so the engine's categorical scale gives each group one hue.
// The legend is suppressed: each group cell already carries its name in a header band.
const treemapSpec = kit.pipe(
  kit.createSpec({}),
  kit.geom.treemap({ aes: { group: 'group', label: 'label', value: 'value', color: 'group' } }),
  config({ legend: { position: 'none' } })
);

export const TreemapGraph = () => (
  <kit.GraphProvider input={treemapSpec} data={marketCap}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Adapting

- The `*_COLUMNS` constant is the whole compile→render contract: change the layout output, add a column there, write it in `compile()`, read it in `readTiles`. Non-scalar geometry must ride as JSON strings (the dataset stores scalars only — see the voronoi recipe).
- `identityKey: { variable: markId }` plus the `hitTest` factory returning `{ key }` is what wires hover; keep mark ids stable across recompiles or hover will flicker on data updates.
- Swap `computeTreemapLayout` for any other space-filling layout (icicle, circle packing); only the layout module and the tile paint change — hit-testing stays a rect/containment scan over the emitted geometry.
- The `hitTest` factory is the declarative path; a geom that renders its own pointer surface can instead call `useGeomHitTest(layer.id, tester)` directly inside its render component.
- The geom declares no `resolveAnchorPosition`, so the chart reports `MISSING_ANCHOR_CAPABILITY` (a warning; paint and hover are unaffected) and annotations cannot attach to its marks. Implement `resolveAnchorPosition(observation, context)` returning the normalized `[0, 1]` panel point an annotation belongs at — a tile's centre, or its top edge for a callout — to make the marks annotatable and give the editor overlay a creation trigger on them.
- The label and tile hex constants (`#fff`, `#1f2937`, `rgba(31, 41, 55, 0.62)`) sit outside the style cascade: the value readers expose the data tier only, so a user's `styles` overrides and the built-in defaults do not reach these marks and they hold their hex under `colorScheme="dark"` while the built-in layers flip. Expose them as geom params so a spec can set them per chart. See `reference/styling.md`.
- `d3-hierarchy` is a user-installed dependency: `npm i d3-hierarchy` plus `@types/d3-hierarchy` for TypeScript.
