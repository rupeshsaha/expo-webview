import * as Application from "expo-application";
import * as Device from "expo-device";
import { Platform } from "react-native";

export const WEBVIEW_CONFIG = {
  // Replace with your production domain
  URL: "https://ngowallet.tymiqly.com",

  // Custom User Agent to satisfy Play Store requirements and identify the app
  USER_AGENT: `${Application.applicationName}/${Application.nativeApplicationVersion} (Android WebView Wrapper; ${Platform.OS} ${Platform.Version}; ${Device.modelName})`,

  // List of domains that should NOT be opened in WebView but in external browser
  EXTERNAL_DOMAINS: [
    "google.com",
    "facebook.com",
    "twitter.com",
    "linkedin.com",
    "instagram.com",
    "youtube.com",
  ],

  // Security headers to inject (optional headers for the server to understand the device)
  HEADERS: {
    "X-App-Platform": Platform.OS,
    "X-App-Version": Application.nativeApplicationVersion || "1.0.0",
    "X-Device-Name": Device.deviceName || "Unknown",
    "X-Requested-With": Application.applicationId || "com.bazmehaideri.admin",
  },
};
