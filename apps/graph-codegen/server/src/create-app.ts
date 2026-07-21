import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import { bundleApp } from './bundler/bundle.js';
import type { AvailableModel, ImageAttachment, ImageMediaType } from './agent-session.js';
import { AVAILABLE_MODELS, IMAGE_MEDIA_TYPES, runAgentTurn, toCustomErrorMessage } from './agent-session.js';
import type { GraphCodegenConfig } from './config.js';
import { importCsvData, writeWorkspaceDataFile } from './csv-import.js';
import type { OutputMode } from './session-store.js';
import { createSession, getSession, OUTPUT_MODES } from './session-store.js';
import type { GraphCodegenEvent } from './sse-events.js';

interface ChatRequestBody {
  prompt: string;
  sessionId?: string;
  csvText?: string;
  csvName?: string;
  model?: string;
  mode?: string;
  image?: { mediaType?: string; base64?: string };
}

const MAX_CSV_BYTES = 5 * 1024 * 1024;
// Base64 characters; ~5 MB of decoded image data.
const MAX_IMAGE_BASE64_LENGTH = 7 * 1024 * 1024;

export function createApp(config: GraphCodegenConfig): Hono {
  const app = new Hono();

  app.post('/api/chat', (context) =>
    streamSSE(context, async (stream) => {
      const send = (event: GraphCodegenEvent) => stream.writeSSE({ data: JSON.stringify(event) });
      let body: ChatRequestBody;
      try {
        body = await context.req.json<ChatRequestBody>();
      } catch {
        await send({ type: 'error', message: 'Invalid JSON body.' });
        return;
      }
      if (!body.prompt || typeof body.prompt !== 'string') {
        await send({ type: 'error', message: 'Missing prompt.' });
        return;
      }
      const model = (body.model ?? AVAILABLE_MODELS[0]) as AvailableModel;
      if (!AVAILABLE_MODELS.includes(model)) {
        await send({
          type: 'error',
          message: `Unknown model ${body.model}. Available: ${AVAILABLE_MODELS.join(', ')}.`,
        });
        return;
      }

      // The mode only matters at session creation; a resumed conversation keeps
      // the mode it started with regardless of what the client sends.
      const mode = (body.mode ?? 'tsx') as OutputMode;
      if (!OUTPUT_MODES.includes(mode)) {
        await send({ type: 'error', message: `Unknown mode ${body.mode}. Available: ${OUTPUT_MODES.join(', ')}.` });
        return;
      }
      const session = body.sessionId
        ? getSession(body.sessionId, config.skillDir)
        : createSession(config.skillDir, mode);
      if (!session) {
        await send({ type: 'error', message: `Unknown session ${body.sessionId}.` });
        return;
      }
      if (session.busy) {
        await send({ type: 'error', message: 'Session is already processing a turn.' });
        return;
      }
      await send({ type: 'session', sessionId: session.id });

      let prompt = body.prompt;
      if (body.csvText) {
        if (body.csvText.length > MAX_CSV_BYTES) {
          await send({ type: 'error', message: 'CSV too large (max 5 MB).' });
          return;
        }
        try {
          const { data, summary } = importCsvData(body.csvText, body.csvName ?? 'data.csv');
          session.data = data;
          session.dataSummary = summary;
          writeWorkspaceDataFile(session.workspaceDir, data);
          // Resumed conversations keep their original system prompt, so surface
          // the (new) dataset in the user turn as well.
          if (session.agentSessionId) {
            prompt = `A new dataset was attached.\n${summary}\n\n${prompt}`;
          }
        } catch (error) {
          await send({
            type: 'error',
            message: `CSV parse failed: ${error instanceof Error ? error.message : String(error)}`,
          });
          return;
        }
      }

      let image: ImageAttachment | undefined;
      if (body.image) {
        const { mediaType, base64 } = body.image;
        if (!mediaType || !IMAGE_MEDIA_TYPES.includes(mediaType as ImageMediaType)) {
          await send({ type: 'error', message: `Unsupported image type ${mediaType}.` });
          return;
        }
        if (!base64 || base64.length > MAX_IMAGE_BASE64_LENGTH) {
          await send({ type: 'error', message: 'Image missing or too large (max ~5 MB).' });
          return;
        }
        image = { mediaType: mediaType as ImageMediaType, base64 };
      }

      session.busy = true;
      // Events fire from deep inside the agent loop; queue them so SSE writes stay ordered.
      let writeChain = Promise.resolve();
      const emit = (event: GraphCodegenEvent) => {
        writeChain = writeChain.then(() => send(event)).catch(() => undefined);
      };
      try {
        await runAgentTurn(session, prompt, model, emit, image);
      } catch (error) {
        emit({ type: 'error', message: toCustomErrorMessage(error) });
      } finally {
        session.busy = false;
        await writeChain;
      }
    })
  );

  // Re-bundles a stored conversation's app with the CURRENT bundler (base CSS,
  // polyfills, vendor). The client calls this when opening a conversation so
  // old previews aren't frozen at whatever the bundler produced back then.
  app.post('/api/rebundle', async (context) => {
    const body = await context.req.json<{ sessionId?: string }>().catch(() => null);
    if (!body?.sessionId) return context.json({ error: 'Missing sessionId.' }, 400);
    const session = getSession(body.sessionId, config.skillDir);
    if (!session || session.files.size === 0) return context.json({ error: 'Unknown session.' }, 404);
    const result = await bundleApp(Object.fromEntries(session.files), session.data);
    if (result.diagnostics.errors.length > 0) {
      return context.json(
        { error: 'Bundle failed.', messages: result.diagnostics.errors.map((entry) => entry.message) },
        422
      );
    }
    return context.json({ html: result.html });
  });

  return app;
}
