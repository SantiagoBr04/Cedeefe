document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formCriarConta");

    if (form) {
        form.addEventListener("submit", async (evento) => {
            // Previne o envio padrao do formulario que recarrega a pagina
            evento.preventDefault();

            // Pega todos os valores do formulario
            const nomeCompleto = document.getElementById("nomeCompleto").value;
            const dataNascimento = document.getElementById("dataNascimento").value;
            const escola = document.getElementById("escola").value;
            const motivacao = document.getElementById("motivacao").value;
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            // Busca a opcao de genero marcada
            const generoInput = document.querySelector('input[name="genero"]:checked');
            const genero = generoInput ? generoInput.value : null;

            // Faz a verificacao se os campos obrigatorios estao preenchidos antes de enviar
            if (!nomeCompleto || !dataNascimento || !genero || !email || !password) {
                alert("Por favor preencha todos os campos obrigatórios.");
                return;
            }

            // Agrupa os valores em um objeto
            const dadosUsuario = {
                nomeCompleto,
                dataNascimento,
                genero,
                escola,
                motivacao,
                email,
                password
            };

            try {
                // Realiza a chamada post para o servidor registrando os dados
                const resposta = await fetch("http://localhost:3000/api/users/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dadosUsuario)
                });

                const respostaJson = await resposta.json();

                if (resposta.status === 201) {
                    alert("Conta criada com sucesso!");
                    window.location.href = "login.html";
                } else if (resposta.status === 409) {
                    alert("Erro ao criar conta. O e-mail informado já está em uso.");
                } else {
                    alert("Ocorreu um erro no cadastro. Tente novamente mais tarde.");
                }

            } catch (erro) {
                console.error(erro);
                alert("Falha de rede. Verifique sua conexão e tente novamente.");
            }
        });
    }
});