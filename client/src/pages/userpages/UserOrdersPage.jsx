import React, { useState, useMemo } from "react";
import { 
  Package, Truck, Clock, Hash, CheckCircle, Navigation, 
  Loader2, Trash2, XCircle, Handshake, MessageCircle, ArrowRight
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { orderAPI } from "../../services/api";
import toast from "react-hot-toast";
import ConfirmationModals from "../../components/modals/ConfirmationModals";
import OrderManifestSkeleton from "../../components/skeletons/OrderManifestSkeleton";

const UserOrdersPage = () => {
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const { orders = [], isLoading = true, setOrders = () => {}, fetchOrders = () => {} } = context;

  const [activeTab, setActiveTab] = useState("All");
  const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: "delete", order: null });

  const categories = ["All", "To Ship", "To Receive", "Completed", "Cancelled"];

  const filteredOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (activeTab === "All") return sorted;

    return sorted.filter(order => {
      const status = order.status?.toLowerCase().trim();
      switch (activeTab) {
        case "To Ship": 
          return ["pending", "order in progress", "processing", "cancellation requested"].includes(status);
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

  const handleModalConfirm = async () => {
    const { mode, order } = modalConfig;
    if (!order) return;
    
    try {
      if (mode === "cancel") {
          await orderAPI.cancelOrder(order._id); 
          setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'Cancellation Requested' } : o));
          setModalConfig({ ...modalConfig, isOpen: false });
          toast.success("REQUEST SENT: REDIRECTING TO CHAT", { icon: '💬' });
          setTimeout(() => navigate(`/dashboard/my-orders`), 1500);

      } else if (mode === "delete") {
        await orderAPI.deleteOrder(order._id); 
        setOrders(prev => prev.filter(o => o._id !== order._id));
        toast.success("RECORD PURGED");
        setModalConfig({ ...modalConfig, isOpen: false });
      } else if (mode === "pickup") {
        await orderAPI.confirmOrderDelivery(order._id);
        // Standardized to 'Delivered' to sync with Admin Panel
        setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'Delivered' } : o));
        toast.success("ORDER MARKED AS DELIVERED", { icon: '📦' });
        setModalConfig({ ...modalConfig, isOpen: false });
      }
      fetchOrders(true);
    } catch (err) {
      toast.error("ACTION FAILED");
    }
  };

  const getStatusConfig = (status) => {
    const s = status?.toLowerCase().trim();
    if (s === 'cancellation requested') return { color: 'text-warning', icon: <Clock size={16} className="animate-pulse" />, bg: 'bg-warning/10' };
    if (s === 'pending') return { color: 'text-warning', icon: <Clock size={16} />, bg: 'bg-warning/10' };
    if (['order in progress', 'processing'].includes(s)) return { color: 'text-secondary', icon: <Loader2 size={16} className="animate-spin" />, bg: 'bg-secondary/10' };
    if (['shipped/in transit', 'out for delivery', 'shipped'].includes(s)) return { color: 'text-primary', icon: <Truck size={16} />, bg: 'bg-primary/10' };
    if (['delivered', 'completed'].includes(s)) return { color: 'text-success', icon: <CheckCircle size={16} />, bg: 'bg-success/10' };
    if (['cancelled', 'exception/failed'].includes(s)) return { color: 'text-error', icon: <XCircle size={16} />, bg: 'bg-error/10' };
    return { color: 'text-base-content/50', icon: <Hash size={16} />, bg: 'bg-base-content/5' };
  };

// 2. Use it in the loading check
  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto px-4 overflow-hidden pt-6">
        <OrderManifestSkeleton />
      </div>
    );
  }
  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto px-4 overflow-hidden pt-6">
      <header className="flex flex-col gap-4 mb-2 shrink-0">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">
          Orders <span className="text-primary">Manifest</span>
        </h1>
        <div className="flex border-b border-base-content/10 overflow-x-auto no-scrollbar bg-base-100 sticky top-0 z-10">
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

      <main className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 pt-4 space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-20 grayscale">
            <Package size={48} className="mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest italic">No {activeTab} Records</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const config = getStatusConfig(order.status);
            const statusLower = order.status?.toLowerCase().trim();
            const orderDate = new Date(order.createdAt);

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
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${config.bg} ${config.color}`}>
                    {config.icon} <span className="text-[10px] font-black uppercase italic">{order.status}</span>
                  </div>
                </div>

                <div className="collapse-content px-6 pb-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-base-content/10">
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
                    </div>

                    <div className="bg-base-300/50 p-6 rounded-[24px] flex flex-col gap-4 border border-base-content/5">
                      <div className="flex flex-col gap-3">
                        {["pending", "order in progress", "processing"].includes(statusLower) && (
                          <button onClick={() => setModalConfig({ isOpen: true, mode: "cancel", order })} className="btn btn-error btn-outline rounded-xl font-black uppercase italic text-xs h-14 border-2">
                            <XCircle size={16} className="mr-2" /> Request Cancellation
                          </button>
                        )}
                        {statusLower === 'cancellation requested' && (
                          <button onClick={() => navigate(`/messages?orderId=${order._id}`)} className="btn btn-warning btn-outline rounded-xl font-black uppercase italic text-xs h-14 border-2 animate-pulse">
                            <MessageCircle size={16} className="mr-2" /> Chat with Seller
                          </button>
                        )}
                        {statusLower === "out for delivery" && (
                          <button onClick={() => setModalConfig({ isOpen: true, mode: "pickup", order })} className="btn btn-success rounded-xl font-black uppercase italic text-xs h-14 shadow-lg shadow-success/20 text-success-content">
                            <Handshake size={18} className="mr-2" /> Confirm Pickup
                          </button>
                        )}
                        {["shipped/in transit", "shipped"].includes(statusLower) && (
                          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5">
                            <Truck size={24} className="text-primary mb-2 animate-bounce" />
                            <p className="text-[10px] font-black uppercase italic text-primary">Package in Transit</p>
                            <p className="text-[8px] font-bold opacity-50 uppercase text-center mt-1">Confirmation available once out for delivery</p>
                          </div>
                        )}
                        {["completed", "delivered", "cancelled", "exception/failed"].includes(statusLower) && (
                          <div className="grid grid-cols-1 gap-2">
                            <button onClick={() => navigate('/messages')} className="btn btn-primary rounded-xl font-black uppercase italic text-[10px] h-14">
                              <MessageCircle size={16} className="mr-1" /> Support
                            </button>
                            {/* <button onClick={() => setModalConfig({ isOpen: true, mode: "delete", order })} className="btn btn-outline border-2 border-error/30 text-error hover:bg-error rounded-xl font-black uppercase italic text-[10px] h-14">
                              <Trash2 size={16} className="mr-1" /> Clear Log
                            </button> */}
                          </div>
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

      <ConfirmationModals 
        isOpen={modalConfig.isOpen} 
        mode={modalConfig.mode} 
        orderId={modalConfig.order?._id} 
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} 
        onConfirm={handleModalConfirm} 
        confirmText={modalConfig.mode === "cancel" ? "Go to Chat" : "Confirm"}
      />
    </div>
  );
};

export default UserOrdersPage;