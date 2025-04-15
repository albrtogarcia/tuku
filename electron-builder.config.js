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
	},
	linux: {
		target: ['AppImage', 'deb'],
		category: 'Audio',
	},
}
