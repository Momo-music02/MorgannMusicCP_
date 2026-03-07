import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSPUArpApBuK0Cn9VbeMtqk4JC-gqruJc",
  authDomain: "morgann-music-cp.firebaseapp.com",
  projectId: "morgann-music-cp",
  storageBucket: "morgann-music-cp.firebasestorage.app",
  messagingSenderId: "666812685196",
  appId: "1:666812685196:web:fe3df6749ae768d68494a9"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, "europe-west1");

const statusEl = document.getElementById("status");
const createForm = document.getElementById("createForm");
const prodsList = document.getElementById("prodsList");

const adminCreateProdWithStripe = httpsCallable(functions, "adminCreateProdWithStripe");
const adminUpdateProdWithStripe = httpsCallable(functions, "adminUpdateProdWithStripe");
const adminDeleteProdWithStripe = httpsCallable(functions, "adminDeleteProdWithStripe");

let currentUser = null;
let prodsUnsubscribe = null;
let hasInitialized = false;

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function euro(value) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(value || 0));
}

function parseTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseLocaleNumber(raw) {
  const normalized = String(raw || "").trim().replace(",", ".");
  if (!normalized) {
    return Number.NaN;
  }
  return Number(normalized);
}

async function ensureAdmin(user) {
  const userSnap = await getDoc(doc(db, "users", user.uid));
  const role = userSnap.exists() ? String(userSnap.data().role || "").toLowerCase() : "";
  if (role !== "admin") {
    window.location.href = "/dash/index.html";
    return false;
  }
  return true;
}

async function uploadFile(path, file) {
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type || undefined });
  return getDownloadURL(fileRef);
}

async function callCreateProdWithStripe(payload) {
  try {
    const result = await adminCreateProdWithStripe(payload);
    return result?.data || null;
  } catch (error) {
    const code = String(error?.code || "").toLowerCase();
    const message = String(error?.message || "");
    const isNetwork = code.includes("unavailable") || message.toLowerCase().includes("network") || message.toLowerCase().includes("load failed");
    if (isNetwork) {
      const networkError = new Error("Connexion réseau impossible vers Firebase Functions");
      networkError.code = error?.code || "network-error";
      throw networkError;
    }
    throw error;
  }
}

async function createProd(event) {
  event.preventDefault();
  event.stopPropagation();
  if (!currentUser) {
    statusEl.textContent = "Session non prête, reconnecte-toi puis réessaie.";
    return;
  }
  if (createForm.dataset.busy === "1") {
    return;
  }
  createForm.dataset.busy = "1";

  const titre = createForm.querySelector("#titre").value.trim();
  const prix = parseLocaleNumber(createForm.querySelector("#prix").value);
  const bpmRaw = createForm.querySelector("#bpm").value;
  const genre = createForm.querySelector("#genre").value.trim();
  const tags = parseTags(createForm.querySelector("#tags").value);
  const audio = createForm.querySelector("#audio").files?.[0];
  const image = createForm.querySelector("#image").files?.[0];

  if (!titre || !audio || !image || !Number.isFinite(prix) || prix <= 0) {
    statusEl.textContent = "Champs requis: titre, prix, audio, image.";
    createForm.dataset.busy = "0";
    return;
  }

  const bpm = bpmRaw ? parseLocaleNumber(bpmRaw) : null;
  if (bpmRaw && (!Number.isFinite(bpm) || bpm <= 0)) {
    statusEl.textContent = "BPM invalide.";
    createForm.dataset.busy = "0";
    return;
  }

  statusEl.textContent = "Upload audio/image en cours...";
  const basePath = `prods/${Date.now()}_${currentUser.uid}`;
  const audioPath = `${basePath}/audio_${audio.name}`;
  const imagePath = `${basePath}/image_${image.name}`;

  try {
    const [audioUrl, imageUrl] = await Promise.all([
      uploadFile(audioPath, audio),
      uploadFile(imagePath, image)
    ]);

    statusEl.textContent = "Création Stripe + Firestore...";
    const result = await callCreateProdWithStripe({
      titre,
      prix,
      audioUrl,
      imageUrl,
      bpm,
      genre: genre || null,
      tags,
      audioPath,
      imagePath
    });

    const stripeProductId = result?.stripe_product_id || result?.stripeProductId || "";
    const stripePriceId = result?.stripe_price_id || result?.stripePriceId || "";
    if (!stripePriceId) {
      throw new Error("Produit créé sans price Stripe ID");
    }

    createForm.reset();
    statusEl.textContent = `Prod créée avec succès. Stripe: ${stripeProductId || "—"} / ${stripePriceId}`;
  } catch (error) {
    const code = error?.code ? `${error.code}` : "";
    const details = error?.details ? ` • ${error.details}` : "";
    const message = error?.message || "Erreur inconnue";
    statusEl.textContent = `Erreur création${code ? ` (${code})` : ""}: ${message}${details}`;
  } finally {
    createForm.dataset.busy = "0";
  }
}

