/**
 * MONH Editor — Directus interface extension
 *
 * A TipTap-based rich-text editor for the TRR 266 project with support for:
 * - Standard text formatting (bold, italic, underline, strikethrough)
 * - Headings (H2–H5)
 * - Lists (bullet, ordered)
 * - Text alignment
 * - Internal links (with auto-slug resolution and language prefix)
 * - File download links (with file upload/selection)
 * - Form embed links (dynamic collection picker)
 * - Configurable toolbar and link styles via field options
 */
import { defineInterface } from '@directus/extensions-sdk'
import InterfaceComponent from './interface.vue'

export default defineInterface({
  id: 'monh-editor',
  name: 'MONH Editor',
  icon: 'edit',
  description: 'TipTap rich-text editor with internal linking, file downloads and form embeds',
  component: InterfaceComponent,
  types: ['text'],

  // --- Field options (configurable in Directus data model settings) ---
  options: [
    {
      // Which toolbar buttons to display. Empty = show all.
      field: 'toolbar',
      name: 'Toolbar Controls',
      type: 'json',
      meta: {
        interface: 'select-multiple-checkbox',
        width: 'full',
        note: 'Which toolbar buttons to show. Leave empty to show all.',
        options: {
          choices: [
            { text: 'Paragraph', value: 'paragraph' },
            { text: 'Bold', value: 'bold' },
            { text: 'Italic', value: 'italic' },
            { text: 'Underline', value: 'underline' },
            { text: 'Strikethrough', value: 'strike' },
            { text: 'Heading 2', value: 'h2' },
            { text: 'Heading 3', value: 'h3' },
            { text: 'Heading 4', value: 'h4' },
            { text: 'Heading 5', value: 'h5' },
            { text: 'Bullet List', value: 'bulletList' },
            { text: 'Ordered List', value: 'orderedList' },
            { text: 'Align Left', value: 'alignLeft' },
            { text: 'Align Center', value: 'alignCenter' },
            { text: 'Align Right', value: 'alignRight' },
            { text: 'Align Justify', value: 'alignJustify' },
            { text: 'Link', value: 'link' },
            { text: 'File Link', value: 'fileLink' },
            { text: 'Form Link', value: 'formLink' },
          ],
        },
      },
    },
    {
      // Which link style radio options to offer in the link modal.
      field: 'linkStyles',
      name: 'Link Styles',
      type: 'json',
      meta: {
        interface: 'select-multiple-checkbox',
        width: 'full',
        note: 'Which link styles to offer in the link modal. Leave empty to show all.',
        options: {
          choices: [
            { text: 'Default', value: 'default' },
            { text: 'Button', value: 'button' },
            { text: 'CTA Button', value: 'cta' },
          ],
        },
      },
    },
    {
      // When checked, internal links omit the /{lang} prefix.
      field: 'disableLangPrefix',
      name: 'Disable Language Prefix',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        width: 'half',
        note: 'Check this for projects without language-prefixed URLs. By default the current language code is prepended (e.g. /de/projects/slug).',
      },
    },
    {
      // Collection used by the Form modal picker. Defaults to "forms".
      field: 'formCollection',
      name: 'Form Collection',
      type: 'string',
      meta: {
        interface: 'input',
        width: 'half',
        note: 'Collection to use in the form modal. Must have "id" and "title" fields. Defaults to "forms".',
        options: { placeholder: 'forms' },
      },
    },
  ],
})
