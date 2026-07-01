'use client'

import { useEffect, useState } from 'react'
import { PROOF_CANVAS_WIDE_MIN } from '@/lib/proof/proof-canvas-copy'

export function useCanvasWideLayout(): boolean {
  const [wide, setWide] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${PROOF_CANVAS_WIDE_MIN}px)`)
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return wide
}
