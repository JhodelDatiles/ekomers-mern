import mongoose from 'mongoose';

const adminSettingsSchema = new mongoose.Schema({
  storeName: { 
    type: String, 
    default: "ShopHub",
    trim: true 
  },
  storeDescription: { 
    type: String, 
    default: "Elevating your lifestyle with curated collections and premium quality." 
  },

  newsletterTitle: { 
    type: String, 
    default: "Join our community" 
  },
  newsletterSubtitle: { 
    type: String, 
    default: "Get exclusive deals and the latest product updates delivered to your inbox." 
  },

  storeLogo: {
    url: { type: String, default: null },
    public_id: { type: String, default: null }
  },

  socialLinks: {
    facebook: { type: String, default: "#" },
    twitter: { type: String, default: "#" },
    instagram: { type: String, default: "#" }
  },

  paymentMethods: { 
    type: [String], 
    default: ["VISA", "MASTERCARD", "PAYPAL"] 
  },

  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  officeAddress: {
    street: { type: String, default: "" },
    barangay: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" }, 
    zipCode: { type: String, default: "" },
    country: { type: String, default: "Philippines" }
  }
}, { 
  timestamps: true 
});

const AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);

export default AdminSettings;