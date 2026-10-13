/**
 * The workspace browser's viewing store: the session-list grouping mode,
 * persisted across reloads. Module level exports the factory only (a
 * module-level handle would pin the store identity across plugin reloads);
 * register() receives the factory and the browser derives its PropsStore
 * share from the return type.
 */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { type ArchivedFilter, type SessionRowState } from './tree.ts';
import { type SessionTheme } from './themes.ts';
/** Browser-local order account for the hierarchy-free flat Session list. */
export declare const FLAT_SESSION_ORDER_KEY = "__flat_session_order__";
/**
 * Session-list grouping mode: sibling Workspace sections, a Workspace tree,
 * one flat list, or the card grid grouped by Workspace and split into theme
 * sections.
 */
export type SessionGroupBy = 'workspace' | 'workspace-tree' | 'flat' | 'cards';
/** Session order: saved manual positions or current recency. */
export type SessionOrderBy = 'manual' | 'updated';
/** Workspace browser viewing state persisted across surface remounts and reloads. */
type WorkspaceViewState = {
    groupBy: SessionGroupBy;
    orderBy: SessionOrderBy;
    /** Explicit group expansion keyed by Workspace identity, including descendants in tree mode. */
    groupExpansion: Record<string, boolean>;
    /** Saved manual order per Workspace group plus the browser-local flat-list account. */
    sessionOrderByAccount: Record<string, string[]>;
    /** Archived-row visibility; omitted in pre-filter v5 snapshots and read as 'default'. */
    archivedFilter?: ArchivedFilter;
    /** Workspace folder colors, keyed by Workspace id; absent in pre-color snapshots. */
    workspaceColor?: Record<string, string>;
    /** Workspace pin flags, keyed by Workspace id; absent in pre-pin snapshots. */
    workspacePinned?: Record<string, boolean>;
    /**
     * Session themes per project folder account: a Workspace id, or the
     * browser-local ungrouped account for Sessions outside every Workspace.
     * Array order is theme creation order, which is the order the card grid
     * draws its sections.
     */
    themes: Record<string, SessionTheme[]>;
    /** Theme id per Session id; an absent entry means the Session has no theme. */
    sessionTheme: Record<string, string>;
};
type SessionOrderSource = {
    members: Readonly<Record<string, readonly SessionId[]>>;
    summaries: SessionListState['byId'];
    rowState: Pick<SessionRowState, 'pinnedSessionIds' | 'archivedSessionIds'>;
};
/**
 * Annotation twin of the actions literal below (the export needs a declared
 * return type); drift fails assignability at the defineStore call.
 */
type WorkspaceViewActions = {
    setGroupBy: (draft: WorkspaceViewState, mode: SessionGroupBy) => void;
    setOrderBy: (draft: WorkspaceViewState, mode: SessionOrderBy, initialOrders: Readonly<Record<string, readonly string[]>>) => void;
    setGroupExpanded: (draft: WorkspaceViewState, key: string, expanded: boolean) => void;
    retainAccountKeys: (draft: WorkspaceViewState, workspaceKeys: readonly string[]) => void;
    syncSessionOrders: (draft: WorkspaceViewState, orders: Readonly<Record<string, readonly string[]>>) => void;
    setSessionOrder: (draft: WorkspaceViewState, accountKey: string, order: readonly string[], initialOrders: Readonly<Record<string, readonly string[]>>) => void;
    pinSessionOrder: (draft: WorkspaceViewState, sessionId: string, accountKeys: readonly string[], source: SessionOrderSource) => void;
    setArchivedFilter: (draft: WorkspaceViewState, filter: ArchivedFilter) => void;
    setWorkspaceColor: (draft: WorkspaceViewState, workspaceId: string, color: string | undefined) => void;
    setWorkspacePinned: (draft: WorkspaceViewState, workspaceId: string, pinned: boolean) => void;
    createTheme: (draft: WorkspaceViewState, accountKey: string, name: string) => void;
    renameTheme: (draft: WorkspaceViewState, accountKey: string, themeId: string, name: string) => void;
    deleteTheme: (draft: WorkspaceViewState, accountKey: string, themeId: string) => void;
    assignSessionTheme: (draft: WorkspaceViewState, sessionId: string, themeId: string | undefined) => void;
};
/**
 * Create the workspace browser viewing store handle.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export declare function createWorkspaceViewStore(): EngineStoreHandle<WorkspaceViewState, WorkspaceViewActions>;
/** The bound write set of one viewing-store instance (what the UiWorkspace service drives). */
export type WorkspaceViewStoreActions = ReturnType<ReturnType<typeof createWorkspaceViewStore>['create']>['actions'];
export {};
//# sourceMappingURL=stores.d.ts.map