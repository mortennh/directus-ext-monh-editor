/**
 * SvgPath — TipTap node for <path> elements inside SVG nodes
 *
 * Renders the actual vector shape (the "d" attribute) within the
 * parent <svg> used by FileLink's document icon.
 */
import { mergeAttributes, Node } from '@tiptap/core'

export const SvgPath = Node.create({
  name: 'path',

  group: 'inline',
  inline: true,
  content: 'inline*',

  addAttributes() {
    return {
      d: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'path',
        getAttrs: element => ({
          d: element.getAttribute('d'),
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['path', mergeAttributes(HTMLAttributes), 0]
  },
})
