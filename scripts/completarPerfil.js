document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("jwt_token") || sessionStorage.getItem("jwt_token");

    if (!token) {
        alert("Você precisa estar autenticado para concluir seu perfil.");
        window.location.href = "login.html";
        return;
    }

    const form = document.getElementById("formCompletarPerfil");
    const etapaPerfil1 = document.getElementById("etapaPerfil1");
    const etapaPerfil2 = document.getElementById("etapaPerfil2");

    const nomeCompletoInput = document.getElementById("nomeCompleto");
    const dataNascimentoInput = document.getElementById("dataNascimento");
    const escolaInput = document.getElementById("escola");
    const motivacaoInput = document.getElementById("motivacao");

    const btnContinuarEtapa1 = document.getElementById("btnContinuarEtapa1");
    const btnVoltarEtapa2 = document.getElementById("btnVoltarEtapa2");
    const btnSalvar = document.getElementById("btnSalvar");

    // Navegação entre etapas do perfil
    if (btnContinuarEtapa1) {
        btnContinuarEtapa1.addEventListener("click", () => {
            const nome = nomeCompletoInput.value.trim();
            const dataNasc = dataNascimentoInput.value;

            if (!nome) {
                alert("Por favor, preencha seu nome completo.");
                nomeCompletoInput.focus();
                return;
            }

            if (!dataNasc) {
                alert("Por favor, selecione sua data de nascimento.");
                dataNascimentoInput.focus();
                return;
            }

            // Transição para Etapa 2
            etapaPerfil1.style.display = "none";
            etapaPerfil2.style.display = "block";
        });
    }

    if (btnVoltarEtapa2) {
        btnVoltarEtapa2.addEventListener("click", () => {
            etapaPerfil2.style.display = "none";
            etapaPerfil1.style.display = "block";
        });
    }

    // Tentar buscar perfil atual para preencher campos se já existirem (ex: Nome do Google)
    try {
        const profileResp = await fetch("http://localhost:3000/api/users/profile", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (profileResp.ok) {
            const profileData = await profileResp.json();
            if (profileData.nomeCompleto) {
                nomeCompletoInput.value = profileData.nomeCompleto;
            }
            if (profileData.dataNascimento) {
                const dateVal = new Date(profileData.dataNascimento).toISOString().split('T')[0];
                dataNascimentoInput.value = dateVal;
            }
            if (profileData.escola) {
                escolaInput.value = profileData.escola;
            }
            if (profileData.motivacao) {
                motivacaoInput.value = profileData.motivacao;
            }
            if (profileData.genero) {
                const radioGenero = document.querySelector(`input[name="genero"][value="${profileData.genero}"]`);
                if (radioGenero) radioGenero.checked = true;
            }
        }
    } catch (err) {
        console.warn("Erro ao buscar dados prévios do perfil:", err);
    }

    // Envio final do formulário
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nomeCompleto = nomeCompletoInput.value.trim();
            const dataNascimento = dataNascimentoInput.value;
            const escola = escolaInput.value.trim();
            const motivacao = motivacaoInput.value.trim();

            const generoRadio = document.querySelector('input[name="genero"]:checked');
            const genero = generoRadio ? generoRadio.value : "Prefiro não declarar";

            if (!nomeCompleto || !dataNascimento) {
                alert("Por favor, preencha seu nome completo e data de nascimento.");
                etapaPerfil2.style.display = "none";
                etapaPerfil1.style.display = "block";
                return;
            }

            try {
                btnSalvar.disabled = true;
                btnSalvar.textContent = "Salvando perfil...";

                const response = await fetch("http://localhost:3000/api/users/profile", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        nomeCompleto,
                        dataNascimento,
                        genero,
                        escola,
                        motivacao
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Perfil concluído com sucesso! Bem-vindo ao Cedeefe.");
                    window.location.href = "dashboard.html";
                } else {
                    alert(data.error || "Ocorreu um erro ao salvar seu perfil.");
                }
            } catch (error) {
                console.error("Erro ao atualizar perfil:", error);
                alert("Falha de conexão com o servidor. Tente novamente.");
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.textContent = "Salvar e Concluir";
            }
        });
    }
});
