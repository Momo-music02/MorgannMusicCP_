import { api } from '/assets/js/api.js';

(async function checkAccess() {
    const currentPath = window.location.pathname + window.location.search;
    const loginUrl = `/login.html?redirect=${encodeURIComponent(currentPath)}`;

    try {
        const response = await api.get('/api/me');

        if (!response || !response.user) {
            window.location.href = loginUrl;
            return;
        }

        const user = response.user;

        if (user.role === 'admin') {
            return;
        }

        const subStatus = Number(user.subscription_status);

        if (isNaN(subStatus) || subStatus === 0 || subStatus === 1) {
            window.location.href = '/tarifs.html';
            return;
        }

    } catch (error) {
        console.error("Erreur de vérification des accès :", error);
        window.location.href = loginUrl;
    }
})();