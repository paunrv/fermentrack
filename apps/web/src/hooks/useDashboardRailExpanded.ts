'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  readDashboardRailExpanded,
  writeDashboardRailExpanded,
} from '@/lib/proof/dashboard-rail-preference'

export function useDashboardRailExpanded() {
  const [expanded, setExpandedState] = useState(false)

  useEffect(() => {
    setExpandedState(readDashboardRailExpanded())
  }, [])

  const setExpanded = useCallback((next: boolean) => {
    setExpandedState(next)
    writeDashboardRailExpanded(next)
  }, [])

  const toggle = useCallback(() => {
    setExpandedState(prev => {
      const next = !prev
      writeDashboardRailExpanded(next)
      return next
    })
  }, [])

  return { expanded, setExpanded, toggle }
}
