const DB_NAME = "questy-db";
const DB_VERSION = 1;
const STORE = "quests";
const LEGACY_STORAGE_KEY = "stories";
const LEGACY_QUESTS_KEY = "quests";

/** Статуси квесту (бібліотека казкаря + модерація) */
export const QUEST_STATUS = Object.freeze({
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  REJECTED: "rejected",
  PUBLISHED: "published",
  ARCHIVED: "archived",
});

export const QUEST_STATUS_LABELS = Object.freeze({
  [QUEST_STATUS.DRAFT]: "Не завершено / не опубліковано",
  [QUEST_STATUS.PENDING_REVIEW]: "На розгляді",
  [QUEST_STATUS.REJECTED]: "Відхилено",
  [QUEST_STATUS.PUBLISHED]: "Опубліковано",
  [QUEST_STATUS.ARCHIVED]: "Архівовано",
});

/**
 * Порожній квест під конструктор:
 * історія (сторінки) → комікс (сцени) → гра (кнопка ГРАТИ + Unity build).
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

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("IndexedDB aborted"));
  });
}

function migrateLegacyStory(story) {
  return createEmptyQuest({
    id: story.id ?? undefined,
    title: story.title || "",
    type: story.type || "",
    duration: story.duration || "",
    description: story.description || "",
    coverImage: story.coverImage || story.image || "",
    rewards: story.rewards || { xp: 0, coins: 0, crystals: 0 },
    authorId: story.authorId || null,
    status: story.status || "draft",
    reviewNote: story.reviewNote || "",
    reviewedBy: story.reviewedBy || null,
    reviewedAt: story.reviewedAt || null,
    publishedAt: story.publishedAt || null,
    story: story.story || { pages: [] },
    comic: story.comic || { scenes: [] },
    game: story.game || {
      buildFolder: "",
      lockedUntil: "story",
      geo: null,
    },
  });
}

let migrated = false;

async function migrateFromLocalStorageIfNeeded(db) {
  if (migrated) return;
  migrated = true;

  const existing = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  if (existing.length) return;

  const raw =
    localStorage.getItem(LEGACY_QUESTS_KEY) ||
    localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!raw) return;

  const list = JSON.parse(raw).map(migrateLegacyStory);
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  for (const quest of list) {
    const copy = { ...quest };
    if (copy.id == null) delete copy.id;
    store.put(copy);
  }

  await txDone(tx);
  localStorage.removeItem(LEGACY_QUESTS_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export async function getQuests() {
  const db = await openDb();
  await migrateFromLocalStorageIfNeeded(db);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const items = (req.result || []).sort((a, b) => a.id - b.id);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getQuestById(id) {
  const numericId = Number(id);
  if (!numericId) return null;

  const db = await openDb();
  await migrateFromLocalStorageIfNeeded(db);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(numericId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function addQuest(partial = {}) {
  const db = await openDb();
  await migrateFromLocalStorageIfNeeded(db);

  const quest = createEmptyQuest(partial);
  delete quest.id;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(quest);
    req.onsuccess = () => {
      resolve({ ...quest, id: req.result });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateQuest(id, patch) {
  const db = await openDb();
  const current = await getQuestById(id);
  if (!current) return null;

  const next = {
    ...current,
    ...patch,
    id: current.id,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put(next);
    req.onsuccess = () => resolve(next);
    req.onerror = () => reject(req.error);
  });
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
