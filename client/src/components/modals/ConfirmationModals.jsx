import React from 'react';
import { AlertTriangle, Trash2, X, Handshake, CheckCircle2, Loader2, XCircle } from 'lucide-react';

const ConfirmationModals = ({ isOpen, onClose, onConfirm, orderId, mode = "delete", loading = false }) => {
  if (!isOpen) return null;

  // Strict configuration based on the requested protocol
  const getModeConfig = () => {
    switch (mode) {
      case "cancel":
        return {
          title: "Abort Mission?",
          desc: "Requesting immediate termination of manifest",
          btnText: "Confirm Cancellation",
          btnClass: "bg-warning text-black shadow-warning/20",
          icon: <XCircle size={40} />,
          iconClass: "bg-warning/10 text-warning border-warning/20",
          idColor: "text-warning"
        };
      case "pickup":
        return {
          title: "Confirm Arrival?",
          desc: "Acknowledge receipt of manifest",
          btnText: "Finalize Order",
          btnClass: "bg-success text-white shadow-success/20",
          icon: <Handshake size={40} />,
          iconClass: "bg-success/10 text-success border-success/20",
          idColor: "text-success"
        };
      default: // "delete"
        return {
          title: "Purge Registry?",
          desc: "You are about to permanently deauthorize record",
          btnText: "Confirm Purge",
          btnClass: "bg-error text-white shadow-error/20",
          icon: <AlertTriangle size={40} />,
          iconClass: "bg-error/10 text-error border-error/20",
          idColor: "text-error"
        };
    }
  };

  const config = getModeConfig();

  return (
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
      onClick={loading ? null : onClose}
    >
      <div 
        className="bg-[#1a1c23] border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl transition-all animate-in zoom-in-95 duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-0 flex justify-end">
          <button 
            disabled={loading} 
            onClick={onClose} 
            className="p-2 hover:bg-white/5 rounded-full text-white opacity-40 hover:opacity-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 pb-10 text-center space-y-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto border ${config.iconClass} ${loading ? 'animate-spin' : 'animate-pulse'}`}>
            {loading ? <Loader2 size={40} /> : config.icon}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{config.title}</h2>
            <p className="text-[10px] font-bold uppercase opacity-50 leading-relaxed tracking-[0.2em] text-white px-4">
              {config.desc} <br/> 
              <span className={`${config.idColor} font-black`}>#{orderId?.toString().slice(-8).toUpperCase()}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              disabled={loading} 
              onClick={onClose} 
              className="py-4 rounded-2xl text-[10px] font-black uppercase italic border border-white/10 text-white hover:bg-white/5 disabled:opacity-20"
            >
              Abort
            </button>
            <button 
              disabled={loading} 
              onClick={onConfirm} 
              className={`py-4 rounded-2xl text-[10px] font-black uppercase italic hover:brightness-110 transition-all flex items-center justify-center gap-2 ${config.btnClass} disabled:opacity-50`}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : (mode === "pickup" ? <CheckCircle2 size={14} /> : <Trash2 size={14} />)}
              {loading ? "Processing..." : config.btnText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModals;