import React from "react";
import { DollarSign, Package, Users, AlertTriangle, TrendingUp, Activity } from "lucide-react";

const AdminDashboardOverview = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary" /> Command Center
        </h1>
        <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em]">Real-time system performance and stats</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sales', value: '$12,450', desc: '14% vs last week', color: 'text-primary', icon: DollarSign },
          { label: 'Active Orders', value: '28', desc: '8 pending shipment', color: 'text-secondary', icon: Package },
          { label: 'Total Users', value: '1,204', desc: '5 new today', color: 'text-accent', icon: Users },
          { label: 'Stock Alerts', value: '5', desc: 'Items below threshold', color: 'text-error', icon: AlertTriangle },
        ].map((stat, i) => (
          <div key={i} className="bg-[#1e1e2d] border border-white/5 p-6 rounded-[32px] shadow-xl group hover:border-primary/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
               <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">{stat.label}</p>
               <stat.icon className={`w-5 h-5 ${stat.color} opacity-80`} />
            </div>
            <p className={`text-3xl font-black italic tracking-tighter ${stat.color}`}>{stat.value}</p>
            <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-success opacity-70" />
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-tight">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1e1e2d] border border-white/5 h-80 rounded-[40px] flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute top-6 left-8 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Live Sales Stream</span>
          </div>
          <p className="italic opacity-20 font-black uppercase text-xs tracking-[0.3em]">Sales Analytics Graph Placeholder</p>
        </div>

        <div className="bg-[#1e1e2d] border border-white/5 h-80 rounded-[40px] p-8">
           <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-6">Recent Activity</span>
           <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center gap-4 opacity-30">
                  <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
                  <div className="space-y-1 w-full">
                    <div className="h-2 bg-white/10 rounded w-3/4" />
                    <div className="h-2 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardOverview;