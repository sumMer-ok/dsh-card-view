/**
 * The workspace browser's viewing store: the session-list grouping mode,
 * persisted across reloads. Module level exports the factory only (a
 * module-level handle would pin the store identity across plugin reloads);
 * register() receives the factory and the browser derives its PropsStore
 * share from the return type.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { reconcileManualOrder, type ArchivedFilter, type SessionRowState } from './tree.ts'
import { createThemeId, nextColorSlot, type SessionTheme } from './themes.ts'

/** Browser-local order account for the hierarchy-free flat Session list. */
export const FLAT_SESSION_ORDER_KEY = '__flat_session_order__'

/**
 * Session-list grouping mode: sibling Workspace sections, a Workspace tree,
 * one flat list, or the card grid grouped by Workspace and split into theme
 * sections.
 */
export type SessionGroupBy = 'workspace' | 'workspace-tree' | 'flat' | 'cards'
/** Session order: saved manual positions or current recency. */
export type SessionOrderBy = 'manual' | 'updated'

/** Workspace browser viewing state persisted across surface remounts and reloads. */
type WorkspaceViewState = {
  groupBy: SessionGroupBy
  orderBy: SessionOrderBy
  /** Explicit group expansion keyed by Workspace identity, including descendants in tree mode. */
  groupExpansion: Record<string, boolean>
  /** Saved manual order per Workspace group plus the browser-local flat-list account. */
  sessionOrderByAccount: Record<string, string[]>
  /** Archived-row visibility; omitted in pre-filter v5 snapshots and read as 'default'. */
  archivedFilter?: ArchivedFilter
  /** Workspace folder colors, keyed by Workspace id; absent in pre-color snapshots. */
  workspaceColor?: Record<string, string>
  /** Workspace pin flags, keyed by Workspace id; absent in pre-pin snapshots. */
  workspacePinned?: Record<string, boolean>
  /**
   * Session themes per project folder account: a Workspace id, or the
   * browser-local ungrouped account for Sessions outside every Workspace.
   * Array order is theme creation order, which is the order the card grid
   * draws its sections.
   */
  themes: Record<string, SessionTheme[]>
  /** Theme id per Session id; an absent entry means the Session has no theme. */
  sessionTheme: Record<string, string>
}

type SessionOrderSource = {
  members: Readonly<Record<string, readonly SessionId[]>>
  summaries: SessionListState['byId']
  rowState: Pick<SessionRowState, 'pinnedSessionIds' | 'archivedSessionIds'>
}

/**
 * Annotation twin of the actions literal below (the export needs a declared
 * return type); drift fails assignability at the defineStore call.
 */
type WorkspaceViewActions = {
  setGroupBy: (draft: WorkspaceViewState, mode: SessionGroupBy) => void
  setOrderBy: (
    draft: WorkspaceViewState,
    mode: SessionOrderBy,
    initialOrders: Readonly<Record<string, readonly string[]>>,
  ) => void
  setGroupExpanded: (draft: WorkspaceViewState, key: string, expanded: boolean) => void
  retainAccountKeys: (draft: WorkspaceViewState, workspaceKeys: readonly string[]) => void
  syncSessionOrders: (
    draft: WorkspaceViewState,
    orders: Readonly<Record<string, readonly string[]>>,
  ) => void
  setSessionOrder: (
    draft: WorkspaceViewState,
    accountKey: string,
    order: readonly string[],
    initialOrders: Readonly<Record<string, readonly string[]>>,
  ) => void
  pinSessionOrder: (
    draft: WorkspaceViewState,
    sessionId: string,
    accountKeys: readonly string[],
    source: SessionOrderSource,
  ) => void
  setArchivedFilter: (draft: WorkspaceViewState, filter: ArchivedFilter) => void
  setWorkspaceColor: (draft: WorkspaceViewState, workspaceId: string, color: string | undefined) => void
  setWorkspacePinned: (draft: WorkspaceViewState, workspaceId: string, pinned: boolean) => void
  createTheme: (draft: WorkspaceViewState, accountKey: string, name: string) => void
  renameTheme: (draft: WorkspaceViewState, accountKey: string, themeId: string, name: string) => void
  deleteTheme: (draft: WorkspaceViewState, accountKey: string, themeId: string) => void
  assignSessionTheme: (draft: WorkspaceViewState, sessionId: string, themeId: string | undefined) => void
}

/** Copy read-only projections into the persisted mutable store representation. */
function copySessionOrders(
  orders: Readonly<Record<string, readonly string[]>>,
): Record<string, string[]> {
  return Object.fromEntries(Object.entries(orders).map(([key, order]) => [key, [...order]]))
}

