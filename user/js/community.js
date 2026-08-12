import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../../shared/js/firebase.js";

/** Та сама шкала, що й на профілі — 4 умовні рівні за XP */
const LEVELS = [
  { title: "Новачок", min: 0 },
  { title: "Шукач", min: 2000 },
  { title: "Мандрівник", min: 5000 },
  { title: "Легенда", min: 10000 },
];

function getLevelIndex(xp) {
  let index = 1;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) index = i + 1;
  }
  return index;
}

function escapeText(value) {
  return String(value ?? "").replaceAll("<", "&lt;");
}

function rankClass(i) {
  if (i === 0) return "gold";
  if (i === 1) return "silver";
  if (i === 2) return "bronze";
  return "plain";
}

async function loadLeaderboard() {
  const list = document.getElementById("leaderboardList");
  try {
    const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(10));
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = `<p class="page-placeholder">Поки немає даних для рейтингу.</p>`;
      return;
    }

    list.innerHTML = snap.docs
      .map((d, i) => {
        const data = d.data();
        const xp = data.xp ?? 0;
        const cls = rankClass(i);
        return `
          <div class="comm-row">
            <span class="comm-rank comm-rank--${cls}">${i + 1}</span>
            <img src="../img/person.png" class="comm-avatar" alt="">
            <div class="comm-row-body">
              <strong>${escapeText(data.name || "Без імені")}</strong>
              <span class="comm-level-chip">Рівень ${getLevelIndex(xp)}</span>
            </div>
            <span class="comm-xp">⭐ ${escapeText(xp)} ХР</span>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Не вдалося завантажити рейтинг:", err);
    list.innerHTML = `<p class="page-placeholder">Не вдалося завантажити рейтинг.</p>`;
  }
}

function showFriendsEmptyState() {
  document.getElementById("leaderboardList").innerHTML =
    `<p class="page-placeholder">У тебе поки немає друзів, тож і рейтинг серед них порожній.</p>`;
}

// ===== Фільтри "Усі" / "Друзі" =====
document.querySelectorAll(".comm-filter-pill[data-scope]").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".comm-filter-pill[data-scope]").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    if (pill.dataset.scope === "friends") {
      showFriendsEmptyState();
    } else {
      loadLeaderboard();
    }
  });
});

// ===== "За тиждень" — поки суто візуальний фільтр, дані не змінює =====
document.getElementById("periodFilter")?.addEventListener("click", () => {
  alert("Фільтр за періодом поки не впливає на дані — рейтинг завжди загальний.");
});

// ===== Перемикач "Таблиця лідерів" / "Мої виклики" =====
document.getElementById("challengesToggle")?.addEventListener("click", () => {
  alert("Виклики між користувачами — в розробці");
});

// ===== Заглушки =====
document.getElementById("viewFullRankingBtn")?.addEventListener("click", () => {
  alert("Повний рейтинг — в розробці");
});

document.getElementById("viewAllFriendsBtn")?.addEventListener("click", () => {
  alert("Список друзів — в розробці");
});

document.getElementById("inviteFriendsBtn")?.addEventListener("click", () => {
  alert("Запрошення друзів — в розробці");
});

loadLeaderboard();