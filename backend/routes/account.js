const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Notification = require('../models/Notification');
const CollectionRequest = require('../models/CollectionRequest');

// @route   GET /api/account/settings
// @desc    Get account settings and preferences
// @access  Private
router.get('/settings', auth, async (req, res) => {
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

    // Get account statistics
    const stats = await getAccountStatistics(req.user._id, user.role);

    const accountSettings = {
      profile: {
        name: user.name,
        email: user.email,
        phone: user.profile?.phone || '',
        address: user.profile?.address || {},
        profilePicture: user.profile?.profilePicture || null,
        dateOfBirth: user.profile?.dateOfBirth || null
      },
      security: {
        twoFactorEnabled: user.security?.twoFactorEnabled || false,
        lastPasswordChange: user.security?.lastPasswordChange || user.createdAt,
        loginHistory: user.security?.loginHistory || [],
        activeDevices: user.security?.activeDevices || []
      },
      preferences: {
        notifications: user.preferences?.notifications || {
          email: true,
          push: true,
          sms: false,
          collectionReminders: true,
          promotions: false,
          newsletter: true
        },
        language: user.preferences?.language || 'en',
        timezone: user.preferences?.timezone || 'UTC',
        theme: user.preferences?.theme || 'light',
        privacy: user.preferences?.privacy || {
          profileVisibility: 'private',
          dataSharing: false,
          analytics: true
        }
      },
      account: {
        memberSince: user.createdAt,
        lastLogin: user.lastLogin,
        status: user.status,
        role: user.role,
        emailVerified: user.emailVerified,
        stats
      }
    };

    res.json({
      success: true,
      data: accountSettings
    });

  } catch (error) {
    console.error('Get account settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching account settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/account/settings
// @desc    Update account settings and preferences
// @access  Private
router.put('/settings', auth, async (req, res) => {
  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({
        success: false,
        message: 'Setting type and data are required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let updateData = {};

    switch (type) {
      case 'profile':
        updateData = {
          name: data.name,
          'profile.phone': data.phone,
          'profile.address': data.address,
          'profile.dateOfBirth': data.dateOfBirth
        };
        break;

      case 'notifications':
        updateData = {
          'preferences.notifications': data
        };
        break;

      case 'privacy':
        updateData = {
          'preferences.privacy': data
        };
        break;

      case 'general':
        updateData = {
          'preferences.language': data.language,
          'preferences.timezone': data.timezone,
          'preferences.theme': data.theme
        };
        break;

      case 'security':
        // Handle security settings separately
        if (data.twoFactorEnabled !== undefined) {
          updateData['security.twoFactorEnabled'] = data.twoFactorEnabled;
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid setting type'
        });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update account settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/account/driver-profile
// @desc    Update driver-specific profile information
// @access  Private (Driver only)
router.put('/driver-profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only for drivers'
      });
    }

    const { licenseNumber, vehicleType, experience, emergencyContact } = req.body;
    
    const updateData = {};
    
    if (licenseNumber && licenseNumber !== 'PENDING') {
      updateData['driverInfo.licenseNumber'] = licenseNumber.trim();
    }
    
    if (vehicleType) {
      updateData['driverInfo.vehicleType'] = vehicleType;
    }
    
    if (experience !== undefined) {
      updateData['driverInfo.experience'] = experience;
    }
    
    if (emergencyContact) {
      if (emergencyContact.name) updateData['driverInfo.emergencyContact.name'] = emergencyContact.name;
      if (emergencyContact.phone) updateData['driverInfo.emergencyContact.phone'] = emergencyContact.phone;
      if (emergencyContact.relationship) updateData['driverInfo.emergencyContact.relationship'] = emergencyContact.relationship;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    res.json({
      success: true,
      message: 'Driver profile updated successfully',
      data: {
        driverInfo: updatedUser.driverInfo,
        profileComplete: updatedUser.driverInfo.licenseNumber !== 'PENDING'
      }
    });

  } catch (error) {
    console.error('Update driver profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating driver profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/account/deactivate
// @desc    Deactivate user account
// @access  Private
router.post('/deactivate', auth, async (req, res) => {
  try {
    const { reason, feedback, password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.isValidPassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check for active collections
    const activeCollections = await CollectionRequest.countDocuments({
      customerId: req.user._id,
      status: { $in: ['pending', 'confirmed', 'in_progress'] }
    });

    if (activeCollections > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate account with ${activeCollections} active collection(s). Please complete or cancel them first.`
      });
    }

    // Deactivate account
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        status: 'inactive',
        'account.deactivatedAt': new Date(),
        'account.deactivationReason': reason,
        'account.deactivationFeedback': feedback
      }
    });

    // Create notification for admin
    await Notification.create({
      userId: req.user._id,
      type: 'account',
      title: 'Account Deactivated',
      message: `User ${user.name} has deactivated their account`,
      data: { reason, feedback }
    });

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    console.error('Account deactivation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/account/delete
// @desc    Request account deletion
// @access  Private
router.post('/delete', auth, async (req, res) => {
  try {
    const { password, confirmation } = req.body;

    if (!password || confirmation !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Password and deletion confirmation required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.isValidPassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check for active collections
    const activeCollections = await CollectionRequest.countDocuments({
      customerId: req.user._id,
      status: { $in: ['pending', 'confirmed', 'in_progress'] }
    });

    if (activeCollections > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete account with ${activeCollections} active collection(s). Please complete or cancel them first.`
      });
    }

    // Mark for deletion (admin review required)
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'account.deletionRequested': true,
        'account.deletionRequestedAt': new Date(),
        status: 'pending_deletion'
      }
    });

    // Create notification for admin
    await Notification.create({
      userId: req.user._id,
      type: 'account',
      title: 'Account Deletion Requested',
      message: `User ${user.name} has requested account deletion`,
      data: { requestedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'Account deletion request submitted. Your account will be reviewed and deleted within 30 days.'
    });

  } catch (error) {
    console.error('Account deletion request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing deletion request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/account/export
// @desc    Export user data
// @access  Private
router.get('/export', auth, async (req, res) => {
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

    // Get user's collections
    const collections = await CollectionRequest.find({ customerId: req.user._id })
      .populate('driverId', 'name')
      .lean();

    // Get user's notifications
    const notifications = await Notification.find({ userId: req.user._id })
      .lean();

    const exportData = {
      account: {
        ...user,
        exportedAt: new Date(),
        exportVersion: '1.0'
      },
      collections: collections.map(collection => ({
        id: collection._id,
        status: collection.status,
        wasteTypes: collection.wasteTypes,
        scheduledDate: collection.scheduledDate,
        address: collection.address,
        createdAt: collection.createdAt,
        completedAt: collection.completedAt,
        driver: collection.driverId?.name || null
      })),
      notifications: notifications.map(notification => ({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
        read: notification.read
      })),
      metadata: {
        totalCollections: collections.length,
        totalNotifications: notifications.length,
        accountAge: Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24)),
        lastLogin: user.lastLogin
      }
    };

    res.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to get account statistics
async function getAccountStatistics(userId, userRole) {
  try {
    const stats = {
      totalCollections: 0,
      completedCollections: 0,
      totalNotifications: 0,
      unreadNotifications: 0
    };

    if (userRole === 'customer') {
      const collectionStats = await CollectionRequest.aggregate([
        { $match: { customerId: userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            }
          }
        }
      ]);

      if (collectionStats.length > 0) {
        stats.totalCollections = collectionStats[0].total;
        stats.completedCollections = collectionStats[0].completed;
      }
    }

    const notificationStats = await Notification.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: {
              $cond: [{ $eq: ['$read', false] }, 1, 0]
            }
          }
        }
      }
    ]);

    if (notificationStats.length > 0) {
      stats.totalNotifications = notificationStats[0].total;
      stats.unreadNotifications = notificationStats[0].unread;
    }

    return stats;
  } catch (error) {
    console.error('Error calculating account statistics:', error);
    return {
      totalCollections: 0,
      completedCollections: 0,
      totalNotifications: 0,
      unreadNotifications: 0
    };
  }
}

module.exports = router;
