import type { ReactNode } from 'react'

export type RailIconName =
  | 'home'
  | 'inventory'
  | 'orders'
  | 'movements'
  | 'catalog'
  | 'receiving'
  | 'remissions'
  | 'clients'
  | 'credit'
  | 'producers'
  | 'purchases'
  | 'lots'
  | 'lab'
  | 'production'
  | 'cellar'
  | 'sales'
  | 'documents'
  | 'suppliers'
  | 'expenses'
  | 'agenda'
  | 'team'
  | 'connect'
  | 'settings'

function ic(children: ReactNode) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export const RAIL_ICONS: Record<RailIconName, ReactNode> = {
  home: ic(
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  inventory: ic(
    <>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </>
  ),
  orders: ic(
    <>
      <path d="M6 6h15l-1.5 9h-12z" />
      <path d="M6 6l-1.5-3H2" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </>
  ),
  movements: ic(
    <>
      <path d="M3 12h13" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  catalog: ic(
    <>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.4" />
    </>
  ),
  receiving: ic(
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  remissions: ic(
    <>
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 4v4h-7V8z" />
      <path d="M5 18h14" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  clients: ic(
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  credit: ic(
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h2" />
    </>
  ),
  producers: ic(
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  purchases: ic(
    <>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  lots: ic(
    <>
      <path d="M8 22h8" />
      <path d="M12 15v7" />
      <path d="M7 10a5 5 0 0 1 10 0c0 2.5-2 4-2 4H9s-2-1.5-2-4z" />
    </>
  ),
  lab: ic(
    <>
      <path d="M9 3h6" />
      <path d="M10 3v4.5L6 18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l-4-10.5V3" />
      <path d="M8.5 14h7" />
    </>
  ),
  production: ic(
    <>
      <path d="M12 2v4" />
      <path d="M6 6l3 3" />
      <path d="M18 6l-3 3" />
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M9 15h6" />
    </>
  ),
  cellar: ic(
    <>
      <path d="M8 2h8l1 4H7z" />
      <path d="M7 6h10v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6z" />
      <path d="M10 10h4" />
    </>
  ),
  sales: ic(
    <>
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  documents: ic(
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </>
  ),
  suppliers: ic(
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  expenses: ic(
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M12 15v-3" />
      <path d="M8 15v-1" />
      <path d="M16 15v-2" />
    </>
  ),
  agenda: ic(
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </>
  ),
  team: ic(
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  connect: ic(
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  settings: ic(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
}

export function railIcon(name: RailIconName): ReactNode {
  return RAIL_ICONS[name]
}
