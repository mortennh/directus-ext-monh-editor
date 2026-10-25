/**
 * HTML preservation — keeps markup the editor has no tools for.
 *
 * ProseMirror drops every element and attribute its schema doesn't know as
 * soon as content is loaded, and the field is written back on the next save.
 * The migrated WordPress content is full of such markup (images, YouTube and
 * Datawrapper embeds, accordions, Elementor wrappers, heading anchors), so
 * opening and saving an item silently destroyed it.
 *
 * Rule: what the editor doesn't understand comes out exactly as it went in.
 * - HtmlEmbed:     iframe/script/video/… kept verbatim as a non-editable block
 * - HtmlInlineEmbed: <a id> jump targets and <wbr> kept verbatim
 * - HtmlImage:     <img> as inline node with all its attributes
 * - HtmlContainer: div/section/figure/details/… wrappers, content stays editable
 * - HtmlTextBlock: summary/figcaption
 * - Subscript/Superscript marks
 * - PreserveAttributes: id, style, lang, data-*, … on the standard nodes/marks
 */
import { Extension, Mark, Node } from '@tiptap/core'

type Attrs = Record<string, string>

/** All attributes of an element, minus those another extension owns. */
function collectAttrs(element: HTMLElement, skip: string[] = []): Attrs | null {
  const attrs: Attrs = {}
  for (const { name, value } of Array.from(element.attributes)) {
    if (!skip.includes(name))
      attrs[name] = value
  }
  return Object.keys(attrs).length ? attrs : null
}

const TAG_RE = /^<([a-z0-9-]+)/i
const SRC_RE = /\ssrc="([^"]*)"/
const TEXT_ALIGN_RE = /^text-align\s*:/i
const HEADING_STYLE_RE = /^hl-(?:serif|sans|bar)$/
const WHITESPACE_RE = /\s+/

const EMBED_TAGS = ['iframe', 'script', 'noscript', 'video', 'audio', 'object', 'embed', 'style', 'form', 'canvas']
const CONTAINER_TAGS = ['div', 'section', 'article', 'header', 'footer', 'aside', 'nav', 'main', 'figure', 'details', 'dl']
const TEXTBLOCK_TAGS = ['summary', 'figcaption', 'dt', 'dd']

/** Verbatim embed: stored as outerHTML, shown as a labelled placeholder. */
export const HtmlEmbed = Node.create({
  name: 'htmlEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      html: {
        default: '',
        parseHTML: element => element.outerHTML,
        rendered: false,
      },
    }
  },

  parseHTML() {
    return EMBED_TAGS.map(tag => ({ tag, priority: 60 }))
  },

  renderHTML({ node }) {
    const template = document.createElement('template')
    template.innerHTML = node.attrs.html
    return template.content.firstElementChild ?? ['span']
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.className = 'editor-html-embed'
      dom.contentEditable = 'false'
      const tag = TAG_RE.exec(node.attrs.html)?.[1] ?? 'html'
      const src = SRC_RE.exec(node.attrs.html)?.[1]
      dom.textContent = `Eingebettetes HTML <${tag}>${src ? ` – ${src}` : ''} (bleibt erhalten, hier nicht bearbeitbar)`
      return { dom }
    }
  },
})

/** Inline counterpart: anchors without href (jump targets), <wbr>. */
export const HtmlInlineEmbed = Node.create({
  name: 'htmlInlineEmbed',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      html: {
        default: '',
        parseHTML: element => element.outerHTML,
        rendered: false,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a:not([href])', priority: 60 }, { tag: 'wbr' }]
  },

  renderHTML({ node }) {
    const template = document.createElement('template')
    template.innerHTML = node.attrs.html
    return template.content.firstElementChild ?? ['span']
  },
})

