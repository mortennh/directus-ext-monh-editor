import { mergeAttributes, Node } from '@tiptap/core'

export const Span = Node.create({
  name: 'span',

  group: 'inline',

  inline: true,

  content: 'inline*',

  addAttributes() {
    return {
      class: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: element => ({
          class: element.getAttribute('class'),
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },
})
