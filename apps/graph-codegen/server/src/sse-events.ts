/**
 * Events streamed to the web client over one POST /api/chat response.
 * `ms` is the time since the previous event — i.e. roughly how long the step
 * that produced this event took (thinking, a tool run, a bundle).
 */
export type GraphCodegenEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'agent_text'; text: string; ms?: number }
  | { type: 'tool_use'; name: string; detail: string; ms?: number }
  | { type: 'file_written'; path: string; contents: string }
  | { type: 'file_deleted'; path: string }
  | { type: 'bundle_start'; attempt: number }
  | {
      type: 'bundle_result';
      attempt: number;
      ok: boolean;
      errors: Array<{ message: string }>;
      warnings: Array<{ message: string }>;
      ms?: number;
    }
  | { type: 'preview'; html: string }
  | { type: 'turn_done'; costUsd?: number; ms?: number }
  | { type: 'error'; message: string };
