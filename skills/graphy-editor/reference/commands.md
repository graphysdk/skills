# Commands, history and programmatic editing

Every edit to a Graphy chart — a canvas drag, a panel control, a line of your code — is the same
thing underneath: a serializable **Command** dispatched against the provider's live spec, landing
on one shared undo history. This file covers that shared machinery.

## Where things come from

| What | Import from |
|---|---|
| Command classes, `commandRegistry`, `EditTarget`, annotation/highlight helpers | `@graphysdk/viz-engine` (root) |
| `useGraphCommands`, `useGraphHistory`, `useGraphHistoryShortcuts`, `useGraphSelection`, `useCompiledSelector`, `useHandleCompiled`, `GraphHandle`, `pruneSelection` | `@graphysdk/react-renderer` (root — not `./editable`; building your own editing UI needs nothing from the panel entry) |
| `EditableGraphRenderer`, panel, sections, controls | `@graphysdk/react-renderer/editable` |

## The contract

```ts
interface Command<TParams> {
  readonly type: string;             // discriminator, e.g. "set-chart-type"
  readonly metadata: CommandMetadata; // { id, timestamp, description, author }
  readonly params: TParams;           // JSON-serializable
  readonly target: EditTarget;        // what it is about — derived from params
  apply(spec: Spec): CommandApplyResult | null; // { spec, revert } — or null when nothing changes
}
```

Commands are stateless and immutable: `apply` returns a new spec plus a revert command instead of
changing anything in place. When the target is missing or the value is already set, `apply` returns
`null` and nothing happens — no history entry, no `onChange` — so dispatching the current value is
always safe.

Constructors take `(params, metadata?: Partial<CommandMetadata>)`; pass `{ author }` to attribute
an edit (an agent, a collaborator) — it travels through serialization and shows in the history.

## Dispatching

```tsx
import { useGraphCommands } from '@graphysdk/react-renderer';
import { SetContentTitleCommand } from '@graphysdk/viz-engine';

const { dispatch, seal } = useGraphCommands();
dispatch(new SetContentTitleCommand({ title: 'Revenue by quarter' }));
```

The provider applies the command to the live spec, recompiles, repaints, pushes an undo entry and
fires `onChange` with the new `SpecInput`. If a command's result fails to compile, the last good
chart stays up and the failure is reported through `onError`; only a bad *external* `input`
replaces the chart with the error panel.

**One gesture, one undo entry.** A drag or a burst of typing dispatches once per frame or keystroke
with `{ transient: true }`; those dispatches merge into **one** undo entry, and `seal()` ends the
run and fires `onChange` **once**:

```tsx
// A slider driving bar width: stream transiently, seal on commit.
<Slider
  min={0.05} max={1} step={0.01} value={width} ariaLabel="Bar width"
  onChange={(next) => dispatch(new SetBarWidthCommand({ width: next }), { transient: true })}
  onCommit={seal}
/>
```

Merging continues only while the same command type targets the same `EditTarget`. Forgetting to
seal only delays the notification — the next normal dispatch, undo, redo or external change ends
the run. This is the same contract the panel's controls follow (`panel.md`).

## History

```tsx
import { useGraphHistory } from '@graphysdk/react-renderer';

const { undo, redo, canUndo, canRedo, undoDescription, undoStack, redoStack } = useGraphHistory();
```

Stack entries are `CommandMetadata` (`{ id, description, timestamp, author }`), oldest first. Every
command that reaches the chart is undoable — inline edits, panel dispatches, canvas drags, and your
own dispatches alike. `undo()`/`redo()` return whether the chart took the step. There is no
jump-to-step API; to go back several steps, call `undo()` in a loop.

Keyboard shortcuts bind through the handle, from wherever the app's key handling lives:

```tsx
const handleRef = useRef<GraphHandle>(null);
useGraphHistoryShortcuts(handleRef); // ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z, Ctrl+Y; options: { target, enabled }
```

Shortcuts already handled by the app, typed into text inputs, or declined by the chart are left
alone. To reset the history, remount `GraphProvider` with a React `key`.

## `GraphHandle` — editing from outside the tree

`<GraphProvider handleRef={ref}>` fills an imperative handle for surfaces the hooks can't reach
(toolbars, menu bars, panels mounted elsewhere, non-React code):

```ts
interface GraphHandle {
  commands: GraphCommands;                    // { dispatch, seal }
  subscribe(onChange: () => void): () => void; // + getCompiled — the useSyncExternalStore pair
  getCompiled(): CompiledSpec | null;
  undo(): boolean;  redo(): boolean;
  getSelection(): readonly EditTarget[];
  setSelection(next: readonly EditTarget[]): void;
  subscribeSelection(onChange: () => void): () => void;
}
```

