import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../../shared/js/firebase.js";
import { QUEST_STATUS_LABELS } from "../../shared/js/data/questsData.js";

const STATUS_CLASS = {
  draft: "draft",
  pending_review: "pending",
  rejected: "rejected",
  published: "published",
  archived: "archived",
};

function resolveImage(src) {
  if (!src) return "../img/tower.png";
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

let allQuests = [];
let activeFilter = "all";

function render() {
  const root = document.getElementById("allQuestsList");
  const filtered = activeFilter === "all" ? allQuests : allQuests.filter((q) => q.status === activeFilter);

  if (!filtered.length) {
    root.innerHTML = `<p class="page-placeholder">Нічого не знайдено.</p>`;
    return;
  }

  root.innerHTML = filtered
    .map((quest) => {
      const cover = resolveImage(quest.coverImage || quest.image);
      const statusClass = STATUS_CLASS[quest.status] || "draft";
      const statusLabel = QUEST_STATUS_LABELS[quest.status] || quest.status;
      return `
        <a href="quest-editor.html?id=${encodeURIComponent(quest.id)}" class="quest-card-link">
          <div class="quest-card">
            <img src="${cover}" alt="${escapeHtml(quest.title)}">
            <div class="quest-info">
              <div class="quest-title-row">
                <div>
                  <h3>${escapeHtml(quest.title || "Без назви")}</h3>
                  <div class="quest-meta">${escapeHtml(quest.authorName || "Невідомий автор")}${quest.type ? ` · ${escapeHtml(quest.type)}` : ""}</div>
                </div>
                <span class="quest-action-btn start">Редагувати</span>
              </div>
              <p class="quest-desc">XP: ${escapeHtml(quest.rewards?.xp ?? 0)} · Монети: ${escapeHtml(quest.rewards?.coins ?? 0)}</p>
              <span class="quest-status quest-status--${statusClass}">${escapeHtml(statusLabel)}</span>
            </div>
          </div>
        </a>
      `;
    })
    .join("");
}

document.querySelectorAll(".quest-mode-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".quest-mode-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
    render();
  });
});

async function loadAllQuests() {
  const snap = await getDocs(collection(db, "quests"));
  allQuests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  render();
}

loadAllQuests().catch((err) => {
  console.error(err);
  document.getElementById("allQuestsList").innerHTML =
    `<p class="page-placeholder">Не вдалося завантажити квести.<br><small>${escapeHtml(err?.message || "")}</small></p>`;
});