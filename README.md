# 🎶 Tuku (provisional name)

**Tuku** is a desktop music player designed to play and organize local audio files from your own file system. It's cross-platform (Windows, macOS, and Linux), and built with **Electron + React**.

---

## 🚀 Project Status

> 🛠 In development - MVP under construction

Check the [Development Roadmap](#-roadmap) below to see the planned phases.

---

## 🎯 Objective

Create a simple, fast, and customizable application to:

- Read music files from local folders.
- Play them with a clear and simple interface.
- Organize music by artist, album, year, etc.
- Create playlists and maintain playback history.
- Retrieve metadata/artwork from public databases.

---

## 🧰 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Zustand (state management)
- **Desktop**: Electron 35 + Electron Builder
- **Database**: SQLite (better-sqlite3)
- **Metadata**: music-metadata library for ID3 tags and audio file parsing
- **UI**: Custom components with React Virtuoso for performance
- **Useful libraries:**
  - [`music-metadata`](https://www.npmjs.com/package/music-metadata) for reading metadata
  - [`electron-builder`](https://www.electron.build/) for packaging
  - [`node-id3`](https://www.npmjs.com/package/node-id3) for editing tags

---

## 🔄 Roadmap

### ✅ Phase 1: MVP

- [x] Local folder selection
- [x] File and metadata reading
- [x] Search
- [x] Simple playback queue
- [x] Basic player (play/pause/next/previous)
- [x] Shuffle playback
- [x] Loop playback
- [x] Volume control
- [x] Sort playback queue
- [x] Play full album
- [x] Library with sortable headers
- [x] Initial interface
- [x] Persistent database with SQLite
- [x] Add album artwork from iTunes
- [x] i18n: EN and ES support

#### 📐 MVP Pending Tasks Checklist

- [x] Search functionality by tabs
- [x] Remove song from queue button
- [x] Fix tests
- [x] Adopt only one way to load album covers
- [x] Test playback controls
- [x] Section header component
- [x] Fix album grid height
- [x] Responsive
- [x] Memory leak in playback
- [x] Settings modal UI
- [x] Fix album cover formatting
- [x] iTunes-style inline album expansion in grid view
- [ ] Polish general UI
- [ ] Notifications component

#### iTunes-Style Album Expansion (Planned Feature)

When clicking an album in the grid, an expansion panel appears below that row showing:

- **Left column**: Large album cover
- **Right column**: Album title, artist, year + song list with track numbers and durations

**Implementation approach:**

- Switch from `VirtuosoGrid` to `Virtuoso` (list mode) with row-based rendering
- Calculate albums per row using `ResizeObserver` on container width
- Group albums into row items (each virtualized item = one row of albums)
- Insert expansion panels as special items after the selected album's row
- Use variable row heights (normal rows fixed, expansion rows taller)

**Performance considerations:**

- Virtualization remains efficient (rows instead of individual items)
- Minimal re-renders (only affected rows on expand/collapse)
- Slight overhead from ResizeObserver for responsive row calculation
- Memory usage similar to current implementation

#### 🔴 Priority 0: Critical (must fix before release)

**Errors that cause crashes or data loss**

- [x] **Silent audio file loading failures** (`src/renderer/hooks/useAudioPlayer.ts:33-44`)
  - Add error notification when a file cannot be loaded
  - Automatically skip to next song if loading fails
  - Log failed paths for debugging

- [x] **Crash when removing current song from queue** (`src/renderer/components/Queue/Queue.tsx:67-84`)
  - Race condition: array access after removing element
  - Reorder removal and playback logic

- [x] **Full page reload when deleting album** (`src/renderer/components/AlbumsGrid/AlbumsGrid.tsx:100-115`, `src/renderer/App.tsx:337-367`)
  - Replaced `window.location.reload()` with optimistic UI update
  - Songs removed from library state and queue without losing playback
  - Properly adjusts current index and stops playback if queue becomes empty

- [x] **No file existence validation before playing** (`src/main/index.ts:363-385`)
  - Added explicit `fs.existsSync()` check before reading file
  - Enhanced error logging with specific error codes (ENOENT, EACCES)
  - Works together with error handler to show user feedback and auto-skip
  - (Note: Core functionality already solved by "Silent audio file loading failures" fix)

- [x] **Queue reconstruction silently loses songs** (`src/renderer/store/player.ts:208-256`, `src/renderer/App.tsx:186-199`)
  - Now tracks missing songs during queue reconstruction
  - Shows notification: "X songs were removed from queue (files not found in library)"
  - Properly adjusts currentIndex after filtering
  - Fixed notification stacking issue (only one error notification shown at a time)

#### 🟠 Priority 1: High (affect performance and experience)

**Performance and data loss issues**

- [x] **Album grid without virtualization** (`src/renderer/components/AlbumsGrid/AlbumsGrid.tsx`)
  - With 1000+ albums the UI freezes
  - Implement virtualization (react-window or manual scrolling)

- [ ] **Inefficient queue comparison** (`src/renderer/store/player.ts:201`)
  - `JSON.stringify` on every change kills performance with 1000+ songs
  - Implement shallow comparison or compare only specific fields

- [ ] **No database integrity verification** (`src/main/index.ts:28-58`)
  - Corruption possible if app crashes during write
  - Add `PRAGMA journal_mode = WAL`
  - Validate all inserted data
  - Add integrity check on app startup

- [ ] **Corrupted metadata crashes scan** (`src/main/index.ts:265-296`)
  - A single corrupted MP3 stops entire scan
  - Validate metadata: `duration > 0`
  - Skip files with invalid metadata
  - Report number of skipped files to user

- [ ] **No error handling in queue persistence** (`src/renderer/store/player.ts:237-244`)
  - Silent failures when saving to DB
  - Implement error logging
  - Add retry mechanism
  - Show notification if it fails persistently

- [ ] **Album grouping not properly memoized** (`src/renderer/App.tsx:246`)
  - `groupAlbums` runs on every search with O(n) complexity
  - With 5000 songs causes noticeable lag
  - Memoize grouping separately from filtering

#### 🟡 Priority 2: Medium (UX improvements and edge cases)

**Improvements that would enhance experience but don't block release**

- [ ] **No feedback for file not found errors**
  - Files: `useAudioPlayer.ts`, `Player.tsx`
  - Add notification layer with retry/skip options

- [ ] **Silent folder permission errors** (`src/main/index.ts:230`)
  - Folder without read permissions: scan ends with 0 files without notice
  - Catch permission errors explicitly
  - Show user-friendly message

- [ ] **iTunes API rate limiting without notification** (`src/main/index.ts:414-476`)
  - No feedback if API rejects request due to rate limit
  - Check response status
  - Show rate-limit message to user

- [ ] **Empty folder selection without feedback** (`src/renderer/hooks/useSongs.ts:48-62`)
  - User selects folder without audio files: only empty library appears
  - Show message "No audio files found in folder"

- [ ] **Cover cache busting doesn't persist** (`src/renderer/App.tsx:263`)
  - Cache timestamp not saved to DB
  - On app restart, old cached covers are shown

- [x] **Volume doesn't persist between restarts** (`src/renderer/hooks/useAudioPlayer.ts`, `src/renderer/store/settings.ts`)
  - Changed default volume from 50% to 25%
  - Volume now saves to settings store and persists across restarts

- [ ] **Silent cover loading failures** (`src/renderer/App.tsx:209-217`)
  - `fetch` can return 404 without throwing error
  - Check `response.ok` before `response.blob()`

- [ ] **No "Various Artists" compilation detection** (`src/renderer/App.tsx:26`)
  - Albums with multiple artists only show the first one
  - Implement "Various Artists" detection

- [ ] **Race condition on queue double click** (`src/renderer/components/Queue/Queue.tsx:74-92`)
  - If queue changes during operation, `currentIndex + 1` may be incorrect
  - Protect against concurrent changes

- [ ] **Native dialog for album deletion** (`src/renderer/components/AlbumsGrid/AlbumsGrid.tsx:105`)
  - Uses browser `confirm()` which looks bad in Electron
  - No way to undo deletion
  - Use native Electron dialog with warning icon

- [ ] **Basic keyboard shortcuts** (`src/main/index.ts:145-174`)
  - Missing typical shortcuts: Space (play/pause), Arrows (skip), Ctrl+L (loop)
  - Add keyboard event listeners in renderer

- [ ] **Path validation in media protocol** (`src/main/index.ts:78-119`)
  - Paths with symbolic links, network volumes, or special characters may fail
  - Test with various path types
  - Use `URL` API more consistently

- [ ] **SQL injection in LIKE pattern** (`src/main/index.ts:499-500`)
  - Path with special SQL characters (`%` or `_`) can match unintended files
  - Use `startsWith` logic in app layer instead of SQL LIKE
  - Or escape the path properly

- [ ] **No search length limit** (`src/renderer/utils.ts:10-20`)
  - 100-character search string with 10,000 songs causes DoS
  - Limit search string length

- [ ] **IPC handlers without rate limiting** (`src/main/index.ts`)
  - Handlers like `fetch-album-cover` make requests without limit
  - Add throttling/debouncing for external API calls

- [ ] **Widespread use of `any` types** (`src/renderer/components/AlbumsGrid/AlbumsGrid.tsx:8`)
  - Defeats TypeScript benefits
  - Create proper type definitions, remove `any`

- [ ] **Magic numbers without constants** (`src/renderer/components/Controls/Controls.tsx:20`)
  - `volume * 240 - 120` without explanation
  - Create named constants

- [ ] **Empty catch blocks** (`src/renderer/store/player.ts:235`)
  - Pattern repeated in multiple files
  - Makes debugging impossible
  - Log all errors to console, never use empty catch

### 🚧 Phase 2: Alpha

- [ ] Normalize audio level
- [ ] Queue tabs with Next and History
- [ ] Custom playlists
- [ ] Playback history
- [ ] Search and filters
- [ ] Manual backup

### 🧪 Phase 3: Beta

- [ ] Integration with MusicBrainz/Last.fm
- [ ] Metadata editor
- [ ] Support for multiple audio formats
- [ ] Reorder playback queue
- [ ] Automatic backup + restoration

### 🌟 Phase 4: Stable

- [ ] Export/import playlists
- [ ] Global keyboard shortcuts
- [ ] System notifications
- [ ] Gapless playback
- [ ] Auto-update

---

## ⚠️ Known Issues on Fedora/Linux

If you see errors like this when installing dependencies or running electron-rebuild:

```bash
make: g++: No such file or directory
Error: The module '.../better-sqlite3.node' was compiled against a different Node.js version
```

This is because Node.js/Electron native modules require specific build tools and development libraries on Fedora (and other Linux distros). To fix it:

1. Install development tools and SQLite libraries:

   ```bash
   sudo dnf groupinstall "Development Tools"
   sudo dnf install sqlite-devel
   ```

   > Note: On Fedora and other Linux distros, you also need to install the C++ compiler (g++):
   >
   > ```bash
   > sudo dnf install gcc-c++
   > ```

2. Delete node_modules and reinstall dependencies:

   ```bash
   rm -rf node_modules yarn.lock package-lock.json
   yarn install
   ```

3. Rebuild native modules for Electron:

   ```bash
   npx electron-rebuild
   ```

This should allow you to compile and run the project correctly on Fedora/Linux.

---

## 🔄 CI/CD Workflow

### Test Builds (develop)

Every push to `develop` and every pull request triggers the **Test Builds** workflow. It builds for Linux, Windows, and macOS in parallel. Binaries are uploaded as GitHub Actions artifacts, downloadable from the Actions tab for manual testing.

### Releases (main)

1. Merge `develop` into `main` when ready.
2. Bump the version and create a tag:
   ```bash
   yarn release
   ```
   Or manually:
   ```bash
   # Edit version in package.json
   git add package.json
   git commit -m "Release X.Y.Z"
   git tag vX.Y.Z
   git push && git push --tags
   ```
3. The `v*` tag triggers the **Release** workflow, which verifies the tag is on `main`, builds all platforms, and creates a draft GitHub Release with all assets.

### Release Assets

| File                       | Platform | Description                   |
| -------------------------- | -------- | ----------------------------- |
| `Tuku-X.Y.Z-universal.dmg` | macOS    | Installer (ARM + Intel)       |
| `Tuku-X.Y.Z-Setup.exe`     | Windows  | NSIS installer                |
| `Tuku-X.Y.Z.AppImage`      | Linux    | Portable binary (all distros) |
| `tuku_X.Y.Z_amd64.deb`     | Linux    | Debian/Ubuntu package         |
| `tuku-X.Y.Z.x86_64.rpm`    | Linux    | Fedora/RHEL package           |

---

## 🛡 License

MIT License

---

## 🙌 Credits

Developed in Seville with ❤️ and an obsession for cloud-free music.
