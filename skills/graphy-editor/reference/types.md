<!-- GENERATED FILE — do not edit. -->

# Type reference

Generated from `@graphysdk/viz-engine@1.8.0` and `@graphysdk/react-renderer@1.8.0` (root and `/editable` entries).

> The exact public editing API, extracted verbatim (with JSDoc) from the built
> `.d.ts` files: the command system and annotation model from
> `@graphysdk/viz-engine`, the handle & hooks from `@graphysdk/react-renderer`,
> and the panel, sections and controls from `@graphysdk/react-renderer/editable`.
> Check precise signatures, option keys, and accepted values here; the other
> reference files cover how the pieces compose. Every type these declarations
> reference is defined in this file, most under "Supporting types" at the
> end. The only opaque names are compiled/internal shapes and the authoring-side spec graph (documented in the graphy-charts skill's types.md): AesMapping, AnnotationSpecByKind, Data, Dataset, Geom, GraphSlots, I18nLocale, I18nRuntimeOverrides, Observation, Predicate, RenderOnlyPlugin, Spec, StyleRule, StyleSelect, VizDiagnostic, WhenClause.
>
> Not extractable from the published d.ts (upstream bundling gap): `EditorPanel`,
> `PanelRootProps`, `PANEL_ROOT_ATTRIBUTE` — their shapes are documented in
> `panel.md`.

## Handle & hooks — @graphysdk/react-renderer

```ts
/**
 * Imperative handle on a graph, for an app's key handling, toolbar or menu bar mounted above the
 * tree the hooks can reach. Obtained through {@link GraphProviderProps.handleRef}.
 */
interface GraphHandle {
    /** Write access to the graph's spec, the same surface {@link useGraphCommands} serves inside the tree. */
    commands: GraphCommands;
    /**
     * Registers a listener fired on every change to the graph; returns the unsubscribe. With
     * {@link GraphHandle.getScene} it is what `useSyncExternalStore` needs, so a surface outside the
     * graph's tree stays in step with it. Subscribing before the graph compiles is valid.
     */
    subscribe: (onGraphChange: () => void) => () => void;
    /** The graph's scene as of now, or `null` before its first successful compile. */
    getScene: () => Scene | null;
    /**
     * Reverse the most recent command. Returns whether the chart took the step, so a caller driving
     * this from a keystroke can leave the key to the app when the chart has nothing to undo or the
     * older spec no longer compiles.
     */
    undo: () => boolean;
    /** Re-apply the most recently undone command. Returns whether the chart took the step. */
    redo: () => boolean;
    /** What the chart holds selected as of now; empty when nothing is. */
    getSelection: () => readonly EditTarget[];
    /** Replace what the chart holds selected. */
    setSelection: (next: readonly EditTarget[]) => void;
    /** Registers a listener fired on every change to the selection; returns the unsubscribe. */
    subscribeSelection: (onSelectionChange: () => void) => () => void;
    /** Whether this geom places data labels under these coords, per the plugins the graph was built with. */
    canPlaceDataLabels: (geom: string, coordType: CoordSystem['type']) => boolean;
    /** Whether this layer's data labels can read as percentages, per the plugins the graph was built with. */
    canFormatDataLabelsAsPercentages: (layer: SceneLayer, coordType: CoordSystem['type']) => boolean;
}

/** Write access to the graph's spec: applying {@link Command}s and closing the runs they form. */
interface GraphCommands {
    /** Applies a command to the provider's live spec. */
    dispatch: (command: Command, options?: DispatchOptions) => void;
    /**
     * Closes a run of `{ transient: true }` dispatches and fires `onSpecChange` once for it. Call it when
     * the gesture ends — pointer up, blur. Forgetting only delays the notification rather than
     * corrupting undo: the run covers one {@link EditTarget}, and the next committed dispatch, undo,
     * redo or external change closes it.
     */
    commit: () => void;
}

/** Undo/redo controls plus the command stack's own snapshot, which a history UI reads. */
type GraphHistory = CommandStackSnapshot & {
    /** Reverses the most recent command; returns whether the chart took the step, as {@link GraphHandle.undo}. */
    undo: () => boolean;
    /** Re-applies the most recently undone command; returns whether the chart took the step, as {@link GraphHandle.undo}. */
    redo: () => boolean;
};

/** The mode a chart runs in, which `GraphRenderer` takes as a prop and every row of `MODE_SURFACES` is keyed by. */
type GraphMode = (typeof GRAPH_MODES)[keyof typeof GRAPH_MODES];

/**
 * Returns the graph's command controls.
 *
 * @example
 * ```tsx
 * const { dispatch, commit } = useGraphCommands();
 *
 * const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
 *    const rule = style.graph({ cornerRadius: event.target.valueAsNumber });
 *    dispatch(new SetStyleRuleCommand({ list: 'defaults', rule, id: 'frame-radius' }), { transient: true });
 * };
 *
 * const handlePointerUp = () => commit();
 *
 * <input type="range" onChange={handleChange} onPointerUp={handlePointerUp}
 * />
 * ```
 */
const useGraphCommands: () => GraphCommands;

/**
 * The graph a surface edits: the handle it was given, or one synthesized from the `<GraphProvider>`
 * it sits inside. An explicit handle wins, so a surface nested inside one chart can still edit
 * another. Returns `null` for a surface that is neither.
 *
 * A host writing its own editing UI needs this and nothing else from us, which is why it sits here
 * rather than beside the panel: reaching a chart is not itself an editing concern.
 */
const useGraphHandle: (handle?: GraphHandle) => GraphHandle | null;

/**
 * Subscribes to the graph's undo history. Every command that reaches the chart — a renderer's own
 * inline edit, a host panel's dispatch, an agent's streamed command — is undoable through it.
 *
 * @example
 * ```tsx
 * const { undo, canUndo, undoDescription } = useGraphHistory();
 * <button disabled={!canUndo} title={undoDescription ?? undefined} onClick={undo}>Undo</button>
 * ```
 */
const useGraphHistory: () => GraphHistory;

/**
 * Binds ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z and Ctrl+Y to a graph's undo history for as long as the calling
 * component is mounted, driving the {@link GraphHandle} a `<GraphProvider handleRef>` fills.
 *
 * Going through the ref rather than the context means it can be called from wherever the app's key
 * handling lives — typically above the provider, out of reach of the hooks.
 *
 * @example
 * ```tsx
 * const EditableChart = () => {
 *   const handleRef = useRef<GraphHandle>(null);
 *   useGraphHistoryShortcuts(handleRef);
 *
 *   return (
 *     <GraphProvider spec={input} data={data} handleRef={handleRef}>
 *       <GraphRenderer mode="editable" />
 *     </GraphProvider>
 *   );
 * };
 * ```
 *
 * A chord the app or an inline editor already handled is left alone, as is one typed into a text
 * control and one the chart declines — nothing to step, or an older spec the loaded data can no
 * longer render. An app-level undo sharing the page keeps those.
 */
const useGraphHistoryShortcuts: (handleRef: RefObject<GraphHandle | null>, options?: GraphHistoryShortcutsOptions) => void;

interface GraphHistoryShortcutsOptions {
    /**
     * What to listen on. Defaults to `window`; an element — or a ref holding one — scopes the chords
     * to a subtree, and `null` binds nothing.
     */
    target?: EventTarget | RefObject<EventTarget | null> | null;
    /** Set to `false` to unbind without moving the call out of the component. Defaults to `true`. */
    enabled?: boolean;
}

/**
 * Subscribes to what the graph holds selected, from inside a `<GraphProvider>`. The store is
 * per-chart and shared with {@link GraphHandle}, so a surface outside the tree and one inside it
 * always agree on what is selected. A surface outside the tree writes through the handle's
 * `setSelection`; the canvas overlay writes to the same store off the context.
 *
 * @example
 * ```tsx
 * const selection = useGraphSelection();
 * const selected = selection.length === 1 ? selection[0] : null;
 * ```
 */
const useGraphSelection: () => readonly EditTarget[];

/**
 * Subscribes to a derived slice of the scene. The subscription only fires when the
 * selector's result changes by reference, so combined with the compiler's per-stage memoization
 * this skips re-renders whenever the selected slice is unchanged.
 *
 * @example
 * ```ts
 * const layers = useSceneSelector((scene) => scene.layers);
 * const xAxis = useSceneSelector((scene) => scene.guides.axes[0]);
 * ```
 */
const useSceneSelector: <Selected>(selector: (scene: Scene) => Selected) => Selected;

/**
 * The graph's scene, re-read whenever the graph changes, or `null` before its first
 * successful compile.
 *
 * Returns the whole scene: `useSyncExternalStore` compares snapshots by reference, so a selector
 * building a fresh object per call would re-render forever. Derive slices at the call site.
 */
const useHandleScene: (handle: GraphHandle) => Scene | null;

/**
 * Drops the selected targets `spec` no longer holds, and hands back the same list when it holds all
 * of them — a selection that survived a command must not churn its subscribers.
 *
 * Validated against the spec rather than compiled output: the compiler silently drops annotations it
 * cannot place, and a target whose annotation failed to resolve has to stay selected for the user to
 * be able to repair it.
 */
const pruneSelection: (selection: readonly EditTarget[], spec: ResolvedSpec) => readonly EditTarget[];

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
```

## Command contract

```ts
/**
 * A serializable, undoable edit to a `ResolvedSpec`. Commands are stateless: `apply` returns a new spec plus
 * a revert command instead of mutating anything, so they can be stacked, persisted and replayed.
 */
interface Command<TParams extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Command type discriminator for type guards
     */
    readonly type: string;
    /**
     * Metadata for tracking
     */
    readonly metadata: CommandMetadata;
    /**
     * Serializable parameters for this command.
     */
    readonly params: TParams;
    /**
     * What this command is about, derived from {@link params} rather than hand-filled — a command
     * deserialized from the wire must report the same target as the one that produced it.
     */
    readonly target: EditTarget;
    /**
     * Execute the command against a spec.
     * Returns the new spec and a revert command that can undo this change, or `null` when the
     * command is a no-op (e.g. the target is missing or the value is unchanged).
     *
     * Dispatch loop a renderer runs to reflect a command in the view: apply it to the live
     * `Scene.spec`, and on a non-`null` result recompile the returned spec —
     * `const result = command.apply(scene.spec); if (!result) return; recompile({ spec: result.spec })`.
     */
    apply: (spec: ResolvedSpec) => CommandApplyResult | null;
}

/**
 * Metadata attached to every command for tracking.
 */
interface CommandMetadata {
    /** Unique identifier for this command */
    readonly id: CommandId;
    /** When the command was executed */
    readonly timestamp: number;
    /** Human-readable description for UI display */
    readonly description: string;
    /** Author of the command */
    readonly author: string;
}

/**
 * Result of executing a command.
 * Contains the new spec and a revert command that can undo the change.
 */
interface CommandApplyResult {
    /** The spec after applying the command */
    readonly spec: ResolvedSpec;
    /** A standalone command that reverses this execution */
    readonly revert: Command;
}

interface DispatchOptions {
    /**
     * Fold this dispatch into the top entry so a per-frame gesture leaves one undoable entry keyed to
     * its *oldest* revert. Folding continues only while the same command targets the same
     * {@link EditTarget}.
     *
     * @default `false`.
     */
    transient?: boolean;
}

/**
 * Serialized representation of a command for wire transport and persistence.
 * Only forward commands are serialized — inverses are recomputed at execution time.
 * Round-trip a command with {@link commandRegistry}'s `serialize`/`deserialize`.
 */
interface SerializedCommand {
    /** Command type discriminator used to pick the right descriptor when deserializing. */
    readonly type: string;
    readonly params: Record<string, unknown>;
    readonly metadata: CommandMetadata;
}

/**
 * Central registry mapping command types to their serialization descriptors.
 */
class CommandRegistry {
    private readonly descriptors;
    /**
     * Register a command descriptor. Throws if the type is already registered.
     */
    register<TParams extends Record<string, unknown>>(descriptor: CommandDescriptor<TParams>): void;
    /**
     * Serialize a command to its wire format.
     */
    serialize(command: Command): SerializedCommand;
    /**
     * Deserialize a command from its wire format.
     */
    deserialize(data: SerializedCommand): Command;
    /**
     * Get all registered command type names.
     */
    getRegisteredTypes(): string[];
    private getDescriptor;
}

/** Default singleton registry instance. */
const commandRegistry: CommandRegistry;

/**
 * Immutable snapshot of command stack state.
 * Designed for use with React's `useSyncExternalStore(manager.subscribe, manager.getSnapshot)`.
 */
interface CommandStackSnapshot {
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    /** Description of the command that an undo would reverse, for labeling UI; null when nothing to undo. */
    readonly undoDescription: string | null;
    /** Description of the command that a redo would re-apply; null when nothing to redo. */
    readonly redoDescription: string | null;
    /** Stacked commands, oldest first; the last is what an undo reverses. */
    readonly undoStack: readonly CommandMetadata[];
    /** Undone commands in the order they were undone; the last is what a redo re-applies. */
    readonly redoStack: readonly CommandMetadata[];
}

/**
 * What a {@link Command} is about, as opposed to what it mutates — what a selection resolves to, and
 * what undo restores selection to.
 */
type EditTarget = {
    kind: 'annotation';
    id: string;
} | {
    kind: 'highlight';
    id: string;
} | {
    kind: 'styleRule';
    list: StylesheetList;
    select: StyleSelect;
    when?: WhenClause;
} | {
    kind: 'content';
    part: ContentPart;
} | {
    kind: 'axis';
    axis: ScaledPositionAestheticKey;
} | {
    kind: 'grid';
    axis: GridAxisTarget;
} | {
    kind: 'legend';
} | {
    kind: 'layer';
    layerId?: string;
} | ObservationsTarget | {
    kind: 'mapping';
    aesthetic: AestheticKey;
} | {
    kind: 'scale';
    aesthetic: ScaledAestheticKey;
} | {
    kind: 'coords';
}
/** The whole chart, selected by pressing its empty background. */
| {
    kind: 'graph';
} | {
    kind: 'appearance';
} | {
    kind: 'headline';
} | {
    kind: 'numberFormat';
};

/**
 * Value equality over an edit target, so a store holding a selection can skip an identical write and
 * a caller can ask whether what it is about to select is already selected. Two targets are equal when
 * their keys are, so this and {@link readEditTargetKey} cannot disagree.
 */
const areEditTargetsEqual: (left: EditTarget | null, right: EditTarget | null) => boolean;

/**
 * Returns a new object with `updates` applied via structural sharing: untouched subtrees keep their
 * original references, and a patch with no changes returns the same reference. Generic over the tree
 * shape, so it applies equally to a compiled `ResolvedSpec`, a `Spec`, or any nested plain-object config.
 */
function updateSpec<T extends object>(target: T, updates: DeepPartial<T>): T;
```

## Commands — chart & layers

```ts
/**
 * Sets what the chart *is* — a column chart, a stacked bar, a donut — as one undo entry, though the
 * spec keeps it as separate facts: the coordinate system, each layer's geom and position, the scale
 * shape those geoms demand, and the main axis ({@link resolveMainAxisMapping}).
 */
class SetChartTypeCommand implements Command<SetChartTypeParams> {
    readonly type: "set-chart-type";
    readonly metadata: CommandMetadata;
    readonly params: SetChartTypeParams;
    /** The coordinate system belongs to no single layer, so it is what a restored selection points at. */
    readonly target: EditTarget;
    constructor(params: SetChartTypeParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/** The chart's type as a picker reads it back, or `null` for a chart no type describes. */
const readChartType: (spec: ResolvedSpec) => ChartTypeSummary | null;

/**
 * Whether the chart has the second dimension a heatmap lays out as rows: a series to pivot onto them,
 * or spare measures to fold into them. A picker offers the type only where it holds — a chart drawing
 * one measure against one axis has a single row, which is a strip rather than a grid.
 */
const canBecomeHeatmap: (spec?: ResolvedSpec) => boolean;

/**
 * Whether a type is the two-layer kind, whose halves each get their own geom. Reads the summary rather
 * than trusting its shape, since one arriving off the wire is only as good as what it names: a combo is
 * cartesian, its halves separated onto y axes polar coords have no room for.
 */
const isComboChartType: (summary: ChartTypeSummary) => summary is ComboChartTypeSummary;

/**
 * Adds a layer to the spec — the on direction of "show a trend line", "show an average", "add a
 * series". Carries a whole {@link ResolvedLayerSpec} because that is what those toggles differ by.
 *
 * Reverts with a {@link RemoveLayerCommand} for the same id.
 */
class AddLayerCommand implements Command<AddLayerParams> {
    readonly type: "add-layer";
    readonly metadata: CommandMetadata;
    readonly params: AddLayerParams;
    constructor(options: AddLayerOptions, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/** Constructor input for {@link AddLayerCommand}, with `id` still optional. */
type AddLayerOptions = {
    layer: LayerDraft;
    /** Position in draw order, clamped to the list bounds; appends when omitted. */
    index?: number;
};

/**
 * A {@link ResolvedLayerSpec} whose `id` {@link AddLayerCommand} mints when omitted. Every other field is
 * required: the command adds the layer the caller built rather than resolving one.
 */
type LayerDraft = WithOptionalId<ResolvedLayerSpec>;

/**
 * Removes a layer from the spec by id — the off direction of every toggle {@link AddLayerCommand}
 * serves.
 *
 * Applying is a no-op when no layer carries that id, and when the layer is the only one left: a
 * chart with no layers has nothing to draw.
 *
 * Reverts with an {@link AddLayerCommand} that re-inserts the removed layer at the index it
 * occupied, so undo restores draw order rather than appending.
 */
class RemoveLayerCommand implements Command<RemoveLayerParams> {
    readonly type: "remove-layer";
    readonly metadata: CommandMetadata;
    readonly params: RemoveLayerParams;
    constructor(params: RemoveLayerParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that sets how a layer arranges overlapping observations — stacked, grouped side by side,
 * raw, or normalised to 100%. Targets a specific layer by ID, or falls back to the first bar or
 * area layer in the spec, and applies to that layer alone — a combo chart stacks its bars without
 * dragging its line along.
 * Produces a revert command that restores the previous position for undo support, and returns
 * `null` when the layer already carries the requested position.
 */
class SetLayerPositionCommand implements Command<SetLayerPositionParams> {
    readonly type: "set-layer-position";
    readonly metadata: CommandMetadata;
    readonly params: SetLayerPositionParams;
    constructor(params: SetLayerPositionParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Changes the statistical transform a layer applies — re-picking a trend line's regression method
 * rewrites its `smooth` stat. General rather than trend-specific because every layer has a stat.
 *
 * The stat is resolved in the constructor, so a partial `{ type: 'smooth', method: 'loess' }` gets
 * its defaults filled before `apply`; that resolution needs no spec.
 *
 * Applying is a no-op when the layer is missing or already carries an equivalent stat.
 */
class SetLayerStatCommand implements Command<SetLayerStatParams> {
    readonly type: "set-layer-stat";
    readonly metadata: CommandMetadata;
    readonly params: SetLayerStatParams;
    constructor(options: SetLayerStatOptions, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that binds a layer to the primary or secondary y axis — the dual-axis control on a combo
 * chart, where a revenue line reads against the left axis and a margin line against the right.
 * Targets a specific layer by ID, or falls back to the spec's first layer, and moves that layer
 * alone; siblings keep their own binding. The scale the second axis is drawn from moves with the
 * binding ({@link resolveSecondaryScale}).
 * Produces a revert command that restores the previous binding and the scales as they stood, and
 * returns `null` when the layer already reads against the requested axis.
 */
class SetLayerYScaleTypeCommand implements Command<SetLayerYScaleTypeParams> {
    readonly type: "set-layer-y-scale-type";
    readonly metadata: CommandMetadata;
    readonly params: SetLayerYScaleTypeParams;
    constructor(params: SetLayerYScaleTypeParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that sets how much of its category band a bar fills.
 *
 * Clamps rather than refusing, so a dragged control that overshoots still lands somewhere drawable;
 * `NaN` has no end to clamp towards, so it is rejected instead.
 */
class SetBarWidthCommand implements Command<SetBarWidthParams> {
    readonly type: "set-bar-width";
    readonly metadata: CommandMetadata;
    readonly params: SetBarWidthParams;
    constructor(params: SetBarWidthParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that rounds the bars themselves: `SetAppearanceCornerRadiusCommand` rounds the chart's
 * frame and `PanelConfig.cornerRadius` the plotting area.
 *
 * The rounding merges into the layer's own override entry, leaving whatever else that entry paints.
 */
class SetBarCornerRadiusCommand implements Command<SetBarCornerRadiusParams> {
    readonly type: "set-bar-corner-radius";
    readonly metadata: CommandMetadata;
    readonly params: SetBarCornerRadiusParams;
    constructor(params: SetBarCornerRadiusParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the stroke width of a line or area layer — an area's outline is the same path.
 *
 * The width merges into the layer's own override entry, leaving whatever else that entry paints.
 */
class SetLineWidthCommand implements Command<SetLineWidthParams> {
    readonly type: "set-line-width";
    readonly metadata: CommandMetadata;
    readonly params: SetLineWidthParams;
    constructor(params: SetLineWidthParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that changes a line or area layer's curve to linear or smooth.
 * Targets a specific layer by ID, or falls back to the first line/area layer in the spec.
 * Produces a revert command that restores the previous curve for undo support.
 */
class SetLineCurveCommand implements Command<SetLineCurveParams> {
    readonly type: "set-line-curve";
    readonly metadata: CommandMetadata;
    readonly params: SetLineCurveParams;
    constructor(params: SetLineCurveParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that sets how a line or area layer treats missing values: drop them to zero, break the
 * path and leave a visible gap, or skip them so the path spans across.
 * Targets a specific layer by ID, or falls back to the first line/area layer in the spec.
 * Produces a revert command that restores the previous handling for undo support, and returns
 * `null` when the layer already carries the requested one.
 */
class SetLineMissingValuesCommand implements Command<SetLineMissingValuesParams> {
    readonly type: "set-line-missing-values";
    readonly metadata: CommandMetadata;
    readonly params: SetLineMissingValuesParams;
    constructor(params: SetLineMissingValuesParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/** Sets a point layer's diameter. Merges into the layer's own override entry, leaving what else it paints. */
class SetPointSizeCommand implements Command<SetPointSizeParams> {
    readonly type: "set-point-size";
    readonly metadata: CommandMetadata;
    readonly params: SetPointSizeParams;
    constructor(params: SetPointSizeParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the inline text label on a reference line — the caption naming what a goal or average line
 * marks.
 *
 * Where the label sits along the line is a separate control, so it stays a separate command: one
 * undo entry per gesture means renaming a label must not also move it.
 */
class SetRuleLabelCommand implements Command<SetRuleLabelParams> {
    readonly type: "set-rule-label";
    readonly metadata: CommandMetadata;
    readonly params: SetRuleLabelParams;
    constructor(params: SetRuleLabelParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Moves a reference line — the numeric input behind a goal line's target value.
 *
 * The axis is read from the layer rather than passed in: a rule takes its scalar from exactly one
 * of `x` or `y`, and that choice is its orientation, so moving the line must not be able to
 * silently rotate it.
 *
 * Applying is a no-op when the rule reads its position from a variable — an average line tracking a
 * stat output has no value to type into, and a literal would sever it from the data it follows.
 */
class SetRuleValueCommand implements Command<SetRuleValueParams> {
    readonly type: "set-rule-value";
    readonly metadata: CommandMetadata;
    readonly params: SetRuleValueParams;
    constructor(params: SetRuleValueParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets which line a chart derives from its data.
 *
 * One command rather than a switch each, because a chart carries at most one: asking for a trend
 * while an average is drawn replaces it, and a single undo puts the average back exactly as it was.
 */
class SetStatLineCommand implements Command<SetStatLineParams> {
    readonly type: "set-stat-line";
    readonly metadata: CommandMetadata;
    readonly params: SetStatLineParams;
    constructor(params: SetStatLineParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
    /** The layer this command's parameters describe, or `null` where an average has no numeric variable to average. */
    private buildStatLine;
}

/**
 * Command that switches a layer's data labels between absolute values and percentages — the
 * difference between a stacked bar reading "1,240" and "35%".
 * Targets a specific layer by ID, or falls back to the spec's first layer. This only changes how
 * labels read; whether they show at all is a separate command.
 * Produces a revert command that restores the previous format for undo support, and returns `null`
 * when the layer already carries the requested one.
 */
class SetDataLabelsFormatCommand implements Command<SetDataLabelsFormatParams> {
    readonly type: "set-data-labels-format";
    readonly metadata: CommandMetadata;
    readonly params: SetDataLabelsFormatParams;
    constructor(params: SetDataLabelsFormatParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that shows or hides the data labels a layer paints on its observations. Targets a
 * specific layer by ID, or falls back to the spec's first layer. The rest of the layer's
 * data-labels config (format, placement, offsets) is left untouched.
 * Produces a revert command that restores the previous visibility for undo support, and returns
 * `null` when the layer already matches the requested visibility.
 */
class ToggleDataLabelsCommand implements Command<ToggleDataLabelsParams> {
    readonly type: "toggle-data-labels";
    readonly metadata: CommandMetadata;
    readonly params: ToggleDataLabelsParams;
    constructor(params: ToggleDataLabelsParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that shows or hides the category name alongside a bar layer's values — "Europe · 35%" on
 * a pie wedge, or a second label per bar on a cartesian one.
 * Targets a specific layer by ID, or falls back to the spec's first layer. Cartesian category
 * labels render independently of whether value labels are on; other geoms ignore the flag.
 * Produces a revert command that restores the previous visibility for undo support, and returns
 * `null` when the layer already matches the requested one.
 */
class ToggleCategoryLabelsCommand implements Command<ToggleCategoryLabelsParams> {
    readonly type: "toggle-category-labels";
    readonly metadata: CommandMetadata;
    readonly params: ToggleCategoryLabelsParams;
    constructor(params: ToggleCategoryLabelsParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Toggles the goal line — a rule at a number someone typed, naming what the chart is measured
 * against.
 *
 * The value and label are only read on the way on. Once the line exists they belong to
 * {@link SetRuleValueCommand} and {@link SetRuleLabelCommand}, so typing into either field is one
 * undo entry rather than a re-creation of the line.
 */
class ToggleGoalLineCommand implements Command<ToggleGoalLineParams> {
    readonly type: "toggle-goal-line";
    readonly metadata: CommandMetadata;
    readonly params: ToggleGoalLineParams;
    constructor(params: ToggleGoalLineParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
    private buildGoalLine;
}

/**
 * Draws or removes the fill beneath a line. Line layers only: an area fills by definition.
 *
 * Switching off clears `fillAlpha`, or writes zero to suppress an inherited fill.
 * Switching on uses the requested alpha, an inherited fill, or the default opacity.
 */
class ToggleLineFillCommand implements Command<ToggleLineFillParams> {
    readonly type: "toggle-line-fill";
    readonly metadata: CommandMetadata;
    readonly params: ToggleLineFillParams;
    constructor(params: ToggleLineFillParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Toggles a companion point layer for a line or an area — both are drawn as a path.
 *
 * A shown point layer inherits the path's mapping, position, y-scale binding and layer-local
 * transforms — everything that decides where a vertex lands, including which rows there are to land
 * on. Its `stat` is not: a smoothed line with raw dots is the scatter-and-trendline reading, and
 * copying the stat would draw the dots on the trend.
 */
class ToggleLinePointsCommand implements Command<ToggleLinePointsParams> {
    readonly type: "toggle-line-points";
    readonly metadata: CommandMetadata;
    readonly params: ToggleLinePointsParams;
    constructor(params: ToggleLinePointsParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
    private addPointLayer;
    private removePointLayer;
    private findAssociatedPointLayer;
}

/**
 * Command that shows or hides the total a stacked bar layer prints above each stack — the one
 * label a stack can't carry inside its segments.
 * Targets a specific layer by ID, or falls back to the spec's first layer. Totals only render on
 * stacked cartesian bars; setting the flag elsewhere is inert and the compiler warns about it.
 * Produces a revert command that restores the previous visibility for undo support, and returns
 * `null` when the layer already matches the requested one.
 */
class ToggleStackTotalsCommand implements Command<ToggleStackTotalsParams> {
    readonly type: "toggle-stack-totals";
    readonly metadata: CommandMetadata;
    readonly params: ToggleStackTotalsParams;
    constructor(params: ToggleStackTotalsParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}
```

