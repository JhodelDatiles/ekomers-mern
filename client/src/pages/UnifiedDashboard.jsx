import { useState, useEffect, useCallback } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Heart,
  Settings,
  LogOut,
  Boxes,
  Users,
  ShieldCheck,
  Globe,
  User as UserIcon,
  MapPin,
  Lock,
  ChevronDown,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useSocket } from "../context/Socketcontext";
import { orderAPI } from "../services/api";
import toast from "react-hot-toast";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";

const UnifiedDashboard = () => {
  const { user, logout } = useAuth();
  const { wishlist } = useWishlist();
  const { cart } = useCart();
  const { chatUnread } = useSocket();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const [isSettingsOpen, setIsSettingsOpen] = useState(
    location.pathname.includes("settings"),
  );
  const isAdmin = user?.role === "admin";

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const data = await orderAPI.getUserOrders();
      let fetchedData = data;
      if (fetchedData?.orders) fetchedData = fetchedData.orders;
      else if (fetchedData?.data) fetchedData = fetchedData.data;
      setOrders(Array.isArray(fetchedData) ? fetchedData : []);
    } catch (err) {
      toast.error("COULD NOT FETCH ORDERS");
      console.error("DASHBOARD FETCH ERROR:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user, fetchOrders]);

  useEffect(() => {
    if (location.pathname.includes("settings")) setIsSettingsOpen(true);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const dashboardContext = {
    user,
    orders: Array.isArray(orders) ? orders : [],
    wishlist: Array.isArray(wishlist) ? wishlist : wishlist?.items || [],
    cart,
    isLoading,
    setOrders,
    fetchOrders,
  };

  // Admin sidebar navigation
  const adminLinks = [
    {
      name: "Admin Overview",
      path: "/admin",
      icon: <LayoutDashboard size={20} />,
    },
    { name: "Inventory", path: "/admin/products", icon: <Boxes size={20} /> },
    {
      name: "Global Orders",
      path: "/admin/orders",
      icon: <Package size={20} />,
    },
    {
      name: "Sales Report",
      path: "/admin/sales",
      icon: <TrendingUp size={20} />,
    },
    {
      name: "User Management",
      path: "/admin/users",
      icon: <Users size={20} />,
    },
    {
      name: "Support Chat",
      path: "/admin/chat",
      icon: <MessageCircle size={20} />,
      badge: chatUnread, // shows red dot when there are unread messages
    },
    {
      name: "Configuration",
      path: "/admin/configuration",
      icon: <Globe size={20} />,
    },
  ];

  // User sidebar navigation
  const userLinks = [
    {
      name: "Overview",
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: "My Cart",
      path: "/dashboard/cart",
      icon: <ShoppingCart size={20} />,
    },
    {
      name: "My Orders",
      path: "/dashboard/my-orders",
      icon: <Package size={20} />,
    },
    {
      name: "Wishlist",
      path: "/dashboard/wishlist",
      icon: <Heart size={20} />,
    },
  ];

  // Settings sublinks navigation
  const settingsSubLinks = [
    {
      name: "Profile",
      path: isAdmin ? "/admin/settings" : "/dashboard/settings",
      icon: <UserIcon size={16} />,
    },
    {
      name: "Addresses",
      path: "/dashboard/settings/addresses",
      icon: <MapPin size={16} />,
      hideForAdmin: true,
    },
    {
      name: "Privacy",
      path: isAdmin ? "/admin/settings/privacy" : "/dashboard/settings/privacy",
      icon: <Lock size={16} />,
    },
  ];

  if (!user || isLoading) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-base-200 font-sans">
      {/* SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col w-full md:w-72 bg-base-100 shadow-xl z-10 border-r border-base-300 transition-colors duration-300 ${isAdmin ? "border-primary/20" : ""}`}
      >
        {/* USER INFO HEADER */}
        <div className="p-6 border-b border-base-200">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-black opacity-50 uppercase tracking-tighter">
              {isAdmin ? "System Administrator" : "Customer Account"}
            </p>
            {isAdmin && (
              <ShieldCheck size={12} className="text-primary animate-pulse" />
            )}
          </div>
          <h2 className="text-xl font-black italic truncate uppercase tracking-tighter">
            {user?.username}
          </h2>
        </div>

        <nav className="p-4 space-y-1">
          {/* NAV LINKS */}
          {(isAdmin ? adminLinks : userLinks).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all group ${
                  isActive
                    ? "bg-primary text-primary-content shadow-lg shadow-primary/20"
                    : "hover:bg-base-200 opacity-70 hover:opacity-100"
                }`}
              >
                <span
                  className={`${isActive ? "scale-110" : "group-hover:scale-110"} transition-transform relative`}
                >
                  {item.icon}
                  {/* Unread badge — only shown when there are unread messages */}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full animate-pulse" />
                  )}
                </span>
                <span className="flex-1">{item.name}</span>
                {/* Numeric badge for chat unread count */}
                {item.badge > 0 && (
                  <span className="bg-error text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* SETTINGS DROPDOWN */}
          <div className="pt-1">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-bold transition-all group ${
                location.pathname.includes("settings")
                  ? "bg-base-200 text-primary"
                  : "hover:bg-base-200 opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings
                  size={20}
                  className={
                    location.pathname.includes("settings")
                      ? "animate-spin-slow"
                      : ""
                  }
                />
                Settings
              </div>
              <span
                className={`transition-transform duration-300 ${isSettingsOpen ? "rotate-180" : ""}`}
              >
                <ChevronDown size={16} />
              </span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 space-y-1 mt-1 ${isSettingsOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}
            >
              {settingsSubLinks
                .filter((sub) => !(isAdmin && sub.hideForAdmin))
                .map((sub) => {
                  const isSubActive = location.pathname === sub.path;
                  return (
                    <Link
                      key={sub.path}
                      to={sub.path}
                      className={`flex items-center gap-3 ml-6 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        isSubActive
                          ? "text-primary bg-primary/5"
                          : "opacity-60 hover:opacity-100 hover:bg-base-200"
                      }`}
                    >
                      {sub.icon}
                      {sub.name}
                    </Link>
                  );
                })}
            </div>
          </div>

          <div className="divider opacity-50 pt-4"></div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-error hover:bg-error/10 w-full transition-colors"
          >
            <LogOut size={18} /> Logout Session
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div
          className={`max-w-6xl mx-auto bg-base-100 p-6 rounded-3xl shadow-sm min-h-full border border-base-300 ${isAdmin ? "border-t-4 border-t-primary" : ""}`}
        >
          <Outlet context={dashboardContext} />
        </div>
      </main>
    </div>
  );
};

export default UnifiedDashboard;