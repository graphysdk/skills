import path from 'node:path';

import type { Options, PermissionResult, SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { query } from '@anthropic-ai/claude-agent-sdk';

import { bundleApp } from './bundler/bundle.js';
import { createAppFileServer } from './app-file-tools.js';
import type { CodegenSession, OutputMode } from './session-store.js';
import { persistSessionMeta } from './session-store.js';
import type { GraphCodegenEvent } from './sse-events.js';

const MAX_BUNDLE_ATTEMPTS = 3;
const MAX_AGENT_TURNS = 100;

const TSX_FORMAT_RULES = `- The entry file must be "App.tsx" and must default-export a React component.`;

const JS_FORMAT_RULES = `- Write plain modern JavaScript: no JSX and no TypeScript syntax anywhere, in any file.
- The entry file must be "App.js" and must default-export a React component.
- Build elements with createElement aliased to h: \`import { createElement as h } from 'react'\`, then e.g. \`h(GraphProvider, { data }, h(GraphRenderer, { spec }))\`.`;

const buildBasePrompt = (
  mode: OutputMode
): string => `You build small React chart apps using @graphysdk/viz-engine and @graphysdk/react-renderer.

## Knowledge source
Documentation for these packages lives in your working directory at skill/SKILL.md, with deeper reference files under skill/reference/ and worked recipes under skill/recipes/. Read skill/SKILL.md first; read deeper files only as the task requires. This documentation is your ONLY source of knowledge about these packages — do not rely on prior knowledge of their APIs.

## Output contract
Emit code exclusively through the file tools (write_app_file, edit_app_file, delete_app_file). Do not print code in chat.
${mode === 'js' ? JS_FORMAT_RULES : TSX_FORMAT_RULES}
- Use write_app_file only for new files or genuine full rewrites. For fixes and tweaks to an existing file, use edit_app_file with an exact unique old_string — never re-emit a whole file to change a few lines.
- Allowed imports: react, react-dom, react/jsx-runtime, @graphysdk/viz-engine, @graphysdk/react-renderer, @graphysdk/react-renderer/styles.css, and relative project files you created. Any other package fails the build.
- Plain .css files you write are inlined into the page automatically; importing them is a no-op but allowed.

## Data
When the user attaches a dataset, the host parses it and injects it into the project as data.json. Access it with \`import data from './data.json'\` and pass it to GraphProvider. Never write data.json yourself and never inline large datasets into code.
The same parsed dataset is also materialized at data.json in your working directory (one row per line) — Read it when you need to inspect value ranges, distributions, or category sets before designing the chart.

## Page layout
The page centers the #root element as a 16:9 stage, max 800px wide — right for a single chart. Content taller than the ratio grows and the page scrolls, but for dashboards or multi-panel layouts override the stage in your .css file, e.g. \`#root { width: min(1100px, 100%); aspect-ratio: auto; }\`, and size the panels yourself.

## Fonts
The preview page can load web fonts: write a .css project file containing \`@import url('https://fonts.googleapis.com/...')\` — raw .css files are inlined into the page verbatim and network access is available. Use this when a theme calls for a specific font.

## Build feedback
After each of your turns the host bundles the project headlessly. If the build fails, the errors are sent back to you — fix the files with write_app_file. Keep fixes minimal and grounded in the skill documentation.

## Chat style
Keep chat messages short — a sentence or two per message, a handful of sentences to wrap up a turn. State what you built and any decision the user must make; skip design narration, bullet-point breakdowns, and restating what the code already shows. The user reads the code in a side panel and sees the rendered chart.`;

export function toCustomErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.replace(/^.*(?:returned an error result|process exited[^:]*):\s*/i, '');
  const maxTurns = message.match(/maximum number of turns \((\d+)\)/i);
  if (maxTurns) {
    return `The agent stopped after hitting the ${maxTurns[1]}-turn limit. Send a message to continue where it left off.`;
  }
  return message;
}

export const AVAILABLE_MODELS = ['claude-fable-5', 'claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'] as const;
export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

export const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export type ImageMediaType = (typeof IMAGE_MEDIA_TYPES)[number];

