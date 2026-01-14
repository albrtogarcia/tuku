import { app, BrowserWindow, ipcMain, dialog, Menu, screen, protocol, net, shell } from 'electron'
import { pathToFileURL } from 'url'
import path from 'path'
import fs from 'fs'
import fsPromises from 'fs/promises'
import { promisify } from 'util'
import { parseFile } from 'music-metadata'
import Database from 'better-sqlite3'
import os from 'os'

// Register privileged schemes must be done before app is ready
protocol.registerSchemesAsPrivileged([
	{ scheme: 'media', privileges: { secure: true, supportFetchAPI: true, standard: true, bypassCSP: true } }
])

const isDev = !app.isPackaged
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a']

// Initialize database in user folder
const userDataPath = path.join(os.homedir(), '.tuku')
if (!fs.existsSync(userDataPath)) {
	fs.mkdirSync(userDataPath)
}

// Ensure covers directory exists
const coversPath = path.join(userDataPath, 'covers')
if (!fs.existsSync(coversPath)) {
	fs.mkdirSync(coversPath, { recursive: true })
}

const dbPath = path.join(userDataPath, 'database.sqlite')
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

	// Register media protocol for serving local images
	protocol.handle('media', (request) => {
		console.log(`[Media Protocol] Request URL: ${request.url}`)
		try {
			const url = new URL(request.url)
			const host = decodeURIComponent(url.hostname || '')
			let decodedPath = decodeURIComponent(url.pathname || '')

			// Rebuild path
			if (process.platform === 'win32') {
				// Windows: hostname carries the drive letter
				if (host) {
					decodedPath = decodedPath ? `${host}:${decodedPath}` : `${host}:`
				}
			} else {
				// macOS/Linux: hostname might be the first part of the path (e.g. media://Volumes/...)
				// If so, we need to prepend it
				if (host) {
					decodedPath = `/${host}${decodedPath}`
				}
			}

			// Ensure absolute path on macOS/Linux (fix for missing leading slash if host was empty)
			if ((process.platform === 'darwin' || process.platform === 'linux') && !decodedPath.startsWith('/')) {
				decodedPath = '/' + decodedPath
			}

			console.log(`[Media Protocol] Decoded path: ${decodedPath}`)

			// Basic security check: ensure we are fetching images
			const ext = path.extname(decodedPath).toLowerCase()
			if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
				console.warn(`[Media Protocol] Invalid extension: ${ext}`)
				return new Response('Bad Request', { status: 400 })
			}
			const fileUrl = pathToFileURL(decodedPath).toString()
			console.log(`[Media Protocol] Fetching: ${fileUrl}`)
			return net.fetch(fileUrl)
		} catch (error) {
			console.error(`[Media Protocol] Error:`, error)
			return new Response('Not Found', { status: 404 })
		}
	})

	if (isDev) {
		await win.loadURL('http://localhost:5173')
		win.webContents.openDevTools()
	} else {
		await win.loadFile(path.join(__dirname, '../../dist/index.html'))
	}

	createAppMenu(win)
}

function createAppMenu(win: BrowserWindow) {
	app.setName('Tuku')
	const isMac = process.platform === 'darwin'

	const template: Electron.MenuItemConstructorOptions[] = [
		// App Menu (macOS only)
		...(isMac
			? [
				{
					label: app.name,
					submenu: [
						{ role: 'about' },
						{ type: 'separator' },
						{
							label: 'Settings',
							accelerator: 'CmdOrCtrl+,',
							click: () => {
								win.webContents.send('open-settings')
							},
						},
						{ type: 'separator' },
						{ role: 'services' },
						{ type: 'separator' },
						{ role: 'hide' },
						{ role: 'hideOthers' },
						{ role: 'unhide' },
						{ type: 'separator' },
						{ role: 'quit' },
					],
				},
			]
			: []),
		// File Menu (Windows/Linux)
		...(!isMac
			? [
				{
					label: 'File',
					submenu: [
						{
							label: 'Settings',
							accelerator: 'CmdOrCtrl+,',
							click: () => {
								win.webContents.send('open-settings')
							},
						},
						{ type: 'separator' },
						{ role: 'quit' },
					],
				},
			]
			: []),
		// View Menu
		{
			label: 'View',
			submenu: [
				{ role: 'reload' },
				{ role: 'forceReload' },
				{
					label: 'Toggle Developer Tools',
					accelerator: 'CmdOrCtrl+Option+I',
					click: (_menuItem, window) => {
						if (window && window instanceof BrowserWindow) {
							window.webContents.toggleDevTools()
						}
					},
				},
				{ type: 'separator' },
				{ role: 'resetZoom' },
				{ role: 'zoomIn' },
				{ role: 'zoomOut' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' },
			],
		},
		// Window Menu
		{
			label: 'Window',
			submenu: [
				{ role: 'minimize' },
				{ role: 'zoom' },
				...(isMac ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }] : [{ role: 'close' }]),
			],
		},
	] as Electron.MenuItemConstructorOptions[]

	const menu = Menu.buildFromTemplate(template)
	Menu.setApplicationMenu(menu)
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

