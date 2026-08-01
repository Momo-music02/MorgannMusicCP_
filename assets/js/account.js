import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, serverTimestamp, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { auth, db, storage } from "/assets/js/firebase.js";

const form = document.getElementById("account-form");
const logoutBtn = document.getElementById("logout-btn");
const registerPasskeyBtn = document.getElementById("register-passkey-btn");
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

        const role = (data.role || "user").toLowerCase();
        const safe = roleClassMap[role] ? role : "user";
        roleBadge.textContent = roleLabelMap[safe];
        roleBadge.className = `role-badge ${roleClassMap[safe]}`;

        // Sauvegarde du formulaire
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

        // Enregistrement d'une clé d'accès (Passkey WebAuthn)
        registerPasskeyBtn?.addEventListener("click", async () => {
            if (!window.PublicKeyCredential) {
                setFeedback("Votre navigateur ne supporte pas les clés d'accès (Passkeys).", "error");
                return;
            }

            try {
                setFeedback("Configuration de la clé d'accès...", "info");

                // Génération des options WebAuthn
                const publicKeyCredentialCreationOptions = {
                    challenge: Uint8Array.from("challenge-random-string-placeholder", c => c.charCodeAt(0)),
                    rp: {
                        name: "Morgann Music CP",
                        id: window.location.hostname
                    },
                    user: {
                        id: Uint8Array.from(user.uid, c => c.charCodeAt(0)),
                        name: user.email,
                        displayName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || user.email
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform", // TouchID / FaceID / Windows Hello
                        userVerification: "required"
                    },
                    timeout: 60000
                };

                const credential = await navigator.credentials.create({
                    publicKey: publicKeyCredentialCreationOptions
                });

                if (credential) {
                    // Sauvegarde du Passkey dans la base Firestore de l'utilisateur
                    await updateDoc(userRef, {
                        passkeys: arrayUnion({
                            credentialId: credential.id,
                            createdAt: new Date().toISOString(),
                            device: navigator.userAgentData ? navigator.userAgentData.platform : navigator.platform
                        })
                    });

                    setFeedback("Clé d'accès créée et associée à cet appareil avec succès !", "success");
                }
            } catch (err) {
                console.error("Erreur Passkey :", err);
                setFeedback("Annulé ou non supporté sur cet appareil.", "error");
            }
        });

    } catch (error) {
        setFeedback("Erreur de chargement du compte.", "error");
    }
});

logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "/login.html";
});