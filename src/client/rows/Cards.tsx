/**
 * Card-grid presentation of the browsing region: the same derived groups and
 * Session nodes the row tree draws, rendered as folder and Session cards. It
 * is a second body for the grouped tree rather than a second browser —
 * derivation, order accounts, expansion state, and the overflow fold stay in
 * the owner, so switching presentation re-renders one list instead of
 * re-reading anything.
 *
 * Cards keep the row verbs through the same seats the rows use: the "..." menu
 * renders the `sidebar.workspaces.session.menu.item` entries with the menu's
 * open state as hook context, the hover strip renders
 * `sidebar.workspaces.session.row.action`, and the hover card renders
 * `sidebar.session.row.hover`. A clipped title is exposed twice: the hover
 * card carries the full title with the Session's live statuses, and the
 * button's accessible name is the untruncated text. Cards carry no drag
 * wiring: an insert marker is a one-dimensional boundary, which a two-column
 * grid does not have.
 *
 * Each card also carries its theme control: a tag button opening the theme
 * panel of the Session's own project folder, where an existing theme can be
 * chosen, the Session can leave every theme, or a new theme can be named. A
 * folder whose account owns themes draws its cards in theme sections inside a
 * solid border tinted by the theme's rainbow slot, with the unthemed group
 * last inside a dashed neutral border; an account with no themes keeps the
 * plain grid, so nothing changes for a user who never defines one.
 */
import { type CSSProperties, useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  HoverCard, IconEditOutlineRegular, IconEllipsisOutlineRegular, IconPlusOutlineRegular,
  IconTrashOutlineRegular, Menu,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ShortcutCatalogEntry } from '@deepseek-ai/dsh-client-shortcuts/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { MenuOpenState, WorkspaceBrowserProps } from '../contract/slots.ts'
import type { GroupNode, SessionNode } from '../tree.ts'
import {
  deriveThemeSections, THEME_ENTRY_PREFIX, THEME_NEW_ENTRY, THEME_NONE_ENTRY,
  themeColor, type SessionTheme,
} from '../themes.ts'
import { SessionGlyph, ThemeTagGlyph } from '../view-icons.tsx'
import {
  displayTitle, ProjectRowItem, SessionHoverContent, SessionStatusDots,
  sessionStatuses, timeLabel, type RowRenderSlots,
} from './Rows.tsx'
import css from './Cards.module.css'

/** The standard locale seat, prop-passed from the browser root. */
type CardTranslate = WorkspaceBrowserProps['t']

/**
 * Theme facts and verbs one card reads: the assignment map, the theme list of
 * the account a Session belongs to, and the two writes the panel raises.
 */
export interface SessionThemeSeat {
  /** Theme id per Session id; an absent entry means the Session has no theme. */
  assigned: Readonly<Record<string, string>>
  /** Themes owned by the account a given Session belongs to. */
  themesOf: (sessionId: SessionId) => readonly SessionTheme[]
  /** Account (project folder) key that owns a given Session's themes. */
  accountOf: (sessionId: SessionId) => string
  /** Move a Session into a theme, or out of every theme with undefined. */
  assign: (sessionId: SessionId, themeId: string | undefined) => void
  /** Open the browser-owned new-theme dialog for one account. */
  create: (accountKey: string) => void
}

/**
 * Per-Session card contract: the live facts a card reads, the row seats it
 * renders, and the one action the whole surface raises. One seat serves the
 * grouped and flat card bodies.
 */
