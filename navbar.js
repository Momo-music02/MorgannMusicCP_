const firebaseConfig = {
  apiKey: "AIzaSyDSPUArpApBuK0Cn9VbeMtqk4JC-gqruJc",
  authDomain: "morgann-music-cp.firebaseapp.com",
  projectId: "morgann-music-cp",
  storageBucket: "morgann-music-cp.firebasestorage.app",
  messagingSenderId: "666812685196",
  appId: "1:666812685196:web:fe3df6749ae768d68494a9",
  measurementId: "G-FKSSXYEZF0"
};

let auth = null;
let db = null;
let signOutFn = null;
let onAuthStateChangedFn = null;
let getIdTokenResultFn = null;
let docFn = null;
let getDocFn = null;

function ensureThemeMetaTag() {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  return meta;
}

function toOpaqueColor(colorValue) {
  const raw = String(colorValue || "").trim();
  if (!raw) return "";
  const rgbaMatch = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgbaMatch) return raw;

  const parts = rgbaMatch[1].split(",").map((p) => p.trim());
  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);

  if ([r, g, b].some((v) => Number.isNaN(v))) return raw;
  return `rgb(${r}, ${g}, ${b})`;
}

function syncThemeColorWithNavbarScrolled() {
  const meta = ensureThemeMetaTag();
  const cssColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--nbscr")
    .trim();

  const fallback = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "rgb(12, 12, 14)"
    : "rgb(250, 250, 252)";

  meta.setAttribute("content", toOpaqueColor(cssColor) || fallback);
}

function isHomePage() {
  const path = String(window.location.pathname || "").toLowerCase();
  return path === "/" || path.endsWith("/index.html") || path.endsWith("index.html");
}

function isAdminFromData(data){
  if (!data || typeof data !== "object") return false;
  const role = String(data.role || data.userRole || data.type || "").trim().toLowerCase();
  if (role === "admin" || role === "administrator" || role === "staff") return true;
  if (data.isAdmin === true || data.admin === true) return true;
  return false;
}

// Navbar HTML inliné pour chargement instantané (pas de fetch)
const NAVBAR_HTML = `<link rel="stylesheet" href="navbar.css">
<header class="navbar" id="navbar">
    <nav>
        <div class="logo">
            <a href="index.html">
                <img id="logo" src="logo.png" alt="Morgann Music Logo">
            </a>
        </div>
        <button class="menu-toggle" id="menu-toggle">☰</button>
        <ul id="nav-links">
            <li><a href="index.html">Accueil</a></li>
            <li><a href="distribution.html">Distribution</a></li>
            <li><a href="pricing.html">Tarifs</a></li>
          <li><a href="/shop/index.html">Shop</a></li>
            <li><a href="/MMCP%20Play/index.html">Play</a></li>
            <li><a href="/le-label/index.html">Le label</a></li>

<li id="auth-links" style="display:none;">
  <a href="login.html" class="btn-auth">Se connecter</a>
  <a href="login.html?tab=register" class="btn-auth btn-auth-outline">S'enregistrer</a>
</li>

<li id="user-menu" style="display:none;">
  <div class="mmcp-user" id="avatar-container">
    <img src="default-avatar.png" alt="Profil" class="mmcp-avatar" id="user-avatar">
    <div class="mmcp-dropdown" id="user-dropdown">
      <a href="account.html">Compte</a>
      <a href="/dash/index.html">Tableau de bord</a>
      <a href="/MMCP%20Play/index.html">Play</a>
      <a href="#" id="logout-btn">Déconnexion</a>
    </div>
  </div>
</li>

        </ul>
    </nav>
</header>`;

function updateNavbar() {
  const navbarContainer = document.getElementById("navbar-container");
  if (!navbarContainer) return;

  // Injection instantanée du HTML (pas de fetch)
  navbarContainer.innerHTML = NAVBAR_HTML;

  const logo = document.getElementById("logo");
  const logoLight = "logo.png";
  const logoDark = "logo2.png";
  const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const syncLogoWithTheme = () => {
    if (!logo) return;
    logo.src = themeQuery.matches ? logoDark : logoLight;
  };

  syncLogoWithTheme();
  if (typeof themeQuery.addEventListener === "function") {
    themeQuery.addEventListener("change", syncLogoWithTheme);
  } else if (typeof themeQuery.addListener === "function") {
    themeQuery.addListener(syncLogoWithTheme);
  }

  syncThemeColorWithNavbarScrolled();
  requestAnimationFrame(syncThemeColorWithNavbarScrolled);
  setTimeout(syncThemeColorWithNavbarScrolled, 120);
  window.matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", syncThemeColorWithNavbarScrolled);

  // ===== NAVBAR SCROLL =====
  const navbar = document.getElementById("navbar");
  if (navbar) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) navbar.classList.add("scrolled");
      else navbar.classList.remove("scrolled");
    });

    if (isHomePage()) {
      navbar.addEventListener("mouseenter", () => {
        const meta = ensureThemeMetaTag();
        meta.setAttribute("content", "#ffffff");
      });

      navbar.addEventListener("mouseleave", () => {
        syncThemeColorWithNavbarScrolled();
      });
    }
  }

  // ===== BURGER MENU =====
  const menuToggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => navLinks.classList.toggle("active"));
  }

  // ===== DROPDOWN AVATAR =====
  const avatarContainer = document.getElementById("avatar-container");
  const dropdown = document.getElementById("user-dropdown");
  if (avatarContainer && dropdown) {
    avatarContainer.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.style.display = (dropdown.style.display === "flex") ? "none" : "flex";
    });
    const dropdownLinks = dropdown.querySelectorAll("a");
    dropdownLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        // Laisser le navigateur suivre naturellement le href
      });
    });
    dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    document.addEventListener("click", (e) => {
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

  if (userMenu) userMenu.style.display = "none";
  if (authLinks) authLinks.style.display = "flex";

  if (!auth || !onAuthStateChangedFn) {
    logoutBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "index.html";
    });
    return;
  }

  onAuthStateChangedFn(auth, async (user) => {
    if (user) {
      if (authLinks) authLinks.style.display = "none";
      if (userMenu) userMenu.style.display = "flex";
      if (userAvatar) {
        userAvatar.src = user.photoURL || "default-avatar.png";
      }

      try {
        let canSeeAdmin = false;

        try {
          const tokenResult = await getIdTokenResultFn(user);
          if (tokenResult?.claims?.admin === true) canSeeAdmin = true;
        } catch (_) {}

        try {
          const userSnap = await getDocFn(docFn(db, "users", user.uid));
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
    if (signOutFn && auth) await signOutFn(auth);
    window.location.href = "index.html";
  });
}

async function initFirebaseAuth() {
  try {
    const [appMod, authMod, firestoreMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js")
    ]);

    const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(firebaseConfig);
    auth = authMod.getAuth(app);
    db = firestoreMod.getFirestore(app);

    signOutFn = authMod.signOut;
    onAuthStateChangedFn = authMod.onAuthStateChanged;
    getIdTokenResultFn = authMod.getIdTokenResult;
    docFn = firestoreMod.doc;
    getDocFn = firestoreMod.getDoc;
  } catch (_) {
    auth = null;
    db = null;
    signOutFn = null;
    onAuthStateChangedFn = null;
    getIdTokenResultFn = null;
    docFn = null;
    getDocFn = null;
  }
}

async function bootNavbar() {
  await initFirebaseAuth();
  updateNavbar();
}

bootNavbar();
