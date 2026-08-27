import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "../lib/firebase";
import type { Trip, TripId, TripInput } from "../types/trip";

const BASE_URL = "/api/trips";
const usesFirebaseTrips = import.meta.env.VITE_AUTH_PROVIDER === "firebase";

type FirestoreTrip = {
  title: string;
  startDate: string;
  endDate: string;
  description: string | null;
};

const getFirebaseUserId = (): string => {
  const userId = getFirebaseAuth().currentUser?.uid;
  if (!userId) {
    throw new Error("ログイン状態を確認できませんでした");
  }
  return userId;
};

const getTripsCollection = (userId: string) =>
  collection(getFirebaseFirestore(), "users", userId, "trips");

const toTrip = (id: string, userId: string, data: FirestoreTrip): Trip => ({
  id,
  user_id: userId,
  title: data.title,
  start_date: data.startDate,
  end_date: data.endDate,
  description: data.description,
});

const firebaseTripData = (input: TripInput) => ({
  title: input.title.trim(),
  startDate: input.startDate,
  endDate: input.endDate,
  description: input.description.trim() || null,
});

const deleteSubcollection = async (
  tripReference: ReturnType<typeof doc>,
  collectionName: "places" | "itineraryItems" | "expenses"
) => {
  const snapshot = await getDocs(collection(tripReference, collectionName));
  const documents = snapshot.docs;

  for (let index = 0; index < documents.length; index += 500) {
    const batch = writeBatch(getFirebaseFirestore());
    documents.slice(index, index + 500).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
};

const getResponseError = async (response: Response, fallback: string) => {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? fallback;
};

export const getTrips = async (): Promise<Trip[]> => {
  if (usesFirebaseTrips) {
    const userId = getFirebaseUserId();
    const snapshot = await getDocs(query(getTripsCollection(userId), orderBy("startDate", "asc")));
    return snapshot.docs.map((trip) => toTrip(trip.id, userId, trip.data() as FirestoreTrip));
  }

  const response = await fetch(BASE_URL, { credentials: "include" });
  if (!response.ok) throw new Error("旅行一覧の取得に失敗しました");
  return response.json() as Promise<Trip[]>;
};

export const getTrip = async (id: TripId): Promise<Trip> => {
  if (usesFirebaseTrips) {
    const userId = getFirebaseUserId();
    const snapshot = await getDoc(doc(getTripsCollection(userId), String(id)));
    if (!snapshot.exists()) throw new Error("旅行情報が見つかりません");
    return toTrip(snapshot.id, userId, snapshot.data() as FirestoreTrip);
  }

  const response = await fetch(`${BASE_URL}/${id}`, { credentials: "include" });
  if (!response.ok) throw new Error("旅行情報の取得に失敗しました");
  return response.json() as Promise<Trip>;
};

export const createTrip = async (input: TripInput): Promise<Trip> => {
  if (usesFirebaseTrips) {
    const userId = getFirebaseUserId();
    const data = firebaseTripData(input);
    const reference = await addDoc(getTripsCollection(userId), {
      ...data,
      budgetAmount: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return toTrip(reference.id, userId, data);
  }

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      title: input.title,
      start_date: input.startDate,
      end_date: input.endDate,
      description: input.description,
    }),
  });
  if (!response.ok)
    throw new Error(await getResponseError(response, "旅行情報の登録に失敗しました"));
  return response.json() as Promise<Trip>;
};

export const updateTrip = async (id: TripId, input: TripInput): Promise<void> => {
  if (usesFirebaseTrips) {
    const userId = getFirebaseUserId();
    const tripReference = doc(getTripsCollection(userId), String(id));
    const itinerarySnapshot = await getDocs(collection(tripReference, "itineraryItems"));
    const hasOutOfPeriodItem = itinerarySnapshot.docs.some((item) => {
      const scheduledDate = (item.data() as { scheduledDate?: unknown }).scheduledDate;
      return (
        typeof scheduledDate === "string" &&
        (scheduledDate < input.startDate || scheduledDate > input.endDate)
      );
    });
    if (hasOutOfPeriodItem) {
      throw new Error("旅行期間外になる旅程があります。先に旅程の日付を変更または削除してください");
    }
    await updateDoc(tripReference, {
      ...firebaseTripData(input),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      title: input.title,
      start_date: input.startDate,
      end_date: input.endDate,
      description: input.description,
    }),
  });
  if (!response.ok)
    throw new Error(await getResponseError(response, "旅行情報の更新に失敗しました"));
};

export const deleteTrip = async (id: TripId): Promise<void> => {
  if (usesFirebaseTrips) {
    const userId = getFirebaseUserId();
    const tripReference = doc(getTripsCollection(userId), String(id));
    await Promise.all([
      deleteSubcollection(tripReference, "places"),
      deleteSubcollection(tripReference, "itineraryItems"),
      deleteSubcollection(tripReference, "expenses"),
    ]);
    await deleteDoc(tripReference);
    return;
  }

  const response = await fetch(`${BASE_URL}/${id}`, { method: "DELETE", credentials: "include" });
  if (!response.ok) throw new Error("旅行の削除に失敗しました");
};

export const updateTripBudget = async (id: TripId, budgetAmount: number | null): Promise<void> => {
  if (usesFirebaseTrips) {
    const userId = getFirebaseUserId();
    await updateDoc(doc(getTripsCollection(userId), String(id)), {
      budgetAmount,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const response = await fetch(`${BASE_URL}/${id}/budget`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ budget_amount: budgetAmount }),
  });
  if (!response.ok) throw new Error(await getResponseError(response, "予算の更新に失敗しました"));
};
