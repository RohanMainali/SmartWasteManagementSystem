import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { COLORS, SIZES } from "../utils/theme";
import CustomButton from "../components/CustomButton";
import apiService from "../services/apiService";

export default function ReportIssueScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("medium");
  const [loading, setLoading] = useState(false);

  const issueTypes = [
    { id: "missed-pickup", label: "Missed Pickup", icon: "📅" },
    { id: "vehicle-issue", label: "Vehicle Issue", icon: "🚛" },
    { id: "driver-behavior", label: "Driver Behavior", icon: "�" },
    { id: "billing", label: "Billing Issue", icon: "💳" },
    { id: "service-quality", label: "Service Quality", icon: "⭐" },
    { id: "environmental-concern", label: "Environmental Concern", icon: "🌱" },
    { id: "scheduling", label: "Scheduling", icon: "🔄" },
    { id: "app-technical", label: "App Technical", icon: "📱" },
    { id: "waste-sorting", label: "Waste Sorting", icon: "♻️" },
    { id: "other", label: "Other", icon: "❓" },
  ];

  const severityLevels = [
    { id: "low", label: "Low", color: "#10B981" },
    { id: "medium", label: "Medium", color: "#F59E0B" },
    { id: "high", label: "High", color: "#EF4444" },
    { id: "urgent", label: "Urgent", color: "#DC2626" },
  ];

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please provide a title for your issue");
      return false;
    }
    if (!selectedCategory) {
      Alert.alert("Error", "Please select an issue category");
      return false;
    }
    if (!description.trim()) {
      Alert.alert("Error", "Please provide a description");
      return false;
    }
    return true;
  };

  const handleSubmitIssue = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const issueData = {
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        severity: selectedSeverity,
      };

      const response = await apiService.reportIssue(issueData);
      
      // Extract the issue ID from the response
      const issueId = response?.data?.issueReport?.issueId || 'Unknown';
      
      Alert.alert(
        "Issue Reported",
        `Your issue has been reported successfully. Ticket ID: ${issueId}`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Error reporting issue:", error);
      Alert.alert(
        "Error",
        "Failed to report issue. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Report Issue</Text>
        </View>

        {/* Issue Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Brief title for your issue"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Issue Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue Category</Text>
          <View style={styles.optionsGrid}>
            {issueTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.optionCard,
                  selectedCategory === type.id && styles.selectedOption,
                ]}
                onPress={() => setSelectedCategory(type.id)}
              >
                <Text style={styles.optionIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.optionText,
                    selectedCategory === type.id && styles.selectedOptionText,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Severity Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Severity Level</Text>
          <View style={styles.severityContainer}>
            {severityLevels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.severityOption,
                  selectedSeverity === level.id && {
                    backgroundColor: level.color,
                  },
                ]}
                onPress={() => setSelectedSeverity(level.id)}
              >
                <Text
                  style={[
                    styles.severityText,
                    selectedSeverity === level.id && styles.selectedSeverityText,
                  ]}
                >
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Please describe your issue in detail..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Submitting Issue...</Text>
            </View>
          ) : (
            <CustomButton
              title="Submit Issue"
              onPress={handleSubmitIssue}
              style={styles.submitButton}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
    padding: SIZES.padding,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
    height: 120,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  selectedOption: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  optionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: "center",
    fontWeight: "500",
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  severityContainer: {
    flexDirection: "row",
    gap: 10,
  },
  severityOption: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  severityText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  selectedSeverityText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  submitContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
});
