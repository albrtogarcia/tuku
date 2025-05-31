# GitHub Copilot Instructions for Tuku

## 🧠 Context

**Tuku** is a cross-platform desktop application built with **Electron** and **React**, designed to play and manage local audio files. It scans a folder from the file system, extracts metadata using `music-metadata`, and stores structured information in a local **SQLite** database (via `better-sqlite3`). Playback is handled with the **Howler.js** library.

The application must run smoothly on **macOS, Linux, and Windows**.

## 🔧 Tech Stack

- **Frontend**: React (with TypeScript), no frontend framework (e.g. no Tailwind/MUI). Uses **Sass** for styling.
- **Desktop Runtime**: Electron
- **Bundler/Dev Server**: Vite
- **State Management**: Zustand
- **Database**: better-sqlite3 (SQLite)
- **Audio Playback**: Howler.js
- **Drag & Drop**: react-beautiful-dnd
- **Testing**: Jest + Testing Library
- **Formatting**: Prettier
- **Linting**: ESLint

## 🎨 Code Style & Formatting

Copilot should follow these code conventions:

- Use **arrow functions** by default.
- Use **TypeScript** syntax.
- Prefer **async/await** over `.then()` for promises.
- Follow **Prettier** formatting rules (do not override them).
- Use **single quotes** for strings unless Prettier enforces otherwise.
- Include **type annotations** for props, state, and function arguments where possible.
- Use **modular, composable components**.
- Avoid writing platform-specific code unless explicitly required.
- Avoid inline styles; use Sass for styling.
- Use functional React components — avoid class components.
- **All code comments, variable and classes names, etc., must be written in English.**

## ⚠️ Electron-Specific Considerations

- Keep `nodeIntegration: false` and `contextIsolation: true` in `BrowserWindow` settings.
- Use a `preload.js` file to expose safe, limited APIs via `contextBridge`.
- Never access Node.js APIs directly in React components.
- Use IPC (`ipcMain`, `ipcRenderer`) to communicate between the renderer and main processes.

**Example of safe usage:**

```ts
// preload.js
contextBridge.exposeInMainWorld('electronAPI', {
	getTracks: () => ipcRenderer.invoke('get-tracks'),
})
```

```ts
// React component
window.electronAPI.getTracks().then((tracks) => {
	// ...
})
```

## ✅ Good Practices Encouraged

- Encapsulate database logic in reusable modules.
- Write pure functions where possible.
- Use Zustand for app state (avoid React Context for global state).
- Use declarative rendering (`.map()` instead of loops).
- Use idiomatic React hooks (`useEffect`, `useMemo`, etc.).

## ❌ Avoid

- Mixing Node.js APIs directly in React.
- Using localStorage (prefer SQLite or other persistent stores).
- Including APIs not supported by Electron or cross-platform.
- Overcomplicating logic — prioritize clarity.

## 🧪 Testing

- Use **Jest** and **@testing-library/react**.
- Use `describe` and `it/test` blocks with meaningful names.
- Use mocks for database and file system access.

## 🤖 Instructions for Copilot

- Even in **Agent** or **Edit** mode, **do not make edits unless explicitly requested**.
- Always **respond to the user's question first**, offer alternatives if relevant, and **wait for confirmation** before performing edits.
- **Switching modes interrupts the workflow.** If the user asks a question, **they expect only a reply**.
- When the user gives **imperative commands**, perform the task. Otherwise, wait for approval.
- If you're missing context or information to proceed, **ask as many clarification questions as needed**.
- If a task is **too large or complex**, suggest breaking it into smaller subtasks.
- The user may make mistakes — **point them out as early as possible**.
