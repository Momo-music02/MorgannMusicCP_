import admin from "firebase-admin";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { getStripeClient } from "./stripe";
import { createContractFromOrder } from "./contracts/generateContract";
import { createSignatureRequestFromOrder } from "./contracts/createSignatureRequest";
import { getSignatureRequestByToken } from "./contracts/getSignatureRequest";
import { submitContractSignature } from "./contracts/submitSignature";
import { listContractsForAdmin } from "./contracts/listContractsForAdmin";
import { getContractDownloadUrl } from "./contracts/getContractDownloadUrl";
import { getContractAudioDownloads } from "./contracts/getContractAudioDownloads";

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

const SITE_URL = process.env.SITE_URL || "https://morgann-music-cp.web.app";

async function requireAuth(auth: any) {
  if (!auth?.uid) throw new HttpsError("unauthenticated", "Connexion requise");
  return auth.uid as string;
}

async function assertAdmin(auth: any) {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Connexion requise");
  }
  const userSnap = await db.collection("users").doc(auth.uid).get();
  const role = userSnap.exists ? String(userSnap.data()?.role || "").toLowerCase() : "";
  if (role !== "admin") {
    throw new HttpsError("permission-denied", "Accès admin requis");
  }
}

function normalizeTags(tags: unknown) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

function amountFromPriceEur(price: unknown) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) {
    throw new HttpsError("invalid-argument", "Prix invalide");
  }
  return Math.round(value * 100);
}

function toHttpsError(error: any, fallbackMessage: string) {
  if (error instanceof HttpsError) {
    return error;
  }
  const message = error?.raw?.message || error?.message || fallbackMessage;
  return new HttpsError("failed-precondition", message);
}

function mapSessionToInput(session: Stripe.Checkout.Session) {
  const customerDetails = session.customer_details;
  const purchasedProdIds = String(session.metadata?.purchasedProdIds || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 50);

  return {
    orderId: String(session.client_reference_id || session.id),
    stripeSessionId: session.id,
    stripePaymentIntentId: String(session.payment_intent || ""),
    purchasedProdIds,
    customerName: customerDetails?.name || "Client",
    customerEmail: customerDetails?.email || "",
    customerAddress: [
      customerDetails?.address?.line1,
      customerDetails?.address?.line2,
      customerDetails?.address?.postal_code,
      customerDetails?.address?.city,
      customerDetails?.address?.country
    ].filter(Boolean).join(", "),
    trackName: String(session.metadata?.trackName || "Track"),
    licenseType: String(session.metadata?.licenseType || "exclusive"),
    amount: Number(session.amount_total || 0),
    currency: String(session.currency || "eur")
  };
}

export const adminCreateProdWithStripe = onCall({ region: "europe-west1" }, async (request) => {
  try {
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

    const ref = await db.collection("prods").add(payload);

    return {
      ok: true,
      prodId: ref.id,
      stripe_product_id: safeStripeProductId || null,
      stripe_price_id: safeStripePriceId,
      stripeProductId: safeStripeProductId || null,
      stripePriceId: safeStripePriceId
    };
  } catch (error: any) {
    const normalized = toHttpsError(error, "Erreur Stripe lors de la création de la prod");
    return {
      ok: false,
      errorCode: normalized.code || "internal",
      errorMessage: normalized.message || "Erreur inconnue"
    };
  }
});

export const adminUpdateProdWithStripe = onCall({ region: "europe-west1" }, async (request) => {
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

    const updateData: any = {
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
  } catch (error: any) {
    throw toHttpsError(error, "Erreur Stripe lors de la mise à jour de la prod");
  }
});

