---
name: graphy-editor
description: Add editing to existing Graphy charts with @graphysdk/react/editable. Use graphy-charts to create charts.
---

# Graphy editor

Start with a working chart: a `GraphProvider` with `spec` and `data`, as shown in the graphy-charts skill.

## How editing works

- Menus, panel controls, and application code dispatch `Command` objects from `@graphysdk/react/editable`. They share one undo history and one `onSpecChange` callback.
- Use `EditableGraphRenderer` from `@graphysdk/react/editable` to enable editing. Its `mode` prop controls the available interactions. `GraphRenderer` has no editing layer, regardless of `mode`.
- `GraphProvider.onSpecChange` returns the edited `Spec` as plain JSON after each completed edit. Save it and pass it back as `spec` to restore the chart. Edits do not change the data. The spec does not include the theme, so also pass `theme` when restoring.
- The point and edit menu offers quick edits. The panel supports more settings, and commands support more still. For changes commands do not support, build a new spec with the authoring API.

## Minimal point and edit chart

```tsx
import { useRef, useState } from 'react';
import { GraphProvider, useGraphHistoryShortcuts, type Data, type GraphHandle, type Spec } from '@graphysdk/react';
import { EditableGraphRenderer } from '@graphysdk/react/editable';

export function ChartEditor({ data, initialSpec }: { data: Data; initialSpec: Spec }) {
  const [spec, setSpec] = useState(initialSpec);
  const handleRef = useRef<GraphHandle>(null);
  useGraphHistoryShortcuts(handleRef); // Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Ctrl+Y

  return (
    <div style={{ height: 400 }}>
      <GraphProvider spec={spec} data={data} handleRef={handleRef} onSpecChange={setSpec}>
        <EditableGraphRenderer mode="point-and-edit" />
      </GraphProvider>
    </div>
  );
}
```

Click a bar, line, axis label, legend pill, grid line, or empty background to open its edit menu. The shortcut hook enables undo and redo, and `spec` tracks the latest edit.

## The three modes

| `mode`                 | The user can                                                                                                                                               | Use it for                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `'readonly'` (default) | Hover and read tooltips                                                                                                                                    | Viewing. Commands still work.   |
| `'point-and-edit'`     | Click a part of the chart and change it from a menu. Hide an axis, the legend or grid lines.                                                               | Quick edits to the chart itself |
| `'editable'`           | Add, drag, resize and type into annotations. Edit the title, subtitle and caption in place. Add highlights and stickers from the (+) menu on a data point. | Annotations and inline text     |

Switch modes with the `mode` prop. Replacing `EditableGraphRenderer` with `GraphRenderer` remounts the chart and resets hover, animation, and editor state. Undo history stays in the provider and survives either change. Both editing modes hide tooltips. Point and edit also hides annotations. Switching between editing modes clears the selection.

## Where to look

| Task                                                                                                   | Read                                                            |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Selection, menu options, selection levels, visibility, keyboard controls, menu styling                 | [point and edit](reference/point-and-edit.md)                   |
| Install, toggle modes, save and restore, keep read-only pages light, CDN                               | [embedding](reference/embedding.md)                             |
| Dispatch edits from code or an agent, the command list, undo and redo, selection, serialize and replay | [commands](reference/commands.md)                               |
| Choose commands for a request; replay commands without a browser                                       | [request to command](reference/request-to-command.md)           |
| Annotations, drags, the (+) menu, inline text, annotation commands                                     | [annotations](reference/annotations.md)                         |
| Mount the pre-built settings panel, what each section edits, swap controls, write a section            | [panel](reference/panel.md)                                     |
| Exact signatures and accepted values                                                                   | [types](reference/types.md)                                     |
| Troubleshoot editing problems                                                                          | [troubleshooting](reference/troubleshooting.md)                 |
| Point and edit with persistence and a mode toggle                                                      | [recipes/point-and-edit](recipes/point-and-edit.md)             |
| Dispatch edits from a toolbar or agent                                                                 | [recipes/programmatic-editing](recipes/programmatic-editing.md) |
| Annotation editing with no panel                                                                       | [recipes/annotation-canvas](recipes/annotation-canvas.md)       |
| A tabbed editor with the pre-built panel                                                               | [recipes/tabbed-editor](recipes/tabbed-editor.md)               |
| The panel in your design system                                                                        | [recipes/design-system](recipes/design-system.md)               |
| Your own rows inside the point and edit menu                                                           | [recipes/custom-edit-menu](recipes/custom-edit-menu.md)         |
| Your own menu beside the selection                                                                     | [recipes/host-menu](recipes/host-menu.md)                       |
| Point and edit, annotate and view on one page                                                          | [recipes/two-modes](recipes/two-modes.md)                       |
| Point and edit in an HTML artifact with no bundler                                                     | [recipes/cdn-point-and-edit](recipes/cdn-point-and-edit.md)     |
| Build the spec, styles and annotations; install the SDK                                                | the graphy-charts skill                                         |

## Constraints

- Import editing components, commands, and helpers from `@graphysdk/react/editable`. Import the provider, hooks, and `GraphHandle` from `@graphysdk/react`. For the advanced install, use `@graphysdk/react-renderer` for the provider and hooks, `@graphysdk/react-renderer/editable` for editing components, and `@graphysdk/viz-engine` for commands.
- Keep `/editable` imports out of read-only pages to avoid loading TipTap and the panel. When using `/editable`, install its optional `@tiptap/*@^3` peer dependencies.
- Do not import `editable.css`; neither package exports that path. Each entry includes its own styles.
- After dispatching with `{ transient: true }`, call `commit()` when the gesture ends. `onSpecChange` waits until then.
- Commands with a missing target or an unchanged value do nothing.
- A new external `spec` object replaces the edited state and clears undo history after it compiles. Keep `spec` stable between renders and use the value returned by `onSpecChange`. Passing new `data` preserves history. `theme` and `plugins` are read at mount; to change them, remount `GraphProvider` with a new `key`.
- Check the panel section list before choosing it for a setting; it supports only part of the spec.
- Use named section exports and the root prop `defaultExpandedSection`. The legacy APIs `@graphysdk/editor`, `EditorProvider`, `GraphPanel`, `EditorPanel.Section`, and `defaultExpanded` are unavailable.
- For legacy code, replace `SetBarBorderRadiusCommand` with `SetBarCornerRadiusCommand`, `SetLineInterpolationCommand` with `SetLineCurveCommand`, `ToggleLinePointsVisibilityCommand` with `ToggleLinePointsCommand`, `convertSpecToInput` with `toSpec`. `SetScaleZeroCommand` is unavailable. The `observation` edit target is now `observations`.