## Commands — scales & coords

```ts
/**
 * Command that changes the domain bounds on a continuous or datetime scale.
 * Targets a scale by scale aesthetic key.
 * Produces a revert command that restores the previous domain for undo support.
 */
class SetScaleDomainCommand implements Command<SetScaleDomainParams> {
    readonly type: "set-scale-domain";
    readonly metadata: CommandMetadata;
    readonly params: SetScaleDomainParams;
    constructor(params: SetScaleDomainParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Replaces the palette config on the scale bound to the given scale aesthetic key.
 *
 * @remarks
 * Only stores the palette config — the compiler resolves the concrete color range
 * from the config . */
class SetScalePaletteCommand implements Command<SetScalePaletteParams> {
    readonly type: "set-scale-palette";
    readonly metadata: CommandMetadata;
    readonly params: SetScalePaletteParams;
    constructor(params: SetScalePaletteParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that toggles the reverse flag on a continuous, datetime or discrete scale.
 * Targets a scale by scale aesthetic key.
 * Produces a revert command that restores the previous reverse value for undo support.
 */
class SetScaleReverseCommand implements Command<SetScaleReverseParams> {
    readonly type: "set-scale-reverse";
    readonly metadata: CommandMetadata;
    readonly params: SetScaleReverseParams;
    constructor(params: SetScaleReverseParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that changes the transformation (e.g. identity, log, sqrt) on a continuous scale.
 * Targets a scale by scale aesthetic key.
 * Produces a revert command that restores the previous transform for undo support.
 */
class SetScaleTransformCommand implements Command<SetScaleTransformParams> {
    readonly type: "set-scale-transform";
    readonly metadata: CommandMetadata;
    readonly params: SetScaleTransformParams;
    constructor(params: SetScaleTransformParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that sets the visible data range of the coordinate system, clipping the projection to
 * `[min, max]` on either axis or releasing it back to the data extent with `null`.
 *
 * Limits live on every coordinate type, so this applies to cartesian, flipped and polar coords alike.
 * Only the axes named in `params` move; a command naming neither, or naming limits the spec already
 * carries, returns `null`.
 *
 * Produces a revert command carrying the previous limits of exactly the axes this one touched.
 */
class SetCoordLimitsCommand implements Command<SetCoordLimitsParams> {
    readonly type: "set-coord-limits";
    readonly metadata: CommandMetadata;
    readonly params: SetCoordLimitsParams;
    readonly target: EditTarget;
    constructor(params: SetCoordLimitsParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that sets the donut hole of a polar chart, turning a pie into a donut and back.
 * Applies only when the spec's coordinate system is polar; returns `null` for cartesian or flipped
 * coords, which have no radial axis, and for a radius the spec already carries.
 * Produces a revert command that restores the previous inner radius for undo support.
 */
class SetPolarInnerRadiusCommand implements Command<SetPolarInnerRadiusParams> {
    readonly type: "set-polar-inner-radius";
    readonly metadata: CommandMetadata;
    readonly params: SetPolarInnerRadiusParams;
    readonly target: EditTarget;
    constructor(params: SetPolarInnerRadiusParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Command that rotates a polar chart by moving the angle its first wedge starts at.
 * Applies only when the spec's coordinate system is polar; returns `null` for cartesian or flipped
 * coords, which have no angular axis, and for an angle the spec already carries.
 * Produces a revert command that restores the previous start angle for undo support.
 */
class SetPolarStartAngleCommand implements Command<SetPolarStartAngleParams> {
    readonly type: "set-polar-start-angle";
    readonly metadata: CommandMetadata;
    readonly params: SetPolarStartAngleParams;
    readonly target: EditTarget;
    constructor(params: SetPolarStartAngleParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}
```

## Commands — config & content

```ts
/**
 * Sets the chart's title content (heading + optional subtitle paragraphs).
 *
 * When passed a {@link RichTextContent} doc the field is replaced wholesale
 * rather than deep-merged — rich-text docs are opaque values to the spec
 * updater, not nested config to merge into.
 */
class SetContentTitleCommand implements Command<SetContentTitleParams> {
    readonly type: "set-content-title";
    readonly metadata: CommandMetadata;
    readonly params: SetContentTitleParams;
    readonly target: EditTarget;
    constructor(params: SetContentTitleParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the chart's subtitle content.
 *
 * Replaces the value wholesale rather than deep-merging — rich-text docs are
 * opaque values to the spec updater.
 */
class SetContentSubtitleCommand implements Command<SetContentSubtitleParams> {
    readonly type: "set-content-subtitle";
    readonly metadata: CommandMetadata;
    readonly params: SetContentSubtitleParams;
    readonly target: EditTarget;
    constructor(params: SetContentSubtitleParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the chart's caption content.
 *
 * Replaces the value wholesale rather than deep-merging — rich-text docs are
 * opaque values to the spec updater.
 */
class SetContentCaptionCommand implements Command<SetContentCaptionParams> {
    readonly type: "set-content-caption";
    readonly metadata: CommandMetadata;
    readonly params: SetContentCaptionParams;
    readonly target: EditTarget;
    constructor(params: SetContentCaptionParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the data-source attribution shown under the caption. Whether it renders is controlled
 * separately by `isSourceVisible`, so clearing the text and hiding the slot are distinct edits.
 */
class SetContentSourceCommand implements Command<SetContentSourceParams> {
    readonly type: "set-content-source";
    readonly metadata: CommandMetadata;
    readonly params: SetContentSourceParams;
    readonly target: EditTarget;
    constructor(params: SetContentSourceParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Shows or hides one of the chart's text parts without touching the text it holds, so a part can be
 * hidden and shown again without the user retyping its content.
 */
class ToggleContentVisibilityCommand implements Command<ToggleContentVisibilityParams> {
    readonly type: "toggle-content-visibility";
    readonly metadata: CommandMetadata;
    readonly params: ToggleContentVisibilityParams;
    constructor(params: ToggleContentVisibilityParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the custom text label for an axis.
 * When set to null, the axis uses its default label derived from the data mapping.
 */
class SetAxisLabelCommand implements Command<SetAxisLabelParams> {
    readonly type: "set-axis-label";
    readonly metadata: CommandMetadata;
    readonly params: SetAxisLabelParams;
    constructor(params: SetAxisLabelParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the axis position, left/right for y-axis, top/bottom for x-axis.
 */
class SetAxisPositionCommand implements Command<SetAxisPositionParams> {
    readonly type: "set-axis-position";
    readonly metadata: CommandMetadata;
    readonly params: SetAxisPositionParams;
    constructor(params: SetAxisPositionParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Controls how ticks are displayed on an axis (e.g. all ticks vs only the edges).
 */
class SetAxisTickModeCommand implements Command<SetAxisTickModeParams> {
    readonly type: "set-axis-tick-mode";
    readonly metadata: CommandMetadata;
    readonly params: SetAxisTickModeParams;
    constructor(params: SetAxisTickModeParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Toggles tick mark visibility on an axis.
 * When hidden, the axis line remains visible but tick marks and their labels are removed.
 */
class SetAxisTicksVisibilityCommand implements Command<SetAxisTicksVisibilityParams> {
    readonly type: "set-axis-ticks-visibility";
    readonly metadata: CommandMetadata;
    readonly params: SetAxisTicksVisibilityParams;
    constructor(params: SetAxisTicksVisibilityParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Toggles the entire axis visibility (line, ticks, and labels) for a given axis target.
 */
class SetAxisVisibilityCommand implements Command<SetAxisVisibilityParams> {
    readonly type: "set-axis-visibility";
    readonly metadata: CommandMetadata;
    readonly params: SetAxisVisibilityParams;
    constructor(params: SetAxisVisibilityParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Controls grid line visibility for one axis.
 */
class SetGridVisibilityCommand implements Command<SetGridVisibilityParams> {
    readonly type: "set-grid-visibility";
    readonly metadata: CommandMetadata;
    readonly params: SetGridVisibilityParams;
    constructor(params: SetGridVisibilityParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets a grid's dash pattern, on one axis or on `both` as a single edit.
 *
 * Style is held independently of visibility, so hiding a grid and showing it again keeps it.
 */
class SetGridLineStyleCommand implements Command<SetGridLineStyleParams> {
    readonly type: "set-grid-line-style";
    readonly metadata: CommandMetadata;
    readonly params: SetGridLineStyleParams;
    constructor(params: SetGridLineStyleParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the stroke width of a grid's lines, on one axis or on `both` as a single edit, or hands it
 * back to the stylesheet with `null`.
 *
 * Narrows only what has no stroke to draw. Where a grid stops reading as a rule is a matter of taste
 * and belongs to the control offering the range: a bound here could not put back a wider width the
 * spec already held, a revert being built through this same constructor.
 */
class SetGridLineWidthCommand implements Command<SetGridLineWidthParams> {
    readonly type: "set-grid-line-width";
    readonly metadata: CommandMetadata;
    readonly params: SetGridLineWidthParams;
    constructor(params: SetGridLineWidthParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets where the legend's items sit along its flow: along the row for a top or bottom legend, down
 * the column for a left or right one. `'auto'` resolves at compile time to `start` for a horizontal
 * legend and `center` for a vertical one.
 */
class SetLegendAlignCommand implements Command<SetLegendAlignParams> {
    readonly type: "set-legend-align";
    readonly metadata: CommandMetadata;
    readonly params: SetLegendAlignParams;
    readonly target: EditTarget;
    constructor(params: SetLegendAlignParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Chooses how the legend names its series: `'pill'` draws the boxed list beside the chart,
 * `'direct'` labels each series at its own endpoint, and `'auto'` lets the compiler pick from the
 * chart type and the legend's position.
 *
 * Direct labels leave the legend region empty, so this moves layout as well as paint.
 */
class SetLegendDisplayCommand implements Command<SetLegendDisplayParams> {
    readonly type: "set-legend-display";
    readonly metadata: CommandMetadata;
    readonly params: SetLegendDisplayParams;
    readonly target: EditTarget;
    constructor(params: SetLegendDisplayParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the legend's side and its alignment along it as one edit. Its revert restores both, even where only one
 * changed, so a held gesture folded into one undo step returns to where it began.
 */
class SetLegendPlacementCommand implements Command<SetLegendPlacementParams> {
    readonly type: "set-legend-placement";
    readonly metadata: CommandMetadata;
    readonly params: SetLegendPlacementParams;
    readonly target: EditTarget;
    constructor(params: SetLegendPlacementParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the legend placement relative to the chart (e.g. auto, top, bottom, left, right, none).
 * 'auto' lets the renderer choose the best position; 'none' hides the legend entirely.
 */
class SetLegendPositionCommand implements Command<SetLegendPositionParams> {
    readonly type: "set-legend-position";
    readonly metadata: CommandMetadata;
    readonly params: SetLegendPositionParams;
    readonly target: EditTarget;
    constructor(params: SetLegendPositionParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Controls which headline metric is displayed (e.g. none, total, average, last).
 * When set to 'none', no headline is rendered above/below the chart.
 */
class SetHeadlineShowCommand implements Command<SetHeadlineShowParams> {
    readonly type: "set-headline-show";
    readonly metadata: CommandMetadata;
    readonly params: SetHeadlineShowParams;
    readonly target: EditTarget;
    constructor(params: SetHeadlineShowParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the font size of the headline (e.g. auto, small, medium, large).
 * 'auto' lets the renderer pick a size based on available space.
 */
class SetHeadlineSizeCommand implements Command<SetHeadlineSizeParams> {
    readonly type: "set-headline-size";
    readonly metadata: CommandMetadata;
    readonly params: SetHeadlineSizeParams;
    readonly target: EditTarget;
    constructor(params: SetHeadlineSizeParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets where the headline is placed relative to the chart (e.g. above, below).
 */
class SetHeadlinePositionCommand implements Command<SetHeadlinePositionParams> {
    readonly type: "set-headline-position";
    readonly metadata: CommandMetadata;
    readonly params: SetHeadlinePositionParams;
    readonly target: EditTarget;
    constructor(params: SetHeadlinePositionParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the comparison mode for the headline value (e.g. none, previous, first).
 * Determines what reference point is used to show change in the headline metric.
 */
class SetHeadlineCompareWithCommand implements Command<SetHeadlineCompareWithParams> {
    readonly type: "set-headline-compare-with";
    readonly metadata: CommandMetadata;
    readonly params: SetHeadlineCompareWithParams;
    readonly target: EditTarget;
    constructor(params: SetHeadlineCompareWithParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Sets the number of decimal places shown in formatted values (e.g. auto, 0, 1, 2).
 * 'auto' lets the renderer choose precision based on the data range.
 */
class SetNumberFormatDecimalsCommand implements Command<SetNumberFormatDecimalsParams> {
    readonly type: "set-number-format-decimals";
    readonly metadata: CommandMetadata;
    readonly params: SetNumberFormatDecimalsParams;
    readonly target: EditTarget;
    constructor(params: SetNumberFormatDecimalsParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Controls how large numbers are abbreviated in the chart (e.g. auto, none, K, M, B).
 * 'auto' lets the renderer pick the most readable abbreviation based on value magnitude.
 */
class SetNumberFormatAbbreviationCommand implements Command<SetNumberFormatAbbreviationParams> {
    readonly type: "set-number-format-abbreviation";
    readonly metadata: CommandMetadata;
    readonly params: SetNumberFormatAbbreviationParams;
    readonly target: EditTarget;
    constructor(params: SetNumberFormatAbbreviationParams, metadata?: Partial<CommandMetadata>);
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}
```

## Commands — styles & highlights

```ts
/**
 * Inserts, replaces or removes one entry in the spec's stylesheet (`spec.styles`) — the one command
 * surface for style paint.
 *
 * The entry is addressed structurally: `select` and `when` are its identity, so the command writes the
 * entry that paints those elements under those conditions, whoever authored it.
 *
 * - Declarations at an address the list already holds replace that entry's, keeping its position in
 *   the cascade and its authored `id`.
 * - Declarations at a new address insert at `index` (clamped; appended when omitted).
 * - `declarations: null` removes the entry that paints at the address and every copy of it; an
 *   address the list doesn't hold is a no-op. Where that entry is kept to the graph's coord, the one
 *   every graph shares stays and paints again.
 * - Writing declarations an entry already carries is a no-op, so a value already painted doesn't grow
 *   the spec or the history.
 *
 * Reverts with a {@link SetStyleRuleCommand} carrying the previous entry (or `null`) at its previous
 * index, so undo restores both the entry and its position in the cascade.
 */
class SetStyleRuleCommand implements Command<SetStyleRuleParams> {
    readonly type: "set-style-rule";
    readonly metadata: CommandMetadata;
    readonly params: SetStyleRuleParams;
    constructor(params: SetStyleRuleParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Adds a predicate-driven highlight to the spec.
 *
 * Reverts with a {@link RemoveHighlightCommand} for the same id.
 */
class AddHighlightCommand implements Command<AddHighlightParams> {
    readonly type: "add-highlight";
    readonly metadata: CommandMetadata;
    readonly params: AddHighlightParams;
    /**
     * The `id` is resolved in the constructor rather than in `apply`, so a command serialized before
     * it ran still replays to the same spec. Applying is a no-op when the id is already present, which
     * keeps ids unambiguous for removal and undo.
     *
     * A highlight repeating a condition the spec already states under another id is still added: this is
     * the command {@link RemoveHighlightCommand} reverts with, and a revert that declines to apply strands
     * the history on it. Whether a repeat is worth offering is the creation site's to decide — the editor
     * menu leaves out a scope already painting the observation, and `findEquivalentHighlight` answers it
     * for anything else writing highlights.
     */
    constructor(params: AddHighlightOptions, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Constructor input for {@link AddHighlightCommand}. `id` and `scope` are optional here and are
 * resolved into {@link AddHighlightParams}, mirroring the `HighlightSpec` → `ResolvedHighlightSpec`
 * distinction the spec resolver draws.
 */
type AddHighlightOptions = {
    /** Match condition evaluated against post-transform columns. Plain data, so it serializes as-is. */
    predicate: Predicate;
    /** Identity of the highlight; minted when omitted. */
    id?: string;
    /** Visual unit a match expands to; defaults to `data-point`. */
    scope?: MatchScope;
    /** Restrict evaluation to a single layer; omit to evaluate against every layer. */
    layerId?: string;
    /** Position to insert at, clamped to the list bounds; appends when omitted. */
    index?: number;
};

/**
 * Removes a highlight from the spec by id. Applying is a no-op when no highlight carries that id.
 *
 * Reverts with an {@link AddHighlightCommand} that re-inserts the removed highlight at the index
 * it occupied, so undo restores highlight order rather than appending.
 */
class RemoveHighlightCommand implements Command<RemoveHighlightParams> {
    readonly type: "remove-highlight";
    readonly metadata: CommandMetadata;
    readonly params: RemoveHighlightParams;
    constructor(params: RemoveHighlightParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Picks how a highlight de-emphasizes everything it did not match.
 *
 * Writes one chart-wide `state: 'dimmed'` entry. `'dim'` restates the built-in wash so the choice
 * stays visible in the spec; `'desaturate'` greys the marks out instead.
 */
class SetHighlightDimStyleCommand implements Command<SetHighlightDimStyleParams> {
    readonly type: "set-highlight-dim-style";
    readonly metadata: CommandMetadata;
    readonly params: SetHighlightDimStyleParams;
    constructor(params: SetHighlightDimStyleParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * The dim style a spec is on. Absent, the built-in stylesheet's own wash applies, which is what
 * `'dim'` restates.
 */
const readHighlightDimStyle: (spec: ResolvedSpec) => HighlightDimStyle;

/** How a chart pushes back the marks a highlight leaves out. */
type HighlightDimStyle = 'dim' | 'desaturate';

/**
 * The highlight already in the spec that `candidate` would duplicate, or `null` when it adds something
 * new. Two highlights matching the same rows over the same layer paint identically, so creating a second
 * one only costs an evaluation pass over the layer and leaves the user an entry they cannot reach: a
 * highlight is reached through the observations it paints, and the first already answers for those.
 *
 * Values are compared the way the compiler compares them, so a temporal value equals another of the same
 * instant. A value that has been through a host's storage as an ISO string is a different shape from the
 * `Date` a freshly built predicate carries, and reads as a new highlight.
 */
const findEquivalentHighlight: (highlights: readonly ResolvedHighlightSpec[], candidate: HighlightCandidate) => ResolvedHighlightSpec | null;

/**
 * Every highlight painting `observation`, in paint order — what an editor reads to offer removing one,
 * and to know which scopes would only repaint what is already there.
 *
 * A predicate names the observations a highlight was written from; a keyed scope carries each match onward,
 * so a `'series'` highlight covers observations its predicate never matched. Both halves run through what
 * the highlights compile stage itself uses — the same predicate compiler, and
 * {@link readScopeKey} for how far a scope reaches — so this and the canvas cannot part ways.
 */
const findHighlightsAtObservation: ({ layer, highlights, observation, parsingLocale, }: HighlightsAtObservationInput) => ResolvedHighlightSpec[];
```

## Commands — annotations

```ts
/**
 * Adds an annotation of any built-in kind to the spec.
 *
 * An observation carries at most one attachment (see `OBSERVATION_ATTACHMENT_KINDS`), so adding one
 * to an observation that already has one displaces what was there — a comment replaces the pinned
 * number on its bar rather than joining it.
 *
 * Reverts with a {@link RemoveAnnotationCommand} for the same id, or, when something was displaced,
 * with the add that puts the displaced annotation back. That add displaces this one in turn, by the
 * same rule, so one command undoes both halves of a replacement.
 */
class AddAnnotationCommand<TKind extends AnnotationKind = AnnotationKind> implements Command<AddAnnotationParams<TKind>> {
    readonly type: "add-annotation";
    readonly metadata: CommandMetadata;
    readonly params: AddAnnotationParams<TKind>;
    constructor(options: AddAnnotationOptions<TKind>, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Constructor input for {@link AddAnnotationCommand}. A fully resolved annotation, so callers spread
 * the per-kind `*_DEFAULTS`: `{ ...SHAPE_DEFAULTS, region }`. Only `id` is optional, minted when omitted.
 */
type AddAnnotationOptions<TKind extends AnnotationKind = AnnotationKind> = {
    /** Which annotation kind to add; also selects the bucket it lands in. */
    kind: TKind;
    annotation: Omit<AnnotationSpecByKind[TKind], 'id'> & {
        id?: string;
    };
    /**
     * Position to insert at, clamped to the bucket's bounds; appends when omitted. Read against the
     * bucket a displaced attachment has already left, so an index captured on the way out puts the
     * annotation back where it was.
     */
    index?: number;
};

/**
 * Overwrites some fields of one annotation; both moving and restyling go through this one command.
 *
 * Reverts with the inverse patch, captured on apply rather than at construction, so a replayed
 * command reverts to whatever it actually overwrote.
 *
 * Applying is a no-op when no annotation carries the id, when the annotation is of another kind, or
 * when every patched field already holds the value being written.
 */
class UpdateAnnotationCommand<TKind extends AnnotationKind = AnnotationKind> implements Command<UpdateAnnotationParams<TKind>> {
    readonly type: "update-annotation";
    readonly metadata: CommandMetadata;
    readonly params: UpdateAnnotationParams<TKind>;
    constructor(params: UpdateAnnotationParams<TKind>, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/** Fields of one annotation kind to overwrite. `id` is excluded: it is what addresses the command. */
type AnnotationPatch<TKind extends AnnotationKind = AnnotationKind> = Partial<Omit<AnnotationSpecByKind[TKind], 'id'>>;

/**
 * Moves one annotation by a translation in panel fractions. Which fields it moves is the annotation's
 * own business: a kind declares the anchored points it carries and the patch that writes them back.
 *
 * Reverts with the inverse patch rather than the opposite translation, since clamping a move inside the
 * panel is not invertible. A move is relative: applying it twice moves twice.
 */
class MoveAnnotationCommand implements Command<MoveAnnotationParams> {
    readonly type: "move-annotation";
    readonly metadata: CommandMetadata;
    readonly params: MoveAnnotationParams;
    constructor(params: MoveAnnotationParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}

/**
 * Removes an annotation from the spec by id, whichever kind it is. Applying is a no-op when no
 * annotation carries that id.
 *
 * Reverts with an {@link AddAnnotationCommand} that re-inserts the removed annotation at the index
 * it occupied, so undo restores paint order rather than appending.
 */
class RemoveAnnotationCommand implements Command<RemoveAnnotationParams> {
    readonly type: "remove-annotation";
    readonly metadata: CommandMetadata;
    readonly params: RemoveAnnotationParams;
    constructor(params: RemoveAnnotationParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: ResolvedSpec): CommandApplyResult | null;
}
```

