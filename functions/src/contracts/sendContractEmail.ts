import { logger } from "firebase-functions";

export async function sendContractEmail(params: { to: string; customerName: string; trackName: string; contractId: string; signedPdfUrl: string; }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    logger.warn("RESEND_API_KEY absente, email non envoyé", { contractId: params.contractId });
    return;
  }

  const from = process.env.CONTRACT_EMAIL_FROM || "contracts@mm-cp.uk";
  const subject = `Contrat signé - ${params.trackName}`;
  const html = `
    <p>Bonjour ${params.customerName},</p>
    <p>Ton contrat de licence exclusive est signé.</p>
    <p><a href="${params.signedPdfUrl}">Télécharger le PDF signé</a></p>
    <p>ID contrat: ${params.contractId}</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject,
      html
    })
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("Email contrat: échec envoi", { status: response.status, body, contractId: params.contractId });
  }
}
