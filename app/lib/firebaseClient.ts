import { initializeApp, getApps } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

let persistencePromise: Promise<void> | null = null;

export async function ensureAuthPersistence() {
  if (typeof window === "undefined") return;

  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence)
      .then(() => {})
      .catch((error) => {
        persistencePromise = null;
        throw error;
      });
  }

  return persistencePromise;
}