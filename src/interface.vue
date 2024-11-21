<script setup lang="ts">
import Quill from 'quill'
import { Delta } from 'quill/core'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LinkModal from './components/LinkModal.vue'
import FileLink from './formats/file-link'

import Link from './formats/link'
import Span from './formats/span'
import 'quill/dist/quill.snow.css'

const props = defineProps<{
  field: object
  collection: string
  value: string
  primaryKey: string
}>()
const emit = defineEmits(['input'])

export type modalType = 'link' | 'file' | null

const editor = ref(null)
let editorInstance: Quill
const Parchment = Quill.import('parchment')
const modal = ref<modalType>(null)

Quill.register(FileLink)
Quill.register(Span)
Quill.register(Link, true)

// Register button class
const linkClass = new Parchment.ClassAttributor('link-type', 'ql-link-type', { scope: Parchment.Scope.INLINE })
Quill.register(linkClass, true)

function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function onSetLink(payload) {
  const range = editorInstance.getSelection(true)
  let delta: Delta
  let cursorPosition: number

  if (payload.type === 'file') {
    delta = new Delta()
      .insert('\uFEFF', {
        'file-download': {
          url: payload.url.value,
          title: payload.title.value,
          filesize: formatFileSize(payload.filesize.value),
        },
      })
  }
  else {
    const linkFormat: any = {
      link: payload.url.value,
    }
    if (payload.type === 'button' || payload.type === 'cta') {
      linkFormat['link-type'] = payload.type
    }
    delta = new Delta().insert(payload.title.value, linkFormat)
  }

  if (range && range.length > 0) {
    editorInstance.updateContents(
      new Delta().retain(range.index).delete(range.length).concat(delta),
      'user',
    )
    cursorPosition = range.index
  }
  else {
    cursorPosition = range ? range.index : editorInstance.getLength()
    editorInstance.updateContents(
      new Delta().retain(cursorPosition).concat(delta),
      'user',
    )
  }

  editorInstance.setSelection(
    range ? range.index + delta.length() : cursorPosition + delta.length(),
    0,
    'user',
  )

  cleanFileLinks()
  modal.value = null
}
function getSelectionData() {
  const range = editorInstance.getSelection(true)
  if (!range)
    return null

  const formats = editorInstance.getFormat(range)
  const text = editorInstance.getText(range.index, range.length)

  return {
    text,
    link: formats.link || '',
    class: formats['link-type'] || '',
    range,
  }
}

function openModal(type: modalType) {
  const selection = getSelectionData()

  if (!selection?.text && type === 'link') {
    const cursor = editorInstance.getSelection(true)
    if (cursor) {
      const [leaf] = editorInstance.getLeaf(cursor.index)
      if (leaf && leaf.parent.domNode.tagName === 'A') {
        const linkLength = leaf.parent.length()
        editorInstance.setSelection(cursor.index - cursor.offset, linkLength)
      }
    }
  }

  modal.value = type
}

function cleanFileLinks() {
  const range = editorInstance.getSelection()

  editorInstance.root.querySelectorAll('.ql-link-type-file').forEach((link: HTMLElement) => {
    const nameSpan = link.querySelector('.ql-link-type-file-name')
    const sizeSpan = link.querySelector('.ql-link-type-file-size')

    if (nameSpan) {
      nameSpan.innerHTML = nameSpan.textContent || ''
    }
    if (sizeSpan) {
      sizeSpan.innerHTML = sizeSpan.textContent || ''
    }

    // Remove any zero-width spaces
    link.innerHTML = link.innerHTML.replace(/\uFEFF/g, '')

    // Ensure the link structure is correct
    const title = link.getAttribute('data-title')
    const filesize = link.getAttribute('data-filesize')

    if (!nameSpan || !sizeSpan) {
      link.innerHTML = ''
      const newNameSpan = document.createElement('span')
      newNameSpan.className = 'ql-link-type-file-name'
      newNameSpan.textContent = title || ''

      const newSizeSpan = document.createElement('span')
      newSizeSpan.className = 'ql-link-type-file-size'
      newSizeSpan.textContent = filesize || ''

      link.appendChild(newNameSpan)
      link.appendChild(newSizeSpan)
    }
  })

  if (range) {
    editorInstance.setSelection(range)
  }
}

const onEditorChanges = () => emit('input', editorInstance.root.innerHTML)

onMounted(() => {
  if (editor.value) {
    editorInstance = new Quill(`#editor-${props.field}-${props.primaryKey}`, {
      modules: {
        toolbar: `#toolbar-${props.field}-${props.primaryKey}`,
      },
      theme: 'snow',
    })

    editorInstance.on('editor-change', onEditorChanges)

    cleanFileLinks()

    if (props.value) {
      editorInstance.root.innerHTML = props.value
    }
  }
})

onBeforeUnmount(() => {
  editorInstance.off('editor-change', onEditorChanges)
})

watch(() => props.value, (newValue) => {
  if (editorInstance && newValue !== editorInstance.root.innerHTML) {
    editorInstance.root.innerHTML = newValue

    cleanFileLinks()
  }
})
</script>

<template>
  <VOverlay :active="modal !== null">
    <LinkModal
      v-if="modal !== null"
      :selection="getSelectionData()"
      :type="modal"
      @cancel="modal = null"
      @set-link="onSetLink"
    />
  </VOverlay>
  <div :id="`toolbar-${field}-${primaryKey}`">
    <span class="ql-formats">
      <select class="ql-size">
        <option value="small">Small</option>
        <option
          value="normal"
          selected
        >Normal</option>
        <option value="large">Large</option>
      </select>
    </span>
    <span class="ql-formats">
      <button class="ql-bold" />
      <button class="ql-italic" />
      <button class="ql-underline" />
    </span>
    <span class="ql-formats">
      <select class="ql-align" />
    </span>
    <span class="ql-formats">
      <button
        class="ql-list"
        value="ordered"
      />
      <button
        class="ql-list"
        value="bullet"
      />
      <button
        class="ql-indent"
        value="-1"
      />
      <button
        class="ql-indent"
        value="+1"
      />
    </span>
    <span class="ql-formats">
      <button class="ql-link" />
      <button class="ql-clean" />
      <button @click="openModal('link')">
        B
      </button>
      <button @click="openModal('file')">
        F
      </button>
    </span>
  </div>

  <div
    :id="`editor-${field}-${primaryKey}`"
    ref="editor"
  />
</template>

<style>
.ql-editor {
  min-height: 240px;
}

a.ql-link-type-button,
a.ql-link-type-cta {
  display: inline-block;
  text-decoration: none;
  border-radius: 2rem;
  padding: .75rem 1rem;
  font-weight: 600;
  margin: 0 4px;
}

a.ql-link-type-button,
a.ql-link-type-file {
  background-color: #fff;
  color: #000;
}

a.ql-link-type-file {
  text-decoration: none;
  display: inline-flex;
  flex-direction: column;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 2px solid #000;
}

.ql-link-type-file-name {
  font-weight: bold;
}

.ql-link-type-file-size {
  font-size: 0.8em;
  color: #666;
}

a.ql-link-type-cta {
  background-color: #883457;
  color: white;
}
</style>
