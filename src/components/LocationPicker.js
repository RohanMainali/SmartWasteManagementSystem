import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, SIZES } from "../utils/theme";

export default function LocationPicker({ 
  onLocationSelect, 
  selectedLocation, 
  style = {} 
}) {
  const handleLocationPress = () => {
    // For now, just a simple text display
    // This can be enhanced later with actual map integration
    if (onLocationSelect) {
      onLocationSelect({
        address: "Current Location",
        coordinates: null
      });
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handleLocationPress}
    >
      <Text style={styles.label}>📍 Location</Text>
      <Text style={styles.locationText}>
        {selectedLocation || "Tap to select location"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.lightGray,
    padding: SIZES.medium,
    borderRadius: SIZES.small,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  label: {
    fontSize: SIZES.medium,
    fontWeight: "600",
    color: COLORS.darkGray,
    marginBottom: SIZES.small,
  },
  locationText: {
    fontSize: SIZES.medium,
    color: COLORS.primary,
  },
});
