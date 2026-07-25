import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  Search, Store, ShoppingBag, Heart, Palette, Check, 
  LayoutDashboard, Boxes, ShoppingCart, Package, X, ShoppingBasket,
  Users, TrendingUp, Settings, Globe, ShieldCheck, Home, Layout,
  User as UserIcon, MapPin, Lock, ChevronDown, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { authAPI, productAPI } from '../services/api'; 
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  // Sync search input with URL — clears when navigating away from home
  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  // Fetch all products once for live autocomplete
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await productAPI.getProducts({ limit: 200 });
        setAllProducts(res?.products || []);
      } catch (err) { console.error("Navbar: product fetch error", err); }
    };
    fetchAll();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchRef.current && !searchRef.current.contains(e.target) &&
        mobileSearchRef.current && !mobileSearchRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live filtered suggestions — same useMemo pattern as AdminOrders
  const suggestions = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return [];
    return allProducts
      .filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      )
      .slice(0, 6);
  }, [searchQuery, allProducts]);

  const handleSelectSuggestion = (product) => {
    setSearchQuery(product.name);
    setShowSuggestions(false);
    navigate(`/?search=${encodeURIComponent(product.name)}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    navigate(searchQuery.trim() ? `/?search=${encodeURIComponent(searchQuery.trim())}` : '/');
  };

  const handleClear = () => {
    setSearchQuery("");
    setShowSuggestions(false);
    navigate("/");
  };

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [storeSettings, setStoreSettings] = useState({ name: "MN+LA", logo: null });
  const [isNavSettingsOpen, setIsNavSettingsOpen] = useState(false);

  const themes = ["dark", "forest", "coffee"];
  const isAdmin = user?.role === 'admin';
  const uniqueCartCount = cart?.items?.length || 0;

  // Integrated Dashboard Links
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
    <div className="bg-base-100 shadow-md sticky top-0 z-50 border-b border-base-200 font-sans">
    <nav className="navbar px-4 md:px-8">
      <div className="navbar-start">
        <Link to="/" className="flex items-center gap-2 group">
          {storeSettings.logo?.url ? (
            <img src={storeSettings.logo.url} alt="Logo" className="w-8 h-8 object-contain transition-transform group-hover:scale-110" />
          ) : (
            <div className="bg-primary p-2 rounded-lg shadow-lg transition-transform group-hover:rotate-12">
              <Store className="w-5 h-5 text-primary-content" />
            </div>
          )}
          <span className="text-xl font-black italic tracking-tighter uppercase">{storeSettings.name}</span>
        </Link>
      </div>

      <div className="navbar-center hidden lg:flex">
        <div ref={searchRef} className="relative">
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Search products..."
              className="input input-bordered input-sm w-64 md:w-80 rounded-full pl-10 pr-8 bg-base-200 border-none focus:ring-2 ring-primary transition-all outline-none"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => { if (searchQuery.trim()) setShowSuggestions(true); }}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
            {searchQuery && (
              <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors">
                <X size={13} />
              </button>
            )}
          </form>
          {/* Live suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-base-100 border border-base-200 rounded-2xl shadow-2xl overflow-hidden z-[70]">
              {suggestions.map((product) => (
                <button
                  key={product._id}
                  onMouseDown={() => handleSelectSuggestion(product)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-base-200 transition-colors text-left group"
                >
                  <img
                    src={product.images?.[0]?.url || "/placeholder.png"}
                    alt=""
                    className="w-8 h-8 object-cover rounded-lg bg-base-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase italic truncate">{product.name}</p>
                    <p className="text-[9px] opacity-40 font-bold uppercase flex items-center gap-1">
                      <Tag size={8} /> {product.category}
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    ₱{Number(product.basePrice || product.sizes?.[0].price).toLocaleString()}
                  </span>
                </button>
              ))}
              <button
                onMouseDown={handleSearchSubmit}
                className="w-full px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-primary border-t border-base-200 hover:bg-primary/5 transition-colors text-center"
              >
                See all results for "{searchQuery}"
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="navbar-end gap-1 md:gap-2">
        {user && (
          <div className="hidden md:flex items-center gap-1 mr-2 bg-base-200/50 p-1 rounded-xl border border-base-300">
            <Link to="/" className="btn btn-ghost btn-xs h-8 px-3 gap-2 font-black uppercase italic text-[9px] tracking-[0.15em] hover:bg-base-100 rounded-lg transition-all">
              <Home size={13} /> Storefront
            </Link>
            <Link 
              to={isAdmin ? "/admin" : "/dashboard"} 
              className="btn btn-primary btn-xs h-8 px-3 gap-2 font-black uppercase italic text-[9px] tracking-[0.15em] rounded-lg shadow-lg shadow-primary/20 transition-all"
            >
              {isAdmin ? <><ShieldCheck size={13} /> Admin Panel</> : <><Layout size={13} /> Dashboard</>}
            </Link>
          </div>
        )}

        {!isAdmin && user && (
          <div className="dropdown dropdown-hover dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm relative transition-all hover:bg-primary/10">
              <ShoppingBag size={20} />
              {uniqueCartCount > 0 && (
                <span className="badge badge-primary badge-xs absolute -top-1 -right-1 font-black shadow-md border-none animate-pulse">
                  {uniqueCartCount}
                </span>
              )}
            </div>
            <div tabIndex={0} className="dropdown-content z-[60] pt-2">
              <div className="card card-compact w-80 bg-base-100 shadow-2xl border border-base-200 rounded-2xl overflow-hidden">
                <div className="card-body p-0">
                  <div className="p-4 border-b border-base-200 bg-base-200/30 text-center">
                    <span className="text-[10px] font-black uppercase italic opacity-50 tracking-widest">Bag Summary ({uniqueCartCount} Items)</span>
                  </div>
                  {uniqueCartCount > 0 ? (
                    <>
                      <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary">
                        {cart?.items?.map((item, idx) => (
                          <div key={idx} className="flex gap-3 items-center p-3 border-b border-base-200/50 group hover:bg-base-200/20">
                            <img src={item.productId?.images?.[0]?.url || "/placeholder.png"} alt="" className="w-10 h-10 object-cover rounded bg-base-200" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase italic truncate">{item.productId?.name}</p>
                              <p className="text-[9px] opacity-60 font-bold uppercase">{item.size} • Qty: {item.quantity}</p>
                            </div>
                            <button onClick={() => removeFromCart(item._id)} className="btn btn-ghost btn-xs btn-circle text-error opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="p-3">
                        <Link to="/dashboard/cart" className="btn btn-primary btn-sm w-full rounded-xl font-black uppercase italic shadow-md">Checkout Now</Link>
                      </div>
                    </>
                  ) : (
                    <div className="py-10 text-center opacity-30">
                        <ShoppingBasket size={24} className="mx-auto mb-2"/>
                        <p className="text-[10px] font-black uppercase italic">Bag is Empty</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="dropdown dropdown-hover dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle btn-sm hover:text-primary"><Palette size={18} /></label>
          <div tabIndex={0} className="dropdown-content z-[60] pt-2">
            <ul className="menu p-2 shadow-2xl bg-base-100 rounded-box w-48 border border-base-200">
              {themes.map((t) => (
                <li key={t}>
                  <button onClick={() => setTheme(t)} className={`capitalize flex justify-between ${theme === t ? "bg-primary/10 text-primary font-bold" : ""}`}>
                    {t} {theme === t && <Check size={14} />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div key={user?._id || 'guest'} className="flex items-center">
          {user ? (
            <div className="dropdown dropdown-hover dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar border-2 border-primary/20 hover:border-primary ml-1 transition-all overflow-hidden p-0">
                <div className="w-8 md:w-9 rounded-full overflow-hidden bg-base-300 flex items-center justify-center">
                  <img 
                    src={user.profilePic?.url || `https://ui-avatars.com/api/?name=${user.username}&background=641ae6&color=fff&bold=true`} 
                    alt={user.username} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${user.username}&background=641ae6&color=fff`;
                    }}
                  />
                </div>
              </label>
              <div tabIndex={0} className="dropdown-content z-[60] pt-2">
                <ul className="menu p-3 shadow-2xl bg-base-100 rounded-2xl w-64 border border-base-200">
                  <div className="px-4 py-3 border-b border-base-200 mb-2 bg-base-200/50 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      {isAdmin && <ShieldCheck size={10} className="text-primary" />}
                      <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">{user.role}</p>
                    </div>
                    <p className="text-sm font-black uppercase italic truncate">{user.username}</p>
                  </div>

                  {/* Dashboard / Storefront Links for Mobile */}
                  <li className="md:hidden">
                      <Link to="/" className="font-bold text-[11px] uppercase"><Home size={14}/> Storefront</Link>
                  </li>

                  {/* Sidebar Features Ported to Navbar Dropdown */}
                  {(isAdmin ? adminLinks : userLinks).map((link) => (
                    <li key={link.path}>
                      <Link to={link.path} className={`py-2 px-3 text-[11px] font-bold uppercase tracking-tight hover:bg-base-200 rounded-lg flex items-center gap-3 group ${location.pathname === link.path ? "text-primary bg-primary/5" : ""}`}>
                        <span className="opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all">{link.icon}</span> 
                        {link.name}
                      </Link>
                    </li>
                  ))}

                  {/* Ported Settings Accordion */}
                  <li className="mt-1">
                    <button 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setIsNavSettingsOpen(!isNavSettingsOpen); 
                      }}
                      className={`flex items-center justify-between py-2 px-3 text-[11px] font-bold uppercase tracking-tight rounded-lg hover:bg-base-200 ${location.pathname.includes("settings") ? "bg-base-200" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <Settings size={14} className={isNavSettingsOpen ? "animate-spin-slow text-primary" : "opacity-50"} />
                        Settings
                      </div>
                      <ChevronDown size={12} className={`transition-transform duration-300 ${isNavSettingsOpen ? "rotate-180" : ""}`} />
                    </button>
                      <div className={`overflow-hidden transition-all duration-300 ${isNavSettingsOpen ? "max-h-40 opacity-100 mb-2" : "max-h-0 opacity-0"}`}>
                        <div className="flex flex-col gap-1 pl-6">
                          {settingsSubLinks
                            .filter(sub => !(isAdmin && sub.hideForAdmin))
                            .map((sub) => (
                              <Link 
                                key={sub.path} 
                                to={sub.path} 
                                className={`flex items-center gap-3 py-2 text-[10px] font-bold uppercase rounded-lg ${location.pathname === sub.path ? "text-primary bg-primary/5" : "opacity-60 hover:opacity-100"}`}
                              >
                                {sub.icon} {sub.name}
                              </Link>
                            ))}
                        </div>
                      </div>
                  </li>

                  <div className="divider my-1 opacity-50"></div>
                  <li>
                    <button onClick={handleLogout} className="text-error font-black uppercase text-[10px] py-3 tracking-widest hover:bg-error/10 flex justify-center border border-dashed border-error/20 rounded-xl mt-1">
                      Logout Session
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex gap-1 ml-2">
              <Link to="/login" className="btn btn-ghost btn-sm px-4 font-black uppercase text-[10px]">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm px-4 font-black uppercase text-[10px] shadow-lg shadow-primary/20">Join</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
    {/* MOBILE SEARCH BAR — visible below lg */}
      <div className="lg:hidden px-4 py-2 border-t border-base-200">
        <div ref={mobileSearchRef} className="relative">
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Search products..."
              className="input input-bordered input-sm w-full rounded-full pl-10 pr-8 bg-base-200 border-none focus:ring-2 ring-primary transition-all outline-none"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => { if (searchQuery.trim()) setShowSuggestions(true); }}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
            {searchQuery && (
              <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors">
                <X size={13} />
              </button>
            )}
          </form>
          {/* Live suggestions dropdown — mobile */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-base-100 border border-base-200 rounded-2xl shadow-2xl overflow-hidden z-[70]">
              {suggestions.map((product) => (
                <button
                  key={product._id}
                  onMouseDown={() => handleSelectSuggestion(product)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-base-200 transition-colors text-left group"
                >
                  <img
                    src={product.images?.[0]?.url || "/placeholder.png"}
                    alt=""
                    className="w-8 h-8 object-cover rounded-lg bg-base-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase italic truncate">{product.name}</p>
                    <p className="text-[9px] opacity-40 font-bold uppercase flex items-center gap-1">
                      <Tag size={8} /> {product.category}
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    ₱{Number(product.price).toLocaleString()}
                  </span>
                </button>
              ))}
              <button
                onMouseDown={handleSearchSubmit}
                className="w-full px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-primary border-t border-base-200 hover:bg-primary/5 transition-colors text-center"
              >
                See all results for "{searchQuery}"
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;