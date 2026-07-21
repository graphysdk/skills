# Slots

Slots replace how one region of the chart paints. The spec still owns whether a region exists and what data it receives — an override gets the same render-ready props as the default it replaces. Pass them via the `slots` prop on `GraphRenderer`:

```ts
interface GraphSlots {
  // Layout-safe: bare components
  Header?: ComponentType<HeaderSlotProps>;
  Footer?: ComponentType<FooterSlotProps>;
  Tooltip?: ComponentType<TooltipSlotProps>;
  Grid?: ComponentType<GridSlotProps>;
  Swatch?: ComponentType<SwatchSlotProps>;
  // Layout-coupled: { render, measure }
  Legend?: SlotOverride<LegendSlotProps, (legend: FormattedLegend, ctx: SlotMeasureContext) => number>;
  Headline?: SlotOverride<HeadlineSlotProps, HeadlineMeasurer>;
  AxisTicks?: SlotOverride<AxisTicksSlotProps, (axis: FormattedAxis, ctx: SlotMeasureContext) => number>;
  AxisLabel?: SlotOverride<AxisLabelSlotProps, (axis: FormattedAxis, ctx: SlotMeasureContext) => number>;
}
```

All slot props types are exported from `@graphysdk/react-renderer`.

## Two families

| Family | Slots | Shape | Why |
|---|---|---|---|
| Layout-safe | `Header`, `Footer`, `Tooltip`, `Grid`, `Swatch` | Bare component | DOM-measured (`Header`/`Footer`), floating (`Tooltip`), or painting inside a box the layout already sized (`Grid`, `Swatch`) |
| Layout-coupled | `Legend`, `Headline`, `AxisTicks`, `AxisLabel` | `{ render, measure }` (`SlotOverride`) | The layout reserves an edge band for these regions; an override must also declare its reserved size or paint and band desync |

The export set encodes this: every layout-safe slot has an exported `Default*` component (`DefaultHeader`, `DefaultFooter`, `DefaultTooltip`, `DefaultGrid`, `DefaultSwatch`) you can wrap or delegate to; layout-coupled slots export only their props types — there is no default to wrap, you own the whole region.

### `measure` rules

- `measure` mirrors the built-in layout measurer for that region; regions you don't override keep their built-in measurer.
- **Give `measure` a stable reference** (module scope, or `useCallback`/`useMemo`). An identity that changes each render takes effect on the next paint but does not retrigger layout.
- Second argument is a `SlotMeasureContext`:
  - `measureText(text, { family, size, weight?, style? })` → `{ width, height, ascent, descent }` in CSS pixels — the same Canvas-backed measurer the built-ins use. `size` is a final pixel size.
  - `textScale` — active text-scale multiplier; multiply an em size by it to get the pixel size to measure at (a fixed px size ignores it).
- Return values: `Legend`, `AxisTicks`, `AxisLabel` return the band thickness in pixels — height for top/bottom edges, width for left/right. `Headline` supplies a full `HeadlineMeasurer`: `measureHeadline(headline, size)` → `{ width, height }` and `measureHeadlineItemWidths(headline, size)` → `number[]`.

## Slot props

### Header — `HeaderSlotProps`

| Field | Meaning |
|---|---|
| `ref` | Forward to the region's outer element — layout measures the rendered DOM to reserve space |
| `headerRect: Rect` | Position/width to paint at (`x`/`y`/`width`) |
| `mode?: GraphMode` | `'readonly'` \| `'editable'`; the default's inline title editing is internal to it — an override opts out |
| `title`, `subtitle: TextContent \| null` | Plain string or rich-text document |
| `isTitleVisible`, `isSubtitleVisible: boolean` | Visibility flags from the spec |

### Footer — `FooterSlotProps`

Same shape as Header with `footerRect`, `caption`/`isCaptionVisible`, and `source: SourceContent | null`/`isSourceVisible`. Same `ref` rule.

