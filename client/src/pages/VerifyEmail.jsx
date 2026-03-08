import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MailCheck, MailX, Loader2, ArrowRight } from "lucide-react";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const hasRun = useRef(false);

  // For email verification, runs it once if token changes (safety net)
  useEffect(() => {
    // Prevent double execution
    if (hasRun.current) return; // If hasRun is TRUE, stop here (return early)
    hasRun.current = true;      // Otherwise, set it to true so future runs are blocked
    //  Verifying email token
    const verify = async () => {
      try {
        await authAPI.verifyEmail(token);
        setStatus("success");
        toast.success("Email verified successfully!");
      } catch (err) {
        setStatus("error");
        toast.error(err.response?.data?.message || "Verification failed");
      }
    };
    if (token) verify(); // if token exist, call verify
  }, [token]);

  // UI for wrong and undefined token
  if (!token || token === "undefined") {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center">
        <div className="text-center p-8 bg-base-100 rounded-[30px] shadow-xl border border-error/20">
          <h1 className="text-2xl font-black text-error uppercase italic">
            Invalid Link
          </h1>
          <p className="opacity-50 text-xs mt-2 uppercase tracking-widest">
            The URL is missing a security token.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="btn btn-outline btn-sm mt-6 rounded-xl"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-base-100 rounded-[40px] p-10 shadow-2xl text-center border border-primary/5">
        {/* LOADING STATE */}
        {status === "verifying" && (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            <h2 className="text-2xl font-black uppercase italic italic tracking-tighter">
              Verifying Identity
            </h2>
            <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">
              Securing your account...
            </p>
          </div>
        )}
        {/* SHOW THIS IF EMAIL IS VERIFIED */}
        {status === "success" && (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <MailCheck className="w-10 h-10 text-success" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                Verified!
              </h2>
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mt-2">
                Your account is now active
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="btn btn-primary w-full rounded-2xl font-black uppercase italic tracking-widest gap-2"
            >
              Go to Login <ArrowRight size={16} />
            </button>
          </div>
        )}
        {/* SHOW THIS IF TOKEN IS NOT VALID OR UNDEFINED */}
        {status === "error" && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto">
              <MailX className="w-10 h-10 text-error" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                Link Expired
              </h2>
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mt-2">
                The verification token is invalid
              </p>
            </div>
            <Link
              to="/register"
              className="btn btn-outline btn-block rounded-2xl font-black uppercase tracking-widest text-[10px]"
            >
              Try Registering Again
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
