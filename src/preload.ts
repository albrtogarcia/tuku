import { contextBridge, ipcRenderer } from 'electron'
import type { Song } from './types/song'

contextBridge.exposeInMainWorld('electronAPI', {
	selectFolder: () => ipcRenderer.invoke('select-folder'),
	getAudioFiles: (folderPath: string) => ipcRenderer.invoke('get-audio-files', folderPath),
	getAudioBuffer: (filePath: string) => ipcRenderer.invoke('get-audio-buffer', filePath),
	saveLibrary: (songs: Song[]) => ipcRenderer.invoke('save-library', songs),
	loadLibrary: (): Promise<Song[]> => ipcRenderer.invoke('load-library'),
	saveQueue: (queue: Song[], currentIndex: number) => ipcRenderer.invoke('save-queue', queue, currentIndex),
	loadQueue: (): Promise<{ queue: string[]; currentIndex: number }> => ipcRenderer.invoke('load-queue'),
})
