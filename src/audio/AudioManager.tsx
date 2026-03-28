import { useEffect, useRef } from 'react'
import * as Tone from 'tone'

interface Props {
  depth: number
  isActive: boolean
}

export function AudioManager({ depth, isActive }: Props) {
  const synthRef = useRef<Tone.FMSynth | null>(null)
  const filterRef = useRef<Tone.AutoFilter | null>(null)
  const reverbRef = useRef<Tone.Reverb | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!isActive || initializedRef.current) return

    const init = async () => {
      await Tone.start()
      initializedRef.current = true

      const reverb = new Tone.Reverb({ decay: 8, wet: 0.7 })
      const filter = new Tone.AutoFilter({
        frequency: 0.08,
        baseFrequency: 80,
        octaves: 2,
      }).start()
      const synth = new Tone.FMSynth({
        oscillator: { type: 'sine' },
        modulationIndex: 2,
        envelope: { attack: 3, decay: 0, sustain: 1, release: 3 },
        volume: -20,
      })

      synth.chain(filter, reverb, Tone.getDestination())
      synth.triggerAttack('C1')

      synthRef.current = synth
      filterRef.current = filter
      reverbRef.current = reverb
    }

    init()

    return () => {
      synthRef.current?.triggerRelease()
      setTimeout(() => {
        synthRef.current?.dispose()
        filterRef.current?.dispose()
        reverbRef.current?.dispose()
        initializedRef.current = false
      }, 3000)
    }
  }, [isActive])

  // Modulate audio based on depth
  useEffect(() => {
    if (!synthRef.current || !filterRef.current) return

    const depthFactor = Math.min(1, depth / 1200)

    // Lower volume and frequency as we go deeper
    synthRef.current.volume.rampTo(-20 - depthFactor * 10, 1)
    filterRef.current.baseFrequency = 80 - depthFactor * 60
  }, [depth])

  return null
}
