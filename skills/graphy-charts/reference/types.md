<!-- GENERATED FILE — do not edit. -->

# Type reference

Generated from `@graphysdk/viz-engine@1.8.0` and `@graphysdk/react-renderer@1.8.0`.

> Selected chart-authoring declarations (with JSDoc), extracted from the
> built `.d.ts` of `@graphysdk/viz-engine` and `@graphysdk/react-renderer`.
> Check precise signatures, option keys, and accepted values here; see
> [spec.md](spec.md) for how the pieces compose. Supporting types follow the
> main sections; React and standard-library types remain external. Legacy
> GraphConfig alternatives are omitted. The only opaque names are compiled/internal shapes an author never constructs: CreateSpecBuilderOptions, Dataset, FormattedAxis, FormattedHeadline, FormattedLegend, GeomCompilerInput, GeomDefsOf, GeomStyleReaders, GeomSummaries, GraphHandle, HeadlineMeasurer, InteractiveOverlayApi, LayerIntroPlan, NodeBuilder, Observation, RegistryEntries, RegistryVocabularies, ResolvedLayerSpec, ResolvedPaint, STYLE_TARGETS, SceneLayer, SceneLayerOf, SpecBuilder, StatCompilerInput, StyleReadersForLayer, StyleReadersOf, TextMeasurer, TooltipContract, TransformStrategy, vars.

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
        /**
         * How to read the column's cells instead of inferring it, e.g. `{ type: 'text' }` to keep digit strings
         * categorical or `{ type: 'currency', iso: 'usd' }` to format bare numbers as dollars.
         */
        valueFormat?: ExplicitValueFormat;
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
interface Spec {
    mapping: AesMapping;
    layers: LayerSpec[];
    scales: ScaleSpec[];
    transforms: AnyTransformSpec[];
    highlights: HighlightSpec[];
    styles?: StylesheetSpec;
    annotations?: AnnotationsSpec;
    coords?: CoordSpec;
    config: ConfigSpec;
}

/** The light/dark axis a {@link LightDarkColor} resolves against. */
type ColorScheme = 'light' | 'dark';

/** Any named colour scheme accepted by a continuous colour scale. */
type ColorSchemeName = SequentialSchemeName | DivergingSchemeName;
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
function pipe(spec: Spec, ...items: SpecItem[]): Spec;

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
function createSpec(...items: Array<AesMapping | SpecItem>): Spec;

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

/** Factories for the geom layers a graph can draw (point, line, area, bar, rule, tile). */
const geom: {
    point: typeof point;
    line: typeof line;
    area: typeof area;
    bar: typeof bar;
    rule: typeof rule;
    tile: typeof tile;
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
    cartesian: (params?: Partial<CartesianCoordParams>) => CartesianCoordSpec;
    /**
     * Flipped cartesian coordinates — swaps x and y axes.
     * Useful for horizontal bar charts or when category labels are long.
     *
     * @example coord.flip() // horizontal bars
     */
    flip: (params?: Partial<FlipCoordParams>) => FlipCoordSpec;
    /**
     * Polar coordinate system — maps data to angle (theta) and radius.
     * Used for pie charts, donut charts, and radar/radial visualizations.
     *
     * @example coord.polar() // pie chart
     * @example coord.polar({ innerRadius: 0.5 }) // donut chart
     */
    polar: (params?: Partial<PolarCoordParams>) => PolarCoordSpec;
};

