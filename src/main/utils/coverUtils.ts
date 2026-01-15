import { nativeImage } from 'electron'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import os from 'os'
import { pathToFileURL } from 'url'

const COVERS_DIR = path.join(os.homedir(), '.tuku', 'covers')

/**
 * Sanitizes a string for use in filenames.
 * Normalizes accented characters and only allows a-z, 0-9, hyphens, and underscores.
 */
function sanitizeForFilename(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')              // Decompose accented chars (á → a + combining accent)
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .replace(/[^a-z0-9_-]/g, '')   // Keep only a-z, 0-9, underscores, and hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
    .substring(0, 100)             // Limit length
}

export interface AlbumIdentity {
  artist?: string
  album?: string
  albumArtist?: string
  isCompilation?: boolean
}

/**
 * Generates a unique, human-readable album identifier.
 * For compilations/various artists, uses "various-artists" as the artist portion.
 * Format: artist_album.jpg
 */
export function getAlbumId(identity: AlbumIdentity): string {
  const { artist, album, albumArtist, isCompilation } = identity

  // Determine if this is a compilation
  const isVariousArtists =
    isCompilation === true ||
    albumArtist?.toLowerCase().includes('various') ||
    albumArtist?.toLowerCase() === 'va'

  // For compilations, use "various-artists" instead of individual artist
  const artistPart = isVariousArtists
    ? 'various-artists'
    : sanitizeForFilename(artist || 'unknown-artist')

  const albumPart = sanitizeForFilename(album || 'unknown-album')

  // Fallback to ensure we always have a valid filename
  if (!artistPart && !albumPart) {
    return 'unknown_unknown'
  }

  return `${artistPart || 'unknown'}_${albumPart || 'unknown'}`
}

/**
 * Returns the full path where a cover should be stored for a given album ID.
 */
export function getCoverPath(albumId: string): string {
  return path.join(COVERS_DIR, `${albumId}.jpg`)
}

/**
 * Ensures the covers directory exists. Call this on app startup.
 */
export function ensureCoversDir(): void {
  if (!fs.existsSync(COVERS_DIR)) {
    fs.mkdirSync(COVERS_DIR, { recursive: true })
  }
}

/**
 * Checks if a cover already exists for the given album ID.
 */
export function coverExists(albumId: string): boolean {
  return fs.existsSync(getCoverPath(albumId))
}

/**
 * Gets the media:// URL for an existing cover, or null if it doesn't exist.
 */
export function getCoverUrl(albumId: string): string | null {
  const coverPath = getCoverPath(albumId)
  if (fs.existsSync(coverPath)) {
    return pathToFileURL(coverPath).toString().replace('file:', 'media:')
  }
  return null
}

/**
 * Common cover image filenames to look for in album folders.
 */
const COVER_FILENAMES = [
  'cover.jpg', 'cover.jpeg', 'cover.png',
  'folder.jpg', 'folder.jpeg', 'folder.png',
  'front.jpg', 'front.jpeg', 'front.png',
  'artwork.jpg', 'artwork.jpeg', 'artwork.png',
  'album.jpg', 'album.jpeg', 'album.png',
]

/**
 * Looks for an existing cover image file in the given directory.
 * Returns the full path if found, null otherwise.
 */
export function findFolderCover(folderPath: string): string | null {
  for (const filename of COVER_FILENAMES) {
    const coverPath = path.join(folderPath, filename)
    if (fs.existsSync(coverPath)) {
      return coverPath
    }
  }
  return null
}

/**
 * Processes and saves an album cover image.
 * Resizes to 600x600 and saves as JPEG to the centralized covers directory.
 */
export async function processCover(
  buffer: Buffer,
  albumId: string
): Promise<string | null> {
  try {
    const filePath = getCoverPath(albumId)

    console.log(`[CoverUtils] Processing cover for album ${albumId} -> ${filePath}`)

    // Resize using Electron nativeImage (fast, no extra deps)
    const image = nativeImage.createFromBuffer(buffer)
    if (image.isEmpty()) return null

    const resized = image.resize({ width: 600, height: 600, quality: 'best' })
    const jpegBuffer = resized.toJPEG(80)

    // Ensure directory exists
    ensureCoversDir()

    // Write file
    await fsPromises.writeFile(filePath, jpegBuffer)
    return pathToFileURL(filePath).toString().replace('file:', 'media:')
  } catch (error) {
    console.error(`[CoverUtils] Error processing cover:`, error)
    return null
  }
}
