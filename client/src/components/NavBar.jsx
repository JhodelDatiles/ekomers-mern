import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  Search, Store, ShoppingBag, Heart, Palette, Check, 
  LayoutDashboard, Boxes, ShoppingCart, Package, X, ShoppingBasket,
  Users, TrendingUp, Settings, Globe, ShieldCheck, Home, Layout,
  User as UserIcon, MapPin, Lock, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { authAPI } from '../services/api'; 
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext'; 
import { useWishlist } from '../context/WishlistContext'; 

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { removeFromCart, cart } = useCart(); 
  const { wishlist } = useWishlist(); 
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [storeSettings, setStoreSettings] = useState({ name: "MN+LA", logo: null });
  const [isNavSettingsOpen, setIsNavSettingsOpen] = useState(false);

  const themes = ["dark", "forest", "coffee"];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data) setStoreSettings({ name: data.storeName, logo: data.logo });
      } catch (err) {
        console.error("Navbar: Settings error", err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/shop');
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      logout();
      toast.success("Session Terminated");
      navigate('/login');
    } catch (err) {
      toast.error("Logout Failed");
    }
  };

  const menuItems = [
    { name: 'Shop', path: '/shop', icon: <Store size={18} /> },
    { name: 'Collections', path: '/collections', icon: <ShoppingBasket size={18} /> },
  ];

  const userMenu = {
    customer: [
      { name: 'Profile', path: '/profile', icon: <UserIcon size={14} /> },
      { name: 'My Orders', path: '/dashboard/my-orders', icon: <Package size={14} /> },
      { name: 'Shipping', path: '/profile', icon: <MapPin size={14} /> },
      { name: 'Security', path: '/profile', icon: <Lock size={14} /> },
    ],
    admin: [
      { name: 'Overview', path: '/admin/dashboard', icon: <TrendingUp size={14} /> },
      { name: 'Inventory', path: '/admin/products', icon: <Boxes size={14} /> },
      { name: 'Orders', path: '/admin/orders', icon: <Package size={14} /> },
      { name: 'Customers', path: '/admin/users', icon: <Users size={14} /> },
      { name: 'Storefront', path: '/admin/settings', icon: <Settings size={14} /> },
    ]
  };

  return (
    <nav className="fixed top-0 w-full z-[150] bg-base-100/80 backdrop-blur-xl border-b border-base-content/5 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            {storeSettings.logo ? (
              <img src={storeSettings.logo} alt="logo" className="w-6 h-6 object-contain" />
            ) : (
              <Layout className="text-primary-content" size={20} />
            )}
          </div>
          <span className="text-xl font-black italic tracking-tighter uppercase hidden sm:block">
            {storeSettings.name}
          </span>
        </Link>

        {/* SEARCH - DESKTOP */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search manifests..."
            className="w-full bg-base-content/5 border-none rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* NAVIGATION LINKS */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all hover:bg-white/5 active:scale-95 ${
                  location.pathname === item.path ? "text-primary bg-primary/10" : "text-base-content/60 hover:text-primary"
                }`}
              >
                {item.icon} {item.name}
              </Link>
            ))}
          </div>

          <div className="w-[1px] h-6 bg-base-content/10 hidden lg:block mx-2"></div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-1">
            {/* Theme Switcher */}
            <div className="dropdown dropdown-end">
              <button className="btn btn-ghost btn-circle hover:bg-white/5 hover:text-primary transition-colors">
                <Palette size={20} />
              </button>
              <ul className="dropdown-content z-[1] menu p-3 shadow-2xl bg-base-200 rounded-2xl w-40 mt-4 border border-base-content/5 backdrop-blur-xl">
                <li className="menu-title text-[9px] font-black uppercase opacity-40 mb-2 px-2">Select Theme</li>
                {themes.map((t) => (
                  <li key={t}>
                    <button 
                      onClick={() => setTheme(t)}
                      className={`flex justify-between items-center py-2.5 px-3 rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-primary/10 hover:text-primary ${theme === t ? "text-primary bg-primary/5" : ""}`}
                    >
                      {t} {theme === t && <Check size={14} />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <Link to="/wishlist" className="btn btn-ghost btn-circle relative hover:bg-white/5 hover:text-primary transition-colors">
              <Heart size={20} className={wishlist?.length > 0 ? "fill-primary text-primary" : ""} />
              {wishlist?.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]"></span>
              )}
            </Link>

            <Link to="/cart" className="btn btn-ghost btn-circle relative hover:bg-white/5 hover:text-primary transition-colors">
              <ShoppingBag size={20} />
              {cart?.items?.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-content text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full border-4 border-base-100 italic">
                  {cart.items.length}
                </span>
              )}
            </Link>
          </div>

          {/* USER MENU */}
          {user ? (
            <div className="flex items-center ml-2 pl-4 border-l border-base-content/10">
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="flex items-center gap-3 cursor-pointer group p-1 pr-3 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-xl ring ring-primary/20 ring-offset-base-100 ring-offset-2 transition-all group-hover:ring-primary">
                      <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.fullName}&background=random`} alt="user" />
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col items-start leading-none">
                    <span className="text-[11px] font-black uppercase italic group-hover:text-primary transition-colors">{user.fullName.split(' ')[0]}</span>
                    <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{user.role}</span>
                  </div>
                  <ChevronDown size={14} className="opacity-20 group-hover:opacity-100 transition-all group-hover:text-primary" />
                </label>
                
                <ul tabIndex={0} className="dropdown-content z-[200] menu p-3 shadow-2xl bg-base-200 rounded-[32px] w-64 mt-4 border border-base-content/5">
                  <div className="p-4 mb-2 bg-base-300/50 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black uppercase text-primary italic mb-1 tracking-tighter">Authorized User</p>
                    <p className="text-xs font-bold truncate opacity-80">{user.email}</p>
                  </div>

                  {user.role === 'admin' && (
                    <li className="mb-1">
                      <Link to="/admin/dashboard" className="bg-primary text-primary-content font-black italic uppercase text-[10px] py-3 tracking-widest hover:scale-[0.98] transition-transform flex justify-center rounded-xl">
                        <ShieldCheck size={16} /> Command Center
                      </Link>
                    </li>
                  )}

                  <div className="grid grid-cols-1 gap-1">
                    <p className="text-[8px] font-black uppercase opacity-30 mt-3 mb-1 ml-3 tracking-[0.2em]">Quick Access</p>
                    {userMenu.customer.map((item) => (
                      <li key={item.path}>
                        <Link to={item.path} className={`flex items-center gap-3 py-3 px-4 rounded-xl text-[10px] font-bold uppercase transition-all hover:bg-primary/10 hover:text-primary ${location.pathname === item.path ? "bg-primary/5 text-primary" : "opacity-60"}`}>
                          {item.icon} {item.name}
                        </Link>
                      </li>
                    ))}
                  </div>

                  <div className="divider my-1 opacity-50 px-4"></div>
                  
                  <li>
                    <button onClick={handleLogout} className="text-error font-black uppercase text-[10px] py-4 tracking-widest hover:bg-error/10 flex justify-center border border-dashed border-error/20 rounded-xl mt-1 transition-all">
                      Logout Session
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex gap-1 ml-2">
              <Link to="/login" className="btn btn-ghost btn-sm px-4 font-black uppercase text-[10px] hover:bg-white/5 hover:text-primary">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm px-4 font-black uppercase text-[10px] shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95">Join</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;