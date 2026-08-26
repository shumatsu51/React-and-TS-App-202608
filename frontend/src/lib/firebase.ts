import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

// Firebase Authentication / Firestore への移行時に利用する遅延初期化関数。
// 現時点では既存の JWT + MySQL ローカル環境を維持するため、まだ画面からは呼び出さない。
export const getFirebaseAuth = () => getAuth(getFirebaseApp());
export const getFirebaseFirestore = () => getFirestore(getFirebaseApp());
