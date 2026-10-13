// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import type {
  FolderCardSeat, FoldedGroup, SessionCardSeat, SessionThemeSeat, ThemeGroupSeat,
} from '../src/client/rows/Cards.tsx'
import { CardGrid, CardGroups, SessionCard } from '../src/client/rows/Cards.tsx'
import type { GroupNode, SessionNode } from '../src/client/tree.ts'
import type { SessionTheme } from '../src/client/themes.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

// Standard locale seat stub mirroring the real ns → common → key chain (zh default).
const t = makeTranslate(zh, commonZh) as never

const sid = (id: string) => id as SessionId
const wid = (id: string) => id as WorkspaceId

const theme = (id: string, name: string, colorSlot: number): SessionTheme => ({ id, name, colorSlot })

/**
 * The row seats one card renders: the menu list, the hover strip, and the
 * hover-card section. Marking each by its own slot keeps the card's wiring
 * assertable without the renderer.
 */
const renderSlot: SessionCardSeat['renderSlot'] = (name, owner) => {
  if (name === 'sidebar.workspaces.session.menu.item') {
    return <button type="button" role="menuitem">{`菜单项:${owner.sessionId}`}</button>
  }
  if (name === 'sidebar.workspaces.session.row.action') return <button type="button">置顶按钮</button>
  return <div>{`悬停席位:${owner.sessionId}`}</div>
}

/** Theme facts and verbs one card reads; empty account and no assignment by default. */
function themeSeat(overrides: Partial<SessionThemeSeat> = {}): SessionThemeSeat {
  return {
    assigned: {},
    themesOf: () => [],
    accountOf: () => 'w1',
    assign: vi.fn(),
    create: vi.fn(),
    ...overrides,
  }
}

/** Account theme lists and theme verbs the sections read; no themes by default. */
function themeGroups(overrides: Partial<ThemeGroupSeat> = {}): ThemeGroupSeat {
  return {
    byAccount: {},
    assigned: {},
    onRename: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }
}

function node(id: string, overrides: Partial<SessionNode> = {}): SessionNode {
  return {
    id: sid(id), title: id, blank: false, running: false,
    runningSubagentCount: 0, completed: false, pinned: false, archived: false, updatedAt: 0,
    ...overrides,
  }
}

function seat(overrides: Partial<SessionCardSeat> = {}): SessionCardSeat {
  return {
    currentId: undefined,
    now: 0,
    onOpen: vi.fn(),
    renderSlot,
    t,
    ...overrides,
  }
}

function folders(overrides: Partial<FolderCardSeat> = {}): FolderCardSeat {
  return {
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onToggleGroup: vi.fn(),
    onNewSession: vi.fn(),
    onToggleOverflow: vi.fn(),
    ...overrides,
  }
}

function group(overrides: Partial<GroupNode> = {}): GroupNode {
  return {
    key: 'w1',
    workspaceId: wid('w1'),
    cwd: '/projects/w1',
    createdAt: 0,
    label: 'w1',
    sessionCount: 0,
    expanded: true,
    containsCurrent: false,
    sessions: [],
    ...overrides,
  }
}

/** One grouped-body section: a group paired with the rows its fold leaves visible. */
function folded(
  groupOverrides: Partial<GroupNode>,
  sessions: readonly SessionNode[],
  counts: { foldedCount?: number; hiddenCount?: number } = {},
): readonly FoldedGroup[] {
  return [{
    group: group(groupOverrides),
    sessions,
    foldedCount: counts.foldedCount ?? 0,
    hiddenCount: counts.hiddenCount ?? 0,
  }]
}

