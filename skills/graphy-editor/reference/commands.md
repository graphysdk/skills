# Commands, history and programmatic editing

Every edit applies a `Command` to the provider's current spec. Menus, panels, toolbars and agents use the same commands and undo history.

Contents: imports, the contract, dispatching, history, the handle, selection, the command list, layers, sequences, serialize and replay, when no command exists.

## Imports

| What                                                                                                                                                                                                | Import from                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Command classes, `commandRegistry`, `EditTarget`, `SequenceCommand`, the editing helpers                                                                                                            | `@graphysdk/react/editable` |
| `GraphProvider`, `useGraphCommands`, `useGraphHistory`, `useGraphHistoryShortcuts`, `useGraphSelection`, `useSceneSelector`, `useHandleScene`, `useGraphHandle`, `useTargetBoundary`, `GraphHandle` | `@graphysdk/react`          |
| `EditableGraphRenderer`, the panel, sections, controls                                                                                                                                              | `@graphysdk/react/editable` |

A custom editing UI can import only the commands from `/editable`.

## The contract

```ts
interface Command<TParams> {
  readonly type: string; // 'set-content-title'
  readonly metadata: CommandMetadata; // { id, timestamp, description, author }
  readonly params: TParams; // plain JSON
  readonly target: EditTarget; // what the command is about, read from params
  apply(spec: ResolvedSpec): CommandApplyResult | null; // { spec, revert }, or null for nothing to do
}
```

Commands are immutable. `apply` returns a new spec and a revert command. When the target is missing or the value is already set, `apply` returns `null`: no history entry, no `onSpecChange`. Dispatching the current value leaves the spec unchanged.

Constructors take `(params, metadata?)`. Pass `{ author: 'agent' }` to attribute an edit. The author is preserved in serialization and shown in history.

## Dispatching

```tsx
import { useGraphCommands } from '@graphysdk/react';
import { SetContentTitleCommand } from '@graphysdk/react/editable';

const { dispatch, commit } = useGraphCommands();
dispatch(new SetContentTitleCommand({ title: 'Revenue by quarter' }));
```

The provider applies the command, recompiles, pushes an undo entry and fires `onSpecChange`.

To group a drag or typing session into one undo entry, dispatch changes with `{ transient: true }`. Call `commit()` when the gesture ends to fire `onSpecChange` once:

```tsx
<input
  type="range"
  min={0.05}
  max={1}
  step={0.01}
  value={width}
  onChange={(event) => dispatch(new SetBarWidthCommand({ width: event.target.valueAsNumber }), { transient: true })}
  onPointerUp={commit}
  onBlur={commit}
/>
```

Merging continues while the same command type targets the same `EditTarget`. Without `commit`, the notification is delayed until the next normal dispatch or external change closes the run. Undo or redo discards the open run and operates on the merged history entry.

Commands work in every mode, `readonly` included. `mode` only controls what the user can do on the canvas.

## History

```tsx
import { useGraphHistory } from '@graphysdk/react';

const { undo, redo, canUndo, canRedo, undoDescription, undoStack, redoStack } = useGraphHistory();
```

`undoStack` and `redoStack` hold `CommandMetadata`, oldest first. The last entry is the next step, named by `undoDescription` or `redoDescription`. History holds 100 steps. Call `undo()` repeatedly to go back several steps; there is no jump operation.

`undo()` and `redo()` return `true` when the step succeeds. They return `false` if no step is available or the older spec no longer compiles, for example after its data loses a required column. A failed step leaves both stacks unchanged and can be retried when the data supports it.

A new `spec` object on the provider clears the history once it compiles. New `data` keeps it.

Keyboard shortcuts bind through the handle:

```tsx
const handleRef = useRef<GraphHandle>(null);
useGraphHistoryShortcuts(handleRef); // Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Ctrl+Y; options: { target, enabled }
```

The hook leaves shortcuts unhandled when focus is in a text input, the app already handled the event, or the chart cannot undo or redo.

## The handle

`<GraphProvider handleRef={ref}>` exposes a `GraphHandle` for code outside the provider, including toolbars, other React roots and non-React code.

