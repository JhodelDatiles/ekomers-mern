import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Facebook, Twitter, Instagram, Send, MapPin, Store } from 'lucide-react';
import api from '../services/api.js';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState({
    storeName: "ShopHub",
    storeDescription: "Elevating your lifestyle with curated collections.",
    storeLogo: null,
    newsletterTitle: "Join our community",
    newsletterSubtitle: "Get exclusive deals.",
    socialLinks: { facebook: "#", twitter: "#", instagram: "#" },
    paymentMethods: ["VISA", "MASTERCARD", "PAYPAL"],
    officeAddress: { street: "", barangay: "", city: "", state: "", zipCode: "", country: "Philippines" }
  });

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data) setSettings(data);
      } catch (err) { console.error("Footer Error", err); }
    };
    fetchFooterData();
  }, []);

  return (
    <footer className="bg-base-100 border-t border-base-300 relative z-50">
      {/* <div className="bg-primary/5 py-12 px-10 border-b border-base-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold mb-2">{settings.newsletterTitle}</h3>
            <p className="text-base-content/70">{settings.newsletterSubtitle}</p>
          </div>
          <div className="join shadow-sm">
            <input type="email" placeholder="Enter email" className="input input-bordered join-item w-full bg-base-100" />
            <button className="btn btn-primary join-item px-6"><Send className="w-4 h-4 mr-2" /> Subscribe</button>
          </div>
        </div>
      </div> */}

      <div className="footer max-w-7xl mx-auto p-10 text-base-content grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-12">
        <div className="col-span-2 lg:col-span-2 pr-0 lg:pr-12">
          <div className="flex items-center gap-3 mb-4 group cursor-pointer">
            {settings.storeLogo?.url ? (
              <img src={settings.storeLogo.url} alt="Logo" className="w-10 h-10 object-contain transition-transform group-hover:scale-110" />
            ) : (
              <div className="p-2 bg-primary rounded-lg text-primary-content transition-transform group-hover:scale-110">
                <Store className="w-6 h-6" />
              </div>
            )}
            <span className="text-2xl font-black tracking-tighter uppercase italic">{settings.storeName}</span>
          </div>
          <p className="text-base-content/70 leading-relaxed mb-6">{settings.storeDescription}</p>
          <div className="flex gap-4">
            {Object.entries(settings.socialLinks).map(([platform, url]) => (
              url !== "#" && (
                <a key={platform} href={url} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost btn-circle bg-base-200 hover:bg-primary hover:text-white">
                  {platform === 'facebook' && <Facebook className="w-4 h-4" />}
                  {platform === 'twitter' && <Twitter className="w-4 h-4" />}
                  {platform === 'instagram' && <Instagram className="w-4 h-4" />}
                </a>
              )
            ))}
          </div>
        </div>

        <div>
          <span className="footer-title opacity-100 text-primary mb-4 block">Visit Us</span>
          <div className="flex flex-col gap-3 text-sm">
            {settings.officeAddress?.street ? (
              <div className="flex items-start gap-2 group">
                <MapPin className="w-4 h-4 mt-1 text-primary shrink-0 transition-bounce group-hover:scale-125" />
                <address className="not-italic leading-relaxed text-base-content/80">
                  {settings.officeAddress.street}, {settings.officeAddress.barangay}<br />
                  {settings.officeAddress.city}, {settings.officeAddress.state}<br />
                  {settings.officeAddress.zipCode}, {settings.officeAddress.country}
                </address>
              </div>
            ) : <p className="text-base-content/40 italic">Address updating...</p>}
          </div>
        </div>

        <div>
          <span className="footer-title opacity-100 text-primary mb-4 block">Shop</span>
          <div className="flex flex-col gap-2">
            <Link to="/shop" className="link link-hover">All Products</Link>
            <Link to="/categories" className="link link-hover">Categories</Link>
          </div>
        </div>

        <div>
          <span className="footer-title opacity-100 text-primary mb-4 block">Support</span>
          <div className="flex flex-col gap-2">
            <Link to="/contact" className="link link-hover">Contact Us</Link>
            <Link to="/faq" className="link link-hover">FAQs</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-base-300 bg-base-100">
        <div className="max-w-7xl mx-auto px-10 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-base-content/60">
          <p>© {currentYear} {settings.storeName} Inc. Crafted with care.</p>
          <div className="flex gap-4 items-center">
            <span className="cursor-default text-[10px] font-bold uppercase tracking-widest opacity-50">Accepted Payments:</span>
            <div className="flex gap-2 flex-wrap">
              {settings.paymentMethods.map((method, idx) => (
                <span key={idx} className="border border-base-300 px-2 py-0.5 rounded bg-base-200 text-[9px] font-black uppercase tracking-tighter">{method}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;