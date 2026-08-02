import { auth, db } from "/assets/js/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

export function initSidebar() {
    // 1. Menu burger (mobile)
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebarMenu = document.getElementById('sidebar-menu');

    if (toggleBtn && sidebarMenu) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarMenu.classList.toggle('mobile-open');
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebarMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
                    sidebarMenu.classList.remove('mobile-open');
                }
            }
        });
    }

    // 2. Modal Profil
    const modal = document.getElementById("profile-modal");
    const openBtn = document.getElementById("open-user-modal");
    const closeBtn = document.getElementById("close-user-modal");
    const logoutBtn = document.getElementById("logout-btn");

    if (openBtn && modal) openBtn.onclick = () => modal.classList.add("active");
    if (closeBtn && modal) closeBtn.onclick = () => modal.classList.remove("active");
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove("active");
        });
    }

    if (logoutBtn && auth) {
        logoutBtn.onclick = async () => {
            await auth.signOut();
            window.location.href = "/login.html";
        };
    }

    // 3. Charger l'utilisateur en direct
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "/login.html";
            return;
        }

        let fullname = user.displayName || "Utilisateur";
        let email = user.email || "";
        let photoURL = user.photoURL || null;

        if (db) {
            try {
                const userSnap = await getDoc(doc(db, "users", user.uid));
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    if (data.prenom || data.nom) {
                        fullname = `${data.prenom || ""} ${data.nom || ""}`.trim();
                    } else if (data.fullname) {
                        fullname = data.fullname;
                    }
                    if (data.photoURL || data.avatar) {
                        photoURL = data.photoURL || data.avatar;
                    }
                }
            } catch (err) {
                console.error("Erreur Firestore user:", err);
            }
        }

        const initials = fullname.substring(0, 2).toUpperCase();

        // Remplissage Sidebar
        const sbName = document.getElementById("sidebar-user-fullname");
        const sbInit = document.getElementById("sidebar-initials");
        const sbAvatar = document.getElementById("sidebar-avatar");

        if (sbName) sbName.textContent = fullname;
        if (sbAvatar && photoURL) {
            sbAvatar.innerHTML = `<img src="${photoURL}" alt="Avatar">`;
        } else if (sbInit) {
            sbInit.textContent = initials;
        }

        // Remplissage Modal
        const mName = document.getElementById("modal-fullname");
        const mEmail = document.getElementById("modal-email");
        const mInit = document.getElementById("modal-initials");
        const mAvatar = document.getElementById("modal-avatar");

        if (mName) mName.textContent = fullname;
        if (mEmail) mEmail.textContent = email;
        if (mAvatar && photoURL) {
            mAvatar.innerHTML = `<img src="${photoURL}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else if (mInit) {
            mInit.textContent = initials;
        }
    });

    // 4. Charger la version
    getSiteVersionDirect();
}

async function getSiteVersionDirect() {
    const versionEl = document.getElementById("site-version-display");
    if (!versionEl) return;

    try {
        let snap = await getDoc(doc(db, "settings", "site_version"));
        if (!snap.exists()) {
            snap = await getDoc(doc(db, "settings", "site"));
        }

        if (snap.exists()) {
            const data = snap.data();
            versionEl.textContent = `Version ${data.version || data.num || "1.0.0"}`;
        } else {
            versionEl.textContent = "Version 1.0.0";
        }
    } catch (err) {
        console.error("Erreur version:", err);
        versionEl.textContent = "Version 1.0.0";
    }
}