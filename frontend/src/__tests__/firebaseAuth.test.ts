import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  getFirebaseAuth: vi.fn(),
  getFirebaseFirestore: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
  onAuthStateChanged: mocks.onAuthStateChanged,
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  signOut: mocks.signOut,
}));

vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  serverTimestamp: mocks.serverTimestamp,
  setDoc: mocks.setDoc,
}));

vi.mock("../lib/firebase", () => ({
  getFirebaseAuth: mocks.getFirebaseAuth,
  getFirebaseFirestore: mocks.getFirebaseFirestore,
}));

import {
  firebaseLogin,
  firebaseLogout,
  firebaseSignup,
  subscribeToFirebaseAuth,
} from "../api/firebaseAuth";

describe("firebaseAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFirebaseAuth.mockReturnValue("firebase-auth");
    mocks.getFirebaseFirestore.mockReturnValue("firestore");
    mocks.doc.mockReturnValue("users/firebase-user-id");
    mocks.serverTimestamp.mockReturnValue("server-timestamp");
  });

  it("新規登録時に Authentication ユーザーと Firestore プロフィールを作成する", async () => {
    mocks.createUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: "firebase-user-id", email: "test@example.com" },
    });
    mocks.setDoc.mockResolvedValue(undefined);

    await firebaseSignup({ email: " test@example.com ", password: "password123" });

    expect(mocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      "firebase-auth",
      "test@example.com",
      "password123"
    );
    expect(mocks.doc).toHaveBeenCalledWith("firestore", "users", "firebase-user-id");
    expect(mocks.setDoc).toHaveBeenCalledWith("users/firebase-user-id", {
      email: "test@example.com",
      createdAt: "server-timestamp",
      updatedAt: "server-timestamp",
    });
  });

  it("Authentication のエラーを画面向けメッセージに変換する", async () => {
    mocks.createUserWithEmailAndPassword.mockRejectedValue({ code: "auth/email-already-in-use" });

    await expect(
      firebaseSignup({ email: "test@example.com", password: "password123" })
    ).rejects.toThrow("このメールアドレスは既に登録されています");
  });

  it("ログイン、ログアウト、ログイン状態監視を Firebase SDK に委譲する", async () => {
    const callback = vi.fn();
    const unsubscribe = vi.fn();
    mocks.onAuthStateChanged.mockReturnValue(unsubscribe);
    mocks.signInWithEmailAndPassword.mockResolvedValue(undefined);
    mocks.signOut.mockResolvedValue(undefined);

    expect(subscribeToFirebaseAuth(callback)).toBe(unsubscribe);
    await firebaseLogin({ email: " test@example.com ", password: "password123" });
    await firebaseLogout();

    expect(mocks.onAuthStateChanged).toHaveBeenCalledWith("firebase-auth", expect.any(Function));
    expect(mocks.signInWithEmailAndPassword).toHaveBeenCalledWith(
      "firebase-auth",
      "test@example.com",
      "password123"
    );
    expect(mocks.signOut).toHaveBeenCalledWith("firebase-auth");
  });
});
