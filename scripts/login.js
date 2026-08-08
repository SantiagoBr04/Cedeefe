document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Obter os valores dos campos
            const emailInput = document.getElementById('exampleInputEmail1').value;
            const passwordInput = document.getElementById('exampleInputPassword1').value;
            const rememberMe = document.getElementById('exampleCheck1').checked;

            try {
                // Fazer a requisição para a API
                const response = await fetch('http://localhost:3000/api/users/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        login: emailInput,
                        senha: passwordInput
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Armazenar o token com base no "Lembrar-me"
                    if (rememberMe) {
                        localStorage.setItem('jwt_token', data.token);
                    } else {
                        sessionStorage.setItem('jwt_token', data.token);
                    }

                    // Redirecionar para a página tentada anteriormente ou para o dashboard
                    const redirectUrl = sessionStorage.getItem('redirect_after_login');
                    if (redirectUrl) {
                        sessionStorage.removeItem('redirect_after_login');
                        window.location.href = redirectUrl;
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    // Tratar erro (ex: Credenciais inválidas)
                    alert(data.error || 'Erro ao realizar login. Verifique suas credenciais.');
                }
            } catch (error) {
                console.error('Erro de requisição:', error);
                alert('Erro ao se conectar com o servidor. Tente novamente mais tarde.');
            }
        });
    }
});