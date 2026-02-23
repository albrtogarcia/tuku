# CLAUDE.md - Tuku Project Guidelines

## Project Overview

Tuku is a cross-platform desktop music player for local audio files, built with Electron + React. It scans local folders, extracts metadata, stores data in SQLite, and plays audio via HTML `<audio>` elements with Blob URLs.

## Tech Stack

- **Runtime**: Electron 35 (main process) + React 19 (renderer)
- **Language**: TypeScript 5.8 (strict mode)
- **Build**: Vite 6 (renderer) + tsc (main, CommonJS output)
- **Package manager**: Yarn 1.x
- **State**: Zustand 5 (two stores: `usePlayerStore`, `useSettingsStore`)
- **Database**: better-sqlite3 (SQLite, accessed only from main process via IPC)
- **Styling**: SCSS (7-1 architecture, BEM naming), no Tailwind/CSS-in-JS
- **Icons**: @phosphor-icons/react
- **Virtualization**: react-virtuoso (for album grid and songs table)
- **Testing**: Vitest 3 + @testing-library/react + jsdom
- **Drag & Drop**: @dnd-kit

## Commands

```bash
yarn dev              # Start dev mode (Vite + tsc --watch + Electron)
yarn build            # Build all (renderer + main + electron-builder)
yarn test             # Run tests in watch mode
yarn test:run         # Run tests once
yarn lint             # ESLint
yarn type-check       # tsc --noEmit
```

## Project Structure

```
src/
  main/               # Electron main process
    index.ts           # Window creation, IPC handlers, SQLite, media:// protocol
    utils/             # Main process utilities (coverUtils.ts)
  preload.ts           # contextBridge API (renderer <-> main)
  renderer/            # React application
    App.tsx            # Root component (no routing, single-page)
    main.tsx           # React entry point
    utils.ts           # Shared utility functions
    components/        # UI components (folder-per-component pattern)
    hooks/             # Custom hooks (useAudioPlayer, useSongs, useDebounce)
    store/             # Zustand stores (player.ts, settings.ts)
    styles/            # Global SCSS (abstracts, base, components, templates)
    fonts/             # VictorMono font files
  types/               # Shared TypeScript types (Song, Album, global.d.ts)
```

## Workflow Rules

- **Never make edits without presenting a plan first.** Always explain what will change and in which files, then wait for explicit user approval before touching any file.
- **CSS/SCSS**: Never add or modify unless explicitly asked. Show proposed styles first, wait for approval. Always try to reuse existing classes before considering new ones.

## Code Patterns

### Components
- One folder per component: `components/Name/Name.tsx` + `_name.scss` + `Name.test.tsx`
- Functional components only, arrow functions, default export
- Props defined with `interface NameProps { ... }` above the component
- SCSS imported directly in the component file

### Styling
- BEM-like class names: `.container__player`, `.queue__item`, `.album-card__cover`
- Theming via CSS custom properties and `[data-theme='dark']` selector
- No inline styles; all styling in SCSS files
- Global styles use `@use` imports (not `@import`)
- **Never add or modify CSS/SCSS unless explicitly asked.** Always reuse existing classes. If a new class is strictly needed, show the proposed CSS to the user first and wait for approval before writing it.
- BEM modifiers (`--`) are for states only (e.g. `playing`, `played`, `failed`). Never use content categories as modifiers (e.g. `--history` is wrong).

### State Management
- Zustand stores accessed directly in components (no Context providers)
- `usePlayerStore` - queue, playback state, persistence to SQLite via IPC
- `useSettingsStore` - theme, volume; uses Zustand `persist` middleware (localStorage)
- Use `usePlayerStore.getState()` in callbacks to avoid stale closures

### Electron Architecture
- `contextIsolation: true`, `nodeIntegration: false`
- All main<->renderer communication via IPC (`ipcMain.handle` / `ipcRenderer.invoke`)
- Preload exposes typed API on `window.electronAPI` (see `src/types/global.d.ts`)
- Never access Node.js APIs directly in renderer code
- Custom `media://` protocol for serving local cover images

### Performance
- `React.memo()` on expensive components
- `useMemo` for filtering/grouping operations
- `useCallback` for handlers passed as props
- `react-virtuoso` for large lists (albums grid, songs table)

### Testing
- Vitest globals enabled (no need to import `describe`, `it`, `expect`)
- Tests co-located with components
- Mock Zustand stores with `vi.mock('../../store/player', ...)`
- Mock Electron API: `vi.fn()` for `window.electronAPI` methods
- Structure: `describe` blocks by concern (Rendering, Interactions, Edge Cases, Accessibility)

## Code Style

- **Formatting**: Prettier — tabs, no semicolons, single quotes, trailing commas, 160 char width
- **Functions**: Arrow functions by default
- **Async**: `async/await` over `.then()`
- **Imports**: Path alias `@/*` maps to `src/renderer/*`
- **Language**: All code, comments, and variable names in English
- **Types**: Use `type` for object shapes, `interface` for component props and store state
- **No class components**; functional only
