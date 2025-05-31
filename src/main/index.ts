import { app, BrowserWindow, ipcMain, dialog, Menu, screen } from 'electron'
import path from 'path'
import fs from 'fs'
import fsPromises from 'fs/promises'
import { promisify } from 'util'
import { parseFile } from 'music-metadata'
import Database from 'better-sqlite3'
import os from 'os'

const isDev = !app.isPackaged
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a']

// Initialize database in user folder
const dbPath = path.join(os.homedir(), '.tuku-player.sqlite3')
const db = new Database(dbPath)

// Create tables if they don't exist
// Songs in the library
// path is the primary key
// Playback queue and current position

db.exec(`
CREATE TABLE IF NOT EXISTS library (
  path TEXT PRIMARY KEY,
  title TEXT,
  artist TEXT,
  album TEXT,
  duration REAL,
  cover TEXT,
  genre TEXT
);
CREATE TABLE IF NOT EXISTS library_metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS queue (
  position INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT
);
CREATE TABLE IF NOT EXISTS queue_state (
  id INTEGER PRIMARY KEY CHECK (id = 0),
  currentIndex INTEGER
);
INSERT OR IGNORE INTO queue_state (id, currentIndex) VALUES (0, 0);
`)

async function createWindow() {
	// Get screen dimensions
	const primaryDisplay = screen.getPrimaryDisplay()
	const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

	const win = new BrowserWindow({
		width: 640,
		height: screenHeight,
		minWidth: 640,
		minHeight: 600,
		webPreferences: {
			preload: path.join(__dirname, '../preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	})

	if (isDev) {
		await win.loadURL('http://localhost:5173')
		win.webContents.openDevTools()

		// Development menu with DevTools option
		const template: Electron.MenuItemConstructorOptions[] = [
			{
				label: 'View',
				submenu: [
					{
						label: 'Toggle DevTools',
						accelerator: 'CmdOrCtrl+Alt+I',
						click: () => win.webContents.toggleDevTools(),
					},
					{ role: 'reload' },
				],
			},
		]
		const menu = Menu.buildFromTemplate(template)
		Menu.setApplicationMenu(menu)
	} else {
		await win.loadFile(path.join(__dirname, '../../dist/index.html'))
	}
}

ipcMain.handle('select-folder', async () => {
	const result = await dialog.showOpenDialog({
		properties: ['openDirectory'],
	})
	if (result.canceled || result.filePaths.length === 0) {
		return null
	}
	return result.filePaths[0]
})

async function getAllAudioFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true })
	const files = await Promise.all(
		entries.map(async (entry) => {
			const res = path.resolve(dir, entry.name)
			if (entry.isDirectory()) {
				return getAllAudioFiles(res)
			} else if (AUDIO_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
				return [res]
			} else {
				return []
			}
		}),
	)
	return files.flat()
}

ipcMain.handle('get-audio-files', async (_event, folderPath: string) => {
	try {
		const audioFilePaths = await getAllAudioFiles(folderPath)
		const songs = []
		for (const filePath of audioFilePaths) {
			try {
				const metadata = await parseFile(filePath)
				songs.push({
					path: filePath,
					title: metadata.common.title || path.basename(filePath),
					artist: metadata.common.artist || 'Unknown',
					album: metadata.common.album || '',
					duration: metadata.format.duration || 0,
					cover: metadata.common.picture?.[0]
						? `data:${metadata.common.picture[0].format};base64,${Buffer.from(metadata.common.picture[0].data).toString('base64')}`
						: null,
					genre: Array.isArray(metadata.common.genre) ? metadata.common.genre.join(', ') : metadata.common.genre || '',
				})
			} catch (err) {
				songs.push({
					path: filePath,
					title: path.basename(filePath),
					artist: 'Unknown',
					album: '',
					duration: 0,
					cover: null,
					genre: '',
				})
			}
		}
		return songs
	} catch (err) {
		return []
	}
})

ipcMain.handle('get-audio-buffer', async (_event, filePath: string) => {
	try {
		const buffer = await fsPromises.readFile(filePath)
		return buffer
	} catch (err) {
		return null
	}
})

// Methods for the library
ipcMain.handle('save-library', async (_event, songs) => {
	const insert = db.prepare(`REPLACE INTO library (path, title, artist, album, duration, cover, genre) VALUES (?, ?, ?, ?, ?, ?, ?)`)
	const tx = db.transaction((songs) => {
		for (const song of songs) {
			insert.run(song.path, song.title, song.artist, song.album, song.duration, song.cover, song.genre)
		}
		// Update lastUpdated timestamp
		const now = new Date().toISOString()
		db.prepare('REPLACE INTO library_metadata (key, value) VALUES (?, ?)').run('lastUpdated', now)
	})
	tx(songs)
	return true
})
ipcMain.handle('load-library', async () => {
	return db.prepare('SELECT * FROM library').all()
})

// Methods for library metadata
ipcMain.handle('get-library-metadata', async (_event, key) => {
	const result = db.prepare('SELECT value FROM library_metadata WHERE key = ?').get(key) as { value: string } | undefined
	return result ? result.value : null
})
ipcMain.handle('set-library-metadata', async (_event, key, value) => {
	db.prepare('REPLACE INTO library_metadata (key, value) VALUES (?, ?)').run(key, value)
	return true
})

// Methods for the queue
ipcMain.handle('save-queue', async (_event, queue, currentIndex) => {
	db.prepare('DELETE FROM queue').run()
	const insert = db.prepare('INSERT INTO queue (path) VALUES (?)')
	for (const song of queue) {
		insert.run(song.path)
	}
	db.prepare('UPDATE queue_state SET currentIndex = ? WHERE id = 0').run(currentIndex)
	return true
})

ipcMain.handle('load-queue', async () => {
	const queueRows = db.prepare('SELECT path FROM queue ORDER BY position').all() as { path: string }[]
	const queue = queueRows.map((row) => row.path)
	const state: { currentIndex?: number } = db.prepare('SELECT currentIndex FROM queue_state WHERE id = 0').get() || {}
	return { queue, currentIndex: state.currentIndex ?? -1 }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
