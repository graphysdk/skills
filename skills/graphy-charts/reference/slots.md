# Slots

Slots replace how one region of the chart paints. The spec still owns whether a region exists and
what data it receives — an override gets the same render-ready props as the default it replaces. Pass
them via the `slots` prop on `GraphRenderer`:

```ts
interface GraphSlots {
  // Layout-safe: bare components
  Header?: ComponentType<HeaderSlotProps>;
  Footer?: ComponentType<FooterSlotProps>;
  Tooltip?: ComponentType<TooltipSlotProps>;
  Grid?: ComponentType<GridSlotProps>;
  Swatch?: ComponentType<SwatchSlotProps>;
  EditorSurface?: ComponentType<EditorSurfaceSlotProps>;
  // Layout-coupled: { render, measure }
  Legend?: SlotOverride<LegendSlotProps, (legend: FormattedLegend, ctx: SlotMeasureContext) => number>;
  Headline?: SlotOverride<HeadlineSlotProps, HeadlineMeasurer>;
  AxisTicks?: SlotOverride<AxisTicksSlotProps, (axis: FormattedAxis, ctx: SlotMeasureContext) => number>;
  AxisLabel?: SlotOverride<AxisLabelSlotProps, (axis: FormattedAxis, ctx: SlotMeasureContext) => number>;
}
```

Ten slots. All slot props types are exported from `@graphysdk/react-renderer`.

## Two families

| Family | Slots | Shape | Why |
|---|---|---|---|
| Layout-safe | `Header`, `Footer`, `Tooltip`, `Grid`, `Swatch`, `EditorSurface` | Bare component | DOM-measured (`Header`/`Footer`), floating (`Tooltip`), or painting inside a box the layout already sized (`Grid`, `Swatch`, `EditorSurface`) |
| Layout-coupled | `Legend`, `Headline`, `AxisTicks`, `AxisLabel` | `{ render, measure }` (`SlotOverride`) | The layout reserves an edge band for these regions; an override must also declare its reserved size or paint and band desync |

The export set follows the split: `DefaultHeader`, `DefaultFooter`, `DefaultTooltip`, `DefaultGrid`
and `DefaultSwatch` are exported for you to wrap or delegate to. Layout-coupled slots export their
props types only — no default is exported from the package, so you own the whole region.

`EditorSurface` is the chart's editing layer, mounted over the frame in `mode="editable"`. Its
default is a no-op; `@graphysdk/react-renderer/editable` is what fills it (see
`reference/react-api.md`). Chart building leaves it alone.

### `measure` rules

- `measure` mirrors the built-in layout measurer for that region; regions you don't override keep
  their built-in measurer.
- **Give `measure` a stable reference** (module scope, or `useCallback`/`useMemo`). An identity that
  changes each render takes effect on the next paint but does not retrigger layout.
- Second argument is a `SlotMeasureContext`:
  - `measureText(text, { family, size, weight?, style? })` → `{ width, height, ascent, descent }` in
    CSS pixels — the same Canvas-backed measurer the built-ins use. `size` is a final pixel size.
  - `textScale` — active text-scale multiplier; multiply an em size by it to get the pixel size to
    measure at (a fixed px size ignores it).
- Return values: `Legend`, `AxisTicks`, `AxisLabel` return the band thickness in pixels — height for
  top/bottom edges, width for left/right. `Headline` supplies a full `HeadlineMeasurer`:
  `measureHeadline(headline, size)` → `{ width, height }` and
  `measureHeadlineItemWidths(headline, size)` → `number[]`.

## Slot props

### Header — `HeaderSlotProps`

| Field | Meaning |
|---|---|
| `ref?: Ref<HTMLDivElement>` | Forward to the region's outer element — layout measures the rendered DOM to reserve space |
| `headerRect: Rect` | Position/width to paint at |
| `mode?: GraphMode` | `'readonly'` \| `'editable'`; the default's inline title editing is internal to it — an override opts out |
| `title`, `subtitle: TextContent \| null` | Plain string or rich-text document |
| `isTitleVisible`, `isSubtitleVisible: boolean` | Visibility flags from the spec |
| `brandMark: BrandMarkVisual` | **Required.** `'full' \| 'mini' \| 'hidden'` — the resolved "Made with Graphy" badge for header placement. `'hidden'` when the mark is off, the frame is below the minimum footprint, or the mark is placed in the footer |

