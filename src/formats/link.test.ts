import { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { editorExtensions } from './extensions'

function roundTrip(html: string): string {
  const editor = new Editor({ extensions: editorExtensions(), content: html })
  const out = editor.getHTML()
  editor.destroy()
  return out
}

describe('links', () => {
  it('internal links get no target and no rel — also old ones that had them', () => {
    const out = roundTrip('<p><a href="/publications/x" target="_blank" rel="noopener noreferrer nofollow">A</a> <a href="#top">B</a> <a href="mailto:a@b.de" target="_blank">C</a></p>')
    expect(out).not.toContain('target=')
    expect(out).not.toContain('rel=')
  })

  it('external links open in a new tab, without nofollow', () => {
    const out = roundTrip('<p><a href="https://doi.org/10.1/x" rel="nofollow">A</a> <a href="//example.org">B</a></p>')
    expect(out.match(/target="_blank"/g)).toHaveLength(2)
    expect(out.match(/rel="noopener noreferrer"/g)).toHaveLength(2)
    expect(out).not.toContain('nofollow')
  })

  it('newly inserted internal link has no target', () => {
    const editor = new Editor({ extensions: editorExtensions(), content: '<p></p>' })
    editor.chain().insertContent({ type: 'text', text: 'Page', marks: [{ type: 'link', attrs: { href: '/pages/a', class: '' } }] }).run()
    const out = editor.getHTML()
    editor.destroy()
    expect(out).toContain('href="/pages/a"')
    expect(out).not.toContain('target=')
  })

  it('link and underline are registered once', () => {
    const editor = new Editor({ extensions: editorExtensions() })
    const names = editor.extensionManager.extensions.map(e => e.name)
    editor.destroy()
    expect(names.filter(n => n === 'link')).toHaveLength(1)
    expect(names.filter(n => n === 'underline')).toHaveLength(1)
  })
})
