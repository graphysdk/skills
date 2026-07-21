<!-- GENERATED FILE — do not edit. -->

# Type reference

Generated from `@graphysdk/viz-engine@0.0.1-alpha.20260721093629` and `@graphysdk/react-renderer@0.0.1-alpha.20260721093629`.

> The exact public chart-authoring API, extracted verbatim (with JSDoc) from the
> built `.d.ts` of `@graphysdk/viz-engine` and `@graphysdk/react-renderer`.
> Check precise signatures, option keys, and accepted values here; see
> `spec-api.md` for how the pieces compose. Every type these declarations
> reference is defined in this file, most under "Supporting types" at the
> end. The only opaque names are compiled/internal shapes an author never constructs: CompiledAxisGuide, CompiledGeom, CompiledLayerOf, CompiledLegendGuide, CompiledPanel, CompiledStat, CreateGraphyBuilderOptions, DiagnosticsCollector, GeomCompilerInput, GeomSummaries, GraphyBuilder, HeadlineMeasurer, LayerInputOf, Observation, StatCompilerInput, TextMeasurer, TransformStrategy.

## Core & data

```ts
/**
 * Data to visualize. Structured as a table.
 *
 * The public-API contract. Row values must be {@link DataValue} (string, number,
 * Date, or null). Internal entry points (e.g. the dataset parser) accept a
 * looser row type — see {@link RawData} — because they must defensively handle
 * malformed input.
 */
interface Data {
    /**
     * Column definitions. Every column is an object with a stable `key` that matches the keys used in each row and an optional `label` to show in the UI.
     */
    columns: Array<{
        /** Unique, stable identifier. */
        key: string;
        /** Friendly label for the column. */
        label?: string;
        /* Excluded from this release type: _metadata */
    }>;
    /**
     * Data rows. Each row object must contain keys that match `columns[i].key`.
     */
    rows: Array<Record<string, DataValue>>;
    /* Excluded from this release type: _metadata */
}

/** The smallest unit of data in the dataset. `null` represents a missing value. */
type DataValue = number | string | Date | null;

/** The type of a variable's values. Internally, numeric values are stored as numbers, dates as Date objects and categorical values as strings. */
type DataType = 'numeric' | 'categorical' | 'temporal';

/** A type alias for variable names. */
type VariableName = string;

/** One of the BCP-47 locale strings the engine supports for number and date formatting. */
type Locale = (typeof LOCALES)[number];

/**
 * The canonical spec type — plain JSON, serializable. Data is provided separately
 * (as a `Data` value to {@link compile}, or as a prop to `<GraphProvider>`).
 */
interface SpecInput {
    mapping: AesMapping;
    layers: LayerInput[];
    scales: ScaleInput[];
    transforms: AnyTransformInput[];
    highlights: HighlightInput[];
    annotations?: AnnotationsInput;
    coords?: CoordInput;
    config: ConfigInput;
}

/** Data is passed as a separate argument. */
type CompilerInput = SpecInput;

type GraphTheme = 'light' | 'dark';
```

## Spec builders

```ts
/**
 * Fold a sequence of pipeable spec items onto an existing spec, left to right, returning a new spec.
 * Each item is appended by kind: layers accumulate (call `geom.*` once per mark), scales accumulate,
 * `config` deep-merges, `coord`/`mapping` overwrite/merge. The usual shape is
 * `pipe(createSpec({...}), geom.x(), scale.x(), scale.y(), ...)`.
 *
 * @example
 * pipe(createSpec({ x: 'month', y: 'sales', color: 'region' }), geom.line(), scale.x(), scale.y(), scale.color.palette());
 */
function pipe(spec: SpecInput, ...items: SpecItem[]): SpecInput;

/**
 * Seed a spec — the entry point for every chart. The first argument may be a bare {@link AesMapping}
 * (`{ x, y, color, ... }`), which becomes the spec's global aesthetic mapping; any further arguments are
 * pipeable spec items (geoms, scales, coords, transforms, config, ...) folded on in order.
 *
 * This is the builder pattern: `createSpec` seeds the mapping, then `pipe` (or extra args here) folds each
 * item onto an immutable spec, accumulating layers/scales/etc. Always declare `scale.x()` / `scale.y()` for
 * any position mapping — they are NOT auto-inferred and yield NaN positions if omitted.
 *
 * @example
 * import { createSpec, pipe, geom, scale } from '@graphysdk/viz-engine';
 *
 * // Most common: mapping first, then pipe the rest.
 * const spec = pipe(createSpec({ x: 'category', y: 'revenue' }), geom.bar(), scale.x(), scale.y());
 *
 * @example
 * import { createSpec, transform, mapping, geom, scale } from '@graphysdk/viz-engine';
 *
 * // All-in-one form, clearer when a transform must run before the mapping is read.
 * const spec = createSpec(
 *   transform.reshape({ reshape: ['revenue'], keyName: 'metric', valueName: 'amount' }),
 *   mapping({ x: 'month', y: 'amount', color: 'metric' }),
 *   geom.bar(),
 *   scale.x(),
 *   scale.y(),
 * );
 */
function createSpec(...items: Array<AesMapping | SpecItem>): SpecInput;

/**
 * Create a pipeable mapping spec item.
 *
 * @example
 * createSpec(
 *   data,
 *   transform.reshape({ reshape: ['revenue'], keyName: 'metric', valueName: 'amount' }),
 *   mapping({ x: 'month', y: 'amount', color: 'metric' }),
 *   geom.bar(),
 * )
 */
function mapping(aes: AesMapping): MappingItem;

/** Factories for the geom layers a graph can draw (point, line, area, bar, rule). */
const geom: {
    point: typeof point;
    line: typeof line;
    area: typeof area;
    bar: typeof bar;
    rule: typeof rule;
};

/**
 * Builders for the scale of each aesthetic (`scale.x`, `scale.y`, `scale.color`, ...). Position aesthetics
 * are callable directly to infer the scale type from the data (`scale.x()`); every aesthetic also exposes
 * explicit methods (`scale.x.continuous()`, `scale.color.palette()`). `Object.assign` gives `x`/`y` both
 * forms — color, size, etc. have no inferred shorthand, so they stay dot-access only. Position scales are
 * never auto-created — declare one for every mapped position aesthetic.
 */
const scale: ScaleAPI;

/** Builders for the graph's coordinate system. Pass the result as the spec's `coord` to choose cartesian, flipped, or polar. */
const coord: {
    /**
     * Standard cartesian (x-y) coordinate system. This is the default if no coord is specified.
     *
     * @example coord.cartesian() // auto-scaled axes
     * @example coord.cartesian({ yLimits: [0, 100] }) // fixed y-axis
     */
    cartesian: (params?: Partial<CartesianCoordParams>) => CartesianCoordInput;
    /**
     * Flipped cartesian coordinates — swaps x and y axes.
     * Useful for horizontal bar charts or when category labels are long.
     *
     * @example coord.flip() // horizontal bars
     */
    flip: (params?: Partial<FlipCoordParams>) => FlipCoordInput;
    /**
     * Polar coordinate system — maps data to angle (theta) and radius.
     * Used for pie charts, donut charts, and radar/radial visualizations.
     *
     * @example coord.polar() // pie chart
     * @example coord.polar({ innerRadius: 0.5 }) // donut chart
     */
    polar: (params?: Partial<PolarCoordParams>) => PolarCoordInput;
};

/** Factories for the stats a layer can apply (identity, count, smooth, mean). */
const stat: {
    identity: typeof identity;
    count: typeof count;
    smooth: typeof smooth;
    mean: typeof mean;
};

/** Factories for data transforms applied before charting (reshape, filter, sort, aggregate, constant). */
const transform: {
    reshape: typeof reshape;
    filter: typeof filter;
    sort: typeof sort;
    aggregate: typeof aggregate;
    constant: typeof constant;
};

/**
 * Create a pipeable highlight spec item.
 *
 * @example
 *   pipe(
 *     createSpec(data, { x: 'month', y: 'revenue', color: 'region' }),
 *     geom.bar(),
 *     highlight({ variable: 'region', eq: 'EU' }),
 *     highlight({ variable: 'region', eq: 'US' }, { scope: 'series' }),
 *   )
 */
function highlight(predicate: Predicate, options?: HighlightBuilderOptions): HighlightInput;

/**
 * Builder for the built-in annotation kinds — the pipeable counterpart to setting the `annotations`
 * field by hand. Each method returns an {@link AnnotationItem}; piped into `createSpec`/`pipe` it appends
 * to the matching {@link AnnotationsInput} field, so annotations compose left-to-right like every other
 * spec feature (geoms, scales, highlights). Multiple calls of the same kind accumulate.
 *
 * @example
 *   import { pipe, createSpec, geom, scale, annotation } from '@graphysdk/viz-engine';
 *
 *   pipe(
 *     createSpec({ x: 'month', y: 'revenue', color: 'region' }),
 *     geom.line(),
 *     scale.x.discrete(),
 *     scale.y(),
 *     scale.color.palette(),
 *     annotation.differenceArrow({
 *       start: { anchorValue: 'Jan', groupValue: 'North' },
 *       end: { anchorValue: 'Jun', groupValue: 'North' },
 *       label: 'relative-difference',
 *     }),
 *     annotation.shape({
 *       region: { anchorType: 'panel', x: 0, y: 0.7, width: 1, height: 0.3 },
 *       fillColor: '#e15759',
 *       fillOpacity: 0.12,
 *     }),
 *   );
 */
const annotation: {
    /** A labelled delta between two data observations — reads the measured gap between them. */
    differenceArrow(input: DifferenceArrowInput): AnnotationItem;
    /** A shaded box. */
    shape(input: ShapeInput): AnnotationItem;
    /** An arrow shaped annotation. */
    arrow(input: ArrowInput): AnnotationItem;
    /** A free-standing rich-text label positioned. */
    text(input: TextAnnotationInput): AnnotationItem;
    /** An image whose area is positioned. */
    image(input: ImageAnnotationInput): AnnotationItem;
    /** A sticker whose area is positioned */
    sticker(input: StickerAnnotationInput): AnnotationItem;
    /** A marker dot pinned to a single observation. */
    pinnedNumber(input: PinnedNumberAnnotationInput): AnnotationItem;
    /** A marker dot pinned to a single observation, carrying rich-text content. */
    comment(input: CommentAnnotationInput): AnnotationItem;
};

/** Wraps partial config options into a tagged `ConfigItem` for inclusion in a spec, canonicalising gap overrides so config items deep-merge cleanly. */
function config(options: ConfigInput): ConfigItem;
```

## Mapping & layers

```ts
/**
 * Maps each aesthetic to a variable or constant value. The built-in channels (x, y, color, …) keep
 * exact types and autocomplete; the index signature also admits a geom's **custom positional
 * aesthetics** — an OHLC candlestick's `open`/`high`/`low`/`close` — which the geom declares on its
 * position contract and the engine then trains and scales like a built-in channel.
 */
interface AesMapping extends KnownAesthetics {
    [aesthetic: string]: AestheticValue | undefined;
}

/** Name of a built-in aesthetic that can be mapped, such as `'x'` or `'color'`. */
type AestheticKey = keyof KnownAesthetics;

/**
 * Discriminated union of all layer inputs, keyed on `geom`. The built-in arms stay exactly typed;
 * the {@link CustomGeomLayerInput} arm admits a plugin geom carrying a name outside {@link GeomName}.
 * This is the user-facing type — fields are optional and will be resolved with defaults.
 */
type LayerInput = {
    [G in GeomName]: LayerInputOf<G>;
}[GeomName] | CustomGeomLayerInput;

/**
 * A layer for a custom (plugin-contributed) geom. Its `geom` is a name outside {@link GeomName},
 * resolved downstream through the geom registry; `params` are validated at the typed builder call
 * site, so the node itself carries them as an open record.
 */
interface CustomGeomLayerInput extends LayerInputBase {
    geom: string;
    params?: Record<string, unknown>;
}
```

## Transforms & stats

```ts
/**
 * Discriminated union of the built-in transform inputs, keyed on `transformType`. Use
 * {@link AnyTransformInput} where a plugin-contributed transform may also appear.
 */
type TransformInput = ReshapeTransformInput | FilterTransformInput | SortTransformInput | AggregateTransformInput | ConstantTransformInput;

/***************************************************************
 * Transform Input
 ***************************************************************/
/**
 * The input node a custom (plugin-contributed) transform builder produces.
 */
interface CustomTransformInput<Name extends string = string> {
    type: 'transform';
    transformType: Name;
    options?: Record<string, unknown>;
}

/**
 * Statistical transformation applied to data before rendering.
 *
 * - `'identity'` — No transformation, data passed through unchanged
 * - `'count'` — Count the number of observations per x-axis value
 * - `'smooth'` — Fit a regression curve through `(x, y)` and emit the fitted points
 * - `'mean'` — Reduce the dataset to a single observation holding the mean of `y`
 */
type StatName = 'identity' | 'count' | 'smooth' | 'mean';

/**
 * Regression methods supported by the `smooth` stat.
 */
type SmoothMethod = 'linear' | 'loess' | 'exponential' | 'logarithmic' | 'quadratic' | 'power' | 'polynomial';

/**
 * The input node a custom (plugin-contributed) stat builder produces.
 */
interface CustomStatInput<Name extends string = string> {
    type: Name;
}
```

## Config

```ts
/**
 * Feature configuration with resolved defaults.
 * All fields are required and always populated after resolution.
 */
interface ConfigSpec {
    /**
     * Locale used to interpret source values and, by default, to format display
     * output (axis labels, tooltips, numbers). Pass `formattingLocale` to a
     * `format*` helper to override display only. It resolves to
     * `formattingLocale ?? parsingLocale`. The `duration` format is always
     * English regardless of locale.
     */
    parsingLocale: Locale;
    legend: LegendConfig;
    axes: AxesConfig;
    panel: PanelConfig;
    headline: HeadlineConfig;
    numberFormat: NumberFormatConfig;
    content: ContentConfig;
    appearance: AppearanceSpec;
    layout: LayoutConfig;
}

/** Named gradient presets available to `border.type === 'preset'`. */
const BORDER_PRESETS: readonly ["lilac", "neon_pink", "blackberry", "sun", "iceland", "sunset", "ultraviolet", "purple", "ice_cream", "mint", "cool", "fresh"];
```

## Highlights

```ts
/**
 * User-facing highlight definition. `id` is auto-assigned by the resolver when
 * omitted. `layerIndex` is an authoring handle that the resolver normalises to
 * the layer's stable `id`; omit to evaluate against every layer.
 */
interface HighlightInput {
    type: 'highlight';
    id?: string;
    predicate: Predicate;
    scope?: HighlightScope;
    layerIndex?: number;
}
```

## Annotations

```ts
/** All annotations attached to a graph, as user-facing input. */
interface AnnotationsInput {
    differenceArrows?: DifferenceArrowInput[];
    shapes?: ShapeInput[];
    freeformArrows?: ArrowInput[];
    textAnnotations?: TextAnnotationInput[];
    images?: ImageAnnotationInput[];
    stickers?: StickerAnnotationInput[];
    pinnedNumbers?: PinnedNumberAnnotationInput[];
    comments?: CommentAnnotationInput[];
}
```

## Scales & palettes

```ts
/**
 * Sparse override map.  Keys are group numbers (1-indexed), values are either a raw
 * hex value, or a color id to look up in the active custom palette.
 *
 * Indexes that are not specified fallback to the palette default.
 *
 * If both are set, `hex` wins.  If `id` is set but not found in the active custom palette,
 * the override is ignored.
 */
type PaletteOverridesInput = Record<number, {
    hex?: string;
    id?: string;
}>;

type CustomPalettesInput = Record<string, CustomPaletteColor[]>;

/** The hues available as a base for monochrome palettes, in pick order. */
const MONO_BASES: readonly ["grey", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"];

/** The hues available as a base for neon palettes, in pick order. */
const NEON_BASES: readonly ["cyan", "pink", "purple", "red", "orange", "yellow", "green", "blue"];

/** Series colors used when a chart specifies no palette. Cycled in order as series count grows. */
const DEFAULT_COLOR_PALETTE: string[];
```

## Diagnostics

```ts
/**
 * The serialisable, normalised form of any error or warning. Every failure the engine surfaces —
 * fatal errors, batched validation problems, and advisory warnings — is a `VizDiagnostic`; there is
 * no second shape. Attachable to a bug report wholesale, and the unit codegen reads.
 */
interface VizDiagnostic extends DiagnosticDetails {
    severity: VizErrorSeverity;
    kind: VizErrorKind;
    code: VizErrorCode;
}

/**
 * One user-input problem authored once and used three ways: pushed onto the collector as a warning
 * ({@link DiagnosticsCollector.addWarning}) or a batched error
 * ({@link DiagnosticsCollector.addError}), or thrown as a {@link UserInputError}. `kind` is
 * never restated — it is implied by the partitioned `code`, so it cannot drift from it.
 */
interface UserInputIssue extends DiagnosticDetails {
    code: UserInputErrorCode;
}
```

## Provider & renderer

```ts
/** Props for {@link GraphProvider}: the data and spec input to compile, plus theme, locale and plugin wiring. */
interface GraphProviderProps {
    data: Data;
    input: CompilerInput;
    /**
     * Custom geoms, stats, and transforms (and their render halves) registered for this graph. Seeds
     * the compiler and builds the per-provider render resolver from one array. Construction-time config,
     * frozen at mount — change the registered set by remounting (React `key`); `data`/`input`/`theme`
     * stay reactive.
     */
    plugins?: readonly Plugin_2[];
    formattingLocale?: Locale;
    onChange?: (next: CompilerInput) => void;
    /** Fires with the compile failure(s) whenever a compile/recompile/dispatch produces errors. */
    onError?: (errors: VizDiagnostic[]) => void;
    /** Fires with any warnings a successful compile produced. */
    onWarnings?: (warnings: VizDiagnostic[]) => void;
    theme?: GraphTheme;
    themeOverrides?: ThemeOverrides;
    customPalettes?: CustomPalettesInput;
    fontList?: FontListInput;
    children: ReactNode;
}

/** Props for {@link GraphRenderer}: container sizing, interaction toggles and per-region slot overrides. */
interface GraphRendererProps {
    /** Controls how the graph responds to its container size. Defaults to filling the parent container. */
    sizing?: GraphSizing;
    /** Callback invoked when the graph's container is resized. Fires in every sizing mode. */
    onResize?: ResizeObserverOnResize;
    isAnimated?: boolean;
    showTooltips?: boolean;
    mode?: GraphMode;
    /** Per-region component overrides. Unspecified regions render their default. */
    slots?: GraphSlots;
}

/** Controls how the graph claims space in its container. */
type GraphSizing = {
    mode: 'responsive';
} | {
    mode: 'fixed';
    width: number;
    height: number;
} | {
    mode: 'keepAspectRatio';
    intrinsicWidth: number;
    intrinsicHeight: number;
} | {
    mode: 'keepAspectRatio';
    intrinsicWidth: number;
    aspectRatio: number;
} | {
    mode: 'keepAspectRatio';
    intrinsicHeight: number;
    aspectRatio: number;
};
```

## Theme tokens

