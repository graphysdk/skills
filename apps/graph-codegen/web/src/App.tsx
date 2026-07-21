import { useCallback, useEffect, useRef, useState } from 'react';

import type { AvailableModel, GraphCodegenEvent, OutputMode } from './api';
import { AVAILABLE_MODELS, encodeImageAttachment, OUTPUT_MODES, rebundleSession, streamChatTurn } from './api';
import type { ChatEntry, ConversationSummary, DiagnosticEntry } from './storage';
import { deleteConversation, listConversations, loadConversation, saveConversation } from './storage';

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const FIXED_TAB_LABELS: Record<string, string> = { preview: 'Preview' };

const TOOL_LABELS: Record<string, string> = {
  mcp__appfs__write_app_file: 'Write',
  mcp__appfs__edit_app_file: 'Edit',
  mcp__appfs__delete_app_file: 'Delete',
};

/** Chat-friendly tool name: mapped label, or any other MCP name with its server prefix stripped. */
function formatToolName(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/^mcp__\w+?__/, '');
}

/** 'preview' and 'diagnostics' are fixed tabs; any other value is a generated file path. */
type Tab = string;

const MODEL_STORAGE_KEY = 'graph-codegen:model';
const MODE_STORAGE_KEY = 'graph-codegen:mode';
const TITLE_MAX_LENGTH = 80;

function loadStoredModel(): AvailableModel {
  const stored = localStorage.getItem(MODEL_STORAGE_KEY) as AvailableModel | null;
  return stored !== null && AVAILABLE_MODELS.includes(stored) ? stored : AVAILABLE_MODELS[0];
}

function loadStoredOutputMode(): OutputMode {
  const stored = localStorage.getItem(MODE_STORAGE_KEY) as OutputMode | null;
  return stored !== null && OUTPUT_MODES.includes(stored) ? stored : OUTPUT_MODES[0];
}

/** How close (px) to the bottom the user must be for auto-scroll to stay engaged. */
const PIN_THRESHOLD = 48;

/** Automatic render-error fix turns allowed per user prompt (each is a billed agent turn). */
const MAX_RUNTIME_FIX_ATTEMPTS = 3;

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);

function isCsvFile(file: File): boolean {
  return file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
}

