---
type: llm
weight: 1
---

Pass only if the answer includes a complete React component that:

- Imports from `@graphysdk/react`
- Passes the chart to `GraphProvider` with a `spec` prop, not `input`
- Renders `GraphRenderer`
- Builds the spec with `createSpec`, `geom.bar()`, `scale.x()`, and `scale.y()`
- Maps column keys such as `month` and `revenue`
- Gives the chart a height, either with a parent element that has a height or with fixed sizing

Fail if the provider prop is `input`, if position scales are missing, or if the chart has no height.
