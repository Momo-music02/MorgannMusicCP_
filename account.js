/* =========================
   ACCOUNT.JS (VERSION CLEAN)
   ========================= */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
  getIdTokenResult,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithPopup
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-functions.js";

/* ========= CONFIG ========= */

const STRIPE_PORTAL_URL = "https://billing.stripe.com/p/login/dRmbJ1gpx2cB3uQ9se9EI00"; // <-- tu peux changer après

const firebaseConfig = {
  apiKey: "AIzaSyDSPUArpApBuK0Cn9VbeMtqk4JC-gqruJc",
  authDomain: "morgann-music-cp.firebaseapp.com",
  projectId: "morgann-music-cp",
  storageBucket: "morgann-music-cp.firebasestorage.app",
  messagingSenderId: "666812685196",
  appId: "1:666812685196:web:fe3df6749ae768d68494a9"
};

/* ========= INIT ========= */

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, "europe-west1");
const totpGetStatusCallable = httpsCallable(functions, "totpGetStatus");
const totpBeginEnrollmentCallable = httpsCallable(functions, "totpBeginEnrollment");
const totpConfirmEnrollmentCallable = httpsCallable(functions, "totpConfirmEnrollmentV2");
const totpDisableCallable = httpsCallable(functions, "totpDisableV2");

/* ========= UI ========= */

const $ = (id) => document.getElementById(id);

const avatarImg = $("account-avatar");
const avatarFile = $("avatar-file");

const displayNameInput = $("display-name");
const emailInput = $("email");

const currentPasswordInput = $("current-password");   // pour changement email
const currentPasswordInput2 = $("current-password2"); // pour changement mot de passe

const reauthBoxEmail = $("reauth-password-box");
const reauthBoxPass = $("reauth-password-box2");

const newPass1 = $("new-password");
const newPass2 = $("new-password2");

const btnSaveName = $("btnSaveName");
const btnSaveEmail = $("btnSaveEmail");
const btnSavePassword = $("btnSavePassword");
const payoutIbanInput = $("payout-iban");
const btnSavePayout = $("btnSavePayout");
const totpStatus = $("totp-status");
const btnEnableTotp = $("btnEnableTotp");
const totpSetupBox = $("totp-setup-box");
const totpManualKey = $("totp-manual-key");
const btnCopyTotpKey = $("btnCopyTotpKey");
const totpSetupCode = $("totp-setup-code");
const btnConfirmTotp = $("btnConfirmTotp");
const totpDisableBox = $("totp-disable-box");
const totpDisableCode = $("totp-disable-code");
const btnDisableTotp = $("btnDisableTotp");

const btnChangeAvatar = $("btnChangeAvatar");
const btnRemoveAvatar = $("btnRemoveAvatar");

const btnReauthGoogle = $("btnReauthGoogle");
const btnManageSub = $("btnManageSub");
const btnLogout = $("btnLogout");

const statusLine = $("status-line");
const subPlanEl = $("sub-plan");
const subStatusEl = $("sub-status");
const adminBadgeEl = $("adminBadge");
const vipBadgeEl = $("vipBadge");
const artistBadgeEl = $("artistBadge");
const testBadgeEl = $("testBadge");

/* ========= HELPERS ========= */

function setStatus(msg, ok = true) {
  if (!statusLine) {
    if (!ok) alert(String(msg || "Erreur"));
    return;
  }
  statusLine.textContent = msg;
  statusLine.style.opacity = "0.95";
  statusLine.style.color = ok ? "" : "#dc2626";
}

function isPasswordProvider(user) {
  return user?.providerData?.some(p => p.providerId === "password");
}
function isGoogleProvider(user) {
  return user?.providerData?.some(p => p.providerId === "google.com");
}

function clean(s) {
  return String(s || "").trim();
}

function normalizeIban(value) {
  return clean(value).replace(/\s+/g, "").toUpperCase();
}

function isValidIban(value) {
  const iban = normalizeIban(value);
  return /^[A-Z]{2}[0-9A-Z]{13,32}$/.test(iban);
}

function maskIban(value) {
  const iban = normalizeIban(value);
  if (!iban) return "";
  if (iban.length <= 8) return iban;
  return `${iban.slice(0, 4)}••••••${iban.slice(-4)}`;
}

function isAdminUserData(data){
  if (!data || typeof data !== "object") return false;
  const role = clean(data.role).toLowerCase();
  const userRole = clean(data.userRole).toLowerCase();
  return (
    data.isAdmin === true ||
    data.admin === true ||
    role === "admin" ||
    role === "administrator" ||
    role === "staff" ||
    userRole === "admin"
  );
}

