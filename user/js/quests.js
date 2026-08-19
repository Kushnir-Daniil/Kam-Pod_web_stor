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

/** Відстань між двома точками в метрах (формула Haversine) */
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const filterHint = document.getElementById("filterHint");

function showHint(text) {
  if (!filterHint) return;
  filterHint.hidden = !text;
  filterHint.textContent = text || "";
}

// ===== Стан фільтрів =====
let searchText = "";
let scope = "all"; // "all" | "geo"
let userPosition = null; // { lat, lng } — кешується після першого запиту геолокації

function getUserPosition() {
  if (userPosition) return Promise.resolve(userPosition);
  if (!navigator.geolocation) return Promise.reject(new Error("Геолокація не підтримується цим браузером"));

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(userPosition);
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

async function renderQuests() {
  const list = document.getElementById("questList");
  if (!list) return;

  list.innerHTML = `<p class="page-placeholder">Завантаження…</p>`;

  const all = await getPublishedQuests();
  let quests = all.filter(
    (q) =>
      (q.title || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (q.type || "").toLowerCase().includes(searchText.toLowerCase()),
  );

  if (scope === "geo") {
    try {
      const pos = await getUserPosition();
      showHint("");
      quests = quests.filter((q) => {
        const geo = q.game?.geo;
        if (!geo?.lat || !geo?.lng) return false;
        const dist = distanceMeters(pos.lat, pos.lng, geo.lat, geo.lng);
        return dist <= (geo.radius || 100);
      });
    } catch (err) {
      console.error("Не вдалося отримати геолокацію:", err);
      showHint(
        err.code === 1
          ? "Доступ до геолокації заборонено в браузері — дозволь його, щоб бачити квести поруч."
          : "Не вдалося визначити твоє місцезнаходження.",
      );
      quests = [];
    }
  } else {
    showHint("");
  }

  if (quests.length === 0) {
    list.innerHTML =
      scope === "geo"
        ? `<p class="page-placeholder">Поруч із тобою квестів поки немає.</p>`
        : `<p class="page-placeholder">Квестів поки немає</p>`;
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
    searchText = e.target.value;
    renderQuests();
  });
}

// ===== Основні таби (Історії / Фільтри / Досягнення / Спеціальні) =====
const filterPanel = document.getElementById("filterPanel");
const filtersTabBtn = document.querySelector('.tab-btn[data-tab="filters"]');

function openFilterPanel() {
  if (!filterPanel || !filtersTabBtn) return;
  filterPanel.style.left = `${filtersTabBtn.offsetLeft}px`;
  filterPanel.style.width = `${filtersTabBtn.offsetWidth}px`;
  filterPanel.hidden = false;
}

function closeFilterPanel() {
  if (filterPanel) filterPanel.hidden = true;
}

document.querySelectorAll(".tab-btn").forEach((tab) => {
  tab.addEventListener("click", (e) => {
    document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    if (tab.dataset.tab === "filters") {
      // Повторний клік на вже активну "Фільтри" — закриває дропдаун, не відкриваючи знову.
      e.stopPropagation();
      if (filterPanel && !filterPanel.hidden) {
        closeFilterPanel();
      } else {
        openFilterPanel();
      }
      return;
    }

    closeFilterPanel();
  });
});

// Клік поза дропдауном — закриває його
document.addEventListener("click", (e) => {
  if (!filterPanel || filterPanel.hidden) return;
  if (filterPanel.contains(e.target) || filtersTabBtn?.contains(e.target)) return;
  closeFilterPanel();
});

// ===== Пілюлі всередині "Фільтри": Всі / Геолокація =====
document.querySelectorAll(".filter-pill[data-scope]").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill[data-scope]").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    scope = pill.dataset.scope;
    closeFilterPanel();
    renderQuests();
  });
});

renderQuests();