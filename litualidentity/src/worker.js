export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ status: "error", message: "Méthode non autorisée. Utilisez **POST**." }), { status: 405, headers });
    }

    try {
      const { image_base64, customer_email } = await request.json();

      if (!image_base64) {
        return new Response(JSON.stringify({ status: "error", message: "**Image manquante.** Veuillez fournir une pièce d'identité." }), { status: 400, headers });
      }

      // 1. Décoder l'image base64
      const cleanBase64 = image_base64.replace(/^data:image\/[^;]+;base64,/, "");
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 2. Appel à Litual Identity avec un prompt descriptif
      const promptVerification = `Describe this document in detail. Look at all the dates printed on this ID card.
Specifically locate and write down:
1. DATE DE NAISSANCE / DATE OF BIRTH (e.g. 13/01/2013 or 13 01 2013)
2. DATE D'EXPIRATION / EXPIRY DATE

Make sure to clearly state which date is the Date of Birth. If it is not a valid ID document, reply with INVALID_DOCUMENT.`;

      const visionResponse = await env.AI.run("@cf/llava-hf/llava-1.5-7b-hf", {
        prompt: promptVerification,
        image: Array.from(bytes),
      });

      const aiText = (visionResponse.description || visionResponse.response || "").trim();

      // 3. Sécurité : Vérification si le document n'est pas une pièce d'identité
      if (aiText.includes("INVALID_DOCUMENT") || aiText.includes("UNREADABLE")) {
        return new Response(
          JSON.stringify({
            status: "error",
            message: "### ❌ Document non valide\n\nCe fichier ne ressemble pas à une pièce d'identité officielle (Carte d'identité, Passeport, Permis). Veuillez envoyer un vrai justificatif d'identité net et lisible."
          }),
          { status: 422, headers }
        );
      }

      // 4. Extraction intelligente de la date de naissance
      // Priorité au bloc de texte qui mentionne "birth" ou "naissance"
      const birthLines = aiText.split('\n').filter(line => /birth|naissance|naiss/i.test(line));
      const targetText = birthLines.length > 0 ? birthLines.join(' ') : aiText;

      // Regex souple (/ - . ou espace)
      const dateMatch = targetText.match(/(\d{2})[\/\-\.\s](\d{2})[\/\-\.\s](\d{4})/);

      if (!dateMatch) {
        return new Response(
          JSON.stringify({
            status: "error",
            message: "### ❌ Erreur de lecture\n\nImpossible de détecter une date de naissance valide sur le document. Assurez-vous que l'image est **nette**, **bien éclairée** et qu'il s'agit d'une **pièce d'identité**."
          }),
          { status: 422, headers }
        );
      }

      const [, day, month, year] = dateMatch;
      const birthYear = Number(year);
      const birthMonth = Number(month);
      const birthDay = Number(day);

      // Vérification de cohérence (ex: pas 2027 ou 1800)
      const currentYear = new Date().getFullYear();
      if (birthYear < 1920 || birthYear > currentYear || birthMonth > 12 || birthDay > 31) {
        return new Response(
          JSON.stringify({
            status: "error",
            message: "### ❌ Date invalide\n\nLa date de naissance détectée est incohérente. Veuillez envoyer une photo plus claire."
          }),
          { status: 422, headers }
        );
      }

      const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
      const today = new Date();

      // 5. Calcul de l'âge exact
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // 6. Logique d'accès (-18 ans uniquement)
      if (age < 18 && age >= 5) {
        return new Response(JSON.stringify({
          status: "success",
          verified: true,
          message: `### ✅ Identité vérifiée !\n\nFélicitations ! Ton âge est de **${age} ans**.\nTu as désormais accès au plan **Future légende** (**0,99€/mois**).`,
          data: {
            age: age,
            years_until_major: 18 - age,
          }
        }), { headers });

      } else {
        return new Response(JSON.stringify({
          status: "denied",
          verified: false,
          message: `### ❌ Offre non disponible\n\nDésolé, le plan **Future légende** est exclusivement réservé aux artistes de **moins de 18 ans**.\n\nLe système a calculé un âge de **${age} ans**. Nous t'invitons à consulter nos autres plans.`,
        }), { status: 403, headers });
      }

    } catch (e) {
      return new Response(
        JSON.stringify({ status: "error", message: `**Erreur technique.**\nUne erreur est survenue lors du traitement : ${e.message}` }),
        { status: 500, headers }
      );
    }
  },
};