`useHandleCompiled(handle)` subscribes a component outside the provider to the compiled spec;
`useGraphHandle(handle?)` resolves an explicit handle or synthesizes one from the surrounding
provider. Inside the tree, `useCompiledSelector((compiled) => …)` subscribes to a slice, re-rendering
only when the selected reference changes.

**Reading the current spec for persistence or inspection**: the compiled spec retains the resolved
spec; `convertSpecToInput(compiled.spec)` turns it back into a storable `SpecInput` (normally you
just persist what `onChange` hands you).

## Selection

Selection is a list of `EditTarget`s — the same union that names what a command is about:

```ts
type EditTarget =
  | { kind: 'annotation'; id: string } | { kind: 'highlight'; id: string }
  | { kind: 'styleRule'; list: StylesheetList; select: StyleSelect; when?: WhenClause }
  | { kind: 'content'; part: 'title' | 'subtitle' | 'caption' | 'source' }
  | { kind: 'axis'; axis: AxisTarget } | { kind: 'grid'; axis: GridAxisTarget }
  | { kind: 'legend' } | { kind: 'layer'; layerId?: string }
  | { kind: 'observation'; layerId: string; index: number }
  | { kind: 'mapping'; aesthetic: AestheticKey } | { kind: 'scale'; aesthetic: ScaledAestheticKey }
  | { kind: 'coords' } | { kind: 'appearance' } | { kind: 'headline' } | { kind: 'numberFormat' };
```

`useGraphSelection()` subscribes from inside the tree; the handle's
`getSelection`/`setSelection`/`subscribeSelection` serve the outside. The store is per-chart and
shared, so canvas and host UI always agree. After every accepted command (undo/redo included) the
provider drops selected targets the spec no longer holds. `areEditTargetsEqual` compares targets
by value.

## The command catalogue

The full list, grouped. Exact constructor params for every one are in `types.md`. All classes are
exported from the `@graphysdk/viz-engine` root.

**Chart type** — `SetChartTypeCommand` sets what the chart *is* (coord system + each
layer's geom/position + scale shape) as one undo entry: params are
`{ coordType: 'cartesian' | 'flip', geom, position }` or
`{ coordType: 'polar', geom, position, theta, innerRadius }`. (There is no mapping command in the
current SDK release — to remap a variable, rebuild the `SpecInput`; see "When no command exists"
below.)

**Layers** (see "Per-layer control" below) — `AddLayerCommand`, `RemoveLayerCommand`,
`SetLayerPositionCommand`, `SetLayerStatCommand`, `SetLayerYScaleTypeCommand`,
`SetBarWidthCommand`, `SetBarBorderRadiusCommand`, `SetLineWidthCommand`,
`SetLineInterpolationCommand`, `SetLineMissingValuesCommand`, `SetPointSizeCommand`,
`SetStatLineCommand`, `SetRuleValueCommand`, `SetRuleLabelCommand`, `ToggleGoalLineCommand`,
`ToggleDataLabelsCommand`, `SetDataLabelsFormatCommand`, `ToggleCategoryLabelsCommand`,
`ToggleLineFillCommand`, `ToggleLinePointsVisibilityCommand`, `ToggleStackTotalsCommand`.

**Scales & coords** — `SetScaleDomainCommand`, `SetScalePaletteCommand`, `SetScaleReverseCommand`,
`SetScaleTransformCommand`, `SetScaleZeroCommand`, `SetCoordLimitsCommand`,
`SetPolarInnerRadiusCommand`, `SetPolarStartAngleCommand`.

**Config & content** — titles: `SetContentTitleCommand`, `SetContentSubtitleCommand`,
`SetContentCaptionCommand`, `SetContentSourceCommand`, `ToggleContentVisibilityCommand` (text is
`TextContent = string | RichTextContent`; `null` clears). Axes: `SetAxisLabelCommand`,
`SetAxisPositionCommand`, `SetAxisTickModeCommand`, `SetAxisTicksVisibilityCommand`,
`SetAxisVisibilityCommand`. Grid: `SetGridVisibilityCommand`, `SetGridLineStyleCommand`,
`SetGridLineWidthCommand`. Legend: `SetLegendPositionCommand`, `SetLegendDisplayCommand`,
`SetLegendAlignCommand`. Headline: `SetHeadlineShowCommand`, `SetHeadlineSizeCommand`,
`SetHeadlinePositionCommand`, `SetHeadlineCompareWithCommand`. Numbers & appearance:
`SetNumberFormatDecimalsCommand`, `SetNumberFormatAbbreviationCommand`,
`SetAppearanceTextScaleCommand`.

**Styles** — `SetStyleRuleCommand({ list, rule, index? })`: the one command for everything the
stylesheet paints. An entry is identified by its `select` + `when` (never by id) — the command
writes the entry that paints those elements under those conditions, whoever authored it.
`declarations: null` removes every entry at that address; writing values an entry already carries
changes nothing. What a stylesheet entry can say is `graphy-charts/reference/styling.md`.

```tsx
import { SetStyleRuleCommand, style } from '@graphysdk/viz-engine';
dispatch(new SetStyleRuleCommand({ list: 'overrides', rule: style.geom({ color: '#0f62fe' }, { layer: 'bars' }) }));
```

**Highlights** — `AddHighlightCommand({ predicate, scope?, layerId?, id?, index? })` (scope:
`'data-point' | 'series' | 'x-value'`), `RemoveHighlightCommand({ id })`,
`SetHighlightDimStyleCommand` (`'dim' | 'desaturate'`, read back with `readHighlightDimStyle`).
Before adding one, check `findEquivalentHighlight(highlights, candidate)` — a duplicate is legal
but paints nothing new and leaves the user an entry they can't see to remove.
`findHighlightsAtObservation` lists the highlights already covering a data point, for removal
menus.

**Annotations** — `AddAnnotationCommand`, `UpdateAnnotationCommand`, `MoveAnnotationCommand`,
`RemoveAnnotationCommand` — covered with the annotation model in `canvas.md`.

## Per-layer control

Layer commands take a `layerId`; when omitted they fall back to the spec's first (or first
matching) layer. Either way they change **that layer alone** — a combo chart stacks its bars
without dragging its line along. Give layers stable ids when authoring
(`geom.bar({ id: 'bars' })`) so edits land where you aim. To recolor or restyle one layer, use the
stylesheet: `style.geom(declarations, { layer: id })` dispatched via `SetStyleRuleCommand`.

