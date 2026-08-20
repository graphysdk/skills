<!-- GENERATED FILE — do not edit. -->

# Type reference

Generated from `@graphysdk/viz-engine@1.8.1-beta.1786952756412` and `@graphysdk/react-renderer@1.8.1-beta.1786952756412` (root and `/editable` entries).

> The exact public editing API, extracted verbatim (with JSDoc) from the built
> `.d.ts` files: the command system and annotation model from
> `@graphysdk/viz-engine`, the handle & hooks from `@graphysdk/react-renderer`,
> and the panel, sections and controls from `@graphysdk/react-renderer/editable`.
> Check precise signatures, option keys, and accepted values here; the other
> reference files cover how the pieces compose. Every type these declarations
> reference is defined in this file, most under "Supporting types" at the
> end. The only opaque names are compiled/internal shapes and the authoring-side spec graph (documented in the graphy-charts skill's types.md): AesMapping, AnnotationSpecByKind, AnnotationsSpec, CompiledLayer, CompiledSpec, CompiledStat, CoreIntlProviderProps, CustomPalettesInput, Data, Dataset, Geom, GraphSlots, HighlightSpec, Observation, Predicate, RenderOnlyPlugin, Spec, SpecInput, StyleRule, StyleSelect, ThemeOverrides, VizDiagnostic, WhenClause.
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
     * {@link GraphHandle.getCompiled} it is what `useSyncExternalStore` needs, so a surface outside the
     * graph's tree stays in step with it. Subscribing before the graph compiles is valid.
     */
    subscribe: (onGraphChange: () => void) => () => void;
    /** The graph's compiled spec as of now, or `null` before its first successful compile. */
    getCompiled: () => CompiledSpec | null;
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
}

/** Write access to the graph's spec: applying {@link Command}s and closing the runs they form. */
interface GraphCommands {
    /** Applies a command to the provider's live spec. */
    dispatch: (command: Command, options?: DispatchOptions) => void;
    /**
     * Closes a run of `{ transient: true }` dispatches and fires `onChange` once for it. Call it when
     * the gesture ends — pointer up, blur. Forgetting only delays the notification rather than
     * corrupting undo: the run covers one {@link EditTarget}, and the next committed dispatch, undo,
     * redo or external change closes it.
     */
    seal: () => void;
}

/** Undo/redo controls plus the command stack's own snapshot, which a history UI reads. */
type GraphHistory = CommandStackSnapshot & {
    /** Reverses the most recent command; returns whether the chart took the step, as {@link GraphHandle.undo}. */
    undo: () => boolean;
    /** Re-applies the most recently undone command; returns whether the chart took the step, as {@link GraphHandle.undo}. */
    redo: () => boolean;
};

/**
 * Chart display and interaction mode.
 * - 'readonly': Normal chart display with full interactivity but no editing (default)
 * - 'editable': Chart with inline editing capabilities for labels, titles, etc.
 */
type GraphMode = 'readonly' | 'editable';

/**
 * Returns the graph's command controls.
 *
 * @example
 * ```tsx
 * const { dispatch, seal } = useGraphCommands();
 *
 * const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
 *    const rule = style.graph({ borderRadius: event.target.valueAsNumber });
 *    dispatch(new SetStyleRuleCommand({ list: 'defaults', rule, id: 'frame-radius' }), { transient: true });
 * };
 *
 * const handlePointerUp = () => seal();
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
 *     <GraphProvider input={input} data={data} handleRef={handleRef}>
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
 * Subscribes to a derived slice of the compiled spec. The subscription only fires when the
 * selector's result changes by reference, so combined with the compiler's per-stage memoization
 * this skips re-renders whenever the selected slice is unchanged.
 *
 * @example
 * ```ts
 * const layers = useCompiledSelector((compiled) => compiled.layers);
 * const xAxis = useCompiledSelector((compiled) => compiled.guides.axes[0]);
 * ```
 */
const useCompiledSelector: <Selected>(selector: (compiled: CompiledSpec) => Selected) => Selected;

/**
 * The graph's compiled spec, re-read whenever the graph changes, or `null` before its first
 * successful compile.
 *
 * Returns the whole spec: `useSyncExternalStore` compares snapshots by reference, so a selector
 * building a fresh object per call would re-render forever. Derive slices at the call site.
 */
const useHandleCompiled: (handle: GraphHandle) => CompiledSpec | null;

/**
 * Drops the selected targets `spec` no longer holds, and hands back the same list when it holds all
 * of them — a selection that survived a command must not churn its subscribers.
 *
 * Validated against the spec rather than compiled output: the compiler silently drops annotations it
 * cannot place, and a target whose annotation failed to resolve has to stay selected for the user to
 * be able to repair it.
 */
const pruneSelection: (selection: readonly EditTarget[], spec: Spec) => readonly EditTarget[];

/** Props for {@link GraphProvider}: the data and spec input to compile, plus color scheme, locale and plugin wiring. */
interface GraphProviderProps {
    data: Data;
    input: SpecInput;
    /**
     * Custom geoms, stats, and transforms (and their render halves) registered for this graph. Seeds
     * the compiler and builds the per-provider render resolver from one array. Construction-time config,
     * frozen at mount — change the registered set by remounting (React `key`); `data`/`input`/`colorScheme`
     * stay reactive.
     */
    plugins?: readonly Plugin_2[];
    formattingLocale?: Locale;
    /**
     * Filled with this graph's {@link GraphHandle}, for callers mounted outside the provider where the
     * hooks can't reach. `useGraphHistoryShortcuts` binds the undo/redo chords to one.
     */
    handleRef?: Ref<GraphHandle>;
    onChange?: (next: SpecInput) => void;
    /** Fires with the compile failure(s) whenever a compile/recompile/dispatch produces errors. */
    onError?: (errors: VizDiagnostic[]) => void;
    /** Fires with any warnings a successful compile produced. */
    onWarnings?: (warnings: VizDiagnostic[]) => void;
    colorScheme?: ColorScheme;
    themeOverrides?: ThemeOverrides;
    customPalettes?: CustomPalettesInput;
    children: ReactNode;
}
```

## Command contract

```ts
/**
 * A serializable, undoable edit to a `Spec`. Commands are stateless: `apply` returns a new spec plus
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
     * `CompiledSpec.spec`, and on a non-`null` result recompile the returned spec —
     * `const result = command.apply(compiled.spec); if (!result) return; recompile({ spec: result.spec })`.
     */
    apply: (spec: Spec) => CommandApplyResult | null;
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
    readonly spec: Spec;
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
    axis: AxisTarget;
} | {
    kind: 'grid';
    axis: GridAxisTarget;
} | {
    kind: 'legend';
} | {
    kind: 'layer';
    layerId?: string;
} | {
    kind: 'observation';
    layerId: string;
    index: number;
} | {
    kind: 'mapping';
    aesthetic: AestheticKey;
} | {
    kind: 'scale';
    aesthetic: ScaledAestheticKey;
} | {
    kind: 'coords';
} | {
    kind: 'appearance';
} | {
    kind: 'headline';
} | {
    kind: 'numberFormat';
};

