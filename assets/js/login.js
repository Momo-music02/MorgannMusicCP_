import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "/assets/js/firebase.js";
import { api } from "/assets/js/api.js";

const form = document.getElementById("login-form");
const feedback = document.getElementById("feedback");
const googleBtn = document.getElementById("google-login-btn");
const credentialsGroup = document.getElementById("credentials-group");
const totpGroup = document.getElementById("totp-group");
const totpInput = document.getElementById("totp-code");
const submitBtn = document.getElementById("submit-btn");

let awaitingTotp = false;
let cachedEmail = "";
let cachedPassword = "";

onAuthStateChanged(auth, (user) => {
    if (user && !awaitingTotp) {
        window.location.href = "/account.html";
    }
});

form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.textContent = "";
    feedback.className = "feedback";

    const email = form.email.value.trim();
    const password = form.password.value;
    const totpCode = totpInput?.value.trim();

    try {
        if (!awaitingTotp) {
            if (!email || !password) {
                throw new Error("Veuillez remplir tous les champs.");
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Récupération des infos utilisateur via l'API Worker D1
            let isTotpEnabled = false;
            try {
                const userData = await api.get(`/api/users/${user.uid}`);
                if (userData && (userData.authMethod === "totp" || userData.totpEnabled === true)) {
                    isTotpEnabled = true;
                }
            } catch (err) {
                console.error("Erreur récupération utilisateur D1:", err);
            }

            if (isTotpEnabled) {
                awaitingTotp = true;
                cachedEmail = email;
                cachedPassword = password;

                credentialsGroup.classList.add("is-hidden");
                totpGroup.classList.remove("is-hidden");
                totpInput.setAttribute("required", "required");
                submitBtn.textContent = "Vérifier le code";

                feedback.textContent = "Entrez le code de votre application d'authentification.";
                feedback.classList.add("success");
                return;
            }

            feedback.textContent = "Connexion réussie. Redirection...";
            feedback.classList.add("success");
            window.location.href = "/account.html";

        } else {
            if (!totpCode || totpCode.length !== 6) {
                throw new Error("Veuillez entrer un code à 6 chiffres valide.");
            }

            feedback.textContent = "Connexion réussie. Redirection...";
            feedback.classList.add("success");
            window.location.href = "/account.html";
        }

    } catch (error) {
        feedback.textContent = error.message || "Email, mot de passe ou code invalide.";
        feedback.classList.add("error");
    }
});

googleBtn?.addEventListener("click", async () => {
    feedback.textContent = "";
    feedback.className = "feedback";
    const provider = new GoogleAuthProvider();

    try {
        await signInWithPopup(auth, provider);
        feedback.textContent = "Connexion Google réussie. Redirection...";
        feedback.classList.add("success");
        window.location.href = "/account.html";
    } catch (error) {
        feedback.textContent = "Échec de la connexion Google.";
        feedback.classList.add("error");
    }
});