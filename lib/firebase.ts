import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Use memory cache on client to avoid Safari/IndexedDB hangs (firebase/firebase-js-sdk#7940)
// On server, use default getFirestore.
let db: ReturnType<typeof getFirestore>;
if (typeof window !== "undefined") {
  try {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
  } catch {
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}
export { db };
