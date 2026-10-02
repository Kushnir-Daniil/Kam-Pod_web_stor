import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { auth, db } from "../firebase.js";

export const ASSET_PREFIX = "asset:";
const MAX_DATA_URL_CHARS = 900_000;

const imageCache = new Map();
const reverseCache = new Map();

function assetsCol() {
  return collection(db, "questAssets");
}

export function isAssetRef(src) {
  return typeof src === "string" && src.startsWith(ASSET_PREFIX);
}

export function isDataUrl(src) {
  return typeof src === "string" && src.startsWith("data:");
}

export function parseAssetId(src) {
  return isAssetRef(src) ? src.slice(ASSET_PREFIX.length) : "";
}

function toAssetRef(id) {
  return `${ASSET_PREFIX}${id}`;
}

function remember(id, dataUrl) {
  if (!id || !dataUrl) return;
  imageCache.set(id, dataUrl);
  reverseCache.set(dataUrl, id);
}

/** Повертає data URL / https / відносний шлях, придатний для <img src>. */
export async function resolveQuestImage(src) {
  if (!src) return "";
  const id = parseAssetId(src);
  if (!id) return src;

  if (imageCache.has(id)) return imageCache.get(id);

  const snap = await getDoc(doc(db, "questAssets", id));
  const image = snap.exists() ? String(snap.data().image || "") : "";
  if (image) remember(id, image);
  return image;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не вдалося прочитати фото"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Зберігає стиснуте фото в окремий документ Firestore (безкоштовний Spark).
 * У квесті лишається посилання asset:{id} — документ квесту більше не роздувається.
 */
export async function uploadQuestImage({ uid, questId, slot, blob }) {
  const userId = uid || auth.currentUser?.uid;
  if (!userId) {
    throw new Error("Увійдіть в акаунт, щоб завантажити фото");
  }
  if (!blob) {
    throw new Error("Порожній файл фото");
  }

  const image = await blobToDataUrl(blob);
  if (image.length > MAX_DATA_URL_CHARS) {
    throw new Error("Фото після стиснення все ще завелике. Обери інше JPG.");
  }

  const existingId = reverseCache.get(image);
  if (existingId) return toAssetRef(existingId);

  try {
    const ref = doc(assetsCol());
    await setDoc(ref, {
      authorId: userId,
      questId: questId || null,
      slot: slot || "",
      image,
      createdAt: serverTimestamp(),
    });
    remember(ref.id, image);
    return toAssetRef(ref.id);
  } catch (error) {
    const code = error?.code || "";
    if (code === "permission-denied") {
      throw new Error("Немає доступу до збереження фото. Опублікуйте оновлені Firestore Rules.");
    }
    if (code === "invalid-argument" || /exceeds|too large|larger than/i.test(error?.message || "")) {
      throw new Error("Фото завелике навіть після стиснення. Обери інше JPG.");
    }
    throw new Error(error?.message || "Не вдалося зберегти фото");
  }
}

async function replaceIfInline(src, meta) {
  if (!src) return "";
  if (isAssetRef(src)) return src;
  if (!isDataUrl(src)) return src;

  const existingId = reverseCache.get(src);
  if (existingId) return toAssetRef(existingId);

  const blob = await fetch(src).then((res) => res.blob());
  return uploadQuestImage({ ...meta, blob });
}

/** Старі квести з base64 у документі: перед збереженням винести кожне фото окремо. */
export async function persistInlineQuestImages(quest, { uid, questId } = {}) {
  const owner = uid || quest.authorId || auth.currentUser?.uid;
  const folder = questId || quest.id;
  const meta = { uid: owner, questId: folder };

  const coverImage = await replaceIfInline(quest.coverImage, { ...meta, slot: "cover" });

  const pages = await Promise.all(
    (quest.story?.pages || []).map(async (page, index) => ({
      ...page,
      image: await replaceIfInline(page.image, { ...meta, slot: `story-${index}` }),
    })),
  );

  const scenes = await Promise.all(
    (quest.comic?.scenes || []).map(async (scene, index) => ({
      ...scene,
      image: await replaceIfInline(scene.image, { ...meta, slot: `comic-${index}` }),
    })),
  );

  return {
    ...quest,
    coverImage,
    story: { ...(quest.story || {}), pages },
    comic: { ...(quest.comic || {}), scenes },
  };
}

export async function hydrateQuestImages(quest, { coversOnly = false } = {}) {
  if (!quest) return quest;

  const coverImage = await resolveQuestImage(quest.coverImage);
  if (coversOnly) {
    return { ...quest, coverImage };
  }

  const pages = await Promise.all(
    (quest.story?.pages || []).map(async (page) => ({
      ...page,
      image: await resolveQuestImage(page.image),
    })),
  );
  const scenes = await Promise.all(
    (quest.comic?.scenes || []).map(async (scene) => ({
      ...scene,
      image: await resolveQuestImage(scene.image),
    })),
  );

  return {
    ...quest,
    coverImage,
    story: { ...(quest.story || {}), pages },
    comic: { ...(quest.comic || {}), scenes },
  };
}
