document.addEventListener('DOMContentLoaded', async () => {
    const statusLoading = document.getElementById('statusLoading');
    const statusSuccess = document.getElementById('statusSuccess');
    const statusError = document.getElementById('statusError');
    const mensagemErro = document.getElementById('mensagemErro');
    const boxReenviar = document.getElementById('boxReenviar');
    const btnReenviar = document.getElementById('btnReenviar');
    const btnContinuar = document.querySelector('#statusSuccess a');

    // Obter o parâmetro 'token' da URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        statusLoading.classList.add('d-none');
        statusError.classList.remove('d-none');
        mensagemErro.textContent = 'Token de verificação ausente na URL.';
        return;
    }

    try {
        const response = await fetch('/api/users/verify-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        statusLoading.classList.add('d-none');

        if (response.ok) {
            statusSuccess.classList.remove('d-none');

            // Armazenar o token JWT retornado
            if (data.token) {
                localStorage.setItem('jwt_token', data.token);
            }

            if (data.precisaCompletarPerfil && btnContinuar) {
                btnContinuar.textContent = 'Concluir Meu Perfil';
                btnContinuar.href = 'completarPerfil.html';
            } else if (btnContinuar) {
                btnContinuar.textContent = 'Ir para o Dashboard';
                btnContinuar.href = 'dashboard.html';
            }
        } else {
            statusError.classList.remove('d-none');
            mensagemErro.textContent = data.error || 'Ocorreu um erro ao verificar seu e-mail.';

            if (data.expired && data.email) {
                boxReenviar.classList.remove('d-none');
                btnReenviar.addEventListener('click', async () => {
                    try {
                        btnReenviar.disabled = true;
                        btnReenviar.textContent = 'Enviando...';

                        const resendResp = await fetch('/api/users/resend-verification', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: data.email })
                        });
                        const resendData = await resendResp.json();
                        alert(resendData.message || resendData.error);
                    } catch (err) {
                        alert('Erro ao reenviar e-mail.');
                    } finally {
                        btnReenviar.disabled = false;
                        btnReenviar.textContent = 'Reenviar E-mail de Verificação';
                    }
                });
            }
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
        statusLoading.classList.add('d-none');
        statusError.classList.remove('d-none');
        mensagemErro.textContent = 'Falha ao se conectar com o servidor. Verifique sua conexão e tente novamente.';
    }
});
