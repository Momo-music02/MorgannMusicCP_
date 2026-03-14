const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const { Resend } = require("resend");
const app = express();
const stripeCheckout = require("./stripe-checkout");

app.use(express.json());

const mmcpDir = __dirname;
const siteRootDir = path.resolve(__dirname, "..");
const mmcpPlayDir = path.join(siteRootDir, "MMCP Play");

app.use(express.static(mmcpDir));
app.use(stripeCheckout);
app.use("/MMCP Play", express.static(mmcpPlayDir));
app.use("/MMCP%20Play", express.static(mmcpPlayDir));

const allowedOrigins = new Set([
    "http://localhost:2000",
    "http://127.0.0.1:2000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://mm-cp.uk",
    "https://www.mm-cp.uk"
]);

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    return next();
});

const resendApiKey = process.env.RESEND_API_KEY || "re_HgA8T82a_NtjKSVci8LWLjv2LF37KEkv9";
const resendFrom = process.env.RESEND_FROM || "mmcp-production@mm-cp.uk";
const dashboardUrl = "https://mm-cp.uk/dash/";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const USERS_FILE = "./users.json";

function escapeHtml(text) {
        return String(text || "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#39;");
}

function buildEmailHtml({ headline }) {
        const safeHeadline = escapeHtml(headline);
        const safeUrl = escapeHtml(dashboardUrl);

        return `
<!doctype html>
<html lang="fr">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>MMCP Notification</title>
    </head>
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#111827;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
                        <tr>
                            <td style="background:#111827;color:#ffffff;padding:22px 24px;font-size:18px;font-weight:700;">Morgann Music CP</td>
                        </tr>
                        <tr>
                            <td style="padding:24px;">
                                <p style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:700;">${safeHeadline}</p>
                                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">Il y a une notif sur ton dashboard artiste.</p>
                                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">Voir la notification</a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>`;
}

app.post("/api/email/artist-notification", async (req, res) => {
        const { toEmail, type, variables } = req.body || {};
        const email = String(toEmail || "").trim();
        const eventType = String(type || "notification").trim().toLowerCase();

        if (!email) {
            return res.status(400).json({ error: "toEmail est requis" });
        }

        if (!["notification", "status"].includes(eventType)) {
            return res.status(400).json({ error: "type invalide" });
        }

        if (!resend) {
            return res.status(500).json({ error: "RESEND_API_KEY manquant" });
        }

        // Envoi ciblé avec resend.emails.send
        try {
            const result = await resend.emails.send({
                from: 'Morgann Music CP <notifiction-noreply@mm-cp.uk>',
                to: email,
                subject: 'Nouvelle notification disponible',
                html: '<h1>Bonjour</h1><p>Vous avez une nouvelle notification sur votre espace Morgann Music CP.</p>'
            });
            return res.json({ success: true, id: result?.data?.id || null });
        } catch (error) {
            console.error("Erreur Resend:", error);
            return res.status(500).json({
                error: "Envoi email impossible",
                details: error?.message || null,
                resendError: error?.response?.data || null
            });
        }
});

    app.get("/api/email/health", (_req, res) => {
        res.json({
            ok: true,
            resendConfigured: !!resend,
            from: resendFrom
        });
    });

/* REGISTER */
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    const users = JSON.parse(fs.readFileSync(USERS_FILE));

    const exists = users.find(u => u.email === email);
    if (exists) return res.status(400).json({ error: "Email déjà utilisé" });

    const hash = await bcrypt.hash(password, 10);

    users.push({
        id: Date.now(),
        username,
        email,
        password: hash,
        createdAt: new Date().toISOString(),
        stripeCustomerId: null
    });

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({ success: true });
});

/* LOGIN */
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));

    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: "Compte introuvable" });

    const ok = require("bcrypt").compareSync(password, user.password);
    if (!ok) return res.status(401).json({ error: "Mot de passe incorrect" });

    res.json({ success: true, userId: user.id });
});

app.listen(3000, () => {
    console.log("✅ Serveur lancé : http://localhost:3000");
});
