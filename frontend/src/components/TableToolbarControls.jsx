import React, { useState } from 'react';
import {
  Table as TableIcon,
  Plus,
  Trash2,
  Rows,
  Columns,
  ChevronDown,
} from 'lucide-react';

export default function TableToolbarControls({ editor, compact = false }) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (!editor) return null;

  const isTableActive = editor.isActive('table');

  const handleInsertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setMenuOpen(false);
  };

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Main Table Button */}
      {!isTableActive ? (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleInsertTable}
          className={`p-1.5 rounded transition-colors cursor-pointer text-slate-600 hover:bg-slate-200 hover:text-slate-900 ${
            compact ? 'text-xs' : ''
          }`}
          title="Insert Table (or paste directly from Excel)"
        >
          <TableIcon className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="inline-flex items-center gap-0.5 bg-indigo-50 border border-indigo-200/80 rounded-lg p-0.5 shadow-2xs">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex items-center gap-1 px-1.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 rounded transition-colors cursor-pointer"
            title="Table Options"
          >
            <TableIcon className="w-3 h-3 text-indigo-600" />
            <span className="hidden sm:inline">Table</span>
            <ChevronDown className="w-3 h-3 text-indigo-500" />
          </button>

          <span className="w-px h-3 bg-indigo-200 mx-0.5"></span>

          {/* Quick Add Row */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="p-1 text-slate-600 hover:text-indigo-700 hover:bg-indigo-100 rounded transition-colors cursor-pointer"
            title="Add Row Below"
          >
            <div className="flex items-center -space-x-1">
              <Rows className="w-3 h-3" />
              <Plus className="w-2.5 h-2.5 text-indigo-600 font-bold" />
            </div>
          </button>

          {/* Quick Add Column */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="p-1 text-slate-600 hover:text-indigo-700 hover:bg-indigo-100 rounded transition-colors cursor-pointer"
            title="Add Column Right"
          >
            <div className="flex items-center -space-x-1">
              <Columns className="w-3 h-3" />
              <Plus className="w-2.5 h-2.5 text-indigo-600 font-bold" />
            </div>
          </button>

          {/* Delete Row */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete Current Row"
          >
            <Rows className="w-3 h-3 text-rose-500" />
          </button>

          {/* Delete Column */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete Current Column"
          >
            <Columns className="w-3 h-3 text-rose-500" />
          </button>

          {/* Delete Table */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded transition-colors cursor-pointer"
            title="Delete Table"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Dropdown Menu for Detailed Table Operations */}
      {menuOpen && isTableActive && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
              Row Actions
            </div>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().addRowBefore().run();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between cursor-pointer"
            >
              <span>Add Row Above</span>
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().addRowAfter().run();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between cursor-pointer"
            >
              <span>Add Row Below</span>
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().deleteRow().run();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center justify-between cursor-pointer"
            >
              <span>Delete Row</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <div className="px-3 py-1.5 font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
              Column Actions
            </div>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().addColumnBefore().run();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between cursor-pointer"
            >
              <span>Add Column Before</span>
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().addColumnAfter().run();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between cursor-pointer"
            >
              <span>Add Column After</span>
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().deleteColumn().run();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center justify-between cursor-pointer"
            >
              <span>Delete Column</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={() => {
                editor.chain().focus().deleteTable().run();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-rose-100 text-rose-600 font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Entire Table</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
