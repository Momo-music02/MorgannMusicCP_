document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    prenom: document.getElementById("prenom").value.trim(),
    nom: document.getElementById("nom").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    artist: document.getElementById("artist").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    confirm: document.getElementById("confirm").value
  };

  // 🔐 Règles mot de passe (OWASP)
  

  if (data.password !== data.confirm) {
    alert("Les mots de passe ne correspondent pas");
    return;
  }

  // ❌ jamais envoyer confirm au serveur
  delete data.confirm;

  try {
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbyiNnmYk3Jz8WtDReuGwX4CKRHZvQt05liL86hxWCYQ5ZIDZoZFgpDHRh5hSJ_IsSPPAg/exec",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "register",
          ...data
        })
      }
    );

    const text = await response.text();

    if (text === "OK") {
      alert("Compte créé avec succès ✅");
      window.location.href = "login.html";
    } else {
      alert(text);
    }

  } catch (err) {
    alert("Erreur réseau — réessayez plus tard");
  }
});

    const logo = document.getElementById('logo-dynamique');

    const logoClair = "logo.png";
    const logoSombre = "logo2.png";

    function setLogoBasedOnScheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            logo.src = logoSombre;
        } else {
            logo.src = logoClair;
        }
    }
