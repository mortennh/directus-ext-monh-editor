/**
 * The editor's schema — one list for the interface and the tests, so the
 * tests check exactly what editors get.
 */
import Link from '@tiptap/extension-link'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { FileLink } from './file-link-tiptap'
import { HeadingStyles } from './heading-styles'
import { HTML_PRESERVE } from './html-preserve'
import { Span } from './span-tiptap'
import { Svg } from './svg-tiptap'
import { SvgPath } from './svgPath'
import { TABLE_KIT } from './tables'

export function editorExtensions() {
  return [
    StarterKit,
    // Heading visual styles: hl-serif / hl-sans / hl-bar classes
    HeadingStyles,
    Underline,
    // Standard <a> links (internal/external with class-based styling)
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'editor-link' },
    }),
    // File-download links rendered as <a data-file-link> with SVG icon
    FileLink.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'editor-link-type-file' },
    }),
    // Generic <span> node (used for form-link embeds)
    Span,
    // Inline SVG + <path> nodes (used inside FileLink for the doc icon)
    Svg,
    SvgPath,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    // Tables — always loaded (even with the table button hidden), so existing
    // tables survive editing
    TABLE_KIT,
    // Everything else in existing content survives unchanged
    ...HTML_PRESERVE,
  ]
}
