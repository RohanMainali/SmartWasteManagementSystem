import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { COLORS, SIZES } from "../utils/theme";

export default function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    notifications: true,
    locationTracking: true,
    autoReminders: false,
    darkMode: false,
  });

  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          id: "profile",
          title: "Edit Profile",
          icon: "👤",
          action: "editProfile",
        },
        {
          id: "password",
          title: "Change Password",
          icon: "🔐",
          action: "changePassword",
        },
        {
          id: "privacy",
          title: "Privacy Settings",
          icon: "🔒",
          action: "privacy",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          id: "notifications",
          title: "Notification Settings",
          icon: "🔔",
          action: "notificationSettings",
        },
        {
          id: "location",
          title: "Location Tracking",
          icon: "📍",
          type: "toggle",
          setting: "locationTracking",
        },
        {
          id: "reminders",
          title: "Auto Reminders",
          icon: "⏰",
          type: "toggle",
          setting: "autoReminders",
        },
        {
          id: "theme",
          title: "Dark Mode",
          icon: "🌙",
          type: "toggle",
          setting: "darkMode",
        },
      ],
    },
    {
      title: "Support",
      items: [
        { id: "help", title: "Help Center", icon: "❓", action: "help" },
        {
          id: "contact",
          title: "Contact Support",
          icon: "📞",
          action: "contact",
        },
        {
          id: "feedback",
          title: "Send Feedback",
          icon: "💬",
          action: "feedback",
        },
        {
          id: "terms",
          title: "Terms & Conditions",
          icon: "📄",
          action: "terms",
        },
      ],
    },
    {
      title: "App",
      items: [
        {
          id: "version",
          title: "App Version",
          icon: "📱",
          subtitle: "1.0.0",
          action: "version",
        },
        {
          id: "logout",
          title: "Logout",
          icon: "🚪",
          action: "logout",
          danger: true,
        },
      ],
    },
  ];

  const handleToggleSetting = (settingKey) => {
    setSettings((prev) => ({
      ...prev,
      [settingKey]: !prev[settingKey],
    }));
  };

  const handleSettingAction = (action) => {
    switch (action) {
      case "editProfile":
        Alert.alert("Edit Profile", "Profile editing feature coming soon!");
        break;
      case "changePassword":
        Alert.alert("Change Password", "Password change feature coming soon!");
        break;
      case "privacy":
        Alert.alert("Privacy Settings", "Privacy settings coming soon!");
        break;
      case "notificationSettings":
        navigation.navigate("NotificationSettings");
        break;
      case "help":
        Alert.alert(
          "Help Center",
          "Help documentation will be available soon!"
        );
        break;
      case "contact":
        Alert.alert("Contact Support", "Support contact feature coming soon!");
        break;
      case "feedback":
        Alert.alert("Send Feedback", "Feedback feature coming soon!");
        break;
      case "terms":
        Alert.alert(
          "Terms & Conditions",
          "Terms and conditions will be displayed here!"
        );
        break;
      case "version":
        Alert.alert(
          "App Version",
          "Smart Waste Manager v1.0.0\nBuilt with React Native & Expo"
        );
        break;
      case "logout":
        handleLogout();
        break;
      default:
        Alert.alert(
          "Feature Coming Soon",
          "This feature will be available soon!"
        );
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => navigation.navigate("Welcome"),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your app preferences</Text>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <View key={item.id}>
                  <TouchableOpacity
                    style={[
                      styles.settingItem,
                      item.danger && styles.dangerItem,
                    ]}
                    onPress={() =>
                      item.type === "toggle"
                        ? handleToggleSetting(item.setting)
                        : handleSettingAction(item.action)
                    }
                  >
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingIcon}>{item.icon}</Text>
                      <View style={styles.settingTextContainer}>
                        <Text
                          style={[
                            styles.settingTitle,
                            item.danger && styles.dangerText,
                          ]}
                        >
                          {item.title}
                        </Text>
                        {item.subtitle && (
                          <Text style={styles.settingSubtitle}>
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.settingRight}>
                      {item.type === "toggle" ? (
                        <Switch
                          value={settings[item.setting]}
                          onValueChange={() =>
                            handleToggleSetting(item.setting)
                          }
                          trackColor={{
                            false: "#E0E0E0",
                            true: COLORS.primary + "50",
                          }}
                          thumbColor={
                            settings[item.setting] ? COLORS.primary : "#f4f3f4"
                          }
                        />
                      ) : (
                        <Text style={styles.settingArrow}>›</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  {itemIndex < section.items.length - 1 && (
                    <View style={styles.separator} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
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
    marginBottom: SIZES.large,
    alignItems: "center",
  },
  title: {
    fontSize: SIZES.fontHeader,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  subtitle: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  section: {
    marginBottom: SIZES.large,
  },
  sectionTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.medium,
  },
  sectionContent: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
  },
  dangerItem: {
    backgroundColor: COLORS.error + "10",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: SIZES.medium,
    width: 24,
    textAlign: "center",
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: SIZES.fontMedium,
    fontWeight: "500",
    color: COLORS.text,
  },
  settingSubtitle: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dangerText: {
    color: COLORS.error,
  },
  settingRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  settingArrow: {
    fontSize: 20,
    color: COLORS.textLight,
    fontWeight: "300",
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.background,
    marginHorizontal: SIZES.large,
  },
});
