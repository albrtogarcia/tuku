export {}

interface ElectronAPI {
	selectFolder: () => Promise<string | null>
	getAudioFiles: (path: string) => Promise<Song[]>
}

declare global {
	interface Window {
		electronAPI: ElectronAPI
	}
}
