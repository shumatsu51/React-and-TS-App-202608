import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

const projectId = "demo-trip-app";
const ownerId = "owner";
const otherUserId = "other-user";
const rules = readFileSync(fileURLToPath(new URL("../../firestore.rules", import.meta.url)), "utf8");

let testEnvironment: RulesTestEnvironment;

const tripData = () => ({
  title: "京都旅行",
  startDate: "2026-08-20",
  endDate: "2026-08-22",
  description: null,
  budgetAmount: 100000,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

const createTripAsOwner = async (tripId = "kyoto") => {
  const firestore = testEnvironment.authenticatedContext(ownerId, { email: "owner@example.com" }).firestore();
  await assertSucceeds(setDoc(doc(firestore, "users", ownerId, "trips", tripId), tripData()));
};

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });
});

afterEach(async () => {
  await testEnvironment.clearFirestore();
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("Cloud Firestore Security Rules", () => {
  it("未認証ユーザーによる旅行の取得を拒否する", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", ownerId, "trips", "kyoto"), {
        ...tripData(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await assertFails(getDoc(doc(testEnvironment.unauthenticatedContext().firestore(), "users", ownerId, "trips", "kyoto")));
  });

  it("所有者は有効な旅行を作成できる", async () => {
    await createTripAsOwner();
  });

  it("別ユーザーのパスに旅行を作成できない", async () => {
    const firestore = testEnvironment.authenticatedContext(ownerId, { email: "owner@example.com" }).firestore();

    await assertFails(setDoc(doc(firestore, "users", otherUserId, "trips", "forbidden"), tripData()));
  });

  it("許可されていないフィールドを持つ旅行を拒否する", async () => {
    const firestore = testEnvironment.authenticatedContext(ownerId, { email: "owner@example.com" }).firestore();

    await assertFails(
      setDoc(doc(firestore, "users", ownerId, "trips", "invalid"), {
        ...tripData(),
        userId: otherUserId,
      })
    );
  });

  it("旅行期間外の旅程を拒否する", async () => {
    await createTripAsOwner();
    const firestore = testEnvironment.authenticatedContext(ownerId, { email: "owner@example.com" }).firestore();

    await assertFails(
      setDoc(doc(firestore, "users", ownerId, "trips", "kyoto", "itineraryItems", "outside"), {
        scheduledDate: "2026-08-23",
        startTime: "10:00",
        endTime: "11:00",
        placeName: "京都駅",
        tripPlaceId: null,
        memo: null,
        sortOrder: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("親の旅行がない行きたい場所を拒否する", async () => {
    const firestore = testEnvironment.authenticatedContext(ownerId, { email: "owner@example.com" }).firestore();

    await assertFails(
      setDoc(doc(firestore, "users", ownerId, "trips", "missing", "places", "station"), {
        name: "京都駅",
        isVisited: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("同じ旅行の行きたい場所を参照する旅程を作成できる", async () => {
    await createTripAsOwner();
    const firestore = testEnvironment.authenticatedContext(ownerId, { email: "owner@example.com" }).firestore();

    await assertSucceeds(
      setDoc(doc(firestore, "users", ownerId, "trips", "kyoto", "places", "station"), {
        name: "京都駅",
        isVisited: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    await assertSucceeds(
      setDoc(doc(firestore, "users", ownerId, "trips", "kyoto", "itineraryItems", "station-visit"), {
        scheduledDate: "2026-08-20",
        startTime: "10:00",
        endTime: "11:00",
        placeName: "京都駅",
        tripPlaceId: "station",
        memo: null,
        sortOrder: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("無効な費用カテゴリを拒否する", async () => {
    await createTripAsOwner();
    const firestore = testEnvironment.authenticatedContext(ownerId, { email: "owner@example.com" }).firestore();

    await assertFails(
      setDoc(doc(firestore, "users", ownerId, "trips", "kyoto", "expenses", "invalid-category"), {
        description: "新幹線",
        category: "invalid",
        amount: 14000,
        paymentStatus: "paid",
        paidAt: "2026-08-01",
        memo: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("所有者は自分の旅行を削除できる", async () => {
    await createTripAsOwner();
    const firestore = testEnvironment.authenticatedContext(ownerId, { email: "owner@example.com" }).firestore();

    await assertSucceeds(deleteDoc(doc(firestore, "users", ownerId, "trips", "kyoto")));
  });
});
