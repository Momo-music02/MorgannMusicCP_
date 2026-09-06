import { auth } from "/assets/js/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { api } from "/assets/js/api.js";

export const ThemeManager = {
    applyTheme(theme) {
        const body = document.body;
        if (theme.includes('auto')) {
            if (theme === 'pimp-auto') {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                body.dataset.theme = isDark ? 'noir-pimp' : 'blanc-pimp';
            } else {
                body.dataset.theme = 'normal-auto';
            }
        } else {
            body.dataset.theme = theme;
        }
        console.log(`Thème appliqué : ${theme}`);
    },

    async saveTheme(theme) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await api.patch(`/api/users/${user.uid}`, { theme: theme });
            this.applyTheme(theme);
        } catch (e) {
            console.error("Erreur sauvegarde thème:", e);
        }
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userData = await api.get(`/api/users/${user.uid}`);
            const theme = (userData && userData.theme) ? userData.theme : 'normal-auto';
            ThemeManager.applyTheme(theme);
        } catch (err) {
            console.error("Erreur chargement thème:", err);
        }
    }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = document.body.dataset.theme;
});