function isVipUserData(data){
  if (!data || typeof data !== "object") return false;
  const role = clean(data.role).toLowerCase();
  const status = clean(data.status).toLowerCase();
  const plan = clean(data.plan).toLowerCase();
  const accountType = clean(data.accountType).toLowerCase();
  const subscription = clean(data.subscription).toLowerCase();
  return (
    data.vip === true ||
    data.isVip === true ||
    role === "vip" ||
    status === "vip" ||
    plan === "vip" ||
    accountType === "vip" ||
    subscription === "vip"
  );
}

function isArtistUserData(data){
  if (!data || typeof data !== "object") return false;
  const role = clean(data.role).toLowerCase();
  const userRole = clean(data.userRole).toLowerCase();
  return ["artist", "artiste", "artiste signé", "artiste signe"].includes(role)
    || ["artist", "artiste", "artiste signé", "artiste signe"].includes(userRole);
}

function isTestUserData(data){
  if (!data || typeof data !== "object") return false;
  const role = clean(data.role).toLowerCase();
  const userRole = clean(data.userRole).toLowerCase();
  return role === "teste" || userRole === "teste";
}

async function getUserProfileData(user){
  if (!user) return null;

  try {
    const byUid = await getDoc(doc(db, "users", user.uid));
    if (byUid.exists()) return byUid.data();
  } catch (e) {
    console.warn("users/{uid} inaccessible:", e);
  }

  const candidateQueries = [];

  if (user.uid) {
    candidateQueries.push(query(collection(db, "users"), where("uid", "==", user.uid), limit(1)));
    candidateQueries.push(query(collection(db, "users"), where("ownerUid", "==", user.uid), limit(1)));
  }

  if (user.email) {
    const email = user.email.trim();
    const emailLower = email.toLowerCase();
    candidateQueries.push(query(collection(db, "users"), where("email", "==", email), limit(1)));
    if (emailLower !== email) {
      candidateQueries.push(query(collection(db, "users"), where("email", "==", emailLower), limit(1)));
    }
  }

  for (const qy of candidateQueries) {
    try {
      const snap = await getDocs(qy);
      if (!snap.empty) return snap.docs[0].data();
    } catch (e) {
      console.warn("users query inaccessible:", e);
    }
  }

  return null;
}

async function resolveCurrentUserDocRef(user) {
  if (!user?.uid) return null;

  try {
    const byUidRef = doc(db, "users", user.uid);
    const byUidSnap = await getDoc(byUidRef);
    if (byUidSnap.exists()) return byUidRef;
  } catch (e) {
    console.warn("users/{uid} inaccessible:", e);
  }

  if (user.email) {
    try {
      const byEmail = await getDocs(query(collection(db, "users"), where("email", "==", user.email), limit(1)));
      if (!byEmail.empty) return byEmail.docs[0].ref;
    } catch (e) {
      console.warn("users by email inaccessible:", e);
    }
  }

  return null;
}

async function ensureRecentLoginForSensitiveAction(user, { password } = {}) {
  if (isPasswordProvider(user)) {
    if (!password) throw new Error("Mot de passe actuel requis.");
    const cred = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, cred);
    return;
  }

  if (isGoogleProvider(user)) {
    const provider = new GoogleAuthProvider();
    await reauthenticateWithPopup(user, provider);
    return;
  }

  throw new Error("Re-validation nécessaire mais provider non géré ici.");
}

function planFromPriceId(priceId) {
  const map = {
    "price_1T03eDFhaOYWNNbbddL6iz7y": "Starter",
    "price_1T03z6FhaOYWNNbbNyjacrEv": "Pro",
    "price_1T042SFhaOYWNNbbs0OXpz8P": "Label",
    "price_1T8fI4FhaOYWNNbbxeAEijSz": "Starter",
    "price_1T8fJnFhaOYWNNbbgunqrDsI": "Pro",
    "price_1T8fLQFhaOYWNNbbdH6Bjcav": "Label"
  };
  return map[priceId] || (priceId ? "Abonné" : "—");
}

function normalizeTotpCode(value) {
  return clean(value).replace(/\s+/g, "").replace(/[^0-9]/g, "").slice(0, 8);
}