Adding and removing layers:

```tsx
import { AddLayerCommand, RemoveLayerCommand, SetStatLineCommand } from '@graphysdk/viz-engine';

// The common cases have dedicated commands: one trend or average line per chart —
dispatch(new SetStatLineCommand({ line: 'trend', method: 'linear' }));
// — and its removal:
dispatch(new SetStatLineCommand({ line: 'none' }));

// The general case carries a whole LayerDraft (a resolved LayerSpec, id optional):
dispatch(new AddLayerCommand({
  layer: {
    type: 'layer', id: 'profit-line', geom: 'line',
    mapping: { x: 'quarter', y: 'profit' },
    params: { interpolate: 'monotone-x', missingValues: 'break', width: 2 },
    stat: { type: 'identity' }, position: 'identity', yScaleType: 'secondary',
    transforms: [], interactive: true,
    dataLabels: { showDataLabels: false, format: 'absolute' },
  },
}));
dispatch(new RemoveLayerCommand({ layerId: 'profit-line' }));
```

`AddLayerCommand` generates the id when omitted and undoes as a `RemoveLayerCommand`; removing the
last remaining layer does nothing (a chart with no layers has nothing to draw). The fields a draft
must carry are `LayerSpec` in `types.md`. Layer commands only work with built-in geoms — plugin
geoms are outside the command system.

## Serialization and replay — agent-driven editing

Commands round-trip through JSON via the singleton registry:

```tsx
import { commandRegistry, SetContentTitleCommand } from '@graphysdk/viz-engine';

const command = new SetContentTitleCommand({ title: 'Q4 update' }, { author: 'agent' });
const wire = commandRegistry.serialize(command);   // { type, params, metadata } — plain JSON
// ...transport/store...
const replayed = commandRegistry.deserialize(wire); // throws on unknown type
handle.commands.dispatch(replayed);
```

Only forward commands serialize; reverts are recomputed when the command is applied. Add-commands
(`AddLayerCommand`, `AddHighlightCommand`, `AddAnnotationCommand`) generate their ids in the
constructor and serialize them filled in, so replaying a payload lands on the same object rather
than creating a second. A deserialized command dispatches like any other, so an agent's or
collaborator's edits join the same undo history and the same `onChange` stream as the user's
clicks.

## When no command exists

The catalogue does not cover the whole spec (and the panel covers less than the catalogue). For
anything else, build a new `SpecInput` with the authoring API (the `graphy-charts` skill —
`updateSpec(target, updates)` helps apply deep partial changes) and pass it as `input`. A new
input from outside replaces the edited state and is not an undo step — so prefer a command when
one exists, and build on `onChange`'s latest value rather than the original spec, or you will
silently revert the user's edits.
