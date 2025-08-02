import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { COLORS, SIZES } from "../utils/theme";
import CustomButton from "../components/CustomButton";
import { formatDate, formatTime, formatCurrency } from "../utils/helpers";
import apiService from "../services/apiService";

const { width } = Dimensions.get('window');

// Helper function to get color for waste types
const getWasteTypeColor = (type) => {
  const colors = {
    organic: COLORS.success,
    plastic: COLORS.warning,
    paper: COLORS.info,
    glass: COLORS.secondary,
    metal: COLORS.accent,
    electronic: COLORS.danger,
    mixed: COLORS.textSecondary
  };
  return colors[type.toLowerCase()] || COLORS.primary;
};

export default function CustomerInsightsScreen({ navigation }) {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [insightsData, setInsightsData] = useState(null);
  const [environmentalImpact, setEnvironmentalImpact] = useState(null);

  useEffect(() => {
    loadInsightsData();
  }, [selectedPeriod]);

  const loadInsightsData = async () => {
    try {
      setLoading(true);
      
      // Load insights data from API
      const [insightsResponse, environmentalResponse] = await Promise.all([
        apiService.getPersonalizedInsights(),
        apiService.getEnvironmentalImpact()
      ]);

      if (insightsResponse.success) {
        setInsightsData(insightsResponse.data);
      } else {
        console.error('Failed to load insights:', insightsResponse.message);
        setInsightsData(null);
      }

      if (environmentalResponse.success) {
        setEnvironmentalImpact(environmentalResponse.data);
      } else {
        console.error('Failed to load environmental data:', environmentalResponse.message);
        setEnvironmentalImpact(null);
      }

    } catch (error) {
      console.error('Error loading insights:', error);
      setInsightsData(null);
      setEnvironmentalImpact(null);
      Alert.alert("Error", "Failed to load insights data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderEnvironmentalImpact = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🌍 Environmental Impact</Text>
      
      {environmentalImpact && (
        <View style={styles.impactGrid}>
          <View style={styles.impactCard}>
            <Text style={styles.impactValue}>{environmentalImpact.treesEquivalent}</Text>
            <Text style={styles.impactLabel}>Trees Saved</Text>
            <Text style={styles.impactIcon}>🌳</Text>
          </View>
          
          <View style={styles.impactCard}>
            <Text style={styles.impactValue}>{environmentalImpact.waterSaved}L</Text>
            <Text style={styles.impactLabel}>Water Saved</Text>
            <Text style={styles.impactIcon}>💧</Text>
          </View>
          
          <View style={styles.impactCard}>
            <Text style={styles.impactValue}>{environmentalImpact.energySaved}kWh</Text>
            <Text style={styles.impactLabel}>Energy Saved</Text>
            <Text style={styles.impactIcon}>⚡</Text>
          </View>
          
          <View style={styles.impactCard}>
            <Text style={styles.impactValue}>{environmentalImpact.co2Reduced}kg</Text>
            <Text style={styles.impactLabel}>CO₂ Reduced</Text>
            <Text style={styles.impactIcon}>🌱</Text>
          </View>
        </View>
      )}
      
      {environmentalImpact?.comparison && (
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonText}>
            🏆 {environmentalImpact.comparison.description}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${environmentalImpact.comparison.betterThan}%` }
              ]} 
            />
          </View>
          <Text style={styles.percentageText}>
            {environmentalImpact.comparison.betterThan}% better than average
          </Text>
        </View>
      )}
    </View>
  );

  const renderWasteBreakdown = () => {
    const currentData = insightsData?.[selectedPeriod];
    if (!currentData?.wasteBreakdown) return null;

    const breakdown = Object.entries(currentData.wasteBreakdown).map(([type, percentage]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      percentage,
      color: getWasteTypeColor(type)
    }));

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Waste Breakdown</Text>
        <View style={styles.breakdownContainer}>
          {breakdown.map((item, index) => (
            <View key={index} style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                <Text style={styles.breakdownType}>{item.type}</Text>
                <Text style={styles.breakdownPercentage}>{item.percentage}%</Text>
              </View>
              <View style={styles.breakdownBar}>
                <View 
                  style={[
                    styles.breakdownFill, 
                    { width: `${item.percentage}%`, backgroundColor: item.color }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const getWasteTypeColor = (type) => {
    const colors = {
      organic: COLORS.success,
      plastic: COLORS.warning,
      paper: COLORS.info,
      glass: COLORS.primary,
      metal: COLORS.secondary
    };
    return colors[type] || COLORS.textSecondary;
  };

  const [monthlyTrend] = useState([
    { month: "Jul", collections: 6, recycling: 62.5 },
    { month: "Aug", collections: 8, recycling: 68.2 },
    { month: "Sep", collections: 7, recycling: 71.0 },
    { month: "Oct", collections: 8, recycling: 68.2 },
  ]);

  const [personalizedTips] = useState([
    {
      id: 1,
      title: "Improve Your Recycling Rate",
      description: "You're currently at 68.2% recycling rate. Aim for 75% by properly sorting plastic containers.",
      actionable: true,
      icon: "♻️",
    },
    {
      id: 2,
      title: "Composting Opportunity",
      description: "23% of your waste is organic. Consider starting a home compost to reduce waste further.",
      actionable: true,
      icon: "🌱",
    },
    {
      id: 3,
      title: "Reduce Packaging Waste",
      description: "Tip: Choose products with minimal packaging to reduce your overall waste footprint.",
      actionable: false,
      icon: "📦",
    },
  ]);

  const periods = [
    { key: "month", label: "This Month" },
    { key: "quarter", label: "This Quarter" },
    { key: "year", label: "This Year" },
  ];

  const currentData = insightsData?.[selectedPeriod];

  const achievements = [
    { name: "Eco Warrior", icon: "🏆", description: "Consistent waste reduction for 30 days" },
    { name: "Recycling Champion", icon: "♻️", description: "Achieved 60%+ recycling rate" },
    { name: "Green Guardian", icon: "🌱", description: "Reduced carbon footprint by 25kg CO2" },
    { name: "Sustainability Master", icon: "🌟", description: "1 year of eco-friendly practices" },
  ];

  const renderTipsModal = () => (
    <Modal visible={showTipsModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Personalized Eco Tips 🌱</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTipsModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {personalizedTips.map((tip) => (
              <View key={tip.id} style={styles.tipCard}>
                <Text style={styles.tipIcon}>{tip.icon}</Text>
                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipDescription}>{tip.description}</Text>
                  {tip.actionable && (
                    <TouchableOpacity style={styles.tipAction}>
                      <Text style={styles.tipActionText}>Learn More</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your eco insights...</Text>
        </View>
      ) : !insightsData && !environmentalImpact ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.noDataTitle}>No Data Available</Text>
          <Text style={styles.noDataText}>
            Start scheduling pickups to see your environmental impact and personalized insights.
          </Text>
          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={() => navigation.navigate('SchedulePickup')}
          >
            <Text style={styles.scheduleButtonText}>Schedule Your First Pickup</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Your Eco Impact 🌍</Text>
            <Text style={styles.subtitle}>Track your environmental contribution</Text>
          </View>

          {/* Period Selector */}
        <View style={styles.periodContainer}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.key && styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

          {/* Environmental Impact */}
          {renderEnvironmentalImpact()}

          {/* Waste Breakdown */}
          {renderWasteBreakdown()}

        {/* Impact Summary */}
        {currentData && (
        <View style={styles.impactCard}>
          <Text style={styles.impactTitle}>Your Environmental Impact</Text>
          <View style={styles.impactGrid}>
            <View style={styles.impactItem}>
              <Text style={styles.impactNumber}>{currentData.wasteReduced.toFixed(1)} kg</Text>
              <Text style={styles.impactLabel}>Waste Reduced</Text>
            </View>
            <View style={styles.impactItem}>
              <Text style={[styles.impactNumber, { color: COLORS.success }]}>
                {currentData.carbonFootprint} kg
              </Text>
              <Text style={styles.impactLabel}>CO2 Offset</Text>
            </View>
          </View>
          <View style={styles.impactGrid}>
            <View style={styles.impactItem}>
              <Text style={[styles.impactNumber, { color: COLORS.customer }]}>
                {currentData.recyclingRate}%
              </Text>
              <Text style={styles.impactLabel}>Recycling Rate</Text>
            </View>
            <View style={styles.impactItem}>
              <Text style={[styles.impactNumber, { color: COLORS.warning }]}>
                {formatCurrency(currentData.costSaved)}
              </Text>
              <Text style={styles.impactLabel}>Cost Saved</Text>
            </View>
          </View>
        </View>
        )}

        {/* Achievements */}
        {currentData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Achievements 🏆</Text>
          <View style={styles.achievementsContainer}>
            {achievements.map((achievement) => (
              <View
                key={achievement.name}
                style={[
                  styles.achievementCard,
                  currentData.achievements?.includes(achievement.name)
                    ? styles.achievementUnlocked
                    : styles.achievementLocked,
                ]}
              >
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementDescription}>
                  {achievement.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <CustomButton
            title="Schedule Collection"
            onPress={() => navigation.navigate("SchedulePickup")}
            style={styles.actionButton}
          />
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("CollectionHistory")}
          >
            <Text style={styles.secondaryButtonText}>View History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      )}

      {renderTipsModal()}
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
  },
  periodContainer: {
    flexDirection: "row",
    marginBottom: SIZES.large,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.small,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SIZES.medium,
    alignItems: "center",
    borderRadius: SIZES.radiusSmall,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  periodButtonTextActive: {
    color: COLORS.surface,
    fontWeight: "600",
  },
  impactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    marginBottom: SIZES.large,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  impactTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.large,
    textAlign: "center",
  },
  impactGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.medium,
  },
  impactItem: {
    flex: 1,
    alignItems: "center",
  },
  impactNumber: {
    fontSize: SIZES.fontTitle,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: SIZES.small / 2,
  },
  impactLabel: {
    fontSize: SIZES.fontSmall,
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
  achievementsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  achievementCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    marginBottom: SIZES.medium,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementUnlocked: {
    borderWidth: 2,
    borderColor: COLORS.success + "40",
    backgroundColor: COLORS.success + "05",
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: SIZES.small,
  },
  achievementName: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SIZES.small / 2,
  },
  achievementDescription: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 16,
  },
  breakdownContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownItem: {
    marginBottom: SIZES.large,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.small,
  },
  breakdownLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  breakdownColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SIZES.small,
  },
  breakdownType: {
    fontSize: SIZES.fontMedium,
    fontWeight: "500",
    color: COLORS.text,
  },
  breakdownPercentage: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
  },
  breakdownBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: SIZES.small / 2,
  },
  breakdownFill: {
    height: "100%",
    borderRadius: 4,
  },
  breakdownAmount: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  trendContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    flexDirection: "row",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendItem: {
    alignItems: "center",
  },
  trendMonth: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.small,
  },
  trendBar: {
    width: 20,
    height: 60,
    backgroundColor: COLORS.border,
    borderRadius: 10,
    justifyContent: "flex-end",
    marginBottom: SIZES.small,
  },
  trendFill: {
    width: "100%",
    borderRadius: 10,
    minHeight: 5,
  },
  trendValue: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
  },
  trendRecycling: {
    fontSize: SIZES.fontSmall,
    color: COLORS.success,
  },
  tipsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  viewAllButton: {
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
  },
  viewAllText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.primary,
    fontWeight: "500",
  },
  tipsPreview: {
    gap: SIZES.medium,
  },
  tipCardSmall: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipIconSmall: {
    fontSize: 20,
    marginRight: SIZES.medium,
  },
  tipContentSmall: {
    flex: 1,
  },
  tipTitleSmall: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.small / 2,
  },
  tipDescriptionSmall: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  actionContainer: {
    marginTop: SIZES.large,
    marginBottom: SIZES.large,
  },
  actionButton: {
    marginBottom: SIZES.medium,
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    paddingVertical: SIZES.large,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.primary,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusMedium,
    borderTopRightRadius: SIZES.radiusMedium,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SIZES.large,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.text,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  modalBody: {
    padding: SIZES.large,
  },
  tipCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    marginBottom: SIZES.medium,
    flexDirection: "row",
  },
  tipIcon: {
    fontSize: 24,
    marginRight: SIZES.medium,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  tipDescription: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SIZES.medium,
  },
  tipAction: {
    alignSelf: "flex-start",
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusSmall,
  },
  tipActionText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.surface,
    fontWeight: "600",
  },
  // New styles for enhanced components
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.large,
  },
  loadingText: {
    marginTop: SIZES.medium,
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  backButton: {
    marginBottom: SIZES.medium,
  },
  backButtonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.primary,
    fontWeight: "500",
  },
  impactValue: {
    fontSize: SIZES.fontTitle,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
  },
  impactIcon: {
    fontSize: 24,
    textAlign: "center",
    marginTop: SIZES.small,
  },
  comparisonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    marginTop: SIZES.medium,
  },
  comparisonText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SIZES.medium,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: SIZES.small,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  percentageText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.success,
    textAlign: "center",
    fontWeight: "600",
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SIZES.small,
  },
  noDataTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.medium,
    textAlign: "center",
  },
  noDataText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SIZES.extraLarge,
    lineHeight: 24,
  },
  scheduleButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.extraLarge,
    paddingVertical: SIZES.large,
    borderRadius: SIZES.radiusMedium,
  },
  scheduleButtonText: {
    color: COLORS.white,
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    textAlign: "center",
  },
});
