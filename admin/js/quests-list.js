import {
  getQuests,
  QUEST_STATUS,
  QUEST_STATUS_LABELS,
} from "../../shared/js/data/questsData.js";
import {
  getCurrentUser,
  canAccessAdminPanel,
  ROLES,
} from "../../shared/js/data/usersData.js";

const listEl = document.getElementById("adminQuestsList");
const titleEl = document.getElementById("adminQuestsTitle");
const hintEl = document.getElementById("adminQuestsHint");

const user = getCurrentUser();

if (titleEl) {
  titleEl.textContent = user?.role === ROLES.ADMIN ? "Квести (адмін)" : "Мої квести";
}

if (hintEl) {
  hintEl.textContent =
    user?.role === ROLES.ADMIN
      ? "Усі квести. Статуси: чернетка → на розгляді → опубліковано / відхилено."
      : "Ваша бібліотека. Новий квест зберігається як «не опубліковано».";
}

function statusClass(status) {
  switch (status) {
    case QUEST_STATUS.PUBLISHED:
      return "quest-status--published";
    case QUEST_STATUS.PENDING_REVIEW:
      return "quest-status--pending";
    case QUEST_STATUS.REJECTED:
      return "quest-status--rejected";
    case QUEST_STATUS.ARCHIVED:
      return "quest-status--archived";
    default:
      return "quest-status--draft";
  }
}

async function renderList() {
  if (!listEl) return;

  const all = await getQuests();
  const items = canAccessAdminPanel()
    ? all
    : all.filter((q) => !q.authorId || q.authorId === user?.id);

  if (!items.length) {
    listEl.innerHTML = `<p class="page-placeholder" style="margin: 16px 0 0;">Поки немає квестів. Створіть перший.</p>`;
    return;
  }

  listEl.innerHTML = items
    .map((q) => {
      const status = q.status || QUEST_STATUS.DRAFT;
      const label = QUEST_STATUS_LABELS[status] || status;
      return `
        <a class="admin-quest-card" href="quest-editor.html?id=${q.id}">
          <div class="admin-quest-card__body">
            <strong>${q.title || "Без назви"}</strong>
            <span class="quest-status ${statusClass(status)}">${label}</span>
          </div>
          <span class="admin-quest-card__meta">${q.type || "Квест"} · ${q.duration || "—"}</span>
        </a>
      `;
    })
    .join("");
}

renderList().catch((err) => {
  console.error(err);
  if (listEl) {
    listEl.innerHTML = `<p class="page-placeholder">Не вдалося завантажити квести</p>`;
  }
});
