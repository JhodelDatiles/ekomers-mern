import React, { useState, useEffect } from "react";
import { User as UserIcon, Save, Camera, Loader2, Mail, Calendar, AtSign } from "lucide-react";
import toast from "react-hot-toast";
import api, { userAPI } from "../../services/api"; 
import { useAuth } from "../../context/AuthContext"; 
import FormInput from "../../components/ui/FormInput";
import UserSettingsSkeleton from "../../components/skeletons/UserSettingsSkeleton";

const UserSettings = () => {
  const { setUser } = useAuth(); 
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true); 
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    username: "", fullName: "", email: "", gender: "", dob: "",
    profilePic: { url: "", publicId: "" }, createdAt: "",
  });

  //handles fetch of user info
  const fetchProfile = async () => {
    try {
      setFetching(true);
      const data = await userAPI.getProfile();
      if (data) {
        setFormData({
          username: data.username || "",
          fullName: data.fullName || "",
          email: data.email || "",
          gender: data.gender || "", 
          dob: data.dob ? new Date(data.dob).toISOString().split('T')[0] : "",
          profilePic: data.profilePic || { url: "", publicId: "" },
          createdAt: data.createdAt || "",
        });
      }
    } catch (error) { 
      toast.error("Could not load profile"); 
    } finally {
      setFetching(false);
    }
  };
  useEffect(() => { fetchProfile(); }, []);

  const isInvalid = formData.username.length > 20 || formData.fullName.length > 50;
  
  //handle img upload
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
      if (setUser) setUser(data.user); // ⚡ Syncs Checkout Page
      toast.success("Profile photo updated!", { id: loadingToast });
    } catch (err) {
      toast.error("Upload failed", { id: loadingToast });
    } finally { setUploading(false); }
  };
  //handle save
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await userAPI.updateProfile(formData);
      
      // This is the "State Update" that the Reddit thread says people forget:
      if (setUser && response.user) {
        setUser(response.user); 
      }

      // OPTIONAL: If you want to be 100% sure the Checkout page has everything,
      // you can trigger a custom event that other pages listen to.
      window.dispatchEvent(new Event("profileUpdated"));

      toast.success("Settings updated!");
    } catch (err) {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };
  //loading state
  if (fetching) return <UserSettingsSkeleton />;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-base-200 p-6 md:p-8 rounded-[32px] border border-base-300 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="avatar relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl ring ring-primary ring-offset-2 overflow-hidden bg-base-300 flex items-center justify-center">
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                  <Loader2 className="animate-spin text-primary" />
                </div>
              )}
              {formData.profilePic?.url ? (
                <img src={formData.profilePic.url} className="w-full h-full object-cover" alt="User" />
              ) : (
                <span className="text-[10px] font-black opacity-40 uppercase">No Image</span>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 btn btn-circle btn-primary btn-xs border-none shadow-lg cursor-pointer">
              <Camera className="w-3 h-3" />
              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
            </label>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic flex items-center gap-2 text-primary">
              {formData.username || "Guest User"}
            </h1>
            <p className="text-[9px] md:text-[10px] font-black opacity-50 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
              <Calendar size={12} /> Member Since: {formData.createdAt ? new Date(formData.createdAt).toLocaleDateString() : "---"}
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        <div className="card bg-base-100 border border-base-300 rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-black uppercase text-xs tracking-widest text-primary">
            <UserIcon size={16} /> Account Identity
          </h2>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label text-[10px] font-black opacity-40 uppercase tracking-widest">Email Address</label>
              <div className="flex items-center gap-3 bg-base-200 p-4 rounded-xl border border-base-300 opacity-70 text-sm font-bold italic overflow-hidden">
                <Mail size={16} className="text-primary/50 shrink-0" />
                <span className="truncate">{formData.email}</span>
              </div>
            </div>
            <FormInput 
              label="Username"
              icon={AtSign}
              maxLength={20}
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card bg-base-100 border border-base-300 rounded-[32px] p-6 md:p-8 space-y-6 flex-1 shadow-sm">
            <h2 className="flex items-center gap-2 font-black uppercase text-xs tracking-widest text-primary">
              <Calendar size={16} /> Bio Metrics
            </h2>
            <FormInput 
              label="Full Name"
              icon={UserIcon}
              maxLength={50}
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label text-[10px] font-black opacity-40 uppercase tracking-widest">Birth Date</label>
                <input type="date" className="input input-bordered bg-base-200 border-base-300 font-bold rounded-xl focus:ring-2 ring-primary transition-all h-[3rem]" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
              </div>
              <div className="form-control">
                <label className="label text-[10px] font-black opacity-40 uppercase tracking-widest">Gender</label>
                <select className="select select-bordered w-full bg-base-200 border-base-300 font-bold rounded-xl focus:ring-2 ring-primary transition-all h-[3rem]" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || isInvalid} 
            className={`btn w-full rounded-2xl font-black uppercase italic h-16 border-none shadow-xl transition-all ${isInvalid ? 'btn-disabled opacity-50' : 'btn-primary shadow-primary/20 hover:scale-[1.02]'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : isInvalid ? "LIMIT EXCEEDED" : <><Save size={18} className="mr-2" /> Save Profile Settings</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserSettings;