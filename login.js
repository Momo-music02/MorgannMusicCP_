
document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const res = await fetch("https://script.google.com/macros/s/AKfycbyiNnmYk3Jz8WtDReuGwX4CKRHZvQt05liL86hxWCYQ5ZIDZoZFgpDHRh5hSJ_IsSPPAg/exec", {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        email,
        password
      })
    });

    const text = await res.text();

    if (text === "OK") {
      localStorage.setItem("connected", "true");
      window.location.href = "index.html";
    } else {
      alert(text);
    }
  });

});



