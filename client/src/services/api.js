import axios from 'axios';

const API_URL = import.meta.env.VITE_URL_PROD || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for sending cookies
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420', // This bypasses the ngrok splash screen
  },
});

// This helps us "queue" requests that failed while the token was refreshing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const publicEndpoints = [
      '/auth/login', 
      '/auth/register', 
      '/auth/refresh-token',
      '/auth/logout'
    ];

    const requestUrl = originalRequest.url || '';
    const isPublicEndpoint = publicEndpoints.some(endpoint => {
      return requestUrl.endsWith(endpoint) || requestUrl.includes(endpoint);
    });
    // 🚀 ADD THIS: If it's a public endpoint, don't try to refresh!
    if (isPublicEndpoint) {
      return Promise.reject(error);
    }

if (error.response?.status === 401 && !originalRequest._retry) {
      // 1. Silent check: If we are already checking current user or refreshing, don't loop
      if (requestUrl.includes('/auth/refresh-token')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest)).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Only log refresh attempt for non-auth-check requests to keep console clean
        if (!requestUrl.includes('/auth/me')) {
          console.log('[API] Session expired, attempting refresh...');
        }
        
        const response = await api.post('/auth/refresh-token');
        
        const syncEvent = new CustomEvent('auth-synchronized', { 
          detail: response.data.user 
        });
        window.dispatchEvent(syncEvent);
        
        isRefreshing = false;
        processQueue(null); 
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        
        // 2. Only log "failed" and redirect to login if it wasn't a silent initial check
        if (!requestUrl.includes('/auth/me')) {
          console.error('[API] Refresh failed, session cleared');
          localStorage.removeItem('user');
          if (!window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/register')) {
            window.location.href = '/login'; 
          }
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  verifyEmail: async (token) => {
    const response = await api.get(`/auth/verify-email/${token}`);
    return response.data;
  },
  resendVerification: async (email) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (data) => {
    // data includes email, code, and newPassword
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  refreshToken: async () => {
    const response = await api.post('/auth/refresh-token');
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  updateProfile: async (userData) => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },
  requestSecurityCode: async (data) => {
    const response = await api.post('/users/request-code', data);
    return response.data;
  },
  verifyPasswordChange: async (data) => {
    const response = await api.post('/users/verify-password', data);
    return response.data;
  },
  verifyAccountDeletion: async (data) => {
    const response = await api.post('/users/verify-delete', data);
    return response.data;
  },
};

// Product API
export const productAPI = {
  getProducts: async (params) => {
    const response = await api.get('/products', { params });
    return response.data;
  },
  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get('/products/categories');
    return response.data;
  },
};

// Wishlist API
export const wishlistAPI = {
  getWishlist: async () => {
    const response = await api.get('/wishlist');
    return response.data;
  },
  toggleWishlist: async (productId) => {
    const response = await api.post('/wishlist/toggle', { productId });
    return response.data;
  },
};

// Cart API
export const cartAPI = {
  getCart: async () => {
    const response = await api.get('/cart');
    return response.data;
  },
  addToCart: async (item) => {
    const response = await api.post('/cart', item);
    return response.data;
  },
// Cart API section in your api.js
updateCartItem: async (itemId, quantity) => {
  // Try adding 'update' to the path if your backend route is router.put('/update/:itemId')
  // Or ensure your backend is actually listening on PUT /api/cart/:itemId
  const response = await api.put(`/cart/${itemId}`, { quantity }); 
  return response.data;
},
  removeFromCart: async (itemId) => {
    const response = await api.delete(`/cart/${itemId}`);
    return response.data;
  },
  // 🚀 NEW: Clear entire cart from database
  clearCart: async () => {
    const response = await api.delete('/cart/clear');
    return response.data;
  },
};

// Order API
export const orderAPI = {
  createCheckoutSession: async (orderData) => {
    const response = await api.post('/orders/checkout-session', orderData);
    return response.data; 
  },
  getUserOrders: async (params) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },
  getOrderById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  // 🚀 NEW LOGISTICS ACTIONS
  confirmOrderDelivery: async (orderId) => {
    const response = await api.put(`/orders/${orderId}/confirm-delivery`);
    return response.data;
  },
  cancelOrder: async (orderId, reason) => {
    const response = await api.put(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  },
  confirmQrPhOrder: async ({ paymentIntentId }) => {
    const response = await api.post('/orders/confirm-qrph', { paymentIntentId });
    return response.data;
  },
  deleteOrder: async (orderId) => {
    const response = await api.delete(`/orders/${orderId}`);
    return response.data;
  },
  getOrderByPaymentIntent: async (paymentIntentId) => {
    const response = await api.get(`/orders/by-intent/${paymentIntentId}`);
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getAdminOrders: async () => {
    const response = await api.get('/admin/orders');
    return response.data;
  },
  updateOrderStatus: async (id, status) => {
    const response = await api.put(`/admin/orders/${id}`, { status });
    return response.data;
  }
};

// Payment API
export const paymentAPI = {
  createQrPhPayment: async (data) => {
    const response = await api.post('/payment/qrph', data);
    return response.data;
  },
  checkQrPhStatus: async (paymentIntentId) => {
    const response = await api.get(`/payment/qrph/status/${paymentIntentId}`);
    return response.data;
  },
  getOrderByPaymentIntent: async (paymentIntentId) => {
    const response = await api.get(`/payment/qrph/by-intent/${paymentIntentId}`);
    return response.data;
  },
  confirmQrPhOrder: async ({ paymentIntentId }) => {
    const response = await api.post('/payment/qrph/confirm', { paymentIntentId });
    return response.data;
  },
};

// Review API
export const reviewAPI = {
  createReview: async (reviewData) => {
    const response = await api.post('/reviews', reviewData);
    return response.data;
  },
  getProductReviews: async (productId) => {
    const response = await api.get(`/reviews/product/${productId}`);
    return response.data;
  },
  updateReview: async (id, reviewData) => {
    const response = await api.put(`/reviews/${id}`, reviewData);
    return response.data;
  },
  deleteReview: async (id) => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  },
};

