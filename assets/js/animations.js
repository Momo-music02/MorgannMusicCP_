gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
  const mainTitle = document.querySelector(".main-title");
  if (mainTitle) {
    gsap.fromTo(mainTitle, 
      { opacity: 0, y: 30 },
      { 
        opacity: 1, 
        y: 0,
        duration: 0.8,
        ease: "power2.out"
      }
    );
  }

  const subtitle = document.querySelector(".subtitle");
  if (subtitle) {
    gsap.fromTo(subtitle,
      { opacity: 0, y: 20 },
      { 
        opacity: 1, 
        y: 0,
        duration: 0.8,
        delay: 0.2,
        ease: "power2.out"
      }
    );
  }

  const tagline = document.querySelector(".tagline");
  if (tagline) {
    gsap.fromTo(tagline,
      { opacity: 0, y: 15 },
      { 
        opacity: 1, 
        y: 0,
        duration: 0.8,
        delay: 0.3,
        ease: "power2.out"
      }
    );
  }
});

setTimeout(() => {
  const featureCards = document.querySelectorAll(".feature-card");
  featureCards.forEach((card, index) => {
    gsap.fromTo(card,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        delay: index * 0.1,
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
          toggleActions: "play none none none"
        }
      }
    );
  });
}, 500);

setTimeout(() => {
  const platformsImg = document.querySelector(".container-plateformes img");
  if (platformsImg) {
    gsap.fromTo(platformsImg,
      { opacity: 0, scale: 0.9 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        scrollTrigger: {
          trigger: ".platforms-section",
          start: "top 75%",
          toggleActions: "play none none none"
        }
      }
    );
  }
}, 500);

setTimeout(() => {
  document.querySelectorAll(".timeline-item").forEach((item, index) => {
    const side = item.getAttribute("data-side");
    const isLeft = side === "left";

    gsap.fromTo(item,
      { 
        opacity: 0,
        x: isLeft ? -60 : 60
      },
      {
        opacity: 1,
        x: 0,
        duration: 0.6,
        scrollTrigger: {
          trigger: item,
          start: "top 80%",
          toggleActions: "play none none none"
        }
      }
    );
  });
}, 500);

setTimeout(() => {
  const featuresPopup = document.getElementById("features-popup");
  const closePopupBtn = document.querySelector(".close-features-popup");
  const fonctionnalitesSection = document.querySelector(".fonctionnalites");

  if (fonctionnalitesSection) {
    fonctionnalitesSection.classList.add("loaded");
  }

  const clickableCovers = document.querySelectorAll(".cover.clickable");
  if (clickableCovers.length > 0) {
    clickableCovers.forEach(cover => {
      cover.addEventListener("click", (e) => {
        e.stopPropagation();
        const featureNum = cover.getAttribute("data-feature");
        const featureText = cover.getAttribute("data-description");
        
        if (document.getElementById("popup-feature-number")) {
          document.getElementById("popup-feature-number").innerText = `Fonctionnalité ${featureNum}`;
          document.getElementById("popup-feature-text").innerText = featureText;
          
          if (featuresPopup) {
            featuresPopup.classList.add("active");
          }
        }
      });
    });
  }

  if (closePopupBtn) {
    closePopupBtn.addEventListener("click", () => {
      if (featuresPopup) {
        featuresPopup.classList.remove("active");
      }
    });
  }

  window.addEventListener("click", (e) => {
    if (featuresPopup && e.target === featuresPopup) {
      featuresPopup.classList.remove("active");
    }
  });
}, 100);

window.addEventListener("scroll", () => {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;
  
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

const image = document.getElementById("plateformes");
if (image) {
  const imageClair = "/assets/img/5.png";
  const imageSombre = "/assets/img/pls.png";

  function setImageBasedOnScheme() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      image.src = imageSombre;
    } else {
      image.src = imageClair;
    }
  }

  setImageBasedOnScheme();
  window.matchMedia("(prefers-color-scheme: dark)").addListener(setImageBasedOnScheme);
}

document.addEventListener("DOMContentLoaded", function () {
  const popup = document.getElementById("dev-popup");
  const enter = document.getElementById("enter-site");
  const quit = document.getElementById("quit-site");

  const alreadySeen = localStorage.getItem("dev_popup_seen");

  if (alreadySeen === "true") {
    if (popup) popup.style.display = "none";
    return;
  }

  enter?.addEventListener("click", function () {
    localStorage.setItem("dev_popup_seen", "true");
    if (popup) popup.style.display = "none";
  });

  quit?.addEventListener("click", function () {
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
