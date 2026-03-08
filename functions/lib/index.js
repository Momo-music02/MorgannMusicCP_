"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractAudioDownloadsCallable = exports.getContractDownloadUrlCallable = exports.listContractsForAdminCallable = exports.submitSignature = exports.getSignatureRequest = exports.createSignatureRequest = exports.stripeContractsWebhook = exports.verifyCheckoutAndBootstrapContract = exports.createCheckoutSession = exports.adminDeleteProdWithStripe = exports.adminUpdateProdWithStripe = exports.adminCreateProdWithStripe = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const stripe_1 = require("./stripe");
const generateContract_1 = require("./contracts/generateContract");
const createSignatureRequest_1 = require("./contracts/createSignatureRequest");
const getSignatureRequest_1 = require("./contracts/getSignatureRequest");
const submitSignature_1 = require("./contracts/submitSignature");
const listContractsForAdmin_1 = require("./contracts/listContractsForAdmin");
const getContractDownloadUrl_1 = require("./contracts/getContractDownloadUrl");
const getContractAudioDownloads_1 = require("./contracts/getContractAudioDownloads");
if (!firebase_admin_1.default.apps.length)
    firebase_admin_1.default.initializeApp();
const db = firebase_admin_1.default.firestore();
const SITE_URL = process.env.SITE_URL || "https://morgann-music-cp.web.app";
async function requireAuth(auth) {
    if (!auth?.uid)
        throw new https_1.HttpsError("unauthenticated", "Connexion requise");
    return auth.uid;
}
async function assertAdmin(auth) {
    if (!auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Connexion requise");
    }
    const userSnap = await db.collection("users").doc(auth.uid).get();
    const role = userSnap.exists ? String(userSnap.data()?.role || "").toLowerCase() : "";
    if (role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Accès admin requis");
    }
}
function normalizeTags(tags) {
    if (!Array.isArray(tags))
        return [];
    return tags
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
        .slice(0, 30);
}
function amountFromPriceEur(price) {
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) {
        throw new https_1.HttpsError("invalid-argument", "Prix invalide");
    }
    return Math.round(value * 100);
}
function toHttpsError(error, fallbackMessage) {
    if (error instanceof https_1.HttpsError) {
        return error;
    }
    const message = error?.raw?.message || error?.message || fallbackMessage;
    return new https_1.HttpsError("failed-precondition", message);
}
function mapSessionToInput(session) {
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
exports.adminCreateProdWithStripe = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    try {
        await assertAdmin(request.auth);
        const { titre, prix, audioUrl, imageUrl, stripePriceId = null, stripeProductId = null, bpm = null, genre = null, tags = [], audioPath = null, imagePath = null } = request.data || {};
        if (!titre || !audioUrl || !imageUrl) {
            throw new https_1.HttpsError("invalid-argument", "titre, audioUrl et imageUrl sont requis");
        }
        amountFromPriceEur(prix);
        const safeStripePriceId = String(stripePriceId || "").trim();
        const safeStripeProductId = String(stripeProductId || "").trim();
        if (!safeStripePriceId) {
            throw new https_1.HttpsError("invalid-argument", "stripePriceId requis");
        }
        const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
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
    }
    catch (error) {
        const normalized = toHttpsError(error, "Erreur Stripe lors de la création de la prod");
        return {
            ok: false,
            errorCode: normalized.code || "internal",
            errorMessage: normalized.message || "Erreur inconnue"
        };
    }
});
exports.adminUpdateProdWithStripe = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    try {
        await assertAdmin(request.auth);
        const { prodId, titre, prix, stripePriceId = null, stripeProductId = null, bpm = null, genre = null, tags = [], imageUrl = null } = request.data || {};
        if (!prodId) {
            throw new https_1.HttpsError("invalid-argument", "prodId requis");
        }
        const prodRef = db.collection("prods").doc(String(prodId));
        const prodSnap = await prodRef.get();
        if (!prodSnap.exists) {
            throw new https_1.HttpsError("not-found", "Prod introuvable");
        }
        const previous = prodSnap.data() || {};
        const safeTitre = String(titre || previous.titre || "").trim();
        if (!safeTitre) {
            throw new https_1.HttpsError("invalid-argument", "Titre invalide");
        }
        const updateData = {
            titre: safeTitre,
            bpm: bpm === null || bpm === "" ? null : Number(bpm),
            genre: genre ? String(genre).trim() : null,
            tags: normalizeTags(tags),
            updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
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
    }
    catch (error) {
        throw toHttpsError(error, "Erreur Stripe lors de la mise à jour de la prod");
    }
});
exports.adminDeleteProdWithStripe = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    await assertAdmin(request.auth);
    const { prodId } = request.data || {};
    if (!prodId) {
        throw new https_1.HttpsError("invalid-argument", "prodId requis");
    }
    const prodRef = db.collection("prods").doc(String(prodId));
    const prodSnap = await prodRef.get();
    if (!prodSnap.exists) {
        return { success: true };
    }
    await prodRef.delete();
    return { success: true };
});
exports.createCheckoutSession = (0, https_1.onCall)({ region: "europe-west1", secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
    const auth = request.auth;
    if (!auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Connexion requise");
    }
    const { items, successUrl, cancelUrl } = request.data || {};
    if (!Array.isArray(items) || !items.length) {
        throw new https_1.HttpsError("invalid-argument", "Aucun article à payer");
    }
    if (!successUrl || !cancelUrl) {
        throw new https_1.HttpsError("invalid-argument", "URLs de redirection requises");
    }
    const stripe = (0, stripe_1.getStripeClient)(process.env.STRIPE_SECRET_KEY);
    const lineItems = [];
    const selectedTitles = [];
    const selectedProdIds = [];
    let selectedLicenseType = "exclusive";
    for (const rawItem of items) {
        const prodId = String(rawItem?.prodId || "").trim();
        const qty = Math.max(1, Math.min(20, Number(rawItem?.quantity || 1)));
        if (!prodId)
            continue;
        selectedProdIds.push(prodId);
        const prodSnap = await db.collection("prods").doc(prodId).get();
        if (!prodSnap.exists) {
            throw new https_1.HttpsError("not-found", `Prod introuvable: ${prodId}`);
        }
        const prod = prodSnap.data() || {};
        const stripePriceId = prod.stripe_price_id || prod.stripePriceId;
        if (!stripePriceId) {
            throw new https_1.HttpsError("failed-precondition", `Prix Stripe manquant pour ${prodId}`);
        }
        selectedTitles.push(String(prod.titre || "").trim());
        if (prod.licenseType) {
            selectedLicenseType = String(prod.licenseType || "exclusive").trim() || "exclusive";
        }
        lineItems.push({
            price: String(stripePriceId),
            quantity: qty
        });
    }
    if (!lineItems.length) {
        throw new https_1.HttpsError("invalid-argument", "Aucun article valide");
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
exports.verifyCheckoutAndBootstrapContract = (0, https_1.onCall)({ region: "europe-west1", secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
    await requireAuth(request.auth);
    const sessionId = String(request.data?.sessionId || "").trim();
    if (!sessionId)
        throw new https_1.HttpsError("invalid-argument", "sessionId requis");
    const stripe = (0, stripe_1.getStripeClient)(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid")
        throw new https_1.HttpsError("failed-precondition", "Paiement non confirmé");
    const contract = await (0, generateContract_1.createContractFromOrder)(mapSessionToInput(session));
    const sign = await (0, createSignatureRequest_1.createSignatureRequestFromOrder)(contract.orderId, SITE_URL);
    return { contractId: contract.id, signUrl: sign.signUrl, status: contract.signatureStatus };
});
exports.stripeContractsWebhook = (0, https_1.onRequest)({ region: "europe-west1", secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] }, async (req, res) => {
    try {
        const stripe = (0, stripe_1.getStripeClient)(process.env.STRIPE_SECRET_KEY);
        const sig = req.header("stripe-signature") || "";
        const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
        if (!secret)
            throw new Error("STRIPE_WEBHOOK_SECRET manquante");
        const event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            if (session.payment_status === "paid") {
                await (0, generateContract_1.createContractFromOrder)(mapSessionToInput(session));
            }
        }
        res.status(200).send("ok");
    }
    catch (error) {
        res.status(400).send(error?.message || "webhook error");
    }
});
exports.createSignatureRequest = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    await requireAuth(request.auth);
    const orderId = String(request.data?.orderId || "").trim();
    if (!orderId)
        throw new https_1.HttpsError("invalid-argument", "orderId requis");
    return (0, createSignatureRequest_1.createSignatureRequestFromOrder)(orderId, SITE_URL);
});
exports.getSignatureRequest = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const token = String(request.data?.token || "").trim();
    return (0, getSignatureRequest_1.getSignatureRequestByToken)(token);
});
exports.submitSignature = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const token = String(request.data?.token || "").trim();
    const signatureDataUrl = String(request.data?.signatureDataUrl || "");
    const signatoryName = String(request.data?.signatoryName || "");
    const signatoryEmail = String(request.data?.signatoryEmail || "");
    return (0, submitSignature_1.submitContractSignature)({ token, signatureDataUrl, signatoryName, signatoryEmail });
});
exports.listContractsForAdminCallable = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const uid = await requireAuth(request.auth);
    const limit = Number(request.data?.limit || 100);
    const status = String(request.data?.status || "").trim().toLowerCase();
    return { contracts: await (0, listContractsForAdmin_1.listContractsForAdmin)(uid, limit, status || null) };
});
exports.getContractDownloadUrlCallable = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const uid = await requireAuth(request.auth);
    const contractId = String(request.data?.contractId || "").trim();
    const variant = String(request.data?.variant || "generated");
    if (!contractId)
        throw new https_1.HttpsError("invalid-argument", "contractId requis");
    const url = await (0, getContractDownloadUrl_1.getContractDownloadUrl)({ uid, contractId, variant });
    return { url };
});
exports.getContractAudioDownloadsCallable = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const uid = await requireAuth(request.auth);
    const contractId = String(request.data?.contractId || "").trim();
    if (!contractId)
        throw new https_1.HttpsError("invalid-argument", "contractId requis");
    return (0, getContractAudioDownloads_1.getContractAudioDownloads)({ uid, contractId });
});
