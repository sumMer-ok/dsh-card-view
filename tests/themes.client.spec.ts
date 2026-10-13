/**
 * Theme derivation contract: the rainbow sequence, the stable creation-order
 * slots, the per-account name rule, and the section split the card grid draws
 * (themed sections in creation order, unthemed tail last, members keeping the
 * order the group derived).
 */
import { describe, expect, it } from 'vitest'
import {
  createThemeId, deriveThemeSections, nextColorSlot, THEME_COLORS, themeColor, themeNameTaken,
  UNTHEMED_THEME_KEY, type SessionTheme,
} from '../src/client/themes.ts'

const theme = (id: string, name: string, colorSlot: number): SessionTheme => ({ id, name, colorSlot })
const row = (id: string): { id: string } => ({ id })

describe('theme colors', () => {
  it('assigns the rainbow sequence in creation order and wraps past its end', () => {
    expect(themeColor(0)).toBe('#ef5350')
    expect(themeColor(1)).toBe('#fb8c00')
    expect(themeColor(THEME_COLORS.length - 1)).toBe(THEME_COLORS[THEME_COLORS.length - 1])
    expect(themeColor(THEME_COLORS.length)).toBe(THEME_COLORS[0])
    // A slot is never negative in stored state; the lookup still stays in range.
    expect(themeColor(-1)).toBe(THEME_COLORS[THEME_COLORS.length - 1])
  })

  it('takes the next free slot without reusing a deleted theme slot', () => {
    expect(nextColorSlot([])).toBe(0)
    expect(nextColorSlot([theme('a', 'A', 0)])).toBe(1)
    expect(nextColorSlot([theme('a', 'A', 0), theme('c', 'C', 2)])).toBe(3)
  })

  it('mints ids from the account and slot', () => {
    expect(createThemeId('w1', 0)).toBe('theme:w1:0')
    expect(createThemeId('', 2)).toBe('theme::2')
    expect(createThemeId('w1', 1)).not.toBe(createThemeId('w2', 1))
  })
})

describe('themeNameTaken', () => {
  const themes = [theme('theme:w1:0', 'Design', 0), theme('theme:w1:1', '法务', 1)]

  it('ignores surrounding whitespace and letter case', () => {
    expect(themeNameTaken(themes, 'Design')).toBe(true)
    expect(themeNameTaken(themes, '  design ')).toBe(true)
    expect(themeNameTaken(themes, '法务')).toBe(true)
    expect(themeNameTaken(themes, 'Designs')).toBe(false)
    expect(themeNameTaken([], 'Design')).toBe(false)
  })

  it('excludes the theme being renamed', () => {
    expect(themeNameTaken(themes, 'design', 'theme:w1:0')).toBe(false)
    expect(themeNameTaken(themes, '法务', 'theme:w1:0')).toBe(true)
  })
})

describe('deriveThemeSections', () => {
  const themes = [theme('theme:w1:0', 'Design', 0), theme('theme:w1:1', 'Docs', 1)]

  it('draws themed sections in creation order with the unthemed tail last', () => {
    const sections = deriveThemeSections(
      [row('a'), row('b'), row('c'), row('d')],
      themes,
      { a: 'theme:w1:0', b: 'theme:w1:1', c: 'theme:w1:0' },
    )
    expect(sections.map(section => section.key)).toEqual(['theme:w1:0', 'theme:w1:1', UNTHEMED_THEME_KEY])
    expect(sections[0]!.theme?.name).toBe('Design')
    // Members keep the incoming order, so the group's own order stays authoritative.
    expect(sections[0]!.sessions.map(session => session.id)).toEqual(['a', 'c'])
    expect(sections[2]!.theme).toBeNull()
    expect(sections[2]!.sessions.map(session => session.id)).toEqual(['d'])
  })

  it('hides a theme with no members and omits the tail when every row is themed', () => {
    const sections = deriveThemeSections([row('a')], themes, { a: 'theme:w1:0' })
    expect(sections.map(section => section.key)).toEqual(['theme:w1:0'])
  })

  it('reads a dangling assignment as unthemed', () => {
    // A deleted theme, or a Session moved out of the folder that owned it.
    const sections = deriveThemeSections([row('a')], themes, { a: 'theme:w2:0' })
    expect(sections).toHaveLength(1)
    expect(sections[0]!.theme).toBeNull()
    expect(sections[0]!.sessions.map(session => session.id)).toEqual(['a'])
  })

  it('shows nothing for an account with no visible Sessions', () => {
    expect(deriveThemeSections([], themes, {})).toEqual([])
  })
})
