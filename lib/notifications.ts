import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

type ExpoConfigExtra = {
  eas?: {
    projectId?: string;
  };
};

const appName = Constants.expoConfig?.name;
export const PUSH_TOKEN_MESSAGE_TYPE = `${appName?.toUpperCase().replace(" ","_")}_PUSH_TOKEN`;


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId() {
  const extra = Constants.expoConfig?.extra as ExpoConfigExtra | undefined;

  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

export async function setupNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === "web" || !Device.isDevice) {
    return null;
  }

  const existing = (await Notifications.getPermissionsAsync()) as {
    granted: boolean;
  };

  if (!existing.granted) {
    const requested = (await Notifications.requestPermissionsAsync()) as {
      granted: boolean;
    };

    if (!requested.granted) {
      return null;
    }
  }

  const projectId = getProjectId();

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });

    return tokenData.data;
  } catch (error) {
    console.warn("Unable to get Expo push token", error);
    return null;
  }
}

export function buildPushTokenInjectionScript(token: string) {
  const payload = {
    type: PUSH_TOKEN_MESSAGE_TYPE,
    token,
    platform: "expo",
  };

  return `
    (function () {
      try {
        var token = ${JSON.stringify(token)};
        var payload = ${JSON.stringify(payload)};
        var message = JSON.stringify(payload);

        window.__${appName?.toUpperCase().replace(" ","_")}_PUSH_TOKEN = token;
        window.__${appName?.toUpperCase().replace(" ","_")}_PUSH_TOKEN_PAYLOAD = message;

        try {
          window.localStorage.setItem('${appName?.toUpperCase().replace(" ","_")}_PUSH_TOKEN', token);
        } catch (storageError) {}

        window.dispatchEvent(new MessageEvent('message', { data: message }));

        if (document && document.dispatchEvent) {
          document.dispatchEvent(new MessageEvent('message', { data: message }));
        }

        window.dispatchEvent(new CustomEvent('${appName?.toUpperCase().replace(" ","_")}_PUSH_TOKEN', {
          detail: payload,
        }));
      } catch (error) {
        console.log('${appName?.toUpperCase().replace(" ","_")}_PUSH_TOKEN push token injection failed', error);
      }
    })();
    true;
  `;
}
