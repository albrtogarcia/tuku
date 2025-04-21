export {}

interface ElectronAPI {
	selectFolder: () => Promise<string | null>
	getAudioFiles: (path: string) => Promise<Song[]>
	getAudioBuffer: (filePath: string) => Promise<ArrayBuffer | null>
	saveLibrary: (songs: Song[]) => Promise<boolean>
	loadLibrary: () => Promise<Song[]>
	saveQueue: (queue: Song[], currentIndex: number) => Promise<boolean>
	loadQueue: () => Promise<{ queue: string[]; currentIndex: number }>
}

declare global {
	interface Window {
		electronAPI: ElectronAPI
	}
}