async function withTimeout(promise, ms, fallbackMessage = "Délai dépassé") {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(fallbackMessage)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function renderTotpUi(statusData) {
  const enabled = !!statusData?.enabled;
  const pending = !!statusData?.pendingEnrollment;

  if (totpStatus) {
    if (enabled) totpStatus.textContent = "2FA actif ✅ (code demandé à chaque connexion).";
    else if (pending) totpStatus.textContent = "Activation 2FA en attente de confirmation.";
    else totpStatus.textContent = "2FA inactif.";
  }

  if (btnEnableTotp) btnEnableTotp.style.display = enabled ? "none" : "";
  if (totpDisableBox) totpDisableBox.style.display = enabled ? "" : "none";
  if (btnDisableTotp) btnDisableTotp.style.display = enabled ? "" : "none";
}

async function refreshTotpStatus() {
  if (totpStatus) totpStatus.textContent = "Chargement du statut 2FA…";
  try {
    const res = await withTimeout(
      totpGetStatusCallable(),
      8000,
      "Le service 2FA ne répond pas pour le moment."
    );
    renderTotpUi(res?.data || {});
  } catch (e) {
    console.error("totp status error", e);
    renderTotpUi({ enabled: false, pendingEnrollment: false });
    if (totpStatus) totpStatus.textContent = "2FA indisponible temporairement (réessaie dans quelques secondes).";
  }
}

async function loadSubscription(uid) {
  // lit customers/{uid}/subscriptions (Stripe Extension)
  const subsRef = collection(db, "customers", uid, "subscriptions");
  const qy = query(subsRef, orderBy("created", "desc"), limit(20));
  const snap = await getDocs(qy);

  const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!subs.length) return null;

  // ✅ status Stripe = "active", "trialing", etc.
  const active = subs.find(s => ["active", "trialing"].includes(String(s.status || "").toLowerCase()));
  return active || subs[0];
}

function extractPriceId(sub) {
  // selon ce que la Stripe Extension écrit
  return (
    sub?.price?.id ||
    sub?.items?.[0]?.price?.id ||
    sub?.items?.data?.[0]?.price?.id ||
    sub?.items?.data?.[0]?.price ||
    null
  );
}

/* ========= AUTH GUARD + INIT UI ========= */

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    const here = window.location.href;
    window.location.href = "/login.html?redirect=" + encodeURIComponent(here);
    return;
  }

  currentUser = user;

  // Remplit UI
  if (displayNameInput) displayNameInput.value = user.displayName || "";
  if (emailInput) emailInput.value = user.email || "";
  if (avatarImg) avatarImg.src = user.photoURL || "default-avatar.png";

  // Affiche la bonne méthode de re-auth
  const needPasswordBoxes = isPasswordProvider(user);
  if (reauthBoxEmail) reauthBoxEmail.style.display = needPasswordBoxes ? "" : "none";
  if (reauthBoxPass) reauthBoxPass.style.display = needPasswordBoxes ? "" : "none";
  if (btnReauthGoogle) btnReauthGoogle.style.display = (!needPasswordBoxes && isGoogleProvider(user)) ? "" : "none";

  // ✅ Admin/VIP badges (Firestore: users/{uid})
  let hasVipStatus = false;
  try {
    const data = await getUserProfileData(user);
    if (payoutIbanInput) payoutIbanInput.value = clean(data?.payoutIban || "");
    let isAdmin = isAdminUserData(data);
    let isVip = isVipUserData(data);
    let isArtist = isArtistUserData(data);
    let isTest = isTestUserData(data);

    try {
      const token = await getIdTokenResult(user);
      if (token?.claims?.admin === true) isAdmin = true;
      if (token?.claims?.vip === true) isVip = true;
      if (String(token?.claims?.role || "").toLowerCase() === "artist") isArtist = true;
      if (String(token?.claims?.role || "").toLowerCase() === "teste") isTest = true;
    } catch (e) {
      console.warn("claims non accessibles:", e);
    }

    hasVipStatus = isVip;

    if (adminBadgeEl) adminBadgeEl.style.display = isAdmin ? "inline-block" : "none";
    if (vipBadgeEl) vipBadgeEl.style.display = isVip ? "inline-block" : "none";
    if (artistBadgeEl) artistBadgeEl.style.display = isArtist ? "inline-block" : "none";
    if (testBadgeEl) testBadgeEl.style.display = isTest ? "inline-block" : "none";

    if (!data && !isVip && !isAdmin && !isArtist && !isTest) {
      setStatus("Compte chargé ✅ (profil VIP non trouvé côté app)");
    }
  } catch (e) {
    console.error("Erreur lecture role admin:", e);
    if (adminBadgeEl) adminBadgeEl.style.display = "none";
    if (vipBadgeEl) vipBadgeEl.style.display = "none";
    if (artistBadgeEl) artistBadgeEl.style.display = "none";
    if (testBadgeEl) testBadgeEl.style.display = "none";
  }

  // Charge l’abonnement (affichage)
  try {
    const sub = await loadSubscription(user.uid);
    if (!sub) {
      if (subPlanEl) subPlanEl.textContent = "—";
      if (subStatusEl) subStatusEl.textContent = "Aucun";
    } else {
      const status = sub.status || "—";
      const priceId = extractPriceId(sub);
      if (subPlanEl) subPlanEl.textContent = planFromPriceId(priceId);
      if (subStatusEl) subStatusEl.textContent = status;
    }
  } catch (e) {
    console.error("Erreur lecture abonnement:", e);
    if (subPlanEl) subPlanEl.textContent = "—";
    if (subStatusEl) subStatusEl.textContent = "—";
  }

  await refreshTotpStatus();

  setStatus(hasVipStatus ? "Compte chargé ✅ · Statut VIP actif (accès complet)" : "Compte chargé ✅");
});

