import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import { editorExtensions } from './extensions'

/**
 * Markup the editor has no tools for must come out as it went in — opening
 * and saving an item used to drop it (images, embeds, accordions, anchors).
 * Styles come back in the browser's serialisation (`0` → `0px`, trailing `;`).
 */
function roundTrip(html: string, extensions = editorExtensions()): string {
  const editor = new Editor({ extensions, content: html })
  const out = editor.getHTML()
  editor.destroy()
  return out
}

const CASES: [string, string, string[]][] = [
  ['image with attributes', '<p>Text <img src="/assets/abc" alt="Chart" width="600" class="aligncenter" style="margin: 1rem 0"> more</p>', ['<img src="/assets/abc" alt="Chart" width="600" class="aligncenter" style="margin: 1rem 0px;">']],
  ['linked image', '<p><a href="https://example.org"><img src="/assets/abc" alt=""></a></p>', ['href="https://example.org"', '<img src="/assets/abc" alt="">']],
  ['YouTube iframe in figure', '<figure class="wp-block-embed"><iframe src="https://www.youtube.com/embed/x" title="Video" allowfullscreen=""></iframe><figcaption>Caption</figcaption></figure>', ['<figure class="wp-block-embed">', '<iframe src="https://www.youtube.com/embed/x" title="Video" allowfullscreen=""></iframe>', '<figcaption>Caption</figcaption>']],
  ['Datawrapper iframe + script', '<iframe id="datawrapper-chart-a" src="https://datawrapper.dwcdn.net/a/1/" height="400"></iframe><script type="text/javascript">!function(){window.x=1}();</script>', ['<iframe id="datawrapper-chart-a" src="https://datawrapper.dwcdn.net/a/1/" height="400"></iframe>', '<script type="text/javascript">!function(){window.x=1}();</script>']],
  ['accordion', '<details><summary>More</summary><h3>Title</h3><p>Body</p></details>', ['<details><summary>More</summary><h3>Title</h3><p>Body</p></details>']],
  ['wrapper with attributes', '<section class="elementor-section" data-id="1"><div class="col"><p>Text</p></div></section>', ['<section class="elementor-section" data-id="1"><div class="col"><p>Text</p></div></section>']],
  ['sub and sup', '<p>CO<sub>2</sub> and x<sup>2</sup></p>', ['CO<sub>2</sub>', 'x<sup>2</sup>']],
  ['heading anchor', '<h3 id="results">Results</h3>', ['<h3 id="results">Results</h3>']],
  ['jump target without href', '<p><a id="top"></a>Text</p>', ['<a id="top"></a>']],
  ['span and link attributes', '<p><span class="lead" style="color: red" lang="en">A</span> <a href="/x" title="T" aria-label="L">B</a></p>', ['style="color: red;"', 'lang="en"', 'title="T"', 'aria-label="L"']],
  ['list item style', '<ul><li style="text-align: left"><p>A</p></li></ul>', ['<li style="text-align: left;">']],
]

describe('html preservation', () => {
  for (const [name, html, expected] of CASES) {
    it(name, () => {
      const out = roundTrip(html)
      for (const part of expected)
        expect(out).toContain(part)
    })
  }

  it('without it, images and embeds are lost (the old behaviour)', () => {
    const out = roundTrip(CASES[0][1] + CASES[3][1], [StarterKit])
    expect(out).not.toContain('<img')
    expect(out).not.toContain('<iframe')
  })

  it('alignment stays editable on paragraphs (no duplicate text-align)', () => {
    const editor = new Editor({ extensions: editorExtensions(), content: '<p style="text-align: center; color: red">A</p>' })
    editor.commands.setTextSelection(1)
    editor.commands.setTextAlign('right')
    const out = editor.getHTML()
    editor.destroy()
    expect(out).toContain('text-align: right')
    expect(out).not.toContain('text-align: center')
    expect(out).toContain('color: red')
  })
})