export const adminDeleteProdWithStripe = onCall({ region: "europe-west1" }, async (request) => {
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

export const createCheckoutSession = onCall({ region: "europe-west1", secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const auth = request.auth;
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Connexion requise");
  }

  const { items, successUrl, cancelUrl } = request.data || {};
  if (!Array.isArray(items) || !items.length) {
    throw new HttpsError("invalid-argument", "Aucun article à payer");
  }
  if (!successUrl || !cancelUrl) {
    throw new HttpsError("invalid-argument", "URLs de redirection requises");
  }

  const stripe = getStripeClient(process.env.STRIPE_SECRET_KEY);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const selectedTitles: string[] = [];
  const selectedProdIds: string[] = [];
  let selectedLicenseType = "exclusive";

  for (const rawItem of items) {
    const prodId = String(rawItem?.prodId || "").trim();
    const qty = Math.max(1, Math.min(20, Number(rawItem?.quantity || 1)));
    if (!prodId) continue;
    selectedProdIds.push(prodId);

    const prodSnap = await db.collection("prods").doc(prodId).get();
    if (!prodSnap.exists) {
      throw new HttpsError("not-found", `Prod introuvable: ${prodId}`);
    }
    const prod = prodSnap.data() || {};
    const stripePriceId = (prod as any).stripe_price_id || (prod as any).stripePriceId;
    if (!stripePriceId) {
      throw new HttpsError("failed-precondition", `Prix Stripe manquant pour ${prodId}`);
    }

    selectedTitles.push(String((prod as any).titre || "").trim());
    if ((prod as any).licenseType) {
      selectedLicenseType = String((prod as any).licenseType || "exclusive").trim() || "exclusive";
    }

    lineItems.push({
      price: String(stripePriceId),
      quantity: qty
    });
  }

  if (!lineItems.length) {
    throw new HttpsError("invalid-argument", "Aucun article valide");
  }

  const compactTitles = selectedTitles.filter(Boolean);
  const trackName = compactTitles.length <= 1
    ? (compactTitles[0] || "Track")
    : `Panier (${compactTitles.length} prods)`;

  const purchasedProdIds = selectedProdIds.filter(Boolean).slice(0, 50).join(",");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    billing_address_collection: "required",
    phone_number_collection: { enabled: true },
    success_url: String(successUrl),
    cancel_url: String(cancelUrl),
    client_reference_id: auth.uid,
    metadata: {
      uid: auth.uid,
      trackName,
      licenseType: selectedLicenseType,
      purchasedProdIds
    }
  });

  return { url: session.url };
});

export const verifyCheckoutAndBootstrapContract = onCall({ region: "europe-west1", secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  await requireAuth(request.auth);
  const sessionId = String(request.data?.sessionId || "").trim();
  if (!sessionId) throw new HttpsError("invalid-argument", "sessionId requis");

  const stripe = getStripeClient(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") throw new HttpsError("failed-precondition", "Paiement non confirmé");

  const contract = await createContractFromOrder(mapSessionToInput(session));
  const sign = await createSignatureRequestFromOrder(contract.orderId, SITE_URL);
  return { contractId: contract.id, signUrl: sign.signUrl, status: contract.signatureStatus };
});

export const stripeContractsWebhook = onRequest({ region: "europe-west1", secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] }, async (req, res) => {
  try {
    const stripe = getStripeClient(process.env.STRIPE_SECRET_KEY);
    const sig = req.header("stripe-signature") || "";
    const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET manquante");

    const event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        await createContractFromOrder(mapSessionToInput(session));
      }
    }

    res.status(200).send("ok");
  } catch (error: any) {
    res.status(400).send(error?.message || "webhook error");
  }
});

export const createSignatureRequest = onCall({ region: "europe-west1" }, async (request) => {
  await requireAuth(request.auth);
  const orderId = String(request.data?.orderId || "").trim();
  if (!orderId) throw new HttpsError("invalid-argument", "orderId requis");
  return createSignatureRequestFromOrder(orderId, SITE_URL);
});

export const getSignatureRequest = onCall({ region: "europe-west1" }, async (request) => {
  const token = String(request.data?.token || "").trim();
  return getSignatureRequestByToken(token);
});

export const submitSignature = onCall({ region: "europe-west1" }, async (request) => {
  const token = String(request.data?.token || "").trim();
  const signatureDataUrl = String(request.data?.signatureDataUrl || "");
  const signatoryName = String(request.data?.signatoryName || "");
  const signatoryEmail = String(request.data?.signatoryEmail || "");

  return submitContractSignature({ token, signatureDataUrl, signatoryName, signatoryEmail });
});

export const listContractsForAdminCallable = onCall({ region: "europe-west1" }, async (request) => {
  const uid = await requireAuth(request.auth);
  const limit = Number(request.data?.limit || 100);
  const status = String(request.data?.status || "").trim().toLowerCase();
  return { contracts: await listContractsForAdmin(uid, limit, status || null) };
});

export const getContractDownloadUrlCallable = onCall({ region: "europe-west1" }, async (request) => {
  const uid = await requireAuth(request.auth);
  const contractId = String(request.data?.contractId || "").trim();
  const variant = String(request.data?.variant || "generated") as "generated" | "signed";
  if (!contractId) throw new HttpsError("invalid-argument", "contractId requis");
  const url = await getContractDownloadUrl({ uid, contractId, variant });
  return { url };
});

export const getContractAudioDownloadsCallable = onCall({ region: "europe-west1" }, async (request) => {
  const uid = await requireAuth(request.auth);
  const contractId = String(request.data?.contractId || "").trim();
  if (!contractId) throw new HttpsError("invalid-argument", "contractId requis");
  return getContractAudioDownloads({ uid, contractId });
});
