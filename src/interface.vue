<script lang="ts">
/**
 * ModalType — discriminated type for the three overlay modals
 * used by the editor toolbar.
 *
 * 'link'  → LinkModal (internal/external URL + style picker)
 * 'file'  → LinkModal in file-upload mode (select/upload a file)
 * 'form'  → FormModal (pick a form from a configurable collection)
 */
</script>

<script setup lang="ts">
/**
 * MONH Editor — main interface component
 *
 * Wraps a TipTap editor with a configurable toolbar and three
 * modal dialogs for inserting links, file downloads and form embeds.
 */
import Link from '@tiptap/extension-link'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FormModal from './components/FormModal.vue'
import LinkModal from './components/LinkModal.vue'
import { FileLink } from './formats/file-link-tiptap'
import { Span } from './formats/span-tiptap'
import { Svg } from './formats/svg-tiptap'
import { SvgPath } from './formats/svgPath'

export type ModalType = 'link' | 'file' | 'form'

// ---------------------------------------------------------------------------
// Props & emits
// ---------------------------------------------------------------------------

const props = defineProps<{
  field: object
  collection: string
  value: string
  primaryKey: string
  /** Configurable toolbar items (set in Directus field settings) */
  toolbar?: string[]
  /** Allowed link style options in the link modal */
  linkStyles?: string[]
  /** Collection name used by FormModal (defaults to "forms") */
  formCollection?: string
}>()

const emit = defineEmits(['input'])

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

/**
 * Walk up the Vue parent tree to find the `lang` prop set by Directus on the
 * translations row component. Returns null when the editor is used outside a
 * translations field.
 */
function getTranslationLang(): string | null {
  let parent = getCurrentInstance()?.parent
  while (parent) {
    if (parent.props?.lang) {
      return parent.props.lang as string
    }
    parent = parent.parent
  }
  return null
}

const lang = getTranslationLang()

// ---------------------------------------------------------------------------
// Toolbar visibility helpers
// ---------------------------------------------------------------------------

/** Toolbar groups — used to compute separator visibility */
const FORMATTING = ['paragraph', 'bold', 'italic', 'underline', 'strike']
const HEADINGS = ['h2', 'h3', 'h4', 'h5']
const LISTS = ['bulletList', 'orderedList']
const ALIGNMENT = ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']
const LINKS = ['link', 'fileLink', 'formLink']

/**
 * Returns true when the given toolbar item should be visible.
 * If no `toolbar` prop is set (or empty), all items are shown.
 */
function has(item: string): boolean {
  if (!props.toolbar || props.toolbar.length === 0)
    return true
  return props.toolbar.includes(item)
}

// Show a group separator only when both adjacent groups have visible items
const showSep1 = computed(() => FORMATTING.some(has) && HEADINGS.some(has))
const showSep2 = computed(() => [...FORMATTING, ...HEADINGS].some(has) && LISTS.some(has))
const showSep3 = computed(() => [...FORMATTING, ...HEADINGS, ...LISTS].some(has) && ALIGNMENT.some(has))
const showSep4 = computed(() => [...FORMATTING, ...HEADINGS, ...LISTS, ...ALIGNMENT].some(has) && LINKS.some(has))

// ---------------------------------------------------------------------------
// TipTap editor setup
// ---------------------------------------------------------------------------

/** Currently open modal (null = no modal) */
const modal = ref<ModalType | null>(null)

const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
    // Standard <a> links (internal/external with class-based styling)
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'editor-link' },
    }),
    // File-download links rendered as <a data-file-link> with SVG icon
    FileLink.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'editor-link-type-file' },
    }),
    // Generic <span> node (used for form-link embeds)
    Span,
    // Inline SVG + <path> nodes (used inside FileLink for the doc icon)
    Svg,
    SvgPath,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ],
  onUpdate: ({ editor }) => {
    emit('input', editor.getHTML())
  },
})

// Initialise editor content when the component mounts or when the
// Directus field value first becomes available.
onMounted(() => {
  if (props.value)
    editor.value?.commands.setContent(props.value)
})