```ts
interface GraphHandle {
  commands: { dispatch; commit };
  subscribe(onChange: () => void): () => void; // with getScene, the useSyncExternalStore pair
  getScene(): Scene | null; // the compiled chart, null before the first compile
  undo(): boolean;
  redo(): boolean;
  getSelection(): readonly EditTarget[];
  setSelection(next: readonly EditTarget[]): void;
  subscribeSelection(onChange: () => void): () => void;
  canPlaceDataLabels(geom: string, coordType: CoordSystem['type']): boolean;
  canFormatDataLabelsAsPercentages(layer: SceneLayer, coordType: CoordSystem['type']): boolean;
}
```

`useHandleScene(handle)` subscribes a component outside the provider to the compiled chart. Inside the provider, `useSceneSelector((scene) => …)` subscribes to a slice. `useGraphHandle(handle?)` returns the explicit handle, one built from the surrounding provider, or `null` outside both.

Use `toSpec(scene.spec, { themeConfig })` from `@graphysdk/react/editable` to get the current spec as JSON. Pass the theme's `config` to omit theme defaults. `onSpecChange` already supplies this format, so prefer saving its value.

## Selection

Selection is a list of `EditTarget` values. Commands use the same type to identify what they edit:

```ts
type EditTarget =
  | {
      kind: 'observations';
      layerId: string;
      scope: 'data-point' | 'series' | 'x-value';
      predicate: Predicate;
      observationIndex?: number;
    }
  | { kind: 'annotation'; id: string }
  | { kind: 'highlight'; id: string }
  | { kind: 'styleRule'; list: StylesheetList; select: StyleSelect; when?: WhenClause }
  | { kind: 'content'; part: 'title' | 'subtitle' | 'caption' | 'source' }
  | { kind: 'axis'; axis: 'x' | 'y' | 'ySecondary' }
  | { kind: 'grid'; axis: 'x' | 'y' | 'both' }
  | { kind: 'legend' }
  | { kind: 'layer'; layerId?: string }
  | { kind: 'mapping'; aesthetic: AestheticKey }
  | { kind: 'scale'; aesthetic: ScaledAestheticKey }
  | { kind: 'coords' }
  | { kind: 'graph' }
  | { kind: 'appearance' }
  | { kind: 'headline' }
  | { kind: 'numberFormat' };
```

An `observations` target names observations by their values, so it keeps pointing at the same bars when the chart is rebuilt. `scope` is one observation, a whole group (`series`) or every observation at one x value (`x-value`). Build one from a scene layer with `buildObservationsTarget({ layer, observationIndex, scope, parsingLocale })` from `@graphysdk/react/editable`, where `parsingLocale` is `scene.config.parsingLocale`. It returns `null` if the layer cannot identify that observation.

`useGraphSelection()` reads the selection inside the provider. The handle's `getSelection`, `setSelection` and `subscribeSelection` serve the outside. After every command, undo and redo included, the provider removes targets that no longer exist in the spec. `areEditTargetsEqual` compares targets by value.

## The command list

All classes are exported from `@graphysdk/react/editable`. Params are in [types](types.md).

### Chart type and mapping

`SetChartTypeCommand` sets the coordinate system, geom, position and scales in one undo step. Params are `{ coordType: 'cartesian' | 'flip', geom, position }`, `{ coordType: 'polar', geom, position, theta, innerRadius }` or `{ coordType: 'cartesian', comboType }` with `comboType` one of `COMBO_TYPES` (`'grouped-bars' | 'stacked-bars' | 'lines'`). A heatmap is `geom: 'tile'`, allowed when `canBecomeHeatmap(spec)`. `readChartType(spec)` reads back the current type. `SetMappingCommand({ aesthetic, variable })` maps a column to an aesthetic, `x`, `y`, `color`, `size`, `label` and the rest, or `null` to unmap. `readMappableAesthetics(spec, aesthetics)` lists the columns each one accepts.

### Layers

