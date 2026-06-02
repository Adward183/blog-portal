document.addEventListener('DOMContentLoaded', function() {

    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = document.getElementById('reg-username').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const password2 = document.getElementById('reg-password2').value;

            if (password !== password2) {
                showMessage('Пароли не совпадают', 'error');
                return;
            }

            try {
                const data = await apiRequest('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ username, email, password })
                });

                saveAuth(data.token, data.user);
                showMessage('Регистрация успешна! Добро пожаловать, ' + data.user.username + '!');
                setTimeout(function() {
                    window.location.href = 'index.html';
                }, 800);
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const data = await apiRequest('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                saveAuth(data.token, data.user);
                showMessage('С возвращением, ' + data.user.username + '!');
                setTimeout(function() {
                    window.location.href = 'index.html';
                }, 800);
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }

});