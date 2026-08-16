document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formRecuperarSenha');
    const emailInput = document.getElementById('emailInput');
    const btnEnviar = document.getElementById('btnEnviar');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim().toLowerCase();

            if (!email) {
                alert('Por favor, informe seu e-mail.');
                return;
            }

            try {
                btnEnviar.disabled = true;
                btnEnviar.textContent = 'Enviando e-mail...';

                const response = await fetch('http://localhost:3000/api/users/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (response.ok) {
                    alert(data.message || 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.');
                    window.location.href = 'login.html';
                } else {
                    alert(data.error || 'Ocorreu um erro ao solicitar a recuperação de senha.');
                }
            } catch (error) {
                console.error('Erro de conexão:', error);
                alert('Falha ao conectar com o servidor. Tente novamente mais tarde.');
            } finally {
                btnEnviar.disabled = false;
                btnEnviar.textContent = 'Enviar Link de Recuperação';
            }
        });
    }
});
