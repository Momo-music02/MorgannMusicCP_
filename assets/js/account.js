import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { auth, db, storage } from "/assets/js/firebase.js";

const form = document.getElementById("account-form");
const logoutBtn = document.getElementById("logout-btn");
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

// Affiche le message de succès/erreur sous le bouton de l'onglet actuellement affiché
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

                setTimeout(() => {
                    setFeedback("", "");
                }, 4000);

            } catch (error) {
                console.error("Erreur lors de la sauvegarde :", error);
                setFeedback("Une erreur est survenue lors de l'enregistrement.", "error");
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