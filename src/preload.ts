import { contextBridge } from 'electron'

// Aquí puedes exponer APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
	// Ejemplo: API de prueba
	ping: () => 'pong',
})
