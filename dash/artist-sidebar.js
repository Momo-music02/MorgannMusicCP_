import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSPUArpApBuK0Cn9VbeMtqk4JC-gqruJc",
  authDomain: "morgann-music-cp.firebaseapp.com",
  projectId: "morgann-music-cp",
  storageBucket: "morgann-music-cp.firebasestorage.app",
  messagingSenderId: "666812685196",
  appId: "1:666812685196:web:fe3df6749ae768d68494a9"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function clean(value) {
  return String(value || "").trim();
}

function normalizeRoleValue(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isSignedArtistData(userDoc) {
  if (!userDoc || typeof userDoc !== "object") return false;
  const role = normalizeRoleValue(userDoc?.role);
  const userRole = normalizeRoleValue(userDoc?.userRole);
  const accountType = normalizeRoleValue(userDoc?.accountType);
  const status = normalizeRoleValue(userDoc?.status);
  const plan = normalizeRoleValue(userDoc?.plan);
  const subscription = normalizeRoleValue(userDoc?.subscription);

  const signedValues = ["artist", "artiste", "artiste signe", "signed artist", "signed"];

  return (
    userDoc.isArtist === true ||
    userDoc.artist === true ||
    signedValues.includes(role) ||
    signedValues.includes(userRole) ||
    signedValues.includes(accountType) ||
    signedValues.includes(status) ||
    signedValues.includes(plan) ||
    signedValues.includes(subscription)
  );
}

function userFullName(user, userDoc) {
  const displayName = clean(userDoc?.displayName || user?.displayName);
  if (displayName) return displayName;

  const firstName = clean(userDoc?.firstName || userDoc?.prenom || userDoc?.prénom);
  const lastName = clean(userDoc?.lastName || userDoc?.nom);
  const full = `${firstName} ${lastName}`.trim();
  if (full) return full;

  if (clean(user?.email).includes("@")) return clean(user.email).split("@")[0];
  return "Artiste";
}

function userPlanLabel(userDoc) {
  const role = clean(userDoc?.role).toLowerCase();
  if (role === "admin") return "Admin";
  if (role === "vip") return "VIP";
  if (isSignedArtistData(userDoc)) return "Artiste Signé";
  return "Artiste";
}

function buildSidebar() {
  document.body.classList.add("artist-sidebar-push");

  const currentPath = (window.location.pathname || "").replace(/\/$/, "") || "/";

  const links = [
    { label: "Dashboard", href: "/dash/index.html" },
    { label: "Mes artistes", href: "/dash/artistes.html" },
    { label: "Mes sorties", href: "/dash/sorties.html" },
    { label: "Nouvelle sortie", href: "/dash/upload.html" },
    { label: "Accompagnement", href: "/dash/accompagnement.html", artistOnly: true },
    { label: "Support", href: "/dash/support/index.html" }
  ];

  const navHtml = links.map(({ label, href, artistOnly }) => {
    const active = ((href || "").replace(/\/$/, "") || "/") === currentPath;
    return `<a class="artist-sidebar__link${active ? " is-active" : ""}${artistOnly ? " artist-only-link" : ""}" href="${href}">${label}</a>`;
  }).join("");

  const aside = document.createElement("aside");
  aside.className = "artist-sidebar";
  aside.innerHTML = `
    <div class="artist-sidebar__profile-wrap">
      <div class="artist-sidebar__profile" id="artistSidebarProfileToggle">
        <img class="artist-sidebar__avatar" id="artistSidebarAvatar" src="/dash/default-avatar.png" alt="Photo de profil" />
        <div class="artist-sidebar__who">
          <div class="artist-sidebar__name" id="artistSidebarFullName">Chargement...</div>
          <div class="artist-sidebar__role" id="artistSidebarSubline">Artiste</div>
        </div>
      </div>
      <div class="artist-sidebar__dropdown" id="artistSidebarProfileMenu">
        <a class="artist-sidebar__dropdown-link" href="/index.html">Accueil</a>
        <a class="artist-sidebar__dropdown-link" href="/MMCP%20Play/index.html">Play</a>
        <a class="artist-sidebar__dropdown-link" href="/account.html">Compte</a>
        <a class="artist-sidebar__dropdown-link" href="/dash/admin/index.html" id="artistSidebarAdminDashLink" style="display:none;">Dashboard admin</a>
      </div>
    </div>

    <nav class="artist-sidebar__nav">${navHtml}</nav>

    <div class="artist-sidebar__foot">
      <button class="artist-sidebar__logout" id="artistSidebarLogout">Déconnexion</button>
    </div>
  `;

  document.body.prepend(aside);

  const avatar = aside.querySelector("#artistSidebarAvatar");
  const fullName = aside.querySelector("#artistSidebarFullName");
  const subline = aside.querySelector("#artistSidebarSubline");

  const profileToggle = aside.querySelector("#artistSidebarProfileToggle");
  const profileMenu = aside.querySelector("#artistSidebarProfileMenu");
  const adminDashLink = aside.querySelector("#artistSidebarAdminDashLink");

  function closeProfileMenu() {
    profileMenu?.classList.remove("is-open");
  }

  profileToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    profileMenu?.classList.toggle("is-open");
  });

  document.addEventListener("click", (event) => {
    if (!profileMenu?.classList.contains("is-open")) return;
    const inToggle = profileToggle?.contains(event.target);
    const inMenu = profileMenu?.contains(event.target);
    if (!inToggle && !inMenu) closeProfileMenu();
  });

  profileMenu?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", closeProfileMenu);
  });

  aside.querySelector("#artistSidebarLogout")?.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch {}
    const here = window.location.href;
    window.location.href = "/login.html?redirect=" + encodeURIComponent(here);
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (fullName) fullName.textContent = "Invité";
      if (subline) subline.textContent = "Non connecté";
      if (avatar) avatar.src = "/dash/default-avatar.png";
      return;
    }

    let userDoc = null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) userDoc = snap.data();
    } catch {}

    if (fullName) fullName.textContent = userFullName(user, userDoc);
    if (subline) subline.textContent = userPlanLabel(userDoc);

    const isAdmin = clean(userDoc?.role).toLowerCase() === "admin";
    if (adminDashLink) {
      adminDashLink.style.display = isAdmin ? "" : "none";
    }

    aside.querySelectorAll(".artist-only-link").forEach((link) => {
      link.style.display = (isSignedArtistData(userDoc) || isAdmin) ? "" : "none";
    });

    const avatarUrl = clean(user?.photoURL || userDoc?.photoURL || userDoc?.avatarUrl || userDoc?.avatarURL);
    if (avatar) {
      avatar.src = avatarUrl || "/dash/default-avatar.png";
      avatar.onerror = () => {
        avatar.onerror = null;
        avatar.src = "/dash/default-avatar.png";
      };
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", buildSidebar, { once: true });
} else {
  buildSidebar();
}
