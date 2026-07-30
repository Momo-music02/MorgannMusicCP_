export function initSidebar(auth) {
    // Gestion du menu burger (visible sur mobile uniquement via CSS)
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebarMenu = document.getElementById('sidebar-menu');

    if (toggleBtn && sidebarMenu) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarMenu.classList.toggle('mobile-open');
        });

        // Fermer la sidebar si on clique en dehors (sur mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebarMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
                    sidebarMenu.classList.remove('mobile-open');
                }
            }
        });
    }

    // Gestion du modal profil
    const modal = document.getElementById("profile-modal");
    const openBtn = document.getElementById("open-user-modal");
    const closeBtn = document.getElementById("close-user-modal");
    const logoutBtn = document.getElementById("logout-btn");

    if (openBtn && modal) {
        openBtn.onclick = () => modal.classList.add("active");
    }
    if (closeBtn && modal) {
        closeBtn.onclick = () => modal.classList.remove("active");
    }
    if (logoutBtn && auth) {
        logoutBtn.onclick = async () => {
            await auth.signOut();
            window.location.href = "/index.html";
        };
    }
}