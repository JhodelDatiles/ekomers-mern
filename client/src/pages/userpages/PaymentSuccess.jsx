import React, { useEffect } from 'react';
import { useCart } from '../../context/CartContext'; 
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';

const PaymentSuccess = () => {
  const { fetchCart } = useCart(); // Changed from clearCart to fetchCart
  const navigate = useNavigate();

  //handles waiting time for clearing cart item 
  useEffect(() => {
    // 1. Wait 1.5 seconds to allow the PayMongo Webhook to finish clearing the items in the DB
    const timer = setTimeout(() => {
      fetchCart(); // This pulls the REAL updated cart from the database
    }, 1500);

    return () => clearTimeout(timer);
  }, [fetchCart]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center bg-base-100">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-success/20 blur-3xl rounded-full animate-pulse"></div>
        <div className="bg-success/10 p-8 rounded-[40px] border border-success/30 relative">
          <CheckCircle className="w-20 h-20 text-success" strokeWidth={3} />
        </div>
      </div>
      
      <h1 className="text-5xl font-black italic tracking-tighter mb-4 uppercase">
        Payment Received
      </h1>
      <p className="max-w-md text-base-content/60 mb-12 font-bold uppercase text-xs tracking-[0.2em] leading-relaxed">
        Transaction confirmed. Your items have been moved to the <span className="text-primary">processing queue</span> and removed from your bag.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          onClick={() => navigate('/dashboard/my-orders')}
          className="btn btn-primary btn-lg px-10 rounded-2xl font-black uppercase italic shadow-xl shadow-primary/20"
        >
          <Package size={20} /> View My Orders
        </button>
        <button 
          onClick={() => navigate('/')}
          className="btn btn-ghost btn-lg px-10 rounded-2xl font-black uppercase italic"
        >
          Continue Shopping <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;