const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
});

// Vérifier le paramètre URL au chargement
const params = new URLSearchParams(window.location.search);
if (params.get('tab') === 'register') {
    container.classList.add('active');
}