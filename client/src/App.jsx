import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster, ToastBar } from "react-hot-toast";

// BLOCK 1: CONTEXT & AUTH IMPORTS
import { AuthProvider } from "./context/AuthContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { SocketProvider } from "./context/Socketcontext.jsx";
import api from "./services/api";
import ProtectedRoutes from "./components/ProtectedRoutes.jsx";

// BLOCK 2: SHARED COMPONENTS
import Navbar from "./components/NavBar.jsx";

// BLOCK 3: PUBLIC PAGES
import LandingPage from "./pages/LandingPage.jsx";
import Login from "./pages/LoginPage.jsx";
import Register from "./pages/RegisterPage.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

// BLOCK 4: ADMIN PAGES
import AdminDashboardOverview from "./pages/adminpages/AdminDashboardOverview.jsx";
import AdminProducts from "./pages/adminpages/AdminInventory.jsx";
import AdminOrders from "./pages/adminpages/AdminOrders.jsx";
import AdminUserManagement from "./pages/adminpages/AdminUserManagement.jsx";
import AdminSettings from "./pages/adminpages/AdminSettings.jsx";
import AdminConfiguration from "./pages/adminpages/AdminConfiguration.jsx";
import AdminPrivacySettings from "./pages/adminpages/AdminPrivacySettings.jsx";
import SalesReport from "./pages/adminpages/SalesReport.jsx";
import AdminChatPage from "./pages/adminpages/Adminchatpage.jsx";

// BLOCK 5: USER PAGES
import UnifiedDashboard from "./pages/UnifiedDashboard.jsx";
import { DashboardOverview } from "./pages/userpages/DashboardOverview.jsx";
import { WishlistPage } from "./pages/userpages/WishListPage.jsx";
import UserSettings from "./pages/userpages/UserSettings.jsx";
import CartPage from "./pages/userpages/CartPage.jsx";
import UserAddressesSettings from "./pages/userpages/UserAddressesSettings.jsx";
import PrivacySettings from "./pages/userpages/PrivacySettings.jsx";
import UserOrdersPage from "./pages/userpages/UserOrdersPage.jsx";

// BLOCK 6: CHECKOUT & PAYMENT PAGES
import Checkout from "./pages/userpages/Checkout.jsx";
import PaymentSuccess from "./pages/userpages/PaymentSuccess.jsx";

// BLOCK 7: AI CHAT WIDGET
import AIChatWidget from "./components/Aichatwidget.jsx";

// ── Inner component keeps useEffect inside Router context ──
function AppInner() {
  useEffect(() => {
    const applyGlobalSettings = async () => {
      try {
        const { data } = await api.get("/settings");
        if (data) {
          document.title = data.storeName || "MN+LA";
          const iconUrl = data.storeLogo?.url;
          if (iconUrl) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
              link = document.createElement("link");
              link.rel = "icon";
              document.head.appendChild(link);
            }
            link.href = iconUrl;
          }
          const meta = document.querySelector('meta[name="description"]');
          if (meta && data.storeDescription) {
            meta.setAttribute("content", data.storeDescription);
          }
        }
      } catch (err) {
        console.error("Settings load failed", err);
      }
    };
    applyGlobalSettings();
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{ top: 70, right: 20 }}
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "16px",
            padding: "16px",
            fontWeight: "900",
            textTransform: "uppercase",
            fontSize: "11px",
            letterSpacing: "0.1em",
            fontStyle: "italic",
            border: "1px solid oklch(var(--p) / 0.2)",
            background: "#121212",
            color: "#fff",
          },
        }}
      >
        {(t) => (
          <ToastBar
            toast={t}
            style={{
              ...t.style,
              animation: t.visible
                ? "slideInRight 0.35s ease-out"
                : "slideOutRight 0.35s ease-in forwards",
            }}
          />
        )}
      </Toaster>

      <Navbar />

      {/* AI Support Bot — floats bottom-right on every page, hidden for admins */}
      <AIChatWidget />

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ADMIN ONLY ROUTES */}
        <Route element={<ProtectedRoutes allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<UnifiedDashboard />}>
            <Route index element={<AdminDashboardOverview />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="sales" element={<SalesReport />} />
            <Route path="users" element={<AdminUserManagement />} />
            <Route path="chat" element={<AdminChatPage />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="settings/privacy" element={<AdminPrivacySettings />} />
            <Route path="configuration" element={<AdminConfiguration />} />
          </Route>
        </Route>

        {/* USER & ADMIN PROTECTED ROUTES */}
        <Route element={<ProtectedRoutes allowedRoles={["user", "admin"]} />}>
          <Route path="/dashboard" element={<UnifiedDashboard />}>
            <Route index element={<DashboardOverview />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="my-orders" element={<UserOrdersPage />} />
            <Route path="settings" element={<UserSettings />} />
            <Route
              path="settings/addresses"
              element={<UserAddressesSettings />}
            />
            <Route path="settings/privacy" element={<PrivacySettings />} />
          </Route>

          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
        </Route>

        {/* 404 HANDLER */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          {/* SocketProvider inside AuthProvider — needs user to connect */}
          <SocketProvider>
            <Router>
              <AppInner />
            </Router>
          </SocketProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;