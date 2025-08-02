import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { COLORS, SIZES } from "../utils/theme";
import CustomButton from "../components/CustomButton";
import apiService from "../services/apiService";

export default function CustomerProfileScreen({ navigation }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notifications: {
      pickupReminders: true,
      driverUpdates: true,
      ecoTips: true,
      promotions: false,
    },
    preferences: {
      preferredPickupTime: "morning",
      wasteTypes: ["household", "recyclable"],
      frequencyPreference: "weekly",
    },
  });

  const [editedData, setEditedData] = useState({ ...profileData });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Defensive check for apiService
      if (!apiService || typeof apiService.getUserProfile !== 'function') {
        throw new Error('apiService.getUserProfile is not available');
      }
      
      const response = await apiService.getUserProfile();
      
      if (response.success) {
        const user = response.data.user;
        const formattedProfile = {
          name: user.name || "",
          email: user.email || "",
          phone: user.profile?.phone || "",
          address: user.profile?.address ? 
            `${user.profile.address.street || ""}, ${user.profile.address.city || ""}`.trim().replace(/^,\s*|,\s*$/, '') : "",
          notifications: user.preferences?.notifications || {
            pickupReminders: true,
            driverUpdates: true,
            ecoTips: true,
            promotions: false,
          },
          preferences: {
            preferredPickupTime: user.customerInfo?.preferredPickupTime || "morning",
            wasteTypes: user.customerInfo?.wasteTypes || ["household", "recyclable"],
            frequencyPreference: user.customerInfo?.frequencyPreference || "weekly",
          },
        };
        
        setProfileData(formattedProfile);
        setEditedData(formattedProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert("Error", "Failed to load profile data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    // Validate required fields
    if (!editedData.name.trim() || !editedData.email.trim()) {
      Alert.alert("Error", "Name and email are required fields");
      return;
    }

    try {
      setSaving(true);
      
      // Prepare profile data for API
      const updateData = {
        name: editedData.name.trim(),
        profile: {
          phone: editedData.phone.trim(),
          address: {
            street: editedData.address.split(',')[0]?.trim() || "",
            city: editedData.address.split(',')[1]?.trim() || ""
          }
        },
        preferences: {
          notifications: editedData.notifications
        },
        customerInfo: {
          preferredPickupTime: editedData.preferences.preferredPickupTime,
          wasteTypes: editedData.preferences.wasteTypes,
          frequencyPreference: editedData.preferences.frequencyPreference
        }
      };

      const response = await apiService.updateUserProfile(updateData);
      
      if (response.success) {
        setProfileData({ ...editedData });
        setIsEditMode(false);
        Alert.alert("Success", "Profile updated successfully!");
      } else {
        throw new Error(response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert("Error", error.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleCancelEdit = () => {
    setEditedData({ ...profileData });
    setIsEditMode(false);
  };

  const handleNotificationToggle = (key) => {
    setEditedData({
      ...editedData,
      notifications: {
        ...editedData.notifications,
        [key]: !editedData.notifications[key],
      },
    });
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "All password fields are required");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters long");
      return;
    }
    
    try {
      setSaving(true);
      const response = await apiService.changePassword({
        currentPassword,
        newPassword
      });
      
      if (response.success) {
        Alert.alert("Success", "Password changed successfully");
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        Alert.alert("Error", response.message || "Failed to change password");
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert("Error", "Failed to change password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDataExport = async () => {
    try {
      setSaving(true);
      const response = await apiService.exportUserData();
      
      if (response.success) {
        Alert.alert(
          "Data Export Successful", 
          "Your data has been exported successfully. The file will be sent to your registered email address within 24 hours."
        );
      } else {
        Alert.alert("Error", response.message || "Failed to export data");
      }
    } catch (error) {
      console.error('Data export error:', error);
      Alert.alert("Error", "Failed to export data. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    Alert.alert(
      "Account Deleted",
      "Your account has been scheduled for deletion. You will receive a confirmation email.",
      [
        {
          text: "OK",
          onPress: () => navigation.navigate("Welcome"),
        },
      ]
    );
  };

  const preferredTimeOptions = [
    { value: "morning", label: "Morning (8 AM - 12 PM)" },
    { value: "afternoon", label: "Afternoon (12 PM - 5 PM)" },
    { value: "evening", label: "Evening (5 PM - 8 PM)" },
  ];

  const frequencyOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  const renderPasswordModal = () => (
    <Modal visible={showPasswordModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Password</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={passwordData.currentPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
              placeholder="Enter current password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              value={passwordData.newPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
              placeholder="Enter new password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
            />
          </View>
          
          <View style={styles.modalButtonGroup}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowPasswordModal(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleChangePassword}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDeleteModal = () => (
    <Modal visible={showDeleteModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Delete Account</Text>
          <Text style={styles.modalMessage}>
            Are you sure you want to delete your account? This action cannot be undone.
            {"\n\n"}
            Your data will be permanently removed within 30 days.
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              if (isEditMode) {
                handleSaveProfile();
              } else {
                setIsEditMode(true);
              }
            }}
          >
            <Text style={styles.editButtonText}>
              {isEditMode ? "Save" : "Edit"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profileData.name.split(" ").map(n => n[0]).join("")}
            </Text>
          </View>
          <Text style={styles.customerName}>{profileData.name}</Text>
          <Text style={styles.customerEmail}>{profileData.email}</Text>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, !isEditMode && styles.inputDisabled]}
              value={isEditMode ? editedData.name : profileData.name}
              onChangeText={(text) =>
                setEditedData({ ...editedData, name: text })
              }
              editable={isEditMode}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={[styles.input, !isEditMode && styles.inputDisabled]}
              value={isEditMode ? editedData.email : profileData.email}
              onChangeText={(text) =>
                setEditedData({ ...editedData, email: text })
              }
              editable={isEditMode}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={[styles.input, !isEditMode && styles.inputDisabled]}
              value={isEditMode ? editedData.phone : profileData.phone}
              onChangeText={(text) =>
                setEditedData({ ...editedData, phone: text })
              }
              editable={isEditMode}
              placeholder="Enter your phone number"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Service Address</Text>
            <TextInput
              style={[styles.input, !isEditMode && styles.inputDisabled]}
              value={isEditMode ? editedData.address : profileData.address}
              onChangeText={(text) =>
                setEditedData({ ...editedData, address: text })
              }
              editable={isEditMode}
              placeholder="Enter your service address"
              placeholderTextColor={COLORS.textSecondary}
              multiline
            />
          </View>
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          
          {Object.entries(editedData.notifications).map(([key, value]) => (
            <View key={key} style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>
                  {key === "pickupReminders" && "Pickup Reminders"}
                  {key === "driverUpdates" && "Driver Updates"}
                  {key === "ecoTips" && "Eco Tips"}
                  {key === "promotions" && "Promotions & Offers"}
                </Text>
                <Text style={styles.switchDescription}>
                  {key === "pickupReminders" && "Get notified about upcoming pickups"}
                  {key === "driverUpdates" && "Receive driver location updates"}
                  {key === "ecoTips" && "Get personalized eco-friendly tips"}
                  {key === "promotions" && "Receive special offers and promotions"}
                </Text>
              </View>
              <Switch
                value={value}
                onValueChange={() => handleNotificationToggle(key)}
                trackColor={{
                  false: COLORS.border,
                  true: COLORS.primary + "60",
                }}
                thumbColor={value ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
          ))}
        </View>

        {/* Service Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Preferences</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Preferred Pickup Time</Text>
            <View style={styles.radioGroup}>
              {preferredTimeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.radioOption}
                  onPress={() =>
                    setEditedData({
                      ...editedData,
                      preferences: {
                        ...editedData.preferences,
                        preferredPickupTime: option.value,
                      },
                    })
                  }
                  disabled={!isEditMode}
                >
                  <View style={styles.radioButton}>
                    {editedData.preferences.preferredPickupTime === option.value && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Collection Frequency</Text>
            <View style={styles.radioGroup}>
              {frequencyOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.radioOption}
                  onPress={() =>
                    setEditedData({
                      ...editedData,
                      preferences: {
                        ...editedData.preferences,
                        frequencyPreference: option.value,
                      },
                    })
                  }
                  disabled={!isEditMode}
                >
                  <View style={styles.radioButton}>
                    {editedData.preferences.frequencyPreference === option.value && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {isEditMode ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelEditButtonText}>Cancel</Text>
              </TouchableOpacity>
              <CustomButton
                title="Save Changes"
                onPress={handleSaveProfile}
                style={styles.saveButton}
              />
            </View>
          ) : (
            <>
              <CustomButton
                title="Change Password"
                onPress={() => setShowPasswordModal(true)}
                variant="secondary"
                style={styles.actionButton}
              />
              <CustomButton
                title="Download Data"
                onPress={handleDataExport}
                variant="secondary"
                style={styles.actionButton}
              />
              <TouchableOpacity
                style={styles.deleteAccountButton}
                onPress={() => setShowDeleteModal(true)}
              >
                <Text style={styles.deleteAccountText}>Delete Account</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {renderPasswordModal()}
      {renderDeleteModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.large,
  },
  title: {
    fontSize: SIZES.fontHeader,
    fontWeight: "bold",
    color: COLORS.text,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.radiusMedium,
  },
  editButtonText: {
    color: COLORS.surface,
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: SIZES.extraLarge,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  avatarText: {
    fontSize: SIZES.fontExtraLarge,
    fontWeight: "bold",
    color: COLORS.surface,
  },
  customerName: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.small / 2,
  },
  customerEmail: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: SIZES.extraLarge,
  },
  sectionTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.large,
  },
  inputGroup: {
    marginBottom: SIZES.large,
  },
  inputLabel: {
    fontSize: SIZES.fontMedium,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputDisabled: {
    backgroundColor: COLORS.background,
    color: COLORS.textSecondary,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.large,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  switchInfo: {
    flex: 1,
    marginRight: SIZES.medium,
  },
  switchLabel: {
    fontSize: SIZES.fontMedium,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SIZES.small / 2,
  },
  switchDescription: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  radioGroup: {
    gap: SIZES.medium,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SIZES.small,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: SIZES.medium,
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
  },
  actionContainer: {
    marginTop: SIZES.large,
    marginBottom: SIZES.extraLarge,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SIZES.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.medium,
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
  },
  cancelEditButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    paddingVertical: SIZES.large,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  cancelEditButtonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
  },
  actionButton: {
    marginBottom: SIZES.medium,
  },
  deleteAccountButton: {
    alignSelf: "center",
    paddingVertical: SIZES.large,
    paddingHorizontal: SIZES.large,
  },
  deleteAccountText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.error,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.large,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.extraLarge,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.large,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: SIZES.extraLarge,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SIZES.medium,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SIZES.large,
    borderRadius: SIZES.radiusMedium,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  cancelButtonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.surface,
    fontWeight: "600",
  },
});