Render the badge with the exported `<BrandMark visual={brandMark} placement="header" />` when it is
not `'hidden'`; an override that ignores the prop drops the badge.

### Footer — `FooterSlotProps`

Same shape with `footerRect`, `caption`/`isCaptionVisible`, `source: SourceContent | null`/
`isSourceVisible`, and its own required `brandMark: BrandMarkVisual` (`placement="footer"`). Same
`ref` rule.

### Tooltip — `TooltipSlotProps`

| Field | Meaning |
|---|---|
| `content: TooltipContent` | Render-ready body |

```ts
interface TooltipContent {
  /** Formatted main-axis value of the primary observation. `null` for polar, and whenever `comment` is set. */
  header: string | null;
  rows: TooltipRow[];
  /** Rich text of the comment annotation the pointer is over; `null` otherwise. */
  comment: RichTextContent | null;
}
```

`header` and `comment` share one slot: when the pointer is over a comment bubble, `comment` holds its
rich text and `header` is `null`. Handle both or comment bubbles paint empty. `TooltipRow` carries
`label`, `value` (formatted strings), `swatchColor`, `swatchLineType`, `geom`, `isPrimary`, `key`.

Content arrives fully formatted by the viz-engine runtime. Hit-testing, open/close, cursor tracking,
pinned anchors, and positioning stay in the internal wrapper — the override paints the body only.

### Grid — `GridSlotProps`

| Field | Meaning |
|---|---|
| `axes: FormattedAxis[]` | Per-axis ticks with normalized `position` in [0,1], plus `gridVisible` |
| `panelBorderSizes: EdgeSizes` | `Record<'top' \| 'right' \| 'bottom' \| 'left', number>` — the border thickness reserved on each edge |
| `panelFrameRect`, `panelRect` | SVG-local rects; paint inside the frame, position ticks against `panelRect` |

`gridVisible` is the only grid field on the axis: grid paint (color, stroke width, line type) comes
from the chrome style cascade — `style.gridLine`, see `reference/styling.md`.

### Swatch — `SwatchSlotProps`

| Field | Meaning |
|---|---|
| `shape: SwatchShape` | `'square' \| 'line' \| 'circle' \| 'area' \| 'slice'` — picked by the geom |
| `color: string` | Resolved series color |
| `surface: SwatchSurface` | `'legend' \| 'tooltip' \| 'headline' \| 'callout' \| 'rule-label'` |
| `label?: string` | The label the swatch accompanies |
| `lineType?: LineStyleType` | Stroke style for line/area shapes |
| `width?`, `height?: number` | The box to paint inside (defaults 12×12) |

The shape glyph is shared by the legend, tooltip, headline, callouts, and rule labels — **one Swatch
override restyles it everywhere**. Switch on `surface`/`shape` and delegate the rest to
`DefaultSwatch` (which takes `Omit<SwatchSlotProps, 'surface' | 'label'>`) to restyle only one
context.

### EditorSurface — `EditorSurfaceSlotProps`

| Field | Meaning |
|---|---|
| `frameElement: HTMLElement` | The frame's content box — the element the layer measures, listens on and aligns its chrome to |
| `panelRect: Rect` | The panel's rect within that box |

### Legend — `LegendSlotProps` (layout-coupled)

| Field | Meaning |
|---|---|
| `formattedLegends: FormattedLegend[]` | Each: `position`, `align`, `display` (`pill`/`direct`), `title`, `aesthetics`, `items` (with `formattedLabel`, `value`, `geom`, `visual.color/size/alpha/strokeWidth/lineType`, `normalizedY`) |
| `rects: Partial<Record<LayoutEdge, Rect>>` | The reserved band per edge (whatever your `measure` returned) |
| `textScale: number` | Active text-scale multiplier |

### Headline — `HeadlineSlotProps` (layout-coupled)

| Field | Meaning |
|---|---|
| `headline: FormattedHeadline` | `{ kind: 'perGroup'; items }` or `{ kind: 'grandTotal'; value: string }` |
| `rect: Rect` | The reserved band |
| `resolvedSize: ResolvedHeadlineSize` | Size step to paint at (also passed to your measurer) |
| `visibleItemCount: number` | Paint only the first N items; the rest would overflow the band |