```ts
/**
 * A partial set of token values layered over a base theme — the shape of the `themeOverrides`
 * prop. Measured font tokens take a {@link FontTokenOverride}; every other token takes its CSS
 * string value.
 */
type ThemeOverrides = Partial<Omit<ThemeValues, MeasuredFontTokenKey>> & {
    [Key in MeasuredFontTokenKey]?: FontTokenOverride;
};

/** Every theme token mapped to its resolved CSS string value. */
type ThemeValues = Record<keyof typeof vars, string>;
```

## Slots

```ts
/**
 * Region overrides for `GraphRenderer`. A slot replaces how one region paints; the viz-engine `Spec`
 * still owns whether a region exists and what data it receives, and an override gets the same
 * render-ready props as its default.
 *
 * Layout-safe regions (`Header`, `Footer`, `Tooltip`, `Grid`, `Swatch`) are bare components —
 * DOM-measured, reserving no edge space or painting inside a box the layout already sized.
 * Layout-coupled regions (`AxisTicks`, `AxisLabel`, `Legend`, `Headline`) are
 * {@link SlotOverride}s that also declare their reserved size via `measure`, else paint and the
 * reserved band desync. The tick and title bands are separate slots so overriding one leaves the other
 * on its default.
 */
interface GraphSlots {
    Header?: ComponentType<HeaderSlotProps>;
    Footer?: ComponentType<FooterSlotProps>;
    Tooltip?: ComponentType<TooltipSlotProps>;
    Grid?: ComponentType<GridSlotProps>;
    Swatch?: ComponentType<SwatchSlotProps>;
    Legend?: SlotOverride<LegendSlotProps, (legend: FormattedLegend, ctx: SlotMeasureContext) => number>;
    Headline?: SlotOverride<HeadlineSlotProps, HeadlineMeasurer>;
    AxisTicks?: SlotOverride<AxisTicksSlotProps, (axis: FormattedAxis, ctx: SlotMeasureContext) => number>;
    AxisLabel?: SlotOverride<AxisLabelSlotProps, (axis: FormattedAxis, ctx: SlotMeasureContext) => number>;
}

/**
 * Props for the Header slot, overridable via `slots.Header` on `GraphRenderer`. Title editing in
 * `editable` mode is internal to this default; an override replacing the region opts out of it.
 */
interface HeaderSlotProps {
    /** Forward this to the region's outer element — the layout measures the rendered DOM to reserve its space. */
    ref?: React.Ref<HTMLDivElement>;
    headerRect: Rect;
    mode?: GraphMode;
    title: TextContent | null;
    isTitleVisible: boolean;
    subtitle: TextContent | null;
    isSubtitleVisible: boolean;
}

/**
 * Props for the Footer slot, overridable via `slots.Footer` on `GraphRenderer`. Caption editing in
 * `editable` mode is internal to this default; an override replacing the region opts out of it.
 */
interface FooterSlotProps {
    /** Forward this to the region's outer element — the layout measures the rendered DOM to reserve its space. */
    ref?: React.Ref<HTMLDivElement>;
    footerRect: Rect;
    mode?: GraphMode;
    caption: TextContent | null;
    isCaptionVisible: boolean;
    source: SourceContent | null;
    isSourceVisible: boolean;
}

/** Props for the Tooltip slot, overridable via `slots.Tooltip` on `GraphRenderer`. Positioning stays built in. */
interface TooltipSlotProps {
    /** Render-ready tooltip body, already formatted by the viz-engine runtime. */
    content: TooltipContent;
}

/**
 * Props for the Grid slot, overridable via `slots.Grid` on `GraphRenderer`. `panelRect` is in
 * SVG-local coordinates.
 */
interface GridSlotProps {
    axes: FormattedAxis[];
    panel: CompiledPanel;
    panelFrameRect: GraphLayout['panelFrame'];
    panelRect: GraphLayout['panel'];
}

/** Props for the Legend slot, overridable via `slots.Legend` on `GraphRenderer`. */
interface LegendSlotProps {
    formattedLegends: FormattedLegend[];
    rects: Partial<Record<LayoutEdge, Rect>>;
    textScale: number;
}

/** Props for the Headline slot, overridable via `slots.Headline` on `GraphRenderer`. */
interface HeadlineSlotProps {
    headline: FormattedHeadline;
    rect: Rect;
    resolvedSize: ResolvedHeadlineSize;
    /** Leading strip items to paint; the rest are hidden because they would overflow the band. */
    visibleItemCount: number;
}

/**
 * Props for the AxisTicks slot — the tick lines and tick labels of every axis, overridable via
 * `slots.AxisTicks`. `tickRects` are SVG-local, keyed by edge. The axis title is a separate slot — see
 * `AxisLabel`.
 */
interface AxisTicksSlotProps {
    formattedAxes: FormattedAxis[];
    tickRects: Partial<Record<LayoutEdge, Rect>>;
}

/**
 * Props for the AxisLabel slot — the axis title of every axis (e.g. "Revenue"), overridable via
 * `slots.AxisLabel`. `labelRects` are SVG-local, keyed by edge. The tick band is a separate slot — see
 * `AxisTicks`.
 */
interface AxisLabelSlotProps {
    formattedAxes: FormattedAxis[];
    labelRects: Partial<Record<LayoutEdge, Rect>>;
}

/**
 * Props for the Swatch slot (`slots.Swatch` on `GraphRenderer`). An override must paint inside the
 * `width` × `height` box it receives.
 *
 * Switch on `shape`, `surface` or `label` and delegate the rest to
 * {@link DefaultSwatch}.
 */
interface SwatchSlotProps {
    shape: SwatchShape;
    color: string;
    surface: SwatchSurface;
    label?: string;
    lineType?: LineStyleType;
    width?: number;
    height?: number;
}
```

## Plugins — engine side

```ts
/**
 * One entry in the unified `plugins` array. Either a bare compile definition, a render half that carries
 * its definition at `.definition`, or a render-only override that carries none. The first two contribute
 * a compile definition (matched structurally over the field that already exists, never by naming
 * react-renderer's `GeomRendererDefinition` type); the last seeds only the render registry.
 */
type Plugin = CompileDefinition | {
    readonly definition: CompileDefinition;
} | RenderOnlyPlugin;

/**
 * A render-only plugin: a geom render half keyed by an existing geom name that contributes no compile
 * definition (the by-name `defineGeomRenderer('bar', …)` override). The engine recognises it
 * structurally — a render half with `geom`/`render` and no `.definition` — and skips it when seeding the
 * compile registries, so the built-in compile half keeps running; only the renderer consumes it.
 * React-free here: `render` is opaque to the engine, never called by it.
 */
interface RenderOnlyPlugin {
    readonly geom: string;
    readonly render: object;
}

/**
 * Base class for geoms that turn observations into visual marks (points, bars, lines etc).
 *
 * A geom declares its capabilities as fields and hooks with sensible base-class defaults; a subclass
 * overrides only what differs. The compile and runtime pipeline reads these declarations to decide
 * behaviour rather than branching on `type`, so a custom geom is a first-class participant.
 *
 * What earns a place on the def: a field belongs here only if it answers a question a name-agnostic
 * pipeline stage must ask of *every* geom (e.g. "which coord systems do you support?", "what spatial
 * index do you paint into?"). A single geom's one-off behaviour is an optional hook that geom alone
 * implements — never a shared flag the base class asserts for all geoms. Fields are grouped below by
 * the concern that consumes them.
 */
abstract class Geom<TParams = Record<string, never>> {
    /** Position columns the compile half injects and the render half reads — the cross-half contract. */
    readonly positionRoles: PositionRoles;
    /** What makes "the same observation" across recompiles. */
    readonly identityKey: IdentityKey;
    /** How overlapping marks of this geom arrange when the layer omits a position (bar → dodge, area → stack). */
    readonly defaultPosition: PositionType;
    /** Whether layers of this geom take part in hover hit-testing by default (rule opts out). */
    readonly defaultInteractive: boolean;
    /**
     * The aesthetics this geom honours, each tagged by {@link GeomAesthetic} `kind`: a `'visual'` scaled
     * channel (`color`, `size`) or a `'data'` relational/layout input read straight from its mapped column
     * without a scale (a sankey's `source`/`target`/`value`). Declaring a name registers it so the mapping
     * is recognised and, when `required`, enforces its presence.
     */
    readonly aesthetics: GeomAesthetics;
    /**
     * Variable names this geom computes in its own output that an author may map an aesthetic to.
     * They don't exist in the input data, so they're exempt from the unknown-variable check.
     */
    readonly derivedVariables: readonly string[];
    /** How this geom composes highlight matches above its base render; `null` opts out of highlighting. */
    readonly highlightStrategy: HighlightStrategy | null;
    /** Scale-domain constraints this geom imposes (discrete band axis, zero-anchored y); unset = none. */
    readonly scaleConstraints?: ScaleConstraints;
    /** Coordinate systems this geom can be rendered under. */
    readonly supportedCoordTypes: readonly CoordType[];
    /**
     * The hit-test shape this geom declares, coord-agnostic (see {@link SpatialKind}). Baked onto the
     * compiled layer verbatim; the runtime hover indexer (`build-layer-index`) projects it for the chart's
     * coord.
     */
    readonly spatialKind: SpatialKind;
    /** Per-coord grid/border visibility this geom requests from the axes guide. */
    readonly grid: Partial<Record<CoordType, GridPolicy>>;
    /** How this geom relates to the colour legend (single-item suppression, auto-placement, direct labels). */
    readonly legend: LegendPolicy;
    /** Per-coord data-label defaults merged over the base config (e.g. bar+polar → percentage). */
    readonly dataLabels?: Partial<Record<CoordType, Partial<DataLabelsConfig>>>;
    /** Coord types the built-in placement pipeline can place this geom's data labels under. */
    readonly dataLabelCoordTypes: readonly CoordType[];
    /**
     * Whether this geom composes a single geometry per group (e.g. a line's path) rather than
     * drawing one per observation (e.g. a point's marker).
     */
    readonly isComposite: boolean;
    /** The tooltip contract this geom declares. */
    readonly tooltip: TooltipContract;
    /** Per-layer aggregate summaries this geom opts into (grand total, stack totals, per-group headline). */
    readonly summaries: GeomSummaries;
    /** Optional bespoke mapping requirement not expressible as a position role's `aes` source. */
    validateMapping?: (input: GeomMappingValidationInput) => readonly UserInputIssue[];
    /**
     * Optional: resolve a per-observation annotation anchor in normalised panel `[0, 1]` space. A geom
     * that supports anchoring (bar, line) implements this; the annotation stage skips geoms that don't.
     */
    resolveAnchorPosition?: (observation: Observation, coordSystem: CoordSystem) => AnchorPosition | null;
    /**
     * Optional: the geom's bespoke default data-label source when none is mapped (point → the bound
     * `size` variable). Returns `null` to defer to the shared segment-y default.
     */
    resolveDefaultLabelSource?: (mapping: AesMapping) => AestheticValue | null;
    /**
     * Optional: data-label defaults that depend on the layer's position adjuster (e.g. bar defaults `justify` to
     * `'center'` on stacked/filled segments). Applied over the base defaults; both the per-coord defaults and
     * the user's config override it.
     */
    resolveDataLabelDefaults?: (position: PositionType) => Partial<DataLabelsConfig>;
    /**
     * The geom's name. The built-in subclasses narrow this to a `GeomName` literal; the base accepts
     * any `string` so a custom geom carries a name outside the built-in union (runtime identity is a
     * plain string, resolved through the registry).
     */
    abstract readonly type: string;
    /** Default values for this geom's params; also carries the params type (`TParams`). */
    abstract readonly defaultParams: TParams;
    /**
     * Resolve this geom's params from the (optional) user-supplied params, merged over
     * {@link defaultParams}. Read by the layer resolver. Override to apply a geom-specific invariant the
     * merge can't express — area normalises `missingValues: 'gap'` to `'zero'`, which it can't render
     * mid-stack. Params are validated at the typed builder call site, so this works on an open record.
     * A substitution worth surfacing (e.g. bar clamping an out-of-range `width`) is reported through
     * `reportIssue` as a geom-scoped issue; the resolver stamps the layer context on and records it as
     * a warning.
     */
    resolveParams(options: {
        params: Record<string, unknown> | undefined;
        diagnostics?: DiagnosticsCollector;
    }): Record<string, unknown>;
    abstract compile(input: GeomCompilerInput): CompiledGeom;
}

/** A custom stat is a {@link Stat} subclass instance. Named alias for its role as a plugin. */
type StatDefinition = Stat;

/** A custom transform is a {@link TransformStrategy}. Named alias for its role as a plugin. */
type TransformDefinition = TransformStrategy;
```

## Plugins — renderer side

```ts
/**
 * Dual-target renderer binding, keyed on whether the first argument is a compile definition or a built-in
 * geom name:
 *
 * - **Whole new geom** — `defineGeomRenderer(definition, contract)` pairs the render contract with its
 *   compile definition, producing a {@link GeomRendererDefinition}. Registering the result registers both
 *   sides: the compile definition is reachable at `.definition` and the geom name is read from it, so the
 *   two halves cannot drift.
 * - **Render-only override** — `defineGeomRenderer('bar', contract)` rebinds only the paint half of an
 *   existing built-in, producing a {@link ResolvedGeomRenderer} that carries no `.definition`. The built-in
 *   compile half keeps running (nothing re-seeds the compile registry); only the render registry changes.
 *   The name is constrained to {@link GeomName}, so a by-name override of an unknown built-in is a
 *   compile-time error. To restyle a *custom* geom, rebind its definition (which you hold) via the first form.
 */
function defineGeomRenderer<Definition extends Geom<unknown>>(definition: Definition, contract: GeomRenderContract): GeomRendererDefinition & {
    readonly definition: Definition;
};
function defineGeomRenderer<G extends GeomName>(geom: G, contract: GeomRenderContract): ResolvedGeomRenderer;

/**
 * A render contract paired with the compile definition it paints for. The engine recovers the definition
 * structurally from `.definition` (React-free), and the renderer reads the geom name from the same
 * definition — so the compile and render sides are one declaration consumed twice, never two matched by
 * a string.
 */
interface GeomRendererDefinition extends ResolvedGeomRenderer {
    /** The compile definition this renderer paints for. Held by reference — the single source of identity. */
    readonly definition: Geom<unknown>;
}

/**
 * Ergonomic entry point for a React app: pass `plugins` once and get back a {@link GraphyKit} — the
 * typed builder plus a `GraphProvider` that already carries them. Pure sugar over the primitives
 * (`createGraphyBuilder`, `<GraphProvider plugins>`); use those directly for headless or advanced
 * wiring. The `const` type parameter captures the `plugins` tuple literally, so `kit.geom.<customName>`
 * is typed.
 */
function createGraphyKit<const P extends readonly Plugin_2[] = []>(options?: CreateGraphyBuilderOptions<P>): GraphyKit<P>;

/**
 * A plugin-bound authoring kit: the typed `geom`/`stat`/`transform`/`scale`/`coord` factories plus
 * `createSpec`/`pipe`, and a `GraphProvider` pre-bound to the same `plugins` — so what can be written
 * and what can render derive from one array and cannot diverge. Generic over the `plugins` tuple so
 * the typed per-plugin builder methods (`geom.<name>`, …) flow through to the React entry point.
 */
interface GraphyKit<P extends readonly Plugin_2[] = readonly Plugin_2[]> extends GraphyBuilder<P> {
    GraphProvider: (props: Omit<GraphProviderProps, 'plugins'>) => ReactElement;
}
```

## Supporting types — @graphysdk/viz-engine

Types referenced by the sections above, included so no name dangles.

```ts
/**
 * Aesthetic value can be:
 * - string (shorthand for { variable: string })
 * - { variable: string } (explicit variable mapping)
 * - { value: DataValue } (constant value applied to every observation)
 */
type AestheticValue = string | VariableMapping | ValueMapping;

/***************************************************************
 * Aggregate Transform
 ***************************************************************/
interface AggregateOperation {
    /** The aggregation function to apply. */
    op: AggregationFunction;
    /** The variable to aggregate. */
    variableName: VariableName;
    /** The name of the output variable. */
    as: VariableName;
}

interface AggregateOptions {
    /** Variables to group by before aggregating. */
    groupby: VariableName[];
    /** Aggregation operations to apply per group. */
    operations: AggregateOperation[];
}

interface AggregateTransformInput {
    type: 'transform';
    transformType: 'aggregate';
    options: AggregateOptions;
}

/** A function that aggregates a variable's values. */
type AggregationFunction = 'count' | 'sum' | 'mean' | 'median' | 'mode' | 'min' | 'max';

/**
 * Which point of a target's box an anchor resolves to. Compass directions name the
 * eight edge/corner points; `center` is the box centre. Omitted means the geom-natural
 * point (e.g. a bar's top-edge midpoint).
 */
type AnchorAlign = 'center' | 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * A nudge applied after a target resolves. `unit` selects the frame: `'panel'` is a
 * fraction of the plot rect, `'px'` is device pixels (resolved at runtime).
 */
interface AnchorOffset {
    x?: number;
    y?: number;
    /** Defaults to `'panel'`. */
    unit?: 'panel' | 'px';
}

/** A per-observation anchor position in normalised panel `[0, 1]` space (annotation anchoring). */
interface AnchorPosition {
    x: number;
    y: number;
}

/**
 * A hit with a scale-derived panel anchor — every index kind except `'render-hit-test'`. The compiler's
 * position scales give it a real `(x, y)`, so an overlay marker (hover dot, guide line) can be placed at it.
 */
interface AnchoredHoverHit extends HoverHitBase {
    /** Discriminant: this hit has a real anchor, so `x`/`y` are safe to read. */
    anchored: true;
    /**
     * Paint coordinates for an overlay marker (e.g. a hover dot) at this hit. Normalized panel-local.
     * Cartesian: `[0, 1]²` in data-space (y=0 at the bottom, y=1 at the top — matching the compiler's
     * `POSITION_VARIABLES.y`); convert to panel pixels as `xPixel = x * panel.width`,
     * `yPixel = (1 - y) * panel.height` (invert y for top-origin renderers). Polar: `(angle in radians
     * clockwise from 12 o'clock, radius in [0, 1])` — place via the same angle/radius transform the
     * polar cells use (center = panel center, outer radius = `min(panel.w, panel.h) / 2`).
     */
    x: number;
    y: number;
}

/**
 * A render-owned hit (`'render-hit-test'`: sankey, treemap, voronoi): the geometry lives render-side, so
 * the engine has no scale-derived anchor for it — there is deliberately no `x`/`y`. A render-owned geom's
 * `renderHover` derives its overlay from `observation`, and the tooltip follows the live cursor.
 */
interface AnchorlessHoverHit extends HoverHitBase {
    /** Discriminant: no anchor. Narrow on this before reading `x`/`y`, which this variant does not carry. */
    anchored: false;
}

/**
 * The value returned by an {@link annotation} builder. Treat it as an opaque token — pipe
 * it into a spec, don't construct it by hand.
 */
type AnnotationItem = {
    type: 'annotation';
    kind: 'differenceArrow';
    annotation: DifferenceArrowInput;
} | {
    type: 'annotation';
    kind: 'shape';
    annotation: ShapeInput;
} | {
    type: 'annotation';
    kind: 'arrow';
    annotation: ArrowInput;
} | {
    type: 'annotation';
    kind: 'text';
    annotation: TextAnnotationInput;
} | {
    type: 'annotation';
    kind: 'image';
    annotation: ImageAnnotationInput;
} | {
    type: 'annotation';
    kind: 'sticker';
    annotation: StickerAnnotationInput;
} | {
    type: 'annotation';
    kind: 'pinnedNumber';
    annotation: PinnedNumberAnnotationInput;
} | {
    type: 'annotation';
    kind: 'comment';
    annotation: CommentAnnotationInput;
};

