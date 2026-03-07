import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowLeft, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { authAPI } from "../services/api.js";

import Footer from "../components/Footer.jsx";

import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showResend, setShowResend] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  //Store inputs on input fields as an js object and only update data that is changed.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Hanldes the submitted data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowResend(false);
    try {
      // Goes to server check the user credentials
      const response = await authAPI.login(formData);
      // If user exist return the following:
      if (response.user) {
        login(response.user);
        localStorage.setItem("user", JSON.stringify(response.user));
        navigate("/");
        toast.success(`Welcome back, ${response.user.username}!`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed. Please try again.");
      // Use the needsVerification flag from backend — more reliable than string matching
      if (error.response?.data?.needsVerification) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // As the name suggest this function handles the resend verification button
  const handleResend = async () => {
    try {
      await authAPI.resendVerification(formData.email);
      toast.success("New verification link sent to your Gmail!");
      setShowResend(false);
    } catch (error) {
      toast.error("Failed to resend. Please try again later.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="grow min-h-[calc(100vh-80px)] flex items-center justify-center md:justify-end md:pr-20 bg-base-200 px-4">
        <div className="card w-full max-w-md bg-base-100 shadow-xl rounded-3xl overflow-hidden">
          <div className="card-body w-full py-8">
            <div className="flex flex-col items-center gap-1 mb-6">
              <h2 className="card-title text-3xl font-black uppercase italic tracking-tighter text-base-content">
                Login
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-base-content">
                Welcome Back
              </p>
            </div>

            {/* ALERT BOX FOR UNVERIFIED USERS */}
            {showResend && (
              <div className="bg-error/10 border border-error/20 p-4 rounded-2xl mb-4 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-black uppercase text-error text-center">
                  Account not verified
                </p>
                <button
                  onClick={handleResend}
                  className="text-[9px] font-black uppercase tracking-widest bg-error text-white px-4 py-2 rounded-xl hover:opacity-80 transition-all"
                >
                  Resend Verification Link
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* EMAIL */}
              <div className="form-control w-full">
                <label className="label" htmlFor="email">
                  <span className="label-text flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-60 text-base-content">
                    <Mail className="w-4 h-4 text-primary" /> Email
                  </span>
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Email"
                  className="input input-bordered w-full bg-base-200 border-base-content/10 font-bold text-base-content focus:border-primary transition-all rounded-2xl"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* PASSWORD*/}
              <div className="form-control w-full">
                <label className="label" htmlFor="password">
                  <span className="label-text flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-60 text-base-content">
                    <Lock className="w-4 h-4 text-primary" /> Password
                  </span>
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  className="input input-bordered w-full bg-base-200 border-base-content/10 font-bold text-base-content focus:border-primary transition-all rounded-2xl"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <Link
                to="/forgot-password"
                className="text-[10px] uppercase font-black opacity-40 hover:opacity-100 transition-all"
              >
                Forgot Password?
              </Link>

              <button
                type="submit"
                className="btn btn-primary w-full mt-4 font-black uppercase italic tracking-widest rounded-2xl shadow-lg shadow-primary/20"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Login
                  </>
                )}
              </button>
            </form>

            <div className="divider text-[10px] font-black text-base-content/30 uppercase tracking-[0.3em]">
              New Here?
            </div>
            <Link
              to="/register"
              className="btn btn-outline btn-block rounded-2xl font-black uppercase tracking-widest text-[10px] border-base-content/20 hover:bg-base-content hover:text-base-100"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
export default Login;
