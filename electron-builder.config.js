module.exports = {
	appId: 'com.tuku.musicplayer',
	productName: 'Tuku',
	directories: {
		output: 'dist-electron',
		buildResources: 'build',
	},
	files: ['dist/**/*', 'node_modules/**/*', 'package.json'],
	extraMetadata: {
		main: 'dist/main/index.js',
	},
	mac: {
		target: 'dmg',
		category: 'public.app-category.music',
		icon: 'build/icons/icon.icns',
		extendInfo: {
			CFBundleIdentifier: 'com.tuku.musicplayer',
			CFBundleName: 'Tuku',
			CFBundleDisplayName: 'Tuku',
			CFBundleShortVersionString: '1.0.0',
			CFBundleVersion: '1.0.0',
			CFBundleExecutable: 'Tuku',
			CFBundlePackageType: 'APPL',
			CFBundleSignature: '????',
			CFBundleDocumentTypes: [
				{
					CFBundleTypeName: 'Audio File',
					CFBundleTypeRole: 'Viewer',
					LSTypeIsPackage: false,
					CFBundleTypeIconFile: 'icon.icns',
					LSItemContentTypes: ['public.audio'],
				},
			],
		},
	},
	linux: {
		target: ['AppImage', 'deb'],
		category: 'Audio',
		icon: 'build/icons',
		desktop: {
			Name: 'Tuku',
			Comment: 'Tuku Music Player',
			Type: 'Application',
			Exec: 'tuku',
			Icon: 'tuku',
			Categories: 'Audio;Player;',
			StartupNotify: true,
			StartupWMClass: 'Tuku',
			Terminal: false,
			Actions: [
				{
					Name: 'Play/Pause',
					Exec: 'tuku --play-pause',
					OnlyShowIn: 'Unity;GNOME;',
				},
				{
					Name: 'Next',
					Exec: 'tuku --next',
					OnlyShowIn: 'Unity;GNOME;',
				},
				{
					Name: 'Previous',
					Exec: 'tuku --previous',
					OnlyShowIn: 'Unity;GNOME;',
				},
			],
		},
		win: {
			target: [
				{
					target: 'nsis',
					arch: ['x64'],
				},
			],
			icon: 'build/icons/icon.ico',
		},
	},
}
