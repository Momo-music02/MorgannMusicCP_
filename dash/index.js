

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

    const imageClair = "5.png";
    const imageSombre = "pls.png";

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

        const logoClair = "logo.png";
        const logoSombre = "logo2.png";

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
