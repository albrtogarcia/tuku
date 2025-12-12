import { Song } from './song'

export interface Album {
  id: string
  title: string
  artist: string
  cover: string
  year: number
  songs: Song[]
}
