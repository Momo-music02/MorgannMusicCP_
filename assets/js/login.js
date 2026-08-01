import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "/assets/js/firebase.js";

const form = document.getElementById("login-form");
const feedback = document.getElementById("feedback");
const googleBtn = document.getElementById("google-login-btn");
const passkeyBtn = document.getElementById("passkey-login-btn");

// Redirection si déjà connecté
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "/account.html";
    }
});

// Connexion classique e-mail / mot de passe
form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.textContent = "";
    feedback.className = "feedback";

    const email = form.email.value.trim();
    const password = form.password.value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        feedback.textContent = "Connexion réussie. Redirection...";
        feedback.classList.add("success");
        window.location.href = "/account.html";
    } catch (error) {
        feedback.textContent = "Email ou mot de passe invalide.";
        feedback.classList.add("error");
    }
});

// Connexion via Google
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
        feedback.textContent = "Échec de la connexion via Google.";
        feedback.classList.add("error");
    }
});

// Connexion via Passkey (Clé d'accès)
passkeyBtn?.addEventListener("click", async () => {
    feedback.textContent = "";
    feedback.className = "feedback";

    if (!window.PublicKeyCredential) {
        feedback.textContent = "Les clés d'accès ne sont pas supportées par ce navigateur.";
        feedback.classList.add("error");
        return;
    }

    try {
        feedback.textContent = "Vérification de la clé d'accès...";
        // Intégration / appel à ton backend ou service WebAuthn/Passkey ici
    } catch (error) {
        feedback.textContent = "Échec de l'authentification par clé d'accès.";
        feedback.classList.add("error");
    }
});