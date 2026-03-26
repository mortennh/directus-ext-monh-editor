<script setup lang="ts">
import Link from '@tiptap/extension-link'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FormModal from './components/FormModal.vue'
import LinkModal from './components/LinkModal.vue'
import { FileLink } from './formats/file-link-tiptap'
import { Span } from './formats/span-tiptap'
import { Svg } from './formats/svg-tiptap'
import { SvgPath } from './formats/svgPath'

const props = defineProps<{
  field: object
  collection: string
  value: string
  primaryKey: string
}>()

const emit = defineEmits(['input'])

const modal = ref<'link' | 'file' | 'form' | null>(null)

const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'editor-link',
      },
    }),
    FileLink.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'editor-link-type-file',
      },
    }),
    Span,
    Svg,
    SvgPath,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
  ],
  onUpdate: ({ editor }) => {
    emit('input', editor.getHTML())
  },
})

function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function openModal(type: 'link' | 'file' | 'form') {
  modal.value = type
}

function onSetLink(payload) {
  if (!editor.value)
    return

  if (payload.type === 'file') {
    editor.value.chain()
      .focus()
      .setFileLink({
        href: payload.url.value,
        title: payload.title.value,
        filesize: formatFileSize(payload.filesize.value),
      })
      .run()
  }
  else {
    editor.value.chain()
      .focus()
      .setLink({
        href: payload.url.value,
        class: payload.type === 'button' ? 'editor-link-type-button' : payload.type === 'cta' ? 'editor-link-type-cta' : '',
      })
      .command(({ tr }) => {
        tr.insertText(payload.title.value)
        return true
      })
      .run()
  }

  modal.value = null
}

function onSetForm(payload) {
  if (!editor.value) {
    return
  }

  editor.value.chain()
    .focus()
    .insertContent({
      type: 'span',
      attrs: {
        'class': 'editor-form-link',
        'data-form-id': payload.id,
      },
      content: [{
        type: 'text',
        text: payload.title,
      }],
    })
    .run()

  modal.value = null
}

function getSelectionData() {
  if (!editor.value)
    return null

  const { from, to } = editor.value.state.selection
  const text = editor.value.state.doc.textBetween(from, to)
  const linkMark = editor.value.getAttributes('link')

  return {
    text,
    link: linkMark.href || '',
    class: linkMark.class || '',
    range: { from, to },
  }
}

onMounted(() => {
  if (props.value) {
    editor.value?.commands.setContent(props.value)
  }
})

