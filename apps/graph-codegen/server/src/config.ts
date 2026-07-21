import fs from 'node:fs';
import path from 'node:path';

export interface GraphCodegenConfig {
  readonly port: number;
  readonly skillDir: string;
  readonly appRoot: string;
}

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let depth = 0; depth < 12; depth += 1) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error('Could not locate repo root (pnpm-workspace.yaml).');
}

export function loadGraphCodegenConfig(): GraphCodegenConfig {
  const repoRoot = findRepoRoot(process.cwd());
  const skillDir = process.env.GRAPH_CODEGEN_SKILL_DIR
    ? path.resolve(process.env.GRAPH_CODEGEN_SKILL_DIR)
    : path.join(repoRoot, 'skills', 'graphy-charts');
  return {
    port: Number(process.env.GRAPH_CODEGEN_PORT ?? '4315'),
    skillDir,
    appRoot: path.join(repoRoot, 'apps', 'graph-codegen'),
  };
}
