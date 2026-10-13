/**
 * Session themes ("主题") of the card presentation: a user-defined tag owned
 * by one project folder account, plus the per-account grouping the card grid
 * draws from it. The theme records and the Session assignment map live in the
 * view store; everything here is pure, so the grouping, the color sequence,
 * and the name rules are testable without React or a store instance.
 */
/** One user-defined theme under a project folder account. */
export interface SessionTheme {
    /** Unique within its owning account (see {@link createThemeId}). */
    id: string;
    /** Display name; unique inside its account, ignoring case and surrounding space. */
    name: string;
    /**
     * Rainbow position in creation order. Stored rather than derived from the
     * list index so that deleting a theme never moves a surviving theme's color.
     */
    colorSlot: number;
}
/**
 * Theme colors in creation order (red through violet), read as a cycle once an
 * account owns more themes than the sequence has steps.
 */
export declare const THEME_COLORS: readonly string[];
/** Menu entry naming the unthemed choice, distinct from any `theme:<id>` entry. */
export declare const THEME_NONE_ENTRY = "theme.none";
/** Menu entry opening the browser-owned new-theme dialog. */
export declare const THEME_NEW_ENTRY = "theme.new";
/** Menu entry id prefix carrying a real theme id. */
export declare const THEME_ENTRY_PREFIX = "theme:";
/** Section key of an account's unthemed tail; not a legal theme id. */
export declare const UNTHEMED_THEME_KEY = "__unthemed__";
/**
 * Color of one theme's rainbow slot.
 * @param colorSlot - the theme's creation-order slot.
 * @returns the hex color, wrapped into the sequence for a slot past its end.
 */
export declare function themeColor(colorSlot: number): string;
/**
 * Next free rainbow slot for one account. Slots are never reused, so deleting
 * a theme leaves every surviving theme's color where it was.
 * @param themes - the account's themes in creation order.
 * @returns one past the highest used slot, or 0 for an empty account.
 */
export declare function nextColorSlot(themes: readonly SessionTheme[]): number;
/**
 * Id of a theme, derived from its account and slot. A slot is never reused by
 * a live theme, so the id is unique within the account that stores it.
 * @param accountKey - the owning project folder account (a Workspace id, or
 * the ungrouped key for Sessions outside every Workspace).
 * @param colorSlot - the theme's creation-order slot.
 * @returns the theme id.
 */
export declare function createThemeId(accountKey: string, colorSlot: number): string;
/**
 * Whether a name is already taken inside one account. Comparison ignores
 * surrounding whitespace and letter case, so a rename cannot produce two
 * themes a user reads as the same name.
 * @param themes - the account's themes in creation order.
 * @param name - the candidate name (already trimmed by the caller).
 * @param exceptId - the theme being renamed, excluded from the comparison.
 * @returns true when another theme of this account carries the name.
 */
export declare function themeNameTaken(themes: readonly SessionTheme[], name: string, exceptId?: string): boolean;
/** One themed (or unthemed) section of an account's card grid. */
export interface ThemeSection<T> {
    /** Section identity: the theme id, or {@link UNTHEMED_THEME_KEY}. */
    key: string;
    /** The owning theme, or null for the unthemed tail. */
    theme: SessionTheme | null;
    /** The section's Sessions, in the order the group derived them. */
    sessions: readonly T[];
}
/**
 * Split one account's Sessions into theme sections: one per theme that still
 * has members, in theme creation order, followed by the unthemed tail. A
 * Session whose assignment names no live theme of this account reads as
 * unthemed, which is what a deleted theme and a Session moved out of its
 * project folder leave behind. Each section keeps the incoming order, so the
 * order accounts and the applied sort stay authoritative.
 * @param sessions - the account's visible Session nodes, in render order.
 * @param themes - the account's themes in creation order.
 * @param assigned - theme id per Session id; an absent entry means unthemed.
 * @returns the sections to render, empty when there is nothing to show.
 */
export declare function deriveThemeSections<T extends {
    id: string;
}>(sessions: readonly T[], themes: readonly SessionTheme[], assigned: Readonly<Record<string, string>>): ThemeSection<T>[];
//# sourceMappingURL=themes.d.ts.map