const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const crypto = require("crypto");

admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();
const SITE_URL = process.env.SITE_URL || "https://morgann-music-cp.web.app";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new HttpsError("failed-precondition", "STRIPE_SECRET_KEY manquante");
  }
  const Stripe = require("stripe");
  return new Stripe(key);
}

async function assertAdmin(auth) {
  if (!auth || !auth.uid) {
    throw new HttpsError("unauthenticated", "Connexion requise");
  }
  const userSnap = await db.collection("users").doc(auth.uid).get();
  const role = userSnap.exists ? String(userSnap.data().role || "").toLowerCase() : "";
  if (role !== "admin") {
    throw new HttpsError("permission-denied", "Accès admin requis");
  }
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

function amountFromPriceEur(price) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) {
    throw new HttpsError("invalid-argument", "Prix invalide");
  }
  return Math.round(value * 100);
}

function toHttpsError(error, fallbackMessage) {
  if (error instanceof HttpsError) {
    return error;
  }
  const message = error?.raw?.message || error?.message || fallbackMessage;
  return new HttpsError("failed-precondition", message);
}

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

async function findContractByToken(token) {
  const snap = await db.collection("contracts").where("signatureToken", "==", token).limit(1).get();
  return snap.empty ? null : snap.docs[0];
}

async function findOrCreateContractFromSession(session) {
  const orderId = String(session.client_reference_id || session.id);
  const existing = await db.collection("contracts").where("orderId", "==", orderId).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    return { id: doc.id, data: doc.data() };
  }

  const customer = session.customer_details || {};
  const now = admin.firestore.FieldValue.serverTimestamp();
  const tokenExpiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const payload = {
    orderId,
    stripeSessionId: session.id,
    stripePaymentIntentId: String(session.payment_intent || ""),
    customerName: String(customer.name || "Client"),
    customerEmail: String(customer.email || ""),
    customerAddress: [
      customer?.address?.line1,
      customer?.address?.line2,
      customer?.address?.postal_code,
      customer?.address?.city,
      customer?.address?.country
    ].filter(Boolean).join(", "),
    trackName: String(session.metadata?.trackName || "Track"),
    licenseType: String(session.metadata?.licenseType || "exclusive"),
    amount: Number(session.amount_total || 0),
    currency: String(session.currency || "eur").toLowerCase(),
    signatureToken: randomToken(),
    signatureStatus: "pending",
    tokenExpiresAt,
    generatedPdfPath: null,
    signedPdfPath: null,
    signatureImagePath: null,
    generatedAt: now,
    signedAt: null,
    createdAt: now,
    updatedAt: now
  };

  const ref = await db.collection("contracts").add(payload);
  const created = await ref.get();
  return { id: ref.id, data: created.data() };
}

async function createSignedUrl(path, minutes = 60) {
  if (!path) return null;
  const expires = Date.now() + minutes * 60 * 1000;
  const [url] = await bucket.file(path).getSignedUrl({ action: "read", expires });
  return url;
}

