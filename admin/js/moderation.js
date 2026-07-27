import {
  getPendingReviewQuests,
  QUEST_STATUS_LABELS,
  QUEST_STATUS,
} from "../../shared/js/data/questsData.js";

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

function groupByAuthor(quests) {
  const map = new Map();
  for (const quest of quests) {
    const key = quest.authorId || quest.authorName || "unknown";
    const name = quest.authorName || "Невідомий казкар";
    if (!map.has(key)) {
      map.set(key, { authorId: quest.authorId, authorName: name, quests: [] });
    }
    map.get(key).quests.push(quest);
  }
  return [...map.values()].sort((a, b) =>
    a.authorName.localeCompare(b.authorName, "uk"),
  );
}

async function renderQueue() {
  const root = document.getElementById("moderationQueue");
  if (!root) return;

  const pending = await getPendingReviewQuests();

  if (!pending.length) {
    root.innerHTML = `
      <p class="page-placeholder" style="margin-top: 8px;">
        Зараз немає квестів на розгляді.
      </p>
    `;
    return;
  }

  const groups = groupByAuthor(pending);
  const statusLabel = QUEST_STATUS_LABELS[QUEST_STATUS.PENDING_REVIEW];

  root.innerHTML = groups
    .map((group) => {
      const cards = group.quests
        .map((quest) => {
          const cover = resolveImage(quest.coverImage || quest.image);
          return `
            <a href="quest-review.html?id=${encodeURIComponent(quest.id)}" class="quest-card-link">
              <div class="quest-card">
                <img src="${cover}" alt="${escapeHtml(quest.title)}">
                <div class="quest-info">
                  <div class="quest-title-row">
                    <div>
                      <h3>${escapeHtml(quest.title || "Без назви")}</h3>
                      <div class="quest-meta">${escapeHtml(quest.type || "Квест")}${quest.duration ? ` · ${escapeHtml(quest.duration)}` : ""}</div>
                    </div>
                    <span class="quest-action-btn start">Переглянути</span>
                  </div>
                  <p class="quest-desc">${escapeHtml(quest.description || "")}</p>
                  <span class="quest-status quest-status--pending">${statusLabel}</span>
                </div>
              </div>
            </a>
          `;
        })
        .join("");

      return `
        <section class="moderation-group">
          <h2 class="moderation-group__title">${escapeHtml(group.authorName)}</h2>
          <p class="moderation-group__hint">Казкар · ${group.quests.length} на розгляді</p>
          <div class="quest-list">${cards}</div>
        </section>
      `;
    })
    .join("");
}

renderQueue().catch((err) => {
  console.error(err);
  const root = document.getElementById("moderationQueue");
  if (root) {
    root.innerHTML = `<p class="page-placeholder">Не вдалося завантажити чергу модерації.<br><small>${escapeHtml(err?.message || "")}</small></p>`;
  }
});
