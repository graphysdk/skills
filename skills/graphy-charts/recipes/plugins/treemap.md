# Treemap

A two-level treemap: groups squarified across the panel, each group's leaves squarified into its cell under a header band. Tile area is proportional to value. Use it for part-of-whole data with a group column, or without one for a flat treemap.

## Usage

```tsx
import { config, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './treemap-geom';

const marketCap: Data = {
  columns: [{ key: 'sector' }, { key: 'company' }, { key: 'value' }],
  rows: [
    { sector: 'Technology', company: 'Apple', value: 3300 },
    { sector: 'Technology', company: 'Microsoft', value: 3100 },
    { sector: 'Technology', company: 'Nvidia', value: 2900 },
    { sector: 'Technology', company: 'Alphabet', value: 2100 },
    { sector: 'Consumer', company: 'Amazon', value: 2000 },
    { sector: 'Consumer', company: 'Tesla', value: 800 },
    { sector: 'Consumer', company: 'Walmart', value: 620 },
    { sector: 'Financials', company: 'Berkshire', value: 900 },
    { sector: 'Financials', company: 'JPMorgan', value: 650 },
    { sector: 'Financials', company: 'Visa', value: 560 },
    { sector: 'Healthcare', company: 'Eli Lilly', value: 820 },
    { sector: 'Healthcare', company: 'UnitedHealth', value: 520 },
    { sector: 'Energy', company: 'Saudi Aramco', value: 1800 },
    { sector: 'Energy', company: 'Exxon', value: 520 },
  ],
};

// `color` maps the group column, so the colour scale gives each group and its leaves one hue; leaves
// lighten by value render-side. Each group cell carries its name, so the legend is hidden.
const spec = kit.pipe(
  kit.createSpec({}),
  kit.geom.treemap({ aes: { group: 'sector', label: 'company', value: 'value', color: 'sector' } }),
  config({ legend: { position: 'none' } })
);

export const TreemapGraph = () => (
  <kit.GraphProvider spec={spec} data={marketCap}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `treemap-layout.ts`.

```ts
/**
 * A two-level treemap computed in unit [0, 1] space with y = 0 at the top. Geometry comes from the
 * algorithm over the whole dataset, not from positional scales. The tiling is d3-hierarchy's
 * `treemapSquarify`: leaves are grouped, the groups squarified across the panel, and each group's leaves
 * squarified into that group's cell below a reserved header band. A single group degrades to a flat
 * treemap (no header). Tiles read squarest when the panel is square; the non-uniform [0, 1] to panel
 * stretch skews them with the panel's aspect ratio.
 */
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
  /** Inset around each group cell, as a unit fraction, so neighbouring groups stay visually separate. */
  groupGap: number;
  /** Height reserved at the top of a group cell for its name, as a unit fraction. */
  groupHeader: number;
}

/**
 * A laid-out tile in unit space. A `group` tile is a cell with a header band containing leaves; a `leaf`
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
interface TreeNode {
  group: string;
  label: string;
  value: number;
  children?: TreeNode[];
}

/**
 * Lays out a treemap from a flat list of leaves. Groups are squarified across the full unit square by
 * total value; each group's leaves are then squarified into that group's content rect (the cell inset by
 * `groupGap`, with `groupHeader` reserved for the name). Both levels are placed in descending value order.
 */
