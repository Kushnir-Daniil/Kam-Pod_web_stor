import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { auth, db } from "../firebase.js";

/** Статуси квесту (бібліотека казкаря + модерація) */
export const QUEST_STATUS = Object.freeze({
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  REJECTED: "rejected",
  PUBLISHED: "published",
  ARCHIVED: "archived",
});

export const QUEST_STATUS_LABELS = Object.freeze({
  [QUEST_STATUS.DRAFT]: "У чорнетці",
  [QUEST_STATUS.PENDING_REVIEW]: "На розгляді",
  [QUEST_STATUS.REJECTED]: "Відхилено",
  [QUEST_STATUS.PUBLISHED]: "Опубліковано",
  [QUEST_STATUS.ARCHIVED]: "Архівовано",
});

/**
 * Порожній квест під конструктор.
 * У Firestore: users/{authorId}/quests/{questId}
 */
export function createEmptyQuest(partial = {}) {
  return {
    id: null,
    title: "",
    type: "",
    duration: "",
    description: "",
    coverImage: "",
    rewards: { xp: 0, coins: 0, crystals: 0 },
    authorId: null,
    authorName: "",
    status: QUEST_STATUS.DRAFT,
    reviewNote: "",
    reviewedBy: null,
    reviewedAt: null,
    publishedAt: null,
    story: {
      pages: [],
    },
    comic: {
      scenes: [],
    },
    game: {
      buildFolder: "",
      lockedUntil: "story",
      geo: null,
    },
    ...partial,
  };
}

function requireUid() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Увійдіть в акаунт, щоб працювати з квестами");
  }
  return uid;
}

