export {}

interface ElectronAPI {
	selectFolder: () => Promise<string | null>
	getAudioFiles: (path: string) => Promise<Song[]>
	getAudioBuffer: (filePath: string) => Promise<ArrayBuffer | null>
	saveLibrary: (songs: Song[]) => Promise<boolean>
	loadLibrary: () => Promise<Song[]>
	getLibraryMetadata: (key: string) => Promise<string | null>
	setLibraryMetadata: (key: string, value: string) => Promise<boolean>
	saveQueue: (queue: Song[], currentIndex: number) => Promise<boolean>
	loadQueue: () => Promise<{ queue: string[]; currentIndex: number }>
	fetchAlbumCover: (artist: string, album: string) => Promise<string | null>
}

declare global {
	interface Window {
		electronAPI: ElectronAPI
	}
}
