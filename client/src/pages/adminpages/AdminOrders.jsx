import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Printer, ChevronRight, Search, Package, RefreshCw,
  ChevronLeft, User, Loader2, Calendar, X
} from "lucide-react";
import toast from "react-hot-toast";
import { adminOrderAPI } from "../../services/api.js";
import LogisticsWaybillModal from "../../components/modals/LogisticsWaybillModal";

const USERS_PER_PAGE       = 10;
const USER_ORDERS_PER_PAGE = 10;

const PERIOD_OPTIONS = [
  { value: 'all',    label: 'All Time'   },
  { value: 'day',    label: 'Today'      },
  { value: 'week',   label: 'This Week'  },
  { value: 'month',  label: 'This Month' },
  { value: 'custom', label: 'Custom'     },
];

const STATUS_OPTIONS = [
  "Pending", "Order in Progress", "Shipped/In Transit",
  "Out for Delivery", "Delivered", "Cancelled",
];

const getStatusColor = (status) => {
  switch (status) {
    case "Pending":            return "text-warning border-warning/20 bg-warning/5";
    case "Order in Progress":  return "text-info border-info/20 bg-info/5";
    case "Shipped/In Transit": return "text-primary border-primary/20 bg-primary/5";
    case "Out for Delivery":   return "text-secondary border-secondary/20 bg-secondary/5";
    case "Delivered":          return "text-success border-success/20 bg-success/5";
    case "Cancelled":          return "text-error border-error/20 bg-error/5";
    default:                   return "text-white border-white/10";
  }
};

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

