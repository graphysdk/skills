import * as esbuild from 'esbuild';

import type { Data } from '@graphysdk/viz-engine';

import { runtimeCss } from './vendor/runtime.generated.js';
import { createRuntimePlugin } from './runtime-plugin.js';
import { createVirtualFsPlugin } from './virtual-fs-plugin.js';

export interface BundleDiagnostic {
  readonly message: string;
}

export interface BundleResult {
  readonly html: string;
  readonly diagnostics: {
    readonly errors: BundleDiagnostic[];
    readonly warnings: BundleDiagnostic[];
  };
}

/** Accepted entry modules: "App.tsx" in TSX mode, "App.js" in plain-JS mode. */
const APP_ENTRIES = ['App.tsx', 'App.js'];
/** The virtual module carrying the session's parsed dataset. */
const DATA_FILE = 'data.json';

const BUILD_OPTIONS = {
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  jsxImportSource: '@app/runtime',
  jsxDev: false,
  // The vendor is already minified, but esbuild re-emits it while bundling;
  // minify again so the final single-file artifact stays compact.
  minify: true,
  logLevel: 'silent',
} as const satisfies esbuild.BuildOptions;

// The bundler owns the mount: it imports the app's default-exported `App` and
// renders it into `#root`, so agent code never writes `createRoot` plumbing.
const BOOTSTRAP = [
  `import App from './App';`,
  `import { createRoot } from '@app/runtime';`,
  `const container = document.getElementById('root');`,
  `if (container) createRoot(container).render(<App />);`,
].join('\n');

/**
 * Bundles the agent's in-memory project into a single self-contained HTML page:
 * vendor runtime + app code inlined as one module script, renderer CSS + any raw
 * `.css` files inlined as one stylesheet. Build failures come back as
 * diagnostics rather than throwing, so the caller can feed them to the agent.
 */
export async function bundleApp(files: Record<string, string>, data?: Data): Promise<BundleResult> {
  if (!APP_ENTRIES.some((entry) => entry in files)) {
    return failure(
      `Missing required entry file. The app must provide "App.tsx" (or "App.js" in plain-JS mode) with a default-exported React component.`
    );
  }
  const projectFiles = data ? { ...files, [DATA_FILE]: JSON.stringify(data) } : files;
  try {
    const result = await esbuild.build({
      stdin: { contents: BOOTSTRAP, loader: 'tsx', sourcefile: 'bootstrap.tsx', resolveDir: '/' },
      ...BUILD_OPTIONS,
      plugins: [createRuntimePlugin(), createVirtualFsPlugin(projectFiles)],
    });
    const js = result.outputFiles[0]?.text ?? '';
    return {
      html: renderHtml(js, composeStyles(files)),
      diagnostics: {
        errors: result.errors.map(toDiagnostic),
        warnings: result.warnings.map(toDiagnostic),
      },
    };
  } catch (error) {
    return { html: '', diagnostics: toErrorDiagnostics(error) };
  }
}

function failure(message: string): BundleResult {
  return { html: '', diagnostics: { errors: [{ message }], warnings: [] } };
}

function toDiagnostic(message: esbuild.Message): BundleDiagnostic {
  const location = message.location ? ` (${message.location.file}:${message.location.line})` : '';
  return { message: `${message.text}${location}` };
}

/**
 * Normalizes any thrown failure into diagnostics. esbuild rejects with a
 * `BuildFailure` (structured `errors`/`warnings`); anything else must surface as
 * diagnostics rather than crash the caller.
 */
function toErrorDiagnostics(error: unknown): BundleResult['diagnostics'] {
  const buildFailure = error as Partial<esbuild.BuildFailure>;
  if (Array.isArray(buildFailure.errors)) {
    return {
      errors: buildFailure.errors.map(toDiagnostic),
      warnings: (buildFailure.warnings ?? []).map(toDiagnostic),
    };
  }
  return { errors: [{ message: error instanceof Error ? error.message : String(error) }], warnings: [] };
}

// A 16:9 stage, max 800px wide, centered on the page. Flex (not grid) so the
// percentage width resolves against the viewport rather than a content-sized
// auto track, which would collapse the empty #root to 0×0. Centering uses
// `margin: auto` on the stage, not align/justify on the body: auto margins
// resolve to 0 when content overflows, so a stage taller than the viewport
// (a dashboard) top-aligns and scrolls instead of clipping above the fold.
// The aspect ratio is a preferred size — content taller than 16:9 grows past it.
const BASE_CSS = `html, body { height: 100%; margin: 0; } body { font-family: system-ui, sans-serif; display: flex; padding: 24px; box-sizing: border-box; } #root { width: min(800px, 100%); aspect-ratio: 16 / 9; margin: auto; flex-shrink: 0; }`;

// Matches a full @import statement. The url/string is matched as a quoted
// token first because it may itself contain semicolons (Google Fonts URLs do:
// `wght@400;600`) — a naive scan-to-semicolon truncates the rule and the
// resulting unclosed quote invalidates the entire stylesheet.
const CSS_IMPORT_PATTERN = /@import\s+(?:url\(\s*(?:'[^']*'|"[^"]*"|[^)'"]*)\s*\)|'[^']*'|"[^"]*")[^;{]*;/g;

/**
 * The renderer stylesheet, a minimal reset, and any raw `.css` project files
 * appended verbatim. `@import` rules (the agent's web-font mechanism) are only
 * valid at the very top of a stylesheet, so they are hoisted out of the
 * project files and emitted first.
 */
function composeStyles(files: Record<string, string>): string {
  const imports: string[] = [];
  const rawCss = Object.entries(files)
    .filter(([path]) => path.endsWith('.css'))
    .map(([, contents]) =>
      contents.replaceAll(CSS_IMPORT_PATTERN, (importRule) => {
        imports.push(importRule);
        return '';
      })
    );
  return [...imports, runtimeCss, BASE_CSS, ...rawCss].filter(Boolean).join('\n\n');
}

// The preview iframe is sandboxed without allow-same-origin, so its opaque
// origin is a non-secure context where crypto.randomUUID does not exist (the
// renderer uses it for ids). getRandomValues IS available there — backfill.
const UUID_POLYFILL = `if (!crypto.randomUUID) { crypto.randomUUID = () => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join(''); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20); }; }`;

// Reports uncaught JS errors to the parent page so the bench can feed them
// back to the agent. Spec/compile diagnostics travel the same channel via the
// GraphProvider wrapper in the runtime facade.
const ERROR_REPORTER = `(function () { var post = function (errors) { try { parent.postMessage({ source: 'graph-codegen', type: 'runtime-errors', errors: errors }, '*'); } catch (ignored) {} }; window.addEventListener('error', function (event) { post([{ code: 'UNCAUGHT_ERROR', message: String(event.message || event.error) }]); }); window.addEventListener('unhandledrejection', function (event) { post([{ code: 'UNHANDLED_REJECTION', message: String((event.reason && event.reason.message) || event.reason) }]); }); })();`;

function renderHtml(js: string, css: string): string {
  const inlineScript = js.replaceAll('</script>', '<\\/script>');
  const inlineStyle = css ? `\n    <style>${css.replaceAll('</style>', '<\\/style>')}</style>` : '';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Generated chart</title>${inlineStyle}
  </head>
  <body>
    <div id="root"></div>
    <script>${UUID_POLYFILL}</script>
    <script>${ERROR_REPORTER}</script>
    <script type="module">${inlineScript}</script>
  </body>
</html>
`;
}
