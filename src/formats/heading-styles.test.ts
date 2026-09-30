import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { afterEach, describe, expect, it } from 'vitest'
import { HeadingStyles } from './heading-styles'

let editor: Editor | undefined

afterEach(() => {
  editor?.destroy()
  editor = undefined
})

/** Editor with content, cursor placed inside the first heading. */
function makeEditor(content = '<h2>Hello</h2>') {
  // trailingNode:false — StarterKit v3 appends an empty <p> on any transaction
  // when the doc ends in a heading, which would break the backward-compat test.
  editor = new Editor({ extensions: [StarterKit.configure({ trailingNode: false }), HeadingStyles], content })
  editor.commands.setTextSelection(2)
  return editor
}

describe('headingStyles', () => {
  it('renders class="hl-serif" when serif is toggled on', () => {
    const e = makeEditor()
    e.commands.toggleHeadingFont('serif')
    expect(e.getHTML()).toContain('class="hl-serif"')
  })

  it('removes the class when the active font is toggled again', () => {
    const e = makeEditor()
    e.commands.toggleHeadingFont('serif')
    e.commands.toggleHeadingFont('serif')
    expect(e.getHTML()).not.toContain('hl-')
  })

  it('switches directly between serif and sans (mutually exclusive)', () => {
    const e = makeEditor()
    e.commands.toggleHeadingFont('serif')
    e.commands.toggleHeadingFont('sans')
    const html = e.getHTML()
    expect(html).toContain('hl-sans')
    expect(html).not.toContain('hl-serif')
  })

  it('combines font and bar classes on one heading', () => {
    const e = makeEditor()
    e.commands.toggleHeadingFont('serif')
    e.commands.toggleHeadingBar()
    const html = e.getHTML()
    expect(html).toContain('hl-serif')
    expect(html).toContain('hl-bar')
  })

  it('parses hl-* classes back into attributes (round-trip)', () => {
    editor = new Editor({
      extensions: [StarterKit, HeadingStyles],
      content: '<h3 class="hl-sans hl-bar">Parsed</h3>',
    })
    editor.commands.setTextSelection(2)
    const attrs = editor.getAttributes('heading')
    expect(attrs.hlFont).toBe('sans')
    expect(attrs.hlBar).toBe(true)
    expect(editor.getHTML()).toContain('hl-sans')
  })

  it('renders plain headings unchanged (backward compatibility)', () => {
    const e = makeEditor('<h2>Plain</h2>')
    expect(e.getHTML()).toBe('<h2>Plain</h2>')
  })

  it('is a no-op outside headings', () => {
    editor = new Editor({ extensions: [StarterKit, HeadingStyles], content: '<p>Text</p>' })
    editor.commands.setTextSelection(2)
    expect(editor.commands.toggleHeadingBar()).toBe(false)
    expect(editor.getHTML()).toBe('<p>Text</p>')
  })
})
