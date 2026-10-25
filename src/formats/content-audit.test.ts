import { readFileSync } from 'node:fs'
import { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { editorExtensions } from './extensions'

/**
 * Round trip of real content: MONH_AUDIT_FILE=<json export> pnpm test
 * (JSON array of { collection, field, id, v }, e.g. all monh-editor fields of
 * a Directus instance). Fails on anything opening and saving would lose:
 * text, elements, attributes. Skipped without the file — the data is not in
 * the repo.
 */
const FILE = process.env.MONH_AUDIT_FILE

// Wrappers the schema adds or drops without meaning (paragraphs, table bodies)
const IGNORED_TAGS = new Set(['p', 'tbody', 'thead', 'colgroup', 'col'])
const RENAMED: Record<string, string> = { b: 'strong', i: 'em' }

// Inline formatting: what counts is which text is formatted, not how many
// elements carry it (adjacent ones are merged, empty ones dropped)
const MARK_TAGS = new Set(['strong', 'em', 'u', 's', 'strike', 'sub', 'sup', 'code'])

function normValue(name: string, value: string): string {
  if (name === 'style') {
    // the browser's own serialisation: #999 and rgb(153, 153, 153) are equal
    const el = document.createElement('span')
    el.setAttribute('style', value)
    return Array.from(el.style).map(p => `${p}:${el.style.getPropertyValue(p)}`).sort().join(';')
  }
  if (name === 'class')
    return value.split(/\s+/).filter(Boolean).sort().join(' ')
  return value
}

/** Multiset of "tag", "tag@attr=value" and the text. */
function signature(html: string) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const items = new Map<string, number>()
  const add = (k: string) => items.set(k, (items.get(k) ?? 0) + 1)
  for (const el of Array.from(doc.body.querySelectorAll('*'))) {
    const tag = RENAMED[el.tagName.toLowerCase()] ?? el.tagName.toLowerCase()
    if (IGNORED_TAGS.has(tag))
      continue
    if (!MARK_TAGS.has(tag) && !(tag === 'a' && el.hasAttribute('href')))
      add(tag)
    // <br data-start> etc. are paste leftovers without meaning
    if (tag === 'br')
      continue
    for (const { name, value } of Array.from(el.attributes)) {
      // links count by linked text below: adjacent links to the same target
      // are merged, empty ones dropped
      if (tag === 'a' && name === 'href')
        continue
      // text-align on paragraphs/headings is re-rendered by TextAlign
      const v = normValue(name, value)
      if (name === 'style') {
        for (const decl of v.split(';').filter(Boolean))
          add(`${tag}@style:${decl}`)
      }
      else if (name === 'class') {
        for (const c of v.split(' '))
          add(`${tag}.${c}`)
      }
      else {
        add(`${tag}@${name}=${v}`)
      }
    }
  }
  // per mark: the formatted text (merged runs give the same string)
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const marked: Record<string, string> = {}
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = (n.textContent ?? '').replace(/\s+/g, '')
    if (!t)
      continue
    const link = n.parentElement?.closest('a[href]')
    if (link)
      marked[`a[href=${link.getAttribute('href')}]`] = (marked[`a[href=${link.getAttribute('href')}]`] ?? '') + t
    const seen = new Set<string>()
    for (let p = n.parentElement; p && p !== doc.body; p = p.parentElement) {
      const tag = RENAMED[p.tagName.toLowerCase()] ?? p.tagName.toLowerCase()
      if (MARK_TAGS.has(tag) && !seen.has(tag)) {
        seen.add(tag)
        marked[tag] = (marked[tag] ?? '') + t
      }
    }
  }
  // formatted/linked text may grow (font-weight:600 also becomes <strong>), never shrink
  for (const [tag, t] of Object.entries(marked))
    items.set(`${tag} (Text)`, t.length)
  const text = (doc.body.textContent ?? '').replace(/\s+/g, '')
  return { items, text }
}

function roundTrip(html: string): string {
  const editor = new Editor({ extensions: editorExtensions(), content: html })
  const out = editor.getHTML()
  editor.destroy()
  return out
}

describe.skipIf(!FILE)('real content survives the editor', () => {
  const rows: { collection: string, field: string, id: string, v: string }[] = FILE ? JSON.parse(readFileSync(FILE, 'utf8')) : []

  it(`${rows.length} values`, () => {
    const lost = new Map<string, number>()
    const examples: string[] = []
    for (const row of rows) {
      const before = signature(row.v)
      const after = signature(roundTrip(row.v))
      const missing: string[] = []
      for (const [k, n] of before.items) {
        const d = n - (after.items.get(k) ?? 0)
        if (d > 0) {
          const key = k.replace(/=.*/, '=…').replace(/(@style:[^:]+):.*/, '$1')
          lost.set(key, (lost.get(key) ?? 0) + d)
          missing.push(k)
        }
      }
      if (before.text !== after.text)
        missing.push('TEXT')
      if (before.text !== after.text)
        lost.set('TEXT', (lost.get('TEXT') ?? 0) + 1)
      if (missing.length && examples.length < 15)
        examples.push(`${row.collection}.${row.field}#${row.id}: ${missing.slice(0, 6).join(', ')}`)
    }
    const report = [...lost].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n}\t${k}`).join('\n')
    expect(report, `${report}\n\n${examples.join('\n')}`).toBe('')
  }, 600_000)
})