/**
 * Whether an annotation renders beneath the geoms (background) or on top (foreground).
 */
type AnnotationZOrder = 'background' | 'foreground';

/**
 * A transform input that may be built-in or custom. Used at the spec-construction boundary
 * (`pipe`/`createSpec` items, `SpecInput.transforms`) and the transform compile stage, so a custom
 * transform pipes in and applies through the registry — while {@link TransformInput} stays the clean
 * built-in union everywhere a `transformType` is narrowed.
 */
type AnyTransformInput = TransformInput | CustomTransformInput<string>;

/**
 * Visual appearance settings that travel through the spec but only affect
 * rendering (not data, scales, or layout math).
 */
interface AppearanceSpec {
    /**
     * Multiplier applied to every text element. The renderer sets a CSS
     * variable; em-based theme tokens scale automatically.
     *
     * Renderer contract: apply this at both text measurement and CSS render time.
     * The engine assumes the measured sizes it receives already include the
     * multiplier, so layout will be wrong if it is applied to only one of the two.
     * @default 1
     */
    textScale: number;
    /**
     * Chart background fill. Defaults to the theme's `graphBackground` token.
     * @default { type: 'theme' }
     */
    background: BackgroundSpec;
    /**
     * Border ring painted inside the chart bounds. Defaults to no border.
     * @default { type: 'none' }
     */
    border: BorderSpec;
    /**
     * Corner radius (px) applied to both the chart frame and its inner content.
     * Use `0` for square corners.
     * @default 8
     */
    cornerRadius: number;
    /**
     * How non-matched observations are de-emphasised when a highlight is active.
     * @default 'dim'
     */
    highlightStyle: HighlightStyle;
}

/**
 * Area-specific parameters (same rendering knobs as line, but fills under the curve)
 */
interface AreaGeomParams {
    /**
     * Outline stroke width in pixels. `'auto'` reads the per-observation
     * `strokeWidth` value (`getStrokeWidth`), falling back to the geom default.
     */
    lineWidth: number | 'auto';
    /**
     * Interpolation method between points — a d3-shape curve family (`'linear'` ⇒
     * `curveLinear`, `'catmull-rom'` ⇒ `curveCatmullRom`).
     * @default 'linear'
     */
    interpolate: InterpolateType;
    /**
     * How to handle missing (null/undefined) values. As for line:
     * - `'zero'`: nulls arrive already substituted with zero by the compiler.
     * - `'gap'`: break the path at a null.
     * - `'connect'`: drop nulls before pathing so the line spans the gap.
     * @default 'gap'
     * */
    missingValues: MissingValuesType;
}

/**
 * Arrow annotation. Each endpoint is a {@link PointAnchorInput}, so it can float in
 * panel fractions or pin to an observation. Distinct from {@link DifferenceArrowInput},
 * which reads the measured gap between two observations.
 */
interface ArrowInput {
    id?: string;
    /** Tail endpoint. */
    start: PointAnchorInput;
    /** Head endpoint. */
    end: PointAnchorInput;
    /** null falls back to the theme `defaultAnnotationArrowStroke`. */
    color?: string | null;
    thickness?: ArrowThickness;
    startArrowheadStyle?: ArrowheadStyle;
    endArrowheadStyle?: ArrowheadStyle;
    lineStyle?: ArrowLineStyle;
    /** Render with a raised, outlined sticker-like appearance. */
    hasStickerStyle?: boolean;
}

/** Whether an arrow's line is drawn solid or dashed. */
type ArrowLineStyle = 'solid' | 'dashed';

/** Preset stroke weight for an arrow annotation. */
type ArrowThickness = 'thin' | 'medium' | 'thick';

/** Whether an arrow end carries an arrowhead. */
type ArrowheadStyle = 'none' | 'line-arrow';

/**
 * Axes configuration (after defaults applied)
 * Groups all axis-related settings per axis.
 */
interface AxesConfig {
    x: XAxisConfig;
    y: YAxisConfig;
    ySecondary?: YAxisConfig;
}

/**
 * Configuration for a single axis's grid lines
 */
interface AxisGridConfig {
    /**
     * Whether grid lines are visible.
     * - true/false: explicit visibility
     * - null: let the compiler decide based on geom/coord policies
     *   (visible unless a geom policy hides it, e.g. bar charts hide the x grid)
     */
    isVisible: boolean | null;
    /**
     * Line style of this axis's grid lines.
     * @default 'dashed'
     */
    lineStyle: LineStyleType;
    /**
     * Stroke width of this axis's grid lines in px. null inherits the theme's grid line width.
     * @default null
     */
    lineWidth: number | null;
}

/**
 * Maps each positional aesthetic to its axis orientation.
 * The guide compiler uses this to determine where axes are placed
 * and what geometry they use (e.g., linear vs circular grid lines).
 */
interface AxisMapping {
    x: {
        position: AxisPosition;
        geometry: GuideGeometry;
    };
    y: {
        position: AxisPosition;
        geometry: GuideGeometry;
    };
}

type AxisPosition = 'left' | 'right' | 'top' | 'bottom';

/**
 * A single axis tick with its raw value and normalized position. Ticks in one axis share the same
 * `valueFormat` — it lives on `CompiledAxisGuide`, not per-tick.
 */
interface AxisTick {
    /** Raw value in data space (number, Date, or string) */
    value: DataValue;
    /**
     * Tick position in the same normalized space the geoms use. Normalized to [0,1]: x is 0=left…1=right,
     * y is 0=bottom…1=top (data-up). SVG / top-origin renderers invert y as `1 - y`.
     *
     * For discrete scales this is the band center; the band spans `position ± bandwidth/2`
     * (see {@link CompiledAxisGuide.bandwidth}).
     */
    position: number;
}

/**
 * Display mode for axis ticks
 * - 'auto': Show all ticks (default behavior)
 * - 'edges': Show only the first and last tick
 */
type AxisTickMode = 'auto' | 'edges';

/**
 * Configuration for a single axis's ticks
 */
interface AxisTicksConfig {
    isVisible: boolean;
    mode: AxisTickMode;
}

/**
 * Background fill behind the chart.
 * - 'theme': inherit the active theme's `graphBackground` token (default).
 * - 'solid': override with an explicit CSS color string (use `'transparent'` for no fill).
 * - 'tinted': mix the theme background with an anchor color. When `color` is
 *   omitted the compiler resolves it to the first color of the active palette.
 */
type BackgroundSpec = {
    type: 'theme';
} | {
    type: 'solid';
    color: string;
} | {
    type: 'tinted';
    color?: string;
};

/**
 * Bar/Column-specific parameters. `width` sets the band envelope the compiler writes into the
 * position variables; the remaining params style the painted rect.
 */
interface BarGeomParams {
    /**
     * Bar width as a fraction of the band the discrete scale allocates to the category, in `(0, 1]`.
     * @default 0.7
     */
    width: number;
    /**
     * Corner rounding in pixels, or `'full'` for pill-shaped bars.
     * @default 'auto'
     */
    borderRadius: number | 'auto' | 'full';
    /**
     * Border color. The border is only drawn when this is set.
     */
    borderColor?: string;
    /**
     * Border width in pixels. Only takes effect when `borderColor` is set.
     * A non-positive or non-finite value falls back to the default.
     * @default 1
     */
    borderWidth: number;
}

/**
 * Base params shared by all coordinate systems
 */
interface BaseCoordParams {
    /**
     * Limits for x-axis [min, max]
     */
    xLimits: [number, number] | null;
    /**
     * Limits for y-axis [min, max]
     */
    yLimits: [number, number] | null;
}

interface BaseGeomOptions<T extends GeomParams> {
    /** Layer-local aesthetic mapping, merged over the spec-level mapping. */
    aes?: AesMapping;
    stat?: StatName | StatInput | CustomStatInput<string>;
    position?: PositionType;
    yScaleType?: YScaleType;
    params?: Partial<T>;
    transforms?: TransformInput[];
    interactive?: boolean;
    dataLabels?: DataLabelsInput;
}

/** Name of a built-in gradient available to `border.type === 'preset'`. */
type BorderPreset = (typeof BORDER_PRESETS)[number];

/**
 * Border ring painted around the chart. The ring is drawn INSIDE the
 * configured chart dimensions — increasing `width` shrinks the plot/panel
 * area accordingly.
 *
 * - 'none': no border.
 * - 'solid': fill the ring with `color` as-is. Pass a theme token (e.g.
 *   `'var(--graphy-grey-70)'`) for a theme-aware grey ring.
 * - 'tinted': fill the ring with `color` lightened/darkened by the active
 *   color scheme. When `color` is omitted the compiler resolves it to the
 *   first color of the active palette.
 * - 'gradient': fill the ring with a linear gradient derived from `color`,
 *   adjusted for the active color scheme. When `color` is omitted the
 *   compiler resolves it to the first color of the active palette.
 * - 'preset': fill the ring with a named gradient from `BORDER_PRESETS`.
 */
type BorderSpec = {
    type: 'none';
} | {
    type: 'solid';
    color: string;
    width: number;
} | {
    type: 'tinted';
    color?: string;
    width: number;
} | {
    type: 'gradient';
    color?: string;
    width: number;
} | {
    type: 'preset';
    preset: BorderPreset;
    width: number;
};

interface CartesianCoordInput {
    type: 'coord';
    coordType: 'cartesian';
    params?: Partial<BaseCoordParams>;
}

type CartesianCoordParams = BaseCoordParams;

/**
 * Cartesian coordinate system - standard x/y plot. Also used for flipped coordinates (flip is
 * an axis-assignment variant, not a different geometric paradigm).
 */
interface CartesianCoordSystem {
    type: 'cartesian';
    /**
     * The data-space axis that is the main (independent) one. `'x'` for standard cartesian (bars
     * rise, X ticks on the horizontal axis); `'y'` for `coord.flip()` (bars extend, Y ticks on the
     * horizontal axis). Consumers that need to branch on flip read this; the runtime `coord/axes`
     * helpers turn it into main/cross accessors so the branch lives in one place.
     * When `'y'`, the x-variables carry the measure / cross-axis extent and the y-variables carry the
     * main-axis band — but that swap is already applied to the position variables by the coord transform,
     * so geoms read `getX`/`getY` without branching. See {@link MainAxis}.
     */
    mainAxis: MainAxis;
    /** Axis orientation metadata for the guide compiler */
    axisMapping: AxisMapping;
}

interface CategoricalScaleMethods<RangeValue extends number | string> {
    /**
     * Discrete (categorical) scale. Supports explicit `range` values.
     * @example scale.lineType.discrete({ range: ['solid', 'dashed', 'dotted'] })
     */
    discrete: (options?: DiscreteScaleOptions<RangeValue>) => DiscreteScaleInput;
    /**
     * Identity scale — data values used directly as visual values without transformation.
     * @example scale.lineType.identity() // observation['lineType'] passed through
     */
    identity: (options?: IdentityScaleOptions) => IdentityScaleInput;
}

interface CategoricalValueFormat {
    type: 'text';
}

interface ColorScaleMethods {
    /**
     * Continuous (numeric) color scale. Supports `transform`, `reverse`, `nice`, `zero`, `domainMin`, `domainMax`.
     * @example scale.color.continuous({ reverse: true })
     */
    continuous: (options?: ContinuousScaleOptions) => ContinuousScaleInput;
    /**
     * Discrete (categorical) color scale. Supports explicit `range` values.
     * @example scale.color.discrete({ range: ['red', 'blue', 'green'] })
     */
    discrete: (options?: DiscreteScaleOptions) => DiscreteScaleInput;
    /**
     * Color scale from a named Graphy palette.
     * @example scale.color.palette({ palette: { type: "graphy" } })
     */
    palette: (options?: PaletteScaleOptions) => PaletteScaleInput;
}

/**
 * Comment annotation: a marker dot pinned to a single observation, carrying
 * rich-text content. The renderer's mini view shows a truncated comment; hover
 * reveals the full text.
 */
interface CommentAnnotationInput {
    id?: string;
    at: ObservationAnchorInput;
    content: RichTextContent;
}

/** Comparison operators for declarative filtering. */
type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

/** The three compile-side definition shapes a plugin can contribute. */
type CompileDefinition = Geom<unknown> | StatDefinition | TransformDefinition;

type ConfigInput = Omit<DeepPartial<ConfigSpec>, 'legend' | 'content'> & {
    legend?: LegendConfigInput;
    content?: ContentInput;
};

/**
 * Config specification with type tag
 */
interface ConfigItem {
    type: 'config';
    config: ConfigInput;
}

/***************************************************************
 * Constant Transform
 ***************************************************************/
interface ConstantOptions {
    /** The name of the new variable. */
    variableName: VariableName;
    /** The type of the new variable. */
    type: DataType;
    /** The constant value to assign to every observation. */
    value: DataValue;
}

interface ConstantTransformInput {
    type: 'transform';
    transformType: 'constant';
    options: ConstantOptions;
}

/**
 * Resolved content configuration (all fields populated).
 *
 * `null` on a text slot means "no content set". The matching `isXVisible` flag
 * is a separate visibility toggle that lets a value be preserved across show /
 * hide cycles without losing the text the user typed.
 */
interface ContentConfig {
    title: TextContent | null;
    isTitleVisible: boolean;
    subtitle: TextContent | null;
    isSubtitleVisible: boolean;
    caption: TextContent | null;
    isCaptionVisible: boolean;
    source: SourceContent | null;
    isSourceVisible: boolean;
}

/** Content input — all fields optional. */
type ContentInput = Partial<ContentConfig>;

type ContinuousScaleInput = {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'continuous';
    transform?: ScaleTransformType;
    reverse?: boolean;
    nice?: boolean;
    zero?: boolean;
    clamp?: boolean;
    domainMin?: number | null;
    domainMax?: number | null;
    range?: [number, number] | null;
};

type ContinuousScaleOptions = {
    /**
     * Mathematical transformation to apply.
     * - 'linear': No transformation (default)
     * - 'log': Base-10 logarithm
     * - 'sqrt': Square root
     */
    transform?: ScaleTransformType;
    /**
     * Reverse the scale direction.
     * Can be combined with any transformation.
     * @default false
     * @example scale.y.continuous({ reverse: true }) // reversed continuous scale
     */
    reverse?: boolean;
    /**
     * Extend domain to nice round values.
     * @example nice: true // [3, 97] becomes [0, 100]
     */
    nice?: boolean;
    /**
     * Include zero in the domain.
     * Default is true for y-axis, false for x-axis.
     * @example zero: false // Allow axis to start above zero
     */
    zero?: boolean;
    /**
     * Restrict output to the scale's range when input falls outside the domain.
     * Without clamping, values extrapolate beyond the range boundaries.
     * Default is false for position aesthetics (x, y), true for non-position (color, size, alpha, …).
     * @example clamp: true // Pin out-of-domain values to range boundaries
     */
    clamp?: boolean;
    /**
     * Override the minimum domain value only.
     * Maximum is still computed from data.
     * @example domainMin: 0 // Ensure axis starts at 0
     */
    domainMin?: number;
    /**
     * Override the maximum domain value only.
     * Minimum is still computed from data.
     * @example domainMax: 100 // Cap axis at 100
     */
    domainMax?: number;
    /**
     * Output range for non-positional scales (size, alpha, strokeWidth).
     * Ignored for position aesthetics (x, y).
     * Aesthetic-specific defaults are applied when not specified:
     * - size: [4, 20]
     * - alpha: [0.1, 1]
     * - strokeWidth: [1, 4]
     * @example range: [2, 30] // custom size range in pixels
     */
    range?: [number, number];
};

/**
 * Discriminated union of all coordinate input specs (user-provided, optional params).
 */
type CoordInput = CartesianCoordInput | FlipCoordInput | PolarCoordInput;

/**
 * Render-ready coordinate system (discriminated union).
 * Discriminates on geometric paradigm: cartesian plane vs polar projection.
 *
 * The same geom renders differently per coord: a bar is a rect in cartesian and an arc in polar.
 */
type CoordSystem = CartesianCoordSystem | PolarCoordSystem;

/**
 * Coordinate system type for transforming geometric positions.
 *
 * - `'cartesian'` — Standard x/y Cartesian plane
 * - `'polar'` — Polar coordinates for pie, radar, and radial charts
 * - `'flip'` — Cartesian with x and y axes swapped
 */
type CoordType = 'cartesian' | 'polar' | 'flip';

/**
 * Resolved count stat spec.
 */
interface CountStatSpec {
    type: 'count';
}

/** Three letter ISO string representing the currency */
type CurrencyIso = 'aed' | 'aud' | 'bdt' | 'bhd' | 'brl' | 'cad' | 'chf' | 'clp' | 'cny' | 'cop' | 'czk' | 'dkk' | 'egp' | 'eur' | 'gbp' | 'hkd' | 'huf' | 'idr' | 'ils' | 'inr' | 'jpy' | 'krw' | 'kwd' | 'mxn' | 'myr' | 'ngn' | 'nok' | 'nzd' | 'php' | 'pkr' | 'pln' | 'qar' | 'ron' | 'rub' | 'sar' | 'sek' | 'sgd' | 'thb' | 'try' | 'twd' | 'usd' | 'vnd' | 'zar';

interface CurrencyValueFormat {
    type: 'currency';
    iso: CurrencyIso;
}

/** A single named color slot within a custom palette supplied by the renderer. */
type CustomPaletteColor = {
    id: string;
    hex: string;
    name?: string;
};

/** Reference to a user-registered custom palette by id, resolved against the palette registry. */
type CustomPaletteInput = {
    type: 'custom';
    id: string;
};

/**
 * Conventional `context` keys. A diagnostic's `context` is free-form `Record<string, JsonValue>`,
 * but emitters draw from this vocabulary so consumers can rely on consistent keys per code rather
 * than parsing prose:
 *
 * - `layerIndex` — index of the offending layer
 * - `aesthetic` — the aesthetic channel (`x`, `y`, `color`, …)
 * - `variableName` — the offending data variable
 * - `scaleType` — the scale type involved
 * - `variableType` — the data type of the offending variable
 * - `expected` / `actual` — the required vs. supplied value
 * - `requested` / `available` — an unknown/duplicate registered type and the registered alternatives
 * - `kind` — the registry or resolver label for a registration diagnostic (`UNKNOWN_REGISTERED_TYPE`,
 *   `DUPLICATE_REGISTERED_TYPE`, `MISSING_GEOM_RENDERER`)
 * - `geom` / `param` — the geom type and its param that failed validation (`INVALID_GEOM_PARAM`)
 */
const DIAGNOSTIC_CONTEXT_KEYS: readonly ["layerIndex", "aesthetic", "variableName", "scaleType", "variableType", "expected", "actual", "requested", "available", "kind", "geom", "param"];

/**
 * Anchor along one axis of the geom's box, CSS-flexbox style. `justify` runs along the value
 * axis — `'end'` is the value tip whatever the orientation or sign (e.g. the bottom of a negative
 * column). `align` runs across it: bandwidth for bars, angular for pie wedges, x for
 * point/line/area.
 */
type DataLabelAnchor = 'start' | 'center' | 'end';

