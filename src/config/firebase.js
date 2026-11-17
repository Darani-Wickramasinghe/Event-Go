// Reads Expo configuration and initializes Firebase Auth and Firestore when configured.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as authModule from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const { getAuth, initializeAuth } = authModule;
const getReactNativePersistence = authModule.getReactNativePersistence;
let Platform = { OS: "web" };
try {
  const rn = require("react-native");
  if (rn && rn.Platform) Platform = rn.Platform;
} catch (e) {
  // Running in Node.js test environment
}

// Values come from the .env file (see .env.example). Each teammate has their own .env.
// Read project settings that Expo exposes to the running app.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

const required = ["apiKey", "authDomain", "projectId", "appId"];
// Keep Firebase off when any required project setting is missing.
const missing = required.filter((key) => !firebaseConfig[key]);

// If .env is missing, the app still runs (demo mode) instead of crashing.
export const isFirebaseConfigured = missing.length === 0;

if (!isFirebaseConfigured) {
  console.warn(`[Firebase] Not configured. Missing: ${missing.join(", ")}. Check your .env file.`);
}

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  const firstTime = getApps().length === 0;
  app = firstTime ? initializeApp(firebaseConfig) : getApp();

  // Keep the user signed in after the app closes (phone). The browser handles this itself.
  auth = firstTime && Platform.OS !== "web" && typeof getReactNativePersistence === "function" && typeof initializeAuth === "function"
    ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
    : getAuth(app);

  db = getFirestore(app);
}

export { app, auth, db };
