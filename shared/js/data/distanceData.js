import { doc, setDoc, increment } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../firebase.js";

/** Одна спроба отримати поточну геопозицію. Якщо юзер не дав дозвіл — просто відхиляється, км не пишуться. */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Геолокація не підтримується цим браузером"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

/** Відстань по прямій між двома точками в метрах (формула Haversine) */
export function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
}

/**
 * Записує відстань "точка А (старт квесту) → точка Б (завершення квесту)".
 * Пише в конкретний прогрес квесту + додає до загальної суми на users/{uid}.totalDistanceMeters.
 */
export async function recordQuestDistance(uid, questId, meters) {
  if (!uid || !questId || !meters || meters <= 0) return;

  await setDoc(
    doc(db, "users", uid, "questProgress", String(questId)),
    { distanceMeters: Math.round(meters) },
    { merge: true },
  );

  await setDoc(
    doc(db, "users", uid),
    { totalDistanceMeters: increment(Math.round(meters)) },
    { merge: true },
  );
}