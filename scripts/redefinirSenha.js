document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formRedefinirSenha');
    const novaSenhaInput = document.getElementById('novaSenha');
    const confirmarSenhaInput = document.getElementById('confirmarSenha');
    const btnSalvar = document.getElementById('btnSalvar');

    // Obter o token da URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        alert('Token de redefinição de senha inválido ou ausente.');
        window.location.href = 'login.html';
        return;
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const novaSenha = novaSenhaInput.value;
            const confirmarSenha = confirmarSenhaInput.value;

            if (novaSenha.length < 6) {
                alert('A senha deve ter no mínimo 6 caracteres.');
                return;
            }

            if (novaSenha !== confirmarSenha) {
                alert('As senhas não coincidem. Digite novamente.');
                return;
            }

            try {
                btnSalvar.disabled = true;
                btnSalvar.textContent = 'Salvando...';

                const response = await fetch('/api/users/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token,
                        newPassword: novaSenha
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    alert(data.message || 'Senha redefinida com sucesso! Você já pode entrar com a nova senha.');
                    window.location.href = 'login.html';
                } else {
                    alert(data.error || 'Ocorreu um erro ao redefinir sua senha.');
                }
            } catch (error) {
                console.error('Erro de conexão:', error);
                alert('Falha ao conectar com o servidor. Tente novamente mais tarde.');
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.textContent = 'Redefinir Senha';
            }
        });
    }
});