import { getAlbumId, getCoverPath, getCoverUrl, processCover, ensureCoversDir, findFolderCover } from './utils/coverUtils'

ipcMain.handle('get-audio-files', async (event, folderPath: string) => {
	try {
		const audioFilePaths = await getAllAudioFiles(folderPath)
		const total = audioFilePaths.length

		// Notify start
		event.sender.send('scan-start', total)

		const songs: any[] = []
		const songsMetadata: any[] = []
		let processed = 0

		// First pass: Parse all files and gather metadata
		for (const filePath of audioFilePaths) {
			try {
				const metadata = await parseFile(filePath)
				songsMetadata.push({
					filePath,
					metadata,
				})
			} catch (err) {
				console.warn(`[Main] Failed to parse ${filePath}`, err)
				// Add as unknown song (no album association)
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

			processed++
			if (processed % 10 === 0 || processed === total) {
				event.sender.send('scan-progress', { current: processed, total })
			}
		}

		// Group songs by album (considering compilations)
		const songsByAlbum = new Map<string, { items: any[], metadata: any[] }>()

		for (const item of songsMetadata) {
			const { common } = item.metadata
			const albumId = getAlbumId({
				artist: common.artist,
				album: common.album,
				albumArtist: common.albumartist,
				isCompilation: common.compilation,
			})

			if (!songsByAlbum.has(albumId)) {
				songsByAlbum.set(albumId, { items: [], metadata: [] })
			}
			songsByAlbum.get(albumId)!.items.push(item)
			songsByAlbum.get(albumId)!.metadata.push(item.metadata)
		}

		// Process each album: extract cover if needed, assign to songs
		for (const [albumId, data] of songsByAlbum) {
			// 1. Check if we already have a cover for this album in central storage
			let coverUrl = getCoverUrl(albumId)

			// 2. Look for cover image file in the album folder
			if (!coverUrl) {
				// Get unique directories for this album's songs
				const albumDirs = new Set(data.items.map((item: any) => path.dirname(item.filePath)))

				for (const dir of albumDirs) {
					const folderCover = findFolderCover(dir)
					if (folderCover) {
						console.log(`[Main] Found folder cover: ${folderCover}`)
						const buffer = await fsPromises.readFile(folderCover)
						coverUrl = await processCover(buffer, albumId)
						if (coverUrl) break
					}
				}
			}

			// 3. Fall back to embedded art in audio file metadata
			if (!coverUrl) {
				const songWithArt = data.metadata.find(
					(m: any) => m.common.picture && m.common.picture.length > 0
				)
				if (songWithArt && songWithArt.common.picture) {
					const pic = songWithArt.common.picture[0]
					if (pic) {
						coverUrl = await processCover(Buffer.from(pic.data), albumId)
					}
				}
			}

			// Assign cover to all songs in this album
			for (const item of data.items) {
				const { metadata, filePath } = item
				songs.push({
					path: filePath,
					title: metadata.common.title || path.basename(filePath),
					artist: metadata.common.artist || 'Unknown',
					album: metadata.common.album || '',
					duration: metadata.format.duration || 0,
					cover: coverUrl,
					genre: Array.isArray(metadata.common.genre) ? metadata.common.genre.join(', ') : metadata.common.genre || '',
				})
			}
		}

		event.sender.send('scan-complete')
		return songs
	} catch (err) {
		console.error('[Main] Scan error:', err)
		event.sender.send('scan-complete')
		return []
	}
})

ipcMain.handle('get-audio-buffer', async (_event, filePath: string) => {
	try {
		// Explicit file existence check before attempting to read
		const fileExists = fs.existsSync(filePath)
		if (!fileExists) {
			console.error(`[Main] File does not exist: ${filePath}`)
			return null
		}

		const buffer = await fsPromises.readFile(filePath)
		return buffer
	} catch (err: any) {
		// Log specific error for debugging
		if (err.code === 'ENOENT') {
			console.error(`[Main] File not found: ${filePath}`)
		} else if (err.code === 'EACCES') {
			console.error(`[Main] Permission denied: ${filePath}`)
		} else {
			console.error(`[Main] Error reading file ${filePath}:`, err.message)
		}
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
	db.prepare('UPDATE queue_state SET currentIndex = ? WHERE id = 0').run(currentIndex)
	return true
})

// Methods for cover retrieval
// Methods for cover retrieval
ipcMain.handle('fetch-album-cover', async (_event, artist: string, album: string) => {
	console.log(`[Main] fetch-album-cover called for: Artist="${artist}", Album="${album}"`)
	try {
		const query = encodeURIComponent(`${artist} ${album}`)
		const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`
		console.log(`[Main] Querying iTunes API: ${url}`)

		const response = await fetch(url)
		console.log(`[Main] iTunes API status: ${response.status}`)

		const data = await response.json()
		console.log(`[Main] iTunes API result count: ${data.resultCount}`)

		if (data.results && data.results.length > 0) {
			const result = data.results[0]
			console.log(`[Main] Found album: "${result.collectionName}" by "${result.artistName}"`)

			// Get higher resolution image (600x600)
			const artworkUrl = result.artworkUrl100.replace('100x100bb', '600x600bb')
			console.log(`[Main] Fetching artwork from: ${artworkUrl}`)

			const imageResponse = await fetch(artworkUrl)
			if (!imageResponse.ok) {
				console.error(`[Main] Failed to fetch image: ${imageResponse.statusText}`)
				return null
			}

			const arrayBuffer = await imageResponse.arrayBuffer()
			const buffer = Buffer.from(arrayBuffer)

			// Save to centralized covers directory using album ID
			const albumId = getAlbumId({ artist, album })
			const coverPath = getCoverPath(albumId)
			console.log(`[Main] Writing cover to: ${coverPath}`)
			await fsPromises.writeFile(coverPath, buffer)

			const mediaUrl = pathToFileURL(coverPath).toString().replace('file:', 'media:')

			// Update in database
			console.log('[Main] Updating database...')
			const update = db.prepare('UPDATE library SET cover = ? WHERE artist = ? AND album = ?')
			const info = update.run(mediaUrl, artist, album)
			console.log(`[Main] Database updated. Changes: ${info.changes}`)

			return mediaUrl
		} else {
			console.warn('[Main] No results found in iTunes')
		}
		return null
	} catch (err) {
		console.error('[Main] Error fetching cover:', err)
		return null
	}
})

ipcMain.handle('upload-album-cover', async (_event, artist: string, album: string, fileBuffer: ArrayBuffer) => {
	console.log(`[Main] upload-album-cover called for: Artist="${artist}", Album="${album}"`)
	try {
		const buffer = Buffer.from(fileBuffer)
		const albumId = getAlbumId({ artist, album })
		const coverUrl = await processCover(buffer, albumId)

		if (coverUrl) {
			const update = db.prepare('UPDATE library SET cover = ? WHERE artist = ? AND album = ?')
			const info = update.run(coverUrl, artist, album)
			console.log(`[Main] Database updated. Changes: ${info.changes}`)
			return coverUrl
		}
		return null
	} catch (err) {
		console.error('[Main] Error uploading cover:', err)
		return null
	}
})

ipcMain.handle('load-queue', async () => {
	const queueRows = db.prepare('SELECT path FROM queue ORDER BY position').all() as { path: string }[]
	const queue = queueRows.map((row) => row.path)
	const state: { currentIndex?: number } = db.prepare('SELECT currentIndex FROM queue_state WHERE id = 0').get() || {}
	return { queue, currentIndex: state.currentIndex ?? -1 }
})

// Methods for file management
ipcMain.handle('open-in-finder', async (_event, path) => {
	await shell.showItemInFolder(path)
})

ipcMain.handle('delete-album', async (_event, albumPath) => {
	try {
		console.log(`[Main] Deleting album at: ${albumPath}`)
		await shell.trashItem(albumPath)

		// Delete from DB: remove all songs that start with this path
		// We use LIKE with % to match all files in the directory
		console.log('[Main] Removing from database...')
		const deleteStmt = db.prepare('DELETE FROM library WHERE path LIKE ?')
		const info = deleteStmt.run(`${albumPath}%`)
		console.log(`[Main] Deleted ${info.changes} songs from library`)
		return true
	} catch (error) {
		console.error('[Main] Error deleting album:', error)
		return false
	}
})

ipcMain.handle('cleanup-missing-files', async () => {
	try {
		console.log('[Main] Starting cleanup of missing files...')

		// Get all songs from library
		const allSongs = db.prepare('SELECT path FROM library').all() as { path: string }[]
		console.log(`[Main] Checking ${allSongs.length} files...`)

		// Check which files no longer exist
		const missingPaths: string[] = []
		for (const song of allSongs) {
			if (!fs.existsSync(song.path)) {
				missingPaths.push(song.path)
			}
		}

		if (missingPaths.length === 0) {
			console.log('[Main] No missing files found')
			return { removed: 0 }
		}

		// Remove missing files from database
		console.log(`[Main] Found ${missingPaths.length} missing files, removing from database...`)
		const deleteStmt = db.prepare('DELETE FROM library WHERE path = ?')
		const tx = db.transaction((paths: string[]) => {
			for (const path of paths) {
				deleteStmt.run(path)
			}
		})
		tx(missingPaths)

		console.log(`[Main] Cleanup complete. Removed ${missingPaths.length} missing files from library`)
		return { removed: missingPaths.length }
	} catch (error) {
		console.error('[Main] Error during cleanup:', error)
		return { removed: 0, error: String(error) }
	}
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
