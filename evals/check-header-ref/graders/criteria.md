---
type: llm
weight: 1
---

Pass only if the custom header is set as the `Header` slot and the component forwards `ref` to its outer element. Taking `ref` from the slot props, or wrapping with `forwardRef`, and attaching it to the outermost element both count. The slots reference says the layout measures that element, and without `ref` the panel paints over the header.

Fail if the header component does not accept `ref`, or accepts it but does not attach it to its outer element.
