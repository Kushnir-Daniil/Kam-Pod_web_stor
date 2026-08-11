import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../../shared/js/firebase.js";
import { getRecentActivity, ACTIVITY_ICONS } from "../../shared/js/data/activityData.js";

function escapeText(value) {
  return String(value ?? "").replaceAll("<", "&lt;");
}

function timeAgo(date) {
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "щойно";
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  return `${days} дн тому`;
}

/** ===== Загальна статистика ===== */
async function loadStats() {
  try {
    const [usersSnap, questsSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "quests")),
    ]);

    document.getElementById("statUsers").textContent = usersSnap.size;
    document.getElementById("statQuests").textContent = questsSnap.size;

    const storiesCount = questsSnap.docs.filter(
      (d) => (d.data().story?.pages?.length || 0) > 0,
    ).length;
    document.getElementById("statStories").textContent = storiesCount;

    // "Монет видано" поки не рахуємо — немає накопичувального лічильника нарахувань,
    // тільки поточний баланс на юзерах (що не те саме, що "видано за весь час").
    document.getElementById("statCoinsIssued").textContent = "—";
  } catch (err) {
    console.error("Не вдалося завантажити статистику:", err);
  }
}

/** ===== Остання активність ===== */
async function loadActivity() {
  const list = document.getElementById("activityList");
  try {
    const events = await getRecentActivity(5);

    if (!events.length) {
      list.innerHTML = `<p class="page-placeholder" style="margin:8px 0;">Активності поки немає.</p>`;
      return;
    }

    list.innerHTML = events
      .map((e) => {
        const icon = ACTIVITY_ICONS[e.type] || "🔔";
        const when = e.createdAt?.toDate ? timeAgo(e.createdAt.toDate()) : "";
        return `
          <div class="dash-activity-row">
            <div class="dash-activity-icon">${icon}</div>
            <div class="dash-activity-body">
              <strong>${escapeText(e.title)}</strong>
              <p>${escapeText(e.description)}</p>
            </div>
            <span class="dash-activity-time">${escapeText(when)}</span>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Не вдалося завантажити активність:", err);
    list.innerHTML = `<p class="page-placeholder" style="margin:8px 0;">Не вдалося завантажити активність.</p>`;
  }
}

/** ===== Топ користувачів ===== */
async function loadLeaderboard() {
  const list = document.getElementById("leaderboardList");
  try {
    const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(3));
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = `<p class="page-placeholder" style="margin:8px 0;">Поки немає даних.</p>`;
      return;
    }

    const rankClasses = ["gold", "silver", "bronze"];

    list.innerHTML = snap.docs
      .map((d, i) => {
        const data = d.data();
        return `
          <div class="dash-leaderboard-row">
            <span class="dash-rank dash-rank--${rankClasses[i] || "bronze"}">${i + 1}</span>
            <img src="../img/person.png" class="dash-leaderboard-avatar" alt="">
            <div class="dash-leaderboard-body">
              <strong>${escapeText(data.name || "Без імені")}</strong>
              <p>${escapeText(data.xp ?? 0)} ХР</p>
            </div>
            <span class="dash-leaderboard-coins">🪙 ${escapeText(data.coins ?? 0)}</span>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Не вдалося завантажити лідерборд:", err);
    list.innerHTML = `<p class="page-placeholder" style="margin:8px 0;">Не вдалося завантажити лідерборд.</p>`;
  }
}

// ===== Заглушки для ще не реалізованих швидких дій =====
document.getElementById("addUserBtn")?.addEventListener("click", () => {
  alert("Додавання користувача вручну — в розробці");
});

document.getElementById("addStoryBtn")?.addEventListener("click", () => {
  alert("Наразі історії додаються через «Додати квест» (вкладка «Історія» у конструкторі). Окрему форму ще не зроблено.");
});

document.getElementById("rewardSettingsBtn")?.addEventListener("click", () => {
  window.location.href = "all-quests.html";
});

document.getElementById("viewAllActivityBtn")?.addEventListener("click", () => {
  alert("Повний журнал активності — в розробці");
});

document.getElementById("viewAllUsersBtn")?.addEventListener("click", () => {
  alert("Повний список користувачів — в розробці");
});

loadStats();
loadActivity();
loadLeaderboard();