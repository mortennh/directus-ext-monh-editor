import { TableKit } from '@tiptap/extension-table'

/**
 * Tables (table, row, header cell, cell). Without this, TipTap drops any
 * <table> in existing content as soon as the field is opened and saved —
 * the Forum programme pages and the info-card tables live in rich text.
 * No column resizing: the site styles tables itself (responsive, full width),
 * so no inline widths are stored.
 */
export const TABLE_KIT = TableKit.configure({
  table: { resizable: false, HTMLAttributes: { class: 'editor-table' } },
})
