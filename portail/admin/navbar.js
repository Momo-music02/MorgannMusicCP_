import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function chargerProfilNavbar(db, user) {
    if (!user) return;

    const avatarBox = document.getElementById("navbar-avatar");
    const sidebarAvatarBox = document.getElementById("sidebar-avatar");
    const modalAvatarBox = document.getElementById("modal-avatar");
    const sidebarNameBox = document.getElementById("sidebar-user-fullname");
    const modalNameBox = document.getElementById("modal-fullname");
    const modalEmailBox = document.getElementById("modal-email");

    try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        let photoUrl = user.photoURL || null;
        let firstName = "";
        let lastName = "";
        let fullName = user.displayName || user.email || "Administrateur";

        if (userSnap.exists()) {
            const data = userSnap.data();
            photoUrl = data.photoURL || data.photo || photoUrl;
            firstName = data.firstName || "";
            lastName = data.lastName || "";

            if (firstName || lastName) {
                fullName = `${firstName} ${lastName}`.trim();
            }
        }

        if (sidebarNameBox) sidebarNameBox.textContent = fullName;
        if (modalNameBox) modalNameBox.textContent = fullName;
        if (modalEmailBox) modalEmailBox.textContent = user.email || "";

        const initials = fullName.charAt(0).toUpperCase();

        if (photoUrl) {
            const imgHTML = `<img src="${photoUrl}" alt="PDP">`;
            if (avatarBox) avatarBox.innerHTML = imgHTML;
            if (sidebarAvatarBox) sidebarAvatarBox.innerHTML = imgHTML;
            if (modalAvatarBox) modalAvatarBox.innerHTML = imgHTML;
        } else {
            if (avatarBox) avatarBox.innerHTML = `<span>${initials}</span>`;
            if (sidebarAvatarBox) sidebarAvatarBox.innerHTML = `<span>${initials}</span>`;
            if (modalAvatarBox) modalAvatarBox.innerHTML = `<span>${initials}</span>`;
        }
    } catch (err) {
        console.error("Erreur lors du chargement du profil :", err);
    }
}