### Tooltip — `TooltipSlotProps`

| Field | Meaning |
|---|---|
| `content: TooltipContent` | Render-ready body: `header: string \| null` plus `rows: TooltipRow[]` — each row has `label`, `value` (formatted strings), `swatchColor`, `swatchLineType`, `geom`, `isPrimary`, `key` |

Content arrives fully formatted by the viz-engine runtime. Hit-testing, open/close, cursor tracking, pinned anchors, and positioning stay in the internal wrapper — the override paints the body only.

### Grid — `GridSlotProps`

| Field | Meaning |
|---|---|
| `axes: FormattedAxis[]` | Per-axis ticks with normalized `position` in [0,1], plus `gridVisible`, `gridLineStyle`, `gridLineWidth` |
| `panel: CompiledPanel` | Panel config incl. border edge visibility |
| `panelFrameRect`, `panelRect` | SVG-local rects; paint inside the frame, position ticks against `panelRect` |

### Swatch — `SwatchSlotProps`

| Field | Meaning |
|---|---|
| `shape: SwatchShape` | `'square' \| 'line' \| 'circle' \| 'area' \| 'slice'` — picked by the geom |
| `color: string` | Resolved series color |
| `surface: SwatchSurface` | `'legend' \| 'tooltip' \| 'headline' \| 'callout' \| 'rule-label'` |
| `label?: string` | The label the swatch accompanies |
| `lineType?: LineStyleType` | Stroke style for line/area shapes |
| `width?`, `height?: number` | The box to paint inside (defaults 12×12) |

The shape glyph is shared by the legend, tooltip, headline, callouts, and rule labels — **one Swatch override restyles it everywhere**. Switch on `surface`/`shape` and delegate the rest to `DefaultSwatch` to restyle only one context.

### Legend — `LegendSlotProps` (layout-coupled)

| Field | Meaning |
|---|---|
| `formattedLegends: FormattedLegend[]` | Each: `position`, `display` (`pill`/`direct`), `title`, `items` (with `formattedLabel`, `visual.color`, `geom`, `visual.lineType`) |
| `rects: Partial<Record<LayoutEdge, Rect>>` | The reserved band per edge (whatever your `measure` returned) |
| `textScale: number` | Active text-scale multiplier |

### Headline — `HeadlineSlotProps` (layout-coupled)

| Field | Meaning |
|---|---|
| `headline: FormattedHeadline` | `kind: 'perGroup'` (items with composed `label`, `value`, `observationLabel`, `comparison` strings — render verbatim) or `kind: 'grandTotal'` (`value`) |
| `rect: Rect` | The reserved band |
| `resolvedSize: ResolvedHeadlineSize` | Size step to paint at (also passed to your measurer) |
| `visibleItemCount: number` | Paint only the first N items; the rest would overflow the band |

### AxisTicks / AxisLabel — `AxisTicksSlotProps` / `AxisLabelSlotProps` (layout-coupled)

| Field | Meaning |
|---|---|
| `formattedAxes: FormattedAxis[]` | Per axis: `position` (edge), `geometry` (paint only `'linear'`; polar axes render elsewhere), `isVisible`, `ticks` (`value`, formatted label, normalized `position`) |
| `tickRects` / `labelRects: Partial<Record<LayoutEdge, Rect>>` | SVG-local reserved band per edge |

Tick band and axis title are **separate slots** — overriding `AxisTicks` leaves the title on `DefaultAxisLabel`, which still paints and reserves its own band.

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
    {content.header !== null && <div style={{ fontWeight: 700, marginBottom: 6 }}>{content.header}</div>}
    {content.rows.map((row) => (
      <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ opacity: 0.8 }}>{row.label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
      </div>
    ))}
  </div>
);

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

More worked examples (including an avatar `AxisTicks` override with a fixed-height `measure`) live in `apps/storybook/src/stories/features/Slots.stories.tsx`.
