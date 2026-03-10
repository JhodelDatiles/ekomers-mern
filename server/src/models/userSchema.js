import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    fullName: { type: String, default: "" }, 
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: "" },
    dob: { type: Date }, 
    phone: { type: String, default: "" },
    profilePic: {
        url: { type: String, default: "" },
        publicId: { type: String, default: "" }
    },
    tokenVersion: { type: Number, default: 0 },
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
    }],
    isVerified: { type: Boolean, default: false }, // ADD THIS
    verificationToken: { type: String }, // Add this for email links
        verificationCode: { type: String },  // Keep this for 6-digit reset codes
        codeExpires: { type: Date },
      },
      { timestamps: true }
    );
    userSchema.pre('save', async function () {
      // 1. Only hash if the password actually changed
      if (!this.isModified('password')) return;

      try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        // 💡 No next() call needed here!
      } catch (error) {
        // 2. Simply throw the error; Mongoose will catch it
        throw error; 
      }
});

const User = mongoose.model('User', userSchema);
export default User;