export default function App() {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [prompt, setPrompt] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<Tab>('preview');
  const [html, setHtml] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>([]);
  const [model, setModel] = useState<AvailableModel>(loadStoredModel);
  const [outputMode, setOutputMode] = useState<OutputMode>(loadStoredOutputMode);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const createdAtRef = useRef<number | undefined>(undefined);
  const unsavedTurnRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const runningRef = useRef(false);
  // Runtime errors arrive from the preview iframe via postMessage. One batch is
  // processed per rendered preview, and the automatic fix turns are capped per
  // user prompt — a fix that keeps breaking doesn't loop unbounded.
  const previewNonceRef = useRef(0);
  const handledPreviewRef = useRef(0);
  const runtimeFixAttemptsRef = useRef(0);
  const pendingRuntimeErrorsRef = useRef<string[] | null>(null);

  const appendEntry = useCallback((entry: ChatEntry) => {
    setEntries((previous) => [...previous, entry]);
  }, []);

  const refreshConversations = useCallback(() => {
    void listConversations().then(setConversations);
  }, []);

  useEffect(refreshConversations, [refreshConversations]);

  useEffect(() => {
    if (pinnedToBottom) {
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
    }
  }, [entries, running, pinnedToBottom]);

  // Snapshot the conversation once the turn settles (all state flushed).
  useEffect(() => {
    if (running || !unsavedTurnRef.current) return;
    const id = sessionIdRef.current;
    if (!id) return;
    unsavedTurnRef.current = false;
    const title = entries.find((entry) => entry.kind === 'user')?.text.slice(0, TITLE_MAX_LENGTH) ?? 'Untitled';
    const createdAt = createdAtRef.current ?? Date.now();
    createdAtRef.current = createdAt;
    void saveConversation({
      id,
      title,
      createdAt,
      updatedAt: Date.now(),
      model,
      entries,
      files,
      diagnostics,
      html,
    }).then(refreshConversations);
  }, [running, entries, files, diagnostics, html, model, refreshConversations]);

  const handleMessagesScroll = useCallback(() => {
    const node = messagesRef.current;
    if (!node) return;
    setPinnedToBottom(node.scrollHeight - node.scrollTop - node.clientHeight < PIN_THRESHOLD);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
    setPinnedToBottom(true);
  }, []);

  const selectModel = useCallback((next: AvailableModel) => {
    setModel(next);
    localStorage.setItem(MODEL_STORAGE_KEY, next);
  }, []);

  const selectOutputMode = useCallback((next: OutputMode) => {
    setOutputMode(next);
    localStorage.setItem(MODE_STORAGE_KEY, next);
  }, []);

  /** Ignore runtime-error reports from whatever preview is currently mounted. */
  const muteCurrentPreview = useCallback(() => {
    previewNonceRef.current += 1;
    handledPreviewRef.current = previewNonceRef.current;
    pendingRuntimeErrorsRef.current = null;
  }, []);

  const startNewConversation = useCallback(() => {
    if (running) return;
    sessionIdRef.current = undefined;
    createdAtRef.current = undefined;
    unsavedTurnRef.current = false;
    muteCurrentPreview();
    setEntries([]);
    setFiles({});
    setDiagnostics([]);
    setHtml(null);
    setTab('preview');
    setHistoryOpen(false);
    setPinnedToBottom(true);
  }, [running, muteCurrentPreview]);

  const openConversation = useCallback(
    async (id: string) => {
      if (running) return;
      const record = await loadConversation(id);
      if (!record) return;
      sessionIdRef.current = record.id;
      createdAtRef.current = record.createdAt;
      unsavedTurnRef.current = false;
      // The restored preview may re-report its (already recorded) errors —
      // that must not trigger a fresh billed fix turn.
      muteCurrentPreview();
      setEntries(record.entries);
      setFiles(record.files);
      setDiagnostics(record.diagnostics);
      setHtml(record.html);
      if (AVAILABLE_MODELS.includes(record.model as AvailableModel)) {
        setModel(record.model as AvailableModel);
      }
      setTab('preview');
      setHistoryOpen(false);
      setPinnedToBottom(true);
      // Refresh the preview with the current bundler so old conversations pick
      // up base-CSS/polyfill/vendor fixes; the stored snapshot is the fallback.
      void rebundleSession(record.id).then((freshHtml) => {
        if (!freshHtml || sessionIdRef.current !== record.id) return;
        setHtml(freshHtml);
        void saveConversation({ ...record, html: freshHtml });
      });
    },
    [running, muteCurrentPreview]
  );

  const removeConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      refreshConversations();
    },
    [refreshConversations]
  );

  const handleEvent = useCallback(
    (event: GraphCodegenEvent) => {
      switch (event.type) {
        case 'session':
          sessionIdRef.current = event.sessionId;
          break;
        case 'agent_text':
          appendEntry({ kind: 'agent', text: event.text, ms: event.ms });
          break;
        case 'tool_use':
          appendEntry({ kind: 'status', text: `${formatToolName(event.name)} ${event.detail}`.trim(), ms: event.ms });
          break;
        case 'file_written':
          setFiles((previous) => ({ ...previous, [event.path]: event.contents }));
          break;
        case 'file_deleted':
          setFiles((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== event.path)));
          setTab((current) => (current === event.path ? 'preview' : current));
          break;
        case 'bundle_start':
          appendEntry({ kind: 'status', text: `Bundling (attempt ${event.attempt})…` });
          break;
        case 'bundle_result':
          setDiagnostics((previous) => [
            ...previous,
            {
              attempt: event.attempt,
              ok: event.ok,
              messages: [...event.errors, ...event.warnings].map((item) => item.message),
            },
          ]);
          appendEntry({
            kind: 'status',
            text: event.ok ? 'Build succeeded.' : `Build failed with ${event.errors.length} error(s).`,
            ms: event.ms,
          });
          break;
        case 'preview':
          previewNonceRef.current += 1;
          setHtml(event.html);
          setTab('preview');
          break;
        case 'turn_done': {
          const cost = event.costUsd !== undefined ? ` ($${event.costUsd.toFixed(4)})` : '';
          appendEntry({ kind: 'status', text: `Turn done${cost}.`, ms: event.ms });
          break;
        }
        case 'error':
          appendEntry({ kind: 'error', text: event.message });
          break;
      }
    },
    [appendEntry]
  );

  const runTurn = useCallback(
    async (turnPrompt: string, csv?: File | null, image?: File | null) => {
      setRunning(true);
      runningRef.current = true;
      unsavedTurnRef.current = true;
      try {
        const csvText = csv ? await csv.text() : undefined;
        const imageAttachment = image ? await encodeImageAttachment(image) : undefined;
        const turn = streamChatTurn({
          prompt: turnPrompt,
          sessionId: sessionIdRef.current,
          csvText,
          csvName: csv?.name,
          model,
          mode: outputMode,
          image: imageAttachment,
        });
        for await (const event of turn) {
          handleEvent(event);
        }
      } catch (error) {
        appendEntry({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
      } finally {
        setRunning(false);
        runningRef.current = false;
      }
    },
    [model, outputMode, appendEntry, handleEvent]
  );

  const sendPrompt = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || running) return;
    setPrompt('');
    setPinnedToBottom(true);
    setHistoryOpen(false);
    runtimeFixAttemptsRef.current = 0;
    appendEntry({ kind: 'user', text: trimmed });
    const csv = csvFile;
    const image = imageFile;
    setCsvFile(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
    await runTurn(trimmed, csv, image);
  }, [prompt, running, csvFile, imageFile, appendEntry, runTurn]);

  /**
   * Feeds preview-reported errors back to the agent as extra fix turns, up to
   * MAX_RUNTIME_FIX_ATTEMPTS per user prompt (each render can surface new
   * errors). Past the cap — or with no session to resume — the errors stay
   * visible in Diagnostics and the loop stops.
   */
  const tryRuntimeFix = useCallback(() => {
    const messages = pendingRuntimeErrorsRef.current;
    if (!messages || runningRef.current) return;
    pendingRuntimeErrorsRef.current = null;
    if (!sessionIdRef.current) return;
    if (runtimeFixAttemptsRef.current >= MAX_RUNTIME_FIX_ATTEMPTS) {
      appendEntry({
        kind: 'error',
        text: `The chart still fails at render time after ${MAX_RUNTIME_FIX_ATTEMPTS} automatic fixes — see Diagnostics.`,
      });
      return;
    }
    runtimeFixAttemptsRef.current += 1;
    appendEntry({
      kind: 'status',
      text: `Chart failed at render time — sending the errors back to the agent (fix ${runtimeFixAttemptsRef.current}/${MAX_RUNTIME_FIX_ATTEMPTS}).`,
    });
    void runTurn(
      [
        'The build succeeded but the chart failed at render time with these errors:',
        ...messages.map((message) => `- ${message}`),
        'Fix the files with write_app_file. Check data.json and the skill documentation as needed.',
      ].join('\n')
    );
  }, [appendEntry, runTurn]);

  // Errors can arrive while a turn is still streaming (the preview event
  // precedes turn_done) — retry the pending fix once the turn settles.
  useEffect(() => {
    if (!running) tryRuntimeFix();
  }, [running, tryRuntimeFix]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const payload = event.data as {
        source?: string;
        type?: string;
        errors?: Array<{ code?: string; message?: string; suggestion?: string }>;
      } | null;
      if (!payload || payload.source !== 'graph-codegen' || payload.type !== 'runtime-errors') return;
      if (!Array.isArray(payload.errors) || payload.errors.length === 0) return;
      // One batch per rendered preview; later reports from the same document
      // (recompiles, repeat uncaught errors) are already represented.
      if (handledPreviewRef.current === previewNonceRef.current) return;
      handledPreviewRef.current = previewNonceRef.current;
      const messages = payload.errors.map((error) => {
        const heading = [error.code, error.message].filter(Boolean).join(': ');
        return error.suggestion ? `${heading}\n  Suggestion: ${error.suggestion}` : heading;
      });
      setDiagnostics((previous) => [...previous, { attempt: 0, ok: false, runtime: true, messages }]);
      unsavedTurnRef.current = true;
      pendingRuntimeErrorsRef.current = messages;
      tryRuntimeFix();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tryRuntimeFix]);

  // Drag & drop anywhere in the app stages files into the same slots as the
  // attach buttons: the first CSV fills the dataset slot, the first supported
  // image the image slot. dragenter/dragleave fire for every child crossed, so
  // a depth counter decides when the pointer actually left the window.
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setDragActive(false);
      const dropped = Array.from(event.dataTransfer.files);
      const csv = dropped.find(isCsvFile);
      const image = dropped.find((file) => IMAGE_TYPES.has(file.type));
      if (csv) setCsvFile(csv);
      if (image) setImageFile(image);
      if (!csv && !image && dropped.length > 0) {
        appendEntry({ kind: 'error', text: 'Unsupported file type — drop a .csv or an image (PNG/JPEG/WebP/GIF/SVG).' });
      }
    },
    [appendEntry]
  );

  const lastStatus = running ? entries.findLast((entry) => entry.kind === 'status')?.text : undefined;

  return (
    <div
      className="layout"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="drop-overlay">
          <div className="drop-overlay-card">Drop a CSV dataset or an image</div>
        </div>
      )}
      <section className="chat">
        <header className="chat-header">
          <span className="chat-title">graph-codegen</span>
          <div className="header-actions">
            <button className="header-button" onClick={startNewConversation} disabled={running}>
              + New
            </button>
            <button
              className={historyOpen ? 'header-button header-button-active' : 'header-button'}
              onClick={() => setHistoryOpen((open) => !open)}
            >
              History
            </button>
          </div>
        </header>
        {historyOpen && (
          <div className="history">
            {conversations.length === 0 && <div className="history-empty">No saved conversations yet.</div>}
            {conversations.map((conversation) => (
              <div key={conversation.id} className="history-item">
                <button className="history-text" onClick={() => void openConversation(conversation.id)}>
                  <div className="history-title">{conversation.title}</div>
                  <div className="history-meta">
                    {formatTimestamp(conversation.updatedAt)} · {conversation.model.replace('claude-', '')}
                  </div>
                </button>
                <button
                  className="history-delete"
                  title="Delete conversation"
                  onClick={() => void removeConversation(conversation.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="messages-wrap">
          <div className="messages" ref={messagesRef} onScroll={handleMessagesScroll}>
            {entries.map((entry, index) => (
              <div key={index} className={`message message-${entry.kind}`}>
                {entry.text}
                {entry.ms !== undefined && <span className="duration"> · {formatDuration(entry.ms)}</span>}
              </div>
            ))}
            {running && (
              <div className="working">
                <span className="working-bars">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span className="working-label">{lastStatus ?? 'Thinking…'}</span>
              </div>
            )}
          </div>
          {!pinnedToBottom && (
            <button className="scroll-bottom" onClick={scrollToBottom} title="Scroll to bottom">
              ↓ Latest
            </button>
          )}
        </div>
        <div className="composer">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendPrompt();
              }
            }}
            placeholder="Describe the chart you want…"
            rows={3}
          />
          <div className="composer-row">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className={csvFile ? 'attach attach-filled' : 'attach'}
              onClick={() => {
                if (csvFile) {
                  setCsvFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                } else {
                  fileInputRef.current?.click();
                }
              }}
              title={csvFile ? 'Click to remove' : 'Attach a CSV dataset'}
            >
              {csvFile ? csvFile.name : 'CSV'}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              hidden
              onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className={imageFile ? 'attach attach-filled' : 'attach'}
              onClick={() => {
                if (imageFile) {
                  setImageFile(null);
                  if (imageInputRef.current) imageInputRef.current.value = '';
                } else {
                  imageInputRef.current?.click();
                }
              }}
              title={imageFile ? 'Click to remove' : 'Attach an image (e.g. a style reference)'}
            >
              {imageFile ? imageFile.name : 'Image'}
            </button>
            <select value={model} onChange={(event) => selectModel(event.target.value as AvailableModel)}>
              {AVAILABLE_MODELS.map((name) => (
                <option key={name} value={name}>
                  {name.replace('claude-', '')}
                </option>
              ))}
            </select>
            {/* The server fixes the mode when the session is created; switching
                mid-conversation would silently do nothing, so disable it. */}
            <select
              value={outputMode}
              onChange={(event) => selectOutputMode(event.target.value as OutputMode)}
              disabled={entries.length > 0}
              title="Code format the agent writes (fixed once a conversation starts)"
            >
              <option value="tsx">TSX</option>
              <option value="js">JS</option>
            </select>
            <button className="send" onClick={() => void sendPrompt()} disabled={running || prompt.trim().length === 0}>
              {running ? <span className="send-spinner" /> : 'Send'}
            </button>
          </div>
        </div>
      </section>
      <section className="output">
        <nav className="tabs">
          {['preview', ...Object.keys(files)].map((name) => (
            <button key={name} className={tab === name ? 'tab active' : 'tab'} onClick={() => setTab(name)}>
              {FIXED_TAB_LABELS[name] ?? name}
            </button>
          ))}
        </nav>
        {tab === 'preview' &&
          (html ? (
            <iframe className="preview" title="Generated chart" sandbox="allow-scripts" srcDoc={html} />
          ) : (
            <div className="placeholder">No preview yet.</div>
          ))}
        {tab in files && (
          <div className="files">
            <pre>{files[tab]}</pre>
          </div>
        )}
      </section>
    </div>
  );
}