## Annotation model & anchors

```ts
/** Discriminant naming one built-in annotation kind. */
type AnnotationKind = AnnotationItem['kind'];

/**
 * One annotation paired with the kind that types it. A generic `(kind, annotation)` pair cannot
 * express that pairing, so anything reading a field only some kinds carry takes this instead.
 */
type KindedAnnotation = {
    [TKind in AnnotationKind]: KindedAnnotationOf<TKind>;
}[AnnotationKind];

/** One annotation found by id, with the bucket and position it was found at. */
type LocatedAnnotation = KindedAnnotation & {
    index: number;
};

/**
 * Finds the annotation carrying `id`, whichever bucket holds it — annotations are addressed by id
 * alone. Returns `null` when no annotation has that id, which callers treat as a no-op.
 */
const findAnnotation: (annotations: ResolvedAnnotationsSpec, id: string) => LocatedAnnotation | null;

/**
 * Whether this annotation is written in a way a translation can rewrite. Movability belongs to the
 * annotation rather than its kind: a `text` on an observation has no move, and the same `text` in the
 * panel does.
 *
 * The spec's half of the answer, and not on its own the gate an affordance reads: a drag also needs the
 * renderer to draw something to take hold of, which a kind movable here may have none of.
 */
const isAnnotationMovable: (kinded: KindedAnnotation) => boolean;

/**
 * How much of `translation` this annotation actually moves by, or `null` when it does not move. A drag
 * reads this rather than the pointer's own travel, so its preview and its drop are the same distance.
 */
const clampAnnotationTranslation: (kinded: KindedAnnotation, translation: PanelTranslation) => PanelTranslation | null;

/**
 * How far to move an annotation, in panel fractions on each axis, so a move knows no pixels. Positive
 * `y` moves down, like the anchors it adds to.
 */
type PanelTranslation = PanelPoint;

/**
 * Builds the anchor for any observation of one layer — the inverse of the compiler's observation anchor
 * resolution, so an annotation created on a hovered observation lands on that same observation.
 *
 * The rules an address follows belong to the layer, so a walk over its observations resolves them once
 * here rather than per candidate. The counterpart to {@link createObservationAnchorMatcher}.
 *
 * The built anchor is `null` when the observation carries no value on a variable the layer's addresses
 * narrow by: without it the annotation would be dropped at the next compile, or land on whichever
 * sibling the layer holds first.
 */
const createObservationAnchorBuilder: (layer: SceneLayer) => ((observation: Observation) => ResolvedObservationAnchorSpec | null);

/**
 * Whether two anchors address the same observation, the comparison the compiler drops a collapsed arrow
 * on. A candidate that repeats an endpoint's anchor is passed over for the next one, so the walk never
 * lands where the arrow would measure nothing.
 */
const areAnchorsEqual: (first: ResolvedObservationAnchorSpec, second: ResolvedObservationAnchorSpec) => boolean;

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
```

## Editable components — @graphysdk/react-renderer/editable

```ts
/**
 * `GraphRenderer` with the editor layer wired in. A host toggles `mode` rather than swapping
 * components, so hover, animation, the scene store and the undo history survive the toggle.
 *
 * The editor store is held from here, above the renderer, because the editing surface fills a slot
 * beside the plot rather than above it: a store it hosted would be out of reach of the geoms and chrome
 * painting inside the plot `<svg>`, which have to show a target being reached for or an endpoint being
 * moved. A chart rendered without this wrapper has no editor state at all, and reads it at rest.
 *
 * @example
 * ```tsx
 * <GraphProvider spec={input} data={data}>
 *   <EditableGraphRenderer mode={isEditing ? 'editable' : 'readonly'} />
 * </GraphProvider>
 * ```
 */
const EditableGraphRenderer: ({ slots, mode, ...rest }: GraphRendererProps) => JSX.Element;

/**
 * The translation context editor UI needs, already carrying the editing surface's wording. Mount it
 * around a panel a host places outside the chart; `EditableGraphRenderer` mounts its own.
 *
 * It owns the phrase sets, so a caller cannot name one and silently leave the editor untranslated.
 */
const IntlProvider: ({ children, ...rest }: Omit<IntlProviderProps, "dictionaries">) => JSX.Element;

/** Both axes, each switched on and off from within its own section. */
const AxesPanel: ({ children, ...rootProps }: PanelProps) => JSX.Element;

/**
 * The chart's text and its size: what the header and footer show, and how large everything is drawn.
 *
 * Section order follows the chart's own reading order: the text down the page, then its size.
 */
const ElementsPanel: ({ children, ...rootProps }: PanelProps) => JSX.Element;

/**
 * One block of a panel: a heading, and the settings under it. Defaults to `fixed`, so a section that
 * forgot to declare a layout shows its controls rather than hiding them.
 *
 * Only `collapsible` is an accordion item — the other two always show their body, so an item that is
 * permanently open would carry the trigger and the panel semantics without ever using them.
 */
const Section: ({ title, layout, preview, accessory, onOpenChange, children }: SectionProps) => JSX.Element;

interface SectionProps {
    /** Also the section's identity within the panel, so titles must be distinct. */
    title: string;
    layout?: SectionLayout;
    /** What the section says while closed — "Bottom". Not interactive; for that use `accessory`. */
    preview?: ReactNode;
    /** A live control at the header's end, whose clicks do not toggle the section. */
    accessory?: ReactNode;
    /**
     * Fired when a `collapsible` section opens or closes, so a section can couple a feature to being
     * looked at. An event rather than state to watch: an effect reading expansion would write the state
     * it reads and fire twice for one gesture.
     */
    onOpenChange?: (isOpen: boolean) => void;
    children: ReactNode;
}

/**
 * `fixed` always shows its body; `collapsible` toggles it and only one section is open at a time;
 * `inline` is a single row, the control sitting where a preview otherwise would.
 */
type SectionLayout = 'fixed' | 'collapsible' | 'inline';

/**
 * A section whose feature is switched on and off from its own header. The coupling runs both ways: on
 * opens it, off closes it, and opening it while off switches it on.
 */
const ToggledSection: ({ title, isChecked, onToggle, isDisabled, preview, children }: ToggledSectionProps) => JSX.Element;

/**
 * One labelled setting, wiring its own control: the row publishes its ids and each control takes the
 * half it can carry. The label reaches it with `htmlFor` rather than wrapping it, because a wrapping
 * `<label>` makes Base UI rename every option of a group inside it to the row's text.
 */
const Row: ({ label, layout, icon, children }: SettingRowProps) => JSX.Element;

type RowLayout = 'stack' | 'grid';

/**
 * What a host may override per section, spread by every section onto its `Section`, so the same
 * section can be mounted at two layouts without being forked to get them.
 */
type OverridableSectionProps = Partial<Pick<SectionProps, 'title' | 'layout' | 'preview'>>;

/**
 * The graph the surrounding panel edits. Throws outside a bound panel: a section has nothing to
 * read or write without one, so an unbound panel is a composition mistake rather than a state to
 * render around.
 */
const usePanelGraph: () => GraphHandle;

/**
 * How a section opens or closes itself.
 *
 * Write-only: which section is open is the accordion's, and reading it back would tempt a section
 * into an effect that watches the state it also writes.
 */
const usePanelExpansion: () => PanelExpansion;
```

## Sections

```ts
/**
 * What the chart *is*: a column chart, a stacked bar, a donut. Pictures rather than words, since a
 * type is a shape. Read back off the spec rather than stored beside it, so a chart built by hand or
 * by an agent lights up the option that describes it.
 */
const GraphTypeSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/** What a chart writes on its own marks. The grid is chrome behind them, and has its own section. */
const GraphOptionsSection: ({ layerId, title, layout, preview }: GraphOptionsSectionProps) => JSX.Element | null;

interface GraphOptionsSectionProps extends OverridableSectionProps {
    /** Whose labels to edit. Defaults to the first layer; a combo's bars and line each carry their own. */
    layerId?: string;
}

/**
 * One axis, and the scale it carries.
 *
 * `x` and `y` stay as mapped however the chart is drawn: a flipped coord system turns a column chart
 * on its side without moving the value scale off y.
 */
const AxisSection: ({ axis, title, layout, preview }: AxisSectionProps) => JSX.Element | null;

interface AxisSectionProps extends OverridableSectionProps {
    /** Which axis this section edits. */
    axis: AxisKey;
}

/** How big a hole a round chart has, and where its sweep begins. */
const PolarSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/**
 * A bar's own shape: how thick it is and how round its corners are.
 *
 * No gap row: painted width is `step × (1 - scalePadding) × width / seriesCount`, so band padding and
 * this fraction shrink the group the same way.
 */
const BarSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/**
 * How a path is drawn: its points, curve, thickness and missing values. Renders nothing unless the
 * chart holds a line or an area.
 */
const LineSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/**
 * How large a chart's authored points are drawn. Renders nothing unless a point layer is the host's
 * own: a path's companion points are sized from the line section, under the switch that grows them.
 */
const PointSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/**
 * Visibility switches per direction, since a chart often wants horizontal rules and no vertical ones.
 * Style and thickness stay shared: two directions styled apart read as two grids rather than one.
 */
const GridSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/** Where the legend sits relative to the chart, and how it names its series. */
const LegendSection: ({ positions, title, layout, preview }: LegendSectionProps) => JSX.Element | null;

interface LegendSectionProps extends OverridableSectionProps {
    /** Overrides the positions offered, for a host that knows its own layout constraints. */
    positions?: readonly LegendPosition[];
}

/**
 * The aggregate a chart states above itself.
 *
 * `show: 'none'` is the off state rather than a separate flag, so the *Visible* switch writes the
 * metric.
 */
const HeadlineSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/**
 * How every number in the chart reads: whether large values collapse to a suffix (`1.2k`, `3m`), and
 * how many decimals the rest keep.
 *
 * Both belong to the spec's config rather than to any one layer, so this is one setting the whole
 * chart shares.
 */
const NumberFormatSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/**
 * How round the chart's frame is, and how it pushes back the marks a highlight leaves out. The
 * highlight row is inert until something adds a highlight.
 */
const AppearanceSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/** How large every text element is drawn, as one multiplier over the theme's own sizes. */
const TextSizeSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/**
 * Each tile writes a whole annotation on one press: the spec cannot hold an annotation with no
 * position, so there is no draw-it-on-the-chart gesture.
 */
const CalloutsSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/**
 * Whether the chart shows its title, and what it says.
 *
 * Hiding it leaves the text intact, so it comes back without being retyped. It is also editable in
 * place on the chart; the field here is the second way in, not the only one.
 */
const TitleSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/**
 * Whether the chart shows its subtitle, and what it says.
 *
 * Hiding it leaves the text intact, so it comes back without being retyped. It is also editable in
 * place on the chart; the field here is the second way in, not the only one.
 */
const SubtitleSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/**
 * Whether the chart shows its caption, and what it says.
 *
 * Hiding it leaves the text intact, so it comes back without being retyped. It is also editable in
 * place on the chart; the field here is the second way in, not the only one.
 */
const CaptionSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

/** Whether the chart shows its source. The one text part never editable in place on the chart. */
const SourceSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;

const GoalSection: ({ title, preview }: GoalSectionProps) => JSX.Element | null;

const TrendsAndAveragesSection: ({ title, layout, preview }: OverridableSectionProps) => JSX.Element | null;
```

## Controls

```ts
/**
 * One choice in a control that offers a fixed set of them.
 *
 * `value` is a plain string rather than a command's own union: a control is one component type,
 * which cannot be generic in what it selects. Sections map between the two.
 */
interface ControlOption {
    value: string;
    label: string;
    /** Secondary line under the label, shown by controls that have room for one. */
    description?: string;
    /** Shown beside the label, or alone where the control is icon-only. */
    icon?: ReactNode;
    isDisabled?: boolean;
}

/** Props every control shares. */
interface ControlBaseProps {
    isDisabled?: boolean;
    /** Required unless the control is labelled by a section row, which passes `ariaLabelledBy` instead. */
    ariaLabel?: string;
    ariaLabelledBy?: string;
    /**
     * Put on the element a row's `<label htmlFor>` points at, so a click on the label acts on the
     * control. Only single labelable controls have somewhere to put it; a group takes `ariaLabelledBy`.
     */
    id?: string;
}

/**
 * A control where one gesture can only ever produce one change, so every change is its own undo
 * entry and there is nothing left to commit — a switch flipped, an option picked from a popup.
 *
 * Being single-valued is not the test. A radio grid holds one string and is still {@link
 * ContinuousControlProps}, because holding an arrow key sweeps its selection.
 */
interface DiscreteControlProps<Value> extends ControlBaseProps {
    value: Value;
    onChange: (value: Value) => void;
}

/**
 * A control where one gesture can produce a run of changes — a drag, a burst of typing, a held
 * arrow key.
 *
 * `onChange` fires throughout the gesture and a section dispatches it transiently; `onCommit` fires
 * once the gesture ends, so a whole drag collapses into one undo entry rather
 * than one per frame. A control that only ever fires `onChange` still edits correctly; it just
 * leaves the run open for the next edit to close.
 */
interface ContinuousControlProps<Value> extends ControlBaseProps {
    value: Value;
    onChange: (value: Value) => void;
    onCommit?: () => void;
}

/**
 * A press that performs an edit rather than sets a value.
 *
 * Every press is its own undo entry, so there is no transient run to commit here — a button has no
 * gesture to hold open the way a drag or a run of keystrokes does.
 */
const Button: ({ label, icon, onClick, variant, isDisabled, ariaLabel, ariaLabelledBy, id, }: ButtonControlProps) => JSX.Element;

/**
 * An action rather than a value: pressing it is the whole gesture, so there is nothing to read
 * back. Sections use it where an edit adds or removes something instead of changing a setting.
 */
type ButtonControlProps = ButtonBaseProps & ButtonContentProps;

/** A grid of colour chips, for picking one colour from a fixed set such as the palette. */
const ColorSwatches: ({ title, colors, value, onChange, isDisabled, id, ariaLabel, ariaLabelledBy, }: ColorSwatchesControlProps) => JSX.Element;

/**
 * A grid of colour chips. A click reports the colour.
 * `value` is `null` when no chip matches, as for a mixed selection.
 */
interface ColorSwatchesControlProps extends Omit<DiscreteControlProps<string | null>, 'onChange'> {
    /** Heading above the grid. Omitted, the grid stands alone. */
    title?: string;
    colors: readonly string[];
    onChange: (value: string) => void;
}

/** A hex picker behind a trigger, for a colour none of the swatches offer. */
const CustomColor: ({ value, onChange, onCommit, popupAttributes }: CustomColorControlProps) => JSX.Element;

/**
 * A custom colour: a trigger that opens a hex picker. Each drag frame and typed change is reported,
 * then `onCommit` once the picker closes. `null` when there is no single colour.
 */
interface CustomColorControlProps extends Omit<ContinuousControlProps<string | null>, 'onChange'> {
    onChange: (value: string) => void;
    /**
     * Spread onto the picker popup. A host whose popup must stay inside a focus scope stamps it here.
     * The popup portals on its own.
     */
    popupAttributes?: Record<string, string>;
}

/**
 * A number typed, scrubbed or stepped into a field.
 *
 * Base UI's `onValueCommitted` already fires on blur and at the end of a scrub or a button press,
 * which is exactly the grain `onCommit` wants — so a scrub is one undo entry, not one per pixel.
 */
const NumberField: ({ value, onChange, onCommit, min, max, step, placeholder, prefix, suffix, isDisabled, hasError, ariaLabel, ariaLabelledBy, id, }: NumberFieldControlProps) => JSX.Element;

/** `null` is an empty field, which is a state of its own rather than zero. */
interface NumberFieldControlProps extends ContinuousControlProps<number | null> {
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    /**
     * Shown inside the field, before the number: a currency or a comparison symbol, `$` or `≥`.
     * Display only, never part of the value.
     */
    prefix?: string;
    /**
     * Shown inside the field, after the number: a unit that reads as one, `px`, `%` or `°`. Display
     * only, never part of the value.
     */
    suffix?: string;
    hasError?: boolean;
}

/**
 * A grid of picture-led choices, for settings that read faster as shapes than as words — chart
 * type, text size, a row of colour chips.
 *
 * A click is a whole gesture and commits immediately. A held arrow key is not: it sweeps the
 * selection across the options, firing a change for each one it passes through, so the run is
 * committed on key up instead. Without that, crossing six options would leave six undo entries behind
 * a single press. Blur commits too, for focus leaving before the key comes up.
 *
 * Base UI reports every change with the same reason, so which gesture is under way is tracked here
 * rather than read off the event.
 */
const RadioGrid: ({ options, value, onChange, onCommit, columns, itemLayout, isDisabled, ariaLabel, ariaLabelledBy, id, }: RadioGridControlProps) => JSX.Element;

/**
 * Single-select grid of icon buttons, for choices that read as pictures rather than words.
 *
 * Continuous despite holding a single string: arrow keys move the selection, so holding one sweeps
 * across the options and fires a change for each. `onCommit` lands once, on key up.
 */
interface RadioGridControlProps extends ContinuousControlProps<string> {
    /** In the order the arrow keys walk them: Right and Down forward, Left and Up back. */
    options: readonly RadioGridOption[];
    /** Items per row. Defaults to the number of options, i.e. a single row. */
    columns?: number;
    /**
     * `tile` (default) captions each icon; `swatch` drops the caption for a dense grid of pure
     * pictures — colour chips a name would only clutter — naming each through `aria-label` instead;
     * `icon` drops the tile too, names each in a tooltip and thickens the checked stroke for a 24-unit viewBox.
     */
    itemLayout?: 'tile' | 'swatch' | 'icon';
}

/** A single-choice dropdown, for a set too long or too wordy for a segmented row. */
const Select: ({ options, value, onChange, placeholder, isDisabled, hasError, ariaLabel, ariaLabelledBy, id, }: SelectControlProps) => JSX.Element;

/**
 * Single-choice dropdown, for a set too long or too wordy to sit in a segmented row.
 *
 * The value is nullable so a section can render "nothing chosen yet"; `onChange` only ever fires
 * with a real option, since clearing a required setting is not a gesture the panel offers.
 */
interface SelectControlProps extends Omit<DiscreteControlProps<string | null>, 'onChange'> {
    onChange: (value: string) => void;
    options: readonly ControlOption[];
    placeholder?: string;
    hasError?: boolean;
}

/**
 * A value dragged along a track.
 *
 * The gesture streams through `onChange`, which a section dispatches transiently, and commits through
 * `onCommit` when it ends — so sliding from one end to the other is one undo entry rather than one
 * per frame.
 *
 * A held arrow key is a gesture too. Base UI commits on every keyboard change, which would turn one
 * press-and-hold into an undo entry per auto-repeat, so those commits are swallowed and the run is
 * committed on key up instead — the keyboard's equivalent of releasing the thumb. Blur commits too,
 * for focus leaving mid-hold with no key up ever arriving.
 */
const Slider: ({ value, onChange, onCommit, min, max, step, suffix, formatValue, showValue, isDisabled, ariaLabel, ariaLabelledBy, }: SliderControlProps) => JSX.Element;

interface SliderControlProps extends ContinuousControlProps<number> {
    min: number;
    max: number;
    step?: number;
    /** Unit for the readout beside the track — `px`, `%`, `°`. Without one the readout is the bare number. */
    suffix?: string;
    /** Shows the readout beside the track. Off leaves a bare track, whatever {@link suffix} or {@link formatValue} say. */
    showValue?: boolean;
    /**
     * Formats the readout outright, for a value a unit cannot describe on its own — a thousands
     * separator, a ratio, a named step. Wins over {@link suffix} when both are given.
     */
    formatValue?: (value: number) => string;
}

/** An on/off toggle, for a setting whose whole value is whether it is on. */
const Switch: ({ isChecked, onChange, isDisabled, ariaLabel, ariaLabelledBy, id }: SwitchControlProps) => JSX.Element;

/**
 * An on/off toggle.
 *
 * Named `isChecked` rather than `value`: the state is the whole value, and every flip is its own
 * undo entry, so there is no gesture left to commit.
 */
interface SwitchControlProps extends ControlBaseProps {
    isChecked: boolean;
    onChange: (isChecked: boolean) => void;
}

/**
 * A line of text.
 *
 * Typing fires `onChange` per keystroke and blur fires `onCommit`, so a burst of typing dispatches
 * transiently and commits into one undo entry when the field is left.
 */
const TextField: ({ value, onChange, onCommit, placeholder, isDisabled, hasError, ariaLabel, ariaLabelledBy, id, }: TextFieldControlProps) => JSX.Element;

interface TextFieldControlProps extends ContinuousControlProps<string> {
    placeholder?: string;
    hasError?: boolean;
}

/**
 * A segmented single-choice row.
 *
 * Built on the radio primitive rather than the toggle one, which it resembles more closely by
 * name. Picking one of a fixed set is what a radio group is for, and the primitive is what makes
 * arrow keys move the selection instead of only the focus. Toggle buttons would have given the
 * behaviour of a radio group while announcing itself as something else.
 *
 * That makes this the picture grid in different clothes: same primitive, same contract, same
 * transient run committed on key up. Only the layout differs — a row of words here, a grid of pictures
 * there — which is the whole of why they are two controls.
 */
const ToggleGroup: ({ options, value, onChange, onCommit, itemLayout, hasEqualWidths, isDisabled, ariaLabel, ariaLabelledBy, id, }: ToggleGroupControlProps) => JSX.Element;

/**
 * Single-select segmented control.
 *
 * Continuous, on the same contract as the picture grid, so a section can swap one for the other
 * without changing how it dispatches.
 */
interface ToggleGroupControlProps extends ContinuousControlProps<string> {
    options: readonly ControlOption[];
    /**
     * `inline` (default) lays each option on one line — an icon, a label, or an icon standing in for
     * the label. `stacked` sits the icon above the label in a taller cell, for a row of options read
     * as pictures with a caption.
     */
    itemLayout?: 'inline' | 'stacked';
    /**
     * Gives every option the same width however long its label, which then ellipsises instead of
     * widening its cell. Off, options size to their content.
     */
    hasEqualWidths?: boolean;
}

/**
 * The controls a panel is built from, each replaceable by the host.
 *
 * Sections never reach for a UI library directly — every leaf goes through here, so an app can drop
 * its own design system in without re-authoring a single section. Every member is optional, so
 * adopting the panel is not all-or-nothing and a control added later is additive rather than
 * breaking.
 */
interface ControlRegistry {
    ToggleGroup?: ComponentType<ToggleGroupControlProps>;
    Switch?: ComponentType<SwitchControlProps>;
    Slider?: ComponentType<SliderControlProps>;
    RadioGrid?: ComponentType<RadioGridControlProps>;
    Button?: ComponentType<ButtonControlProps>;
    TextField?: ComponentType<TextFieldControlProps>;
    NumberField?: ComponentType<NumberFieldControlProps>;
    Select?: ComponentType<SelectControlProps>;
    ColorSwatches?: ComponentType<ColorSwatchesControlProps>;
    CustomColor?: ComponentType<CustomColorControlProps>;
}

/** A {@link ControlRegistry} with every member filled in, as sections consume it. */
type ResolvedControlRegistry = Required<ControlRegistry>;

/** The controls the nearest provider resolves, or ours outside any. */
const useControls: () => ResolvedControlRegistry;
```

## Supporting types — @graphysdk/viz-engine

Types referenced by the sections above, included so no name dangles.

