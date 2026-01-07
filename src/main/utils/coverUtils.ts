import { nativeImage } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { IAudioMetadata } from 'music-metadata'
import { pathToFileURL } from 'url'

/**
 * Checks if a folder contains a consistent album or valid compilation.
 * Returns true if we should auto-extract a cover.
 *
 * Rules:
 * 1. Consistent Album: All files share the same Album tag.
 * 2. Compilation: ID3 tags explicitly say "Compilation" (handled by music-metadata common.isCompilation?)
 *    OR Album Artist is "Various Artists".
 * 3. Mixed/Messy: Different Album tags and no aggregation logic -> Return FALSE.
 */
export function shouldExtractCover(songsMetadata: IAudioMetadata[]): boolean {
  if (songsMetadata.length === 0) return false

  // Get unique albums
  const albums = new Set(songsMetadata.map(m => m.common.album).filter(Boolean))

  if (albums.size === 1) {
    return true // Explicitly one album
  }

  // If multiple albums, check for "Compilation" flag or specific conditions
  // For strict "Messy Folder" rule: if multiple albums, assume messy/custom unless explicitly compilation
  // Simplest approach per user rule: "Carpetas Custom... NO hacemos nada".
  // So if unique albums > 1, we skip.
  return false
}

export async function processCover(
  buffer: Buffer,
  folderPath: string,
  albumName: string
): Promise<string | null> {
  try {
    const fileName = 'cover.jpg' // Per strict rule: only cover.jpg for consistent albums
    const filePath = path.join(folderPath, fileName)

    console.log(`[CoverUtils] Processing cover for ${albumName} -> ${filePath}`)

    // Resize using Electron nativeImage (fast, no extra deps)
    const image = nativeImage.createFromBuffer(buffer)
    if (image.isEmpty()) return null

    const resized = image.resize({ width: 600, height: 600, quality: 'best' })
    const jpegBuffer = resized.toJPEG(80)

    // Write file
    await fs.writeFile(filePath, jpegBuffer)
    return pathToFileURL(filePath).toString().replace('file:', 'media:')
  } catch (error) {
    console.error(`[CoverUtils] Error processing cover:`, error)
    return null
  }
}
