import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// 🟢 1. Added Remote Config imports
import { getRemoteConfig, RemoteConfig } from 'firebase/remote-config';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton pattern: Check if app is already initialized to prevent errors during hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

// 🟢 2. Safely initialize Remote Config for Next.js (Client-only)
export let remoteConfig: RemoteConfig | null = null;

if (typeof window !== 'undefined') {
  remoteConfig = getRemoteConfig(app);
  // Optional: Set fetch interval to 1 minute for testing
  remoteConfig.settings.minimumFetchIntervalMillis = 60000; 
}