```ts
/**
 * Serialized parameters of {@link AddAnnotationCommand}. The id is settled here, so a deserialized
 * command replays to the same spec rather than minting a second annotation.
 */
type AddAnnotationParams<TKind extends AnnotationKind = AnnotationKind> = {
    kind: TKind;
    annotation: AnnotationSpecByKind[TKind];
    index?: number;
};

/**
 * Serialized parameters of {@link AddHighlightCommand}. Every field that determines the appended
 * highlight is resolved, so replaying a deserialized command produces an identical spec.
 */
type AddHighlightParams = {
    /** Match condition evaluated against post-transform columns. */
    predicate: Predicate;
    /** Identity of the appended highlight; {@link RemoveHighlightCommand} targets it. */
    id: string;
    /** Visual unit a match expands to. */
    scope: MatchScope;
    /** Restrict evaluation to a single layer; omit to evaluate against every layer. */
    layerId?: string;
    /** Position to insert at, clamped to the list bounds; appends when omitted. */
    index?: number;
};

/** Serialized parameters of {@link AddLayerCommand}, with the id settled. */
type AddLayerParams = {
    /** The layer to add, resolved — replaying a deserialized command produces an identical spec. */
    layer: ResolvedLayerSpec;
    /** Position in draw order, clamped to the list bounds; appends when omitted. */
    index?: number;
};

/** A row showing one aesthetic's value. */
interface AesTooltipField {
    /** Row label. When omitted, the label is resolved from the mapped variable's friendly name. */
    readonly key?: string;
    readonly aes: string;
    /** Heads the tooltip with this value instead of a row, for geoms without a categorical `x` (a sankey's node). */
    readonly heading?: boolean;
}

/** Name of a built-in aesthetic that can be mapped, such as `'x'` or `'color'`. */
type AestheticKey = keyof KnownAesthetics;

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
 * Anchor work the compiler leaves for the runtime pass because it needs runtime context (panel
 * pixels, text measurement, sibling boxes). An open union.
 */
type AnchorDeferral = PixelOffsetDeferral | AnnotationRefDeferral;

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
 * Bounds of the segment a stack total anchors to, in normalised `[0,1]` panel space (origin
 * bottom-left, y grows up). `direction` records which side of the stack the anchor came from.
 */
interface AnchorSegment {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    direction: 'positive' | 'negative';
}

/**
 * Which `[0, 1]²` space a resolved anchor's `x`/`y` are in — values alone cannot say.
 *
 * - `'panel'`: fractions of the panel rect, data-up.
 * - `'disk'`: fractions of the square the polar disk is inscribed in, data-up.
 */
type AnchorSpace = 'panel' | 'disk';

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
 * An anchor pinned to another annotation's box. The compiler cannot resolve it — text targets are
 * measured in the browser — so it emits placeholder coordinates plus this descriptor, and the runtime
 * pass overwrites them once the target's box is known.
 */
interface AnnotationRefDeferral {
    type: 'annotation-ref';
    /** Explicit id of the target annotation. */
    ref: string;
    /** Which point of the target's box to resolve to; defaulted to `'center'` at compile time. */
    align: AnchorAlign;
    /** Nudge applied after the reference resolves. */
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
 * A transform input that may be built-in or custom. Used at the spec-construction boundary
 * (`pipe`/`createSpec` items, `Spec.transforms`) and the transform compile stage, so a custom
 * transform pipes in and applies through the registry — while {@link TransformSpec} stays the clean
 * built-in union everywhere a `transformType` is narrowed.
 */
type AnyTransformSpec = TransformSpec | CustomTransformSpec<string>;

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

type AxisLimits = ResolvedCoordSpec['params']['xLimits'];

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
 * `valueFormat` — it lives on `SceneAxisGuide`, not per-tick.
 */
interface AxisTick {
    /** Raw value in data space (number, Date, or string) */
    value: DataValue;
    /**
     * Tick position in the same normalized space the geoms use. Normalized to [0,1]: x is 0=left…1=right,
     * y is 0=bottom…1=top (data-up). SVG / top-origin renderers invert y as `1 - y`.
     *
     * For discrete scales this is the band center; the band spans `position ± bandwidth/2`
     * (see {@link SceneAxisGuide.bandwidth}).
     */
    position: number;
}

/**
 * A tick-set candidate for an axis. The runtime picks the densest one whose labels fit. Datetime candidates
 * may carry a `valueFormat` matched to their interval's granularity, overriding the axis-level format.
 */
interface AxisTickCandidate {
    ticks: AxisTick[];
    valueFormat?: ValueFormat;
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

/**
 * How a combo chart draws its series. The bar half's arrangement names the type, since the series
 * drawn last is always the line; `'lines'` keeps the split without the bars, so both halves can still
 * be bound to y axes of their own.
 */
const COMBO_TYPES: readonly ["grouped-bars", "stacked-bars", "lines"];

/** Every {@link CoordType}, for validation and diagnostics. */
const COORD_TYPES: readonly ["cartesian", "polar", "flip"];

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

interface CategoricalValueFormat {
    type: 'text';
}

/** The part of a chart its type owns, restored verbatim by a revert. */
interface ChartTypeState {
    coords: ResolvedCoordSpec;
    layers: ResolvedLayerSpec[];
    scales: ResolvedScaleSpecBase[];
    mapping: AesMapping;
}

/**
 * The facts a chart's type names at once. Under polar `theta` tells a pie from a rose, `position` from
 * a race-track and `innerRadius` from a donut.
 */
type ChartTypeSummary = {
    coordType: 'cartesian' | 'flip';
    geom: GeomName;
    position: PositionAdjustment;
} | {
    coordType: 'polar';
    geom: GeomName;
    position: PositionAdjustment;
    theta: PolarTheta;
    innerRadius: number;
} | ComboChartTypeSummary;

/** The subset of {@link StyleSelect} chrome entries carry, kept compiled so reads filter by partition. */
type ChromeStyleSelect = Extract<StyleSelect, {
    target: ChromeStyleTargetName;
}>;

/**
 * The chart-scoped chrome output of the styles compile — one list pair per target, entries keeping
 * their partition (`edge`, `axis`, `kind`, `annotation`, …) for read-time filtering. The built-in
 * entries sit at the front of `defaults`. `warnings` are re-emitted into the compile diagnostics every
 * compile. Keys are registry roots other than `geom`.
 */
type ChromeStyleTargetName = Exclude<keyof typeof STYLE_TARGETS, 'geom'>;

/**
 * One discrete colour group: its domain value, mapped colour, per-value swatch shape, and the
 * index of the first layer that contributed the value (its "owning" layer in legend/headline
 * terms). Consumers needing the owning layer (per-item formats, aggregations) can read
 * `layerIndex` directly instead of re-walking the layers.
 */
interface ColorGroup {
    value: DataValue;
    color: string;
    /** The owning layer's geom — the renderer reads its swatch shape off the geom's render contract. */
    geom: string;
    layerIndex: number;
    /** Format for the group's `value`, resolved from the owning layer's color column. */
    valueFormat: ValueFormat;
    /** Friendly name for the group's `value`, or `null` when none applies. */
    label: string | null;
}

type ColorInterpolationSpace = (typeof COLOR_INTERPOLATION_SPACES)[number];

/** The light/dark axis a {@link LightDarkColor} resolves against. */
type ColorScheme = 'light' | 'dark';

/** Any named colour scheme accepted by a continuous colour scale. */
type ColorSchemeName = SequentialSchemeName | DivergingSchemeName;

/**
 * A chart drawn as two layers so its halves can differ: bars under a line, or lines throughout. The
 * geoms are the {@link ComboType}'s to name, which is why this arm carries no `geom` of its own.
 */
type ComboChartTypeSummary = {
    coordType: 'cartesian';
    comboType: ComboType;
};

type ComboType = (typeof COMBO_TYPES)[number];

/**
 * Descriptor that knows how to deserialize a specific command type.
 * Each concrete command co-locates its descriptor alongside the command class.
 *
 * Serialization is handled uniformly by the registry via `Command.params`.
 */
interface CommandDescriptor<TParams extends Record<string, unknown> = Record<string, unknown>> {
    readonly type: string;
    deserialize: (params: TParams, metadata: CommandMetadata) => Command;
}

/**
 * Unique identifier for commands.
 */
type CommandId = string;

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

/** A predicate prepared for evaluation on a `Source`. */
type CompiledPredicate<Source = Observation> = (source: Source) => boolean;

/** A compiled color value: token references are inlined at compile; light-dark pairs resolve at read. */
type CompiledStyleColorValue = string | LightDarkColor;

/** The shape a declaration in each domain takes once compiled: tokens inlined, padding per edge. */
interface CompiledStyleDomainValues extends ScalarStyleDomainValues {
    color: CompiledStyleColorValue;
    paint: CompiledStylePaint;
    overlay: CompiledStyleOverlay;
    shadow: StyleShadowValue<CompiledStyleColorValue>;
    padding: Partial<StylePadding>;
    margin: Partial<StylePadding>;
}

/** An overlay once compiled and once resolved: its paints, the first on top; none when empty. */
type CompiledStyleOverlay = readonly CompiledStylePaint[];

type CompiledStylePaint = StylePaint<CompiledStyleColorValue>;

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

/** A slot in the chart's text content. */
type ContentPart = 'title' | 'subtitle' | 'caption' | 'source';

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

/** A single named color slot within a custom palette supplied by the host. */
type CustomPaletteColor = {
    id: string;
    hex: string;
    name?: string;
};

/** Host-owned custom palettes, keyed by `paletteId`, that a `scale.color.palette` may reference by id. */
type CustomPalettes = Record<string, CustomPaletteColor[]>;

/**
 * The input node a custom (plugin-contributed) stat builder produces.
 */
interface CustomStatSpec<Name extends string = string> {
    type: Name;
}

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

/** The type of a variable's values. Internally, numeric values are stored as numbers, dates as Date objects and categorical values as strings. */
type DataType = 'numeric' | 'categorical' | 'temporal';

/** The smallest unit of data in the dataset. `null` represents a missing value. */
type DataValue = number | string | Date | null;

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

interface DatetimeTickInterval {
    unit: DatetimeTickIntervalUnit;
    step: number;
}

type DatetimeTickIntervalUnit = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

/** A vocabulary's declarations at one tier: each property optional, its value in the domain's shape. */
type DeclarationsIn<Vocab extends StyleVocabulary, Tier extends Record<StyleDomain, unknown>> = {
    [Property in keyof Vocab]?: Tier[Extract<Vocab[Property], StyleDomain>];
};

/**
 * Recursively makes every property of `T` optional.
 * Unlike the built-in `Partial`, this applies to nested objects as well.
 */
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends Array<infer U> ? Array<DeepPartial<U>> : unknown extends T[K] ? T[K] : NonNullable<T[K]> extends object ? DeepPartial<NonNullable<T[K]>> : T[K];
};

type DefaultKitGeom = (typeof BUILT_IN_GEOMS)[number];

/** The node every default kind's declaration builds, in the literal types builders and readers derive from. */
type DefaultKitGeomNodes = {
    [Kind in keyof DefaultKitTargets & string]: GeomStyleNodeFor<Kind, DefaultKitTargets[Kind]>;
};

/**
 * The geom root with a child per kind the default tuple registers — the nesting `style.geom.bar` and
 * `readers(scene).geom.bar` read as. It names the kinds a module load knows, so it names fewer as
 * kinds move out of the tuple, and none once the tuple is empty.
 */
type DefaultKitGeomRoot = typeof STYLE_TARGETS.geom & {
    children: DefaultKitGeomNodes;
};

/** The tree with the geom root carrying the kinds the default tuple registers: what a stylesheet addresses. */
type DefaultKitStyleTargets = Omit<typeof STYLE_TARGETS, 'geom'> & {
    geom: DefaultKitGeomRoot;
};

/** The declaration each geom the engine registers by default ships, keyed by the kind it answers to. */
type DefaultKitTargets = {
    [Geom in DefaultKitGeom as Geom['type']]: NonNullable<Geom['styleTarget']>;
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

/** A diverging colormap: its canonical ColorBrewer code or a friendly alias. */
type DivergingSchemeName = (typeof DIVERGING_SCHEME_NAMES)[number] | SchemeAlias;

/** Extra fields an entry on this node may carry. Every entry may also carry a `coord`. */
type EntryOption = 'where' | 'state' | 'layer' | 'annotation';

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

type Flatten<Shape> = {
    [Key in keyof Shape]: Shape[Key];
};

/** Flattened so a derived vocabulary is the same type as one written out by hand. */
type Flatten_2<Shape> = {
    [Key in keyof Shape]: Shape[Key];
};

const GEOM_ENTRY_OPTIONS: readonly ["where", "state", "layer"];

/**
 * Options for `generateTicks`:
 * - `{ count }` — approximate tick count (continuous, datetime).
 * - `{ interval }` — fixed time interval (datetime only).
 * - `{ atInputs: true }` — ticks at the deduped input values (datetime only).
 *
 * Discrete scales ignore options. Unsupported variants on a given scale fall back to defaults.
 */
type GenerateTicksOptions = {
    count: number;
} | {
    interval: DatetimeTickInterval;
} | {
    atInputs: true;
};

/** Output of {@link Geom.compile}: the dataset and mapping after the geom's own reshaping, fed to the next stage. */
interface GeomCompileResult {
    /** The reparameterized dataset (may have new computed variables) */
    data: Dataset;
    /** Any mapping overrides produced by the geom */
    mapping: AesMapping;
}

/** Input to {@link Geom.compile}: the layer's post-stat dataset, effective mapping and geom params. */
interface GeomCompilerInput {
    /** The dataset after stat transformation */
    data: Dataset;
    /** The effective mapping for the layer (may carry the geom's custom positional aesthetics). */
    mapping: AesMapping;
    /** Geom-specific params */
    params: ResolvedLayerSpec['params'];
    /** The active coord type, for geoms whose defaults depend on the band's shape. */
    coordType: CoordType;
}

type GeomKindNodes = GeomRoot['children'];

/** The readers of the geom kinds the registry knows, each typed to its kind's vocabulary and built-in paint. */
type GeomKindReaders = {
    [Kind in keyof GeomKindNodes]: GeomReaderFor<GeomKindNodes[Kind], NodeBacked<GeomKindNodes[Kind], NodeRestKeys<GeomRoot>>>;
};

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

type GeomReaderFor<Node, Backed extends StyleProperty> = GeomStyleReader<ResolvedDeclarations<NodeVocabulary<Node>>, Extract<Backed, keyof NodeVocabulary<Node>>>;

/**
 * The read every geom reader offers, separate from the other methods so a `{ get }` stub typechecks.
 *
 * Without an observation the read answers for the layer as a whole: `where`-scoped entries and the
 * encoding are skipped, so an editing control opens on the layer's declared paint.
 */
interface GeomReaderGet<Resolved extends object, Backed extends keyof Resolved> {
    get: (<Property extends Backed>(property: Property, observation?: Observation, state?: StyleState) => NonNullable<Resolved[Property]>) & (<Property extends keyof Resolved>(property: Property, observation?: Observation, state?: StyleState) => Resolved[Property] | undefined);
}

type GeomRoot = Registry['geom'];

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

/** A layer reader: the read, where it came from, every candidate, and the whole vocabulary at once. */
interface GeomStyleReader<Resolved extends object = ResolvedStyleDeclarations, Backed extends keyof Resolved = never> extends GeomReaderGet<Resolved, Backed> {
    getSource: (property: keyof Resolved, observation?: Observation, state?: StyleState) => StyleResolutionTier;
    explain: <Property extends keyof Resolved & StyleProperty>(property: Property, observation?: Observation, state?: StyleState) => StyleExplanation<Property>;
    /** Every applicable declaration of `property`, defaults then overrides, in list order. */
    collectAll: <Property extends keyof Resolved & StyleProperty>(property: Property, observation?: Observation, state?: StyleState) => Array<NonNullable<Resolved[Property]>>;
    resolve: (observation?: Observation, state?: StyleState) => ResolvedRecord<Resolved, Backed>;
    /**
     * Only what `state` entries declare. Entries without a state and the data tier are not read, so a
     * layer can draw the result over geoms already painted at rest.
     */
    resolveState: (state: StyleState, observation?: Observation) => Partial<Resolved>;
    /**
     * Readers for one part of the layer's mark beside its observations, or `undefined` when the kind
     * declares no such part. The tree types every part the registry names; a plugin kind's are reachable
     * by name alone.
     */
    part: (name: string) => GeomStyleReader | undefined;
}

/**
 * Style readers for a layer of unknown kind, such as a plugin geom. Any geom property may resolve, but
 * only the shared paint the geom root backs is guaranteed to.
 */
type GeomStyleReaders = GeomStyleReader<ResolvedDeclarations<GeomVocabulary>, GeomRoot extends {
    acceptsUnknownKinds: true;
} ? NodeBacked<GeomRoot, never> : never>;

/**
 * Per-layer aggregate summaries a geom opts into. Read by the summarize stage (which gates the
 * grand-total / stack-total summarizers) and the headline guide (per-group eligibility), so the
 * behavior follows what a geom declares rather than its name.
 */
interface GeomSummaries {
    /** Emit a layer-wide grand total over `y` (the figure a polar headline shows). */
    grandTotal?: boolean;
    /** Emit per-x stack totals for a stacked layer. */
    stackTotals?: boolean;
    /** Eligible to carry a per-group headline strip. */
    perGroupHeadline?: boolean;
}

/** Every property any geom kind declares, each with the domains it takes across the kinds. */
type GeomVocabulary = {
    [Property in KeysOfUnion<NodeVocabularies_2<GeomRoot>> & StyleProperty]: NodeVocabularies_2<GeomRoot> extends infer Vocab ? Vocab extends Record<Property, infer Domain extends StyleDomain> ? Domain : never : never;
};

type GraphyPaletteSpec = {
    type: 'graphy';
    variant?: GraphyPaletteVariant;
};

/** `waterfall` swaps in the positive/negative/total colors used by waterfall graphs. */
type GraphyPaletteVariant = 'default' | 'waterfall';

/**
 * Axes a grid command writes. `both` is one command under one edit target, so a drag over the whole
 * grid folds into a single undo entry rather than one per axis per frame.
 */
type GridAxisTarget = AxisKey | 'both';

/** A geom's per-coord grid/border visibility overrides, applied by the axes guide. */
interface GridPolicy {
    hideGridX?: boolean;
    hideGridY?: boolean;
    hideBorder?: boolean;
}

/** Geometric shape an axis traces: a straight line, a full circle or a spoke from the centre. */
type GuideGeometry = 'linear' | 'circular' | 'radial';

/**
 * Raw main-axis caption a headline item carries. A `point` (the current observation's main value) or
 * a `range` (first → last span on total/average over a datetime axis). The renderer formats the values.
 */
type HeadlineCaption = {
    kind: 'point';
    value: DataValue;
} | {
    kind: 'range';
    from: DataValue;
    to: DataValue;
};

/**
 * Comparison reference for trend indicator
 * - 'previous': Compare to preceding data point
 * - 'first': Compare to initial value in series
 * - 'none': No comparison indicator
 */
type HeadlineCompareWith = 'previous' | 'first' | 'none';

/** A trend: how the current value moved relative to a reference observation. */
interface HeadlineComparison {
    /** Signed relative change `(current − reference) / reference`. */
    variation: number;
    /** Main-axis value of the reference observation. */
    against: DataValue;
}

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

interface HeadlineGroupSwatch {
    color: string;
    /** The owning layer's geom — the renderer reads its swatch shape off the geom's render contract. */
    geom: string;
    /** Owning layer id, so the renderer can read that layer's stylesheet. */
    layerId?: string;
    /** Colour-group domain value this swatch stands for — picks the group's first observation. */
    value?: DataValue;
}

interface HeadlineItem {
    /** Group identity — the color/group domain value; null for a single undifferentiated group. */
    value: DataValue | null;
    /** Swatch visual — present only when there are ≥2 groups. */
    swatch: HeadlineGroupSwatch | null;
    /** The reduced figure; null when the group has no numeric values. */
    aggregate: number | null;
    /** Format for the reduced figure (the owning layer's measure format). */
    valueFormat: ValueFormat;
    /** Format for turning this item's group `value` into a name (the owning layer's color format). */
    groupLabelFormat: ValueFormat;
    /** Format for the main-axis values this item carries (caption, comparison `against`). */
    mainValueFormat: ValueFormat;
    /** Display name: the group's value label when grouped, else the measure variable's label; null when neither applies. */
    label: string | null;
    /** Raw main-axis caption for the item; null when none applies. The renderer formats it. */
    caption: HeadlineCaption | null;
    /** Trend against a reference observation; null unless a datetime main axis and a comparison are configured. */
    comparison: HeadlineComparison | null;
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

/** A highlight as it is about to be created: everything about it except its identity. */
type HighlightCandidate = Omit<ResolvedHighlightSpec, 'type' | 'id'>;

/** Per-layer side-channel produced by the highlights compile stage. */
interface HighlightComposition {
    /** True when the base render should be wrapped in a dim group (so matched observations stand out). */
    isDimmed: boolean;
    /**
     * A real sub-`SceneLayer` whose dataset is mask-filtered to just the matched observations
     * (everything else identical to the source layer). Feed it back through the same geom renderer to
     * draw the highlighted geoms at full strength; `null` when no re-render pass applies.
     */
    matchedLayer: SceneLayer | null;
    /** Observations to paint as overlay markers under `'overlay-anchor'`. Empty for other strategies. */
    overlayCandidates: HighlightOverlayCandidate[];
}

/** Observation that qualifies for an overlay marker (`'overlay-anchor'` dot + value label). */
interface HighlightOverlayCandidate {
    observation: Observation;
    /**
     * Observation index into the source layer's dataset.
     */
    observationIndex: number;
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

interface HighlightsAtObservationInput {
    /** The layer the observation belongs to; a highlight scoped to another one never covers it. */
    layer: SceneLayer;
    /** The spec's highlights, in paint order. */
    highlights: readonly ResolvedHighlightSpec[];
    /** The observation being asked about — the one under the pointer. */
    observation: Observation;
    /** The locale predicate values are parsed against, as the highlights stage parses them. */
    parsingLocale: Locale;
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

type KeysOfUnion<Union> = Union extends unknown ? keyof Union : never;

/** {@link KindedAnnotation} narrowed to one kind, so a patch can be typed against it. */
type KindedAnnotationOf<TKind extends AnnotationKind> = {
    kind: TKind;
    annotation: AnnotationSpecByKind[TKind];
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

/** Optional per-layer aggregates the summarizer emits for label rendering. Fields are present only when the layer's geom calls for them. */
interface LayerSummary {
    /** Per-x stack totals — one entry per x. */
    stackTotals?: StackTotalEntry[];
    /** Plain signed sum of y across observations (negatives reduce it). Emitted for grouped bars and pie/donut. */
    grandTotal?: number;
    /** Sum of |y| across observations — the percentage-share denominator. Emitted for grouped bars and pie/donut. */
    absoluteGrandTotal?: number;
}

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
    /**
     * Owning layer id, when the partition resolved an owner. The renderer reads that layer's
     * stylesheet so the swatch matches the geom.
     */
    layerId?: string;
}

/**
 * Visual values produced by a legend's scales, keyed by aesthetic.
 */
interface LegendItemVisual {
    color?: string;
    /**
     * Symbol diameter in pixels, present on bubble legends (see {@link SceneLegendGuide.aesthetics}). Render a
     * sized circle rather than a swatch; skip the item when this is non-finite or ≤ 0.
     */
    size?: DataValue;
    alpha?: DataValue;
    strokeWidth?: DataValue;
    /** Stroke style for `line` / `area` swatches only (solid/dashed/dotted). Other swatch shapes ignore it. */
    lineType?: LineType;
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

/** A color with one variant per {@link ColorScheme}, resolved against the active scheme at read time. */
interface LightDarkColor {
    light: string;
    dark: string;
}

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

/** One of the BCP-47 locale strings the engine supports for number and date formatting. */
type Locale = (typeof LOCALES)[number];

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

/** The hues available as a base for monochrome palettes, in pick order. */
const MONO_BASES: readonly ["brick", "gray", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"];

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

/** Serialized parameters of {@link MoveAnnotationCommand}. */
type MoveAnnotationParams = {
    /** Identity of the annotation to move, unique across every bucket. */
    id: string;
    /** How far to move it. Clamped inside the panel on apply, so a caller may ask for more than fits. */
    translation: PanelTranslation;
};

/** The hues available as a base for neon palettes, in pick order. */
const NEON_BASES: readonly ["cyan", "pink", "purple", "red", "orange", "yellow", "green", "blue"];

/** One of the base hues a neon palette can be built from. */
type NeonPaletteBase = (typeof NEON_BASES)[number];

type NeonPaletteSpec = {
    type: 'neon';
    base: NeonPaletteBase;
    variant?: NeonPaletteVariant;
};

/** `waterfall` swaps in the positive/negative/total colors used by waterfall graphs. */
type NeonPaletteVariant = 'default' | 'waterfall';

/** The properties the built-in stylesheet backs on a node: inherited and own `rest`, within the vocabulary. */
type NodeBacked<Node, Inherited extends StyleProperty> = Extract<Inherited | NodeRestKeys<Node>, keyof NodeVocabulary<Node>>;

type NodeRestKeys<Node> = Node extends {
    rest: infer Rest;
} ? Extract<keyof Rest, StyleProperty> : never;

type NodeVocabularies<Node> = (Node extends {
    vocabulary: infer Vocab extends StyleVocabulary;
} ? Vocab : never) | (Node extends {
    children: infer Children extends Record<string, unknown>;
} ? {
    [Key in keyof Children]: NodeVocabularies<Children[Key]>;
}[keyof Children] : never);

type NodeVocabularies_2<Node> = NodeVocabulary<Node> | (Node extends {
    children: infer Children extends Record<string, unknown>;
} ? {
    [Key in keyof Children]: NodeVocabularies_2<Children[Key]>;
}[keyof Children] : never);

type NodeVocabulary<Node> = Node extends {
    vocabulary: infer Vocab extends StyleVocabulary;
} ? Vocab : never;

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

/**
 * One observation, a whole series, or every observation sharing an x value. The same `predicate` and
 * `scope` a highlight carries, so the breadth is stated in the type and the selection and the paint speak
 * one vocabulary.
 */
interface ObservationsTarget {
    kind: 'observations';
    layerId: string;
    scope: MatchScope;
    predicate: Predicate;
    /**
     * The row of `layer.data` a `data-point` target was pressed on, telling it apart from rows holding the same
     * values. A recompile can move rows, so the target takes that row only while the predicate still matches it,
     * and every match otherwise. Ignored at other scopes.
     */
    observationIndex?: number;
}

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

/** A pair of panel fractions: an anchor's own position, or a corner of a region. */
interface PanelPoint {
    x: number;
    y: number;
}

type PartsOf<Target> = Target extends {
    parts: infer Parts;
} ? Parts : Record<never, never>;

type PastelPaletteSpec = {
    type: 'pastel';
    variant?: PastelPaletteVariant;
};

/** `waterfall` swaps in the positive/negative/total colors used by waterfall graphs. */
type PastelPaletteVariant = 'default' | 'waterfall';

/** One value for the axes named, or one per axis — what a `both` revert needs, the two being writable apart. */
type PerAxisValue<T> = T | Readonly<Record<AxisKey, T>>;

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
 * A pixel nudge.
 */
interface PixelOffsetDeferral {
    type: 'px-offset';
    /** Horizontal nudge in device pixels, rightward positive. */
    x: number;
    /** Vertical nudge in device pixels, downward positive (top-left space). */
    y: number;
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

type PropertyDomainMap = {
    [Property in StyleProperty]: RegistryVocabularies extends infer Vocab ? Vocab extends Record<Property, infer Domain extends StyleDomain> ? Domain : never : never;
};

/** The domains a property takes across the registry: `cornerRadius` is `'barRadius' | 'pixels'`. */
type PropertyDomains<Property extends StyleProperty> = PropertyDomainMap[Property];

/**
 * Where a data label sits relative to the geom or stack it decorates, independent of its role.
 *
 * - `inside` — over the geom.
 * - `outside` — past the geom's edge; labels on zero-extent anchors (line points, markers) always
 *   read as outside.
 */
const RESOLVED_DATA_LABEL_POSITIONS: readonly ("inside" | "outside")[];

/** The range between two aesthetics, each end formatted by its own variable (an error bar's `10.5 – 13.5`). */
interface RangeTooltipField {
    /** Row label. When omitted, the observation's colour group, else the `y` variable's label. */
    readonly key?: string;
    readonly range: readonly [from: string, to: string];
    /** Heads the tooltip with this range instead of a row. */
    readonly heading?: boolean;
}

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

type Registry = DefaultKitStyleTargets;

/** Every vocabulary in the registry, computed once so the per-property lookups below are cheap. */
type RegistryVocabularies = NodeVocabularies<DefaultKitStyleTargets[keyof DefaultKitStyleTargets]>;

/** Serialized parameters of {@link RemoveAnnotationCommand}. */
type RemoveAnnotationParams = {
    /** Identity of the annotation to remove, unique across every bucket. */
    id: string;
};

/** Serialized parameters of {@link RemoveHighlightCommand}. */
type RemoveHighlightParams = {
    /** Identity of the highlight to remove. */
    id: string;
};

/** Serialized parameters of {@link RemoveLayerCommand}. */
type RemoveLayerParams = {
    /** Identity of the layer to remove. */
    layerId: string;
};

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

/** Resolved annotations for a graph, with all fields defaulted. */
interface ResolvedAnnotationsSpec {
    differenceArrows: ResolvedDifferenceArrowSpec[];
    shapes: ResolvedShapeSpec[];
    arrows: ResolvedArrowSpec[];
    textAnnotations: ResolvedTextAnnotationSpec[];
    images: ResolvedImageAnnotationSpec[];
    stickers: ResolvedStickerAnnotationSpec[];
    pinnedNumbers: ResolvedPinnedNumberAnnotationSpec[];
    comments: ResolvedCommentAnnotationSpec[];
}

/** Resolved arrow with all optional fields defaulted. */
interface ResolvedArrowSpec {
    id: string;
    start: ResolvedPointAnchorSpec;
    end: ResolvedPointAnchorSpec;
    startArrowheadStyle: ArrowheadStyle;
    endArrowheadStyle: ArrowheadStyle;
}

interface ResolvedCartesianCoordSpec {
    type: 'coord';
    coordType: 'cartesian';
    params: BaseCoordParams;
}

interface ResolvedCommentAnnotationSpec {
    id: string;
    at: ResolvedObservationAnchorSpec;
    content: RichTextContent;
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

type ResolvedContinuousScaleSpec = Required<ContinuousScaleSpec>;

/**
 * Discriminated union of all resolved coordinate specs (params fully defaulted).
 */
type ResolvedCoordSpec = ResolvedCartesianCoordSpec | ResolvedFlipCoordSpec | ResolvedPolarCoordSpec;

/** A resolved layer spec for a custom geom — the {@link CustomGeomLayerSpec} counterpart. */
interface ResolvedCustomGeomLayerSpec extends ResolvedLayerSpecBase {
    geom: string;
    params: Record<string, unknown>;
}

type ResolvedCustomPaletteSpec = {
    type: 'custom';
    id: string;
    colors: string[];
};

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

type ResolvedDatetimeScaleSpec = Required<DatetimeScaleSpec>;

/** What a read of a node yields: its vocabulary's properties in their resolved shapes. */
type ResolvedDeclarations<Vocab extends StyleVocabulary> = DeclarationsIn<Vocab, ResolvedStyleDomainValues>;

/**
 * Resolved difference-arrow spec with all optional fields defaulted.
 */
interface ResolvedDifferenceArrowSpec {
    id: string;
    start: ResolvedObservationAnchorSpec;
    end: ResolvedObservationAnchorSpec;
    label: DifferenceArrowLabelKind;
    labelCrossPosition: number;
}

type ResolvedDiscreteScaleSpec = Required<DiscreteScaleSpec>;

interface ResolvedFlipCoordSpec {
    type: 'coord';
    coordType: 'flip';
    params: BaseCoordParams;
}

/**
 * Resolved highlight. `id` is always present, `scope` is always set (defaults
 * to `'data-point'`), and the layer scope is carried as the targeted layer's
 * stable `layerId` (or omitted when unscoped).
 */
interface ResolvedHighlightSpec {
    type: 'highlight';
    id: string;
    predicate: Predicate;
    scope: MatchScope;
    layerId?: string;
}

type ResolvedIdentityScaleSpec = IdentityScaleSpec;

/** Resolved image annotation with all optional fields defaulted. */
interface ResolvedImageAnnotationSpec {
    id: string;
    src: string;
    zOrder: AnnotationZOrder;
    region: ResolvedRegionAnchorSpec;
    fit: ImageAnnotationFit;
}

/**
 * Discriminated union of all resolved layer specs, keyed on `geom`.
 * All properties are fully resolved — no optionals.
 */
type ResolvedLayerSpec = {
    [G in GeomName]: ResolvedLayerSpecFor<G>;
}[GeomName] | ResolvedCustomGeomLayerSpec;

interface ResolvedLayerSpecBase {
    type: 'layer';
    id: string;
    mapping: AesMapping;
    stat: ResolvedStatSpec;
    position: PositionAdjustment;
    yScaleType: YScaleType;
    transforms: TransformSpec[];
    interactive: boolean;
    tooltip: LayerTooltipSpec;
    dataLabels: ResolvedDataLabelsSpec;
}

type ResolvedLayerSpecFor<G extends GeomName> = ResolvedLayerSpecBase & {
    geom: G;
    params: GeomParamsMap[G];
};

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
 * Resolved observation reference, scoped to a layer by its stable `layerId` (or unscoped).
 *
 * An observation reference survives as long as the dataset preserves its address: the anchor value plus
 * whatever the layer's geom narrows by — the group it belongs to, the cross axis telling apart the
 * observations sharing its main-axis value.
 */
interface ResolvedObservationAnchorSpec {
    /** Stable id of the layer this reference is scoped to, when set. */
    layerId?: string;
    /** Value on the main axis (x in cartesian, y in flipped). */
    anchorValue: DataValue;
    /** The group value to match if any, otherwise match any group. */
    groupValue?: DataValue;
    /** Value on the cross axis, as on {@link ObservationAnchorSpec}. */
    crossValue?: DataValue;
    /** Which point of the matched geom's box to resolve to. Omitted means the geom-natural point. */
    align?: AnchorAlign;
}

/**
 * A point resolved from an observation.
 */
interface ResolvedObservationPoint extends ResolvedPoint {
    anchor: ResolvedObservationAnchorSpec;
    geom: string;
    measurementValue: number;
    valueFormat: ExplicitValueFormat;
    yScaleType: YScaleType;
    observationIndex: number;
}

type ResolvedOverlay = readonly ResolvedPaint[];

type ResolvedPaint = StylePaint<string>;

/** Resolved palette overrides: group number (1-indexed) to a concrete hex color. */
type ResolvedPaletteOverridesSpec = Record<number, string>;

/** Resolved palette color scale with a concrete palette config. */
interface ResolvedPaletteScaleSpec {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'palette';
    palette: ResolvedPaletteSpec;
    overrides?: ResolvedPaletteOverridesSpec;
}

/** Resolved palette selector; a custom palette carries its looked-up `colors`. */
type ResolvedPaletteSpec = DefaultPaletteSpec | GraphyPaletteSpec | PastelPaletteSpec | NeonPaletteSpec | MonoPaletteSpec | ResolvedCustomPaletteSpec;

/** Resolved pinned-number annotation with all optional fields defaulted. */
interface ResolvedPinnedNumberAnnotationSpec {
    id: string;
    at: ResolvedObservationAnchorSpec;
}

/**
 * A point anchor projected into a normalized `[0, 1]²` space, named by `space`.
 *
 * The optional fields are set only for points resolved from an observation; kinds that need them
 * carry the narrower {@link ResolvedObservationPoint}.
 */
interface ResolvedPoint {
    x: number;
    y: number;
    /** Absent means `'panel'` — the space every cartesian anchor is in. */
    space?: AnchorSpace;
    /** The geom name the anchored observation belongs to, so the renderer can offset the anchor to fit that geom's shape. */
    geom?: string;
    /** Raw value of the y-aesthetic (or x-aesthetic when flipped), used by label formatting. */
    measurementValue?: number;
    /** Value format for `measurementValue`, read from the source layer — coord-system independent. */
    valueFormat?: ValueFormat;
    /**
     * The row the point was resolved from, in the data of the layer its anchor names. Derived like the
     * coordinates beside it: re-counted every compile, never an address an annotation is stored by.
     */
    observationIndex?: number;
    /**
     * Present only when the runtime pass still has work to do
     * (e.g. a px  offset).
     */
    defer?: AnchorDeferral;
}

/** Resolved point anchor: an observation anchor carries the targeted layer's stable `layerId`. */
type ResolvedPointAnchorSpec = {
    anchorType: 'panel';
    x: number;
    y: number;
    offset?: AnchorOffset;
} | {
    anchorType: 'observation';
    layerId?: string;
    anchorValue: DataValue;
    groupValue?: DataValue;
    crossValue?: DataValue;
    align?: AnchorAlign;
    offset?: AnchorOffset;
} | AxisAnchor | SelectionPointAnchor | AnnotationPointAnchor;

interface ResolvedPolarCoordSpec {
    type: 'coord';
    coordType: 'polar';
    params: PolarCoordParams;
}

/** A node's snapshot: the backed properties present, the rest of its vocabulary optional. */
type ResolvedRecord<Resolved, Backed extends keyof Resolved> = Flatten<Required<Pick<Resolved, Backed>> & Omit<Resolved, Backed>>;

/**
 * A region anchor projected into a normalized `[0, 1]²` space, data-up (`y` is the region's **bottom**
 * edge). `space` names which square, as on {@link ResolvedPoint}.
 */
interface ResolvedRegion {
    x: number;
    y: number;
    width: number;
    height: number;
    space?: AnchorSpace;
    defer?: AnchorDeferral;
}

/** Resolved region anchor. */
type ResolvedRegionAnchorSpec = {
    anchorType: 'panel';
    x: number;
    y: number;
    width: number;
    height: number;
} | SelectionRegionAnchor | AnnotationRegionAnchor;

/**
 * A resolved scale, plus the `inferred` input it came from when the type was not authored.
 * Recompile uses `inferredFrom` to re-run inference once the first rows arrive, without a
 * parallel list of aesthetic keys on the spec.
 */
type ResolvedScaleSpec = ResolvedScaleSpecBase & {
    inferredFrom?: InferredScaleSpec;
};

/**
 * Union of scale specs that can appear after resolution (all fields required).
 * InferredScaleSpec is resolved to a concrete type during spec resolution.
 */
type ResolvedScaleSpecBase = ResolvedContinuousScaleSpec | ResolvedDiscreteScaleSpec | ResolvedDatetimeScaleSpec | ResolvedIdentityScaleSpec | ResolvedPaletteScaleSpec;

/** Resolved shape annotation with all optional fields defaulted. */
interface ResolvedShapeSpec {
    id: string;
    kind: ShapeKind;
    zOrder: AnnotationZOrder;
    region: ResolvedRegionAnchorSpec;
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
 * Fully resolved spec — all fields populated, defaults applied, inferred types resolved.
 * This is what the compilation pipeline consumes.
 *
 * @example
 * ```ts
 * const spec = pipe(
 *   createSpec({ x: 'date', y: 'revenue', color: 'region' }),
 *   geom.bar(),
 * );
 * const resolved = resolveSpec(container, { ...spec, data: dataset }, customPalettes);
 *
 * // resolved.layers   → at least one layer with resolved geom params, stat, and position
 * // resolved.scales   → concrete scale types (no 'inferred'), all defaults filled
 * // resolved.coords   → coordinate system with fully defaulted params
 * // resolved.config   → axes, legend, headline, panel, numberFormat with defaults
 * ```
 */
interface ResolvedSpec {
    /** The dataset backing the visualization. */
    data: Dataset;
    /** Global aesthetic mappings (data columns → visual channels). */
    mapping: AesMapping;
    /** Geometry layers to render. Each layer has resolved geom, stat, position, and params. */
    layers: ResolvedLayerSpec[];
    /** Resolved scale specs — one per aesthetic, all defaults filled, no 'inferred' types remaining. */
    scales: ResolvedScaleSpec[];
    /** Data transforms applied to `data` before layer compilation. */
    transforms: AnyTransformSpec[];
    /** Predicate-driven highlights with ids assigned and any `layerId` checked against `layers`. */
    highlights: ResolvedHighlightSpec[];
    /** Authored stylesheet, both lists present. The styles compile stage prepends the built-in stylesheet. */
    styles: ResolvedStylesheetSpec;
    /** Annotation overlays (difference arrows, etc.) with optional fields defaulted. */
    annotations: ResolvedAnnotationsSpec;
    /** Coordinate system (cartesian, flip, or polar) with fully defaulted params. */
    coords: ResolvedCoordSpec;
    /** Chart configuration: axes, legend, headline, panel, number formatting. */
    config: ResolvedConfigSpec;
}

/**
 * Discriminated union of all resolved stat specs (post-resolution).
 */
type ResolvedStatSpec = IdentityStatSpec | CountStatSpec | ResolvedSmoothStatSpec | MeanStatSpec | SumStatSpec | ResolvedSummaryStatSpec;

/** Resolved sticker annotation with all optional fields defaulted. */
interface ResolvedStickerAnnotationSpec {
    id: string;
    at: ResolvedPointAnchorSpec;
    sticker: StickerId;
}

/**
 * The declarations shape after resolution: every color is a single CSS color — light-dark pairs picked
 * for the active scheme, token references already inlined by the compile stage.
 */
type ResolvedStyleDeclarations = StyleDeclarationsFor<ResolvedStyleDomainValues>;

/** The shape a declaration in each domain takes once read: every color is one CSS string. */
interface ResolvedStyleDomainValues extends ScalarStyleDomainValues {
    color: string;
    paint: ResolvedPaint;
    overlay: ResolvedOverlay;
    shadow: StyleShadowValue<string>;
    padding: Partial<StylePadding>;
    margin: Partial<StylePadding>;
}

/** Resolved stylesheet: the token table and the authored lists, all present. */
interface ResolvedStylesheetSpec {
    tokens: StyleTokenTable;
    defaults: StyleRule[];
    overrides: StyleRule[];
}

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

/** Resolved text annotation with all optional fields defaulted. */
interface ResolvedTextAnnotationSpec {
    id: string;
    content: RichTextContent;
    at: ResolvedPointAnchorSpec;
    width: number;
    align: AnchorAlign;
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

const STYLE_TARGETS: {
    readonly geom: {
        readonly select: {
            readonly target: "geom";
        };
        readonly vocabulary: {
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
        readonly options: readonly ["where", "state", "layer"];
        readonly aesthetics: {
            readonly fill: "color";
            readonly stroke: "color";
            readonly alpha: "alpha";
        };
        readonly rest: {
            readonly alpha: 1;
            readonly strokeAlpha: 1;
            readonly shadow: "none";
            readonly blendMode: "normal";
        };
        readonly dimmed: {
            readonly alpha: 0.4;
        };
        readonly hovered: {
            readonly shadow: {
                readonly offsetX: 0;
                readonly offsetY: 2;
                readonly blur: 4;
                readonly color: "rgba(14, 14, 52, 0.12)";
            };
        };
        readonly acceptsUnknownKinds: true;
    };
    readonly panelBorder: {
        readonly select: {
            readonly target: "panelBorder";
        };
        readonly vocabulary: {
            readonly cornerRadius: "pixels";
            readonly stroke: "color";
            readonly strokeWidth: "pixels";
            readonly dashArray: "dashArray";
        };
        readonly rest: {
            readonly dashArray: readonly [2, 3];
            readonly cornerRadius: 6;
            readonly stroke: StyleTokenRef;
            readonly strokeWidth: 1;
        };
        readonly children: {
            readonly top: {
                readonly select: {
                    readonly target: "panelBorder";
                    readonly edge: "top";
                };
                readonly vocabulary: {
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly dashArray: "dashArray";
                };
            };
            readonly right: {
                readonly select: {
                    readonly target: "panelBorder";
                    readonly edge: "right";
                };
                readonly vocabulary: {
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly dashArray: "dashArray";
                };
            };
            readonly bottom: {
                readonly select: {
                    readonly target: "panelBorder";
                    readonly edge: "bottom";
                };
                readonly vocabulary: {
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly dashArray: "dashArray";
                };
            };
            readonly left: {
                readonly select: {
                    readonly target: "panelBorder";
                    readonly edge: "left";
                };
                readonly vocabulary: {
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly dashArray: "dashArray";
                };
            };
        };
    };
    readonly gridLine: {
        readonly select: {
            readonly target: "gridLine";
        };
        readonly vocabulary: {
            readonly stroke: "color";
            readonly strokeWidth: "pixels";
            readonly dashArray: "dashArray";
        };
        readonly children: {
            readonly x: {
                readonly select: {
                    readonly target: "gridLine";
                    readonly axis: "x";
                };
                readonly vocabulary: {
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly dashArray: "dashArray";
                };
                readonly rest: {
                    readonly dashArray: readonly [2, 3];
                    readonly strokeWidth: 0;
                    readonly stroke: StyleTokenRef;
                };
            };
            readonly y: {
                readonly select: {
                    readonly target: "gridLine";
                    readonly axis: "y";
                };
                readonly vocabulary: {
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly dashArray: "dashArray";
                };
                readonly rest: {
                    readonly dashArray: readonly [2, 3];
                    readonly stroke: StyleTokenRef;
                    readonly strokeWidth: 1;
                };
            };
        };
    };
    readonly tickLine: {
        readonly select: {
            readonly target: "tickLine";
        };
        readonly vocabulary: {
            readonly length: "pixels";
            readonly stroke: "color";
            readonly strokeWidth: "pixels";
            readonly dashArray: "dashArray";
        };
        readonly rest: {
            readonly strokeWidth: 0;
            readonly length: 0;
        };
        readonly children: {
            readonly x: {
                readonly select: {
                    readonly target: "tickLine";
                    readonly axis: "x";
                };
                readonly vocabulary: {
                    readonly length: "pixels";
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly dashArray: "dashArray";
                };
            };
            readonly y: {
                readonly select: {
                    readonly target: "tickLine";
                    readonly axis: "y";
                };
                readonly vocabulary: {
                    readonly length: "pixels";
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly dashArray: "dashArray";
                };
            };
        };
    };
    readonly axisLabel: {
        readonly select: {
            readonly target: "axisLabel";
        };
        readonly vocabulary: {
            readonly margin: "margin";
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
        readonly rest: {
            readonly textColor: StyleTokenRef;
            readonly fontSize: 11.5;
            readonly fontWeight: 500;
            readonly lineHeight: 1;
        };
        readonly children: {
            readonly top: {
                readonly select: {
                    readonly target: "axisLabel";
                    readonly edge: "top";
                };
                readonly vocabulary: {
                    readonly margin: "margin";
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
                readonly rest: {
                    readonly margin: {
                        readonly bottom: 8;
                    };
                };
            };
            readonly bottom: {
                readonly select: {
                    readonly target: "axisLabel";
                    readonly edge: "bottom";
                };
                readonly vocabulary: {
                    readonly margin: "margin";
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
                readonly rest: {
                    readonly margin: {
                        readonly top: 4;
                        readonly bottom: 16;
                    };
                };
            };
            readonly left: {
                readonly select: {
                    readonly target: "axisLabel";
                    readonly edge: "left";
                };
                readonly vocabulary: {
                    readonly margin: "margin";
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
            };
            readonly right: {
                readonly select: {
                    readonly target: "axisLabel";
                    readonly edge: "right";
                };
                readonly vocabulary: {
                    readonly margin: "margin";
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
            };
            readonly x: {
                readonly select: {
                    readonly target: "axisLabel" | "tickLabel";
                    readonly axis: "x";
                };
                readonly vocabulary: {
                    readonly margin: "margin";
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
            };
            readonly y: {
                readonly select: {
                    readonly target: "axisLabel" | "tickLabel";
                    readonly axis: "y";
                };
                readonly vocabulary: {
                    readonly margin: "margin";
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
            };
        };
    };
    readonly tickLabel: {
        readonly select: {
            readonly target: "tickLabel";
        };
        readonly vocabulary: {
            readonly offset: "pixels";
            readonly margin: "margin";
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
        readonly rest: {
            readonly textColor: StyleTokenRef;
            readonly offset: 10;
            readonly textOutlineColor: StyleTokenRef;
            readonly textOutlineWidth: 1;
            readonly fontSize: 11.5;
            readonly fontWeight: 500;
            readonly lineHeight: 1;
        };
        readonly children: {
            readonly top: {
                readonly select: {
                    readonly target: "tickLabel";
                    readonly edge: "top";
                };
                readonly vocabulary: {
                    readonly offset: "pixels";
                    readonly margin: "margin";
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
            };
            readonly bottom: {
                readonly select: {
                    readonly target: "tickLabel";
                    readonly edge: "bottom";
                };
                readonly vocabulary: {
                    readonly offset: "pixels";
                    readonly margin: "margin";
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
            };
            readonly left: {
                readonly select: {
                    readonly target: "tickLabel";
                    readonly edge: "left";
                };
                readonly vocabulary: {
                    readonly offset: "pixels";
                    readonly margin: "margin";
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
                readonly rest: {
                    readonly offset: 14;
                };
            };
            readonly right: {
                readonly select: {
                    readonly target: "tickLabel";
                    readonly edge: "right";
                };
                readonly vocabulary: {
                    readonly offset: "pixels";
                    readonly margin: "margin";
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
                readonly rest: {
                    readonly offset: 14;
                };
            };
            readonly x: {
                readonly select: {
                    readonly target: "axisLabel" | "tickLabel";
                    readonly axis: "x";
                };
                readonly vocabulary: {
                    readonly offset: "pixels";
                    readonly margin: "margin";
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
            };
            readonly y: {
                readonly select: {
                    readonly target: "axisLabel" | "tickLabel";
                    readonly axis: "y";
                };
                readonly vocabulary: {
                    readonly offset: "pixels";
                    readonly margin: "margin";
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
            };
        };
    };
    readonly dataLabel: {
        readonly select: {
            readonly target: "dataLabel";
        };
        readonly vocabulary: {
            readonly paddingInline: "pixels";
            readonly paddingBlock: "pixels";
            readonly fill: "paint";
            readonly stroke: "color";
            readonly strokeWidth: "pixels";
            readonly cornerRadius: "boxRadius";
            readonly shadow: "shadow";
            readonly alpha: "unitInterval";
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
        readonly rest: {
            readonly textColor: StyleTokenRef;
            readonly paddingInline: 6;
            readonly paddingBlock: 2;
            readonly cornerRadius: 4;
            readonly fontSize: 11.5;
            readonly fontWeight: 500;
            readonly lineHeight: 1;
        };
        readonly children: {
            readonly aggregate: {
                readonly select: {
                    readonly target: "dataLabel";
                    readonly role: "aggregate";
                };
                readonly vocabulary: {
                    readonly paddingInline: "pixels";
                    readonly paddingBlock: "pixels";
                    readonly fill: "paint";
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly cornerRadius: "boxRadius";
                    readonly shadow: "shadow";
                    readonly alpha: "unitInterval";
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
                readonly rest: {
                    readonly fontSize: 12.5;
                    readonly fontWeight: 600;
                    readonly lineHeight: 1;
                };
            };
            readonly observation: {
                readonly select: {
                    readonly target: "dataLabel";
                    readonly role: "observation" | "category";
                };
                readonly vocabulary: {
                    readonly paddingInline: "pixels";
                    readonly paddingBlock: "pixels";
                    readonly fill: "paint";
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly cornerRadius: "boxRadius";
                    readonly shadow: "shadow";
                    readonly alpha: "unitInterval";
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
                readonly children: {
                    readonly inside: {
                        readonly select: {
                            readonly target: "dataLabel";
                            readonly role: "observation" | "category";
                            readonly position: "inside";
                        };
                        readonly vocabulary: {
                            readonly paddingInline: "pixels";
                            readonly paddingBlock: "pixels";
                            readonly fill: "paint";
                            readonly stroke: "color";
                            readonly strokeWidth: "pixels";
                            readonly cornerRadius: "boxRadius";
                            readonly shadow: "shadow";
                            readonly alpha: "unitInterval";
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
                        readonly rest: {
                            readonly textColor: "#FFFFFF";
                        };
                    };
                    readonly outside: {
                        readonly select: {
                            readonly target: "dataLabel";
                            readonly role: "observation" | "category";
                            readonly position: "outside";
                        };
                        readonly vocabulary: {
                            readonly paddingInline: "pixels";
                            readonly paddingBlock: "pixels";
                            readonly fill: "paint";
                            readonly stroke: "color";
                            readonly strokeWidth: "pixels";
                            readonly cornerRadius: "boxRadius";
                            readonly shadow: "shadow";
                            readonly alpha: "unitInterval";
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
                        readonly rest: {
                            readonly fontSize: 12.5;
                            readonly fontWeight: 600;
                            readonly lineHeight: 1;
                        };
                    };
                };
            };
            readonly category: {
                readonly select: {
                    readonly target: "dataLabel";
                    readonly role: "observation" | "category";
                };
                readonly vocabulary: {
                    readonly paddingInline: "pixels";
                    readonly paddingBlock: "pixels";
                    readonly fill: "paint";
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly cornerRadius: "boxRadius";
                    readonly shadow: "shadow";
                    readonly alpha: "unitInterval";
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
                readonly children: {
                    readonly inside: {
                        readonly select: {
                            readonly target: "dataLabel";
                            readonly role: "observation" | "category";
                            readonly position: "inside";
                        };
                        readonly vocabulary: {
                            readonly paddingInline: "pixels";
                            readonly paddingBlock: "pixels";
                            readonly fill: "paint";
                            readonly stroke: "color";
                            readonly strokeWidth: "pixels";
                            readonly cornerRadius: "boxRadius";
                            readonly shadow: "shadow";
                            readonly alpha: "unitInterval";
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
                        readonly rest: {
                            readonly textColor: "#FFFFFF";
                        };
                    };
                    readonly outside: {
                        readonly select: {
                            readonly target: "dataLabel";
                            readonly role: "observation" | "category";
                            readonly position: "outside";
                        };
                        readonly vocabulary: {
                            readonly paddingInline: "pixels";
                            readonly paddingBlock: "pixels";
                            readonly fill: "paint";
                            readonly stroke: "color";
                            readonly strokeWidth: "pixels";
                            readonly cornerRadius: "boxRadius";
                            readonly shadow: "shadow";
                            readonly alpha: "unitInterval";
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
                        readonly rest: {
                            readonly fontSize: 12.5;
                            readonly fontWeight: 600;
                            readonly lineHeight: 1;
                        };
                    };
                };
            };
        };
    };
    readonly graph: {
        readonly select: {
            readonly target: "graph";
        };
        readonly vocabulary: {
            readonly fill: "paint";
            readonly overlay: "overlay";
            readonly stroke: "color";
            readonly strokeWidth: "pixels";
            readonly cornerRadius: "pixels";
            readonly fontFamily: "fontFamily";
            readonly fontSize: "pixels";
            readonly fontWeight: "fontWeight";
            readonly lineHeight: "multiplier";
            readonly textColor: "color";
            readonly textScale: "multiplier";
            readonly padding: "padding";
            readonly blendMode: "blendMode";
            readonly shadow: "shadow";
            readonly alpha: "unitInterval";
        };
        readonly rest: {
            readonly fill: StyleTokenRef;
            readonly strokeWidth: 1;
            readonly stroke: StyleTokenRef;
            readonly cornerRadius: 8;
            readonly textScale: 1;
            readonly padding: 24;
            readonly blendMode: "normal";
        };
    };
    readonly heading: {
        readonly select: {
            readonly target: "heading";
        };
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
        readonly rest: {
            readonly textColor: StyleTokenRef;
        };
        readonly partWildcard: true;
        readonly children: {
            readonly h1: {
                readonly select: {
                    readonly target: "heading";
                    readonly part: "h1";
                };
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
                readonly rest: {
                    readonly fontSize: 18;
                    readonly fontWeight: 600;
                    readonly lineHeight: 1.25;
                };
            };
            readonly h2: {
                readonly select: {
                    readonly target: "heading";
                    readonly part: "h2";
                };
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
                readonly rest: {
                    readonly fontSize: 15;
                    readonly fontWeight: 500;
                    readonly lineHeight: 1.47;
                };
            };
        };
    };
    readonly caption: {
        readonly select: {
            readonly target: "caption";
        };
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
        readonly rest: {
            readonly textColor: StyleTokenRef;
            readonly fontSize: 12;
            readonly fontWeight: 500;
            readonly lineHeight: 1.3;
        };
    };
    readonly source: {
        readonly select: {
            readonly target: "source";
        };
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
        readonly rest: {
            readonly textColor: StyleTokenRef;
            readonly fontSize: 12;
            readonly fontWeight: 500;
            readonly lineHeight: 1.3;
        };
        readonly children: {
            readonly link: {
                readonly select: {
                    readonly target: "source";
                    readonly part: "link";
                };
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
                readonly rest: {
                    readonly textColor: StyleTokenRef;
                    readonly fontSize: 12;
                    readonly fontWeight: 400;
                    readonly lineHeight: 1.3;
                };
            };
        };
    };
    readonly header: {
        readonly select: {
            readonly target: "header";
        };
        readonly vocabulary: {
            readonly margin: "margin";
        };
        readonly rest: {
            readonly margin: {
                readonly bottom: 10;
            };
        };
    };
    readonly footer: {
        readonly select: {
            readonly target: "footer";
        };
        readonly vocabulary: {
            readonly margin: "margin";
        };
        readonly rest: {
            readonly margin: {
                readonly top: 16;
            };
        };
    };
    readonly hoverGuide: {
        readonly select: {
            readonly target: "hoverGuide";
        };
        readonly vocabulary: {
            readonly stroke: "color";
            readonly fill: "paint";
        };
        readonly rest: {
            readonly stroke: StyleTokenRef;
            readonly fill: StyleTokenRef;
        };
    };
    readonly editOutline: {
        readonly select: {
            readonly target: "editOutline";
        };
        readonly vocabulary: {
            readonly stroke: "color";
            readonly strokeWidth: "pixels";
            readonly offset: "pixels";
            readonly cornerRadius: "pixels";
        };
        readonly rest: {
            readonly strokeWidth: 2;
            readonly offset: 2;
            readonly cornerRadius: 3;
        };
        readonly partWildcard: true;
        readonly children: {
            readonly hover: {
                readonly select: {
                    readonly target: "editOutline";
                    readonly part: "hover";
                };
                readonly vocabulary: {
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly offset: "pixels";
                    readonly cornerRadius: "pixels";
                };
                readonly rest: {
                    readonly stroke: StyleTokenRef;
                };
            };
            readonly selected: {
                readonly select: {
                    readonly target: "editOutline";
                    readonly part: "selected";
                };
                readonly vocabulary: {
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly offset: "pixels";
                    readonly cornerRadius: "pixels";
                };
                readonly rest: {
                    readonly stroke: StyleTokenRef;
                };
            };
        };
    };
    readonly tooltip: {
        readonly select: {
            readonly target: "tooltip";
        };
        readonly vocabulary: {
            readonly gap: "pixels";
            readonly fill: "paint";
            readonly stroke: "color";
            readonly strokeWidth: "pixels";
            readonly cornerRadius: "boxRadius";
            readonly paddingInline: "pixels";
            readonly paddingBlock: "pixels";
            readonly shadow: "shadow";
            readonly alpha: "unitInterval";
        };
        readonly rest: {
            readonly gap: 4;
            readonly fill: StyleTokenRef;
            readonly stroke: StyleTokenRef;
            readonly strokeWidth: 1;
            readonly cornerRadius: 6;
            readonly paddingBlock: 8;
            readonly paddingInline: 10;
            readonly shadow: {
                readonly offsetX: 0;
                readonly offsetY: 4;
                readonly blur: 12;
                readonly color: "rgba(0, 0, 0, 0.18)";
            };
        };
        readonly children: {
            readonly heading: {
                readonly select: {
                    readonly target: "tooltip";
                    readonly part: "heading";
                };
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
                readonly rest: {
                    readonly textColor: StyleTokenRef;
                    readonly fontSize: 12.5;
                    readonly fontWeight: 700;
                    readonly lineHeight: 1.3;
                };
            };
            readonly label: {
                readonly select: {
                    readonly target: "tooltip";
                    readonly part: "label";
                };
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
                readonly rest: {
                    readonly textColor: StyleTokenRef;
                    readonly fontSize: 12.5;
                    readonly fontWeight: 500;
                    readonly lineHeight: 1.43;
                };
            };
            readonly value: {
                readonly select: {
                    readonly target: "tooltip";
                    readonly part: "value";
                };
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
                readonly rest: {
                    readonly textColor: StyleTokenRef;
                    readonly fontSize: 12.5;
                    readonly fontWeight: 500;
                    readonly lineHeight: 1.43;
                };
            };
            readonly primaryRow: {
                readonly select: {
                    readonly target: "tooltip";
                    readonly part: "primaryRow";
                };
                readonly vocabulary: {
                    readonly fill: "paint";
                };
                readonly rest: {
                    readonly fill: StyleTokenRef;
                };
            };
        };
    };
    readonly headline: {
        readonly select: {
            readonly target: "headline";
        };
        readonly vocabulary: {
            readonly gap: "pixels";
            readonly margin: "margin";
        };
        readonly rest: {
            readonly gap: 24;
            readonly margin: {
                readonly bottom: 4;
            };
        };
    };
    readonly headlineItem: {
        readonly select: {
            readonly target: "headlineItem";
        };
        readonly vocabulary: {
            readonly gap: "pixels";
        };
        readonly rest: {
            readonly gap: 2;
        };
        readonly children: {
            readonly number: {
                readonly select: {
                    readonly target: "headlineItem";
                    readonly part: "number";
                };
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
                readonly rest: {
                    readonly fontSize: 26;
                    readonly fontWeight: 700;
                    readonly lineHeight: 1.3;
                    readonly textColor: StyleTokenRef;
                };
                readonly children: {
                    readonly center: {
                        readonly select: {
                            readonly target: "headlineItem";
                            readonly part: "numberCenter";
                        };
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
                    };
                };
            };
            readonly caption: {
                readonly select: {
                    readonly target: "headlineItem";
                    readonly part: "caption";
                };
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
                readonly rest: {
                    readonly fontSize: 12;
                    readonly textColor: StyleTokenRef;
                };
            };
            readonly label: {
                readonly select: {
                    readonly target: "headlineItem";
                    readonly part: "label";
                };
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
                readonly rest: {
                    readonly fontSize: 12;
                    readonly textColor: StyleTokenRef;
                };
            };
            readonly swatch: {
                readonly select: {
                    readonly target: "headlineItem";
                    readonly part: "swatch";
                };
                readonly vocabulary: {
                    readonly size: "pixels";
                };
                readonly rest: {
                    readonly size: 12;
                };
            };
            readonly trend: {
                readonly select: {
                    readonly target: "headlineItem";
                    readonly part: "trend";
                };
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
                readonly rest: {
                    readonly fontSize: 12;
                    readonly textColor: StyleTokenRef;
                };
                readonly children: {
                    readonly up: {
                        readonly select: {
                            readonly target: "headlineItem";
                            readonly part: "trendUp";
                        };
                        readonly vocabulary: {
                            readonly textColor: "color";
                        };
                        readonly rest: {
                            readonly textColor: StyleTokenRef;
                        };
                    };
                    readonly down: {
                        readonly select: {
                            readonly target: "headlineItem";
                            readonly part: "trendDown";
                        };
                        readonly vocabulary: {
                            readonly textColor: "color";
                        };
                        readonly rest: {
                            readonly textColor: StyleTokenRef;
                        };
                    };
                    readonly flat: {
                        readonly select: {
                            readonly target: "headlineItem";
                            readonly part: "trendFlat";
                        };
                        readonly vocabulary: {
                            readonly textColor: "color";
                        };
                        readonly rest: {
                            readonly textColor: StyleTokenRef;
                        };
                    };
                };
            };
        };
    };
    readonly legend: {
        readonly select: {
            readonly target: "legend";
        };
        readonly vocabulary: {
            readonly focusStroke: "color";
            readonly gap: "pixels";
            readonly margin: "margin";
        };
        readonly rest: {
            readonly gap: 8;
            readonly focusStroke: StyleTokenRef;
        };
        readonly children: {
            readonly popover: {
                readonly select: {
                    readonly target: "legend";
                    readonly part: "popover";
                };
                readonly vocabulary: {
                    readonly fill: "paint";
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly cornerRadius: "boxRadius";
                    readonly paddingInline: "pixels";
                    readonly paddingBlock: "pixels";
                    readonly shadow: "shadow";
                    readonly alpha: "unitInterval";
                };
                readonly rest: {
                    readonly fill: StyleTokenRef;
                    readonly stroke: StyleTokenRef;
                    readonly strokeWidth: 1;
                    readonly cornerRadius: 6;
                    readonly paddingBlock: 8;
                    readonly paddingInline: 10;
                    readonly shadow: {
                        readonly offsetX: 0;
                        readonly offsetY: 4;
                        readonly blur: 12;
                        readonly color: "rgba(0, 0, 0, 0.18)";
                    };
                };
            };
            readonly top: {
                readonly select: {
                    readonly target: "legend";
                    readonly edge: "top";
                };
                readonly vocabulary: {
                    readonly gap: "pixels";
                    readonly margin: "margin";
                };
                readonly rest: {
                    readonly margin: {
                        readonly bottom: 8;
                    };
                };
            };
            readonly bottom: {
                readonly select: {
                    readonly target: "legend";
                    readonly edge: "bottom";
                };
                readonly vocabulary: {
                    readonly gap: "pixels";
                    readonly margin: "margin";
                };
                readonly rest: {
                    readonly margin: {
                        readonly top: 16;
                        readonly bottom: 10;
                    };
                };
            };
            readonly left: {
                readonly select: {
                    readonly target: "legend";
                    readonly edge: "left";
                };
                readonly vocabulary: {
                    readonly gap: "pixels";
                    readonly margin: "margin";
                };
                readonly rest: {
                    readonly margin: {
                        readonly right: 10;
                    };
                };
            };
            readonly right: {
                readonly select: {
                    readonly target: "legend";
                    readonly edge: "right";
                };
                readonly vocabulary: {
                    readonly gap: "pixels";
                    readonly margin: "margin";
                };
                readonly rest: {
                    readonly margin: {
                        readonly left: 10;
                    };
                };
            };
        };
    };
    readonly legendItem: {
        readonly select: {
            readonly target: "legendItem";
        };
        readonly vocabulary: {
            readonly paddingInline: "pixels";
            readonly paddingBlock: "pixels";
            readonly fill: "paint";
            readonly stroke: "color";
            readonly strokeWidth: "pixels";
            readonly cornerRadius: "boxRadius";
            readonly shadow: "shadow";
            readonly alpha: "unitInterval";
            readonly gap: "pixels";
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
        readonly rest: {
            readonly textColor: StyleTokenRef;
            readonly strokeWidth: 0;
            readonly paddingInline: 2;
            readonly paddingBlock: 4;
            readonly gap: 8;
            readonly fontSize: 11.5;
            readonly fontWeight: 500;
            readonly lineHeight: 1;
        };
        readonly children: {
            readonly swatch: {
                readonly select: {
                    readonly target: "legendItem";
                    readonly part: "swatch";
                };
                readonly vocabulary: {
                    readonly size: "pixels";
                    readonly strokeWidth: "pixels";
                };
                readonly rest: {
                    readonly size: 12;
                    readonly strokeWidth: 2;
                };
            };
        };
    };
    readonly directLabel: {
        readonly select: {
            readonly target: "directLabel";
        };
        readonly vocabulary: {
            readonly stroke: "color";
            readonly strokeWidth: "pixels";
            readonly dashArray: "dashArray";
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
        readonly rest: {
            readonly fontSize: 12;
            readonly fontWeight: 500;
            readonly lineHeight: 1.3;
            readonly textColor: StyleTokenRef;
            readonly strokeWidth: 1;
            readonly dashArray: readonly [2, 3];
        };
    };
    readonly annotation: {
        readonly select: {
            readonly target: "annotation";
        };
        readonly vocabulary: {
            readonly fill: "paint";
            readonly stroke: "color";
            readonly alpha: "unitInterval";
            readonly fillAlpha: "unitInterval";
        };
        readonly options: readonly ["annotation"];
        readonly children: {
            readonly shape: {
                readonly select: {
                    readonly target: "annotation";
                    readonly kind: "shape";
                };
                readonly vocabulary: {
                    readonly fill: "paint";
                    readonly alpha: "unitInterval";
                    readonly fillAlpha: "unitInterval";
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                };
                readonly options: readonly ["annotation"];
                readonly rest: {
                    readonly fill: StyleTokenRef;
                    readonly alpha: 1;
                    readonly fillAlpha: 0.25;
                    readonly strokeWidth: 1;
                };
            };
            readonly arrow: {
                readonly select: {
                    readonly target: "annotation";
                    readonly kind: "arrow";
                };
                readonly vocabulary: {
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly dashArray: "dashArray";
                };
                readonly options: readonly ["annotation"];
                readonly rest: {
                    readonly stroke: StyleTokenRef;
                    readonly strokeWidth: 4;
                    readonly dashArray: readonly [];
                };
                readonly children: {
                    readonly outline: {
                        readonly select: {
                            readonly target: "annotation";
                            readonly kind: "arrow";
                            readonly part: "outline";
                        };
                        readonly vocabulary: {
                            readonly stroke: "color";
                            readonly strokeWidth: "pixels";
                            readonly shadow: "shadow";
                        };
                        readonly options: readonly ["annotation"];
                        readonly rest: {
                            readonly strokeWidth: 0;
                            readonly shadow: "none";
                        };
                    };
                };
            };
            readonly differenceArrow: {
                readonly select: {
                    readonly target: "annotation";
                    readonly kind: "differenceArrow";
                };
                readonly vocabulary: {
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                };
                readonly options: readonly ["annotation"];
                readonly rest: {
                    readonly stroke: StyleTokenRef;
                    readonly strokeWidth: 2;
                };
                readonly children: {
                    readonly label: {
                        readonly select: {
                            readonly target: "annotation";
                            readonly kind: "differenceArrow";
                            readonly part: "label";
                        };
                        readonly vocabulary: {
                            readonly paddingInline: "pixels";
                            readonly paddingBlock: "pixels";
                            readonly fill: "paint";
                            readonly stroke: "color";
                            readonly strokeWidth: "pixels";
                            readonly cornerRadius: "boxRadius";
                            readonly shadow: "shadow";
                            readonly alpha: "unitInterval";
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
                        readonly options: readonly ["annotation"];
                        readonly rest: {
                            readonly textColor: StyleTokenRef;
                            readonly fill: StyleTokenRef;
                            readonly strokeWidth: 1;
                            readonly cornerRadius: 4;
                            readonly paddingInline: 6;
                            readonly paddingBlock: 3;
                            readonly fontSize: 11.5;
                            readonly fontWeight: 500;
                            readonly lineHeight: 1;
                        };
                    };
                };
            };
            readonly text: {
                readonly select: {
                    readonly target: "annotation";
                    readonly kind: "text";
                };
                readonly vocabulary: {
                    readonly fillAlpha: "unitInterval";
                    readonly paddingInline: "pixels";
                    readonly paddingBlock: "pixels";
                    readonly fill: "paint";
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly cornerRadius: "boxRadius";
                    readonly shadow: "shadow";
                    readonly alpha: "unitInterval";
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
                readonly options: readonly ["annotation"];
                readonly rest: {
                    readonly fill: "transparent";
                    readonly alpha: 1;
                    readonly fillAlpha: 1;
                    readonly strokeWidth: 1.5;
                    readonly cornerRadius: 9;
                    readonly paddingInline: 6;
                    readonly paddingBlock: 3;
                    readonly fontSize: 15;
                    readonly fontWeight: 500;
                    readonly lineHeight: 1.25;
                    readonly textColor: StyleTokenRef;
                };
            };
            readonly image: {
                readonly select: {
                    readonly target: "annotation";
                    readonly kind: "image";
                };
                readonly vocabulary: {
                    readonly alpha: "unitInterval";
                    readonly cornerRadius: "boxRadius";
                    readonly shadow: "shadow";
                };
                readonly options: readonly ["annotation"];
                readonly rest: {
                    readonly alpha: 1;
                    readonly cornerRadius: 0;
                };
            };
            readonly pinnedNumber: {
                readonly select: {
                    readonly target: "annotation";
                    readonly kind: "pinnedNumber";
                };
                readonly vocabulary: {
                    readonly fill: "paint";
                    readonly size: "pixels";
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly shadow: "shadow";
                };
                readonly options: readonly ["annotation"];
                readonly rest: {
                    readonly fill: StyleTokenRef;
                    readonly size: 8;
                    readonly stroke: StyleTokenRef;
                    readonly strokeWidth: 2;
                    readonly shadow: {
                        readonly offsetX: 0;
                        readonly offsetY: 1;
                        readonly blur: 1.5;
                        readonly color: "rgba(14, 14, 52, 0.18)";
                    };
                };
                readonly children: {
                    readonly label: {
                        readonly select: {
                            readonly target: "annotation";
                            readonly kind: "pinnedNumber";
                            readonly part: "label";
                        };
                        readonly vocabulary: {
                            readonly paddingInline: "pixels";
                            readonly paddingBlock: "pixels";
                            readonly fill: "paint";
                            readonly stroke: "color";
                            readonly strokeWidth: "pixels";
                            readonly cornerRadius: "boxRadius";
                            readonly shadow: "shadow";
                            readonly alpha: "unitInterval";
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
                        readonly options: readonly ["annotation"];
                        readonly rest: {
                            readonly fontSize: 12;
                            readonly fontWeight: 500;
                            readonly lineHeight: 1.3;
                            readonly textColor: StyleTokenRef;
                            readonly fill: StyleTokenRef;
                            readonly stroke: StyleTokenRef;
                            readonly strokeWidth: 1;
                            readonly cornerRadius: 6;
                            readonly paddingInline: 7;
                            readonly paddingBlock: 4;
                            readonly shadow: {
                                readonly offsetX: 0;
                                readonly offsetY: 2;
                                readonly blur: 6;
                                readonly color: "rgba(0, 0, 0, 0.12)";
                            };
                        };
                    };
                };
            };
            readonly comment: {
                readonly select: {
                    readonly target: "annotation";
                    readonly kind: "comment";
                };
                readonly vocabulary: {
                    readonly fill: "paint";
                    readonly size: "pixels";
                    readonly stroke: "color";
                    readonly strokeWidth: "pixels";
                    readonly shadow: "shadow";
                };
                readonly options: readonly ["annotation"];
                readonly rest: {
                    readonly fill: StyleTokenRef;
                    readonly size: 8;
                    readonly stroke: StyleTokenRef;
                    readonly strokeWidth: 2;
                    readonly shadow: {
                        readonly offsetX: 0;
                        readonly offsetY: 1;
                        readonly blur: 1.5;
                        readonly color: "rgba(14, 14, 52, 0.18)";
                    };
                };
                readonly children: {
                    readonly label: {
                        readonly select: {
                            readonly target: "annotation";
                            readonly kind: "comment";
                            readonly part: "label";
                        };
                        readonly vocabulary: {
                            readonly paddingInline: "pixels";
                            readonly paddingBlock: "pixels";
                            readonly fill: "paint";
                            readonly stroke: "color";
                            readonly strokeWidth: "pixels";
                            readonly cornerRadius: "boxRadius";
                            readonly shadow: "shadow";
                            readonly alpha: "unitInterval";
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
                        readonly options: readonly ["annotation"];
                        readonly rest: {
                            readonly fontSize: 12;
                            readonly fontWeight: 500;
                            readonly lineHeight: 1.3;
                            readonly textColor: StyleTokenRef;
                            readonly fill: StyleTokenRef;
                            readonly stroke: StyleTokenRef;
                            readonly strokeWidth: 1;
                            readonly cornerRadius: 6;
                            readonly paddingInline: 7;
                            readonly paddingBlock: 4;
                            readonly shadow: {
                                readonly offsetX: 0;
                                readonly offsetY: 2;
                                readonly blur: 6;
                                readonly color: "rgba(0, 0, 0, 0.12)";
                            };
                        };
                    };
                };
            };
        };
    };
};

const STYLE_TEXT_DECORATIONS: readonly ["none", "underline", "line-through"];

const STYLE_TEXT_TRANSFORMS: readonly ["none", "uppercase", "lowercase", "capitalize"];

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
 * Mathematical transformation for continuous scales.
 *
 * - `'linear'` — No transformation applied
 * - `'log'` — Base-10 logarithmic scale
 * - `'sqrt'` — Square root scale
 */
type ScaleTransformType = 'linear' | 'log' | 'sqrt';

/**
 * Scale mapping type that defines how data values map to visual properties.
 *
 * - `'continuous'` — Continuous numeric range (e.g., min to max)
 * - `'discrete'` — Discrete categorical values
 * - `'datetime'` — Date/time range
 * - `'identity'` — Pass-through, values used as-is
 * - `'palette'` — Discrete values mapped through a named color palette
 */
type ScaleType = 'continuous' | 'discrete' | 'datetime' | 'identity' | 'palette';

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
 * Render-ready scene — the output of {@link Compiler.compile} and the input a
 * renderer paints from. Coords/scales/guides/config/annotations are resolved descriptors; geom data
 * carries its visual values in normalized `[0,1]` position space (y up). See {@link Compiler} for the
 * cross-cutting conventions and {@link LayoutCompiler} for turning this into pixel rects.
 */
interface Scene {
    /**
     * The resolved spec this output was compiled from, retained so callers can recompile or inspect the
     * source.
     */
    spec: ResolvedSpec;
    coordSystem: CoordSystem;
    layers: SceneLayer[];
    scales: SceneScales;
    guides: SceneGuides;
    config: SceneConfig;
    annotations: SceneAnnotations;
    chrome: SceneChromeStyles;
}

/**
 * All annotations of a graph after compilation, grouped by kind. Paint order across kinds is the
 * renderer's call; the only ordering signal here is {@link SceneShape.zOrder}.
 */
interface SceneAnnotations {
    differenceArrows: SceneDifferenceArrow[];
    shapes: SceneShape[];
    arrows: SceneArrow[];
    textAnnotations: SceneTextAnnotation[];
    images: SceneImageAnnotation[];
    stickers: SceneStickerAnnotation[];
    pinnedNumbers: ScenePinnedNumberAnnotation[];
    comments: SceneCommentAnnotation[];
}

/**
 * Compile-time projection of an arrow annotation.
 */
interface SceneArrow {
    id: string;
    start: ResolvedPoint;
    end: ResolvedPoint;
    startArrowheadStyle: ArrowheadStyle;
    endArrowheadStyle: ArrowheadStyle;
}

/**
 * Axis guide produced from a position scale (x, y, ySecondary).
 * Tick candidates carry normalized positions so the renderer needs no scale logic (selection
 * happens at layout time).
 */
interface SceneAxisGuide {
    /**
     * Which scale this axis represents. Derive the axis it serves with
     * `getAestheticFromScaleAestheticKey` (folds `ySecondary` into `y`).
     */
    scaleAestheticKey: ScaledPositionAestheticKey;
    /**
     * Axis placement. Already reflects any flip, do not re-derive from the coord system's `mainAxis`.
     */
    position: AxisPosition;
    /**
     * Geometric shape the axis traces.
     * - `'linear'` for a straight cartesian edge (drawn by the cartesian grid/axis renderers),
     * - `'circular'` for a radar's angular spoke axis
     * - `'radial'` for its ring axis.
     *
     * Mirrors the coord system's `axisMapping[aesthetic].geometry`.
     */
    geometry: GuideGeometry;
    /** Title text, null means no title */
    label: string | null;
    /**
     * Gates the whole axis region (line + ticks + labels).
     */
    isVisible: boolean;
    /**
     * Candidate tick sets, sorted by ascending count. These are raw candidates, not the final selection.
     * Final selection happens in `LayoutCompiler`. The renderer
     * paints the resulting `FormattedAxis.ticks` verbatim; it must not re-select candidates here.
     */
    tickCandidates: AxisTickCandidate[];
    /**
     * Resolved format descriptor shared by all ticks on this axis. Already applied during tick selection: the
     * renderer paints `FormattedAxis.ticks[].formattedLabel` as-is and must not re-apply this `ValueFormat`.
     */
    valueFormat: ValueFormat;
    /** Tick mode from config. Already honored by the compiler when building candidates — don't re-filter ticks. */
    tickMode: AxisTickMode;
    /** Whether tick marks are visible. Labels still show when this is false (independent of `isVisible`). */
    ticksVisible: boolean;
    /** Whether grid lines are visible at tick positions. Their paint comes from the chrome styles. */
    gridVisible: boolean;
    /** Scale type — the renderer uses this to select a formatting strategy */
    scaleType: ScaleType;
    /** Band width in [0, 1] space for discrete position scales. Undefined otherwise. */
    bandwidth?: number;
}

/** One chrome entry ready for reads — chart-scoped and condition-free: no predicate, no state. */
interface SceneChromeEntry {
    select: ChromeStyleSelect;
    declarations: SceneStyleDeclarations;
    origin: StyleEntryOrigin;
}

/** One chrome target's compiled lists. Within a list, the last matching entry declaring a property wins. */
interface SceneChromeList {
    defaults: SceneChromeEntry[];
    overrides: SceneChromeEntry[];
}

type SceneChromeStyles = Record<ChromeStyleTargetName, SceneChromeList> & {
    warnings: UserInputIssue[];
};

/**
 * Compile-time projection of a comment annotation.
 */
interface SceneCommentAnnotation {
    id: string;
    at: ResolvedObservationPoint;
    content: RichTextContent;
}

/**
 * The config the renderer reads. Config carries no derived values currently. The alias keeps the
 * compile / render seam named.
 */
type SceneConfig = ResolvedConfigSpec;

/**
 * A difference arrow with both endpoints resolved to normalized [0, 1]² coordinates.
 */
interface SceneDifferenceArrow {
    id: string;
    start: ResolvedObservationPoint;
    end: ResolvedObservationPoint;
    /** Which quantity the arrow's label reports (absolute, relative, or proportion of the two endpoints). */
    label: DifferenceArrowLabelKind;
    /**
     * Label position along the arrow as a fraction of its length, anchored to the geometric edge (not
     * the endpoints): 0 = left, 1 = right (top/bottom when flipped). Defaults to 0.5.
     */
    labelCrossPosition: number;
}

interface SceneGrandTotalHeadline {
    kind: 'grandTotal';
    /** Plain sum of every slice value (negatives reduce it). */
    value: number;
    /** Format for the grand total figure. */
    valueFormat: ValueFormat;
}

/**
 * All compiled guides, ready for the renderer.
 */
interface SceneGuides {
    axes: SceneAxisGuide[];
    legends: SceneLegends;
    headline: SceneHeadlineGuide | null;
    /**
     * Discrete color partition in color-domain order, empty when color isn't discrete. The single
     * source legends, headline, and tooltip all read so they agree on how each series reads.
     */
    colorGroups: ColorGroup[];
    /**
     * Friendly display labels keyed by variable name. Runtime consumers (e.g. tooltips) resolve a
     * series' label from this rather than borrowing a guide's title.
     */
    variableLabels: VariableLabels;
}

/**
 * Compiled headline numbers. Two shapes by coordinate system: a per-group strip on cartesian
 * graphs (one figure per group, replacing the legend) and a single grand total on polar graphs
 * (coexisting with the legend). `show`/`position` are read from `config.headline` — not duplicated
 * here. The compiler emits raw values + formats; the renderer formats and composes labels.
 */
type SceneHeadlineGuide = ScenePerGroupHeadline | SceneGrandTotalHeadline;

/**
 * Identity scales — pass-through, no transformation.
 * Used when data already contains render-ready values.
 */
interface SceneIdentityScale extends SceneScaleBase {
    kind: 'identity';
    map: (value: DataValue) => DataValue;
}

/**
 * Compile-time projection of an image annotation. Its paint is not carried here; it resolves through
 * `readers(scene).annotation.image(id)`.
 */
interface SceneImageAnnotation {
    id: string;
    /** Image URL or data URI. */
    src: string;
    /** Whether the image draws behind the geoms (background) or over them (foreground). */
    zOrder: AnnotationZOrder;
    region: ResolvedRegion;
    /** How the image scales inside its box. */
    fit: ImageAnnotationFit;
}

/**
 * Render-ready layer with resolved mappings and transformed data.
 */
interface SceneLayer {
    /**
     * Stable identity carried over from `ResolvedLayerSpec.id`. Preserved across recompiles (commands keep
     * it too), so renderers root per-geom React keys on it — geoms morph instead of remounting — and
     * join hover by matching `HoverHit.layerId === layer.id`.
     */
    id: string;
    /**
     * This layer's transformed, render-ready dataset. Within a group, the observations
     * are pre-ordered along the main axis, so a line / area path can be drawn as-is with no re-sort.
     * Connected geoms (line, area, polar arc) partition these by `GROUP_VARIABLES.group`
     * (`data.groupBy(...)`) — one observation per group; per-observation geoms (bar, point) iterate `data` directly.
     */
    data: Dataset;
    /**
     * The geom this layer paints. A plain `string` (not {@link GeomName}): the scene is
     * serialisable and reaches a renderer with no knowledge of the registered plugins, so a custom
     * geom's identity survives as its name and downstream resolution is a registry lookup. Narrow back
     * to a built-in flavour with {@link isLayerOf} / {@link SceneLayerFor}.
     */
    geom: string;
    /**
     * The coord-agnostic hit-test shape this layer's geom declares, baked from the geom def at compile
     * time. The runtime hover indexer (`build-layer-index`) reads this plus the chart's coord system to
     * build the projected index, so a custom geom is indexed by what it declares rather than by name, and
     * the polar projection (a pie's `cells`, a radar's angle-snap) is a runtime fact of the coord.
     */
    spatialKind: SpatialKind;
    /**
     * What counts as "the same observation" for this layer, baked from the geom def. The runtime
     * resolves a `'render-hit-test'` tester's returned key against this, and morphs/hover-stability
     * use it across recompiles.
     */
    identityKey: IdentityKey;
    /** Baked from the geom def. */
    hoverPriority: HoverPriority;
    /** What the layer's tooltip shows: the geom's contract with the author's `tooltip` entries merged over it. */
    tooltip: SceneLayerTooltip;
    /** What the geom asks of the position scales it draws against, baked from the geom def. */
    scaleConstraints?: ScaleConstraints;
    /** Whether this layer's groups can be named on the edge of the panel instead of in a legend. */
    supportsDirectLabels: boolean;
    /** Final mapping after merging root + layer + stat + geom overrides (may carry custom positional aesthetics). */
    mapping: AesMapping;
    position: PositionAdjustment;
    yScaleType: YScaleType;
    params: ResolvedLayerSpec['params'];
    /** When `false`, hover ignores this layer: it is never the primary nor related. */
    interactive: boolean;
    dataLabels: ResolvedDataLabelsSpec;
    /** Per-layer aggregates emitted by the summarizer pipeline step. Gated by layer geometry. */
    summary: LayerSummary;
    /**
     * Bundles the geom's composition `strategy`  with the per-layer `composition` written by the
     * highlights compile stage when applicable highlights match (empty otherwise).
     */
    highlight: SceneLayerHighlight | null;
    /**
     * The stylesheet filtered, validated and predicate-compiled for this layer by the styles
     * compile stage (built-in defaults prepended). The style resolver composes the cascade
     * from these lists; renderers never read them directly.
     */
    styles: SceneLayerStyles;
}

/**
 * `SceneLayer` narrowed to a specific `geom`. Lets call sites that already know the geom
 * (geom renderers dispatched off `layer.geom`) take a typed `params` directly, eliminating the
 * `as ...GeomParams` cast that was needed when `params` was the full param union.
 */
type SceneLayerFor<G extends GeomName> = Omit<SceneLayer, 'geom' | 'params'> & {
    geom: G;
    params: Extract<ResolvedLayerSpec, {
        geom: G;
    }>['params'];
};

/**
 * Per-layer highlight state on `SceneLayer.highlight`. Bundles the geom's composition
 * strategy (set at layer compile time, never changes after) with the composition output
 * (rewritten by the highlights compile stage when applicable highlights match).
 *
 * This is the static highlight (from the spec). A live hover transiently supersedes it: while a
 * pointer is over the graph, render the hover result (see `HoverState`) in place of this.
 */
interface SceneLayerHighlight {
    /** How this layer composes highlight matches above its base render. */
    strategy: HighlightStrategy;
    /** Per-layer highlight composition the renderer consumes. */
    composition: HighlightComposition;
}

/**
 * The styles stage's output for one layer: both lists, holding only the entries that apply to it. The
 * style resolver composes the cascade from them: state-scoped entries above, then
 * overrides → data → defaults.
 *
 * `warnings` are the problems found compiling this layer's entries. They live on the memoized artifact,
 * and the stage re-emits them into the compile diagnostics every compile, memo hit or miss, so
 * `CompileResult.warnings` stays complete across incremental recompiles.
 */
interface SceneLayerStyles {
    defaults: SceneStyleEntry[];
    overrides: SceneStyleEntry[];
    warnings: UserInputIssue[];
    /** The layer's observations, shared geom paint included. */
    observation: SceneStylePart;
    /** The dash array each `lineType` preset draws as, for the aesthetic answering `dashArray`. */
    dashPresets: Readonly<Record<LineType, DashArray>>;
    /** Each part beside the observations, keyed by part name. */
    parts: Record<string, SceneStylePart>;
}

/** What a layer's tooltip shows, resolved at compile time. */
interface SceneLayerTooltip {
    /**
     * The fields in the order they show. A geom whose contract takes no row (none, or headings only) contributes one
     * `group` field, its default rows.
     */
    fields: readonly SceneTooltipField[];
    /**
     * The author removed or headed the default rows, so a layer with no single observation to read its fields from
     * lists nothing rather than its hits as default rows.
     */
    hidesDefaultRows: boolean;
}

/**
 * Concrete legend alignment after 'auto' has been resolved.
 * - 'auto' is resolved to `start` for horizontal legends and `center` for vertical ones
 */
type SceneLegendAlign = Exclude<LegendAlign, 'auto'>;

/**
 * Concrete legend display after 'auto' has been resolved.
 * - 'auto' is resolved based on legend position and geom characteristics
 */
type SceneLegendDisplay = Exclude<LegendDisplay, 'auto'>;

/** A render-ready legend: its resolved placement plus the items it lists, possibly merged across aesthetics. */
interface SceneLegendGuide {
    /**
     * Visual scale keys this legend represents (may be merged): one or more of `color` / `size` / `alpha` /
     * `strokeWidth` / `lineType`. When this includes `'size'` the legend is a bubble
     * legend.
     */
    aesthetics: AestheticKey[];
    /** Title text, null means no title */
    title: string | null;
    /** Resolved legend position (never 'auto' or 'none') */
    position: SceneLegendPosition;
    /** Resolved legend display mode (never 'auto') */
    display: SceneLegendDisplay;
    /** Placement of the legend items along its flow: the row for horizontal, the column for vertical. */
    align: SceneLegendAlign;
    /** Legend items in domain order */
    items: LegendItem[];
}

/**
 * Discrete legend — one item per domain value.
 * Produced from discrete and palette scales.
 */
/**
 * Concrete legend position after 'auto' and 'none' have been resolved.
 * - 'none' is handled upstream (compileLegends returns [] when position is 'none')
 * - 'auto' is resolved to a concrete position by resolveLegendPosition
 */
type SceneLegendPosition = Exclude<LegendPosition, 'auto' | 'none'>;

/** The legends a chart draws, and where it puts them. */
interface SceneLegends {
    /** One per legend the chart draws, empty when it draws none. */
    drawn: SceneLegendGuide[];
    /**
     * Where a legend sits, or would sit had one been drawn; `'none'` when the reader turned legends
     * off. Sits beside the guides because it outlives them — a per-group headline claiming the legend
     * slot empties `drawn` without changing where a legend belongs.
     */
    position: SceneLegendPosition | 'none';
}

interface ScenePerGroupHeadline {
    kind: 'perGroup';
    /** One figure per group, in canonical color-domain order (mirrors the legend). */
    items: HeadlineItem[];
}

/**
 * Compile-time projection of a pinned-number annotation.
 */
interface ScenePinnedNumberAnnotation {
    id: string;
    at: ResolvedObservationPoint;
}

/**
 * Position scales (x, y) — map data values to normalized [0,1] space.
 * The renderer maps [0,1] to pixel coordinates.
 */
interface ScenePositionScale<Input = DataValue> extends SceneScaleBase<Input> {
    kind: 'position';
    /**
     * Maps a data value to its normalized position.
     * Normalized to [0,1]: x is 0=left…1=right, y is 0=bottom…1=top (data-up). SVG / top-origin
     * renderers invert y as `1 - y`.
     * Continuous unclamped scales extrapolate outside [0,1] for out-of-domain inputs, so [0,1] is the
     * in-domain range, not a hard guarantee.
     */
    map: (value: Input) => number;
    /**
     * Band width as a fraction of the panel's main-axis extent, for discrete position scales. This is
     * the full category band; a per-observation xMin/xMax extent may be a narrower dodged sub-band
     * inside it. Stays keyed to aesthetic x even when the coord is flipped. Null for continuous /
     * datetime; null or ≤0 means derive the extent per observation instead.
     */
    bandwidth: number | null;
}

/** Any compiled scale, discriminated by `kind` into position, visual, or identity. */
type SceneScale<Input = DataValue> = ScenePositionScale<Input> | SceneVisualScale<Input> | SceneIdentityScale;

/** Shared interface for all compiled scales, regardless of `kind`. */
interface SceneScaleBase<Input = DataValue> {
    /** The aesthetic this scale drives (e.g. 'x', 'color'). */
    aesthetic: AestheticKey;
    /**
     * The scale's resolved input domain, in domain order.
     * Iterate and `map(value)` over this to enumerate legend / palette swatches.
     */
    domain: Input[];
    /** The spec this scale was compiled from. */
    spec: ResolvedScaleSpecBase;
    /** Produces axis/legend tick values. See {@link GenerateTicksOptions} for the supported variants. */
    generateTicks: (options?: GenerateTicksOptions) => Input[];
}

/** All compiled scales for a graph, keyed by the aesthetic each one drives. Absent keys are unmapped. */
type SceneScales = Partial<Record<ScaledAestheticKey, SceneScale>>;

/**
 * Compile-time projection of a rectangle annotation.
 */
interface SceneShape {
    id: string;
    kind: ShapeKind;
    /** Whether the shape draws behind the geoms (background) or over them (foreground). */
    zOrder: AnnotationZOrder;
    region: ResolvedRegion;
}

/**
 * Compile-time projection of a sticker annotation.
 */
interface SceneStickerAnnotation {
    id: string;
    at: ResolvedPoint;
    sticker: StickerId;
}

/** Style property → the aesthetic whose visual variable answers its data tier. */
type SceneStyleAesthetics = NonNullable<AnyStyleTargetNode['aesthetics']>;

/**
 * The declarations a compiled entry holds — the authored shape with token references inlined. Radii
 * hold whichever form the entry's vocabulary validated: a token on geom entries, pixels on chrome.
 */
type SceneStyleDeclarations = StyleDeclarationsFor<CompiledStyleDomainValues>;

/**
 * One stylesheet entry ready for per-observation reads. `matches` is absent when the entry carried no
 * `where`, so it paints unconditionally — a read with no observation in hand can tell the two apart.
 * `where` is the predicate `matches` was compiled from, so a reader can tell which variables it reads.
 * `state` is absent for a stateless entry.
 */
interface SceneStyleEntry {
    declarations: SceneStyleDeclarations;
    matches?: CompiledPredicate;
    where?: Predicate;
    state?: StyleState;
    part?: string;
    origin: StyleEntryOrigin;
}

/** One geom address — the observations or a part beside them: what it paints and what answers its data tier. */
interface SceneStylePart {
    vocabulary: StyleVocabulary;
    /** Empty for a part that declares none, so it reads no data tier. */
    aesthetics: SceneStyleAesthetics;
}

/**
 * Compile-time projection of a text annotation.
 *
 * There is deliberately no height: it is content-intrinsic. The renderer lays out the text within
 * `width` and extends the box's height to fit the content.
 */
interface SceneTextAnnotation {
    id: string;
    content: RichTextContent;
    at: ResolvedPoint;
    width: number;
    /** Which point of the text's own box sits at `at`. */
    align: AnchorAlign;
}

/**
 * One field of a layer's tooltip, resolved at compile time. Every kind but `group` heads the tooltip with `heading`.
 * - `aes`: the value of an aesthetic, read through the layer mapping.
 * - `variable`: the value of a variable the geom derives, read from the observation.
 * - `range`: two aesthetics joined by an en dash.
 * - `group`: the layer's default rows, one per listed observation, labelled by colour group or the `y` variable.
 */
type SceneTooltipField = (SceneTooltipFieldBase & {
    kind: 'aes';
    aes: string;
    heading: boolean;
}) | (SceneTooltipFieldBase & {
    kind: 'variable';
    variable: string;
    heading: boolean;
}) | (SceneTooltipFieldBase & {
    kind: 'range';
    range: readonly [from: string, to: string];
    heading: boolean;
}) | (SceneTooltipFieldBase & {
    kind: 'group';
});

/** What a tooltip field shows, and how an author changed it. */
interface SceneTooltipFieldBase {
    /** The name an author's `tooltip` entry addresses the field by. */
    name: string;
    /** Replaces the row's default label. */
    title?: string;
    /** Replaces the value's own variable format. */
    format?: ExplicitValueFormat;
}

/**
 * Visual scales (color, size, alpha, …) — map data values to concrete visual outputs
 * (color strings, pixel sizes, opacity values, etc.).
 */
interface SceneVisualScale<Input = DataValue> extends SceneScaleBase<Input> {
    kind: 'visual';
    /**
     * Maps a data value to a concrete visual output (color string, pixel size, opacity etc).
     * Already applied per observation by the visual mapper: read the resolved value via the matching
     * value reader. Call `map` only for out-of-band values like legend swatches, enumerating the
     * inputs via {@link SceneScaleBase.domain}.
     */
    map: (value: Input) => DataValue;
    /**
     * Colour scales only: the palette before its position-keyed `overrides`, which a colour picker offers.
     */
    paletteBeforeOverrides?: readonly string[];
}

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

type SequentialSchemeName = (typeof SEQUENTIAL_SCHEME_NAMES)[number];

/**
 * Axis title, where `null` means explicitly no label. Only `ySecondary` may omit it: that drops the
 * override so the axis inherits the primary y axis label. A primary axis always holds a resolved
 * label, so an omission has nothing to mean there.
 */
type SetAxisLabelParams = {
    axis: AxisKey;
    label: string | null;
} | {
    axis: 'ySecondary';
    label?: string | null;
};

type SetAxisPositionParams = {
    axis: AxisKey;
    /** Side the axis is drawn on. */
    position: AxisPosition;
};

type SetAxisTickModeParams = {
    axis: AxisKey;
    /** Which ticks are drawn. */
    tickMode: AxisTickMode;
};

type SetAxisTicksVisibilityParams = {
    axis: AxisKey;
    /** Whether tick marks are drawn. */
    isVisible: boolean;
};

type SetAxisVisibilityParams = {
    axis: AxisKey;
    /** Whether the axis is drawn. */
    isVisible: boolean;
};

type SetBarCornerRadiusParams = {
    /** Layer whose bars this rounds. */
    layerId: string;
    /** A token or a number of pixels. `'full'` is half the bar's thickness, giving a pill. `null` hands rounding back to the stylesheet beneath. */
    cornerRadius: BarCornerRadius | null;
};

type SetBarWidthParams = {
    /** Layer to target; when omitted, the first bar layer is used. */
    layerId?: string;
    /** Fraction of the category band each bar fills, clamped to `[0.05, 1]`; the rest is the gap beside it. */
    width?: number;
};

/** The type to set, or — on a revert — the chart as it stood, since a chart no type describes has none to name. */
type SetChartTypeParams = ChartTypeSummary | {
    previous: ChartTypeState;
};

type SetContentCaptionParams = {
    /** New caption, or `null` to clear it. */
    caption: TextContent | null;
};

type SetContentSourceParams = {
    /**
     * Complete replacement value; `null` clears the attribution. Both fields travel together because
     * a partial patch would leave the previous `url` pointing at a source the new `label` no longer
     * names.
     */
    source: SourceContent | null;
};

type SetContentSubtitleParams = {
    /** New subtitle, or `null` to clear it. */
    subtitle: TextContent | null;
};

type SetContentTitleParams = {
    /** New title, or `null` to clear it. */
    title: TextContent | null;
};

type SetCoordLimitsParams = {
    /** New `[min, max]` bounds for x, or `null` to let the data drive them; omit to leave x unchanged. */
    xLimits?: AxisLimits;
    /** New `[min, max]` bounds for y, or `null` to let the data drive them; omit to leave y unchanged. */
    yLimits?: AxisLimits;
};

type SetDataLabelsFormatParams = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    /** Whether labels read as the raw value or as a share of the total. */
    format: ResolvedDataLabelsSpec['format'];
};

type SetGridLineStyleParams = {
    axis: GridAxisTarget;
    /** Dash pattern, or `null` to fall back to the stylesheet. */
    lineStyle: PerAxisValue<LineType | null>;
};

type SetGridLineWidthParams = {
    axis: GridAxisTarget;
    lineWidth: PerAxisValue<number | null>;
};

type SetGridVisibilityParams = {
    axis: AxisKey;
    /**
     * Whether this axis's grid lines are drawn. `null` defers to the compiler's geom and coord
     * policies.
     */
    isVisible: boolean | null;
};

type SetHeadlineCompareWithParams = {
    compareWith: HeadlineCompareWith;
};

type SetHeadlinePositionParams = {
    position: HeadlinePosition;
};

type SetHeadlineShowParams = {
    show: HeadlineShow;
};

type SetHeadlineSizeParams = {
    size: HeadlineSize;
};

type SetHighlightDimStyleParams = {
    dimStyle: HighlightDimStyle;
};

type SetLayerPositionParams = {
    /** Layer to target; when omitted, the first bar or area layer is used. */
    layerId?: string;
    /** How the layer arranges overlapping observations. */
    position: PositionAdjustment;
};

/** Constructor input for {@link SetLayerStatCommand}, accepting a stat in any of its input forms. */
type SetLayerStatOptions = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    /** The stat to apply — a name, a built-in spec with params optional, or a plugin stat's name. */
    stat: StatSpec | StatName | CustomStatSpec<string>;
};

/** Serialized parameters of {@link SetLayerStatCommand}, with the stat's params settled. */
type SetLayerStatParams = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    /** The resolved stat — replaying a deserialized command produces an identical spec. */
    stat: ResolvedStatSpec;
};

type SetLayerYScaleTypeParams = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    /** Which y scale the layer binds to — the primary or the secondary axis. */
    yScaleType: YScaleType;
    /**
     * Scales as they stood before this apply. Set on revert so undo restores an authored
     * `ySecondary` instead of re-deriving one from `y`.
     */
    previousScales?: ResolvedSpec['scales'];
};

type SetLegendAlignParams = {
    align: LegendAlign;
};

type SetLegendDisplayParams = {
    display: LegendDisplay;
};

type SetLegendPlacementParams = {
    position: LegendPosition;
    align: LegendAlign;
};

type SetLegendPositionParams = {
    position: LegendPosition;
};

type SetLineCurveParams = {
    layerId?: string;
    curve: Curve;
};

type SetLineMissingValuesParams = {
    /** Layer to target; when omitted, the first line/area layer is used. */
    layerId?: string;
    /** How the path treats observations with no value — substitute zero, break, or span the gap. */
    missingValues: MissingValues;
};

type SetLineWidthParams = {
    layerId: string;
    /** Stroke width in px, or `null` to fall back to the stylesheet. */
    lineWidth: number | null;
};

type SetNumberFormatAbbreviationParams = {
    abbreviation: NumberFormatConfig['abbreviation'];
};

type SetNumberFormatDecimalsParams = {
    decimals: NumberFormatConfig['decimals'];
};

type SetPointSizeParams = {
    layerId: string;
    /** Point diameter in px, or `null` to fall back to the stylesheet. */
    size: number | null;
};

type SetPolarInnerRadiusParams = {
    /**
     * Hole radius as a fraction of the outer radius: `0` is a full pie, `0.55` a donut.
     * The constructor clamps values outside `[0, 1]` — beyond that range the radial axis inverts or
     * collapses — so `params.innerRadius` always holds the value the command would write.
     */
    innerRadius: number;
};

type SetPolarStartAngleParams = {
    /**
     * Angle in degrees, clockwise from 12 o'clock, where the sweep begins — `90` starts a pie at
     * 3 o'clock. The constructor wraps values into `[0, 360)`, so `params.startAngle` always holds
     * the value the command would write and a full extra turn reads as a no-op.
     */
    startAngle: number;
};

type SetRuleLabelParams = {
    /** Layer to target; when omitted, the first rule layer is used. */
    layerId?: string;
    /** Text rendered alongside the line; `null` removes it. */
    label: RuleGeomParams['label'] | null;
};

type SetRuleValueParams = {
    /** Layer to target; when omitted, the first rule layer is used. */
    layerId?: string;
    /** Where along its axis the line sits, in data units. */
    value: number;
};

type SetScaleDomainParams = {
    /** Which scale to change, identified by the aesthetic it drives (e.g. x, y). */
    scaledAesthetic: ScaledAestheticKey;
    /** New lower bound; omit to leave the existing minimum unchanged. */
    domainMin?: ResolvedContinuousScaleSpec['domainMin'];
    /** New upper bound; omit to leave the existing maximum unchanged. */
    domainMax?: ResolvedContinuousScaleSpec['domainMax'];
};

type SetScalePaletteParams = {
    scaledAesthetic: ScaledAestheticKey;
    palette: ResolvedPaletteSpec;
};

type SetScaleReverseParams = {
    /** Which scale to change, identified by the aesthetic it drives (e.g. x, y). */
    scaledAesthetic: ScaledAestheticKey;
    /** Whether the domain maps onto the range back to front. */
    reverse: ResolvedContinuousScaleSpec['reverse'];
};

type SetScaleTransformParams = {
    scaledAesthetic: ScaledAestheticKey;
    transform: ScaleTransformType;
};

type SetStatLineParams = {
    line: StatLine;
    /** The drawn line this change is about, where the caller knows it. */
    layerId?: string;
    /** Which curve a trend fits. @default 'linear' */
    method?: SmoothMethod;
    /** The group an average is taken over — a value of the layer's color variable. */
    group?: StatLineGroup;
    /** Text alongside an average. Supplied by the caller, who knows the locale. */
    label?: string;
    /** Restores the line this change replaced, so undo brings back its own settings and identity. */
    removedLayer?: ResolvedLayerSpec;
};

/** Serialized parameters of {@link SetStyleRuleCommand}. */
type SetStyleRuleParams = {
    /** Which stylesheet list the entry lives in. */
    list: StylesheetList;
    /** The entry to write. Its `select` and `when` say which entry — see {@link SetStyleRuleCommand}. */
    rule: StyleRuleEdit;
    /** Insert position for a new entry, clamped to the list bounds; appends when omitted. */
    index?: number;
};

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
 * Regression methods supported by the `smooth` stat.
 */
type SmoothMethod = 'linear' | 'loess' | 'exponential' | 'logarithmic' | 'quadratic' | 'power' | 'polynomial';

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

/** A stack's total at one x position, with where its label should be anchored. Drives stack-total labels. */
interface StackTotalEntry {
    /** Serialised x value for stable join keys across observations. */
    xKey: string;
    /**
     * Net signed sum of segment values at this x (positive segments add, negative subtract).
     * Doubles as the denominator for percentage labels — each segment's share is `y / total`.
     */
    total: number;
    /** Where to anchor the stack-total label: which segment's bounds, and which side. */
    anchor: AnchorSegment;
}

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

/** Input to {@link Stat.compile}: the layer's dataset and mapping plus the resolved stat spec to apply. */
interface StatCompilerInput {
    /** The input dataset. */
    data: Dataset;
    /** The effective mapping for the layer. */
    mapping: AesMapping;
    /** The resolved stat spec. Narrow by `spec.type` to access stat-specific params. */
    spec: ResolvedStatSpec;
    /**
     * Whether the x aesthetic resolves to a discrete (band) scale. The `smooth` stat emits one fitted
     * point per observed x when set.
     */
    xScaleIsDiscrete: boolean;
    /**
     * The layer's resolved params. As in ggplot, one param list serves the layer's geom and its stat, so a stat
     * a geom applies by default reads its settings (a boxplot's whisker `extent`) where the author sets the geom's.
     */
    params?: Readonly<Record<string, unknown>>;
}

/** A custom stat is a {@link Stat} subclass instance. Named alias for its role as a plugin. */
type StatDefinition = Stat;

/**
 * The line a chart derives from its own data: the regression fitted through it, or the mean of one
 * of its groups. `'none'` draws neither.
 */
type StatLine = 'none' | 'trend' | 'average';

/**
 * A group an average can be narrowed to. Narrower than a `DataValue`, which a command travelling as
 * JSON cannot carry: a group standing for a date is named by its timestamp.
 */
type StatLineGroup = string | number | null;

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

/**
 * A color-valued declaration in any of its authored forms: a CSS color literal, an inline
 * light-dark pair or a reference into the stylesheet's token table.
 */
type StyleColorValue = string | LightDarkColor | StyleTokenRef;

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

/**
 * Where a compiled entry came from: the built-in stylesheet, the theme's or the spec's, with its
 * position and its `id` when it has one. `explain()` and warnings report it.
 */
type StyleEntryOrigin = {
    list: 'builtin';
} | {
    list: 'theme';
    index: number;
    id?: string;
} | {
    list: 'defaults' | 'overrides';
    index: number;
    id?: string;
};

/**
 * The answer to "why does this element look like that".
 */
interface StyleExplanation<Property extends StyleProperty = StyleProperty> {
    value: ResolvedStyleDeclarations[Property] | undefined;
    tier: StyleResolutionTier;
    /** Present when a stylesheet entry produced the value. */
    origin?: StyleEntryOrigin;
    /** Present when a state-scoped entry produced the value. */
    state?: StyleState;
}

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

/** One style property name — the keys of the flat declarations shape. */
type StyleProperty = (typeof STYLE_PROPERTY_NAMES)[number];

/** The readers the `geom` root returns for a layer of kind `L`. */
type StyleReadersForLayer<L extends SceneLayer> = L extends SceneLayerFor<infer Kind> ? Kind extends keyof GeomKindReaders ? GeomKindReaders[Kind] : GeomStyleReaders : GeomStyleReaders;

/** Which cascade tier answered a geom read. `'default'` covers both authored defaults and the built-in stylesheet. */
type StyleResolutionTier = 'override' | 'data' | 'default' | 'unresolved';

/** A {@link StyleRule} whose `declarations` may be `null`, which removes the entry at that address. */
type StyleRuleEdit = WithNullablePaint<StyleRule>;

/** A drop shadow. Offsets and blur are pixels; `color` takes the same forms as other color properties. */
interface StyleShadow<ColorValue> {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: ColorValue;
}

/** `'none'` hides the shadow; an object paints one. */
type StyleShadowValue<ColorValue> = StyleShadow<ColorValue> | 'none';

/** The runtime states a style entry can scope to. States are paint-only — they never feed layout. */
type StyleState = (typeof STYLE_STATES)[number];

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

/** The serialized form of a {@link token} reference. */
interface StyleTokenRef {
    token: string;
}

/** The stylesheet's token table, mapping the names {@link token} references to their colors. */
type StyleTokenTable = Record<string, StyleTokenValue>;

/** A named color in the stylesheet's token table: one literal or a light-dark pair. */
type StyleTokenValue = string | LightDarkColor;

/** What one target may declare, each property with the domain its value must land in. */
type StyleVocabulary = Partial<Record<StyleProperty, StyleDomain>>;

/** Which of a stylesheet's two lists an entry lives in. */
type StylesheetList = 'defaults' | 'overrides';

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

type ToggleCategoryLabelsParams = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    showCategoryLabels: boolean;
};

type ToggleContentVisibilityParams = {
    /** Which content part to show or hide. */
    part: ContentPart;
    isVisible: boolean;
};

type ToggleDataLabelsParams = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    showDataLabels: boolean;
};

type ToggleGoalLineParams = {
    showGoalLine: boolean;
    /** The drawn line this change is about, where the caller knows it. */
    layerId?: string;
    /** Where on the measure axis the line sits when switching it on. */
    value?: number;
    /** Text alongside the line when switching it on. Supplied by the caller, who knows the locale. */
    label?: string;
    /** Restores a removed goal line, so undo brings back the value and label it carried. */
    removedLayer?: ResolvedLayerSpec;
};

type ToggleLineFillParams = {
    layerId: string;
    showFill: boolean;
    /** Optional opacity when enabling fill; otherwise uses the inherited fill or the default. */
    fillAlpha?: number;
};

type ToggleLinePointsParams = {
    /** Path layer whose vertices get points; absent, the chart's first line or area. */
    layerId?: string;
    showPoints: boolean;
    /** When restoring a previously removed point layer, holds the full layer spec to re-insert. */
    removedLayer?: ResolvedLayerSpec;
};

type ToggleStackTotalsParams = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    showStackTotals: boolean;
};

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

type TooltipContract = readonly TooltipField[];

/**
 * One row of a geom's tooltip contract. Left out when the observation has no value, so one contract can cover
 * several observation kinds (a sankey's nodes and flows).
 */
type TooltipField = AesTooltipField | RangeTooltipField;

/**
 * Which hovered observations the tooltip lists.
 * - 'band': everything at the hovered position: the hovered observation, its group (stacked segments, dodged
 *   siblings) and the related observations on other layers (default)
 * - 'observation': the hovered observation and, from each other layer, the related observation in its group
 * - 'none': no tooltip; hover, highlight and cursor still respond
 */
type TooltipMode = 'band' | 'observation' | 'none';

/**
 * Discriminated union of the built-in transform inputs, keyed on `transformType`. Use
 * {@link AnyTransformSpec} where a plugin-contributed transform may also appear.
 */
type TransformSpec = ReshapeTransformSpec | FilterTransformSpec | SortTransformSpec | AggregateTransformSpec | ConstantTransformSpec;

/**
 * Strategy interface for compiling a specific transform type.
 */
interface TransformStrategy {
    /**
     * The transform's name. Built-in transforms narrow this to a `TransformType` literal; the type
     * accepts any `string` so a custom transform carries a name outside the built-in union, resolved
     * through the registry.
     */
    readonly transformType: string;
    apply: (data: Dataset, transform: AnyTransformSpec) => Dataset;
    /**
     * Variable names this transform adds to the dataset (e.g. a reshape's key column or a constant's
     * variable). Declared so consumers can discover introduced columns without branching on the type.
     */
    getIntroducedVariables?: (transform: AnyTransformSpec) => VariableName[];
}

/** Serialized parameters of {@link UpdateAnnotationCommand}. */
type UpdateAnnotationParams<TKind extends AnnotationKind = AnnotationKind> = {
    /**
     * Kind of the annotation being patched. Redundant with the id, but it types `patch` against one
     * kind's fields and lets `apply` refuse a patch aimed at a different kind.
     */
    kind: TKind;
    /** Identity of the annotation to patch, unique across every bucket. */
    id: string;
    patch: AnnotationPatch<TKind>;
};

/**
 * Stable code for a failure the caller can fix by editing their {@link ResolvedSpec} or {@link Data}.
 */
type UserInputErrorCode = 'UNKNOWN_VARIABLE' | 'INCOMPATIBLE_TYPE' | 'INCOMPATIBLE_SCALE_DOMAIN' | 'MISSING_AESTHETIC' | 'UNDECLARED_AESTHETIC' | 'DUPLICATE_TOOLTIP_HEADING' | 'INVALID_RULE_MAPPING' | 'UNSUPPORTED_MAPPING' | 'INVALID_GEOM_PARAM' | 'UNSUPPORTED_COORD' | 'UNSUPPORTED_POSITION' | 'UNSUPPORTED_SCALE_TYPE' | 'MISSING_STAT_VARIABLE' | 'CONFLICTING_STAT_MAPPING' | 'MISSING_STAT_OUTPUT' | 'INVALID_STAT_PARAM' | 'CONFLICTING_SCALE_DEMANDS' | 'UNKNOWN_REGISTERED_TYPE' | 'DUPLICATE_REGISTERED_TYPE' | 'MISSING_GEOM_RENDERER' | 'RENDER_HIT_TEST_IDENTITY' | 'SPATIAL_KIND_COORD_UNSUPPORTED' | 'MISSING_RENDER_HIT_TEST' | 'CONFLICTING_RENDER_HIT_TEST' | 'OVERLAY_REQUIRES_RENDER_HIT_TEST' | 'MISSING_ANCHOR_CAPABILITY' | 'MISSING_DATA_LABEL_PLACEMENT' | 'PALETTE_NOT_FOUND' | 'UNKNOWN_LAYER_ID' | 'INVALID_PREDICATE_OPERATOR' | 'INVALID_STYLE_RULE' | 'INVALID_SEQUENCE' | 'ANNOTATION_REF_NOT_FOUND' | 'ANNOTATION_ANCHOR_UNRESOLVED' | 'ANNOTATION_DUPLICATE_ID' | 'INVALID_HIGHLIGHT_OPERATOR' | 'INCOMPARABLE_ARROW_ENDPOINTS' | 'UNRESOLVABLE_COLOR' | 'CONFLICTING_COLOR_RAMP' | 'DIVERGING_SCHEME_WITHOUT_MIDPOINT' | 'UNSUPPORTED_GRAPH_TYPE' | 'INVALID_DATA_SHAPE' | 'EMPTY_DATASET' | 'DATA_LABEL_PLACEMENT_COERCED' | 'DATA_LABELS_UNSUPPORTED' | 'DATA_LABEL_SETTING_IGNORED' | 'DATA_LABELS_DROPPED' | 'UNKNOWN_TOOLTIP_FIELD';

/**
 * One user-input problem authored once and used three ways: pushed onto the collector as a warning
 * ({@link DiagnosticsCollector.addWarning}) or a batched error
 * ({@link DiagnosticsCollector.addError}), or thrown as a {@link UserInputError}. `kind` is
 * never restated — it is implied by the partitioned `code`, so it cannot drift from it.
 */
interface UserInputIssue extends DiagnosticDetails {
    code: UserInputErrorCode;
}

/**
 * The compiler-emitted descriptor of how a raw data value should be turned into a display string.
 *
 * The engine never formats values itself: it tags each guide/legend/headline figure with a
 * `ValueFormat` (e.g. `SceneAxisGuide.valueFormat`), and the renderer materializes it via
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
 * What a value reading is for, which decides whether a geom's own value channel answers it.
 *
 * - `'label'` — a data label prints the value, with no geometry to agree with: a point's label can
 *   print the `size` it is drawn at.
 * - `'measurement'` — an annotation reports the value, so it must name the quantity the anchor
 *   position expresses. A geom whose value rides on a position axis defers here, whatever it labels.
 */
type ValueSourcePurpose = 'label' | 'measurement';

/**
 * Friendly display labels for variables, keyed by variable name. Sourced from
 * `Data.columns[i].label` for raw columns; consumers may extend this map to
 * provide labels for transform-produced columns. Only present entries are
 * stored — absent variables fall back to the raw variable name at the guide.
 */
type VariableLabels = Record<string, string>;

/**
 * Variable mapping - references a column in the data
 */
interface VariableMapping {
    variable: string;
}

/** A type alias for variable names. */
type VariableName = string;

type VocabularyOf<Part> = Part extends {
    vocabulary: infer Vocab extends StyleVocabulary;
} ? Vocab : Record<never, never>;

/** Distributes over the entry union, so each kind keeps its own vocabulary. */
type WithNullablePaint<Rule> = Rule extends {
    declarations: infer Declarations;
} ? Omit<Rule, 'declarations'> & {
    declarations: Declarations | null;
} : never;

/** Distributes over the {@link ResolvedLayerSpec} union so each arm keeps discriminating on its `geom`. */
type WithOptionalId<TLayer> = TLayer extends unknown ? Omit<TLayer, 'id'> & {
    id?: string;
} : never;

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
```