/**
 * Value-axis anchors. `'panel-start'`/`'panel-end'` resolve against the panel instead of the
 * geom's box, so labels sit flush at the chart edge regardless of the geom's length. They stay
 * sign-aware like `'end'` and always inset inward, ignoring `position` on the value axis — past
 * the panel edge is off-canvas.
 */
type DataLabelJustify = DataLabelAnchor | 'panel-start' | 'panel-end';

/**
 * Where data labels sit relative to the geom they decorate.
 * - `'auto'` — the engine chooses: fit inside, flip outside, drop or rotate as needed.
 *   `justify`/`align` are ignored.
 * - `'inside'` — within the geom's box, hugging the `(justify, align)` anchor. Never dropped,
 *   flipped or rotated. On line/point geoms the label centres on the data point/marker.
 * - `'outside'` — just past the value-axis edge selected by `justify`; `align` stays within the
 *   geom's width (line/point labels sit beside the geom). Never dropped. Stacked/filled cartesian
 *   bar segments coerce to `'inside'` — every segment edge borders a neighbour; use
 *   `showStackTotals` for stack-end totals. (Pie wedges keep `'outside'`.)
 *
 * Styling follows the label's effective position: over the geom → inside styling (white text,
 * no plate); off it — by placement, offset, or not fitting — outside styling (dark text on a
 * plate). Area labels always use the plated styling: the translucent fill can't back white text.
 */
type DataLabelPlacement = 'auto' | 'inside' | 'outside';

/**
 * Resolved data-labels config carried per-layer.
 */
interface DataLabelsConfig {
    /**
     * Whether to show data labels on the layer.
     * @default false
     */
    showDataLabels: boolean;
    /**
     * The format to use for the data labels.
     * @default 'absolute'
     */
    format: 'absolute' | 'percentage';
    /**
     * Whether to show stack totals on the layer.
     * @default false
     */
    showStackTotals: boolean;
    /**
     * Polar bars (pie/donut) prepend the category to the value label ("Europe · 35%"). Cartesian
     * bars emit a second label per observation, placed by the `category*` fields independently of
     * `showDataLabels`. Other geoms ignore it.
     * @default false
     */
    showCategoryLabels: boolean;
    /**
     * The source of the data labels.
     * @default { variable: POSITION_VARIABLES.yRaw }
     */
    labelSource: AestheticValue;
    /**
     * Where labels sit relative to the geom. Explicit values render exactly as asked; dropping,
     * flipping and rotation happen only under `'auto'`.
     * @default 'auto'
     */
    position: DataLabelPlacement;
    /**
     * Anchor along the geom's value/growth axis. Only consulted when `position` is explicit.
     * Panel anchors pin the label to the panel's edge instead of the geom's; see
     * {@link DataLabelJustify}.
     * @default 'end' ('center' for stacked/filled bars)
     */
    justify: DataLabelJustify;
    /**
     * Anchor across the geom's secondary axis. Only consulted when `position` is explicit.
     * @default 'center'
     */
    align: DataLabelAnchor;
    /**
     * Gap in pixels between the geom's edge and the label box. Stack totals ignore it.
     * @default 4 for bars and polar wedges, 12 for point/line/area
     */
    offset: number;
    /**
     * Where the cartesian-bar category label sits relative to its bar. No `'auto'`: category labels
     * have no fit heuristics and render exactly as asked. Stacked/filled segments coerce
     * `'outside'` to `'inside'` — every segment edge borders a neighbour.
     * @default 'inside'
     */
    categoryPosition: Exclude<DataLabelPlacement, 'auto'>;
    /**
     * Category label's anchor along the bar's value axis; accepts panel anchors like `justify`.
     * @default 'start'
     */
    categoryJustify: DataLabelJustify;
    /**
     * Category label's anchor across the bar's bandwidth.
     * @default 'center'
     */
    categoryAlign: DataLabelAnchor;
    /**
     * Gap in pixels between the anchored edge and the category label box.
     * @default 4
     */
    categoryOffset: number;
}

/** User-facing data-labels options; any omitted field falls back to its resolved default. */
type DataLabelsInput = DeepPartial<Omit<DataLabelsConfig, 'labelSource'>>;

interface DatetimeScaleInput {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'datetime';
    domainMin?: number | null;
    domainMax?: number | null;
    nice?: boolean;
    reverse?: boolean;
    clamp?: boolean;
}

type DatetimeScaleOptions = {
    /** Minimum domain override (milliseconds since epoch). */
    domainMin?: number;
    /** Maximum domain override (milliseconds since epoch). */
    domainMax?: number;
    /**
     * Reverse the scale direction.
     * Can be combined with any transformation.
     * @default false
     * @example scale.y.log({ reverse: true }) // reversed log scale
     */
    reverse?: boolean;
    /**
     * Extend domain to nice round values.
     * @example nice: true // [3, 97] becomes [0, 100]
     */
    nice?: boolean;
    /**
     * Restrict output to the scale's range when input falls outside the domain.
     * Without clamping, values extrapolate beyond the range boundaries.
     * Defaults to false for datetime scales (always positional).
     * @example clamp: true // Pin out-of-domain values to range boundaries
     */
    clamp?: boolean;
};

/**
 * Recursively makes every property of `T` optional.
 * Unlike the built-in `Partial`, this applies to nested objects as well.
 */
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends Array<infer U> ? Array<DeepPartial<U>> : unknown extends T[K] ? T[K] : NonNullable<T[K]> extends object ? DeepPartial<NonNullable<T[K]>> : T[K];
};

type DefaultPaletteConfig = {
    type: 'default';
};

/**
 * Structured location + repair atoms carried by an error or diagnostic. Keys are constrained to the
 * {@link DIAGNOSTIC_CONTEXT_KEYS} vocabulary, so the contract codegen binds to is compiler-checked
 * at every emit site — a typo or an ad-hoc key is a type error here, not a silent drift that breaks
 * a downstream consumer. Values are {@link JsonValue} so a diagnostic stays serialisable end-to-end.
 */
type DiagnosticContext = Partial<Record<DiagnosticContextKey, JsonValue>>;

/** A key from the documented {@link DIAGNOSTIC_CONTEXT_KEYS} vocabulary. */
type DiagnosticContextKey = (typeof DIAGNOSTIC_CONTEXT_KEYS)[number];

/**
 * The human- and machine-readable core every error and diagnostic shares: a `message`, optional
 * structured `context` atoms, and an optional repair `suggestion`. The `severity`/`kind`/`code` axes
 * are layered on by {@link VizDiagnostic}, and `cause` by {@link VizErrorOptions} — so the producer
 * surface has one core shape rather than three overlapping ones.
 */
interface DiagnosticDetails {
    /** Human-readable description of what went wrong. */
    message: string;
    /** Serialisable location + repair atoms, drawn from the documented key vocabulary. */
    context?: DiagnosticContext;
    /** Repair hint for a human or an LLM. Advisory prose, not part of the stable contract. */
    suggestion?: string;
}

/**
 * User-facing difference-arrow input. `size`, `color` and `labelCrossPosition`
 * are defaulted by the resolver.
 */
interface DifferenceArrowInput {
    /** Stable id; generated by the resolver when omitted. */
    id?: string;
    /** Observation the arrow's tail points from. */
    start: ObservationAnchorInput;
    /** Observation the arrow's head points to. */
    end: ObservationAnchorInput;
    /** What the arrow's label measures (raw gap, relative change, or share). */
    label: DifferenceArrowLabelKind;
    /** null falls back to a theme default. */
    color?: string | null;
    size?: DifferenceArrowSize;
    /** AnchorOffset of the label along the arrow, as a fraction of the arrow's length. */
    labelCrossPosition?: number;
}

/** What a difference arrow's label measures: the raw gap, the relative change, or one value as a share of the other. */
type DifferenceArrowLabelKind = 'absolute-difference' | 'relative-difference' | 'proportion';

/** Preset visual scale for a difference arrow. */
type DifferenceArrowSize = 'small' | 'medium' | 'large';

interface DiscreteScaleInput {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'discrete';
    range?: Array<number | string> | null;
    domain?: Array<string | number> | null;
    padding?: number | null;
    reverse?: boolean;
}

type DiscreteScaleOptions<RangeValue extends number | string = number | string> = {
    /**
     * Explicit output values mapped to domain categories in order.
     */
    range?: RangeValue[];
    /**
     * Explicit domain values controlling category order and membership.
     * Only these values appear in the scale.
     */
    domain?: Array<string | number>;
    /**
     * Padding between bands as a fraction of the band step (0–1).
     * Applied as `innerPadding = padding` and `outerPadding = padding / 2`.
     * @default 0.1
     */
    padding?: number;
    /**
     * Reverse band order. First domain entry maps to the end of the range.
     * @default false
     */
    reverse?: boolean;
};

/** A value format with no inner lookups. Lookup cases and fallbacks are constrained to this so a `lookup` cannot nest another `lookup` at the type level. */
type ExplicitValueFormat = TemporalValueFormat | NumericValueFormat | CurrencyValueFormat | CategoricalValueFormat;

/***************************************************************
 * Filter Transform
 ***************************************************************/
interface FilterOptions {
    /** The variable to filter on. */
    variableName: VariableName;
    /** The comparison operator. */
    operator: ComparisonOperator;
    /** The value to compare against. */
    value: DataValue;
}

interface FilterTransformInput {
    type: 'transform';
    transformType: 'filter';
    options: FilterOptions;
}

interface FlipCoordInput {
    type: 'coord';
    coordType: 'flip';
    params?: Partial<BaseCoordParams>;
}

type FlipCoordParams = BaseCoordParams;

/**
 * An axis guide with each tick's label composed into a display string, plus rotation and truncation
 * hints. Produced by `LayoutCompiler.compile()`, which runs the final two-phase tick selection
 * (picking the densest candidate set whose labels fit) — so by the time a renderer sees this the
 * ticks are settled. Do not re-select candidates or re-apply a `ValueFormat`.
 */
interface FormattedAxis extends Omit<CompiledAxisGuide, 'tickCandidates'> {
    /**
     * The chosen ticks, each carrying its composed display string in `formattedLabel`. The label is
     * already locale-formatted — render it verbatim.
     */
    ticks: Array<AxisTick & {
        formattedLabel: string;
    }>;
    /** Rotation in degrees applied uniformly to all tick labels. 0 = no rotation. */
    labelRotation: number;
    /** Max label width in px before ellipsis truncation. null = no cap. */
    labelMaxWidthPx: number | null;
}

/**
 * A headline showing a single grand-total number, used for polar graphs. `value` is a bare final
 * display string: no prefix, label or swatch accompanies it. Render it verbatim.
 */
interface FormattedGrandTotalHeadline {
    kind: 'grandTotal';
    value: string;
}

/**
 * A headline guide with every value composed into display strings. Two shapes mirror the compiled
 * union: a per-group strip (one labelled figure per group) and a number-only polar grand total.
 */
type FormattedHeadline = FormattedPerGroupHeadline | FormattedGrandTotalHeadline;

/** A headline's trend versus a reference observation, formatted for display. */
interface FormattedHeadlineComparison {
    /** Movement direction — the only place the sign lives; drives the renderer's arrow and colour. */
    direction: HeadlineTrendDirection;
    /** Unsigned magnitude of the variation as a locale percentage, e.g. "20%" (sign comes from `direction`). */
    percentage: string;
    /** Reference observation label, e.g. "from Feb 2025". */
    reference: string;
}

/**
 * A single headline figure: its name, formatted value, observation label and optional trend
 * comparison. Every string field is final and display-ready (English-only — the aggregate prefix,
 * name, figure, and trend are already composed); render them verbatim, do not recompose or relocalize.
 */
interface FormattedHeadlineItem {
    /** Group swatch, passed through from the compiled item (present only at ≥2 groups). */
    swatch: HeadlineGroupSwatch | null;
    /** Composed name: aggregate prefix + group (or measure) name, e.g. "Total revenue", "Avg. Sofa". */
    label: string;
    /** Formatted aggregate figure; null when the group had no numeric values. */
    value: string | null;
    /** Formatted main-axis label: a point ("3") or a first–last range ("Jan 2025 – Mar 2025"). */
    observationLabel: string | null;
    /** Formatted trend, or null when no comparison applies. */
    comparison: FormattedHeadlineComparison | null;
}

/** A legend guide with each item's label composed into a display string. */
interface FormattedLegend extends Omit<CompiledLegendGuide, 'items'> {
    /** Legend items, each carrying its composed display string in `formattedLabel`. */
    items: Array<LegendItem & {
        formattedLabel: string;
    }>;
}

/** A headline showing one labelled figure per group (e.g. one per group). */
interface FormattedPerGroupHeadline {
    kind: 'perGroup';
    items: FormattedHeadlineItem[];
}

/**
 * An aesthetic a geom reads from its layer's mapping, tagged by how the engine treats it:
 *
 * - `'visual'` — a scaled visual channel (`color`, `size`), trained through a scale. Constrained to the
 *   built-in {@link AestheticKey} vocabulary.
 * - `'data'` — a relational/layout input read straight from the mapped column without any scale (a
 *   sankey's `source`/`target`/`value`). Free-form name, outside the built-in vocabulary.
 *
 * Declaring an aesthetic registers its name so the mapping is recognised (no `UNDECLARED_AESTHETIC`
 * warning) and, when `required`, enforced by the missing-aesthetic check.
 */
type GeomAesthetic = {
    readonly kind: 'visual';
    readonly name: AestheticKey;
    readonly required?: boolean;
} | {
    readonly kind: 'data';
    readonly name: string;
    readonly required?: boolean;
};

/** A geom's declared aesthetics. */
type GeomAesthetics = readonly GeomAesthetic[];

/** Context a geom's `validateMapping` hook receives to assert a bespoke mapping requirement. */
interface GeomMappingValidationInput {
    /** The layer's effective mapping (root + layer merged). */
    mapping: AesMapping;
    /** Aesthetics the layer's stat computes at compile time, which count as "provided". */
    computedVariables: ReadonlySet<AestheticKey>;
}

/**
 * The type of geometric mark used to represent data in a layer.
 *
 * - `'point'` — Scatter-style dot marks
 * - `'line'` — Connected line marks
 * - `'area'` — Filled area marks
 * - `'bar'` — Rectangular bar marks (cartesian) or pie wedge (polar)
 * - `'rule'` — Horizontal or vertical reference line at a constant value
 */
type GeomName = 'point' | 'line' | 'area' | 'bar' | 'rule';

type GeomOptions<G extends GeomName> = BaseGeomOptions<GeomParamsMap[G]>;

type GeomParams = GeomParamsMap[keyof GeomParamsMap];

/**
 * Maps each geom type name to its resolved parameter type.
 */
interface GeomParamsMap {
    point: PointGeomParams;
    line: LineGeomParams;
    area: AreaGeomParams;
    bar: BarGeomParams;
    rule: RuleGeomParams;
}

/** Output of the layout computation. */
interface GraphLayout {
    /** The full graphical area: panel + axes + axis labels, excluding header and footer. */
    plot: Rect;
    /** The bordered container that surrounds the panel. */
    panelFrame: Rect;
    /**
     * The panel area where geom layers render i.e. the data rectangle inside the axes. Strictly nested
     * inside `plot`. Geoms paint here in normalized `[0,1]` data space with y inverted
     * (data y=0 sits at the panel bottom), so map a data point to `panel.x + x * panel.width` and
     * `panel.y + (1 - y) * panel.height`. Equal to {@link panelFrame} unless the layout reserves extra space
     * for content that overflows the panel.
     */
    panel: Rect;
    /** Rects for axis regions (ticks + tick labels), keyed by edge. */
    axes: Partial<Record<LayoutEdge, Rect>>;
    /** Rects for axis title labels, keyed by edge. */
    axisLabels: Partial<Record<LayoutEdge, Rect>>;
    /** Rect for the header region (title + subtitle, above the panel). */
    header: Rect;
    /** Full-width rect for the headline strip (below the header, above the plot). Zero when absent. */
    headline: Rect;
    /** Rect for the footer region (caption, below the panel). */
    footer: Rect;
    /** Rects for the legend regions, keyed by edge. */
    legends: Partial<Record<LayoutEdge, Rect>>;
}

type GraphyPaletteConfig = {
    type: 'graphy';
    variant?: GraphyPaletteVariant;
};

/** `waterfall` swaps in the positive/negative/total colors used by waterfall graphs. */
type GraphyPaletteVariant = 'default' | 'waterfall';

/** A geom's per-coord grid/border visibility overrides, applied by the axes guide. */
interface GridPolicy {
    hideGridX?: boolean;
    hideGridY?: boolean;
    hideBorder?: boolean;
}

/** Geometric shape an axis traces: a straight line, a full circle or a spoke from the centre. */
type GuideGeometry = 'linear' | 'circular' | 'radial';

/**
 * Comparison reference for trend indicator
 * - 'previous': Compare to preceding data point
 * - 'first': Compare to initial value in series
 * - 'none': No comparison indicator
 */
type HeadlineCompare = 'previous' | 'first' | 'none';

/**
 * Headline numbers configuration
 */
interface HeadlineConfig {
    /**
     * Which aggregate to display
     * @default 'none'
     */
    show: HeadlineShow;
    /**
     * Reference point for trend comparison
     * @default 'none'
     */
    compareWith: HeadlineCompare;
    /**
     * Visual size of the headline numbers
     * @default 'auto'
     */
    size: HeadlineSize;
    /**
     * Where to display the headline
     * - 'above': In the header region above the chart (default)
     * - 'center': In the center of a donut chart hole (only valid for donut charts with inner radius)
     * @default 'above'
     */
    position: HeadlinePosition;
}

interface HeadlineGroupSwatch {
    color: string;
    /** The owning layer's geom — the renderer reads its swatch shape off the geom's render contract. */
    geom: string;
}

/**
 * Placement of headline numbers
 * - 'above': Display above the chart (default, in the header region)
 * - 'center': Display in the center of a donut chart hole (only valid for donut charts)
 */
type HeadlinePosition = 'above' | 'center';

/**
 * Display mode for headline numbers
 * - 'total': Sum of all values
 * - 'average': Arithmetic mean
 * - 'current': Last value in series (for time series)
 * - 'conversion': Percentage change from first to last (not implemented yet — compiles to no headline)
 * - 'none': Disable headline numbers
 */
type HeadlineShow = 'total' | 'average' | 'current' | 'conversion' | 'none';

/**
 * Size of headline numbers
 * - 'auto': Automatically scale based on available space and number of series
 * - 'small': Compact display
 * - 'medium': Standard display
 * - 'large': Prominent display
 */
type HeadlineSize = 'auto' | 'small' | 'medium' | 'large';

/**
 * Direction of a headline's trend, and the sole source of the comparison's sign — drive both the
 * arrow and the colour off it, since `percentage` is unsigned. `flat` is neutral, so render it
 * without a good/bad colour or a directional arrow.
 */
type HeadlineTrendDirection = 'up' | 'down' | 'flat';

interface HighlightBuilderOptions {
    id?: string;
    scope?: HighlightScope;
    layerIndex?: number;
}

/**
 * Scope of a highlight match — what visual unit gets the matched treatment.
 *
 * - `data-point` (default): rows that satisfy the predicate are matched
 *   individually; siblings in the same series stay un-matched.
 * - `series`: any row that satisfies the predicate expands to its whole series
 *   (group). The entire series renders as matched; sibling rows in the series
 *   are matched too. Use this to highlight a whole line / area / bar group.
 * - `x-value`: any row that satisfies the predicate expands to all rows
 *   sharing the same x value. Use this to highlight a vertical slice across
 *   series.
 */
