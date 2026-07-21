import type { Loader, Plugin } from 'esbuild';

/**
 * Resolves relative imports (`./`, `../`) against an in-memory file map — the
 * mirror image of `runtime-plugin`'s bare-specifier boundary. Together the two
 * plugins fix the dependency set: relative specifiers must name a project file,
 * bare specifiers must be an allowed runtime import, and everything else is a
 * build error. No real filesystem is touched.
 *
 * Raw `.css` files are inlined into the page stylesheet, so importing one from
 * code resolves to an empty module — the stylesheet is applied regardless.
 */

const VFS_NAMESPACE = 'graphy-vfs';
const RELATIVE_FILTER = /^\.\.?\//;
// Suffixes tried in order to map a resolved path to a file-map key: an exact
// match, then extensions, then `index.*` files for directory imports.
const CANDIDATE_SUFFIXES = [
  '',
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.json',
  '.css',
  '/index.tsx',
  '/index.ts',
  '/index.jsx',
  '/index.js',
];

export function createVirtualFsPlugin(files: Record<string, string>): Plugin {
  return {
    name: 'graphy-vfs',
    setup(build) {
      build.onResolve({ filter: RELATIVE_FILTER }, (args) => {
        const baseDir = args.namespace === VFS_NAMESPACE ? dirname(args.importer) : '';
        const target = normalizeJoin(baseDir, args.path);
        const match = target === null ? undefined : pickFile(files, target);
        if (!match) {
          const from = args.importer ? ` from "${args.importer}"` : '';
          return { errors: [{ text: `Cannot resolve "${args.path}"${from}. No such file in the project.` }] };
        }
        return { path: match, namespace: VFS_NAMESPACE };
      });

      build.onLoad({ filter: /.*/, namespace: VFS_NAMESPACE }, (args) => {
        if (args.path.endsWith('.css')) return { contents: '', loader: 'js' };
        return { contents: files[args.path] ?? '', loader: loaderFor(args.path) };
      });
    },
  };
}

function dirname(filePath: string): string {
  const slash = filePath.lastIndexOf('/');
  return slash === -1 ? '' : filePath.slice(0, slash);
}

/**
 * Joins a base directory with a relative specifier, collapsing `.`/`..`. Returns
 * `null` when `..` would traverse above the project root, so an out-of-bounds
 * specifier is rejected rather than silently aliased onto a root-relative path.
 */
function normalizeJoin(baseDir: string, specifier: string): string | null {
  const segments = baseDir ? baseDir.split('/') : [];
  for (const part of specifier.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (segments.length === 0) return null;
      segments.pop();
    } else segments.push(part);
  }
  return segments.join('/');
}

/** Finds the file map key for a resolved path, trying extensions and index files. */
function pickFile(files: Record<string, string>, target: string): string | undefined {
  for (const suffix of CANDIDATE_SUFFIXES) {
    const key = `${target}${suffix}`;
    if (key in files) return key;
  }
  return undefined;
}

function loaderFor(filePath: string): Loader {
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.ts')) return 'ts';
  if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) return 'tsx';
  return 'js';
}
