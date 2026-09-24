---
type: llm
weight: 1
---

Pass only if the spec includes both `scale.x()` and `scale.y()`. A typed variant such as `scale.y.continuous()` counts for y. The skill's pitfalls say a mapped `x` or `y` without its position scale draws nothing.

Fail if either `scale.x()` or `scale.y()` is missing from the spec.
