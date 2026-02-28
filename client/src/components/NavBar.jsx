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
  const isAdmin = user?.role === 'admin';
  const uniqueCartCount = cart?.items?.length || 0;

  const adminLinks = [
    { name: "Overview", path: "/admin", icon: <LayoutDashboard size={14} /> },
    { name: "Inventory", path: "/admin/products", icon: <Boxes size={14} /> },
    { name: "Global Orders", path: "/admin/orders", icon: <Package size={14} /> },
    { name: "Users", path: "/admin/users", icon: <Users size={14} /> },
    { name: "Sales", path: "/admin/sales", icon: <TrendingUp size={14} /> },
    { name: "Configuration", path: "/admin/configuration", icon: <Globe size={14} /> },
  ];

  const userLinks = [
    { name: "Overview", path: "/dashboard", icon: <LayoutDashboard size={14} /> },
    { name: "My Cart", path: "/dashboard/cart", icon: <ShoppingCart size={14} /> },
    { name: "My Orders", path: "/dashboard/my-orders", icon: <Package size={14} /> },
    { name: "Wishlist", path: "/dashboard/wishlist", icon: <Heart size={14} /> },
  ];

  const settingsSubLinks = [
    { name: "Profile", path: isAdmin ? "/admin/settings" : "/dashboard/settings", icon: <UserIcon size={12} /> },
    { name: "Addresses", path: "/dashboard/settings/addresses", icon: <MapPin size={12} />, hideForAdmin: true },
    { name: "Privacy", path: isAdmin ? "/admin/settings/privacy" : "/dashboard/settings/privacy", icon: <Lock size={12} /> },
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data) setStoreSettings({ name: data.storeName || "MN+LA", logo: data.storeLogo });
      } catch (err) { console.error("Navbar: Settings error", err); }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    document.querySelector('html').setAttribute('data-theme', theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      logout();
      toast.success('Logged out');
      navigate('/');
    } catch (error) { toast.error('Logout failed'); }
  };

  return (
    <nav className="navbar bg-base-100 shadow-md sticky top-0 z-50 px-4 md:px-8 font-sans border-b border-base-200">
      <div className="navbar-start">
        <Link to="/" className="flex items-center gap-2 group">
          {storeSettings.logo?.url ? (
            <img src={storeSettings.logo.url} alt="Logo" className="w-8 h-8 object-contain transition-transform duration-200 group-hover:scale-110" />
          ) : (
            <div className="bg-primary p-2 rounded-lg shadow-lg transition-transform duration-200 group-hover:rotate-12">
              <Store className="w-5 h-5 text-primary-content" />
            </div>
          )}
          <span className="text-xl font-black italic tracking-tighter uppercase">{storeSettings.name}</span>
        </Link>
      </div>

      <div className="navbar-center hidden lg:flex">
        <form onSubmit={(e) => { e.preventDefault(); navigate(searchQuery ? `/?search=${searchQuery}` : '/'); }} className="relative group">
          <input
            type="text"
            placeholder="Search products..."
            className="input input-bordered input-sm w-64 md:w-80 rounded-full pl-10 bg-base-200 border-none focus:ring-2 ring-primary transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
        </form>
      </div>

      <div className="navbar-end gap-1 md:gap-2">

        {!isAdmin && user && (
          <div className="dropdown dropdown-hover dropdown-end">
            <div tabIndex={0} role="button"
              className="btn btn-ghost btn-circle btn-sm relative transition-colors duration-200 hover:bg-base-200 hover:text-primary">
              <ShoppingBag size={20} />
              {uniqueCartCount > 0 && (
                <span className="badge badge-primary badge-xs absolute -top-1 -right-1 font-black shadow-md border-none animate-pulse">
                  {uniqueCartCount}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="dropdown dropdown-hover dropdown-end">
          <label tabIndex={0}
            className="btn btn-ghost btn-circle btn-sm transition-colors duration-200 hover:bg-base-200 hover:text-primary">
            <Palette size={18} />
          </label>
        </div>

        <div key={user?._id || 'guest'} className="flex items-center">
          {user ? (
            <div className="dropdown dropdown-hover dropdown-end">
              <label
                tabIndex={0}
                className="btn btn-ghost btn-circle avatar border-2 border-primary/20 hover:border-primary hover:bg-base-200 transition-colors duration-200 ml-1 overflow-hidden p-0">
                <div className="w-8 md:w-9 rounded-full overflow-hidden bg-base-300 flex items-center justify-center">
                  <img 
                    src={user.profilePic?.url || `https://ui-avatars.com/api/?name=${user.username}&background=641ae6&color=fff&bold=true`} 
                    alt={user.username} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </label>

              <div tabIndex={0} className="dropdown-content z-[60] pt-2">
                <ul className="menu p-3 shadow-2xl bg-base-100 rounded-2xl w-64 border border-base-200">

                  {(isAdmin ? adminLinks : userLinks).map((link) => (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        className={`py-2 px-3 text-[11px] font-bold uppercase tracking-tight rounded-lg flex items-center gap-3 group transition-colors duration-200 hover:bg-base-200 hover:text-primary ${location.pathname === link.path ? "text-primary bg-primary/5" : ""}`}
                      >
                        <span className="opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all">
                          {link.icon}
                        </span>
                        {link.name}
                      </Link>
                    </li>
                  ))}

                  <li className="mt-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsNavSettingsOpen(!isNavSettingsOpen);
                      }}
                      className={`flex items-center justify-between py-2 px-3 text-[11px] font-bold uppercase tracking-tight rounded-lg transition-colors duration-200 hover:bg-base-200 hover:text-primary ${location.pathname.includes("settings") ? "bg-base-200" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <Settings size={14} />
                        Settings
                      </div>
                      <ChevronDown size={12} className={`transition-transform duration-300 ${isNavSettingsOpen ? "rotate-180" : ""}`} />
                    </button>

                    <div className={`overflow-hidden transition-all duration-300 ${isNavSettingsOpen ? "max-h-40 opacity-100 mb-2" : "max-h-0 opacity-0"}`}>
                      {settingsSubLinks
                        .filter(sub => !(isAdmin && sub.hideForAdmin))
                        .map((sub) => (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            className={`flex items-center gap-3 ml-6 py-2.5 text-[10px] font-bold uppercase rounded-lg transition-colors duration-200 ${location.pathname === sub.path ? "text-primary bg-primary/5" : "opacity-60 hover:opacity-100 hover:bg-base-200 hover:text-primary"}`}
                          >
                            {sub.icon} {sub.name}
                          </Link>
                        ))}
                    </div>
                  </li>

                  <div className="divider my-1 opacity-50"></div>

                  <li>
                    <button
                      onClick={handleLogout}
                      className="text-error font-black uppercase text-[10px] py-3 tracking-widest hover:bg-error/10 transition-colors duration-200 flex justify-center border border-dashed border-error/20 rounded-xl mt-1"
                    >
                      Logout Session
                    </button>
                  </li>

                </ul>
              </div>
            </div>
          ) : (
            <div className="flex gap-1 ml-2">
              <Link to="/login" className="btn btn-ghost btn-sm px-4 font-black uppercase text-[10px] transition-colors duration-200 hover:bg-base-200 hover:text-primary">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm px-4 font-black uppercase text-[10px] shadow-lg shadow-primary/20">Join</Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;