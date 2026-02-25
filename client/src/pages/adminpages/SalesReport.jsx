import React, { useEffect, useState, useMemo } from "react";
import { adminSalesAPI } from "../../services/api";
import SalesReportSkeleton from "../../components/skeletons/adminskeletons/SalesReportSkeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  PhilippinePesoIcon,
  Package,
  TrendingUp,
  Calendar,
  Download,
  Trophy,
} from "lucide-react";
import toast from "react-hot-toast";

const SalesReport = () => {
  const [reportData, setReportData] = useState({
    timeline: [],
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("day");

  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        const data = await adminSalesAPI.getSalesReport(view);
        setReportData(data);
      } catch (err) {
        toast.error("MANIFEST SYNC FAILED");
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, [view]);

  // CSV Export Logic
  const handleExport = () => {
    const headers = ["Period", "Revenue", "Orders"];
    const rows = reportData.timeline.map((item) => [
      item._id,
      item.totalRevenue,
      item.orderCount,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Sales_${view}_${new Date().toLocaleDateString()}.csv`;
    link.click();
    toast.success("CSV DOWNLOADED");
  };

  const stats = useMemo(() => {
    const revenue =
      reportData.timeline?.reduce(
        (acc, curr) => acc + (curr.totalRevenue || 0),
        0,
      ) || 0;
    const orders =
      reportData.timeline?.reduce(
        (acc, curr) => acc + (curr.orderCount || 0),
        0,
      ) || 0;
    return {
      revenue,
      orders,
      avg: orders > 0 ? (revenue / orders).toFixed(0) : 0,
    };
  }, [reportData.timeline]);

  if (loading) return <SalesReportSkeleton />;

  return (
    <div className="space-y-10 p-2">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter">
            Sales <span className="text-primary">Intelligence</span>
          </h1>
          <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.3em] mt-2 italic">
            Data Manifest: {view}ly View
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-base-300 p-1 rounded-2xl border border-base-300">
            {["day", "week", "month"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === v ? "bg-primary text-primary-content" : "opacity-40"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="btn btn-primary btn-outline italic font-black uppercase rounded-2xl gap-2"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </header>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Net Revenue"
          value={`₱${stats.revenue.toLocaleString()}`}
          icon={<PhilippinePesoIcon />}
          color="text-success"
        />
        <StatCard
          label="Total Orders"
          value={stats.orders}
          icon={<Package />}
          color="text-primary"
        />
        <StatCard
          label="Avg Order"
          value={`₱${Number(stats.avg).toLocaleString()}`}
          icon={<TrendingUp />}
          color="text-secondary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART */}
        <div className="lg:col-span-2 bg-base-100 border border-base-300 p-8 rounded-[40px] h-[480px]">
          <h2 className="text-[10px] font-black uppercase tracking-widest mb-8 opacity-50 flex items-center gap-2">
            <Calendar size={14} /> Revenue Flow
          </h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportData.timeline}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="_id"
                tick={{ fontSize: 9, fontWeight: "900" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fontWeight: "900" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                contentStyle={{
                  backgroundColor: "#111",
                  borderRadius: "15px",
                  border: "none",
                }}
              />
              <Bar
                dataKey="totalRevenue"
                fill="#10b981"
                radius={[8, 8, 8, 8]}
                barSize={view === "day" ? 30 : 60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TOP PRODUCTS TABLE */}
        {/* TOP PRODUCTS SECTION */}
        <div className="bg-base-100 border border-base-300 p-8 rounded-[40px] flex flex-col h-[480px]">
          <h2 className="text-[10px] font-black uppercase tracking-widest mb-8 opacity-50 flex items-center gap-2 flex-shrink-0">
            <Trophy size={14} /> Top Performers (Top 10)
          </h2>

          {/* SCROLLABLE CONTAINER */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
            {reportData.topProducts.length > 0 ? (
              reportData.topProducts.map((product, i) => (
                <div
                  key={i}
                  className="flex justify-between items-start gap-4 border-b border-base-300 pb-4 last:border-0 hover:bg-base-200/30 transition-colors rounded-xl p-2"
                >
                  {/* TEXT WRAPPING AREA */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black italic uppercase leading-tight break-words whitespace-normal">
                      {product.name}
                    </p>
                    <p className="text-[10px] opacity-40 uppercase font-bold mt-1">
                      {product.unitsSold} Units Sold
                    </p>
                  </div>

                  {/* REVENUE TAG */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-primary italic">
                      ₱{product.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center opacity-20 italic font-black text-xs uppercase">
                No sales data recorded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-base-100 border border-base-300 p-6 rounded-[32px]">
    <div className={`p-3 bg-base-200 w-fit rounded-2xl mb-4 ${color}`}>
      {icon}
    </div>
    <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">
      {label}
    </p>
    <h3 className="text-3xl font-black italic mt-1">{value}</h3>
  </div>
);

export default SalesReport;