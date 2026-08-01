import {
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "/assets/js/firebase.js";

const form = document.getElementById("signin-form");
const feedback = document.getElementById("feedback");
const steps = Array.from(document.querySelectorAll(".form-step"));
const stepIndicator = document.getElementById("step-indicator");
const prevButton = document.getElementById("prev-step");
const nextButton = document.getElementById("next-step");
const submitButton = document.getElementById("submit-step");
const googleSigninBtn = document.getElementById("google-signin-btn");

const addressInput = document.getElementById("address");
const cityInput = document.getElementById("city");
const postalCodeInput = document.getElementById("postal-code");
const addressSuggestions = document.getElementById("address-suggestions");

const authMethodSelect = document.getElementById("auth-method");
const passwordAuthFields = document.getElementById("password-auth-fields");
const passkeyAuthFields = document.getElementById("passkey-auth-fields");
const totpAuthFields = document.getElementById("totp-auth-fields");

let currentStep = 0;
let addressFeatures = [];
let addressSearchTimer = null;
let addressAbortController = null;
const addressCache = new Map();
let isCreatingAccount = false;
let googleUserCredential = null; // Stocke la session Google si l'utilisateur choisit Google

const roleCodeMap = {
    "1301": "admin",
    "0120": "testeur",
    "6421": "vip",
    "1758": "artiste"
};

const setFeedback = (message = "", type = "") => {
    feedback.textContent = message;
    feedback.className = "feedback";
    if (type) feedback.classList.add(type);
};

const updateStepUI = () => {
    steps.forEach((step, index) => {
        step.classList.toggle("is-hidden", index !== currentStep);
    });

    stepIndicator.textContent = `Étape ${currentStep + 1} sur ${steps.length}`;
    prevButton.disabled = currentStep === 0;

    const lastStep = currentStep === steps.length - 1;
    nextButton.classList.toggle("is-hidden", lastStep);
    submitButton.classList.toggle("is-hidden", !lastStep);

    if (typeof gsap !== "undefined") {
        gsap.fromTo(steps[currentStep], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
    }
};

// Gestion de l'affichage dynamique de la méthode de sécurité choisie (Étape 3)
authMethodSelect?.addEventListener("change", (e) => {
    const val = e.target.value;

    passwordAuthFields?.classList.toggle("is-hidden", val !== "password");
    passkeyAuthFields?.classList.toggle("is-hidden", val !== "passkey");
    totpAuthFields?.classList.toggle("is-hidden", val !== "totp");

    const passwordInputs = passwordAuthFields?.querySelectorAll("input");
    passwordInputs?.forEach(input => {
        if (val === "password") {
            input.setAttribute("required", "required");
        } else {
            input.removeAttribute("required");
        }
    });
});

const validateCurrentStep = () => {
    const activeStep = steps[currentStep];
    const inputs = Array.from(activeStep.querySelectorAll("input[required]"));
    for (const input of inputs) {
        if (!input.checkValidity()) {
            input.reportValidity();
            return false;
        }
    }
    return true;
};

// Autocomplétion Adresse
const clearAddressSuggestions = () => {
    if (!addressSuggestions) return;
    addressSuggestions.innerHTML = "";
    addressSuggestions.classList.add("is-hidden");
};

const getStreetOnly = (props) => {
    if (!props) return "";
    if (props.name) return props.name;
    if (props.label) return props.label.split(",")[0].trim();
    return "";
};

const selectAddressFeature = (feature) => {
    const props = feature?.properties || {};
    const street = getStreetOnly(props);
    if (addressInput && street) addressInput.value = street;
    if (cityInput && props.city) cityInput.value = props.city;
    if (postalCodeInput && props.postcode) postalCodeInput.value = props.postcode;
    clearAddressSuggestions();
};

const renderAddressSuggestions = (features) => {
    if (!addressSuggestions) return;
    addressSuggestions.innerHTML = "";

    const limited = features.slice(0, 6);
    if (limited.length === 0) {
        addressSuggestions.classList.add("is-hidden");
        return;
    }

    limited.forEach((feature, index) => {
        const props = feature.properties || {};
        const item = document.createElement("li");
        item.className = "address-item";
        item.setAttribute("role", "option");
        item.dataset.index = String(index);
        const street = getStreetOnly(props);
        const cityLine = [props.postcode, props.city].filter(Boolean).join(" ");
        item.textContent = cityLine ? `${street} — ${cityLine}` : (street || props.label || "Adresse");
        item.addEventListener("mousedown", (event) => {
            event.preventDefault();
            selectAddressFeature(feature);
        });
        addressSuggestions.appendChild(item);
    });

    addressSuggestions.classList.remove("is-hidden");
};

const fetchAddressSuggestions = async (query) => {
    if (currentStep !== 1) return;

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || normalizedQuery.length < 3) {
        addressFeatures = [];
        clearAddressSuggestions();
        return;
    }

    if (addressCache.has(normalizedQuery)) {
        addressFeatures = addressCache.get(normalizedQuery);
        renderAddressSuggestions(addressFeatures);
        return;
    }

    if (addressAbortController) {
        addressAbortController.abort();
    }
    addressAbortController = new AbortController();

    try {
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(normalizedQuery)}&limit=6`;
        const response = await fetch(url, { signal: addressAbortController.signal });
        if (!response.ok) return;

        const data = await response.json();
        addressFeatures = Array.isArray(data.features) ? data.features : [];
        addressCache.set(normalizedQuery, addressFeatures);
        renderAddressSuggestions(addressFeatures);
    } catch (error) {
        if (error.name === "AbortError") return;
        addressFeatures = [];
        clearAddressSuggestions();
    }
};

addressInput?.addEventListener("input", () => {
    const value = addressInput.value.trim();
    clearTimeout(addressSearchTimer);
    addressSearchTimer = setTimeout(() => {
        fetchAddressSuggestions(value);
    }, 300);
});

addressInput?.addEventListener("blur", () => {
    setTimeout(() => clearAddressSuggestions(), 120);
});

addressInput?.addEventListener("focus", () => {
    if (addressFeatures.length > 0 && addressInput.value.trim().length >= 3) {
        renderAddressSuggestions(addressFeatures);
    }
});

// Authentification via Google lors de la création de compte
googleSigninBtn?.addEventListener("click", async () => {
    setFeedback();
    const provider = new GoogleAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        googleUserCredential = result.user;

        // Extraction du nom / prénom / email depuis Google
        const displayName = googleUserCredential.displayName || "";
        const parts = displayName.split(" ");
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";

        form.first_name.value = firstName;
        form.last_name.value = lastName;
        form.email.value = googleUserCredential.email || "";

        setFeedback("Informations Google récupérées ! Complète maintenant ton profil.", "success");

        // Bascule directe à l'Étape 2 (informations d'artiste et adresse)
        currentStep = 1;
        updateStepUI();
    } catch (error) {
        setFeedback("Impossible d'associer le compte Google.", "error");
    }
});

onAuthStateChanged(auth, (user) => {
    if (user && !isCreatingAccount && !googleUserCredential) {
        window.location.href = "/account.html";
    }
});

nextButton?.addEventListener("click", () => {
    setFeedback();
    if (!validateCurrentStep()) return;
    if (currentStep < steps.length - 1) {
        currentStep += 1;
        updateStepUI();
    }
});

prevButton?.addEventListener("click", () => {
    setFeedback();
    if (currentStep > 0) {
        currentStep -= 1;
        updateStepUI();
    }
});

form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback();

    if (!validateCurrentStep()) return;

    const authMethod = authMethodSelect?.value || "password";
    const email = form.email.value.trim();
    const roleCode = form.role_code.value.trim();
    const role = roleCodeMap[roleCode] || "user";

    let user = googleUserCredential;

    const originalSubmitText = submitButton.textContent;
    isCreatingAccount = true;
    submitButton.disabled = true;
    submitButton.textContent = "Création...";

    try {
        // Création de la session auth si non passé par Google
        if (!user) {
            if (authMethod === "password") {
                const password = form.password.value;
                const passwordConfirm = form.password_confirm.value;

                if (password !== passwordConfirm) {
                    throw new Error("Les mots de passe ne correspondent pas.");
                }
                if (password.length < 6) {
                    throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
                }

                const credential = await createUserWithEmailAndPassword(auth, email, password);
                user = credential.user;
            } else {
                // Traitement Passkey ou TOTP si création sans mot de passe
                // (Si tu utilises un provider custom ou gères la session autrement)
            }
        }

        // Sauvegarde du profil dans Firestore
        await setDoc(doc(db, "users", user.uid), {
            firstName: form.first_name.value.trim(),
            lastName: form.last_name.value.trim(),
            fullName: `${form.first_name.value.trim()} ${form.last_name.value.trim()}`.trim(),
            artistName: form.artist_name.value.trim(),
            email,
            address: form.address.value.trim(),
            city: form.city.value.trim(),
            postalCode: form.postal_code.value.trim(),
            iban: form.iban.value.trim() || null,
            role,
            authMethod,
            createdAt: serverTimestamp()
        });

        setFeedback("Compte créé avec succès. Redirection...", "success");
        window.location.href = "/account.html";
    } catch (error) {
        setFeedback(`Impossible de créer le compte. ${error?.message || error?.code || "Vérifie les informations."}`, "error");
        isCreatingAccount = false;
        submitButton.disabled = false;
        submitButton.textContent = originalSubmitText;
    }
});

updateStepUI();