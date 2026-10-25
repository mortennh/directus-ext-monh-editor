import Link from '@tiptap/extension-link'

/**
 * Links: target/rel follow from the address, nothing else. External
 * (absolute http/https) → new tab, noopener noreferrer; internal, anchors,
 * mailto → neither. Old content had target="_blank" + nofollow on every link
 * (StarterKit's own unconfigured Link was registered twice); saving cleans it.
 */
const EXTERNAL_RE = /^(?:https?:)?\/\//i

export function isExternalHref(href: string | null | undefined): boolean {
  return !!href && EXTERNAL_RE.test(href)
}

export const EditorLink = Link.extend({
  renderHTML({ HTMLAttributes, mark }) {
    const { target: _target, rel: _rel, ...rest } = HTMLAttributes
    const attrs = isExternalHref(rest.href)
      ? { ...rest, target: '_blank', rel: 'noopener noreferrer' }
      : rest
    return this.parent!({ HTMLAttributes: attrs, mark })
  },
}).configure({
  openOnClick: false,
  HTMLAttributes: { class: 'editor-link', target: null, rel: null },
})