/**
 * Value equality over an edit target, so a store holding a selection can skip an identical write and
 * a caller can ask whether what it is about to select is already selected.
 */
const areEditTargetsEqual: (left: EditTarget | null, right: EditTarget | null) => boolean;

/**
 * Convert a resolved {@link Spec} back into a {@link SpecInput}.
 *
 * Only palette scales need translating: a resolved one carries the colors looked up from the custom
 * palette, which the input names by id instead. Every other resolved shape (`LayerSpec`,
 * `HighlightSpec`, `AnnotationsSpec`, `CoordSpec`, `ConfigSpec`) is a strict superset of its `Input`
 * counterpart and passes through unchanged — layer references included, since both sides name a
 * layer by its stable `id`.
 */
function convertSpecToInput(spec: Spec): SpecInput;

/**
 * Returns a new object with `updates` applied via structural sharing: untouched subtrees keep their
 * original references, and a patch with no changes returns the same reference. Generic over the tree
 * shape, so it applies equally to a compiled `Spec`, a `SpecInput`, or any nested plain-object config.
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
    apply(spec: Spec): CommandApplyResult | null;
}

/**
 * Adds a layer to the spec — the on direction of "show a trend line", "show an average", "add a
 * series". Carries a whole {@link LayerSpec} because that is what those toggles differ by.
 *
 * Reverts with a {@link RemoveLayerCommand} for the same id.
 */
class AddLayerCommand implements Command<AddLayerParams> {
    readonly type: "add-layer";
    readonly metadata: CommandMetadata;
    readonly params: AddLayerParams;
    constructor(options: AddLayerOptions, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: Spec): CommandApplyResult | null;
}

/** Constructor input for {@link AddLayerCommand}, with `id` still optional. */
type AddLayerOptions = {
    layer: LayerDraft;
    /** Position in draw order, clamped to the list bounds; appends when omitted. */
    index?: number;
};

/**
 * A {@link LayerSpec} whose `id` {@link AddLayerCommand} mints when omitted. Every other field is
 * required: the command adds the layer the caller built rather than resolving one.
 */
type LayerDraft = WithOptionalId<LayerSpec>;

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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
}

/**
 * Command that binds a layer to the primary or secondary y axis — the dual-axis control on a combo
 * chart, where a revenue line reads against the left axis and a margin line against the right.
 * Targets a specific layer by ID, or falls back to the spec's first layer, and moves that layer
 * alone; siblings keep their own binding.
 * Produces a revert command that restores the previous binding for undo support, and returns
 * `null` when the layer already reads against the requested axis.
 */
