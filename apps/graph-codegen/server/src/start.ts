import path from 'node:path';

import { serve } from '@hono/node-server';
import { config as loadDotenv } from 'dotenv';

import { loadGraphCodegenConfig } from './config.js';
import { createApp } from './create-app.js';

const config = loadGraphCodegenConfig();
loadDotenv({ path: path.join(config.appRoot, '.env') });

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    `[graph-codegen] ANTHROPIC_API_KEY is not set (looked in ${path.join(config.appRoot, '.env')}); falling back to the Claude Code CLI's own credentials.`
  );
}

const app = createApp(config);

console.info(`[graph-codegen] API on http://127.0.0.1:${config.port}`);
console.info(`[graph-codegen] skill under test: ${config.skillDir}`);

serve({ fetch: app.fetch, port: config.port });
