import React, { useEffect } from "react";

const ModalContainer = ({ isOpen, onClose, children, loading = false }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose, loading]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => {
        // Only close if clicking the backdrop itself
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="animate-in zoom-in-95 duration-300">
        {children}
      </div>
    </div>
  );
};

export default ModalContainer;