A `perGroup` item is:

```ts
interface FormattedHeadlineItem {
  swatch: { color: string; geom: string } | null; // present only at ≥2 groups
  label: string;
  value: string | null;
  observationLabel: string | null;
  comparison: { direction: 'up' | 'down' | 'flat'; percentage: string; reference: string } | null;
}
```

`label`, `value` and `observationLabel` are final display strings — render them verbatim.
`comparison` is an **object**: read `direction`, `percentage` and `reference` off it. Dropping it into
JSX as a child throws "Objects are not valid as a React child".

### AxisTicks / AxisLabel — `AxisTicksSlotProps` / `AxisLabelSlotProps` (layout-coupled)

| Field | Meaning |
|---|---|
| `formattedAxes: FormattedAxis[]` | Per axis: `position` (edge), `geometry` (paint only `'linear'`; polar axes render elsewhere), `isVisible`, `ticksVisible`, `ticks` (`value`, `formattedLabel`, normalized `position`), `labelRotation`, `labelMaxWidthPx` |
| `tickRects` / `labelRects: Partial<Record<LayoutEdge, Rect>>` | SVG-local reserved band per edge |

Tick band and axis title are **separate slots** — overriding `AxisTicks` leaves the title on the
default axis-label renderer, which still paints and reserves its own band.

## Example: bare Tooltip + layout-coupled Legend

```tsx
import {
  DefaultSwatch,
  GraphProvider,
  GraphRenderer,
  type GraphSlots,
  type LegendSlotProps,
  type SlotMeasureContext,
  type TooltipSlotProps,
} from '@graphysdk/react-renderer';
import type { FormattedLegend } from '@graphysdk/viz-engine';

// Bare slot: paints the body; open/close and positioning stay internal.
const CustomTooltip = ({ content }: TooltipSlotProps) => (
  <div style={{ background: '#0f172a', color: '#f8fafc', padding: '10px 12px', borderRadius: 10, minWidth: 140 }}>
    {content.comment !== null && <div style={{ marginBottom: 6 }}>{textOf(content.comment)}</div>}
    {content.header !== null && <div style={{ fontWeight: 700, marginBottom: 6 }}>{content.header}</div>}
    {content.rows.map((row) => (
      <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ opacity: 0.8 }}>{row.label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
      </div>
    ))}
  </div>
);

// `comment` is a rich-text document; flatten it or render it with your own renderer.
const textOf = (node: { text?: string; content?: Array<{ text?: string }> }): string =>
  node.text ?? (node.content ?? []).map((child) => child.text ?? '').join('');

const LEGEND_FONT = { family: 'Inter', size: 12, weight: 500 } as const;
const LEGEND_PADDING_Y = 8;

// Layout-coupled slot, part 1: paint inside the reserved band.
const CustomLegend = ({ formattedLegends, rects }: LegendSlotProps) => (
  <>
    {formattedLegends.map((legend, index) => {
      const rect = rects[legend.position];
      if (!rect) return null;
      return (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            font: `${LEGEND_FONT.weight} ${LEGEND_FONT.size}px ${LEGEND_FONT.family}, sans-serif`,
          }}
        >
          {legend.items.map((item) => (
            <span key={String(item.value)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <DefaultSwatch shape="square" color={item.visual.color ?? 'currentColor'} />
              {item.formattedLabel}
            </span>
          ))}
        </div>
      );
    })}
  </>
);

// Part 2: the reserved band size, from the same font the paint uses.
// Module scope keeps the reference stable so layout reacts to it.
const measureCustomLegend = (legend: FormattedLegend, { measureText }: SlotMeasureContext): number => {
  const tallestLabel = legend.items.reduce(
    (max, item) => Math.max(max, measureText(item.formattedLabel, LEGEND_FONT).height),
    0
  );
  return tallestLabel + LEGEND_PADDING_Y * 2;
};

const slots: GraphSlots = {
  Tooltip: CustomTooltip,
  Legend: { render: CustomLegend, measure: measureCustomLegend },
};

export const StyledChart = () => (
  <GraphProvider data={data} input={input}>
    <GraphRenderer slots={slots} />
  </GraphProvider>
);
```
