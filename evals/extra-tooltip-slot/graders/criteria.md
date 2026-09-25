---
type: llm
weight: 1
---

Pass only if the custom tooltip is a React component set as `Tooltip` in the `slots` prop of `GraphRenderer`, and that slots object is stable: defined at module scope, or built with `useMemo`.

Fail if the tooltip is only a `title` attribute or a hover overlay built outside the slot. Also fail if the slots object is an inline literal written inside the component's render, such as `slots={{ Tooltip: MyTooltip }}` in the JSX. The skill's slots pitfalls say that is a new object on every render.
