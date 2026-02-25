import { useOutletContext, Link } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowRight, Truck, Settings, Package, ExternalLink } from 'lucide-react';
import {DashboardOverviewSkeleton} from '../../components/skeletons/DashboardOverviewSkeleton';

export const DashboardOverview = () => {
  const { user, orders, wishlist, isLoading } = useOutletContext();

  //order status
  const isActive = (status) => {
    const s = String(status || '').toLowerCase();
    const inactiveStatuses = ['delivered', 'cancelled', 'completed', 'returned'];
    return !inactiveStatuses.includes(s);
  };

  const activeShipments = Array.isArray(orders) ? orders.filter(o => isActive(o.status)) : [];
  const wishlistCount = Array.isArray(wishlist) ? wishlist.length : 0;
  
  if (isLoading && orders.length === 0) {
    return <DashboardOverviewSkeleton />;
  }
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-base-content">System Overview</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">User: {user?.username} // Session Live</p>
        </div>
        <Link to="/dashboard/settings" className="btn btn-ghost btn-circle border border-base-300"><Settings size={20}/></Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/" className="bg-primary p-6 rounded-[32px] text-primary-content shadow-xl relative overflow-hidden group transition-all hover:-translate-y-1 active:scale-95">
          <ShoppingBag className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Quick Action</p>
            <div className="mt-4 flex items-center gap-2 font-black italic uppercase text-2xl">Shop Now <ArrowRight size={20} /></div>
          </div>
        </Link>

        <div className="bg-base-200 p-6 rounded-[32px] border border-base-300 relative overflow-hidden group">
          <Truck className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Active Shipments</p>
            <p className="text-4xl font-black italic text-primary">{String(activeShipments.length).padStart(2, '0')}</p>
          </div>
        </div>

        <div className="bg-base-200 p-6 rounded-[32px] border border-base-300 relative overflow-hidden group">
          <Heart className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Wishlist Items</p>
            <p className="text-4xl font-black italic text-secondary">{String(wishlistCount).padStart(2, '0')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end px-2">
          <h2 className="text-sm font-black uppercase italic tracking-widest text-base-content/60">Live Logistics Activity</h2>
          <Link to="/dashboard/my-orders" className="text-[10px] font-black uppercase italic text-primary flex items-center gap-1 hover:underline">View All Orders <ExternalLink size={12}/></Link>
        </div>
        
        <div className="bg-base-100 rounded-[32px] border border-base-300 shadow-sm overflow-hidden">
          <div className="h-[265px] overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
            <table className="table w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-base-200">
                <tr>
                  <th className="text-[10px] font-black uppercase italic opacity-50 py-4 bg-base-200 border-b border-base-300">Order ID</th>
                  <th className="text-[10px] font-black uppercase italic opacity-50 bg-base-200 border-b border-base-300">Current Status</th>
                  <th className="text-[10px] font-black uppercase italic opacity-50 text-right bg-base-200 border-b border-base-300">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {activeShipments.length > 0 ? (
                  activeShipments.map((order) => (
                    <tr key={order._id} className="hover:bg-base-200/50 transition-colors">
                      <td className="font-black italic text-xs uppercase py-5"><span className="opacity-30 mr-1 italic">ID:</span>#{order._id.slice(-6)}</td>
                      <td><span className="badge badge-sm font-black italic uppercase text-[9px] px-3 py-2 badge-primary border-none"> {order.status}</span></td>
                      <td className="font-black text-xs italic text-right text-base-content/80">₱{order.totalAmount?.toLocaleString() || "0.00"}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3" className="text-center py-20 opacity-20"><Package size={40} className="mx-auto mb-2" /><p className="text-[10px] font-black uppercase italic tracking-[0.2em]">No active shipments</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};