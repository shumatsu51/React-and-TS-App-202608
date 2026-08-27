import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredConfigKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const;

export const isFirebaseConfigured = requiredConfigKeys.every((key) => Boolean(firebaseConfig[key]));

const getFirebaseApp = (): FirebaseApp => {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase の設定値が不足しています。frontend/.env に VITE_FIREBASE_* を設定してください。"
    );
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
};

let emulatorsConnected = false;

const connectEmulatorsIfEnabled = () => {
  if (emulatorsConnected || import.meta.env.VITE_USE_FIREBASE_EMULATORS !== "true") return;

  const app = getFirebaseApp();
  connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099");
  connectFirestoreEmulator(getFirestore(app), "127.0.0.1", 8080);
  emulatorsConnected = true;
};

export const getFirebaseAuth = () => {
  connectEmulatorsIfEnabled();
  return getAuth(getFirebaseApp());
};

export const getFirebaseFirestore = () => {
  connectEmulatorsIfEnabled();
  return getFirestore(getFirebaseApp());
};