/**
 * Create the workspace browser viewing store handle.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createWorkspaceViewStore(): EngineStoreHandle<WorkspaceViewState, WorkspaceViewActions> {
  return defineStore({
    init: (): WorkspaceViewState => ({
      groupBy: 'workspace',
      orderBy: 'updated',
      groupExpansion: {},
      sessionOrderByAccount: {},
      archivedFilter: 'default',
      workspaceColor: {},
      workspacePinned: {},
      themes: {},
      sessionTheme: {},
    }),
    // v6 adds the per-account theme lists and the Session assignment map.
    // Persistence replaces the whole state, so a version bump is what gives
    // those fields their defaults instead of arriving as undefined: a stored
    // v5 blob is ignored and the browser starts from the defaults above.
    persist: 'dsh.workspace.view.v6',
    actions: {
      setGroupBy: (d, mode: SessionGroupBy) => { d.groupBy = mode },
      setOrderBy: (d, mode: SessionOrderBy, initialOrders) => {
        if (mode === d.orderBy) return
        d.sessionOrderByAccount = mode === 'manual' ? copySessionOrders(initialOrders) : {}
        d.orderBy = mode
      },
      setGroupExpanded: (d, key: string, expanded: boolean) => { d.groupExpansion[key] = expanded },
      retainAccountKeys: (d, workspaceKeys: readonly string[]) => {
        const retained = new Set(workspaceKeys)
        d.groupExpansion = Object.fromEntries(
          Object.entries(d.groupExpansion).filter(([key]) => retained.has(key)),
        )
        d.sessionOrderByAccount = Object.fromEntries(
          Object.entries(d.sessionOrderByAccount).filter(([key]) => retained.has(key)),
        )
        d.themes = Object.fromEntries(
          Object.entries(d.themes).filter(([key]) => retained.has(key)),
        )
        d.workspaceColor = Object.fromEntries(
          Object.entries(d.workspaceColor ?? {}).filter(([key]) => retained.has(key)),
        )
        d.workspacePinned = Object.fromEntries(
          Object.entries(d.workspacePinned ?? {}).filter(([key]) => retained.has(key)),
        )
        delete (d as WorkspaceViewState & { sessionUpdatedAtByAccount?: unknown }).sessionUpdatedAtByAccount
      },
      syncSessionOrders: (d, orders) => {
        if (d.orderBy !== 'manual') return
        Object.assign(d.sessionOrderByAccount, copySessionOrders(orders))
      },
      setSessionOrder: (d, accountKey, order, initialOrders) => {
        if (d.orderBy === 'updated') d.sessionOrderByAccount = copySessionOrders(initialOrders)
        else Object.assign(d.sessionOrderByAccount, copySessionOrders(initialOrders))
        d.orderBy = 'manual'
        d.sessionOrderByAccount[accountKey] = [...order]
      },
      pinSessionOrder: (d, sessionId, accountKeys, source) => {
        const selected = new Set(accountKeys)
        d.sessionOrderByAccount = Object.fromEntries(Object.entries(source.members).map(([key, members]) => {
          const order = reconcileManualOrder(members, d.sessionOrderByAccount[key], source.summaries, source.rowState)
          return [key, selected.has(key) ? [sessionId, ...order.filter(id => id !== sessionId)] : order]
        }))
      },
      setArchivedFilter: (d, filter: ArchivedFilter) => { d.archivedFilter = filter },
      // Clearing a color drops the key entirely so the persisted map holds only
      // tinted folders; setting it overwrites whatever tint was there.
      setWorkspaceColor: (d, workspaceId: string, color: string | undefined) => {
        d.workspaceColor = Object.fromEntries(
          Object.entries(d.workspaceColor ?? {}).filter(([key]) => key !== workspaceId || color !== undefined),
        )
        if (color !== undefined) d.workspaceColor[workspaceId] = color
      },
      // Unpinning drops the key so the persisted map holds only pinned folders,
      // which is what the leading-dot marker and the group ordering both read.
      setWorkspacePinned: (d, workspaceId: string, pinned: boolean) => {
        d.workspacePinned = Object.fromEntries(
          Object.entries(d.workspacePinned ?? {}).filter(([key]) => key !== workspaceId || pinned),
        )
        if (pinned) d.workspacePinned[workspaceId] = true
      },
      // Creation mints the id from the account and the next free rainbow slot,
      // so a theme's color and identity survive every later edit of the list.
      createTheme: (d, accountKey: string, name: string) => {
        const themes = d.themes[accountKey] ?? []
        const colorSlot = nextColorSlot(themes)
        d.themes[accountKey] = [
          ...themes,
          { id: createThemeId(accountKey, colorSlot), name, colorSlot },
        ]
      },
      renameTheme: (d, accountKey: string, themeId: string, name: string) => {
        const themes = d.themes[accountKey]
        if (themes === undefined) return
        d.themes[accountKey] = themes.map(theme => (theme.id === themeId ? { ...theme, name } : theme))
      },
      // Deleting a theme detaches its Sessions in the same write: they fall
      // back to the unthemed section rather than keeping a dangling id.
      deleteTheme: (d, accountKey: string, themeId: string) => {
        const themes = d.themes[accountKey]
        if (themes !== undefined) {
          const remaining = themes.filter(theme => theme.id !== themeId)
          if (remaining.length === 0) delete d.themes[accountKey]
          else d.themes[accountKey] = remaining
        }
        d.sessionTheme = Object.fromEntries(
          Object.entries(d.sessionTheme).filter(([, assigned]) => assigned !== themeId),
        )
      },
      assignSessionTheme: (d, sessionId: string, themeId: string | undefined) => {
        if (themeId === undefined) {
          d.sessionTheme = Object.fromEntries(
            Object.entries(d.sessionTheme).filter(([key]) => key !== sessionId),
          )
          return
        }
        d.sessionTheme[sessionId] = themeId
      },
    },
  })
}

/** The bound write set of one viewing-store instance (what the UiWorkspace service drives). */
export type WorkspaceViewStoreActions = ReturnType<ReturnType<typeof createWorkspaceViewStore>['create']>['actions']
