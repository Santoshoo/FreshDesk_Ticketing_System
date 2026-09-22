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
  UserCheck,
  Shield,
  Building,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from '../ui/index.jsx';
import userApi from '../../services/userApi.js';
import { useToast } from '../../context/ToastContext.jsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BulkUserUploadModal({ isOpen, onClose, onSuccess }) {
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
        name: 'Amlan Nanda',
        email: 'amlan.nanda@kims.hospital',
        empid: 'IT001',
        dept: 'IT Department',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      {
        name: 'Rashmi Ranjan',
        email: 'rashmi.ranjan@kims.hospital',
        empid: 'IT002',
        dept: 'IT Department',
        role: 'AGENT',
        status: 'ACTIVE',
      },
      {
        name: 'Debasish Mohanty',
        email: 'debasish.m@kims.hospital',
        empid: 'IT003',
        dept: 'IT Department',
        role: 'AGENT',
        status: 'ACTIVE',
      },
      {
        name: 'Priyanka Sahoo',
        email: 'priyanka.s@kims.hospital',
        empid: 'IT004',
        dept: 'IT Department',
        role: 'AGENT',
        status: 'ACTIVE',
      },
      {
        name: 'Suresh Patra',
        email: 'suresh.p@kims.hospital',
        empid: 'IT005',
        dept: 'IT Department',
        role: 'AGENT',
        status: 'INACTIVE',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths for clean readability
    worksheet['!cols'] = [
      { wch: 25 }, // name
      { wch: 32 }, // email
      { wch: 14 }, // empid
      { wch: 22 }, // dept
      { wch: 16 }, // role
      { wch: 12 }, // status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'IT Department Users');
    XLSX.writeFile(workbook, 'it_users_bulk_template.xlsx');
  };

  // Process File with XLSX
  const processFile = (file) => {
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValidExt) {
      setParseError('Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file.');
      return;
    }

    setParseError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setParseError('Uploaded workbook contains no readable sheets.');
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setParseError('Uploaded sheet appears to be empty. Please populate user records.');
          return;
        }

        const seenEmails = new Set();
        const seenEmpIds = new Set();

        const validated = rawJson.map((row, index) => {
          const rowNum = index + 2; // +2 considering 1-based header row

          const rawName = row.name || row.Name || row['employee_name'] || row['Employee Name'] || '';
          const rawEmail = row.email || row.Email || row.emailid || row['emailid'] || row['Email ID'] || row['Email'] || '';
          const rawEmpId = row.empid || row.empId || row.employeeId || row.EmployeeId || row['Employee ID'] || row['Emp ID'] || row['empid'] || '';
          const rawDept = row.dept || row.deptName || row['dept name'] || row.department || row['Department'] || row['Department Name'] || 'IT Department';
          const rawRole = row.role || row.Role || row['role'] || row['Role Name'] || 'AGENT';
          const rawStatus = row.status !== undefined ? String(row.status) : (row.Status !== undefined ? String(row.Status) : 'ACTIVE');

          const cleanName = String(rawName).trim();
          const cleanEmail = String(rawEmail).trim().toLowerCase();
          const cleanEmpId = String(rawEmpId).trim().toUpperCase();
          const cleanDept = String(rawDept).trim() || 'IT Department';
          const cleanRole = String(rawRole).trim().toUpperCase() || 'AGENT';
          const cleanStatus = ['inactive', 'false', 'disabled'].includes(String(rawStatus).toLowerCase().trim())
            ? 'INACTIVE'
            : 'ACTIVE';

          const errors = [];

          if (!cleanEmail) {
            errors.push('Missing email');
          } else if (!EMAIL_REGEX.test(cleanEmail)) {
            errors.push('Invalid email format');
          } else if (seenEmails.has(cleanEmail)) {
            errors.push('Duplicate email in file');
          } else {
            seenEmails.add(cleanEmail);
          }

          if (!cleanEmpId) {
            errors.push('Missing empid');
          } else if (seenEmpIds.has(cleanEmpId)) {
            errors.push('Duplicate empid in file');
          } else {
            seenEmpIds.add(cleanEmpId);
          }

          if (!cleanName) {
            errors.push('Missing name');
          }

          return {
            rowNum,
            name: cleanName || cleanEmail.split('@')[0] || 'User',
            email: cleanEmail,
            empid: cleanEmpId,
            dept: cleanDept,
            role: cleanRole,
            status: cleanStatus,
            isValid: errors.length === 0,
            errors,
          };
        });

        setParsedRows(validated);
      } catch (err) {
        console.error('File parsing error:', err);
        setParseError(`Failed to parse file: ${err.message}`);
      }
    };

    reader.onerror = () => {
      setParseError('Error reading file from disk.');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Submit parsed valid records to backend
  const handleUploadSubmit = async () => {
    const validRecords = parsedRows.filter((r) => r.isValid);
    if (validRecords.length === 0) {
      showToast('No valid user records to import.', 'error');
      return;
    }

    try {
      setLoading(true);
      const BATCH_SIZE = 100;
      const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE);

      let totalCreated = 0;
      let totalUpdated = 0;
      let totalFailed = 0;

      for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const slice = validRecords.slice(i, i + BATCH_SIZE);

        const payload = slice.map((item) => ({
          name: item.name,
          email: item.email,
          empid: item.empid,
          dept: item.dept,
          role: item.role,
          status: item.status,
        }));

        const res = await userApi.bulkUpload(payload);

        if (res.success && res.data) {
          totalCreated += res.data.created || 0;
          totalUpdated += res.data.updated || 0;
          totalFailed += res.data.failed || 0;
        }

        const currentCount = Math.min(i + BATCH_SIZE, validRecords.length);
        const percent = Math.round((currentCount / validRecords.length) * 100);

        setUploadProgress({
          current: currentCount,
          total: validRecords.length,
          percent,
          batch: batchNum,
          totalBatches,
        });
      }

      showToast(
        `Import Complete: ${totalCreated} created, ${totalUpdated} updated${
          totalFailed > 0 ? `, ${totalFailed} failed` : ''
        }.`,
        'success'
      );

      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Bulk user import error:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Bulk user upload failed';
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
      title="Bulk Upload Users (IT Department)"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Top Header & Template Download Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <div>
            <p className="font-bold text-slate-900">Required Spreadsheet Columns</p>
            <p className="text-slate-500 text-[11px] mt-0.5 flex flex-wrap gap-1.5 items-center">
              <code className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">name</code>
              <code className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">email</code>
              <code className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">empid</code>
              <code className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">dept</code>
              <code className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">role</code>
              <code className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">status</code>
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-indigo-700 font-bold border border-indigo-200 rounded-xl shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Download Template (.xlsx)</span>
          </button>
        </div>

        {/* Drag & Drop File Zone */}
        {!fileName ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-200 hover:border-indigo-400 bg-slate-50/40 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processFile(e.target.files[0]);
                }
              }}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">
              Click to browse or drag and drop your spreadsheet here
            </p>
            <p className="text-slate-400 text-[11px] mt-1">
              Supports Microsoft Excel (.xlsx, .xls) and CSV files
            </p>
          </div>
        ) : (
          /* File Loaded Banner */
          <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{fileName}</p>
                <p className="text-[11px] text-slate-500">
                  {parsedRows.length} rows found · {validCount} valid · {invalidCount} issues
                </p>
              </div>
            </div>

            {!loading && (
              <button
                type="button"
                onClick={resetState}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white cursor-pointer"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Error message */}
        {parseError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Live Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Preview Data ({parsedRows.length} total)</span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> {validCount} Valid
                </span>
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 font-semibold">
                    <XCircle className="w-3 h-3" /> {invalidCount} Invalid
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-100/80 sticky top-0 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Row</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Email</th>
                    <th className="p-2.5">Emp ID</th>
                    <th className="p-2.5">Dept</th>
                    <th className="p-2.5">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className={row.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/30'}>
                      <td className="p-2.5 text-slate-400 font-mono">{row.rowNum}</td>
                      <td className="p-2.5">
                        {row.isValid ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold flex items-center gap-1" title={row.errors.join(', ')}>
                            <XCircle className="w-3 h-3" /> {row.errors[0]}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold text-slate-800">{row.name}</td>
                      <td className="p-2.5 text-slate-600">{row.email}</td>
                      <td className="p-2.5 font-mono text-slate-700">{row.empid}</td>
                      <td className="p-2.5 text-slate-600">{row.dept}</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {row.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 50 && (
              <p className="text-[10px] text-slate-400 text-center">
                Showing first 50 rows of {parsedRows.length}. All valid rows will be imported.
              </p>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {loading && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                Importing Users...
              </span>
              <span>{uploadProgress.percent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-200"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Processed {uploadProgress.current} of {uploadProgress.total} (Batch {uploadProgress.batch} of {uploadProgress.totalBatches})
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUploadSubmit}
            disabled={loading || validCount === 0}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Import {validCount > 0 ? `${validCount} Users` : 'Users'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