/* ========= ACTIONS ========= */

// Changer le nom
btnSaveName?.addEventListener("click", async () => {
  if (!currentUser) return;

  const name = clean(displayNameInput?.value);
  try {
    await updateProfile(currentUser, { displayName: name || null });
    setStatus("Nom d’utilisateur mis à jour ✅");
  } catch (e) {
    console.error(e);
    setStatus(e?.message || String(e), false);
  }
});

// Changer email (requiert re-auth)
btnSaveEmail?.addEventListener("click", async () => {
  if (!currentUser) return;

  const newEmail = clean(emailInput?.value);
  if (!newEmail) return setStatus("Entre une adresse email.", false);

  try {
    setStatus("Re-validation…");
    if (isPasswordProvider(currentUser)) {
      await ensureRecentLoginForSensitiveAction(currentUser, { password: currentPasswordInput?.value });
    } else {
      await ensureRecentLoginForSensitiveAction(currentUser);
    }

    await updateEmail(currentUser, newEmail);
    setStatus("Email modifié ✅");
  } catch (e) {
    console.error(e);
    setStatus(e?.message || String(e), false);
  }
});

// Changer mot de passe (requiert re-auth)
btnSavePassword?.addEventListener("click", async () => {
  if (!currentUser) return;

  const p1 = newPass1?.value || "";
  const p2 = newPass2?.value || "";
  if (!p1 || p1.length < 6) return setStatus("Mot de passe trop court (min 6).", false);
  if (p1 !== p2) return setStatus("Les mots de passe ne correspondent pas.", false);

  try {
    setStatus("Re-validation…");
    if (isPasswordProvider(currentUser)) {
      await ensureRecentLoginForSensitiveAction(currentUser, { password: currentPasswordInput2?.value });
    } else {
      await ensureRecentLoginForSensitiveAction(currentUser);
    }

    await updatePassword(currentUser, p1);

    if (newPass1) newPass1.value = "";
    if (newPass2) newPass2.value = "";
    if (currentPasswordInput2) currentPasswordInput2.value = "";

    setStatus("Mot de passe modifié ✅");
  } catch (e) {
    console.error(e);
    setStatus(e?.message || String(e), false);
  }
});

