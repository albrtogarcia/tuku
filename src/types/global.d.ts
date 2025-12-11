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
	onOpenSettings: (callback: () => void) => void
	onScanStart: (callback: (total: number) => void) => void
	onScanProgress: (callback: (progress: { current: number; total: number }) => void) => void
	onScanComplete: (callback: () => void) => void
	openInFinder: (path: string) => Promise<void>
	deleteAlbum: (path: string) => Promise<boolean>
}

declare global {
	interface Window {
		electronAPI: ElectronAPI
	}
}
