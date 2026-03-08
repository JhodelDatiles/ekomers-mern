import { useState } from "react";
import { Mail, Lock, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: Code & New Password
  const [loading, setLoading] = useState(false);
  // Form state
  const [formData, setFormData] = useState({ 
    email: "", 
    code: "", 
    newPassword: "" 
  });

  // Sends forgot password request to the API with the email, then moves to step 2 if successful
  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(formData.email);
      toast.success("Check your email inbox!");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  // Sends reset password request to the API with the code and new password, then redirects to login
  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.resetPassword(formData);
      toast.success("Password updated! Logging in...");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid Code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-base-100 rounded-[40px] p-10 shadow-2xl border border-primary/5">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">Security</h2>
          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mt-1">
            {step === 1 ? "Reset your credentials" : "Enter security code"}
          </p>
        </div>
        {/* FORM */}
        {step === 1 ? (
          // STEP 1
          <form onSubmit={handleRequest} className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="form-control">
              <label className="label-text flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-60 mb-2">
                <Mail className="w-4 h-4 text-primary" /> Registered Email
              </label>
              <input
                type="email"
                required
                className="input input-bordered bg-base-200 rounded-2xl font-bold w-full"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <button className="btn btn-primary w-full rounded-2xl font-black uppercase italic" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Send Code"}
            </button>
          </form>
        ) : (
          // STEP 2 
          <form onSubmit={handleReset} className="space-y-4 animate-in fade-in slide-in-from-left-4">
            <div className="form-control">
              <label className="label-text flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-60 mb-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> 6-Digit Code
              </label>
              <input
                type="text"
                maxLength="6"
                required
                className="input input-bordered bg-base-200 rounded-2xl font-black text-center text-xl tracking-[0.5em] w-full"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
              />
            </div>
            <div className="form-control">
              <label className="label-text flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-60 mb-2">
                <Lock className="w-4 h-4 text-primary" /> New Password
              </label>
              <input
                type="password"
                required
                className="input input-bordered bg-base-200 rounded-2xl font-bold w-full"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
              />
            </div>
            <button className="btn btn-primary w-full rounded-2xl font-black uppercase italic" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;