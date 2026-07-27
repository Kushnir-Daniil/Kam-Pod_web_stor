import {
  getQuests,
  QUEST_STATUS,
  QUEST_STATUS_LABELS,
  submitQuestForReview,
} from "../../shared/js/data/questsData.js";
import {
  getCurrentUser,
  canAccessAdminPanel,
} from "../../shared/js/data/usersData.js";

const listEl = document.getElementById("adminQuestsList");
const tabsRow = document.querySelector(".kazkar-tabs");
const user = getCurrentUser();
let activeTab = "published";

if (canAccessAdminPanel()) {
  window.location.replace("dashboard.html");
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

function isDraftTabStatus(status) {
  return (
    !status ||
    status === QUEST_STATUS.DRAFT ||
    status === QUEST_STATUS.PENDING_REVIEW ||
    status === QUEST_STATUS.REJECTED
  );
}

function setActiveTab(tab) {
  activeTab = tab === "drafts" ? "drafts" : "published";
  document.querySelectorAll("[data-kazkar-tab]").forEach((btn) => {
    const on = btn.getAttribute("data-kazkar-tab") === activeTab;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
}

async function renderList() {
  if (!listEl) return;

  const all = await getQuests();
  const mine = all.filter((q) => !q.authorId || q.authorId === user?.id);

  const items =
    activeTab === "published"
      ? mine.filter((q) => q.status === QUEST_STATUS.PUBLISHED)
      : mine.filter((q) => isDraftTabStatus(q.status));

  if (!items.length) {
    listEl.innerHTML =
      activeTab === "published"
        ? `<p class="page-placeholder" style="margin: 16px 0 0;">Немає опублікованих квестів. Натисніть «Опублікувати» в чорнетці — після перевірки адміна вони з’являться тут.</p>`
        : `<p class="page-placeholder" style="margin: 16px 0 0;">Чорнеток поки немає. Створіть новий квест або збережіть опублікований у чорнетку.</p>`;
    return;
  }

  listEl.innerHTML = items
    .map((q) => {
      const status = q.status || QUEST_STATUS.DRAFT;
      const label = QUEST_STATUS_LABELS[status] || status;
      const canPublish = status !== QUEST_STATUS.PENDING_REVIEW;
      const note =
        status === QUEST_STATUS.REJECTED && q.reviewNote
          ? `<p class="admin-quest-card__note">${escapeHtml(q.reviewNote)}</p>`
          : status === QUEST_STATUS.PENDING_REVIEW
            ? `<p class="admin-quest-card__note" style="color:#8a6d1d">Очікує рішення адміна. З каталогу приховано.</p>`
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
            canPublish
              ? `<button type="button" class="btn-submit-review" data-publish="${q.id}">Опублікувати</button>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

if (tabsRow) {
  tabsRow.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-kazkar-tab]");
    if (!btn || !tabsRow.contains(btn)) return;
    e.preventDefault();
    setActiveTab(btn.getAttribute("data-kazkar-tab"));
    renderList().catch(console.error);
  });
}

listEl?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-publish]");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();

  const id = btn.dataset.publish;
  if (
    !confirm(
      "Надіслати на перевірку адміну? Квест зникне з каталогу гравців, доки адмін не погодить.",
    )
  ) {
    return;
  }

  btn.disabled = true;
  btn.textContent = "Надсилання…";

  try {
    await submitQuestForReview(id);
    setActiveTab("drafts");
    await renderList();
  } catch (err) {
    console.error(err);
    alert(err?.message || "Не вдалося опублікувати");
    btn.disabled = false;
    btn.textContent = "Опублікувати";
  }
});

setActiveTab("published");
renderList().catch((err) => {
  console.error(err);
  if (listEl) {
    listEl.innerHTML = `<p class="page-placeholder">Не вдалося завантажити квести</p>`;
  }
});
