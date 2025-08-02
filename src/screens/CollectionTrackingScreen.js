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
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { COLORS, SIZES } from "../utils/theme";
import CustomButton from "../components/CustomButton";
import { formatTime, formatDate, getStatusColor } from "../utils/helpers";
import apiService from "../services/apiService";

export default function CollectionTrackingScreen({ navigation }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [collectionWeight, setCollectionWeight] = useState("");
  const [collectionNotes, setCollectionNotes] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [selectedIssueType, setSelectedIssueType] = useState("other");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Issue types for reporting collection problems
  const issueTypes = [
    { value: "access", label: "Access Issue" },
    { value: "customer_absent", label: "Customer Absent" },
    { value: "vehicle_breakdown", label: "Vehicle Issue" },
    { value: "hazardous_waste", label: "Hazardous Waste" },
    { value: "overweight", label: "Overweight" },
    { value: "wrong_waste_type", label: "Wrong Waste Type" },
    { value: "safety_concern", label: "Safety Concern" },
    { value: "other", label: "Other" }
  ];

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/collections?status=pending,confirmed,in-progress');
      
      if (response.success) {
        setCollections(response.data.collections);
      } else {
        throw new Error(response.message || 'Failed to load collections');
      }
    } catch (error) {
      console.error('Error loading collections:', error);
      Alert.alert("Error", "Failed to load collections. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadCollections();
    } catch (error) {
      console.error('Error refreshing collections:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading collections...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "confirmed":
        return "✅";
      case "in-progress":
        return "🚛";
      case "completed":
        return "✔️";
      case "cancelled":
        return "❌";
      case "skipped":
        return "⏭️";
      default:
        return "❓";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high":
        return "🔴";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  };

  const getWasteTypeIcon = (wasteType) => {
    if (Array.isArray(wasteType)) {
      return "🗂️"; // Multiple types
    }
    
    switch (wasteType?.toLowerCase()) {
      case "organic":
        return "🥬";
      case "recyclable":
      case "recyclables":
        return "♻️";
      case "electronic":
        return "💻";
      case "hazardous":
        return "☢️";
      case "general":
      case "mixed household":
        return "🗑️";
      case "garden waste":
        return "🌿";
      default:
        return "📦";
    }
  };

  const filteredCollections = collections.filter((collection) => {
    let matches = true;
    if (filterStatus !== "all")
      matches = matches && collection.status === filterStatus;
    if (filterPriority !== "all")
      matches = matches && collection.priority === filterPriority;
    return matches;
  });

  const stats = {
    total: collections.length,
    completed: collections.filter((c) => c.status === "completed").length,
    pending: collections.filter((c) => c.status === "pending").length,
    inProgress: collections.filter((c) => c.status === "in-progress").length,
    skipped: collections.filter((c) => c.status === "skipped").length,
    totalWeight: collections
      .filter((c) => c.actualWeight)
      .reduce((sum, c) => sum + c.actualWeight, 0),
    estimatedWeight: collections.reduce((sum, c) => sum + c.estimatedWeight, 0),
  };

  const handleCollectionAction = (collection, action) => {
    setSelectedCollection(collection);
    switch (action) {
      case "view":
        setShowDetailsModal(true);
        break;
      case "start":
        updateCollectionStatus(collection.id, "in-progress");
        break;
      case "complete":
        setShowCollectionModal(true);
        break;
      case "skip":
        setShowIssueModal(true);
        break;
      case "navigate":
        Alert.alert(
          "Navigation",
          `Opening navigation to ${collection.address}`
        );
        break;
      case "call":
        Alert.alert(
          "Call Customer",
          `Calling ${collection.customerName} at ${collection.phone}`
        );
        break;
    }
  };

  const updateCollectionStatus = (collectionId, newStatus) => {
    setCollections(
      collections.map((collection) =>
        collection.id === collectionId
          ? { ...collection, status: newStatus }
          : collection
      )
    );
  };

  const completeCollection = () => {
    if (!collectionWeight || isNaN(parseFloat(collectionWeight))) {
      Alert.alert("Error", "Please enter a valid weight");
      return;
    }

    const updatedCollections = collections.map((collection) =>
      collection.id === selectedCollection.id
        ? {
            ...collection,
            status: "completed",
            actualWeight: parseFloat(collectionWeight),
            collectedAt: new Date().toISOString(),
            notes: collectionNotes || collection.notes,
          }
        : collection
    );

    setCollections(updatedCollections);
    setCollectionWeight("");
    setCollectionNotes("");
    setShowCollectionModal(false);
    Alert.alert("Success", "Collection completed successfully!");
  };

  const reportIssue = () => {
    if (!issueDescription.trim()) {
      Alert.alert("Error", "Please describe the issue");
      return;
    }

    const issueText =
      selectedIssueType === "other"
        ? issueDescription
        : issueTypes.find((t) => t.value === selectedIssueType)?.label +
          ": " +
          issueDescription;

    const updatedCollections = collections.map((collection) =>
      collection.id === selectedCollection.id
        ? {
            ...collection,
            status: "skipped",
            issues: [...collection.issues, issueText],
          }
        : collection
    );

    setCollections(updatedCollections);
    setIssueDescription("");
    setSelectedIssueType("other");
    setShowIssueModal(false);
    Alert.alert(
      "Issue Reported",
      "The issue has been recorded and collection marked as skipped."
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: COLORS.primary + "20" },
              ]}
            >
              <Text style={styles.statNumber}>
                {stats.completed}/{stats.total}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View
              style={[styles.statCard, { backgroundColor: COLORS.info + "20" }]}
            >
              <Text style={styles.statNumber}>{stats.inProgress}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: COLORS.warning + "20" },
              ]}
            >
              <Text style={styles.statNumber}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: COLORS.success + "20" },
              ]}
            >
              <Text style={styles.statNumber}>{stats.totalWeight}kg</Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              {["all", "pending", "in-progress", "completed", "skipped"].map(
                (status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      filterStatus === status && styles.filterChipSelected,
                    ]}
                    onPress={() => setFilterStatus(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterStatus === status &&
                          styles.filterChipTextSelected,
                      ]}
                    >
                      {status.charAt(0).toUpperCase() +
                        status.slice(1).replace("-", " ")}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Priority:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              {["all", "high", "normal", "low"].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.filterChip,
                    filterPriority === priority && styles.filterChipSelected,
                  ]}
                  onPress={() => setFilterPriority(priority)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterPriority === priority &&
                        styles.filterChipTextSelected,
                    ]}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Collections List */}
        <View style={styles.collectionsContainer}>
          <Text style={styles.sectionTitle}>
            Collections ({filteredCollections.length})
          </Text>
          {filteredCollections.map((collection) => (
            <View key={collection.id} style={styles.collectionCard}>
              <View style={styles.collectionHeader}>
                <View style={styles.collectionLeft}>
                  <View style={styles.collectionInfo}>
                    <View style={styles.collectionTitleRow}>
                      <Text style={styles.customerName}>
                        {collection.customerName}
                      </Text>
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityIcon}>
                          {getPriorityIcon(collection.priority)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.collectionAddress}>
                      {collection.address}
                    </Text>
                    <View style={styles.collectionDetails}>
                      <Text style={styles.wasteTypeText}>
                        {getWasteTypeIcon(collection.wasteType)}{" "}
                        {collection.wasteType}
                      </Text>
                      <Text style={styles.scheduledTime}>
                        ⏰ {formatTime(collection.scheduledTime)}
                      </Text>
                      <Text style={styles.estimatedWeight}>
                        ⚖️ ~{collection.estimatedWeight}kg
                      </Text>
                    </View>
                    {collection.notes && (
                      <Text style={styles.collectionNotes}>
                        📝 {collection.notes}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.collectionRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          getStatusColor(collection.status) + "20",
                      },
                    ]}
                  >
                    <Text style={styles.statusIcon}>
                      {getStatusIcon(collection.status)}
                    </Text>
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(collection.status) },
                      ]}
                    >
                      {collection.status.toUpperCase().replace("-", " ")}
                    </Text>
                  </View>
                  {collection.actualWeight && (
                    <Text style={styles.actualWeight}>
                      Collected: {collection.actualWeight}kg
                    </Text>
                  )}
                  {collection.issues.length > 0 && (
                    <Text style={styles.issuesCount}>
                      ⚠️ {collection.issues.length} issue(s)
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.collectionActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: COLORS.info },
                  ]}
                  onPress={() => handleCollectionAction(collection, "view")}
                >
                  <Text style={styles.actionButtonText}>Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: COLORS.secondary },
                  ]}
                  onPress={() => handleCollectionAction(collection, "navigate")}
                >
                  <Text style={styles.actionButtonText}>Navigate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: COLORS.primary },
                  ]}
                  onPress={() => handleCollectionAction(collection, "call")}
                >
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>

                {collection.status === "pending" && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: COLORS.warning },
                    ]}
                    onPress={() => handleCollectionAction(collection, "start")}
                  >
                    <Text style={styles.actionButtonText}>Start</Text>
                  </TouchableOpacity>
                )}

                {collection.status === "in-progress" && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: COLORS.success },
                      ]}
                      onPress={() =>
                        handleCollectionAction(collection, "complete")
                      }
                    >
                      <Text style={styles.actionButtonText}>Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: COLORS.error },
                      ]}
                      onPress={() => handleCollectionAction(collection, "skip")}
                    >
                      <Text style={styles.actionButtonText}>Skip</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Collection Details Modal */}
        <Modal
          visible={showDetailsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDetailsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedCollection && (
                <>
                  <Text style={styles.modalTitle}>Collection Details</Text>
                  <ScrollView style={styles.detailsScroll}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Customer:</Text>
                      <Text style={styles.detailValue}>
                        {selectedCollection.customerName}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone:</Text>
                      <Text style={styles.detailValue}>
                        {selectedCollection.phone}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address:</Text>
                      <Text style={styles.detailValue}>
                        {selectedCollection.address}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Waste Type:</Text>
                      <Text style={styles.detailValue}>
                        {selectedCollection.wasteType}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Scheduled Time:</Text>
                      <Text style={styles.detailValue}>
                        {formatTime(selectedCollection.scheduledTime)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          { color: getStatusColor(selectedCollection.status) },
                        ]}
                      >
                        {selectedCollection.status.charAt(0).toUpperCase() +
                          selectedCollection.status.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Priority:</Text>
                      <Text style={styles.detailValue}>
                        {getPriorityIcon(selectedCollection.priority)}{" "}
                        {selectedCollection.priority.charAt(0).toUpperCase() +
                          selectedCollection.priority.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Estimated Weight:</Text>
                      <Text style={styles.detailValue}>
                        {selectedCollection.estimatedWeight}kg
                      </Text>
                    </View>
                    {selectedCollection.actualWeight && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Actual Weight:</Text>
                        <Text style={styles.detailValue}>
                          {selectedCollection.actualWeight}kg
                        </Text>
                      </View>
                    )}
                    {selectedCollection.collectedAt && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Collected At:</Text>
                        <Text style={styles.detailValue}>
                          {formatTime(selectedCollection.collectedAt)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes:</Text>
                      <Text style={styles.detailValue}>
                        {selectedCollection.notes || "No notes"}
                      </Text>
                    </View>
                    {selectedCollection.issues.length > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Issues:</Text>
                        <View style={styles.issuesList}>
                          {selectedCollection.issues.map((issue, index) => (
                            <Text key={index} style={styles.issueItem}>
                              • {issue}
                            </Text>
                          ))}
                        </View>
                      </View>
                    )}
                  </ScrollView>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={() => setShowDetailsModal(false)}
                  >
                    <Text style={styles.confirmButtonText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Complete Collection Modal */}
        <Modal
          visible={showCollectionModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCollectionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Complete Collection</Text>

              <Text style={styles.modalLabel}>Actual Weight (kg)*:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter weight in kg"
                placeholderTextColor={COLORS.textLight}
                value={collectionWeight}
                onChangeText={setCollectionWeight}
                keyboardType="numeric"
              />

              <Text style={styles.modalLabel}>Additional Notes:</Text>
              <TextInput
                style={[styles.modalInput, styles.notesInput]}
                placeholder="Any additional notes about the collection..."
                placeholderTextColor={COLORS.textLight}
                value={collectionNotes}
                onChangeText={setCollectionNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowCollectionModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={completeCollection}
                >
                  <Text style={styles.confirmButtonText}>Complete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Report Issue Modal */}
        <Modal
          visible={showIssueModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowIssueModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Report Issue</Text>

              <Text style={styles.modalLabel}>Issue Type:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.issueTypesScroll}
              >
                {issueTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.issueTypeChip,
                      selectedIssueType === type.value &&
                        styles.issueTypeChipSelected,
                    ]}
                    onPress={() => setSelectedIssueType(type.value)}
                  >
                    <Text
                      style={[
                        styles.issueTypeText,
                        selectedIssueType === type.value &&
                          styles.issueTypeTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Description*:</Text>
              <TextInput
                style={[styles.modalInput, styles.issueInput]}
                placeholder="Describe the issue in detail..."
                placeholderTextColor={COLORS.textLight}
                value={issueDescription}
                onChangeText={setIssueDescription}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowIssueModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={reportIssue}
                >
                  <Text style={styles.confirmButtonText}>Report</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  statsContainer: {
    marginBottom: SIZES.large,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.medium,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SIZES.large,
    borderRadius: SIZES.radiusMedium,
    marginHorizontal: SIZES.small / 2,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: SIZES.fontTitle,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  filtersContainer: {
    marginBottom: SIZES.large,
  },
  filterSection: {
    marginBottom: SIZES.medium,
  },
  filterLabel: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  filterScroll: {
    flexDirection: "row",
  },
  filterChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radiusLarge,
    marginRight: SIZES.small,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.text,
    fontWeight: "500",
  },
  filterChipTextSelected: {
    color: COLORS.surface,
  },
  collectionsContainer: {
    marginBottom: SIZES.large,
  },
  sectionTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.medium,
  },
  collectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    marginBottom: SIZES.medium,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  collectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.medium,
  },
  collectionLeft: {
    flex: 1,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  customerName: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  priorityBadge: {
    marginLeft: SIZES.small,
  },
  priorityIcon: {
    fontSize: 16,
  },
  collectionAddress: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    marginBottom: SIZES.small,
  },
  collectionDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SIZES.medium,
    marginBottom: SIZES.small,
  },
  wasteTypeText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.text,
    fontWeight: "500",
  },
  scheduledTime: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  estimatedWeight: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  collectionNotes: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textLight,
    fontStyle: "italic",
    marginTop: 4,
  },
  collectionRight: {
    alignItems: "flex-end",
    gap: SIZES.small,
    minWidth: 100,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.small,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSmall,
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
  },
  statusText: {
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  actualWeight: {
    fontSize: SIZES.fontSmall,
    color: COLORS.success,
    fontWeight: "600",
  },
  issuesCount: {
    fontSize: SIZES.fontSmall,
    color: COLORS.error,
  },
  collectionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SIZES.small,
  },
  actionButton: {
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.radiusSmall,
    alignItems: "center",
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.large,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.large,
    width: "100%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.large,
    textAlign: "center",
  },
  detailsScroll: {
    maxHeight: 400,
    marginBottom: SIZES.large,
  },
  detailRow: {
    paddingVertical: SIZES.medium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  detailLabel: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    fontWeight: "600",
  },
  issuesList: {
    marginTop: 4,
  },
  issueItem: {
    fontSize: SIZES.fontMedium,
    color: COLORS.error,
    marginBottom: 2,
  },
  modalLabel: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: SIZES.radiusMedium,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.medium,
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    marginBottom: SIZES.medium,
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  issueInput: {
    height: 100,
    textAlignVertical: "top",
  },
  issueTypesScroll: {
    marginBottom: SIZES.medium,
  },
  issueTypeChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderRadius: SIZES.radiusMedium,
    marginRight: SIZES.small,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  issueTypeChipSelected: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  issueTypeText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.text,
    fontWeight: "500",
  },
  issueTypeTextSelected: {
    color: COLORS.surface,
  },
  modalActions: {
    flexDirection: "row",
    gap: SIZES.medium,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.radiusMedium,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.textLight,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: COLORS.surface,
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
  },
});
