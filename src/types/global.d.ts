export {}

interface ElectronAPI {
	selectFolder: () => Promise<string | null>
	getAudioFiles: (path: string) => Promise<Song[]>
	getAudioBuffer: (filePath: string) => Promise<ArrayBuffer | null>
}

declare global {
	interface Window {
		electronAPI: ElectronAPI
	}
}
