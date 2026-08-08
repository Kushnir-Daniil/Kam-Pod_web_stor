import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../firebase.js";

const activityCol = collection(db, "activityLog");

export const ACTIVITY_TYPES = {
  USER_REGISTERED: "user_registered",
  QUEST_CREATED: "quest_created",
  QUEST_PUBLISHED: "quest_published",
  REWARD_GRANTED: "reward_granted",
  SYSTEM: "system",
};

/** Емодзі-іконка для кожного типу події (поки без кастомних картинок) */
export const ACTIVITY_ICONS = {
  [ACTIVITY_TYPES.USER_REGISTERED]: "👤",
  [ACTIVITY_TYPES.QUEST_CREATED]: "🏰",
  [ACTIVITY_TYPES.QUEST_PUBLISHED]: "🏰",
  [ACTIVITY_TYPES.REWARD_GRANTED]: "🏅",
  [ACTIVITY_TYPES.SYSTEM]: "⚙️",
};

/**
 * Записує подію в стрічку активності.
 * title — короткий заголовок ("Новий квест"), description — деталі ("Додано квест «...»")
 */
export async function logActivity(type, title, description = "") {
  await addDoc(activityCol, {
    type,
    title,
    description,
    createdAt: serverTimestamp(),
  });
}

/** Останні N подій, найновіші перші */
export async function getRecentActivity(limitCount = 5) {
  const q = query(activityCol, orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}