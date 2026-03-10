import { GoogleAuthProvider, signInWithPopup } from 
"https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";


function updateNavbar() {
  const navbarContainer = document.getElementById("navbar-container");
  if (!navbarContainer) return;

  fetch("navbar.html")
    .then((res) => res.text())
    .then((html) => {
      navbarContainer.innerHTML = html;

      // ===== NAVBAR SCROLL (comme avant) =====
      const navbar = document.getElementById("navbar");
      if (navbar) {
        window.addEventListener("scroll", () => {
          if (window.scrollY > 50) navbar.classList.add("scrolled");
          else navbar.classList.remove("scrolled");
        });
      }

      // ===== BURGER MENU (comme avant) =====
      const menuToggle = document.getElementById("menu-toggle");
      const navLinks = document.getElementById("nav-links");
      if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => {
          navLinks.classList.toggle("active");
        });
      }

      // ===== DROPDOWN AVATAR =====
      const avatarContainer = document.getElementById("avatar-container");
      const dropdown = document.getElementById("user-dropdown");

      if (avatarContainer && dropdown) {
        avatarContainer.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdown.style.display =
            dropdown.style.display === "flex" ? "none" : "flex";
        });

        document.addEventListener("click", () => {
          dropdown.style.display = "none";
        });
      }

      const googleBtn = document.getElementById("google-login");

if (googleBtn) {
  googleBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);

      console.log("Google login OK", result.user);

      // Si tu utilises le flag navbar simple
      localStorage.setItem("mmcp_logged_in", "1");

      window.location.href = "index.html";
    } catch (err) {
      console.error("Google login error", err);
      alert(err.message);
    }
  });
}

if (user && user.photoURL) {
  userAvatar.src = user.photoURL;
}


      // ⚠️ Ici, on ne gère PAS Firebase dans navbar.js (sinon il faudrait le passer en module)
      // On garde juste l'affichage basé sur un flag simple que tu mets après login:
      const userMenu = document.getElementById("user-menu");
      const isLoggedIn = localStorage.getItem("mmcp_logged_in") === "1";
      if (userMenu) userMenu.style.display = isLoggedIn ? "inline" : "none";

      // Logout (simple)
      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
          e.preventDefault();
          localStorage.removeItem("mmcp_logged_in");
          window.location.href = "login.html";
        });
      }
    })
    .catch((err) => console.error(err));
}

updateNavbar();
