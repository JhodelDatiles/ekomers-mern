import React, { useState, useMemo } from "react";
import { 
  Package, Truck, Clock, Hash, CheckCircle,
  Loader2, Trash2, XCircle, Handshake, MessageCircle, RefreshCw
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { orderAPI } from "../../services/api";
import toast from "react-hot-toast";
import ConfirmationModals from "../../components/modals/ConfirmationModals";
import CancelOrderModal from "../../components/modals/Cancelordermodal";
import ChatModal from "../../components/modals/Chatmodal";
import OrderManifestSkeleton from "../../components/skeletons/OrderManifestSkeleton";

const UserOrdersPage = () => {
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const { orders = [], isLoading = true, setOrders = () => {}, fetchOrders = () => {} } = context;

  const [activeTab, setActiveTab] = useState("All");
  const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: "delete", order: null });

  // ── Cancellation modal state ──
  const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null });
  const [cancelling, setCancelling] = useState(false);

  // ── Chat modal state ──
  const [chatModal, setChatModal] = useState({ isOpen: false, order: null });

  const categories = ["All", "To Ship", "To Receive", "Completed", "Cancelled"];

  const filteredOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (activeTab === "All") return sorted;

    return sorted.filter(order => {
      const status = order.status?.toLowerCase().trim();
      switch (activeTab) {
        case "To Ship": 
          return ["pending", "paid", "awaiting payment", "order in progress", "processing"].includes(status);
        case "To Receive": 
          return ["shipped/in transit", "out for delivery", "shipped"].includes(status);
        case "Completed": 
          return ["completed", "delivered"].includes(status);
        case "Cancelled": 
          return ["cancelled", "exception/failed"].includes(status);
        default: return true;
      }
    });
  }, [orders, activeTab]);

  // ── Handle cancellation with reason ──
  const handleCancelConfirm = async (reason) => {
    const { order } = cancelModal;
    if (!order) return;
    setCancelling(true);
    try {
      const result = await orderAPI.cancelOrder(order._id, reason);
      
      // Update local state immediately — no refetch needed
      setOrders(prev => prev.map(o => 
        o._id === order._id 
          ? { ...o, status: 'Cancelled', cancellationReason: reason }
          : o
      ));

      setCancelModal({ isOpen: false, order: null });

      if (result.refundTriggered) {
        toast.success(
          "Order cancelled. Refund initiated — expect 5–15 business days to reflect in your wallet or card.",
          { duration: 7000, icon: '💸' }
        );
      } else if (result.needsManualRefund) {
        toast(
          "Order cancelled. Your payment method (QR PH/GrabPay) requires a manual refund — the seller will contact you to process it.",
          { duration: 8000, icon: '⚠️', style: { background: '#78350f', color: '#fef3c7' } }
        );
      } else {
        toast.success("Order cancelled successfully.", { icon: '✅' });
      }

      // Background refresh to sync with server
      fetchOrders(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  // ── Handle delete / pickup modals ──
  const handleModalConfirm = async () => {
    const { mode, order } = modalConfig;
    if (!order) return;
    
    try {
      if (mode === "delete") {
        await orderAPI.deleteOrder(order._id); 
        setOrders(prev => prev.filter(o => o._id !== order._id));
        toast.success("Record purged.");
        setModalConfig({ ...modalConfig, isOpen: false });
      } else if (mode === "pickup") {
        await orderAPI.confirmOrderDelivery(order._id);
        setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'Delivered' } : o));
        toast.success("Order marked as delivered.", { icon: '📦' });
        setModalConfig({ ...modalConfig, isOpen: false });
      }
      fetchOrders(true);
    } catch (err) {
      toast.error("Action failed.");
    }
  };

  const getStatusConfig = (status) => {
    const s = status?.toLowerCase().trim();
    if (['pending', 'paid', 'awaiting payment'].includes(s)) return { color: 'text-warning', icon: <Clock size={16} />, bg: 'bg-warning/10' };
    if (['order in progress', 'processing'].includes(s)) return { color: 'text-secondary', icon: <Loader2 size={16} className="animate-spin" />, bg: 'bg-secondary/10' };
    if (['shipped/in transit', 'out for delivery', 'shipped'].includes(s)) return { color: 'text-primary', icon: <Truck size={16} />, bg: 'bg-primary/10' };
    if (['delivered', 'completed'].includes(s)) return { color: 'text-success', icon: <CheckCircle size={16} />, bg: 'bg-success/10' };
    if (['cancelled', 'exception/failed'].includes(s)) return { color: 'text-error', icon: <XCircle size={16} />, bg: 'bg-error/10' };
    return { color: 'text-base-content/50', icon: <Hash size={16} />, bg: 'bg-base-content/5' };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto px-4 overflow-hidden pt-6">
        <OrderManifestSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto px-4 overflow-hidden">
      
      <header className="pt-6 shrink-0 bg-base-100 z-20">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-4">
          Orders <span className="text-primary">Manifest</span>
        </h1>
        <div className="flex border-b border-base-content/10 overflow-x-auto custom-scrollbar">
          {categories.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-6 py-4 text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap
                ${activeTab === tab ? "text-primary" : "text-base-content/40 hover:text-base-content"}`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pr-2 custom-scrollbar pt-4 pb-10 space-y-4 no-scrollbar">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-20 grayscale">
            <Package size={48} className="mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest italic">No {activeTab} Records</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusCfg = getStatusConfig(order.status);
            const statusLower = order.status?.toLowerCase().trim();
            const orderDate = new Date(order.createdAt);

            // Statuses where user can still cancel
            const canCancel = ['pending', 'paid', 'awaiting payment', 'order in progress', 'processing'].includes(statusLower);

            return (
              <div key={order._id} className="collapse collapse-arrow bg-base-200/40 border border-base-content/5 rounded-[32px] shadow-xl mb-4 group hover:border-primary/20 transition-all">
                <input type="checkbox" id={`order-${order._id}`} /> 
                
                <div className="collapse-title p-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-mono text-[10px] font-black uppercase">
                      <Hash size={12} /> {order._id.slice(-8)}
                    </div>
                    <h3 className="text-xl font-black uppercase italic text-base-content flex flex-col leading-tight">
                      <span>{orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="text-[10px] opacity-50 not-italic tracking-tighter font-mono">
                        {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </h3>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                    {statusCfg.icon} <span className="text-[10px] font-black uppercase italic">{order.status}</span>
                  </div>
                </div>

                <div className="collapse-content px-6 pb-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-base-content/10">
                    
                    {/* LEFT: Items */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase opacity-30 flex items-center gap-2">
                          <Package size={12}/> Contents Manifest
                        </h4>
                        <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                          {order.items?.length} UNITS
                        </span>
                      </div>
                      <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 custom-manifest-scrollbar">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-base-300/30 p-4 rounded-2xl border border-base-content/5">
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase italic leading-tight">{item.name}</span>
                              <span className="text-[9px] font-bold opacity-50 uppercase">QTY: {item.quantity}</span>
                            </div>
                            <span className="text-xs font-black text-primary italic">₱{item.price?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      {/* Cancellation reason badge */}
                      {statusLower === 'cancelled' && order.cancellationReason && (
                        <div className="flex items-start gap-2 p-3 bg-error/5 border border-error/10 rounded-xl">
                          <XCircle size={12} className="text-error mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] font-black uppercase opacity-40 mb-0.5">Reason</p>
                            <p className="text-[10px] font-bold text-error/80 italic">{order.cancellationReason}</p>
                          </div>
                        </div>
                      )}

                      {/* Refund indicator */}
                      {statusLower === 'cancelled' && order.refundId && (
                        <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/10 rounded-xl">
                          <RefreshCw size={12} className="text-success" />
                          <p className="text-[10px] font-bold text-success/80 italic uppercase">
                            Refund processing — expect 5–15 business days
                          </p>
                        </div>
                      )}
                      {statusLower === 'cancelled' && !order.refundId && order.paymentStatus === 'refund_pending' && (
                        <div className="flex items-center gap-2 p-3 bg-warning/5 border border-warning/10 rounded-xl">
                          <RefreshCw size={12} className="text-warning" />
                          <p className="text-[10px] font-bold text-warning/80 italic uppercase">
                            Manual refund pending — seller will contact you
                          </p>
                        </div>
                      )}
                    </div>

                    {/* RIGHT: Actions */}
                    <div className="bg-base-300/50 p-6 rounded-[24px] flex flex-col gap-4 border border-base-content/5">
                      <div className="flex flex-col gap-3">

                        {/* Chat with Seller — available on ALL non-cancelled orders */}
                        {statusLower !== 'cancelled' && statusLower !== 'exception/failed' && (
                          <button
                            onClick={() => setChatModal({ isOpen: true, order })}
                            className="btn btn-primary btn-outline rounded-xl font-black uppercase italic text-xs h-12 border-2"
                          >
                            <MessageCircle size={15} className="mr-2" /> Chat with Seller
                          </button>
                        )}

                        {/* Cancel button */}
                        {canCancel && (
                          <button
                            onClick={() => setCancelModal({ isOpen: true, order })}
                            className="btn btn-error btn-outline rounded-xl font-black uppercase italic text-xs h-12 border-2"
                          >
                            <XCircle size={15} className="mr-2" /> Cancel Order
                          </button>
                        )}

                        {/* Confirm pickup */}
                        {statusLower === "out for delivery" && (
                          <button
                            onClick={() => setModalConfig({ isOpen: true, mode: "pickup", order })}
                            className="btn btn-success rounded-xl font-black uppercase italic text-xs h-12 shadow-lg shadow-success/20 text-success-content"
                          >
                            <Handshake size={16} className="mr-2" /> Confirm Pickup
                          </button>
                        )}

                        {/* In transit message */}
                        {["shipped/in transit", "shipped"].includes(statusLower) && (
                          <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5">
                            <Truck size={20} className="text-primary mb-1.5 animate-bounce" />
                            <p className="text-[10px] font-black uppercase italic text-primary">Package in Transit</p>
                            <p className="text-[8px] font-bold opacity-50 uppercase text-center mt-1">Confirmation available once out for delivery</p>
                          </div>
                        )}

                        {/* Support for cancelled orders */}
                        {["cancelled", "exception/failed"].includes(statusLower) && (
                          <button
                            onClick={() => setChatModal({ isOpen: true, order })}
                            className="btn btn-ghost border border-base-content/10 rounded-xl font-black uppercase italic text-[10px] h-12"
                          >
                            <MessageCircle size={15} className="mr-1" /> Contact Support
                          </button>
                        )}

                        {/* Delete record */}
                        {["completed", "cancelled", "delivered"].includes(statusLower) && (
                          <button
                            onClick={() => setModalConfig({ isOpen: true, mode: "delete", order })}
                            className="btn btn-ghost btn-xs text-error/30 hover:text-error rounded-lg font-black uppercase italic text-[9px] mt-1"
                          >
                            <Trash2 size={11} className="mr-1" /> Remove Record
                          </button>
                        )}
                      </div>

                      <div className="flex justify-between items-center p-4 bg-base-100/50 rounded-xl border border-base-content/5 mt-auto">
                        <span className="text-[10px] font-black uppercase opacity-40">Final Amount</span>
                        <span className="text-xl font-black italic">₱{order.totalAmount?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Chat modal — linked to specific order */}
      <ChatModal
        isOpen={chatModal.isOpen}
        order={chatModal.order}
        onClose={() => setChatModal({ isOpen: false, order: null })}
      />

      {/* Cancel order modal (with reason) */}
      <CancelOrderModal
        isOpen={cancelModal.isOpen}
        order={cancelModal.order}
        loading={cancelling}
        onClose={() => !cancelling && setCancelModal({ isOpen: false, order: null })}
        onConfirm={handleCancelConfirm}
      />

      {/* Delete / pickup confirmation modal */}
      <ConfirmationModals 
        isOpen={modalConfig.isOpen} 
        mode={modalConfig.mode} 
        orderId={modalConfig.order?._id} 
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} 
        onConfirm={handleModalConfirm} 
      />
    </div>
  );
};

export default UserOrdersPage;