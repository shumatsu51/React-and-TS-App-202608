import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { LoginPayload, SignupPayload, User } from "../types/user";
import { getFirebaseAuth, getFirebaseFirestore } from "../lib/firebase";

const toUser = (firebaseUser: FirebaseUser): User => ({
  id: firebaseUser.uid,
  email: firebaseUser.email ?? "",
  created_at: firebaseUser.metadata.creationTime ?? new Date().toISOString(),
});

const formatAuthError = (error: unknown, fallback: string): Error => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return new Error("このメールアドレスは既に登録されています");
    case "auth/invalid-email":
      return new Error("メールアドレスの形式が正しくありません");
    case "auth/weak-password":
      return new Error("パスワードは8文字以上で入力してください");
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return new Error("メールアドレスまたはパスワードが正しくありません");
    case "auth/too-many-requests":
      return new Error("試行回数が多すぎます。時間をおいて再度お試しください");
    default:
      return new Error(fallback);
  }
};

const createUserProfile = async (firebaseUser: FirebaseUser): Promise<void> => {
  if (!firebaseUser.email) {
    throw new Error("メールアドレスを取得できませんでした");
  }

  await setDoc(doc(getFirebaseFirestore(), "users", firebaseUser.uid), {
    email: firebaseUser.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToFirebaseAuth = (callback: (user: User | null) => void) =>
  onAuthStateChanged(getFirebaseAuth(), (firebaseUser) =>
    callback(firebaseUser ? toUser(firebaseUser) : null)
  );

export const firebaseSignup = async (payload: SignupPayload): Promise<void> => {
  try {
    const credential = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      payload.email.trim(),
      payload.password
    );
    await createUserProfile(credential.user);
  } catch (error) {
    throw formatAuthError(error, "登録に失敗しました");
  }
};

export const firebaseLogin = async (payload: LoginPayload): Promise<void> => {
  try {
    await signInWithEmailAndPassword(getFirebaseAuth(), payload.email.trim(), payload.password);
  } catch (error) {
    throw formatAuthError(error, "ログインに失敗しました");
  }
};

export const firebaseLogout = async (): Promise<void> => {
  await signOut(getFirebaseAuth());
};
