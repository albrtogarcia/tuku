import { contextBridge, ipcRenderer } from 'electron'
import type { Song } from './types/song'

contextBridge.exposeInMainWorld('electronAPI', {
	selectFolder: () => ipcRenderer.invoke('select-folder'),
	getAudioFiles: (folderPath: string) => ipcRenderer.invoke('get-audio-files', folderPath),
	getAudioBuffer: (filePath: string) => ipcRenderer.invoke('get-audio-buffer', filePath),
	saveLibrary: (songs: Song[]) => ipcRenderer.invoke('save-library', songs),
	loadLibrary: (): Promise<Song[]> => ipcRenderer.invoke('load-library'),
	getLibraryMetadata: (key: string): Promise<string | null> => ipcRenderer.invoke('get-library-metadata', key),
	setLibraryMetadata: (key: string, value: string): Promise<boolean> => ipcRenderer.invoke('set-library-metadata', key, value),
	saveQueue: (queue: Song[], currentIndex: number) => ipcRenderer.invoke('save-queue', queue, currentIndex),
	loadQueue: (): Promise<{ queue: string[]; currentIndex: number }> => ipcRenderer.invoke('load-queue'),
	fetchAlbumCover: (artist: string, album: string): Promise<string | null> => ipcRenderer.invoke('fetch-album-cover', artist, album),
	uploadAlbumCover: (artist: string, album: string, fileBuffer: ArrayBuffer): Promise<string | null> => ipcRenderer.invoke('upload-album-cover', artist, album, fileBuffer),
	onOpenSettings: (callback: () => void) => ipcRenderer.on('open-settings', callback),
	onScanStart: (callback: (total: number) => void) => ipcRenderer.on('scan-start', (_event, total) => callback(total)),
	onScanProgress: (callback: (progress: { current: number; total: number }) => void) => ipcRenderer.on('scan-progress', (_event, progress) => callback(progress)),
	onScanComplete: (callback: () => void) => ipcRenderer.on('scan-complete', callback),
	openInFinder: (path: string) => ipcRenderer.invoke('open-in-finder', path),
	deleteAlbum: (path: string) => ipcRenderer.invoke('delete-album', path),
	deleteSong: (path: string) => ipcRenderer.invoke('delete-song', path),
	cleanupMissingFiles: (): Promise<{ removed: number; error?: string }> => ipcRenderer.invoke('cleanup-missing-files'),
	setLanguage: (lang: string) => ipcRenderer.invoke('set-language', lang),
})
