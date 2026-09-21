import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, X, ShieldCheck, Lock } from 'lucide-react';

export default function TicketCloseModal({
  isOpen,
  targetStatus = 'CLOSED', // 'CLOSED' or 'RESOLVED'
  ticket,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [remark, setRemark] = useState('');

  if (!isOpen || !ticket) return null;

  const isResolved = targetStatus === 'RESOLVED';
  const actionLabel = isResolved ? 'Resolve Ticket' : 'Close Ticket';

  const handleConfirm = () => {
    onConfirm(remark.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-overlay-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-7 relative overflow-hidden animate-modal-in">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isResolved ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {isResolved ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {actionLabel} #{ticket.ticketNumber}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isResolved
                ? 'Mark this ticket as solved with a resolution summary for the requester.'
                : 'Close this ticket permanently. It will be archived and notifications sent.'}
            </p>
          </div>
        </div>

        {/* Status Transition Preview */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Current Status</span>
            <span className="font-semibold text-slate-700">{ticket.status}</span>
          </div>
          <span className="text-slate-300 font-bold text-base">→</span>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">New Status</span>
            <span
              className={`font-bold inline-block px-2 py-0.5 rounded-full text-[11px] ${
                isResolved
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-slate-200 text-slate-800 border border-slate-300'
              }`}
            >
              {targetStatus}
            </span>
          </div>
        </div>

        {/* Resolution Note Textarea */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Resolution Summary / Closing Remarks <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            rows={3}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={
              isResolved
                ? 'Explain what was done to resolve the issue (e.g. Printer driver reinstalled and verified)...'
                : 'Enter closure remarks or feedback...'
            }
            className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 placeholder:text-slate-400 resize-none text-slate-800"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
              isResolved
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                : 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/20'
            }`}
          >
            {loading ? 'Updating...' : `Confirm & ${isResolved ? 'Resolve' : 'Close'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
