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
let onSnapshotFn = null;
let disabledWatcherUnsub = null;

function applyFaviconSet() {
  const dynamicSelector = "link[data-mmcp-favicon='1']";
  document.querySelectorAll(dynamicSelector).forEach((node) => node.remove());

  const definitions = [
    { rel: "icon", type: "image/png", sizes: "16x16", href: "/assets/img/favicon-16x16clair.png", media: "(prefers-color-scheme: light)" },
    { rel: "icon", type: "image/png", sizes: "16x16", href: "/assets/img/favicon-16x16sombre.png", media: "(prefers-color-scheme: dark)" },
    { rel: "icon", type: "image/png", sizes: "32x32", href: "/assets/img/favicon-32x32clair.png", media: "(prefers-color-scheme: light)" },
    { rel: "icon", type: "image/png", sizes: "32x32", href: "/assets/img/favicon-32x32sombre.png", media: "(prefers-color-scheme: dark)" },
    { rel: "icon", type: "image/x-icon", href: "/assets/img/faviconclair.ico", media: "(prefers-color-scheme: light)" },
    { rel: "icon", type: "image/x-icon", href: "/assets/img/faviconsombre.ico", media: "(prefers-color-scheme: dark)" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "/assets/img/apple-touch-icon.png" },
    { rel: "icon", type: "image/png", sizes: "192x192", href: "/assets/img/android-chrome-192x192.png" },
    { rel: "icon", type: "image/png", sizes: "512x512", href: "/assets/img/android-chrome-512x512.png" }
  ];

  definitions.forEach((def) => {
    const link = document.createElement("link");
    link.setAttribute("data-mmcp-favicon", "1");
    Object.entries(def).forEach(([key, value]) => {
      if (value) link.setAttribute(key, value);
    });
    document.head.appendChild(link);
  });
}

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

function isAccountDisabled(data) {
  if (!data || typeof data !== "object") return false;
  if (data.accountDisabled === true) return true;
  const status = String(data.status || "").trim().toLowerCase();
  return status === "disabled" || status === "desactive";
}

