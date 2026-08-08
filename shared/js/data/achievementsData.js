import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../firebase.js";

/**
 * Типи критеріїв розблокування ачивменту.
 * QUESTS_COMPLETED / UNIQUE_PLACES / LEVEL — рахуються автоматично зі статистики юзера.
 * MANUAL — адмін видає ачивку конкретному юзеру вручну (для критеріїв, які не можна порахувати формулою).
 */
export const ACHIEVEMENT_CRITERIA = {
  QUESTS_COMPLETED: "quests_completed",
  UNIQUE_PLACES: "unique_places",
  LEVEL: "level",
  MANUAL: "manual",
};

export const CRITERIA_LABELS = {
  [ACHIEVEMENT_CRITERIA.QUESTS_COMPLETED]: "Пройдено квестів (кількість)",
  [ACHIEVEMENT_CRITERIA.UNIQUE_PLACES]: "Відкрито унікальних місць",
  [ACHIEVEMENT_CRITERIA.LEVEL]: "Досягнуто XP-рівня (1=Новачок, 2=Шукач…)",
  [ACHIEVEMENT_CRITERIA.MANUAL]: "Вручну (адмін видає особисто)",
};

const achievementsCol = collection(db, "achievements");

export function createEmptyAchievement(partial = {}) {
  return {
    title: "",
    description: "",
    icon: "",
    criteriaType: ACHIEVEMENT_CRITERIA.QUESTS_COMPLETED,
    criteriaValue: 1,
    order: 0,
    ...partial,
  };
}

/** Всі ачивменти, відсортовані за полем order */
export async function getAchievements() {
  const q = query(achievementsCol, orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAchievementById(id) {
  const snap = await getDoc(doc(db, "achievements", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addAchievement(data) {
  const payload = { ...createEmptyAchievement(data), createdAt: serverTimestamp() };
  const ref = await addDoc(achievementsCol, payload);
  return { id: ref.id, ...payload };
}

export async function updateAchievement(id, data) {
  await updateDoc(doc(db, "achievements", id), data);
  return { id, ...data };
}

export async function deleteAchievement(id) {
  await deleteDoc(doc(db, "achievements", id));
}

/**
 * Перевіряє, чи виконано умову обчислюваного ачивменту на основі статистики юзера.
 * stats: { completedQuests, uniquePlaces, levelIndex }
 * Для criteriaType MANUAL завжди повертає false — такі перевіряються окремо через getManualUnlockedIds().
 */
export function isAchievementUnlockedByStats(achievement, stats) {
  const value = Number(achievement.criteriaValue) || 0;
  switch (achievement.criteriaType) {
    case ACHIEVEMENT_CRITERIA.QUESTS_COMPLETED:
      return (stats.completedQuests || 0) >= value;
    case ACHIEVEMENT_CRITERIA.UNIQUE_PLACES:
      return (stats.uniquePlaces || 0) >= value;
    case ACHIEVEMENT_CRITERIA.LEVEL:
      return (stats.levelIndex || 0) >= value;
    default:
      return false;
  }
}

/** ID ачивментів, які адмін вручну видав цьому юзеру (users/{uid}/manualAchievements) */
export async function getManualUnlockedIds(uid) {
  const snap = await getDocs(collection(db, "users", uid, "manualAchievements"));
  return snap.docs.map((d) => d.id);
}

export async function grantManualAchievement(uid, achievementId) {
  await setDoc(doc(db, "users", uid, "manualAchievements", achievementId), {
    grantedAt: serverTimestamp(),
  });
}

export async function revokeManualAchievement(uid, achievementId) {
  await deleteDoc(doc(db, "users", uid, "manualAchievements", achievementId));
}

/**
 * Обчислює повний список ачивментів для конкретного юзера з полем unlocked: true/false.
 * Поєднує обчислювані критерії зі статистики + ручні видачі адміном.
 */
export async function getAchievementsWithUnlockStatus(uid, stats) {
  const [achievements, manualIds] = await Promise.all([
    getAchievements(),
    getManualUnlockedIds(uid),
  ]);
  const manualSet = new Set(manualIds);

  return achievements.map((a) => ({
    ...a,
    unlocked:
      a.criteriaType === ACHIEVEMENT_CRITERIA.MANUAL
        ? manualSet.has(a.id)
        : isAchievementUnlockedByStats(a, stats),
  }));
}

/** Прогрес юзера по ачивментах: коли вперше розблоковано / коли переглянуто (для позначки "НОВЕ") */
export async function getAchievementProgress(uid) {
  const snap = await getDocs(collection(db, "users", uid, "achievementProgress"));
  const map = {};
  snap.docs.forEach((d) => {
    map[d.id] = d.data();
  });
  return map;
}

/** Фіксує момент першого розблокування (викликати один раз, коли unlocked стало true) */
export async function recordAchievementUnlock(uid, achievementId) {
  const ref = doc(db, "users", uid, "achievementProgress", achievementId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { unlockedAt: serverTimestamp(), seenAt: null });
  }
}

export async function markAchievementSeen(uid, achievementId) {
  const ref = doc(db, "users", uid, "achievementProgress", achievementId);
  await setDoc(ref, { seenAt: serverTimestamp() }, { merge: true });
}