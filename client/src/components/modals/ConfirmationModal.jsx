import React, { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, loading }) => {
  // ESC key logic for security protocols
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onCancel, loading]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => {
        // Only close if clicking the backdrop itself
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div className="animate-in zoom-in-95 duration-300 w-full max-w-md">
        <div className="bg-[#0a0a0a] border border-white/10 rounded-[24px] overflow-hidden shadow-2xl">
          <div className="p-8">
            {/* Header section with Alert Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error shadow-[0_0_20px_rgba(255,0,0,0.1)]">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                  {title}
                </h3>
                <p className="text-[10px] opacity-30 font-black uppercase tracking-[0.2em]">
                  Security Protocol
                </p>
              </div>
            </div>
            
            {/* The Message */}
            <p className="text-sm text-white/60 font-medium leading-relaxed mb-8">
              {message}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button 
                onClick={onCancel}
                disabled={loading}
                className="flex-1 btn btn-ghost font-black uppercase italic text-xs tracking-widest rounded-xl hover:bg-white/5 disabled:opacity-20"
              >
                Cancel
              </button>
              <button 
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 btn btn-error font-black uppercase italic text-xs tracking-widest rounded-xl shadow-lg shadow-error/20"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Confirm Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;