import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots';
import type { ShortcutCatalogEntry } from '@deepseek-ai/dsh-client-shortcuts/client';
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives';
import type { WorkspaceBrowserProps } from '../contract/slots.ts';
import type { GroupNode, SearchResultNode, SessionNode } from '../tree.ts';
/** The standard locale seat, prop-passed from the browser root. */
type RowTranslate = WorkspaceBrowserProps['t'];
/**
 * Child-seat renderer threaded from the browser root: the row's action lists,
 * its leading decoration, and its hover-card section. The leading seat is
 * rendered only while the row's primary state is idle, so a status dot and a
 * leading occupant never share the row; the hover seat only while the row's
 * card is open. The card presentation in `Cards.tsx` renders the same seats
 * off a card, so the alias is shared inside the package.
 */
export type RowRenderSlots = PropsRenderSlots<'sidebar.workspaces.session.menu.item' | 'sidebar.workspaces.session.row.action' | 'sidebar.session.row.leading' | 'sidebar.session.row.hover'>['renderSlot'];
/**
 * Row display title: blank rows show the localized New Session label.
 * @param node - derived Session node.
 * @param t - the browser root's locale seat.
 * @returns the title the row or card shows.
 */
export declare function displayTitle(node: SessionNode, t: RowTranslate): string;
/**
 * Localized compact relative time ("刚刚"/"5分钟" in zh, "now"/"5min" in en).
 * @param updatedAt - epoch ms of the Session's last update.
 * @param now - epoch ms for the distance.
 * @param t - the browser root's locale seat.
 * @returns the compact label.
 */
export declare function timeLabel(updatedAt: number, now: number, t: RowTranslate): string;
/**
 * Row drag wiring supplied by the tree owner. `drop` reports the half of the
 * row where the pointer released so the owner can resolve an insert anchor.
 */
export interface RowDragProps {
    /** Start dragging this row. */
    start: () => void;
    /** A compatible row drag is in flight. */
    active: boolean;
    /** Current marker on this row: insert line above, below, or none. */
    marker: 'before' | 'after' | null;
    /** Report the hovered half while a compatible drag passes over this row. */
    hover: (half: 'before' | 'after') => void;
    drop: (half: 'before' | 'after') => void;
    end: () => void;
}
/** Drag lifecycle owned by a workspace row; its enclosing group owns hit testing. */
interface WorkspaceRowDragProps {
    start: () => void;
    end: () => void;
}
/**
 * Project (workspace) header row: folder + title;
 * hover reveals the chevron and create button, and dwelling on a real
 * Workspace shows its hover card (the ungrouped bucket has none).
 * `containsCurrent` arrives on the node (derivation fact, no renderer scan).
 * @param props.group - derived group node.
 * @param props.containsCurrentDescendant - highlight an ancestor even when its subtree is collapsed.
 * @param props.onToggle - expand/collapse the group.
 * @param props.onCreate - start a frontend Session inside this Workspace.
 * @param props.drag - optional workspace-row drag wiring.
 * @param props.home - host account home for POSIX hover-path abbreviation.
 * @param props.t - the browser root's locale seat.
 * @returns the row element.
 */
export declare function ProjectRowItem({ group, containsCurrentDescendant, onToggle, onCreate, actions, color, pinned, drag, home, newShortcut, t }: {
    group: GroupNode;
    newShortcut?: ShortcutCatalogEntry | undefined;
    containsCurrentDescendant?: boolean;
    onToggle: () => void;
    onCreate: () => void;
    /** Real-Workspace actions; absent for the ungrouped bucket (no menu shown). */
    actions?: {
        rename: () => void;
        delete: () => void;
        togglePin?: () => void;
        setColor?: (color: string | undefined) => void;
    } | undefined;
    /** The Workspace's saved folder color; undefined keeps the default tint. */
    color?: string | undefined;
    /** The Workspace is pinned, so its row leads the list and carries the marker. */
    pinned?: boolean | undefined;
    /** Present only for real Workspace rows in the grouped view. */
    drag?: WorkspaceRowDragProps | undefined;
    /** Host account home; POSIX home-rooted hover paths display as `~`. */
    home?: string | undefined;
    t: RowTranslate;
}): import("react").JSX.Element;
interface SessionStatus {
    state: StateDotState;
    label: string;
    /** Compact text that replaces the Session row's update time. */
    trailingLabel?: string;
}
/**
 * Session status presentation; pending interaction is primary and live activity
 * outranks completion reminders.
 * @param node - the row's live status facts.
 * @param t - the browser root's locale seat.
 * @returns the primary status first, then any companion status.
 */
export declare function sessionStatuses(node: Pick<SessionNode, 'pendingInteraction' | 'running' | 'runningSubagentCount' | 'completed'>, t: RowTranslate): readonly [SessionStatus, ...SessionStatus[]];
/**
 * Primary status dot plus every status's screen-reader label, shared by the
 * search, session, and card presentations.
 * @param props.statuses - the Session's statuses, primary first.
 * @returns the dot with its hidden labels.
 */
export declare function SessionStatusDots({ statuses }: {
    statuses: readonly [SessionStatus, ...SessionStatus[]];
}): import("react").JSX.Element;
/**
 * Hover-card body: full title, relative time, the Session's own scheduled-task
 * section, and every relevant live status. The task section sits above the
 * status lines so they stay the card's trailing status line. Shared by the row
 * and card presentations, so both hover cards read the same seats.
 * @param props.node - derived Session node.
 * @param props.now - epoch ms for relative-time formatting.
 * @param props.renderSlot - child-seat renderer for the hover-card section.
 * @param props.t - the browser root's locale seat.
 * @returns the hover-card content.
 */
export declare function SessionHoverContent({ node, now, renderSlot, t }: {
    node: SessionNode;
    now: number;
    renderSlot: RowRenderSlots;
    t: RowTranslate;
}): import("react").JSX.Element;
/**
 * One flat search result: title, Workspace context, and optional content
 * excerpt. Search navigation opens the session only; it does not address an
 * event inside the conversation. Archived rows carry a hover unarchive
 * button, because search is where the filter surfaces them for recovery.
 * @param props.result - merged local/content search row.
 * @param props.currentId - selected session id.
 * @param props.onOpen - open the selected session.
 * @param props.onUnarchive - unarchive an archived result row.
 * @param props.t - Workspace-browser translation seat.
 * @returns the result row.
 */
export declare function SearchResultItem({ result, currentId, onOpen, onUnarchive, t }: {
    result: SearchResultNode;
    currentId: string | undefined;
    onOpen: (id: SearchResultNode['id']) => void;
    onUnarchive: (id: SearchResultNode['id']) => void;
    t: RowTranslate;
}): import("react").JSX.Element;
/**
 * One top-level 32px session row: leading 16px cell (status dot, or the
 * leading seat while the row's primary state is idle), title, relative time or
 * compact pending label, and the row actions menu. A row that owns a state dot
 * keeps that cell and renders no seat, so an ambient automation mark never
 * appears beside the row's own state dot. An archived row keeps the cell blank:
 * neither marker renders there, and its live status stays on the hover card.
 * @param props.node - derived session node.
 * @param props.currentId - selected session id (row highlight).
 * @param props.now - epoch ms for relative-time formatting.
 * @param props.onOpen - open a session by id.
 * @param props.onRenameRequest - open the rename dialog from a title double-click (id + current title).
 * @param props.renderSlot - child-seat renderer for the row's action lists
 * (`sidebar.workspaces.session.menu.item` / `sidebar.workspaces.session.row.action`),
 * its leading decoration, and its hover-card section.
 * @param props.onReveal - scroll this row into view after search navigation, then acknowledge it.
 * @param props.drag - optional row-drag target wiring; blank rows cannot start a drag.
 * @param props.t - the browser root's locale seat.
 * @returns the session row.
 */
export declare function SessionNodeItem({ node, currentId, now, onOpen, onRenameRequest, renderSlot, onReveal, drag, t, }: {
    node: SessionNode;
    currentId: string | undefined;
    now: number;
    onOpen: (id: SessionNode['id']) => void;
    /** Open the rename dialog from a title double-click (id + current title). */
    onRenameRequest: (id: SessionNode['id'], currentTitle: string) => void;
    /** Scroll this row into view after search navigation, then acknowledge it. */
    onReveal?: (() => void) | undefined;
    /** Present on reorderable-list rows so every row can remain a drop target. */
    drag?: RowDragProps | undefined;
    t: RowTranslate;
} & PropsRenderSlots<'sidebar.workspaces.session.menu.item' | 'sidebar.workspaces.session.row.action' | 'sidebar.session.row.leading' | 'sidebar.session.row.hover'>): import("react").JSX.Element;
export {};
//# sourceMappingURL=Rows.d.ts.map