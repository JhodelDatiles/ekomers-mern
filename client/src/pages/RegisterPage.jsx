import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, CheckCircle, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { authAPI } from "../services/api.js";
import Footer from "../components/Footer.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();


  // 1. Form State
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // 2. UI & Error States
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  // 3. Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear errors while typing
    if (name === "password") setPasswordError("");
    if (name === "confirmPassword") setConfirmError("");
  };

  // 4. Validate password on blur
  const handlePasswordBlur = () => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setPasswordError("Must be 8+ chars with uppercase & number");
    }
  };

  const handleConfirmBlur = () => {
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setConfirmError("Passwords do not match");
    }
  };

  // 5. Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Final validation on submit
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      toast.error("Password must be 8+ chars with uppercase & number");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.register(formData);
      if (response.user) {
        login(response.user);
      }
      toast.success("Account created successfully!");
      navigate("/");
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
 <div className="flex flex-col min-h-screen">
      <main className="flex-grow relative z-10 overflow-hidden bg-base-200">
        <div className="min-h-[calc(100vh-80px)] flex justify-center md:justify-end md:pr-20 items-center">
          <div className="w-full max-w-md bg-base-100 shadow-xl relative z-20 rounded-3xl overflow-hidden">
            <div className="card-body justify-center py-8">
              <div className="flex flex-col items-center gap-1 mb-6">
                <h2 className="card-title text-3xl font-black uppercase italic tracking-tighter text-base-content">Sign Up</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-base-content">Create your identity</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
{/* USERNAME */}
<div className="form-control">
  <div className="flex justify-between items-end mb-1">
    <label className="label-text flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-60 text-base-content" htmlFor="username">
      <User className="w-4 h-4 text-primary" /> Username
    </label>
    <span className={`text-[10px] font-bold transition-all duration-300 ${
      formData.username.length >= 20 ? 'text-error animate-pulse' : 'opacity-30 text-base-content'
    }`}>
      {formData.username.length} / 20
    </span>
  </div>
  
  <div className="relative">
    <input
      id="username"
      type="text"
      name="username"
      maxLength={20} // Physical limit
      placeholder="Choose a username"
      className={`input input-bordered w-full bg-base-200 font-bold text-base-content transition-all rounded-2xl
        ${formData.username.length >= 20 
          ? 'border-error focus:border-error ring-2 ring-error/10' 
          : 'border-base-content/10 focus:border-primary'
        }`}
      value={formData.username}
      onChange={handleChange}
      required
    />
  </div>

  <div className="h-4 mt-1"> 
    {formData.username.length >= 20 && (
      <p className="text-[10px] font-black text-error animate-in slide-in-from-top-1 duration-300 uppercase italic tracking-tight text-right">
        Once Exceeded 20 characters
      </p>
    )}
  </div>
</div>

                {/* EMAIL */}
                <div className="form-control">
                  <label className="label" htmlFor="email">
                    <span className="label-text flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-60 text-base-content">
                      <Mail className="w-4 h-4 text-primary" /> Email
                    </span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    className="input input-bordered w-full bg-base-200 border-base-content/10 font-bold text-base-content focus:border-primary transition-all rounded-2xl"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* PASSWORD */}
                <div className="form-control">
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
                    className={`input input-bordered w-full bg-base-200 font-bold text-base-content focus:border-primary transition-all rounded-2xl ${passwordError ? 'border-error' : 'border-base-content/10'}`}
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handlePasswordBlur}
                    required
                  />
                  {passwordError && (
                    <p className="text-error text-[10px] font-black uppercase italic mt-1 animate-pulse">{passwordError}</p>
                  )}
                </div>

                {/* CONFIRM PASSWORD */}
                <div className="form-control">
                  <label className="label" htmlFor="confirmPassword">
                    <span className="label-text flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-60 text-base-content">
                      <CheckCircle className="w-4 h-4 text-primary" /> Confirm Password
                    </span>
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    className={`input input-bordered w-full bg-base-200 font-bold text-base-content focus:border-primary transition-all rounded-2xl ${confirmError ? 'border-error' : 'border-base-content/10'}`}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleConfirmBlur}
                    required
                  />
                  {confirmError && (
                    <p className="text-error text-[10px] font-black uppercase italic mt-1 animate-pulse">{confirmError}</p>
                  )}
                </div>

                <button type="submit" className="btn btn-primary w-full mt-4 font-black uppercase italic tracking-widest rounded-2xl shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? <span className="loading loading-spinner"></span> : <><UserPlus className="w-4 h-4" /> Sign Up</>}
                </button>
              </form>

              <div className="divider text-[10px] font-black text-base-content/30 uppercase tracking-[0.3em]">OR</div>
              <Link to="/login" className="btn btn-outline btn-block rounded-2xl font-black uppercase tracking-widest text-[10px] border-base-content/20 hover:bg-base-content hover:text-base-100">Login</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;