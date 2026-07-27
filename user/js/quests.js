import { getPublishedQuests } from "../../shared/js/data/questsData.js";

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

async function renderQuests(filterText = "") {
  const list = document.getElementById("questList");
  if (!list) return;

  const all = await getPublishedQuests();
  const quests = all.filter(
    (q) =>
      (q.title || "").toLowerCase().includes(filterText.toLowerCase()) ||
      (q.type || "").toLowerCase().includes(filterText.toLowerCase()),
  );

  if (quests.length === 0) {
    list.innerHTML = `<p class="page-placeholder">Квестів поки немає</p>`;
    return;
  }

  list.innerHTML = quests
    .map((quest) => {
      const cover = resolveImage(quest.coverImage || quest.image);
      const href = `quest.html?id=${quest.id}`;
      return `
      <a href="${href}" class="quest-card-link">
        <div class="quest-card">
          <img src="${cover}" alt="${quest.title}">
          <div class="quest-info">
            <div class="quest-title-row">
              <div>
                <h3>${quest.title}</h3>
                <div class="quest-meta">${quest.type || "Квест"}${quest.duration ? ` · ${quest.duration}` : ""}</div>
              </div>
              <span class="quest-action-btn start">Відкрити</span>
            </div>
            <p class="quest-desc">${quest.description || ""}</p>
          </div>
        </div>
      </a>
    `;
    })
    .join("");
}

const searchInput = document.getElementById("questSearch");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    renderQuests(e.target.value);
  });
}

document.querySelectorAll(".tab-btn").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

renderQuests();