/** Factories for the stats a layer can apply (identity, count, smooth, mean, sum, summary). */
const stat: {
    identity: typeof identity;
    count: typeof count;
    smooth: typeof smooth;
    mean: typeof mean;
    sum: typeof sum;
    summary: typeof summary;
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
function highlight(predicate: Predicate, options?: HighlightBuilderOptions): HighlightSpec;

/**
 * Builder for the built-in annotation kinds — the pipeable counterpart to setting the `annotations`
 * field by hand. Each method returns an {@link AnnotationItem}; piped into `createSpec`/`pipe` it appends
 * to the matching {@link AnnotationsSpec} field, so annotations compose left-to-right like every other
 * spec feature (geoms, scales, highlights). Multiple calls of the same kind accumulate.
 *
 * @example
 *   import { pipe, createSpec, geom, scale, annotation, style, styles } from '@graphysdk/viz-engine';
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
 *     annotation.shape({ id: 'forecast', region: { anchorType: 'panel', x: 0, y: 0.7, width: 1, height: 0.3 } }),
 *     styles({ overrides: [style.annotation.shape({ fill: '#e15759', alpha: 0.12 }, { annotation: 'forecast' })] }),
 *   );
 */
const annotation: {
    /** A labelled delta between two data observations — reads the measured gap between them. */
    differenceArrow(input: DifferenceArrowSpec): AnnotationItem;
    /** A shaded box. */
    shape(input: ShapeSpec): AnnotationItem;
    /** An arrow shaped annotation. */
    arrow(input: ArrowSpec): AnnotationItem;
    /** A free-standing rich-text label positioned. */
    text(input: TextAnnotationSpec): AnnotationItem;
    /** An image whose area is positioned. */
    image(input: ImageAnnotationSpec): AnnotationItem;
    /** A sticker whose area is positioned */
    sticker(input: StickerAnnotationSpec): AnnotationItem;
    /** A marker dot pinned to a single observation. */
    pinnedNumber(input: PinnedNumberAnnotationSpec): AnnotationItem;
    /** A marker dot pinned to a single observation, carrying rich-text content. */
    comment(input: CommentAnnotationSpec): AnnotationItem;
};

/** Wraps partial config options into a tagged `ConfigItem` for inclusion in a spec. */
function config(options: ConfigSpec): ConfigItem;
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
 * the {@link CustomGeomLayerSpec} arm admits a plugin geom carrying a name outside {@link GeomName}.
 * This is the user-facing type — fields are optional and will be resolved with defaults.
 */
type LayerSpec = {
    [G in GeomName]: LayerSpecFor<G>;
}[GeomName] | CustomGeomLayerSpec;

/**
 * A layer for a custom (plugin-contributed) geom. Its `geom` is a name outside {@link GeomName},
 * resolved downstream through the geom registry; `params` are validated at the typed builder call
 * site, so the node itself carries them as an open record.
 */
interface CustomGeomLayerSpec extends LayerSpecBase {
    geom: string;
    params?: Record<string, unknown>;
}
```

## Transforms & stats

```ts
/**
 * A transform input that may be built-in or custom. Used at the spec-construction boundary
 * (`pipe`/`createSpec` items, `Spec.transforms`) and the transform compile stage, so a custom
 * transform pipes in and applies through the registry — while {@link TransformSpec} stays the clean
 * built-in union everywhere a `transformType` is narrowed.
 */
type AnyTransformSpec = TransformSpec | CustomTransformSpec<string>;

/***************************************************************
 * Transform spec
 ***************************************************************/
/**
 * The input node a custom (plugin-contributed) transform builder produces.
 */
interface CustomTransformSpec<Name extends string = string> {
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
 * - `'sum'` — Total `y` per x-axis value, per series
 * - `'summary'` — Reduce `y` per x-axis value and group to an estimate and, when asked for, an interval
 */
type StatName = 'identity' | 'count' | 'smooth' | 'mean' | 'sum' | 'summary';

/**
 * Regression methods supported by the `smooth` stat.
 */
type SmoothMethod = 'linear' | 'loess' | 'exponential' | 'logarithmic' | 'quadratic' | 'power' | 'polynomial';

/**
 * The input node a custom (plugin-contributed) stat builder produces.
 */
interface CustomStatSpec<Name extends string = string> {
    type: Name;
}
```

## Config

```ts
type ConfigSpec = Omit<DeepPartial<ResolvedConfigSpec>, 'legend' | 'content'> & {
    legend?: LegendSpec;
    content?: ContentSpec;
};
```

## Styling API

```ts
/**
 * Create a pipeable stylesheet item. Piping several stacks them in order: each item sits above
 * everything piped before it, the presets it extends included, so later items are more specific.
 *
 * @example
 *   pipe(
 *     createSpec({ x: 'month', y: 'sales' }),
 *     geom.bar(),
 *     styles({
 *       defaults: [style.geom({ fill: '#c9ced8' })],
 *       overrides: [style.geom({ fill: '#e5484d' }, { where: { variable: 'sales', gt: 500 } })],
 *     }),
 *   )
 */
function styles(stylesheet: Stylesheet): StylesheetSpec;

/**
 * Typed builders for stylesheet entries — shorthand for the serialized `StyleRule` shape. The
 * path addresses an element (serialized into `select`), the options argument holds conditions
 * (serialized into `when`) plus the optional `id`. `style.geom` takes the paint every kind shares;
 * `style.geom.bar` stamps `select.kind = 'bar'` and opens the bar vocabulary, and the other kinds nest
 * the same way (`style.geom.line`, `style.geom.tile`). Chrome targets nest by partition instead:
 * `style.panelBorder.top` stamps `select.edge` (legend, axisLabel and tickLabel do the same),
 * `style.gridLine.x` stamps `select.axis`, `style.tooltip.heading` stamps `select.part`
 * (`style.legend.popover` the same), and the bare builders address the whole target (the tooltip box,
 * for `style.tooltip`).
 * Annotations nest by kind like geoms: `style.annotation.shape` stamps `select.kind = 'shape'`, and the
 * `annotation` option narrows an annotation entry to one annotation, by id.
 *
 * The default kit's builders: the built-in kinds and no plugin. A kit built with plugins carries
 * theirs on `kit.style` as well.
 *
 * @example
 *   styles({
 *     defaults: [style.geom({ fill: '#c9ced8' }), style.gridLine({ dashArray: [] })],
 *     overrides: [style.geom.bar({ cornerRadius: 'full' }, { where: { variable: 'sales', gt: 500 } })],
 *   })
 */
const style: StyleBuilders<[]>;

/**
 * Reference a color from the stylesheet's token table.
 *
 * @example
 *   styles({
 *     tokens: { alert: { light: '#e5484d', dark: '#ff6369' } },
 *     overrides: [style.geom({ fill: token('alert') }, { where: { variable: 'sales', gt: 500 } })],
 *   })
 */
function token(name: string): StyleTokenRef;

/**
 * A stylesheet — the reusable shape a preset or theme ships as, and the body of the pipeable
 * {@link StylesheetSpec}. `defaults` apply only where no mapped aesthetic decided a value;
 * `overrides` replace what one decided. `tokens` names colors entries reference via {@link token}.
 * `extends` composes other stylesheets under this one: tokens merge name-by-name, lists
 * concatenate, later wins.
 */
interface Stylesheet {
    extends?: Stylesheet[];
    tokens?: StyleTokenTable;
    defaults?: StyleRule[];
    overrides?: StyleRule[];
}

/** The pipeable stylesheet item: a {@link Stylesheet} tagged for `pipe`. */
interface StylesheetSpec extends Stylesheet {
    type: 'styles';
}

/**
 * One entry in a stylesheet list — the serialized shape the {@link style} builders emit. `select`
 * addresses what the entry styles, `when` holds the conditions under which it applies, and `id` is an
 * optional stable identity carried into diagnostics, so tooling can point at "that entry" across
 * edits. Within a list, order is specificity: the last matching entry that declares a property wins.
 */
type StyleRule = {
    [Root in ChromeTargetName]: RegistryEntries<(typeof STYLE_TARGETS)[Root]>;
}[ChromeTargetName] | GeomStyleRule;

/** The declarations an entry can author, color-valued properties in any authored form. */
type StyleDeclarations = StyleDeclarationsFor<AuthoredStyleDomainValues>;

/** One style property name — the keys of the flat declarations shape. */
type StyleProperty = (typeof STYLE_PROPERTY_NAMES)[number];

/**
 * The structural address of a style entry — what it styles, decidable with no data.
 *
 * - `target` — the element class: `geom` or one of the chrome targets (`panelBorder`, `gridLine`,
 *   `tickLine`, `axisLabel`, `tickLabel`, `dataLabel`, `graph`, `heading`,
 *   `caption`, `source`, `header`, `footer`, `hoverGuide`, `tooltip`, `headline`, `headlineItem`,
 *   `legend`, `legendItem`, `directLabel`, `annotation`). Chrome entries are chart-scoped and
 *   condition-free — they carry no `when`.
 * - `kind` — restrict a geom or annotation entry to one kind, and open that kind's vocabulary. Stamped
 *   by the kind builders (`style.geom.bar`, `style.annotation.shape`). Absent, the entry applies to
 *   every layer, or every annotation, with the shared vocabulary.
 * - `layer` — restrict a geom entry, including a rule label, to the layer with that authored id.
 * - `annotation` — restrict an annotation entry to the annotation with that id.
 * - `coord` — restrict any entry to graphs drawn in that coordinate system. Absent, the entry applies
 *   in both.
 * - `edge` / `axis` / `role` / `position` / `part` — restrict an entry to one partition of its
 *   target: a panel-border, legend, axis-label or tick-label edge; the axis a grid line, tick line,
 *   axis label or tick label belongs to; a data label's role and where it sits; a tooltip part;
 *   a heading level; a source link; a legend popover; a legend-item part; an annotation's label; or
 *   one part of a plugin geom's mark. Absent, the entry addresses the whole target, and on a plugin
 *   geom the part that paints its observations. A bare heading is a wildcard over `h1` and `h2`;
 *   a bare source is the label, not a wildcard over the link. `position` needs a role and stack
 *   totals (`aggregate`) always sit outside, so it never partitions them.
 */
type StyleSelect = StyleRule['select'];

/** The subset of {@link StyleSelect} chrome entries carry, kept compiled so reads filter by partition. */
type ChromeStyleSelect = Extract<StyleSelect, {
    target: ChromeStyleTargetName;
}>;

type StyleEntryOptions = EntryOptionsFor<(typeof STYLE_TARGETS.geom)['options']>;

/** The runtime states a style entry can scope to. States are paint-only — they never feed layout. */
type StyleState = (typeof STYLE_STATES)[number];

/** The serialized form of a {@link token} reference. */
interface StyleTokenRef {
    token: string;
}

/** The stylesheet's token table, mapping the names {@link token} references to their colors. */
type StyleTokenTable = Record<string, StyleTokenValue>;

/** A color with one variant per {@link ColorScheme}, resolved against the active scheme at read time. */
interface LightDarkColor {
    light: string;
    dark: string;
}

/**
 * The engine's built-in stylesheet: the look of every style target when nothing else decides.
 * It is the implicit base of every stylesheet — entries sit below the authored `defaults`, tokens
 * merge under the authored table, so redefining a token restyles the default it backs.
 * Colors are never palette lookups — scales only speak for mapped aesthetics.
 */
const BUILTIN_STYLES: Readonly<{
    tokens: Readonly<StyleTokenTable>;
    defaults: readonly StyleRule[];
    overrides: readonly StyleRule[];
}>;
```

## Highlights

```ts
/**
 * User-facing highlight definition. `id` is auto-assigned by the resolver when
 * omitted. Omit the layer scope to evaluate against every layer.
 */
interface HighlightSpec {
    type: 'highlight';
    id?: string;
    predicate: Predicate;
    scope?: MatchScope;
    layerId?: string;
}
```

## Annotations

```ts
/** All annotations attached to a graph, as user-facing input. */
interface AnnotationsSpec {
    differenceArrows?: DifferenceArrowSpec[];
    shapes?: ShapeSpec[];
    arrows?: ArrowSpec[];
    textAnnotations?: TextAnnotationSpec[];
    images?: ImageAnnotationSpec[];
    stickers?: StickerAnnotationSpec[];
    pinnedNumbers?: PinnedNumberAnnotationSpec[];
    comments?: CommentAnnotationSpec[];
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
type PaletteOverridesSpec = Record<number, {
    hex?: string;
    id?: string;
}>;

/** Host-owned custom palettes, keyed by `paletteId`, that a `scale.color.palette` may reference by id. */
type CustomPalettes = Record<string, CustomPaletteColor[]>;

/** The hues available as a base for monochrome palettes, in pick order. */
const MONO_BASES: readonly ["brick", "gray", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"];

/** The hues available as a base for neon palettes, in pick order. */
const NEON_BASES: readonly ["cyan", "pink", "purple", "red", "orange", "yellow", "green", "blue"];

/** Group colors when a graph specifies no palette and its geoms don't touch. Cycled in order as groups grow. */
const DEFAULT_COLOR_PALETTE: [string, ...string[]];

/** A normalized colour ramp: maps `t ∈ [0, 1]` to a colour string. */
type ColorRamp = (t: number) => string;

type SequentialSchemeName = (typeof SEQUENTIAL_SCHEME_NAMES)[number];

/** A diverging colormap: its canonical ColorBrewer code or a friendly alias. */
type DivergingSchemeName = (typeof DIVERGING_SCHEME_NAMES)[number] | SchemeAlias;

/**
 * Samples a continuous colour scheme (or an explicit `range`) into `count` evenly-spaced colour strings —
 * the swatch strip a scheme picker or continuous-colour legend preview renders. Stop precedence matches a
 * continuous colour scale: an explicit `range` wins over a named `scheme`, which wins over the brand
 * sequential ramp. The stops span `t ∈ [0, 1]` inclusive; `count < 2` yields a single `t = 0` stop (or an
 * empty array below 1).
 */
function sampleColorScheme(options?: SampleColorSchemeOptions, count?: number): string[];
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
/** Props for {@link GraphProvider}: the data and spec to compile, plus color scheme, locale and plugin wiring. */
interface GraphProviderProps {
    data: Data;
    spec: Spec;
    /**
     * Custom geoms, stats, and transforms (and their render halves) registered for this graph. Seeds
     * the compiler and builds the per-provider render resolver from one array. Construction-time config,
     * frozen at mount — change the registered set by remounting (React `key`); `data`/`spec`/`colorScheme`
     * stay reactive.
     */
    plugins?: readonly Plugin_2[];
    /**
     * The graph's theme. Spec settings and plugin renderers override its defaults.
     * Fixed at mount; change the React `key` to switch themes.
     * The theme's `colorScheme`, when set, overrides the `colorScheme` prop.
     */
    theme?: Theme;
    formattingLocale?: Locale;
    /**
     * Filled with this graph's {@link GraphHandle}, for callers mounted outside the provider where the
     * hooks can't reach. `useGraphHistoryShortcuts` binds the undo/redo chords to one.
     */
    handleRef?: Ref<GraphHandle>;
    onSpecChange?: (next: Spec) => void;
    /** Fires with the compile failure(s) whenever a compile/recompile/dispatch produces errors. */
    onError?: (errors: VizDiagnostic[]) => void;
    /** Fires with any warnings a successful compile produced. */
    onWarnings?: (warnings: VizDiagnostic[]) => void;
    colorScheme?: ColorScheme;
    customPalettes?: CustomPalettes;
    children: ReactNode;
}

/** Props for {@link GraphRenderer}: container sizing, interaction toggles and per-region slot overrides. */
interface GraphRendererProps {
    /** Controls how the graph responds to its container size. Defaults to filling the parent container. */
    sizing?: GraphSizing;
    /**
     * Callback invoked when the graph's container is resized. Fires in every sizing mode. Reports the
     * container, not the panel.
     */
    onResize?: ResizeObserverOnResize;
    /**
     * Animation settings. A boolean disables/enables animations globally, an object tunes the intro
     * and data transitions separately. A reduced-motion preference disables everything regardless,
     * and so does a chart denser than `maxAnimatedGeoms`.
     */
    animation?: GraphAnimation;
    /** `false` hides the tooltip whatever `config.tooltip.mode` says. Left at `true`, the spec decides. */
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

## Themes

```ts
/**
 * A stylesheet, colours, config and geom repaints that a host applies to every graph it draws. A
 * spec never names it and the spec's own styles, scales and config still decide. Frozen at mount
 * with `plugins`; change it by remounting.
 */
interface Theme {
    /** Names the theme in diagnostics and serves as a React `key`. */
    name: string;
    /** Sits above the built-in stylesheet and below the spec's own styles. */
    styles: Stylesheet;
    /**
     * Colours groups take, in order: what the default palette resolves to, for touching geoms too, and
     * what a discrete colour scale takes when it names no `range`.
     */
    palette?: readonly string[];
    /** Stops a continuous colour scale takes when it names no `range` or `scheme`, low to high. */
    colormap?: readonly string[];
    /** Sits above the config defaults and below the spec's own config. */
    config?: ThemeConfig;
    /** The one scheme the theme is drawn for. Omitted when its colours are light and dark pairs. */
    colorScheme?: ColorScheme;
    /** Repaints of built-in geoms. The host's `plugins` are read after these, so the host's decide on a clash. */
    plugins?: readonly RenderOnlyPlugin[];
}

/**
 * The config a theme may set: all of it but `content`, which holds what one graph says (its title,
 * its source) and the brand mark, none of them a theme's to decide.
 */
type ThemeConfig = Omit<ConfigSpec, 'content'>;
```

## Theme tokens

```ts
/**
 * A partial set of token values layered over a base theme — the shape of leftover chrome
 * overrides. Every token takes its CSS string value.
 */
type ThemeOverrides = Partial<ThemeValues>;

/** Every theme token mapped to its resolved CSS string value. */
type ThemeValues = Record<keyof typeof vars, string>;
```

## Animation

```ts
/**
 * Animation settings for a graph. `false` disables every animation. A viewer who prefers reduced
 * motion gets no animation whatever this asks for.
 */
type GraphAnimation = boolean | GraphAnimationProps;

/** Per-kind animation settings. Each kind is independent: turning one off leaves the other running. */
interface GraphAnimationProps {
    /**
     * Settings for the intro animation played when the chart first mounts, or when its panel comes into view
     * with `trigger: 'inView'`.
     * `false` disables it, an object overrides individual intro settings. Defaults on.
     */
    intro?: boolean | Partial<IntroAnimationOptions>;
    /** Whether geoms animate to their new position when the underlying data changes. Defaults on. */
    transitions?: boolean;
    /**
     * Total geom count across all layers above which the graph plays no animation, intro or
     * transitions. A line or area is one geom however many points it draws, so a dense live line
     * stays under the ceiling; turn `transitions` off for it. Defaults to 1500.
     */
    maxAnimatedGeoms?: number;
}
```

## Slots

```ts
/**
 * Region overrides for `GraphRenderer`. A slot replaces how one region paints; the viz-engine `ResolvedSpec`
 * still owns whether a region exists and what data it receives, and an override gets the same
 * render-ready props as its default.
 *
 * Layout-safe regions (`Header`, `Footer`, `Tooltip`, `Grid`, `Swatch`, `EditorSurface`) are bare
 * components — DOM-measured, reserving no edge space or painting inside a box the layout already sized.
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
    /**
     * The chart's editor layer, mounted over the frame in `mode="editable"`. Only
     * `@graphysdk/react-renderer/editable` exports something that fills it, so a read-only embed bundles
     * no editing code.
     */
    EditorSurface?: ComponentType<EditorSurfaceSlotProps>;
    Legend?: SlotOverride<LegendSlotProps, (legend: FormattedLegend, ctx: SlotMeasureContext) => number>;
    Headline?: SlotOverride<HeadlineSlotProps, HeadlineMeasurer>;
    AxisTicks?: SlotOverride<AxisTicksSlotProps, (axis: FormattedAxis, ctx: SlotMeasureContext) => number>;
    AxisLabel?: SlotOverride<AxisLabelSlotProps, (axis: FormattedAxis, ctx: SlotMeasureContext) => number>;
}

/**
 * Props for the Header slot, overridable via `slots.Header` on `GraphRenderer`. Title editing in
 * `editable` mode is internal to this default — it hands off to the editor `/editable` supplies —
 * and an override replacing the region opts out of it.
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
    headingStyle: TextStyle;
    subtitleStyle: TextStyle;
    /**
     * Resolved badge visual for header placement. `hidden` when the mark is off, below the min
     * footprint, or configured for footer placement.
     */
    brandMark: BrandMarkVisual;
}

/**
 * Props for the Footer slot, overridable via `slots.Footer` on `GraphRenderer`. Caption editing in
 * `editable` mode is internal to this default — it hands off to the editor `/editable` supplies —
 * and an override replacing the region opts out of it.
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
    captionStyle: TextStyle;
    sourceStyle: SourceStyle;
    /**
     * Resolved badge visual for footer placement. `hidden` when the mark is off, below the min
     * footprint, or configured for header placement.
     */
    brandMark: BrandMarkVisual;
}

/** Props for the Tooltip slot, overridable via `slots.Tooltip` on `GraphRenderer`. Positioning stays built in. */
interface TooltipSlotProps {
    /** Render-ready tooltip body, already formatted by the viz-engine runtime. */
    content: TooltipContent;
}

/**
 * Props for the Grid slot, overridable via `slots.Grid` on `GraphRenderer`. `panelRect` is in
 * SVG-local coordinates.
 *
 * A grid filling this slot spreads `stampGridEditTarget` on the group holding each line it draws, with a
 * hit area of its own inside that group, where `useGuidesTakePress` is true; a line it hides or moves
 * takes its hit area with it, and a line it does not stamp takes no press.
 */
interface GridSlotProps {
    axes: FormattedAxis[];
    panelBorderSizes: EdgeSizes;
    panelFrameRect: GraphLayout['panelFrame'];
    panelRect: GraphLayout['panel'];
}

/**
 * Props for the Legend slot, overridable via `slots.Legend` on `GraphRenderer`.
 *
 * A legend filling this slot spreads `stampLegendEditTarget` on every pill and direct label it paints where
 * `useGuidesTakePress` is true, and lets it take the pointer, or a press there selects the chart: the press
 * reads the legend and the item it stands for off those attributes.
 */
interface LegendSlotProps {
    formattedLegends: FormattedLegend[];
    rects: Partial<Record<Edge, Rect>>;
}

/** Props for the Headline slot, overridable via `slots.Headline` on `GraphRenderer`. */
interface HeadlineSlotProps {
    headline: FormattedHeadline;
    rect: Rect;
    resolvedSize: ResolvedHeadlineSize;
    /** Leading strip items to paint; the rest are hidden because they would overflow the band. */
    visibleItemCount: number;
    /**
     * Whether this figure sits in the donut hole. Strip polar totals reuse the grand-total class, so
     * paint cannot infer the hole from CSS — only the placement input knows.
     */
    isInDonutHole?: boolean;
}

/**
 * Props for the AxisTicks slot — the tick lines and tick labels of every axis, overridable via
 * `slots.AxisTicks`. `tickRects` are SVG-local, keyed by edge. The axis title is a separate slot — see
 * `AxisLabel`.
 */
interface AxisTicksSlotProps {
    formattedAxes: FormattedAxis[];
    tickRects: Partial<Record<Edge, Rect>>;
}

/**
 * Props for the AxisLabel slot — the axis title of every axis (e.g. "Revenue"), overridable via
 * `slots.AxisLabel`. `labelRects` are SVG-local, keyed by edge. The tick band is a separate slot — see
 * `AxisTicks`.
 */
interface AxisLabelSlotProps {
    formattedAxes: FormattedAxis[];
    labelRects: Partial<Record<Edge, Rect>>;
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
    /** The colour a stroke swatch draws with, and what a filled one falls back to without `paint`. */
    color: string;
    /**
     * The owning geom's gradient, pattern or image `fill`. A square or slice draws it; every other shape
     * draws the one colour it stands in as, as its geom does.
     */
    paint?: ResolvedPaint;
    surface: SwatchSurface;
    label?: string;
    lineType?: LineType;
    width?: number;
    height?: number;
    /** Line/area stroke width. Absent, {@link DefaultSwatch} draws at 2. */
    strokeWidth?: number;
    /** Owning layer `alpha`. Omit so {@link DefaultSwatch} keeps today's opacities. */
    alpha?: number;
    /** Square corner radius in px. Omit so {@link DefaultSwatch} keeps `rx={2}`. */
    cornerRadius?: number;
    /** The symbol a circle swatch draws, the owning point layer's `symbol`. Omit for a circle. */
    symbol?: StylePointSymbol;
}

/** Props the renderer passes to the editor layer filling the `EditorSurface` slot. */
interface EditorSurfaceSlotProps {
    /** The frame's content box — the element the layer measures, listens on and aligns its chrome to. */
    frameElement: HTMLElement;
    /** The panel's rect within that box, so chrome positioned from `layout` shares its origin. */
    panelRect: Rect;
    /** The axes as the chart paints them, whose ticks a stamped tick index addresses. */
    formattedAxes: readonly FormattedAxis[];
    /** Whether the chart animates between states, so what the editor draws over its geoms can follow. */
    shouldAnimateTransitions: boolean;
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
type Plugin = Definition | {
    readonly definition: Definition;
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
 * behavior rather than branching on `type`, so a custom geom is a first-class participant.
 *
 * What earns a place on the def: a field belongs here only if it answers a question a name-agnostic
 * pipeline stage must ask of *every* geom (e.g. "which coord systems do you support?", "what spatial
 * index do you paint into?"). A single geom's one-off behavior is an optional hook that geom alone
 * implements — never a shared flag the base class asserts for all geoms. Fields are grouped below by
 * the concern that consumes them.
 */
abstract class Geom<TParams = Record<string, never>> {
    /** Position columns the compile half injects and the render half reads — the cross-half contract. */
    readonly positionRoles: PositionRoles;
    /** What makes "the same observation" across recompiles. */
    readonly identityKey: IdentityKey;
    /** How overlapping marks of this geom arrange when the layer omits a position (bar → dodge, area → stack). */
    readonly defaultPosition: PositionAdjustment;
    /**
     * The stat a layer of this geom applies when it names none (a boxplot summarises its values; `null` passes
     * the data through as `identity`). Registering the geom registers this stat with it, so a layer can also
     * name it outright, or name `identity` to map already-summarised columns itself.
     */
    readonly defaultStat: Stat | null;
    /** Position adjustments this geom can render under; a layer position outside this set is rejected. */
    readonly supportedPositions: readonly PositionAdjustment[];
    /** Whether layers of this geom take part in hover hit-testing by default (rule opts out). */
    readonly defaultInteractive: boolean;
    /** Whether this geom's observations take the hover alongside other layers', or only when none answers. */
    readonly hoverPriority: HoverPriority;
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
    /**
     * How this geom composes highlight matches above its base render; `null` opts out of highlighting.
     * A geom opts in by naming the strategy its renderer can actually serve — an `overlay-anchor` geom
     * has to supply `getOverlayAnchor`, or its layer dims with nothing raised above it.
     */
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
    readonly dataLabels?: Partial<Record<CoordType, Partial<ResolvedDataLabelsSpec>>>;
    /** Coord types the built-in placement pipeline can place this geom's data labels under. */
    readonly dataLabelCoordTypes: readonly CoordType[];
    /**
     * Whether this geom composes a single geometry per group (e.g. a line's path) rather than
     * drawing one per observation (e.g. a point's marker).
     */
    readonly isComposite: boolean;
    /** The tooltip contract this geom declares. */
    readonly tooltip: TooltipContract;
    /** What the mark paints: its observations, and each part beside them. Unset, the geom paints the shared vocabulary. */
    readonly styleTarget?: GeomStyleTarget;
    /** Per-layer aggregate summaries this geom opts into (grand total, stack totals, per-group headline). */
    readonly summaries: GeomSummaries;
    /** Optional bespoke mapping requirement not expressible as a position role's `aes` source. */
    validateMapping?: (input: GeomMappingValidationInput) => readonly UserInputIssue[];
    /**
     * Optional: resolve a per-observation annotation anchor in normalised panel `[0, 1]` space. A geom
     * that supports anchoring (bar, line) implements this; the annotation stage skips geoms that don't.
     */
    resolveAnchorPosition?: (observation: Observation, context: AnchorContext) => AnchorPosition | null;
    /**
     * Optional: the fraction of its band this geom occupies (a bar's `width`). An `axis` annotation
     * anchor aligns to that rather than the whole band, so `align: 'left'` lands where the geoms end.
     * A geom that draws on the band center with no width doesn't implement it.
     */
    resolveBandFraction?: (params: ResolvedLayerSpec['params'], coordSystem: CoordSystem) => number;
    /**
     * Optional: the aesthetic carrying the value an observation stands for, where that is not its y (a
     * tile encodes its value as `color`), for the given {@link ValueSourcePurpose}. Returns `null` to
     * defer to the shared segment-y default.
     */
    resolveValueSource?: (mapping: AesMapping, purpose: ValueSourcePurpose) => AestheticValue | null;
    /**
     * Optional: data-label defaults that depend on the layer's position adjuster (e.g. bar defaults `justify` to
     * `'center'` on stacked/filled segments). Applied over the base defaults; both the per-coord defaults and
     * the user's config override it.
     */
    resolveDataLabelDefaults?: (position: PositionAdjustment) => Partial<ResolvedDataLabelsSpec>;
    /**
     * Optional: place this layer's data labels, in panel pixels, under the coords {@link dataLabelCoordTypes}
     * names; declaring one without the other is a registration fault. Called once per layer showing any label:
     * honour the `context.layer.dataLabels.show*` flags that apply, and print through the context's formatters
     * so labels match the axis and tooltip. Narrowing `context.layer` is sound because it is this geom's own.
     */
    getDataLabelPlacements?: (context: PluginPlacementContext) => PlacementResult;
    /**
     * Optional: what a `format: 'percentage'` label divides by. Resolved once per layer, before placement,
     * since the context's formatter closes over it. Unimplemented, a percentage label prints its absolute value.
     */
    resolvePercentageValueStrategy?: (layer: SceneLayer, coordType: CoordType_2) => PercentageValueStrategy;
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
     * {@link defaultParams}. Read by the layer resolver.
     * Override to apply a geom-specific invariant the merge can't express.
     */
    resolveParams(options: {
        params: Record<string, unknown> | undefined;
        diagnostics?: DiagnosticsSink;
    }): Record<string, unknown>;
    abstract compile(input: GeomCompilerInput): GeomCompileResult;
}

/** A custom stat is a {@link Stat} subclass instance. Named alias for its role as a plugin. */
type StatDefinition = Stat;
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
function defineGeomRenderer<Definition extends Geom<unknown>>(definition: Definition, contract: GeomRenderContract): BoundGeomRendererDefinition<Definition>;
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
 * Builds a {@link GraphyKit} from `plugins` and a `theme`, passed once. For a headless compile, use
 * `createSpecBuilder` and `<GraphProvider plugins theme>` directly. The `const` type parameter keeps
 * the `plugins` tuple, so `kit.geom.<customName>` is typed.
 */
function createGraphyKit<const P extends readonly Plugin_2[] = []>({ theme, ...options }?: CreateGraphyKitOptions<P>): GraphyKit<P>;

/**
 * The typed spec builders and a `GraphProvider` bound to the same `plugins` and the supplied `theme`.
 * What can be written and what can render come from one `plugins` array, so they cannot diverge.
 * Generic over the `plugins` tuple so the typed per-plugin builder methods (`geom.<name>`, …) flow
 * through to the React entry point.
 */
interface GraphyKit<P extends readonly Plugin_2[] = readonly Plugin_2[]> extends SpecBuilder<P> {
    GraphProvider: (props: Omit<GraphProviderProps, 'plugins' | 'theme'>) => ReactElement;
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

/** A part carries `aesthetics` only when it declares them, as `createGeomStyleNode` stamps it. */
type AestheticsSlot<Part> = Part extends {
    aesthetics: infer Declared;
} ? {
    aesthetics: Declared;
} : unknown;

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

interface AggregateTransformSpec {
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
 * What a geom reads besides the observation itself to place an anchor. `position` is the sole
 * authority on whether the value columns hold cumulative stack bounds; the measurement half reads it
 * too (`resolveSegmentYSource`), so both halves of an anchor agree on what the columns mean.
 */
interface AnchorContext {
    readonly coordSystem: CoordSystem;
    readonly position: PositionAdjustment;
    readonly purpose: AnchorPurpose;
    /**
     * Which point of the geom's box to resolve to, when the anchor names one. It overrides where
     * `purpose` would otherwise place the anchor; geoms without a box (a line vertex) ignore it.
     */
    readonly align?: AnchorAlign;
}

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

/**
 * A per-observation anchor position in a normalised `[0, 1]²` frame (annotation anchoring). Which
 * `AnchorSpace` follows from the coord system, so a position carries none itself: callers that turn
 * one into a resolved point stamp it via `resolveGeomAnchorSpace`.
 */
interface AnchorPosition {
    x: number;
    y: number;
}

/**
 * What an anchor is taken for, which decides where on an observation with extent it lands.
 *
 * - `'pin'` — something sits on the observation (a number, a comment, a sticker) and only has to read
 *   as its own, so it moves off an edge shared with a neighbouring segment.
 * - `'value'` — something reads the value off the axis (a difference arrow), so it stays on the outer
 *   edge, seam or not; anywhere else and the span measures neither end.
 *
 * A geom whose observations carry no extent resolves both to the same place.
 */
type AnchorPurpose = 'pin' | 'value';

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
    annotation: DifferenceArrowSpec;
} | {
    type: 'annotation';
    kind: 'shape';
    annotation: ShapeSpec;
} | {
    type: 'annotation';
    kind: 'arrow';
    annotation: ArrowSpec;
} | {
    type: 'annotation';
    kind: 'text';
    annotation: TextAnnotationSpec;
} | {
    type: 'annotation';
    kind: 'image';
    annotation: ImageAnnotationSpec;
} | {
    type: 'annotation';
    kind: 'sticker';
    annotation: StickerAnnotationSpec;
} | {
    type: 'annotation';
    kind: 'pinnedNumber';
    annotation: PinnedNumberAnnotationSpec;
} | {
    type: 'annotation';
    kind: 'comment';
    annotation: CommentAnnotationSpec;
};

/**
 * A point on the box of the annotation with id `ref`, reduced to the box-point named by `align`.
 * Dropped on a missing ref or a reference cycle. Nothing to resolve, so the input and resolved unions
 * share this type.
 */
interface AnnotationPointAnchor {
    anchorType: 'annotation';
    /** Explicit id of the target annotation. */
    ref: string;
    align?: AnchorAlign;
    offset?: AnchorOffset;
}

/**
 * Copies the box of the annotation with id `ref`. Dropped on a missing ref, a cycle, or a zero-area
 * (point) target. Nothing to resolve, so the input and resolved unions share this type.
 */
interface AnnotationRegionAnchor {
    anchorType: 'annotation';
    /** Explicit id of the target annotation. */
    ref: string;
}

/**
 * Whether an annotation renders beneath the geoms (background) or on top (foreground).
 */
type AnnotationZOrder = 'background' | 'foreground';

/** The node shape walks and the compiler read; the literal types are only for derivation. */
type AnyStyleTargetNode = StyleTargetNode;

/**
 * Represents a series of observations as a filled area. Multiple areas will be stacked on top of each other.
 *
 * Like the line geom, if the x variable is numeric or temporal, the data will be sorted by x.
 */
class AreaGeom extends Geom<AreaGeomParams> {
    readonly type: "area";
    readonly styleTarget: {
        readonly observation: {
            readonly vocabulary: {
                readonly strokeWidth: "pixels";
                readonly dashArray: "dashArray";
                readonly lineCap: "lineCap";
                readonly lineJoin: "lineJoin";
            };
            readonly aesthetics: {
                readonly fill: "color";
                readonly fillAlpha: "alpha";
                readonly strokeWidth: "strokeWidth";
                readonly dashArray: "lineType";
            };
            readonly rest: {
                readonly fill: StyleTokenRef;
                readonly fillAlpha: 0.3;
                readonly strokeWidth: 2;
                readonly dashArray: readonly [];
            };
        };
    };
    /** An area fills the spider polygon under polar, so polar joins the cartesian pair. */
    readonly supportedCoordTypes: readonly ["cartesian", "polar", "flip"];
    readonly defaultParams: AreaGeomParams;
    readonly defaultPosition: PositionAdjustment;
    readonly scaleConstraints: ScaleConstraints;
    readonly positionRoles: readonly [{
        readonly axis: "x";
        readonly role: "point";
        readonly valueKind: "value";
    }, {
        readonly axis: "y";
        readonly role: "min";
        readonly valueKind: "value";
    }, {
        readonly axis: "y";
        readonly role: "max";
        readonly valueKind: "value";
        readonly aes: "y";
    }];
    readonly aesthetics: readonly [{
        readonly kind: "visual";
        readonly name: "color";
    }, {
        readonly kind: "visual";
        readonly name: "strokeWidth";
    }, {
        readonly kind: "visual";
        readonly name: "lineType";
    }, {
        readonly kind: "visual";
        readonly name: "alpha";
    }];
    readonly summaries: GeomSummaries;
    readonly dataLabels: Partial<Record<CoordType, Partial<ResolvedDataLabelsSpec>>>;
    readonly dataLabelCoordTypes: readonly ["cartesian", "flip"];
    readonly resolvePercentageValueStrategy: (layer: SceneLayer) => PercentageValueStrategy;
    readonly isComposite = true;
    readonly legend: LegendPolicy;
    readonly highlightStrategy: "overlay-anchor";
    /** The band between `yMin` and the value is painted, so a cursor inside it is on the observation. */
    readonly spatialKind: SpatialKind;
    /**
     * Anchors on the observation's own vertex — the point the fill is drawn to — for either purpose. An
     * area band has extent, but the eye follows its boundary; stacking moves the vertex up the column
     * without changing which point stands for the observation.
     */
    readonly resolveAnchorPosition: (observation: Observation, { coordSystem }: AnchorContext) => AnchorPosition | null;
    /** Areas can't render gaps mid-stack, so `missingValues: 'gap'` is normalised to `'zero'`. */
    resolveParams(options: {
        params: Record<string, unknown> | undefined;
        diagnostics?: DiagnosticsSink;
    }): Record<string, unknown>;
    readonly getDataLabelPlacements: (context: PluginPlacementContext) => PlacementResult;
    compile({ data, mapping }: GeomCompilerInput): GeomCompileResult;
}

/**
 * Area-specific parameters.
 */
interface AreaGeomParams {
    /**
     * Curve used to connect the area's points (`'linear'` ⇒
     * `curveLinear`, `'smooth'` ⇒ `curveCatmullRom`).
     * @default 'linear'
     */
    curve: Curve;
    /**
     * How to handle missing (null/undefined) values:
     * - `'zero'`: nulls arrive already substituted with zero by the compiler.
     * - `'connect'`: drop nulls before pathing so the band spans the gap.
     * - `'gap'`: normalised to `'zero'` — an area can't render a gap mid-stack.
     * @default 'zero'
     */
    missingValues: MissingValues;
}

/**
 * Arrow annotation. Each endpoint is a {@link PointAnchorSpec}, so it can float in
 * panel fractions or pin to an observation. Distinct from {@link DifferenceArrowSpec},
 * which reads the measured gap between two observations.
 */
interface ArrowSpec {
    id?: string;
    /** Tail endpoint. */
    start: PointAnchorSpec;
    /** Head endpoint. */
    end: PointAnchorSpec;
    startArrowheadStyle?: ArrowheadStyle;
    endArrowheadStyle?: ArrowheadStyle;
}

/** Whether an arrow end carries an arrowhead. */
type ArrowheadStyle = 'none' | 'line-arrow';

/** The shape a declaration in each domain takes as authored. */
interface AuthoredStyleDomainValues extends ScalarStyleDomainValues {
    color: StyleColorValue;
    paint: AuthoredStylePaint;
    overlay: AuthoredStyleOverlay;
    shadow: StyleShadowValue<StyleColorValue>;
    padding: StylePaddingValue;
    margin: StylePaddingValue;
}

/**
 * What is drawn over a target's own fill: `'none'`, one paint or several with the first on top. A
 * geom's overlay is drawn as strongly as the layer under it, so it fades with a fill that is faint.
 * The graph's overlay is drawn at full strength over the frame, whatever the graph's fill or alpha.
 */
type AuthoredStyleOverlay = 'none' | AuthoredStylePaint | readonly AuthoredStylePaint[];

/** A paint as authored, compiled (tokens inlined) and resolved (every colour one string). */
type AuthoredStylePaint = StylePaint<StyleColorValue>;

/**
 * Axes configuration (after defaults applied)
 * Groups all axis-related settings per axis.
 */
interface AxesConfig {
    x: XAxisConfig;
    y: YAxisConfig;
    ySecondary?: SecondaryAxisOverride;
}

/**
 * A point given as axis values, mapped through the position scales. Dropped when either coordinate
 * fails to map: a value outside a discrete scale's domain, a missing scale, or a polar coord.
 * Nothing to resolve, so the input and resolved unions share this type.
 */
interface AxisAnchor {
    anchorType: 'axis';
    x: DataValue;
    y: DataValue;
    align?: AnchorAlign;
    offset?: AnchorOffset;
}

/**
 * Configuration for a single axis's grid lines
 */
interface AxisGridConfig {
    /**
     * Whether grid lines are visible. Their paint is styled through the stylesheet's `gridLine` target.
     * - true/false: explicit visibility
     * - null: let the compiler decide based on geom/coord policies
     *   (visible unless a geom policy hides it, e.g. bar charts hide the x grid)
     */
    isVisible: boolean | null;
}

/** Which axis something belongs to, with `ySecondary` already folded into `y`. */
type AxisKey = 'x' | 'y';

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
 * The canonical built-in geom defs, in registration order. The registry seeds from this tuple and the
 * authoring surface recovers the built-in names from it, so {@link GeomName} stays cross-checked
 * against the real defs (see {@link _GeomNamesMatchBuiltIns}).
 */
const BUILT_IN_GEOMS: readonly [BarGeom, PointGeom, LineGeom, AreaGeom, RuleGeom, TileGeom];

/** A bar's rounding: a token scaled to the bar or a number of pixels. */
type BarCornerRadius = BorderRadiusToken | number;

/**
 * Represents each observation as a rectangular bar spanning from a baseline (`yMin = 0`) to the
 * y value (`yMax`), centered on its x band.
 */
class BarGeom extends Geom<BarGeomParams> {
    readonly type: "bar";
    readonly styleTarget: {
        readonly observation: {
            readonly vocabulary: {
                readonly cornerRadius: "barRadius";
                readonly strokeWidth: "pixels";
            };
            readonly aesthetics: {
                readonly fill: "color";
                readonly alpha: "alpha";
                readonly strokeWidth: "strokeWidth";
            };
            readonly rest: {
                readonly fill: StyleTokenRef;
                readonly fillAlpha: 1;
                readonly cornerRadius: number | "none" | "xs" | "sm" | "md" | "lg" | "xl";
                readonly strokeWidth: 1;
                readonly stroke: StyleTokenRef;
            };
            readonly hovered: {
                readonly stroke: StyleTokenRef;
                readonly shadow: {
                    readonly offsetX: 0;
                    readonly offsetY: 4;
                    readonly blur: 6;
                    readonly color: "rgba(14, 14, 52, 0.16)";
                };
            };
        };
    };
    readonly defaultParams: BarGeomParams;
    readonly defaultPosition: PositionAdjustment;
    readonly positionRoles: readonly [{
        readonly axis: "x";
        readonly role: "point";
        readonly valueKind: "value";
    }, {
        readonly axis: "y";
        readonly role: "min";
        readonly valueKind: "value";
    }, {
        readonly axis: "y";
        readonly role: "max";
        readonly valueKind: "value";
        readonly aes: "y";
    }];
    readonly aesthetics: readonly [{
        readonly kind: "visual";
        readonly name: "color";
    }, {
        readonly kind: "visual";
        readonly name: "alpha";
    }];
    readonly summaries: GeomSummaries;
    readonly grid: Partial<Record<CoordType, GridPolicy>>;
    readonly legend: LegendPolicy;
    readonly scaleConstraints: ScaleConstraints;
    readonly dataLabels: Partial<Record<CoordType, Partial<ResolvedDataLabelsSpec>>>;
    readonly dataLabelCoordTypes: readonly ["cartesian", "flip", "polar"];
    readonly highlightStrategy: "observation-rerender";
    readonly supportedCoordTypes: readonly ["cartesian", "polar", "flip"];
    readonly spatialKind: SpatialKind;
    /** Stacked/filled segments read best with centred labels, matching the auto placement for stacks. */
    readonly resolveDataLabelDefaults: (position: PositionAdjustment) => Partial<ResolvedDataLabelsSpec>;
    /** A bar spans `width` of its band, leaving breathing room either side that nothing paints into. */
    readonly resolveBandFraction: (params: ResolvedLayerSpec["params"], coordSystem: CoordSystem) => number;
    /**
     * Anchors at the `align` box-point of the bar's extent when the anchor names one — under polar, of
     * the bounds the slice sweeps, so the same `align` names the same edge on a pie as on a bar.
     *
     * Otherwise at the middle of the band and along the value axis wherever
     * {@link resolveValueAxisAnchor} puts it, or the slice midpoint under polar.
     */
    readonly resolveAnchorPosition: (observation: Observation, { coordSystem, position, purpose, align }: AnchorContext) => AnchorPosition | null;
    /**
     * Substitutes an undrawable `width` with a safe value and reports the substitution, so the same
     * spec can't diverge across the React, canvas, and node renderers. A `width` outside `(0, 1]` has
     * no renderable band — non-positive or non-finite values collapse or invert the band edges, and a
     * value above `1` overlaps the neighbouring bands.
     */
    resolveParams(options: {
        params: Record<string, unknown> | undefined;
        diagnostics?: DiagnosticsSink;
    }): Record<string, unknown>;
    readonly getDataLabelPlacements: (context: PluginPlacementContext) => PlacementResult;
    readonly resolvePercentageValueStrategy: (layer: SceneLayer, coordType: CoordType_2) => PercentageValueStrategy;
    compile({ data, mapping, params, coordType }: GeomCompilerInput): GeomCompileResult;
    private resolveWidthParam;
}

/**
 * Bar/Column-specific parameters. `width` is geometry — it sets the band envelope the compiler
 * writes into the position variables. Paint (fill, border, corner rounding) is not a param: it
 * lives in the stylesheet (`spec.styles`), resolved per observation by the style resolver.
 */
interface BarGeomParams {
    /** Bar width as a fraction of the band the discrete scale allocates to the category, in `(0, 1]`. */
    width?: number;
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
    /**
     * Stable identifier; auto-assigned during resolution when omitted. Set it to give highlights and
     * annotation anchors a `layerId` to point at.
     */
    id?: string;
    /** Layer-local aesthetic mapping, merged over the spec-level mapping. */
    aes?: AesMapping;
    stat?: StatName | StatSpec | CustomStatSpec<string>;
    position?: PositionAdjustment;
    yScaleType?: YScaleType;
    params?: Partial<T>;
    transforms?: TransformSpec[];
    interactive?: boolean;
    /** Changes which fields this layer's tooltip shows and how. See {@link LayerTooltipSpec}. */
    tooltip?: LayerTooltipSpec;
    dataLabels?: DataLabelsSpec;
}

type BaseStyleBuilderTree = {
    readonly [Root in keyof typeof STYLE_TARGETS]: NodeBuilder<(typeof STYLE_TARGETS)[Root]>;
};

/**
 * Named corner-rounding scale for geoms that paint rect-like shapes. Semantic rather than a pixel
 * value so each coordinate system renders it in its own frame. `'none'` is square; `'full'` rounds
 * to half the shape's cross-axis thickness (a pill for bars).
 */
type BorderRadiusToken = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * The "Made with Graphy" provenance badge. A discovery signal (not a lock) — distinct from
 * `source`, which is the user's own attribution.
 */
interface BrandMarkConfig {
    enabled: boolean;
    placement: BrandMarkPlacement;
    variant: BrandMarkVariant;
}

/** Where the Graphy provenance badge anchors on the chart frame. */
type BrandMarkPlacement = 'footer' | 'header';

/**
 * Visual treatment for the badge when the frame is large enough for the full pill.
 * Below 200 px wide the renderer always collapses to the circular mini form regardless.
 */
type BrandMarkVariant = 'full' | 'mini';

/**
 * Colour interpolation space for an explicit ramp's stops. `'lab'` (perceptually near-uniform) is the
 * engine default; `'rgb'` reproduces d3's own default output; `'hcl'` matches Vega-Lite's. Named schemes
 * carry their own baked-in interpolation, so this never applies to them.
 */
const COLOR_INTERPOLATION_SPACES: readonly ["rgb", "lab", "hcl", "hsl"];

/** Every {@link CoordType}, for validation and diagnostics. */
const COORD_TYPES: readonly ["cartesian", "polar", "flip"];

type CartesianCoordParams = BaseCoordParams;

interface CartesianCoordSpec {
    type: 'coord';
    coordType: 'cartesian';
    params?: Partial<BaseCoordParams>;
}

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
    discrete: (options?: DiscreteScaleOptions<RangeValue>) => DiscreteScaleSpec;
    /**
     * Identity scale — data values used directly as visual values without transformation.
     * @example scale.lineType.identity() // observation['lineType'] passed through
     */
    identity: (options?: IdentityScaleOptions) => IdentityScaleSpec;
}

interface CategoricalValueFormat {
    type: 'text';
}

/**
 * The chart-scoped chrome output of the styles compile — one list pair per target, entries keeping
 * their partition (`edge`, `axis`, `kind`, `annotation`, …) for read-time filtering. The built-in
 * entries sit at the front of `defaults`. `warnings` are re-emitted into the compile diagnostics every
 * compile. Keys are registry roots other than `geom`.
 */
type ChromeStyleTargetName = Exclude<keyof typeof STYLE_TARGETS, 'geom'>;

type ChromeTargetName = Exclude<keyof typeof STYLE_TARGETS, 'geom'>;

/**
 * Options for a continuous `color` scale. Same as {@link ContinuousScaleOptions}, but the value maps to a
 * colour: supply a `scheme`, an explicit `range` of stops, or neither (the brand sequential ramp).
 */
type ColorContinuousScaleOptions = Omit<ContinuousScaleOptions, 'range'> & {
    /**
     * Explicit colour ramp — two-or-more stops the value interpolates through, in the `interpolate` space.
     * Supersedes `scheme`.
     * @example scale.color.continuous({ range: ['#fff', '#f00'] })
     */
    range?: ReadonlyArray<number | string>;
    /**
     * Named colormap. Sequential (`'viridis'`, `'magma'`, …) or diverging (`'RdBu'`, `'BrBG'`, …), matched
     * case-insensitively. A diverging scheme reads as intended only with a `domainMid`.
     * @example scale.color.continuous({ scheme: 'viridis' })
     */
    scheme?: ColorSchemeName;
    /**
     * Colour interpolation space for `range` stops. `'lab'` (default) is perceptually near-uniform; `'rgb'`
     * matches d3's raw default. Ignored for `scheme` (which carries its own interpolation).
     * @example scale.color.continuous({ range: ['#440154', '#21908c', '#fde725'], interpolate: 'lab' })
     */
    interpolate?: ColorInterpolationSpace;
    /**
     * Diverging midpoint — pins the ramp's neutral stop to this data value (usually 0) rather than the data
     * midpoint.
     * @example scale.color.continuous({ scheme: 'RdBu', domainMid: 0 })
     */
    domainMid?: number;
    /**
     * Symmetrise the domain about `domainMid` so equal magnitudes get equal colour intensity. Defaults to
     * `true` when `domainMid` is set, so `domainMid` alone is enough. Pass `false` to keep the raw extent,
     * where the shorter arm still reaches full intensity. No effect without `domainMid`.
     */
    symmetric?: boolean;
};

type ColorInterpolationSpace = (typeof COLOR_INTERPOLATION_SPACES)[number];

interface ColorScaleMethods {
    /**
     * Continuous (numeric) color scale. Supports `transform`, `reverse`, `nice`, `domainMin`,
     * `domainMax`, a `scheme` or colour-ramp `range`, the `interpolate` space, and — for a diverging ramp —
     * `domainMid` (neutral value) with `symmetric`.
     * @example scale.color.continuous({ scheme: 'viridis' })
     * @example scale.color.continuous({ scheme: 'RdBu', domainMid: 0, symmetric: true })
     */
    continuous: (options?: ColorContinuousScaleOptions) => ContinuousScaleSpec;
    /**
     * Discrete (categorical) color scale. Supports explicit `range` values.
     * @example scale.color.discrete({ range: ['red', 'blue', 'green'] })
     */
    discrete: (options?: DiscreteScaleOptions) => DiscreteScaleSpec;
    /**
     * Color scale from a named Graphy palette.
     * @example scale.color.palette({ palette: { type: "graphy" } })
     */
    palette: (options?: PaletteScaleOptions) => PaletteScaleSpec;
}

/**
 * Comment annotation: a marker dot pinned to a single observation, carrying
 * rich-text content. The renderer's mini view shows a truncated comment; hover
 * reveals the full text.
 */
interface CommentAnnotationSpec {
    id?: string;
    at: ObservationAnchorSpec;
    content: RichTextContent;
}

/** Comparison operators for declarative filtering. */
type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

/**
 * Config specification with type tag
 */
interface ConfigItem {
    type: 'config';
    config: ConfigSpec;
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

interface ConstantTransformSpec {
    type: 'transform';
    transformType: 'constant';
    options: ConstantOptions;
}

/** Content input — all fields optional. Partial brandMark merges onto defaults. */
type ContentSpec = Partial<Omit<ResolvedContentSpec, 'brandMark'>> & {
    brandMark?: Partial<BrandMarkConfig>;
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
     * Restrict output to the scale's range when input falls outside the domain.
     * Without clamping, values extrapolate beyond the range boundaries.
     * Default is false for position aesthetics (x, y), true for non-position (color, size, alpha, …).
     * @example clamp: true // Pin out-of-domain values to range boundaries
     */
    clamp?: boolean;
    /**
     * Pin the low end of the domain; the high end still follows the data. `domainMin: 0` keeps zero on
     * the axis, from the top when the data is all negative.
     * @example domainMin: 0
     */
    domainMin?: number;
    /**
     * Pin the high end of the domain; the low end still follows the data.
     * @example domainMax: 100
     */
    domainMax?: number;
    /**
     * Output range for non-positional magnitude scales (size, alpha, strokeWidth). Ignored for position
     * aesthetics (x, y). A numeric `[min, max]`; aesthetic-specific defaults apply when omitted
     * (size `[4, 20]`, alpha `[0.1, 1]`, strokeWidth `[1, 4]`).
     *
     * A continuous `color` scale takes a colour ramp instead — see {@link ColorContinuousScaleOptions}.
     * @example scale.size.continuous({ range: [2, 30] })
     */
    range?: [number, number];
};

type ContinuousScaleSpec = {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'continuous';
    transform?: ScaleTransformType;
    reverse?: boolean;
    nice?: boolean;
    clamp?: boolean;
    domainMin?: number | null;
    domainMax?: number | null;
    /**
     * Output range. A numeric `[min, max]` for magnitude aesthetics (size, alpha, strokeWidth); a ramp of
     * two-or-more colour strings for a continuous `color` scale, interpolated in the
     * {@link ContinuousScaleSpec.interpolate} space.
     */
    range?: ReadonlyArray<number | string> | null;
    /**
     * Named colormap for a continuous `color` scale (e.g. `'viridis'`, `'RdBu'`). Superseded by an explicit
     * `range`. Inert for non-colour aesthetics.
     */
    scheme?: ColorSchemeName | null;
    /** Interpolation space for a colour `range`'s stops. Ignored for `scheme`. Inert for non-colour aesthetics. */
    interpolate?: ColorInterpolationSpace;
    /** Diverging midpoint — pins a colour ramp's neutral stop to this value. Inert for non-colour aesthetics. */
    domainMid?: number | null;
    /** Symmetrise the domain about `domainMid`. Defaults to `true` when `domainMid` is set; inert otherwise. */
    symmetric?: boolean;
};

/**
 * Discriminated union of all coordinate input specs (user-provided, optional params).
 */
type CoordSpec = CartesianCoordSpec | FlipCoordSpec | PolarCoordSpec;

/**
 * Render-ready coordinate system (discriminated union).
 * Discriminates on geometric paradigm: cartesian plane vs polar projection.
 *
 * The same geom renders differently per coord: a bar is a rect in cartesian and an arc in polar.
 */
type CoordSystem = CartesianCoordSystem | PolarCoordSystem;

type CoordSystemFor<C extends CoordType_2> = Extract<CoordSystem, {
    type: C;
}>;

/**
 * Coordinate system type for transforming geometric positions.
 *
 * - `'cartesian'` — Standard x/y Cartesian plane
 * - `'polar'` — Polar coordinates for pie, radar, and radial charts
 * - `'flip'` — Cartesian with x and y axes swapped
 */
type CoordType = (typeof COORD_TYPES)[number];

/** Coord-system narrowed by `CoordSystem['type']`. */
type CoordType_2 = CoordSystem['type'];

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

/**
 * Curve interpolation method for lines and areas.
 *
 * - `'linear'` — Straight segments between points. Maps to d3-shape `curveLinear`.
 * - `'smooth'` — Smooth spline through points. Maps to d3-shape `curveCatmullRom`.
 */
type Curve = 'linear' | 'smooth';

type CustomGeomStyleBuilders<P extends readonly Plugin[]> = {
    [Def in GeomDefsOf<P> as [DeclaredStyleTarget<Def>] extends [never] ? never : Def['type'] & string]: NodeBuilder<GeomStyleNodeFor<Def['type'] & string, DeclaredStyleTarget<Def>>>;
};

/** A single named color slot within a custom palette supplied by the host. */
type CustomPaletteColor = {
    id: string;
    hex: string;
    name?: string;
};

/** Reference to a user-registered custom palette by id, resolved against the palette registry. */
type CustomPaletteSpec = {
    type: 'custom';
    id: string;
};

/**
 * The `role` partition of the dataLabel target — which on-canvas label an entry addresses.
 *
 * - `observation` — per-observation value labels.
 * - `category` — per-observation category text placed as its own label beside the value label.
 * - `aggregate` — labels over values derived from several observations, e.g. stack totals.
 */
const DATA_LABEL_ROLES: readonly ("aggregate" | "observation" | "category")[];

/**
 * Conventional `context` keys. A diagnostic's `context` is free-form `Record<string, JsonValue>`,
 * but emitters draw from this vocabulary so consumers can rely on consistent keys per code rather
 * than parsing prose:
 *
 * - `layerIndex` — index of the offending layer
 * - `layerId` — stable id of the offending layer
 * - `annotationId` — stable id of the offending annotation (`INCOMPARABLE_ARROW_ENDPOINTS`)
 * - `aesthetic` — the aesthetic channel (`x`, `y`, `color`, …)
 * - `variableName` — the offending data variable
 * - `scaleType` — the scale type involved
 * - `variableType` — the data type of the offending variable
 * - `expected` / `actual` — the required vs. supplied value
 * - `requested` / `available` — an unknown/duplicate registered type and the registered alternatives
 * - `kind` — the registry or resolver label for a registration diagnostic (`UNKNOWN_REGISTERED_TYPE`,
 *   `DUPLICATE_REGISTERED_TYPE`, `MISSING_GEOM_RENDERER`)
 * - `geom` / `param` — the geom type and its param that failed validation (`INVALID_GEOM_PARAM`)
 * - `ref` — the id an annotation reference points at
 * - `annotationId` — id of the annotation the diagnostic is about
 */
const DIAGNOSTIC_CONTEXT_KEYS: readonly ["layerIndex", "layerId", "annotationId", "aesthetic", "variableName", "scaleType", "variableType", "expected", "actual", "requested", "available", "kind", "geom", "param", "styleEntryId", "ref", "annotationId"];

/**
 * Diverging colormap names from `d3-scale-chromatic`, in Brewer's capitalisation. `RdBu`, `BrBG` and
 * `PuOr` are colour-vision-deficiency safe; `Spectral` is offered for its familiar rainbow look but is not
 * CVD-safe. Red-green ramps are deliberately excluded.
 */
const DIVERGING_SCHEME_NAMES: readonly ["RdBu", "BrBG", "PuOr", "Spectral"];

/** Dash and gap lengths in multiples of the stroke width; `[]` is solid. */
type DashArray = readonly number[];

/**
 * Anchor along one axis of the geom's box, CSS-flexbox style. `justify` runs along the value
 * axis — `'end'` is the value tip whatever the orientation or sign (e.g. the bottom of a negative
 * column). `align` runs across it: bandwidth for bars, angular for pie wedges, x for
 * point/line/area.
 */
type DataLabelAlign = 'start' | 'center' | 'end';

/**
 * Value-axis anchors. `'panel-start'`/`'panel-end'` resolve against the panel instead of the
 * geom's box, so labels sit flush at the chart edge regardless of the geom's length. They stay
 * sign-aware like `'end'` and always inset inward, ignoring `position` on the value axis — past
 * the panel edge is off-canvas.
 */
type DataLabelJustify = DataLabelAlign | 'panel-start' | 'panel-end';

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
 * no background); off it — by placement, offset, or not fitting — outside styling (dark text on
 * a background). Area labels always use the outside styling: the translucent fill can't back
 * white text.
 */
type DataLabelPosition = 'auto' | 'inside' | 'outside';

/** Label role shared by placement, measurement and paint: per-observation, aggregate or category text. */
type DataLabelRole = (typeof DATA_LABEL_ROLES)[number];

/**
 * Renderer-supplied measurer that knows which font to apply for each role at each position.
 * Lets placement strategies measure text without the engine ever holding a `FontSpec`.
 *
 * Must return the label's final box — text metrics plus the renderer's own padding. The engine
 * uses the returned `width`/`height` as `PlacedDataLabel.width`/`height`, adding no padding of
 * its own.
 */
type DataLabelTextMeasurer = (role: DataLabelRole, position: ResolvedDataLabelPosition, text: string) => MeasuredText;

/** User-facing data-labels options; any omitted field falls back to its resolved default. */
type DataLabelsSpec = DeepPartial<Omit<ResolvedDataLabelsSpec, 'labelSource'>>;

type DatetimeScaleOptions = {
    /** Pin the start of the domain (milliseconds since epoch); the end still follows the data. */
    domainMin?: number;
    /** Pin the end of the domain (milliseconds since epoch); the start still follows the data. */
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

interface DatetimeScaleSpec {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'datetime';
    domainMin?: number | null;
    domainMax?: number | null;
    nice?: boolean;
    reverse?: boolean;
    clamp?: boolean;
}

/** A vocabulary's declarations at one tier: each property optional, its value in the domain's shape. */
type DeclarationsIn<Vocab extends StyleVocabulary, Tier extends Record<StyleDomain, unknown>> = {
    [Property in keyof Vocab]?: Tier[Extract<Vocab[Property], StyleDomain>];
};

/** The style target a def declares. A def inheriting the base's optional field declares none. */
type DeclaredStyleTarget<Def extends Geom<unknown>> = undefined extends Def['styleTarget'] ? never : NonNullable<Def['styleTarget']>;

/**
 * Recursively makes every property of `T` optional.
 * Unlike the built-in `Partial`, this applies to nested objects as well.
 */
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends Array<infer U> ? Array<DeepPartial<U>> : unknown extends T[K] ? T[K] : NonNullable<T[K]> extends object ? DeepPartial<NonNullable<T[K]>> : T[K];
};

type DefaultPaletteSpec = {
    type: 'default';
};

/** The three compile-side definition shapes a plugin can contribute. */
type Definition = Geom<unknown> | StatDefinition | TransformStrategy;

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
 * The write surface of a diagnostics sink. Producers (geoms, resolvers) only ever record issues, so
 * they take this interface — the compile pipeline keeps `drain`/`reset` to itself, and decorators
 * like {@link DiagnosticsWithBaseContext} can stand in without owning a buffer.
 */
interface DiagnosticsSink {
    addWarning: (issue: UserInputIssue, options?: {
        persistent?: boolean;
    }) => void;
    addError: (issue: UserInputIssue) => void;
}

/** What a difference arrow's label measures: the raw gap, the relative change, or one value as a share of the other. */
type DifferenceArrowLabelKind = 'absolute-difference' | 'relative-difference' | 'proportion';

/**
 * User-facing difference-arrow input. `labelCrossPosition` is defaulted by the resolver. Its paint
 * comes from the stylesheet: `style.annotation.differenceArrow(...)` for every arrow,
 * `style.annotation.differenceArrow.label(...)` for the label, `{ annotation: id }` for this one.
 */
interface DifferenceArrowSpec {
    /** Stable id; generated by the resolver when omitted. */
    id?: string;
    /** Observation the arrow's tail points from. */
    start: ObservationAnchorSpec;
    /** Observation the arrow's head points to. */
    end: ObservationAnchorSpec;
    /** What the arrow's label measures (raw gap, relative change, or share). */
    label: DifferenceArrowLabelKind;
    /** AnchorOffset of the label along the arrow, as a fraction of the arrow's length. */
    labelCrossPosition?: number;
}

type DiscreteScaleOptions<RangeValue extends number | string = number | string> = {
    /**
     * Explicit output values mapped to domain categories in order.
     */
    range?: RangeValue[];
    /**
     * Explicit domain values controlling category order and membership.
     * Only these values appear in the scale, except an x whose layers stand on the constant x, as a pie's.
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

interface DiscreteScaleSpec {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'discrete';
    range?: Array<number | string> | null;
    domain?: Array<string | number> | null;
    padding?: number | null;
    reverse?: boolean;
}

/** Positions where axes/labels/legends can be placed around the panel. */
type Edge = 'top' | 'right' | 'bottom' | 'left';

/** Measured sizes (in pixels) for each edge of the layout. */
type EdgeSizes = Record<Edge, number>;

/** Extra fields an entry on this node may carry. Every entry may also carry a `coord`. */
type EntryOption = 'where' | 'state' | 'layer' | 'annotation';

type EntryOptionsFor<Options> = {
    id?: string;
    coord?: StyleCoord;
} & (NonNullable<Options> extends readonly EntryOption[] ? ('where' extends NonNullable<Options>[number] ? {
    where?: Predicate;
} : unknown) & ('state' extends NonNullable<Options>[number] ? {
    state?: StyleState;
} : unknown) : unknown) & OpenIdSelect<Options>;

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

interface FilterTransformSpec {
    type: 'transform';
    transformType: 'filter';
    options: FilterOptions;
}

/** Flattened so a derived vocabulary is the same type as one written out by hand. */
type Flatten_2<Shape> = {
    [Key in keyof Shape]: Shape[Key];
};

type FlipCoordParams = BaseCoordParams;

interface FlipCoordSpec {
    type: 'coord';
    coordType: 'flip';
    params?: Partial<BaseCoordParams>;
}

const GEOM_ENTRY_OPTIONS: readonly ["where", "state", "layer"];

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

/** Output of {@link Geom.compile}: the dataset and mapping after the geom's own reshaping, fed to the next stage. */
interface GeomCompileResult {
    /** The reparameterized dataset (may have new computed variables) */
    data: Dataset;
    /** Any mapping overrides produced by the geom */
    mapping: AesMapping;
}

/** Context a geom's `validateMapping` hook receives to assert a bespoke mapping requirement. */
interface GeomMappingValidationInput {
    /** The layer's effective mapping (root + layer merged). */
    mapping: AesMapping;
    /** Aesthetics the layer's stat computes at compile time, which count as "provided". */
    computedVariables: ReadonlySet<string>;
}

/**
 * The type of geometric mark used to represent data in a layer.
 *
 * - `'point'` — Scatter-style dot marks
 * - `'line'` — Connected line marks
 * - `'area'` — Filled area marks
 * - `'bar'` — Rectangular bar marks (cartesian) or pie wedge (polar)
 * - `'rule'` — Horizontal or vertical reference line at a constant value
 * - `'tile'` — Rectangular cell filling a band on both axes; the heatmap mark
 */
type GeomName = 'point' | 'line' | 'area' | 'bar' | 'rule' | 'tile';

/**
 * What a geom's observations paint. The shared geom paint extends the declared vocabulary, so a chart
 * wide `style.geom({ fill })` reaches the layer without it naming `fill`; `sharedPaint: false`
 * declines that, for a kind whose mark speaks fewer words than every other.
 */
interface GeomObservationPart<Vocab extends StyleVocabulary = StyleVocabulary> extends GeomStylePart<Vocab> {
    sharedPaint?: boolean;
    /** The dash array each `lineType` preset draws as, when an aesthetic answers `dashArray`. Unset, a line's. */
    dashPresets?: Readonly<Record<LineType, DashArray>>;
}

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
    tile: TileGeomParams;
}

/** The node {@link createGeomStyleNode} builds, in the literal types the builders and readers derive from. */
type GeomStyleNodeFor<Kind extends string, Target> = {
    select: {
        target: 'geom';
        kind: Kind;
    };
    vocabulary: ObservationVocabularyOf<Target>;
    aesthetics: NonNullable<AnyStyleTargetNode['aesthetics']>;
    options: OptionsOf<ObservationOf<Target>>;
    children: {
        [Part in keyof PartsOf<Target> & string]: {
            select: {
                target: 'geom';
                kind: Kind;
                part: Part;
            };
            vocabulary: VocabularyOf<PartsOf<Target>[Part]>;
            options: OptionsOf<PartsOf<Target>[Part]>;
        } & AestheticsSlot<PartsOf<Target>[Part]> & StateSlots<PartsOf<Target>[Part]>;
    };
} & StateSlots<ObservationOf<Target>>;

/** One part of a geom's mark: the properties it paints and its built-in look in each state. */
interface GeomStylePart<Vocab extends StyleVocabulary = StyleVocabulary> {
    vocabulary: Vocab;
    /**
     * The entry options this part takes. Defaults to `where`, `state` and `layer`; a part styled as a
     * whole — a rule's label — narrows it so an entry naming it carries no conditions.
     */
    options?: readonly EntryOption[];
    /**
     * The aesthetic that supplies each property's data-driven value. Only a part painted once per
     * observation declares any (a lollipop's stem).
     */
    aesthetics?: {
        [property: string]: AestheticKey | undefined;
    };
    rest?: VocabularyDeclarations<Vocab>;
    dimmed?: VocabularyDeclarations<Vocab>;
    hovered?: VocabularyDeclarations<Vocab>;
}

/**
 * An entry addressing a geom's observations or one part of its mark. The kinds are not a set a type
 * can enumerate — a kit registers its own — so the compile stage checks the declarations against the
 * kind's declared vocabulary, and the type carries the address alone.
 */
interface GeomStyleRule {
    id?: string;
    select: GeomStyleSelect;
    declarations: StyleDeclarations;
    when?: WhenClause;
}

/**
 * The address a geom entry carries. A part belongs to the kind that declares it, so an entry naming a
 * part names its kind too; without one it addresses every kind's observations.
 */
type GeomStyleSelect = {
    target: 'geom';
    layer?: string;
    coord?: StyleCoord;
} & ({
    kind: string;
    part?: string;
} | {
    kind?: undefined;
    part?: undefined;
});

/**
 * The style target a geom registers. `observation` is the layer's own paint at
 * `{ target: 'geom', kind }`: it reads the data tier and takes every geom entry that names no part.
 * Each entry of `parts` sits at `{ target: 'geom', kind, part }`, takes only the entries naming it,
 * and reads the data tier only through the `aesthetics` it declares.
 */
interface GeomStyleTarget {
    observation?: GeomObservationPart;
    parts?: Record<string, GeomStylePart>;
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
    axes: Partial<Record<Edge, Rect>>;
    /** Rects for axis title labels, keyed by edge. */
    axisLabels: Partial<Record<Edge, Rect>>;
    /** Rect for the header region (title + subtitle, above the panel). */
    header: Rect;
    /** Full-width rect for the headline strip (below the header, above the plot). Zero when absent. */
    headline: Rect;
    /** Rect for the footer region (caption, below the panel). */
    footer: Rect;
    /** Rects for the legend regions, keyed by edge. */
    legends: Partial<Record<Edge, Rect>>;
}

type GraphyPaletteSpec = {
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
type HeadlineCompareWith = 'previous' | 'first' | 'none';

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
    compareWith: HeadlineCompareWith;
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

interface HighlightBuilderOptions {
    id?: string;
    scope?: MatchScope;
    /** Stable id of the layer to scope the highlight to. */
    layerId?: string;
}

/**
 * How a geom composes highlight matches above its base render. Declared by each geom as
 * `highlightStrategy` and stamped onto `SceneLayer.highlight.strategy` by
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
     * Stable `SceneLayer.id`. The engine preserves it across `update()` calls regardless of layer
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
     *   read `observation`, or take the row from `readObservationIndex`.
     */
    pointIndex: number;
    /**
     * The row `observation` occupies in its layer's data, carried only by the index kinds whose
     * `pointIndex` is something else — read it through `readObservationIndex`, never directly.
     */
    observationIndex?: number;
    /**
     * The observation being hovered over. Renderers read values from here; the engine does not format.
     */
    observation: Observation;
}

/**
 * `'low'` observations take the hover only where no normal-priority layer answers, for a geom drawn over another (an
 * error bar on its bar) that must not take the hover from it. They still join the winner's tooltip as related.
 */
type HoverPriority = 'normal' | 'low';

/**
 * What makes "the same observation" across recompiles, for morphs and hover stability.
 *
 * Three kinds are *derived*: the pipeline resolves them from the layer's position/mapping, so the geom
 * names a role, not a column.
 * - `'index'`: positional index into the dataset — the fallback when no field is stable.
 * - `'x-group'`: the columns backing the layer's x + group aesthetics, resolved per chart from the
 *   mapping. The default for standard cartesian geoms, which can't name those columns themselves.
 * - `'x-y'`: the columns backing both position aesthetics, for a geom whose observations partition a
 *   grid rather than a series — a tile's x repeats down its column, with no group to tell those apart.
 *
 * `{ variable }` is *explicit*: identity is one data column the geom owns and names directly, for a
 * geom keyed by its own id (sankey nodes, voronoi sites) where the x+series roles don't apply.
 */
type IdentityKey = 'index' | 'x-group' | 'x-y' | {
    readonly variable: string;
};

type IdentityScaleOptions = Record<string, never>;

interface IdentityScaleSpec {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'identity';
}

/**
 * Resolved identity stat spec.
 */
interface IdentityStatSpec {
    type: 'identity';
}

/** How an image annotation scales inside its box: stretch, letterbox, or crop-to-fill. */
type ImageAnnotationFit = 'fill' | 'contain' | 'cover';

/**
 * Image annotation. Its area is positioned by a {@link RegionAnchorSpec} so it
 * re-resolves each compile (re-flows on resize, tracks data when bound). Its paint comes from the
 * stylesheet: `style.annotation.image(...)` for every image, `{ annotation: id }` for this one.
 */
interface ImageAnnotationSpec {
    id?: string;
    /** Image URL or data URI. */
    src: string;
    /** Draw beneath the geoms (background) or on top (foreground). */
    zOrder?: AnnotationZOrder;
    /** The area the image fills. */
    region: RegionAnchorSpec;
    /** How the image scales inside its box. */
    fit?: ImageAnnotationFit;
}

type InferredScaleOptions = ContinuousScaleOptions | DiscreteScaleOptions | DatetimeScaleOptions;

interface InferredScaleSpec {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'inferred';
    options?: InferredScaleOptions;
}

/**
 * Stable code for a violated engine invariant.
 */
type InternalErrorCode = 'INTERNAL_INVARIANT';

/**
 * The order staggered point geoms enter in: reading order along the main axis, or by size for
 * bubbles, which falls back to main-axis order for points with no size.
 */
type IntroStaggerOrder = 'main-axis' | 'value-ascending' | 'value-descending';

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

/** The full set of supported BCP-47 locale strings. */
const LOCALES: readonly ["en-GB", "en-US", "ar", "pt-PT"];

/**
 * Fields shared by every layer input regardless of geom. All optional fields fall back to resolved
 * defaults; the geom-specific arms of {@link LayerSpec} add `geom` and `params` on top.
 */
interface LayerSpecBase {
    type: 'layer';
    /** Stable identifier; auto-assigned during resolution when omitted. */
    id?: string;
    /** Layer-local aesthetic mapping, merged over the spec-level mapping. */
    mapping?: AesMapping;
    /**
     * Statistical transform applied to this layer (e.g. count, mean, smooth), or a custom plugin stat.
     * @default 'identity'
     */
    stat?: StatName | StatSpec | CustomStatSpec<string>;
    /** How overlapping geoms are arranged (stack, dodge, fill, identity). */
    position?: PositionAdjustment;
    /** Which y scale this layer binds to — the primary or secondary axis. */
    yScaleType?: YScaleType;
    dataLabels?: DataLabelsSpec;
    /**
     * Ordered transforms applied to this layer's view of the data, on top of any
     * spec-level transforms. Use this when a geom needs a different shape of the
     * data than its siblings (e.g. a line overlay on top of reshaped stacked bars).
     */
    transforms?: TransformSpec[];
    /**
     * When `false`, the layer is skipped from main hover hit-detection.
     * @default true
     */
    interactive?: boolean;
    /** Changes which fields this layer's tooltip shows and how. See {@link LayerTooltipSpec}. */
    tooltip?: LayerTooltipSpec;
}

type LayerSpecFor<G extends GeomName> = LayerSpecBase & {
    geom: G;
    params?: Partial<GeomParamsMap[G]>;
};

/** How a chart author changes one of a layer's tooltip fields. */
interface LayerTooltipFieldSpec {
    /** Replaces the row's label. The default rows keep their colour group's label, so it names them only without one. */
    title?: string;
    /** Formats the row's value in the chart's locale, in place of its variable's own format. */
    format?: ExplicitValueFormat;
    /** Heads the tooltip with the field's value instead of giving it a row, over the geom's heading and the anchor. */
    heading?: boolean;
}

/**
 * A layer's tooltip fields, in the order they show, merged over the geom's own. A key names a field of the geom's
 * tooltip contract (its `key`, or its `aes`), an aesthetic the layer maps, or a variable the geom derives. A layer
 * whose geom has no contract names its default rows `y`. `false` removes a field, `true` adds or moves it, and a
 * {@link LayerTooltipFieldSpec} also renames it, reformats it, or heads the tooltip with it. The geom's remaining
 * fields follow the author's.
 */
type LayerTooltipSpec = Readonly<Record<string, boolean | LayerTooltipFieldSpec>>;

/**
 * Placement of the legend items along its flow.
 * - For a horizontal (`top`/`bottom`) legend this runs along the row: `start` = left, `end` = right.
 * - For a vertical (`left`/`right`) legend it runs down the column: `start` = top, `end` = bottom.
 * Vertical legends always pin to the plot border across the flow regardless of this value.
 * `'auto'` resolves during compilation to `start` for horizontal legends and `center` for vertical.
 */
type LegendAlign = 'auto' | 'start' | 'center' | 'end';

/**
 * Legend display mode type
 * - 'pill': Standard boxed legend with icons and labels
 * - 'direct': Labels rendered directly next to series endpoints
 * - 'auto': Resolved during compilation based on chart type
 */
type LegendDisplay = 'pill' | 'direct' | 'auto';

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
    directLabelSupport?: Partial<Record<PositionAdjustment, boolean>>;
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
 * Legend configuration input type (all fields optional)
 */
type LegendSpec = Partial<ResolvedLegendSpec>;

/**
 * Represents a series of points connected by a line.
 *
 * If the x variable is numeric or temporal, the data will be sorted by x (this is to ensure the line is connected in the correct order).
 */
class LineGeom extends Geom<LineGeomParams> {
    readonly type: "line";
    readonly styleTarget: {
        readonly observation: {
            readonly vocabulary: {
                readonly strokeWidth: "pixels";
                readonly dashArray: "dashArray";
                readonly lineCap: "lineCap";
                readonly lineJoin: "lineJoin";
            };
            readonly aesthetics: {
                readonly stroke: "color";
                readonly strokeAlpha: "alpha";
                readonly strokeWidth: "strokeWidth";
                readonly dashArray: "lineType";
            };
            readonly rest: {
                readonly stroke: StyleTokenRef;
                readonly strokeWidth: 2;
                readonly dashArray: readonly [];
            };
        };
    };
    /** A line connects the spider outline under polar, so polar joins the cartesian pair. */
    readonly supportedCoordTypes: readonly ["cartesian", "polar", "flip"];
    readonly defaultParams: LineGeomParams;
    readonly positionRoles: readonly [{
        readonly axis: "x";
        readonly role: "point";
        readonly valueKind: "value";
    }, {
        readonly axis: "y";
        readonly role: "point";
        readonly valueKind: "value";
    }];
    readonly aesthetics: readonly [{
        readonly kind: "visual";
        readonly name: "color";
    }, {
        readonly kind: "visual";
        readonly name: "strokeWidth";
    }, {
        readonly kind: "visual";
        readonly name: "lineType";
    }, {
        readonly kind: "visual";
        readonly name: "alpha";
    }];
    readonly summaries: GeomSummaries;
    readonly dataLabels: Partial<Record<CoordType, Partial<ResolvedDataLabelsSpec>>>;
    readonly dataLabelCoordTypes: readonly ["cartesian", "flip"];
    readonly isComposite = true;
    readonly legend: LegendPolicy;
    readonly highlightStrategy: "overlay-anchor";
    readonly spatialKind: SpatialKind;
    readonly resolveAnchorPosition: (observation: Observation, { coordSystem }: AnchorContext) => AnchorPosition | null;
    readonly getDataLabelPlacements: (context: PluginPlacementContext) => PlacementResult;
    compile(input: GeomCompilerInput): GeomCompileResult;
}

/**
 * Line-specific parameters.
 */
interface LineGeomParams {
    /**
     * Curve used to connect the line's points:
     * `'linear'` ⇒ `curveLinear`, `'smooth'` ⇒ `curveCatmullRom`.
     * @default 'linear'
     */
    curve: Curve;
    /**
     * How to handle missing (NULL/undefined) values:
     * - `'zero'`: nulls arrive already substituted with zero by the compiler —
     *   render normally, no special handling.
     * - `'gap'`: break the path wherever x or y is null (d3 `defined()`).
     * - `'connect'`: drop null rows before pathing so the line spans the gap.
     * @default 'gap'
     */
    missingValues: MissingValues;
}

/**
 * Stroke style for line rendering.
 *
 * - `'solid'` — Continuous unbroken stroke
 * - `'dashed'` — Repeating dash pattern
 * - `'dotted'` — Repeating dot pattern
 */
type LineType = 'solid' | 'dashed' | 'dotted';

/** Logical composition of any predicate. */
type LogicalPredicate = {
    and: Predicate[];
} | {
    or: Predicate[];
} | {
    not: Predicate;
};

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
 * How far a match reaches from the observations a predicate hits.
 *
 * - `data-point`: those observations alone; siblings in the same series stay out.
 * - `series`: every observation in the same series (group) as a match.
 * - `x-value`: every observation sharing a match's x value, a slice across series.
 */
type MatchScope = 'data-point' | 'series' | 'x-value';

/**
 * Resolved mean stat spec.
 */
interface MeanStatSpec {
    type: 'mean';
}

/** Pixel dimensions of a measured string, including the baseline split into ascent and descent. */
interface MeasuredText {
    width: number;
    height: number;
    ascent: number;
    descent: number;
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
type MissingValues = 'zero' | 'gap' | 'connect';

/** One of the base hues a monochrome palette can be built from. */
type MonoPaletteBase = (typeof MONO_BASES)[number];

type MonoPaletteSpec = {
    type: 'mono';
    base: MonoPaletteBase;
    variant?: MonoPaletteVariant;
};

/** Tints the single-hue ramp for use on light vs dark backgrounds. */
type MonoPaletteVariant = 'light' | 'dark';

/** One of the base hues a neon palette can be built from. */
type NeonPaletteBase = (typeof NEON_BASES)[number];

type NeonPaletteSpec = {
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
     * Abbreviation style for large numbers in tooltips, data labels, legends and headlines. Axis
     * ticks always abbreviate by their own magnitude.
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
}

interface NumericValueFormat {
    type: 'decimal' | 'integer' | 'percentage' | 'duration';
}

/** Points at a single observation by its anchor value and whatever narrows it on its layer. */
interface ObservationAnchorSpec {
    /** Stable id of a layer; picks one out when several share the same address. */
    layerId?: string;
    /** Value on the main axis (x in cartesian, y in flipped). */
    anchorValue: DataValue;
    /** The group value to match if any, otherwise match any group. */
    groupValue?: DataValue;
    /**
     * Value on the cross axis, named by every layer whose geom places its observations in two dimensions —
     * a heatmap's cells, a scatter's points — where a main-axis value names a whole column or cloud. Ignored
     * on a layer whose geom does not, whatever its data holds.
     */
    crossValue?: DataValue;
    /** Which point of the matched geom's box to resolve to. Omitted means the geom-natural point. */
    align?: AnchorAlign;
}

type ObservationOf<Target> = Target extends {
    observation: infer Observation;
} ? Observation : Record<never, never>;

/** What the observations paint: the declared vocabulary over the shared paint, unless they decline it. */
type ObservationVocabularyOf<Target> = ObservationOf<Target> extends infer Observation ? Observation extends {
    sharedPaint: false;
} ? VocabularyOf<Observation> : Flatten_2<Omit<typeof SHARED_GEOM_VOCABULARY, keyof VocabularyOf<Observation>> & VocabularyOf<Observation>> : never;

type OpenIdSelect<Options> = NonNullable<Options> extends readonly EntryOption[] ? ('layer' extends NonNullable<Options>[number] ? {
    layer?: string;
} : unknown) & ('annotation' extends NonNullable<Options>[number] ? {
    annotation?: string;
} : unknown) : unknown;

type OptionsOf<Part> = Part extends {
    options: infer Options extends readonly EntryOption[];
} ? Options : typeof GEOM_ENTRY_OPTIONS;

/**
 * Configure a different overflow strategy per direction.
 */
interface OverflowStrategyConfig {
    x: PanelOverflowStrategy;
    y: PanelOverflowStrategy;
}

/** Every {@link PolarTheta}, for validation and diagnostics. */
const POLAR_THETAS: readonly ["x", "y"];

/** Every {@link PositionAdjustment}, for validation and diagnostics. */
const POSITION_ADJUSTMENTS: readonly ["stack", "dodge", "identity", "fill"];

interface PaletteScaleOptions {
    /** Named or custom palette to draw group colors from. */
    palette?: PaletteSpec;
    /** Per-group color overrides on top of the chosen palette. */
    overrides?: PaletteOverridesSpec;
}

/** User-facing palette color scale; defaults to the active theme palette when `palette` is omitted. */
interface PaletteScaleSpec {
    type: 'scale';
    /** Which aesthetic this scale drives — only color aesthetics accept palettes. */
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'palette';
    /** Named or custom palette to draw group colors from. */
    palette?: PaletteSpec;
    /** Per-group color overrides on top of the chosen palette. */
    overrides?: PaletteOverridesSpec;
}

/** Palette selector accepted from users; a custom palette is referenced by `id` only. */
type PaletteSpec = DefaultPaletteSpec | GraphyPaletteSpec | PastelPaletteSpec | NeonPaletteSpec | MonoPaletteSpec | CustomPaletteSpec;

/**
 * Panel configuration. The border's paint is styled through the stylesheet's `panelBorder` target.
 */
interface PanelConfig {
    /** Per-source, per-axis strategy to use for content that overflows the panel edge. */
    overflow: {
        dataLabels: OverflowStrategyConfig;
        differenceArrows: OverflowStrategyConfig;
    };
}

/**
 * How the panel adapts to content that would otherwise overflow its edge.
 * - `outside`: the overflowing element lands outside the panel frame and the frame shrinks to
 *    accommodate it.
 * - `inside`: the overflowing element stays inside the panel frame and the content inside the
 *   frame shrinks to accommodate it.
 * - `none`: no accommodation, content may overflow and overlap with other elements
 */
type PanelOverflowStrategy = 'outside' | 'inside' | 'none';

type PartsOf<Target> = Target extends {
    parts: infer Parts;
} ? Parts : Record<never, never>;

type PastelPaletteSpec = {
    type: 'pastel';
    variant?: PastelPaletteVariant;
};

/** `waterfall` swaps in the positive/negative/total colors used by waterfall graphs. */
type PastelPaletteVariant = 'default' | 'waterfall';

/**
 * Names where the percentage-share denominator comes from for a layer. Strategies declare this
 * once per (geom, position); the placement context owns the dispatch from kind → denominator.
 *
 * - `stack` — per-x stack total looked up on `summary.stackTotals` (sign-aware).
 * - `fill` — segment's own normalised height (`|yMax − yMin|`); fill positions are pre-normalised
 *   to 1 within each stack, so the segment height is its share by construction.
 * - `absoluteGrandTotal` — `summary.absoluteGrandTotal` (Σ|y| across observations).
 * - `none` — no share semantics; `format: 'percentage'` falls back to absolute regardless.
 */
type PercentageValueStrategy = 'stack' | 'fill' | 'absoluteGrandTotal' | 'none';

/**
 * Pinned-number annotation: a marker dot pinned to a single observation. The
 * renderer's mini view shows the observation's measurement value; hover reveals
 * the full tooltip (x + y + trend).
 */
interface PinnedNumberAnnotationSpec {
    id?: string;
    at: ObservationAnchorSpec;
}

/**
 * One placed label, ready for a renderer to paint. Coordinates are in panel-pixel space
 * with origin at the panel's top-left — renderers translate into their own frame.
 *
 * Labels are placed independently, with no cross-label overlap resolution — paint each as given.
 * (Contrast `computeDirectLabelsLayout`, which de-collides line-end labels against each other.)
 */
interface PlacedDataLabel {
    /** Id of the layer this label belongs to, so the renderer can group/style by source layer. */
    layerId: string;
    x: number;
    y: number;
    text: string;
    /** Box width/height in pixels, as returned by `measureDataLabel` (text + renderer padding). (x, y) is the box centre. */
    width: number;
    height: number;
    /** When true, paint the label rotated -90° around `(x, y)`. */
    isRotated: boolean;
    /** Which on-canvas element this label decorates (per-observation vs stack total). */
    role: DataLabelRole;
    /** Where the label sits relative to its geom or stack. */
    position: ResolvedDataLabelPosition;
    /**
     * The fill an `inside` label sits on, at the opacity it is painted with, so it may be translucent: the
     * renderer composites it over the frame before picking the ink against it. Absent where the label sits on
     * no fill of its own.
     */
    backdropColor?: string;
}

/**
 * Pre-resolved per-layer state handed to a strategy: formatters and value readers already wired.
 * No `scene` reference — strategies receive the formatters they need, so any future placement
 * function depending on more of the scene must declare that dependency explicitly.
 */
interface PlacementContextFor<L extends SceneLayer, C extends CoordType_2> {
    layer: L;
    coordSystem: CoordSystemFor<C>;
    panelRect: Rect;
    measureDataLabel: DataLabelTextMeasurer;
    /** The layer's style readers, for the size and fill a label is placed against. */
    styleReaders: StyleReadersForLayer<L>;
    /**
     * Formatted text for a per-observation label. Reads the variable named by
     * `layer.dataLabels.labelSource` (or the constant when the source is `{ value }`) and applies
     * the matching formatter.
     */
    formatLabel: (observation: Observation) => string;
    /**
     * Always-axis-style formatter. Stack totals call this with their pre-aggregated total — they
     * paint as absolute regardless of `layer.dataLabels.format` because a stack total is already
     * a sum, not a share.
     */
    formatAbsolute: (value: DataValue) => string;
    /**
     * Formatted category text (the mapped x value, falling back to the group key), using the
     * category variable's own value format so it matches axis and tooltip formatting; `null` when
     * the observation carries no category.
     */
    formatCategory: (observation: Observation) => string | null;
}

/**
 * Labels placed for one layer, plus how many requested labels the fit cascade discarded.
 */
interface PlacementResult {
    labels: PlacedDataLabel[];
    droppedCount: number;
}

/**
 * What `getDataLabelPlacements` receives: the base scene layer and style readers, since a geom outside
 * the built-in union reads its columns dynamically. Branch on `coordSystem.type` where placement differs.
 */
type PluginPlacementContext<C extends CoordType_2 = CoordType_2> = PlacementContextFor<SceneLayer, C>;

/**
 * One entry in the unified `plugins` array. Either a bare compile definition, a render half that carries
 * its definition at `.definition`, or a render-only override that carries none. The first two contribute
 * a compile definition (matched structurally over the field that already exists, never by naming
 * react-renderer's `GeomRendererDefinition` type); the last seeds only the render registry.
 */
type Plugin = Definition | {
    readonly definition: Definition;
} | RenderOnlyPlugin;

/**
 * A single position, expressed as a relationship to the graph that re-resolves each compile.
 *
 * - `panel`: a fraction of the plot rect (`[0,1]`), top-left origin. Does not snap to data.
 * - `observation`: pinned to one observation by its address — see {@link ObservationAnchorSpec}.
 * - `axis`: see {@link AxisAnchor}.
 * - `selection`: see {@link SelectionPointAnchor}.
 * - `annotation`: see {@link AnnotationPointAnchor}.
 */
type PointAnchorSpec = {
    anchorType: 'panel';
    x: number;
    y: number;
    offset?: AnchorOffset;
} | {
    anchorType: 'observation';
    /** Stable id of a layer; picks one out when several share the same address. */
    layerId?: string;
    anchorValue: DataValue;
    groupValue?: DataValue;
    crossValue?: DataValue;
    align?: AnchorAlign;
    offset?: AnchorOffset;
} | AxisAnchor | SelectionPointAnchor | AnnotationPointAnchor;

/**
 * Represents each observation as a point (e.g. for scatter plots).
 */
class PointGeom extends Geom<PointGeomParams> {
    readonly type: "point";
    readonly styleTarget: {
        readonly observation: {
            readonly vocabulary: {
                readonly size: "pixels";
                readonly symbol: "pointSymbol";
                readonly strokeWidth: "pixels";
            };
            readonly aesthetics: {
                readonly fill: "color";
                readonly alpha: "alpha";
                readonly size: "size";
                readonly strokeWidth: "strokeWidth";
            };
            readonly rest: {
                readonly fill: StyleTokenRef;
                readonly fillAlpha: 1;
                readonly size: 8;
                readonly symbol: "circle";
                readonly stroke: StyleTokenRef;
                readonly strokeWidth: 1;
            };
            readonly hovered: {
                readonly stroke: StyleTokenRef;
            };
        };
    };
    /** Point vertices are the radar/spider mark, so polar joins the cartesian pair. */
    readonly supportedCoordTypes: readonly ["cartesian", "polar", "flip"];
    readonly defaultParams: PointGeomParams;
    readonly positionRoles: readonly [{
        readonly axis: "x";
        readonly role: "point";
        readonly valueKind: "value";
    }, {
        readonly axis: "y";
        readonly role: "point";
        readonly valueKind: "value";
    }];
    readonly aesthetics: readonly [{
        readonly kind: "visual";
        readonly name: "color";
    }, {
        readonly kind: "visual";
        readonly name: "size";
    }, {
        readonly kind: "visual";
        readonly name: "alpha";
    }];
    readonly summaries: GeomSummaries;
    readonly highlightStrategy: "overlay-anchor";
    readonly dataLabelCoordTypes: readonly ["cartesian", "flip"];
    readonly resolveAnchorPosition: (observation: Observation, { coordSystem }: AnchorContext) => AnchorPosition | null;
    /**
     * A point's label prints the bound `size` it is drawn at, but its position still stands for y — so an
     * annotation measuring it keeps the segment-y default.
     */
    readonly resolveValueSource: (mapping: AesMapping, purpose: ValueSourcePurpose) => AestheticValue | null;
    readonly getDataLabelPlacements: (context: PluginPlacementContext) => PlacementResult;
    compile({ data }: GeomCompilerInput): GeomCompileResult;
}

/**
 * Point-specific parameters.
 */
interface PointGeomParams {
}

/**
 * Params for polar coordinate system
 */
interface PolarCoordParams extends BaseCoordParams {
    /**
     * Which aesthetic maps to theta (angle): 'x' or 'y'
     */
    theta: PolarTheta;
    /**
     * Starting angle in degrees
     */
    startAngle: number;
    /**
     * Inner radius as fraction 0-1 (for donut charts)
     */
    innerRadius: number;
}

interface PolarCoordSpec {
    type: 'coord';
    coordType: 'polar';
    params?: Partial<PolarCoordParams>;
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

/**
 * Which aesthetic sweeps the angle under polar coords.
 *
 * - `'y'` — the value becomes the angle, so a band's segments are wedges of a pie
 * - `'x'` — the category becomes the angle and the value stays on the radius: a rose chart
 */
type PolarTheta = (typeof POLAR_THETAS)[number];

/**
 * Position adjustment for overlapping geometries.
 *
 * - `'stack'` — Stack geometries on top of each other (e.g. stacked bar chart)
 * - `'dodge'` — Place geometries side by side (e.g. grouped bar chart)
 * - `'identity'` — No adjustment, use raw positions (e.g. scatter plot, allows overlapping)
 * - `'fill'` — Normalize stacks to fill 100% of the axis (e.g. 100% stacked bar chart)
 */
type PositionAdjustment = (typeof POSITION_ADJUSTMENTS)[number];

/**
 * One position column the geom's compile half injects and its render half reads (`yMin`/`yMax`/…).
 * Declaring it makes the cross-half column contract explicit, so a single-half override can be
 * checked rather than silently mispainting.
 *
 * `aes` names the aesthetic the mapper sources the role from — a plain `string`, so a geom may bind
 * a **custom positional aesthetic** (`'open'`, `'low'`) the engine then trains and scales like a
 * built-in channel. A `point` role sources its axis aesthetic implicitly — authors should not
 * declare `aes` on it (the axis is the aesthetic). If `aes` is present, {@link deriveDeclaredAesthetics}
 * still credits it; ignoring point-role `aes` would be a separate change. A `min`/`max` role without `aes`
 * is compile-written (e.g. a bar's `yMin = 0`); a `scalar` role scales its `aes` column in place into
 * the aesthetic-named column.
 */
interface PositionRole {
    readonly axis: AxisKey;
    readonly role: PositionRoleKind;
    /** Always `'value'`. May be omitted. */
    readonly valueKind?: 'value';
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

interface PositionalScaleMethods {
    /**
     * Continuous (numeric) scale. Supports `transform`, `reverse`, `nice`, `domainMin`, `domainMax`.
     * @example scale.x.continuous({ domainMin: 0, nice: true })
     */
    continuous: (options?: ContinuousScaleOptions) => ContinuousScaleSpec;
    /**
     * Discrete (categorical) scale. Supports explicit `range` values.
     * @example scale.x.discrete({ range: ['A', 'B', 'C'] })
     */
    discrete: (options?: DiscreteScaleOptions) => DiscreteScaleSpec;
    /**
     * Datetime (temporal) scale. Supports `domainMin` / `domainMax` in epoch ms.
     * @example scale.x.datetime({ domainMin: Date.parse('2020-01-01') })
     */
    datetime: (options?: DatetimeScaleOptions) => DatetimeScaleSpec;
    /**
     * Continuous scale with base-10 logarithmic transformation.
     * @example scale.y.log({ domainMin: 1 })
     */
    log: (options?: ContinuousScaleOptions) => ContinuousScaleSpec;
    /**
     * Continuous scale with square-root transformation.
     * @example scale.y.sqrt({ nice: true })
     */
    sqrt: (options?: ContinuousScaleOptions) => ContinuousScaleSpec;
}

/**
 * An observation match condition: a variable test or a logical combination of them.
 * Shared by every predicated spec feature (highlights, style rules).
 */
type Predicate = VariablePredicate | LogicalPredicate;

type PropertyDomainMap = {
    [Property in StyleProperty]: RegistryVocabularies extends infer Vocab ? Vocab extends Record<Property, infer Domain extends StyleDomain> ? Domain : never : never;
};

/** The domains a property takes across the registry: `cornerRadius` is `'barRadius' | 'pixels'`. */
type PropertyDomains<Property extends StyleProperty> = PropertyDomainMap[Property];

interface QuantitativeScaleMethods {
    /**
     * Continuous (numeric) scale. Supports `transform`, `reverse`, `nice`, `domainMin`, `domainMax`.
     * @example scale.size.continuous({ domainMin: 0 })
     */
    continuous: (options?: ContinuousScaleOptions) => ContinuousScaleSpec;
    /**
     * Discrete (categorical) scale. Supports explicit `range` values.
     * @example scale.size.discrete({ range: [4, 8, 12] })
     */
    discrete: (options?: DiscreteScaleOptions) => DiscreteScaleSpec;
    /**
     * Identity scale — data values used directly as visual values without transformation.
     * @example scale.size.identity() // { size: 10 } → 10px
     */
    identity: (options?: IdentityScaleOptions) => IdentityScaleSpec;
}

/**
 * Where a data label sits relative to the geom or stack it decorates, independent of its role.
 *
 * - `inside` — over the geom.
 * - `outside` — past the geom's edge; labels on zero-extent anchors (line points, markers) always
 *   read as outside.
 */
const RESOLVED_DATA_LABEL_POSITIONS: readonly ("inside" | "outside")[];

/**
 * A rectangle in pixel coordinates, origin at top-left. Every rect on a {@link GraphLayout} is measured
 * from the graph container top-left (with the graph's outer padding already included), never panel-local coordinates.
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
 * - `selection`: see {@link SelectionRegionAnchor}.
 * - `annotation`: see {@link AnnotationRegionAnchor}.
 */
type RegionAnchorSpec = {
    anchorType: 'panel';
    x: number;
    y: number;
    width: number;
    height: number;
} | SelectionRegionAnchor | AnnotationRegionAnchor;

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

interface ReshapeTransformSpec {
    type: 'transform';
    transformType: 'reshape';
    options: ReshapeOptions;
}

/**
 * Feature configuration with resolved defaults.
 * All fields are required and always populated after resolution.
 */
interface ResolvedConfigSpec {
    /**
     * Locale used to interpret source values and, by default, to format display
     * output (axis labels, tooltips, numbers). Pass `formattingLocale` to a
     * `format*` helper to override display only. It resolves to
     * `formattingLocale ?? parsingLocale`. The `duration` format is always
     * English regardless of locale.
     */
    parsingLocale: Locale;
    legend: ResolvedLegendSpec;
    axes: AxesConfig;
    panel: PanelConfig;
    headline: HeadlineConfig;
    tooltip: TooltipConfig;
    numberFormat: NumberFormatConfig;
    content: ResolvedContentSpec;
}

/**
 * Resolved content configuration (all fields populated).
 *
 * `null` on a text slot means "no content set". The matching `isXVisible` flag
 * is a separate visibility toggle that lets a value be preserved across show /
 * hide cycles without losing the text the user typed.
 */
interface ResolvedContentSpec {
    title: TextContent | null;
    isTitleVisible: boolean;
    subtitle: TextContent | null;
    isSubtitleVisible: boolean;
    caption: TextContent | null;
    isCaptionVisible: boolean;
    source: SourceContent | null;
    isSourceVisible: boolean;
    /**
     * Structured provenance-badge config. Canonical source of truth for enabled /
     * placement / variant after {@link resolveConfig}.
     */
    brandMark: BrandMarkConfig;
    /**
     * Legacy alias for {@link BrandMarkConfig.enabled}. Kept in sync by resolveConfig so
     * existing callers keep working. Prefer `brandMark.enabled`.
     */
    isBrandMarkVisible: boolean;
}

type ResolvedDataLabelPosition = (typeof RESOLVED_DATA_LABEL_POSITIONS)[number];

/**
 * Resolved data-labels config carried per-layer.
 */
interface ResolvedDataLabelsSpec {
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
    position: DataLabelPosition;
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
    align: DataLabelAlign;
    /**
     * Gap in pixels between the geom's edge and the label box. Stack totals ignore it.
     * @default 4 for bars, polar wedges, and points, 8 for line/area
     */
    offset: number;
    /**
     * Where the cartesian-bar category label sits relative to its bar. No `'auto'`: category labels
     * have no fit heuristics and render exactly as asked. Stacked/filled segments coerce
     * `'outside'` to `'inside'` — every segment edge borders a neighbour.
     * @default 'inside'
     */
    categoryPosition: Exclude<DataLabelPosition, 'auto'>;
    /**
     * Category label's anchor along the bar's value axis; accepts panel anchors like `justify`.
     * @default 'start'
     */
    categoryJustify: DataLabelJustify;
    /**
     * Category label's anchor across the bar's bandwidth.
     * @default 'center'
     */
    categoryAlign: DataLabelAlign;
    /**
     * Gap in pixels between the anchored edge and the category label box.
     * @default 4
     */
    categoryOffset: number;
}

/** A headline size with `'auto'` resolved away — what the renderer paints at. */
type ResolvedHeadlineSize = Exclude<HeadlineSize, 'auto'>;

/**
 * Legend configuration (after defaults applied)
 */
interface ResolvedLegendSpec {
    /**
     * Position of the legend
     * @default 'auto'
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
    /**
     * Placement of the legend items along its flow.
     * - For a horizontal (`top`/`bottom`) legend this runs along the row: `start` = left, `end` = right.
     * - For a vertical (`left`/`right`) legend it runs down the column: `start` = top, `end` = bottom.
     * Vertical legends always pin to the plot border across the flow regardless of this value.
     * `'auto'` resolves to `start` for horizontal legends and `center` for vertical ones.
     *
     * @default 'auto'
     */
    align: LegendAlign;
}

/**
 * Resolved smooth (regression) stat spec.
 */
interface ResolvedSmoothStatSpec {
    type: 'smooth';
    method: SmoothMethod;
    /** Polynomial order — only meaningful when `method: 'polynomial'`. */
    order: number;
    /** LOESS bandwidth — only meaningful when `method: 'loess'`. */
    bandwidth: number;
}

/**
 * Discriminated union of all resolved stat specs (post-resolution).
 */
type ResolvedStatSpec = IdentityStatSpec | CountStatSpec | ResolvedSmoothStatSpec | MeanStatSpec | SumStatSpec | ResolvedSummaryStatSpec;

/**
 * Resolved summary stat spec. `interval` stays absent when the author asked for none: the stat never picks one.
 */
interface ResolvedSummaryStatSpec {
    type: 'summary';
    estimate: SummaryEstimate;
    interval?: SummaryInterval;
    /** Confidence level — only meaningful when `interval: 'ci'`. */
    level: number;
    /** How many standard errors or deviations each end sits from the mean — only meaningful for `'stderr'` and `'stdev'`. */
    mult: number;
}

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
     * id), and `fontSize` — pixels, scaled with the rest of the graph's text like
     * every other `fontSize`. Unrecognized keys are ignored.
     */
    attrs?: Record<string, unknown>;
}

/**
 * Reference line at a numeric value, supplied as a constant mapping or read from a stat-output
 * variable (e.g. `stat.mean()`). Emits a 1-observation dataset on a synthetic variable.
 *
 * The other axis is cleared so inherited mappings don't reach the position mapper. With no x
 * variable, a rule has nothing for an observation anchor to address, so it declares no
 * `resolveAnchorPosition`.
 */
class RuleGeom extends Geom<RuleGeomParams> {
    readonly type: "rule";
    /** The rule's own line paints no fill: it is chrome drawn from data, not a filled mark. */
    readonly styleTarget: {
        readonly observation: {
            readonly vocabulary: {
                readonly stroke: "color";
                readonly strokeAlpha: "unitInterval";
                readonly strokeWidth: "pixels";
                readonly dashArray: "dashArray";
                readonly lineCap: "lineCap";
                readonly lineJoin: "lineJoin";
                readonly shadow: "shadow";
                readonly blendMode: "blendMode";
            };
            readonly sharedPaint: false;
            readonly dashPresets: {
                readonly solid: readonly [];
                readonly dashed: readonly [2, 3];
                readonly dotted: readonly [0, 2];
            };
            readonly aesthetics: {
                readonly stroke: "color";
                readonly strokeWidth: "strokeWidth";
                readonly dashArray: "lineType";
            };
            readonly rest: {
                readonly stroke: StyleTokenRef;
                readonly strokeWidth: 1;
                readonly dashArray: readonly [2, 3];
            };
        };
        readonly parts: {
            readonly label: {
                readonly vocabulary: {
                    readonly fontFamily: "fontFamily";
                    readonly fontSize: "pixels";
                    readonly fontWeight: "fontWeight";
                    readonly fontStyle: "fontStyle";
                    readonly letterSpacing: "signedPixels";
                    readonly textTransform: "textTransform";
                    readonly textDecoration: "textDecoration";
                    readonly textOutlineColor: "color";
                    readonly textOutlineWidth: "pixels";
                    readonly textShadow: "shadow";
                    readonly lineHeight: "multiplier";
                    readonly textColor: "color";
                };
                readonly options: readonly ["layer"];
                readonly rest: {
                    readonly fontSize: 11.5;
                    readonly fontWeight: 500;
                    readonly lineHeight: 1;
                };
            };
        };
    };
    readonly defaultParams: RuleGeomParams;
    readonly defaultInteractive = false;
    readonly positionRoles: readonly [{
        readonly axis: "y";
        readonly role: "scalar";
        readonly valueKind: "value";
        readonly aes: "y";
    }, {
        readonly axis: "x";
        readonly role: "scalar";
        readonly valueKind: "value";
        readonly aes: "x";
    }];
    readonly highlightStrategy: null;
    readonly spatialKind: SpatialKind;
    /**
     * A rule reads a scalar from exactly one axis. Require a numeric value on `x` or `y` — but not
     * both — unless a stat produces it at compile time (e.g. `stat.mean()` populates `y`).
     */
    readonly validateMapping: ({ mapping, computedVariables, }: GeomMappingValidationInput) => readonly UserInputIssue[];
    compile({ data: inputData, mapping }: GeomCompilerInput): GeomCompileResult;
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
    /** Optional inline text label rendered alongside the line. */
    label?: string;
    labelPosition: RuleLabelPosition;
}

/**
 * Where the optional inline label is anchored along a reference line.
 */
type RuleLabelPosition = 'start' | 'end';

/** Friendly aliases for the ColorBrewer diverging codes: `'red-blue'` resolves to the same ramp as `'RdBu'`. */
const SCHEME_ALIASES: {
    readonly 'red-blue': "RdBu";
    readonly 'brown-teal': "BrBG";
    readonly 'purple-orange': "PuOr";
    readonly spectral: "Spectral";
};

/**
 * Sequential colormap names from `d3-scale-chromatic`. Matplotlib schemes are lowercase (`viridis`),
 * ColorBrewer schemes keep Brewer's capitalisation (`Blues`) — lookup is case-insensitive, so casing only
 * drives autocomplete. `viridis`/`cividis` are perceptually uniform and colour-vision-deficiency safe.
 */
const SEQUENTIAL_SCHEME_NAMES: readonly ["viridis", "magma", "inferno", "plasma", "cividis", "turbo", "Blues", "Greens", "Greys", "Oranges", "Purples", "Reds"];

/** The paint every geom speaks, a plugin geom's observations included. */
const SHARED_GEOM_VOCABULARY: {
    readonly fill: "paint";
    readonly overlay: "overlay";
    readonly stroke: "color";
    readonly alpha: "unitInterval";
    readonly fillAlpha: "unitInterval";
    readonly strokeAlpha: "unitInterval";
    readonly saturation: "multiplier";
    readonly blur: "pixels";
    readonly brightness: "multiplier";
    readonly contrast: "multiplier";
    readonly shadow: "shadow";
    readonly blendMode: "blendMode";
};

/** Every {@link StyleBlendMode}. */
const STYLE_BLEND_MODES: readonly ["normal", "multiply", "screen", "overlay", "darken", "lighten"];

const STYLE_COORDS: readonly ["cartesian", "polar"];

/** Every {@link StyleFontStyle}, {@link StyleTextTransform} and {@link StyleTextDecoration}. */
const STYLE_FONT_STYLES: readonly ["normal", "italic", "oblique"];

const STYLE_IMAGE_FITS: readonly ["tile", "stretch"];

/** Every {@link StyleLineCap} and {@link StyleLineJoin}. */
const STYLE_LINE_CAPS: readonly ["butt", "round", "square"];

const STYLE_LINE_JOINS: readonly ["miter", "round", "bevel"];

const STYLE_PATTERN_PRESETS: readonly ["diagonal", "dots", "crosshatch", "lines"];

/** Every {@link StylePointSymbol}. */
const STYLE_POINT_SYMBOLS: readonly ["circle", "square", "diamond", "triangle", "cross", "star", "wye"];

/**
 * Every style property any target understands. Hand-written: it is what the vocabularies in the
 * target registry are checked against, so a typo there is a type error rather than a property no
 * entry can declare.
 */
const STYLE_PROPERTY_NAMES: readonly ["fill", "overlay", "stroke", "alpha", "saturation", "blur", "brightness", "contrast", "cornerRadius", "strokeWidth", "dashArray", "lineCap", "lineJoin", "strokeAlpha", "fillAlpha", "size", "symbol", "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "textTransform", "textDecoration", "textOutlineColor", "textOutlineWidth", "textShadow", "lineHeight", "textScale", "textColor", "offset", "gap", "length", "paddingInline", "paddingBlock", "padding", "margin", "shadow", "blendMode"];

/**
 * The runtime states a style entry can scope to. States are paint-only — they never feed layout.
 *
 * - `dimmed` — de-emphasized: a highlight matched elsewhere or the pointer hovers another element.
 * - `hovered` — the pointer is on the element.
 */
const STYLE_STATES: readonly ["dimmed", "hovered"];

const STYLE_TEXT_DECORATIONS: readonly ["none", "underline", "line-through"];

const STYLE_TEXT_TRANSFORMS: readonly ["none", "uppercase", "lowercase", "capitalize"];

/** Options for {@link sampleColorScheme} — the colour-ramp knobs a scheme picker or legend preview exposes. */
interface SampleColorSchemeOptions {
    /** Named colormap, sequential or diverging (e.g. `'viridis'`, `'RdBu'`), matched case-insensitively. Superseded by `range`. */
    scheme?: ColorSchemeName;
    /** Explicit ramp of two-or-more colour stops, blended in `interpolate`. Supersedes `scheme`. */
    range?: readonly string[];
    /** Interpolation space for `range` stops; `'lab'` by default. Ignored for a named `scheme` (which carries its own). */
    interpolate?: ColorInterpolationSpace;
    /** Flip the ramp so `t = 0` reads the far end. */
    reverse?: boolean;
}

/** The domains whose value is one scalar, the same shape at every tier. */
interface ScalarStyleDomainValues {
    unitInterval: number;
    pixels: number;
    barRadius: BarCornerRadius;
    dashArray: DashArray;
    fontFamily: string;
    fontWeight: number;
    multiplier: number;
    blendMode: StyleBlendMode;
    signedPixels: number;
    fontStyle: StyleFontStyle;
    textTransform: StyleTextTransform;
    textDecoration: StyleTextDecoration;
    lineCap: StyleLineCap;
    lineJoin: StyleLineJoin;
    pointSymbol: StylePointSymbol;
    boxRadius: StyleCornerRadius;
}

interface ScaleAPI {
    /**
     * X-axis scale. Callable for inferred (auto-detects type from data), or use explicit methods.
     * @example scale.x() // inferred
     * @example scale.x({ nice: true }) // inferred with options
     * @example scale.x.continuous({ domainMin: 0 })
     * @example scale.x.log()
     */
    x: ((options?: InferredScaleOptions) => InferredScaleSpec) & PositionalScaleMethods;
    /**
     * Y-axis scale. Callable for inferred (auto-detects type from data), or use explicit methods.
     * @example scale.y() // inferred
     * @example scale.y.continuous({ domainMin: 0, nice: true })
     * @example scale.y.log({ reverse: true })
     */
    y: ((options?: InferredScaleOptions) => InferredScaleSpec) & PositionalScaleMethods;
    /**
     * Secondary Y-axis scale. Independent position scale rendered on the opposite axis.
     * Callable for inferred (auto-detects type from data), or use explicit methods.
     * @example scale.ySecondary() // inferred
     * @example scale.ySecondary.continuous({ nice: true })
     */
    ySecondary: ((options?: InferredScaleOptions) => InferredScaleSpec) & PositionalScaleMethods;
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
    lineType: CategoricalScaleMethods<LineType>;
}

/** Scale-domain constraints a geom imposes on the scales it draws against. */
interface ScaleConstraints {
    /** Force this geom's band (x) scale to be discrete (e.g. a bar's categorical axis). */
    discreteMainAxis?: boolean;
    /** Force this geom's cross (y) scale to be discrete (e.g. a tile's categorical rows). */
    discreteCrossAxis?: boolean;
    /**
     * Default band padding for this geom's discrete position scales; `0` makes neighbouring cells abut.
     * Explicit user padding always wins.
     */
    bandPadding?: number;
    /** Anchor this geom's y scale at a zero baseline — its marks rise from 0. */
    zeroBaseline?: boolean;
    /**
     * Infer this geom's colour scale from the column behind it — a ramp for a measure — instead of the
     * default palette. What a geom drawing its value as colour (a tile) asks for.
     */
    inferredColor?: boolean;
}

/**
 * Union type for all possible scale specifications (including inferred, pre-resolution).
 */
type ScaleSpec = ContinuousScaleSpec | DiscreteScaleSpec | PaletteScaleSpec | DatetimeScaleSpec | IdentityScaleSpec | InferredScaleSpec;

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

/** A human-readable alias for a cryptic ColorBrewer diverging code (e.g. `'red-blue'` → `'RdBu'`). */
type SchemeAlias = keyof typeof SCHEME_ALIASES;

/**
 * Overrides for the optional second y axis. Sparse where `x` and `y` are fully resolved: a field
 * left unset is inherited at compile time — `position` from the side opposite `y`, `isVisible`,
 * `grid` and `ticks` from `y` itself, and `label` from no label at all. An absent override
 * therefore means "mirror the primary axis", which stops being expressible once a field is pinned.
 */
type SecondaryAxisOverride = DeepPartial<YAxisConfig>;

/**
 * A point at the box of every observation matching `predicate` (a {@link Predicate} — the same
 * matcher language highlights use), reduced to the box-point named by `align`. Dropped when nothing
 * matches. Nothing to resolve, so the input and resolved unions share this type.
 */
interface SelectionPointAnchor {
    anchorType: 'selection';
    predicate: Predicate;
    align: AnchorAlign;
    offset?: AnchorOffset;
}

/**
 * The tight bounding box of every observation matching `predicate` (a {@link Predicate} — the same
 * matcher language highlights use), grown by `padding`. Dropped when nothing matches. Nothing to
 * resolve, so the input and resolved unions share this type.
 */
interface SelectionRegionAnchor {
    anchorType: 'selection';
    predicate: Predicate;
    /**
     * Padding around the box: a number pads both axes in fractions of the frame the box resolved in
     * (the panel, or the square the disk is inscribed in under polar), an {@link AnchorOffset} pads each
     * axis in its `unit` (`px` padding is applied by the runtime resolution pass).
     */
    padding?: number | AnchorOffset;
}

/** The geometry a shape annotation draws. */
type ShapeKind = 'rectangle';

/**
 * Rectangle annotation. Its area is positioned by a {@link RegionAnchorSpec} so it
 * re-resolves each compile (re-flows on resize, tracks data when bound). Its paint comes from the
 * stylesheet: `style.annotation.shape(...)` for every shape, `{ annotation: id }` for this one.
 */
interface ShapeSpec {
    id?: string;
    kind?: ShapeKind;
    /** Draw beneath the geoms (background) or on top (foreground). */
    zOrder?: AnnotationZOrder;
    /** The area this shape fills. */
    region: RegionAnchorSpec;
}

/**
 * User-facing input for the `smooth` stat (params optional).
 */
interface SmoothStatSpec {
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

interface SortTransformSpec {
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
 * - `'buckets'` — marks bucket along an axis for nearest-position snapping (line crosshair).
 * - `'filled-buckets'` — buckets whose paint covers the band between the cross-axis bounds (area), so
 *   a cursor inside the band is on the observation rather than snapped to its edge.
 * - `'spanned-buckets'` — buckets whose marks one stroke joins across the bucket itself, lowest to
 *   highest, with none running on to the next — a dumbbell's connector, a lollipop's stem — so that
 *   stroke's whole length is in its bucket's column. The stretch comes from the marks the bucket holds
 *   and from any interval each one declares, so a bucket of one still has length.
 * - `'rects'` — marks are rectangles: a bar, or a candle's body width over its wick.
 * - `'points'` — marks are discrete vertices (scatter).
 * - `'noop'` — nothing hit-testable.
 * - `'render-hit-test'` — geometry comes from a render-side layout algorithm rather than position
 *   scales, so only the renderer can hit-test it.
 *
 * Every shape but `'render-hit-test'` is derived from position scales at compile time, so the runtime
 * builds its index from the compiled data alone.
 */
type SpatialKind = 'buckets' | 'filled-buckets' | 'spanned-buckets' | 'rects' | 'cells' | 'points' | 'noop' | 'render-hit-test';

type SpecItem = LayerSpec | ScaleSpec | CoordSpec | ConfigItem | AnyTransformSpec | MappingItem | HighlightSpec | AnnotationItem | StylesheetSpec;

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
     * Names a geom's custom positional aesthetics too, when the stat computes them (a boxplot's `q1`).
     */
    abstract readonly computedVariables: ReadonlySet<string>;
    /**
     * The aesthetics this stat computes under one layer's resolved spec and params, which is what validation reads. A
     * stat whose settings decide what it computes (a summary asked for an interval or not) overrides this; the rest
     * compute {@link computedVariables} whatever the settings. A built-in stat's settings live on its spec; a custom
     * stat's spec is only `{ type }`, so it reads its settings from the layer's `params`, as `computeStat` does.
     */
    resolveComputedVariables(_spec: ResolvedStatSpec, _params?: Readonly<Record<string, unknown>>): ReadonlySet<string>;
    compute(input: StatCompilerInput): StatCompileResult;
    /**
     * Runs on every layer, including one with zero rows: an empty frame still needs the stat's mapping so
     * the aesthetics it computes stay mapped. An empty frame's column types are placeholders, not schema.
     */
    protected abstract computeStat(input: StatCompilerInput): StatCompileResult;
}

/** Output of {@link Stat.compile}: the transformed dataset plus any mapping overrides the stat introduced. */
interface StatCompileResult {
    /** The transformed dataset. */
    data: Dataset;
    /** Any mapping overrides produced by the stat (e.g., `y` → `'count'` for `CountStat`). */
    mapping: AesMapping;
}

/**
 * User-facing stat input — either a {@link StatName} string shorthand or an object spec.
 */
type StatSpec = IdentityStatSpec | CountStatSpec | SmoothStatSpec | MeanStatSpec | SumStatSpec | SummaryStatSpec;

type StateSlot<Part, State extends 'rest' | 'dimmed' | 'hovered'> = Part extends {
    [Key in State]: infer Declared;
} ? {
    [Key in State]: Declared;
} : unknown;

type StateSlots<Part> = StateSlot<Part, 'rest'> & StateSlot<Part, 'dimmed'> & StateSlot<Part, 'hovered'>;

/**
 * Sticker annotation: a built-in emoji-like image positioned by a {@link PointAnchorSpec}.
 */
interface StickerAnnotationSpec {
    id?: string;
    at: PointAnchorSpec;
    sticker: StickerId;
}

/** Identifier of a built-in sticker image, resolved by the renderer's sticker catalogue. */
type StickerId = string;

/** How a geom's paint composites with what lies under it; the set both SVG and Canvas draw. */
type StyleBlendMode = (typeof STYLE_BLEND_MODES)[number];

/** The built-in kinds reach `style.geom` the way a plugin kind does: as geoms the kit carries. */
type StyleBuilders<P extends readonly Plugin[]> = Omit<typeof baseStyle, 'geom'> & {
    geom: (typeof baseStyle)['geom'] & CustomGeomStyleBuilders<readonly [...typeof BUILT_IN_GEOMS, ...P]>;
};

/**
 * A color-valued declaration in any of its authored forms: a CSS color literal, an inline
 * light-dark pair or a reference into the stylesheet's token table.
 */
type StyleColorValue = string | LightDarkColor | StyleTokenRef;

/** The coordinate system a graph is drawn in, as a style entry names it. */
type StyleCoord = (typeof STYLE_COORDS)[number];

/** A box's rounding: one radius for every corner or one per corner. */
type StyleCornerRadius = number | StyleCornerRadiusSides;

/** A box's four corner radii in pixels. */
interface StyleCornerRadiusSides {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
}

/**
 * Every style property any target understands, in one shape regardless of target, at one tier. Which
 * subset a given entry may declare is the target's vocabulary; the compile stage drops declarations
 * outside the entry's vocabulary. A property's value is the union of the domains it takes anywhere in
 * the registry: `cornerRadius` is a token on bars and pixels elsewhere, so this shape
 * holds either, while a node's own reads are typed to that node's domain.
 *
 * - `color` — fill color.
 * - `alpha` — fill opacity, `0..1`.
 * - `saturation` — saturation multiplier, `0..1`; `0` is grey.
 * - `fill` — the fill of a box: the graph frame, a tooltip, a data label, a legend pill, a text
 *   annotation, a callout label; or the hover guide's band.
 * - `stroke` — the border color of a box, a shape annotation, a callout marker, a bar, a point or a
 *   tile. A bar draws a border only when this resolves; a point marker always has one (built-in white).
 * - `cornerRadius` — corner rounding: a token on bars, resolved to pixels by the bar recipes; pixels
 *   on boxes and chrome.
 * - `strokeWidth` — stroke width in pixels for line and area outlines, grid lines, panel-border
 *   edges and the borders of boxes, bars, points and tiles; `0` is an explicit no-border and hides a
 *   chrome stroke, reserving no space for it.
 * - `dashArray` — the dash rhythm of a stroke: dash and gap lengths in stroke widths, `[]` solid.
 * - `strokeAlpha` — area outline opacity, `0..1`, independent of the fill's `alpha`.
 * - `fillAlpha` — peak opacity of the gradient wash beneath a line, `0..1`. Undeclared draws no wash.
 * - `size` — point marker diameter in pixels.
 * - `fontFamily` — the CSS family list text is drawn in. On a text target, undeclared falls
 *   through the graph entry, then the renderer's own family, so a host font reaches text no
 *   entry names.
 * - `fontSize` — text size in pixels, before `textScale`.
 * - `fontWeight` — numeric text weight, `1..1000`.
 * - `lineHeight` — the band one line of text reserves, as a multiple of `fontSize`. Above `1` it is
 *   leading around the text, which stays the size `fontSize` names.
 * - `textScale` — multiplier applied to every text size at resolve time. Authored on `style.graph`.
 * - `textColor` — the color text is painted in, as opposed to `color`, which fills a shape.
 * - `offset` — pixels a tick label sits from the panel edge; the band it reserves grows with it.
 * - `gap` — pixels between items inside one chrome target.
 * - `length` — how far a tick line reaches out from the panel edge, in pixels.
 * - `paddingInline` — horizontal padding between a label's text and its box edge, each side, in pixels.
 * - `paddingBlock` — vertical padding between a label's text and its box edge, each side, in pixels.
 * - `padding` — outer padding of the graph frame, in pixels. A number applies to every side; an
 *   object sets sides individually. Does not scale with `textScale`.
 * - `margin` — pixels around a chrome target that occupies a layout slot. A number applies to every
 *   side; omitted object sides stay absent so a later entry can fill them. `0` closes a side.
 * - `shadow` — a drop shadow (`offsetX`, `offsetY`, `blur`, `color`) or `'none'` to hide it.
 */
type StyleDeclarationsFor<Tier extends Record<StyleDomain, unknown>> = {
    [Property in StyleProperty]?: Tier[PropertyDomains<Property>];
};

/**
 * The value domain a declaration takes. One property can differ by target: `cornerRadius` is a token
 * on a bar, whose rounding scales with its thickness, and a pixel count on chrome, which doesn't.
 */
type StyleDomain = keyof AuthoredStyleDomainValues;

/** The slant of a face. */
type StyleFontStyle = (typeof STYLE_FONT_STYLES)[number];

/** A gradient fill: linear along an angle in degrees (CSS convention, `180` top to bottom), or radial from the centre. */
type StyleGradient<Color> = {
    gradient: 'linear';
    angle?: number;
    stops: ReadonlyArray<StyleGradientStop<Color>>;
} | {
    gradient: 'radial';
    stops: ReadonlyArray<StyleGradientStop<Color>>;
};

/** One stop of a gradient: where along it, in `[0, 1]`, and the colour there. */
interface StyleGradientStop<Color> {
    offset: number;
    color: Color;
}

/**
 * A data URI image, tiled by default. Tiles preserve its proportions; `size` sets their width in pixels.
 * The fallback always paints behind the image; `alpha` affects only the image.
 * Use `fallback: 'transparent'` for overlays that should preserve the underlying colours.
 */
interface StyleImage<Color> {
    image: string;
    fit?: StyleImageFit;
    alpha?: number;
    size?: number;
    fallback: Color;
}

/** How an image fill sits in the shape it fills: `tile` repeats it, `stretch` fills the shape with one copy. */
type StyleImageFit = (typeof STYLE_IMAGE_FITS)[number];

/** How a stroke ends, and how its segments meet. */
type StyleLineCap = (typeof STYLE_LINE_CAPS)[number];

type StyleLineJoin = (typeof STYLE_LINE_JOINS)[number];

/** Four CSS edges in pixels. */
interface StylePadding {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

/** A number applies to every side; an object sets named sides. */
type StylePaddingValue = number | Partial<StylePadding>;

/** What fills an area: a colour, a gradient, a pattern or an image. */
type StylePaint<Color> = Color | StyleGradient<Color> | StylePattern<Color> | StyleImage<Color>;

/** A pattern fill: a preset drawn in `color` over an optional `background`, repeating every `size` pixels. */
interface StylePattern<Color> {
    pattern: StylePatternPreset;
    color: Color;
    background?: Color;
    size?: number;
}

/** The pattern tiles a renderer can draw. */
type StylePatternPreset = (typeof STYLE_PATTERN_PRESETS)[number];

/** The glyph a point draws, every one covering the area of the circle its `size` names. */
type StylePointSymbol = (typeof STYLE_POINT_SYMBOLS)[number];

/** A drop shadow. Offsets and blur are pixels; `color` takes the same forms as other color properties. */
interface StyleShadow<ColorValue> {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: ColorValue;
}

/** `'none'` hides the shadow; an object paints one. */
type StyleShadowValue<ColorValue> = StyleShadow<ColorValue> | 'none';

/**
 * One addressable style target, root or nested, as written. `vocabulary` is empty on a namespace
 * (`headlineItem`) that only groups children. {@link defineStyleTarget} returns the literal it is
 * given, so `select`, `vocabulary`, `options`, `rest` and the flags keep their exact types for the
 * builders, the compiler and the reader tree to derive from.
 */
interface StyleTargetNode {
    select: StyleTargetSelect;
    vocabulary: StyleVocabulary;
    options?: readonly EntryOption[];
    aesthetics?: {
        [property: string]: AestheticKey | undefined;
    };
    rest?: object;
    hovered?: object;
    dimmed?: object;
    children?: Record<string, StyleTargetNode>;
    /** The root accepts kinds that name no child; they read the root vocabulary. */
    acceptsUnknownKinds?: boolean;
    /** A bare entry on this node also addresses child `part`s. Heading and the edit outline carry this. */
    partWildcard?: boolean;
}

/** The address a target node (and the entries it emits) carries. */
interface StyleTargetSelect {
    target: string;
    kind?: string;
    edge?: string;
    axis?: string;
    role?: string;
    position?: string;
    part?: string;
}

/** The line drawn through or under the glyphs. */
type StyleTextDecoration = (typeof STYLE_TEXT_DECORATIONS)[number];

/** The case a text target applies to its string before drawing and measuring it. */
type StyleTextTransform = (typeof STYLE_TEXT_TRANSFORMS)[number];

/** A named color in the stylesheet's token table: one literal or a light-dark pair. */
type StyleTokenValue = string | LightDarkColor;

/** What one target may declare, each property with the domain its value must land in. */
type StyleVocabulary = Partial<Record<StyleProperty, StyleDomain>>;

/**
 * Resolved sum stat spec.
 */
interface SumStatSpec {
    type: 'sum';
}

/**
 * The value the `summary` stat reduces each group to.
 */
type SummaryEstimate = 'mean' | 'median';

/**
 * The interval the `summary` stat computes around its estimate:
 *
 * - `'stderr'` — the mean ± `mult` standard errors
 * - `'stdev'` — the mean ± `mult` standard deviations
 * - `'ci'` — a `level` confidence interval for the mean, from Student's t distribution
 * - `'iqr'` — the first to the third quartile, around the median
 * - `'range'` — the smallest value to the largest
 */
type SummaryInterval = 'stderr' | 'stdev' | 'ci' | 'iqr' | 'range';

/**
 * User-facing input for the `summary` stat (params optional).
 */
interface SummaryStatSpec {
    type: 'summary';
    /** The value each group reduces to. Defaults to `'mean'`. */
    estimate?: SummaryEstimate;
    /** The interval around the estimate. No default: without one the stat computes the estimate alone. */
    interval?: SummaryInterval;
    /** Confidence level for `interval: 'ci'`, in `(0, 1)`. Defaults to `0.95`. */
    level?: number;
    /** Multiplier for `interval: 'stderr'` or `'stdev'`, greater than `0`. Defaults to `1`. */
    mult?: number;
}

interface TemporalValueFormat {
    type: 'datetime' | 'time' | 'date' | 'year' | 'quarter' | 'month_year' | 'month' | 'weekly_date_range_with_year' | 'weekly_date_range' | 'day_month';
    /**
     * Source-parsing metadata: the template the values were originally parsed from (e.g. 'dd-mm-yyyy').
     * It is not a formatting instruction and is not consumed when materializing output — the renderer
     * picks the display shape from `type` alone, not from this field.
     */
    dateFormat?: string;
}

/**
 * Rich-text annotation positioned by a {@link PointAnchorSpec}; `width` is a fraction of the plot
 * rect and the height is intrinsic to the rendered content. Its box and base type come from the
 * stylesheet: `style.annotation.text(...)` for every text annotation, `{ annotation: id }` for this
 * one; the content's own marks paint over the base type.
 */
interface TextAnnotationSpec {
    id?: string;
    /** Rich-text body to render. */
    content: RichTextContent;
    /** The point the text is positioned at; `align` decides which point of the text's box sits here. */
    at: PointAnchorSpec;
    /** 0..1 of plot width. */
    width: number;
    /** Which point of the text's own box sits at `at`. Defaults to `center`. */
    align?: AnchorAlign;
}

/** A text value — plain string or structured rich text. */
type TextContent = string | RichTextContent;

/**
 * The resolved type of one text-drawing style target. Measurers and the paint site read the same record,
 * so reserved space and painted text agree. `fontSize` is already scaled by `textScale`;
 * `fontFamily` is the target's own declaration, else the graph entry's, else undefined so the
 * renderer supplies its base family.
 */
interface TextStyle {
    fontFamily?: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    textColor: string;
    fontStyle?: StyleFontStyle;
    letterSpacing?: number;
    textTransform?: StyleTextTransform;
    textDecoration?: StyleTextDecoration;
    textOutlineColor?: string;
    textOutlineWidth?: number;
    textShadow?: StyleShadowValue<string>;
}

/**
 * Represents each observation as a rectangular cell filling its `(x, y)` band on both axes — the heatmap
 * mark (ggplot2's `geom_tile`). The value rides on `color`, not on a length.
 */
class TileGeom extends Geom<Record<string, never>> {
    readonly type: "tile";
    readonly styleTarget: {
        readonly observation: {
            readonly vocabulary: {
                readonly cornerRadius: "pixels";
                readonly strokeWidth: "pixels";
            };
            readonly aesthetics: {
                readonly fill: "color";
                readonly alpha: "alpha";
                readonly strokeWidth: "strokeWidth";
            };
            readonly rest: {
                readonly fill: StyleTokenRef;
                readonly fillAlpha: 1;
                readonly cornerRadius: 8;
                readonly strokeWidth: 0;
            };
            readonly hovered: {
                readonly stroke: StyleTokenRef;
                readonly strokeWidth: 2;
            };
        };
    };
    readonly defaultParams: Record<string, never>;
    readonly positionRoles: readonly [{
        readonly axis: "x";
        readonly role: "point";
        readonly valueKind: "value";
    }, {
        readonly axis: "x";
        readonly role: "min";
        readonly valueKind: "value";
    }, {
        readonly axis: "x";
        readonly role: "max";
        readonly valueKind: "value";
    }, {
        readonly axis: "y";
        readonly role: "point";
        readonly valueKind: "value";
    }, {
        readonly axis: "y";
        readonly role: "min";
        readonly valueKind: "value";
    }, {
        readonly axis: "y";
        readonly role: "max";
        readonly valueKind: "value";
    }];
    readonly supportedPositions: readonly ["identity"];
    readonly supportedCoordTypes: readonly ["cartesian"];
    readonly aesthetics: readonly [{
        readonly kind: "visual";
        readonly name: "color";
        readonly required: true;
    }];
    /** No padding: cells abut, and the renderer's inset separates them visually. */
    readonly scaleConstraints: ScaleConstraints;
    readonly grid: Partial<Record<CoordType, GridPolicy>>;
    /** The gradient colour bar is the only place the value scale shows — never suppress it. */
    readonly legend: LegendPolicy;
    /** A heatmap reads cell-by-cell, so the value labels every cell by default. */
    readonly dataLabels: Partial<Record<CoordType, Partial<ResolvedDataLabelsSpec>>>;
    readonly dataLabelCoordTypes: readonly ["cartesian"];
    readonly highlightStrategy: "observation-rerender";
    readonly spatialKind: SpatialKind;
    readonly identityKey: "x-y";
    /**
     * The cell's encoded value, not its `x`/`y` bands — the header and the hovered cell already give those.
     * Omitting `key` labels the row with the value variable's friendly name.
     */
    readonly tooltip: TooltipContract;
    readonly resolveValueSource: (mapping: AesMapping) => AestheticValue | null;
    /** The cell centre, so annotations land mid-tile. */
    readonly resolveAnchorPosition: (observation: Observation) => AnchorPosition | null;
    readonly getDataLabelPlacements: (context: PluginPlacementContext) => PlacementResult;
    /**
     * Writes symmetric band offsets on both axes, which the extent mappers turn into scaled bounds
     * relative to each band centre.
     */
    compile({ data }: GeomCompilerInput): GeomCompileResult;
}

/**
 * Intentionally empty: a tile's geometry comes from its position variables. Paint — fill, corner
 * rounding, and the hover outline — lives in the stylesheet (`style.geom.tile`).
 */
type TileGeomParams = Record<string, never>;

/**
 * Tooltip configuration (after defaults applied)
 */
interface TooltipConfig {
    /**
     * Which hovered observations the tooltip lists.
     * @default 'band'
     */
    mode: TooltipMode;
}

/** Fully-derived tooltip content. The popover renders directly from this. */
interface TooltipContent {
    /**
     * Formatted main-axis value of the primary's observation. `null` for polar, and whenever
     * {@link TooltipContent.comment} is set — the two share one slot.
     */
    heading: string | null;
    /** In legend order; the hovered observation's rows have `isPrimary` set. */
    rows: TooltipRow[];
    /** Rich text of the comment whose mini bubble the pointer is over; `null` otherwise. */
    comment: RichTextContent | null;
}

/**
 * Which hovered observations the tooltip lists.
 * - 'band': everything at the hovered position: the hovered observation, its group (stacked segments, dodged
 *   siblings) and the related observations on other layers (default)
 * - 'observation': the hovered observation and, from each other layer, the related observation in its group
 * - 'none': no tooltip; hover, highlight and cursor still respond
 */
type TooltipMode = 'band' | 'observation' | 'none';

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
    swatchLineType: LineType;
    /** The paint the row's swatch fills with, the owning geom's `fill`. Omit so the swatch fills with `swatchColor`. */
    swatchFill?: ResolvedPaint;
    /** Owning layer `alpha` for the row's swatch. Omit so DefaultSwatch keeps today's opacities. */
    swatchAlpha?: number;
    /** Bar corner radius in px for the row's swatch. Omit so DefaultSwatch keeps `rx={2}`. */
    swatchCornerRadius?: number;
    /** The point symbol the row's swatch draws. Omit for a circle. */
    swatchSymbol?: StylePointSymbol;
    /** Row label — color value (multi-series) or layer's Y-axis title (single-series). */
    label: string;
    /** Formatted Y reading for this hit. */
    value: string;
    /** Styling hint: a row read from the primary's observation. Never re-orders. */
    isPrimary: boolean;
    /** Stable key — `${layerId}:${pointIndex}`. */
    key: string;
}

/**
 * Discriminated union of the built-in transform inputs, keyed on `transformType`. Use
 * {@link AnyTransformSpec} where a plugin-contributed transform may also appear.
 */
type TransformSpec = ReshapeTransformSpec | FilterTransformSpec | SortTransformSpec | AggregateTransformSpec | ConstantTransformSpec;

/**
 * Stable code for a failure the caller can fix by editing their {@link ResolvedSpec} or {@link Data}.
 */
type UserInputErrorCode = 'UNKNOWN_VARIABLE' | 'INCOMPATIBLE_TYPE' | 'INCOMPATIBLE_SCALE_DOMAIN' | 'MISSING_AESTHETIC' | 'UNDECLARED_AESTHETIC' | 'DUPLICATE_TOOLTIP_HEADING' | 'INVALID_RULE_MAPPING' | 'UNSUPPORTED_MAPPING' | 'INVALID_GEOM_PARAM' | 'UNSUPPORTED_COORD' | 'UNSUPPORTED_POSITION' | 'UNSUPPORTED_SCALE_TYPE' | 'MISSING_STAT_VARIABLE' | 'CONFLICTING_STAT_MAPPING' | 'MISSING_STAT_OUTPUT' | 'INVALID_STAT_PARAM' | 'CONFLICTING_SCALE_DEMANDS' | 'UNKNOWN_REGISTERED_TYPE' | 'DUPLICATE_REGISTERED_TYPE' | 'MISSING_GEOM_RENDERER' | 'RENDER_HIT_TEST_IDENTITY' | 'SPATIAL_KIND_COORD_UNSUPPORTED' | 'MISSING_RENDER_HIT_TEST' | 'CONFLICTING_RENDER_HIT_TEST' | 'OVERLAY_REQUIRES_RENDER_HIT_TEST' | 'MISSING_ANCHOR_CAPABILITY' | 'MISSING_DATA_LABEL_PLACEMENT' | 'PALETTE_NOT_FOUND' | 'UNKNOWN_LAYER_ID' | 'INVALID_PREDICATE_OPERATOR' | 'INVALID_STYLE_RULE' | 'INVALID_SEQUENCE' | 'ANNOTATION_REF_NOT_FOUND' | 'ANNOTATION_ANCHOR_UNRESOLVED' | 'ANNOTATION_DUPLICATE_ID' | 'INVALID_HIGHLIGHT_OPERATOR' | 'INCOMPARABLE_ARROW_ENDPOINTS' | 'UNRESOLVABLE_COLOR' | 'CONFLICTING_COLOR_RAMP' | 'DIVERGING_SCHEME_WITHOUT_MIDPOINT' | 'UNSUPPORTED_GRAPH_TYPE' | 'INVALID_DATA_SHAPE' | 'EMPTY_DATASET' | 'DATA_LABEL_PLACEMENT_COERCED' | 'DATA_LABELS_UNSUPPORTED' | 'DATA_LABEL_SETTING_IGNORED' | 'DATA_LABELS_DROPPED' | 'UNKNOWN_TOOLTIP_FIELD';

/**
 * Constant mapping - a literal value applied to every observation.
 * Analogous to Vega-Lite's `{datum: X}` / ggplot2's `aes(color = "literal")`.
 */
interface ValueMapping {
    value: DataValue;
}

/**
 * What a value reading is for, which decides whether a geom's own value channel answers it.
 *
 * - `'label'` — a data label prints the value, with no geometry to agree with: a point's label can
 *   print the `size` it is drawn at.
 * - `'measurement'` — an annotation reports the value, so it must name the quantity the anchor
 *   position expresses. A geom whose value rides on a position axis defers here, whatever it labels.
 */
type ValueSourcePurpose = 'label' | 'measurement';

/**
 * Variable mapping - references a column in the data
 */
interface VariableMapping {
    variable: string;
}

/**
 * Predicates over the layer's post-transform variables.
 *
 * `lt`, `lte`, `gt`, `gte`, and `range` accept `DataValue`s and are coerced at
 * evaluation time by the referenced variable's `DataType`. Ordering operators
 * on a categorical variable are a resolve-time validation error.
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

/** What an entry on a node may author: its vocabulary's properties in their authored shapes. */
type VocabularyDeclarations<Vocab extends StyleVocabulary> = DeclarationsIn<Vocab, AuthoredStyleDomainValues>;

type VocabularyOf<Part> = Part extends {
    vocabulary: infer Vocab extends StyleVocabulary;
} ? Vocab : Record<never, never>;

/**
 * The conditions under which a style entry applies — facts that need data or runtime context, as
 * opposed to the structural address in {@link StyleSelect}.
 *
 * - `where` — match observations over the layer's post-transform variables. Absent, every observation
 *   matches.
 * - `state` — apply only while the renderer reads with this {@link StyleState} active. Absent, the
 *   entry is stateless.
 */
interface WhenClause {
    where?: Predicate;
    state?: StyleState;
}

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

/** Minimal x/y shape — most runtime records satisfy this (HoverCursor, HoverHit, etc.). */
interface XYPoint {
    x: number;
    y: number;
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

function aggregate(options: AggregateOptions): AggregateTransformSpec;

function area(options?: GeomOptions<'area'>): LayerSpecFor<'area'>;

function bar(options?: GeomOptions<'bar'>): LayerSpecFor<'bar'>;

/**
 * The chrome builders and the geom root, with no kind under it. A kit adds its kinds, the built-ins
 * included, so `style.geom.bar` comes from `createSpecBuilder` rather than from this module.
 */
const baseStyle: BaseStyleBuilderTree;

function constant(options: ConstantOptions): ConstantTransformSpec;

function count(): CountStatSpec;

function filter(options: FilterOptions): FilterTransformSpec;

function identity(): IdentityStatSpec;

function line(options?: GeomOptions<'line'>): LayerSpecFor<'line'>;

function mean(): MeanStatSpec;

function point(options?: GeomOptions<'point'>): LayerSpecFor<'point'>;

/***************************************************************
 * Builders
 ***************************************************************/
function reshape(options?: ReshapeOptions): ReshapeTransformSpec;

function rule(options?: GeomOptions<'rule'>): LayerSpecFor<'rule'>;

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
}): SmoothStatSpec;

function sort(options: SortOptions): SortTransformSpec;

function sum(): SumStatSpec;

/**
 * Builder for the summary stat: one observation per x value and group, holding an estimate of `y` and, when asked
 * for, an interval around it.
 *
 * @example
 *   geom.bar({ stat: stat.summary() })
 *   geom.point({ stat: stat.summary({ estimate: 'median', interval: 'iqr' }) })
 */
function summary(options?: {
    estimate?: SummaryEstimate;
    interval?: SummaryInterval;
    level?: number;
    mult?: number;
}): SummaryStatSpec;

function tile(options?: GeomOptions<'tile'>): LayerSpecFor<'tile'>;
```

## Supporting types — @graphysdk/react-renderer

Types referenced by the sections above, included so no name dangles.

```ts
/**
 * A {@link GeomRendererDefinition} holding exactly `Definition`. Intersecting with the base instead would
 * merge each declared field with its base type, so a typed `styleTarget` would lose its part names.
 */
type BoundGeomRendererDefinition<Definition extends Geom<unknown>> = Omit<GeomRendererDefinition, 'definition'> & {
    readonly definition: Definition;
};

/**
 * How the badge paints at the current frame size:
 * - `full` — glyph + "Made with Graphy" pill
 * - `mini` — circular glyph capsule (also the under-200 px ladder step)
 * - `hidden` — flag off, or frame below the minimum footprint
 */
type BrandMarkVisual = 'full' | 'mini' | 'hidden';

type CoordKind = CoordSystem['type'];

/** Maps a coord-kind discriminator to the corresponding `CoordSystem` member. */
type CoordSystemFor<C extends CoordKind> = C extends 'cartesian' ? CartesianCoordSystem : C extends 'polar' ? PolarCoordSystem : never;

/** Options for {@link createGraphyKit}. */
interface CreateGraphyKitOptions<P extends readonly Plugin_2[] = readonly Plugin_2[]> extends CreateSpecBuilderOptions<P> {
    /**
     * The theme applied to every graph of the kit. It only repaints, so it changes nothing about what
     * the kit's builders offer.
     *
     * @example
     *   const kit = createGraphyKit({ theme: watercolor, plugins: [dumbbell] });
     */
    theme?: Theme;
}

/** Round marks of one size, which the outline grows from their rim. */
interface EditOutlineDots {
    kind: 'dots';
    /** Each dot's centre, in panel pixels. */
    centers: readonly XYPoint[];
    /** The diameter every dot covers, its border included, in pixels. */
    size: number;
}

/** A filled region, which the outline grows from its edge. */
interface EditOutlineRegion extends MorphingEditOutlineShape {
    kind: 'region';
    /** `'evenodd'` punches a subpath inside another out of it, as a ring's hole. */
    fillRule?: 'nonzero' | 'evenodd';
}

/** One shape point and edit outlines. It carries no paint: the editor draws the outline round it in its own look. */
type EditOutlineShape = EditOutlineRegion | EditOutlineStroke | EditOutlineDots;

/**
 * The input a geom's {@link GeomRenderContract.getEditOutlineShapes} receives: the observations to outline as a
 * layer, and what their shapes are placed and sized by.
 */
interface EditOutlineShapesInput<G extends GeomName | string = string, C extends CoordKind = CoordKind> {
    /** The outlined observations. */
    layer: SceneLayerOf<G>;
    /** The full layer `layer` was taken from — for context the subset can't see, like a stack's silhouette. */
    sourceLayer: SceneLayerOf<G>;
    coordSystem: CoordSystemFor<C>;
    /** The panel's pixel rect. Shapes are placed in its local `0…width` / `0…height`. */
    panelRect: GraphLayout['panel'];
    /** Cascade readers for this layer, for the sizes a shape matches: a line's width, a point's size. */
    styleReaders: StyleReadersOf<G>;
    /** Whether the chart animates transitions, for a shape to copy where the geom's paint springs. */
    shouldAnimateTransitions: boolean;
}

/** A stroke, which the outline grows from either side of its thickness. */
interface EditOutlineStroke extends MorphingEditOutlineShape {
    kind: 'stroke';
    /** The thickness the stroke is drawn at, in pixels. */
    width: number;
}

/**
 * Chart display and interaction mode.
 * - 'readonly': Normal chart display with full interactivity but no editing (default)
 * - 'editable': Chart with inline editing capabilities for labels, titles, etc.
 * - 'point-and-edit': A press on the chart selects what it hit: an observation, its band, or the chart
 */
const GRAPH_MODES: {
    readonly readonly: "readonly";
    readonly editable: "editable";
    readonly pointAndEdit: "point-and-edit";
};

interface GeomCircleProps {
    cx: ShapePosition;
    cy: ShapePosition;
    /** Radius in pixels. */
    r: number;
    fill?: string;
    opacity?: number;
    fillOpacity?: number;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    /** Whether a change of centre or radius springs to the new one. Snaps when false. */
    shouldAnimateTransitions: boolean;
    /** A geom's own test hook, since the primitive owns the painted element. */
    'data-testid'?: string;
}

interface GeomLineProps {
    x1: ShapePosition;
    y1: ShapePosition;
    x2: ShapePosition;
    y2: ShapePosition;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeDasharray?: string;
    strokeLinecap?: 'butt' | 'round' | 'square';
    /** Whether a change of either endpoint springs to the new one. Snaps when false. */
    shouldAnimateTransitions: boolean;
    'data-testid'?: string;
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

interface GeomPathProps {
    /** The path in the panel's local pixels, `0…width` by `0…height`: a path has no percentage units. */
    d: string;
    /**
     * The layer the path is drawn from. A new path from the same layer (at another panel size) lands at once, as the
     * marks placed in panel percentages do; only a new layer, from a recompile, morphs.
     */
    source: SceneLayer;
    fill?: string;
    opacity?: number;
    fillOpacity?: number;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    strokeDasharray?: string;
    /** Whether a change of shape morphs to the new one. Snaps when false. */
    shouldAnimateTransitions: boolean;
    'data-testid'?: string;
}

interface GeomRectProps {
    x: ShapePosition;
    y: ShapePosition;
    width: ShapePosition;
    height: ShapePosition;
    fill?: string;
    opacity?: number;
    fillOpacity?: number;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    /** Whether a change of origin or size springs to the new one. Snaps when false. */
    shouldAnimateTransitions: boolean;
    'data-testid'?: string;
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
 * as `GeomRenderContract<'bar', 'cartesian'>` receives param-narrowed inputs (`SceneLayerFor<'bar'>`,
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
    renderHoverCompanions: (input: HoverCompanionsRenderInput<G, C>) => ReactNode;
    /**
     * Editing only: the shapes point and edit outlines for the observations in `layer`, as data in panel pixels.
     * A region is what they cover, one path where there are many, with rounded corners traced into it; a line is
     * a stroke at the width it is drawn; round marks are dots at their size. Omit it and the editor outlines each
     * observation's bounding box.
     */
    getEditOutlineShapes?: (input: EditOutlineShapesInput<G, C>) => readonly EditOutlineShape[];
    /**
     * Render-side spatial query for a `'render-hit-test'` layer whose geometry is precomputed into the
     * scene (sankey ribbons, treemap tiles, voronoi cells). A
     * **factory**: given the render input it returns the per-cursor {@link RenderHitTester};
     * the renderer memoizes the factory on `layer.data` and the panel pixel frame, so the read runs once
     * per data or panel-size change and the per-move query allocates nothing. The author writes no hook;
     * the renderer registers the tester on its behalf. The cursor arrives in panel-local `[0,1]` with a
     * top-left origin — the frame the geom paints in. Returns the declared identity key of the observation
     * under the cursor, or `null` for a miss.
     */
    hitTest?: (input: GeomRenderInput<G, C>) => RenderHitTester;
    /** Panel-space anchor for a matched observation; required when the def highlights via overlay-anchor. */
    getOverlayAnchor?: (input: OverlayAnchorInput<G, C>) => OverlayAnchor | null;
}

/** A geom's panel-SVG paint function — the plain `render` form. */
type GeomRenderFn<G extends GeomName | string = string, C extends CoordKind = CoordKind> = (input: GeomRenderInput<G, C>) => ReactNode;

interface GeomRenderInput<G extends GeomName | string = string, C extends CoordKind = CoordKind> extends GeomRenderInputBase {
    layer: SceneLayerOf<G>;
    coordSystem: CoordSystemFor<C>;
    shouldAnimateTransitions: boolean;
    formattingLocale: Locale;
    intro?: LayerIntroPlan | null;
    /**
     * The panel's pixel rect — the data rectangle geoms paint into, already inset from axes and chrome.
     * Same frame hover and highlight receive. Width and height are the paint size; x/y are already
     * applied by the geom-layers SVG, so marks are placed in local `0…width` / `0…height`.
     */
    panelRect: GraphLayout['panel'];
}

/**
 * The cascade paint context every geom render handler receives. Visual readers such as `getColor`
 * see the data tier only; plugin paint should read {@link GeomRenderInputBase.styleReaders} so tokens,
 * overrides, and the built-in default reach the mark.
 */
interface GeomRenderInputBase {
    /** The provider's colour scheme — pass to `createStyleResolver` when a plugin needs readers beyond this layer. */
    colorScheme: ColorScheme;
    /** Cascade readers for this layer: override → data → default, resolved for {@link GeomRenderInputBase.colorScheme}. */
    styleReaders: GeomStyleReaders;
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
 * A theme's own shapes, each in place of the default one. A shape it leaves out is drawn by the
 * default. Wrap `DefaultGeomCircle` and its siblings to keep their transitions.
 */
interface GeomShapes {
    Circle?: ComponentType<GeomCircleProps>;
    Line?: ComponentType<GeomLineProps>;
    Rect?: ComponentType<GeomRectProps>;
    Path?: ComponentType<GeomPathProps>;
}

/** The mode a chart runs in, which `GraphRenderer` takes as a prop and every row of `MODE_SURFACES` is keyed by. */
type GraphMode = (typeof GRAPH_MODES)[keyof typeof GRAPH_MODES];

/**
 * The input a geom's {@link GeomRenderContract.renderHighlight} receives: the matched-subset layer plus
 * the full source layer (context the subset can't see, like a stack's silhouette). A superset of
 * {@link GeomRenderInput}, so a geom that doesn't override `renderHighlight` still paints through the
 * plain `render`.
 */
interface HighlightRenderInput<G extends GeomName | string = string, C extends CoordKind = CoordKind> extends GeomRenderInput<G, C> {
    /** The full layer `layer` was filtered from — for context the subset can't see, like a stack's silhouette. */
    sourceLayer: SceneLayerOf<G>;
}

interface HoverCompanionsRenderInput<G extends GeomName | string = string, C extends CoordKind = CoordKind> extends GeomRenderInputBase {
    layer: SceneLayerOf<G>;
    coordSystem: CoordSystemFor<C>;
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

interface HoverRenderInput<G extends GeomName | string = string, C extends CoordKind = CoordKind> extends GeomRenderInputBase {
    layer: SceneLayerOf<G>;
    coordSystem: CoordSystemFor<C>;
    primary: HoverHit;
    group: HoverHit[];
    related: HoverHit[];
    panelRect: GraphLayout['panel'];
}

interface IntroAnimationOptions {
    /** Whether the entrance plays at all */
    enabled: boolean;
    /** When the entrance starts: as the graph mounts, or once its panel, where the geoms paint, is in view. */
    trigger: IntroTrigger;
    /** Multiplier applied to every entrance duration and stagger delay. */
    durationScale: number;
    /** Whether geoms that support staggered entrance (bars) enter staggered rather than all at once. */
    stagger: boolean;
    /** The order staggered point geoms enter in. Bars and slices always enter in visual order. */
    staggerOrder: IntroStaggerOrder;
}

/** Without an IntersectionObserver, as in a test environment, `inView` plays on mount. */
type IntroTrigger = 'mount' | 'inView';

interface MorphingEditOutlineShape {
    /** SVG path data in panel pixels. */
    pathData: string;
    /** Identifies the shape across renders, such as a line's group, so a morph starts from where it was. */
    key?: string;
    /** Whether a change of shape morphs to the new one, as the geom's paint does. Snaps when omitted. */
    shouldAnimateTransitions?: boolean;
}

/**
 * Anchor point in normalized [0,1] coord-space where a highlight overlay marker
 * should be painted for one observation. Renderer turns [0,1] into pixels.
 */
interface OverlayAnchor {
    x: number;
    y: number;
}

interface OverlayAnchorInput<G extends GeomName | string = string, C extends CoordKind = CoordKind> {
    layer: SceneLayerOf<G>;
    coordSystem: CoordSystemFor<C>;
    observation: Observation;
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
 * A position in the space the geom paints in: a panel percentage (`'42.5%'`) or a user coordinate
 * inside a unit-space nested SVG. Both sides of a transition must be in the same units to spring.
 */
type ShapePosition = string | number;

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

/** The source line's type: the label and the URL. A bare source entry never paints the link. */
interface SourceStyle {
    label: TextStyle;
    link: TextStyle;
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
```
