'use client'

import { useTranslations } from 'next-intl'
import type { WinemakerOwnerCopy } from '@/hooks/useWinemakerOwnerCopy'
import type { OwnerTaskRow } from '@/lib/supabase/winemaker-owner-home'

export function CalendarTaskRow({
  task,
  onComplete,
  completing,
  copy,
}: {
  task: OwnerTaskRow
  onComplete: (id: string) => void
  completing: string | null
  copy: WinemakerOwnerCopy
}) {
  const tHome = useTranslations('winemaker.home')

  return (
    <div className="proof-task-row">
      <input
        type="checkbox"
        aria-label={tHome('completeTaskAria', { title: task.title })}
        disabled={completing === task.id}
        onChange={() => onComplete(task.id)}
        style={{ marginTop: 2, accentColor: 'var(--proof-accent)' }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="proof-task-row__title">{task.title}</p>
        <p className="proof-task-row__meta">{copy.formatTaskTime(task.due_at)}</p>
      </div>
    </div>
  )
}

export function PendingTaskRow({
  task,
  onComplete,
  completing,
  copy,
}: {
  task: OwnerTaskRow
  onComplete: (id: string) => void
  completing: string | null
  copy: WinemakerOwnerCopy
}) {
  const tHome = useTranslations('winemaker.home')
  const assignee = task.assigneeName?.trim() || tHome('unassigned')

  return (
    <div className="proof-task-row">
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="proof-task-row__title">{task.title}</p>
        <p className="proof-task-row__meta">{tHome('assignedTo', { name: assignee })}</p>
      </div>
      <button
        type="button"
        disabled={completing === task.id}
        onClick={() => onComplete(task.id)}
        style={{
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 600,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--line)',
          background: 'var(--panel)',
          color: 'var(--fg-0)',
          cursor: completing === task.id ? 'wait' : 'pointer',
        }}
      >
        {completing === task.id ? '…' : tHome('completeTask')}
      </button>
    </div>
  )
}