`AddLayerCommand`, `RemoveLayerCommand`, `SetLayerPositionCommand`, `SetLayerStatCommand`, `SetLayerYScaleTypeCommand`, `SetStatLineCommand`, `ToggleGoalLineCommand`, `SetRuleValueCommand`, `SetRuleLabelCommand`, `SetBarWidthCommand`, `SetBarCornerRadiusCommand`, `SetLineStyleCommand` (a line's dash, width and fill as one undo step), `SetLineCurveCommand`, `SetLineMissingValuesCommand`, `ToggleLinePointsCommand` (a `where` shows or hides one group's points), `SetPointSizeCommand` (without `where` it also clears each group's size, leaving a group hidden at size 0 hidden; while the layer is at size 0 it sizes only the shown groups), `ToggleDataLabelsCommand`, `SetDataLabelsFormatCommand`, `ToggleStackTotalsCommand`, `ToggleCategoryLabelsCommand`. See "Per-layer control".

### Scales and coords

- `SetScaleDomainCommand({ scaledAesthetic, domainMin?, domainMax? })` sets domain limits.
- `SetScaleRangeCommand({ scaledAesthetic, range })` sets a discrete scale's colors; `null` restores the theme's colors.
- `SetScaleReverseCommand` reverses a scale.
- `SetScaleTransformCommand({ scaledAesthetic, transform: 'linear' | 'log' | 'sqrt' })` changes a continuous scale's transform. `log` clears a fixed domain start.
- `SetCoordLimitsCommand`, `SetPolarInnerRadiusCommand` and `SetPolarStartAngleCommand` change coordinates.

### Content

`SetContentTitleCommand`, `SetContentSubtitleCommand`, `SetContentCaptionCommand` take `TextContent = string | RichTextContent`, `null` clears. `SetContentSourceCommand({ source: { label?, url? } | null })`. `ToggleContentVisibilityCommand({ part, visible })`.

### Axes, grid, legend

`SetAxisLabelCommand`, `SetAxisPositionCommand`, `SetAxisTickModeCommand`, `SetAxisTicksVisibilityCommand`, `SetAxisVisibilityCommand`. `axis` is `'x'`, `'y'` or `'ySecondary'` on the label, tick mode and visibility commands. On `'y'`, label and visibility reach both vertical axes unless `keepSecondaryAxis: true`. On `'ySecondary'`, omitting the value drops the override. `SetGridVisibilityCommand({ axis: 'x' | 'y', visible })`, where `null` lets the compiler choose. `SetGridLineStyleCommand` takes `axis: 'x' | 'y' | 'both'` and sets dash and width as one undo step, each as one value or `{ x, y }`: a `lineStyle` of `'solid' | 'dashed' | 'dotted' | null` and a `strokeWidth` in pixels or `null`. `SetLegendPositionCommand`, `SetLegendAlignCommand`, `SetLegendDisplayCommand`, and `SetLegendPlacementCommand({ position, align })` for both in one step.

### Headline and numbers

`SetHeadlineShowCommand`, `SetHeadlineSizeCommand`, `SetHeadlinePositionCommand`, `SetHeadlineCompareWithCommand`. `SetNumberFormatDecimalsCommand({ decimals: number | 'auto' })`, `SetNumberFormatAbbreviationCommand({ abbreviation: 'auto' | 'k' | 'm' | 'b' | 'none' })`.

### Styles

`SetStyleRuleCommand({ list, rule, index? })` writes one stylesheet entry. An entry is identified by its `select` and `when`. `declarations: null` removes it. Writing values already present does nothing. See the graphy-charts styling reference for supported declarations.

```tsx
import { style } from '@graphysdk/react';
import { SetStyleRuleCommand } from '@graphysdk/react/editable';
dispatch(new SetStyleRuleCommand({ list: 'overrides', rule: style.geom({ fill: '#0f62fe' }, { layer: 'bars' }) }));
```

### Selections

`SetObservationsColorCommand({ target, color })` colors an `observations` target, `null` removes the color. It writes a style rule for you and undoes as one step. To dash one line or area group, use `SetLineStyleCommand` with `where`. `SetHighlightDimStyleCommand({ dimStyle: 'dim' | 'desaturate' })` sets how highlights fade the rest, read back with `readHighlightDimStyle`.

### Highlights

`AddHighlightCommand({ predicate, scope?, layerId?, id?, index? })`, `RemoveHighlightCommand({ id })`. Before adding, check `findEquivalentHighlight(highlights, candidate)`. Duplicates are allowed but add no visible change. `findHighlightsAtObservation` lists what already covers a data point.

### Annotations

`AddAnnotationCommand`, `UpdateAnnotationCommand`, `MoveAnnotationCommand`, `RemoveAnnotationCommand`, `SetDifferenceArrowStyleCommand`. See [annotations](annotations.md).

There is no command for the frame's corner radius or the text scale. Write them with `SetStyleRuleCommand` and `style.graph({ cornerRadius })` or `style.graph({ textScale })`.

## Per-layer control

Layer commands take a `layerId`. Most use the first matching layer when it is omitted. `SetLineStyleCommand`, `SetPointSizeCommand`, `SetBarCornerRadiusCommand` and `RemoveLayerCommand` require it. Either way they change that layer alone, so a combo chart stacks its bars without touching its line. Give layers stable IDs when authoring, `geom.bar({ id: 'bars' })`. To restyle one layer use `style.geom(declarations, { layer: id })` through `SetStyleRuleCommand`.

```tsx
import { useGraphCommands, useSceneSelector } from '@graphysdk/react';
import { AddLayerCommand, RemoveLayerCommand, SetStatLineCommand } from '@graphysdk/react/editable';

const { dispatch } = useGraphCommands();
const firstLayer = useSceneSelector((scene) => scene.spec.layers[0]);

// One trend or average line per chart has its own command.
dispatch(new SetStatLineCommand({ line: 'trend', method: 'linear' }));
dispatch(new SetStatLineCommand({ line: 'none' }));

// The general case carries a whole resolved layer. Start from an existing one so every
// required field, data labels included, is filled in. The id is generated when omitted.
if (firstLayer) {
  dispatch(
    new AddLayerCommand({
      layer: {
        ...firstLayer,
        id: 'profit-line',
        geom: 'line',
        mapping: { x: 'quarter', y: 'profit' },
        params: { curve: 'smooth', missingValues: 'gap' },
        stat: { type: 'identity' },
        position: 'identity',
        yScaleType: 'secondary',
      },
    })
  );
}
dispatch(new RemoveLayerCommand({ layerId: 'profit-line' }));
```

Removing the last layer does nothing. See `LayerDraft` in [types](types.md) for required fields. It is a resolved layer, so `dataLabels`, `tooltip`, `attachTo` and `transforms` are required. Layer commands work with built-in geoms only.

## Several commands as one undo step

```tsx
import { SequenceCommand, SetContentTitleCommand, SetLegendPositionCommand } from '@graphysdk/react/editable';

dispatch(
  new SequenceCommand({
    commands: [
      new SetContentTitleCommand({ title: 'Revenue by quarter' }),
      new SetLegendPositionCommand({ position: 'bottom' }),
    ],
  })
);
```

Each command applies to the previous command's result. The sequence uses its first command's target and description, skips history if nothing changes, and serializes like other commands.

## Serialize and replay

Commands round-trip through JSON:

```tsx
import { commandRegistry, SetContentTitleCommand } from '@graphysdk/react/editable';

const command = new SetContentTitleCommand({ title: 'Q4 update' }, { author: 'agent' });
const wire = commandRegistry.serialize(command); // { type, params, metadata }
const replayed = commandRegistry.deserialize(wire); // throws on an unknown type
handle.commands.dispatch(replayed);
```

Only forward commands serialize; revert commands are recomputed on apply. Add commands generate IDs in their constructors and include them in serialized output, so replay uses the same IDs. Deserialized commands share history and `onSpecChange` with user edits.

## When no command exists

The list does not cover the whole spec. For the rest, build a new `Spec` with the authoring API from the graphy-charts skill. `updateSpec(spec, partial)` applies a deep partial change. Pass the result as `spec`. That replaces the edited state and clears the history, so prefer a command when one exists, and start from the latest `onSpecChange` value, not the original spec.
