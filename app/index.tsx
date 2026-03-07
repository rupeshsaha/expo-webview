import Constants from "expo-constants";
import * as Network from "expo-network";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";

// Components
import ErrorView from "@/components/webview/ErrorView";
import LoadingView from "@/components/webview/LoadingView";
import OfflineView from "@/components/webview/OfflineView";

// Constants
import { WEBVIEW_CONFIG } from "@/constants/WebViewConfig";

export default function MainWebView() {
  const [url, setUrl] = useState(WEBVIEW_CONFIG.URL);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);

  const webViewRef = useRef<WebView>(null);
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null);

  // 1. Network Detection
  const checkConnection = useCallback(async () => {
    const networkState = await Network.getNetworkStateAsync();
    const isConnected =
      networkState.isConnected && networkState.isInternetReachable !== false;
    setIsOffline(!isConnected);
    return isConnected;
  }, []);

  // Fail-safe to hide loader after 10 seconds
  const startLoadingTimer = useCallback(() => {
    if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    loadingTimeout.current = setTimeout(() => {
      setIsLoading(false);
    }, 10000); // 10 seconds fail-safe
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => {
      clearInterval(interval);
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    };
  }, [checkConnection]);

  // 2. Android Back Button Handling
  useEffect(() => {
    const handleBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      } else {
        Alert.alert(
          "Exit App",
          "Do you want to exit the app?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Exit", onPress: () => BackHandler.exitApp() },
          ],
          { cancelable: true },
        );
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress,
    );
    return () => backHandler.remove();
  }, [canGoBack]);

  // 3. Navigation State Change
  const onNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setUrl(navState.url);

    // Check if URL is an external domain
    const isExternal = WEBVIEW_CONFIG.EXTERNAL_DOMAINS.some(
      (domain) =>
        navState.url.includes(domain) &&
        !navState.url.includes(
          WEBVIEW_CONFIG.URL.replace("https://", "").replace("http://", ""),
        ),
    );

    if (isExternal) {
      webViewRef.current?.stopLoading();
      Linking.openURL(navState.url);
      setIsLoading(false);
    }
  };

  // 4. Manual Refresh (Pull to Refresh)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const isConnected = await checkConnection();
    if (isConnected && webViewRef.current) {
      setHasError(false);
      webViewRef.current.reload();
    }
    // We stop refreshing after a small delay or once load starts
    setTimeout(() => setRefreshing(false), 800);
  }, [checkConnection]);

  // 5. Retry Handler
  const handleRetry = async () => {
    setHasError(false);
    setIsLoading(true);
    const isConnected = await checkConnection();
    if (isConnected && webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {isOffline && <OfflineView onRetry={handleRetry} />}
      {!isOffline && hasError && <ErrorView onRetry={handleRetry} />}

      {!isOffline && (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              progressViewOffset={Constants.statusBarHeight} // Adjust offset for refresh spinner
              colors={["#007AFF"]}
            />
          }
        >
          <WebView
            ref={webViewRef}
            source={{
              uri: WEBVIEW_CONFIG.URL,
              headers: WEBVIEW_CONFIG.HEADERS,
            }}
            style={styles.webview}
            onLoadStart={() => {
              setIsLoading(true);
              setProgress(0);
              startLoadingTimer();
            }}
            onLoadEnd={() => {
              setIsLoading(false);
              if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
            }}
            onLoadProgress={({ nativeEvent }) => {
              const currentProgress = nativeEvent.progress;
              setProgress(currentProgress);
              // If more than 90% loaded, we can hide the spinner for better UX
              if (currentProgress > 0.9) {
                setIsLoading(false);
              }
            }}
            onNavigationStateChange={onNavigationStateChange}
            onError={() => setHasError(true)}
            onHttpError={(syntheticEvent) => {
              if (syntheticEvent.nativeEvent.statusCode >= 400) {
                setHasError(true);
              }
            }}
            // Core config
            domStorageEnabled={true}
            javaScriptEnabled={true}
            scalesPageToFit={true}
            setSupportMultipleWindows={false}
            userAgent={WEBVIEW_CONFIG.USER_AGENT}
            // Security
            originWhitelist={["https://*", "mailto:*", "tel:*"]}
            mixedContentMode="never"
            allowFileAccess={false}
          />
        </ScrollView>
      )}

      {isLoading && !isOffline && !hasError && <LoadingView />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Constants.statusBarHeight,
  },
  webview: {
    flex: 1,
  },
});
