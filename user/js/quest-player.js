import { getQuestById, QUEST_STATUS, isPublished } from "../../shared/js/data/questsData.js";
import { getCurrentUser, canAccessAdminPanel } from "../../shared/js/data/usersData.js";
import { markPartCompleted } from "../../shared/js/data/progressData.js";

const params = new URLSearchParams(window.location.search);
const questId = params.get("id");

const titleEl = document.getElementById("questTitle");
const stepEl = document.getElementById("questStepLabel");
const panelEl = document.getElementById("questModePanel");
const tabs = document.querySelectorAll(".quest-mode-tab");

let quest = null;
let currentMode = "story";
let storyIndex = 0;
let comicIndex = 0;

function resolveImage(src) {
  if (!src) return "";
  if (
    src.startsWith("data:") ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/") ||
    src.startsWith("../")
  ) {
    return src;
  }
  if (src.includes("/")) return `../${src}`;
  return `../img/${src}`;
}

function renderMode(mode) {
  currentMode = mode;

  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });

  if (!quest) {
    panelEl.innerHTML = `<p class="page-placeholder">Квест не знайдено. Поверніться до списку.</p>`;
    return;
  }

  if (mode === "story") {
    const pages = quest.story?.pages || [];
    if (!pages.length) {
      panelEl.innerHTML = `<p class="page-placeholder">Історія ще не додана.</p>`;
      return;
    }
    storyIndex = Math.min(storyIndex, pages.length - 1);
    const page = pages[storyIndex];
    const img = resolveImage(page.image);
    panelEl.innerHTML = `
      <article class="story-page">
        ${img ? `<img class="story-page__img" src="${img}" alt="">` : ""}
        <p class="quest-player-step">Сторінка ${storyIndex + 1} з ${pages.length}</p>
        <h2>${page.chapterTitle || ""}</h2>
        <p class="story-page__text">${page.text || ""}</p>
        ${page.quote ? `<blockquote class="story-page__quote">${page.quote}</blockquote>` : ""}
        <div class="story-nav">
          <button type="button" class="btn-secondary-editor" id="storyPrev" ${storyIndex === 0 ? "disabled" : ""}>Попередня</button>
          <button type="button" class="btn-logout" id="storyNext" style="max-width:none;margin:0">
            ${storyIndex < pages.length - 1 ? "Наступна" : "До коміксу / гри"}
          </button>
        </div>
      </article>
    `;
    document.getElementById("storyPrev")?.addEventListener("click", () => {
      storyIndex -= 1;
      renderMode("story");
    });
    document.getElementById("storyNext")?.addEventListener("click", () => {
      if (storyIndex < pages.length - 1) {
        storyIndex += 1;
        renderMode("story");
      } else {
        renderMode((quest.comic?.scenes || []).length ? "comic" : "game");
      }
    });
    return;
  }

  if (mode === "comic") {
    const scenes = quest.comic?.scenes || [];
    if (!scenes.length) {
      panelEl.innerHTML = `<p class="page-placeholder">Комікс ще не доданий.</p>`;
      return;
    }
    comicIndex = Math.min(comicIndex, scenes.length - 1);
    const scene = scenes[comicIndex];
    const img = resolveImage(scene.image);
    const lines = (scene.dialogues || [])
      .filter((d) => d.speaker || d.text)
      .map((d) => `<p><strong>${d.speaker || "…"}:</strong> ${d.text || ""}</p>`)
      .join("");
    panelEl.innerHTML = `
      <article class="story-page">
        ${img ? `<img class="story-page__img" src="${img}" alt="">` : ""}
        <p class="quest-player-step">Сцена ${comicIndex + 1} з ${scenes.length}</p>
        <div class="comic-dialogues">${lines || "<p class='page-placeholder'>Немає реплік</p>"}</div>
        <div class="story-nav">
          <button type="button" class="btn-secondary-editor" id="comicPrev" ${comicIndex === 0 ? "disabled" : ""}>Назад</button>
          <button type="button" class="btn-logout" id="comicNext" style="max-width:none;margin:0">
            ${comicIndex < scenes.length - 1 ? "Далі" : "До гри"}
          </button>
        </div>
      </article>
    `;
    document.getElementById("comicPrev")?.addEventListener("click", () => {
      comicIndex -= 1;
      renderMode("comic");
    });
    document.getElementById("comicNext")?.addEventListener("click", () => {
      if (comicIndex < scenes.length - 1) {
        comicIndex += 1;
        renderMode("comic");
      } else {
        renderMode("game");
      }
    });
    return;
  }

  const build = quest.game?.buildFolder;
  panelEl.innerHTML = `
    <div class="quest-game-cta">
      <p class="quest-game-cta__title">ГОТОВІ ДО ПРИГОД?</p>
      ${build
        ? `<a class="btn-logout" style="text-decoration:none;text-align:center" href="../builds/${build}/index.html" target="_blank" rel="noopener">ГРАТИ</a>`
        : `<button type="button" class="btn-logout" disabled>Гра ще не прив’язана</button>`}
    </div>
  `;
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => renderMode(tab.dataset.mode));
});

getQuestById(questId).then((loaded) => {
  quest = loaded;
  const user = getCurrentUser();
  const canPreview =
    canAccessAdminPanel() ||
    (user && quest && quest.authorId === user.id);

  if (quest && !isPublished(quest) && !canPreview) {
    quest = null;
    titleEl.textContent = "Квест недоступний";
    panelEl.innerHTML = `<p class="page-placeholder">Цей квест ще не опубліковано.</p>`;
    return;
  }

  if (quest) {
    titleEl.textContent = quest.title || "Без назви";
    const statusHint =
      quest.status && quest.status !== QUEST_STATUS.PUBLISHED
        ? ` · ${quest.status}`
        : "";
    stepEl.textContent = `${quest.type || "Квест"}${quest.duration ? ` · ${quest.duration}` : ""}${statusHint}`;
    document.title = quest.title || "Квест";
  } else {
    titleEl.textContent = "Квест не знайдено";
  }
  renderMode(currentMode);
}).catch((err) => {
  console.error(err);
  titleEl.textContent = "Помилка завантаження";
  panelEl.innerHTML = `<p class="page-placeholder">Не вдалося відкрити квест.</p>`;
});
