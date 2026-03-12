import Constants from "expo-constants";
import * as Network from "expo-network";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import type {
  ShouldStartLoadRequest,
  WebViewNavigation,
  WebViewScrollEvent,
} from "react-native-webview/lib/WebViewTypes";
import { WebView } from "react-native-webview";

// Components
import ErrorView from "@/components/webview/ErrorView";
import LoadingView from "@/components/webview/LoadingView";
import OfflineView from "@/components/webview/OfflineView";

// Constants
import { WEBVIEW_CONFIG } from "@/constants/WebViewConfig";

export default function MainWebView() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [webViewAtTop, setWebViewAtTop] = useState(true);

  const webViewRef = useRef<WebView>(null);
  const loadingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webViewAtTopRef = useRef(true);

  // 1. Network Detection
  const checkConnection = useCallback(async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const isConnected =
        networkState.isConnected && networkState.isInternetReachable !== false;
      setIsOffline(!isConnected);
      return isConnected;
    } catch {
      // If we can't determine connectivity, assume we're online and let WebView handle errors.
      setIsOffline(false);
      return true;
    }
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
    const subscription = Network.addNetworkStateListener((networkState) => {
      const isConnected =
        networkState.isConnected && networkState.isInternetReachable !== false;
      setIsOffline((prev) => {
        const next = !isConnected;
        return prev === next ? prev : next;
      });
    });
    return () => {
      subscription.remove();
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
    if (!navState.loading) {
      setIsLoading(false);
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    }
  };

  const baseHost = useMemo(() => {
    try {
      return new URL(WEBVIEW_CONFIG.URL).host;
    } catch {
      return "";
    }
  }, []);

  const openExternalUrl = useCallback(async (targetUrl: string) => {
    if (targetUrl.startsWith("javascript:")) return;
    try {
      const canOpen = await Linking.canOpenURL(targetUrl);
      if (canOpen) {
        await Linking.openURL(targetUrl);
      }
    } finally {
      setIsLoading(false);
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    }
  }, []);

  const onShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest) => {
      const targetUrl = request.url;

      // Allow about:blank (common during navigation/transitions)
      if (targetUrl === "about:blank") return true;

      // Block plain HTTP loads (helps prevent downgrade/mixed content issues)
      if (targetUrl.startsWith("http://")) {
        setHasError(true);
        setIsLoading(false);
        if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
        return false;
      }

      // Handle non-web schemes safely
      const isHttp = targetUrl.startsWith("https://");
      if (!isHttp) {
        void openExternalUrl(targetUrl);
        return false;
      }

      // External domain handling
      try {
        const host = new URL(targetUrl).host;
        const isExternal = baseHost && host && host !== baseHost;
        const isKnownExternal = WEBVIEW_CONFIG.EXTERNAL_DOMAINS.some((d) =>
          host.includes(d),
        );

        if (isExternal && isKnownExternal) {
          void openExternalUrl(targetUrl);
          return false;
        }
      } catch {
        // If parsing fails, fall back to allowing the navigation
      }

      return true;
    },
    [baseHost, openExternalUrl],
  );

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
    startLoadingTimer();
    const isConnected = await checkConnection();
    if (isConnected && webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const webViewSource = useMemo(
    () => ({
      uri: WEBVIEW_CONFIG.URL,
      headers: WEBVIEW_CONFIG.HEADERS,
    }),
    [],
  );

  const handleWebViewScroll = useCallback((event: WebViewScrollEvent) => {
    const y = event?.nativeEvent?.contentOffset?.y ?? 0;
    const atTop = y <= 0.5;
    if (webViewAtTopRef.current !== atTop) {
      webViewAtTopRef.current = atTop;
      setWebViewAtTop(atTop);
    }
  }, []);

  const webViewElement = (
    <WebView
      ref={webViewRef}
      source={webViewSource}
      style={styles.webview}
      onLoadStart={() => {
        setIsLoading(true);
        startLoadingTimer();
      }}
      onLoadEnd={() => {
        setIsLoading(false);
        setRefreshing(false);
        if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
      }}
      onNavigationStateChange={onNavigationStateChange}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      onError={() => {
        setHasError(true);
        setIsLoading(false);
        setRefreshing(false);
        if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
      }}
      onHttpError={(syntheticEvent) => {
        if (syntheticEvent.nativeEvent.statusCode >= 400) {
          setHasError(true);
          setIsLoading(false);
          setRefreshing(false);
          if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
        }
      }}
      onScroll={handleWebViewScroll}
      scrollEventThrottle={16}
      // Core config
      domStorageEnabled={true}
      javaScriptEnabled={true}
      scalesPageToFit={true}
      setSupportMultipleWindows={false}
      userAgent={WEBVIEW_CONFIG.USER_AGENT}
      // Scroll/refresh behavior
      nestedScrollEnabled={true}
      pullToRefreshEnabled={Platform.OS === "ios"}
      // Security
      originWhitelist={["https://*"]}
      mixedContentMode="never"
      allowFileAccess={false}
    />
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {isOffline && <OfflineView onRetry={handleRetry} />}
      {!isOffline && hasError && <ErrorView onRetry={handleRetry} />}

      {!isOffline && (
        Platform.OS === "android" ? (
          <ScrollView
            contentContainerStyle={{ flex: 1 }}
            nestedScrollEnabled
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                enabled={webViewAtTop}
                onRefresh={onRefresh}
                progressViewOffset={Constants.statusBarHeight}
                colors={["#007AFF"]}
              />
            }
          >
            {webViewElement}
          </ScrollView>
        ) : (
          webViewElement
        )
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