// ─── Shared mini pagination ────────────────────────────────────────────────────
const MiniPagination = ({ currentPage, totalPages, totalItems, startIdx, endIdx, label, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 bg-white/[0.02]">
      <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
        {startIdx + 1}–{endIdx} of {totalItems} {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/30 hover:border-primary/50 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={11} />
        </button>
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`e-${i}`} className="w-6 text-center text-[9px] text-white/20">···</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-6 h-6 flex items-center justify-center rounded-lg text-[9px] font-black border transition-all ${
                currentPage === page
                  ? "bg-primary border-primary text-black"
                  : "bg-white/5 border-white/10 text-white/30 hover:border-primary/50 hover:text-primary"
              }`}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/30 hover:border-primary/50 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
};

// ─── Single user accordion ────────────────────────────────────────────────────
const UserOrderGroup = ({ userEntry, onPrint }) => {
  const [isExpanded, setIsExpanded]           = useState(false);
  const [orders, setOrders]                   = useState([]);
  const [pagination, setPagination]           = useState({ currentPage: 1, totalPages: 1, totalOrders: 0 });
  const [loadingOrders, setLoadingOrders]     = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const fetchUserOrders = useCallback(async (page = 1) => {
    setLoadingOrders(true);
    try {
      const data = await adminOrderAPI.getOrdersByUser(userEntry._id, { page, limit: USER_ORDERS_PER_PAGE });
      setOrders(data.orders || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalOrders: 0 });
    } catch {
      toast.error(`Failed to load orders for ${userEntry.username}`);
    } finally {
      setLoadingOrders(false);
    }
  }, [userEntry._id, userEntry.username]);

  const handleToggle = () => {
    const opening = !isExpanded;
    setIsExpanded(opening);
    if (opening && orders.length === 0) fetchUserOrders(1);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    const toastId = toast.loading("Updating status...");
    try {
      await adminOrderAPI.updateOrderStatus(orderId, { status: newStatus });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Updated to ${newStatus}`, { id: toastId });
    } catch {
      toast.error("Update failed", { id: toastId });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const startIdx = (pagination.currentPage - 1) * USER_ORDERS_PER_PAGE;
  const endIdx   = Math.min(pagination.currentPage * USER_ORDERS_PER_PAGE, pagination.totalOrders);

  return (
    <div className="bg-white/5 border border-white/5 rounded-[24px] overflow-hidden">
      <div
        onClick={handleToggle}
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.03] transition-all select-none"
      >
        <div className="flex items-center gap-4">
          <ChevronRight
            className={`transition-transform duration-300 flex-shrink-0 ${isExpanded ? "rotate-90 text-primary" : "text-white/20"}`}
            size={18}
          />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-primary" />
            </div>
            <div>
              <p className="font-black uppercase italic text-white tracking-tighter leading-none">
                {userEntry.username || "Guest"}
              </p>
              {userEntry.email && (
                <p className="text-[9px] text-white/30 font-mono mt-0.5">{userEntry.email}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-white/20 font-mono hidden sm:block">
            {fmt(userEntry.lastOrderAt)}
          </span>
          <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${
            userEntry.totalOrders > USER_ORDERS_PER_PAGE
              ? "text-primary border-primary/30 bg-primary/10"
              : "text-white/30 border-white/10 bg-white/5"
          }`}>
            {userEntry.totalOrders} order{userEntry.totalOrders !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          {loadingOrders ? (
            <div className="flex items-center justify-center py-8 border-t border-white/5">
              <Loader2 size={20} className="animate-spin text-primary/50" />
            </div>
          ) : (
            <>
              <div className="px-5 pb-0">
                <table className="table w-full border-t border-white/5">
                  <tbody>
                    {orders.map((order) => {
                      const isRowUpdating = updatingOrderId === order._id;
                      return (
                        <tr
                          key={order._id}
                          className={`border-white/5 bg-transparent hover:bg-white/5 transition-colors ${isRowUpdating ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          <td className="font-mono text-[10px] text-primary font-black uppercase tracking-tighter opacity-70">
                            #{order._id.slice(-8)}
                          </td>
                          <td className="text-[10px] text-white/40 font-mono hidden sm:table-cell">
                            {fmt(order.createdAt)}
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
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s} className="bg-[#121212] text-white font-bold">{s}</option>
                                ))}
                              </select>
                              {isRowUpdating && <RefreshCw size={10} className="absolute -right-5 animate-spin text-primary" />}
                            </div>
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => onPrint(order)}
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
              <MiniPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalOrders}
                startIdx={startIdx}
                endIdx={endIdx}
                label="orders"
                onPageChange={(page) => fetchUserOrders(page)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const UserListSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-white/5 border border-white/5 rounded-[24px] p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-3 w-28 bg-white/10 rounded" />
            <div className="h-2 w-20 bg-white/5 rounded" />
          </div>
        </div>
        <div className="h-5 w-16 bg-white/10 rounded-full" />
      </div>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminOrders = () => {
  const [users, setUsers]                     = useState([]);
  const [pagination, setPagination]           = useState({ currentPage: 1, totalPages: 1, totalUsers: 0 });
  const [loading, setLoading]                 = useState(true);
  const [searchTerm, setSearchTerm]           = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage]         = useState(1);
  const [period, setPeriod]                   = useState("all");
  const [dateFrom, setDateFrom]               = useState("");
  const [dateTo, setDateTo]                   = useState("");
  const [appliedFrom, setAppliedFrom]         = useState("");
  const [appliedTo, setAppliedTo]             = useState("");
  const [selectedOrder, setSelectedOrder]     = useState(null);
  const [isModalOpen, setIsModalOpen]         = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, period, appliedFrom, appliedTo]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: debouncedSearch,
        page:   currentPage,
        limit:  USERS_PER_PAGE,
      };
      if (period === 'custom') {
        if (appliedFrom) params.dateFrom = appliedFrom;
        if (appliedTo)   params.dateTo   = appliedTo;
      } else {
        params.period = period;
      }
      const data = await adminOrderAPI.getOrderUsers(params);
      setUsers(data.users || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalUsers: 0 });
    } catch {
      toast.error("Failed to load order users");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, currentPage, period, appliedFrom, appliedTo]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleApplyCustom = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  };

  const handleClearCustom = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedFrom("");
    setAppliedTo("");
    setPeriod("all");
  };

  const isCustomActive    = period === 'custom';
  const hasCustomApplied  = isCustomActive && (appliedFrom || appliedTo);

  const customLabel = hasCustomApplied
    ? `${appliedFrom ? fmt(appliedFrom) : "Start"} → ${appliedTo ? fmt(appliedTo) : "End"}`
    : null;

  const startIdx = (pagination.currentPage - 1) * USERS_PER_PAGE;
  const endIdx   = Math.min(pagination.currentPage * USERS_PER_PAGE, pagination.totalUsers);

  const emptyLabel = () => {
    if (hasCustomApplied) return `No orders in selected range`;
    const found = PERIOD_OPTIONS.find(p => p.value === period);
    return period !== 'all' ? `No orders ${found?.label?.toLowerCase()}` : "No Orders Found";
  };

  return (
    <div className="p-6 h-[calc(100vh-100px)] overflow-y-auto no-scrollbar">

      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white">
              Logistics <span className="text-primary">Archive</span>
            </h1>
            <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mt-1">
              {pagination.totalUsers > 0
                ? `${pagination.totalUsers} customer${pagination.totalUsers !== 1 ? "s" : ""} with orders`
                : "Fulfillment & Waybill Management"}
            </p>
          </div>

          {/* Search */}
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search by username or email..."
              className="bg-white/5 border-2 border-white/10 rounded-full py-2 pl-10 pr-6 text-sm font-bold text-white outline-none focus:border-primary/50 transition-all w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-col gap-3">
          {/* Period pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={13} className="text-white/20 flex-shrink-0" />
            {PERIOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setPeriod(value);
                  if (value !== 'custom') {
                    setAppliedFrom("");
                    setAppliedTo("");
                    setDateFrom("");
                    setDateTo("");
                  }
                }}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border transition-all ${
                  period === value
                    ? "bg-primary border-primary text-black"
                    : "bg-white/5 border-white/10 text-white/30 hover:border-primary/40 hover:text-white/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date range — slides in when Custom is selected */}
          <div className={`overflow-hidden transition-all duration-300 ${isCustomActive ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="flex flex-wrap items-end gap-3 pt-1 pb-1 pl-5">
              {/* From */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-primary/50 transition-all [color-scheme:dark]"
                />
              </div>
              {/* To */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30">To</label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-primary/50 transition-all [color-scheme:dark]"
                />
              </div>
              {/* Apply */}
              <button
                onClick={handleApplyCustom}
                disabled={!dateFrom && !dateTo}
                className="btn btn-primary btn-sm font-black uppercase italic tracking-wider px-5 disabled:opacity-30"
              >
                Apply
              </button>
              {/* Clear */}
              {hasCustomApplied && (
                <button
                  onClick={handleClearCustom}
                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-error transition-colors"
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>

            {/* Applied range badge */}
            {hasCustomApplied && (
              <div className="ml-5 mt-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 border border-primary/20 bg-primary/5 px-3 py-1 rounded-full">
                  Showing: {customLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* USER LIST */}
      {loading ? (
        <UserListSkeleton />
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 opacity-20">
          <Package size={48} className="mb-4" />
          <p className="font-black uppercase tracking-[0.4em] italic text-sm">{emptyLabel()}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {users.map((userEntry) => (
              <UserOrderGroup
                key={userEntry._id}
                userEntry={userEntry}
                onPrint={(order) => { setSelectedOrder(order); setIsModalOpen(true); }}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-6 bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              <MiniPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalUsers}
                startIdx={startIdx}
                endIdx={endIdx}
                label="customers"
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      <LogisticsWaybillModal order={selectedOrder} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default AdminOrders;