watch(() => props.value, (newValue) => {
  if (newValue)
    editor.value?.commands.setContent(newValue)
}, { once: true })

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// ---------------------------------------------------------------------------
// Link insertion handlers
// ---------------------------------------------------------------------------

/** Format a byte count as a human-readable file size string */
function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

/** Open one of the three modal dialogs */
function openModal(type: ModalType) {
  modal.value = type
}

/**
 * Handle the `setLink` event from LinkModal.
 *
 * - File links → insert a FileLink node (SVG icon + title/size)
 * - Button/CTA links → insert a standard <a> with a class modifier
 * - Default links → insert a plain <a>
 */
function onSetLink(payload: any) {
  if (!editor.value)
    return

  if (payload.type === 'file') {
    ;(editor.value.chain().focus() as any).setFileLink({
      href: payload.url.value,
      title: payload.title.value,
      filesize: formatFileSize(payload.filesize.value),
    }).run()
  }
  else {
    const linkClass = payload.type === 'button'
      ? 'editor-link-type-button'
      : payload.type === 'cta'
        ? 'editor-link-type-cta'
        : ''

    editor.value.chain()
      .focus()
      .setLink({ href: payload.url.value, class: linkClass })
      .command(({ tr }) => {
        tr.insertText(payload.title.value)
        return true
      })
      .run()
  }

  modal.value = null
}

/**
 * Handle the `setForm` event from FormModal.
 * Inserts a <span class="editor-form-link" data-form-id="…"> node.
 */
function onSetForm(payload: any) {
  if (!editor.value)
    return

  editor.value.chain().focus().insertContent({
    type: 'span',
    attrs: { 'class': 'editor-form-link', 'data-form-id': payload.id },
    content: [{ type: 'text', text: payload.name }],
  }).run()

  modal.value = null
}

/**
 * Extract the current editor selection data (text + link attributes)
 * so the LinkModal can pre-fill its fields when editing an existing link.
 */
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
</script>