/** Дочекатись Firebase Auth (після оновлення сторінки currentUser спочатку null) */
export function waitForAuth() {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

async function ensureAuth() {
  await waitForAuth();
}

function questsCol(uid) {
  return collection(db, "users", uid, "quests");
}

function questRef(authorId, questId) {
  return doc(db, "users", authorId, "quests", String(questId));
}

function mapQuestDoc(snap) {
  if (!snap?.exists()) return null;
  const data = snap.data();
  return createEmptyQuest({
    ...data,
    id: data.id || snap.id,
    authorId: data.authorId || snap.ref.parent.parent.id,
  });
}

function toFirestorePayload(quest) {
  const {
    id,
    title,
    type,
    duration,
    description,
    coverImage,
    rewards,
    authorId,
    authorName,
    status,
    reviewNote,
    reviewedBy,
    reviewedAt,
    publishedAt,
    story,
    comic,
    game,
  } = createEmptyQuest(quest);

  return {
    id: id || null,
    title: title || "",
    type: type || "",
    duration: duration || "",
    description: description || "",
    coverImage: coverImage || "",
    rewards: rewards || { xp: 0, coins: 0, crystals: 0 },
    authorId: authorId || null,
    authorName: authorName || "",
    status: status || QUEST_STATUS.DRAFT,
    reviewNote: reviewNote || "",
    reviewedBy: reviewedBy || null,
    reviewedAt: reviewedAt || null,
    publishedAt: publishedAt || null,
    story: story || { pages: [] },
    comic: comic || { scenes: [] },
    game: game || { buildFolder: "", lockedUntil: "story", geo: null },
  };
}

function mapFirestoreError(error) {
  const code = error?.code || "";
  if (code === "permission-denied") {
    return "Немає доступу до Firestore. Перевірте Rules і роль акаунта.";
  }
  if (code === "invalid-argument" || /exceeds|too large|larger than/i.test(error?.message || "")) {
    return "Квест завеликий для збереження (ліміт ~1 МБ). Зменшіть картинки або кількість сторінок.";
  }
  if (code === "failed-precondition") {
    return "Потрібен індекс Firestore (Collection group: quests → status). Створіть його в Console за посиланням з помилки.";
  }
  return error?.message || "Помилка збереження квесту";
}

export function isPublished(quest) {
  return quest?.status === QUEST_STATUS.PUBLISHED;
}

/** Квести поточного казкаря: users/{uid}/quests */
export async function getQuests(authorId = null) {
  await ensureAuth();
  const uid = authorId || auth.currentUser?.uid;
  if (!uid) return [];

  const snap = await getDocs(questsCol(uid));
  return snap.docs
    .map(mapQuestDoc)
    .filter(Boolean)
    .sort((a, b) => String(a.title).localeCompare(String(b.title), "uk"));
}

/** Усі опубліковані квести (будь-який казкар) */
export async function getPublishedQuests() {
  await ensureAuth();
  const q = query(
    collectionGroup(db, "quests"),
    where("status", "==", QUEST_STATUS.PUBLISHED),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(mapQuestDoc)
    .filter(Boolean)
    .sort((a, b) => String(a.title).localeCompare(String(b.title), "uk"));
}

/** Черга модерації */
export async function getPendingReviewQuests() {
  await ensureAuth();
  const q = query(
    collectionGroup(db, "quests"),
    where("status", "==", QUEST_STATUS.PENDING_REVIEW),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(mapQuestDoc)
    .filter(Boolean)
    .sort((a, b) => String(a.authorName).localeCompare(String(b.authorName), "uk"));
}

/**
 * Знайти квест за id.
 * Спочатку в акаунті автора (якщо відомий), інакше collection group по полю id.
 */
export async function getQuestById(id, authorId = null) {
  await ensureAuth();
  const questId = String(id || "");
  if (!questId) return null;

  if (authorId) {
    const snap = await getDoc(questRef(authorId, questId));
    return mapQuestDoc(snap);
  }

  const me = auth.currentUser?.uid;
  if (me) {
    const own = await getDoc(questRef(me, questId));
    if (own.exists()) return mapQuestDoc(own);
  }

  const q = query(
    collectionGroup(db, "quests"),
    where("id", "==", questId),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapQuestDoc(snap.docs[0]);
}

export async function addQuest(partial = {}) {
  try {
    await ensureAuth();
    const uid = requireUid();
    const ref = doc(questsCol(uid));
    const payload = toFirestorePayload({
      ...partial,
      id: ref.id,
      authorId: partial.authorId || uid,
      status: partial.status || QUEST_STATUS.DRAFT,
      publishedAt: null,
    });

    await setDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return createEmptyQuest(payload);
  } catch (error) {
    throw new Error(mapFirestoreError(error));
  }
}

export async function updateQuest(id, patch = {}) {
  try {
    await ensureAuth();
    const current = await getQuestById(id, patch.authorId || null);
    if (!current) return null;

    const authorId = current.authorId || requireUid();
    const next = toFirestorePayload({
      ...current,
      ...patch,
      id: current.id,
      authorId,
    });

    await updateDoc(questRef(authorId, current.id), {
      ...next,
      updatedAt: serverTimestamp(),
    });

    return createEmptyQuest(next);
  } catch (error) {
    throw new Error(mapFirestoreError(error));
  }
}

export async function submitQuestForReview(id) {
  return updateQuest(id, {
    status: QUEST_STATUS.PENDING_REVIEW,
    publishedAt: null,
    reviewNote: "",
    reviewedBy: null,
    reviewedAt: null,
  });
}

export async function saveQuestAsDraft(id, patch = {}) {
  const { status: _s, publishedAt: _p, ...rest } = patch;
  return updateQuest(id, {
    ...rest,
    status: QUEST_STATUS.DRAFT,
    publishedAt: null,
  });
}

export async function approveQuest(id, reviewerId = null) {
  return updateQuest(id, {
    status: QUEST_STATUS.PUBLISHED,
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    reviewNote: "",
  });
}

export async function rejectQuest(id, reviewerId = null, note = "") {
  return updateQuest(id, {
    status: QUEST_STATUS.REJECTED,
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
    reviewNote: note || "Відхилено модератором",
  });
}

export async function deleteQuest(id, authorId = null) {
  const current = await getQuestById(id, authorId);
  if (!current?.authorId) return false;
  await deleteDoc(questRef(current.authorId, current.id));
  return true;
}

/** @deprecated */
export async function getStories() {
  return getQuests();
}

/** @deprecated */
export async function addStory(story) {
  return addQuest({
    title: story.title,
    type: story.type,
    duration: story.duration,
    description: story.description,
    coverImage: story.image || story.coverImage,
  });
}
