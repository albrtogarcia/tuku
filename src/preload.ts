import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
	selectFolder: () => ipcRenderer.invoke('select-folder'),
	getAudioFiles: (folderPath: string) => ipcRenderer.invoke('get-audio-files', folderPath),
	getAudioBuffer: (filePath: string) => ipcRenderer.invoke('get-audio-buffer', filePath),
})
