import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "../lib/firebase";
import type { ItineraryItem, ItineraryItemInput } from "../types/itineraryItem";
import type { TripId } from "../types/trip";

const BASE_URL = "/api/itinerary-items";
const usesFirebaseData = import.meta.env.VITE_AUTH_PROVIDER === "firebase";

const getFirebaseUserId = () => {
  const userId = getFirebaseAuth().currentUser?.uid;
  if (!userId) throw new Error("ログイン状態を確認できませんでした");
  return userId;
};

const getTripReference = (userId: string, tripId: TripId) =>
  doc(getFirebaseFirestore(), "users", userId, "trips", String(tripId));

const toItineraryItem = (
  id: string,
  tripId: TripId,
  data: {
    scheduledDate: string;
    startTime: string | null;
    endTime: string | null;
    placeName: string;
    tripPlaceId: string | null;
    memo: string | null;
    sortOrder: number;
  }
): ItineraryItem => ({
  id,
  trip_id: tripId,
  scheduled_date: data.scheduledDate,
  start_time: data.startTime,
  end_time: data.endTime,
  place_name: data.placeName,
  trip_place_id: data.tripPlaceId,
  memo: data.memo,
  sort_order: data.sortOrder,
});

const firebaseItemData = (input: ItineraryItemInput, sortOrder: number) => ({
  scheduledDate: input.scheduled_date,
  startTime: input.start_time,
  endTime: input.end_time,
  placeName: input.place_name.trim(),
  tripPlaceId: input.trip_place_id === null ? null : String(input.trip_place_id),
  memo: input.memo?.trim() || null,
  sortOrder,
});

const getErrorMessage = async (response: Response, fallback: string) => {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
};

export const getItineraryItems = async (tripId: TripId): Promise<ItineraryItem[]> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    const snapshot = await getDocs(collection(getTripReference(userId, tripId), "itineraryItems"));
    return snapshot.docs
      .map((item) =>
        toItineraryItem(item.id, tripId, item.data() as Parameters<typeof toItineraryItem>[2])
      )
      .sort(
        (first, second) =>
          first.scheduled_date.localeCompare(second.scheduled_date) ||
          first.sort_order - second.sort_order ||
          String(first.id).localeCompare(String(second.id))
      );
  }

  const response = await fetch(`${BASE_URL}/trips/${tripId}`, { credentials: "include" });
  if (!response.ok) throw new Error(await getErrorMessage(response, "旅程の取得に失敗しました"));
  return response.json() as Promise<ItineraryItem[]>;
};

export const createItineraryItem = async (
  tripId: TripId,
  input: ItineraryItemInput
): Promise<ItineraryItem> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    const tripReference = getTripReference(userId, tripId);
    const existingItems = await getItineraryItems(tripId);
    const sortOrder =
      existingItems
        .filter((item) => item.scheduled_date === input.scheduled_date)
        .reduce((max, item) => Math.max(max, item.sort_order), 0) + 1;
    const data = firebaseItemData(input, sortOrder);
    const reference = await addDoc(collection(tripReference, "itineraryItems"), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return toItineraryItem(reference.id, tripId, data);
  }

  const response = await fetch(`${BASE_URL}/trips/${tripId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, "旅程の追加に失敗しました"));
  return response.json() as Promise<ItineraryItem>;
};

export const updateItineraryItem = async (
  tripId: TripId,
  itemId: TripId,
  input: ItineraryItemInput
): Promise<ItineraryItem> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    const existingItem = (await getItineraryItems(tripId)).find((item) => item.id === itemId);
    if (!existingItem) throw new Error("旅程が見つかりません");
    const data = firebaseItemData(input, existingItem.sort_order);
    await updateDoc(doc(getTripReference(userId, tripId), "itineraryItems", String(itemId)), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return toItineraryItem(String(itemId), tripId, data);
  }

  const response = await fetch(`${BASE_URL}/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, "旅程の更新に失敗しました"));
  return response.json() as Promise<ItineraryItem>;
};

export const deleteItineraryItem = async (tripId: TripId, itemId: TripId): Promise<void> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    await deleteDoc(doc(getTripReference(userId, tripId), "itineraryItems", String(itemId)));
    return;
  }

  const response = await fetch(`${BASE_URL}/${itemId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error(await getErrorMessage(response, "旅程の削除に失敗しました"));
};

export const reorderItineraryItems = async (
  tripId: TripId,
  scheduledDate: string,
  itemIds: TripId[]
): Promise<void> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    const tripReference = getTripReference(userId, tripId);
    const batch = writeBatch(getFirebaseFirestore());
    itemIds.forEach((itemId, index) => {
      batch.update(doc(tripReference, "itineraryItems", String(itemId)), {
        sortOrder: index + 1,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    return;
  }

  const response = await fetch(`${BASE_URL}/trips/${tripId}/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ scheduled_date: scheduledDate, item_ids: itemIds }),
  });
  if (!response.ok)
    throw new Error(await getErrorMessage(response, "旅程の並び替えに失敗しました"));
};
