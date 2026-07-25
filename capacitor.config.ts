import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.frost.languagelearning",
  appName: "Language Learning App",
  webDir: "dist",
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: "Library/CapacitorDatabase",
      iosIsEncryption: false,
      iosKeychainPrefix: "com.frost.languagelearning",
      androidIsEncryption: false
    }
  }
};

export default config;
