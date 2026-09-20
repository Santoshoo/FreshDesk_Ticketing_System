import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload, Download, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Modal } from './ui/index.jsx';
import ticketTypeApi from '../services/ticketTypeApi.js';

export default function TicketTypeExcelUploadModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedTypes, setParsedTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultSummary, setResultSummary] = useState(null);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setParsedTypes([]);
    setLoading(false);
    setError('');
    setResultSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // 1. Download Sample Excel Template (Type Name and Status ONLY)
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Type Name': 'Incident',
        Status: 'ACTIVE',
      },
      {
        'Type Name': 'Service Request',
        Status: 'ACTIVE',
      },
      {
        'Type Name': 'Problem Report',
        Status: 'ACTIVE',
      },
      {
        'Type Name': 'Access & Role Request',
        Status: 'ACTIVE',
      },
      {
        'Type Name': 'Change Request',
        Status: 'ACTIVE',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ticket_Types');
    XLSX.writeFile(workbook, 'KIMS_Ticket_Types_Import_Template.xlsx');
  };

  // 2. Parse uploaded Excel / CSV file
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError('');
    setResultSummary(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setError('The uploaded Excel file contains no data rows.');
          setParsedTypes([]);
          return;
        }

        // Standardize keys (Name & Status ONLY)
        const cleaned = rawJson
          .map((row) => {
            const name = (
              row['Type Name'] ||
              row['ticket_type_name'] ||
              row['Name'] ||
              row['NAME'] ||
              row['name'] ||
              ''
            ).toString().trim();

            const rawStatus = (
              row['Status'] ||
              row['status'] ||
              row['STATUS'] ||
              'ACTIVE'
            ).toString().trim().toUpperCase();

            return {
              name,
              status: rawStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
            };
          })
          .filter((item) => item.name.length > 0);

        if (cleaned.length === 0) {
          setError('No valid ticket type records with a "Type Name" column were found.');
          setParsedTypes([]);
          return;
        }

        setParsedTypes(cleaned);
      } catch (err) {
        console.error('Excel parse error:', err);
        setError('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
        setParsedTypes([]);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  // 3. Submit bulk import to backend API
  const handleImportSubmit = async () => {
    if (parsedTypes.length === 0) return;

    try {
      setLoading(true);
      setError('');
      const res = await ticketTypeApi.bulkCreate(parsedTypes);

      if (res.success && res.data) {
        setResultSummary(res.data);
        if (onSuccess) {
          onSuccess(res.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Bulk upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Ticket Types (Excel Import)">
      <div className="space-y-5 text-xs">
        {/* Banner with Template Download */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Super Admin Bulk Ticket Type Upload</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload `.xlsx`, `.xls`, or `.csv` files containing ticket classification types.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition-colors shrink-0 shadow-2xs text-[11px]"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Sample Template</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Result Summary */}
        {resultSummary ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Bulk Ticket Type Import Completed!</span>
            </div>
            <p className="text-emerald-700">
              Successfully imported/updated <strong className="font-bold">{resultSummary.importedCount}</strong> ticket types.
            </p>

            {resultSummary.errors?.length > 0 && (
              <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <p className="font-semibold mb-1">Warnings ({resultSummary.errors.length}):</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {resultSummary.errors.map((e, idx) => (
                    <li key={idx}>Row {e.row}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors"
              >
                Close & Refresh Ticket Types
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* File Drop / Select Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 transition-all rounded-xl p-6 text-center cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <p className="font-semibold text-slate-700">
                {file ? file.name : 'Click to browse or drag & drop Excel file'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports `.xlsx`, `.xls`, `.csv` with columns: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">Type Name</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">Status</code>
              </p>
            </div>

            {/* Parsed Preview Table */}
            {parsedTypes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">
                    Preview Ready ({parsedTypes.length} ticket types found):
                  </p>
                  <button
                    type="button"
                    onClick={resetState}
                    className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 text-[11px]"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset File
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                      <tr>
                        <th className="px-4 py-2">#</th>
                        <th className="px-4 py-2">Type Name</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedTypes.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2 font-bold text-slate-800">{t.name}</td>
                          <td className="px-4 py-2 font-semibold text-emerald-700">
                            {t.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={loading || parsedTypes.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs disabled:opacity-50 transition-all shadow-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Upload & Import {parsedTypes.length} Types</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