btnSavePayout?.addEventListener("click", async () => {
  if (!currentUser) return;

  const iban = normalizeIban(payoutIbanInput?.value);
  if (!iban) return setStatus("IBAN obligatoire.", false);
  if (!isValidIban(iban)) return setStatus("IBAN invalide.", false);

  try {
    const userRef = await resolveCurrentUserDocRef(currentUser);
    if (!userRef) return setStatus("Profil utilisateur introuvable.", false);

    await updateDoc(userRef, {
      payoutIban: iban,
      payoutIbanMasked: maskIban(iban),
      payoutUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (payoutIbanInput) payoutIbanInput.value = iban;
    setStatus("IBAN enregistré ✅");
  } catch (e) {
    console.error(e);
    setStatus(e?.message || String(e), false);
  }
});

// Reauth Google (si affiché)
btnReauthGoogle?.addEventListener("click", async () => {
  if (!currentUser) return;
  try {
    setStatus("Validation Google…");
    await ensureRecentLoginForSensitiveAction(currentUser);
    setStatus("OK ✅ Tu peux modifier email/mot de passe maintenant.");
  } catch (e) {
    console.error(e);
    setStatus(e?.message || String(e), false);
  }
});

// Avatar: ouvrir file picker
btnChangeAvatar?.addEventListener("click", () => {
  avatarFile?.click();
});

// Upload avatar -> Storage -> photoURL
avatarFile?.addEventListener("change", async () => {
  if (!currentUser) return;

  const file = avatarFile.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) return setStatus("Fichier invalide (image uniquement).", false);
  if (file.size > 5 * 1024 * 1024) return setStatus("Image trop lourde (max 5 Mo).", false);

  try {
    setStatus("Upload de la photo…");

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const avatarRef = ref(storage, `avatars/${currentUser.uid}/avatar.${ext}`);

    await uploadBytes(avatarRef, file, { contentType: file.type });
    const url = await getDownloadURL(avatarRef);

    await updateProfile(currentUser, { photoURL: url });
    if (avatarImg) avatarImg.src = url;

    setStatus("Photo mise à jour ✅");
  } catch (e) {
    console.error(e);
    setStatus(e?.message || String(e), false);
  } finally {
    if (avatarFile) avatarFile.value = "";
  }
});

// Supprimer avatar
btnRemoveAvatar?.addEventListener("click", async () => {
  if (!currentUser) return;

  try {
    setStatus("Suppression de la photo…");

    const candidates = ["jpg", "jpeg", "png", "webp"];
    await Promise.allSettled(
      candidates.map(ext => deleteObject(ref(storage, `avatars/${currentUser.uid}/avatar.${ext}`)))
    );

    await updateProfile(currentUser, { photoURL: null });
    if (avatarImg) avatarImg.src = "default-avatar.png";

    setStatus("Photo supprimée ✅");
  } catch (e) {
    console.error(e);
    setStatus(e?.message || String(e), false);
  }
});

// Gérer abonnement (Stripe portal)
btnManageSub?.addEventListener("click", () => {
  if (!STRIPE_PORTAL_URL || STRIPE_PORTAL_URL.includes("COLLE_TON_LIEN")) {
    setStatus("Colle ton lien Stripe Portal dans STRIPE_PORTAL_URL.", false);
    return;
  }
  window.location.href = STRIPE_PORTAL_URL;
});

// Logout
btnLogout?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } finally {
    window.location.href = "/login.html";
  }
});

btnEnableTotp?.addEventListener("click", async () => {
  try {
    setStatus("Préparation du 2FA…");
    const res = await withTimeout(
      totpBeginEnrollmentCallable(),
      12000,
      "Le service 2FA ne répond pas pour le moment."
    );
    const manualKey = clean(res?.data?.manualKey);

    if (!manualKey) throw new Error("Réponse 2FA invalide.");

    if (totpManualKey) totpManualKey.textContent = manualKey;
    if (totpSetupBox) totpSetupBox.style.display = "block";
    if (totpSetupCode) totpSetupCode.value = "";

    setStatus("Clé générée ✅ Ajoute-la dans ton app d’authentification puis confirme avec un code.");
    await refreshTotpStatus();
  } catch (e) {
    console.error(e);
    setStatus(e?.message || String(e), false);
  }
});

btnCopyTotpKey?.addEventListener("click", async () => {
  const key = clean(totpManualKey?.textContent);
  if (!key || key === "—") return setStatus("Aucune clé à copier.", false);

  try {
    await navigator.clipboard.writeText(key);
    setStatus("Clé 2FA copiée ✅");
  } catch (e) {
    console.error(e);
    setStatus("Impossible de copier la clé automatiquement.", false);
  }
});

async function confirmTotpActivation() {
  const token = normalizeTotpCode(totpSetupCode?.value);
  if (token.length < 6) return setStatus("Code 2FA invalide.", false);

  try {
    if (btnConfirmTotp) btnConfirmTotp.disabled = true;
    setStatus("Validation du code 2FA…");
    await withTimeout(
      totpConfirmEnrollmentCallable({ token }),
      12000,
      "Le service 2FA ne répond pas pour le moment."
    );
    if (totpSetupBox) totpSetupBox.style.display = "none";
    if (totpSetupCode) totpSetupCode.value = "";
    setStatus("2FA activé ✅");
    await refreshTotpStatus();
  } catch (e) {
    console.error(e);
    setStatus(e?.message || String(e), false);
  } finally {
    if (btnConfirmTotp) btnConfirmTotp.disabled = false;
  }
}

btnConfirmTotp?.addEventListener("click", confirmTotpActivation);
totpSetupCode?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  confirmTotpActivation();
});

btnDisableTotp?.addEventListener("click", async () => {
  const token = normalizeTotpCode(totpDisableCode?.value);
  if (token.length < 6) return setStatus("Code 2FA requis pour désactiver.", false);

  try {
    await withTimeout(
      totpDisableCallable({ token }),
      12000,
      "Le service 2FA ne répond pas pour le moment."
    );
    if (totpDisableCode) totpDisableCode.value = "";
    if (totpSetupBox) totpSetupBox.style.display = "none";
    setStatus("2FA désactivé ✅");
    await refreshTotpStatus();
  } catch (e) {
    console.error(e);
    setStatus(e?.message || String(e), false);
  }
});