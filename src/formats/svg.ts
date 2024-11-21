import Embed from 'quill/blots/embed'

class Svg extends Embed {
  static blotName = 'svgEmbed'
  static tagName = 'svg'

  static create() {
    return super.create()
  }
}

export { Svg as default }