export const HtmlImage = Node.create({
  name: 'htmlImage',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      htmlAttrs: {
        default: null,
        parseHTML: element => collectAttrs(element),
        renderHTML: attributes => attributes.htmlAttrs ?? {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'img' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', HTMLAttributes]
  },
})

function wrapperNode(name: string, tags: string[], content: string) {
  return Node.create({
    name,
    group: 'block',
    content,
    defining: true,

    addAttributes() {
      return {
        tag: {
          default: tags[0],
          parseHTML: element => element.tagName.toLowerCase(),
          rendered: false,
        },
        htmlAttrs: {
          default: null,
          parseHTML: element => collectAttrs(element),
          renderHTML: attributes => attributes.htmlAttrs ?? {},
        },
      }
    },

    parseHTML() {
      return tags.map(tag => ({ tag }))
    },

    renderHTML({ node, HTMLAttributes }) {
      return [node.attrs.tag, HTMLAttributes, 0]
    },

    // In the editor a neutral labelled box: a closed <details> would hide its
    // content, legacy inline styles would break the admin layout
    addNodeView() {
      return ({ node }) => {
        const dom = document.createElement('div')
        dom.className = 'editor-html-container'
        dom.dataset.tag = node.attrs.tag
        return { dom, contentDOM: dom }
      }
    },
  })
}

export const HtmlContainer = wrapperNode('htmlContainer', CONTAINER_TAGS, 'block*')
export const HtmlTextBlock = wrapperNode('htmlTextBlock', TEXTBLOCK_TAGS, 'inline*')

function simpleMark(name: string, tag: string) {
  return Mark.create({
    name,
    parseHTML: () => [{ tag }],
    renderHTML: () => [tag, 0],
  })
}

export const Subscript = simpleMark('subscript', 'sub')
export const Superscript = simpleMark('superscript', 'sup')

/** Strips what another extension renders itself (TextAlign, HeadingStyles). */
function withoutOwned(attrs: Attrs | null, ownsAlign: boolean): Attrs | null {
  if (!attrs)
    return null
  if (attrs.style && ownsAlign) {
    const style = attrs.style.split(';').map(s => s.trim()).filter(s => s && !TEXT_ALIGN_RE.test(s)).join('; ')
    if (style)
      attrs.style = style
    else
      delete attrs.style
  }
  if (attrs.class) {
    const cls = attrs.class.split(WHITESPACE_RE).filter(c => c && !HEADING_STYLE_RE.test(c)).join(' ')
    if (cls)
      attrs.class = cls
    else
      delete attrs.class
  }
  return Object.keys(attrs).length ? attrs : null
}

function preserved(skip: string[], ownsAlign = false) {
  return {
    htmlAttrs: {
      default: null,
      parseHTML: (element: HTMLElement) => withoutOwned(collectAttrs(element, skip), ownsAlign),
      renderHTML: (attributes: Record<string, any>) => attributes.htmlAttrs ?? {},
    },
  }
}

export const PreserveAttributes = Extension.create({
  name: 'preserveAttributes',

  addGlobalAttributes() {
    return [
      // TextAlign renders text-align on paragraphs and headings itself
      { types: ['paragraph', 'heading'], attributes: preserved([], true) },
      { types: ['blockquote', 'bulletList', 'listItem', 'tableRow'], attributes: preserved([]) },
      { types: ['orderedList'], attributes: preserved(['start', 'type']) },
      { types: ['tableCell', 'tableHeader'], attributes: preserved(['colspan', 'rowspan', 'colwidth']) },
      { types: ['table'], attributes: preserved([]) },
      { types: ['link'], attributes: preserved(['href', 'target', 'rel', 'class']) },
      { types: ['span'], attributes: preserved(['class', 'data-form-id']) },
      { types: ['svg'], attributes: preserved(['class', 'xmlns', 'viewBox', 'aria-hidden']) },
      { types: ['svgPath'], attributes: preserved(['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule']) },
      { types: ['bold', 'italic', 'underline', 'strike', 'subscript', 'superscript'], attributes: preserved([]) },
    ]
  },
})

export const HTML_PRESERVE = [HtmlEmbed, HtmlInlineEmbed, HtmlImage, HtmlContainer, HtmlTextBlock, Subscript, Superscript, PreserveAttributes]
