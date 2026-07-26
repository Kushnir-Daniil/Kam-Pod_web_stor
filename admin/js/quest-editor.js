import {
  addQuest,
  getQuestById,
  updateQuest,
  createEmptyQuest,
} from "../../shared/js/data/questsData.js";

const params = new URLSearchParams(window.location.search);
const editId = params.get("id");

let draft = createEmptyQuest({
  story: { pages: [] },
  comic: { scenes: [] },
  game: { buildFolder: "game-1", lockedUntil: "story", geo: null },
});

async function compressImageFile(file, maxWidth = 1280, quality = 0.72) {
  if (!file) return "";
  if (file.size > 12_000_000) {
    throw new Error("Файл завеликий (макс. 12 МБ). Обери меншу картинку.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.toDataURL("image/jpeg", quality);
}

function showPreview(imgEl, src) {
  if (!imgEl) return;
  if (src) {
    imgEl.src = src;
    imgEl.hidden = false;
  } else {
    imgEl.removeAttribute("src");
    imgEl.hidden = true;
  }
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function escapeText(value) {
  return String(value).replaceAll("<", "&lt;");
}

// ===== Tabs =====
document.querySelectorAll(".quest-mode-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".quest-mode-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".editor-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`[data-panel="${tab.dataset.tab}"]`)?.classList.add("active");
  });
});

const metaTitle = document.getElementById("metaTitle");
const metaType = document.getElementById("metaType");
const metaDuration = document.getElementById("metaDuration");
const metaDescription = document.getElementById("metaDescription");
const metaCover = document.getElementById("metaCover");
const metaCoverPreview = document.getElementById("metaCoverPreview");
const metaXp = document.getElementById("metaXp");
const metaCoins = document.getElementById("metaCoins");
const metaCrystals = document.getElementById("metaCrystals");
const gameBuild = document.getElementById("gameBuild");
const gameLock = document.getElementById("gameLock");
const storyPagesEl = document.getElementById("storyPages");
const comicScenesEl = document.getElementById("comicScenes");
const saveBtn = document.getElementById("saveQuestBtn");
const saveStatus = document.getElementById("saveStatus");

function fillMetaFields() {
  metaTitle.value = draft.title || "";
  metaType.value = draft.type || "";
  metaDuration.value = draft.duration || "";
  metaDescription.value = draft.description || "";
  metaXp.value = draft.rewards?.xp ?? 20;
  metaCoins.value = draft.rewards?.coins ?? 10;
  metaCrystals.value = draft.rewards?.crystals ?? 1;
  gameBuild.value = draft.game?.buildFolder || "game-1";
  gameLock.value = draft.game?.lockedUntil || "story";
  showPreview(metaCoverPreview, draft.coverImage);
}

metaCover.addEventListener("change", async () => {
  try {
    draft.coverImage = await compressImageFile(metaCover.files?.[0]);
    showPreview(metaCoverPreview, draft.coverImage);
  } catch (err) {
    alert(err.message);
    metaCover.value = "";
  }
});

function renderStoryPages() {
  storyPagesEl.innerHTML = "";
  draft.story.pages.forEach((page, index) => {
    const block = document.createElement("div");
    block.className = "editor-block";
    block.innerHTML = `
      <div class="editor-block__head">
        <span>Сторінка ${index + 1}</span>
        <button type="button" class="editor-block__remove" data-remove-story="${index}">Видалити</button>
      </div>
      <label class="editor-field">
        <span>Картинка</span>
        <input type="file" accept="image/*" data-story-image="${index}">
        <img class="editor-preview" data-story-preview="${index}" alt="" ${page.image ? `src="${page.image}"` : "hidden"}>
      </label>
      <label class="editor-field">
        <span>Заголовок розділу</span>
        <input type="text" data-story-title="${index}" value="${escapeAttr(page.chapterTitle || "")}" placeholder="Розділ 1. …">
      </label>
      <label class="editor-field">
        <span>Текст</span>
        <textarea rows="4" data-story-text="${index}" placeholder="Текст історії…">${escapeText(page.text || "")}</textarea>
      </label>
      <label class="editor-field">
        <span>Цитата (опційно)</span>
        <input type="text" data-story-quote="${index}" value="${escapeAttr(page.quote || "")}" placeholder="Виділений рядок">
      </label>
    `;
    storyPagesEl.appendChild(block);
  });
}

document.getElementById("addStoryPage").addEventListener("click", () => {
  draft.story.pages.push({ image: "", chapterTitle: "", text: "", quote: "" });
  renderStoryPages();
});

storyPagesEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-story]");
  if (!btn) return;
  draft.story.pages.splice(Number(btn.dataset.removeStory), 1);
  renderStoryPages();
});

storyPagesEl.addEventListener("change", async (e) => {
  const imageInput = e.target.closest("[data-story-image]");
  if (!imageInput) return;
  const i = Number(imageInput.dataset.storyImage);
  try {
    draft.story.pages[i].image = await compressImageFile(imageInput.files?.[0]);
    showPreview(storyPagesEl.querySelector(`[data-story-preview="${i}"]`), draft.story.pages[i].image);
  } catch (err) {
    alert(err.message);
    imageInput.value = "";
  }
});

storyPagesEl.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.storyTitle != null) {
    draft.story.pages[Number(t.dataset.storyTitle)].chapterTitle = t.value;
  }
  if (t.dataset.storyText != null) {
    draft.story.pages[Number(t.dataset.storyText)].text = t.value;
  }
  if (t.dataset.storyQuote != null) {
    draft.story.pages[Number(t.dataset.storyQuote)].quote = t.value;
  }
});