exports.adminCreateProdWithStripe = onCall({ region: "europe-west1" }, async (request) => {
  try {
    console.info("[adminCreateProdWithStripe] start", {
      uid: request?.auth?.uid || null,
      hasData: !!request?.data
    });

    await assertAdmin(request.auth);

    const {
      titre,
      prix,
      audioUrl,
      imageUrl,
      stripePriceId = null,
      stripeProductId = null,
      bpm = null,
      genre = null,
      tags = [],
      audioPath = null,
      imagePath = null
    } = request.data || {};

    if (!titre || !audioUrl || !imageUrl) {
      throw new HttpsError("invalid-argument", "titre, audioUrl et imageUrl sont requis");
    }

    amountFromPriceEur(prix);

    const safeStripePriceId = String(stripePriceId || "").trim();
    const safeStripeProductId = String(stripeProductId || "").trim();
    if (!safeStripePriceId) {
      throw new HttpsError("invalid-argument", "stripePriceId requis");
    }

    console.info("[adminCreateProdWithStripe] validated", {
      titre: String(titre).trim(),
      prix: Number(prix),
      hasAudioUrl: !!audioUrl,
      hasImageUrl: !!imageUrl,
      stripePriceId: safeStripePriceId,
      stripeProductId: safeStripeProductId || null
    });

    const now = admin.firestore.FieldValue.serverTimestamp();
    const payload = {
      titre: String(titre).trim(),
      prix: Number(prix),
      audioUrl: String(audioUrl),
      imageUrl: String(imageUrl),
      stripe_product_id: safeStripeProductId || null,
      stripe_price_id: safeStripePriceId,
      stripeProductId: safeStripeProductId || null,
      stripePriceId: safeStripePriceId,
      bpm: bpm === null || bpm === "" ? null : Number(bpm),
      genre: genre ? String(genre).trim() : null,
      tags: normalizeTags(tags),
      audioPath: audioPath ? String(audioPath) : null,
      imagePath: imagePath ? String(imagePath) : null,
      createdAt: now,
      updatedAt: now,
      createdByUid: request.auth.uid
    };

    let ref;
    try {
      ref = await db.collection("prods").add(payload);
    } catch (error) {
      console.error("[adminCreateProdWithStripe] firestore add failed", error);
      throw toHttpsError(error, "Écriture Firestore impossible");
    }

    console.info("[adminCreateProdWithStripe] done", {
      prodId: ref.id,
      stripeProductId: safeStripeProductId || null,
      stripePriceId: safeStripePriceId
    });

    return {
      ok: true,
      prodId: ref.id,
      stripe_product_id: safeStripeProductId || null,
      stripe_price_id: safeStripePriceId,
      stripeProductId: safeStripeProductId || null,
      stripePriceId: safeStripePriceId
    };
  } catch (error) {
    console.error("adminCreateProdWithStripe error:", error);
    const normalized = toHttpsError(error, "Erreur Stripe lors de la création de la prod");
    return {
      ok: false,
      errorCode: normalized.code || "internal",
      errorMessage: normalized.message || "Erreur inconnue"
    };
  }
});

exports.adminUpdateProdWithStripe = onCall({ region: "europe-west1" }, async (request) => {
  try {
    await assertAdmin(request.auth);

    const {
      prodId,
      titre,
      prix,
      stripePriceId = null,
      stripeProductId = null,
      bpm = null,
      genre = null,
      tags = [],
      imageUrl = null
    } = request.data || {};
    if (!prodId) {
      throw new HttpsError("invalid-argument", "prodId requis");
    }

    const prodRef = db.collection("prods").doc(String(prodId));
    const prodSnap = await prodRef.get();
    if (!prodSnap.exists) {
      throw new HttpsError("not-found", "Prod introuvable");
    }

    const previous = prodSnap.data() || {};

    const safeTitre = String(titre || previous.titre || "").trim();
    if (!safeTitre) {
      throw new HttpsError("invalid-argument", "Titre invalide");
    }

    const updateData = {
      titre: safeTitre,
      bpm: bpm === null || bpm === "" ? null : Number(bpm),
      genre: genre ? String(genre).trim() : null,
      tags: normalizeTags(tags),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedByUid: request.auth.uid
    };

    if (imageUrl) {
      updateData.imageUrl = String(imageUrl);
    }

    const nextPrice = Number(prix);
    if (Number.isFinite(nextPrice) && nextPrice > 0) {
      updateData.prix = nextPrice;
    }

    const safeStripePriceId = String(stripePriceId || "").trim();
    if (safeStripePriceId) {
      updateData.stripe_price_id = safeStripePriceId;
      updateData.stripePriceId = safeStripePriceId;
    }

    const safeStripeProductId = String(stripeProductId || "").trim();
    if (safeStripeProductId) {
      updateData.stripe_product_id = safeStripeProductId;
      updateData.stripeProductId = safeStripeProductId;
    }

    await prodRef.update(updateData);
    return { success: true };
  } catch (error) {
    console.error("adminUpdateProdWithStripe error:", error);
    throw toHttpsError(error, "Erreur Stripe lors de la mise à jour de la prod");
  }
});

