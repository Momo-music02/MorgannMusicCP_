import { onAuthStateChanged, signOut, getIdTokenResult } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "/assets/js/firebase.js";

document.addEventListener("DOMContentLoaded", () => {
    const navbarContainer = document.getElementById("navbar");

    if (!navbarContainer) {
        console.warn("Element #navbar introuvable dans le DOM.");
        return;
    }

    const navbarPath = "/assets/navbars/accueil/navbar.html";

    fetch(navbarPath)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: Impossible de charger le fichier ${navbarPath}`);
            }
            return response.text();
        })
        .then((data) => {
            navbarContainer.innerHTML = data;

            const desktopNavLinks = navbarContainer.querySelector("#desktop-nav-links");
            const mobileMenuOverlay = navbarContainer.querySelector("#mobile-menu-overlay");
            const mobileMenu = navbarContainer.querySelector("#mobile-menu");
            const menuToggle = navbarContainer.querySelector("#menu-toggle");
            const navAuth = navbarContainer.querySelector("#nav-auth");

            if (!navAuth) return;

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            const animateNavbar = () => {
                if (typeof gsap !== "undefined" && !reducedMotion) {
                    const tl = gsap.timeline();
                    tl.to(".navbar", {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                        ease: "power2.out",
                        startAt: { y: -20, opacity: 0 }
                    });

                    tl.to([".nav-logo", ".nav-auth"], {
                        opacity: 1,
                        duration: 0.4,
                        ease: "power1.out"
                    }, "-=0.2");

                    tl.to(".nav-item", {
                        opacity: 1,
                        y: 0,
                        duration: 0.4,
                        stagger: 0.06,
                        ease: "power1.out",
                        startAt: { y: -5, opacity: 0 }
                    }, "-=0.25");
                } else {
                    const bar = navbarContainer.querySelector(".navbar");
                    if (bar) bar.style.opacity = "1";
                    navbarContainer.querySelectorAll(".nav-logo, .nav-auth, .nav-item").forEach((el) => {
                        el.style.opacity = "1";
                    });
                }
            };

            // Préparation du contenu mobile
            const mobileNavLinksContainer = document.createElement('div');
            mobileNavLinksContainer.className = 'mobile-nav-links';
            if (desktopNavLinks) mobileNavLinksContainer.innerHTML = desktopNavLinks.innerHTML;
            mobileMenu.appendChild(mobileNavLinksContainer);

            const mobileAuthLinksDiv = document.createElement('div');
            mobileAuthLinksDiv.className = 'mobile-auth-links';
            mobileMenu.appendChild(mobileAuthLinksDiv);

            const attachMobileMenuLinkListeners = () => {
                mobileMenu.querySelectorAll('a, button').forEach(link => {
                    link.addEventListener('click', () => closeMobileMenu());
                });
            };

            const renderDisconnected = () => {
                const authHtml = `
                    <a class="auth-link" href="/login.html">Se connecter</a>
                    <a class="auth-link" href="/signin.html">S'inscrire</a>
                `;
                navAuth.innerHTML = authHtml;
                mobileAuthLinksDiv.innerHTML = authHtml;
                attachMobileMenuLinkListeners();
            };

            const renderConnected = (user, isAdmin, customPhotoURL) => {
                // Utilise la photo custom de Firestore, sinon Auth, sinon l'avatar par défaut
                const photo = customPhotoURL || user.photoURL || "/assets/img/icons/pdp-compte.png";

                const adminItem = isAdmin
                    ? `<a href="/admin.html">Tableau de bord admin</a>`
                    : "";

                // Layout Desktop
                const profileHtml = `
                    <div class="profile-wrap">
                        <button class="profile-button" id="profile-button" aria-label="Ouvrir le menu profil">
                            <img src="${photo}" alt="Photo de profil">
                        </button>
                        <div class="profile-menu" id="profile-menu">
                            <a href="/portail/index.html">Portail Utilisateur</a>
                            <a href="/account.html">Espace compte</a>
                            ${adminItem}
                            <button type="button" class="danger" id="logout-button">Se déconnecter</button>
                        </div>
                    </div>
                `;

                // Layout Mobile (Injection dans le menu latéral burger)
                const mobileProfileHtml = `
                    <div class="profile-wrap mobile-profile-wrap">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <img src="${photo}" alt="Photo de profil" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--text-nb);">
                            <span style="color: var(--text-nb); font-weight: 600; font-size: 0.95rem;">Mon Compte</span>
                        </div>
                        <a href="/portail/index.html">Portail Utilisateur</a>
                        <a href="/account.html">Espace compte</a>
                        ${adminItem}
                        <button type="button" class="danger" id="mobile-logout-button" style="background:none; border:none; color:#ffdde8; text-align:left; padding:8px 0; font-size:1rem; cursor:pointer;">Se déconnecter</button>
                    </div>
                `;

                navAuth.innerHTML = profileHtml;
                mobileAuthLinksDiv.innerHTML = mobileProfileHtml;

                // Gestion du menu déroulant Desktop
                const setupProfileMenu = (container) => {
                    const profileButton = container.querySelector("#profile-button");
                    const profileMenu = container.querySelector("#profile-menu");
                    const logoutButton = container.querySelector("#logout-button");

                    profileButton?.addEventListener("click", (e) => {
                        e.stopPropagation();
                        profileMenu?.classList.toggle("open");
                    });

                    document.addEventListener("click", (event) => {
                        if (!container.contains(event.target)) {
                            profileMenu?.classList.remove("open");
                        }
                    });

                    logoutButton?.addEventListener("click", async () => {
                        await signOut(auth);
                        window.location.href = "/login.html";
                    });
                };

                // Gestion Déconnexion Mobile
                const mobileLogoutBtn = mobileAuthLinksDiv.querySelector("#mobile-logout-button");
                mobileLogoutBtn?.addEventListener("click", async () => {
                    await signOut(auth);
                    window.location.href = "/login.html";
                });

                setupProfileMenu(navAuth);
                attachMobileMenuLinkListeners();
            };

            // Logique du Menu Toggle Mobile
            const openMobileMenu = () => {
                if (typeof gsap === "undefined" || reducedMotion) {
                    mobileMenuOverlay.style.display = "block";
                    mobileMenuOverlay.style.opacity = "1";
                    mobileMenu.style.transform = "translateX(0)";
                } else {
                    gsap.set(mobileMenuOverlay, { display: 'block' });
                    gsap.to(mobileMenuOverlay, { opacity: 1, duration: 0.3 });
                    gsap.to(mobileMenu, { x: "0%", duration: 0.4, ease: "power2.out" });

                    gsap.fromTo(mobileMenu.querySelectorAll('a, .profile-wrap'),
                        { opacity: 0, x: 20 },
                        { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, delay: 0.1 }
                    );
                }
                menuToggle?.classList.add('is-active');
            };

            const closeMobileMenu = () => {
                if (typeof gsap === "undefined" || reducedMotion) {
                    mobileMenuOverlay.style.display = "none";
                    mobileMenu.style.transform = "translateX(100%)";
                } else {
                    gsap.to(mobileMenu, { x: "100%", duration: 0.4, ease: "power2.in" });
                    gsap.to(mobileMenuOverlay, {
                        opacity: 0,
                        duration: 0.3,
                        onComplete: () => gsap.set(mobileMenuOverlay, { display: 'none' })
                    });
                }
                menuToggle?.classList.remove('is-active');
            };

            menuToggle?.addEventListener("click", () => {
                const isOpen = menuToggle.classList.contains('is-active');
                if (isOpen) closeMobileMenu();
                else openMobileMenu();
            });

            mobileMenuOverlay?.addEventListener("click", (e) => {
                if (e.target === mobileMenuOverlay) closeMobileMenu();
            });

            // Écouteur Firebase Auth
            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    renderDisconnected();
                    return;
                }

                let isAdmin = false;
                let customPhotoURL = null;

                try {
                    // Check rôle admin
                    const tokenResult = await getIdTokenResult(user);
                    isAdmin = tokenResult?.claims?.role === "admin" || tokenResult?.claims?.admin === true;

                    // Récupération de la PDP dans Firestore si enregistrée là-bas
                    if (db) {
                        const userDocRef = doc(db, "users", user.uid);
                        const userSnap = await getDoc(userDocRef);
                        if (userSnap.exists()) {
                            customPhotoURL = userSnap.data().photoURL || userSnap.data().avatar || null;
                        }
                    }
                } catch (error) {
                    console.error("Erreur récupération profil navbar:", error);
                }

                renderConnected(user, isAdmin, customPhotoURL);
            });

            animateNavbar();

            const logo = navbarContainer.querySelector(".nav-logo");
            if (logo && typeof gsap !== "undefined" && !reducedMotion) {
                logo.addEventListener("mouseenter", () => {
                    gsap.to(logo, { scale: 1.1, duration: 0.3, ease: "power2.out" });
                });
                logo.addEventListener("mouseleave", () => {
                    gsap.to(logo, { scale: 1, duration: 0.3, ease: "power2.inOut" });
                });
            }
        })
        .catch((error) => console.error("Erreur Navbar:", error));
});