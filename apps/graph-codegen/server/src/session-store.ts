import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Data } from '@graphysdk/viz-engine';

import type { GraphCodegenEvent } from './sse-events.js';

export const OUTPUT_MODES = ['tsx', 'js'] as const;
/** The authoring format the agent is instructed to emit: TSX, or plain JavaScript with h() calls. */
export type OutputMode = (typeof OUTPUT_MODES)[number];

/**
 * One chat session: an isolated workspace holding a copy of the skill (the only
 * filesystem the agent may read), the file map the agent writes through its MCP
 * tools, and the parsed dataset if a CSV was attached.
 *
 * Workspaces are persistent (not temp dirs) so a conversation restored from the
 * browser's history can continue after a server restart: the app files, the
 * dataset, and the Agent SDK session id all survive on disk, and the SDK keys
 * its resumable transcripts by cwd — which stays stable per conversation.
 */
export interface CodegenSession {
  readonly id: string;
  readonly workspaceDir: string;
  /** Fixed at creation — a conversation's agent transcript is written in one format throughout. */
  readonly mode: OutputMode;
  readonly files: Map<string, string>;
  data?: Data;
  dataSummary?: string;
  /** The Agent SDK session id, captured from the first init message; used to `resume`. */
  agentSessionId?: string;
  /** Set for the duration of a turn so tool handlers can stream events to the client. */
  emit?: (event: GraphCodegenEvent) => void;
  filesChangedInTurn: boolean;
  /** Whether a preview was ever built for this session (in this process). */
  previewBuilt: boolean;
  busy: boolean;
}

interface SessionMeta {
  agentSessionId?: string;
  dataSummary?: string;
  mode?: OutputMode;
}

const SESSIONS_ROOT = path.join(os.homedir(), '.graph-codegen', 'sessions');
/** Subdirectory mirroring the agent's in-memory project files. */
const APP_DIR = 'app';
const SKILL_DIR = 'skill';
const DATA_FILE = 'data.json';
const META_FILE = 'session.json';

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sessions = new Map<string, CodegenSession>();

export function createSession(skillDir: string, mode: OutputMode): CodegenSession {
  const id = randomUUID();
  const workspaceDir = path.join(SESSIONS_ROOT, id);
  fs.mkdirSync(path.join(workspaceDir, APP_DIR), { recursive: true });
  fs.cpSync(skillDir, path.join(workspaceDir, SKILL_DIR), { recursive: true });
  const session: CodegenSession = {
    id,
    workspaceDir,
    mode,
    files: new Map(),
    filesChangedInTurn: false,
    previewBuilt: false,
    busy: false,
  };
  sessions.set(id, session);
  persistSessionMeta(session);
  return session;
}

/** In-memory lookup first, falling back to restoring a persisted workspace from disk. */
export function getSession(sessionId: string, skillDir: string): CodegenSession | undefined {
  return sessions.get(sessionId) ?? restoreSession(sessionId, skillDir);
}

function restoreSession(sessionId: string, skillDir: string): CodegenSession | undefined {
  // The id comes from the client and becomes a path segment — accept UUIDs only.
  if (!SESSION_ID_PATTERN.test(sessionId)) return undefined;
  const workspaceDir = path.join(SESSIONS_ROOT, sessionId);
  const metaPath = path.join(workspaceDir, META_FILE);
  if (!fs.existsSync(metaPath)) return undefined;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as SessionMeta;
  // Refresh the skill copy so a restored conversation always tests the current skill.
  fs.rmSync(path.join(workspaceDir, SKILL_DIR), { recursive: true, force: true });
  fs.cpSync(skillDir, path.join(workspaceDir, SKILL_DIR), { recursive: true });
  const session: CodegenSession = {
    id: sessionId,
    workspaceDir,
    // Sessions persisted before the mode flag existed are TSX conversations.
    mode: meta.mode ?? 'tsx',
    files: readAppFiles(workspaceDir),
    data: readDataFile(workspaceDir),
    dataSummary: meta.dataSummary,
    agentSessionId: meta.agentSessionId,
    filesChangedInTurn: false,
    previewBuilt: false,
    busy: false,
  };
  sessions.set(sessionId, session);
  return session;
}

export function persistSessionMeta(session: CodegenSession): void {
  const meta: SessionMeta = {
    agentSessionId: session.agentSessionId,
    dataSummary: session.dataSummary,
    mode: session.mode,
  };
  fs.writeFileSync(path.join(session.workspaceDir, META_FILE), JSON.stringify(meta));
}

export function writeAppFileToDisk(session: CodegenSession, filePath: string, contents: string): void {
  const target = path.join(session.workspaceDir, APP_DIR, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

export function deleteAppFileFromDisk(session: CodegenSession, filePath: string): void {
  fs.rmSync(path.join(session.workspaceDir, APP_DIR, filePath), { force: true });
}

function readAppFiles(workspaceDir: string): Map<string, string> {
  const appDir = path.join(workspaceDir, APP_DIR);
  const files = new Map<string, string>();
  if (!fs.existsSync(appDir)) return files;
  for (const relativePath of fs.readdirSync(appDir, { recursive: true }) as string[]) {
    const absolutePath = path.join(appDir, relativePath);
    if (fs.statSync(absolutePath).isFile()) {
      files.set(relativePath.split(path.sep).join('/'), fs.readFileSync(absolutePath, 'utf8'));
    }
  }
  return files;
}

function readDataFile(workspaceDir: string): Data | undefined {
  const dataPath = path.join(workspaceDir, DATA_FILE);
  if (!fs.existsSync(dataPath)) return undefined;
  return JSON.parse(fs.readFileSync(dataPath, 'utf8')) as Data;
}
