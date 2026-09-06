export default {
  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "");
    const method = request.method;

    try {

      if (method === "GET" && path === "/api/artists") {
        return await getAllArtists(env);
      }
      if (method === "GET" && path === "/api/feats") {
        return await getAllFeats(env);
      }
      if (method === "GET" && path === "/api/releases") {
        return await getAllReleases(env, url);
      }
      if (method === "GET" && path === "/api/reviews") {
        return await getAllReviews(env);
      }
      if (method === "GET" && path === "/api/versions") {
        return await getAllVersions(env);
      }
      if (method === "POST" && path === "/api/messages") {
        return await createMessage(env, request);
      }

      if (method === "GET" && path.startsWith("/api/files/")) {
        const key = decodeURIComponent(path.replace("/api/files/", ""));
        return await serveFile(env, key);
      }

      if (method === "GET" && path.match(/^\/api\/releases\/\d+$/)) {
        const releaseId = path.split("/").pop();
        return await getPublicRelease(env, releaseId);
      }


      const userId = await extractUserId(request);
      if (!userId) {
        return corsJson({ error: "Authentification requise" }, 401);
      }
      const isAdminUser = await isAdmin(env, userId);

      if (method === "GET" && path === "/api/admin/users") {
        return await listUsers(env, userId, isAdminUser);
      }
      if (method === "GET" && path === "/api/admin/messages") {
        return await getAllMessages(env, userId, isAdminUser);
      }
      if (method === "GET" && path === "/api/admin/withdrawals") {
        return await getAllWithdrawals(env, userId, isAdminUser);
      }
      if (method === "PATCH" && path.match(/^\/api\/admin\/withdrawals\/\d+$/)) {
        return await patchWithdrawal(env, path, request, isAdminUser);
      }
      if (method === "POST" && path === "/api/admin/versions") {
        return await createVersion(env, request, userId, isAdminUser);
      }
      if (method === "PATCH" && path.match(/^\/api\/admin\/versions\/\d+$/)) {
        return await patchVersion(env, path, request, userId, isAdminUser);
      }
      if (method === "POST" && path.match(/^\/api\/admin\/users\/[^/]+\/notifications$/)) {
        return await createNotification(env, userId, path, request, isAdminUser);
      }
      if (method === "GET" && path.match(/^\/api\/admin\/releases\/\d+$/)) {
        return await getAdminRelease(env, path, isAdminUser);
      }

      if (method === "GET" && path === "/api/me") {
        return await getMe(env, userId);
      }

      if (method === "GET" && path === "/api/admin/users") {
        return await listUsers(env, userId, isAdminUser);
      }
      if (method === "GET" && path === "/api/admin/messages") {
        return await getAllMessages(env, userId, isAdminUser);
      }
      if (method === "GET" && path === "/api/admin/withdrawals") {
        return await getAllWithdrawals(env, userId, isAdminUser);
      }
      if (method === "PATCH" && path.match(/^\/api\/admin\/withdrawals\/\d+$/)) {
        return await patchWithdrawal(env, path, request, isAdminUser);
      }
      if (method === "POST" && path === "/api/admin/versions") {
        return await createVersion(env, request, userId, isAdminUser);
      }
      if (method === "PATCH" && path.match(/^\/api\/admin\/versions\/\d+$/)) {
        return await patchVersion(env, path, request, userId, isAdminUser);
      }
      if (method === "GET" && path.match(/^\/api\/admin\/releases\/\d+$/)) {
        return await getAdminRelease(env, path, isAdminUser);
      }
      if (method === "PATCH" && path.match(/^\/api\/admin\/releases\/\d+$/)) {
        return await adminPatchRelease(env, userId, request);
      }
      if (method === "GET" && path.match(/^\/api\/admin\/settings\/[^/]+$/)) {
        return await getSetting(env, path, isAdminUser);
      }
      if (method === "POST" && path.match(/^\/api\/admin\/settings\/[^/]+$/)) {
        return await upsertSetting(env, path, request, isAdminUser);
      }
      if (method === "POST" && path.match(/^\/api\/admin\/users\/[^/]+\/notifications$/)) {
        return await createNotification(env, userId, path, request, isAdminUser);
      }
      if (method === "GET" && path.match(/^\/api\/admin\/users\/[^/]+\/finances$/)) {
        return await getFinances(env, userId, path, isAdminUser);
      }
      if (method === "POST" && path.match(/^\/api\/admin\/users\/[^/]+\/finances$/)) {
        return await createFinance(env, userId, path, request, isAdminUser);
      }
      if (method === "PATCH" && path.match(/^\/api\/admin\/users\/[^/]+\/finances\/\d+$/)) {
        return await patchFinance(env, userId, path, request, isAdminUser);
      }
      if (method === "DELETE" && path.match(/^\/api\/admin\/users\/[^/]+\/finances\/\d+$/)) {
        return await deleteFinance(env, userId, path, isAdminUser);
      }

      if (method === "POST" && path === "/api/feats") {
        return await createFeat(env, userId, request);
      }


      const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
      if (userMatch) {
        const uid = userMatch[1];
        const isSelf = uid === userId;
        if (!isSelf && !isAdminUser) {
          return corsJson({ error: "Accès non autorisé" }, 403);
        }
        if (method === "GET") return await getUser(env, uid);
        if (method === "PUT") return await upsertUser(env, uid, request);
        if (method === "PATCH") return await patchUser(env, uid, request);
      }


      const userArtistsMatch = path.match(/^\/api\/users\/([^/]+)\/artists$/);
      if (userArtistsMatch) {
        const uid = userArtistsMatch[1];
        const isSelf = uid === userId;
        if (!isSelf && !isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
        if (method === "GET") return await getUserArtists(env, uid);
        if (method === "POST") return await createArtist(env, uid, request);
      }

      const userArtistMatch = path.match(/^\/api\/users\/([^/]+)\/artists\/(\d+)$/);
      if (userArtistMatch) {
        const uid = userArtistMatch[1];
        const artistId = userArtistMatch[2];
        const isSelf = uid === userId;
        if (!isSelf && !isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
        if (method === "PATCH") return await patchArtist(env, uid, artistId, request);
      }


      const userReleasesMatch = path.match(/^\/api\/users\/([^/]+)\/releases$/);
      if (userReleasesMatch) {
        const uid = userReleasesMatch[1];
        const isSelf = uid === userId;
        if (!isSelf && !isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
        if (method === "GET") return await getUserReleases(env, uid);
        if (method === "POST") return await createRelease(env, uid, request);
      }

      const userReleaseMatch = path.match(/^\/api\/users\/([^/]+)\/releases\/(\d+)$/);
      if (userReleaseMatch) {
        const uid = userReleaseMatch[1];
        const releaseId = userReleaseMatch[2];
        const isSelf = uid === userId;
        if (!isSelf && !isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
        if (method === "PATCH") return await patchRelease(env, uid, releaseId, request);
        if (method === "GET") return await getRelease(env, uid, releaseId);
      }


      if (method === "POST" && path === "/api/reviews") {
        return await upsertReview(env, request);
      }


      const uploadMatch = path.match(/^\/api\/upload\/(.+)$/);
      if (uploadMatch && method === "POST") {
        const type = uploadMatch[1];
        return await uploadFile(env, userId, type, request);
      }

      return corsJson({ error: "Route non trouvée" }, 404);

    } catch (err) {
      console.error("Worker error:", err);
      return corsJson({ error: `Erreur interne: ${err.message}` }, 500);
    }
  }
};





function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function corsResponse(body, status = 200) {
  return new Response(body, { status, headers: corsHeaders() });
}

function corsJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

/**
 * Extraire l'UID utilisateur depuis le token Firebase Auth (Bearer token JWT)
 */
async function extractUserId(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split("Bearer ")[1];
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || payload.user_id || null;
  } catch {
    return null;
  }
}





async function getUser(env, uid) {
  const row = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
  if (!row) return corsJson({ error: "Utilisateur non trouvé" }, 404);
  return corsJson(formatUserRow(row));
}

async function getMe(env, uid) {
  const row = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
  if (!row) return corsJson({ error: "Utilisateur non trouvé" }, 404);
  return corsJson({ user: formatUserRow(row) });
}

async function getPublicRelease(env, releaseId) {
  const row = await env.DB.prepare("SELECT * FROM releases WHERE id = ?").bind(releaseId).first();
  if (!row) return corsJson({ error: "Sortie non trouvée" }, 404);
  return corsJson(formatReleaseRow(row));
}

async function getAdminRelease(env, path, isAdminUser) {
  if (!isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const releaseId = path.split('/').pop();
  const row = await env.DB.prepare("SELECT * FROM releases WHERE id = ?").bind(releaseId).first();
  if (!row) return corsJson({ error: "Sortie non trouvée" }, 404);
  return corsJson(formatReleaseRow(row));
}

async function getSetting(env, path, isAdminUser) {
  if (!isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const key = path.split('/').pop();
  const row = await env.DB.prepare("SELECT * FROM settings WHERE key = ?").bind(key).first();
  if (!row) return corsJson({ error: "Setting non trouvé" }, 404);
  let value = null;
  try { value = JSON.parse(row.value); } catch { value = row.value; }
  return corsJson({ key: row.key, value, updatedAt: row.updated_at });
}

async function upsertSetting(env, path, request, isAdminUser) {
  if (!isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const key = path.split('/').pop();
  const data = await request.json();
  const now = new Date().toISOString();
  const value = JSON.stringify(data.value !== undefined ? data.value : data);
  await env.DB.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(key, value, now).run();
  return corsJson({ success: true, key, value: data.value !== undefined ? data.value : data }, 201);
}

async function adminPatchRelease(env, userId, request) {
  if (!await isAdmin(env, userId)) return corsJson({ error: "Accès non autorisé" }, 403);
  const path = new URL(request.url).pathname;
  const releaseId = path.split('/').pop();
  const release = await env.DB.prepare("SELECT * FROM releases WHERE id = ?").bind(releaseId).first();
  if (!release) return corsJson({ error: "Sortie non trouvée" }, 404);

  return await patchRelease(env, release.user_uid, releaseId, request);
}

async function listUsers(env, userId, isAdminUser) {
  if (!isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  return corsJson(results.map(formatUserRow));
}

async function getAllMessages(env, userId, isAdminUser) {
  if (!isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const { results } = await env.DB.prepare("SELECT * FROM messages ORDER BY created_at DESC").all();
  return corsJson(results.map(r => ({
    id: r.id,
    email: r.email,
    message: r.message,
    createdAt: r.created_at
  })));
}

async function getAllWithdrawals(env, userId, isAdminUser) {
  if (!isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const { results } = await env.DB.prepare("SELECT * FROM withdrawals ORDER BY created_at DESC").all();
  return corsJson(results.map(r => ({
    id: r.id,
    userUid: r.user_uid,
    userEmail: r.user_email,
    amount: r.amount,
    iban: r.iban,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  })));
}

async function patchWithdrawal(env, userId, path, request, isAdminUser) {
  if (!isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const withdrawalId = path.split('/').pop();
  const data = await request.json();
  const now = new Date().toISOString();

  const fields = [];
  const values = [];
  if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
  if (data.userEmail !== undefined) { fields.push("user_email = ?"); values.push(data.userEmail); }
  if (data.amount !== undefined) { fields.push("amount = ?"); values.push(data.amount); }
  if (data.iban !== undefined) { fields.push("iban = ?"); values.push(data.iban); }
  if (fields.length === 0) return corsJson({ error: "Aucun champ à mettre à jour" }, 400);
  fields.push("updated_at = ?"); values.push(now);
  values.push(withdrawalId);

  await env.DB.prepare(`UPDATE withdrawals SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  return corsJson({ success: true });
}

async function createVersion(env, request, userId, isAdminUser) {
  if (!isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const data = await request.json();
  const now = new Date().toISOString();
  const result = await env.DB.prepare("INSERT INTO versions (version, description, date) VALUES (?, ?, ?)").bind(
    data.version,
    data.description || null,
    data.date || now
  ).run();
  return corsJson({ success: true, id: result.meta.last_row_id }, 201);
}

async function patchVersion(env, path, request, userId, isAdminUser) {
  if (!isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const versionId = path.split('/').pop();
  const data = await request.json();
  const sets = [];
  const values = [];
  if (data.version !== undefined) { sets.push("version = ?"); values.push(data.version); }
  if (data.description !== undefined) { sets.push("description = ?"); values.push(data.description); }
  if (data.date !== undefined) { sets.push("date = ?"); values.push(data.date); }
  if (sets.length === 0) return corsJson({ error: "Aucun champ à mettre à jour" }, 400);
  values.push(versionId);
  await env.DB.prepare(`UPDATE versions SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
  return corsJson({ success: true });
}

async function createNotification(env, userId, path, request, isAdminUser) {
  if (!isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const uid = path.split('/')[3];
  const data = await request.json();
  const now = new Date().toISOString();

  await env.DB.prepare("INSERT INTO notifications (user_uid, titre, notif, read, created_at) VALUES (?, ?, ?, ?, ?)").bind(
    uid,
    data.titre || null,
    data.notif || null,
    data.read ? 1 : 0,
    now
  ).run();
  return corsJson({ success: true }, 201);
}

async function getFinances(env, userId, path, isAdminUser) {
  const uid = path.split('/')[3];
  if (uid !== userId && !isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const { results } = await env.DB.prepare("SELECT * FROM finances WHERE user_uid = ? ORDER BY created_at DESC").bind(uid).all();
  return corsJson(results.map(r => ({
    id: r.id,
    userUid: r.user_uid,
    amount: r.amount,
    period: r.period,
    releaseId: r.release_id,
    releaseTitle: r.release_title,
    artistName: r.artist_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  })));
}

async function createFinance(env, userId, path, request, isAdminUser) {
  const uid = path.split('/')[3];
  if (uid !== userId && !isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const data = await request.json();
  const now = new Date().toISOString();
  const result = await env.DB.prepare("INSERT INTO finances (user_uid, amount, period, release_id, release_title, artist_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(
    uid,
    data.amount || 0,
    data.period || null,
    data.releaseId || null,
    data.releaseTitle || null,
    data.artistName || null,
    now,
    now
  ).run();
  return corsJson({ success: true, id: result.meta.last_row_id }, 201);
}

async function patchFinance(env, userId, path, request, isAdminUser) {
  const parts = path.split('/');
  const uid = parts[3];
  const financeId = parts[5];
  if (uid !== userId && !isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  const data = await request.json();
  const sets = [];
  const values = [];
  if (data.amount !== undefined) { sets.push("amount = ?"); values.push(data.amount); }
  if (data.period !== undefined) { sets.push("period = ?"); values.push(data.period); }
  if (data.releaseId !== undefined) { sets.push("release_id = ?"); values.push(data.releaseId); }
  if (data.releaseTitle !== undefined) { sets.push("release_title = ?"); values.push(data.releaseTitle); }
  if (data.artistName !== undefined) { sets.push("artist_name = ?"); values.push(data.artistName); }
  if (sets.length === 0) return corsJson({ error: "Aucun champ à mettre à jour" }, 400);
  sets.push("updated_at = ?"); values.push(new Date().toISOString());
  values.push(financeId, uid);
  await env.DB.prepare(`UPDATE finances SET ${sets.join(', ')} WHERE id = ? AND user_uid = ?`).bind(...values).run();
  return corsJson({ success: true });
}

async function deleteFinance(env, userId, path, isAdminUser) {
  const parts = path.split('/');
  const uid = parts[3];
  const financeId = parts[5];
  if (uid !== userId && !isAdminUser) return corsJson({ error: "Accès non autorisé" }, 403);
  await env.DB.prepare("DELETE FROM finances WHERE id = ? AND user_uid = ?").bind(financeId, uid).run();
  return corsJson({ success: true });
}

async function isAdmin(env, uid) {
  const row = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
  return row && row.role === "admin";
}

async function upsertUser(env, uid, request) {
  const data = await request.json();
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO users (uid, first_name, last_name, full_name, artist_name, email, address, city, postal_code, iban, photo_url, role, auth_method, plan_name, subscription_status, theme, totp_enabled, totp_secret, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      full_name = excluded.full_name,
      artist_name = excluded.artist_name,
      email = excluded.email,
      address = excluded.address,
      city = excluded.city,
      postal_code = excluded.postal_code,
      iban = excluded.iban,
      photo_url = excluded.photo_url,
      role = excluded.role,
      auth_method = excluded.auth_method,
      plan_name = excluded.plan_name,
      subscription_status = excluded.subscription_status,
      theme = excluded.theme,
      totp_enabled = excluded.totp_enabled,
      totp_secret = excluded.totp_secret,
      updated_at = excluded.updated_at
  `).bind(
    uid,
    data.firstName || null,
    data.lastName || null,
    data.fullName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}`.trim() : null),
    data.artistName || null,
    data.email || null,
    data.address || null,
    data.city || null,
    data.postalCode || null,
    data.iban || null,
    data.photoURL || null,
    data.role || "user",
    data.authMethod || "password",
    data.planName || null,
    data.subscriptionStatus || null,
    data.theme || "normal-auto",
    data.totpEnabled ? 1 : 0,
    data.totpSecret || null,
    data.createdAt || now,
    now
  ).run();

  return corsJson({ success: true });
}

async function patchUser(env, uid, request) {
  const data = await request.json();
  const now = new Date().toISOString();

  const fieldMap = {
    firstName: "first_name",
    lastName: "last_name",
    fullName: "full_name",
    artistName: "artist_name",
    email: "email",
    address: "address",
    city: "city",
    postalCode: "postal_code",
    iban: "iban",
    photoURL: "photo_url",
    role: "role",
    authMethod: "auth_method",
    planName: "plan_name",
    subscriptionStatus: "subscription_status",
    theme: "theme",
    totpEnabled: "totp_enabled",
    totpSecret: "totp_secret",
  };

  const sets = [];
  const values = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      sets.push(`${column} = ?`);
      if (key === "totpEnabled") {
        values.push(data[key] ? 1 : 0);
      } else {
        values.push(data[key]);
      }
    }
  }

  if (sets.length === 0) {
    return corsJson({ error: "Aucun champ à mettre à jour" }, 400);
  }

  sets.push("updated_at = ?");
  values.push(now);
  values.push(uid);

  await env.DB.prepare(`UPDATE users SET ${sets.join(", ")} WHERE uid = ?`).bind(...values).run();

  return corsJson({ success: true });
}

function formatUserRow(row) {
  if (!row) return null;
  return {
    uid: row.uid,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    artistName: row.artist_name,
    email: row.email,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    iban: row.iban,
    photoURL: row.photo_url,
    role: row.role,
    authMethod: row.auth_method,
    planName: row.plan_name,
    subscriptionStatus: row.subscription_status,
    theme: row.theme,
    totpEnabled: !!row.totp_enabled,
    totpSecret: row.totp_secret,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}





async function getAllArtists(env) {
  const { results } = await env.DB.prepare("SELECT * FROM artists ORDER BY name ASC").all();
  return corsJson(results.map(formatArtistRow));
}

async function getAllFeats(env) {
  const { results } = await env.DB.prepare("SELECT * FROM artists WHERE feat IS NOT NULL AND feat != '' ORDER BY name ASC").all();
  return corsJson(results.map(formatArtistRow));
}

async function createFeat(env, uid, request) {
  const data = await request.json();
  const now = new Date().toISOString();

  const result = await env.DB.prepare(`
    INSERT INTO artists (user_uid, name, primary_genre, feat, toolost_artist_id, spotify_id, apple_music_id, audiomack_id, even_artist_id, facebook_url, instagram_url, youtube_url, photo, contact_email, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    uid,
    data.name,
    data.primaryGenre || null,
    JSON.stringify(data.links || {}),
    data.toolost_artist_id || null,
    data.spotify_id || null,
    data.apple_music_id || null,
    data.audiomack_id || null,
    data.even_artist_id || null,
    data.facebookUrl || null,
    data.instagramUrl || null,
    data.youtubeUrl || null,
    data.photo || null,
    data.contactEmail || null,
    now
  ).run();

  return corsJson({ success: true, id: result.meta.last_row_id }, 201);
}

async function getUserArtists(env, uid) {
  const { results } = await env.DB.prepare("SELECT * FROM artists WHERE user_uid = ? ORDER BY name ASC").bind(uid).all();
  return corsJson(results.map(formatArtistRow));
}

async function createArtist(env, uid, request) {
  const data = await request.json();
  const now = new Date().toISOString();

  const result = await env.DB.prepare(`
    INSERT INTO artists (user_uid, name, primary_genre, feat, toolost_artist_id, spotify_id, apple_music_id, audiomack_id, even_artist_id, facebook_url, instagram_url, youtube_url, photo, contact_email, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    uid,
    data.name,
    data.primaryGenre || null,
    data.feat || null,
    data.toolost_artist_id || null,
    data.spotify_id || null,
    data.apple_music_id || null,
    data.audiomack_id || null,
    data.even_artist_id || null,
    data.facebookUrl || null,
    data.instagramUrl || null,
    data.youtubeUrl || null,
    data.photo || null,
    data.contactEmail || null,
    data.createdAt || now
  ).run();

  return corsJson({ success: true, id: result.meta.last_row_id }, 201);
}

async function patchArtist(env, uid, artistId, request) {
  const data = await request.json();

  const fieldMap = {
    name: "name",
    primaryGenre: "primary_genre",
    feat: "feat",
    toolost_artist_id: "toolost_artist_id",
    spotify_id: "spotify_id",
    apple_music_id: "apple_music_id",
    audiomack_id: "audiomack_id",
    even_artist_id: "even_artist_id",
    facebookUrl: "facebook_url",
    instagramUrl: "instagram_url",
    youtubeUrl: "youtube_url",
    photo: "photo",
    contactEmail: "contact_email",
  };

  const sets = [];
  const values = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      sets.push(`${column} = ?`);
      values.push(data[key]);
    }
  }

  if (sets.length === 0) return corsJson({ error: "Aucun champ à mettre à jour" }, 400);

  values.push(artistId, uid);
  await env.DB.prepare(`UPDATE artists SET ${sets.join(", ")} WHERE id = ? AND user_uid = ?`).bind(...values).run();

  return corsJson({ success: true });
}

function formatArtistRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userUid: row.user_uid,
    name: row.name,
    primaryGenre: row.primary_genre,
    feat: row.feat,
    toolost_artist_id: row.toolost_artist_id,
    spotify_id: row.spotify_id,
    apple_music_id: row.apple_music_id,
    audiomackId: row.audiomack_id,
    evenArtistId: row.even_artist_id,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    youtubeUrl: row.youtube_url,
    photo: row.photo,
    contactEmail: row.contact_email,
    createdAt: row.created_at,
  };
}





async function getAllReleases(env, url) {
  const status = url.searchParams.get("status");
  const catalog = url.searchParams.get("catalog");
  const artistName = url.searchParams.get("artistName");

  let query = "SELECT * FROM releases WHERE 1=1";
  const bindings = [];

  if (status) {
    query += " AND status = ?";
    bindings.push(status);
  }
  if (catalog === "true" || catalog === "1") {
    query += " AND show_on_mmcp_catalog = 1";
  }
  if (artistName) {
    query += " AND LOWER(artist_name) = LOWER(?)";
    bindings.push(artistName);
  }

  query += " ORDER BY release_date DESC";

  const { results } = await env.DB.prepare(query).bind(...bindings).all();
  return corsJson(results.map(formatReleaseRow));
}

async function getUserReleases(env, uid) {
  const { results } = await env.DB.prepare("SELECT * FROM releases WHERE user_uid = ? ORDER BY release_date DESC").bind(uid).all();
  return corsJson(results.map(formatReleaseRow));
}

async function getRelease(env, uid, releaseId) {
  const row = await env.DB.prepare("SELECT * FROM releases WHERE id = ? AND user_uid = ?").bind(releaseId, uid).first();
  if (!row) return corsJson({ error: "Sortie non trouvée" }, 404);
  return corsJson(formatReleaseRow(row));
}

async function createRelease(env, uid, request) {
  const data = await request.json();
  const now = new Date().toISOString();

  let rawData = data.data;
  if (!rawData && (data.tracks || data.feats || data.primaryGenre || data.language || data.isInstrumental !== undefined)) {
    rawData = {
      tracks: data.tracks || [],
      feats: data.feats || [],
      primaryGenre: data.primaryGenre || null,
      language: data.language || null,
      isInstrumental: data.isInstrumental || false
    };
  }

  const result = await env.DB.prepare(`
    INSERT INTO releases (user_uid, artist_name, title, type, release_date, cover_url, status, show_on_mmcp_catalog, upc, isrc, data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    uid,
    data.artistName || null,
    data.title || null,
    data.type || null,
    data.releaseDate || null,
    data.coverUrl || null,
    data.status || "draft",
    data.showOnMmcpCatalog ? 1 : 0,
    data.upc || null,
    data.isrc || null,
    rawData ? JSON.stringify(rawData) : null,
    now
  ).run();

  return corsJson({ success: true, id: result.meta.last_row_id }, 201);
}

async function patchRelease(env, uid, releaseId, request) {
  const data = await request.json();

  const existingRow = await env.DB.prepare("SELECT data FROM releases WHERE id = ? AND user_uid = ?").bind(releaseId, uid).first();
  let existingDataJson = {};
  try {
    if (existingRow && existingRow.data) {
      existingDataJson = JSON.parse(existingRow.data) || {};
    }
  } catch {
    existingDataJson = {};
  }

  if (data.tracks !== undefined) existingDataJson.tracks = data.tracks;
  if (data.feats !== undefined) existingDataJson.feats = data.feats;
  if (data.primaryGenre !== undefined) existingDataJson.primaryGenre = data.primaryGenre;
  if (data.language !== undefined) existingDataJson.language = data.language;
  if (data.isInstrumental !== undefined) existingDataJson.isInstrumental = data.isInstrumental;

  if (data.data && typeof data.data === "object") {
    existingDataJson = { ...existingDataJson, ...data.data };
  }

  const fieldMap = {
    artistName: "artist_name",
    title: "title",
    type: "type",
    releaseDate: "release_date",
    coverUrl: "cover_url",
    status: "status",
    showOnMmcpCatalog: "show_on_mmcp_catalog",
    upc: "upc",
    isrc: "isrc",
  };

  const sets = [];
  const values = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      sets.push(`${column} = ?`);
      if (key === "showOnMmcpCatalog") {
        values.push(data[key] ? 1 : 0);
      } else {
        values.push(data[key]);
      }
    }
  }

  sets.push("data = ?");
  values.push(Object.keys(existingDataJson).length > 0 ? JSON.stringify(existingDataJson) : null);

  if (sets.length === 1 && !data.data && data.tracks === undefined && data.feats === undefined) {
    return corsJson({ error: "Aucun champ à mettre à jour" }, 400);
  }

  values.push(releaseId, uid);
  await env.DB.prepare(`UPDATE releases SET ${sets.join(", ")} WHERE id = ? AND user_uid = ?`).bind(...values).run();

  return corsJson({ success: true });
}

function formatReleaseRow(row) {
  if (!row) return null;
  let parsedData = null;
  try {
    parsedData = row.data ? JSON.parse(row.data) : {};
  } catch {
    parsedData = {};
  }

  return {
    id: row.id,
    userUid: row.user_uid,
    artistName: row.artist_name,
    title: row.title,
    type: row.type,
    releaseDate: row.release_date,
    coverUrl: row.cover_url,
    status: row.status,
    showOnMmcpCatalog: !!row.show_on_mmcp_catalog,
    upc: row.upc,
    isrc: row.isrc,
    data: parsedData,
    tracks: parsedData.tracks || [],
    feats: parsedData.feats || [],
    primaryGenre: parsedData.primaryGenre || null,
    language: parsedData.language || null,
    isInstrumental: parsedData.isInstrumental || false,
    createdAt: row.created_at,
  };
}





async function getAllReviews(env) {
  const { results } = await env.DB.prepare("SELECT * FROM reviews ORDER BY updated_at DESC").all();
  return corsJson(results.map(r => ({
    id: r.id,
    artistName: r.artist_name,
    rating: r.rating,
    message: r.message,
    updatedAt: r.updated_at,
  })));
}

async function upsertReview(env, request) {
  const data = await request.json();
  const now = new Date().toISOString();
  const id = data.id || (data.artistName ? data.artistName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_") : `review_${Date.now()}`);

  await env.DB.prepare(`
    INSERT INTO reviews (id, artist_name, rating, message, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      rating = excluded.rating,
      message = excluded.message,
      updated_at = excluded.updated_at
  `).bind(id, data.artistName || "", data.rating || 0, data.message || "", now).run();

  return corsJson({ success: true });
}





async function createMessage(env, request) {
  const data = await request.json();
  const now = new Date().toISOString();

  if (!data.email || !data.message) {
    return corsJson({ error: "Email et message requis" }, 400);
  }

  await env.DB.prepare(`INSERT INTO messages (email, message, created_at) VALUES (?, ?, ?)`).bind(data.email, data.message, now).run();

  return corsJson({ success: true }, 201);
}





async function getAllVersions(env) {
  const { results } = await env.DB.prepare("SELECT * FROM versions ORDER BY date DESC").all();
  return corsJson(results);
}





async function uploadFile(env, userId, type, request) {
  const contentType = request.headers.get("Content-Type") || "application/octet-stream";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return corsJson({ error: "Aucun fichier fourni" }, 400);

    const originalName = file.name || "file.bin";
    const ext = originalName.split(".").pop() || "bin";
    const key = `${type}/${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    await env.STORAGE.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || contentType },
    });

    return corsJson({ success: true, key, url: `/api/files/${key}` });
  }

  const ext = type === "avatar" ? "png" : "bin";
  const key = `${type}/${userId}/${Date.now()}.${ext}`;

  await env.STORAGE.put(key, request.body, {
    httpMetadata: { contentType },
  });

  return corsJson({ success: true, key, url: `/api/files/${key}` });
}

async function serveFile(env, key) {
  const object = await env.STORAGE.get(key);
  if (!object) return corsResponse("Not Found", 404);

  const headers = new Headers(corsHeaders());
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000");

  return new Response(object.body, { headers });
}