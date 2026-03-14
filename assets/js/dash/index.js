
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-functions.js";

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
                    if (window.scrollY > 50) {
                        navbar.classList.add('scrolled');
                    } else {
                        navbar.classList.remove('scrolled');
                        navbar.classList.remove('on-timeline'); // Sécurité : on retire tout en haut
                    }
                });

                ScrollTrigger.create({
                    trigger: ".timeline-section",
                    start: "top 20%",
                    end: "bottom 80%",
                    onEnter: () => document.getElementById('navbar').classList.add('on-timeline'),
                    onLeave: () => document.getElementById('navbar').classList.remove('on-timeline'),
                    onEnterBack: () => document.getElementById('navbar').classList.add('on-timeline'),
                    onLeaveBack: () => document.getElementById('navbar').classList.remove('on-timeline')
                });




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

        setLogoBasedOnScheme();

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

    const btnSubscribeArtistProfile = document.getElementById("btnSubscribeArtistProfile");
    const artistProfileStatus = document.getElementById("artistProfileStatus");

        const ARTIST_PROFILE_PRICE_ID = "price_1TAH3UFhaOYWNNbb25udUEh2";

        async function hasArtistWithSpotifyAndApple() {
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

    const alreadySeen = localStorage.getItem("dev_popup_seen");

    if (alreadySeen === "true") {
        popup.style.display = "none";
        return;
    }

    enter.addEventListener("click", function () {
        localStorage.setItem("dev_popup_seen", "true");
        popup.style.display = "none";
    });

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

/* === Morgann Music AI: UI injection & client -> server proxy === */
(function injectMorgannMusicAI(){
        try {
                const topActions = document.querySelector('.top-actions');
                const sidebarFoot = document.querySelector('.artist-sidebar__foot');
                const sidebarNav = document.querySelector('.artist-sidebar__nav');
                const container = sidebarFoot || sidebarNav || topActions;
                if (!container) return;

                const aiBtn = document.createElement('button');
                aiBtn.className = 'btn secondary';
                aiBtn.id = 'mmcpAiOpenBtn';
                aiBtn.textContent = 'Morgann Music AI';
                aiBtn.style.display = 'block';
                aiBtn.style.width = '100%';
                aiBtn.style.marginBottom = '8px';
                container.insertBefore(aiBtn, container.firstChild);

                const modalHtml = `
                <div id="mmcpAiModal" class="modal" style="display:none;">
                    <div class="modal-box" style="max-width:720px;">
                        <h3>Morgann Music AI</h3>
                        <p class="muted">Génère des descriptions, pitchs ou idées pour tes sorties — powered by Morgann Music AI.</p>
                        <div class="field">
                            <label>Prompt</label>
                            <textarea id="mmcpAiPrompt" class="input" rows="4" placeholder="Ex: Écris un pitch court pour un single pop entraînant..."></textarea>
                        </div>
                        <div class="field" style="display:flex;gap:8px;align-items:center;margin-top:8px;">
                            <button class="btn" id="mmcpAiGenerate">Générer</button>
                            <button class="btn secondary" id="mmcpAiClose">Fermer</button>
                            <span id="mmcpAiStatus" class="muted" style="margin-left:8px;">Prêt</span>
                        </div>
                        <div id="mmcpAiResult" style="margin-top:12px;display:none;white-space:pre-wrap;background:rgba(0,0,0,0.03);padding:12px;border-radius:10px;border:1px solid rgba(0,0,0,0.06);"></div>
                    </div>
                </div>`;

                const wrapper = document.createElement('div');
                wrapper.innerHTML = modalHtml;
                document.body.appendChild(wrapper);

                const modal = document.getElementById('mmcpAiModal');
                const openBtn = document.getElementById('mmcpAiOpenBtn');
                const closeBtn = document.getElementById('mmcpAiClose');
                const genBtn = document.getElementById('mmcpAiGenerate');
                const promptEl = document.getElementById('mmcpAiPrompt');
                const statusEl = document.getElementById('mmcpAiStatus');
                const resultEl = document.getElementById('mmcpAiResult');

                function openModal(){ modal.style.display = 'flex'; }
                function closeModal(){ modal.style.display = 'none'; }

                openBtn?.addEventListener('click', openModal);
                closeBtn?.addEventListener('click', closeModal);
                modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

                async function generatePrompt(){
                        const prompt = (promptEl.value || '').trim();
                        if (!prompt) { alert('Renseigne un prompt.'); return; }
                        genBtn.disabled = true; statusEl.textContent = 'Génération en cours…'; resultEl.style.display = 'none';
                        try {
                                const res = await fetch('/api/genai/generate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ prompt, maxTokens: 256 })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data?.error || JSON.stringify(data));
                                const text = data?.text || JSON.stringify(data?.raw || {});
                                resultEl.textContent = text;
                                resultEl.style.display = 'block';
                                statusEl.textContent = 'Terminé';
                        } catch (err) {
                                console.error('Morgann Music AI error:', err);
                                statusEl.textContent = 'Erreur';
                                alert('Erreur génération IA: ' + (err?.message || err));
                        } finally {
                                genBtn.disabled = false;
                        }
                }

                genBtn?.addEventListener('click', generatePrompt);
        } catch (e) {
                console.warn('Morgann Music AI injection failed', e);
        }
})();

/* === Morgann Music AI Chat === */
(function injectMorgannMusicAIChat(){
    try {
        const topActions = document.querySelector('.top-actions');
        const sidebarFoot = document.querySelector('.artist-sidebar__foot');
        const sidebarNav = document.querySelector('.artist-sidebar__nav');
        const container = sidebarFoot || sidebarNav || topActions;
        if (!container) return;

        const chatBtn = document.createElement('button');
        chatBtn.className = 'btn';
        chatBtn.id = 'mmcpAiChatOpenBtn';
        chatBtn.textContent = 'Chat AI';
        chatBtn.style.display = 'block';
        chatBtn.style.width = '100%';
        chatBtn.style.marginBottom = '8px';
        container.insertBefore(chatBtn, container.firstChild);

        const chatModalHtml = `
        <div id="mmcpAiChatModal" class="modal" style="display:none;">
          <div class="modal-box" style="max-width:720px;">
            <h3>Morgann Music AI — Chat</h3>
            <p class="muted">Discute avec Morgann Music AI pour obtenir conseils, idées de musique, paroles et style.</p>
            <div id="mmcpAiChatWindow" style="height:360px;overflow:auto;border:1px solid rgba(0,0,0,0.06);padding:12px;border-radius:10px;background:rgba(0,0,0,0.02);margin-top:8px;">
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;align-items:center;">
              <input id="mmcpAiChatInput" class="input" placeholder="Pose une question à Morgann Music AI..." style="flex:1;" />
              <button class="btn" id="mmcpAiChatSend">Envoyer</button>
              <button class="btn secondary" id="mmcpAiChatClose">Fermer</button>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
              <button class="btn secondary" data-preset="Donne-moi des idées de style pour un single pop énergique">Idées</button>
              <button class="btn secondary" data-preset="Donne-moi des conseils pour l'arrangement et la production">Conseils</button>
              <button class="btn secondary" data-preset="Écris 4 lignes de paroles poétiques pour le refrain">Paroles</button>
            </div>
          </div>
        </div>`;

        const wrap = document.createElement('div');
        wrap.innerHTML = chatModalHtml;
        document.body.appendChild(wrap);

        const modal = document.getElementById('mmcpAiChatModal');
        const openBtn = document.getElementById('mmcpAiChatOpenBtn');
        const closeBtn = document.getElementById('mmcpAiChatClose');
        const sendBtn = document.getElementById('mmcpAiChatSend');
        const inputEl = document.getElementById('mmcpAiChatInput');
        const windowEl = document.getElementById('mmcpAiChatWindow');

        function openModal(){ modal.style.display = 'flex'; inputEl.focus(); }
        function closeModal(){ modal.style.display = 'none'; }

        openBtn?.addEventListener('click', openModal);
        closeBtn?.addEventListener('click', closeModal);
        modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        const STORAGE_KEY = 'mmcp_morgann_ai_chat_history_v1';
        let convo = [];

        function renderMessage(who, text){
            const el = document.createElement('div');
            el.style.marginBottom = '10px';
            el.innerHTML = `<div style="font-size:12px;font-weight:800;margin-bottom:4px;">${who}</div><div style="white-space:pre-wrap;">${text}</div>`;
            windowEl.appendChild(el);
            windowEl.scrollTop = windowEl.scrollHeight;
        }

        function saveConvo(){
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convo)); } catch {}
        }

        function loadConvo(){
            try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) convo = JSON.parse(raw); } catch { convo = []; }
            windowEl.innerHTML = '';
            convo.forEach(m => renderMessage(m.role === 'user' ? 'Toi' : 'Morgann Music AI', m.content));
        }

        async function sendUserMessage(text){
            if (!text) return;
            convo.push({ role: 'user', content: text });
            saveConvo();
            renderMessage('Toi', text);
            inputEl.value = '';
            renderMessage('Morgann Music AI', '…');
            try {
                const promptHeader = `Tu es Morgann Music AI, un assistant francophone expert en musique. Donne des conseils constructifs, idées, paroles et suggestions adaptées aux besoins d'un artiste. Réponds en français.`;
                const history = convo.slice(-12).map(m => (m.role === 'user' ? `Utilisateur: ${m.content}` : `IA: ${m.content}`)).join('\n');
                const finalPrompt = `${promptHeader}\n\nConversation:\n${history}\nIA:`;

                const res = await fetch('/api/genai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: finalPrompt, maxTokens: 400 })
                });
                const data = await res.json();
                if (windowEl.lastChild) windowEl.lastChild.remove();
                if (!res.ok) throw new Error(data?.error || JSON.stringify(data));
                const text = data?.text || (data?.rawText || JSON.stringify(data?.rawJson || {}));
                convo.push({ role: 'assistant', content: String(text || '').trim() });
                saveConvo();
                renderMessage('Morgann Music AI', String(text || '').trim());
            } catch (err) {
                if (windowEl.lastChild) windowEl.lastChild.remove();
                renderMessage('Morgann Music AI', 'Erreur lors de la génération: ' + (err?.message || err));
            }
        }

        sendBtn?.addEventListener('click', () => {
            const text = (inputEl.value || '').trim();
            sendUserMessage(text);
        });

        inputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });

        document.querySelectorAll('#mmcpAiChatModal button[data-preset]').forEach(b => {
            b.addEventListener('click', () => {
                const p = b.getAttribute('data-preset');
                inputEl.value = p || '';
                inputEl.focus();
            });
        });

        loadConvo();

    } catch (e) { console.warn('Morgann Music AI Chat injection failed', e); }
})();
