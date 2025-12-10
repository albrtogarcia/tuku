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
})
