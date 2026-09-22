import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from '../ui/index.jsx';
import employeeEmailApi from '../../services/employeeEmailApi.js';
import { useToast } from '../../context/ToastContext.jsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BulkEmailUploadModal({ isOpen, onClose, onSuccess }) {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
    percent: 0,
    batch: 0,
    totalBatches: 0,
  });

  const resetState = () => {
    setFileName('');
    setParsedRows([]);
    setParseError('');
    setLoading(false);
    setUploadProgress({ current: 0, total: 0, percent: 0, batch: 0, totalBatches: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (loading) return; // Prevent closing mid-upload
    resetState();
    onClose();
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'name': 'Dr. Ramesh Kumar',
        'emailid': 'ramesh.k@kims.hospital',
        'dept name': 'Cardiology',
        'status': 'ACTIVE',
      },
      {
        'name': 'Sister Priya Sharma',
        'emailid': 'priya.s@kims.hospital',
        'dept name': 'Nursing',
        'status': 'ACTIVE',
      },
      {
        'name': 'Anil Verma',
        'emailid': 'anil.v@kims.hospital',
        'dept name': 'Pharmacy',
        'status': 'ACTIVE',
      },
      {
        'name': 'Sunita Rao',
        'emailid': 'sunita.r@kims.hospital',
        'dept name': 'Human Resources',
        'status': 'INACTIVE',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 25 }, // name
      { wch: 30 }, // emailid
      { wch: 22 }, // dept name
      { wch: 12 }, // status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Emails');
    XLSX.writeFile(workbook, 'employee_emails_bulk_template.xlsx');
  };

  // Process File with XLSX
  const processFile = (file) => {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setParseError('Please upload an Excel (.xlsx, .xls) or .csv file.');
      return;
    }

    setParseError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setParseError('The uploaded file contains no data rows.');
          setParsedRows([]);
          return;
        }

        // Map and validate rows with tolerant case-insensitive key lookup
        const normalized = rawJson.map((row, idx) => {
          const keys = Object.keys(row);
          const findVal = (targets) => {
            for (const key of keys) {
              const cleanKey = key.toLowerCase().trim().replace(/[\s_-]+/g, ' ');
              for (const target of targets) {
                if (cleanKey === target.toLowerCase()) {
                  return row[key];
                }
              }
            }
            return '';
          };

          const name = (findVal(['name', 'employee name', 'fullname', 'full name']) || '').toString().trim();
          const email = (findVal(['emailid', 'email id', 'email', 'email_id']) || '').toString().trim();
          const departmentName = (findVal(['dept name', 'dept anem', 'department name', 'department', 'dept']) || '').toString().trim();
          const statusRaw = (findVal(['status', 'active']) || 'ACTIVE').toString().trim();

          const isValidEmail = EMAIL_REGEX.test(email);

          return {
            rowNumber: idx + 2, // Header is row 1
            name: name || (email ? email.split('@')[0] : 'Staff Member'),
            email,
            departmentName,
            status: statusRaw.toUpperCase() || 'ACTIVE',
            isValid: isValidEmail,
            error: !email
              ? 'Missing Email'
              : !isValidEmail
              ? 'Invalid Email Format'
              : null,
          };
        });

        setParsedRows(normalized);
      } catch (err) {
        console.error('Error parsing file:', err);
        setParseError('Failed to parse the file. Please ensure it is a valid spreadsheet.');
        setParsedRows([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Submit to Backend in Batches (Supports 6000+ records seamlessly)
  const handleSubmit = async () => {
    const validRecords = parsedRows.filter((r) => r.isValid);
    if (validRecords.length === 0) {
      showToast('No valid email records found to upload', 'warning');
      return;
    }

    try {
      setLoading(true);
      const CHUNK_SIZE = 1000;
      const totalBatches = Math.ceil(validRecords.length / CHUNK_SIZE);
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalFailed = 0;

      for (let b = 0; b < totalBatches; b++) {
        const batchNum = b + 1;
        const start = b * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, validRecords.length);
        const chunk = validRecords.slice(start, end).map((r) => ({
          name: r.name,
          email: r.email,
          departmentName: r.departmentName,
          status: r.status,
        }));

        const currentProgress = Math.round((start / validRecords.length) * 100);
        setUploadProgress({
          current: start,
          total: validRecords.length,
          percent: currentProgress,
          batch: batchNum,
          totalBatches,
        });

        const res = await employeeEmailApi.bulkUpload(chunk);
        if (res.success && res.data) {
          totalCreated += res.data.created || 0;
          totalUpdated += res.data.updated || 0;
          totalFailed += res.data.failed || 0;
        }

        const completedProgress = Math.round((end / validRecords.length) * 100);
        setUploadProgress({
          current: end,
          total: validRecords.length,
          percent: completedProgress,
          batch: batchNum,
          totalBatches,
        });
      }

      showToast(
        `Bulk Upload Complete: ${totalCreated.toLocaleString()} created, ${totalUpdated.toLocaleString()} updated${
          totalFailed > 0 ? `, ${totalFailed} failed` : ''
        }.`,
        'success'
      );
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Bulk upload failed';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
      setUploadProgress({ current: 0, total: 0, percent: 0, batch: 0, totalBatches: 0 });
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Upload Employee Emails"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Top Instructions & Template Download Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <p className="font-bold text-slate-800">Spreadsheet Format Requirements</p>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Required columns: <code className="font-bold text-sky-700 bg-sky-50 px-1 py-0.5 rounded">name</code>,{' '}
              <code className="font-bold text-sky-700 bg-sky-50 px-1 py-0.5 rounded">emailid</code>,{' '}
              <code className="font-bold text-sky-700 bg-sky-50 px-1 py-0.5 rounded">dept name</code>,{' '}
              <code className="font-bold text-sky-700 bg-sky-50 px-1 py-0.5 rounded">status</code>
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-sky-700 font-semibold border border-indigo-200 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Download Template</span>
          </button>
        </div>

        {/* Drag & Drop Upload Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-sky-50/70 scale-[1.01]'
              : fileName
              ? 'border-emerald-400 bg-emerald-50/30'
              : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                fileName ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-50 text-indigo-600'
              }`}
            >
              {fileName ? (
                <FileSpreadsheet className="w-6 h-6" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>

            {fileName ? (
              <div>
                <p className="font-bold text-slate-800">{fileName}</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                  Click or drag to replace file
                </p>
              </div>
            ) : (
              <div>
                <p className="font-bold text-slate-800">
                  Click to browse or drag & drop spreadsheet
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supports Excel (.xlsx, .xls) and CSV files
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Parse Error Alert */}
        {parseError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Parsed Rows Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Preview</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-mono text-[10px]">
                  {parsedRows.length} rows detected
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {validCount} ready
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-rose-600 font-medium">
                    <XCircle className="w-3.5 h-3.5" />
                    {invalidCount} invalid
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Row</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Email ID</th>
                    <th className="px-3 py-2 font-semibold">Department</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((r, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !r.isValid ? 'bg-rose-50/50' : ''
                      }`}
                    >
                      <td className="px-3 py-1.5 font-mono text-slate-400">{r.rowNumber}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{r.name}</td>
                      <td className="px-3 py-1.5 font-mono">
                        <span className={r.isValid ? 'text-slate-800' : 'text-rose-600 font-semibold'}>
                          {r.email || '(Empty)'}
                        </span>
                        {!r.isValid && (
                          <span className="block text-[10px] text-rose-500">{r.error}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">{r.departmentName || '-'}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Live Progress Bar when Uploading */}
        {loading && uploadProgress.total > 0 && (
          <div className="p-4 bg-sky-50/90 border border-indigo-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-semibold text-sky-900">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>
                  Uploading batch {uploadProgress.batch} of {uploadProgress.totalBatches} ({uploadProgress.current.toLocaleString()} / {uploadProgress.total.toLocaleString()} records)
                </span>
              </span>
              <span className="font-mono text-sky-700 font-bold">{uploadProgress.percent}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress.percent}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Please wait while your employee emails are being registered and linked to departments...
            </p>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || validCount === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#6366f1] hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 disabled:opacity-40 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading ({uploadProgress.percent}%)...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload {validCount > 0 ? `${validCount.toLocaleString()} Records` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
