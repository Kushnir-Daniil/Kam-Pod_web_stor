import {
  getCurrentRole,
  canAccessAdminPanel,
  canAccessKazkarPanel,
  getCurrentUser,
  ROLES,
} from "./data/usersData.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./firebase.js";

const NAV_ITEMS = [
  { page: "home.html", icon: "house.png", label: "Головна", path: "../user/home.html" },
  { page: "community.html", icon: "group_people.png", label: "Спільнота", path: "../user/community.html" },
  { page: "quests.html", icon: "navigation_tower.png", label: "Квести", path: "../user/quests.html" },
  { page: "profile.html", icon: "person.png", label: "Профіль", path: "../user/profile.html" },
];

const KAZKAR_ITEM = {
  page: "quests.html",
  icon: "crown.svg",
  label: "Казкар",
  path: "../admin/quests.html",
  panel: "kazkar",
};

const ADMIN_ITEM = {
  page: "dashboard.html",
  icon: "shield.svg",
  label: "Адмін",
  path: "../admin/dashboard.html",
  panel: "admin",
};

function renderNav() {
  const placeholder = document.getElementById("nav-placeholder");
  if (!placeholder) return;

  const role = getCurrentRole();
  const currentPage = window.location.pathname.split("/").pop();
  const inAdmin = window.location.pathname.includes("/admin/");

  let items = [...NAV_ITEMS];

  if (role === ROLES.ADMIN) {
    items.push(ADMIN_ITEM);
  } else if (canAccessKazkarPanel()) {
    items.push(KAZKAR_ITEM);
  }

  const activePage = currentPage === "quest.html" ? "quests.html" : currentPage;

  const html = items.map((item) => {
    let activeClass = "";
    if (item.panel === "admin" && inAdmin && canAccessAdminPanel()) {
      activeClass = " active";
    } else if (item.panel === "kazkar" && inAdmin && canAccessKazkarPanel()) {
      activeClass = " active";
    } else if (!item.panel && item.page === activePage && !inAdmin) {
      activeClass = " active";
    }

    return `
      <a href="${item.path}" class="nav-item${activeClass}" data-page="${item.page}">
        <img src="../img/${item.icon}" alt="${item.label}">
        <span>${item.label}</span>
      </a>
    `;
  }).join("");

  placeholder.innerHTML = `<nav class="bottom-nav">${html}</nav>`;
}

/** Оновлює бейдж монет скрізь, де на сторінці є #globalCoinBadge */
async function renderCoinBadge() {
  const badge = document.getElementById("globalCoinBadge");
  if (!badge) return;

  const user = getCurrentUser();
  if (!user) return;

  try {
    const snap = await getDoc(doc(db, "users", user.id));
    const coins = snap.exists() ? (snap.data().coins ?? 0) : 0;
    badge.textContent = coins;
  } catch (err) {
    console.error("Не вдалося завантажити монети:", err);
  }
}

renderNav();
renderCoinBadge();

export { renderCoinBadge };