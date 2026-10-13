/**
 * Plugin-local glyphs for the browsing region's presentation chrome. The
 * shared `ui-primitives` set carries no card-grid or conversation glyph, and
 * these are drawn to its convention instead of widened into that package's
 * published surface: a 16px viewBox, `currentColor` fills, and no intrinsic
 * size or color. Callers set both.
 */
/** Glyph props: the square edge and an optional class for the caller's slot. */
export interface GlyphProps {
    size?: number;
    className?: string | undefined;
}
/** The card grid: four equal tiles, the gallery reading of the same rows. */
export declare function CardViewGlyph({ size, className }: GlyphProps): import("react").JSX.Element;
/**
 * A Session's type mark: an open speech bubble with a lower-left tail. Cards
 * carry it where rows carry their status slot, so both presentations name the
 * entity before its title.
 */
export declare function SessionGlyph({ size, className }: GlyphProps): import("react").JSX.Element;
/**
 * The theme control's tag: a label pointing right with its punch hole, drawn
 * at the card action cluster's scale. Its color is the caller's — a themed
 * card tints it with the theme's rainbow slot.
 */
export declare function ThemeTagGlyph({ size, className }: GlyphProps): import("react").JSX.Element;
//# sourceMappingURL=view-icons.d.ts.map