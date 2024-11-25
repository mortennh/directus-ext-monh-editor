import { mergeAttributes, Node } from '@tiptap/core'

export const FileLink = Node.create({
  name: 'fileLink',

  group: 'inline',

  inline: true,

  content: 'inline*',

  addAttributes() {
    return {
      href: {
        default: null,
      },
      title: {
        default: null,
      },
      filesize: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-file-link]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-file-link': '' }), 0]
  },

  addCommands() {
    return {
      setFileLink: attributes => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: attributes,
            content: [
              {
                type: 'svg',
                attrs: {
                  'class': 'editor-link-type-file-icon',
                  'xmlns': 'http://www.w3.org/2000/svg',
                  'aria-hidden': 'true',
                  'viewBox': '0 0 50 50',
                },
                content: [
                  {
                    type: 'path',
                    attrs: {
                      d: 'M7 2v46h36V14.594l-.281-.313-12-12L30.406 2zm2 2h20v12h12v30H9zm22 1.438L39.563 14H31z',
                    },
                  },
                ],
              },
              {
                type: 'span',
                attrs: { class: 'editor-link-type-file-content' },
                content: [
                  {
                    type: 'span',
                    attrs: { class: 'editor-link-type-file-title' },
                    content: [{ type: 'text', text: attributes.title }],
                  },
                  {
                    type: 'span',
                    attrs: { class: 'editor-link-type-file-size' },
                    content: [{ type: 'text', text: attributes.filesize }],
                  },
                ],
              },
            ],
          })
          .run()
      },
    }
  },
})
