import {
  getQuests,
  QUEST_STATUS,
  QUEST_STATUS_LABELS,
  submitQuestForReview,
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

// Адмін працює з чергою модерації, не з конструктором
if (canAccessAdminPanel()) {
  window.location.href = "dashboard.html";
}

if (titleEl) {
  titleEl.textContent = "Мої квести";
}

if (hintEl) {
  hintEl.textContent =
    "Збережіть чернетку, потім надішліть на розгляд. Після «Погодити» від адміна квест з’явиться в каталозі.";
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function renderList() {
  if (!listEl) return;

  const all = await getQuests();
  const items = all.filter((q) => !q.authorId || q.authorId === user?.id);

  if (!items.length) {
    listEl.innerHTML = `<p class="page-placeholder" style="margin: 16px 0 0;">Поки немає квестів. Створіть перший.</p>`;
    return;
  }

  listEl.innerHTML = items
    .map((q) => {
      const status = q.status || QUEST_STATUS.DRAFT;
      const label = QUEST_STATUS_LABELS[status] || status;
      const canSubmit =
        status === QUEST_STATUS.DRAFT || status === QUEST_STATUS.REJECTED;
      const note =
        status === QUEST_STATUS.REJECTED && q.reviewNote
          ? `<p class="admin-quest-card__note">${escapeHtml(q.reviewNote)}</p>`
          : "";

      return `
        <div class="admin-quest-card admin-quest-card--block">
          <a class="admin-quest-card__link" href="quest-editor.html?id=${q.id}">
            <div class="admin-quest-card__body">
              <strong>${escapeHtml(q.title || "Без назви")}</strong>
              <span class="quest-status ${statusClass(status)}">${label}</span>
            </div>
            <span class="admin-quest-card__meta">${escapeHtml(q.type || "Квест")} · ${escapeHtml(q.duration || "—")}</span>
            ${note}
          </a>
          ${
            canSubmit
              ? `<button type="button" class="btn-submit-review" data-submit="${q.id}">Надіслати на розгляд</button>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

listEl?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-submit]");
  if (!btn) return;

  const id = btn.dataset.submit;
  btn.disabled = true;
  btn.textContent = "Надсилання…";

  try {
    await submitQuestForReview(id);
    await renderList();
  } catch (err) {
    console.error(err);
    alert(err?.message || "Не вдалося надіслати на розгляд");
    btn.disabled = false;
    btn.textContent = "Надіслати на розгляд";
  }
});

renderList().catch((err) => {
  console.error(err);
  if (listEl) {
    listEl.innerHTML = `<p class="page-placeholder">Не вдалося завантажити квести</p>`;
  }
});