<template>
  <!-- Modal overlays -->
  <VOverlay :active="modal !== null">
    <LinkModal
      v-if="modal === 'link' || modal === 'file'"
      :selection="getSelectionData()"
      :type="modal"
      :link-styles="linkStyles"
      :current-lang="lang"
      @cancel="modal = null"
      @set-link="onSetLink"
    />
    <FormModal
      v-if="modal === 'form'"
      :form-collection="formCollection"
      @cancel="modal = null"
      @set-form="onSetForm"
    />
  </VOverlay>

  <!-- Editor chrome -->
  <div class="editor-wrapper">
    <div class="editor-toolbar">
      <!-- Formatting group -->
      <button
        v-if="has('paragraph')"
        :class="{ 'is-active': editor?.isActive('paragraph') }"
        @click="editor?.chain().focus().setParagraph().run()"
      >
        <i class="ri-paragraph" />
      </button>
      <button
        v-if="has('bold')"
        :class="{ 'is-active': editor?.isActive('bold') }"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <i class="ri-bold" />
      </button>
      <button
        v-if="has('italic')"
        :class="{ 'is-active': editor?.isActive('italic') }"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <i class="ri-italic" />
      </button>
      <button
        v-if="has('underline')"
        :class="{ 'is-active': editor?.isActive('underline') }"
        @click="editor?.chain().focus().toggleUnderline().run()"
      >
        <i class="ri-underline" />
      </button>
      <button
        v-if="has('strike')"
        :class="{ 'is-active': editor?.isActive('strike') }"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <i class="ri-strikethrough" />
      </button>

      <!-- Headings group -->
      <span
        v-if="showSep1"
        class="editor-separator"
      >|</span>
      <button
        v-if="has('h2')"
        :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <i class="ri-h-2" />
      </button>
      <button
        v-if="has('h3')"
        :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        <i class="ri-h-3" />
      </button>
      <button
        v-if="has('h4')"
        :class="{ 'is-active': editor?.isActive('heading', { level: 4 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 4 }).run()"
      >
        <i class="ri-h-4" />
      </button>
      <button
        v-if="has('h5')"
        :class="{ 'is-active': editor?.isActive('heading', { level: 5 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 5 }).run()"
      >
        <i class="ri-h-5" />
      </button>

      <!-- Lists group -->
      <span
        v-if="showSep2"
        class="editor-separator"
      >|</span>
      <button
        v-if="has('bulletList')"
        :class="{ 'is-active': editor?.isActive('bulletList') }"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <i class="ri-list-unordered" />
      </button>
      <button
        v-if="has('orderedList')"
        :class="{ 'is-active': editor?.isActive('orderedList') }"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <i class="ri-list-ordered" />
      </button>

      <!-- Alignment group -->
      <span
        v-if="showSep3"
        class="editor-separator"
      >|</span>
      <button
        v-if="has('alignLeft')"
        :class="{ 'is-active': editor?.isActive({ textAlign: 'left' }) }"
        @click="editor?.chain().focus().setTextAlign('left').run()"
      >
        <i class="ri-align-left" />
      </button>
      <button
        v-if="has('alignCenter')"
        :class="{ 'is-active': editor?.isActive({ textAlign: 'center' }) }"
        @click="editor?.chain().focus().setTextAlign('center').run()"
      >
        <i class="ri-align-center" />
      </button>
      <button
        v-if="has('alignRight')"
        :class="{ 'is-active': editor?.isActive({ textAlign: 'right' }) }"
        @click="editor?.chain().focus().setTextAlign('right').run()"
      >
        <i class="ri-align-right" />
      </button>
      <button
        v-if="has('alignJustify')"
        :class="{ 'is-active': editor?.isActive({ textAlign: 'justify' }) }"
        @click="editor?.chain().focus().setTextAlign('justify').run()"
      >
        <i class="ri-align-justify" />
      </button>

      <!-- Links group -->
      <span
        v-if="showSep4"
        class="editor-separator"
      >|</span>
      <button
        v-if="has('link')"
        @click="openModal('link')"
      >
        <i class="ri-link" />
      </button>
      <button
        v-if="has('fileLink')"
        @click="openModal('file')"
      >
        <i class="ri-file-line" />
      </button>
      <button
        v-if="has('formLink')"
        title="Insert Form Link"
        @click="openModal('form')"
      >
        <i class="ri-survey-line" />
      </button>
    </div>

    <EditorContent :editor="editor" />
  </div>
</template>

<style>
/* ---------------------------------------------------------------------------
 * Global editor styles (unscoped — TipTap renders outside the component root)
 * --------------------------------------------------------------------------- */

@import 'remixicon/fonts/remixicon.css';

/* Wrapper / border */
.editor-wrapper {
  border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
}

.editor-wrapper :where(p, ul, ol, pre):not(:where(.not-prose, .not-prose *)) {
  margin: 1em 0;
  line-height: 1.5;
}

/* Toolbar bar */
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

/* ProseMirror content area */
.ProseMirror {
  padding: 1rem;
  min-height: 240px;
  display: flex;
  flex-direction: column;
}

/* --- Link styles (rendered inside the editor) --- */

.editor-link {
  color: blue;
  text-decoration: underline;
}

/* Shared base for button-style links */
.editor-link-type-button,
.editor-link-type-cta {
  display: inline-block;
  text-decoration: none;
  border-radius: 2rem;
  padding: .75rem 1rem;
  font-weight: 600;
  margin: 0 4px;
}

/* Outlined button style */
.editor-link-type-button {
  background-color: #fff;
  color: #000;
  border: 1px solid #000;
}

/* Filled CTA button style */
.editor-link-type-cta {
  background-color: #883457;
  color: white;
}

/* File download card */
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

/* Form embed inline block */
.editor-form-link {
  background-color: var(--background-normal-alt);
  padding: 16px;
  border: var(--theme--border-width) solid var(--theme--border-color);
}

/* --- Heading sizes (inside the editor) --- */
h1 { font-size: 1.625em; }
h2 { font-size: 1.375em; }
h3 { font-size: 1.25em; }
h4 { font-size: 1.125em; }

p, ul, ol, pre { line-height: 1.5; }
</style>
