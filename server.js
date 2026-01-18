const express = require("express");
const fs = require("fs");
const bcrypt = require("bcrypt");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const USERS_FILE = "./users.json";

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
