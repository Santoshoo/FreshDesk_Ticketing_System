import React, { useState } from 'react';
import { Check, Copy, ArrowRight, Plus, LayoutDashboard, X, Sparkles } from 'lucide-react';

export default function TicketSuccessModal({
  isOpen,
  ticket,
  onClose,
  onViewTicket,
  onCreateAnother,
  onBackToDashboard,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !ticket) return null;

  const handleCopyId = () => {
    if (ticket.ticketNumber) {
      navigator.clipboard.writeText(`#${ticket.ticketNumber}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const priorityColor =
    ticket.priority === 'HIGH' || ticket.priority === 'URGENT'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : ticket.priority === 'LOW'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

  const priorityDot =
    ticket.priority === 'HIGH' || ticket.priority === 'URGENT'
      ? 'bg-rose-500'
      : ticket.priority === 'LOW'
      ? 'bg-emerald-500'
      : 'bg-amber-500';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-overlay-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 text-center relative overflow-hidden animate-modal-in">
        {/* Decorative Confetti & Glow Background */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-sky-200/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-200/50 rounded-full blur-2xl pointer-events-none" />

        {/* Close Icon */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Checkmark Celebration Header */}
        <div className="relative mx-auto w-16 h-16 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-100 rounded-full animate-pulse-glow" />
          <div className="relative w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-bounce" />
        </div>

        {/* Heading */}
        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Ticket Created Successfully!
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Your request is now queued and dispatched to the service team.
        </p>

        {/* Copyable Ticket ID Capsule */}
        <div className="mt-5 mb-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl transition-all cursor-pointer group"
             onClick={handleCopyId}
             title="Click to copy Ticket ID">
          <span className="text-xs font-semibold text-slate-400">Ticket ID:</span>
          <span className="text-base font-black text-[#6366f1] tracking-wider font-mono">
            #{ticket.ticketNumber}
          </span>
          <button
            type="button"
            className="p-1 rounded-md text-slate-400 group-hover:text-slate-700 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          {copied && (
            <span className="text-[10px] font-bold text-emerald-600 ml-0.5">Copied!</span>
          )}
        </div>

        {/* Ticket Summary Card */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 text-left text-xs space-y-2 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Subject</span>
            <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={ticket.subject}>
              {ticket.subject || 'Support Ticket'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Requester</span>
            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
              {ticket.contactName || 'Staff Requester'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Priority</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${priorityColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priorityDot}`} />
              {ticket.priority || 'Medium'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onViewTicket}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#6366f1] to-[#0369a1] hover:from-[#0369a1] hover:to-[#075985] active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View Ticket Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateAnother}
              className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>Create Another</span>
            </button>

            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
