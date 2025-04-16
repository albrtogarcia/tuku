console.log('Electron main process started')

import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import fsPromises from 'fs/promises'
import { promisify } from 'util'
import { parseFile } from 'music-metadata'

const isDev = !app.isPackaged
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a']

async function createWindow() {
	const win = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, '../preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	})

	if (isDev) {
		await win.loadURL('http://localhost:5173')
		win.webContents.openDevTools()
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
	console.log('[get-audio-files] Handler called with:', folderPath)
	console.log('typeof parseFile:', typeof parseFile, parseFile)
	try {
		const audioFilePaths = await getAllAudioFiles(folderPath)
		console.log('[get-audio-files] Found audio files:', audioFilePaths)
		const songs = []
		for (const filePath of audioFilePaths) {
			console.log('[get-audio-files] Processing file:', filePath)
			try {
				const metadata = await parseFile(filePath)
				console.log('[get-audio-files] Metadata for', filePath, metadata)
				songs.push({
					path: filePath,
					title: metadata.common.title || path.basename(filePath),
					artist: metadata.common.artist || 'Desconocido',
					album: metadata.common.album || '',
					duration: metadata.format.duration || 0,
					cover: metadata.common.picture?.[0]
						? `data:${metadata.common.picture[0].format};base64,${Buffer.from(metadata.common.picture[0].data).toString('base64')}`
						: null,
				})
			} catch (err) {
				console.error('[get-audio-files] Error reading metadata for', filePath, err)
				songs.push({
					path: filePath,
					title: path.basename(filePath),
					artist: 'Desconocido',
					album: '',
					duration: 0,
					cover: null,
				})
			}
		}
		return songs
	} catch (err) {
		console.error('[get-audio-files] Error reading audio files:', err)
		return []
	}
})

ipcMain.handle('get-audio-buffer', async (_event, filePath: string) => {
	try {
		const buffer = await fsPromises.readFile(filePath)
		return buffer
	} catch (err) {
		console.error('[get-audio-buffer] Error reading file:', filePath, err)
		return null
	}
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
