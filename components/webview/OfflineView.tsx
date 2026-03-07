import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";

interface OfflineViewProps {
  onRetry: () => void;
}

const OfflineView: React.FC<OfflineViewProps> = ({ onRetry }) => {
  return (
    <ThemedView style={styles.container}>
      <MaterialIcons name="signal-wifi-off" size={80} color="#666" />
      <ThemedText type="subtitle" style={styles.title}>
        No Internet Connection
      </ThemedText>
      <ThemedText style={styles.message}>
        Please check your connection and try again.
      </ThemedText>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 20,
  },
  title: {
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    textAlign: "center",
    marginBottom: 30,
    color: "#888",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default OfflineView;
