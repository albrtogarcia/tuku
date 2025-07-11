# 🎶 Tuku (nombre provisional)

**Tuku** es un reproductor de música de escritorio diseñado para reproducir y organizar archivos de audio locales desde tu propio sistema de archivos. Funciona en macOS y Linux, y está construido con **Electron + React** para una experiencia moderna, rápida y multiplataforma.

---

## 🚀 Estado del proyecto

> 🛠 En desarrollo - MVP en construcción

Consulta el [Roadmap de desarrollo](#-roadmap) más abajo para conocer las fases planificadas.

---

## 🎯 Objetivo

Crear una aplicación sencilla, rápida y personalizable para:

- Leer archivos de música desde carpetas locales.
- Reproducirlos con una interfaz moderna.
- Organizar música por artista, álbum, año, etc.
- Crear playlists y mantener un historial de reproducción.
- Recuperar metadatos/carátulas desde bases de datos públicas.

---

## 🧰 Stack técnico

- **Frontend:** React, Vite, TypeScript
- **Desktop App:** Electron
- **Audio:** Web Audio API / Howler.js
- **Base de datos:** SQLite + Better-SQLite3
- **Librerías útiles:**
  - [`music-metadata`](https://www.npmjs.com/package/music-metadata) para leer metadatos
  - [`electron-builder`](https://www.electron.build/) para empaquetado
  - [`node-id3`](https://www.npmjs.com/package/node-id3) para editar etiquetas

---

## 🔄 Roadmap

### ✅ Fase 1: MVP

- [x] Selección de carpeta local
- [x] Lectura de archivos y metadatos
- [x] Buscador
- [x] Cola de reproducción simple
- [x] Reproductor básico (play/pausa/siguiente/anterior)
- [x] Reproducción aleatoria
- [x] Reproducción en bucle
- [x] Control de volumen
- [x] Ordenar cola de reproducción
- [x] Reproducir álbum completo
- [x] Librería con cabeceras ordenables
- [x] Interfaz inicial
- [x] Base de datos persistente con SQLite

### 🚧 Fase 2: Alpha

- [ ] Playlists personalizadas
- [ ] Historial de reproducción
- [ ] Búsqueda y filtros
- [ ] Backup manual

### 🧪 Fase 3: Beta

- [ ] Integración con MusicBrainz/Last.fm
- [ ] Editor de metadatos
- [ ] Soporte para múltiples formatos de audio
- [ ] Reordenar cola de reproducción
- [ ] Backup automático + restauración

### 🌟 Fase 4: Estable

- [ ] Exportar/importar playlists
- [ ] Atajos de teclado globales
- [ ] Notificaciones del sistema
- [ ] Reproducción sin pausas (gapless)
- [ ] Auto-actualización

---

## ⚠️ Problemas conocidos en Fedora/Linux

Si al instalar dependencias o al ejecutar electron-rebuild ves errores como:

```
make: g++: No such file or directory
Error: The module '.../better-sqlite3.node' was compiled against a different Node.js version
```

Esto se debe a que los módulos nativos de Node.js/Electron requieren herramientas de compilación y librerías de desarrollo específicas en Fedora (y otras distros Linux). Para solucionarlo:

1. Instala las herramientas de desarrollo y las librerías de SQLite:
   ```bash
   sudo dnf groupinstall "Development Tools"
   sudo dnf install sqlite-devel
   ```
   > Nota: En Fedora y otras distros Linux, también es necesario instalar el compilador C++ (g++):
   >
   > ```bash
   > sudo dnf install gcc-c++
   > ```
2. Borra node_modules y reinstala dependencias:
   ```bash
   rm -rf node_modules yarn.lock package-lock.json
   yarn install
   ```
3. Reconstruye los módulos nativos para Electron:
   ```bash
   npx electron-rebuild
   ```

Esto debería permitir compilar y ejecutar correctamente el proyecto en Fedora/Linux.

---

## 🛡 Licencia

MIT License

---

## 🙌 Créditos

Desarrollado en Sevilla con ❤️ y obsesión por la música sin nube.
