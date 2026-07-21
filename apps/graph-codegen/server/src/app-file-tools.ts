import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

import type { CodegenSession } from './session-store.js';
import { deleteAppFileFromDisk, writeAppFileToDisk } from './session-store.js';

/** The virtual data module is host-owned; the agent may not shadow it. */
const RESERVED_PATHS = new Set(['data.json']);

/**
 * The in-process MCP server through which the agent emits code. Files live in
 * the session's in-memory map, mirrored to the workspace's app/ directory so a
 * conversation can be restored after a server restart. Writing marks the turn
 * as needing a rebundle.
 */
export function createAppFileServer(session: CodegenSession) {
  return createSdkMcpServer({
    name: 'appfs',
    version: '1.0.0',
    tools: [
      tool(
        'write_app_file',
        'Create or overwrite a source file in the chart app project. The entry file must be "App.tsx" with a default-exported React component.',
        { path: z.string(), contents: z.string() },
        async ({ path: filePath, contents }) => {
          const problem = validateProjectPath(filePath);
          if (problem) return errorResult(problem);
          session.files.set(filePath, contents);
          writeAppFileToDisk(session, filePath, contents);
          session.filesChangedInTurn = true;
          session.emit?.({ type: 'file_written', path: filePath, contents });
          return textResult(`Wrote ${filePath}. Project files: ${listFiles(session)}`);
        }
      ),
      tool(
        'edit_app_file',
        'Replace an exact string in an existing project file. Prefer this over write_app_file for fixes and tweaks — it avoids re-emitting the whole file. old_string must match the file contents exactly and, unless replace_all is set, occur exactly once (include surrounding lines to disambiguate).',
        {
          path: z.string(),
          old_string: z.string(),
          new_string: z.string(),
          replace_all: z.boolean().optional(),
        },
        async ({ path: filePath, old_string: oldString, new_string: newString, replace_all: replaceAll }) => {
          const contents = session.files.get(filePath);
          if (contents === undefined) return errorResult(`No such file: ${filePath}`);
          if (oldString.length === 0) return errorResult('old_string must not be empty.');
          if (oldString === newString) return errorResult('old_string and new_string are identical.');
          const occurrences = contents.split(oldString).length - 1;
          if (occurrences === 0)
            return errorResult(`String not found in ${filePath}. It must match exactly, including whitespace.`);
          if (occurrences > 1 && !replaceAll) {
            return errorResult(
              `String occurs ${occurrences} times in ${filePath}. Include more surrounding context to make it unique, or set replace_all.`
            );
          }
          const next = replaceAll ? contents.replaceAll(oldString, newString) : contents.replace(oldString, newString);
          session.files.set(filePath, next);
          writeAppFileToDisk(session, filePath, next);
          session.filesChangedInTurn = true;
          session.emit?.({ type: 'file_written', path: filePath, contents: next });
          return textResult(`Edited ${filePath} (${replaceAll ? occurrences : 1} replacement(s)).`);
        }
      ),
      tool(
        'delete_app_file',
        'Delete a source file from the chart app project.',
        { path: z.string() },
        async ({ path: filePath }) => {
          if (!session.files.has(filePath)) return errorResult(`No such file: ${filePath}`);
          session.files.delete(filePath);
          deleteAppFileFromDisk(session, filePath);
          session.filesChangedInTurn = true;
          session.emit?.({ type: 'file_deleted', path: filePath });
          return textResult(`Deleted ${filePath}. Project files: ${listFiles(session)}`);
        }
      ),
    ],
  });
}

function validateProjectPath(filePath: string): string | null {
  if (filePath.length === 0) return 'Path must not be empty.';
  if (filePath.startsWith('/') || filePath.includes('\\') || filePath.split('/').includes('..')) {
    return `Invalid path "${filePath}": must be relative, with no ".." segments or backslashes.`;
  }
  if (RESERVED_PATHS.has(filePath)) {
    return `"${filePath}" is reserved: the attached dataset is injected there by the host. Import it, don't write it.`;
  }
  return null;
}

function listFiles(session: CodegenSession): string {
  return [...session.files.keys()].join(', ') || '(none)';
}

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function errorResult(text: string) {
  return { content: [{ type: 'text' as const, text }], isError: true };
}
