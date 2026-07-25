import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PhilippinePesoIcon,
  Package,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Terminal,
  Plus,
  Download,
  RefreshCcw,
} from "lucide-react";
import { adminSalesAPI } from "../../services/api";
import DashboardSkeleton from "../../components/skeletons/DashboardSkeleton";
import toast from "react-hot-toast";

const AdminDashboardOverview = () => {
  const [data, setData] = useState({
    timeline: [],
    topProducts: [],
    recentOrders: [],
    lowStockProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🛠️ FILTER: Captures 0 (Sold Out) up to 5 units
  const criticalStock =
    data.lowStockProducts?.filter((p) =>
      p.sizes?.some((s) => s.stock <= 5)
    ) || [];

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await adminSalesAPI.getSalesReport("day");
      setData({
        timeline: res.timeline || [],
        topProducts: res.topProducts || [],
        recentOrders: res.recentOrders || [],
        lowStockProducts: res.lowStockProducts || [],
      });
    } catch (err) {
      toast.error("SYSTEM SYNC FAILED");
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const totalRevenue =
    data.timeline?.reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0) ||
    0;

  const getStatusColor = (status) => {
    const s = status?.toLowerCase();
    if (s === "delivered" || s === "completed")
      return "text-success bg-success/10";
    if (s === "cancelled" || s === "exception/failed")
      return "text-error bg-error/10";
    if (s === "cancellation requested")
      return "text-warning bg-warning/10 animate-pulse";
    return "text-primary bg-primary/10";
  };

  if (loading) return <DashboardSkeleton />;

  return (
    /* FIXED VIEWPORT WRAPPER */
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-[1600px] mx-auto px-4 overflow-hidden">
      {/* FIXED HEADER: Remains pinned at the top */}
      <header className="pt-2 pb-6 shrink-0 bg-base-100 z-40">
        <div className="flex justify-between items-end border-b border-white/5 pb-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic text-white flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" /> Command{" "}
              <span className="text-primary">Center</span>
            </h1>
            <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mt-1">
              Real-time system performance & monitoring
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 rounded-full border border-success/20">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[9px] font-black text-success uppercase tracking-widest">
                Node-01 Active
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* SCROLLABLE DASHBOARD BODY */}
      <main className="flex-1 overflow-y-auto custom-scrollbar pb-24 space-y-8">
        {/* STAT CARDS SECTION */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {[
            {
              label: "Total Revenue",
              value: `₱${totalRevenue.toLocaleString()}`,
              color: "text-success",
              icon: PhilippinePesoIcon,
            },
            {
              label: "Live Orders",
              value: data.recentOrders?.length || 0,
              color: "text-primary",
              icon: Package,
            },
            {
              label: "System Load",
              value: "0.4s",
              color: "text-accent",
              icon: Activity,
            },
            {
              label: "Critical Alerts",
              value: criticalStock.length,
              color: "text-error",
              icon: AlertTriangle,
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white/[0.03] border border-white/5 p-6 rounded-[32px] hover:border-primary/30 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest text-white">
                  {stat.label}
                </p>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p
                className={`text-3xl font-black italic tracking-tighter ${stat.color}`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        {/* DATA TERMINALS GRID (Fixed Height Section) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px] shrink-0">
          {/* TERMINAL 1: LIVE ORDERS */}
          <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 p-8 rounded-[40px] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white">
                  Live Order Manifest
                </span>
              </div>
              <button
                onClick={() => navigate("/admin/sales")}
                className="text-[10px] font-black uppercase text-primary hover:underline"
              >
                Full Report <ArrowUpRight size={12} className="inline ml-1" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar border-t border-white/5">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead className="sticky top-0 bg-[#121212] z-10">
                  <tr className="text-[10px] font-black uppercase opacity-20 tracking-widest text-white">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Final Amount</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {data.recentOrders?.map((order) => (
                    <tr
                      key={order._id}
                      className="group hover:bg-white/5 transition-colors text-white"
                    >
                      <td className="px-4 py-4 bg-white/5 rounded-l-2xl font-black italic">
                        #{order._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-4 bg-white/5 font-black italic">
                        ₱{order.totalAmount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 bg-white/5 rounded-r-2xl text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase italic ${getStatusColor(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TERMINAL 2: TRENDING */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 flex flex-col overflow-hidden text-white">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-6 shrink-0">
              Top Performing Units
            </span>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              {data.topProducts?.map((product, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 group"
                >
                  <div className="min-w-0 pr-4">
                    <p className="text-[10px] font-black uppercase italic truncate group-hover:text-primary transition-colors">
                      {product.name}
                    </p>
                    <p className="text-[8px] font-bold opacity-30 uppercase mt-1">
                      {product.unitsSold} units sold
                    </p>
                  </div>
                  <p className="text-xs font-black text-primary italic">
                    ₱{product.revenue?.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

{/* CRITICAL STOCK TRACKER */}
<section className="bg-white/[0.02] border border-error/10 rounded-[40px] p-8 shrink-0">
  <div className="flex items-center gap-2 mb-6">
    <AlertTriangle className="text-error animate-pulse" size={18} />
    <span className="text-[10px] font-black uppercase tracking-widest text-error italic">
      Size-Level Depletion (Threshold: ≤ 5)
    </span>
  </div>

  <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4">
    {criticalStock.length > 0 ? (
      criticalStock.map((product, i) => {
        const depletedSizes = product.sizes?.filter(s => s.stock <= 5) || [];

        return (
          <div key={i} className={`min-w-[320px] p-6 rounded-[32px] border transition-all ${product.stock === 0 ? 'bg-error/10 border-error/50 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : 'bg-white/5 border-white/5'} text-white flex flex-col`}>
            <div className="mb-4 shrink-0">
              <p className="text-[11px] font-black uppercase italic truncate text-primary">{product.name}</p>
              <p className="text-[7px] font-bold opacity-30 uppercase tracking-[0.2em] mt-1">Ref: {product._id.slice(-6).toUpperCase()}</p>
            </div>
            
            {/* FIXED VIEWPORT FOR SIZES */}
            <div className="h-[160px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {depletedSizes.length > 0 ? (
                depletedSizes.map((s, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl border ${s.stock === 0 ? 'bg-error/20 border-error/40' : 'bg-black/20 border-white/5'}`}>
                    <div>
                      <span className="text-xs font-black uppercase italic">{s.size}</span>
                      <p className="text-[7px] font-bold opacity-40 uppercase">Size Variant</p>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-xl font-black italic leading-none ${s.stock === 0 ? 'text-error animate-pulse' : 'text-warning'}`}>
                        {s.stock === 0 ? 'EMPTY' : s.stock}
                      </p>
                      <p className="text-[7px] font-bold opacity-30 uppercase">In Stock</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center rounded-2xl bg-white/5 border border-dashed border-white/10 text-center p-4">
                  <p className="text-2xl font-black italic text-error leading-none">{product.stock}</p>
                  <p className="text-[8px] font-bold uppercase opacity-50 mt-1">Total Stock Only</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center shrink-0">
               <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase opacity-20">Category</span>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{product.category || 'Uncategorized'}</span>
               </div>
               <button 
                 onClick={() => navigate(`/admin/products`)}
                 className="p-3 bg-white/5 hover:bg-primary hover:text-black rounded-xl border border-white/10 transition-all group"
               >
                 <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
               </button>
            </div>
          </div>
        );
      })
    ) : (
      <div className="w-full py-12 text-center border border-dashed border-white/5 rounded-[40px] opacity-20 text-[10px] font-black uppercase tracking-[0.4em] text-white">
        Inventory Levels: Secure
      </div>
    )}
  </div>
</section>

        {/* SYSTEM LOGS SECTION */}
        <section className="bg-black/20 border border-white/5 rounded-[40px] p-8 font-mono shrink-0">
          <div className="flex items-center gap-2 mb-6 text-white/40">
            <Terminal size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
              Command Log Output
            </span>
          </div>
          <div className="space-y-2 max-h-24 overflow-y-auto custom-scrollbar">
            <div className="flex gap-4 text-[10px]">
              <span className="text-primary opacity-50">
                [{new Date().toLocaleTimeString()}]
              </span>
              <span className="text-accent font-bold">[WATCH]</span>
              <span className="text-white opacity-40 italic">
                Monitoring {criticalStock.length} critical units (Range 0-5).
              </span>
            </div>
            <div className="flex gap-4 text-[10px]">
              <span className="text-primary opacity-50">
                [{new Date(Date.now() - 2000).toLocaleTimeString()}]
              </span>
              <span className="text-success font-bold">[SYNC]</span>
              <span className="text-white opacity-40 italic">
                Database handshake successful.
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* FIXED ACTION BUTTONS */}
      <div className="fixed bottom-10 right-10 z-50 group">
        <div className="flex flex-col-reverse items-center gap-3">
          <button className="w-14 h-14 bg-primary rounded-full shadow-2xl flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all">
            <Plus size={28} className="group-hover:rotate-45 transition-all" />
          </button>
          <button
            onClick={fetchOverview}
            className="w-12 h-12 bg-[#1e1e2d] border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 translate-y-10 group-hover:opacity-100 group-hover:translate-y-0 transition-all delay-100"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardOverview;
