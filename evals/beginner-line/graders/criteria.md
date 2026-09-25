---
type: llm
weight: 1
---

Pass only if the chart uses `geom.line()` with `scale.x()` and `scale.y()`, imported from `@graphysdk/react`.

Fail if it uses a bar geom as the only series, or if a position scale is missing.
