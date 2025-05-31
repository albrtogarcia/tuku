import { MusicNotes, Shuffle } from '@phosphor-icons/react/dist/ssr'
import { usePlayerStore } from '../../store/player'
import { formatTime } from '../../utils'
import Controls from '../Controls/Controls'
import './_player.scss'

interface PlayerProps {
	audio: ReturnType<typeof import('../../hooks/useAudioPlayer').useAudioPlayer>
	songs: Array<any> // Biblioteca completa de canciones
}

const Player = ({ audio, songs }: PlayerProps) => {
	const { queue, currentIndex, setQueue, setCurrentIndex } = usePlayerStore()
	const { duration, currentTime, setCurrentTime, handlePlay, isPlaying, playingPath } = audio
	const song = queue[currentIndex]

	// Función para reproducir una canción aleatoria
	const handleSurpriseMe = () => {
		if (songs.length === 0) return

		const randomIndex = Math.floor(Math.random() * songs.length)
		const randomSong = songs[randomIndex]

		setQueue([randomSong])
		setCurrentIndex(0)
		handlePlay(randomSong.path)
	}

	// Si no hay canción en la cola pero hay algo reproduciéndose, buscar en la biblioteca
	let currentSong = song
	if (!song && isPlaying && playingPath) {
		currentSong = songs.find((s) => s.path === playingPath)
	}

	// Si no hay canción actual y no hay nada reproduciéndose, mostrar empty state
	if (!currentSong && (!isPlaying || !playingPath)) {
		return (
			<>
				<div className="player player--empty">
					<div className="player__empty-state">
						<h4 className="player__empty-title">Ready to play</h4>
						<p className="player__empty-subtitle">Add songs to your queue or let me pick for you</p>
						<button className="btn" onClick={handleSurpriseMe} disabled={songs.length === 0}>
							<Shuffle size={20} weight="fill" />
							Surprise me!
						</button>
					</div>
				</div>
				<Controls audio={audio} />
			</>
		)
	}

	// Si no encontramos la canción en la biblioteca pero hay algo reproduciéndose, mostrar info básica
	if (!currentSong && isPlaying && playingPath) {
		const fileName = playingPath.split('/').pop() || playingPath
		currentSong = {
			path: playingPath,
			title: fileName,
			artist: 'Unknown',
			album: 'Unknown',
			duration: 0,
			cover: null,
			genre: '',
		}
	}

	// Calculate progress percentage for the visual fill
	const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

	// Handle direct clicks on the progress bar
	const handleProgressClick = (e: React.MouseEvent<HTMLInputElement>) => {
		const rect = e.currentTarget.getBoundingClientRect()
		const clickX = e.clientX - rect.left
		const percentage = clickX / rect.width
		const newTime = percentage * duration

		if (newTime >= 0 && newTime <= duration) {
			setCurrentTime(newTime)
		}
	}

	return (
		<>
			<div className="player">
				{currentSong.cover ? (
					<img className="player__cover" src={currentSong.cover} alt="cover" />
				) : (
					<div className="player__cover default">
						<MusicNotes size={48} weight="fill" />
					</div>
				)}
				<div className="player__info">
					<h4 className="song__title">{currentSong.title || ''}</h4>
					<p className="song__metadata">
						<span className="song__artist">{currentSong.artist}</span>
						<span className="song__album">{currentSong.album}</span>
					</p>

					<div className="player__progress-container">
						<input
							className="player__progress"
							type="range"
							min={0}
							max={duration}
							value={currentTime}
							style={
								{
									'--progress-fill': `${progressPercentage}%`,
								} as React.CSSProperties
							}
							onChange={(e) => {
								const time = Number(e.target.value)
								setCurrentTime(time)
							}}
							onClick={handleProgressClick}
						/>
					</div>
					<div className="player__time">
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
				</div>
			</div>

			<Controls audio={audio} />
		</>
	)
}

export default Player