## Supporting types — @graphysdk/react-renderer

Types referenced by the sections above, included so no name dangles.

```ts
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
 * A theme's own shapes, each in place of the default one. A shape it leaves out is drawn by the
 * default. Wrap `DefaultGeomCircle` and its siblings to keep their transitions.
 */
interface GeomShapes {
    Circle?: ComponentType<GeomCircleProps>;
    Line?: ComponentType<GeomLineProps>;
    Rect?: ComponentType<GeomRectProps>;
    Path?: ComponentType<GeomPathProps>;
}

/**
 * A position in the space the geom paints in: a panel percentage (`'42.5%'`) or a user coordinate
 * inside a unit-space nested SVG. Both sides of a transition must be in the same units to spring.
 */
type ShapePosition = string | number;

/**
 * A theme as a host applies it: what the compiler reads, plus the shapes the renderer draws with.
 */
interface Theme extends Theme_2 {
    /**
     * The theme's own circle, line, rect and path. A geom built from `GeomCircle` and its siblings is
     * drawn with them, which is how a geom from a package takes the theme. Built-in geoms are repainted
     * through `plugins`.
     */
    shapes?: GeomShapes;
}
```

## Supporting types — @graphysdk/react-renderer/editable

Types referenced by the sections above, included so no name dangles.

