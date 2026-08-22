'use client'

import { useActionState } from 'react'
import { setVesselSize } from '../actions'

/** Asked only where the answer is missing, and never asked twice. */
export function SizeForm({ code, unit }: { code: string; unit: string }) {
  const [state, action] = useActionState(setVesselSize, null)

  return (
    <form action={action} className="size-form">
      <input type="hidden" name="vessel_code" value={code} />
      <label htmlFor={`cap-${code}`}>how big is it?</label>
      <input
        id={`cap-${code}`}
        name="capacity"
        inputMode="decimal"
        placeholder="5000"
        data-size={code}
        required
      />
      <select name="capacity_unit" defaultValue={unit}>
        <option value="L">litres</option>
        <option value="hL">hL</option>
        <option value="kg">kg</option>
        <option value="t">tonnes</option>
      </select>
      <button type="submit">Save</button>
      {state && !state.ok && <span className="err">{state.message}</span>}
    </form>
  )
}
