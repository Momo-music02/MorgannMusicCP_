import { auth } from "/assets/js/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { api } from "/assets/js/api.js";

export function initSidebar() {
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

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "/login.html";
            return;
        }

        let fullname = user.displayName || "Utilisateur";
        let email = user.email || "";
        let photoURL = user.photoURL || null;

        try {
            const data = await api.get(`/api/users/${user.uid}`);
            if (data && !data.error) {
                if (data.firstName || data.lastName) {
                    fullname = `${data.firstName || ""} ${data.lastName || ""}`.trim();
                } else if (data.fullName) {
                    fullname = data.fullName;
                }
                if (data.photoURL) {
                    photoURL = api.fileUrl(data.photoURL);
                }
            }
        } catch (err) {
            console.error("Erreur D1 user:", err);
        }

        const initials = fullname.substring(0, 2).toUpperCase();

        const sbName = document.getElementById("sidebar-user-fullname");
        const sbInit = document.getElementById("sidebar-initials");
        const sbAvatar = document.getElementById("sidebar-avatar");

        if (sbName) sbName.textContent = fullname;
        if (sbAvatar && photoURL) {
            sbAvatar.innerHTML = `<img src="${photoURL}" alt="Avatar">`;
        } else if (sbInit) {
            sbInit.textContent = initials;
        }

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
}