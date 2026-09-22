'use client'

import { useActionState } from 'react'
import { recordNextAction } from '../actions'

/**
 * What he said comes next, typed where he said it.
 *
 * On the board rather than buried in a lot page, because this gets said while
 * looking at the tank — "y a ese hay que trasegarlo el viernes" — and walking
 * somewhere else to write it down is how it gets lost.
 */
export function NextForm({ lotCode, current }: { lotCode: string; current: string | null }) {
  const [state, action] = useActionState(recordNextAction, null)

  return (
    <form action={action} className="next-form">
      <input type="hidden" name="lot_code" value={lotCode} />
      <input
        name="note"
        defaultValue={current ?? ''}
        placeholder="what is next?"
        aria-label={`what is next for ${lotCode}`}
        data-next={lotCode}
      />
      <button type="submit">Note it</button>
      {state && !state.ok && <span className="err">{state.message}</span>}
    </form>
  )
}
