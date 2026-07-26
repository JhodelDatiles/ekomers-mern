import User from '../../models/userSchema.js';

// GET /api/admin/users
// Query params: page, limit, search, role
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = 'all',
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      users,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalUsers / limitNum),
        totalUsers,
        limit: limitNum,
        hasMore: skip + users.length < totalUsers,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const adminUpdateUser = async (req, res) => {
  try {
    // Only these fields may ever be touched through this endpoint.
    // Anything else in req.body (password, tokenVersion, isVerified,
    // verificationCode, etc.) is silently ignored, not applied.
    const ALLOWED_FIELDS = ['username', 'fullName', 'phone', 'gender', 'role'];

    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.role && !['user', 'admin'].includes(updates.role)) {
      return res.status(400).json({ message: 'Invalid role value' });
    }

    if (req.params.id === req.user.id && updates.role && updates.role !== 'admin') {
      return res.status(400).json({ message: 'You cannot demote yourself from Admin!' });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
};

export const adminDeleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Admins cannot delete their own accounts!' });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'User deleted by admin' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Delete failed' });
  }
};