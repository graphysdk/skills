# Programmatic editing — code and agents as first-class editors

Drive a chart's edits from outside its UI: a toolbar above the provider, a script, or an agent
streaming serialized commands over the wire. Everything lands on the same undo history and the same
`onChange` stream as the user's own clicks.

```tsx
import { useRef, useState } from 'react';
import { GraphProvider, type GraphHandle } from '@graphysdk/react-renderer';
import { EditableGraphRenderer } from '@graphysdk/react-renderer/editable';
import {
  commandRegistry,
  SetContentTitleCommand, SetStatLineCommand, SetLegendPositionCommand,
  SetBarWidthCommand, AddHighlightCommand,
  type Data, type SpecInput, type SerializedCommand,
} from '@graphysdk/viz-engine';

export function DrivenChart({ data, initialSpec }: { data: Data; initialSpec: SpecInput }) {
  const [spec, setSpec] = useState(initialSpec);
  const handleRef = useRef<GraphHandle>(null);

  // A host toolbar dispatching through the handle — no editing UI imports needed.
  const polish = () => {
    const handle = handleRef.current;
    if (!handle) return;
    const { dispatch } = handle.commands;
    dispatch(new SetContentTitleCommand({ title: 'Revenue by quarter' }));
    dispatch(new SetLegendPositionCommand({ position: 'bottom' }));
    dispatch(new SetStatLineCommand({ line: 'average', label: 'Average' }));
    dispatch(new AddHighlightCommand({
      predicate: { variable: 'quarter', eq: 'Q4' },
      scope: 'x-value',
    }));
    // Four separate undo entries — the user can peel each one back.
  };

  // A gesture your code drives (an animation, a scrubber) dispatches the same
  // way the built-in controls do: stream transiently, then seal once.
  const animateBarWidth = (frames: number[]) => {
    const handle = handleRef.current;
    if (!handle) return;
    for (const width of frames) {
      handle.commands.dispatch(new SetBarWidthCommand({ width }), { transient: true });
    }
    handle.commands.seal(); // one undo entry, one onChange
  };

  // Agent-driven: apply serialized commands received over the wire.
  const applyFromWire = (payloads: SerializedCommand[]) => {
    const handle = handleRef.current;
    if (!handle) return;
    for (const payload of payloads) {
      handle.commands.dispatch(commandRegistry.deserialize(payload)); // throws on unknown type
    }
  };

  // Producing that wire format (e.g. inside the agent):
  const wire: SerializedCommand = commandRegistry.serialize(
    new SetContentTitleCommand({ title: 'Q4 update' }, { author: 'agent' }),
  );
  void wire; void polish; void animateBarWidth; void applyFromWire;

  return (
    <GraphProvider input={spec} data={data} handleRef={handleRef} onChange={setSpec}>
      <EditableGraphRenderer mode="editable" />
    </GraphProvider>
  );
}
```

Reading state back — a surface outside the tree pairs `subscribe` with `getCompiled`
(`useSyncExternalStore`'s contract), or uses the hook:

```tsx
import { useHandleCompiled, type GraphHandle } from '@graphysdk/react-renderer';

const LayerList = ({ handle }: { handle: GraphHandle }) => {
  const compiled = useHandleCompiled(handle); // null before the first compile
  if (!compiled) return null;
  return <ul>{compiled.layers.map((layer) => <li key={layer.id}>{layer.geom}</li>)}</ul>;
};
```

What to notice:

- **One history for everyone.** The agent's `SetContentTitleCommand` and the user's inline title
  edit are indistinguishable to undo. `metadata.author` (and `description`) show in
  `useGraphHistory()`'s stack entries, so a history UI can attribute steps.
- **Replays are exact.** Add-commands generate their ids at construction and serialize them filled
  in — replaying a payload lands on the same object instead of creating a second. Only forward
  commands travel; reverts are recomputed when applied.
- **Repeats cost nothing.** A command whose value is already set does nothing inside the provider:
  no recompile, no history entry, no `onChange`. An agent script can safely re-send commands
  without checking current state first.
- **Failure keeps the chart.** A command whose result fails to compile is reported through
  `onError` and the last good chart stays up — unlike a bad external `input`, which replaces the
  chart with the error panel.
- **Commands work even in read-only mode.** `mode` only controls the on-canvas gestures — a
  "polish my chart" agent action works on a read-only embed too, undo history included.
