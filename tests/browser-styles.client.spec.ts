/**
 * WorkspaceBrowser spacing contract, asserted against the CSS text on disk:
 * row fills share the shell's trailing inset, the stable scrollbar counts
 * inside it, and flat, grouped, search, and card views keep their intended
 * rhythm.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../src/client/rows/WorkspaceBrowser.module.css', import.meta.url)), 'utf8')
const rowsCss = readFileSync(fileURLToPath(new URL('../src/client/rows/Rows.module.css', import.meta.url)), 'utf8')
const cardsCss = readFileSync(fileURLToPath(new URL('../src/client/rows/Cards.module.css', import.meta.url)), 'utf8')

/**
 * Declarations of one selector rule, keyed by property with whitespace collapsed.
 * Declaration order and trailing semicolons are normalized away.
 * @param selector - one exact selector, including a leading dot for local classes.
 * @returns the rule's declarations, or undefined when no such rule exists.
 */
function declarationsFrom(source: string, selector: string): Map<string, string> | undefined {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, ' ')
  const found = new Map<string, string>()
  for (const [, selectorList = '', body = ''] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectorList.split(',').map(value => value.trim()).includes(selector)) continue
    for (const part of body.split(';')) {
      const colon = part.indexOf(':')
      if (colon === -1) continue
      found.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim().replace(/\s+/g, ' '))
    }
  }
  return found.size === 0 ? undefined : found
}

const declarations = (selector: string): Map<string, string> | undefined => declarationsFrom(css, selector)
const rowDeclarations = (selector: string): Map<string, string> | undefined => declarationsFrom(rowsCss, selector)
const cardDeclarations = (selector: string): Map<string, string> | undefined => declarationsFrom(cardsCss, selector)

describe('WorkspaceBrowser.module.css list', () => {
  const root = declarations('.root')
  const listArea = declarations('.listArea')
  const list = declarations('.list')

  it('is the scrolling region', () => {
    expect(list).toBeDefined()
    expect(list!.get('overflow-y')).toBe('auto')
  })

  it('counts the themed scrollbar inside the shell trailing inset', () => {
    expect(root?.get('--dsh-session-list-edge-inset')).toBe('var(--dsh-sidebar-inline-padding)')
    expect(root?.get('--dsh-session-list-scrollbar-width')).toBe('5px')
    expect(root?.get('--dsh-session-list-scrollbar-offset')).toBe('2px')
    expect(root?.get('padding-right')).toBe('var(--dsh-session-list-edge-inset)')
    expect(listArea?.get('margin-left')).toBe('-4px')
    expect(listArea?.get('padding-left')).toBe('4px')
    expect(listArea?.get('margin-right')).toBe('calc(-1 * var(--dsh-session-list-edge-inset))')
    expect(declarations('.fade')?.get('right')).toBe('var(--dsh-session-list-edge-inset)')
    expect(list?.get('margin-right')).toBe('var(--dsh-session-list-scrollbar-offset)')
    expect(list?.get('margin-left')).toBe('-4px')
    expect(list?.get('padding-left')).toBe('4px')
    expect(list?.get('padding-right')).toBe([
      'calc(',
      'var(--dsh-session-list-edge-inset)',
      '- var(--dsh-session-list-scrollbar-width)',
      '- var(--dsh-session-list-scrollbar-offset)',
      ')',
    ].join(' '))
    expect(declarations('.list::-webkit-scrollbar')).toBeUndefined()
  })

  it('reserves the scrollbar whether or not the list overflows', () => {
    expect(list!.get('scrollbar-gutter')).toBe('stable')
  })

  it('keeps 2px between rows and 4px between workspace groups', () => {
    expect(declarations('.flatList > * + *')?.get('margin-top')).toBe('2px')
    expect(declarations(".searchTree > [role='treeitem'] + [role='treeitem']")?.get('margin-top')).toBe('2px')
    expect(declarations('.groupSection > * + *')?.get('margin-top')).toBe('2px')
    expect(declarations('.groupSection + .groupSection')?.get('margin-top')).toBe('4px')
  })

  it('draws drag targets as a leading chevron joined to the insertion line', () => {
    const listTopMarker = declarations('.listTopDropIndicator')
    const workspaceMarker = declarations('.workspaceDropBefore::before')
    const sessionMarker = rowDeclarations('.sessionRow.dropBefore::before')
    expect(listTopMarker?.get('top')).toBe('-8px')
    expect(listTopMarker?.get('left')).toBe('0')
    expect(workspaceMarker?.get('left')).toBe('0')
    expect(sessionMarker?.get('left')).toBe('0')
    for (const marker of [listTopMarker, workspaceMarker, sessionMarker]) {
      expect(marker?.get('height')).toBe('12px')
      expect(marker?.get('background')).not.toContain('radial-gradient')
      expect(marker?.get('background')).toContain('55deg')
      expect(marker?.get('background')).toContain('125deg')
      expect(marker?.get('background')).toContain('calc(50% - 1px) calc(50% + 1px)')
      expect(marker?.get('background')).toContain('0 0 / 5px 7px')
      expect(marker?.get('background')).toContain('0 5px / 5px 7px')
      expect(marker?.get('background')).toContain('4px 5px / calc(100% - 4px) 2px')
    }
  })

  it('keeps the compact fade, overflow control, search field, and row heights', () => {
    expect(declarations('.fade')?.get('height')).toBe('24px')
    expect(declarations('.sessionOverflowButton')?.get('height')).toBe('28px')
    expect(declarations('.searchExpanded')?.get('height')).toBe('30px')
    expect(rowDeclarations('.projectRow')?.get('height')).toBe('34px')
    expect(rowDeclarations('.sessionRow')?.get('height')).toBe('32px')
    // One leading status cell for every session row, grouped or flat: the cell
    // hosts either the row's status dot or the leading seat, and it reserves its
    // own box, so the title's one shared margin below needs no per-view override.
    expect(rowDeclarations('.slot')?.get('width')).toBe('16px')
    expect(rowDeclarations('.slot')?.get('height')).toBe('20px')
    expect(rowDeclarations('.sessionRow .title')?.get('margin')).toBe('0 6px 0 4px')
    expect(rowDeclarations('.searchResultRow')?.get('min-height')).toBe('48px')
    expect(rowDeclarations('.sessionRow.selected')?.get('background'))
      .toBe('var(--dsw-alias-interactive-bg-hover)')
  })

  it('marquees a clipped session title on row hover', () => {
    // The crawl itself is scripted in Rows.tsx frame by frame, so the title
    // declares no scroll-behavior; the stylesheet keeps the hovered cell
    // unclipped and fades whichever edges cut text mid-travel, on the title
    // span itself so the status slot beside it keeps its full color.
    expect(rowDeclarations('.sessionRow .title')?.get('flex')).toBe('1')
    expect(rowDeclarations('.sessionRow .title')?.get('scroll-behavior')).toBeUndefined()
    expect(rowDeclarations('.sessionRow:hover .title')?.get('text-overflow')).toBe('clip')
    expect(rowDeclarations('.sessionRow .title[data-scrolled]')?.get('mask-image'))
      .toBe('linear-gradient(to right, transparent, #000 12px)')
    expect(rowDeclarations('.sessionRow .title[data-clipped]')?.get('mask-image'))
      .toBe('linear-gradient(to left, transparent, #000 12px)')
    expect(rowDeclarations('.sessionRow .title[data-scrolled][data-clipped]')?.get('mask-image'))
      .toBe('linear-gradient(to right, transparent, #000 12px, #000 calc(100% - 12px), transparent)')
  })

  it('pins both rail controls to the shared left anchor during the column slide', () => {
    expect(declarations('.rail .sectionHeader')?.get('justify-content')).toBe('flex-start')
    expect(declarations('.rail .iconButton')?.get('width')).toBe('36px')
    expect(declarations('.rail .search')?.get('width')).toBe('36px')
  })
})

