/**
 * HeadingStyles — optional visual styles for headings in the MONH editor.
 *
 * Stores two attributes on every heading node and maps them to semantic
 * classes understood by BOTH the editor preview and the Nuxt frontend
 * (see docs/specs/monh-editor-heading-styles.md):
 *
 * - hlFont: 'serif' | 'sans' | null  → class hl-serif / hl-sans
 * - hlBar:  boolean                  → class hl-bar (green accent bar on top;
 *                                       does NOT force a font, unlike .bar-hl)
 *
 * Headings without classes render exactly as before — zero migration.
 */
import { Extension } from '@tiptap/core'

export type HeadingFont = 'serif' | 'sans'

export interface HeadingStylesOptions {
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    headingStyles: {
      toggleHeadingFont: (font: HeadingFont) => ReturnType
      toggleHeadingBar: () => ReturnType
    }
  }
}

export const HeadingStyles = Extension.create<HeadingStylesOptions>({
  name: 'headingStyles',

  addOptions() {
    return { types: ['heading'] }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          hlFont: {
            default: null,
            parseHTML: (element) => {
              if (element.classList.contains('hl-serif'))
                return 'serif'
              if (element.classList.contains('hl-sans'))
                return 'sans'
              return null
            },
            renderHTML: (attributes) => {
              if (!attributes.hlFont)
                return {}
              return { class: `hl-${attributes.hlFont}` }
            },
          },
          hlBar: {
            default: false,
            parseHTML: element => element.classList.contains('hl-bar'),
            renderHTML: (attributes) => {
              if (!attributes.hlBar)
                return {}
              return { class: 'hl-bar' }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      toggleHeadingFont: font => ({ chain, editor }) => {
        const current = editor.getAttributes('heading').hlFont
        return chain()
          .focus()
          .updateAttributes('heading', { hlFont: current === font ? null : font })
          .run()
      },
      toggleHeadingBar: () => ({ chain, editor }) => {
        const current = editor.getAttributes('heading').hlBar
        return chain()
          .focus()
          .updateAttributes('heading', { hlBar: !current })
          .run()
      },
    }
  },
})
