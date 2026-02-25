import React, { useState, useEffect } from "react";
import { User as UserIcon, Save, Camera, Loader2, Mail, Calendar, ShieldCheck, AtSign } from "lucide-react";
import toast from "react-hot-toast";
import api, { userAPI } from "../../services/api"; 
import { useAuth } from "../../context/AuthContext"; 
import FormInput from "../../components/ui/FormInput"; 

const AdminSettings = () => {
  const { setUser } = useAuth(); 
  const [loading, setLoading] = useState(false); // For Save Button
  const [fetching, setFetching] = useState(true); // NEW: For Initial Page Load
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    username: "", 
    fullName: "", 
    email: "", 
    phone: "", 
    profilePic: { url: "", publicId: "" }, 
    createdAt: "",
    street: "N/A", barangay: "N/A", city: "N/A", postalCode: "N/A"
  });

  const isInvalid = formData.username.length > 20 || formData.fullName.length > 50;

  const fetchProfile = async () => {
    try {
      setFetching(true); // Start loading
      const data = await userAPI.getProfile();
      if (data) {
        setFormData(prev => ({
          ...prev,
          ...data,
          dob: data.dob ? new Date(data.dob).toISOString().split('T')[0] : "",
          street: data.address?.[0]?.street || "N/A",
          barangay: data.address?.[0]?.barangay || "N/A",
          city: data.address?.[0]?.city || "N/A", 
          postalCode: data.address?.[0]?.postalCode || "N/A",
        }));
      }
    } catch (error) { 
      toast.error("Could not load admin profile"); 
    } finally {
      setFetching(false); // Stop loading after data arrives
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // --- 1. SKELETON LOADING STATE ---
  if (fetching) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="h-40 w-full bg-base-200 animate-pulse rounded-[32px] border border-base-300" />
        {/* Form Skeleton */}
        <div className="card bg-base-100 border border-base-300 rounded-[32px] p-8 space-y-8 animate-pulse">
           <div className="h-4 w-32 bg-base-200 rounded" />
           <div className="space-y-6">
              <div className="h-12 w-full bg-base-200 rounded-xl" />
              <div className="h-12 w-full bg-base-200 rounded-xl" />
              <div className="h-12 w-full bg-base-200 rounded-xl" />
              <div className="h-16 w-full bg-base-200 rounded-2xl" />
           </div>
        </div>
      </div>
    );
  }

  // --- 2. ACTUAL PAGE UI ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const loadingToast = toast.loading("Updating photo...");
    try {
      const uploadData = new FormData();
      uploadData.append("image", file);
      const { data } = await api.post("/upload/single", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFormData(prev => ({ ...prev, profilePic: data.profilePic }));
      if (setUser) setUser(data.user);
      toast.success("Photo updated!", { id: loadingToast });
    } catch (err) {
      toast.error("Upload failed", { id: loadingToast });
    } finally { setUploading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isInvalid) return;
    setLoading(true);
    const toastId = toast.loading("Saving changes...");
    try {
      const updatePayload = {
        username: formData.username,
        fullName: formData.fullName,
        address: [{
          fullName: formData.fullName || "Admin",
          street: formData.street,
          barangay: formData.barangay,
          city: formData.city,
          postalCode: formData.postalCode,
          contactNumber: formData.phone || "N/A",
          isDefault: true
        }]
      };
      const response = await userAPI.updateProfile(updatePayload);
      if (setUser) setUser(response.user);
      toast.success("Admin identity secured!", { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed", { id: toastId });
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-700">
      <header className="flex items-center gap-6 bg-base-200 p-8 rounded-[32px] border border-base-300">
          <div className="avatar relative">
            <div className="w-24 h-24 rounded-3xl ring ring-primary ring-offset-2 overflow-hidden bg-base-300">
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                  <Loader2 className="animate-spin text-primary" />
                </div>
              )}
              {formData.profilePic?.url ? (
                <img src={formData.profilePic.url} alt="Admin" className="w-full h-full object-cover" />
              ) : (
                <div className="h-full flex items-center justify-center opacity-40 font-black">NA</div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 btn btn-circle btn-primary btn-xs border-none shadow-lg cursor-pointer">
              <Camera size={12} />
              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
            </label>
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              {formData.username} <ShieldCheck className="text-primary" />
            </h1>
            <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mt-1 flex items-center gap-2">
               <Calendar size={12} /> Established: {formData.createdAt ? new Date(formData.createdAt).toLocaleDateString() : "---"}
            </p>
          </div>
      </header>

      <form onSubmit={handleSave} className="pb-10">
        <div className="card bg-base-100 border border-base-300 rounded-[32px] p-8 space-y-8">
          <h2 className="flex items-center gap-2 font-black uppercase text-xs tracking-widest text-primary">
            <UserIcon size={16}/> Identity Configuration
          </h2>

          <div className="space-y-6">
            <div className="form-control">
              <label className="label text-[10px] font-black opacity-40 uppercase tracking-widest">Email Address (Fixed)</label>
              <div className="flex items-center gap-3 bg-base-200/50 p-4 rounded-xl border border-dashed border-base-300 opacity-60 text-sm font-bold italic">
                <Mail size={16} /> {formData.email}
              </div>
            </div>

            <FormInput 
              label="Username"
              icon={AtSign}
              maxLength={20}
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />

            <FormInput 
              label="Full Name"
              icon={UserIcon}
              maxLength={50}
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />

            <button 
              type="submit" 
              disabled={loading || isInvalid} 
              className={`btn btn-primary w-full rounded-2xl font-black uppercase italic h-16 border-none shadow-xl shadow-primary/20 transition-all 
                ${isInvalid ? 'btn-disabled opacity-50' : 'hover:scale-[1.02]'}`}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : isInvalid ? (
                "LIMIT EXCEEDED"
              ) : (
                <><Save size={18} className="mr-2"/> Update Profile</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;