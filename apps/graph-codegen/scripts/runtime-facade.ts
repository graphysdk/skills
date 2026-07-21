/**
 * The `@app/runtime` facade — the single fixed dependency generated chart apps
 * may import. Bundled once by `build-vendor.mjs` (react, react-dom, and the
 * Graphy chart runtime all bundled in, not externalized) so the whole graph
 * shares ONE React instance. The runtime plugin serves this bundle for every
 * allowed specifier (`react`, `react-dom`, `@graphysdk/viz-engine`,
 * `@graphysdk/react-renderer`), so agent code can import the SDKs exactly as the
 * graphy-charts skill teaches and still resolve to this one module.
 */

import React from 'react';

// The published renderer ships its compiled stylesheet as a separate export;
// importing it here makes the vendor build emit it as `runtime.css`.
import '@graphysdk/react-renderer/styles.css';

// React ships as CommonJS, so `export * from 'react'` does not surface its named
// API as static ES exports. Re-export the public surface off the default object
// instead, so `import { useState } from 'react'` (remapped to this module) and
// `import React from 'react'` both resolve to the one bundled React instance.
export { React };
export default React;

export const {
  useState,
  useEffect,
  useLayoutEffect,
  useInsertionEffect,
  useRef,
  useMemo,
  useCallback,
  useContext,
  useReducer,
  useImperativeHandle,
  useDebugValue,
  useId,
  useTransition,
  useDeferredValue,
  useSyncExternalStore,
  createContext,
  createElement,
  cloneElement,
  isValidElement,
  createRef,
  forwardRef,
  memo,
  lazy,
  startTransition,
  Children,
  Component,
  PureComponent,
  StrictMode,
  Suspense,
  Profiler,
} = React;

export { createRoot } from 'react-dom/client';
export { Fragment, jsx, jsxs } from 'react/jsx-runtime';

import { GraphProvider as RendererGraphProvider } from '@graphysdk/react-renderer';
import type { VizDiagnostic } from '@graphysdk/viz-engine';

type RendererGraphProviderProps = React.ComponentProps<typeof RendererGraphProvider>;

// The bench needs to see compile/render failures that happen inside the
// sandboxed preview (a successful bundle says nothing about a valid spec).
// GraphProvider is re-exported with an injected onError that reports every
// diagnostic batch to the parent page; an agent-supplied onError still runs.
export const GraphProvider = (props: RendererGraphProviderProps): React.ReactElement => {
  const handleError = (errors: VizDiagnostic[]) => {
    props.onError?.(errors);
    try {
      window.parent.postMessage(
        {
          source: 'graph-codegen',
          type: 'runtime-errors',
          errors: errors.map((error) => ({
            code: String(error.code),
            message: error.message,
            suggestion: error.suggestion,
          })),
        },
        '*'
      );
    } catch {
      // Not embedded, or the parent is unreachable — reporting is best-effort.
    }
  };
  return React.createElement(RendererGraphProvider, { ...props, onError: handleError });
};

// The chart surface the skill teaches. Unlike chart-app-sandbox, the raw
// data-taking GraphProvider is exported directly (wrapped only for error
// reporting above): this tool exists to test that skill-generated code
// (`<GraphProvider data={data}>`) works as written.
export {
  createGraphyKit,
  defineGeomRenderer,
  DefaultFooter,
  DefaultGrid,
  DefaultHeader,
  DefaultSwatch,
  DefaultTooltip,
  GraphRenderer,
  lightenCss,
  UnitSpaceSvg,
  useCompiledSelector,
  useGeomHitTest,
  useGeomHover,
  usePanelScreenRect,
  vars,
} from '@graphysdk/react-renderer';
export {
  annotation,
  buildPolarBarArcPath,
  config,
  coord,
  createCompiler,
  createDatasetFromKindPartitions,
  createGraphyBuilder,
  createSpec,
  createStableKeyGenerator,
  Dataset,
  extractConstantValue,
  extractVariableName,
  Geom,
  geom,
  getAlpha,
  getAngleExtent,
  getBarRectBounds,
  getColor,
  getCrossAxisCoordinate,
  getGroup,
  getLineType,
  getMainAxisCoordinate,
  getRadiusExtent,
  getScaledAesthetic,
  getSize,
  getStackRole,
  getStrokeWidth,
  getX,
  getXMax,
  getXMin,
  getY,
  getYMax,
  getYMin,
  getYRaw,
  GROUP_VARIABLES,
  highlight,
  mapping,
  pipe,
  POSITION_VARIABLES,
  prefixInternalVariable,
  prepareLineObservations,
  readAuthoredNumber,
  readAuthoredString,
  scale,
  stat,
  toPercent,
  toViewBoxX,
  toViewBoxY,
  transform,
} from '@graphysdk/viz-engine';
