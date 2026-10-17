import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import LinkExt from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DOMParser as PMDOMParser } from '@tiptap/pm/model';

/**
 * Escapes unsafe characters for HTML inclusion.
 */
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extension that enhances paste behavior for Excel and spreadsheets.
 * 1. If HTML containing <table> is pasted, ProseMirror parses it into native table nodes.
 * 2. If plain-text TSV (tab-separated values) is pasted (e.g. from Excel/Sheets plain text copy),
 *    it converts the TSV into a structured HTML table with headers and data cells.
 */
export const ExcelPasteHandler = Extension.create({
  name: 'excelPasteHandler',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('excelPasteHandler'),
        props: {
          handlePaste(view, event) {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            const html = clipboardData.getData('text/html');
            const text = clipboardData.getData('text/plain');

            // If HTML already contains table elements, let ProseMirror's default parser handle it
            if (html && (/<table\b/i.test(html) || /<tr\b/i.test(html))) {
              return false;
            }

            // If text contains tab characters and multiple values (TSV format from Excel / Google Sheets)
            if (text && text.includes('\t')) {
              const lines = text
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter((l) => l.length > 0);

              if (lines.length > 0) {
                const rows = lines.map((line) => line.split('\t'));
                const maxCols = Math.max(...rows.map((r) => r.length));

                // Only treat as table if there are at least 2 columns
                if (maxCols >= 2) {
                  let tableHtml = '<table class="excel-grid-table"><thead><tr>';
                  rows[0].forEach((cell) => {
                    tableHtml += `<th><p>${escapeHtml(cell.trim())}</p></th>`;
                  });
                  tableHtml += '</tr></thead><tbody>';

                  for (let i = 1; i < rows.length; i++) {
                    tableHtml += '<tr>';
                    for (let c = 0; c < maxCols; c++) {
                      const val = rows[i][c] !== undefined ? rows[i][c].trim() : '';
                      tableHtml += `<td><p>${escapeHtml(val)}</p></td>`;
                    }
                    tableHtml += '</tr>';
                  }
                  tableHtml += '</tbody></table><p></p>';

                  try {
                    const dom = document.createElement('div');
                    dom.innerHTML = tableHtml;
                    const parser = PMDOMParser.fromSchema(view.state.schema);
                    const slice = parser.parseSlice(dom);
                    const tr = view.state.tr.replaceSelection(slice);
                    view.dispatch(tr.scrollIntoView());
                    return true;
                  } catch (e) {
                    console.error('Failed to parse TSV into table slice:', e);
                    return false;
                  }
                }
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Returns the standard list of Tiptap extensions used across all ticket editors.
 * Includes formatting, links, tables with resizing, and Excel paste support.
 */
export function getSharedEditorExtensions() {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    UnderlineExt,
    LinkExt.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-indigo-600 underline hover:text-indigo-800',
      },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'excel-grid-table',
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    ExcelPasteHandler,
  ];
}

export { Table, TableRow, TableHeader, TableCell };
