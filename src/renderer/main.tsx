import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Detects system mode and applies dark mode automatically
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
if (prefersDark) {
	document.body.classList.add('dark')
} else {
	document.body.classList.remove('dark')
}

// Escucha cambios en el modo del sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
	if (e.matches) {
		document.body.classList.add('dark')
	} else {
		document.body.classList.remove('dark')
	}
})

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)