/** An image attached to a user prompt (e.g. a style reference), already resized client-side. */
export interface ImageAttachment {
  mediaType: ImageMediaType;
  base64: string;
}

export async function runAgentTurn(
  session: CodegenSession,
  userPrompt: string,
  model: AvailableModel,
  rawEmit: (event: GraphCodegenEvent) => void,
  image?: ImageAttachment
): Promise<void> {
  const turnStartedAt = Date.now();
  // Stamp each timed event with the delta since the previous one — roughly how
  // long the step that produced it took.
  let previousEventAt = turnStartedAt;
  const emit = (event: GraphCodegenEvent) => {
    const now = Date.now();
    if (
      event.type === 'agent_text' ||
      event.type === 'tool_use' ||
      event.type === 'bundle_result' ||
      event.type === 'turn_done'
    ) {
      event.ms = event.type === 'turn_done' ? now - turnStartedAt : now - previousEventAt;
    }
    previousEventAt = now;
    rawEmit(event);
  };
  session.emit = emit;
  let turnCostUsd = 0;
  try {
    let prompt = userPrompt;
    for (let attempt = 1; attempt <= MAX_BUNDLE_ATTEMPTS; attempt += 1) {
      session.filesChangedInTurn = false;
      // A query failure (max turns, API error) must not skip bundling: the
      // agent may have already written a complete app this turn.
      let queryFailed = false;
      try {
        // The image accompanies only the user's own message; fix-loop follow-ups are plain text.
        turnCostUsd += await runAgentQuery(session, prompt, model, emit, attempt === 1 ? image : undefined);
      } catch (error) {
        queryFailed = true;
        emit({ type: 'error', message: toCustomErrorMessage(error) });
      }

      // Also bundle when nothing changed but the session has files and no
      // preview was ever built — e.g. a "continue" after a failed turn where
      // the agent decides the app is already complete.
      const shouldBundle = session.filesChangedInTurn || (session.files.size > 0 && !session.previewBuilt);
      if (!shouldBundle) return;

      emit({ type: 'bundle_start', attempt });
      const result = await bundleApp(Object.fromEntries(session.files), session.data);
      const ok = result.diagnostics.errors.length === 0;
      emit({
        type: 'bundle_result',
        attempt,
        ok,
        errors: result.diagnostics.errors.map((error) => ({ message: error.message })),
        warnings: result.diagnostics.warnings.map((warning) => ({ message: warning.message })),
      });
      if (ok) {
        session.previewBuilt = true;
        emit({ type: 'preview', html: result.html });
        return;
      }
      if (queryFailed || attempt === MAX_BUNDLE_ATTEMPTS) {
        emit({ type: 'error', message: `Build failing after ${attempt} attempt(s).` });
        return;
      }
      prompt = [
        'The app failed to bundle with these errors:',
        ...result.diagnostics.errors.map((error) => `- ${error.message}`),
        'Fix the affected files with write_app_file. Consult the skill documentation if an API is wrong.',
      ].join('\n');
    }
  } finally {
    // The agent session id (needed to resume this conversation later, possibly
    // after a server restart) is only known after the first query — persist it.
    persistSessionMeta(session);
    emit({ type: 'turn_done', costUsd: turnCostUsd > 0 ? turnCostUsd : undefined });
    session.emit = undefined;
  }
}

/**
 * A plain string prompt, or — when an image rides along — the SDK's streaming
 * input form: one user message whose content mixes image and text blocks.
 */
function buildPromptInput(prompt: string, image?: ImageAttachment): string | AsyncIterable<SDKUserMessage> {
  if (!image) return prompt;
  const message: SDKUserMessage = {
    type: 'user',
    parent_tool_use_id: null,
    message: {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
        { type: 'text', text: prompt },
      ],
    },
  };
  return (async function* streamSingleMessage() {
    yield message;
  })();
}

