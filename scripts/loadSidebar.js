fetch("../componentes/sidebar.html")
    .then(response => response.text())
    .then(data => {
        document.getElementById("sidebar-container").innerHTML = data;

        iniciarSidebar();

        const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
        if (token) {
            const btnUserLink = document.getElementById("btn-user-link");
            if (btnUserLink) {
                btnUserLink.href = "perfilUsuario.html";
            }

            fetch('http://localhost:3000/api/users/profile', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            .then(resposta => resposta.ok ? resposta.json() : null)
            .then(dados => {
                if (dados && dados.foto) {
                    const btnUser = document.getElementById("btn-user");
                    const btnUserAvatar = document.getElementById("btn-user-avatar");
                    if (btnUser) {
                        btnUser.classList.add("d-none");
                    }
                    if (btnUserAvatar) {
                        btnUserAvatar.src = `http://localhost:3000${dados.foto}`;
                        btnUserAvatar.classList.remove("d-none");
                    }
                }
            })
            .catch(erro => console.error('Erro ao carregar foto do perfil:', erro));
        }
    });  