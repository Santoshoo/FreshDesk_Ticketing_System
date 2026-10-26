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
  Database,
  ArrowRight,
  ShieldCheck,
  Clock,
  Zap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import archivedTicketApi from '../../services/archivedTicketApi.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function ArchiveTicketUploadModal({ isOpen, onClose, onSuccess }) {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [truncate, setTruncate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState('idle'); // 'idle' | 'uploading' | 'processing' | 'done' | 'error'
  const [uploadProgress, setUploadProgress] = useState({ percent: 0, loaded: 0, total: 0 });
  const [resultData, setResultData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setIsDragging(false);
    setTruncate(false);
    setUploading(false);
    setUploadPhase('idle');
    setUploadProgress({ percent: 0, loaded: 0, total: 0 });
    setResultData(null);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (uploading && uploadPhase !== 'done' && uploadPhase !== 'error') {
      if (!window.confirm('File ingestion is currently running. Closing this dialog will not cancel server processing. Are you sure?')) {
        return;
      }
    }
    resetState();
    onClose();
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'tsv', 'xlsx', 'xls', 'txt'].includes(ext)) {
      setErrorMessage('Please select a valid CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }
    setErrorMessage('');
    setFile(selectedFile);
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
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Download Sample Template with the 13 Exact FreshDesk Fields
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Ticket ID': 'HIST-10001',
        'Subject': 'Outlook crashing on Windows 11 workstation',
        'Description': 'Staff reported email client closing repeatedly when attempting to sync hospital calendar appointments.',
        'Status': 'Closed',
        'Priority': 'High',
        'Source': 'Email',
        'Type': 'Incident',
        'Agent': 'Amit Kumar',
        'Group': 'Desktop Support',
        'Created time': '10/04/2023 09:30:00 AM',
        'Resolved time': '10/04/2023 11:15:00 AM',
        'Closed time': '11/04/2023 10:00:00 AM',
        'Last update time': '11/04/2023 10:00:00 AM',
      },
      {
        'Ticket ID': 'HIST-10002',
        'Subject': 'Samsung laser printer paper jam in Radiology',
        'Description': 'Paper tray feeder error code 02-000 on ground floor X-ray console unit.',
        'Status': 'Resolved',
        'Priority': 'Medium',
        'Source': 'Portal',
        'Type': 'Service Request',
        'Agent': 'Priya Sharma',
        'Group': 'Hardware Support',
        'Created time': '12/04/2023 02:20:00 PM',
        'Resolved time': '12/04/2023 03:45:00 PM',
        'Closed time': '',
        'Last update time': '12/04/2023 03:45:00 PM',
      },
      {
        'Ticket ID': 'HIST-10003',
        'Subject': 'HIS software password reset request for Doctor',
        'Description': 'Doctor locked out after 3 incorrect password attempts in casualty OPD.',
        'Status': 'Closed',
        'Priority': 'Urgent',
        'Source': 'Phone',
        'Type': 'Incident',
        'Agent': 'Amit Kumar',
        'Group': 'HIS Operations',
        'Created time': '15/04/2023 06:05:00 PM',
        'Resolved time': '15/04/2023 06:15:00 PM',
        'Closed time': '16/04/2023 09:00:00 AM',
        'Last update time': '16/04/2023 09:00:00 AM',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 15 }, // Ticket ID
      { wch: 35 }, // Subject
      { wch: 45 }, // Description
      { wch: 12 }, // Status
      { wch: 12 }, // Priority
      { wch: 12 }, // Source
      { wch: 18 }, // Type
      { wch: 18 }, // Agent
      { wch: 20 }, // Group
      { wch: 22 }, // Created time
      { wch: 22 }, // Resolved time
      { wch: 22 }, // Closed time
      { wch: 22 }, // Last update time
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Archived Tickets');
    XLSX.writeFile(workbook, 'freshdesk_legacy_tickets_template.xlsx');
    showToast('Downloaded sample template (freshdesk_legacy_tickets_template.xlsx)', 'success');
  };

  // Submit and stream ingestion
  const handleSubmitUpload = async () => {
    if (!file) {
      setErrorMessage('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setUploadPhase('uploading');
      setErrorMessage('');

      const res = await archivedTicketApi.upload(
        file,
        { truncate },
        (progress) => {
          setUploadProgress(progress);
          if (progress.phase === 'processing') {
            setUploadPhase('processing');
          }
        }
      );

      if (res?.success) {
        setResultData(res.data);
        setUploadPhase('done');
        showToast(res.message || 'Archived tickets ingested successfully!', 'success');
        if (onSuccess) {
          onSuccess(res.data);
        }
      } else {
        throw new Error(res?.error?.message || 'Ingestion failed on server');
      }
    } catch (err) {
      console.error('Archive upload error:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Failed to upload and ingest tickets';
      setErrorMessage(msg);
      setUploadPhase('error');
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-xs"
              style={{ background: '#2563eb' }}
            >
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Upload Historical Tickets
              </h2>
              <p className="text-xs text-slate-500">
                Direct streaming ingestion into <code className="font-mono text-blue-600 font-semibold">kims_freshdesk_archive</code>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading && uploadPhase === 'processing'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 bg-white">
          {/* Isolation Notice Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-bold">Zero Impact on Active Hospital Operations</p>
              <p className="text-[11px] text-slate-600">
                Your file will be streamed directly into the dedicated archive schema in <strong>2,000-row chunks</strong>. Live tickets, sequence numbers, and staff SLAs remain 100% untouched.
              </p>
            </div>
          </div>

          {/* Phase: Done / Success Screen */}
          {uploadPhase === 'done' && resultData ? (
            <div className="space-y-4 py-3">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Historical Ingestion Completed!
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {resultData.fileName} was parsed and committed to <code className="text-blue-600 font-mono font-semibold">kims_freshdesk_archive</code>.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Rows Read
                  </span>
                  <span className="text-base font-extrabold text-slate-800">
                    {resultData.totalProcessed?.toLocaleString() || 0}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-0.5">
                    Inserted
                  </span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {resultData.totalInserted?.toLocaleString() || 0}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Duration
                  </span>
                  <span className="text-base font-extrabold text-slate-800">
                    {resultData.durationSeconds}s
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-0.5">
                    Throughput
                  </span>
                  <span className="text-base font-extrabold text-blue-700">
                    {resultData.throughput?.toLocaleString()}/s
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Total Records in Archive Database:</span>
                <span className="font-bold text-blue-600 font-mono text-sm">
                  {resultData.totalInArchive?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* File Dropzone */}
              {!uploading ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10'
                      : file
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/70'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.xlsx,.xls,.txt"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                    className="hidden"
                  />

                  {file ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm truncate max-w-md mx-auto">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          Size: <strong>{formatFileSize(file.size)}</strong> • Ready for streaming import
                        </p>
                      </div>
                      <p className="text-[11px] text-blue-600 font-bold pt-1">
                        Click or drag another file to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">
                          Drag and drop your ticket export file here
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Supports CSV, Excel (.xlsx, .xls) up to 250 MB
                        </p>
                      </div>
                      <span className="inline-block mt-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs">
                        Browse Computer
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Progress View */
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      {uploadPhase === 'uploading'
                        ? 'Uploading file to server...'
                        : uploadProgress.total
                        ? `Ingesting: ${uploadProgress.processed?.toLocaleString()} / ${uploadProgress.total?.toLocaleString()} rows`
                        : `Ingesting: ${uploadProgress.processed?.toLocaleString() || 0} rows...`}
                    </span>
                    <span className="font-mono text-blue-600 font-bold">
                      {`${uploadProgress.percent || 0}%`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(2, uploadProgress.percent || 0))}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>
                      {uploadPhase === 'uploading'
                        ? `${formatFileSize(uploadProgress.loaded)} of ${formatFileSize(uploadProgress.total)}`
                        : `${uploadProgress.inserted?.toLocaleString() || 0} tickets inserted into archive • 2,000 rows/batch`}
                    </span>
                    <span className="truncate max-w-[200px]">{file?.name}</span>
                  </div>

                  {uploadPhase === 'processing' && (
                    <div className="p-3 rounded-lg bg-blue-100/70 border border-blue-200 text-[11px] text-blue-900 leading-relaxed font-medium">
                      ⚡ <strong>High-Speed Streaming Ingestion:</strong> Ingesting 2 Lakh records into separate schema <code>kims_freshdesk_archive</code>. Primary system remains completely untouched.
                    </div>
                  )}
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Options & Template Section */}
              <div className="space-y-2.5 pt-1">
                {/* Truncate Checkbox */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={truncate}
                    onChange={(e) => setTruncate(e.target.checked)}
                    disabled={uploading}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">
                      Wipe / Replace existing archive records before import
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Check this for a fresh clean upload. If unchecked, new records will be appended.
                    </p>
                  </div>
                </label>

                {/* Sample Template Link */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Need the standard FreshDesk 13-field Excel template?</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Template (.xlsx)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono font-medium">
            Database: kims_freshdesk_archive
          </span>

          <div className="flex items-center gap-2.5">
            {uploadPhase === 'done' ? (
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-xs transition hover:opacity-95 flex items-center gap-2 cursor-pointer"
                style={{ background: '#2563eb' }}
              >
                <span>View Ingested Tickets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitUpload}
                  disabled={!file || uploading}
                  className="px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition hover:opacity-95 flex items-center gap-2 cursor-pointer"
                  style={{ background: '#2563eb' }}
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingesting Records...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload & Ingest to Archive</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
