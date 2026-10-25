import { Editor } from '@tiptap/core'
import { TableKit } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import { TABLE_KIT } from './tables'

/** A table as the Forum programme pages and the info-card migration store it. */
const TABLE = '<table><tbody><tr><th><p>Criterion</p></th><th><p>Ski jumping</p></th></tr><tr><td><p>Sample size</p></td><td><p><strong>36,940</strong> evaluations</p></td></tr></tbody></table>'

function roundTrip(extensions: any[], html: string): string {
  const editor = new Editor({ extensions, content: html })
  const out = editor.getHTML()
  editor.destroy()
  return out
}

describe('tables', () => {
  it('are lost without the table extension (the bug this fixes)', () => {
    expect(roundTrip([StarterKit], TABLE)).not.toContain('<table')
  })

  it('survive opening and saving with it', () => {
    const out = roundTrip([StarterKit, TABLE_KIT], TABLE)
    expect(out).toContain('<table')
    expect(out).toContain('<th')
    expect(out).toContain('<strong>36,940</strong>')
  })

  it('keep tables without <p> in cells (old content)', () => {
    const out = roundTrip([StarterKit, TABLE_KIT], '<table><tbody><tr><td>09:30-10:00</td><td><strong>Registrierung</strong></td></tr></tbody></table>')
    expect(out).toContain('09:30-10:00')
    expect(out).toContain('<strong>Registrierung</strong>')
  })

  it('is the plain TableKit: no fixed column widths stored (only TipTap\'s min-width hints)', () => {
    expect(TABLE_KIT.name).toBe(TableKit.name)
    expect(roundTrip([StarterKit, TABLE_KIT], TABLE)).not.toMatch(/[^-]width:/)
  })
})
