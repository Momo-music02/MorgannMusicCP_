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

// Connexion par Clé d'accès (Passkey WebAuthn) - Remplissage automatique de l'email
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

        const publicKeyCredentialRequestOptions = {
            challenge: Uint8Array.from("challenge-random-string-placeholder", c => c.charCodeAt(0)),
            timeout: 60000,
            rpId: window.location.hostname,
            userVerification: "required"
        };

        const assertion = await navigator.credentials.get({
            publicKey: publicKeyCredentialRequestOptions
        });

        if (assertion) {
            const credentialId = assertion.id;

            // Recherche du compte utilisateur lié à cette clé dans Firestore
            const usersRef = collection(db, "users");
            const querySnapshot = await getDocs(usersRef);

            let matchedUserEmail = null;
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.passkeys && Array.isArray(data.passkeys)) {
                    const found = data.passkeys.find(p => p.credentialId === credentialId);
                    if (found && data.email) {
                        matchedUserEmail = data.email;
                    }
                }
            });

            if (matchedUserEmail) {
                const emailInput = document.getElementById("email");
                if (emailInput) {
                    emailInput.value = matchedUserEmail;
                }
                feedback.textContent = "Clé reconnue ! Email rempli avec succès.";
                feedback.classList.add("success");
            } else {
                throw new Error("Aucun compte associé à cette clé d'accès sur cet appareil.");
            }
        }
    } catch (error) {
        console.error("Erreur Passkey:", error);
        feedback.textContent = "Échec de la reconnaissance ou annulé.";
        feedback.classList.add("error");
    }
});