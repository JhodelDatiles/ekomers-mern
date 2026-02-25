import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    
    // PROFILE INFO
    fullName: { type: String, default: "" }, 
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: "" },
    dob: { type: Date }, 
    phone: { type: String, default: "" },
    profilePic: {
        url: { type: String, default: "" },
        publicId: { type: String, default: "" }
    },

    // 🚀 NEW: For Security & Verification
    verificationCode: { type: String },
    codeExpires: { type: Date },
    tokenVersion: { type: Number, default: 0 },

// Inside the address array of userSchema
address: [{
  fullName: { type: String, required: true },
  contactNumber: { type: String, required: true }, // Unified name
  street: { type: String, required: true },
  barangay: { type: String, required: true },     // Added
  city: { type: String, required: true },
  postalCode: { type: String, required: true },   // Standardized
  label: { type: String, default: "Home" },
  latitude: Number,
  longitude: Number,
  isDefault: { type: Boolean, default: false },
  address: String // The pre-concatenated string for easy display
}]
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;