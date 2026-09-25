---
type: llm
weight: 1
---

Pass only if the spec folds the `Alpha` and `Beta` columns into long form with `transform.reshape`, either at spec level or in the bar layer's `transforms`, and maps `color` to the key column the reshape creates (for example `keyName: 'product'`), with `y` mapped to its value column.

Fail if `color` is mapped to `Alpha`, `Beta`, or any other column that only exists after a reshape that never happens. Also fail if the products are drawn as separate bar layers with no reshape, or if the rows are rewritten into long form by hand instead of with `transform.reshape`.