type HighlightScope = 'data-point' | 'series' | 'x-value';

/**
 * How a geom composes highlight matches above its base render. Looked up per geom in
 * `HIGHLIGHT_STRATEGY_BY_GEOM` and stamped onto `CompiledLayer.highlight.strategy` by
 * the layer compiler. Tells the renderer how to consume {@link HighlightComposition}:
 *
 * - `'observation-rerender'`: re-render `composition.matchedLayer` through the same geom renderer
 *   (on top of the dimmed base), no overlays. Used by per-observation surface geoms (bar, rule).
 * - `'overlay-anchor'`: series-scope matches still go through the `matchedLayer` re-render pass,
 *   but data-point / x-value matches surface instead as a dot + value label per
 *   `composition.overlayCandidates` entry, placed at the geom's own anchor for that observation.
 *   Used by line, area, point.
 */
type HighlightStrategy = 'observation-rerender' | 'overlay-anchor';

/**
 * Chart-global dimming mode for non-matched observations when at least one
 * observation is matched by a highlight. `'dim'` lowers their opacity;
 * `'desaturate'` replaces their fill/stroke with a neutral grey.
 */
type HighlightStyle = 'dim' | 'desaturate';

/**
 * A single hit returned by the hover engine. Discriminated on {@link AnchoredHoverHit.anchored}: an
 * anchored hit carries `(x, y)`; a render-owned hit carries none, so reading `x`/`y` without first
 * narrowing on `anchored` is a compile error rather than a silent placeholder.
 */
type HoverHit = AnchoredHoverHit | AnchorlessHoverHit;

/**
 * A single hit returned by the hover engine.
 */
interface HoverHitBase {
    /**
     * Stable `CompiledLayer.id`. The engine preserves it across `update()` calls regardless of layer
     * reordering or insertion, so callers must resolve a layer by matching `layer.id === hit.layerId`,
     * never by `layers[layerId]`.
     */
    layerId: string;
    /**
     * An opaque per-layer stable handle for the hit geom, used by the engine as a warm-start seed for
     * subsequent queries. The encoding is per index kind:
     * - `buckets` / `rects` / `cells`: the dataset row inside the layer's observations.
     * - `points`: the entry's position inside the layer's `points[]` (i.e. the Delaunay's array
     *   index). Diverges from the dataset row when the dataset has null x/y gaps, so callers must
     *   read `observation` rather than indexing `data` by `pointIndex`.
     */
    pointIndex: number;
    /**
     * The observation being hovered over. Renderers read values from here; the engine does not format.
     */
    observation: Observation;
}

/**
 * What makes "the same observation" across recompiles, for morphs and hover stability.
 *
 * Two kinds. `'index'` and `'x-group'` are *derived*: the pipeline resolves them from the layer's
 * position/mapping, so the geom names a role, not a column.
 * - `'index'`: positional index into the dataset — the fallback when no field is stable.
 * - `'x-group'`: the columns backing the layer's x + group aesthetics, resolved per chart from the
 *   mapping. The default for standard cartesian geoms, which can't name those columns themselves.
 *
 * `{ variable }` is *explicit*: identity is one data column the geom owns and names directly, for a
 * geom keyed by its own id (sankey nodes, voronoi sites) where the x+series roles don't apply.
 */
type IdentityKey = 'index' | 'x-group' | {
    readonly variable: string;
};

interface IdentityScaleInput {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'identity';
}

type IdentityScaleOptions = Record<string, never>;

/**
 * Resolved identity stat spec.
 */
interface IdentityStatSpec {
    type: 'identity';
}

/** How an image annotation scales inside its box: stretch, letterbox, or crop-to-fill. */
type ImageAnnotationFit = 'fill' | 'contain' | 'cover';

/**
 * Image annotation. Its area is positioned by a {@link RegionAnchorInput} so it
 * re-resolves each compile (re-flows on resize, tracks data when bound).
 */
interface ImageAnnotationInput {
    id?: string;
    /** Image URL or data URI. */
    src: string;
    /** Draw beneath the geoms (background) or on top (foreground). */
    zOrder?: AnnotationZOrder;
    /** The area the image fills. */
    region: RegionAnchorInput;
    /** How the image scales inside its box. */
    fit?: ImageAnnotationFit;
    /** Opacity, 0 (transparent) to 1 (opaque). */
    opacity?: number;
}

interface InferredScaleInput {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'inferred';
    options?: InferredScaleOptions;
}

type InferredScaleOptions = ContinuousScaleOptions | DiscreteScaleOptions | DatetimeScaleOptions;

/**
 * Stable code for a violated engine invariant.
 */
type InternalErrorCode = 'INTERNAL_INVARIANT';

/**
 * Curve interpolation method for lines and areas.
 *
 * - `'linear'` — Straight segments between points. Maps to d3-shape `curveLinear`.
 * - `'catmull-rom'` — Smooth spline through points. Maps to d3-shape `curveCatmullRom`.
 */
type InterpolateType = 'linear' | 'catmull-rom';

/**
 * Any value that survives a `JSON.stringify` / `JSON.parse` round-trip unchanged.
 */
type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};

/** The aesthetic channels with first-class engine support — the source of {@link AestheticKey}. */
interface KnownAesthetics {
    x?: AestheticValue;
    y?: AestheticValue;
    label?: AestheticValue;
    color?: AestheticValue;
    size?: AestheticValue;
    /** Opacity (0–1). */
    alpha?: AestheticValue;
    /** Splits geoms into groups (separate lines/areas) without assigning a visual aesthetic. */
    group?: AestheticValue;
    strokeWidth?: AestheticValue;
    /** Dash-pattern aesthetic (solid, dashed, dotted, ...). */
    lineType?: AestheticValue;
}

/** Pixel gaps around each col. Same max(prev.after, next.before) rule as rows. */
const LAYOUT_COL_GAPS: {
    readonly leftLegend: {
        readonly after: 10;
        readonly before: 0;
    };
    readonly leftAxis: {
        readonly after: 4;
        readonly before: 0;
    };
    readonly rightAxis: {
        readonly after: 10;
        readonly before: 4;
    };
};

/**
 * Pixel gaps around each row. The boundary between two present rows is sized
 * as max(prev.after, next.before), so either side can claim breathing room.
 * Spacers are only materialised when both neighbours resolve to non-zero size.
 */
const LAYOUT_ROW_GAPS: {
    readonly header: {
        readonly after: 10;
        readonly before: 0;
    };
    readonly headline: {
        readonly after: 4;
        readonly before: 0;
    };
    readonly topLegend: {
        readonly after: 8;
        readonly before: 0;
    };
    readonly topAxisLabel: {
        readonly after: 8;
        readonly before: 0;
    };
    readonly topAxis: {
        readonly after: 0;
        readonly before: 0;
    };
    readonly bottomAxis: {
        readonly after: 4;
        readonly before: 0;
    };
    readonly bottomAxisLabel: {
        readonly after: 16;
        readonly before: 0;
    };
    readonly bottomLegend: {
        readonly after: 10;
        readonly before: 16;
    };
};

/** The full set of supported BCP-47 locale strings. */
const LOCALES: readonly ["en-GB", "en-US", "ar", "pt-PT"];

/**
 * Fields shared by every layer input regardless of geom. All optional fields fall back to resolved
 * defaults; the geom-specific arms of {@link LayerInput} add `geom` and `params` on top.
 */
interface LayerInputBase {
    type: 'layer';
    /** Stable identifier; auto-assigned during resolution when omitted. */
    id?: string;
    /** Layer-local aesthetic mapping, merged over the spec-level mapping. */
    mapping?: AesMapping;
    /**
     * Statistical transform applied to this layer (e.g. count, mean, smooth), or a custom plugin stat.
     * @default 'identity'
     */
    stat?: StatName | StatInput | CustomStatInput<string>;
    /** How overlapping geoms are arranged (stack, dodge, fill, identity). */
    position?: PositionType;
    /** Which y scale this layer binds to — the primary or secondary axis. */
    yScaleType?: YScaleType;
    dataLabels?: DataLabelsInput;
    /**
     * Ordered transforms applied to this layer's view of the data, on top of any
     * spec-level transforms. Use this when a geom needs a different shape of the
     * data than its siblings (e.g. a line overlay on top of reshaped stacked bars).
     */
    transforms?: TransformInput[];
    /**
     * When `false`, the layer is skipped from main hover hit-detection.
     * @default true
     */
    interactive?: boolean;
}

/**
 * Layout configuration.
 *
 * A general per-region map (rather than a theme token per gap) because the set of boundaries is
 * open-ended and reads naturally as part of the chart spec. Anything left unset keeps the engine
 * defaults.
 */
interface LayoutConfig {
    /**
     * Outer padding around the whole chart, in pixels, applied on all four sides. `null` uses the engine
     * default padding ({@link LAYOUT_PADDING}).
     */
    padding: number | null;
    /** Per-region overrides for the grid spacing around each named region. */
    gaps: Partial<Record<LayoutGapName, LayoutGapOverride>>;
}

/** Positions where axes/labels/legends can be placed around the panel. */
type LayoutEdge = 'top' | 'right' | 'bottom' | 'left';

/**
 * Named regions in the chart's layout grid whose surrounding pixel gaps can be overridden via
 * {@link LayoutConfig.gaps}. Derived from the engine's default gap maps so the overridable set
 * cannot drift from the grid regions that actually consume the overrides.
 */
type LayoutGapName = keyof typeof LAYOUT_ROW_GAPS | keyof typeof LAYOUT_COL_GAPS;

/**
 * Override for a single named grid gap. A bare number sets the trailing (`after`) gap; the object
 * form sets either edge, and an omitted edge keeps the engine default for that side. Overrides feed
 * the `max(prev.after, next.before)` boundary rule described on {@link LayoutGapName}, so a lone
 * `after` cannot shrink a boundary below the following region's `before`.
 */
type LayoutGapOverride = number | {
    before?: number;
    after?: number;
};

/**
 * Legend configuration (after defaults applied)
 */
interface LegendConfig {
    /**
     * Position of the legend
     * @default 'top'
     */
    position: LegendPosition;
    /**
     * Display mode for the legend.
     * - 'pill': Standard boxed legend with icons and labels
     * - 'direct': Labels rendered directly next to series endpoints
     * - 'auto': Resolved during compilation based on chart type and legend position
     *
     * @default 'auto'
     */
    display: LegendDisplay;
}

/**
 * Legend configuration input type (all fields optional)
 */
type LegendConfigInput = Partial<LegendConfig>;

/**
 * Legend display mode type
 * - 'pill': Standard boxed legend with icons and labels
 * - 'direct': Labels rendered directly next to series endpoints
 * - 'auto': Resolved during compilation based on chart type
 */
type LegendDisplay = 'pill' | 'direct' | 'auto';

/** One item in a legend: a domain value paired with the visual values that represent it. */
interface LegendItem {
    /** Raw data value (e.g., "Apples") */
    value: DataValue;
    /** Friendly name for this item's `value`, or `null` when none is registered. */
    label: string | null;
    /** Mapped visual values per aesthetic (e.g., { color: '#ff0000' }). */
    visual: LegendItemVisual;
    /**
     * Normalized y position in [0,1], 1 = top (matches {@link DirectLabelInput.normalizedY}). Null when display
     * is not 'direct' or no endpoint found.
     */
    normalizedY: number | null;
    /**
     * The geom whose swatch this item describes. Per-item because a single merged legend can span
     * layers of different geoms (e.g. a combo chart's bar series and line series share one legend).
     * The renderer maps it to a swatch shape via its `(geom, coord)` registry — the same geom that
     * drives the headline and rule pills.
     */
    geom: string;
    /**
     * Format descriptor for this item's `value`. Per-item because a combo legend can span layers
     * whose aesthetic variables have different inferred formats.
     */
    valueFormat: ValueFormat;
}

/**
 * Visual values produced by a legend's scales, keyed by aesthetic.
 */
interface LegendItemVisual {
    color?: string;
    /**
     * Symbol diameter in pixels, present on bubble legends (see {@link CompiledLegendGuide.aesthetics}). Render a
     * sized circle rather than a swatch; skip the item when this is non-finite or ≤ 0.
     */
    size?: DataValue;
    alpha?: DataValue;
    strokeWidth?: DataValue;
    /** Stroke style for `line` / `area` swatches only (solid/dashed/dotted). Other swatch shapes ignore it. */
    lineType?: LineStyleType;
}

/**
 * How a geom relates to the colour legend. Read by the legends guide to decide whether a redundant
 * single-item legend is dropped, where an `'auto'` legend lands, and whether direct (inline) labels
 * can stand in for it.
 */
interface LegendPolicy {
    /** When a single item renders, the legend is redundant (the graph shows it directly), so suppress it. */
    suppressWhenSingleItem?: boolean;
    /** When this geom's legend prefers the side (right) over the top; defaults to `'never'`. */
    sidePlacement?: LegendSidePlacement;
    /** Positions for which this geom shows direct (inline) series labels instead of a pill legend. */
    directLabelSupport?: Partial<Record<PositionType, boolean>>;
}

type LegendPosition = 'auto' | 'right' | 'left' | 'top' | 'bottom' | 'none';

/**
 * When a geom's colour legend prefers the side (right) over the top, used to resolve an `'auto'`
 * legend position once the rendered item count is known:
 * - `'never'`: always top-placed (the default — point, rule, and any geom that doesn't opt in).
 * - `'whenCrowded'`: moves to the side once there are many items (line/area).
 * - `'whenStackedVertical'`: moves to the side only for vertically-stacked layers (bar).
 */
type LegendSidePlacement = 'never' | 'whenCrowded' | 'whenStackedVertical';

/**
 * Line-specific parameters
 */
interface LineGeomParams {
    /**
     * Stroke width in pixels. `'auto'` reads the per-observation `strokeWidth`
     * value (`getStrokeWidth`) and falls back to the geom default when unmapped.
     */
    lineWidth: number | 'auto';
    /**
     * Interpolation method to use for the line. Names a d3-shape curve family:
     * `'linear'` ⇒ `curveLinear`, `'catmull-rom'` ⇒ `curveCatmullRom`.
     * @default 'linear'
     */
    interpolate: InterpolateType;
    /**
     * How to handle missing (NULL/undefined) values:
     * - `'zero'`: nulls arrive already substituted with zero by the compiler —
     *   render normally, no special handling.
     * - `'gap'`: break the path wherever x or y is null (d3 `defined()`).
     * - `'connect'`: drop null rows before pathing so the line spans the gap.
     * @default 'gap'
     */
    missingValues: MissingValuesType;
    /**
     * Draws a gradient fill beneath the line (series color fading from the line down to
     * transparent at the panel baseline).
     * @default false
     */
    showFill: boolean;
}

/**
 * Stroke style for line rendering.
 *
 * - `'solid'` — Continuous unbroken stroke
 * - `'dashed'` — Repeating dash pattern
 * - `'dotted'` — Repeating dot pattern
 */
type LineStyleType = 'solid' | 'dashed' | 'dotted';

/** Logical composition of any predicate. */
type LogicalPredicate = {
    and: Predicate[];
} | {
    or: Predicate[];
} | {
    not: Predicate;
};

/**
 * A value format that switches on a peer variable's value. Produced by transforms whose output is
 * structurally observation-dependent (see `reshapeFromWideToLong`).
 */
interface LookupValueFormat {
    type: 'lookup';
    /** Peer variable whose stringified value selects the case. */
    byVariable: VariableName;
    /** Case format keyed by `getStableKey(observation[byVariable])`. */
    cases: Record<string, ExplicitValueFormat>;
    /** Format used when an observation isn't available, or its case-key is absent from `cases`. */
    fallback: ExplicitValueFormat;
}

/**
 * The data-space axis a `CartesianCoordSystem` uses as the main (independent) axis.
 * When `mainAxis === 'y'` (flip), the position variable roles swap: the x-variables (`getX`/`getXMin`/
 * `getXMax`) carry the measure / cross-axis extent and the y-variables carry the main-axis band
 * position. The swap is baked into the position variables at compile time (the coord transform renames
 * them), so `getX`/`getY` map straight to their pixel axes regardless of flip. This flag is for
 * consumers that must reason about which data axis is independent — guide placement, hover bucketing,
 * label and arrow growth direction — via the `coord/axes` main/cross helpers.
 */
type MainAxis = 'x' | 'y';

/**
 * A pipeable spec item that sets/merges the global aesthetic mapping.
 */
interface MappingItem {
    type: 'mapping';
    mapping: AesMapping;
}

/**
 * Resolved mean stat spec.
 */
interface MeanStatSpec {
    type: 'mean';
}

/**
 * Strategy for handling null/undefined values in lines and areas.
 *
 * - `'zero'` — Replace missing values with zero. Pre-substituted by the compiler, so the renderer
 *   sees no nulls and paths normally.
 * - `'gap'` — Leave a visible gap where values are missing. The renderer breaks the path at any
 *   null x / y (e.g. d3's `defined()`).
 * - `'connect'` — Skip missing values and connect adjacent valid points. The renderer drops nulls before pathing.
 */
type MissingValuesType = 'zero' | 'gap' | 'connect';

/** One of the base hues a monochrome palette can be built from. */
type MonoPaletteBase = (typeof MONO_BASES)[number];

type MonoPaletteConfig = {
    type: 'mono';
    base: MonoPaletteBase;
    variant?: MonoPaletteVariant;
};

/** Tints the single-hue ramp for use on light vs dark backgrounds. */
type MonoPaletteVariant = 'light' | 'dark';

/** One of the base hues a neon palette can be built from. */
type NeonPaletteBase = (typeof NEON_BASES)[number];

type NeonPaletteConfig = {
    type: 'neon';
    base: NeonPaletteBase;
    variant?: NeonPaletteVariant;
};

/** `waterfall` swaps in the positive/negative/total colors used by waterfall graphs. */
type NeonPaletteVariant = 'default' | 'waterfall';

/**
 * Configuration for formatting a single number.
 * Defines how numeric values should be displayed in the chart.
 */
interface NumberFormatConfig {
    /**
     * Number of decimal places to display.
     * - number: Fixed decimal places (e.g., 2 → "1234.56")
     * - 'auto': Automatic based on value magnitude (default)
     */
    decimals: number | 'auto';
    /**
     * Abbreviation style for large numbers.
     * - 'none': No abbreviation (1234567 → "1,234,567")
     * - 'auto': Automatic based on magnitude (1234567 → "1.2M")
     * - 'k': Force thousands (1234567 → "1,234.6K")
     * - 'm': Force millions (1234567 → "1.2M")
     * - 'b': Force billions (1234567890 → "1.2B")
     */
    abbreviation: 'auto' | 'k' | 'm' | 'b' | 'none';
    /**
     * Thousands separator character.
     * Default: ',' (US) or locale-aware if locale is set
     */
    thousandsSeparator?: string;
    /**
     * Decimal separator character.
     * Default: '.' (US) or locale-aware if locale is set
     */
    decimalSeparator?: string;
    /**
     * Prefix to prepend (e.g., '$', '€').
     */
    prefix?: string;
    /**
     * Suffix to append (e.g., '%', ' units').
     */
    suffix?: string;
}

interface NumericValueFormat {
    type: 'decimal' | 'integer' | 'percentage' | 'duration';
}

