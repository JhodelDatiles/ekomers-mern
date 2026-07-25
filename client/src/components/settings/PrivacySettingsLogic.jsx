import React, { useState, useEffect } from "react";
import {
  Trash2,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { userAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

// --- INTERNAL SKELETON COMPONENT ---
const PrivacySkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
    <div className="bg-base-200/50 border border-base-300 rounded-[32px] p-8 h-[400px]" />
    <div className="bg-error/5 border border-error/10 rounded-[32px] p-8 h-[400px]" />
  </div>
);

const PrivacySettingsLogic = () => {
  const { logout } = useAuth();
  const [fetching, setFetching] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "" });
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [sendingDeleteCode, setSendingDeleteCode] = useState(false);

  const LIMITS = { password: 32, otp: 6 };
  const isOverLimit =
    passwordData.current.length > LIMITS.password ||
    passwordData.new.length > LIMITS.password;

  useEffect(() => {
    const timer = setTimeout(() => setFetching(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const LoadingOverlay = ({ message }) => (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex flex-col items-center bg-base-100 p-8 rounded-[32px] border border-white/10 shadow-2xl">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] italic opacity-70">
          {message}
        </p>
      </div>
    </div>
  );

  const handleRequestUpdate = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await userAPI.requestSecurityCode({ type: "password" });
      toast.success("Security code sent to your Gmail!");
      setPendingAction("password");
      setShowOtpModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDeleteCode = async () => {
    setSendingDeleteCode(true);
    try {
      await userAPI.requestSecurityCode({ type: "delete" });
      toast.success("Deletion code sent!");
      document.getElementById("delete_modal").close();
      setPendingAction("delete");
      setShowOtpModal(true);
    } catch (err) {
      toast.error("Failed to send code");
    } finally {
      setSendingDeleteCode(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      if (pendingAction === "password") {
        await userAPI.verifyPasswordChange({ ...passwordData, code: otp });
        toast.success("Password updated!");
        setPasswordData({ current: "", new: "" });
      } else {
        await userAPI.verifyAccountDeletion({ code: otp });
        logout();
      }
      setShowOtpModal(false);
    } catch (err) {
      toast.error("Invalid code");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <PrivacySkeleton />;

  return (
    <div className="relative animate-in fade-in duration-500">
      {/* GLOBAL OVERLAYS */}
      {loading && !showOtpModal && (
        <LoadingOverlay message="Processing Request..." />
      )}
      {sendingDeleteCode && (
        <LoadingOverlay message="Generating Security Code..." />
      )}
      {loading && showOtpModal && (
        <LoadingOverlay message="Verifying Identity..." />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PASSWORD FORM */}
        <div className="bg-base-200/50 border border-base-300 rounded-[32px] p-8">
          <div className="flex items-center gap-4 mb-8">
            <KeyRound className="text-primary" />
            <h3 className="font-black uppercase italic tracking-tight text-base-content">
              Security Credentials
            </h3>
          </div>
          <form onSubmit={handleRequestUpdate} className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] font-black uppercase opacity-40 mb-2">
                <span>Current Password</span>
                <span
                  className={
                    passwordData.current.length > LIMITS.password
                      ? "text-error"
                      : ""
                  }
                >
                  {passwordData.current.length}/{LIMITS.password}
                </span>
              </div>
              <input
                type="password"
                required
                disabled={loading}
                className="input input-bordered w-full rounded-xl bg-base-100"
                value={passwordData.current}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, current: e.target.value })
                }
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-black uppercase opacity-40 mb-2">
                <span>New Password</span>
                <span
                  className={
                    passwordData.new.length > LIMITS.password
                      ? "text-error"
                      : ""
                  }
                >
                  {passwordData.new.length}/{LIMITS.password}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading}
                  className="input input-bordered w-full rounded-xl bg-base-100"
                  value={passwordData.new}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              disabled={isOverLimit || loading}
              className={`btn btn-primary w-full rounded-xl uppercase italic mt-4 ${isOverLimit ? "btn-error" : ""}`}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : isOverLimit ? (
                "Limit Exceeded"
              ) : (
                "Request Update"
              )}
            </button>
          </form>
        </div>

        {/* DANGER ZONE */}
        <div className="bg-error/5 border border-error/10 rounded-[32px] p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <AlertTriangle className="text-error" />
              <h3 className="font-black uppercase italic text-error">
                Danger Zone
              </h3>
            </div>
            <p className="text-[11px] font-bold uppercase opacity-60 leading-relaxed">
              Permanently terminate your account. This action cannot be undone.
              All associated data will be purged.
            </p>
          </div>
          <button
            disabled={sendingDeleteCode}
            onClick={() => document.getElementById("delete_modal").showModal()}
            className="btn btn-outline btn-error rounded-xl italic uppercase border-2 mt-8"
          >
            Terminate Session
          </button>
        </div>
      </div>

      {/* OTP MODAL */}
      {showOtpModal && (
        <div
          className="modal modal-open backdrop-blur-md"
          onClick={(e) =>
            e.target === e.currentTarget && !loading && setShowOtpModal(false)
          }
        >
          <div className="modal-box bg-base-100 border border-primary/20 rounded-[40px] p-10 text-center relative shadow-2xl">
            <button
              onClick={() => setShowOtpModal(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-6 top-6"
            >
              <X size={20} />
            </button>
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-black uppercase italic mb-2">
              Verify Identity
            </h3>
            <p className="text-[10px] font-bold uppercase opacity-50 mb-6">
              Enter the 6-digit code sent to your email
            </p>
            <input
              type="text"
              maxLength="6"
              placeholder="000000"
              disabled={loading}
              className="input input-bordered w-full text-center text-3xl font-black tracking-[0.3em] h-20 rounded-2xl mb-6 bg-base-200 border-none"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />
            <button
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6 || loading}
              className="btn btn-primary w-full rounded-2xl h-14 font-black uppercase italic"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Confirm Identity"
              )}
            </button>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      <dialog id="delete_modal" className="modal">
        <div className="modal-box rounded-[32px] border border-error/20 p-8">
          <h3 className="text-xl font-black text-error uppercase italic flex items-center gap-2">
            <AlertCircle size={24} /> Final Warning
          </h3>
          <p className="py-4 text-sm font-bold opacity-60 leading-relaxed">
            Verification required. A code will be sent to your Gmail.
          </p>
          <div className="modal-action flex gap-3">
            <form method="dialog" className="flex-1">
              <button className="btn btn-ghost w-full rounded-xl font-black uppercase">
                Cancel
              </button>
            </form>
            <button
              onClick={handleRequestDeleteCode}
              disabled={sendingDeleteCode}
              className="btn btn-error flex-[2] rounded-xl font-black uppercase italic"
            >
              {sendingDeleteCode ? (
                <span className="loading loading-spinner"></span>
              ) : (
                "Send Deletion Code"
              )}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default PrivacySettingsLogic;
