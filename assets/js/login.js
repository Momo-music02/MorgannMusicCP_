import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithCredential,
    OAuthCredential
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "/assets/js/firebase.js";

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

// Connexion par Clé d'accès (Passkey WebAuthn) via ton Cloudflare Worker
passkeyBtn?.addEventListener("click", async () => {
    feedback.textContent = "";
    feedback.className = "feedback";

    if (!window.PublicKeyCredential) {
        feedback.textContent = "Votre navigateur ne supporte pas les clés d'accès.";
        feedback.classList.add("error");
        return;
    }

    try {
        feedback.textContent = "Validation biométrique en cours...";
        feedback.classList.add("info");

        // Requête WebAuthn du navigateur (Touch ID / Face ID / Clé physique)
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: Uint8Array.from("challenge-random-string-placeholder", c => c.charCodeAt(0)),
                timeout: 60000,
                rpId: window.location.hostname,
                userVerification: "required"
            }
        });

        if (assertion) {
            // Appel vers ton Worker Cloudflare
            const response = await fetch("https://api.login.mm-cp.uk/api/passkey/verify-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credentialId: assertion.id })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Échec de la validation par le serveur.");
            }

            feedback.textContent = "Clé validée ! Redirection...";
            feedback.classList.add("success");

            // Redirection vers le compte une fois validé
            setTimeout(() => {
                window.location.href = "/account.html";
            }, 800);
        }
    } catch (error) {
        console.error("Erreur Passkey Login:", error);
        feedback.textContent = "Échec de la connexion par clé d'accès ou annulé.";
        feedback.classList.add("error");
    }
});