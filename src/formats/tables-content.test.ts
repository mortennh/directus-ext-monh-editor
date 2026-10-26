import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { Editor } from '@tiptap/core'
import { TextAlign } from '@tiptap/extension-text-align'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import { TABLE_KIT } from './tables'

/**
 * The migrated tables (docs/specs/info-cards-migration/*.tables.json) must
 *  survive opening and saving in the editor — editors have to be able to
 *  change them. The files live in the TRR repo; skipped elsewhere.
 */
const DIR = '../../docs/specs/info-cards-migration/'
const FILES = ['why-esg-reporting', 'how-effective-are-esg-reporting-requirements', 'ski-jumping-lesson-1-more-transparency-fairer-performance-evaluations']

function roundTrip(html: string): string {
  const editor = new Editor({ extensions: [StarterKit, TABLE_KIT, TextAlign.configure({ types: ['heading', 'paragraph'] })], content: html })
  const out = editor.getHTML()
  editor.destroy()
  return out
}
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const count = (html: string, tag: string) => (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length

const HAS_DATA = existsSync(DIR)

describe.skipIf(!HAS_DATA)('migrated tables in the editor', () => {
  for (const file of HAS_DATA ? FILES : []) {
    const { tables } = JSON.parse(readFileSync(`${DIR}${file}.tables.json`, 'utf8'))
    for (const t of tables) {
      for (const lang of ['en', 'de']) {
        it(`${file} — ${t.name} (${lang})`, () => {
          const out = roundTrip(t[lang])
          expect(text(out)).toBe(text(t[lang]))
          for (const tag of ['table', 'tr', 'th', 'td', 'li', 'strong', 'em', 'br', 'h3'])
            expect(count(out, tag), tag).toBe(count(t[lang], tag))
          expect(count(out, 'p style="text-align: center;"')).toBe(count(t[lang], 'p style="text-align: center;"'))
        })
      }
    }
  }
})

/** Same for the info cards' text and modal details (*.cards.json). */
describe.skipIf(!HAS_DATA)('migrated info cards in the editor', () => {
  for (const file of HAS_DATA ? readdirSync(DIR) : [].filter((f: string) => f.endsWith('.cards.json'))) {
    const { cards } = JSON.parse(readFileSync(`${DIR}${file}`, 'utf8'))
    for (const c of cards) {
      for (const lang of ['en', 'de']) {
        for (const field of ['text', 'details']) {
          const html: string | undefined = c[lang]?.[field]
          if (!html)
            continue
          it(`${file} — ${c.name} (${lang}, ${field})`, () => {
            const out = roundTrip(html)
            expect(text(out)).toBe(text(html))
            for (const tag of ['table', 'tr', 'th', 'td', 'li', 'strong', 'em', 'br', 'blockquote'])
              expect(count(out, tag), tag).toBe(count(html, tag))
          })
        }
      }
    }
  }
})
