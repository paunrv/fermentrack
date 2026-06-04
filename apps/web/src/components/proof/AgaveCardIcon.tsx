/** Silueta de agave para tarjetas del canvas (viewBox 40×72). */
export function AgaveCardIcon({ accent }: { accent: string }) {
  const fill = `${accent}33`
  const fillDeep = `${accent}55`
  const stroke = '#C8C4BC'

  return (
    <svg
      width="40"
      height="72"
      viewBox="0 0 40 72"
      aria-hidden
      style={{ display: 'block', margin: '0 auto 8px' }}
    >
      <ellipse cx="20" cy="67" rx="13" ry="2.5" fill="#E8E6E0" />

      {/* hojas traseras */}
      <path
        d="M20 63 C12 58 4 46 5 30 C6 18 11 10 16 6 L18 10 C13 14 9 22 8 32 C7 44 13 56 20 63 Z"
        fill={fillDeep}
        stroke={stroke}
        strokeWidth="0.45"
        strokeLinejoin="round"
      />
      <path
        d="M20 63 C28 58 36 46 35 30 C34 18 29 10 24 6 L22 10 C27 14 31 22 32 32 C33 44 27 56 20 63 Z"
        fill={fillDeep}
        stroke={stroke}
        strokeWidth="0.45"
        strokeLinejoin="round"
      />

      {/* hojas medias */}
      <path
        d="M20 63 C14 54 10 40 11 26 C12 16 15 9 19 5 L20 9 C17 12 15 19 14 28 C13 40 16 54 20 63 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <path
        d="M20 63 C26 54 30 40 29 26 C28 16 25 9 21 5 L20 9 C23 12 25 19 26 28 C27 40 24 54 20 63 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* piña / centro */}
      <path
        d="M20 63 C19 50 18 36 19 22 C19 14 19 8 20 4 C21 8 21 14 21 22 C22 36 21 50 20 63 Z"
        fill={fillDeep}
        stroke={stroke}
        strokeWidth="0.45"
      />

      {/* puntas centrales */}
      <path
        d="M20 4 L17 14 L20 63 L23 14 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <path
        d="M20 12 L15 24 L20 58 L25 24 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.4"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  )
}