function renderComicScenes() {
  comicScenesEl.innerHTML = "";
  draft.comic.scenes.forEach((scene, index) => {
    scene.dialogues ??= [];
    const dialoguesHtml = scene.dialogues.map((d, di) => `
      <div class="dialogue-row">
        <input type="text" data-speaker="${index}:${di}" value="${escapeAttr(d.speaker || "")}" placeholder="Хто">
        <input type="text" data-line="${index}:${di}" value="${escapeAttr(d.text || "")}" placeholder="Репліка">
        <button type="button" data-remove-line="${index}:${di}">✕</button>
      </div>
    `).join("");

    const block = document.createElement("div");
    block.className = "editor-block";
    block.innerHTML = `
      <div class="editor-block__head">
        <span>Сцена ${index + 1}</span>
        <button type="button" class="editor-block__remove" data-remove-comic="${index}">Видалити</button>
      </div>
      <label class="editor-field">
        <span>Картинка сцени</span>
        <input type="file" accept="image/*" data-comic-image="${index}">
        <img class="editor-preview" data-comic-preview="${index}" alt="" ${scene.image ? `src="${scene.image}"` : "hidden"}>
      </label>
      <div data-dialogues="${index}">${dialoguesHtml}</div>
      <button type="button" class="btn-secondary-editor" data-add-line="${index}">+ Репліка</button>
    `;
    comicScenesEl.appendChild(block);
  });
}

document.getElementById("addComicScene").addEventListener("click", () => {
  draft.comic.scenes.push({
    image: "",
    dialogues: [{ speaker: "", text: "" }],
  });
  renderComicScenes();
});

comicScenesEl.addEventListener("click", (e) => {
  const removeScene = e.target.closest("[data-remove-comic]");
  if (removeScene) {
    draft.comic.scenes.splice(Number(removeScene.dataset.removeComic), 1);
    renderComicScenes();
    return;
  }

  const addLine = e.target.closest("[data-add-line]");
  if (addLine) {
    const i = Number(addLine.dataset.addLine);
    draft.comic.scenes[i].dialogues.push({ speaker: "", text: "" });
    renderComicScenes();
    return;
  }

  const removeLine = e.target.closest("[data-remove-line]");
  if (removeLine) {
    const [si, di] = removeLine.dataset.removeLine.split(":").map(Number);
    draft.comic.scenes[si].dialogues.splice(di, 1);
    renderComicScenes();
  }
});

comicScenesEl.addEventListener("change", async (e) => {
  const imageInput = e.target.closest("[data-comic-image]");
  if (!imageInput) return;
  const i = Number(imageInput.dataset.comicImage);
  try {
    draft.comic.scenes[i].image = await compressImageFile(imageInput.files?.[0]);
    showPreview(comicScenesEl.querySelector(`[data-comic-preview="${i}"]`), draft.comic.scenes[i].image);
  } catch (err) {
    alert(err.message);
    imageInput.value = "";
  }
});

comicScenesEl.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.speaker != null) {
    const [si, di] = t.dataset.speaker.split(":").map(Number);
    draft.comic.scenes[si].dialogues[di].speaker = t.value;
  }
  if (t.dataset.line != null) {
    const [si, di] = t.dataset.line.split(":").map(Number);
    draft.comic.scenes[si].dialogues[di].text = t.value;
  }
});

saveBtn.addEventListener("click", async () => {
  const title = metaTitle.value.trim();
  if (!title) {
    alert("Вкажи назву квесту");
    return;
  }

  const payload = {
    title,
    type: metaType.value.trim(),
    duration: metaDuration.value.trim(),
    description: metaDescription.value.trim(),
    coverImage: draft.coverImage || "",
    rewards: {
      xp: Number(metaXp.value) || 0,
      coins: Number(metaCoins.value) || 0,
      crystals: Number(metaCrystals.value) || 0,
    },
    story: { pages: draft.story.pages },
    comic: { scenes: draft.comic.scenes },
    game: {
      buildFolder: gameBuild.value,
      lockedUntil: gameLock.value,
      geo: draft.game.geo || null,
    },
  };

  saveBtn.disabled = true;
  saveBtn.textContent = "Збереження…";

  try {
    if (draft.id) {
      await updateQuest(draft.id, payload);
    } else {
      const created = await addQuest(payload);
      draft.id = created.id;
      history.replaceState(null, "", `quest-editor.html?id=${created.id}`);
      document.getElementById("editorTitle").textContent = "Редагування квесту";
    }

    saveStatus.hidden = false;
    saveStatus.classList.remove("error");
    saveStatus.textContent = "Збережено! Дивись у вкладці «Квести».";
  } catch (err) {
    console.error(err);
    saveStatus.hidden = false;
    saveStatus.classList.add("error");
    saveStatus.textContent = err?.message || "Помилка збереження";
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Зберегти квест";
  }
});

async function init() {
  if (editId) {
    const existing = await getQuestById(editId);
    if (existing) {
      draft = existing;
      draft.story ??= { pages: [] };
      draft.comic ??= { scenes: [] };
      draft.game ??= { buildFolder: "", lockedUntil: "story", geo: null };
      draft.rewards ??= { xp: 0, coins: 0, crystals: 0 };
      document.getElementById("editorTitle").textContent = "Редагування квесту";
    }
  }

  if (!draft.story.pages.length) {
    draft.story.pages.push({ image: "", chapterTitle: "", text: "", quote: "" });
  }

  fillMetaFields();
  renderStoryPages();
  renderComicScenes();
}

init().catch((err) => {
  console.error(err);
  alert("Не вдалося відкрити конструктор");
});