function prodRow(prod) {
  const tagsValue = Array.isArray(prod.tags) ? prod.tags.join(", ") : "";
  const stripeProductId = prod.stripe_product_id || prod.stripeProductId || "—";
  const stripePriceId = prod.stripe_price_id || prod.stripePriceId || "—";
  return `
    <article class="prod-row">
      <img src="${esc(prod.imageUrl || "/default-avatar.png")}" alt="${esc(prod.titre)}">
      <div class="prod-edit">
        <input data-field="titre" value="${esc(prod.titre || "")}" />
        <input data-field="prix" type="number" min="1" step="0.01" value="${Number(prod.prix || 0)}" />
        <input data-field="bpm" type="number" min="1" step="1" value="${prod.bpm || ""}" placeholder="BPM" />
        <input data-field="genre" value="${esc(prod.genre || "")}" placeholder="Genre" />
        <input data-field="tags" value="${esc(tagsValue)}" placeholder="Tags" />
        <small>${esc(euro(prod.prix))} • Stripe product: ${esc(stripeProductId)} • Stripe price: ${esc(stripePriceId)}</small>
        <div class="prod-actions">
          <button class="btn-secondary" data-save="${esc(prod.id)}">Enregistrer</button>
          <button class="btn-danger" data-delete="${esc(prod.id)}">Supprimer</button>
        </div>
      </div>
    </article>
  `;
}

function wireActions(prods) {
  prodsList.querySelectorAll("[data-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const prodId = btn.dataset.save;
      const row = btn.closest(".prod-row");
      if (!row) return;

      const titre = row.querySelector('[data-field="titre"]').value.trim();
      const prix = Number(row.querySelector('[data-field="prix"]').value);
      const bpmRaw = row.querySelector('[data-field="bpm"]').value;
      const genre = row.querySelector('[data-field="genre"]').value.trim();
      const tags = parseTags(row.querySelector('[data-field="tags"]').value);

      statusEl.textContent = "Mise à jour en cours...";
      try {
        const previous = prods.find((p) => p.id === prodId);
        await adminUpdateProdWithStripe({
          prodId,
          titre,
          prix,
          bpm: bpmRaw ? Number(bpmRaw) : null,
          genre: genre || null,
          tags,
          imageUrl: previous?.imageUrl || null
        });
        statusEl.textContent = "Prod mise à jour.";
      } catch (error) {
        statusEl.textContent = `Erreur update: ${error.message || error}`;
      }
    });
  });

  prodsList.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const prodId = btn.dataset.delete;
      const ok = window.confirm("Supprimer cette prod ?");
      if (!ok) return;
      statusEl.textContent = "Suppression en cours...";
      try {
        await adminDeleteProdWithStripe({ prodId });
        statusEl.textContent = "Prod supprimée.";
      } catch (error) {
        statusEl.textContent = `Erreur suppression: ${error.message || error}`;
      }
    });
  });
}

function startProdsListener() {
  return onSnapshot(collection(db, "prods"), (snap) => {
    const prods = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    prods.sort((a, b) => String(a.titre || "").localeCompare(String(b.titre || ""), "fr", { sensitivity: "base" }));

    if (!prods.length) {
      prodsList.innerHTML = "<p>Aucune prod pour le moment.</p>";
      return;
    }

    prodsList.innerHTML = prods.map(prodRow).join("");
    wireActions(prods);
  }, (error) => {
    statusEl.textContent = `Erreur chargement: ${error.message || error}`;
  });
}

createForm.addEventListener("submit", createProd);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login.html?redirect=" + encodeURIComponent(window.location.href);
    return;
  }

  currentUser = user;
  const ok = await ensureAdmin(user);
  if (!ok) return;

  if (!hasInitialized) {
    statusEl.textContent = "Prêt.";
    hasInitialized = true;
  }

  if (typeof prodsUnsubscribe === "function") {
    prodsUnsubscribe();
  }
  prodsUnsubscribe = startProdsListener();
});
