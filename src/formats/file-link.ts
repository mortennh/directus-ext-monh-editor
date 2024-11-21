import Inline from 'quill/blots/inline'

interface TValue { url: string, title: string, filesize: string }

class FileDownloadBlot extends Inline {
  static blotName = 'file-download'
  static tagName = 'a'

  static create(value: TValue) {
    const node = super.create(value)
    node.setAttribute('href', value.url)
    node.setAttribute('class', 'ql-link-type-file')

    // Store original values as data attributes
    node.setAttribute('data-title', value.title)
    node.setAttribute('data-filesize', value.filesize)

    // Create spans for file name and size
    const nameSpan = document.createElement('span')
    const groupSpan = document.createElement('span')
    nameSpan.className = 'ql-link-type-file-name'
    nameSpan.textContent = value.title

    const sizeSpan = document.createElement('span')
    sizeSpan.className = 'ql-link-type-file-size'
    sizeSpan.textContent = value.filesize

    groupSpan.appendChild(nameSpan)
    groupSpan.appendChild(sizeSpan)

    node.appendChild(groupSpan)

    return node
  }

  static formats(node: HTMLElement) {
    return {
      url: node.getAttribute('href'),
      title: node.getAttribute('data-title'),
      filesize: node.getAttribute('data-filesize'),
    }
  }

  static value(domNode: HTMLElement) {
    return {
      url: domNode.getAttribute('href'),
      title: domNode.getAttribute('data-title'),
      filesize: domNode.getAttribute('data-filesize'),
    }
  }

  format(name: string, value: TValue) {
    if (name === 'file-download' && value) {
      this.domNode.setAttribute('href', value.url)
      this.domNode.setAttribute('data-title', value.title)
      this.domNode.setAttribute('data-filesize', value.filesize)
      this.domNode.setAttribute('class', 'ql-link-type-file')

      // Update spans inside the link
      const nameSpan = this.domNode.querySelector('.ql-link-type-file-name')
      const sizeSpan = this.domNode.querySelector('.ql-link-type-file-size')

      if (nameSpan) {
        nameSpan.textContent = value.title
      }
      if (sizeSpan) {
        sizeSpan.textContent = value.filesize
      }
    }
    else {
      super.format(name, value)
    }
  }
}

export { FileDownloadBlot as default }
