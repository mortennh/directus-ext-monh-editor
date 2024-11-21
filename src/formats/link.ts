import Link from 'quill/formats/link'

class CustomLink extends Link {
  static create(value: string) {
    const node = super.create(value)
    value = this.sanitize(value)
    node.setAttribute('href', value)
    node.removeAttribute('target')
    return node
  }

  format(name: string, value: unknown) {
    super.format(name, value)
    this.domNode.removeAttribute('target')
  }
}

export { CustomLink as default }
