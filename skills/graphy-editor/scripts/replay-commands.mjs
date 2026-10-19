#!/usr/bin/env node
// Replay serialized commands against a { data, spec } module without a browser,
// using the same compilation session as GraphProvider.
//
// Usage: node replay-commands.mjs <spec-file.mjs> <commands.json> [--out <final-spec.json>]
//
// The spec module must export data and spec. Optional exports: plugins, colorScheme.
// Imports from @graphysdk/react and @graphysdk/react/editable resolve to
// @graphysdk/viz-engine so the module can use the same builders and commands.
//
// commands.json is a list of { type, params, metadata? } objects produced by
// commandRegistry.serialize. Entries may also be "commit", "undo", or "redo".
// The script reports each result and any compile errors, then prints the final
// spec or writes it to --out. This is the spec onSpecChange would return.
// Exit code 0: every command applied or was a no-op.
// Exit code 1: a command was rejected or unknown, or the initial spec did not compile.
//
// Install @graphysdk/viz-engine in the working directory or this script's
// directory. The resolve hook checks them in that order.

import { readFileSync, writeFileSync } from 'node:fs';
import * as module from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PACKAGE_NAME = '@graphysdk/viz-engine';
const REACT_PACKAGE_NAME = '@graphysdk/react';
const ANCHORS = [pathToFileURL(path.join(process.cwd(), 'replay-commands-anchor.mjs')).href, import.meta.url];

function installResolveHook() {
  const matches = (specifier) => specifier === PACKAGE_NAME || specifier.startsWith(`${PACKAGE_NAME}/`);
  const toEngine = (requested) =>
    requested === REACT_PACKAGE_NAME || requested === `${REACT_PACKAGE_NAME}/editable` ? PACKAGE_NAME : requested;
  if (typeof module.registerHooks === 'function') {
    module.registerHooks({
      resolve: (requested, context, next) => {
        const specifier = toEngine(requested);
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
          if (error?.code === 'ERR_MODULE_NOT_FOUND' && specifier.includes('/') && !/\.[a-z]+$/.test(specifier)) {
            return next(`${specifier}.js`, context);
          }
          throw error;
        }
      },
    });
    return;
  }
  const source = `const anchors = ${JSON.stringify(ANCHORS)};
export async function resolve(requested, context, next) {
  const specifier = requested === '${REACT_PACKAGE_NAME}' || requested === '${REACT_PACKAGE_NAME}/editable' ? '${PACKAGE_NAME}' : requested;
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
  module.register(new URL(`data:text/javascript,${encodeURIComponent(source)}`));
}

function printDiagnostic(diagnostic) {
  console.log(`    [${diagnostic.severity}] ${diagnostic.code}: ${diagnostic.message}`);
  if (diagnostic.suggestion) console.log(`      suggestion: ${diagnostic.suggestion}`);
}

const [specPath, commandsPath, ...rest] = process.argv.slice(2);
const outFlag = rest.indexOf('--out');
const outPath = outFlag === -1 ? null : rest[outFlag + 1];
if (!specPath || !commandsPath || (outFlag !== -1 && !outPath)) {
  console.error('Usage: node replay-commands.mjs <spec-file.mjs> <commands.json> [--out <final-spec.json>]');
  process.exit(1);
}

installResolveHook();

const { createCompiler, commandRegistry, GraphCompilationSession } = await import(PACKAGE_NAME);

let specModule;
try {
  specModule = await import(pathToFileURL(path.resolve(specPath)).href);
} catch (error) {
  console.error(`Failed to load spec module ${specPath}:`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const { data, spec, plugins = [], colorScheme } = specModule;
if (data === undefined || spec === undefined) {
  console.error(
    `Spec module must export both "data" and "spec"; got ${Object.keys(specModule).join(', ') || 'no exports'}.`
  );
  process.exit(1);
}

const steps = JSON.parse(readFileSync(path.resolve(commandsPath), 'utf8'));
if (!Array.isArray(steps)) {
  console.error('commands.json must hold a list of serialized commands.');
  process.exit(1);
}

const session = new GraphCompilationSession(createCompiler({ plugins }));
const initial = session.compile({ spec, data, colorScheme });
if (!initial.ok) {
  console.log(`compile failed before any command: ${initial.errors.length} error(s)`);
  for (const error of initial.errors) printDiagnostic(error);
  process.exit(1);
}

let finalSpec = spec;
let failed = false;

const describe = (step) => (typeof step === 'string' ? step : `${step.type} ${JSON.stringify(step.params ?? {})}`);

const absorb = (notifications) => {
  for (const notification of notifications) {
    if (notification.spec) finalSpec = notification.spec;
    if (notification.errors) {
      failed = true;
      console.log('  rejected: the result does not compile, the chart keeps the last good spec');
      for (const error of notification.errors) printDiagnostic(error);
    }
  }
  return notifications;
};

steps.forEach((step, index) => {
  console.log(`${index + 1}. ${describe(step)}`);
  if (step === 'commit' || step === 'undo' || step === 'redo') {
    const notifications = absorb(session[step]());
    if (notifications.some((notification) => notification.errors)) return;
    console.log(notifications.length === 0 ? '  nothing to do' : `  ${step} applied`);
    return;
  }

  let command;
  try {
    command = commandRegistry.deserialize({ metadata: {}, ...step });
  } catch (error) {
    failed = true;
    console.log(`  unknown command: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const transient = step.transient === true;
  const notifications = absorb(session.applyCommand(command, { transient }));
  const rendered = notifications.some((notification) => notification.scene !== undefined);
  if (notifications.some((notification) => notification.errors)) return;
  if (!rendered) {
    console.log('  no-op: the target is missing or the value is already set, nothing joins the history');
    return;
  }
  console.log(
    transient ? '  applied transiently, commit to close the run' : `  applied: ${command.metadata.description}`
  );
});

absorb(session.commit());

const { undoStack, redoStack } = session.history.getSnapshot();
console.log(`history: ${undoStack.length} undo step(s), ${redoStack.length} redo step(s)`);
for (const entry of undoStack) console.log(`  ${entry.description}`);

const json = JSON.stringify(finalSpec, null, 2);
if (outPath) {
  writeFileSync(path.resolve(outPath), `${json}\n`);
  console.log(`final spec written to ${outPath}`);
} else {
  console.log('final spec:');
  console.log(json);
}

process.exit(failed ? 1 : 0);
