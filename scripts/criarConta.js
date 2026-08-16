document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formCriarConta");

    if (form) {
        form.addEventListener("submit", async (evento) => {
            // Previne o envio padrão do formulário
            evento.preventDefault();

            // Pega apenas e-mail e senha
            const email = document.getElementById("email").value.trim().toLowerCase();
            const password = document.getElementById("password").value;

            if (!email || !password) {
                alert("Por favor preencha o e-mail e a senha.");
                return;
            }

            if (password.length < 6) {
                alert("A senha deve ter no mínimo 6 caracteres.");
                return;
            }

            try {
                // Realiza o cadastro simples no backend
                const resposta = await fetch("/api/users/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                });

                const respostaJson = await resposta.json();

                if (resposta.status === 201) {
                    alert("Conta criada com sucesso! Enviamos um e-mail de verificação. Por favor, acesse sua caixa de entrada e clique no link de ativação para dar sequência ao seu cadastro.");
                    window.location.href = "login.html";
                } else if (resposta.status === 409) {
                    alert("Este e-mail já está cadastrado em nossa plataforma.");
                } else {
                    alert(respostaJson.error || "Ocorreu um erro no cadastro. Tente novamente.");
                }

            } catch (erro) {
                console.error("Erro no cadastro:", erro);
                alert("Falha de conexão com o servidor. Tente novamente mais tarde.");
            }
        });
    }
});

// Callback global acionado pelo botão do Google Sign-In
window.handleGoogleCredentialResponse = async (response) => {
    try {
        const res = await fetch('/api/users/google-login', {
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

            if (data.precisaCompletarPerfil) {
                window.location.href = 'completarPerfil.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            alert(data.error || 'Falha ao autenticar com a conta do Google.');
        }
    } catch (error) {
        console.error('Erro no cadastro com Google:', error);
        alert('Erro ao se conectar com o servidor para autenticação via Google.');
    }
};