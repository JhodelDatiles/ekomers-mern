import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, ToastBar } from "react-hot-toast";

// BLOCK 1: CONTEXT & AUTH IMPORTS
import { AuthProvider } from "./context/AuthContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import { CartProvider } from "./context/CartContext.jsx"; 
import api from './services/api'
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
import SalesReport from "./pages/adminpages/SalesReport.jsx"; // 👈 Add this

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

function App() {
  useEffect(() => {
    const applyGlobalSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data) {
          // 1. Apply Tab Title
          document.title = data.storeName || "My Store";
          
          // 2. Apply Favicon
          if (data.logoUrl) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = data.logoUrl;
          }
        }
      } catch (err) {
        console.error("Settings load failed", err);
      }
    };
    applyGlobalSettings();
  }, []);
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <Router>
            <Toaster
              position="top-right"
              reverseOrder={false}
              containerStyle={{ top: 70, right: 20 }}
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: '16px',
                  padding: '16px',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  fontStyle: 'italic',
                  border: '1px solid oklch(var(--p) / 0.2)',
                  background: '#121212',
                  color: '#fff'
                }
              }}
            >
              {(t) => (
                <ToastBar
                  toast={t}
                  style={{
                    ...t.style,
                    animation: t.visible
                      ? 'slideInRight 0.35s ease-out'
                      : 'slideOutRight 0.35s ease-in forwards',
                  }}
                />
              )}
            </Toaster>
            
            <Navbar />

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
                  <Route path="sales" element={<SalesReport />} /> {/* 👈 Add this line */}
                  <Route path="users" element={<AdminUserManagement />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="settings/privacy" element={<AdminPrivacySettings />} /> {/* SHARED COMPONENT */}
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
                  
                  {/* SETTINGS NESTED ROUTES */}
                  <Route path="settings" element={<UserSettings />} />
                  <Route path="settings/addresses" element={<UserAddressesSettings />} />
                  <Route path="settings/privacy" element={<PrivacySettings />} /> {/* SHARED COMPONENT */}
                </Route>

                {/* LOGISTICS & CHECKOUT FLOW */}
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
              </Route>

              {/* 404 HANDLER */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;