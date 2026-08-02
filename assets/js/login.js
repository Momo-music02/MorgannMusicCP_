import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "/assets/js/firebase.js";

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
            // Étape 1 : Vérification des identifiants de base
            if (!email || !password) {
                throw new Error("Veuillez remplir tous les champs.");
            }

            // On vérifie d'abord dans Firestore si l'utilisateur a activé le mode TOTP
            // (Recherche par email ou par UID si on récupère l'utilisateur après un premier auth)
            // Ici, on authentifie d'abord l'utilisateur auprès de Firebase Auth pour obtenir son UID en sécurité
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Récupération du document utilisateur dans Firestore
            const userDocRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDocRef);

            let isTotpEnabled = false;
            if (userSnap.exists()) {
                const userData = userSnap.data();
                // On vérifie si la méthode d'authentification ou le flag 2FA est défini sur "totp"
                if (userData.authMethod === "totp" || userData.totpEnabled === true) {
                    isTotpEnabled = true;
                }
            }

            if (isTotpEnabled) {
                // Le 2FA est actif : on bascule en mode attente de code sans rediriger
                awaitingTotp = true;
                cachedEmail = email;
                cachedPassword = password;

                // Masquer les identifiants et afficher le champ du code
                credentialsGroup.classList.add("is-hidden");
                totpGroup.classList.remove("is-hidden");
                totpInput.setAttribute("required", "required");
                submitBtn.textContent = "Vérifier le code";

                feedback.textContent = "Entrez le code de votre application d'authentification.";
                feedback.classList.add("success");
                return;
            }

            // Si pas de 2FA, connexion immédiate
            feedback.textContent = "Connexion réussie. Redirection...";
            feedback.classList.add("success");
            window.location.href = "/account.html";

        } else {
            // Étape 2 : L'utilisateur a saisi son code TOTP
            if (!totpCode || totpCode.length !== 6) {
                throw new Error("Veuillez entrer un code à 6 chiffres valide.");
            }

            // Validation du code TOTP (via votre Worker ou logique interne)
            // const isValidTotp = ... 
            // Si le code est valide :

            feedback.textContent = "Connexion réussie. Redirection...";
            feedback.classList.add("success");
            window.location.href = "/account.html";
        }

    } catch (error) {
        feedback.textContent = error.message || "Email, mot de passe ou code invalide.";
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