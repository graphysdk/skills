---
type: llm
weight: 1
---

Pass only if the goal line's red is painted with `style.geom.rule` using `stroke`, for example `styles({ defaults: [style.geom.rule({ stroke: '#e5484d' })] })`. The storytelling reference says rules and lines stroke, and `style.geom.rule({ color })` is dropped with a warning.

Fail if the rule is styled with `color`, `fill`, or `borderColor`, including a colour set through the rule's `aes`.
