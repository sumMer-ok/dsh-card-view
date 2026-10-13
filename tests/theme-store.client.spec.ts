/**
 * Viewing-store theme actions: the rainbow slot minted per account, the
 * account-scoped rename and delete guards, the detach-on-delete rule, the
 * assignment map's clearing write, and the account prune.
 */
import { describe, expect, it } from 'vitest'
import { createWorkspaceViewStore } from '../src/client/stores.ts'

/** One fresh store instance (the sanctioned zero-machinery test path). */
const store = () => createWorkspaceViewStore().create()

describe('workspace view store themes', () => {
  it('mints a theme per account from the next free rainbow slot', () => {
    const s = store()
    s.actions.createTheme('w1', '设计')
    s.actions.createTheme('w1', '文档')
    s.actions.createTheme('w2', '法务')
    expect(s.getSnapshot().themes.w1?.map(theme => [theme.id, theme.name, theme.colorSlot])).toEqual([
      ['theme:w1:0', '设计', 0],
      ['theme:w1:1', '文档', 1],
    ])
    expect(s.getSnapshot().themes.w2?.[0]?.id).toBe('theme:w2:0')
  })

  it('renames one theme and ignores an account without themes', () => {
    const s = store()
    s.actions.createTheme('w1', '设计')
    s.actions.createTheme('w1', '文档')
    s.actions.renameTheme('w1', 'theme:w1:0', '架构')
    expect(s.getSnapshot().themes.w1?.map(theme => theme.name)).toEqual(['架构', '文档'])
    // A dangling account key is a no-op rather than an error.
    s.actions.renameTheme('missing', 'theme:missing:0', 'x')
    expect(s.getSnapshot().themes.missing).toBeUndefined()
  })

  it('keeps the surviving themes on delete and detaches their Sessions', () => {
    const s = store()
    s.actions.createTheme('w1', '设计')
    s.actions.createTheme('w1', '文档')
    s.actions.assignSessionTheme('a', 'theme:w1:0')
    s.actions.assignSessionTheme('b', 'theme:w1:1')
    s.actions.deleteTheme('w1', 'theme:w1:1')
    expect(s.getSnapshot().themes.w1?.map(theme => theme.id)).toEqual(['theme:w1:0'])
    // Only assignments to the deleted theme are dropped.
    expect(s.getSnapshot().sessionTheme).toEqual({ a: 'theme:w1:0' })
    s.actions.deleteTheme('w1', 'theme:w1:0')
    expect(s.getSnapshot().themes.w1).toBeUndefined()
    expect(s.getSnapshot().sessionTheme).toEqual({})
    // Deleting from an account that owns nothing is a no-op.
    s.actions.deleteTheme('missing', 'theme:missing:0')
    expect(s.getSnapshot().themes).toEqual({})
  })

  it('assigns a theme and clears it with undefined', () => {
    const s = store()
    s.actions.assignSessionTheme('a', 'theme:w1:0')
    s.actions.assignSessionTheme('b', 'theme:w1:0')
    expect(s.getSnapshot().sessionTheme).toEqual({ a: 'theme:w1:0', b: 'theme:w1:0' })
    s.actions.assignSessionTheme('a', undefined)
    expect(s.getSnapshot().sessionTheme).toEqual({ b: 'theme:w1:0' })
  })

  it('prunes the theme accounts no Workspace key retains', () => {
    const s = store()
    s.actions.createTheme('w1', '设计')
    s.actions.createTheme('gone', '文档')
    s.actions.retainAccountKeys(['w1'])
    expect(Object.keys(s.getSnapshot().themes)).toEqual(['w1'])
  })
})
