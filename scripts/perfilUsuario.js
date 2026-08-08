document.addEventListener('DOMContentLoaded', () => {
    const formPerfil = document.getElementById('formPerfil');
    const formSenha = document.getElementById('formSenha');
    const salvarSenhaBtn = document.getElementById('salvarSenhaBtn');
    const excluirContaBtn = document.getElementById('excluirContaBtn');
    const cancelarBtn = document.getElementById('cancelarBtn');
    const fotoPerfilInput = document.getElementById('fotoPerfil');
    const perfilAvatar = document.getElementById('perfilAvatar');

    const token = typeof obterToken === 'function' ? obterToken() : (localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token'));

    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin('Faça login para acessar o perfil.');
        } else {
            window.location.href = 'login.html';
        }
        return;
    }

    const headers = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
    });

    const atualizarFotoNavbar = (fotoPath) => {
        const btnUser = document.getElementById('btn-user');
        const btnAvatar = document.getElementById('btn-user-avatar');
        const fullUrl = fotoPath.startsWith('http') ? fotoPath : `http://localhost:3000${fotoPath}`;
        if (btnUser) {
            btnUser.classList.add('d-none');
        }
        if (btnAvatar) {
            btnAvatar.src = fullUrl;
            btnAvatar.classList.remove('d-none');
        }
    };

    const carregarPerfil = async () => {
        try {
            const resposta = await fetch('http://localhost:3000/api/users/profile', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                alert(dados.error || 'Não foi possível carregar o perfil.');
                return;
            }

            document.getElementById('nomeCompleto').value = dados.nomeCompleto || '';
            document.getElementById('dataNascimento').value = dados.dataNascimento ? String(dados.dataNascimento).slice(0, 10) : '';
            document.getElementById('escola').value = dados.escola || '';
            document.getElementById('email').value = dados.login || '';
            document.getElementById('motivacao').value = dados.motivacao || '';

            if (dados.genero) {
                const generoSelecionado = document.querySelector(`input[name="genero"][value="${dados.genero}"]`);
                if (generoSelecionado) {
                    generoSelecionado.checked = true;
                }
            }

            if (dados.foto) {
                const fotoUrl = `http://localhost:3000${dados.foto}`;
                perfilAvatar.textContent = '';
                perfilAvatar.style.backgroundImage = `url(${fotoUrl})`;
                perfilAvatar.style.backgroundSize = 'cover';
                perfilAvatar.style.backgroundPosition = 'center';
                atualizarFotoNavbar(dados.foto);
            } else {
                const nomeInicial = (dados.nomeCompleto || dados.login || 'A').trim().charAt(0).toUpperCase();
                perfilAvatar.textContent = nomeInicial || 'A';
                perfilAvatar.style.backgroundImage = '';
            }
        } catch (erro) {
            console.error(erro);
            alert('Falha ao buscar os dados do perfil.');
        }
    };

    if (formPerfil) {
        formPerfil.addEventListener('submit', async (evento) => {
            evento.preventDefault();

            const generoInput = document.querySelector('input[name="genero"]:checked');

            const payload = {
                nomeCompleto: document.getElementById('nomeCompleto').value.trim(),
                dataNascimento: document.getElementById('dataNascimento').value,
                genero: generoInput ? generoInput.value : null,
                escola: document.getElementById('escola').value.trim(),
                motivacao: document.getElementById('motivacao').value.trim(),
                login: document.getElementById('email').value.trim()
            };

            try {
                const resposta = await fetch('http://localhost:3000/api/users/profile', {
                    method: 'PUT',
                    headers: headers(),
                    body: JSON.stringify(payload)
                });

                const dados = await resposta.json();

                if (resposta.ok) {
                    alert(dados.message || 'Perfil atualizado com sucesso!');
                    await carregarPerfil();
                } else {
                    alert(dados.error || 'Não foi possível atualizar o perfil.');
                }
            } catch (erro) {
                console.error(erro);
                alert('Falha de rede ao atualizar o perfil.');
            }
        });
    }

    if (salvarSenhaBtn && formSenha) {
        salvarSenhaBtn.addEventListener('click', async () => {
            const senhaAtual = document.getElementById('senhaAtual').value;
            const novaSenha = document.getElementById('novaSenha').value;
            const confirmarSenha = document.getElementById('confirmarSenha').value;

            if (!senhaAtual || !novaSenha || !confirmarSenha) {
                alert('Preencha todos os campos da senha.');
                return;
            }

            if (novaSenha !== confirmarSenha) {
                alert('A confirmação da nova senha não confere.');
                return;
            }

            try {
                const resposta = await fetch('http://localhost:3000/api/users/profile', {
                    method: 'PUT',
                    headers: headers(),
                    body: JSON.stringify({
                        oldPassword: senhaAtual,
                        newPassword: novaSenha
                    })
                });

                const dados = await resposta.json();

                if (resposta.ok) {
                    alert(dados.message || 'Senha alterada com sucesso!');
                    formSenha.reset();
                    const modalElement = document.getElementById('modalSenha');
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                } else {
                    alert(dados.error || 'Não foi possível alterar a senha.');
                }
            } catch (erro) {
                console.error(erro);
                alert('Falha de rede ao alterar a senha.');
            }
        });
    }

    if (excluirContaBtn) {
        excluirContaBtn.addEventListener('click', async () => {
            const senha = document.getElementById('senhaExclusao').value;

            if (!senha) {
                alert('Informe sua senha para excluir a conta.');
                return;
            }

            const confirmar = window.confirm('Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.');
            if (!confirmar) {
                return;
            }

            try {
                const resposta = await fetch('http://localhost:3000/api/users/profile', {
                    method: 'DELETE',
                    headers: headers(),
                    body: JSON.stringify({ senha })
                });

                const dados = await resposta.json();

                if (resposta.ok) {
                    localStorage.removeItem('jwt_token');
                    sessionStorage.removeItem('jwt_token');
                    alert(dados.message || 'Conta excluída com sucesso.');
                    window.location.href = 'login.html';
                } else {
                    alert(dados.error || 'Não foi possível excluir a conta.');
                }
            } catch (erro) {
                console.error(erro);
                alert('Falha de rede ao excluir a conta.');
            }
        });
    }

    if (cancelarBtn) {
        cancelarBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

    if (fotoPerfilInput) {
        fotoPerfilInput.addEventListener('change', async () => {
            const arquivo = fotoPerfilInput.files && fotoPerfilInput.files[0];
            if (!arquivo) {
                return;
            }

            const formData = new FormData();
            formData.append('foto', arquivo);

            try {
                const resposta = await fetch('http://localhost:3000/api/users/profile/photo', {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                });

                const dados = await resposta.json();

                if (resposta.ok && dados.foto) {
                    const fotoUrl = `http://localhost:3000${dados.foto}`;
                    perfilAvatar.textContent = '';
                    perfilAvatar.style.backgroundImage = `url(${fotoUrl})`;
                    perfilAvatar.style.backgroundSize = 'cover';
                    perfilAvatar.style.backgroundPosition = 'center';

                    atualizarFotoNavbar(dados.foto);
                } else {
                    alert(dados.error || 'Não foi possível atualizar a foto de perfil.');
                }
            } catch (erro) {
                console.error(erro);
                alert('Falha de rede ao enviar a foto de perfil.');
            }
        });
    }

    carregarPerfil();
});