export interface SessionCardSeat {
  /** Selected Session id (the card's selected state). */
  currentId: SessionId | undefined
  /** Epoch ms for relative-time formatting. */
  now: number
  /** Open a Session by id. */
  onOpen: (id: SessionId) => void
  /** Theme facts and verbs; absent leaves the card without a theme control. */
  theme?: SessionThemeSeat | undefined
  /** Child-seat renderer for the verb menu, the hover buttons, and the hover card. */
  renderSlot: RowRenderSlots
  t: CardTranslate
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
export function SessionCard({ node, seat }: { node: SessionNode; seat: SessionCardSeat }) {
  const { t, renderSlot } = seat
  const title = displayTitle(node, t)
  const selected = node.id === seat.currentId
  const statuses = sessionStatuses(node, t)
  const showStatus = statuses[0].state !== 'idle'
  const [menuOpen, setMenuOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  // The menu's open state, bound into the row entries' `useMenuOpenState` hook.
  const menuOpenState = useMemo((): MenuOpenState => [menuOpen, setMenuOpen], [menuOpen])
  // An account with no themes still offers the panel: creating the first theme
  // is the only way into the grouped reading, so the control never hides.
  const themeSeat = seat.theme
  const themes = themeSeat === undefined ? [] : themeSeat.themesOf(node.id)
  const assignedId = themeSeat?.assigned[node.id]
  const assignedTheme = themes.find(theme => theme.id === assignedId)
  const themeItems: MenuEntry[] = [
    { type: 'label', id: 'theme-label', text: t('theme.menu.label') },
    {
      id: THEME_NONE_ENTRY,
      label: t('theme.none'),
      icon: <span className={css.themeSwatchNone} aria-hidden="true" />,
    },
    ...themes.map(theme => ({
      id: `${THEME_ENTRY_PREFIX}${theme.id}`,
      label: theme.name,
      icon: (
        <span
          className={css.themeSwatch}
          style={{ background: themeColor(theme.colorSlot) }}
          aria-hidden="true"
        />
      ),
    })),
    { type: 'separator', id: 'theme-separator' },
    { id: THEME_NEW_ENTRY, label: t('theme.create'), icon: <IconPlusOutlineRegular /> },
  ]
  return (
    <HoverCard
      anchor={(
        <div
          className={clsx(
            css.sessionCard, selected && css.selected,
            (menuOpen || themeOpen) && css.menuOpen,
          )}
          role="listitem"
        >
          <button
            type="button"
            className={css.cardBody}
            aria-current={selected ? 'true' : undefined}
            onClick={() => { seat.onOpen(node.id) }}
          >
            <span className={css.cardHead}>
              <span className={css.cardGlyph}><SessionGlyph size={14} /></span>
              <span className={css.cardTitle}>{title}</span>
            </span>
            <span className={css.cardMeta}>
              <span className={css.cardStatus}>
                {showStatus && <SessionStatusDots statuses={statuses} />}
              </span>
              {node.pinned && <span className={css.pinBadge} title={t('row.pinned')} aria-hidden="true" />}
              {!node.blank && <span className={css.cardTime}>{timeLabel(node.updatedAt, seat.now, t)}</span>}
            </span>
          </button>
          {/* A blank card acts on content that does not exist yet: no verbs. */}
          {!node.blank && (
            <span className={css.cardActions}>
              {themeSeat !== undefined && (
                <Menu
                  open={themeOpen}
                  onClose={() => { setThemeOpen(false) }}
                  items={themeItems}
                  selectedIds={[
                    assignedId === undefined ? THEME_NONE_ENTRY : `${THEME_ENTRY_PREFIX}${assignedId}`,
                  ]}
                  onSelect={(id) => {
                    setThemeOpen(false)
                    if (id === THEME_NONE_ENTRY) themeSeat.assign(node.id, undefined)
                    else if (id === THEME_NEW_ENTRY) themeSeat.create(themeSeat.accountOf(node.id))
                    else themeSeat.assign(node.id, id.slice(THEME_ENTRY_PREFIX.length))
                  }}
                  align="start"
                  portal
                  closeOnPointerLeave
                  anchor={(
                    <button
                      type="button"
                      className={clsx(css.cardThemeButton, assignedTheme !== undefined && css.cardThemeAssigned)}
                      style={assignedTheme === undefined
                        ? undefined
                        : { color: themeColor(assignedTheme.colorSlot) }}
                      title={assignedTheme?.name ?? t('theme.menu.label')}
                      aria-label={t('theme.card.aria', { name: title })}
                      aria-haspopup="menu"
                      aria-expanded={themeOpen}
                      onClick={() => { setThemeOpen(v => !v) }}
                    >
                      <ThemeTagGlyph size={12} />
                    </button>
                  )}
                />
              )}
              <Menu
                open={menuOpen}
                onClose={() => { setMenuOpen(false) }}
                portal
                closeOnPointerLeave
                anchor={(
                  <button
                    type="button"
                    className={css.cardMenuButton}
                    aria-label={t('actions.session.aria', { name: title })}
                    onClick={() => { setMenuOpen(v => !v) }}
                  >
                    <IconEllipsisOutlineRegular />
                  </button>
                )}
              >
                {renderSlot(
                  'sidebar.workspaces.session.menu.item',
                  { sessionId: node.id, displayTitle: node.title },
                  { hookContext: menuOpenState },
                )}
              </Menu>
              {renderSlot('sidebar.workspaces.session.row.action', { sessionId: node.id, displayTitle: node.title })}
            </span>
          )}
        </div>
      )}
      content={<SessionHoverContent node={node} now={seat.now} renderSlot={renderSlot} t={t} />}
      disabled={menuOpen || themeOpen}
      copyText={node.blank ? undefined : node.title}
      copyLabel={t('copy')}
      copiedLabel={t('hover.copied')}
    />
  )
}

/**
 * One card grid in its own scrolling-host slot: a Workspace group of the
 * grouped body renders through here, so the column rhythm and the list
 * semantics are defined once.
 * @param props.nodes - Session nodes in render order.
 * @param props.seat - the shared per-card facts and verbs.
 * @param props.label - accessible name of this grid.
 * @returns the grid element.
 */
export function CardGrid({ nodes, seat, label }: {
  nodes: readonly SessionNode[]
  seat: SessionCardSeat
  label: string
}) {
  return (
    <div className={css.cardGrid} role="list" aria-label={label}>
      {nodes.map(node => <SessionCard key={node.id} node={node} seat={seat} />)}
    </div>
  )
}

/** Folder-card callbacks and local flags the grouped card body reads. */
export interface FolderCardSeat {
  /** Host account home for POSIX hover-path abbreviation. */
  home?: string | undefined
  /** New-Session shortcut, shown on the folder card's create control. */
  newShortcut?: ShortcutCatalogEntry | undefined
  /** Workspace pin flags, keyed by Workspace id. */
  pinned: Readonly<Record<string, boolean>>
  /** Workspace folder colors, keyed by Workspace id; an absent entry keeps the default tint. */
  color: Readonly<Record<string, string>>
  /** Persist one Workspace's pin flag. */
  setPinned: (workspaceId: string, pinned: boolean) => void
  /** Persist one Workspace's folder color; undefined clears it. */
  setColor: (workspaceId: string, color: string | undefined) => void
  /** Open the browser-owned Workspace rename dialog. */
  onRename: (workspaceId: WorkspaceId, currentTitle: string) => void
  /** Open the browser-owned Workspace delete dialog. */
  onDelete: (workspaceId: WorkspaceId, currentTitle: string) => void
  /** Expand or collapse one group. */
  onToggleGroup: (group: GroupNode) => void
  /** Start a Session inside one real Workspace. */
  onNewSession: (group: GroupNode) => void
  /** Open or close one group's overflow fold. */
  onToggleOverflow: (groupKey: string) => void
}

/** One group section paired with the Session rows its fold leaves visible. */
export interface FoldedGroup {
  group: GroupNode
  /** Visible Session rows: the whole group, or its head under the current budget. */
  sessions: readonly SessionNode[]
  /** Rows the base budget hides; the overflow control renders while this is > 0. */
  foldedCount: number
  /** Rows the current budget still hides; 0 means the fold is open. */
  hiddenCount: number
}

/**
 * Theme facts and verbs of the grouped card body: the per-account theme lists,
 * the Session assignment map, and the two theme verbs a section header raises.
 * The assignment map is the one the card seat reads, so a card's panel and the
 * section it lands in always derive from the same source.
 */
export interface ThemeGroupSeat {
  /** Themes per project folder account, in creation order. */
  byAccount: Readonly<Record<string, readonly SessionTheme[]>>
  /** Theme id per Session id; an absent entry means the Session has no theme. */
  assigned: Readonly<Record<string, string>>
  /** Open the browser-owned theme rename dialog for one theme. */
  onRename: (accountKey: string, theme: SessionTheme) => void
  /** Delete one theme; its Sessions return to the unthemed group. */
  onDelete: (accountKey: string, themeId: string) => void
}

/**
 * One theme section header: the theme's color, name, and member count, plus
 * the rename/delete menu. The unthemed group draws the same header without a
 * menu, so both sections name themselves where their grid begins.
 * @param props.theme - the section's theme, or null for the unthemed group.
 * @param props.count - the section's Session count.
 * @param props.accountKey - the project folder account owning the theme.
 * @param props.seat - the theme verbs and account lists.
 * @param props.t - the browser root's locale seat.
 * @returns the section header element.
 */
function ThemeSectionHeader({ theme, count, accountKey, seat, t }: {
  theme: SessionTheme | null
  count: number
  accountKey: string
  seat: ThemeGroupSeat
  t: CardTranslate
}) {
  const [open, setOpen] = useState(false)
  const name = theme === null ? t('theme.none') : theme.name
  return (
    <div className={css.themeHeader}>
      <span
        className={clsx(css.themeDot, theme === null && css.themeDotUnthemed)}
        style={theme === null ? undefined : { background: themeColor(theme.colorSlot) }}
        aria-hidden="true"
      />
      <span className={css.themeName}>{name}</span>
      <span className={css.themeCount}>
        {t(count === 1 ? 'sessions.count.one' : 'sessions.count.other', { n: count })}
      </span>
      {theme !== null && (
        <Menu
          open={open}
          onClose={() => { setOpen(false) }}
          items={[
            { id: 'rename', label: t('theme.rename'), icon: <IconEditOutlineRegular /> },
            { id: 'delete', label: t('theme.delete'), icon: <IconTrashOutlineRegular />, danger: true },
          ]}
          onSelect={(id) => {
            setOpen(false)
            if (id === 'rename') seat.onRename(accountKey, theme)
            else seat.onDelete(accountKey, theme.id)
          }}
          align="end"
          portal
          closeOnPointerLeave
          anchor={(
            <button
              type="button"
              className={css.themeMenuButton}
              aria-label={t('theme.actions.aria', { name })}
              aria-haspopup="menu"
              onClick={() => { setOpen(v => !v) }}
            >
              <IconEllipsisOutlineRegular />
            </button>
          )}
        />
      )}
    </div>
  )
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
export function CardGroups({ foldedGroups, seat, folders, themes }: {
  foldedGroups: readonly FoldedGroup[]
  seat: SessionCardSeat
  folders: FolderCardSeat
  themes: ThemeGroupSeat
}) {
  const { t } = seat
  return (
    <>
      {foldedGroups.map(({ group, sessions, foldedCount, hiddenCount }) => {
        const label = group.workspaceId === undefined ? t('group.ungrouped') : group.label
        const accountThemes = themes.byAccount[group.key] ?? []
        // An account with no themes keeps the plain grid: the grouped reading
        // appears once a theme exists, so a user who never defines one sees
        // exactly the cards they saw before.
        const sections = accountThemes.length === 0
          ? null
          : deriveThemeSections(sessions, accountThemes, themes.assigned)
        const workspaceId = group.workspaceId
        return (
          <section className={css.cardGroup} key={group.key}>
            <div className={css.folderCard}>
              <ProjectRowItem
                newShortcut={folders.newShortcut}
                group={group}
                containsCurrentDescendant={group.containsCurrent}
                home={folders.home}
                pinned={workspaceId === undefined ? undefined : folders.pinned[workspaceId] === true}
                color={workspaceId === undefined ? undefined : folders.color[workspaceId]}
                t={t}
                onToggle={() => { folders.onToggleGroup(group) }}
                onCreate={() => { folders.onNewSession(group) }}
                actions={workspaceId === undefined ? undefined : {
                  rename: () => { folders.onRename(workspaceId, group.label) },
                  delete: () => { folders.onDelete(workspaceId, group.label) },
                  togglePin: () => { folders.setPinned(workspaceId, folders.pinned[workspaceId] !== true) },
                  setColor: (color) => { folders.setColor(workspaceId, color) },
                }}
              />
            </div>
            {group.expanded && sessions.length > 0 && (sections === null
              ? <CardGrid nodes={sessions} seat={seat} label={label} />
              : (
                <div className={css.themeSections}>
                  {sections.map(section => (
                    <section
                      key={section.key}
                      className={clsx(
                        css.themeSection,
                        section.theme === null ? css.themeSectionUnthemed : css.themeSectionThemed,
                      )}
                      style={section.theme === null
                        ? undefined
                        : { '--theme-tint': themeColor(section.theme.colorSlot) } as CSSProperties}
                    >
                      <ThemeSectionHeader
                        theme={section.theme}
                        count={section.sessions.length}
                        accountKey={group.key}
                        seat={themes}
                        t={t}
                      />
                      <CardGrid
                        nodes={section.sessions}
                        seat={seat}
                        label={t('theme.group.aria', {
                          group: label,
                          theme: section.theme === null ? t('theme.none') : section.theme.name,
                        })}
                      />
                    </section>
                  ))}
                </div>
              ))}
            {group.expanded && foldedCount > 0 && (
              <button
                type="button"
                className={css.cardOverflowButton}
                aria-expanded={hiddenCount === 0}
                onClick={() => { folders.onToggleOverflow(group.key) }}
              >
                {hiddenCount === 0
                  ? t('sessions.collapse')
                  : t('sessions.expand', { n: hiddenCount })}
              </button>
            )}
          </section>
        )
      })}
    </>
  )
}
