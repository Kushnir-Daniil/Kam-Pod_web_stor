import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../../shared/js/firebase.js";
import { getCurrentUser } from "../../shared/js/data/usersData.js";
import { getCompletedQuestsCount, getCompletedProgress } from "../../shared/js/data/progressData.js";
import { getQuestById } from "../../shared/js/data/questsData.js";
import {
  getAchievementsWithUnlockStatus,
  getAchievementProgress,
  recordAchievementUnlock,
  markAchievementSeen,
} from "../../shared/js/data/achievementsData.js";

/** Рівні гри — поки орієнтовна шкала, легко змінити пізніше */
const LEVELS = [
  { title: "Новачок", min: 0 },
  { title: "Шукач", min: 2000 },
  { title: "Мандрівник", min: 5000 },
  { title: "Легенда", min: 10000 },
];

function getLevelInfo(xp) {
  let current = LEVELS[0];
  let next = LEVELS[1] || null;
  let index = 1;

  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
      index = i + 1;
    }
  }

  return { current, next, index };
}

function buildUsername(name, email) {
  const base = (name || email || "user").split("@")[0].trim().toLowerCase();
  return "@" + base.replace(/\s+/g, "_");
}

function escapeText(value) {
  return String(value ?? "").replaceAll("<", "&lt;");
}

let currentUid = null;

async function loadProfile() {
  const user = getCurrentUser();
  if (!user) return;
  currentUid = user.id;

  try {
    const snap = await getDoc(doc(db, "users", user.id));
    const data = snap.exists() ? snap.data() : {};

    const xp = data.xp ?? 0;

    // ===== Картка користувача =====
    document.getElementById("profileName").textContent = data.name || "Без імені";
    document.getElementById("profileUsername").textContent = buildUsername(data.name, data.email);
    document.getElementById("profileEmailText").textContent = data.email || "";

    const location = data.location || "";
    const locationEl = document.getElementById("profileLocation");
    const locationSep = document.getElementById("profileLocationSep");
    locationEl.textContent = location;
    locationSep.hidden = !location;
    document.getElementById("locationInput").value = location;

    // ===== Рівень / XP =====
    const { current, next, index: levelIndex } = getLevelInfo(xp);
    document.getElementById("profileLevelBadge").textContent = current.title.toUpperCase();
    document.getElementById("xpCurrent").textContent = `${xp} ХР`;

    if (next) {
      document.getElementById("xpNext").textContent = `${next.min} ХР до ${next.title}`;
      const progress = ((xp - current.min) / (next.min - current.min)) * 100;
      document.getElementById("xpBarFill").style.width = `${Math.min(100, Math.max(0, progress))}%`;
    } else {
      document.getElementById("xpNext").textContent = "Максимальний рівень";
      document.getElementById("xpBarFill").style.width = "100%";
    }

    // ===== Кількість пройдених квестів (= блок "Рівень" у "Ваш прогрес") =====
    const completedCount = await getCompletedQuestsCount(user.id);
    document.getElementById("statLevel").textContent = completedCount;

    // ===== Унікальні локації (по completed квестах з geo.city) =====
    const completedProgress = await getCompletedProgress(user.id);
    const cities = new Set();

    for (const p of completedProgress) {
      const quest = await getQuestById(p.questId).catch(() => null);
      const city = quest?.game?.geo?.city;
      if (city) cities.add(city);
    }

    document.getElementById("statLocations").textContent = cities.size;
    document.getElementById("diarySummary").textContent =
      `${completedCount} спогадів · ${cities.size} міст`;

    // Пройдена відстань — сума "точка А → точка Б" за кожен пройдений квест
    const totalMeters = data.totalDistanceMeters ?? 0;
    document.getElementById("statKm").textContent = `${(totalMeters / 1000).toFixed(1)} км`;

    // ===== Досягнення =====
    const stats = { completedQuests: completedCount, uniquePlaces: cities.size, levelIndex };
    const achievements = await getAchievementsWithUnlockStatus(user.id, stats);

    // Фіксуємо перше розблокування (для позначки "НОВЕ")
    await Promise.all(
      achievements.filter((a) => a.unlocked).map((a) => recordAchievementUnlock(user.id, a.id)),
    );

    renderAchievementsPreview(achievements);
    await renderDiaryTags(user.id, achievements);
  } catch (err) {
    console.error("Не вдалося завантажити профіль:", err);
  }
}

