#!/usr/bin/env node
// Compile a { data, input } spec module headlessly and print diagnostics.
//
// Usage: node validate-spec.mjs <spec-file.mjs>
//
// The spec module must export:
//   data  — the viz-engine Data shape ({ columns, rows })
//   input — a SpecInput built with the spec builders (pipe, createSpec, mapping, geom, scale, …)
// Exit code 0 = compiled OK, 1 = errors.
//
// Needs @graphysdk/viz-engine resolvable from the current working directory (the project whose
// spec is being validated) or, failing that, from this script's own location (this skills repo,
// where the package is installed at the root). A resolve hook tries those anchors in order, so a
// spec module anywhere on disk compiles without its own node_modules.

import { register, registerHooks } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PACKAGE_NAME = '@graphysdk/viz-engine';
const ANCHORS = [pathToFileURL(path.join(process.cwd(), 'validate-spec-anchor.mjs')).href, import.meta.url];

function installResolveHook() {
  const matches = (specifier) => specifier === PACKAGE_NAME || specifier.startsWith(`${PACKAGE_NAME}/`);
  if (typeof registerHooks === 'function') {
    registerHooks({
      resolve: (specifier, context, next) => {
        if (matches(specifier)) {
          let lastError;
          for (const anchor of ANCHORS) {
            try {
              return next(specifier, { ...context, parentURL: anchor });
            } catch (error) {
              lastError = error;
            }
          }
          throw lastError;
        }
        try {
          return next(specifier, context);
        } catch (error) {
          // The dist emits extension-less deep imports (e.g. 'lodash-es/merge'); retry with .js.
          if (error?.code === 'ERR_MODULE_NOT_FOUND' && specifier.includes('/') && !/\.[a-z]+$/.test(specifier)) {
            return next(`${specifier}.js`, context);
          }
          throw error;
        }
      },
    });
    return;
  }
  // Older Node (< 22.15): async hook in a worker thread via a data-URL module.
  const source = `const anchors = ${JSON.stringify(ANCHORS)};
export async function resolve(specifier, context, next) {
  if (specifier === '${PACKAGE_NAME}' || specifier.startsWith('${PACKAGE_NAME}/')) {
    let lastError;
    for (const anchor of anchors) {
      try {
        return await next(specifier, { ...context, parentURL: anchor });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && specifier.includes('/') && !/\\.[a-z]+$/.test(specifier)) {
      return next(specifier + '.js', context);
    }
    throw error;
  }
}`;
  register(new URL(`data:text/javascript,${encodeURIComponent(source)}`));
}

function printDiagnostic(diagnostic) {
  console.log(`[${diagnostic.severity}] ${diagnostic.code}: ${diagnostic.message}`);
  if (diagnostic.suggestion) console.log(`  suggestion: ${diagnostic.suggestion}`);
  if (diagnostic.context) console.log(`  context: ${JSON.stringify(diagnostic.context)}`);
}

function printSummary(compiled, warnings) {
  console.log('compiled OK');
  const geoms = compiled.layers.map((layer) => layer.geom).join(', ');
  console.log(`  layers: ${compiled.layers.length} (${geoms})`);
  const scales = Object.entries(compiled.scales)
    .map(([aesthetic, compiledScale]) => `${aesthetic}: ${compiledScale.spec?.scaleType ?? compiledScale.kind}`)
    .join(', ');
  console.log(`  scales: ${scales}`);
  const coord = compiled.coordSystem;
  console.log(`  coord: ${coord.type}${coord.type === 'cartesian' ? ` (main axis: ${coord.mainAxis})` : ''}`);
  if (warnings.length > 0) {
    console.log(`  warnings: ${warnings.length}`);
    for (const warning of warnings) printDiagnostic(warning);
  }
}

const specPath = process.argv[2];
if (!specPath) {
  console.error('Usage: node validate-spec.mjs <spec-file.mjs>');
  process.exit(1);
}

installResolveHook();

const { createCompiler } = await import(PACKAGE_NAME);

let specModule;
try {
  specModule = await import(pathToFileURL(path.resolve(specPath)).href);
} catch (error) {
  console.error(`Failed to load spec module ${specPath}:`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const { data, input } = specModule;
if (data === undefined || input === undefined) {
  console.error(`Spec module must export both "data" and "input"; got ${Object.keys(specModule).join(', ') || 'no exports'}.`);
  process.exit(1);
}

const result = createCompiler().compile({ input, data, ctx: {} });

if (result.ok) {
  printSummary(result.compiled, result.warnings);
  process.exit(0);
}

console.log(`compile failed: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
for (const error of result.errors) printDiagnostic(error);
for (const warning of result.warnings) printDiagnostic(warning);
process.exit(1);
