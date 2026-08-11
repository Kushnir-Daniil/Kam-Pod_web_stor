import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../../shared/js/firebase.js";
import { getCurrentUser } from "../../shared/js/data/usersData.js";
import { getPublishedQuests, getQuestById } from "../../shared/js/data/questsData.js";
import { getRecentNews } from "../../shared/js/data/newsData.js";

function escapeText(value) {
  return String(value ?? "").replaceAll("<", "&lt;");
}

function resolveImage(src, fallback = "../img/tower.png") {
  if (!src) return fallback;
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

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** ===== Банер "Продовжуй квест" ===== */
function renderContinuePlaceholder() {
  document.getElementById("continueQuestTag").textContent = "Почни пригоду";
  document.getElementById("continueQuestTitle").textContent = "Розпочни свою першу подорож";
  document.getElementById("continueQuestDesc").textContent = "Обери квест із каталогу й вирушай у пригоду просто зараз";
  document.getElementById("continueQuestBtn").textContent = "До квестів";
  document.getElementById("continueQuestCard").href = "quests.html";
}

function renderContinueQuest(quest) {
  document.getElementById("continueQuestTag").textContent = "Продовжуй квест";
  document.getElementById("continueQuestTitle").textContent = quest.title || "Без назви";
  document.getElementById("continueQuestDesc").textContent = quest.description || "";
  document.getElementById("continueQuestBtn").textContent = "Продовжити";
  document.getElementById("continueQuestCard").href = `quest.html?id=${encodeURIComponent(quest.id)}`;
  document.getElementById("continueQuestImage").src = resolveImage(quest.coverImage);
}

async function loadContinueQuest(uid) {
  try {
    const snap = await getDocs(collection(db, "users", uid, "questProgress"));
    const inProgress = snap.docs
      .map((d) => ({ questId: d.id, ...d.data() }))
      // Нагорода видається лише один раз, коли всі присутні частини квесту завершені —
      // тож відсутність rewardGranted означає "квест ще не пройдено повністю".
      .filter((p) => !p.rewardGranted)
      .sort((a, b) => toMillis(b.startedAt) - toMillis(a.startedAt));

    if (!inProgress.length) {
      renderContinuePlaceholder();
      return;
    }

    const quest = await getQuestById(inProgress[0].questId).catch(() => null);
    if (!quest) {
      renderContinuePlaceholder();
      return;
    }
    renderContinueQuest(quest);
  } catch (err) {
    console.error("Не вдалося завантажити прогрес квестів:", err);
    renderContinuePlaceholder();
  }
}

/** ===== Останні історії (останні опубліковані квести) ===== */
async function loadRecentStories() {
  const row = document.getElementById("recentStoriesRow");
  try {
    const quests = await getPublishedQuests();
    const recent = [...quests]
      .sort((a, b) => toMillis(b.publishedAt) - toMillis(a.publishedAt))
      .slice(0, 4);

    if (!recent.length) {
      row.innerHTML = `<p class="page-placeholder">Квестів поки немає.</p>`;
      return;
    }

    row.innerHTML = recent
      .map(
        (q) => `
          <a href="quest.html?id=${encodeURIComponent(q.id)}" class="recent-story-card">
            <img src="${resolveImage(q.coverImage)}" alt="">
            <strong>${escapeText(q.title || "Без назви")}</strong>
            <span>${escapeText(q.type || "Квест")}</span>
          </a>
        `,
      )
      .join("");
  } catch (err) {
    console.error("Не вдалося завантажити останні історії:", err);
    row.innerHTML = `<p class="page-placeholder">Не вдалося завантажити.</p>`;
  }
}

/** ===== Новини ===== */
async function loadNews() {
  const list = document.getElementById("newsList");
  try {
    const news = await getRecentNews(5);

    if (!news.length) {
      list.innerHTML = `<p class="page-placeholder">Новин поки немає.</p>`;
      return;
    }

    list.innerHTML = news
      .map((n) => {
        const when = n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString("uk-UA") : "";
        return `
          <div class="news-row">
            <img src="${resolveImage(n.image, "../img/tower.png")}" alt="">
            <div class="news-row-body">
              <div class="news-row-top">
                <strong>${escapeText(n.title)}</strong>
                <span class="news-row-date">${escapeText(when)}</span>
              </div>
              <p>${escapeText(n.description)}</p>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Не вдалося завантажити новини:", err);
    list.innerHTML = `<p class="page-placeholder">Не вдалося завантажити новини.</p>`;
  }
}

document.getElementById("premiumBtn")?.addEventListener("click", () => {
  alert("Оплата підписки Преміум буде підключена пізніше");
});

const user = getCurrentUser();
if (user) {
  loadContinueQuest(user.id);
}
loadRecentStories();
loadNews();