```ts
interface ButtonBaseProps extends ControlBaseProps {
    onClick: () => void;
    /**
     * `default` is a row: the icon before the label, on the section's own width. `tile` stacks the
     * icon above the label in a taller cell, for a grid of add-affordances read as pictures.
     */
    variant?: 'default' | 'tile';
}

/**
 * What the button shows, as a choice rather than two independent flags.
 *
 * A button with neither a label nor an icon is invisible and unnameable, and two optional props
 * make that the default rather than an error. Splitting the cases closes it, and closes the one
 * beside it: an icon standing alone is the only thing on the button, so it carries the accessible
 * name and `ariaLabel` stops being optional.
 */
type ButtonContentProps = {
    label: string;
    icon?: ReactNode;
} | {
    label?: undefined;
    icon: ReactNode;
    ariaLabel: string;
};

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

/** No `layout`: a toggled section is always collapsible. */
type GoalSectionProps = Omit<OverridableSectionProps, 'layout'>;

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

interface IntlProviderProps {
    locale?: I18nLocale;
    children: ReactNode;
    i18nOverrides?: I18nRuntimeOverrides;
    /** The phrase sets this tree translates against, most specific first. Defaults to the chart's own. */
    dictionaries?: readonly PhraseSource[];
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

interface PanelExpansion {
    expandSection: (title: string) => void;
    collapseAllSections: () => void;
}

interface PanelProps extends Omit<PanelRootProps, 'children'> {
    /**
     * Replaces the sections entirely. A panel is a convenience over composing them by hand, so the
     * escape hatch is the composition it saves you writing rather than a set of flags on top of it.
     */
    children?: ReactNode;
}

/** What every ready-made panel forwards, so a panel is a section list over the same root. */
interface PanelRootProps {
    /**
     * The graph this panel edits. Omit it to edit the `<GraphProvider>` the panel sits inside;
     * retarget the panel by passing a different handle.
     */
    handle?: GraphHandle;
    /**
     * The sections to show, in order. Passing them rather than having the panel choose is what lets a
     * host drop a section, reorder them, or slot one of its own between two of ours.
     */
    children: ReactNode;
    /**
     * Replacements for individual leaf controls, for this editor panel alone. Omitted members keep the ones
     * above it, a `ControlRegistryProvider`'s or ours, so a host adopts its own design system one control at a
     * time rather than all at once.
     */
    controls?: ControlRegistry;
    /** Title of the section open on first render. Omit to start with all of them closed. */
    defaultExpandedSection?: string;
    className?: string;
}

/** One surface's phrases, per locale. */
type PhraseSource = Partial<Record<I18nLocale, object>>;

/** A choice in a `RadioGrid`, which can sit somewhere other than its turn in the arrow keys' order. */
interface RadioGridOption extends ControlOption {
    /** The grid row it sits on, counting from 1; without one it takes the next free place. */
    gridRow?: number;
    /** The grid column it sits in, counting from 1. */
    gridColumn?: number;
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

interface SettingRowProps {
    label?: string;
    layout?: RowLayout;
    icon?: ReactNode;
    children: ReactNode;
}

interface ToggledSectionProps extends Omit<SectionProps, 'layout' | 'accessory' | 'onOpenChange'> {
    isChecked: boolean;
    onToggle: (isChecked: boolean) => void;
    isDisabled?: boolean;
}
```
