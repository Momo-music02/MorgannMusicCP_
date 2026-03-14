
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-functions.js";

// Configuration Firebase (doit correspondre à celle de dash/index.html)
const firebaseConfig = {
    apiKey: "AIzaSyDSPUArpApBuK0Cn9VbeMtqk4JC-gqruJc",
    authDomain: "morgann-music-cp.firebaseapp.com",
    projectId: "morgann-music-cp",
    storageBucket: "morgann-music-cp.appspot.com",
    messagingSenderId: "666812685196",
    appId: "1:666812685196:web:fe3df6749ae768d68494a9"
};

let app, auth, db;
try {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Erreur d'initialisation Firebase:", e);
    alert("Erreur de connexion à la base de données. Veuillez réessayer plus tard.");
}


                // 2. Pochettes
                gsap.to(".cover", {
                    opacity: 1,
                    y: 0,
                    duration: 1.5,
                    stagger: 0.2,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: ".grid-covers",
                        start: "top 80%",
                        end: "bottom 50%",
                        scrub: 1
                    }
                });

    window.addEventListener('scroll', () => {
                    const navbar = document.getElementById('navbar');
                    // État 1 : Gestion du scroll de base (Ajout/Retrait de .scrolled)
                    if (window.scrollY > 50) {
                        navbar.classList.add('scrolled');
                    } else {
                        navbar.classList.remove('scrolled');
                        navbar.classList.remove('on-timeline'); // Sécurité : on retire tout en haut
                    }
                });

                // État 2 : Gestion précise de la zone Timeline avec GSAP
                ScrollTrigger.create({
                    trigger: ".timeline-section",
                    start: "top 20%",
                    end: "bottom 80%",
                    onEnter: () => document.getElementById('navbar').classList.add('on-timeline'),
                    onLeave: () => document.getElementById('navbar').classList.remove('on-timeline'),
                    onEnterBack: () => document.getElementById('navbar').classList.add('on-timeline'),
                    onLeaveBack: () => document.getElementById('navbar').classList.remove('on-timeline')
                });




                // 3. Animation Parcours
                document.querySelectorAll(".timeline-item").forEach(item => {
                    const side = item.getAttribute("data-side");
                    gsap.to(item, {
                        opacity: 1,
                        x: 0,
                        duration: 1,
                        startAt: {
                            x: side === "left" ? -100 : 100
                        },
                        scrollTrigger: {
                            trigger: item,
                            start: "top 80%",
                            toggleActions: "play none none reverse"
                        }
                    });
                });

                
                window.addEventListener('scroll', () => {
                    const navbar = document.getElementById('navbar');
                    window.scrollY > 50 ? navbar.classList.add('scrolled') : navbar.classList.remove('scrolled');
                });
        


 




    const image = document.getElementById('plateformes');

    const imageClair = "/assets/img/5.png";
    const imageSombre = "/assets/img/pls.png";

    function setImageBasedOnScheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            image.src = imageSombre;
        } else {
            image.src = imageClair;
        }
    }

    setImageBasedOnScheme();

    window.matchMedia('(prefers-color-scheme: dark)').addListener(setImageBasedOnScheme);



         const logo = document.getElementById("logo-dynamique");

        const logoClair = "/assets/img/logo.svg";
        const logoSombre = "/assets/img/logo2.png";

        function setLogoBasedOnScheme() {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                logo.src = logoSombre;
            } else {
                logo.src = logoClair;
            }
        }

        // au chargement
        setLogoBasedOnScheme();

        // au changement de thème système
        window
            .matchMedia('(prefers-color-scheme: dark)')
            .addEventListener("change", setLogoBasedOnScheme);
    const modal = document.getElementById("pochetteModal");
                const closeModal = document.querySelector(".close-modal");
                document.querySelectorAll(".cover").forEach(cover => {
                    cover.addEventListener("click", () => {
                        document.getElementById("m-title").innerText = cover.getAttribute("data-title");
                        document.getElementById("m-artist").innerText = cover.getAttribute("data-artist");
                        const tracks = cover.getAttribute("data-tracks").split(",");
                        const container = document.getElementById("modal-media-container");
                        container.innerHTML = cover.getAttribute("data-type") === "video" ?
                            `<video autoplay loop muted playsinline><source src="${cover.getAttribute("data-src")}" type="video/mp4"></video>` :
                            `<img src="${cover.getAttribute("data-src")}">`;

                        const tracklist = document.getElementById("m-tracks");
                        tracklist.innerHTML = "";
                        tracks.forEach((t, i) => tracklist.innerHTML += `<div class="track-item">${i + 1}. ${t}</div>`);

                        modal.style.display = "flex";
                        gsap.fromTo(".modal-content", {
                            scale: 0.8,
                            opacity: 0
                        }, {
                            scale: 1,
                            opacity: 1,
                            duration: 0.4
                        });
                    });
                });

                closeModal.onclick = () => {
                    gsap.to(".modal-content", {
                        scale: 0.8,
                        opacity: 0,
                        duration: 0.3,
                        onComplete: () => modal.style.display = "none"
                    });
                };
                window.onclick = (e) => {
                    if (e.target == modal) closeModal.onclick();
                };

                const authLinks = document.getElementById("auth-links");
