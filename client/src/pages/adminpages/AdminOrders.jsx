import React, { useState, useEffect, useMemo } from "react";
import {
  Printer,
  ChevronRight,
  Search,
  Calendar,
  Package,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminOrderAPI } from "../../services/api.js";
import LogisticsWaybillModal from "../../components/modals/LogisticsWaybillModal";

// ============================================================================
// SKELETON COMPONENT (No changes)
// ============================================================================
const LogisticsSkeleton = () => (
  <div className="p-6 h-[calc(100vh-100px)] overflow-hidden animate-pulse">
    <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div className="space-y-3">
        <div className="h-10 w-64 bg-white/10 rounded-lg" />
        <div className="h-3 w-32 bg-white/5 rounded" />
      </div>
      <div className="h-12 w-full md:w-80 bg-white/5 rounded-full border border-white/10" />
    </header>
    {[1, 2].map((group) => (
      <section key={group} className="mb-12 space-y-6">
        <div className="flex items-center gap-4 opacity-20">
          <Calendar size={14} />
          <div className="h-3 w-24 bg-white/20 rounded" />
          <div className="h-px flex-1 bg-white/10"></div>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-[24px] p-5">
          <div className="flex justify-between items-center">
            <div className="h-5 w-40 bg-white/10 rounded" />
            <div className="h-3 w-20 bg-white/5 rounded" />
          </div>
          <div className="mt-6 space-y-4">
            {[1, 2].map((row) => (
              <div key={row} className="flex justify-between py-2 border-t border-white/5">
                <div className="h-3 w-16 bg-white/10 rounded" />
                <div className="h-4 w-24 bg-white/10 rounded" />
                <div className="h-8 w-20 bg-white/20 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </section>
    ))}
  </div>
);

// ============================================================================
// MAIN COMPONENT: AdminOrders
// ============================================================================
const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedUser, setExpandedUser] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null); // ADDED: Loading state per order

  const statusOptions = [
    "Pending",
    "Order in Progress",
    "Shipped/In Transit",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "text-warning border-warning/20 bg-warning/5";
      case "Order in Progress": return "text-info border-info/20 bg-info/5";
      case "Shipped/In Transit": return "text-primary border-primary/20 bg-primary/5";
      case "Out for Delivery": return "text-secondary border-secondary/20 bg-secondary/5";
      case "Delivered": return "text-success border-success/20 bg-success/5";
      case "Cancelled": return "text-error border-error/20 bg-error/5";
      default: return "text-white border-white/10";
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await adminOrderAPI.getAllOrders();
      setOrders(data.orders || data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId); // START LOADING
    const toastId = toast.loading("Updating shipment status...");
    try {
      await adminOrderAPI.updateOrderStatus(orderId, { status: newStatus });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Updated to ${newStatus}`, { id: toastId });
    } catch (err) {
      toast.error("Transmission sync failed", { id: toastId });
    } finally {
      setUpdatingOrderId(null); // STOP LOADING
    }
  };

  const getWeekNumber = (date) => {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  };

  const processedGroups = useMemo(() => {
    const filtered = orders.filter((o) => {
      const matchesSearch =
        o.userId?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o._id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return sorted.reduce((acc, order) => {
      const week = getWeekNumber(order.createdAt);
      const year = new Date(order.createdAt).getFullYear();
      const weekKey = `Week ${week}, ${year}`;
      if (!acc[weekKey]) acc[weekKey] = {};
      const userId = order.userId?._id || "guest";
      if (!acc[weekKey][userId]) {
        acc[weekKey][userId] = {
          userInfo: order.userId || { username: "Guest" },
          userOrders: [],
        };
      }
      acc[weekKey][userId].userOrders.push(order);
      return acc;
    }, {});
  }, [orders, searchTerm, statusFilter]);

  if (loading) return <LogisticsSkeleton />;

  return (
    <div className="p-6 h-[calc(100vh-100px)] overflow-y-auto no-scrollbar">
      {/* HEADER */}
      <header className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white">
            Logistics <span className="text-primary">Archive</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
             <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">
              Fulfillment & Waybill Management
            </p>
            {updatingOrderId && <RefreshCw size={12} className="animate-spin text-primary" />}
          </div>
        </div>

        <div className="space-y-3 w-full md:w-80">
          <div className="relative group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search User or Order ID..."
              className="bg-white/5 border-2 border-white/10 rounded-full py-2 pl-10 pr-6 text-sm font-bold text-white outline-none focus:border-primary/50 transition-all w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {["All", "Pending", "Delivered", "Cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                  statusFilter === s 
                  ? "bg-primary border-primary text-black" 
                  : "bg-white/5 border-white/10 text-white/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* GROUPS LIST */}
      <div className="space-y-12 pb-20">
        {Object.keys(processedGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 opacity-20">
            <Package size={48} className="mb-4" />
            <p className="font-black uppercase tracking-[0.4em] italic text-sm">
              Empty Transmission Log
            </p>
          </div>
        ) : (
          Object.entries(processedGroups).map(([weekLabel, users]) => (
            <section key={weekLabel} className="space-y-4">
              <div className="flex items-center gap-4 opacity-50">
                <Calendar size={14} className="text-primary" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">
                  {weekLabel}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
              </div>

              {Object.values(users).map((group) => {
                const isExpanded = expandedUser === group.userInfo._id;
                return (
                  <div
                    key={group.userInfo._id}
                    className="bg-white/5 border border-white/5 rounded-[24px] overflow-hidden transition-all duration-300"
                  >
                    <div
                      onClick={() => setExpandedUser(isExpanded ? null : group.userInfo._id)}
                      className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-all select-none"
                    >
                      <div className="flex items-center gap-4 font-black uppercase italic text-white">
                        <ChevronRight
                          className={`transition-transform duration-500 ${isExpanded ? "rotate-90 text-primary" : "text-white/20"}`}
                          size={20}
                        />
                        <span className="tracking-tighter">
                          {group.userInfo.username}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-white/30 uppercase italic">
                        {group.userOrders.length} Shipments
                      </span>
                    </div>

                    <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="overflow-hidden">
                        <div className="px-5 pb-5">
                          <table className="table w-full border-t border-white/5">
                            <tbody>
                              {group.userOrders.map((order) => {
                                const isRowUpdating = updatingOrderId === order._id;
                                return (
                                  <tr key={order._id} className={`border-white/5 bg-transparent hover:bg-white/5 transition-colors ${isRowUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <td className="font-mono text-[10px] text-primary font-black uppercase tracking-tighter opacity-70">
                                      #{order._id.slice(-8)}
                                    </td>
                                    <td className="font-black text-white text-sm">
                                      ₱{Number(order.totalAmount).toLocaleString()}
                                    </td>
                                    <td>
                                      <div className="relative inline-flex items-center">
                                        <select
                                          className={`select select-bordered select-xs font-black uppercase italic text-[9px] border-white/10 transition-all ${getStatusColor(order.status)}`}
                                          value={order.status}
                                          onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                                          disabled={isRowUpdating}
                                        >
                                          {statusOptions.map((s) => (
                                            <option key={s} value={s} className="bg-[#121212] text-white font-bold">
                                              {s}
                                            </option>
                                          ))}
                                        </select>
                                        {isRowUpdating && (
                                          <RefreshCw size={10} className="absolute -right-5 animate-spin text-primary" />
                                        )}
                                      </div>
                                    </td>
                                    <td className="text-right">
                                      <button
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setIsModalOpen(true);
                                        }}
                                        disabled={isRowUpdating}
                                        className="btn btn-primary btn-xs font-black italic uppercase px-4 active:scale-95 transition-transform disabled:bg-white/5 disabled:text-white/20"
                                      >
                                        <Printer size={12} className="mr-1" /> Print
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          ))
        )}
      </div>

      <LogisticsWaybillModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default AdminOrders;