/** Points at a single observation by its anchor value and series. */
interface ObservationAnchorInput {
    /** Pick a specific layer when multiple share the same `(anchorValue, groupValue)` pair. */
    layerIndex?: number;
    /** Value on the main axis (x in cartesian, y in flipped). */
    anchorValue: DataValue;
    /** The group value to match if any, otherwise match any group. */
    groupValue?: DataValue;
}

/**
 * Configure a different overflow strategy per direction.
 */
interface OverflowStrategyConfig {
    x: PanelOverflowStrategy;
    y: PanelOverflowStrategy;
}

/** Palette selector accepted from users; a custom palette is referenced by `id` only. */
type PaletteConfigInput = DefaultPaletteConfig | GraphyPaletteConfig | PastelPaletteConfig | NeonPaletteConfig | MonoPaletteConfig | CustomPaletteInput;

/** User-facing palette color scale; defaults to the active theme palette when `palette` is omitted. */
interface PaletteScaleInput {
    type: 'scale';
    /** Which aesthetic this scale drives — only color aesthetics accept palettes. */
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'palette';
    /** Named or custom palette to draw group colors from. */
    palette?: PaletteConfigInput;
    /** Per-group color overrides on top of the chosen palette. */
    overrides?: PaletteOverridesInput;
}

interface PaletteScaleOptions {
    /** Named or custom palette to draw group colors from. */
    palette?: PaletteConfigInput;
    /** Per-group color overrides on top of the chosen palette. */
    overrides?: PaletteOverridesInput;
}

/** One side of the panel border. */
type PanelBorderEdge = 'top' | 'right' | 'bottom' | 'left';

/**
 * Configuration for one edge of the panel border.
 */
interface PanelBorderEdgeConfig {
    /**
     * Whether this edge is drawn.
     * @default true
     */
    isVisible: boolean;
    /**
     * Line style of this edge.
     * @default 'dashed'
     */
    lineStyle: LineStyleType;
    /**
     * Stroke width of this edge in px. null inherits the theme's grid line width.
     * @default null
     */
    lineWidth: number | null;
    /**
     * Stroke color of this edge. Accepts any CSS color, including theme tokens
     * (e.g. `'var(--graphy-grey-70)'`). null inherits the theme's grid line color.
     * @default null
     */
    color: string | null;
}

/**
 * Panel configuration. The border is configured per edge; a corner is rounded
 * only when both edges meeting at it are visible.
 */
interface PanelConfig {
    border: Record<PanelBorderEdge, PanelBorderEdgeConfig>;
    /**
     * Corner radius of the panel border in px. A corner is rounded only when both edges meeting
     * at it are visible.
     * @default 8
     */
    cornerRadius: number;
    /** Per-source, per-axis strategy to use for content that overflows the panel edge. */
    overflow: {
        dataLabels: OverflowStrategyConfig;
        differenceArrows: OverflowStrategyConfig;
    };
}

/**
 * How the panel adapts to content that would otherwise overflow its edge.
 * - `outside`: the overflowing element lands outside the panel frame and the frame shrinks to
 *    accomodate it.
 * - `inside`: the overflowing element stays inside the panel frame and the content inside the
 *   frame shrinks to accomodate it.
 * - `none`: no accomodation, content may overflow and overlap with other elements
 */
type PanelOverflowStrategy = 'outside' | 'inside' | 'none';

type PastelPaletteConfig = {
    type: 'pastel';
    variant?: PastelPaletteVariant;
};

/** `waterfall` swaps in the positive/negative/total colors used by waterfall graphs. */
type PastelPaletteVariant = 'default' | 'waterfall';

/**
 * Pinned-number annotation: a marker dot pinned to a single observation. The
 * renderer's mini view shows the observation's measurement value; hover reveals
 * the full tooltip (x + y + trend).
 */
interface PinnedNumberAnnotationInput {
    id?: string;
    at: ObservationAnchorInput;
}

/**
 * One entry in the unified `plugins` array. Either a bare compile definition, a render half that carries
 * its definition at `.definition`, or a render-only override that carries none. The first two contribute
 * a compile definition (matched structurally over the field that already exists, never by naming
 * react-renderer's `GeomRendererDefinition` type); the last seeds only the render registry.
 */
type Plugin = CompileDefinition | {
    readonly definition: CompileDefinition;
} | RenderOnlyPlugin;

/**
 * A single position, expressed as a relationship to the graph that re-resolves each compile.
 *
 * - `panel`: a fraction of the plot rect (`[0,1]`), top-left origin. Does not snap to data.
 * - `observation`: pinned to one observation by its `(anchorValue, groupValue)` pair.
 */
type PointAnchorInput = {
    anchorType: 'panel';
    x: number;
    y: number;
    offset?: AnchorOffset;
} | {
    anchorType: 'observation';
    /** Pick a specific layer when multiple share the same `(anchorValue, groupValue)` pair. */
    layerIndex?: number;
    anchorValue: DataValue;
    groupValue?: DataValue;
    align?: AnchorAlign;
    offset?: AnchorOffset;
};

/**
 * Point-specific parameters
 */
interface PointGeomParams {
    /** Marker diameter in pixels. */
    size: number;
}

interface PolarCoordInput {
    type: 'coord';
    coordType: 'polar';
    params?: Partial<PolarCoordParams>;
}

/**
 * Params for polar coordinate system
 */
interface PolarCoordParams extends BaseCoordParams {
    /**
     * Which aesthetic maps to theta (angle): 'x' or 'y'
     */
    theta: 'x' | 'y';
    /**
     * Starting angle in degrees
     */
    startAngle: number;
    /**
     * Inner radius as fraction 0-1 (for donut charts)
     */
    innerRadius: number;
}

/**
 * Polar coordinate system - for pie charts, radar charts, etc.
 * Angular params (theta, startAngle) are consumed by the compiler during coordTransform.
 * `innerRadius` is also exposed here so the renderer can recover the donut hole geometry
 * (e.g. to place a centred headline) without reaching into per-observation radii.
 *
 * Polar layers repurpose the position variables: x-variables carry angles, y-variables carry radii.
 * Angles are absolute radians (`startAngle` already applied, clockwise),
 * passed through unmodified. Radii are [0,1] fractions of the outer radius, mapped into a unit
 * circle whose center is the panel center and whose radius is `min(panel.w, panel.h) / 2`.
 */
interface PolarCoordSystem {
    type: 'polar';
    /** Axis orientation metadata for the guide compiler */
    axisMapping: AxisMapping;
    /**
     * Donut hole radius as a fraction of the outer radius (0-1). 0 for a full pie.
     * This is the same fraction the radial transform uses as the per-arc RadiusExtent.innerRadius
     * floor, so it is recoverable from any arc.
     */
    innerRadius: number;
    /**
     * Angular offset of the first position, in radians (the spec's `startAngle` converted from degrees).
     * The angular transform bakes it into the `x` column and the guide renderer reuses it, so painted
     * marks, spokes and rim labels share one origin.
     */
    startAngle: number;
    /**
     * Extra frame rotation, in radians, that lands the first categorical spoke on `startAngle`
     * (first-axis-up). The band scale places category 0 at `1/(2N)`, so this is `−(1/(2N))·2π` for a
     * categorical circular axis and `0` for a continuous one (pie/donut). Added alongside `startAngle`
     * in the angular transform and recovered identically by the guide renderer.
     */
    spokeRotation: number;
    /**
     * Which position axis carries the chart's categorical band, or `null` when there is none: `'x'` for a
     * radar/rose (categories spoke the angular axis), `'y'` for a radial bar (categories are concentric
     * radial tracks — the post-swap radius column), `null` for a pie/donut (the angle is a continuous value
     * sweep, so no position axis is categorical). Resolved once in `setup` so the guide compiler (does this
     * polar chart draw axes?), the hover indexer (pie enclosure vs banded-bar snap, and which axis groups
     * the bands), and the polar hover guide (wedge orientation) each read one fact rather than re-deriving
     * it from mapping, axis geometry, or scale type.
     */
    bandAxis: 'x' | 'y' | null;
}

/** The axis a position role binds to. */
type PositionAxis = 'x' | 'y';

/**
 * One position column the geom's compile half injects and its render half reads (`yMin`/`yMax`/…).
 * Declaring it makes the cross-half column contract explicit, so a single-half override can be
 * checked rather than silently mispainting.
 *
 * `aes` names the aesthetic the mapper sources the role from — a plain `string`, so a geom may bind
 * a **custom positional aesthetic** (`'open'`, `'low'`) the engine then trains and scales like a
 * built-in channel. A `min`/`max` role without `aes` is compile-written (e.g. a bar's
 * `yMin = 0`); a `scalar` role scales its `aes` column in place into the aesthetic-named column.
 */
interface PositionRole {
    readonly axis: PositionAxis;
    readonly role: PositionRoleKind;
    readonly valueKind: 'value';
    readonly aes?: string;
}

/**
 * The role a position column plays on its axis (named column semantics):
 * - `point`: a single per-observation position; sources its axis aesthetic implicitly.
 * - `scalar`: a single value scaled in place on the axis (e.g. a reference line).
 * - `min` / `max`: the two ends of a per-observation interval (e.g. a bar's `[0, value]`).
 */
type PositionRoleKind = 'point' | 'scalar' | 'min' | 'max';

/** A geom's position roles. */
type PositionRoles = readonly PositionRole[];

/**
 * Position adjustment for overlapping geometries.
 *
 * - `'stack'` — Stack geometries on top of each other (e.g. stacked bar chart)
 * - `'dodge'` — Place geometries side by side (e.g. grouped bar chart)
 * - `'identity'` — No adjustment, use raw positions (e.g. scatter plot, allows overlapping)
 * - `'fill'` — Normalize stacks to fill 100% of the axis (e.g. 100% stacked bar chart)
 */
type PositionType = 'stack' | 'dodge' | 'identity' | 'fill';

interface PositionalScaleMethods {
    /**
     * Continuous (numeric) scale. Supports `transform`, `reverse`, `nice`, `zero`, `domainMin`, `domainMax`.
     * @example scale.x.continuous({ domainMin: 0, nice: true })
     */
    continuous: (options?: ContinuousScaleOptions) => ContinuousScaleInput;
    /**
     * Discrete (categorical) scale. Supports explicit `range` values.
     * @example scale.x.discrete({ range: ['A', 'B', 'C'] })
     */
    discrete: (options?: DiscreteScaleOptions) => DiscreteScaleInput;
    /**
     * Datetime (temporal) scale. Supports `domainMin` / `domainMax` in epoch ms.
     * @example scale.x.datetime({ domainMin: Date.parse('2020-01-01') })
     */
    datetime: (options?: DatetimeScaleOptions) => DatetimeScaleInput;
    /**
     * Continuous scale with base-10 logarithmic transformation.
     * @example scale.y.log({ domainMin: 1 })
     */
    log: (options?: ContinuousScaleOptions) => ContinuousScaleInput;
    /**
     * Continuous scale with square-root transformation.
     * @example scale.y.sqrt({ nice: true })
     */
    sqrt: (options?: ContinuousScaleOptions) => ContinuousScaleInput;
}

/** Any highlight match condition: a field test or a logical combination of them. */
type Predicate = VariablePredicate | LogicalPredicate;

interface QuantitativeScaleMethods {
    /**
     * Continuous (numeric) scale. Supports `transform`, `reverse`, `nice`, `zero`, `domainMin`, `domainMax`.
     * @example scale.size.continuous({ domainMin: 0 })
     */
    continuous: (options?: ContinuousScaleOptions) => ContinuousScaleInput;
    /**
     * Discrete (categorical) scale. Supports explicit `range` values.
     * @example scale.size.discrete({ range: [4, 8, 12] })
     */
    discrete: (options?: DiscreteScaleOptions) => DiscreteScaleInput;
    /**
     * Identity scale — data values used directly as visual values without transformation.
     * @example scale.size.identity() // { size: 10 } → 10px
     */
    identity: (options?: IdentityScaleOptions) => IdentityScaleInput;
}

/**
 * A rectangle in pixel coordinates, origin at top-left. Every rect on a {@link GraphLayout} is measured
 * from the graph container top-left (with {@link LAYOUT_PADDING} already included), never panel-local coordinates.
 */
interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * An area, expressed as a relationship to the graph.
 *
 * - `panel`: a rectangle in panel-rect fractions (`[0,1]`), top-left origin.
 */
type RegionAnchorInput = {
    anchorType: 'panel';
    x: number;
    y: number;
    width: number;
    height: number;
};

/**
 * A render-side spatial query a layout geom registers for its layer. The cursor arrives in
 * panel-local `[0, 1]` with a top-left origin — the frame the geom paints in — so it tests against
 * the geometry it drew without re-projecting. Returns the identity key under the cursor, or `null`.
 *
 * The returned `key` must equal `getStableKey(identityValue)`, the value {@link RenderHitTestIndex.byKey}
 * stored. `getStableKey` is identity for strings but normalizes other types (e.g. `Date → toISOString()`),
 * so a geom keying on a numeric/temporal column must return the normalized value or the lookup
 * silently misses.
 */
type RenderHitTester = (cursor: {
    x: number;
    y: number;
}) => {
    key: string;
} | null;

/***************************************************************
 * Reshape Transform
 ***************************************************************/
interface ReshapeOptions {
    /**
     * Numeric variables to collapse into rows.
     * Defaults to all numeric variables
     * */
    reshape?: VariableName[];
    /**
     * Variables to carry through unchanged.
     * Defaults to all categorical/temporal variables
     * */
    keep?: VariableName[];
    /**
     * Name of the output column containing the original variable names.
     * @default 'key'
     * */
    keyName?: VariableName;
    /**
     * Name of the output column containing the original values.
     * @default 'value'
     * */
    valueName?: VariableName;
}

interface ReshapeTransformInput {
    type: 'transform';
    transformType: 'reshape';
    options: ReshapeOptions;
}

/** A headline size with `'auto'` resolved away — what the renderer paints at. */
type ResolvedHeadlineSize = Exclude<HeadlineSize, 'auto'>;

/**
 * TipTap-compatible rich text node (no tiptap dependency).
 */
interface RichTextContent {
    type?: string;
    content?: RichTextContent[];
    text?: string;
    marks?: Array<{
        type: string;
        attrs?: Record<string, unknown>;
    }>;
    /**
     * Per-node attributes the renderer recognizes: `heading.level` (1–3),
     * `paragraph.textAlign`, and on the `textStyle` mark `color`, `font` (a font
     * id), and `fontSize` — a number read as `n/10` em. Unrecognized keys are
     * ignored.
     */
    attrs?: Record<string, unknown>;
}

/**
 * Rule-specific parameters.
 *
 * A rule is a single reference line. The renderer reads one observation —
 * `data.getFirst()` — via `getX`/`getY`. Orientation: horizontal when the layer
 * maps `y` (a constant-y line spanning the panel width), vertical otherwise;
 * under a flipped coord system the orientation inverts with the axes.
 */
interface RuleGeomParams {
    /** Stroke color; falls back to a theme token. */
    color?: string;
    /** Stroke width in pixels. */
    strokeWidth: number;
    /** Dash pattern of the line (solid, dashed, dotted, ...). */
    lineType: LineStyleType;
    /** Optional inline text label rendered alongside the line. */
    label?: string;
    labelPosition: RuleLabelPosition;
}

/**
 * Where the optional inline label is anchored along a reference line.
 */
type RuleLabelPosition = 'start' | 'end';

interface ScaleAPI {
    /**
     * X-axis scale. Callable for inferred (auto-detects type from data), or use explicit methods.
     * @example scale.x() // inferred
     * @example scale.x({ nice: true }) // inferred with options
     * @example scale.x.continuous({ domainMin: 0 })
     * @example scale.x.log()
     */
    x: ((options?: InferredScaleOptions) => InferredScaleInput) & PositionalScaleMethods;
    /**
     * Y-axis scale. Callable for inferred (auto-detects type from data), or use explicit methods.
     * @example scale.y() // inferred
     * @example scale.y.continuous({ zero: true, nice: true })
     * @example scale.y.log({ reverse: true })
     */
    y: ((options?: InferredScaleOptions) => InferredScaleInput) & PositionalScaleMethods;
    /**
     * Secondary Y-axis scale. Independent position scale rendered on the opposite axis.
     * Callable for inferred (auto-detects type from data), or use explicit methods.
     * @example scale.ySecondary() // inferred
     * @example scale.ySecondary.continuous({ nice: true })
     */
    ySecondary: ((options?: InferredScaleOptions) => InferredScaleInput) & PositionalScaleMethods;
    /**
     * Color scale. Use `.continuous()`, `.discrete()`, or `.palette()`.
     * @example scale.color.palette({ palette: 'Bright' })
     * @example scale.color.discrete({ range: ['red', 'blue'] })
     */
    color: ColorScaleMethods;
    /**
     * Size scale. Use `.continuous()`, `.discrete()`, or `.identity()`.
     * Defaults to sqrt transform for area-proportional encoding.
     * @example scale.size.continuous({ range: [2, 30] })
     * @example scale.size.identity() // use data values directly as px
     */
    size: QuantitativeScaleMethods;
    /**
     * Alpha (opacity) scale. Use `.continuous()`, `.discrete()`, or `.identity()`.
     * @example scale.alpha.continuous({ range: [0.2, 0.9] })
     * @example scale.alpha.identity() // use data values directly as opacity
     */
    alpha: QuantitativeScaleMethods;
    /**
     * Stroke width scale. Use `.continuous()`, `.discrete()`, or `.identity()`.
     * @example scale.strokeWidth.continuous({ range: [1, 6] })
     * @example scale.strokeWidth.identity() // use data values directly as px
     */
    strokeWidth: QuantitativeScaleMethods;
    /**
     * Line type (stroke style) scale. Discrete-only — interpolation between dash
     * patterns is not meaningful. Mapping `lineType` to a numeric variable errors
     * at compile time.
     * @example scale.lineType.discrete({ domain: ['actual', 'forecast'], range: ['solid', 'dashed'] })
     */
    lineType: CategoricalScaleMethods<LineStyleType>;
}

/** Scale-domain constraints a geom imposes on the inferred position scales. */
interface ScaleConstraints {
    /** Force this geom's band (x) scale to be discrete (e.g. a bar's categorical axis). */
    discreteMainAxis?: boolean;
    /** Anchor this geom's y scale at a zero baseline — its marks rise from 0. */
    zeroBaseline?: boolean;
}

/**
 * Union type for all possible scale specifications (including inferred, pre-resolution).
 */
type ScaleInput = ContinuousScaleInput | DiscreteScaleInput | PaletteScaleInput | DatetimeScaleInput | IdentityScaleInput | InferredScaleInput;

/**
 * Mathematical transformation for continuous scales.
 *
 * - `'linear'` — No transformation applied
 * - `'log'` — Base-10 logarithmic scale
 * - `'sqrt'` — Square root scale
 */
type ScaleTransformType = 'linear' | 'log' | 'sqrt';

/**
 * Identifiers for scales. Superset of AestheticKey — includes `ySecondary`
 * which is a scale aesthetic key but NOT an aesthetic (layers still map to `y`).
 */
type ScaledAestheticKey = ScaledPositionAestheticKey | ScaledVisualAestheticKey;

/** Scale keys whose output is a spatial coordinate. `ySecondary` is the optional second y axis. */
type ScaledPositionAestheticKey = 'x' | 'y' | 'ySecondary';

/** Scale keys whose output is a visual channel rather than a position. */
type ScaledVisualAestheticKey = 'color' | 'size' | 'alpha' | 'strokeWidth' | 'lineType';

