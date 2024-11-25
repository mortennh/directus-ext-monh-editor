import { mergeAttributes, Node } from '@tiptap/core'

export const Svg = Node.create({
  name: 'svg',
  group: 'inline',
  inline: true,
  content: 'inline*',

  addAttributes() {
    return {
      'class': {
        default: null,
      },
      'xmlns': {
        default: null,
      },
      'viewBox': {
        default: null,
        parseHTML: element => element.getAttribute('viewBox'),
        renderHTML: (attributes) => {
          if (!attributes.viewBox) {
            return {}
          }
          return {
            viewBox: attributes.viewBox,
          }
        },
      },
      'aria-hidden': {
        default: 'false',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'svg',
        getAttrs: element => ({
          'class': element.getAttribute('class'),
          'xmlns': element.getAttribute('xmlns'),
          'viewBox': element.getAttribute('viewBox'),
          'aria-hidden': element.getAttribute('aria-hidden'),
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['svg', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})
