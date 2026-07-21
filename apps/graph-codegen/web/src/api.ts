/** Mirrors server/src/sse-events.ts — keep the two in sync. */
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

export const AVAILABLE_MODELS = ['claude-fable-5', 'claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'] as const;
export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

export const OUTPUT_MODES = ['tsx', 'js'] as const;
/** The authoring format the agent emits: TSX, or plain JavaScript with h() calls. */
export type OutputMode = (typeof OUTPUT_MODES)[number];

export interface ImageAttachment {
  mediaType: string;
  base64: string;
}

/**
 * The API downscales anything past ~1568px on the long edge, so larger uploads
 * cost bandwidth for zero fidelity. Everything is rasterized client-side to a
 * JPEG at this cap — which is also what makes SVG attachments possible: the
 * API itself does not accept SVG.
 */
const MAX_IMAGE_EDGE_PX = 1568;
const IMAGE_JPEG_QUALITY = 0.85;

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolvePromise, rejectPromise) => {
    const image = new Image();
    image.onload = () => resolvePromise(image);
    image.onerror = () => rejectPromise(new Error('Could not decode the attached image.'));
    image.src = url;
  });
}

/**
 * Raster images keep their natural size (downscaled later if oversized). SVGs
 * always rasterize at the full maximum edge — vectors upscale losslessly, and
 * browsers report an arbitrary default size (300×150-based) when the SVG has
 * no width/height attributes. Aspect comes from the viewBox, then the reported
 * natural size, then 4:3.
 */
async function resolveImageSize(image: HTMLImageElement, file: File): Promise<{ width: number; height: number }> {
  if (file.type === 'image/svg+xml') {
    const aspect = await resolveSvgAspect(image, file);
    return aspect >= 1
      ? { width: MAX_IMAGE_EDGE_PX, height: MAX_IMAGE_EDGE_PX / aspect }
      : { width: MAX_IMAGE_EDGE_PX * aspect, height: MAX_IMAGE_EDGE_PX };
  }
  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }
  return { width: 1024, height: 768 };
}

async function resolveSvgAspect(image: HTMLImageElement, file: File): Promise<number> {
  const svgText = await file.text();
  const viewBox = svgText.match(/viewBox\s*=\s*["']\s*[\d.+-]+[\s,]+[\d.+-]+[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)/i);
  const width = viewBox ? Number(viewBox[1]) : 0;
  const height = viewBox ? Number(viewBox[2]) : 0;
  if (width > 0 && height > 0) return width / height;
  if (image.naturalWidth > 0 && image.naturalHeight > 0) return image.naturalWidth / image.naturalHeight;
  return 4 / 3;
}

/** Rasterizes any supported attachment (PNG/JPEG/WebP/GIF/SVG) to a downscaled JPEG. */
export async function encodeImageAttachment(file: File): Promise<ImageAttachment> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(url);
    const { width: sourceWidth, height: sourceHeight } = await resolveImageSize(image, file);
    const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable.');
    // JPEG has no alpha channel — without an underlay, transparent regions
    // (common in SVGs and PNG screenshots) come out black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_JPEG_QUALITY);
    return { mediaType: 'image/jpeg', base64: dataUrl.slice(dataUrl.indexOf(',') + 1) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface ChatRequest {
  prompt: string;
  sessionId?: string;
  csvText?: string;
  csvName?: string;
  model?: AvailableModel;
  /** Only consulted when the request starts a new session; resumed sessions keep their mode. */
  mode?: OutputMode;
  image?: ImageAttachment;
}

/**
 * Asks the server to re-bundle a stored conversation's app with the current
 * bundler. Returns the fresh HTML, or null when the server can't (session
 * predates workspace persistence, build now fails, server down) — callers fall
 * back to the stored snapshot.
 */
export async function rebundleSession(sessionId: string): Promise<string | null> {
  try {
    const response = await fetch('/api/rebundle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { html?: string };
    return payload.html ?? null;
  } catch {
    return null;
  }
}

/** POSTs one chat turn and yields the SSE events of the whole turn (including auto-fix attempts). */
export async function* streamChatTurn(request: ChatRequest): AsyncGenerator<GraphCodegenEvent> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Request failed: ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line; data lines carry the JSON payload.
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      for (const line of frame.split('\n')) {
        if (line.startsWith('data: ')) {
          yield JSON.parse(line.slice('data: '.length)) as GraphCodegenEvent;
        }
      }
      boundary = buffer.indexOf('\n\n');
    }
  }
}
