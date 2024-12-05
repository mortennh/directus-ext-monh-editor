import { mergeAttributes, Node } from '@tiptap/core'

export const Span = Node.create({
  name: 'span',

  group: 'inline',

  inline: true,

  content: 'inline*',

  addAttributes() {
    return {
      'class': {
        default: null,
      },
      'data-form-id': {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: element => ({
          'class': element.getAttribute('class'),
          'data-form-id': element.getAttribute('data-form-id'),
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },
})
