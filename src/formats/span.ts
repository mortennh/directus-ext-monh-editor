import Embed from 'quill/blots/embed'

class Span extends Embed {
  static blotName = 'spanEmbed'
  static tagName = 'span'

  static create(value: string) {
    const node = super.create()
    node.textContent = value
    return node
  }
}

export { Span as default }
