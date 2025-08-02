const express = require('express');
const User = require('../models/User');
const { auth, adminOnly, selfOrAdmin } = require('../middleware/auth');
const {
  validateUserUpdate,
  validateDriverInfo,
  validateCustomerInfo
} = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      role, 
      status, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { isDeleted: false };
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const users = await User.find(query)
      .select('-password -emailVerificationToken -passwordResetToken')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await User.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers: total,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          inactiveUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          },
          suspendedUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
          },
          adminUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
          },
          driverUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'driver'] }, 1, 0] }
          },
          customerUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'customer'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRegistrations = await User.countDocuments({
      isDeleted: false,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get active users in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeInLastWeek = await User.countDocuments({
      isDeleted: false,
      lastActive: { $gte: sevenDaysAgo }
    });

    const result = stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      suspendedUsers: 0,
      adminUsers: 0,
      driverUsers: 0,
      customerUsers: 0
    };

    res.json({
      success: true,
      data: {
        ...result,
        recentRegistrations,
        activeInLastWeek
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/profile
// @desc    Get current user's profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -emailVerificationToken -passwordResetToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add computed fields
    const profile = {
      ...user,
      memberSince: user.createdAt,
      lastActive: user.lastLogin || user.createdAt,
      profileCompletion: calculateProfileCompletion(user)
    };

    res.json({
      success: true,
      data: { user: profile }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user's profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    
    // Only allow certain fields to be updated
    const allowedFields = ['name', 'profile', 'customerInfo', 'driverInfo', 'preferences'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Don't allow role/status/security field changes
    delete updateData.role;
    delete updateData.status;
    delete updateData.password;
    delete updateData.email;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/users/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isCurrentPasswordValid = await user.isValidPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to calculate profile completion
function calculateProfileCompletion(user) {
  let completion = 0;
  const totalFields = 10;

  // Basic fields (5 points each)
  if (user.name) completion += 10;
  if (user.email) completion += 10;
  if (user.profile?.phone) completion += 10;
  if (user.profile?.address) completion += 10;
  if (user.profile?.dateOfBirth) completion += 10;

  // Profile picture (10 points)
  if (user.profile?.profilePicture) completion += 10;

  // Role-specific fields (5 points each)
  if (user.role === 'customer' && user.customerInfo) {
    if (user.customerInfo.preferredPickupDays?.length > 0) completion += 10;
    if (user.customerInfo.wasteTypes?.length > 0) completion += 10;
    if (user.customerInfo.pickupLocation) completion += 10;
  }

  if (user.role === 'driver' && user.driverInfo) {
    if (user.driverInfo.licenseNumber) completion += 10;
    if (user.driverInfo.vehicleType) completion += 10;
    if (user.driverInfo.workingHours) completion += 10;
  }

  // Preferences (10 points)
  if (user.preferences) completion += 10;

  return Math.min(completion, 100);
}

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Self or Admin)
router.get('/:id', auth, selfOrAdmin, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: false
    })
      .select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user by ID
// @access  Private (Self or Admin)
router.put('/:id', auth, selfOrAdmin, validateUserUpdate, async (req, res) => {
  try {
    const updates = req.body;
    const targetUserId = req.params.id;

    // If not admin, restrict what can be updated
    if (req.user.role !== 'admin') {
      // Regular users can only update their profile info
      const allowedFields = ['name', 'profile', 'customerInfo', 'driverInfo'];
      const updateKeys = Object.keys(updates);
      const isValidUpdate = updateKeys.every(key => allowedFields.includes(key));

      if (!isValidUpdate) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your profile information'
        });
      }

      // Don't allow role/status changes by regular users
      delete updates.role;
      delete updates.status;
    }

    // Don't allow password updates through this endpoint
    delete updates.password;
    delete updates.emailVerificationToken;
    delete updates.passwordResetToken;

    const user = await User.findOneAndUpdate(
      { _id: targetUserId, isDeleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user by ID (soft delete)
// @access  Private (Admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const targetUserId = req.params.id;

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findOneAndUpdate(
      { _id: targetUserId, isDeleted: false },
      {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'inactive'
      },
      { new: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Update user status
// @access  Private (Admin only)
router.put('/:id/status', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const targetUserId = req.params.id;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or suspended'
      });
    }

    // Prevent admin from changing their own status
    if (req.user._id.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own status'
      });
    }

    const user = await User.findOneAndUpdate(
      { _id: targetUserId, isDeleted: false },
      { status },
      { new: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User status updated to ${status}`,
      data: { user }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private (Admin only)
router.put('/:id/role', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const targetUserId = req.params.id;

    if (!['customer', 'driver', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be customer, driver, or admin'
      });
    }

    // Prevent admin from changing their own role
    if (req.user._id.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    const user = await User.findOneAndUpdate(
      { _id: targetUserId, isDeleted: false },
      { role },
      { new: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: { user }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/users/bulk-update
// @desc    Bulk update users
// @access  Private (Admin only)
router.post('/bulk-update', auth, adminOnly, async (req, res) => {
  try {
    const { userIds, updates } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates object is required'
      });
    }

    // Don't allow updating sensitive fields
    delete updates.password;
    delete updates.emailVerificationToken;
    delete updates.passwordResetToken;

    // Prevent admin from updating themselves in bulk operations
    const currentAdminId = req.user._id.toString();
    const filteredUserIds = userIds.filter(id => id !== currentAdminId);

    if (filteredUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot perform bulk operations on your own account'
      });
    }

    const result = await User.updateMany(
      { 
        _id: { $in: filteredUserIds },
        isDeleted: false 
      },
      { $set: updates }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} users updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Bulk update users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