export function computeTreemapLayout(leaves: TreemapLeaf[], params: TreemapLayoutParams): LaidOutTile[] {
  const groups = aggregateGroups(leaves);
  if (groups.length === 0) return [];
  const isFlat = groups.length <= 1;

  const root = hierarchy<TreeNode>(buildHierarchy(groups, isFlat))
    .sum((node) => node.value)
    .sort((left, right) => (right.value ?? 0) - (left.value ?? 0));

  const laidRoot = treemap<TreeNode>()
    .size([1, 1])
    .tile(treemapSquarify)
    .paddingOuter((node) => (node.depth === 0 ? params.groupGap : 0))
    .paddingInner((node) => (node.depth === 0 && !isFlat ? params.groupGap * 2 : params.padding))
    .paddingTop((node) => (node.depth === 1 && !isFlat ? params.groupHeader : 0))(root);

  // A reduce, not a spread into `Math.max`: a very large group would overflow the call-argument limit.
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

/**
 * Folds leaves into groups in first-appearance order, then sorts groups (and the leaves within each) by
 * descending value, the order the squarify pass wants and the order a group's palette hue is assigned in.
 */
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

/**
 * Builds the d3 hierarchy. A flat treemap skips the group level entirely: leaves hang straight off the
 * root with no header. The group on each node is what the engine's colour scale keys on.
 */
function buildHierarchy(groups: GroupAggregate[], isFlat: boolean): TreeNode {
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

/**
 * A leaf's lightness factor within its group's hue: larger leaves stay close to the base colour, smaller
 * leaves lighten. Clamped above 0.4 so even the smallest tile keeps enough colour to read.
 */
function shadeFor(value: number, maxValue: number): number {
  if (maxValue <= 0) return 1;
  return 0.4 + 0.6 * (value / maxValue);
}
```

Save as `treemap-geom.tsx`.

```tsx
import { useMemo } from 'react';

import {
  createGraphyKit,
  defineGeomRenderer,
  Geom,
  getColor,
  lightenCss,
  type RenderHitTester,
  UnitBoxSvg,
} from '@graphysdk/react';
import type { Dataset, GeomCompileResult, GeomCompilerInput, Observation, SceneLayer } from '@graphysdk/react';
import {
  createDatasetFromKindPartitions,
  type IdentityKey,
  readAuthoredNumber,
  readAuthoredString,
  readVariableName,
} from '@graphysdk/viz-engine';

import { computeTreemapLayout, type TreemapLeaf } from './treemap-layout';

/** The column vocabulary shared by the compile half and the render half. */
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

/** Fill used only if the colour scale is absent. */
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
  // `label` and `value` are the hierarchy inputs the layout consumes, read straight from the mapped
  // columns, not scaled. `group` is a universal aesthetic, recognised without declaring, that the layout
  // reads when mapped; absent, the leaves form a single flat treemap. `color` is author-mapped, usually
  // to the same group column, so a group and its leaves get one hue.
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

  compile({ data, params, mapping }: GeomCompilerInput): GeomCompileResult {
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

    // Geometry stays in the geom's own columns, unscaled. The tooltip reads `label` and `value`. Colour is
    // not forced: the author maps `color` to the group column and the categorical scale resolves the base
    // hue; the renderer lightens each leaf within it by `shade`.
    return {
      data: table,
      mapping: { label: { variable: TREEMAP_COLUMNS.label }, value: { variable: TREEMAP_COLUMNS.value } },
    };
  }
}

/** Zips the label and value (and optional group) columns into leaves, dropping rows missing a label or value. */
function readLeaves(data: Dataset, mapping: GeomCompilerInput['mapping']): TreemapLeaf[] {
  const groupVar = readVariableName(mapping.group);
  const labelVar = readVariableName(mapping.label);
  const valueVar = readVariableName(mapping.value);
  // Read untyped and filter by `typeof` below, so a mapping pointed at a wrong-typed column degrades to
  // an empty graph instead of throwing.
  const groups = groupVar && data.hasVariable(groupVar) ? data.getValues(groupVar) : null;
  const labels = labelVar && data.hasVariable(labelVar) ? data.getValues(labelVar) : [];
  const values = valueVar && data.hasVariable(valueVar) ? data.getValues(valueVar) : [];

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
  /** The tile's base hue (its group's), from the engine's colour scale. */
  color: string;
  shade: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Group only: bottom of the header band (the band that carries the name and takes the hit). */
  headerY1: number;
}

/** Reads the compiled dataset back into group cells and leaf tiles, dispatching on `kind`. */
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
 * The cursor query: a leaf rect first (leaves sit inside their group), then a group's header band (the
 * only part of a group cell that takes the hit). The renderer memoizes this on `layer.data`.
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

// Unit-fraction thresholds for hiding labels, proportional to the panel so they adapt under resize.
const GROUP_LABEL_MIN_WIDTH = 0.05;
const LEAF_LABEL_MIN_WIDTH = 0.045;
const LEAF_LABEL_MIN_HEIGHT = 0.035;
const LEAF_VALUE_MIN_WIDTH = 0.07;
const LEAF_VALUE_MIN_HEIGHT = 0.08;

/** Group name, padded in from the band's left edge and vertically centred in it. */
const GroupLabel = ({ label }: { label: string }) => (
  <text x={5} y="50%" textAnchor="start" dominantBaseline="middle" fontSize={11} fontWeight={600} fill="#fff">
    {label}
  </text>
);

function fitsLabel(width: number, height: number, minWidth: number, minHeight: number): boolean {
  return width >= minWidth && height >= minHeight;
}

/** Leaf label (name, plus value when the tile is large enough), centred in the tile, hidden when small. */
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

/**
 * A group cell: its header band fills the band box, with the group name clipped to it. The band box is the
 * label's coordinate space, so the name positions relative to the band. Used for both base and hover paint.
 */
const TreemapGroupCell = ({ group }: { group: RenderTile }) => (
  <UnitBoxSvg box={{ x0: group.x0, y0: group.y0, x1: group.x1, y1: group.headerY1 }}>
    <rect width="100%" height="100%" fill={group.color} />
    {group.x1 - group.x0 >= GROUP_LABEL_MIN_WIDTH && <GroupLabel label={group.label} />}
  </UnitBoxSvg>
);

/** A leaf tile: its rect fills the tile box and its name and value centre in it, clipped to the box. */
const TreemapLeafTile = ({ leaf }: { leaf: RenderTile }) => (
  <UnitBoxSvg box={leaf}>
    <rect width="100%" height="100%" fill={tileFill(leaf)} />
    <LeafLabel leaf={leaf} />
  </UnitBoxSvg>
);

const TreemapLayer = ({ layer }: { layer: SceneLayer }) => {
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

/** Repaints the hovered leaf tile or group header band above the base layer. */
const TreemapHighlight = ({ layer, observation }: { layer: SceneLayer; observation: Observation }) => {
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

## Notes

- Install `d3-hierarchy` (`npm install d3-hierarchy`, plus `@types/d3-hierarchy` for TypeScript).
- From `@graphysdk/viz-engine`: `createDatasetFromKindPartitions`, `readAuthoredNumber`, `readAuthoredString`, `readVariableName`, and the `IdentityKey` type. Everything else comes from `@graphysdk/react`.
- The geom declares `label` and `value` as required data aesthetics. `group` is optional: without it the leaves form one flat treemap. Map `color` to the group column for one hue per group.
- Params (`padding`, `groupGap`, `groupHeader`) are unit fractions of the panel. Tiles are squarest when the panel is square.
