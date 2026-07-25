import React, { useState, useEffect } from "react";
import { Printer, X, Phone, Check } from "lucide-react";
import ModalContainer from "./ModalContainer";

const LogisticsWaybillModal = ({ order, isOpen, onClose }) => {
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    if (isOpen) setCheckedItems({});
  }, [isOpen, order?._id]);

  const handlePrint = () => {
    if (!order) return;
    
    const hasSelections = Object.values(checkedItems).some(val => val === true);
    
    // 🚀 STYLED ITEM ROW FOR PRINT
    const itemsHtml = order.items.map((item, i) => {
      const isChecked = checkedItems[i];
      if (hasSelections && !isChecked) return ''; 

      return `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #000; padding: 4px 0; font-size: 12px;">
          <span>${isChecked ? '[X]' : '[ ]'} ${item.name.toUpperCase()}</span>
          <span style="font-weight: 900;">x${item.quantity}</span>
        </div>
      `;
    }).join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; 
    iframe.style.right = '0'; 
    iframe.style.bottom = '0'; 
    iframe.style.width = '0'; 
    iframe.style.height = '0'; 
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              padding: 5mm; 
              width: 70mm; 
              color: #000;
              line-height: 1.4;
            }
            .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 3mm; margin-bottom: 4mm; }
            .section-title { font-size: 10px; font-weight: bold; text-decoration: underline; margin-bottom: 2mm; }
            .info-block { margin-bottom: 4mm; }
            .footer { border-top: 2px solid black; margin-top: 5mm; padding-top: 2mm; }
            .barcode-placeholder { text-align: center; font-size: 8px; margin-top: 3mm; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin:0; font-size: 18px; letter-spacing: -1px;">EKOMERS NODE</h1>
            <p style="margin:0; font-size: 9px; font-weight: bold;">OFFICIAL WAREHOUSE MANIFEST</p>
          </div>

          <div class="info-block" style="font-size: 11px;">
            <p style="margin:0;"><b>DATE:</b> ${new Date().toLocaleDateString()}</p>
            <p style="margin:0;"><b>Order ID:</b> #${order._id.slice(-8).toUpperCase()}</p>
          </div>

          <div class="info-block">
            <div class="section-title">RECIPIENT</div>
            <p style="margin:0; font-size: 14px; font-weight: 900;">${order.shippingInfo?.fullName.toUpperCase()}</p>
            <p style="margin:0; font-size: 11px;">${order.shippingInfo?.address}</p>
            <p style="margin:0; font-size: 11px; font-weight: bold;">TEL: ${order.shippingInfo?.contactNumber}</p>
          </div>

          <div class="info-block">
            <div class="section-title">PARCEL CONTENTS</div>
            ${itemsHtml}
          </div>

          <div class="footer">
            <div style="display:flex; justify-content:space-between; font-size: 16px; font-weight: 900;">
              <span>TOTAL COD:</span>
              <span>₱${Number(order.totalAmount).toLocaleString()}</span>
            </div>
            <div class="barcode-placeholder">
              *${order._id.toUpperCase()}*<br/>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    // 🚀 Ensure print triggers after content is ready
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      // Remove iframe after print dialog is closed
      iframe.contentWindow.onafterprint = () => {
        document.body.removeChild(iframe);
      };
    }, 500);
  };

  if (!isOpen || !order) return null;

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <div className="relative w-[3.5in] bg-white rounded-none shadow-2xl text-black border-4 border-black animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-3 bg-black">
          <button onClick={handlePrint} className="bg-white text-black px-4 py-1 text-[10px] font-black uppercase italic flex items-center hover:bg-primary transition-colors">
            <Printer size={14} className="mr-2" /> Confirm & Print
          </button>
          <button onClick={onClose} className="text-white hover:text-primary transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6 bg-white font-mono">
          <div className="text-center border-b-4 border-black pb-2 mb-4">
            <h1 className="text-xl font-black m-0">ORDER DETAILS</h1>
            <p className="text-[9px] uppercase font-bold opacity-60">Verification Checklist</p>
          </div>

          <div className="space-y-3">
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div 
                  onClick={() => setCheckedItems({...checkedItems, [i]: !checkedItems[i]})}
                  className={`w-5 h-5 border-2 border-black flex items-center justify-center cursor-pointer ${checkedItems[i] ? 'bg-black text-white' : 'bg-white'}`}
                >
                  {checkedItems[i] && <Check size={14} strokeWidth={4} />}
                </div>
                <div className="flex-1 text-xs font-bold leading-tight select-none">
                  {item.name} <span className="float-right font-black text-sm">x{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-between items-end border-t-2 border-black pt-2">
            <span className="text-[10px] font-black italic">TOTAL COD</span>
            <span className="text-3xl font-black italic tracking-tighter">₱{Number(order.totalAmount).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
};

export default LogisticsWaybillModal;