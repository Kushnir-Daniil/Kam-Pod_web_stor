import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  increment,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db, auth } from "../firebase.js";

/**
 * Прогрес зберігається в users/{uid}/questProgress/{questId}
 * {
 *   questId, storyCompleted, comicCompleted, gameCompleted,
 *   rewardGranted, completedAt, startedAt, distanceMeters
 * }
 */

function progressRef(uid, questId) {
  return doc(db, "users", uid, "questProgress", String(questId));
}

function progressCol(uid) {
  return collection(db, "users", uid, "questProgress");
}

export async function getQuestProgress(uid, questId) {
  const snap = await getDoc(progressRef(uid, questId));
  if (!snap.exists()) return null;
  return { questId, ...snap.data() };
}

export async function getAllProgress(uid) {
  const snap = await getDocs(progressCol(uid));
  return snap.docs.map((d) => ({ questId: d.id, ...d.data() }));
}

/**
 * Визначає, чи потрібна частина квесту (історія/комікс/гра) взагалі присутня.
 * Немає сенсу вимагати "пройти комікс", якого адмін не додав.
 */
function requiredParts(quest) {
  return {
    story: (quest?.story?.pages || []).length > 0,
    comic: (quest?.comic?.scenes || []).length > 0,
    game: Boolean(quest?.game?.buildFolder),
  };
}

function isFullyCompleted(required, progress) {
  if (required.story && !progress.storyCompleted) return false;
  if (required.comic && !progress.comicCompleted) return false;
  if (required.game && !progress.gameCompleted) return false;
  return true;
}

/**
 * Позначає частину квесту пройденою. Якщо після цього всі потрібні
 * частини завершені і нагорода ще не видана — нараховує XP/монети.
 *
 * Повертає { ...payload, justCompleted } — justCompleted true лише тоді,
 * коли САМЕ ЦЕЙ виклик завершив квест повністю (а не повторний виклик
 * уже завершеного квесту). Використовується для запису пройденої відстані
 * (точка Б фіксується лише один раз, у момент реального завершення).
 */
export async function markPartCompleted(quest, part) {
  const uid = auth.currentUser?.uid;
  if (!uid || !quest?.id) return null;

  const existing = (await getQuestProgress(uid, quest.id)) || {
    storyCompleted: false,
    comicCompleted: false,
    gameCompleted: false,
    rewardGranted: false,
    startedAt: serverTimestamp(),
  };

  const updated = {
    ...existing,
    [`${part}Completed`]: true,
  };

  const required = requiredParts(quest);
  const done = isFullyCompleted(required, updated);
  const justCompleted = done && !existing.rewardGranted;

  const payload = {
    ...updated,
    completedAt: done && !existing.completedAt ? serverTimestamp() : existing.completedAt || null,
  };

  await setDoc(progressRef(uid, quest.id), payload, { merge: true });

  if (justCompleted) {
    await grantRewards(uid, quest);
    await setDoc(progressRef(uid, quest.id), { rewardGranted: true }, { merge: true });
  }

  return { ...payload, justCompleted };
}

async function grantRewards(uid, quest) {
  const xp = Number(quest.rewards?.xp || 0);
  const coins = Number(quest.rewards?.coins || 0);
  if (!xp && !coins) return;

  await setDoc(
    doc(db, "users", uid),
    { xp: increment(xp), coins: increment(coins) },
    { merge: true },
  );
}

/** Кількість повністю пройдених квестів (для профілю) */
export async function getCompletedQuestsCount(uid) {
  const all = await getAllProgress(uid);
  return all.filter((p) => p.completedAt).length;
}

/** Список пройдених квестів для «Щоденника пригод» (сортовано за датою) */
export async function getCompletedProgress(uid) {
  const all = await getAllProgress(uid);
  return all
    .filter((p) => p.completedAt)
    .sort((a, b) => {
      const at = a.completedAt?.toMillis ? a.completedAt.toMillis() : 0;
      const bt = b.completedAt?.toMillis ? b.completedAt.toMillis() : 0;
      return bt - at;
    });
}