import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "../lib/firebase";
import type { TripId } from "../types/trip";
import type { TripPlace } from "../types/tripPlace";

const BASE_URL = "/api/trip-places";
const usesFirebaseData = import.meta.env.VITE_AUTH_PROVIDER === "firebase";

const getFirebaseUserId = () => {
  const userId = getFirebaseAuth().currentUser?.uid;
  if (!userId) throw new Error("ログイン状態を確認できませんでした");
  return userId;
};

const getTripReference = (userId: string, tripId: TripId) =>
  doc(getFirebaseFirestore(), "users", userId, "trips", String(tripId));

const toTripPlace = (
  id: string,
  tripId: TripId,
  data: { name: string; isVisited: boolean }
): TripPlace => ({
  id,
  trip_id: tripId,
  name: data.name,
  is_visited: data.isVisited,
});

export const getTripPlaces = async (tripId: TripId): Promise<TripPlace[]> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    const snapshot = await getDocs(collection(getTripReference(userId, tripId), "places"));
    return snapshot.docs
      .map((place) =>
        toTripPlace(place.id, tripId, place.data() as { name: string; isVisited: boolean })
      )
      .sort((first, second) => first.name.localeCompare(second.name, "ja"));
  }

  const response = await fetch(`${BASE_URL}/trips/${tripId}`, { credentials: "include" });
  if (!response.ok) throw new Error("行きたい場所の取得に失敗しました");
  return response.json() as Promise<TripPlace[]>;
};

export const createTripPlace = async (tripId: TripId, name: string): Promise<TripPlace> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    const data = { name: name.trim(), isVisited: false };
    const reference = await addDoc(collection(getTripReference(userId, tripId), "places"), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return toTripPlace(reference.id, tripId, data);
  }

  const response = await fetch(`${BASE_URL}/trips/${tripId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("行きたい場所の追加に失敗しました");
  return response.json() as Promise<TripPlace>;
};

export const updateTripPlace = async (
  tripId: TripId,
  placeId: TripId,
  isVisited: boolean
): Promise<void> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    await updateDoc(doc(getTripReference(userId, tripId), "places", String(placeId)), {
      isVisited,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const response = await fetch(`${BASE_URL}/${placeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ is_visited: isVisited }),
  });
  if (!response.ok) throw new Error("行きたい場所の更新に失敗しました");
};

export const deleteTripPlace = async (tripId: TripId, placeId: TripId): Promise<void> => {
  if (usesFirebaseData) {
    const userId = getFirebaseUserId();
    const tripReference = getTripReference(userId, tripId);
    const placeReference = doc(tripReference, "places", String(placeId));
    const relatedItineraries = await getDocs(
      query(
        collection(tripReference, "itineraryItems"),
        where("tripPlaceId", "==", String(placeId))
      )
    );
    const batch = writeBatch(getFirebaseFirestore());
    relatedItineraries.docs.forEach((item) => {
      batch.update(item.ref, { tripPlaceId: null, updatedAt: serverTimestamp() });
    });
    batch.delete(placeReference);
    await batch.commit();
    return;
  }

  const response = await fetch(`${BASE_URL}/${placeId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error("行きたい場所の削除に失敗しました");
};