describe('Cards.module.css', () => {
  it('lays the card grid out in sidebar-relative columns', () => {
    const grid = cardDeclarations('.cardGrid')
    expect(grid?.get('display')).toBe('grid')
    expect(grid?.get('grid-template-columns')).toBe('repeat(auto-fill, minmax(104px, 1fr))')
    // Cards fill their row's height, so mixed title lengths still scan as a band.
    expect(cardDeclarations('.sessionCard')?.get('height')).toBe('100%')
    expect(cardDeclarations('.cardGroup + .cardGroup')?.get('margin-top')).toBe('8px')
  })

  it('clamps a long card title to two lines and reserves the menu corner', () => {
    const title = cardDeclarations('.cardTitle')
    expect(title?.get('-webkit-line-clamp')).toBe('2')
    expect(title?.get('overflow')).toBe('hidden')
    expect(title?.get('overflow-wrap')).toBe('anywhere')
    // Both corner controls (theme tag, then the action menu) float over the
    // meta row, so the time label stops before either of them.
    expect(cardDeclarations('.cardMeta')?.get('padding-right')).toBe('40px')
    expect(cardDeclarations('.cardActions')?.get('right')).toBe('2px')
  })

  it('wraps a theme group in a jelly membrane tinted by the theme color', () => {
    // The theme's color is the section's own `--theme-tint` (inline), so the
    // sheet reads the variable and never names a color of its own.
    const themed = cardDeclarations('.themeSectionThemed')
    expect(themed?.get('border')).toBe('1.5px solid color-mix(in oklab, var(--theme-tint) 62%, transparent)')
    expect(themed?.get('background')).toContain('var(--theme-tint)')
    // The inner highlight along the top edge plus the tinted glow below it are
    // what make the pane read as gel rather than a flat tint.
    expect(themed?.get('box-shadow')).toContain('inset 0 1px 0')
    expect(themed?.get('box-shadow')).toContain('var(--theme-tint)')
    expect(cardDeclarations('.themeSection')?.get('border-radius')).toBe('14px')
    // The hover lift overshoots and settles; the parsed map merges the
    // reduced-motion override, so the easing is asserted against the sheet.
    expect(cardsCss).toContain('cubic-bezier(0.34, 1.56, 0.64, 1)')
    const unthemed = cardDeclarations('.themeSectionUnthemed')
    expect(unthemed?.get('border-width')).toBe('1px')
    expect(unthemed?.get('border-style')).toBe('dashed')
    expect(unthemed?.get('border-color')).toBe('var(--dsw-alias-border-l2)')
    // Theme groups stack inside the folder card, spaced like the cards.
    expect(cardDeclarations('.themeSection + .themeSection')?.get('margin-top')).toBe('8px')
  })

  it('reveals both card corner controls together and keeps a themed tag at rest', () => {
    expect(cardDeclarations('.cardThemeButton.cardThemeAssigned')?.get('opacity')).toBe('1')
    expect(cardDeclarations('.sessionCard:hover .cardThemeButton')?.get('opacity')).toBe('1')
    expect(cardDeclarations('.sessionCard.menuOpen .cardMenuButton')?.get('opacity')).toBe('1')
  })
})
