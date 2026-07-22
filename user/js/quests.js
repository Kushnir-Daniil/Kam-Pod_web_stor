import { getStories } from "./data/storiesData.js";

function renderQuests(filterText = "") {
    const list = document.getElementById("questList");
    if (!list) return;

    const quests = getStories().filter(q =>
    q.title.toLowerCase().includes(filterText.toLowerCase()) ||
    q.type.toLowerCase().includes(filterText.toLowerCase())
     );

    list.innerHTML = quests.map(quest => `
        <div class="quest-card">
        <img src="../img/${quest.image}" alt="${quest.title}">
        <div class="quest-info">
            <div class="quest-title-row">
            <div>
                <h3>${quest.title}</h3>
                <div class="quest-meta">${quest.type} · ${quest.duration}</div>
            </div>
            ${quest.status === "active"
                ? `<button class="quest-action-btn play">▶</button>`
                : `<button class="quest-action-btn start">Почати</button>`}
            </div>
            <p class="quest-desc">${quest.description}</p>
            ${quest.status === "active" ? `
            <span class="quest-status active">Активний</span>
            <div class="quest-progress-bar">
                <div class="quest-progress-fill" style="width: ${quest.progress}%"></div>
            </div>
            ` : ""}
        </div>
        </div>
    `).join("");
}

// ===== Пошук =====
const searchInput = document.getElementById("questSearch");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    renderQuests(e.target.value);
  });
}

// ===== Перемикання табів (поки лише візуально, логіка інших вкладок — пізніше) =====
document.querySelectorAll(".tab-btn").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

renderQuests();