import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";

interface ErrorViewProps {
  onRetry: () => void;
  description?: string;
}

const ErrorView: React.FC<ErrorViewProps> = ({
  onRetry,
  description = "Something went wrong while loading the page.",
}) => {
  return (
    <ThemedView style={styles.container}>
      <MaterialIcons name="error-outline" size={80} color="#ff4d4d" />
      <ThemedText type="subtitle" style={styles.title}>
        Error Loading Page
      </ThemedText>
      <ThemedText style={styles.message}>{description}</ThemedText>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Retry Loading</Text>
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
    backgroundColor: "#ff4d4d",
    paddingHorizontal: 30,
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

export default ErrorView;
