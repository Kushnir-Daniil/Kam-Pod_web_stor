import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../../shared/js/firebase.js";
import { getCurrentUser } from "../../shared/js/data/usersData.js";
import { getCompletedQuestsCount } from "../../shared/js/data/progressData.js";

async function loadProfile() {
  const user = getCurrentUser();
  if (!user) return;

  const xpEl = document.getElementById("profileXp");
  const countEl = document.getElementById("profileCompletedCount");

  try {
    const snap = await getDoc(doc(db, "users", user.id));
    const data = snap.exists() ? snap.data() : {};

    if (xpEl) xpEl.textContent = data.xp ?? 0;

    const completedCount = await getCompletedQuestsCount(user.id);
    if (countEl) countEl.textContent = completedCount;
  } catch (err) {
    console.error("Не вдалося завантажити профіль:", err);
  }
}

loadProfile();