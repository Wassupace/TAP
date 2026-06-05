export const Icons = {
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <rect x={3} y={4} width={18} height={17} rx={2}/>
      <path d="M3 9h18M8 2v4M16 2v4"/>
    </svg>
  ),
  roster: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx={9} cy={8} r={3.2}/>
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6a3 3 0 0 1 0 6M18 19a5 5 0 0 0-3-4.6"/>
    </svg>
  ),
  ball: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={12} cy={12} r={9.2}/>
      <path d="M3 12h18M12 3v18M5.5 5.5C8 9 8 15 5.5 18.5M18.5 5.5C16 9 16 15 18.5 18.5"/>
    </svg>
  ),
  flame: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2c.5 3-1.5 4.5-3 6.5C8.2 10.7 7 12.6 7 15a5 5 0 0 0 10 0c0-2-1-3.6-2-5 .3 1.2-.2 2.2-1 2.6.6-2.4-.4-5.2-1-6.6C12.6 4.5 13 3 13 2Z"/>
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={12} cy={12} r={9}/>
      <circle cx={12} cy={12} r={5}/>
      <circle cx={12} cy={12} r={1.4} fill="currentColor"/>
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 17h6M12 17v3M9 20h6"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx={12} cy={12} r={9}/>
      <path d="M12 7v5l3 2"/>
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  shuffle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={11} cy={11} r={7}/>
      <path d="m20 20-3-3"/>
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="m9 6 6 6-6 6"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M5 12l5 5L20 7"/>
    </svg>
  ),
  handle: (
    <svg viewBox="0 0 24 24" fill="currentColor" opacity={0.5}>
      <circle cx={9} cy={7} r={1.5}/><circle cx={15} cy={7} r={1.5}/>
      <circle cx={9} cy={12} r={1.5}/><circle cx={15} cy={12} r={1.5}/>
      <circle cx={9} cy={17} r={1.5}/><circle cx={15} cy={17} r={1.5}/>
    </svg>
  ),
}

export type IconName = keyof typeof Icons