// Admin User API
export const adminUserAPI = {
  getAllUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },
  getUserById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },
  updateUser: async (id, userData) => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
};

// Global Settings API
export const settingsAPI = {
  getSettings: async () => {
    const response = await api.get('/settings'); 
    return response.data;
  },
  updateSettings: async (settingsData) => {
    const response = await api.put('/settings', settingsData); 
    return response.data;
  },
};

// Admin Product API
export const adminProductAPI = {
  getProducts: async (params = {}) => {
    const response = await api.get('/admin/products', { params });
    return response.data;
  },
  createProduct: async (productData) => {
    const response = await api.post('/admin/products', productData);
    return response.data;
  },
  updateProduct: async (id, productData) => {
    const response = await api.put(`/admin/products/${id}`, productData);
    return response.data;
  },
  deleteProduct: async (id) => {
    const response = await api.delete(`/admin/products/${id}`);
    return response.data;
  },
};

// Admin Order API
export const adminOrderAPI = {
  getAllOrders: async (params) => {
    const response = await api.get('/admin/orders', { params });
    return response.data;
  },
  // All users who have orders (with total count per user)
  getOrderUsers: async (params) => {
    const response = await api.get('/admin/orders/users', { params });
    return response.data;
  },
  // Paginated orders for a specific user
  getOrdersByUser: async (userId, params) => {
    const response = await api.get(`/admin/orders/by-user/${userId}`, { params });
    return response.data;
  },
  updateOrderStatus: async (id, statusData) => {
    const response = await api.put(`/admin/orders/${id}`, statusData);
    return response.data;
  },
};

// Upload API
export const uploadAPI = {
  uploadSingle: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  uploadMultiple: async (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file); 
    });
    const response = await api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      withCredentials: true 
    });
    return response.data;
  },
  deleteImage: async (publicId) => {
    const response = await api.delete('/upload/delete', {
      data: { publicId },
    });
    return response.data;
  },
};

// Admin Attribute API
export const adminAttributeAPI = {
  getAttributes: async () => {
    const response = await api.get('/admin/attributes');
    return response.data;
  },
  addAttribute: async (attrData) => {
    const response = await api.post('/admin/attributes', attrData);
    return response.data;
  },
  deleteAttribute: async (id) => {
    const response = await api.delete(`/admin/attributes/${id}`);
    return response.data;
  },
};

// Map API
export const mapAPI = {
  autocomplete: async (text) => {
    const response = await api.get('/map/address-autocomplete', {
      params: { text }
    });
    return response.data;
  },
};

export const adminSalesAPI = {
  getSalesReport: async (view = 'day') => {
    const response = await api.get(`/admin/sales-report`, {
      params: { view } 
    });
    return response.data;
  },
};

export const chatAPI = {
  // Get or create a conversation for a specific order
  getOrCreateConversation: async (orderId) => {
    const response = await api.post('/chat/conversations', { orderId });
    return response.data;
  },
  // Get all conversations for the logged-in user
  getUserConversations: async () => {
    const response = await api.get('/chat/conversations');
    return response.data;
  },
  // Admin: get all conversations across all users
  getAllConversations: async () => {
    const response = await api.get('/chat/admin/conversations');
    return response.data;
  },
  // Get messages for a conversation
  getMessages: async (conversationId) => {
    const response = await api.get(`/chat/conversations/${conversationId}/messages`);
    return response.data;
  },
  // Send a message
  sendMessage: async (conversationId, content) => {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, { content });
    return response.data;
  },
  // Mark conversation as read
  markAsRead: async (conversationId) => {
    const response = await api.put(`/chat/conversations/${conversationId}/read`);
    return response.data;
  },
  // Admin: close a conversation
  closeConversation: async (conversationId) => {
    const response = await api.put(`/chat/admin/conversations/${conversationId}/close`);
    return response.data;
  },
  // Get unread message count
  getUnreadCount: async () => {
    const response = await api.get('/chat/unread-count');
    return response.data;
  },
};
export default api;