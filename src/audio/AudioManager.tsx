import { useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

interface Props {
  depth: number
  isActive: boolean
}

const AUDIO_TRACKS = [
  { src: '/audio/deep-sea-ambience.mp3', volume: -12 },
  { src: '/audio/deep-sea-bass-long.mp3', volume: -18 },
  { src: '/audio/deep-sea-bass.mp3', volume: -20 },
  { src: '/audio/deep-sea-sounds-loud.mp3', volume: -22 },
  { src: '/audio/deep-sea-sounds.mp3', volume: -15 },
]

export function AudioManager({ depth, isActive }: Props) {
  const playersRef = useRef<Tone.Player[]>([])
  const loadedRef = useRef(false)
  const playingRef = useRef(false)
  const toneStartedRef = useRef(false)

  // Initialize Tone context and load audio files when activated
  const initAudio = useCallback(async () => {
    if (loadedRef.current) return

    if (!toneStartedRef.current) {
      await Tone.start()
      toneStartedRef.current = true
    }

    const players = AUDIO_TRACKS.map(({ src, volume }) => {
      return new Tone.Player({
        url: src,
        loop: true,
        volume,
        fadeIn: 3,
        fadeOut: 3,
      }).toDestination()
    })

    playersRef.current = players

    // Wait for all buffers to load
    await Tone.loaded()
    loadedRef.current = true
  }, [])

  // Init audio on first activation (user gesture required for Tone.start)
  useEffect(() => {
    if (isActive && !loadedRef.current) {
      initAudio()
    }
  }, [isActive, initAudio])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playersRef.current.forEach(p => {
        try { p.stop(); p.dispose() } catch { /* ignore */ }
      })
      playersRef.current = []
      loadedRef.current = false
      playingRef.current = false
    }
  }, [])

  // Start/stop based on depth (once loaded)
  useEffect(() => {
    if (!loadedRef.current || !isActive) return
    const players = playersRef.current

    if (depth > 0 && !playingRef.current) {
      players.forEach(p => {
        if (p.loaded && p.state !== 'started') p.start()
      })
      playingRef.current = true
    } else if (depth <= 0 && playingRef.current) {
      players.forEach(p => {
        if (p.state === 'started') p.stop()
      })
      playingRef.current = false
    }
  }, [depth, isActive])

  return null
}