exports.adminDeleteProdWithStripe = onCall({ region: "europe-west1" }, async (request) => {
  await assertAdmin(request.auth);

  const { prodId } = request.data || {};
  if (!prodId) {
    throw new HttpsError("invalid-argument", "prodId requis");
  }

  const prodRef = db.collection("prods").doc(String(prodId));
  const prodSnap = await prodRef.get();
  if (!prodSnap.exists) {
    return { success: true };
  }

  await prodRef.delete();
  return { success: true };
});

exports.createCheckoutSession = onCall({ region: "europe-west1", secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const auth = request.auth;
  if (!auth || !auth.uid) {
    throw new HttpsError("unauthenticated", "Connexion requise");
  }

  const { items, successUrl, cancelUrl } = request.data || {};
  if (!Array.isArray(items) || !items.length) {
    throw new HttpsError("invalid-argument", "Aucun article à payer");
  }
  if (!successUrl || !cancelUrl) {
    throw new HttpsError("invalid-argument", "URLs de redirection requises");
  }

  const stripe = stripeClient();
  const lineItems = [];

  for (const rawItem of items) {
    const prodId = String(rawItem?.prodId || "").trim();
    const qty = Math.max(1, Math.min(20, Number(rawItem?.quantity || 1)));
    if (!prodId) {
      continue;
    }

    const prodSnap = await db.collection("prods").doc(prodId).get();
    if (!prodSnap.exists) {
      throw new HttpsError("not-found", `Prod introuvable: ${prodId}`);
    }
    const prod = prodSnap.data() || {};
    const stripePriceId = prod.stripe_price_id || prod.stripePriceId;
    if (!stripePriceId) {
      throw new HttpsError("failed-precondition", `Prix Stripe manquant pour ${prodId}`);
    }

    lineItems.push({
      price: String(stripePriceId),
      quantity: qty
    });
  }

  if (!lineItems.length) {
    throw new HttpsError("invalid-argument", "Aucun article valide");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: String(successUrl),
    cancel_url: String(cancelUrl),
    client_reference_id: auth.uid,
    metadata: {
      uid: auth.uid
    }
  });

  return { url: session.url };
});

exports.verifyCheckoutAndBootstrapContract = onCall({ region: "europe-west1", secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const auth = request.auth;
  if (!auth || !auth.uid) {
    throw new HttpsError("unauthenticated", "Connexion requise");
  }

  const sessionId = String(request.data?.sessionId || "").trim();
  if (!sessionId) {
    throw new HttpsError("invalid-argument", "sessionId requis");
  }

  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session || session.payment_status !== "paid") {
    throw new HttpsError("failed-precondition", "Paiement non confirmé");
  }

  const contract = await findOrCreateContractFromSession(session);
  const signUrl = `${SITE_URL}/contracts/sign-contract.html?token=${encodeURIComponent(contract.data.signatureToken)}`;

  return {
    contractId: contract.id,
    signUrl,
    status: contract.data.signatureStatus || "pending"
  };
});

