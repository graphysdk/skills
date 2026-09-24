---
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
---

Here is my bar chart, built with the Graphy SDK:

```tsx
import { GraphProvider, GraphRenderer, createSpec, geom, pipe, scale } from '@graphysdk/react';

const data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', revenue: 120 },
    { month: 'Feb', revenue: 150 },
    { month: 'Mar', revenue: 90 },
  ],
};

const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

export function RevenueGraph() {
  return (
    <div style={{ height: 320 }}>
      <GraphProvider data={data} spec={spec}>
        <GraphRenderer />
      </GraphProvider>
    </div>
  );
}
```

Our app has a dark theme. Show me the same chart in dark mode.
