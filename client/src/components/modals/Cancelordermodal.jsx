import React, { useState } from 'react';
import { XCircle, Loader2, X, AlertTriangle } from 'lucide-react';

const CANCELLATION_REASONS = [
  'Wrong size ordered',
  'Changed my mind',
  'Found a better price elsewhere',
  'Ordered by mistake',
  'Duplicate order',
  'Item took too long to process',
  'Other',
];

const CancelOrderModal = ({ isOpen, onClose, onConfirm, order, loading }) => {
  const [selectedReason, setSelectedReason] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) return;
    onConfirm(selectedReason);
  };

  const handleClose = () => {
    if (loading) return;
    setSelectedReason('');
    onClose();
  };

  if (!isOpen || !order) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={loading ? null : handleClose}
    >
      <div
        className="bg-[#1a1c23] border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error">
              <XCircle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">
                Cancel Order
              </h3>
              <p className="text-[9px] font-black uppercase opacity-30 tracking-widest text-white">
                #{order._id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            disabled={loading}
            onClick={handleClose}
            className="p-2 hover:bg-white/5 rounded-full text-white/30 hover:text-white transition-colors disabled:opacity-20"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4">
          {/* Warning notice */}
          <div className="flex items-start gap-3 p-4 bg-warning/5 border border-warning/20 rounded-2xl">
            <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
            <p className="text-[10px] font-bold text-warning/80 leading-relaxed uppercase tracking-wide">
              This will immediately cancel your order. If you already paid, your refund will be processed — expect 5–15 business days for it to reflect in your wallet or card.
            </p>
          </div>

          {/* Reason selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white block px-1">
              Reason for cancellation <span className="text-error">*</span>
            </label>
            <div className="space-y-2">
              {CANCELLATION_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  disabled={loading}
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-xs font-bold uppercase tracking-tight transition-all disabled:opacity-30
                    ${selectedReason === reason
                      ? 'border-error bg-error/10 text-error'
                      : 'border-white/5 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white'
                    }`}
                >
                  <span className={`inline-block w-4 h-4 rounded-full border-2 mr-3 align-middle transition-all
                    ${selectedReason === reason ? 'border-error bg-error' : 'border-white/20'}`}
                  />
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-2 gap-3 p-6 pt-0">
          <button
            disabled={loading}
            onClick={handleClose}
            className="py-4 rounded-2xl text-[10px] font-black uppercase italic border border-white/10 text-white hover:bg-white/5 disabled:opacity-20 transition-colors"
          >
            Keep Order
          </button>
          <button
            disabled={!selectedReason || loading}
            onClick={handleConfirm}
            className="py-4 rounded-2xl text-[10px] font-black uppercase italic bg-error text-white shadow-lg shadow-error/20 hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Processing...</>
            ) : (
              <><XCircle size={14} /> Confirm Cancel</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelOrderModal;