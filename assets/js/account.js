import { onAuthStateChanged, signOut, GoogleAuthProvider, linkWithPopup } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { auth, db, storage } from "/assets/js/firebase.js";

const form = document.getElementById("account-form");
const logoutBtn = document.getElementById("logout-btn");
const linkGoogleBtn = document.getElementById("link-google-btn");

// Éléments 2FA / TOTP
const enableTotpBtn = document.getElementById("enable-totp-btn");
const disableTotpBtn = document.getElementById("disable-totp-btn");
const verifyTotpBtn = document.getElementById("verify-totp-btn");
const totpQrSection = document.getElementById("totp-qr-section");
const totpSetupActions = document.getElementById("totp-setup-actions");
const totpDisableContainer = document.getElementById("totp-disable-container");
const totpStatusText = document.getElementById("totp-status-text");
const totpSecretText = document.getElementById("totp-secret-text");
const totpCodeInput = document.getElementById("totp-code-input");
const qrcodeContainer = document.getElementById("qrcode");

const roleBadge = document.getElementById("role-badge");
const userUid = document.getElementById("user-uid");
const userArtist = document.getElementById("user-artist");
const userPlan = document.getElementById("user-plan");
const subscriptionStatus = document.getElementById("subscription-status");

const firstNameInput = document.getElementById("first-name");
const lastNameInput = document.getElementById("last-name");
const emailInput = document.getElementById("email");
const addressInput = document.getElementById("address");
const cityInput = document.getElementById("city");
const postalInput = document.getElementById("postal-code");
const ibanInput = document.getElementById("iban");
const avatarInput = document.getElementById("avatar-input");
const avatarPreviewImg = document.getElementById("avatar-preview-img");

const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

const roleLabelMap = { admin: "Admin", testeur: "Testeur", vip: "V.I.P", artiste: "Artiste", user: "User" };
const roleClassMap = { admin: "role-admin", testeur: "role-testeur", vip: "role-vip", artiste: "role-artiste", user: "role-user" };

const setFeedback = (message = "", type = "") => {
    const activePanel = document.querySelector(".tab-panel.is-active");
    if (!activePanel) return;

    const feedbackEl = activePanel.querySelector(".account-feedback");
    if (!feedbackEl) return;

    feedbackEl.textContent = message;
    feedbackEl.className = "account-feedback feedback";
    if (type) feedbackEl.classList.add(type);
};

const selectTab = (tabId) => {
    tabButtons.forEach((button) => {
        const active = button.dataset.tab === tabId;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
    });
    tabPanels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === tabId));
};

tabButtons.forEach((button) => button.addEventListener("click", () => selectTab(button.dataset.tab)));

// Fonction utilitaire pour générer une clé secrète aléatoire de test pour le TOTP
const generateRandomSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < 16; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
};

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    userUid.textContent = user.uid || "Non disponible";
    const userRef = doc(db, "users", user.uid);

    try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;

        let data = userSnap.data();
        firstNameInput.value = data.firstName || "";
        lastNameInput.value = data.lastName || "";
        emailInput.value = data.email || user.email || "";
        addressInput.value = data.address || "";
        cityInput.value = data.city || "";
        postalInput.value = data.postalCode || "";
        ibanInput.value = data.iban || "";

        if (data.photoURL && avatarPreviewImg) {
            avatarPreviewImg.src = data.photoURL;
        }

        userArtist.textContent = data.artistName || "Non renseigné";
        userPlan.textContent = data.planName || "Utilisateur Standard (Gratuit)";
        subscriptionStatus.textContent = data.subscriptionStatus === "active" ? "Actif" : "Aucun abonnement actif";

        // Gestion interface état 2FA (TOTP)
        let tempSecret = "";
        const updateTotpUI = (isConfigured) => {
            if (isConfigured) {
                totpStatusText.textContent = "Actif";
                totpStatusText.style.color = "#2e7d32";
                totpSetupActions.classList.add("is-hidden");
                totpQrSection.classList.add("is-hidden");
                totpDisableContainer.classList.remove("is-hidden");
            } else {
                totpStatusText.textContent = "Inactif";
                totpStatusText.style.color = "#c62828";
                totpSetupActions.classList.remove("is-hidden");
                totpDisableContainer.classList.add("is-hidden");
            }
        };

        updateTotpUI(data.totpEnabled);

        // Action : Cliquer sur "Activer l'authentification" -> Génère un secret et affiche le QR Code
        enableTotpBtn?.addEventListener("click", () => {
            tempSecret = generateRandomSecret();
            totpSecretText.textContent = tempSecret;

            // URL standard pour les applications d'authentification (OTPAuth)
            const issuer = "MorgannMusicCP";
            const accountName = user.email || "user";
            const otpauthUrl = `otpauth://totp/${issuer}:${accountName}?secret=${tempSecret}&issuer=${issuer}`;

            // Vider et générer le QR Code
            qrcodeContainer.innerHTML = "";
            new QRCode(qrcodeContainer, {
                text: otpauthUrl,
                width: 180,
                height: 180
            });

            totpSetupActions.classList.add("is-hidden");
            totpQrSection.classList.remove("is-hidden");
            setFeedback("Scannez le QR code avec votre application.", "info");
        });

        // Action : Valider le code à 6 chiffres pour finaliser l'activation
        verifyTotpBtn?.addEventListener("click", async () => {
            const code = totpCodeInput.value.trim();
            if (code.length !== 6) {
                setFeedback("Veuillez entrer un code valide à 6 chiffres.", "error");
                return;
            }

            try {
                // Simulation de validation (En production, vérifiez le code côté backend/Cloud Functions)
                await updateDoc(userRef, {
                    totpEnabled: true,
                    totpSecret: tempSecret,
                    updatedAt: serverTimestamp()
                });

                data.totpEnabled = true;
                totpCodeInput.value = "";
                updateTotpUI(true);
                setFeedback("Authentification à deux facteurs activée avec succès !", "success");
            } catch (err) {
                console.error("Erreur activation 2FA :", err);
                setFeedback("Erreur lors de l'activation du 2FA.", "error");
            }
        });

        // Action : Désactiver le 2FA
        disableTotpBtn?.addEventListener("click", async () => {
            if (!confirm("Voulez-vous vraiment désactiver l'authentification à deux facteurs ?")) return;

            try {
                await updateDoc(userRef, {
                    totpEnabled: false,
                    totpSecret: null,
                    updatedAt: serverTimestamp()
                });

                data.totpEnabled = false;
                updateTotpUI(false);
                setFeedback("Authentification à deux facteurs désactivée.", "info");
            } catch (err) {
                console.error("Erreur désactivation 2FA :", err);
                setFeedback("Erreur lors de la désactivation.", "error");
            }
        });

        const role = (data.role || "user").toLowerCase();
        const safe = roleClassMap[role] ? role : "user";
        roleBadge.textContent = roleLabelMap[safe];
        roleBadge.className = `role-badge ${roleClassMap[safe]}`;

        // Sauvegarde du formulaire profil
        form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            setFeedback("Enregistrement en cours...", "info");

            const firstName = firstNameInput.value.trim();
            const lastName = lastNameInput.value.trim();
            const email = emailInput.value.trim();

            if (!firstName || !lastName || !email) {
                setFeedback("Prénom, nom et email sont obligatoires.", "error");
                return;
            }

            try {
                let photoURL = data.photoURL || null;

                if (avatarInput && avatarInput.files[0]) {
                    const file = avatarInput.files[0];
                    const storageRef = ref(storage, `avatars/${user.uid}`);
                    await uploadBytes(storageRef, file);
                    photoURL = await getDownloadURL(storageRef);
                }

                await updateDoc(userRef, {
                    firstName,
                    lastName,
                    fullName: `${firstName} ${lastName}`.trim(),
                    email,
                    address: addressInput.value.trim(),
                    city: cityInput.value.trim(),
                    postalCode: postalInput.value.trim(),
                    iban: ibanInput.value.trim() || null,
                    photoURL: photoURL,
                    updatedAt: serverTimestamp()
                });

                data.photoURL = photoURL;
                setFeedback("Modifications enregistrées avec succès !", "success");
                setTimeout(() => setFeedback("", ""), 4000);

            } catch (error) {
                console.error("Erreur lors de la sauvegarde :", error);
                setFeedback("Une erreur est survenue lors de l'enregistrement.", "error");
            }
        });

        // Liaison du compte Google
        linkGoogleBtn?.addEventListener("click", async () => {
            try {
                setFeedback("Association du compte Google en cours...", "info");
                const provider = new GoogleAuthProvider();

                await linkWithPopup(user, provider);

                setFeedback("Compte Google associé avec succès ! Vous pouvez désormais l'utiliser pour vous connecter.", "success");
            } catch (err) {
                console.error("Erreur liaison Google :", err);
                if (err.code === 'auth/credential-already-in-use') {
                    setFeedback("Ce compte Google est déjà lié à un autre utilisateur.", "error");
                } else {
                    setFeedback("Échec de l'association du compte Google ou annulé.", "error");
                }
            }
        });

        // Sélecteurs pour Google
        const googleStatusContainer = document.getElementById("google-status-container");
        const googleAvatar = document.getElementById("google-avatar");
        const googleEmail = document.getElementById("google-email");

        // Fonction pour mettre à jour la UI Google
        const updateGoogleUI = () => {
            // Cherche le provider Google dans les données du user
            const googleData = user.providerData.find(p => p.providerId === "google.com");

            if (googleData) {
                // Cacher le bouton et afficher la carte
                linkGoogleBtn?.classList.add("is-hidden");
                googleStatusContainer?.classList.remove("is-hidden");

                // Remplir la PDP et le mail Google
                if (googleEmail) googleEmail.textContent = googleData.email || user.email;
                if (googleAvatar) googleAvatar.src = googleData.photoURL || "/assets/img/photodeprofil/default-avatar.png";
            } else {
                linkGoogleBtn?.classList.remove("is-hidden");
                googleStatusContainer?.classList.add("is-hidden");
            }
        };

        // Exécuter la fonction au chargement du user
        updateGoogleUI();

    } catch (error) {
        console.error("Erreur de chargement :", error);
        setFeedback("Erreur de chargement du compte.", "error");
    }
});

logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "/login.html";
});