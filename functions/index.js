const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

admin.initializeApp();

const db = admin.firestore();

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
      bpm = null,
      genre = null,
      tags = [],
      audioPath = null,
      imagePath = null
    } = request.data || {};

    if (!titre || !audioUrl || !imageUrl) {
      throw new HttpsError("invalid-argument", "titre, audioUrl et imageUrl sont requis");
    }

    const stripe = stripeClient();
    const unitAmount = amountFromPriceEur(prix);

    console.info("[adminCreateProdWithStripe] validated", {
      titre: String(titre).trim(),
      prix: Number(prix),
      hasAudioUrl: !!audioUrl,
      hasImageUrl: !!imageUrl,
      unitAmount
    });

    let stripeProduct;
    try {
      stripeProduct = await stripe.products.create({
        name: String(titre).trim(),
        images: [String(imageUrl)],
        metadata: {
          source: "firebase_mmcp"
        }
      });
      console.info("[adminCreateProdWithStripe] stripe product created", {
        stripeProductId: stripeProduct.id
      });
    } catch (error) {
      console.error("[adminCreateProdWithStripe] stripe.products.create failed", error);
      throw toHttpsError(error, "Création Stripe Product impossible");
    }

    let stripePrice;
    try {
      stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        currency: "eur",
        unit_amount: unitAmount
      });
      console.info("[adminCreateProdWithStripe] stripe price created", {
        stripePriceId: stripePrice.id
      });
    } catch (error) {
      console.error("[adminCreateProdWithStripe] stripe.prices.create failed", error);
      throw toHttpsError(error, "Création Stripe Price impossible");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const payload = {
      titre: String(titre).trim(),
      prix: Number(prix),
      audioUrl: String(audioUrl),
      imageUrl: String(imageUrl),
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripePrice.id,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
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
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id
    });

    return {
      prodId: ref.id,
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripePrice.id,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id
    };
  } catch (error) {
    console.error("adminCreateProdWithStripe error:", error);
    throw toHttpsError(error, "Erreur Stripe lors de la création de la prod");
  }
});

exports.adminUpdateProdWithStripe = onCall({ region: "europe-west1" }, async (request) => {
  try {
    await assertAdmin(request.auth);

    const { prodId, titre, prix, bpm = null, genre = null, tags = [], imageUrl = null } = request.data || {};
    if (!prodId) {
      throw new HttpsError("invalid-argument", "prodId requis");
    }

    const prodRef = db.collection("prods").doc(String(prodId));
    const prodSnap = await prodRef.get();
    if (!prodSnap.exists) {
      throw new HttpsError("not-found", "Prod introuvable");
    }

    const previous = prodSnap.data() || {};
    const stripe = stripeClient();

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

    const safeImageUrl = imageUrl ? String(imageUrl) : (previous.imageUrl ? String(previous.imageUrl) : null);
    let stripeProductId = previous.stripe_product_id || previous.stripeProductId || null;

    if (!stripeProductId) {
      const createdStripeProduct = await stripe.products.create({
        name: safeTitre,
        ...(safeImageUrl ? { images: [safeImageUrl] } : {}),
        metadata: {
          source: "firebase_mmcp"
        }
      });
      stripeProductId = createdStripeProduct.id;
      updateData.stripe_product_id = stripeProductId;
      updateData.stripeProductId = stripeProductId;
    }

    if (stripeProductId) {
      await stripe.products.update(stripeProductId, {
        name: safeTitre,
        ...(safeImageUrl ? { images: [safeImageUrl] } : {})
      });
    }

    const nextPrice = Number(prix);
    const previousPriceId = previous.stripe_price_id || previous.stripePriceId || null;
    const shouldCreatePrice = Number.isFinite(nextPrice) && nextPrice > 0 && (
      nextPrice !== Number(previous.prix) ||
      !previousPriceId
    );

    if (shouldCreatePrice) {
      const newStripePrice = await stripe.prices.create({
        product: stripeProductId,
        currency: "eur",
        unit_amount: amountFromPriceEur(nextPrice)
      });

      updateData.prix = nextPrice;
      updateData.stripe_price_id = newStripePrice.id;
      updateData.stripePriceId = newStripePrice.id;
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

  const prod = prodSnap.data() || {};
  const stripe = stripeClient();
  const stripeProductId = prod.stripe_product_id || prod.stripeProductId;
  if (stripeProductId) {
    await stripe.products.update(String(stripeProductId), { active: false });
  }

  await prodRef.delete();
  return { success: true };
});

exports.createCheckoutSession = onCall({ region: "europe-west1" }, async (request) => {
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