function renderAchievementsPreview(achievements) {
  const row = document.getElementById("achievementsPreview");
  const preview = achievements.slice(0, 5);

  row.innerHTML = preview
    .map((a) => `
      <div class="achievement-mini ${a.unlocked ? "" : "locked"}">
        ${
          a.icon
            ? `<img class="achievement-mini-icon" src="${a.icon}" alt="">`
            : `<div class="achievement-mini-icon">🏅</div>`
        }
        <span>${escapeText(a.title)}</span>
      </div>
    `)
    .join("");
}

async function renderDiaryTags(uid, achievements) {
  const progress = await getAchievementProgress(uid);
  const unseen = achievements.find((a) => a.unlocked && progress[a.id] && !progress[a.id].seenAt);

  const newTag = document.getElementById("diaryNewTag");
  const badgeTag = document.getElementById("diaryBadgeTag");

  if (unseen) {
    newTag.hidden = false;
    badgeTag.hidden = false;
    badgeTag.textContent = `БЕЙДЖ «${unseen.title}»`;
    badgeTag.dataset.achievementId = unseen.id;
  } else {
    newTag.hidden = true;
    badgeTag.hidden = true;
  }
}

async function markSeenTags() {
  const badgeTag = document.getElementById("diaryBadgeTag");
  const achievementId = badgeTag?.dataset.achievementId;
  if (achievementId && currentUid) {
    await markAchievementSeen(currentUid, achievementId);
    badgeTag.hidden = true;
    document.getElementById("diaryNewTag").hidden = true;
  }
}

// ===== Копіювання email =====
document.getElementById("copyEmailBtn")?.addEventListener("click", () => {
  const email = document.getElementById("profileEmailText").textContent;
  navigator.clipboard.writeText(email).then(() => {
    const btn = document.getElementById("copyEmailBtn");
    btn.textContent = "✓";
    setTimeout(() => (btn.textContent = "⧉"), 1500);
  });
});

// ===== Заглушки для ще не реалізованих функцій =====
document.getElementById("diaryCard")?.addEventListener("click", (e) => {
  e.preventDefault();
  markSeenTags();
  alert("Щоденник пригод буде доступний найближчим часом");
});

document.getElementById("subscriptionCard")?.addEventListener("click", () => {
  alert("Оплата абонементу буде підключена пізніше");
});

document.getElementById("giftSubBtn")?.addEventListener("click", () => {
  alert("Функція подарунку абонементу в розробці");
});

document.getElementById("suggestLocationBtn")?.addEventListener("click", () => {
  alert("Форма пропозиції локації в розробці");
});

document.getElementById("challengesCard")?.addEventListener("click", () => {
  alert("Виклики між користувачами — в розробці");
});

document.getElementById("viewAllAchievementsBtn")?.addEventListener("click", () => {
  alert("Сторінка з усіма досягненнями буде доступна найближчим часом");
});

// ===== Налаштування: редагування локації =====
const settingsModal = document.getElementById("settingsModal");

document.getElementById("settingsBtn")?.addEventListener("click", () => {
  settingsModal.hidden = false;
});

document.getElementById("cancelSettingsBtn")?.addEventListener("click", () => {
  settingsModal.hidden = true;
});

document.getElementById("saveSettingsBtn")?.addEventListener("click", async () => {
  if (!currentUid) return;
  const value = document.getElementById("locationInput").value.trim();
  const btn = document.getElementById("saveSettingsBtn");
  btn.disabled = true;
  btn.textContent = "Збереження…";

  try {
    await updateDoc(doc(db, "users", currentUid), { location: value });
    const locationEl = document.getElementById("profileLocation");
    const locationSep = document.getElementById("profileLocationSep");
    locationEl.textContent = value;
    locationSep.hidden = !value;
    settingsModal.hidden = true;
  } catch (err) {
    console.error(err);
    alert("Не вдалося зберегти. Спробуй ще раз.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Зберегти";
  }
});

loadProfile();