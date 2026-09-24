---
type: llm
weight: 1
---

Pass only if the spec is built once at module scope, or inside `useMemo`. A module-scope base spec extended with the title inside `useMemo` also passes. The skill's pitfalls say a new spec object recompiles the chart, so build it once or memoize it.

Fail if `pipe()` or `createSpec()` runs directly in the component body on every render with no `useMemo` around it.
