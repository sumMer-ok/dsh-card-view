import type { ShortcutCatalogEntry } from '@deepseek-ai/dsh-client-shortcuts/client';
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { WorkspaceBrowserProps } from '../contract/slots.ts';
import type { GroupNode, SessionNode } from '../tree.ts';
import { type SessionTheme } from '../themes.ts';
import { type RowRenderSlots } from './Rows.tsx';
/** The standard locale seat, prop-passed from the browser root. */
type CardTranslate = WorkspaceBrowserProps['t'];
/**
 * Theme facts and verbs one card reads: the assignment map, the theme list of
 * the account a Session belongs to, and the two writes the panel raises.
 */
export interface SessionThemeSeat {
    /** Theme id per Session id; an absent entry means the Session has no theme. */
    assigned: Readonly<Record<string, string>>;
    /** Themes owned by the account a given Session belongs to. */
    themesOf: (sessionId: SessionId) => readonly SessionTheme[];
    /** Account (project folder) key that owns a given Session's themes. */
    accountOf: (sessionId: SessionId) => string;
    /** Move a Session into a theme, or out of every theme with undefined. */
    assign: (sessionId: SessionId, themeId: string | undefined) => void;
    /** Open the browser-owned new-theme dialog for one account. */
    create: (accountKey: string) => void;
}
/**
 * Per-Session card contract: the live facts a card reads, the row seats it
 * renders, and the one action the whole surface raises. One seat serves the
 * grouped and flat card bodies.
 */
export interface SessionCardSeat {
    /** Selected Session id (the card's selected state). */
    currentId: SessionId | undefined;
    /** Epoch ms for relative-time formatting. */
    now: number;
    /** Open a Session by id. */
    onOpen: (id: SessionId) => void;
    /** Theme facts and verbs; absent leaves the card without a theme control. */
    theme?: SessionThemeSeat | undefined;
    /** Child-seat renderer for the verb menu, the hover buttons, and the hover card. */
    renderSlot: RowRenderSlots;
    t: CardTranslate;
}
/**
 * One Session card: type glyph and title on the first row, live status, pin
 * marker, and relative time on the last, with the theme tag and the row action
 * menu revealed on hover or keyboard focus. A blank New Session card is a
 * provisional placeholder, so like its row it carries no time label and no
 * verbs.
 * @param props.node - derived Session node.
 * @param props.seat - the shared per-card facts, seats, and verbs.
 * @returns the card element.
 */
export declare function SessionCard({ node, seat }: {
    node: SessionNode;
    seat: SessionCardSeat;
}): import("react").JSX.Element;
/**
 * One card grid in its own scrolling-host slot: a Workspace group of the
 * grouped body renders through here, so the column rhythm and the list
 * semantics are defined once.
 * @param props.nodes - Session nodes in render order.
 * @param props.seat - the shared per-card facts and verbs.
 * @param props.label - accessible name of this grid.
 * @returns the grid element.
 */
export declare function CardGrid({ nodes, seat, label }: {
    nodes: readonly SessionNode[];
    seat: SessionCardSeat;
    label: string;
}): import("react").JSX.Element;
/** Folder-card callbacks and local flags the grouped card body reads. */
export interface FolderCardSeat {
    /** Host account home for POSIX hover-path abbreviation. */
    home?: string | undefined;
    /** New-Session shortcut, shown on the folder card's create control. */
    newShortcut?: ShortcutCatalogEntry | undefined;
    /** Workspace pin flags, keyed by Workspace id. */
    pinned: Readonly<Record<string, boolean>>;
    /** Workspace folder colors, keyed by Workspace id; an absent entry keeps the default tint. */
    color: Readonly<Record<string, string>>;
    /** Persist one Workspace's pin flag. */
    setPinned: (workspaceId: string, pinned: boolean) => void;
    /** Persist one Workspace's folder color; undefined clears it. */
    setColor: (workspaceId: string, color: string | undefined) => void;
    /** Open the browser-owned Workspace rename dialog. */
    onRename: (workspaceId: WorkspaceId, currentTitle: string) => void;
    /** Open the browser-owned Workspace delete dialog. */
    onDelete: (workspaceId: WorkspaceId, currentTitle: string) => void;
    /** Expand or collapse one group. */
    onToggleGroup: (group: GroupNode) => void;
    /** Start a Session inside one real Workspace. */
    onNewSession: (group: GroupNode) => void;
    /** Open or close one group's overflow fold. */
    onToggleOverflow: (groupKey: string) => void;
}
/** One group section paired with the Session rows its fold leaves visible. */
export interface FoldedGroup {
    group: GroupNode;
    /** Visible Session rows: the whole group, or its head under the current budget. */
    sessions: readonly SessionNode[];
    /** Rows the base budget hides; the overflow control renders while this is > 0. */
    foldedCount: number;
    /** Rows the current budget still hides; 0 means the fold is open. */
    hiddenCount: number;
}
/**
 * Theme facts and verbs of the grouped card body: the per-account theme lists,
 * the Session assignment map, and the two theme verbs a section header raises.
 * The assignment map is the one the card seat reads, so a card's panel and the
 * section it lands in always derive from the same source.
 */
export interface ThemeGroupSeat {
    /** Themes per project folder account, in creation order. */
    byAccount: Readonly<Record<string, readonly SessionTheme[]>>;
    /** Theme id per Session id; an absent entry means the Session has no theme. */
    assigned: Readonly<Record<string, string>>;
    /** Open the browser-owned theme rename dialog for one theme. */
    onRename: (accountKey: string, theme: SessionTheme) => void;
    /** Delete one theme; its Sessions return to the unthemed group. */
    onDelete: (accountKey: string, themeId: string) => void;
}
/**
 * The grouped card body: one section per Workspace, each a folder card over
 * its Session cards. A collapsed group keeps its folder card, so the fold
 * reads the same in both presentations, and the overflow control appears under
 * the same budget it does in the row tree.
 * @param props.foldedGroups - derived group sections in render order, each
 * already paired with the rows its current budget leaves visible.
 * @param props.seat - the shared per-Session card facts and verbs.
 * @param props.folders - the folder card's callbacks and flags.
 * @param props.themes - the account theme lists and the theme verbs.
 * @returns the group sections, in place inside the owner's scrolling list.
 */
export declare function CardGroups({ foldedGroups, seat, folders, themes }: {
    foldedGroups: readonly FoldedGroup[];
    seat: SessionCardSeat;
    folders: FolderCardSeat;
    themes: ThemeGroupSeat;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=Cards.d.ts.map