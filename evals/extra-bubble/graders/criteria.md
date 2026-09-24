---
type: llm
weight: 1
---

Pass only if the layer is `geom.point()` and the mapping, in `createSpec` or the layer's `aes`, sets `size` to the population column key. x must map to income and y to life expectancy.

Fail if `size` is not mapped, or if bubble size comes only from a fixed `style.geom.point({ size })` value.
