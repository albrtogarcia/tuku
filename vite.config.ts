import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
	plugins: [react()],
	root: './',
	base: './',
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