// Navbar HTML inliné pour chargement instantané (pas de fetch)
const NAVBAR_HTML = `<link rel="stylesheet" href="/assets/css/navbar.css">
<header class="navbar" id="navbar">
    <nav>
        <div class="logo">
      <a href="/index.html">
        <img id="logo" src="/assets/img/logo.svg?v=20260309" alt="Morgann Music Logo">
            </a>
        </div>
        <button class="menu-toggle" id="menu-toggle">☰</button>
        <ul id="nav-links">
      <li><a href="/index.html">Accueil</a></li>
      <li><a href="/histoire.html">Histoire</a></li>
      <li><a href="/distribution.html">Distribution</a></li>
      <li><a href="/pricing.html">Tarifs</a></li>
          <li><a href="/shop/index.html">Shop</a></li>
            <li><a href="https://play.morgannmusic.uk">Play</a></li>
            <li><a href="/le-label/index.html">Le label</a></li>

<li id="auth-links" style="display:none;">
  <a href="/login.html" class="btn-auth btn-login-nav">Se connecter</a>
  <a href="/login.html?tab=register" class="btn-auth btn-auth-outline">S'enregistrer</a>
</li>

<li id="user-menu" style="display:none;">
  <div class="mmcp-user" id="avatar-container">
    <img src="/assets/img/default-avatar.png" alt="Profil" class="mmcp-avatar" id="user-avatar">
    <div class="mmcp-dropdown" id="user-dropdown">
      <a href="account.html" class="link-account-nav">Compte</a>
      <a href="/dash/index.html">Tableau de bord</a>
      <a href="https://play.morgannmusic.uk">Play</a>
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
  const logoSvg = "/assets/img/logo.svg?v=20260309";
  const logoBlueLight = "/assets/img/logo-blue-light.svg?v=20260310";
  const logoBlueDark = "/assets/img/logo-blue-dark.svg?v=20260310";
  const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const path = String(window.location.pathname || "").toLowerCase();
  const useBlueLogo = path.endsWith("/login.html") || path.endsWith("/account.html") || path.endsWith("login.html") || path.endsWith("account.html");

  const syncLogoWithTheme = () => {
    if (!logo) return;
    if (useBlueLogo) {
      logo.src = themeQuery.matches ? logoBlueDark : logoBlueLight;
      logo.style.filter = "none";
      return;
    }

    logo.src = logoSvg;
    logo.style.filter = themeQuery.matches ? "invert(1)" : "none";
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
    if (disabledWatcherUnsub) {
      try { disabledWatcherUnsub(); } catch {}
      disabledWatcherUnsub = null;
    }

    if (user) {
      if (db && docFn && onSnapshotFn) {
        try {
          disabledWatcherUnsub = onSnapshotFn(docFn(db, "users", user.uid), async (snap) => {
            const data = snap?.exists?.() ? (snap.data() || {}) : null;
            if (!isAccountDisabled(data)) return;
            try {
              sessionStorage.setItem("mmcp_account_disabled", "1");
            } catch {}
            try {
              if (signOutFn && auth) await signOutFn(auth);
            } finally {
              window.location.href = "/login.html?disabled=1";
            }
          });
        } catch {}
      }

      if (authLinks) authLinks.style.display = "none";
      if (userMenu) userMenu.style.display = "flex";
      if (userAvatar) {
        userAvatar.src = user.photoURL || "/assets/img/default-avatar.png";
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
      if (disabledWatcherUnsub) {
        try { disabledWatcherUnsub(); } catch {}
        disabledWatcherUnsub = null;
      }
      if (userMenu) userMenu.style.display = "none";
      if (authLinks) authLinks.style.display = "flex";
      const existingAdminLink = document.getElementById("admin-dashboard-link");
      if (existingAdminLink) existingAdminLink.remove();
    }
  });

  logoutBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (signOutFn && auth) await signOutFn(auth);
    window.location.href = "/index.html";
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
    onSnapshotFn = firestoreMod.onSnapshot;
  } catch (_) {
    auth = null;
    db = null;
    signOutFn = null;
    onAuthStateChangedFn = null;
    getIdTokenResultFn = null;
    docFn = null;
    getDocFn = null;
    onSnapshotFn = null;
  }
}

applyFaviconSet();

async function bootNavbar() {
  await initFirebaseAuth();
  updateNavbar();
}

bootNavbar();

// ----- MMCP Loader Component -----
function _ensureMmcpLoaderStyles() {
  if (document.getElementById('mmcp-loader-styles')) return;
  const css = `
  @keyframes mmcp-blink { 0%{opacity:1}50%{opacity:0.15}100%{opacity:1} }
  .mmcp-loader{display:inline-block;vertical-align:middle;color:currentColor}
  .mmcp-loader svg{display:block;height:1.6em;width:auto}
  .mmcp-loader--small svg{height:1em}
  .mmcp-loader--medium svg{height:2.2em}
  .mmcp-loader-part{animation: mmcp-blink 1s infinite ease-in-out}
  .mmcp-loader-part.p1{animation-delay:0s}
  .mmcp-loader-part.p2{animation-delay:0.12s}
  .mmcp-loader-part.p3{animation-delay:0.24s}
  `;
  const style = document.createElement('style');
  style.id = 'mmcp-loader-styles';
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}

function _chooseContrastColor(bgColor) {
  if (!bgColor) return '#000';
  const m = bgColor.match(/rgba?\(([^)]+)\)/i);
  if (!m) return '#000';
  const parts = m[1].split(',').map(p=>Number(p.trim()));
  const r = parts[0]||0, g = parts[1]||0, b = parts[2]||0;
  // relative luminance
  const l = 0.2126*(r/255)**2.2 + 0.7152*(g/255)**2.2 + 0.0722*(b/255)**2.2;
  return l > 0.5 ? '#000' : '#fff';
}

function insertMmcpLoader(target, opts={}){
  try{
    _ensureMmcpLoaderStyles();
    if (!target) return null;
    const size = opts.size || 'medium';
    const container = document.createElement('span');
    container.className = `mmcp-loader mmcp-loader--${size}`;
    // inline SVG uses currentColor for fills so we can set color on container
    container.innerHTML = `
      <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
        <g>
          <path class="mmcp-loader-part p1" d="M10 45 L40 10 L70 45 Z" fill="currentColor"></path>
          <path class="mmcp-loader-part p2" d="M80 45 L110 10 L140 45 Z" fill="currentColor"></path>
          <circle class="mmcp-loader-part p3" cx="170" cy="27" r="12" fill="currentColor"></circle>
        </g>
      </svg>`;

    // determine background color of target or its ancestor
    let el = target;
    let bg = '';
    while(el && el !== document.documentElement){
      const s = getComputedStyle(el).backgroundColor;
      if (s && s !== 'rgba(0, 0, 0, 0)' && s !== 'transparent') { bg = s; break; }
      el = el.parentElement;
    }
    if (!bg) {
      // fallback to body or prefers-color-scheme
      bg = getComputedStyle(document.body).backgroundColor || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'rgb(12,12,14)' : 'rgb(250,250,252)');
    }
    const color = _chooseContrastColor(bg);
    container.style.color = color;

    // replace target contents if target is empty, otherwise append
    if (target.children.length === 0 && String(target.textContent||'').trim() === '') {
      target.appendChild(container);
    } else {
      // place before existing content for inline use
      target.insertBefore(container, target.firstChild);
    }
    return container;
  }catch(e){ console.error('mmcp loader insert error', e); return null; }
}

// Auto-initialize any element with `data-mmcp-loader` attribute once DOM ready
function _initMmcpLoadersAuto(){
  const run = () => {
    document.querySelectorAll('[data-mmcp-loader]').forEach((node)=>{
      if (!node.__mmcp_loader_inited) {
        const size = node.getAttribute('data-mmcp-loader-size') || 'medium';
        insertMmcpLoader(node, {size});
        node.__mmcp_loader_inited = true;
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
}

_initMmcpLoadersAuto();