/**
 * Rectangle annotation. Its area is positioned by a {@link RegionAnchorInput} so it
 * re-resolves each compile (re-flows on resize, tracks data when bound).
 */
interface ShapeInput {
    id?: string;
    kind?: ShapeKind;
    /** Draw beneath the geoms (background) or on top (foreground). */
    zOrder?: AnnotationZOrder;
    /** The area this shape fills. */
    region: RegionAnchorInput;
    fillColor?: string;
    /** Fill alpha, 0 (transparent) to 1 (opaque). */
    fillOpacity?: number;
    strokeWidth?: number;
    /** null falls back to the theme `defaultAnnotationShapeStroke`. */
    strokeColor?: string | null;
}

/** The geometry a shape annotation draws. */
type ShapeKind = 'rectangle';

/**
 * User-facing input for the `smooth` stat (params optional).
 */
interface SmoothStatInput {
    type: 'smooth';
    method: SmoothMethod;
    /** Polynomial order — only meaningful when `method: 'polynomial'`. */
    order?: number;
    /** LOESS bandwidth — only meaningful when `method: 'loess'`. */
    bandwidth?: number;
}

/***************************************************************
 * Sort Transform
 ***************************************************************/
interface SortOptions {
    /** The variable to sort by. */
    variableName: VariableName;
    /** Sort direction. @default 'asc' */
    direction?: 'asc' | 'desc';
}

interface SortTransformInput {
    type: 'transform';
    transformType: 'sort';
    options: SortOptions;
}

/** Data-source attribution shown under the caption. */
interface SourceContent {
    label?: string;
    url?: string;
}

/**
 * The coord-agnostic hit-test shape a geom declares — how its marks are shaped, never how that shape
 * projects under a coord. The runtime pairs this shape with the chart's coord system to build a matching
 * hover index; that projection lives in one place (`build-layer-index`), so a geom never names a
 * coord-specific variant and can't mis-declare one.
 *
 * - `'buckets'` — marks bucket along an axis for nearest-position snapping (line/area crosshair).
 * - `'rects'` — marks are rectangles (bars).
 * - `'points'` — marks are discrete vertices (scatter).
 * - `'noop'` — nothing hit-testable.
 * - `'render-hit-test'` — geometry comes from a render-side layout algorithm rather than position
 *   scales, so only the renderer can hit-test it.
 *
 * Every shape but `'render-hit-test'` is derived from position scales at compile time, so the runtime
 * builds its index from the compiled data alone.
 */
type SpatialKind = 'buckets' | 'rects' | 'points' | 'noop' | 'render-hit-test';

type SpecItem = LayerInput | ScaleInput | CoordInput | ConfigItem | AnyTransformInput | MappingItem | HighlightInput | AnnotationItem;

/**
 * Base class for statistical transformations applied to layer data (e.g. binning, counting, smoothing).
 */
abstract class Stat {
    /**
     * The stat's name. Built-in subclasses narrow this to a `StatName` literal; the base accepts any
     * `string` so a custom stat carries a name outside the built-in union, resolved through the registry.
     */
    abstract readonly type: string;
    /**
     * Aesthetics this stat will compute (e.g. count computes 'y'). Used by validation to skip existence checks.
     */
    abstract readonly computedVariables: ReadonlySet<AestheticKey>;
    compute(input: StatCompilerInput): CompiledStat;
    protected abstract computeStat(input: StatCompilerInput): CompiledStat;
}

/**
 * User-facing stat input — either a {@link StatName} string shorthand or an object spec.
 */
type StatInput = IdentityStatSpec | CountStatSpec | SmoothStatInput | MeanStatSpec;

/**
 * Sticker annotation: a built-in emoji-like image positioned by a {@link PointAnchorInput}.
 */
interface StickerAnnotationInput {
    id?: string;
    at: PointAnchorInput;
    sticker: StickerId;
}

/** Identifier of a built-in sticker image, resolved by the renderer's sticker catalogue. */
type StickerId = string;

interface TemporalValueFormat {
    type: 'datetime' | 'time' | 'date' | 'year' | 'quarter' | 'month_year' | 'month' | 'weekly_date_range_with_year' | 'weekly_date_range' | 'day_month';
    /**
     * Source-parsing metadata: the template the values were originally parsed from (e.g. 'dd-mm-yyyy').
     * It is not a formatting instruction and is not consumed when materializing output — the renderer
     * picks the display shape from `type` alone, not from this field.
     */
    dateFormat?: string;
}

/** How a text annotation's background fill is applied: faded into the plot or fully opaque. */
type TextAnnotationBackgroundColorStyle = 'fade' | 'opaque';

/**
 * Rich-text annotation. Its top-left corner is positioned by a {@link PointAnchorInput};
 * `width` is a fraction of the plot rect. Height is intrinsic to the rendered content.
 */
interface TextAnnotationInput {
    id?: string;
    /** Rich-text body to render. */
    content: RichTextContent;
    /** The annotation's top-left corner. */
    at: PointAnchorInput;
    /** 0..1 of plot width. */
    width: number;
    /** null falls back to a transparent background. */
    backgroundColor?: string | null;
    /** Whether the background fill fades into the plot or is fully opaque. */
    backgroundColorStyle?: TextAnnotationBackgroundColorStyle;
}

/** A text value — plain string or structured rich text. */
type TextContent = string | RichTextContent;

/** Fully-derived tooltip content. The popover renders directly from this. */
interface TooltipContent {
    /** Formatted main-axis value of the primary's observation. `null` for polar. */
    header: string | null;
    rows: TooltipRow[];
}

type TooltipContract = ReadonlyArray<{
    readonly key: string;
    readonly aes: string;
}>;

/**
 * One row in the chart tooltip popover. Pure projection of a `HoverHit` against the layer's
 * compiled scales.
 */
interface TooltipRow {
    /**
     * Resolved color string applied as the row's swatch fill/stroke. `null` only when the chart
     * has no color scale at all — the popover suppresses the swatch cell in that edge case.
     */
    swatchColor: string | null;
    /** The row's source geom — the renderer reads its swatch shape off the geom's render contract. */
    geom: string;
    /** Resolved stroke style for line/area swatches. Falls back to `'solid'` when not derived. */
    swatchLineType: LineStyleType;
    /** Row label — color value (multi-series) or layer's Y-axis title (single-series). */
    label: string;
    /** Formatted Y reading for this hit. */
    value: string;
    /** Styling hint: the row whose hit `=== primary`. Never re-orders. */
    isPrimary: boolean;
    /** Stable key — `${layerId}:${pointIndex}`. */
    key: string;
}

/**
 * Stable code for a failure the caller can fix by editing their {@link Spec} or {@link Data}.
 */
type UserInputErrorCode = 'UNKNOWN_VARIABLE' | 'INCOMPATIBLE_TYPE' | 'INCOMPATIBLE_SCALE_DOMAIN' | 'MISSING_AESTHETIC' | 'UNDECLARED_AESTHETIC' | 'INVALID_RULE_MAPPING' | 'INVALID_GEOM_PARAM' | 'UNSUPPORTED_COORD' | 'MISSING_STAT_VARIABLE' | 'CONFLICTING_STAT_MAPPING' | 'UNKNOWN_REGISTERED_TYPE' | 'DUPLICATE_REGISTERED_TYPE' | 'MISSING_GEOM_RENDERER' | 'RENDER_HIT_TEST_IDENTITY' | 'MISSING_RENDER_HIT_TEST' | 'CONFLICTING_RENDER_HIT_TEST' | 'OVERLAY_REQUIRES_RENDER_HIT_TEST' | 'PALETTE_NOT_FOUND' | 'LAYER_INDEX_OUT_OF_RANGE' | 'INVALID_HIGHLIGHT_OPERATOR' | 'UNRESOLVABLE_COLOR' | 'UNSUPPORTED_GRAPH_TYPE' | 'INVALID_DATA_SHAPE' | 'EMPTY_DATASET' | 'DATA_LABEL_PLACEMENT_COERCED' | 'DATA_LABELS_UNSUPPORTED' | 'DATA_LABEL_SETTING_IGNORED';

/**
 * The compiler-emitted descriptor of how a raw data value should be turned into a display string.
 *
 * The engine never formats values itself: it tags each guide/legend/headline figure with a
 * `ValueFormat` (e.g. `CompiledAxisGuide.valueFormat`), and the renderer materializes it via
 * `createValueFormatter`. A descriptor is inert until paired with a locale and number-format config,
 * so renderers hold these and switch on the `type` discriminant.
 *
 * `type` selects the formatter. Rendered examples (en-US, default number config):
 * - `currency` — '$1,234.50' (narrow currency symbol from `iso`, 2 decimals).
 * - `decimal` — '1,234.5' (locale grouping; decimals/abbreviation from number-format config).
 * - `integer` — '1,235' (no fraction digits).
 * - `percentage` — '12%' (value is a fraction: 0.12 → '12%').
 * - `duration` — '1h 5m' (value is milliseconds; always English, never localized).
 * - `text` — 'North' (categorical value passed through unchanged).
 * - `date` — 'Jan 5, 2025'.
 * - `datetime` — 'Jan 5, 2025 • 14:30:00' (comma between date and time replaced by a middot).
 * - `time` — '14:30'.
 * - `year` — '2025'.
 * - `quarter` — 'Q1 2025'.
 * - `month` — 'January' (no year).
 * - `month_year` — 'Jan 2025'.
 * - `day_month` — 'January 5' (no year).
 * - `weekly_date_range` — 'January 5 – 11' (value + 6 days, no year).
 * - `weekly_date_range_with_year` — 'Jan 5 – 11, 2025'.
 * - `lookup` — resolved per observation; see {@link LookupValueFormat}.
 *
 * The `isXValueFormat` guards (e.g. {@link isLookupValueFormat}, {@link isTemporalValueFormat}) narrow
 * a descriptor to a family without naming every member kind.
 */
type ValueFormat = ExplicitValueFormat | LookupValueFormat;

/**
 * Constant mapping - a literal value applied to every observation.
 * Analogous to Vega-Lite's `{datum: X}` / ggplot2's `aes(color = "literal")`.
 */
interface ValueMapping {
    value: DataValue;
}

/**
 * Variable mapping - references a column in the data
 */
interface VariableMapping {
    variable: string;
}

/**
 * Field-based predicates against post-transform user columns.
 *
 * `lt`, `lte`, `gt`, `gte`, and `range` accept `DataValue`s and are coerced at
 * evaluation time by the referenced column's `DataType`. Ordering operators
 * against a categorical field are a resolve-time validation error.
 */
type VariablePredicate = {
    variable: VariableName;
    eq: DataValue;
} | {
    variable: VariableName;
    oneOf: DataValue[];
} | {
    variable: VariableName;
    lt: DataValue;
} | {
    variable: VariableName;
    lte: DataValue;
} | {
    variable: VariableName;
    gt: DataValue;
} | {
    variable: VariableName;
    gte: DataValue;
} | {
    variable: VariableName;
    range: [DataValue, DataValue];
};

/**
 * Every error code, partitioned by fault. A {@link UserInputError} only accepts a
 * {@link UserInputErrorCode}; an {@link InternalError} only accepts an {@link InternalErrorCode}.
 */
type VizErrorCode = UserInputErrorCode | InternalErrorCode;

/** Whose fault a failure is, and whether the caller can fix it. */
type VizErrorKind = 'user-input' | 'internal';

/** Whether a diagnostic is fatal (`error`) or advisory (`warning`). */
type VizErrorSeverity = 'error' | 'warning';

/**
 * X-axis configuration (after defaults applied)
 */
interface XAxisConfig {
    /**
     * Whether the x axis is visible.
     * @default true
     */
    isVisible: boolean;
    /**
     * Axis title text. null means explicitly no label.
     * @default null
     */
    label: string | null;
    /**
     * Position of the y axis.
     * @default 'bottom'
     */
    position: AxisPosition;
    /** Grid lines for this axis */
    grid: AxisGridConfig;
    /** Tick marks for this axis */
    ticks: AxisTicksConfig;
}

/**
 * Y-axis configuration (after defaults applied)
 */
interface YAxisConfig {
    /**
     * Whether the y axis is visible.
     * @default true
     */
    isVisible: boolean;
    /**
     * Axis title text. null means explicitly no label.
     * @default null
     */
    label: string | null;
    /**
     * Position of the y axis.
     * @default 'right'
     */
    position: AxisPosition;
    /** Grid lines for this axis */
    grid: AxisGridConfig;
    /** Tick marks for this axis */
    ticks: AxisTicksConfig;
}

/**
 * Which Y axis a layer binds to.
 */
type YScaleType = 'primary' | 'secondary';

function aggregate(options: AggregateOptions): AggregateTransformInput;

function area(options?: GeomOptions<'area'>): LayerInputOf<'area'>;

function bar(options?: GeomOptions<'bar'>): LayerInputOf<'bar'>;

function constant(options: ConstantOptions): ConstantTransformInput;

function count(): CountStatSpec;

function filter(options: FilterOptions): FilterTransformInput;

function identity(): IdentityStatSpec;

function line(options?: GeomOptions<'line'>): LayerInputOf<'line'>;

function mean(): MeanStatSpec;

function point(options?: GeomOptions<'point'>): LayerInputOf<'point'>;

/***************************************************************
 * Builders
 ***************************************************************/
function reshape(options?: ReshapeOptions): ReshapeTransformInput;

function rule(options?: GeomOptions<'rule'>): LayerInputOf<'rule'>;

/**
 * Builder for the smooth stat.
 *
 * @example
 *   geom.line({ stat: stat.smooth({ method: 'linear' }) })
 *   geom.line({ stat: stat.smooth({ method: 'polynomial', order: 4 }) })
 *   geom.line({ stat: stat.smooth({ method: 'loess', bandwidth: 0.5 }) })
 */
function smooth(options: {
    method: SmoothMethod;
    order?: number;
    bandwidth?: number;
}): SmoothStatInput;

function sort(options: SortOptions): SortTransformInput;
```

## Supporting types — @graphysdk/react-renderer

Types referenced by the sections above, included so no name dangles.

```ts
type CoordKind = CoordSystem['type'];

/** Maps a coord-kind discriminator to the corresponding `CoordSystem` member. */
type CoordSystemFor<C extends CoordKind> = C extends 'cartesian' ? CartesianCoordSystem : C extends 'polar' ? PolarCoordSystem : never;

const FONT_STYLES: readonly ["normal", "italic", "oblique"];

/**
 * A CSS length keeping its unit so measurement can treat it like CSS paint does: em scales with
 * `textScale` (see `emToPx`), px stays absolute.
 */
interface FontLength {
    value: number;
    unit: 'px' | 'em';
}

/** Host font catalog mapping each font id a spec may reference to the CSS `font-family` string to render it with. */
type FontListInput = Array<{
    id: string;
    fontFamily: string;
}>;

/** A CSS `font-style` keyword accepted by a measured font token override. */
type FontStyle = (typeof FONT_STYLES)[number];

/**
 * A structured override of a measured font token. Omitted fields keep the token's default (which
 * still cascades from the leaf tokens, e.g. `fontSizeXs`), so `{ weight: 600 }` changes only the
 * weight.
 */
interface FontTokenOverride {
    family?: string;
    weight?: number;
    style?: FontStyle;
    size?: FontLength;
    /** Unitless multiplier; sizes HTML line boxes (legend band). Canvas measurement ignores it. */
    lineHeight?: number;
}

/** Page-relative cursor coordinates the push-path tooltip anchors to. */
interface GeomHoverCursor {
    clientX: number;
    clientY: number;
}

/**
 * Pushes a hovered observation key into the central hover, or clears this layer's hover with `null`.
 * A non-null key requires a `cursor` — the overlay intercepts the pointer events the cursor-follow
 * tooltip would otherwise read, so the anchor can only come from the geom's own handler. Consumed by
 * {@link InteractiveOverlayApi.pushHover} and returned by `useGeomHover`.
 */
interface GeomHoverPush {
    (key: string, cursor: GeomHoverCursor): void;
    (key: null): void;
}

/** An overlay-hosted geom's paint function — receives the guaranteed overlay wiring on `input.overlay`. */
type GeomOverlayRenderFn<G extends GeomName | string = string, C extends CoordKind = CoordKind> = (input: GeomOverlayRenderInput<G, C>) => ReactNode;

/**
 * The input an overlay-hosted render (`{ fn, options: { overlay: true } }`) receives: the standard render
 * input plus a guaranteed {@link InteractiveOverlayApi}. The renderer always supplies it, so the geom's
 * render uses `overlay` unconditionally — it never decides where it is mounted, only what it paints.
 */
interface GeomOverlayRenderInput<G extends GeomName | string = string, C extends CoordKind = CoordKind> extends GeomRenderInput<G, C> {
    overlay: InteractiveOverlayApi;
}

/**
 * A geom's `render`: either a plain panel-SVG paint function, or an overlay-hosted one paired with
 * `options` — so a geom that must paint into the interactive overlay declares
 * `{ fn, options: { overlay: true } }` without a second render entry point. The
 * renderer decides where each is mounted; the geom only decides what it paints. `render` is the single
 * paint declaration either way.
 */
type GeomRender<G extends GeomName | string = string, C extends CoordKind = CoordKind> = GeomRenderFn<G, C> | {
    fn: GeomOverlayRenderFn<G, C>;
    options: GeomRenderOptions;
};

/**
 * The render side of a geom: everything a single `(geom, coord)` composition needs to render and
 * respond to hover. Generic over the geom name and coord kind, so a built-in renderer parameterised
 * as `GeomRenderContract<'bar', 'cartesian'>` receives param-narrowed inputs (`CompiledLayerFor<'bar'>`,
 * `CartesianCoordSystem`), while the default `<string, CoordKind>` instantiation is the base/custom
 * contract a plugin author writes against. The geom's name, highlight strategy, and `params` type are
 * NOT restated here — they are read off the compile definition this contract is bound to (see
 * {@link defineGeomRenderer}). This is the single declaration of a geom's render contract; the built-in
 * narrow form below and the base/custom form (`geom-renderer.ts`) are both instantiations of it.
 */
