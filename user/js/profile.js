import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../../shared/js/firebase.js";
import { getCurrentUser } from "../../shared/js/data/usersData.js";
import { getCompletedQuestsCount, getCompletedProgress } from "../../shared/js/data/progressData.js";
import { getQuestById } from "../../shared/js/data/questsData.js";

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

  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    }
  }

  return { current, next };
}

function buildUsername(name, email) {
  const base = (name || email || "user").split("@")[0].trim().toLowerCase();
  return "@" + base.replace(/\s+/g, "_");
}

async function loadProfile() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    const snap = await getDoc(doc(db, "users", user.id));
    const data = snap.exists() ? snap.data() : {};

    const xp = data.xp ?? 0;

    // ===== Картка користувача =====
    document.getElementById("profileName").textContent = data.name || "Без імені";
    document.getElementById("profileUsername").textContent = buildUsername(data.name, data.email);
    document.getElementById("profileEmailText").textContent = data.email || "";

    // ===== Рівень / XP =====
    const { current, next } = getLevelInfo(xp);
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

    // ===== Кількість пройдених квестів =====
    const completedCount = await getCompletedQuestsCount(user.id);
    document.getElementById("statQuests").textContent = completedCount;

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

    // Кілометри поки не рахуються — окрема задача (немає механізму трекінгу)
    document.getElementById("statKm").textContent = "0.0 км";
  } catch (err) {
    console.error("Не вдалося завантажити профіль:", err);
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

document.getElementById("settingsBtn")?.addEventListener("click", () => {
  alert("Налаштування профілю в розробці");
});

loadProfile();