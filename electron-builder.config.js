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
		// Configuración para code signing (descomenta si tienes certificado)
		// identity: "Developer ID Application: Tu Nombre (TEAM_ID)",
		// hardenedRuntime: true,
		// gatekeeperAssess: false,
		// notarize: {
		// 	teamId: "TU_TEAM_ID"
		// },
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
}
