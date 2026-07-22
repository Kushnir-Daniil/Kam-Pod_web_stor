const NAV_ITEMS = [
  { page: "home.html", icon: "house.png", label: "Головна", path: "../user/home.html" },
  { page: "community.html", icon: "group_people.png", label: "Спільнота", path: "../user/community.html" },
  { page: "quests.html", icon: "tower.png", label: "Квести", path: "../user/quests.html" },
  { page: "profile.html", icon: "person.png", label: "Профіль", path: "../user/profile.html" },
];

const ADMIN_ITEM = {
  page: "dashboard.html", icon: "crown.svg", label: "Адмін", path: "../admin/dashboard.html"
};

function renderNav() {
  const placeholder = document.getElementById("nav-placeholder");
  if (!placeholder) return;

  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const currentPage = window.location.pathname.split("/").pop();

  let items = [...NAV_ITEMS];
  if (isAdmin) items.push(ADMIN_ITEM);

  const html = items.map((item) => {
    const activeClass = item.page === currentPage ? " active" : "";
    return `
      <a href="${item.path}" class="nav-item${activeClass}" data-page="${item.page}">
        <img src="../img/${item.icon}" alt="${item.label}">
        <span>${item.label}</span>
      </a>
    `;
  }).join("");

  placeholder.innerHTML = `<nav class="bottom-nav">${html}</nav>`;
}

renderNav();