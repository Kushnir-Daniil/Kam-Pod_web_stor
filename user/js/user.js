import { logoutUser } from "../../shared/js/data/usersData.js";

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Вихід…";

    try {
      await logoutUser();
      window.location.href = "../register/";
    } catch (error) {
      console.error(error);
      alert("Не вдалося вийти. Спробуйте ще раз.");
      logoutBtn.disabled = false;
      logoutBtn.textContent = "Вийти";
    }
  });
}
