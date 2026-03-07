import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, getIdTokenResult } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

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
const db = getFirestore(app);

function isAdminFromData(data){
  if (!data || typeof data !== "object") return false;
  const role = String(data.role || data.userRole || data.type || "").trim().toLowerCase();
  if (role === "admin" || role === "administrator" || role === "staff") return true;
  if (data.isAdmin === true || data.admin === true) return true;
  return false;
}

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

      onAuthStateChanged(auth, async (user) => {
        if (user) {
          if (authLinks) authLinks.style.display = "none";
          if (userMenu) userMenu.style.display = "flex";

          if (userAvatar) {
            userAvatar.src = user.photoURL || "default-avatar.png";
          }

          try {
            let canSeeAdmin = false;

            try {
              const tokenResult = await getIdTokenResult(user);
              if (tokenResult?.claims?.admin === true) canSeeAdmin = true;
            } catch (_) {}

            try {
              const userSnap = await getDoc(doc(db, "users", user.uid));
              if (userSnap.exists()) {
                canSeeAdmin = canSeeAdmin || isAdminFromData(userSnap.data());
              }
            } catch (_) {}

            const existingAdminLink = document.getElementById("admin-dashboard-link");
            if (canSeeAdmin) {
              if (!existingAdminLink && dropdown) {
                const a = document.createElement("a");
                a.id = "admin-dashboard-link";
                a.href = "/dash/admin/index.html";
                a.textContent = "Dashboard Admin";
                const logout = document.getElementById("logout-btn");
                if (logout?.parentElement === dropdown) dropdown.insertBefore(a, logout);
                else dropdown.appendChild(a);
              }
            } else if (existingAdminLink) {
              existingAdminLink.remove();
            }
          } catch (e) {
            const existingAdminLink = document.getElementById("admin-dashboard-link");
            if (existingAdminLink) existingAdminLink.remove();
          }
        } else {
          if (userMenu) userMenu.style.display = "none";
          if (authLinks) authLinks.style.display = "flex";
          const existingAdminLink = document.getElementById("admin-dashboard-link");
          if (existingAdminLink) existingAdminLink.remove();
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
