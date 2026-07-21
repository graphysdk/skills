import type { Plugin } from 'esbuild';

import { runtimeModule } from './vendor/runtime.generated.js';

/**
 * The fixed-dependency boundary. Generated app code may import `@app/runtime`
 * (and the JSX runtime esbuild derives from it via `jsxImportSource`) plus the
 * bare `react`/`react-dom`/`@graphysdk/*` specifiers, which are remapped here to
 * the same vendor module; every other bare specifier is a build error, so the
 * dependency set is fixed and non-extendable. All allowed specifiers normalize
 * to the same vendor path, so esbuild loads one module — and therefore one React
 * instance — for the whole app.
 */

const NAMESPACE = 'graphy-runtime';
const RUNTIME = '@app/runtime';
const RUNTIME_FILTER =
  /^(@app\/runtime(\/jsx-runtime)?|react|react-dom(\/client)?|react\/jsx-runtime|@graphysdk\/(viz-engine|react-renderer))$/;
const ALLOWED_IMPORTS = '"react", "react-dom", "@graphysdk/viz-engine", "@graphysdk/react-renderer"';
const BARE_SPECIFIER_FILTER = /^[^.]/;
// The renderer's stylesheet is already inlined into every preview, so the
// conventional `import '@graphysdk/react-renderer/styles.css'` is a permitted
// side-effect import that resolves to an empty module.
const STYLES_FILTER = /^@graphysdk\/react-renderer\/styles\.css$/;
const STYLES_NAMESPACE = 'graphy-runtime-css';

export function createRuntimePlugin(): Plugin {
  return {
    name: 'graphy-runtime',
    setup(build) {
      build.onResolve({ filter: STYLES_FILTER }, () => ({ path: RUNTIME, namespace: STYLES_NAMESPACE }));
      build.onLoad({ filter: /.*/, namespace: STYLES_NAMESPACE }, () => ({ contents: '', loader: 'js' }));

      build.onResolve({ filter: RUNTIME_FILTER }, () => ({ path: RUNTIME, namespace: NAMESPACE }));

      // The prebuilt vendor is self-contained except for a few guarded optional
      // `require()`s inside its ESM deps; leave them external so they throw and
      // fall back at runtime — exactly as in a browser, where `require` is undefined.
      build.onResolve({ filter: BARE_SPECIFIER_FILTER, namespace: NAMESPACE }, (args) =>
        args.kind === 'require-call' ? { external: true } : undefined
      );

      build.onResolve({ filter: BARE_SPECIFIER_FILTER }, (args) => ({
        errors: [
          { text: `"${args.path}" is not an allowed import. The only permitted dependencies are ${ALLOWED_IMPORTS}.` },
        ],
      }));

      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, () => ({ contents: runtimeModule, loader: 'js' }));
    },
  };
}
