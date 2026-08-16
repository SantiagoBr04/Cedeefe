document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Obter os valores dos campos
            const emailInput = document.getElementById('exampleInputEmail1').value.trim().toLowerCase();
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

                    // Redirecionar para conclusão de perfil se necessário, ou para o dashboard
                    const redirectUrl = sessionStorage.getItem('redirect_after_login');
                    if (data.precisaCompletarPerfil) {
                        window.location.href = 'completarPerfil.html';
                    } else if (redirectUrl) {
                        sessionStorage.removeItem('redirect_after_login');
                        window.location.href = redirectUrl;
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else if (response.status === 403 && data.unverified) {
                    const reenviar = confirm(`${data.error}\n\nDeseja que enviemos um novo e-mail de verificação para ${emailInput}?`);
                    if (reenviar) {
                        try {
                            const resendResp = await fetch('http://localhost:3000/api/users/resend-verification', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: emailInput })
                            });
                            const resendData = await resendResp.json();
                            alert(resendData.message || resendData.error);
                        } catch (err) {
                            alert('Falha ao tentar reenviar o e-mail de verificação.');
                        }
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

// Callback global acionado pelo botão oficial do Google Sign-In
window.handleGoogleCredentialResponse = async (response) => {
    try {
        const res = await fetch('http://localhost:3000/api/users/google-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credentialToken: response.credential
            })
        });

        const data = await res.json();

        if (res.ok) {
            // Armazenar o token de sessão JWT do Cedeefe
            localStorage.setItem('jwt_token', data.token);

            // Redirecionar para a página tentada anteriormente ou para o dashboard
            const redirectUrl = sessionStorage.getItem('redirect_after_login');
            if (redirectUrl) {
                sessionStorage.removeItem('redirect_after_login');
                window.location.href = redirectUrl;
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            alert(data.error || 'Falha ao autenticar com a conta do Google.');
        }
    } catch (error) {
        console.error('Erro no login com Google:', error);
        alert('Erro ao se conectar com o servidor para autenticação via Google.');
    }
};