watch(() => props.value, (newValue) => {
  if (newValue) {
    editor.value?.commands.setContent(newValue)
  }
}, {
  once: true,
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <VOverlay :active="modal !== null">
    <LinkModal
      v-if="modal !== null && ['link', 'file'].includes(modal)"
      :selection="getSelectionData()"
      :type="modal"
      @cancel="modal = null"
      @set-link="onSetLink"
    />
    <FormModal
      v-if="modal !== null && modal === 'form'"
      @cancel="modal = null"
      @set-form="onSetForm"
    />
  </VOverlay>

  <div class="editor-wrapper">
    <div class="editor-toolbar">
      <button
        :class="{ 'is-active': editor?.isActive('paragraph') }"
        @click="editor?.chain().focus().setParagraph().run()"
      >
        <i class="ri-paragraph" />
      </button>
      <button
        :class="{ 'is-active': editor?.isActive('bold') }"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <i class="ri-bold" />
      </button>
      <button
        :class="{ 'is-active': editor?.isActive('italic') }"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <i class="ri-italic" />
      </button>
      <button
        :class="{ 'is-active': editor?.isActive('underline') }"
        @click="editor?.chain().focus().toggleUnderline().run()"
      >
        <i class="ri-underline" />
      </button>
      <button
        :class="{ 'is-active': editor?.isActive('strike') }"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <i class="ri-strikethrough" />
      </button>
      <span class="editor-separator">|</span>
      <button
        :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <i class="ri-h-2" />
      </button>
      <button
        :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        <i class="ri-h-3" />
      </button>
      <button
        :class="{ 'is-active': editor?.isActive('heading', { level: 4 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 4 }).run()"
      >
        <i class="ri-h-4" />
      </button>
      <button
        :class="{ 'is-active': editor?.isActive('heading', { level: 5 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 5 }).run()"
      >
        <i class="ri-h-5" />
      </button>
      <span class="editor-separator">|</span>
      <button
        :class="{ 'is-active': editor?.isActive('bulletList') }"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <i class="ri-list-unordered" />
      </button>
      <button
        :class="{ 'is-active': editor?.isActive('orderedList') }"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <i class="ri-list-ordered" />
      </button>
      <span class="editor-separator">|</span>
      <button
        :class="{ 'is-active': editor?.isActive({ textAlign: 'left' }) }"
        @click="editor?.chain().focus().setTextAlign('left').run()"
      >
        <i class="ri-align-left" />
      </button>
      <button
        :class="{ 'is-active': editor?.isActive({ textAlign: 'center' }) }"
        @click="editor?.chain().focus().setTextAlign('center').run()"
      >
        <i class="ri-align-center" />
      </button>
      <button
        :class="{ 'is-active': editor?.isActive({ textAlign: 'right' }) }"
        @click="editor?.chain().focus().setTextAlign('right').run()"
      >
        <i class="ri-align-right" />
      </button>
      <button
        :class="{ 'is-active': editor?.isActive({ textAlign: 'justify' }) }"
        @click="editor?.chain().focus().setTextAlign('justify').run()"
      >
        <i class="ri-align-justify" />
      </button>
      <span class="editor-separator">|</span>
      <button @click="openModal('link')">
        <i class="ri-link" />
      </button>
      <button @click="openModal('file')">
        <i class="ri-file-line" />
      </button>
      <button
        title="Form"
        @click="openModal('form')"
      >
        <i class="ri-survey-line" />
      </button>
    </div>

    <EditorContent :editor="editor" />
  </div>
</template>

<style>
@import 'remixicon/fonts/remixicon.css';

.editor-wrapper {
  border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
}

.editor-wrapper :where(p, ul, ol, pre):not(:where(.not-prose, .not-prose *)) {
  margin: 1em 0;
  line-height: 1.5;
}

.editor-toolbar {
  padding: 0.5rem;
  border-bottom: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
  background-color: var(--background-subdued);
  border-radius: var(--theme--border-radius);
}

.editor-toolbar button {
  margin-right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  font-size: 18px;
}

.editor-toolbar button:hover {
  background-color: var(--background-highlight);
}

.editor-toolbar button.is-active {
  background-color: var(--foreground-inverted);
  border-radius: 4px;
}

.editor-separator {
  display: inline-block;
  margin-inline: 1rem;
  color: var(--theme--form--field--input--border-color);
}

.ProseMirror {
  padding: 1rem;
  min-height: 240px;
  display: flex;
  flex-direction: column;
}

.editor-link {
  color: blue;
  text-decoration: underline;
}

.editor-link-type-button,
.editor-link-type-cta {
  display: inline-block;
  text-decoration: none;
  border-radius: 2rem;
  padding: .75rem 1rem;
  font-weight: 600;
  margin: 0 4px;
}

.editor-link-type-button {
  background-color: #fff;
  color: #000;
  border: 1px solid #000;
}

.editor-link-type-cta {
  background-color: #883457;
  color: white;
}

.editor-link-type-file {
  display: inline-flex;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 2px solid var(--theme--foreground);
  text-decoration: none;
  color: var(--theme--foreground);
}

.editor-link-type-file-content {
  display: flex;
  flex-direction: column;
}

.editor-link-type-file-icon {
  display: block;
  width: 1rem;
  height: 1rem;
}

.editor-form-link {
  background-color: var(--background-normal-alt);
  padding: 16px;
  border: var(--theme--border-width) solid var(--theme--border-color)
}

h1 {
  font-size: 1.625em
}

h2 {
  font-size: 1.375em
}

h3 {
  font-size: 1.25em
}

h4 {
  font-size: 1.125em
}

p, ul, ol, pre {
  line-height: 1.5
}
</style>
