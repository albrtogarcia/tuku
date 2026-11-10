import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { version } from './package.json'

export default defineConfig({
	plugins: [react()],
	root: './',
	base: './',
	define: {
		__APP_VERSION__: JSON.stringify(version),
		__BUILD_DATE__: JSON.stringify(new Date().toISOString()),
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src/renderer'),
		},
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
	},
	// @ts-ignore
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/renderer/setupTests.ts'],
		css: true,
		include: ['src/**/*.{test,spec}.{ts,tsx}'],
	},
})
