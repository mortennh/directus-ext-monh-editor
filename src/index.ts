/**
 * MONH Editor — Directus interface extension
 *
 * A TipTap-based rich-text editor for the TRR 266 project with support for:
 * - Standard text formatting (bold, italic, underline, strikethrough)
 * - Headings (H1–H5) with optional serif/sans font and accent-bar styles
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
            { text: 'Heading 1', value: 'h1' },
            { text: 'Heading 2', value: 'h2' },
            { text: 'Heading 3', value: 'h3' },
            { text: 'Heading 4', value: 'h4' },
            { text: 'Heading 5', value: 'h5' },
            { text: 'Heading Serif', value: 'fontSerif' },
            { text: 'Heading Sans', value: 'fontSans' },
            { text: 'Heading Accent Bar', value: 'headingBar' },
            { text: 'Bullet List', value: 'bulletList' },
            { text: 'Ordered List', value: 'orderedList' },
            { text: 'Align Left', value: 'alignLeft' },
            { text: 'Align Center', value: 'alignCenter' },
            { text: 'Align Right', value: 'alignRight' },
            { text: 'Align Justify', value: 'alignJustify' },
            { text: 'Link', value: 'link' },
            { text: 'File Link', value: 'fileLink' },
            { text: 'Form Link', value: 'formLink' },
            { text: 'Table', value: 'table' },
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
      // Language whose links get no /{lang} prefix. Defaults to "en-US".
      field: 'defaultLanguage',
      name: 'Default Language',
      type: 'string',
      meta: {
        interface: 'input',
        width: 'half',
        note: 'Language code whose internal links omit the prefix (e.g. de-DE). Defaults to en-US.',
        options: { placeholder: 'en-US' },
      },
    },
    {
      // When checked, file links are stored as /assets/{id} instead of an absolute URL.
      field: 'relativeFileLinks',
      name: 'Relative File Links',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        width: 'half',
        note: 'Store file links as /assets/{id} (the frontend resolves the host). By default the URL of this Directus instance is used.',
      },
    },
    {
      // Internal link targets with their URL path and title field. Overrides "Link Collections".
      field: 'linkTargets',
      name: 'Link Targets',
      type: 'json',
      meta: {
        interface: 'list',
        width: 'full',
        note: 'Collections to search for internal links, with the URL path segment (defaults to the collection name) and the title field (defaults to "title"). Overrides "Link Collections".',
        options: {
          template: '{{ collection }} → /{{ path }}',
          fields: [
            { field: 'collection', name: 'Collection', type: 'string', meta: { interface: 'input', width: 'third', required: true } },
            { field: 'path', name: 'Path', type: 'string', meta: { interface: 'input', width: 'third' } },
            { field: 'titleField', name: 'Title Field', type: 'string', meta: { interface: 'input', width: 'third', options: { placeholder: 'title' } } },
          ],
        },
      },
    },
    {
      // Collections to search for internal linking in the link modal.
      field: 'linkCollections',
      name: 'Link Collections',
      type: 'json',
      meta: {
        interface: 'tags',
        width: 'full',
        note: 'Collection names to search for internal links. Type a collection name and press Enter. Leave empty to use defaults (projects, publications, events, posts, pages, institutions, jobs, researcher_of_month).',
        options: {
          presets: ['projects', 'publications', 'events', 'posts', 'pages', 'institutions', 'jobs', 'researcher_of_month'],
        },
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
