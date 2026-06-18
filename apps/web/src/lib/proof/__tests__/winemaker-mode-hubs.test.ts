import { describe, expect, it } from 'vitest'
import { subHubForModeAction } from '@/lib/proof/proof-canvas-copy'
import { WINEMAKER_MODE_ACTIONS } from '@/lib/proof/proof-canvas-copy'

describe('winemaker mode hubs', () => {
  it('maps each winemaker mode to a sub-hub', () => {
    expect(subHubForModeAction(WINEMAKER_MODE_ACTIONS[0])).toBe('wm_ticket')
    expect(subHubForModeAction(WINEMAKER_MODE_ACTIONS[1])).toBe('wm_bodega')
    expect(subHubForModeAction(WINEMAKER_MODE_ACTIONS[2])).toBe('wm_agenda')
  })
})
