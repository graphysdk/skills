# Skill demo: HTML

Use this when the request names no data and no chart type, such as "create a chart". This demo offers three examples built with illustrative data—a mountain route profile, a coffee tasting radar, and a critics-versus-audience slope chart, a theme switcher, and Edit, Annotate, and Read only modes. It includes contextual hints and Undo/Redo in both editing modes. When the user supplies data or a chart type, build what they asked for and skip this.

Edits are retained separately for each chart. Mode and color-scheme changes preserve undo history; chart and theme changes retain edits but start a new history because they remount the provider. State lasts while the page is open.

## HTML page

A complete page with no bundler. The import map points `@graphysdk/react` at the editable CDN bundle, which carries the read-only surface too, and adds one entry per theme. Each example has its own dataset and authored spec. Replace the sample rows and their labels with data that fits the user's domain. The page follows the system color scheme.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Explore Graphy</title>
    <!-- The theme fonts, linked from Google Fonts directly: each theme's fonts.css is one such import, and artifact sandboxes allow stylesheets from Google Fonts only. -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Bangers&family=Caveat:wght@400..700&family=Comic+Neue:wght@400;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=IBM+Plex+Mono:wght@400;500;600&family=Kalam:wght@300;400;700&family=VT323&display=swap"
    />
    <style>
      body {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="importmap">
      {
        "imports": {
          "react": "https://cdn.jsdelivr.net/npm/react@19.2.0/+esm",
          "react/jsx-runtime": "https://cdn.jsdelivr.net/npm/react@19.2.0/jsx-runtime/+esm",
          "react-dom": "https://cdn.jsdelivr.net/npm/react-dom@19.2.0/+esm",
          "react-dom/client": "https://cdn.jsdelivr.net/npm/react-dom@19.2.0/client/+esm",
          "@graphysdk/react": "https://cdn.jsdelivr.net/npm/@graphysdk/react@1.9.0-beta.1793272487821/dist/editable.browser.mjs",
          "@graphysdk/theme-blueprint": "https://cdn.jsdelivr.net/npm/@graphysdk/theme-blueprint@latest/dist/index.mjs",
          "@graphysdk/theme-botanical": "https://cdn.jsdelivr.net/npm/@graphysdk/theme-botanical@latest/dist/index.mjs",
          "@graphysdk/theme-comic": "https://cdn.jsdelivr.net/npm/@graphysdk/theme-comic@latest/dist/index.mjs",
          "@graphysdk/theme-phosphor": "https://cdn.jsdelivr.net/npm/@graphysdk/theme-phosphor@latest/dist/index.mjs",
          "@graphysdk/theme-spreadsheet": "https://cdn.jsdelivr.net/npm/@graphysdk/theme-spreadsheet@latest/dist/index.mjs",
          "@graphysdk/theme-watercolor": "https://cdn.jsdelivr.net/npm/@graphysdk/theme-watercolor@latest/dist/index.mjs"
        }
      }
    </script>
    <script type="module">
      import { createElement as h } from 'react';
      import { createRoot } from 'react-dom/client';
      import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
      import {
        config,
        coord,
        createSpec,
        geom,
        GraphProvider,
        pipe,
        scale,
        style,
        styles,
        token,
        transform,
        useGraphHistory,
        useGraphHistoryShortcuts,
      } from '@graphysdk/react';
      import { EditableGraphRenderer } from '@graphysdk/react';
      import { blueprint } from '@graphysdk/theme-blueprint';
      import { botanical } from '@graphysdk/theme-botanical';
      import { comic } from '@graphysdk/theme-comic';
      import { phosphor } from '@graphysdk/theme-phosphor';
      import { spreadsheet } from '@graphysdk/theme-spreadsheet';
      import { watercolor } from '@graphysdk/theme-watercolor';
      const MODES = [
        { value: 'edit', label: 'Edit', icon: 'M5 3l14 8-6 2-3 6z', isFilled: true },
        { value: 'annotate', label: 'Annotate', icon: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5' },
        {
          value: 'readonly',
          label: 'Read only',
          icon: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z',
        },
      ];
      const EXAMPLES = [
        { value: 'trail', label: 'The climb', icon: 'm2 20 7-12 4 6 3-10 6 16zM7 11l2 3 2-2M15 8l2 3 1-2' },
        {
          value: 'coffee',
          label: 'Coffee',
          icon: 'M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 9h2a3 3 0 1 1 0 6h-2M7 2v3M12 2v3',
        },
        { value: 'cinema', label: 'Cinema', icon: 'M3 4h18v16H3zM7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4' },
      ];
      // Omitting the theme uses the SDK’s built-in default.
      const THEMES = [
        { value: 'default', label: 'Default' },
        { value: 'blueprint', label: 'Blueprint', theme: blueprint },
        { value: 'botanical', label: 'Botanical', theme: botanical },
        { value: 'comic', label: 'Comic', theme: comic },
        { value: 'phosphor', label: 'Phosphor', theme: phosphor },
        { value: 'spreadsheet', label: 'Spreadsheet', theme: spreadsheet },
        { value: 'watercolor', label: 'Watercolor', theme: watercolor },
      ];
      const UNDO_PATH = 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3';
      const REDO_PATH = 'm15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3';
      const SETTINGS_PATH = 'M3 6h18M3 12h18M3 18h18M14 3v6M8 9v6M16 15v6';
      const LINKS = [
        { label: 'Docs', href: 'https://docs.graphy.dev/sdk-next/quickstart?utm_source=graphy-demo&utm_medium=embed' },
        { label: 'Website', href: 'https://graphy.dev/?utm_source=graphy-demo&utm_medium=embed' },
        { label: 'Discord', href: 'https://discord.com/invite/yGmYCjkSr?utm_source=graphy-demo&utm_medium=embed' },
        { label: 'hello@graphy.dev', href: 'mailto:hello@graphy.dev' },
      ];
      // Invented routes, tasting scores, and film ratings: each example explores a different visual form.
      const ELEVATIONS = [
        520, 560, 630, 710, 680, 790, 920, 1060, 1150, 1090, 1260, 1450, 1630, 1790, 1730, 1580, 1490, 1580, 1710, 1890,
        2030, 2170, 2110, 2290, 2410, 2340, 2160, 2050, 1870, 1740, 1690, 1510, 1340, 1190, 1040, 980, 1090, 1170, 1050,
        890, 760, 690, 610, 560, 520,
      ];
      const WAYPOINTS = { 13: 'Ridge', 24: '2,410 m', 35: 'Lake' };
      const trailData = {
        columns: [
          { key: 'distance', label: 'Distance (km)' },
          { key: 'elevation', label: 'Elevation (m)' },
          { key: 'landmark', valueFormat: { type: 'text' } },
          { key: 'isWaypoint' },
        ],
        rows: ELEVATIONS.map((elevation, index) => ({
          distance: index / 2,
          elevation,
          landmark: WAYPOINTS[index] ?? '',
          isWaypoint: WAYPOINTS[index] ? 1 : 0,
        })),
      };
      const TASTING_AXES = ['Floral', 'Fruit', 'Acidity', 'Sweetness', 'Body', 'Roast'];
      const ROASTS = [
        { roast: 'Light', scores: [9, 8, 9, 6, 3, 2] },
        { roast: 'Medium', scores: [5, 6, 5, 9, 7, 5] },
        { roast: 'Dark', scores: [2, 3, 2, 5, 9, 10] },
      ];
      const coffeeData = {
        columns: [{ key: 'note' }, { key: 'roast' }, { key: 'score' }],
        rows: ROASTS.flatMap(({ roast, scores }) =>
          TASTING_AXES.map((note, index) => ({ roast, note, score: scores[index] ?? 0 }))
        ),
      };
      const FILMS = [
        { film: 'Art house', critics: 94, audience: 54 },
        { film: 'Thriller', critics: 78, audience: 82 },
        { film: 'Comedy', critics: 62, audience: 70 },
        { film: 'Blockbuster', critics: 46, audience: 94 },
      ];
      const cinemaData = {
        columns: [{ key: 'reviewer' }, { key: 'film' }, { key: 'score' }],
        rows: FILMS.flatMap(({ film, critics, audience }) => [
          { film, reviewer: 'Critics', score: critics },
          { film, reviewer: 'Audience', score: audience },
        ]),
      };
      const EXAMPLE_DATA = { trail: trailData, coffee: coffeeData, cinema: cinemaData };
      // Example-level typography; colors and typefaces still come from the selected theme.
      const exampleHeadings = styles({
        defaults: [
          style.heading.h1({
            fontSize: 28,
            fontWeight: 750,
            letterSpacing: -0.6,
            lineHeight: 1.15,
            textColor: token('textPrimary'),
          }),
          style.heading.h2({ fontSize: 13, fontWeight: 400, lineHeight: 1.5, textColor: token('textSecondary') }),
        ],
      });
      const createExampleSpecs = () => ({
        trail: pipe(
          createSpec({ x: 'distance', y: 'elevation' }),
          exampleHeadings,
          geom.line({ id: 'terrain' }),
          geom.point({
            transforms: [transform.filter({ variableName: 'isWaypoint', operator: 'eq', value: 1 })],
            aes: { label: 'landmark' },
            dataLabels: { showDataLabels: true, position: 'outside', offset: 12 },
            tooltip: { label: { heading: true } },
          }),
          scale.x.continuous({ domainMin: 0, domainMax: 22, nice: false }),
          scale.y({ domainMin: 0, domainMax: 2900, nice: false }),
          config({
            content: {
              title: 'The view is earned.',
              subtitle: 'A 22 km ridge loop, from trailhead to summit and back · Illustrative route',
            },
            legend: { position: 'none' },
            axes: { y: { position: 'left', ticks: { visible: true } } },
            numberFormat: { abbreviation: 'none', decimals: 0 },
          })
        ),
        coffee: pipe(
          createSpec({ x: 'note', y: 'score', color: 'roast' }),
          exampleHeadings,
          geom.area({ position: 'identity' }),
          coord.polar({ theta: 'x' }),
          scale.x.discrete({ domain: TASTING_AXES }),
          scale.y({ domainMin: 0, domainMax: 10, nice: false }),
          scale.color.discrete(),
          config({
            content: {
              title: 'A matter of roast.',
              subtitle: 'Flavor intensity, 0–10 · Illustrative tasting scores',
            },
            legend: { position: 'bottom' },
            axes: { x: { grid: { visible: true } }, y: { grid: { visible: true } } },
            numberFormat: { decimals: 0 },
          })
        ),
        cinema: pipe(
          createSpec({ x: 'reviewer', y: 'score', color: 'film' }),
          exampleHeadings,
          geom.line(),
          geom.point({ dataLabels: { showDataLabels: true, position: 'outside', offset: 9 } }),
          scale.x.discrete({ domain: ['Critics', 'Audience'] }),
          scale.y({ domainMin: 30, domainMax: 105, nice: false }),
          scale.color.discrete(),
          config({
            content: {
              title: 'The audience has other ideas.',
              subtitle: 'Critic and audience scores for four fictional releases · Out of 100',
            },
            legend: { position: 'top' },
            axes: { y: { visible: false } },
            numberFormat: { decimals: 0 },
          })
        ),
      });
      // Scoped styles keep the standalone component independent of a host's reset or color scheme.
      const showcaseCss = `
  .graphy-showcase {
    --background: #fafafa;
    --card: #ffffff;
    --border: #d4d4d4;
    --text: #171717;
    --muted: #626262;
    --focus: #2563eb;
    --control-surface: #f4f4f5;
    --selected-surface: #ededf0;
    --footer: #c9c9c9;
    color-scheme: light;
    min-height: 100vh;
    padding: 24px;
    background: var(--background);
    color: var(--text);
    font-family: Geist, Inter, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .graphy-showcase[data-color-scheme='dark'] {
    --background: #15171b;
    --card: #1e2025;
    --border: #494c54;
    --text: #ebecef;
    --muted: #b5b8c0;
    --focus: #93c5fd;
    --control-surface: #272a30;
    --selected-surface: #343841;
    --footer: #41444c;
    color-scheme: dark;
  }
  .graphy-showcase, .graphy-showcase * { box-sizing: border-box; }
  .graphy-showcase .content { max-width: 960px; margin: 0 auto; }
  .graphy-showcase .controls { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 48px; }
  .graphy-showcase :is(.options, .pill) {
    display: flex; align-items: center; padding: 4px;
    border: 1px solid transparent; border-radius: 16px; background: var(--card);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.045), 0 1px 2px rgba(0, 0, 0, 0.06);
  }
  .graphy-showcase .options-chips { flex: 0 0 auto; max-width: 100%; }
  .graphy-showcase :is(.options, .pill) button {
    appearance: none; display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; min-height: 36px; margin: 0; padding: 7px 11px; font: inherit;
    font-size: 13px; font-weight: 500; letter-spacing: -0.01em; line-height: 1.2;
    border: 1px solid transparent; border-radius: 11px;
    color: var(--muted); background: transparent; cursor: pointer;
    transition: background 140ms, color 140ms, border-color 140ms;
  }
  .graphy-showcase .option-list { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; min-width: 0; }
  .graphy-showcase :is(.options, .pill) button:enabled:hover {
    color: var(--text); background: var(--control-surface);
  }
  .graphy-showcase :is(.options, .pill) button[aria-pressed='true'] {
    color: var(--text); background: var(--selected-surface);
    border-color: color-mix(in srgb, var(--border) 45%, transparent);
  }
  .graphy-showcase .options-swatches { flex: 1 1 400px; max-width: 400px; min-width: 0; }
  .graphy-showcase .options-swatches .option-list {
    flex-wrap: nowrap; width: 100%; overflow-x: auto; padding: 0;
    scrollbar-width: none; overscroll-behavior-x: contain;
    scroll-snap-type: x proximity; scroll-padding-inline: 28px;
    -webkit-mask-image: linear-gradient(to right, transparent, #000 var(--fade-left, 0px), #000 calc(100% - var(--fade-right, 0px)), transparent);
    mask-image: linear-gradient(to right, transparent, #000 var(--fade-left, 0px), #000 calc(100% - var(--fade-right, 0px)), transparent);
  }
  .graphy-showcase .options-swatches .option-list::-webkit-scrollbar { display: none; }
  .graphy-showcase .options-swatches[data-overflow-left='true'] { --fade-left: 36px; }
  .graphy-showcase .options-swatches[data-overflow-right='true'] { --fade-right: 36px; }
  .graphy-showcase .options-swatches button {
    flex: 0 0 auto; scroll-snap-align: start; white-space: nowrap;
  }
  .graphy-showcase .swatches { display: inline-flex; gap: 2px; }
  .graphy-showcase .swatches span { width: 5px; height: 16px; border-radius: 2px; }
  .graphy-showcase .swatches span:nth-child(2) { transform: translateY(-2px); }
  .graphy-showcase[data-color-scheme='dark'] :is(.options, .pill) { border-color: var(--border); box-shadow: none; }
  .graphy-showcase button:focus-visible, .graphy-showcase a:focus-visible {
    outline: 2px solid var(--focus); outline-offset: -2px;
  }
  .graphy-showcase .card { position: relative; margin-top: 36px; }
  .graphy-showcase .pill {
    position: absolute; top: -24px; left: 50%; transform: translateX(-50%); z-index: 10;
    gap: 4px; white-space: nowrap;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  .graphy-showcase :is(.mode-buttons, .history-actions) {
    display: flex; align-items: center; gap: 2px;
  }
  .graphy-showcase .history-actions { border-left: 1px solid var(--border); padding-left: 4px; }
  .graphy-showcase .pill .action { width: 36px; padding: 0; color: var(--text); }
  .graphy-showcase .pill button:disabled { opacity: 0.35; cursor: default; }
  .graphy-showcase .graph { height: 480px; }
  .graphy-showcase .hint {
    margin: 12px 0 0; color: var(--muted); text-align: center; font-size: 13px; line-height: 1.5;
  }
  .graphy-showcase .links {
    display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 16px;
    margin-top: 12px; font-size: 11px; color: var(--footer);
  }
  .graphy-showcase .links a { color: inherit; text-decoration: none; padding: 6px 0; }
  .graphy-showcase .links a:hover, .graphy-showcase .links a:focus-visible { color: var(--muted); }
  @media (max-width: 600px) {
    .graphy-showcase { padding: 16px; }
    .graphy-showcase .controls { flex-direction: column; align-items: flex-start; gap: 12px; }
    .graphy-showcase .options-swatches { flex: none; width: 100%; max-width: none; }
    .graphy-showcase :is(.options, .pill) button { min-height: 44px; }
    .graphy-showcase .pill .action { width: 44px; }
    .graphy-showcase .card { margin-top: 16px; }
    .graphy-showcase .pill {
      position: relative; top: auto; left: auto; transform: none;
      width: fit-content; max-width: 100%; margin: 0 auto 12px; flex-wrap: wrap; justify-content: center;
    }
    .graphy-showcase :is(.mode-buttons, .history-actions) { flex-wrap: wrap; justify-content: center; }
    .graphy-showcase .history-actions { border-left: 0; padding-left: 0; }
    .graphy-showcase .graph { height: 400px; }
    .graphy-showcase .hint { min-height: 3em; display: grid; place-items: center; }
  }
`;
      const HINTS = {
        edit: 'Click something in the chart to make it your own.',
        annotate: 'Hover over the chart and use (+) to add a note.',
        readonly: 'Hover over the chart to explore the numbers.',
      };
      const subscribeToColorScheme = (onChange) => {
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
      };
      const getColorScheme = () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const getServerColorScheme = () => 'light';
      const Icon = ({ path, isFilled = false }) =>
        h(
          'svg',
          {
            width: '15',
            height: '15',
            viewBox: '0 0 24 24',
            fill: isFilled ? 'currentColor' : 'none',
            stroke: 'currentColor',
            strokeWidth: '1.8',
            style: { display: 'block', flexShrink: 0 },
            'aria-hidden': 'true',
          },
          h('path', { d: path, strokeLinecap: 'round', strokeLinejoin: 'round' })
        );
      const OptionRow = ({ label, appearance, options, value, onChange }) => {
        const listRef = useRef(null);
        const [overflow, setOverflow] = useState({ left: false, right: false });
        useEffect(() => {
          const list = listRef.current;
          if (appearance !== 'swatches' || !list) return;
          const isRtl = getComputedStyle(list).direction === 'rtl';
          const updateOverflow = () => {
            const offset = Math.abs(list.scrollLeft);
            const hasBefore = offset > 1;
            const hasAfter = offset < list.scrollWidth - list.clientWidth - 1;
            const left = isRtl ? hasAfter : hasBefore;
            const right = isRtl ? hasBefore : hasAfter;
            setOverflow((current) => (current.left === left && current.right === right ? current : { left, right }));
          };
          // Touch and trackpads scroll natively; a vertical mouse wheel also browses the strip.
          // At either end, let the wheel continue scrolling the page.
          const onWheel = (event) => {
            if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
            const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? list.clientWidth : 1;
            const offset = Math.abs(list.scrollLeft);
            const next = Math.max(0, Math.min(list.scrollWidth - list.clientWidth, offset + event.deltaY * unit));
            if (Math.abs(next - offset) < 1) return;
            event.preventDefault();
            list.scrollLeft = isRtl ? -next : next;
          };
          const observer = new ResizeObserver(updateOverflow);
          observer.observe(list);
          for (const child of list.children) observer.observe(child);
          list.addEventListener('scroll', updateOverflow, { passive: true });
          list.addEventListener('wheel', onWheel, { passive: false });
          updateOverflow();
          return () => {
            observer.disconnect();
            list.removeEventListener('scroll', updateOverflow);
            list.removeEventListener('wheel', onWheel);
          };
        }, [appearance]);
        return h(
          'div',
          {
            role: 'group',
            'aria-label': label,
            className: `options options-${appearance}`,
            'data-overflow-left': overflow.left,
            'data-overflow-right': overflow.right,
          },
          h(
            'div',
            { className: 'option-list', ref: listRef },
            options.map((option) =>
              h(
                'button',
                {
                  key: option.value,
                  type: 'button',
                  'aria-pressed': option.value === value,
                  onClick: () => onChange(option.value),
                  onFocus: (event) => {
                    if (appearance === 'swatches')
                      event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                  },
                },
                option.icon && h(Icon, { path: option.icon }),
                appearance === 'swatches' &&
                  h(
                    'span',
                    { className: 'swatches', 'aria-hidden': 'true' },
                    (option.theme?.palettes?.categorical ?? ['#B84737', '#BA7420', '#0B8666'])
                      .slice(0, 3)
                      .map((color, index) => h('span', { key: index, style: { background: color } }))
                  ),
                option.label
              )
            )
          )
        );
      };
      // Lives inside the provider: the history hook reads the chart's command stack.
      const ChartPill = ({ mode, onModeChange, handleRef }) => {
        const { canUndo, canRedo, undo, redo } = useGraphHistory();
        return h(
          'div',
          { className: 'pill' },
          h(
            'div',
            { className: 'mode-buttons', role: 'group', 'aria-label': 'Chart mode' },
            MODES.map((entry) =>
              h(
                'button',
                {
                  key: entry.value,
                  type: 'button',
                  'aria-pressed': entry.value === mode,
                  onClick: () => onModeChange(entry.value),
                },
                h(Icon, { path: entry.icon, isFilled: entry.isFilled }),
                entry.label
              )
            )
          ),
          mode !== 'readonly' &&
            h(
              'div',
              { className: 'history-actions', role: 'group', 'aria-label': 'Chart actions' },
              [
                { label: 'Undo', icon: UNDO_PATH, disabled: !canUndo, onClick: () => undo() },
                { label: 'Redo', icon: REDO_PATH, disabled: !canRedo, onClick: () => redo() },
                {
                  label: 'Chart settings',
                  icon: SETTINGS_PATH,
                  hidden: mode !== 'edit',
                  onClick: () => handleRef.current?.setSelection([{ kind: 'graph' }]),
                },
              ]
                .filter(({ hidden }) => !hidden)
                .map(({ label, icon, disabled, onClick }) =>
                  h(
                    'button',
                    {
                      key: label,
                      type: 'button',
                      'aria-label': label,
                      title: label,
                      className: 'action',
                      disabled: disabled,
                      onClick: onClick,
                    },
                    h(Icon, { path: icon })
                  )
                )
            )
        );
      };
      export const Showcase = ({ colorScheme: preferredScheme } = {}) => {
        const [example, setExample] = useState('trail');
        const [themeName, setThemeName] = useState('default');
        const [mode, setMode] = useState('edit');
        // Stable authored specs preserve edits across mode changes and provider remounts.
        const [specs, setSpecs] = useState(createExampleSpecs);
        const handleRef = useRef(null);
        const containerRef = useRef(null);
        const hintId = useId();
        const systemScheme = useSyncExternalStore(subscribeToColorScheme, getColorScheme, getServerColorScheme);
        const colorScheme = preferredScheme ?? systemScheme;
        useGraphHistoryShortcuts(handleRef, { target: containerRef, enabled: mode !== 'readonly' });
        const theme = THEMES.find((entry) => entry.value === themeName)?.theme;
        const data = EXAMPLE_DATA[example];
        const saveSpec = (next) =>
          setSpecs((current) => (current[example] === next ? current : { ...current, [example]: next }));
        // Finish a pending gesture before changing or remounting the editing surface.
        const commitEdits = () => handleRef.current?.commands.commit();
        return h(
          'div',
          { className: 'graphy-showcase', 'data-color-scheme': colorScheme, ref: containerRef },
          h('style', null, showcaseCss),
          h(
            'div',
            { className: 'content' },
            h(
              'div',
              { className: 'controls' },
              h(OptionRow, {
                label: 'Example chart',
                appearance: 'chips',
                options: EXAMPLES,
                value: example,
                onChange: (next) => {
                  commitEdits();
                  setExample(next);
                },
              }),
              h(OptionRow, {
                label: 'Theme',
                appearance: 'swatches',
                options: THEMES,
                value: themeName,
                onChange: (next) => {
                  commitEdits();
                  setThemeName(next);
                },
              })
            ),
            h(
              'div',
              { className: 'card' },
              h(
                GraphProvider,
                {
                  key: `${themeName}:${example}`,
                  data: data,
                  spec: specs[example],
                  theme: theme,
                  handleRef: handleRef,
                  colorScheme: colorScheme,
                  onSpecChange: saveSpec,
                },
                h(ChartPill, {
                  mode: mode,
                  onModeChange: (next) => {
                    commitEdits();
                    setMode(next);
                  },
                  handleRef: handleRef,
                }),
                h('div', { className: 'graph', 'aria-describedby': hintId }, h(EditableGraphRenderer, { mode: mode }))
              )
            ),
            h('p', { className: 'hint', id: hintId, role: 'status' }, HINTS[mode]),
            h(
              'footer',
              { className: 'links' },
              LINKS.map((link) => h('a', { key: link.href, href: link.href }, link.label))
            )
          )
        );
      };
      createRoot(document.getElementById('app')).render(h(Showcase));
    </script>
  </body>
</html>
```

## What to tell the user

Keep the reply short, after the chart.

- Edit: click something in the chart to make it your own. Annotate: hover over the chart and look for the `(+)` menu. Undo/Redo work in both editing modes with the toolbar or the usual shortcut while focus is in the demo.
- Switching chart or theme keeps edits but starts a new undo history. The button group switches between three complete examples; the scrolling theme strip changes their look.
- Include a brief invitation to go beyond the demo, for example: "This is just a starting point—ask for something highly custom, from a chart in your brand's style to an interactive dashboard built around your data." Adapt the examples to the user's context; don't imply they are limited to the three charts or preset themes.
- Docs at [docs.graphy.dev](https://docs.graphy.dev). Commercial use goes through the contact form at [graphy.dev/license](https://graphy.dev/license).
