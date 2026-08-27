import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
  getFirebaseAuth: vi.fn(),
  getFirebaseFirestore: vi.fn(),
}));

vi.mock("firebase/firestore", () => mocks);
vi.mock("../lib/firebase", () => ({
  getFirebaseAuth: mocks.getFirebaseAuth,
  getFirebaseFirestore: mocks.getFirebaseFirestore,
}));

describe("Firebase の旅行サブコレクション API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    vi.clearAllMocks();
    mocks.getFirebaseAuth.mockReturnValue({ currentUser: { uid: "firebase-user-id" } });
    mocks.getFirebaseFirestore.mockReturnValue("firestore");
    mocks.doc.mockImplementation((...path: unknown[]) => path.join("/"));
    mocks.collection.mockImplementation((...path: unknown[]) => path.join("/"));
    mocks.serverTimestamp.mockReturnValue("server-timestamp");
    mocks.writeBatch.mockReturnValue({
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("行きたい場所を旅行配下に保存し、削除時に参照する旅程を解除する", async () => {
    mocks.addDoc.mockResolvedValue({ id: "place-a" });
    mocks.getDocs.mockResolvedValue({
      docs: [{ ref: "itinerary-reference" }],
    });
    const { createTripPlace, deleteTripPlace } = await import("../api/tripPlaces");

    await createTripPlace("trip-a", " 清水寺 ");
    await deleteTripPlace("trip-a", "place-a");

    expect(mocks.addDoc).toHaveBeenCalledWith(
      "firestore/users/firebase-user-id/trips/trip-a/places",
      {
        name: "清水寺",
        isVisited: false,
        createdAt: "server-timestamp",
        updatedAt: "server-timestamp",
      }
    );
    const batch = mocks.writeBatch.mock.results[0]?.value;
    expect(batch.update).toHaveBeenCalledWith("itinerary-reference", {
      tripPlaceId: null,
      updatedAt: "server-timestamp",
    });
    expect(batch.delete).toHaveBeenCalledWith(
      "firestore/users/firebase-user-id/trips/trip-a/places/place-a"
    );
  });

  it("旅程を旅行配下に作成し、同じ日の最大順序の末尾へ追加する", async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: "item-a",
          data: () => ({
            scheduledDate: "2026-10-01",
            startTime: null,
            endTime: null,
            placeName: "京都駅",
            tripPlaceId: null,
            memo: null,
            sortOrder: 2,
          }),
        },
      ],
    });
    mocks.addDoc.mockResolvedValue({ id: "item-b" });
    const { createItineraryItem } = await import("../api/itineraryItems");

    await createItineraryItem("trip-a", {
      scheduled_date: "2026-10-01",
      start_time: "10:00",
      end_time: "11:00",
      place_name: "清水寺",
      trip_place_id: "place-a",
      memo: "紅葉",
    });

    expect(mocks.addDoc).toHaveBeenCalledWith(
      "firestore/users/firebase-user-id/trips/trip-a/itineraryItems",
      expect.objectContaining({
        scheduledDate: "2026-10-01",
        tripPlaceId: "place-a",
        sortOrder: 3,
        createdAt: "server-timestamp",
        updatedAt: "server-timestamp",
      })
    );
  });

  it("費用と旅行予算から画面用の集計値を生成する", async () => {
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ budgetAmount: 10_000 }),
    });
    mocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: "expense-a",
          data: () => ({
            description: "新幹線",
            category: "transport",
            amount: 8_000,
            paymentStatus: "paid",
            paidAt: "2026-10-01",
            memo: null,
          }),
        },
      ],
    });
    const { getTripExpenses } = await import("../api/tripExpenses");

    await expect(getTripExpenses("trip-a")).resolves.toMatchObject({
      budget_amount: 10_000,
      total_amount: 8_000,
      paid_amount: 8_000,
      remaining_budget: 2_000,
      expenses: [expect.objectContaining({ id: "expense-a", trip_id: "trip-a" })],
    });
  });
});
