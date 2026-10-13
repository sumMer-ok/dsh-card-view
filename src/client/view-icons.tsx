/**
 * Plugin-local glyphs for the browsing region's presentation chrome. The
 * shared `ui-primitives` set carries no card-grid or conversation glyph, and
 * these are drawn to its convention instead of widened into that package's
 * published surface: a 16px viewBox, `currentColor` fills, and no intrinsic
 * size or color. Callers set both.
 */

/** Glyph props: the square edge and an optional class for the caller's slot. */
export interface GlyphProps {
  size?: number
  className?: string | undefined
}

/** The card grid: four equal tiles, the gallery reading of the same rows. */
export function CardViewGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1.6" y="1.6" width="5.8" height="5.8" rx="1.6" fill="currentColor" />
      <rect x="8.6" y="1.6" width="5.8" height="5.8" rx="1.6" fill="currentColor" />
      <rect x="1.6" y="8.6" width="5.8" height="5.8" rx="1.6" fill="currentColor" />
      <rect x="8.6" y="8.6" width="5.8" height="5.8" rx="1.6" fill="currentColor" />
    </svg>
  )
}

/**
 * A Session's type mark: an open speech bubble with a lower-left tail. Cards
 * carry it where rows carry their status slot, so both presentations name the
 * entity before its title.
 */
export function SessionGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4.4 3H11.6A2.2 2.2 0 0 1 13.8 5.2V9.2A2.2 2.2 0 0 1 11.6 11.4H7.6L4.6 13.7V11.4H4.4A2.2 2.2 0 0 1 2.2 9.2V5.2A2.2 2.2 0 0 1 4.4 3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The theme control's tag: a label pointing right with its punch hole, drawn
 * at the card action cluster's scale. Its color is the caller's — a themed
 * card tints it with the theme's rainbow slot.
 */
export function ThemeTagGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.8 4H10.6L14.2 8L10.6 12H2.8A1.2 1.2 0 0 1 1.6 10.8V5.2A1.2 1.2 0 0 1 2.8 4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="5.2" cy="8" r="1.1" fill="currentColor" />
    </svg>
  )
}