exports.getSignatureRequest = onCall({ region: "europe-west1" }, async (request) => {
  const token = String(request.data?.token || "").trim();
  if (!token) {
    throw new HttpsError("invalid-argument", "token requis");
  }

  const snap = await findContractByToken(token);
  if (!snap) {
    throw new HttpsError("not-found", "Demande introuvable");
  }

  const data = snap.data() || {};
  if (data.signatureStatus !== "pending") {
    throw new HttpsError("failed-precondition", "Signature non disponible");
  }

  const expiresAt = data?.tokenExpiresAt?.toMillis?.() || 0;
  if (expiresAt && Date.now() > expiresAt) {
    await snap.ref.update({ signatureStatus: "expired", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    throw new HttpsError("deadline-exceeded", "Demande expirée");
  }

  return {
    contractId: snap.id,
    customerName: data.customerName || "",
    customerEmail: data.customerEmail || "",
    trackName: data.trackName || "",
    licenseType: data.licenseType || "",
    generatedPdfUrl: data.generatedPdfPath ? await createSignedUrl(data.generatedPdfPath, 20) : null
  };
});

exports.submitSignature = onCall({ region: "europe-west1" }, async (request) => {
  const token = String(request.data?.token || "").trim();
  const signatureDataUrl = String(request.data?.signatureDataUrl || "").trim();
  const signatoryName = String(request.data?.signatoryName || "").trim();
  const signatoryEmail = String(request.data?.signatoryEmail || "").trim();

  if (!token || !signatureDataUrl) {
    throw new HttpsError("invalid-argument", "token et signature requis");
  }

  const snap = await findContractByToken(token);
  if (!snap) {
    throw new HttpsError("not-found", "Demande introuvable");
  }

  const data = snap.data() || {};
  if (data.signatureStatus === "signed") {
    return {
      success: true,
      contractId: snap.id,
      signedPdfUrl: data.signedPdfPath ? await createSignedUrl(data.signedPdfPath, 120) : null
    };
  }

  const expiresAt = data?.tokenExpiresAt?.toMillis?.() || 0;
  if (expiresAt && Date.now() > expiresAt) {
    await snap.ref.update({ signatureStatus: "expired", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    throw new HttpsError("deadline-exceeded", "Demande expirée");
  }

  const base64 = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
  if (!base64) {
    throw new HttpsError("invalid-argument", "Signature vide");
  }

  const signatureBuffer = Buffer.from(base64, "base64");
  const signatureImagePath = `contracts/signatures/${snap.id}.png`;

  await bucket.file(signatureImagePath).save(signatureBuffer, {
    resumable: false,
    contentType: "image/png",
    metadata: { cacheControl: "private, max-age=0, no-store" }
  });

  await snap.ref.update({
    signatureStatus: "signed",
    signatureImagePath,
    signedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    signatoryName: signatoryName || data.customerName || null,
    signatoryEmail: signatoryEmail || data.customerEmail || null
  });

  return { success: true, contractId: snap.id, signedPdfUrl: null };
});

exports.listContractsForAdminCallable = onCall({ region: "europe-west1" }, async (request) => {
  await assertAdmin(request.auth);

  const rawLimit = Number(request.data?.limit || 100);
  const limit = Math.min(Math.max(rawLimit, 1), 200);
  const status = String(request.data?.status || "").trim().toLowerCase();

  let query = db.collection("contracts").orderBy("createdAt", "desc").limit(limit);
  if (status) {
    query = db.collection("contracts").where("signatureStatus", "==", status).orderBy("createdAt", "desc").limit(limit);
  }

  const snap = await query.get();
  const contracts = snap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      orderId: data.orderId || null,
      customerName: data.customerName || null,
      customerEmail: data.customerEmail || null,
      trackName: data.trackName || null,
      licenseType: data.licenseType || null,
      status: data.signatureStatus || "pending",
      createdAt: data?.createdAt?.toDate?.()?.toISOString?.() || null,
      signedAt: data?.signedAt?.toDate?.()?.toISOString?.() || null
    };
  });

  return { contracts };
});

exports.getContractDownloadUrlCallable = onCall({ region: "europe-west1" }, async (request) => {
  await assertAdmin(request.auth);

  const contractId = String(request.data?.contractId || "").trim();
  const variant = String(request.data?.variant || "generated").trim();
  if (!contractId) {
    throw new HttpsError("invalid-argument", "contractId requis");
  }

  const snap = await db.collection("contracts").doc(contractId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Contrat introuvable");
  }

  const data = snap.data() || {};
  const path = variant === "signed" ? data.signedPdfPath : data.generatedPdfPath;
  if (!path) {
    return { url: null };
  }

  const url = await createSignedUrl(String(path), 120);
  return { url };
});