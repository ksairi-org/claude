import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.DISPLAY_NAME ?? "My App",
  slug: "my-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: process.env.APP_SCHEMA ?? "my-app",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.APP_IDENTIFIER ?? "com.example.myapp",
    buildNumber: "1",
    googleServicesFile: process.env.GOOGLE_SERVICES_INFOPLIST_PATH,
    infoPlist: {
      UIBackgroundModes: ["fetch", "remote-notification"],
      ITSAppUsesNonExemptEncryption: false,
    },
    entitlements: {
      "aps-environment": "production",
    },
  },
  android: {
    package: process.env.APP_IDENTIFIER ?? "com.example.myapp",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON_PATH,
    permissions: ["android.permission.POST_NOTIFICATIONS"],
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "@react-native-firebase/app",
    "@react-native-firebase/messaging",
    [
      "expo-notifications",
      {
        enableBackgroundRemoteNotifications: true,
      },
    ],
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
          forceStaticLinking: ["RNFBApp", "RNFBAnalytics", "RNFBMessaging"],
        },
      },
    ],
    "expo-secure-store",
  ],
  experiments: {
    typedRoutes: true,
  },
});
