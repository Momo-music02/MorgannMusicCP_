document.addEventListener("DOMContentLoaded", () => {
    fetch("js/sidebar.html") // Assure-toi que le chemin vers ton HTML est le bon
        .then(response => {
            if (!response.ok) {
                throw new Error("Erreur lors du chargement de la sidebar");
            }
            return response.text();
        })
        .then(data => {
            // 1. On injecte le HTML de la sidebar
            const container = document.getElementById("sidebar-container");
            if (container) {
                container.innerHTML = data;
            }

            // 2. On applique la classe active sur le lien de la page courante
            activerLienSidebar();

            // 3. On initialise le bouton "+" MAINTENANT qu'il est dans la page
            initNavbarMoreMenu();

            // 4. Mise à jour automatique de l'année pour le Copyright
            initCopyrightYear();

            // 5. Récupération de la version du site
            initSiteVersion();
        })
        .catch(error => console.error("Détails de l'erreur sidebar :", error));
});

// Gère la classe active sur les liens
function activerLienSidebar() {
    const currentPage = window.location.pathname.split("/").pop();
    const pageName = currentPage === "" ? "index.html" : currentPage;

    const sidebarLinks = document.querySelectorAll("#sidebar-container a, .sidebar a, .responsive-nav a");

    sidebarLinks.forEach(link => {
        const linkPage = link.getAttribute("href");
        if (pageName === linkPage) {
            link.classList.add("active");
        }
    });
}

// Gère l'ouverture, la fermeture et l'animation du bouton "+"
function initNavbarMoreMenu() {
    const moreWrapper = document.querySelector(".more-dropdown-wrapper");
    const btnMore = document.getElementById("btn-more");

    if (btnMore && moreWrapper) {
        btnMore.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            moreWrapper.classList.toggle("open");
        });

        window.addEventListener("click", () => {
            moreWrapper.classList.remove("open");
        });
    }
}

// Génère automatiquement l'année en cours
function initCopyrightYear() {
    const copyrightElem = document.getElementById("copyright-year");
    if (copyrightElem) {
        const currentYear = new Date().getFullYear();
        copyrightElem.textContent = `Morgann Music CP © Tout droit réserver ${currentYear}`;
    }
}

// Charge la version actuelle du site depuis Firestore via import dynamique
async function initSiteVersion() {
    const versionElem = document.getElementById("sidebar-site-version");
    if (!versionElem) return;

    try {
        const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getFirestore, collection, getDocs, query, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        const firebaseConfig = {
            apiKey: "AIzaSyDSPUArpApBuK0Cn9VbeMtqk4JC-gqruJc",
            authDomain: "morgann-music-cp.firebaseapp.com",
            projectId: "morgann-music-cp",
            storageBucket: "morgann-music-cp.firebasestorage.app",
            messagingSenderId: "666812685196",
            appId: "1:666812685196:web:fe3df6749ae768d68494a9",
            measurementId: "G-FKSSXYEZF0"
        };

        // Récupère l'application Firebase déjà initialisée, sinon l'initialise
        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const q = query(collection(db, "versions"), orderBy("date", "desc"), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const latest = querySnapshot.docs[0].data();
            versionElem.textContent = latest.version ? `${latest.version}` : "";
        } else {
            versionElem.textContent = "";
        }
    } catch (error) {
        console.error("Erreur lors de la récupération de la version :", error);
        versionElem.textContent = "";
    }
}