const userLinks = document.getElementById("user-links");

if (localStorage.getItem("userConnected") === "true") {
  authLinks.style.display = "none";
  userLinks.style.display = "block";
} else {
  authLinks.style.display = "block";
  userLinks.style.display = "none";
}

function logout() {
  localStorage.removeItem("userConnected");
  location.reload();
}


document.addEventListener("DOMContentLoaded", function () {

    // Gestion abonnement profil artiste (1€/mois)
    const btnSubscribeArtistProfile = document.getElementById("btnSubscribeArtistProfile");
    const artistProfileStatus = document.getElementById("artistProfileStatus");
    // Remplacer par l'ID Stripe réel plus tard
    const ARTIST_PROFILE_PRICE_ID = "A_REMPLACER_PAR_TON_ID_STRIPE";

        // Gestion protection profil artiste (1€/mois)
        const ARTIST_PROFILE_PRICE_ID = "price_1TAH3UFhaOYWNNbb25udUEh2";

        async function hasArtistWithSpotifyAndApple() {
            // On suppose que la liste des artistes est déjà chargée dans artistsList
            // ou on la recharge ici si besoin (Firebase)
            try {
                const user = currentUser;
                if (!user) return false;
                const q = query(collection(db, "artists"), where("ownerUid", "==", user.uid), where("deleted", "!=", true));
                const snap = await getDocs(q);
                return snap.docs.some(doc => {
                    const a = doc.data();
                    return a.spotify?.hasProfile && a.spotify?.uriOrUrl && a.appleMusic?.hasProfile && a.appleMusic?.url;
                });
            } catch {
                return false;
            }
        }

        if (btnSubscribeArtistProfile) {
            btnSubscribeArtistProfile.addEventListener("click", async function () {
                btnSubscribeArtistProfile.disabled = true;
                btnSubscribeArtistProfile.textContent = "Chargement...";
                artistProfileStatus.textContent = "Vérification de tes profils artistes...";
                if (!(await hasArtistWithSpotifyAndApple())) {
                    artistProfileStatus.textContent = "Tu dois d'abord renseigner un profil Spotify ET Apple Music dans un de tes artistes.";
                    btnSubscribeArtistProfile.disabled = false;
                    btnSubscribeArtistProfile.textContent = "Protéger mon profil";
                    return;
                }
                artistProfileStatus.textContent = "Redirection vers le paiement sécurisé...";
                let loadingTimeout = setTimeout(() => {
                    artistProfileStatus.textContent = "La redirection prend plus de temps que prévu... Veuillez patienter ou réessayer.";
                }, 10000);
                try {
                    const functions = getFunctions();
                    const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
                    const successUrl = `${window.location.origin}/dash/?checkout=success`;
                    const cancelUrl = `${window.location.origin}/dash/?checkout=cancel`;
                    const result = await createCheckoutSession({
                        items: [{ prodId: ARTIST_PROFILE_PRICE_ID, quantity: 1 }],
                        successUrl,
                        cancelUrl
                    });
                    const url = result?.data?.url;
                    if (url) {
                        clearTimeout(loadingTimeout);
                        artistProfileStatus.textContent = "Redirection en cours...";
                        window.location.href = url;
                    } else {
                        throw new Error("Impossible d'obtenir le lien de paiement.");
                    }
                } catch (e) {
                    clearTimeout(loadingTimeout);
                    artistProfileStatus.textContent = "Erreur : " + (e?.message || e);
                    btnSubscribeArtistProfile.disabled = false;
                    btnSubscribeArtistProfile.textContent = "Protéger mon profil";
                }
            });
        }

    const popup = document.getElementById("dev-popup");
    const enter = document.getElementById("enter-site");
    const quit = document.getElementById("quit-site");

    // Vérifie si le message a déjà été accepté
    const alreadySeen = localStorage.getItem("dev_popup_seen");

    if (alreadySeen === "true") {
        popup.style.display = "none";
        return;
    }

    // Accéder au site
    enter.addEventListener("click", function () {
        localStorage.setItem("dev_popup_seen", "true");
        popup.style.display = "none";
    });

    // Quitter
    quit.addEventListener("click", function () {
        document.body.innerHTML = `
            <div style="
                height:100vh;
                display:flex;
                justify-content:center;
                align-items:center;
                background:#0e0e0e;
                color:white;
                font-family:sans-serif;
                text-align:center;
            ">
                <div>
                    <h1>👋 Merci de votre visite</h1>
                    <p>Vous pouvez fermer cet onglet.</p>
                </div>
            </div>
        `;
    });

});
