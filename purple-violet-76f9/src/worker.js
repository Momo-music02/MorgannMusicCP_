export default {
  async fetch(request, env) {
    // 1. Gestion du CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
      });
    }

    const url = new URL(request.url);
    const cleanPathname = url.pathname.replace(/\/$/, "");

    // On n'autorise que nos deux routes
    if (cleanPathname !== "/liaison-artiste" && cleanPathname !== "/sync-artist") {
      return new Response(JSON.stringify({ error: "Route non trouvée" }), {
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
      });
    }

    // 2. Validation de l'authentification Firebase Auth
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentification requise" }), {
        status: 401,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      // Décodage du Token Firebase
      const tokenParts = idToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error("Format de token invalide");
      }
      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const userId = payload.sub;

      if (!userId) {
        return new Response(JSON.stringify({ error: "Utilisateur introuvable dans le token" }), {
          status: 401,
          headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
        });
      }

      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
          status: 405,
          headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
        });
      }

      // =========================================================================
      // ROUTE A : SYNCHRONISATION D'UN ARTISTE EXISTANT (/sync-artist)
      // =========================================================================
      if (cleanPathname === "/sync-artist") {
        try {
          const { firestore_doc_id, toolost_artist_id } = await request.json();

          if (!firestore_doc_id || !toolost_artist_id) {
            return new Response(JSON.stringify({ error: "Champs obligatoires manquants" }), {
              status: 400,
              headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
            });
          }

          // Authentification Too Lost
          let tooLostToken = await getTooLostAccessToken(env);

          // Récupération des infos de Too Lost
          const tooLostResponse = await fetch(`https://api.toolost.com/v1/artists/${toolost_artist_id}`, {
            headers: { "Authorization": `Bearer ${tooLostToken}` }
          });

          if (!tooLostResponse.ok) {
            return new Response(JSON.stringify({ error: "Artiste introuvable sur Too Lost" }), {
              status: 404,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }
          const tooLostData = await tooLostResponse.json();

          // Extraction des données fraîches de l'API
          const name = tooLostData.data?.name || "Morgann Music";
          const primaryGenre = tooLostData.data?.genre || tooLostData.data?.primary_genre || "Non défini";
          const audiomackId = tooLostData.data?.audiomack_id || tooLostData.data?.audiomack || "";
          const evenArtistId = tooLostData.data?.even_artist_id || "136789";
          const spotifyId = tooLostData.data?.spotify_id || "";
          const appleMusicId = tooLostData.data?.apple_music_id || "";

          // Réseaux Sociaux
          const facebookUrl = tooLostData.data?.socials?.facebook || "";
          const instagramUrl = tooLostData.data?.socials?.instagram || "";
          const youtubeUrl = tooLostData.data?.socials?.youtube || "";

          // Mise à jour (PATCH) dans D1 via l'API Worker centralisée
          const apiWorkerUrl = `https://mon-site-api.morgann-rachedi.workers.dev/api/users/${userId}/artists/${firestore_doc_id}`;

          const d1Response = await fetch(apiWorkerUrl, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": authHeader
            },
            body: JSON.stringify({
              name,
              primaryGenre,
              audiomackId,
              evenArtistId,
              spotify_id: spotifyId,
              apple_music_id: appleMusicId,
              facebookUrl,
              instagramUrl,
              youtubeUrl
            })
          });

          if (!d1Response.ok) {
            const errText = await d1Response.text();
            throw new Error(`Erreur d'écriture D1 : ${errText}`);
          }

          return new Response(JSON.stringify({
            success: true,
            message: "Artiste mis à jour",
            genre: primaryGenre,
            instagramUrl,
            facebookUrl,
            evenArtistId
          }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });

        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }

      // =========================================================================
      // ROUTE B : CRÉATION / LIAISON D'UN NOUVEL ARTISTE (/liaison-artiste)
      // =========================================================================
      if (cleanPathname === "/liaison-artiste") {
        const { name, genre, feat, spotifyId, appleMusicId } = await request.json();

        if (!name) {
          return new Response(JSON.stringify({ error: "Le nom de l'artiste est obligatoire" }), {
            status: 400,
            headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
          });
        }

        // Authentification auprès de Too Lost
        let tooLostToken = await getTooLostAccessToken(env);

        // Soumission à l'API Too Lost
        const tooLostResponse = await fetch("https://api.toolost.com/v1/preferences/artist/submit", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${tooLostToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: null,
            artistName: name,
            primaryGenre: genre || "Electronic",
            metadata: {
              artists: [{ name: name, role: "Main Artist" }]
            },
            platforms: {
              spotify: spotifyId ? `https://open.spotify.com/artist/${spotifyId}` : null,
              appleMusic: appleMusicId ? `https://music.apple.com/artist/${appleMusicId}` : null
            }
          })
        });

        if (!tooLostResponse.ok) {
          const errText = await tooLostResponse.text();
          return new Response(JSON.stringify({ error: `Erreur retournée par Too Lost: ${errText}` }), {
            status: tooLostResponse.status,
            headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
          });
        }

        const tooLostResult = await tooLostResponse.json();
        const tooLostArtistId = tooLostResult.id || "Liaison OK";

        // Enregistrement du NOUVEL artiste dans D1 via POST
        try {
          await saveArtistToD1(env, userId, {
            name,
            primaryGenre: genre || "Non défini",
            feat: feat || "",
            toolost_artist_id: tooLostArtistId,
            spotify_id: spotifyId || "",
            apple_music_id: appleMusicId || "",
            createdAt: new Date().toISOString()
          }, authHeader);
        } catch (d1Error) {
          return new Response(JSON.stringify({
            error: `Artiste créé sur Too Lost (${tooLostArtistId}) mais échec de l'enregistrement D1: ${d1Error.message}`
          }), {
            status: 500,
            headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          toolost_artist_id: tooLostArtistId,
          name
        }), {
          status: 201,
          headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
        });
      }

    } catch (err) {
      return new Response(JSON.stringify({ error: `Crash interne du Worker: ${err.message}` }), {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
      });
    }
  }
};

// ==========================================
// FONCTIONS UTILES (HELPERS)
// ==========================================

async function getTooLostAccessToken(env) {
  const clientId = env.TOOLOST_CLIENT_ID;
  const clientSecret = env.TOOLOST_CLIENT_SECRET;
  const refreshToken = env.TOOLOST_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Identifiants ou Refresh Token manquants dans Cloudflare.");
  }

  const res = await fetch("https://toolost.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    })
  });

  if (!res.ok) {
    const errPayload = await res.text();
    throw new Error(`Échec du rafraîchissement du token : Code ${res.status} - ${errPayload}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function saveArtistToD1(env, userId, artistData, authHeader) {
  const url = `https://mon-site-api.morgann-rachedi.workers.dev/api/users/${userId}/artists`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader
    },
    body: JSON.stringify(artistData)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText);
  }
}