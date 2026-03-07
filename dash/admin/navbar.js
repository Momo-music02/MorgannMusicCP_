import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSPUArpApBuK0Cn9VbeMtqk4JC-gqruJc",
  authDomain: "morgann-music-cp.firebaseapp.com",
  projectId: "morgann-music-cp",
  storageBucket: "morgann-music-cp.firebasestorage.app",
  messagingSenderId: "666812685196",
  appId: "1:666812685196:web:fe3df6749ae768d68494a9",
  measurementId: "G-FKSSXYEZF0"
};

// éviter "Firebase App named '[DEFAULT]' already exists"
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

function updateNavbar() {
  const navbarContainer = document.getElementById("navbar-container");
  if (!navbarContainer) return;

  fetch("navbar.html")
    .then(res => res.text())
    .then(html => {
      navbarContainer.innerHTML = html;

      // ===== NAVBAR SCROLL =====
      const navbar = document.getElementById("navbar");
      if (navbar) {
        window.addEventListener("scroll", () => {
          const isScrolled = window.scrollY > 50;
          if (isScrolled) navbar.classList.add("scrolled");
          else navbar.classList.remove("scrolled");
        });
      }

      // ===== BURGER MENU =====
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
          dropdown.style.display = (dropdown.style.display === "flex") ? "none" : "flex";
        });
        // Les liens du dropdown doivent rester cliquables
        const dropdownLinks = dropdown.querySelectorAll("a");
        dropdownLinks.forEach(link => {
          link.addEventListener("click", (e) => {
            // Laisser le navigateur suivre naturellement le href
            // Ne pas stopper la propagation ici - on laisse le click arriver au dropdown
          });
        });
        dropdown.addEventListener("click", (e) => {
          e.stopPropagation();
        });
        document.addEventListener("click", (e) => {
          // Fermer le dropdown sauf si on clique dessus ou sur l'avatar
          if (!avatarContainer.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = "none";
          }
        });
      }

      // ===== AUTH UI =====
      const authLinks = document.getElementById("auth-links");
      const userMenu = document.getElementById("user-menu");
      const userAvatar = document.getElementById("user-avatar");
      const logoutBtn = document.getElementById("logout-btn");

      onAuthStateChanged(auth, (user) => {
        if (user) {
          if (authLinks) authLinks.style.display = "none";
          if (userMenu) userMenu.style.display = "flex";

          if (userAvatar) {
            userAvatar.src = user.photoURL || "default-avatar.png";
          }
        } else {
          if (userMenu) userMenu.style.display = "none";
          if (authLinks) authLinks.style.display = "flex";
        }
      });

      logoutBtn?.addEventListener("click", async (e) => {
        e.preventDefault();
        await signOut(auth);
        window.location.href = "index.html";
      });
    })
    .catch(err => console.error(err));
}

updateNavbar();