/** Runs one agent query and returns its cost in USD. */
async function runAgentQuery(
  session: CodegenSession,
  prompt: string,
  model: AvailableModel,
  emit: (event: GraphCodegenEvent) => void,
  image?: ImageAttachment
): Promise<number> {
  const options: Options = {
    cwd: session.workspaceDir,
    model,
    systemPrompt: buildSystemPrompt(session),
    tools: ['Read', 'Glob', 'Grep'],
    allowedTools: ['mcp__appfs__write_app_file', 'mcp__appfs__edit_app_file', 'mcp__appfs__delete_app_file'],
    disallowedTools: ['Bash', 'Write', 'Edit', 'WebFetch', 'WebSearch', 'Task', 'NotebookEdit', 'TodoWrite'],
    settingSources: [],
    strictMcpConfig: true,
    mcpServers: { appfs: createAppFileServer(session) },
    canUseTool: (toolName, input) => Promise.resolve(guardToolUse(session, toolName, input)),
    permissionMode: 'default',
    maxTurns: MAX_AGENT_TURNS,
    ...(session.agentSessionId ? { resume: session.agentSessionId } : {}),
  };

  let costUsd = 0;
  for await (const message of query({ prompt: buildPromptInput(prompt, image), options })) {
    costUsd += handleAgentMessage(session, message, emit);
  }
  return costUsd;
}

function buildSystemPrompt(session: CodegenSession): string {
  const sections = [
    buildBasePrompt(session.mode),
    // Read/Glob/Grep take absolute paths, and the model cannot know the
    // workspace's absolute location unless told — without this it guesses
    // (e.g. /home/user/...) and burns a turn on the failed read.
    `## Working directory\nYour workspace root is ${session.workspaceDir}. File tools take absolute paths: the skill entry point is ${session.workspaceDir}/skill/SKILL.md and the attached dataset, when present, is ${session.workspaceDir}/data.json.`,
  ];
  if (session.dataSummary) sections.push(`## Attached dataset\n${session.dataSummary}`);
  return sections.join('\n\n');
}

/**
 * The enforcement layer: the agent may read only inside its own workspace
 * (the skill copy). Everything else is denied, so monorepo source stays
 * invisible regardless of what the model asks for.
 */
function guardToolUse(session: CodegenSession, toolName: string, input: Record<string, unknown>): PermissionResult {
  if (toolName.startsWith('mcp__appfs__')) {
    return { behavior: 'allow', updatedInput: input };
  }
  if (toolName === 'Read' || toolName === 'Glob' || toolName === 'Grep') {
    const target =
      typeof input.file_path === 'string' ? input.file_path : typeof input.path === 'string' ? input.path : undefined;
    const resolved = path.resolve(session.workspaceDir, target ?? '.');
    if (resolved === session.workspaceDir || resolved.startsWith(session.workspaceDir + path.sep)) {
      return { behavior: 'allow', updatedInput: input };
    }
    return {
      behavior: 'deny',
      message: `Access outside the workspace is not allowed. Only the skill documentation under ${session.workspaceDir} is readable.`,
    };
  }
  return { behavior: 'deny', message: `Tool ${toolName} is not available in this session.` };
}

/** Streams the message's events to the client; returns the cost it reports (result messages only). */
function handleAgentMessage(
  session: CodegenSession,
  message: SDKMessage,
  emit: (event: GraphCodegenEvent) => void
): number {
  session.agentSessionId = message.session_id ?? session.agentSessionId;
  if (message.type === 'assistant') {
    for (const block of message.message.content) {
      if (block.type === 'text' && block.text.trim().length > 0) {
        emit({ type: 'agent_text', text: block.text });
      } else if (block.type === 'tool_use') {
        emit({ type: 'tool_use', name: block.name, detail: describeToolUse(session, block.input) });
      }
    }
  } else if (message.type === 'result') {
    return 'total_cost_usd' in message ? message.total_cost_usd : 0;
  }
  return 0;
}

/** Workspace-relative paths keep the chat transcript readable. */
function describeToolUse(session: CodegenSession, input: unknown): string {
  const record = (input ?? {}) as Record<string, unknown>;
  const target = String(record.file_path ?? record.path ?? record.pattern ?? '');
  return target.replaceAll(session.workspaceDir + path.sep, '');
}
