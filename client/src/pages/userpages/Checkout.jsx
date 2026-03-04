import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Phone, Loader2, Hash, Navigation, Map as MapIcon, 
  ShieldCheck, Edit3, X, CheckCircle2, QrCode, AlertCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { orderAPI, userAPI, paymentAPI } from "../../services/api"; 
import toast from "react-hot-toast";
import CheckoutSkeleton from "../../components/skeletons/CheckoutSkeleton";

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, loading: authLoading } = useAuth();
  const { updateLocalCartAfterPayment, fetchCart } = useCart();

  const checkoutItems = useMemo(() => location.state?.items || [], [location.state?.items]);
  const checkoutTotal = location.state?.total || 0;
  const isDirectPurchase = location.state?.isDirectPurchase || false;
  // For direct/buy-now: extract single item details for QR PH
  const directItem = isDirectPurchase ? checkoutItems[0] : null;
  
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); 
  const [activeAddress, setActiveAddress] = useState(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // QR PH state
  const [qrCode, setQrCode] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [pollingId, setPollingId] = useState(null);
  const [qrStatus, setQrStatus] = useState('waiting'); // waiting | saving | done | error
  
  // Use ref for activeAddress so polling closure always has latest value
  const activeAddressRef = useRef(activeAddress);
  useEffect(() => { activeAddressRef.current = activeAddress; }, [activeAddress]);

  const autoSyncNode = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const freshUser = await userAPI.getProfile();
      if (setUser) setUser(freshUser);
    } catch (err) {
      console.error("Auto-sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [setUser, isSyncing]);

  // ─────────────────────────────────────────────────────────────────
  // QR PH POLLING — Best practice flow:
  // 1. Poll until PayMongo confirms succeeded
  // 2. Call backend to verify + save order (server verifies with PayMongo)
  // 3. Only navigate AFTER order is confirmed saved
  // ─────────────────────────────────────────────────────────────────
  const startPollingIntent = useCallback((paymentIntentId) => {
    const interval = setInterval(async () => {
      try {
        const { status } = await paymentAPI.checkQrPhStatus(paymentIntentId);
        
        if (status === 'succeeded') {
          clearInterval(interval);
          setPollingId(null);
          setQrStatus('saving');

          const addr = activeAddressRef.current;

          try {
            // Backend verifies with PayMongo + confirms the pending order
            // No frontend data sent — backend uses server-saved pending order
            await orderAPI.confirmQrPhOrder({ paymentIntentId });

            setQrStatus('done');

            // Clear cart UI + sync with DB (skip for direct/buy-now)
            if (!isDirectPurchase) {
              updateLocalCartAfterPayment(checkoutItems.map(i => i._id));
            }
            fetchCart(false);

            toast.success("Payment confirmed! Order placed.");

            // Small delay so user sees the success state
            setTimeout(() => navigate('/payment-success'), 800);

          } catch (saveErr) {
            console.error("❌ Order save failed:", saveErr.message);
            setQrStatus('error');
            // Don't navigate — show error in modal so user knows to contact support
            // Payment DID succeed, order just failed to save
            toast.error("Payment received but order failed to save. Please contact support.");
          }
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 3000);
    setPollingId(interval);
  }, [checkoutItems, checkoutTotal, navigate, updateLocalCartAfterPayment, fetchCart]);

  const handleQrPhPayment = async () => {
    if (!activeAddress) return toast.error("No shipping address selected.");
    setLoading(true);
    const toastId = toast.loading("Generating QR Code...");
    try {
      const result = await paymentAPI.createQrPhPayment({
        shippingInfo: {
          fullName: activeAddress?.fullName,
          address: activeAddress?.address || activeAddress?.street,
          city: activeAddress?.city,
          postalCode: activeAddress?.postalCode,
          contactNumber: activeAddress?.contactNumber,
        },
        isDirectPurchase: isDirectPurchase || undefined,
        directProductId: directItem ? (directItem.productId?._id || directItem.productId) : undefined,
        directQuantity: directItem?.quantity,
        directSize: directItem?.size,
      });

      if (!result.qrImage) {
        toast.error(`No QR returned. Status: ${result.status}`, { duration: 5000 });
        return;
      }

      setQrCode(result.qrImage);
      setQrStatus('waiting');
      setShowQrModal(true);
      startPollingIntent(result.paymentIntentId);
    } catch (err) {
      console.error("QR PH Error:", err.response?.data);
      toast.error(err.response?.data?.message || "Failed to generate QR code");
    } finally {
      setLoading(false);
      toast.dismiss(toastId);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollingId) clearInterval(pollingId); };
  }, [pollingId]);

  useEffect(() => {
    const handleSync = () => autoSyncNode();
    window.addEventListener('focus', handleSync);
    window.addEventListener('auth-synchronized', handleSync);
    window.addEventListener('profileUpdated', handleSync);
    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('auth-synchronized', handleSync);
      window.removeEventListener('profileUpdated', handleSync);
    };
  }, [autoSyncNode]);

  useEffect(() => {
    if (user?.address?.length > 0) {
      const stillExists = user.address.find(a => a._id === activeAddress?._id);
      if (!activeAddress || !stillExists) {
        const defaultAddr = user.address.find(addr => addr.isDefault) || user.address[0];
        setActiveAddress(defaultAddr);
      }
    }
  }, [user, activeAddress]); 

  useEffect(() => {
    if (!authLoading && checkoutItems.length === 0) navigate('/cart');
  }, [checkoutItems, navigate, authLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeAddress) return toast.error("No shipping address selected.");
    setLoading(true);
    const toastId = toast.loading("Authorizing Dispatch...");
    try {
      const result = await orderAPI.createCheckoutSession({
        shippingInfo: {
          fullName: activeAddress.fullName || user.fullName,
          contactNumber: activeAddress.contactNumber || user.phone,
          address: activeAddress.address || activeAddress.street,
          city: activeAddress.city,
          postalCode: activeAddress.postalCode,
          deliveryInstructions: "Priority Dispatch"
        },
        items: checkoutItems 
      });
      toast.dismiss(toastId);
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } catch (err) {
      toast.error("Dispatch Failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <CheckoutSkeleton />;

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-700">
      
      {/* LEFT COLUMN */}
      <div className="lg:col-span-8 space-y-6">
        
        <div className="relative h-40 w-full bg-[#121212] rounded-[32px] border border-white/5 overflow-hidden flex items-center px-10">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <MapIcon size={120} className="text-primary" />
          </div>
          <div className="relative z-10 flex flex-col gap-2 w-full">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full transition-all duration-500 ${isSyncing ? 'bg-blue-500 scale-125' : 'bg-primary animate-pulse'}`} />
                  <span className="text-xs font-black uppercase italic text-primary tracking-[0.2em]">
                    {isSyncing ? 'Synchronizing Node...' : 'Waypoint Locked'}
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                  {activeAddress?.label || 'Primary Node'}
                </h3>
              </div>
              <button onClick={() => setIsAddressModalOpen(true)} className="bg-white/5 hover:bg-primary hover:text-black p-4 rounded-2xl transition-all group">
                <Edit3 size={20} className="group-active:scale-90" />
              </button>
            </div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Navigation size={10} /> Sector: {activeAddress?.city || 'Unspecified Sector'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#121212] border border-white/5 rounded-[24px] p-6">
            <label className="text-[10px] font-black uppercase opacity-30 text-white flex items-center gap-2 mb-3">
              <Hash size={12}/> Recipient
            </label>
            <p className="text-2xl font-black uppercase italic text-white leading-tight">
              {activeAddress?.fullName || user?.fullName || "Awaiting Data"}
            </p>
          </div>
          <div className="bg-[#121212] border border-white/5 rounded-[24px] p-6">
            <label className="text-[10px] font-black uppercase opacity-30 text-white flex items-center gap-2 mb-3">
              <Phone size={12}/> Contact
            </label>
            <p className="text-2xl font-black uppercase italic text-primary leading-tight">
              {activeAddress?.contactNumber || user?.phone || "Disconnected"}
            </p>
          </div>
        </div>

        <div className="bg-[#121212] border border-white/5 rounded-[24px] p-8">
          <label className="text-[10px] font-black uppercase opacity-30 text-white flex items-center gap-2 mb-4">
            <Navigation size={12}/> Endpoint Location
          </label>
          <p className="text-3xl font-black uppercase italic text-white leading-none mb-6">
            {activeAddress?.address || activeAddress?.street || "Initializing Node..."}
          </p>
          <div className="flex flex-wrap gap-3">
            {['Barangay', 'City', 'Postal Code'].map((tag, i) => (
              <span key={tag} className="bg-white/5 px-4 py-2 rounded-xl text-[10px] font-black text-white/40 border border-white/5">
                {tag}: <span className="text-white">
                  {[activeAddress?.barangay, activeAddress?.city, activeAddress?.postalCode][i] || 'N/A'}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-4">
        <div className="sticky top-24 bg-primary text-black rounded-[40px] p-10 shadow-2xl">
          <h3 className="font-black uppercase italic text-2xl mb-3 border-b-2 border-black/10 pb-4">Order Details</h3>
          
          <div className="space-y-6 mb-10 max-h-[120px] overflow-y-auto pr-2 custom-manifest-scrollbar">
            {checkoutItems.map((item) => (
              <div key={item._id} className="flex justify-between items-start font-bold uppercase text-[11px]">
                <div className="flex flex-col w-2/3">
                  <span className="leading-tight tracking-tighter">
                    {item.quantity}x {item.productId?.name || item.name}
                  </span>
                  {item.size && <span className="text-[9px] opacity-70 mt-1 font-black italic">SIZE: {item.size}</span>}
                </div>
                <span className="font-black text-sm italic">₱{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-black/10 pt-8 mb-8">
            <span className="text-[10px] font-black uppercase opacity-40 mb-1 block">Total Amount</span>
            <span className="text-5xl font-black italic tracking-tighter leading-none">
              ₱{checkoutTotal.toLocaleString()}
            </span>
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={loading || !activeAddress} 
            className="bg-black hover:bg-black/90 text-white w-full h-24 rounded-[28px] font-black uppercase italic text-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-20 mb-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Checkout <ShieldCheck size={20} /></>}
          </button>

          <button
            onClick={handleQrPhPayment}
            disabled={loading || !activeAddress}
            className="bg-black/10 hover:bg-black/20 text-black w-full h-14 rounded-[24px] font-black uppercase italic text-sm transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-black/20 disabled:opacity-20"
          >
            <QrCode size={18} /> Pay via QR PH
          </button>

          <p className="text-center text-[9px] font-bold uppercase opacity-40 mt-3 tracking-widest">
            GCash • Maya • ShopeePay
          </p>
        </div>
      </div>

      {/* QR MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-xl bg-black/90 p-4">
          <div className="bg-[#121212] border border-primary/20 p-8 rounded-[40px] max-w-sm w-full text-center">
            <h2 className="text-2xl font-black uppercase italic text-white mb-2">Scan to Pay</h2>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-6">GCash • Maya • ShopeePay</p>
            
            <div className="bg-white p-4 rounded-3xl mb-6 inline-block">
              {qrCode ? (
                <img src={qrCode} alt="Payment QR" className="w-64 h-64 mx-auto" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <Loader2 size={40} className="animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className="space-y-4">
              {qrStatus === 'waiting' && (
                <div className="flex items-center justify-center gap-2 text-primary animate-pulse">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[10px] font-black uppercase italic">Awaiting Payment...</span>
                </div>
              )}
              {qrStatus === 'saving' && (
                <div className="flex items-center justify-center gap-2 text-warning animate-pulse">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[10px] font-black uppercase italic">Confirming Order...</span>
                </div>
              )}
              {qrStatus === 'done' && (
                <div className="flex items-center justify-center gap-2 text-success">
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-black uppercase italic">Order Confirmed!</span>
                </div>
              )}
              {qrStatus === 'error' && (
                <div className="flex flex-col items-center gap-2 text-error">
                  <AlertCircle size={20} />
                  <span className="text-[10px] font-black uppercase italic">Payment received but order failed.</span>
                  <span className="text-[9px] opacity-60">Please contact support with your payment ID.</span>
                </div>
              )}

              {qrStatus === 'waiting' && (
                <button 
                  onClick={() => {
                    if (pollingId) clearInterval(pollingId);
                    setPollingId(null);
                    setShowQrModal(false);
                    setQrCode(null);
                    setQrStatus('waiting');
                  }}
                  className="text-[10px] font-black uppercase text-white/20 hover:text-error transition-all"
                >
                  Cancel Transaction
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADDRESS MODAL */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/80 animate-in fade-in">
          <div className="bg-[#121212] border border-white/10 w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-8 border-b border-white/5">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Saved Nodes</h2>
              <button onClick={() => setIsAddressModalOpen(false)} className="text-white/40 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto">
              {user?.address?.map((addr, idx) => (
                <div 
                  key={idx}
                  onClick={() => { setActiveAddress(addr); setIsAddressModalOpen(false); }}
                  className={`relative p-6 rounded-3xl border-2 transition-all cursor-pointer ${activeAddress?._id === addr._id ? "border-primary bg-primary/10" : "border-white/5 bg-white/5"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${activeAddress?._id === addr._id ? "bg-primary text-black" : "bg-white/10 text-white/60"}`}>{addr.label}</span>
                    {activeAddress?._id === addr._id && <CheckCircle2 size={18} className="text-primary" />}
                  </div>
                  <p className="text-lg font-bold text-white uppercase italic leading-tight">{addr.fullName}</p>
                  <p className="text-[10px] text-white/40 uppercase mt-1">{addr.address || addr.street}, {addr.city}</p>
                </div>
              ))}
            </div>
            <div className="p-8 bg-black/40 border-t border-white/5">
              <button onClick={() => navigate('/profile')} className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase text-white/40 hover:border-primary hover:text-primary transition-all">
                + Manage Nodes in Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;