describe('workspace browser cards', () => {
  it('names the entity with its glyph and marks the selected card', () => {
    const { container } = render(
      <SessionCard node={node('alpha', { running: true })} seat={seat({ currentId: sid('alpha') })} />,
    )
    const card = screen.getByRole('listitem')
    expect(card.className).toContain('selected')
    expect(screen.getByText('alpha')).toBeTruthy()
    // The type glyph is decorative; the status label reaches assistive text.
    expect(screen.getByText('进行中')).toBeTruthy()
    expect(screen.getByRole('button', { current: true })).toBeTruthy()
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('keeps a blank provisional card free of time and verbs', () => {
    render(<SessionCard node={node('blank', { blank: true, title: 'blank' })} seat={seat()} />)
    expect(screen.getByText('新会话')).toBeTruthy()
    expect(screen.queryByText('刚刚')).toBeNull()
    expect(screen.queryByRole('button', { name: '会话“新会话”的操作' })).toBeNull()
  })

  it('opens the Session from the whole card surface', () => {
    const s = seat()
    render(<SessionCard node={node('alpha')} seat={s} />)
    // The card's own label leads with the title; the action menu's label wraps it.
    fireEvent.click(screen.getByRole('button', { name: /^alpha/ }))
    expect(s.onOpen).toHaveBeenCalledWith(sid('alpha'))
  })

  it('renders the row seats: verb menu entries, hover buttons, and the hover section', () => {
    vi.useFakeTimers()
    try {
      render(<SessionCard node={node('alpha')} seat={seat()} />)
      fireEvent.click(screen.getByRole('button', { name: '会话“alpha”的操作' }))
      // The menu entry list is the slot's, rendered in the card's own menu.
      expect(screen.getByRole('menuitem', { name: '菜单项:alpha' })).toBeTruthy()
      expect(screen.getByRole('button', { name: '置顶按钮' })).toBeTruthy()
      // Escape closes the card menu without running a row verb.
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByRole('menuitem')).toBeNull()
      // The hover card renders the row's hover seat.
      fireEvent.pointerEnter(screen.getByRole('listitem').parentElement as HTMLElement)
      act(() => { vi.advanceTimersByTime(500) })
      expect(screen.getByText('悬停席位:alpha')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('marks a pinned card with the pinned-row title', () => {
    render(<SessionCard node={node('alpha', { pinned: true })} seat={seat()} />)
    expect(screen.getByTitle('已置顶')).toBeTruthy()
  })

  it('carries the untruncated title in the accessible name and the hover card', () => {
    vi.useFakeTimers()
    try {
      const long = '左侧工作区新增卡片视图模式以及一个很长的会话标题用于截断提示'
      render(<SessionCard node={node('alpha', { title: long })} seat={seat()} />)
      // The clamp is CSS-only: the DOM keeps the whole title for assistive text.
      expect(screen.getByText(long).textContent).toBe(long)
      expect(screen.getByRole('button', { name: new RegExp(`^${long}`) })).toBeTruthy()
      fireEvent.pointerEnter(screen.getByRole('listitem').parentElement as HTMLElement)
      act(() => { vi.advanceTimersByTime(500) })
      expect(screen.getAllByText(long)).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders one labelled grid of list items', () => {
    render(<CardGrid nodes={[node('a'), node('b')]} seat={seat()} label="会话" />)
    expect(screen.getByRole('list', { name: '会话' })).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('draws a folder card per group with its nested grid', () => {
    const f = folders()
    const view = render(
      <CardGroups
        foldedGroups={folded({ sessionCount: 2 }, [node('a'), node('b')])}
        seat={seat()}
        folders={f}
        themes={themeGroups()}
      />,
    )
    expect(screen.getByText('w1')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'w1' })).toBeTruthy()
    // The folder card is the shared disclosure row, not one of the cards.
    expect(screen.getAllByRole('treeitem')).toHaveLength(1)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    fireEvent.click(screen.getByText('w1'))
    expect(f.onToggleGroup).toHaveBeenCalledTimes(1)

    view.rerender(
      <CardGroups foldedGroups={folded({ sessionCount: 2 }, [])} seat={seat()} folders={f} themes={themeGroups()} />,
    )
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('labels the ungrouped bucket and keeps its card free of workspace verbs', () => {
    render(
      <CardGroups
        foldedGroups={folded(
          { key: '', workspaceId: undefined, cwd: undefined, createdAt: undefined, label: 'Ungrouped', sessionCount: 1 },
          [node('a')],
        )}
        seat={seat()}
        folders={folders()}
        themes={themeGroups()}
      />,
    )
    expect(screen.getByText('未分组')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '工作区“Ungrouped”的操作' })).toBeNull()
  })

  it('folds a collapsed group down to its folder card', () => {
    render(
      <CardGroups
        foldedGroups={folded({ sessionCount: 3, expanded: false }, [], { foldedCount: 3 })}
        seat={seat()}
        folders={folders()}
        themes={themeGroups()}
      />,
    )
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    // A folded group shows no overflow control either, exactly like the row tree.
    expect(screen.queryByRole('button', { name: /展开其余/ })).toBeNull()
  })

  it('offers and reports the overflow fold against the same budget as the row tree', () => {
    const f = folders()
    const view = render(
      <CardGroups
        foldedGroups={folded({ sessionCount: 7 }, [node('a')], { foldedCount: 2, hiddenCount: 2 })}
        seat={seat()}
        folders={f}
        themes={themeGroups()}
      />,
    )
    const expand = screen.getByRole('button', { name: '展开其余 2 个会话' })
    expect(expand.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(expand)
    expect(f.onToggleOverflow).toHaveBeenCalledWith('w1')

    view.rerender(
      <CardGroups
        foldedGroups={folded({ sessionCount: 7 }, [node('a')], { foldedCount: 2, hiddenCount: 0 })}
        seat={seat()}
        folders={f}
        themes={themeGroups()}
      />,
    )
    const collapse = screen.getByRole('button', { name: '收起' })
    expect(collapse.getAttribute('aria-expanded')).toBe('true')
  })

  it('raises the folder card and new-Session controls', () => {
    const f = folders()
    render(
      <CardGroups foldedGroups={folded({ sessionCount: 0 }, [])} seat={seat()} folders={f} themes={themeGroups()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: '在“w1”中新建会话' }))
    expect(f.onNewSession).toHaveBeenCalledTimes(1)
    expect(f.onNewSession).toHaveBeenCalledWith(expect.objectContaining({ key: 'w1' }))
  })

  it('raises the folder card verbs against the group it belongs to', () => {
    const f = folders()
    render(
      <CardGroups foldedGroups={folded({ sessionCount: 0 }, [])} seat={seat()} folders={f} themes={themeGroups()} />,
    )
    const menu = screen.getByRole('button', { name: '工作区“w1”的操作' })

    fireEvent.click(menu)
    fireEvent.click(screen.getByText('重命名'))
    expect(f.onRename).toHaveBeenCalledWith(wid('w1'), 'w1')

    fireEvent.click(menu)
    fireEvent.click(screen.getByText('删除工作区'))
    expect(f.onDelete).toHaveBeenCalledWith(wid('w1'), 'w1')
  })

  it('offers the theme panel of the Session project folder and writes the choice', () => {
    const available = [theme('theme:w1:0', '设计', 0), theme('theme:w1:1', '文档', 1)]
    const s = themeSeat({ assigned: { alpha: 'theme:w1:1' }, themesOf: () => available })
    render(<SessionCard node={node('alpha')} seat={seat({ theme: s })} />)
    const trigger = screen.getByRole('button', { name: '会话“alpha”的主题' })
    // The assigned theme names the tag at rest, so a themed card reports it.
    expect(trigger.getAttribute('title')).toBe('文档')

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: '设计' }))
    expect(s.assign).toHaveBeenCalledWith(sid('alpha'), 'theme:w1:0')

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: '无主题' }))
    expect(s.assign).toHaveBeenLastCalledWith(sid('alpha'), undefined)

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: '新建主题…' }))
    expect(s.create).toHaveBeenCalledWith('w1')

    // Escape closes the panel without running a verb.
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menuitem')).toBeNull()
    expect(s.assign).toHaveBeenCalledTimes(2)
  })

  it('leaves the theme control off without a theme seat and off a blank card', () => {
    const s = themeSeat()
    const view = render(<SessionCard node={node('alpha')} seat={seat()} />)
    expect(screen.queryByRole('button', { name: '会话“alpha”的主题' })).toBeNull()

    view.rerender(
      <SessionCard node={node('blank', { blank: true, title: 'blank' })} seat={seat({ theme: s })} />,
    )
    expect(screen.queryByRole('button', { name: '会话“新会话”的主题' })).toBeNull()
  })

  it('draws theme sections in their color border with the unthemed group last', () => {
    const available = [
      theme('theme:w1:0', '设计', 0), theme('theme:w1:1', '文档', 1), theme('theme:w1:2', '空主题', 2),
    ]
    render(
      <CardGroups
        foldedGroups={folded({ sessionCount: 3 }, [node('a'), node('b'), node('c')])}
        seat={seat({ theme: themeSeat() })}
        folders={folders()}
        themes={themeGroups({
          byAccount: { w1: available },
          assigned: { a: 'theme:w1:0', b: 'theme:w1:1' },
        })}
      />,
    )
    // A theme with no members is hidden rather than drawn empty.
    expect(screen.queryByText('空主题')).toBeNull()
    const themed = screen.getByText('设计').closest('section') as HTMLElement
    // The section hands its own color to the sheet as the jelly frame's tint.
    expect(themed.getAttribute('style')).toMatch(/--theme-tint:\s*(#ef5350|rgb\(239,\s*83,\s*80\))/i)
    // The unthemed group carries no theme color: its dashed neutral border is
    // the stylesheet's.
    const unthemed = screen.getByText('无主题').closest('section') as HTMLElement
    expect(unthemed.getAttribute('style')).toBeNull()
    // Sections read in theme creation order, the unthemed group after them.
    expect(screen.getAllByRole('list').map(grid => grid.getAttribute('aria-label')))
      .toEqual(['w1 · 设计', 'w1 · 文档', 'w1 · 无主题'])
  })

  it('raises theme rename and delete from the section header', () => {
    const s = themeGroups({
      byAccount: { w1: [theme('theme:w1:0', '设计', 0)] },
      assigned: { a: 'theme:w1:0' },
    })
    render(
      <CardGroups
        foldedGroups={folded({ sessionCount: 1 }, [node('a')])}
        seat={seat({ theme: themeSeat() })}
        folders={folders()}
        themes={s}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '主题“设计”的操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名主题' }))
    expect(s.onRename).toHaveBeenCalledWith('w1', expect.objectContaining({ id: 'theme:w1:0', name: '设计' }))

    fireEvent.click(screen.getByRole('button', { name: '主题“设计”的操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '删除主题' }))
    expect(s.onDelete).toHaveBeenCalledWith('w1', 'theme:w1:0')

    // Escape closes the section menu without running a verb.
    fireEvent.click(screen.getByRole('button', { name: '主题“设计”的操作' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menuitem')).toBeNull()
    expect(s.onDelete).toHaveBeenCalledTimes(1)
  })

  it('keeps the plain grid for a project folder without themes', () => {
    render(
      <CardGroups
        foldedGroups={folded({ sessionCount: 1 }, [node('a')])}
        seat={seat({ theme: themeSeat() })}
        folders={folders()}
        themes={themeGroups()}
      />,
    )
    expect(screen.getByRole('list', { name: 'w1' })).toBeTruthy()
    expect(screen.queryByText('无主题')).toBeNull()
    // The card still offers the panel that creates the folder's first theme.
    expect(screen.getByRole('button', { name: '会话“a”的主题' })).toBeTruthy()
  })
})