class SetLayerYScaleTypeCommand implements Command<SetLayerYScaleTypeParams> {
    readonly type: "set-layer-y-scale-type";
    readonly metadata: CommandMetadata;
    readonly params: SetLayerYScaleTypeParams;
    constructor(params: SetLayerYScaleTypeParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
}

/**
 * Command that rounds the bars themselves: `SetAppearanceCornerRadiusCommand` rounds the chart's
 * frame and `PanelConfig.cornerRadius` the plotting area.
 *
 * The rounding merges into the layer's own override entry, leaving whatever else that entry paints.
 */
class SetBarBorderRadiusCommand implements Command<SetBarBorderRadiusParams> {
    readonly type: "set-bar-border-radius";
    readonly metadata: CommandMetadata;
    readonly params: SetBarBorderRadiusParams;
    constructor(params: SetBarBorderRadiusParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
}

/**
 * Command that changes the interpolation method (e.g. linear, monotone, step) on a line or area layer.
 * Targets a specific layer by ID, or falls back to the first line/area layer in the spec.
 * Produces a revert command that restores the previous interpolation value for undo support.
 */
class SetLineInterpolationCommand implements Command<SetLineInterpolationParams> {
    readonly type: "set-line-interpolation";
    readonly metadata: CommandMetadata;
    readonly params: SetLineInterpolationParams;
    constructor(params: SetLineInterpolationParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
}

/** Sets a point layer's diameter. Merges into the layer's own override entry, leaving what else it paints. */
class SetPointSizeCommand implements Command<SetPointSizeParams> {
    readonly type: "set-point-size";
    readonly metadata: CommandMetadata;
    readonly params: SetPointSizeParams;
    constructor(params: SetPointSizeParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
    private buildGoalLine;
}

/**
 * Draws or removes the fill beneath a line. Line layers only: an area fills by definition.
 *
 * Switching off clears `fillAlpha` rather than writing a zero, since an undeclared alpha draws no fill.
 */
class ToggleLineFillCommand implements Command<ToggleLineFillParams> {
    readonly type: "toggle-line-fill";
    readonly metadata: CommandMetadata;
    readonly params: ToggleLineFillParams;
    constructor(params: ToggleLineFillParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: Spec): CommandApplyResult | null;
}

/**
 * Toggles a companion point layer for a line or an area — both are drawn as a path.
 *
 * A shown point layer inherits the path's mapping, position, y-scale binding and layer-local
 * transforms — everything that decides where a vertex lands, including which rows there are to land
 * on. Its `stat` is not: a smoothed line with raw dots is the scatter-and-trendline reading, and
 * copying the stat would draw the dots on the trend.
 */
class ToggleLinePointsVisibilityCommand implements Command<ToggleLinePointsVisibilityParams> {
    readonly type: "toggle-line-points";
    readonly metadata: CommandMetadata;
    readonly params: ToggleLinePointsVisibilityParams;
    constructor(params: ToggleLinePointsVisibilityParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
}

/**
 * Command that sets whether a continuous scale's domain is anchored at zero.
 * Targets a scale by scale aesthetic key.
 * Produces a revert command that restores the previous zero value for undo support.
 */
class SetScaleZeroCommand implements Command<SetScaleZeroParams> {
    readonly type: "set-scale-zero";
    readonly metadata: CommandMetadata;
    readonly params: SetScaleZeroParams;
    constructor(params: SetScaleZeroParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
}

/**
 * Shows or hides one of the chart's text slots without touching the text it holds, so a slot can be
 * hidden and shown again without the user retyping its content.
 */
class ToggleContentVisibilityCommand implements Command<ToggleContentVisibilityParams> {
    readonly type: "toggle-content-visibility";
    readonly metadata: CommandMetadata;
    readonly params: ToggleContentVisibilityParams;
    constructor(params: ToggleContentVisibilityParams, metadata?: Partial<CommandMetadata>);
    get target(): EditTarget;
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
}

/**
 * Sets the stroke width of a grid's lines, on one axis or on `both` as a single edit, or hands it
 * back to the theme with `null`.
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
}

/**
 * Scales every text element in the chart by a single multiplier, so a chart can be made legible at
 * a smaller embed size without restyling each label individually.
 */
class SetAppearanceTextScaleCommand implements Command<SetAppearanceTextScaleParams> {
    readonly type: "set-appearance-text-scale";
    readonly metadata: CommandMetadata;
    readonly params: SetAppearanceTextScaleParams;
    readonly target: EditTarget;
    constructor(params: SetAppearanceTextScaleParams, metadata?: Partial<CommandMetadata>);
    apply(spec: Spec): CommandApplyResult | null;
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
 * - `declarations: null` removes every entry at the address, so nothing paints there afterwards;
 *   an address the list doesn't hold is a no-op.
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
}

/**
 * Constructor input for {@link AddHighlightCommand}. `id` and `scope` are optional here and are
 * resolved into {@link AddHighlightParams}, mirroring the `HighlightInput` → `HighlightSpec`
 * distinction the spec resolver draws.
 */
type AddHighlightOptions = {
    /** Match condition evaluated against post-transform columns. Plain data, so it serializes as-is. */
    predicate: Predicate;
    /** Identity of the highlight; minted when omitted. */
    id?: string;
    /** Visual unit a match expands to; defaults to `data-point`. */
    scope?: HighlightScope;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
}

/**
 * The dim style a spec is on. Absent, the built-in stylesheet's own wash applies, which is what
 * `'dim'` restates.
 */
const readHighlightDimStyle: (spec: Spec) => HighlightDimStyle;

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
const findEquivalentHighlight: (highlights: readonly HighlightSpec[], candidate: HighlightCandidate) => HighlightSpec | null;

/**
 * Every highlight painting `observation`, in paint order — what an editor reads to offer removing one,
 * and to know which scopes would only repaint what is already there.
 *
 * A predicate names the observations a highlight was written from; the scope spreads each match onward,
 * so a `'series'` highlight covers observations its predicate never matched. Both halves run through what
 * the highlights compile stage itself uses — the same predicate compiler, and
 * {@link readHighlightSpreadKey} for how far a scope reaches — so this and the canvas cannot part ways.
 */
const findHighlightsAtObservation: ({ layer, highlights, observation, parsingLocale, }: HighlightsAtObservationInput) => HighlightSpec[];
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
    apply(spec: Spec): CommandApplyResult | null;
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
const findAnnotation: (annotations: AnnotationsSpec, id: string) => LocatedAnnotation | null;

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
 * The anchor that resolves back to `observation` on `layer` — the inverse of the compiler's observation
 * anchor resolution, so an annotation created on a hovered observation lands on that same observation.
 *
 * `null` when the observation carries no value on the variable anchors match against: the pair an anchor
 * is durable by does not exist, so an annotation pointing at it would be dropped at the next compile.
 */
const buildObservationAnchor: (layer: CompiledLayer, observation: Observation) => ObservationAnchor | null;

/**
 * Whether two anchors address the same observation, the comparison the compiler drops a collapsed arrow
 * on. Observations of one series can share an anchor value — a scatter series with a repeated x — so a
 * candidate that would collapse the arrow is passed over for the next one rather than offered.
 */
const areAnchorsEqual: (first: ObservationAnchor, second: ObservationAnchor) => boolean;

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
```

## Editable components — @graphysdk/react-renderer/editable

```ts
/**
 * `GraphRenderer` with the editor layer wired in. A host toggles `mode` rather than swapping
 * components, so hover, animation, the compiled store and the undo history survive the toggle.
 *
 * The editor store is held from here, above the renderer, because the editing surface fills a slot
 * beside the plot rather than above it: a store it hosted would be out of reach of the geoms and chrome
 * painting inside the plot `<svg>`, which have to show a target being reached for or an endpoint being
 * moved. A chart rendered without this wrapper has no editor state at all, and reads it at rest.
 *
 * @example
 * ```tsx
 * <GraphProvider input={input} data={data}>
 *   <EditableGraphRenderer mode={isEditing ? 'editable' : 'readonly'} />
 * </GraphProvider>
 * ```
 */
const EditableGraphRenderer: ({ slots, ...rest }: GraphRendererProps) => JSX.Element;

const IntlProvider: React.FC<CoreIntlProviderProps>;

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

/**
 * What a chart writes on its own marks. The grid is chrome behind them, and has its own section.
 *
 * Each row mirrors a condition in `runtime/data-labels/strategies/*.placement.ts` and
 * `Geom.dataLabelCoordTypes`, so a row is only offered where the engine will draw it.
 */
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
    axis: PrimaryAxisTarget;
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

/** Whether the chart shows its source. The one text slot never editable in place on the chart. */
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
    options: readonly ControlOption[];
    /** Items per row. Defaults to the number of options, i.e. a single row. */
    columns?: number;
    /**
     * `tile` (default) captions each icon; `swatch` drops the caption for a dense grid of pure
     * pictures — colour chips a name would only clutter — naming each through `aria-label` instead.
     */
    itemLayout?: 'tile' | 'swatch';
}

/** A single-choice dropdown, for a set too long or too wordy for a segmented row. */
const Select: ({ options, value, onChange, placeholder, isDisabled, hasError, ariaLabel, ariaLabelledBy, id, }: SelectControlProps) => JSX.Element;

/**
 * Single-choice dropdown, for a set too long or too wordy to sit in a segmented row.
 *
 * The value is nullable so a section can render "nothing chosen yet"; `onChange` only ever fires
 * with a real option, since clearing a required setting is not a gesture the panel offers.
 */
interface SelectControlProps extends DiscreteControlProps<string | null> {
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
const Slider: ({ value, onChange, onCommit, min, max, step, suffix, formatValue, isDisabled, ariaLabel, ariaLabelledBy, }: SliderControlProps) => JSX.Element;

interface SliderControlProps extends ContinuousControlProps<number> {
    min: number;
    max: number;
    step?: number;
    /**
     * Unit for the readout beside the track — `px`, `%`, `°`. Shows the value when given and hides it
     * when not, so a slider with nothing to say stays a bare track.
     */
    suffix?: string;
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
 * transiently and seals into one undo entry when the field is left.
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
 * transient run sealed on key up. Only the layout differs — a row of words here, a grid of pictures
 * there — which is the whole of why they are two controls.
 */
const ToggleGroup: ({ options, value, onChange, onCommit, itemLayout, isDisabled, ariaLabel, ariaLabelledBy, id, }: ToggleGroupControlProps) => JSX.Element;

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
}

/** A {@link ControlRegistry} with every member filled in, as sections consume it. */
type ResolvedControlRegistry = Required<ControlRegistry>;

/** The resolved controls for the surrounding panel. */
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
    scope: HighlightScope;
    /** Restrict evaluation to a single layer; omit to evaluate against every layer. */
    layerId?: string;
    /** Position to insert at, clamped to the list bounds; appends when omitted. */
    index?: number;
};

/** Serialized parameters of {@link AddLayerCommand}, with the id settled. */
type AddLayerParams = {
    /** The layer to add, resolved — replaying a deserialized command produces an identical spec. */
    layer: LayerSpec;
    /** Position in draw order, clamped to the list bounds; appends when omitted. */
    index?: number;
};

/** Name of a built-in aesthetic that can be mapped, such as `'x'` or `'color'`. */
type AestheticKey = keyof KnownAesthetics;

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

/**
 * A transform input that may be built-in or custom. Used at the spec-construction boundary
 * (`pipe`/`createSpec` items, `SpecInput.transforms`) and the transform compile stage, so a custom
 * transform pipes in and applies through the registry — while {@link TransformInput} stays the clean
 * built-in union everywhere a `transformType` is narrowed.
 */
type AnyTransformInput = TransformInput | CustomTransformInput<string>;

/**
 * Area-specific parameters.
 */
interface AreaGeomParams {
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

type AxisLimits = CoordSpec['params']['xLimits'];

type AxisPosition = 'left' | 'right' | 'top' | 'bottom';

/**
 * Axis a config command can target. `x` and `y` are always fully resolved; `ySecondary` is the
 * sparse {@link SecondaryAxisOverride}, so commands addressing it must be able to express a field
 * that is not set.
 */
type AxisTarget = PrimaryAxisTarget | 'ySecondary';

/**
 * Display mode for axis ticks
 * - 'auto': Show all ticks (default behavior)
 * - 'edges': Show only the first and last tick
 */
type AxisTickMode = 'auto' | 'edges';

/**
 * Bar/Column-specific parameters. `width` is geometry — it sets the band envelope the compiler
 * writes into the position variables. Paint (fill, border, corner rounding) is not a param: it
 * lives in the stylesheet (`spec.styles`), resolved per observation by the style resolver.
 */
interface BarGeomParams {
    /**
     * Bar width as a fraction of the band the discrete scale allocates to the category, in `(0, 1]`.
     * @default 0.7
     */
    width: number;
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
 * Colour interpolation space for an explicit ramp's stops. `'lab'` (perceptually near-uniform) is the
 * engine default; `'rgb'` reproduces d3's own default output; `'hcl'` matches Vega-Lite's. Named schemes
 * carry their own baked-in interpolation, so this never applies to them.
 */
const COLOR_INTERPOLATION_SPACES: readonly ["rgb", "lab", "hcl", "hsl"];

interface CartesianCoordSpec {
    type: 'coord';
    coordType: 'cartesian';
    params: BaseCoordParams;
}

/** The part of a chart its type owns, restored verbatim by a revert. */
interface ChartTypeState {
    coords: CoordSpec;
    layers: LayerSpec[];
    scales: ScaleSpec[];
    mapping: AesMapping;
}

/** The facts a chart's type names at once. Under polar, `theta` separates a pie from a rose, `innerRadius` a donut. */
type ChartTypeSummary = {
    coordType: 'cartesian' | 'flip';
    geom: GeomName;
    position: PositionType;
} | {
    coordType: 'polar';
    geom: GeomName;
    position: PositionType;
    theta: PolarTheta;
    innerRadius: number;
};

type ColorInterpolationSpace = (typeof COLOR_INTERPOLATION_SPACES)[number];

/** The light/dark axis a {@link LightDarkColor} resolves against. */
type ColorScheme = 'light' | 'dark';

/** Any named colour scheme accepted by a continuous colour scale. */
type ColorSchemeName = SequentialSchemeName | DivergingSchemeName;

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
interface CommentAnnotationInput {
    id?: string;
    at: ObservationAnchorInput;
    content: RichTextContent;
}

/** Comparison operators for declarative filtering. */
type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

/** The three compile-side definition shapes a plugin can contribute. */
type CompileDefinition = Geom<unknown> | StatDefinition | TransformDefinition;

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

/** A slot in the chart's text content. */
type ContentPart = 'title' | 'subtitle' | 'caption' | 'source';

/** Text slot of {@link ContentConfig} whose visibility toggles independently of the value it holds. */
type ContentVisibilitySlot = 'title' | 'subtitle' | 'caption' | 'source';

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
    /**
     * Output range. A numeric `[min, max]` for magnitude aesthetics (size, alpha, strokeWidth); a ramp of
     * two-or-more colour strings for a continuous `color` scale, interpolated in the
     * {@link ContinuousScaleInput.interpolate} space.
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

type ContinuousScaleSpec = Required<ContinuousScaleInput>;

/**
 * Discriminated union of all resolved coordinate specs (params fully defaulted).
 */
type CoordSpec = CartesianCoordSpec | FlipCoordSpec | PolarCoordSpec;

/**
 * Resolved count stat spec.
 */
interface CountStatSpec {
    type: 'count';
}

/** A resolved layer spec for a custom geom — the {@link CustomGeomLayerInput} counterpart. */
interface CustomGeomLayerSpec extends LayerSpecBase {
    geom: string;
    params: Record<string, unknown>;
}

type CustomPaletteConfig = {
    type: 'custom';
    id: string;
    colors: string[];
};

/**
 * The input node a custom (plugin-contributed) stat builder produces.
 */
interface CustomStatInput<Name extends string = string> {
    type: Name;
}

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
 * Diverging colormap names from `d3-scale-chromatic`, in Brewer's capitalisation. `RdBu`, `BrBG` and
 * `PuOr` are colour-vision-deficiency safe; `Spectral` is offered for its familiar rainbow look but is not
 * CVD-safe. Red-green ramps are deliberately excluded.
 */
const DIVERGING_SCHEME_NAMES: readonly ["RdBu", "BrBG", "PuOr", "Spectral"];

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
 * no background); off it — by placement, offset, or not fitting — outside styling (dark text on
 * a background). Area labels always use the outside styling: the translucent fill can't back
 * white text.
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

/** The type of a variable's values. Internally, numeric values are stored as numbers, dates as Date objects and categorical values as strings. */
type DataType = 'numeric' | 'categorical' | 'temporal';

/** The smallest unit of data in the dataset. `null` represents a missing value. */
type DataValue = number | string | Date | null;

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

type DatetimeScaleSpec = Required<DatetimeScaleInput>;

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

type DiscreteScaleSpec = Required<DiscreteScaleInput>;

/** A diverging colormap: its canonical ColorBrewer code or a friendly alias. */
type DivergingSchemeName = (typeof DIVERGING_SCHEME_NAMES)[number] | SchemeAlias;

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

interface FlipCoordSpec {
    type: 'coord';
    coordType: 'flip';
    params: BaseCoordParams;
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

type GraphyPaletteConfig = {
    type: 'graphy';
    variant?: GraphyPaletteVariant;
};

/** `waterfall` swaps in the positive/negative/total colors used by waterfall graphs. */
type GraphyPaletteVariant = 'default' | 'waterfall';

/**
 * Axes a grid command writes. `both` is one command under one edit target, so a drag over the whole
 * grid folds into a single undo entry rather than one per axis per frame.
 */
type GridAxisTarget = PrimaryAxisTarget | 'both';

/**
 * Comparison reference for trend indicator
 * - 'previous': Compare to preceding data point
 * - 'first': Compare to initial value in series
 * - 'none': No comparison indicator
 */
type HeadlineCompare = 'previous' | 'first' | 'none';

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
type HighlightCandidate = Omit<HighlightSpec, 'type' | 'id'>;

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

interface HighlightsAtObservationInput {
    /** The layer the observation belongs to; a highlight scoped to another one never covers it. */
    layer: CompiledLayer;
    /** The spec's highlights, in paint order. */
    highlights: readonly HighlightSpec[];
    /** The observation being asked about — the one under the pointer. */
    observation: Observation;
    /** The locale predicate values are parsed against, as the highlights stage parses them. */
    parsingLocale: Locale;
}

interface IdentityScaleInput {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'identity';
}

type IdentityScaleSpec = IdentityScaleInput;

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

/**
 * Curve interpolation method for lines and areas.
 *
 * - `'linear'` — Straight segments between points. Maps to d3-shape `curveLinear`.
 * - `'catmull-rom'` — Smooth spline through points. Maps to d3-shape `curveCatmullRom`.
 */
type InterpolateType = 'linear' | 'catmull-rom';

/**
 * The order staggered point geoms enter in: reading order along the main axis, or by size for
 * bubbles, which falls back to main-axis order for points with no size.
 */
type IntroStaggerOrder = 'main-axis' | 'value-ascending' | 'value-descending';

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

/**
 * Discriminated union of all resolved layer specs, keyed on `geom`.
 * All properties are fully resolved — no optionals.
 */
type LayerSpec = {
    [G in GeomName]: LayerSpecOf<G>;
}[GeomName] | CustomGeomLayerSpec;

interface LayerSpecBase {
    type: 'layer';
    id: string;
    mapping: AesMapping;
    stat: StatSpec;
    position: PositionType;
    yScaleType: YScaleType;
    transforms: TransformInput[];
    interactive: boolean;
    dataLabels: DataLabelsConfig;
}

type LayerSpecOf<G extends GeomName> = LayerSpecBase & {
    geom: G;
    params: GeomParamsMap[G];
};

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

type LegendPosition = 'auto' | 'right' | 'left' | 'top' | 'bottom' | 'none';

/**
 * Line-specific parameters.
 */
interface LineGeomParams {
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
}

/**
 * Stroke style for line rendering.
 *
 * - `'solid'` — Continuous unbroken stroke
 * - `'dashed'` — Repeating dash pattern
 * - `'dotted'` — Repeating dot pattern
 */
type LineStyleType = 'solid' | 'dashed' | 'dotted';

/** One of the BCP-47 locale strings the engine supports for number and date formatting. */
type Locale = (typeof LOCALES)[number];

/** The hues available as a base for monochrome palettes, in pick order. */
const MONO_BASES: readonly ["grey", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"];

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

/**
 * Resolved observation reference, scoped to a layer by its stable `layerId` (or unscoped).
 *
 * An observation reference survives as long as the (anchor, group) pair is
 * preserved in the dataset.
 */
interface ObservationAnchor {
    /** Stable id of the layer this reference is scoped to, when set. */
    layerId?: string;
    /** Value on the main axis (x in cartesian, y in flipped). */
    anchorValue: DataValue;
    /** The group value to match if any, otherwise match any group. */
    groupValue?: DataValue;
    /** Which point of the matched geom's box to resolve to. Omitted means the geom-natural point. */
    align?: AnchorAlign;
}

/** Points at a single observation by its anchor value and series. */
interface ObservationAnchorInput {
    /** Stable id of a layer; picks one out when several share the same `(anchorValue, groupValue)` pair. */
    layerId?: string;
    /** Value on the main axis (x in cartesian, y in flipped). */
    anchorValue: DataValue;
    /** The group value to match if any, otherwise match any group. */
    groupValue?: DataValue;
    /** Which point of the matched geom's box to resolve to. Omitted means the geom-natural point. */
    align?: AnchorAlign;
}

/** Every {@link PolarTheta}, for validation and diagnostics. */
const POLAR_THETAS: readonly ["x", "y"];

/** Every {@link PositionType}, for validation and diagnostics. */
const POSITION_TYPES: readonly ["stack", "dodge", "identity", "fill"];

/** Resolved palette selector; a custom palette carries its looked-up `colors`. */
type PaletteConfig = DefaultPaletteConfig | GraphyPaletteConfig | PastelPaletteConfig | NeonPaletteConfig | MonoPaletteConfig | CustomPaletteConfig;

/** Resolved palette overrides: group number (1-indexed) to a concrete hex color. */
type PaletteOverrides = Record<number, string>;

/** Resolved palette color scale with a concrete palette config. */
interface PaletteScaleSpec {
    type: 'scale';
    scaledAesthetic: ScaledAestheticKey;
    scaleType: 'palette';
    palette: PaletteConfig;
    overrides?: PaletteOverrides;
}

/** A pair of panel fractions: an anchor's own position, or a corner of a region. */
interface PanelPoint {
    x: number;
    y: number;
}

type PastelPaletteConfig = {
    type: 'pastel';
    variant?: PastelPaletteVariant;
};

/** `waterfall` swaps in the positive/negative/total colors used by waterfall graphs. */
type PastelPaletteVariant = 'default' | 'waterfall';

/** One value for the axes named, or one per axis — what a `both` revert needs, the two being writable apart. */
type PerAxisValue<T> = T | Readonly<Record<PrimaryAxisTarget, T>>;

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
 * - `axis`: see {@link AxisAnchor}.
 * - `selection`: see {@link SelectionPointAnchor}.
 * - `annotation`: see {@link AnnotationPointAnchor}.
 */
type PointAnchorInput = {
    anchorType: 'panel';
    x: number;
    y: number;
    offset?: AnchorOffset;
} | {
    anchorType: 'observation';
    /** Stable id of a layer; picks one out when several share the same `(anchorValue, groupValue)` pair. */
    layerId?: string;
    anchorValue: DataValue;
    groupValue?: DataValue;
    align?: AnchorAlign;
    offset?: AnchorOffset;
} | AxisAnchor | SelectionPointAnchor | AnnotationPointAnchor;

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
    params: PolarCoordParams;
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
type PositionType = (typeof POSITION_TYPES)[number];

/** Axis a config command targets when every field it writes is always resolved. */
type PrimaryAxisTarget = 'x' | 'y';

/**
 * An area, expressed as a relationship to the graph.
 *
 * - `panel`: a rectangle in panel-rect fractions (`[0,1]`), top-left origin.
 * - `selection`: see {@link SelectionRegionAnchor}.
 * - `annotation`: see {@link AnnotationRegionAnchor}.
 */
type RegionAnchorInput = {
    anchorType: 'panel';
    x: number;
    y: number;
    width: number;
    height: number;
} | SelectionRegionAnchor | AnnotationRegionAnchor;

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

interface ReshapeTransformInput {
    type: 'transform';
    transformType: 'reshape';
    options: ReshapeOptions;
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

/**
 * Union of scale specs that can appear after resolution (all fields required).
 * InferredScaleInput is resolved to a concrete type during spec resolution.
 */
type ScaleSpec = ContinuousScaleSpec | DiscreteScaleSpec | DatetimeScaleSpec | IdentityScaleSpec | PaletteScaleSpec;

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
     * Padding around the box: a number pads both axes in panel fractions, an {@link AnchorOffset} pads
     * each axis in its `unit` (`px` padding is applied by the runtime resolution pass).
     */
    padding?: number | AnchorOffset;
}

type SequentialSchemeName = (typeof SEQUENTIAL_SCHEME_NAMES)[number];

type SetAppearanceTextScaleParams = {
    /** Multiplier applied to every text element. `1` leaves the theme sizes untouched. */
    textScale: number;
};

/**
 * Axis title, where `null` means explicitly no label. Only `ySecondary` may omit it: that drops the
 * override so the axis inherits the primary y axis label. A primary axis always holds a resolved
 * label, so an omission has nothing to mean there.
 */
type SetAxisLabelParams = {
    axis: PrimaryAxisTarget;
    label: string | null;
} | {
    axis: 'ySecondary';
    label?: string | null;
};

type SetAxisPositionParams = {
    axis: PrimaryAxisTarget;
    /** Side the axis is drawn on. */
    position: AxisPosition;
};

type SetAxisTickModeParams = {
    axis: PrimaryAxisTarget;
    /** Which ticks are drawn. */
    tickMode: AxisTickMode;
};

type SetAxisTicksVisibilityParams = {
    axis: PrimaryAxisTarget;
    /** Whether tick marks are drawn. */
    isVisible: boolean;
};

type SetAxisVisibilityParams = {
    axis: PrimaryAxisTarget;
    /** Whether the axis is drawn. */
    isVisible: boolean;
};

type SetBarBorderRadiusParams = {
    /** Layer whose bars this rounds. */
    layerId: string;
    /** `'full'` is half the bar's thickness, giving a pill. `null` hands rounding back to the stylesheet beneath. */
    borderRadius: BorderRadiusToken | null;
};

type SetBarWidthParams = {
    /** Layer to target; when omitted, the first bar layer is used. */
    layerId?: string;
    /** Fraction of the category band each bar fills, clamped to `[0.05, 1]`; the rest is the gap beside it. */
    width: BarGeomParams['width'];
};

/** The type to set, or — on a revert — the chart as it stood, since a combo chart has no type to name. */
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
    format: DataLabelsConfig['format'];
};

type SetGridLineStyleParams = {
    axis: GridAxisTarget;
    lineStyle: PerAxisValue<LineStyleType>;
};

type SetGridLineWidthParams = {
    axis: GridAxisTarget;
    lineWidth: PerAxisValue<number | null>;
};

type SetGridVisibilityParams = {
    axis: PrimaryAxisTarget;
    /**
     * Whether this axis's grid lines are drawn. `null` defers to the compiler's geom and coord
     * policies.
     */
    isVisible: boolean | null;
};

type SetHeadlineCompareWithParams = {
    compareWith: HeadlineCompare;
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
    position: PositionType;
};

/** Constructor input for {@link SetLayerStatCommand}, accepting a stat in any of its input forms. */
type SetLayerStatOptions = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    /** The stat to apply — a name, a built-in spec with params optional, or a plugin stat's name. */
    stat: StatInput | StatName | CustomStatInput<string>;
};

/** Serialized parameters of {@link SetLayerStatCommand}, with the stat's params settled. */
type SetLayerStatParams = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    /** The resolved stat — replaying a deserialized command produces an identical spec. */
    stat: StatSpec;
};

type SetLayerYScaleTypeParams = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    /** Which y scale the layer binds to — the primary or the secondary axis. */
    yScaleType: YScaleType;
};

type SetLegendAlignParams = {
    align: LegendAlign;
};

type SetLegendDisplayParams = {
    display: LegendDisplay;
};

type SetLegendPositionParams = {
    position: LegendPosition;
};

type SetLineInterpolationParams = {
    layerId?: string;
    interpolate: InterpolateType;
};

type SetLineMissingValuesParams = {
    /** Layer to target; when omitted, the first line/area layer is used. */
    layerId?: string;
    /** How the path treats observations with no value — substitute zero, break, or span the gap. */
    missingValues: MissingValuesType;
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
    domainMin?: ContinuousScaleSpec['domainMin'];
    /** New upper bound; omit to leave the existing maximum unchanged. */
    domainMax?: ContinuousScaleSpec['domainMax'];
};

type SetScalePaletteParams = {
    scaledAesthetic: ScaledAestheticKey;
    palette: PaletteConfig;
};

type SetScaleReverseParams = {
    /** Which scale to change, identified by the aesthetic it drives (e.g. x, y). */
    scaledAesthetic: ScaledAestheticKey;
    /** Whether the domain maps onto the range back to front. */
    reverse: ContinuousScaleSpec['reverse'];
};

type SetScaleTransformParams = {
    scaledAesthetic: ScaledAestheticKey;
    transform: ScaleTransformType;
};

type SetScaleZeroParams = {
    /** Which scale to change, identified by the aesthetic it drives (e.g. x, y). */
    scaledAesthetic: ScaledAestheticKey;
    /** Whether the computed domain must include zero. */
    zero: ContinuousScaleSpec['zero'];
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
    removedLayer?: LayerSpec;
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
    /** null falls back to the theme `defaultAnnotationShapeFill`; omitting it leaves the shape unfilled. */
    fillColor?: string | null;
    /** Fill alpha, 0 (transparent) to 1 (opaque). */
    fillOpacity?: number;
    strokeWidth?: number;
    /** null falls back to the theme `defaultAnnotationShapeStroke`. */
    strokeColor?: string | null;
}

/** The geometry a shape annotation draws. */
type ShapeKind = 'rectangle';

/**
 * Regression methods supported by the `smooth` stat.
 */
type SmoothMethod = 'linear' | 'loess' | 'exponential' | 'logarithmic' | 'quadratic' | 'power' | 'polynomial';

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

/**
 * Resolved smooth (regression) stat spec.
 */
interface SmoothStatSpec {
    type: 'smooth';
    method: SmoothMethod;
    /** Polynomial order — only meaningful when `method: 'polynomial'`. */
    order: number;
    /** LOESS bandwidth — only meaningful when `method: 'loess'`. */
    bandwidth: number;
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

/** Input to {@link Stat.compile}: the layer's dataset and mapping plus the resolved stat spec to apply. */
interface StatCompilerInput {
    /** The input dataset. */
    data: Dataset;
    /** The effective mapping for the layer. */
    mapping: AesMapping;
    /** The resolved stat spec. Narrow by `spec.type` to access stat-specific params. */
    spec: StatSpec;
    /**
     * Whether the x aesthetic resolves to a discrete (band) scale. The `smooth` stat emits one fitted
     * point per observed x when set.
     */
    xScaleIsDiscrete: boolean;
}

/** A custom stat is a {@link Stat} subclass instance. Named alias for its role as a plugin. */
type StatDefinition = Stat;

/**
 * User-facing stat input — either a {@link StatName} string shorthand or an object spec.
 */
type StatInput = IdentityStatSpec | CountStatSpec | SmoothStatInput | MeanStatSpec | SumStatSpec;

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
 */
type StatName = 'identity' | 'count' | 'smooth' | 'mean' | 'sum';

/**
 * Discriminated union of all resolved stat specs (post-resolution).
 */
type StatSpec = IdentityStatSpec | CountStatSpec | SmoothStatSpec | MeanStatSpec | SumStatSpec;

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

/** A {@link StyleRule} whose `declarations` may be `null`, which removes the entry at that address. */
type StyleRuleEdit = WithNullablePaint<StyleRule>;

/** Which of a stylesheet's two lists an entry lives in. */
type StylesheetList = 'defaults' | 'overrides';

/**
 * Resolved sum stat spec.
 */
interface SumStatSpec {
    type: 'sum';
}

/** How a text annotation's background fill is applied: faded into the plot or fully opaque. */
type TextAnnotationBackgroundColorStyle = 'fade' | 'opaque';

/**
 * Rich-text annotation positioned by a {@link PointAnchorInput}; `width` is a fraction of the plot
 * rect and the height is intrinsic to the rendered content.
 */
interface TextAnnotationInput {
    id?: string;
    /** Rich-text body to render. */
    content: RichTextContent;
    /** The point the text is positioned at; `align` decides which point of the text's box sits here. */
    at: PointAnchorInput;
    /** 0..1 of plot width. */
    width: number;
    /** Which point of the text's own box sits at `at`. Defaults to `center`. */
    align?: AnchorAlign;
    /** null falls back to a transparent background. */
    backgroundColor?: string | null;
    /** Whether the background fill fades into the plot or is fully opaque. */
    backgroundColorStyle?: TextAnnotationBackgroundColorStyle;
}

/** A text value — plain string or structured rich text. */
type TextContent = string | RichTextContent;

type ToggleCategoryLabelsParams = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    showCategoryLabels: boolean;
};

type ToggleContentVisibilityParams = {
    /** Which content slot to show or hide. */
    slot: ContentVisibilitySlot;
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
    removedLayer?: LayerSpec;
};

type ToggleLineFillParams = {
    layerId: string;
    showFill: boolean;
    /** Alpha to fill at; the wash the switch draws with, absent. Undo carries the alpha it took away. */
    fillAlpha?: number;
};

type ToggleLinePointsVisibilityParams = {
    /** Path layer whose vertices get points; absent, the chart's first line or area. */
    layerId?: string;
    showPoints: boolean;
    /** When restoring a previously removed point layer, holds the full layer spec to re-insert. */
    removedLayer?: LayerSpec;
};

type ToggleStackTotalsParams = {
    /** Layer to target; when omitted, the spec's first layer is used. */
    layerId?: string;
    showStackTotals: boolean;
};

/** A custom transform is a {@link TransformStrategy}. Named alias for its role as a plugin. */
type TransformDefinition = TransformStrategy;

/**
 * Discriminated union of the built-in transform inputs, keyed on `transformType`. Use
 * {@link AnyTransformInput} where a plugin-contributed transform may also appear.
 */
type TransformInput = ReshapeTransformInput | FilterTransformInput | SortTransformInput | AggregateTransformInput | ConstantTransformInput;

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
    apply: (data: Dataset, transform: AnyTransformInput) => Dataset;
    /**
     * Variable names this transform adds to the dataset (e.g. a reshape's key column or a constant's
     * variable). Declared so consumers can discover introduced columns without branching on the type.
     */
    getIntroducedVariables?: (transform: AnyTransformInput) => VariableName[];
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

/** A type alias for variable names. */
type VariableName = string;

/** Distributes over the entry union, so each kind keeps its own vocabulary. */
type WithNullablePaint<Rule> = Rule extends {
    declarations: infer Declarations;
} ? Omit<Rule, 'declarations'> & {
    declarations: Declarations | null;
} : never;

/** Distributes over the {@link LayerSpec} union so each arm keeps discriminating on its `geom`. */
type WithOptionalId<TLayer> = TLayer extends unknown ? Omit<TLayer, 'id'> & {
    id?: string;
} : never;

/**
 * Which Y axis a layer binds to.
 */
type YScaleType = 'primary' | 'secondary';
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
     * Settings for the intro animation played when the chart first mounts or the chart type changes.
     * `false` disables it, an object overrides individual intro settings. Defaults on.
     */
    intro?: boolean | Partial<IntroAnimationOptions>;
    /** Whether geoms animate to their new position when the underlying data changes. Defaults on. */
    transitions?: boolean;
}

/** Props for {@link GraphRenderer}: container sizing, interaction toggles and per-region slot overrides. */
interface GraphRendererProps {
    /** Controls how the graph responds to its container size. Defaults to filling the parent container. */
    sizing?: GraphSizing;
    /** Callback invoked when the graph's container is resized. Fires in every sizing mode. */
    onResize?: ResizeObserverOnResize;
    /**
     * Animation settings. A boolean disables/enables animations globally, an object tunes the intro
     * and data transitions separately. A reduced-motion preference disables everything regardless.
     */
    animation?: GraphAnimation;
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

interface IntroAnimationOptions {
    /** Whether the entrance plays at all */
    enabled: boolean;
    /** Multiplier applied to every entrance duration and stagger delay. */
    durationScale: number;
    /** Whether geoms that support staggered entrance (bars) enter staggered rather than all at once. */
    stagger: boolean;
    /** The order staggered point geoms enter in. Bars and slices always enter in visual order. */
    staggerOrder: IntroStaggerOrder;
    /** Total geom count across all layers above which the entrance is skipped entirely. */
    maxAnimatedGeoms: number;
}

interface PanelExpansion {
    expandSection: (title: string) => void;
    collapseAllSections: () => void;
}

interface PanelProps extends Omit<PanelRootProps_2, 'children'> {
    /**
     * Replaces the sections entirely. A panel is a convenience over composing them by hand, so the
     * escape hatch is the composition it saves you writing rather than a set of flags on top of it.
     */
    children?: ReactNode;
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
