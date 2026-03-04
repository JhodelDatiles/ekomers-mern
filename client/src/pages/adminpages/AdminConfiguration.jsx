import { useState, useEffect } from "react";
import { 
  Globe, Store, MessageSquare, Share2, CreditCard, Save, Eye, 
  Mail, Upload, ImageIcon, MapPin, Facebook, Instagram, Twitter, ShieldCheck, Hash 
} from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import ConfigurationSkeleton from "../../components/skeletons/adminskeletons/ConfigurationSkeleton";
import FormInput from "../../components/ui/FormInput";

const AdminConfiguration = () => {
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [settings, setSettings] = useState({
    storeName: "",
    storeDescription: "",
    facebook: "",
    twitter: "",
    instagram: "",
    paymentMethodsRaw: "",
    officeAddress: {
      street: "",
      barangay: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Philippines",
    }
  });

  const updateFavicon = (url) => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = url;
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setFetching(true);
        const { data } = await api.get('/settings');
        if (data) {
          setSettings({
            storeName: data.storeName || "",
            storeDescription: data.storeDescription || "",
            facebook: data.socialLinks?.facebook || "",
            twitter: data.socialLinks?.twitter || "",
            instagram: data.socialLinks?.instagram || "",
            paymentMethodsRaw: data.paymentMethods?.join(", ") || "",
            officeAddress: data.officeAddress || {
              street: "", barangay: "", city: "", state: "", zipCode: "", country: "Philippines",
            }
          });
          if (data.storeLogo?.url) {
            setLogoPreview(data.storeLogo.url);
            updateFavicon(data.storeLogo.url);
            document.title = data.storeName || "Admin Dashboard";
          }
        }
      } catch (err) {
        console.error("Fetch Settings Error:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchSettings();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      updateFavicon(previewUrl);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const tid = toast.loading("Deploying changes to cloud...");
    
    try {
      const formData = new FormData();
      formData.append("storeName", settings.storeName);
      formData.append("storeDescription", settings.storeDescription);
      formData.append("socialLinks", JSON.stringify({
        facebook: settings.facebook,
        twitter: settings.twitter,
        instagram: settings.instagram
      }));
      formData.append("officeAddress", JSON.stringify(settings.officeAddress));
      formData.append("paymentMethodsRaw", settings.paymentMethodsRaw);
      if (logoFile) formData.append("logo", logoFile);

      const { data } = await api.put('/settings', formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      toast.success("Global Configuration Updated!", { id: tid });
      document.title = data.storeName;
      setTimeout(() => window.location.reload(), 1500); 
    } catch (err) {
      console.error("Save Error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Internal Server Error (500)", { id: tid });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <ConfigurationSkeleton />;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Globe className="text-primary w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight italic text-base-content">Master Configuration</h1>
            <p className="text-xs opacity-50 font-black uppercase tracking-[0.3em] text-base-content">System Identity & Global SEO</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6 pb-20">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BRANDING ASSETS */}
            <section className="card bg-base-200 border border-base-content/5 rounded-[28px]">
              <div className="card-body">
                <h2 className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest opacity-40 mb-2 text-base-content">
                  <ImageIcon className="w-4 h-4" /> Branding Assets
                </h2>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-base-300 rounded-3xl border-2 border-dashed border-base-content/10 flex items-center justify-center overflow-hidden shadow-inner group relative">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2 transition-transform group-hover:scale-110" />
                    ) : (
                      <Store className="opacity-10 w-10 h-10 text-base-content" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="btn btn-primary btn-sm font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-primary/20 cursor-pointer">
                      <Upload size={14} /> Change Logo
                      <input type="file" hidden onChange={handleFileChange} accept="image/*" />
                    </label>
                    <p className="text-[9px] opacity-40 uppercase font-bold text-center tracking-tighter text-base-content">PNG, JPG (Max 2MB)</p>
                  </div>
                </div>
              </div>
            </section>

            {/* STORE NAME */}
            <section className="card bg-base-200 border border-base-content/5 rounded-[28px]">
              <div className="card-body">
                <h2 className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest opacity-40 mb-2 text-base-content">
                  <Store className="w-4 h-4" /> Global Name
                </h2>
                <FormInput 
                  label="Store Name"
                  placeholder="e.g. ARBOR"
                  maxLength={20}
                  icon={Store}
                  value={settings.storeName}
                  onChange={(e) => {
                    setSettings({...settings, storeName: e.target.value});
                    document.title = e.target.value || "Store Configuration";
                  }}
                />
              </div>
            </section>
          </div>

          {/* META DESCRIPTION */}
          <section className="card bg-base-200 border border-base-content/5 rounded-[28px]">
            <div className="card-body">
              <div className="flex justify-between items-end mb-2">
                <h2 className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest opacity-40 text-base-content">
                  <MessageSquare className="w-4 h-4" /> Meta Description
                </h2>
                <span className={`text-[10px] font-bold transition-all duration-300 ${
                  settings.storeDescription.length > 250 ? 'text-error animate-pulse' : 'opacity-20 text-base-content'
                }`}>
                  {settings.storeDescription.length} / 250
                </span>
              </div>
              <textarea 
                className={`textarea textarea-bordered bg-base-300 border-base-content/10 h-24 font-bold leading-relaxed w-full transition-all text-base-content rounded-2xl
                  ${settings.storeDescription.length > 250 
                    ? 'border-error focus:border-error ring-2 ring-error/10' 
                    : 'focus:border-primary focus:ring-2 focus:ring-primary/50'
                  }`}
                placeholder="Briefly describe your store for SEO..."
                value={settings.storeDescription}
                onChange={(e) => setSettings({...settings, storeDescription: e.target.value})}
              />
              {settings.storeDescription.length > 250 && (
                <p className="text-[10px] font-black text-error animate-pulse uppercase italic mt-1 text-right">
                  Exceeded 250 characters
                </p>
              )}
            </div>
          </section>

          {/* LOGISTICS */}
          <section className="card bg-base-200 border border-base-content/5 rounded-[28px]">
            <div className="card-body">
              <h2 className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest opacity-40 mb-4 text-base-content">
                <MapPin className="w-4 h-4 text-primary" /> Logistics & Shipping Hub
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <FormInput 
                    label="Street Address" 
                    icon={MapPin}
                    maxLength={100}
                    value={settings.officeAddress.street} 
                    onChange={(e) => setSettings({ ...settings, officeAddress: { ...settings.officeAddress, street: e.target.value } })} 
                  />
                </div>
                <FormInput 
                  label="Barangay" 
                  maxLength={50}
                  value={settings.officeAddress.barangay} 
                  onChange={(e) => setSettings({ ...settings, officeAddress: { ...settings.officeAddress, barangay: e.target.value } })} 
                />
                <FormInput 
                  label="City / Municipality" 
                  maxLength={50}
                  value={settings.officeAddress.city} 
                  onChange={(e) => setSettings({ ...settings, officeAddress: { ...settings.officeAddress, city: e.target.value } })} 
                />
                <FormInput 
                  label="Zip Code" 
                  maxLength={4} 
                  icon={Hash}
                  isNumeric={true}
                  value={settings.officeAddress.zipCode} 
                  onChange={(e) => setSettings({ ...settings, officeAddress: { ...settings.officeAddress, zipCode: e.target.value } })} 
                />
              </div>
            </div>
          </section>

          {/* SOCIAL + PAYMENT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SOCIAL LINKS */}
            <section className="card bg-base-200 border border-base-content/5 rounded-[28px]">
              <div className="card-body">
                <h2 className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest opacity-40 mb-2 text-base-content">
                  <Share2 className="w-4 h-4" /> Social Links
                </h2>
                <div className="space-y-4">
                  <FormInput 
                    label="Facebook URL"
                    icon={Facebook}
                    placeholder="https://facebook.com/yourstore" 
                    value={settings.facebook} 
                    onChange={(e) => setSettings({...settings, facebook: e.target.value})} 
                  />
                  <FormInput 
                    label="Instagram URL"
                    icon={Instagram}
                    placeholder="https://instagram.com/yourstore" 
                    value={settings.instagram} 
                    onChange={(e) => setSettings({...settings, instagram: e.target.value})} 
                  />
                  {/* ✅ FIXED: was bound to settings.instagram before */}
                  <FormInput 
                    label="X (Twitter) URL"
                    icon={Twitter}
                    placeholder="https://x.com/yourstore" 
                    value={settings.twitter} 
                    onChange={(e) => setSettings({...settings, twitter: e.target.value})} 
                  />
                </div>
              </div>
            </section>

            {/* ✅ ADDED: Payment Methods */}
            <section className="card bg-base-200 border border-base-content/5 rounded-[28px]">
              <div className="card-body">
                <h2 className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest opacity-40 mb-2 text-base-content">
                  <CreditCard className="w-4 h-4" /> Payment Methods
                </h2>
                <p className="text-[9px] opacity-40 uppercase font-bold tracking-widest mb-3 text-base-content">
                  Comma-separated — shown in footer
                </p>
                <FormInput
                  label="Accepted Methods"
                  icon={CreditCard}
                  placeholder="VISA, MASTERCARD, GCASH, PAYMONGO"
                  value={settings.paymentMethodsRaw}
                  onChange={(e) => setSettings({...settings, paymentMethodsRaw: e.target.value})}
                />
                {/* Live preview of parsed methods */}
                {settings.paymentMethodsRaw && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {settings.paymentMethodsRaw.split(',').map((m, i) => m.trim() && (
                      <span key={i} className="border border-base-content/20 px-2 py-0.5 rounded bg-base-300 text-[9px] font-black uppercase tracking-tighter text-base-content">
                        {m.trim().toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full h-16 text-lg font-black uppercase italic shadow-2xl border-none tracking-widest group rounded-2xl">
            {loading ? <span className="loading loading-spinner"></span> : <><Save className="mr-2 group-hover:rotate-12 transition-transform" /> Deploy Configuration</>}
          </button>
        </form>

        {/* PREVIEW ASIDE */}
        <aside className="lg:col-span-1">
          <div className="sticky top-4 space-y-6">
            <h2 className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest opacity-40 mb-4 px-2 text-base-content">
              <Eye className="w-4 h-4 text-primary" /> Visual Identity Preview
            </h2>
            
            <div className="p-8 bg-base-200 text-base-content rounded-[40px] shadow-2xl border border-base-content/10 space-y-8 relative overflow-hidden">
              <div className="flex flex-col items-center text-center gap-4 py-4">
                {logoPreview ? (
                  <div className="relative group">
                    <img src={logoPreview} alt="Logo" className="w-28 h-28 object-contain bg-white rounded-3xl p-3 shadow-2xl transition-transform group-hover:scale-105" />
                    <div className="absolute -bottom-2 -right-2 bg-primary text-primary-content p-1.5 rounded-full shadow-lg border-4 border-base-200">
                      <ShieldCheck size={16} />
                    </div>
                  </div>
                ) : (
                  <div className="w-28 h-28 bg-primary/20 rounded-3xl flex items-center justify-center border-2 border-dashed border-primary/40">
                    <ImageIcon className="w-10 h-10 text-primary opacity-40" />
                  </div>
                )}
                <div>
                  <span className="text-2xl font-black italic uppercase tracking-tighter block leading-none">
                    {settings.storeName || "BRAND NAME"}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mt-2 block">Identity Verified</span>
                </div>
              </div>

              <div className="space-y-2 px-2">
                <p className="text-[9px] font-black uppercase opacity-30 tracking-widest">Global SEO Summary</p>
                <p className="text-xs opacity-70 italic font-medium leading-relaxed line-clamp-4 bg-base-300 p-4 rounded-2xl border border-base-content/5">
                  "{settings.storeDescription || "Provide a store description to enhance SEO..."}"
                </p>
              </div>

              <div className="bg-base-300 p-5 rounded-3xl border border-base-content/5 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Headquarters</p>
                </div>
                <div className="text-[11px] font-bold leading-relaxed opacity-90 italic">
                  <p>{settings.officeAddress.street || "---"}</p>
                  <p>{settings.officeAddress.barangay || "---"}</p>
                  <p>{settings.officeAddress.city || "---"}, {settings.officeAddress.zipCode || "---"}</p>
                  <p className="mt-2 opacity-40 uppercase tracking-widest text-[9px] font-black">{settings.officeAddress.country}</p>
                </div>
              </div>

              {/* Payment Methods Preview */}
              {settings.paymentMethodsRaw && (
                <div className="bg-base-300 p-4 rounded-3xl border border-base-content/5">
                  <p className="text-[9px] font-black uppercase opacity-30 tracking-widest mb-2">Footer Payment Methods</p>
                  <div className="flex flex-wrap gap-2">
                    {settings.paymentMethodsRaw.split(',').map((m, i) => m.trim() && (
                      <span key={i} className="border border-base-content/20 px-2 py-0.5 rounded bg-base-200 text-[9px] font-black uppercase tracking-tighter">
                        {m.trim().toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                  <span className="text-[9px] font-black uppercase opacity-40 tracking-widest italic">Database Live</span>
                </div>
                <div className="flex gap-3 opacity-40">
                  {settings.facebook && <Facebook size={14} />}
                  {settings.instagram && <Instagram size={14} />}
                  {settings.twitter && <Twitter size={14} />}
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[80px] -z-10"></div>
            </div>
            
            <div className="alert bg-primary/10 border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex justify-center py-4 rounded-2xl">
              Changes impact Navbar, Footer & SEO
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminConfiguration;