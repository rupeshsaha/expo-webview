import React from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { ThemedView } from "../themed-view";

const LoadingView = () => (
  <ThemedView style={styles.container}>
    <ActivityIndicator size="large" color="#007AFF" />
  </ThemedView>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});

export default LoadingView;
