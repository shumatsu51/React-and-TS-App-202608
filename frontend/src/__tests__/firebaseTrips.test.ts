import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(),
  getFirebaseAuth: vi.fn(),
  getFirebaseFirestore: vi.fn(),
}));

vi.mock("firebase/firestore", () => mocks);
vi.mock("../lib/firebase", () => ({
  getFirebaseAuth: mocks.getFirebaseAuth,
  getFirebaseFirestore: mocks.getFirebaseFirestore,
}));

describe("Firebase の旅行 API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    vi.clearAllMocks();
    mocks.getFirebaseAuth.mockReturnValue({ currentUser: { uid: "firebase-user-id" } });
    mocks.getFirebaseFirestore.mockReturnValue("firestore");
    mocks.collection.mockReturnValue("trips-collection");
    mocks.doc.mockImplementation((...path: unknown[]) => path.join("/"));
    mocks.orderBy.mockReturnValue("start-date-order");
    mocks.query.mockReturnValue("ordered-trips-query");
    mocks.serverTimestamp.mockReturnValue("server-timestamp");
    mocks.writeBatch.mockReturnValue({
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    });
    mocks.getDocs.mockResolvedValue({ docs: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("自分の旅行だけを開始日順に取得し、画面用の形式に変換する", async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: "trip-a",
          data: () => ({
            title: "京都旅行",
            startDate: "2026-10-01",
            endDate: "2026-10-03",
            description: null,
          }),
        },
      ],
    });
    const { getTrips } = await import("../api/trips");

    await expect(getTrips()).resolves.toEqual([
      {
        id: "trip-a",
        user_id: "firebase-user-id",
        title: "京都旅行",
        start_date: "2026-10-01",
        end_date: "2026-10-03",
        description: null,
      },
    ]);
    expect(mocks.collection).toHaveBeenCalledWith(
      "firestore",
      "users",
      "firebase-user-id",
      "trips"
    );
    expect(mocks.query).toHaveBeenCalledWith("trips-collection", "start-date-order");
  });

  it("旅行作成時に Rules が要求するフィールドとサーバー時刻を保存する", async () => {
    mocks.addDoc.mockResolvedValue({ id: "new-trip" });
    const { createTrip } = await import("../api/trips");

    await createTrip({
      title: " 京都旅行 ",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      description: " 秋の旅行 ",
    });

    expect(mocks.addDoc).toHaveBeenCalledWith("trips-collection", {
      title: "京都旅行",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      description: "秋の旅行",
      budgetAmount: null,
      createdAt: "server-timestamp",
      updatedAt: "server-timestamp",
    });
  });

  it("更新と削除を Firebase UID 配下の旅行ドキュメントに限定する", async () => {
    const { deleteTrip, updateTrip } = await import("../api/trips");

    await updateTrip("trip-a", {
      title: "京都旅行",
      startDate: "2026-10-02",
      endDate: "2026-10-04",
      description: "",
    });
    await deleteTrip("trip-a");

    expect(mocks.updateDoc).toHaveBeenCalledWith("trips-collection/trip-a", {
      title: "京都旅行",
      startDate: "2026-10-02",
      endDate: "2026-10-04",
      description: null,
      updatedAt: "server-timestamp",
    });
    expect(mocks.deleteDoc).toHaveBeenCalledWith("trips-collection/trip-a");
  });
});
