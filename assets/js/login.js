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

onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "/account.html";
    }
});

// Connexion classique
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

// Connexion Google
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

// Bouton Passkey
passkeyBtn?.addEventListener("click", () => {
    feedback.textContent = "L'authentification par clé d'accès sera bientôt disponible.";
    feedback.className = "feedback error";
});