interface GeomRenderContract<G extends GeomName | string = string, C extends CoordKind = CoordKind> {
    /** The coord system this contract paints under. A geom may bind one contract per coord. */
    coord: C;
    swatchShape?: SwatchShape;
    /**
     * The hover-guide mode this `(geom, coord)` draws when it is the hovered layer (a
     * {@link HoverGuideMode}). Omit it — or contribute `null` — to draw no guide (the geom's mark is its
     * own highlight). A declared mode the composition can't realise draws nothing: a polar bar's `'band'`
     * fills a wedge, but a pie/donut (no category band) resolves to an empty one. `resolveHoverGuideMode`
     * reads the hovered layer's mode to pick the one guide the chart draws.
     */
    guideMode?: HoverGuideMode | null;
    /**
     * The geom's paint. A plain function paints into the panel SVG; the `{ fn, options: { overlay: true } }`
     * form paints into a screen-aligned portal above the central capture layer for a live/drag-driven geom
     * that owns its pointer events (force-directed), with the wiring on `input.overlay`.
     */
    render: GeomRender<G, C>;
    /**
     * Optional repaint of the matched subset for the highlight overlay. Omit it and the highlight layer
     * falls back to {@link render}. A geom overrides it when the plain column-grouped render would
     * misrepresent a matched subset — a bar repaints each matched observation as an isolated stack segment
     * (from its compiled stack role), so a lone mid-stack match keeps its square-edged silhouette and
     * single-width border instead of regrouping into a standalone rounded bar.
     */
    renderHighlight?: (input: HighlightRenderInput<G, C>) => ReactNode;
    renderHover: (input: HoverRenderInput<G, C>) => ReactNode;
    renderHoverCompanions: (input: HoverCompanionsRenderInput<G>) => ReactNode;
    /**
     * Render-side spatial query for a `'render-hit-test'` layer whose geometry is precomputed into the
     * compiled spec (sankey ribbons, treemap tiles, voronoi cells). A
     * **factory**: given the render input it returns the per-cursor {@link RenderHitTester};
     * the renderer memoizes the factory on `layer.data`, so the read runs once per data change and the
     * per-move query allocates nothing. The author writes no hook; the renderer registers the tester on its
     * behalf. The cursor arrives in panel-local `[0,1]` with a top-left origin — the frame the geom paints
     * in. Returns the declared identity key of the observation under the cursor, or `null` for a miss.
     */
    hitTest?: (input: GeomRenderInput<G, C>) => RenderHitTester;
    /** Panel-space anchor for a matched observation; required when the def highlights via overlay-anchor. */
    getOverlayAnchor?: (input: OverlayAnchorInput<G, C>) => OverlayAnchor | null;
}

/** A geom's panel-SVG paint function — the plain `render` form. */
type GeomRenderFn<G extends GeomName | string = string, C extends CoordKind = CoordKind> = (input: GeomRenderInput<G, C>) => ReactNode;

interface GeomRenderInput<G extends GeomName | string = string, C extends CoordKind = CoordKind> {
    layer: CompiledLayerOf<G>;
    coordSystem: CoordSystemFor<C>;
    isAnimated: boolean;
    formattingLocale: Locale;
}

/**
 * Hosting options for an overlay render. The presence of the object form already declares overlay hosting;
 * `overlay: true` makes the call site read explicitly (and leaves room for further hosting options later).
 */
interface GeomRenderOptions {
    /**
     * Mount this render's output in a screen-aligned portal above the central capture layer, rather than in
     * the panel SVG — for a live or drag-driven geom that must own its pointer events (force-directed). The
     * renderer then supplies {@link GeomOverlayRenderInput.overlay}.
     */
    overlay: true;
}

/**
 * Chart display and interaction mode.
 * - 'readonly': Normal chart display with full interactivity but no editing (default)
 * - 'editable': Chart with inline editing capabilities for labels, titles, etc.
 */
type GraphMode = 'readonly' | 'editable';

/**
 * The input a geom's {@link GeomRenderContract.renderHighlight} receives: the matched-subset layer plus
 * the panel rect, so a geom that repaints matched observations in absolute panel pixels (bars drawing
 * isolated stack segments) has the frame it needs. A superset of {@link GeomRenderInput}, so a geom that
 * doesn't override `renderHighlight` still paints through the plain `render`.
 */
interface HighlightRenderInput<G extends GeomName | string = string, C extends CoordKind = CoordKind> extends GeomRenderInput<G, C> {
    panelRect: GraphLayout['panel'];
}

interface HoverCompanionsRenderInput<G extends GeomName | string = string> {
    layer: CompiledLayerOf<G>;
    primary: HoverHit;
    related: HoverHit[];
}

/**
 * The shape of positional guide the `HoverGuide` draws for a hovered observation, contributed per
 * `(geom, coord)` renderer via `guideMode`:
 *
 * - `'band'` — a rectangle over the hovered category's band on the main axis (bars).
 * - `'crosshair'` — a rule at the hovered value: a straight line under cartesian, a centre-to-rim spoke
 *   under polar (line and area).
 *
 * A renderer that omits `guideMode` draws no guide (scatter points). A declared `'band'` still draws
 * nothing where the composition has no category band — a pie/donut resolves to an empty wedge. The chart
 * draws the guide of whichever layer the cursor resolves to, so a combo shows a band over a hovered bar
 * and a crosshair over a hovered line; see `resolveHoverGuideMode`.
 */
type HoverGuideMode = 'crosshair' | 'band';

interface HoverRenderInput<G extends GeomName | string = string, C extends CoordKind = CoordKind> {
    layer: CompiledLayerOf<G>;
    coordSystem: CoordSystemFor<C>;
    primary: HoverHit;
    group: HoverHit[];
    related: HoverHit[];
    panelRect: GraphLayout['panel'];
}

/**
 * The overlay wiring handed to an overlay-hosted render via {@link GeomOverlayRenderInput.overlay}. The
 * geom writes only its simulation, marks, and drag handlers; the renderer owns the on-screen rect
 * measurement, the portal alignment, and the push wiring.
 */
interface InteractiveOverlayApi {
    /** Feeds the hovered observation's identity key into the unified hover store — the push path. */
    pushHover: GeomHoverPush;
    /** The panel's on-screen rect in client pixels, so the overlay can place its marks. */
    panelRect: PanelScreenRect;
}

/**
 * The element font tokens JS measurement reproduces. Overridden structurally
 * ({@link FontTokenOverride}); the CSS variable's shorthand is serialized from the same object
 * measurement reads, so paint and layout move together.
 */
type MeasuredFontTokenKey = 'fontDataLabel' | 'fontStackTotal' | 'fontCategoryLabel' | 'fontTickLabel' | 'fontAxisLabel' | 'fontLegendLabel' | 'fontGoalLineLabel';

/**
 * Anchor point in normalized [0,1] coord-space where a highlight overlay marker
 * should be painted for one observation. Renderer turns [0,1] into pixels.
 */
interface OverlayAnchor {
    x: number;
    y: number;
}

interface OverlayAnchorInput<G extends GeomName | string = string, C extends CoordKind = CoordKind> {
    layer: CompiledLayerOf<G>;
    coordSystem: CoordSystemFor<C>;
    observation: Observation;
}

/** The panel's on-screen rect in client coordinates — what a fixed-position overlay aligns to. */
interface PanelScreenRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** Fires on each deduped size change — the shape of `GraphRenderer`'s `onResize` callback. */
type ResizeObserverOnResize = (state: ResizeObserverState) => void;

/** The observed element's content-box size in CSS pixels, rounded to integers. */
interface ResizeObserverState {
    width: number;
    height: number;
    /** True until the first ResizeObserver measurement lands. */
    isDefault: boolean;
}

/**
 * A render contract with its resolved geom name attached — the shape the per-provider resolver returns
 * and every render site consumes. Both a built-in `GeomRenderer` and a custom {@link GeomRendererDefinition}
 * conform to it, so the consumers paint built-ins and customs through one type.
 */
interface ResolvedGeomRenderer extends GeomRenderContract {
    /** The geom name this renderer paints — the resolver dispatches on it. */
    geom: string;
}

/**
 * Passed as the second argument to a layout-coupled slot's `measure`, so it can size its band from
 * real text metrics — the same Canvas-backed measurer the built-in measurers use — rather than
 * constructing its own. A `measure` whose size is unrelated to text can ignore it.
 */
interface SlotMeasureContext {
    /** Measures a string at a given font; returns `{ width, height, ascent, descent }` in CSS pixels. */
    measureText: TextMeasurer['measureText'];
    /** Active text-scale multiplier; multiply an em size by this to get the pixel size to measure at. */
    textScale: number;
}

/**
 * A layout-coupled slot: the region's `render` paired with the `measure` the layout uses to reserve
 * its space. `measure` mirrors the matching `LayoutMeasurer` method, so paint and reserved space can't
 * disagree. Give it a stable reference — a `measure` whose identity changes each render takes effect on
 * the next paint but doesn't retrigger layout.
 */
interface SlotOverride<Props, Measure> {
    /** The component that paints the region. */
    render: ComponentType<Props>;
    /**
     * Returns the region's reserved size. Receives the region's formatted data plus a
     * {@link SlotMeasureContext} (`measureText`, `textScale`) for sizing from real text metrics.
     */
    measure: Measure;
}

/**
 * The vocabulary of legend/tooltip/headline marks the {@link Swatch} can paint. A geom picks the one
 * that best evokes its on-canvas mark via `swatchShape` on its render contract (see
 * {@link GeomRenderContract}); it is a render concern, so the engine never resolves it.
 *
 * - `square` — a filled rect (bars)
 * - `line` — a horizontal stroke (lines)
 * - `area` — a filled region with a stroke accent (areas)
 * - `circle` — a filled dot (points)
 * - `slice` — a pie / donut wedge (polar bars)
 */
type SwatchShape = 'square' | 'line' | 'circle' | 'area' | 'slice';

/** The UI surface a swatch is painted on. Lets a Swatch slot restyle one surface and delegate the rest. */
type SwatchSurface = 'legend' | 'tooltip' | 'headline' | 'callout' | 'rule-label';

/** CSS custom-property references for every theme token; read at paint sites as `vars.tooltipBackground`, etc. */
const vars: {
    white: `var(--${string})`;
    black: `var(--${string})`;
    transparent: `var(--${string})`;
    grey100: `var(--${string})`;
    grey95: `var(--${string})`;
    grey90: `var(--${string})`;
    grey85: `var(--${string})`;
    grey80: `var(--${string})`;
    grey75: `var(--${string})`;
    grey70: `var(--${string})`;
    grey60: `var(--${string})`;
    grey50: `var(--${string})`;
    grey0: `var(--${string})`;
    greyGradient80: `var(--${string})`;
    green60: `var(--${string})`;
    green50: `var(--${string})`;
    red60: `var(--${string})`;
    red50: `var(--${string})`;
    amber70: `var(--${string})`;
    amber50: `var(--${string})`;
    amber40: `var(--${string})`;
    amber30: `var(--${string})`;
    blue80: `var(--${string})`;
    blue60: `var(--${string})`;
    purple50: `var(--${string})`;
    purple30: `var(--${string})`;
    brand: `var(--${string})`;
    success: `var(--${string})`;
    warning: `var(--${string})`;
    alert: `var(--${string})`;
    textPrimary: `var(--${string})`;
    textSecondary: `var(--${string})`;
    textDisabled: `var(--${string})`;
    iconPrimary: `var(--${string})`;
    iconSecondary: `var(--${string})`;
    iconStickerBackground: `var(--${string})`;
    border100: `var(--${string})`;
    border50: `var(--${string})`;
    border10: `var(--${string})`;
    sunkenBackground: `var(--${string})`;
    defaultBackground: `var(--${string})`;
    raisedBackground: `var(--${string})`;
    overlayBackground: `var(--${string})`;
    overlayBorderGradient: `var(--${string})`;
    graphBackground: `var(--${string})`;
    gridLineColor: `var(--${string})`;
    originLineColor: `var(--${string})`;
    targetLineColor: `var(--${string})`;
    targetLineMarkerColor: `var(--${string})`;
    targetLineLabelTextColor: `var(--${string})`;
    legendBackground: `var(--${string})`;
    legendBorderColor: `var(--${string})`;
    legendFocusOutlineColor: `var(--${string})`;
    legendTextColor: `var(--${string})`;
    dimmedSeriesLabelTextColor: `var(--${string})`;
    dimmedSeriesLabelLineColor: `var(--${string})`;
    trendNegativeColor: `var(--${string})`;
    trendPositiveColor: `var(--${string})`;
    trendNeutralColor: `var(--${string})`;
    defaultAnnotationArrowStroke: `var(--${string})`;
    defaultAnnotationShapeStroke: `var(--${string})`;
    defaultAnnotationShapeFill: `var(--${string})`;
    arrowAnnotationStickerOutlineColor: `var(--${string})`;
    arrowAnnotationStickerOutlineColorInverse: `var(--${string})`;
    annotationFrameBorderColor: `var(--${string})`;
    annotationMenuTriggerIconColor: `var(--${string})`;
    heatmapEmptyTileBackground: `var(--${string})`;
    dataLabelOutsideBackground: `var(--${string})`;
    dataLabelTextColor: `var(--${string})`;
    dataLabelInsideTextColor: `var(--${string})`;
    stackTotalTextColor: `var(--${string})`;
    stackTotalBackground: `var(--${string})`;
    stackTotalStroke: `var(--${string})`;
    gridLineWidth: `var(--${string})`;
    gridLineDash: `var(--${string})`;
    gridLineDotted: `var(--${string})`;
    tooltipBorderRadius: `var(--${string})`;
    tooltipBorderWidth: `var(--${string})`;
    tooltipPaddingBlock: `var(--${string})`;
    tooltipPaddingInline: `var(--${string})`;
    tooltipRowGap: `var(--${string})`;
    tooltipShadow: `var(--${string})`;
    tickLabelOffset: `var(--${string})`;
    legendItemGap: `var(--${string})`;
    legendSwatchGap: `var(--${string})`;
    legendSwatchWidth: `var(--${string})`;
    legendSwatchHeight: `var(--${string})`;
    legendPillPaddingInline: `var(--${string})`;
    legendPillPaddingBlock: `var(--${string})`;
    legendPillBorderWidth: `var(--${string})`;
    headlineRowGap: `var(--${string})`;
    headlineItemGap: `var(--${string})`;
    canvasDefault: `var(--${string})`;
    canvasBlue: `var(--${string})`;
    canvasCyan: `var(--${string})`;
    canvasGreen: `var(--${string})`;
    canvasYellow: `var(--${string})`;
    canvasOrange: `var(--${string})`;
    canvasRed: `var(--${string})`;
    canvasPink: `var(--${string})`;
    canvasPurple: `var(--${string})`;
    canvasGray: `var(--${string})`;
    canvasInverse: `var(--${string})`;
    elevationXs: `var(--${string})`;
    elevationSm: `var(--${string})`;
    elevationMd: `var(--${string})`;
    elevationLg: `var(--${string})`;
    radiiXs: `var(--${string})`;
    radiiSm: `var(--${string})`;
    radiiMd: `var(--${string})`;
    radiiLg: `var(--${string})`;
    spaceXxs: `var(--${string})`;
    spaceXs: `var(--${string})`;
    spaceSm: `var(--${string})`;
    spaceMd: `var(--${string})`;
    spaceLg: `var(--${string})`;
    spaceXl: `var(--${string})`;
    zIndexToolbar: `var(--${string})`;
    zIndexToolbarTooltip: `var(--${string})`;
    zIndexToolbarPopover: `var(--${string})`;
    toolbarBackgroundColor: `var(--${string})`;
    toolbarButtonBackgroundColor: `var(--${string})`;
    toolbarButtonBackgroundColorHovered: `var(--${string})`;
    toolbarButtonBackgroundColorSelected: `var(--${string})`;
    toolbarSeparatorColor: `var(--${string})`;
    tooltipBackground: `var(--${string})`;
    tooltipBorderColor: `var(--${string})`;
    tooltipHeadingTextColor: `var(--${string})`;
    tooltipLabelTextColor: `var(--${string})`;
    tooltipValueTextColor: `var(--${string})`;
    tooltipPrimaryRowColor: `var(--${string})`;
    hoverGuideLineColor: `var(--${string})`;
    hoverGuideFillColor: `var(--${string})`;
    hoveredBarBorderColor: `var(--${string})`;
    hoveredPointRingColor: `var(--${string})`;
    pointStrokeColor: `var(--${string})`;
    stackedBarHoverBorderColor: `var(--${string})`;
    fontFamilyDefault: `var(--${string})`;
    fontFamilyHeading: `var(--${string})`;
    fontWeightRegular: `var(--${string})`;
    fontWeightMedium: `var(--${string})`;
    fontWeightSemibold: `var(--${string})`;
    fontWeightBold: `var(--${string})`;
    fontWeightExtraBold: `var(--${string})`;
    fontWeightBlack: `var(--${string})`;
    textScale: `var(--${string})`;
    fontSizeXxs: `var(--${string})`;
    fontSizeXs: `var(--${string})`;
    fontSizeSm: `var(--${string})`;
    fontSizeMd: `var(--${string})`;
    fontSizeLg: `var(--${string})`;
    fontSizeXl: `var(--${string})`;
    fontLineHeightXxs: `var(--${string})`;
    fontLineHeightXs: `var(--${string})`;
    fontLineHeightSm: `var(--${string})`;
    fontLineHeightMd: `var(--${string})`;
    fontLineHeightLg: `var(--${string})`;
    fontLineHeightXl: `var(--${string})`;
    fontSizeEditorBody: `var(--${string})`;
    fontSizeHeadingSm: `var(--${string})`;
    fontSizeHeadingMd: `var(--${string})`;
    fontSizeHeadingLg: `var(--${string})`;
    fontLineHeightEditorBody: `var(--${string})`;
    fontLineHeightHeadingSm: `var(--${string})`;
    fontLineHeightHeadingMd: `var(--${string})`;
    fontLineHeightHeadingLg: `var(--${string})`;
    fontTickLabel: `var(--${string})`;
    fontAxisLabel: `var(--${string})`;
    fontDataLabel: `var(--${string})`;
    fontStackTotal: `var(--${string})`;
    fontCategoryLabel: `var(--${string})`;
    fontLegendLabel: `var(--${string})`;
    fontSeriesLabel: `var(--${string})`;
    fontTooltipLabel: `var(--${string})`;
    fontTooltipHeading: `var(--${string})`;
    fontTooltipFooter: `var(--${string})`;
    fontJumboTooltipLabel: `var(--${string})`;
    fontJumboTooltip: `var(--${string})`;
    fontMiniTooltipLabel: `var(--${string})`;
    fontMiniTooltipFooter: `var(--${string})`;
    fontTooltipCaption: `var(--${string})`;
    fontTooltipCaptionSmall: `var(--${string})`;
    fontTrendTag: `var(--${string})`;
    fontTrendTagSmall: `var(--${string})`;
    fontGoalLineLabel: `var(--${string})`;
    fontPieLabel: `var(--${string})`;
    fontPieChartTotal: `var(--${string})`;
    fontDifferenceArrowSmall: `var(--${string})`;
    fontDifferenceArrowMedium: `var(--${string})`;
    fontDifferenceArrowLarge: `var(--${string})`;
    fontButton: `var(--${string})`;
    fontInput: `var(--${string})`;
    fontInputLabel: `var(--${string})`;
    fontSelectLabel: `var(--${string})`;
    fontSelectDescription: `var(--${string})`;
    fontColorSelectLabel: `var(--${string})`;
    fontMenuTitle: `var(--${string})`;
    fontMenuGroupTitle: `var(--${string})`;
    fontMenuItemLabel: `var(--${string})`;
    fontMenuItemLabelSecondary: `var(--${string})`;
    fontUITooltip: `var(--${string})`;
    fontUITooltipSecondary: `var(--${string})`;
    fontErrorBoundaryTitle: `var(--${string})`;
    fontErrorBoundaryMessage: `var(--${string})`;
    fontTableCell: `var(--${string})`;
    fontTableHeaderCell: `var(--${string})`;
    fontSourceLabel: `var(--${string})`;
    fontSourceLink: `var(--${string})`;
    fontTextEditorH1: `var(--${string})`;
    fontTextEditorH2: `var(--${string})`;
    fontTextEditorH3: `var(--${string})`;
    fontTextEditorH6: `var(--${string})`;
    fontTextEditorBody: `var(--${string})`;
    fontTextEditorLink: `var(--${string})`;
    fontHighlightModeTitle: `var(--${string})`;
    fontHighlightModeSubtitle: `var(--${string})`;
};
```
