const isRoot = !window.location.pathname.includes('/pages/');
const sidebarPath = isRoot ? 'componentes/sidebar.html' : '../componentes/sidebar.html';

fetch(sidebarPath)
    .then(response => response.text())
    .then(data => {
        const container = document.getElementById("sidebar-container");
        if (!container) return;
        container.innerHTML = data;

        // Se estiver na página inicial (raiz), ajusta os links da sidebar para a pasta /pages/
        if (isRoot) {
            const links = container.querySelectorAll('a');
            links.forEach(a => {
                const href = a.getAttribute('href');
                if (href && href.startsWith('../index.html')) {
                    a.setAttribute('href', 'index.html');
                } else if (href && href !== '#' && !href.startsWith('http') && !href.startsWith('pages/')) {
                    a.setAttribute('href', `pages/${href}`);
                }
            });
        }

        if (typeof iniciarSidebar === 'function') {
            iniciarSidebar();
        }

        const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
        const btnUserLink = document.getElementById("btn-user-link");
        const userDropdown = document.getElementById("user-dropdown");
        const userMenuContainer = document.getElementById("user-menu-container");

        // Ajusta URLs conforme a localização da página (raiz ou /pages/)
        const loginUrl = isRoot ? "pages/login.html" : "login.html";
        const perfilUrl = isRoot ? "pages/perfilUsuario.html" : "perfilUsuario.html";

        if (!token) {
            // Se NÃO estiver logado: clicar no ícone vai direto para a página de login
            if (btnUserLink) {
                btnUserLink.href = loginUrl;
            }
        } else {
            // Se estiver LOGADO:
            // Ajusta o link do item Perfil no dropdown
            const dropdownItemPerfil = document.getElementById("dropdown-item-perfil");
            if (dropdownItemPerfil) {
                dropdownItemPerfil.href = perfilUrl;
            }

            // Alterna a exibição do dropdown ao clicar no ícone do usuário
            if (btnUserLink && userDropdown) {
                btnUserLink.setAttribute("href", "#");
                btnUserLink.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    userDropdown.classList.toggle("d-none");
                });
            }

            // Fecha o dropdown ao clicar em qualquer área fora do menu do usuário
            document.addEventListener("click", (e) => {
                if (userMenuContainer && !userMenuContainer.contains(e.target) && userDropdown) {
                    userDropdown.classList.add("d-none");
                }
            });

            // Ação da opção Sair (Logout)
            const dropdownItemSair = document.getElementById("dropdown-item-sair");
            if (dropdownItemSair) {
                dropdownItemSair.addEventListener("click", () => {
                    localStorage.removeItem('jwt_token');
                    sessionStorage.removeItem('jwt_token');
                    window.location.href = loginUrl;
                });
            }

            // Ação da opção Modo Claro/Escuro (Pronto para implementação futura de tema)
            const dropdownItemTema = document.getElementById("dropdown-item-tema");
            if (dropdownItemTema) {
                dropdownItemTema.addEventListener("click", () => {
                    console.log("Alternar modo claro/escuro acionado (preparado para funcionalidade futura).");
                });
            }

            // Busca as informações do usuário autenticado no backend
            fetch('http://localhost:3000/api/users/profile', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
                .then(resposta => {
                    if (resposta.status === 401 || resposta.status === 403) {
                        // Se o token estiver expirado ou inválido, desloga o usuário
                        localStorage.removeItem('jwt_token');
                        sessionStorage.removeItem('jwt_token');
                        if (btnUserLink) {
                            btnUserLink.href = loginUrl;
                        }
                        return null;
                    }
                    return resposta.ok ? resposta.json() : null;
                })
                .then(dados => {
                    if (dados) {
                        // Preenche Nome e E-mail no topo da caixa de opções
                        const nameEl = document.getElementById("user-dropdown-name");
                        const emailEl = document.getElementById("user-dropdown-email");
                        if (nameEl) {
                            nameEl.textContent = dados.nomeCompleto || dados.login || 'Usuário';
                        }
                        if (emailEl) {
                            emailEl.textContent = dados.login || '';
                        }

                        // Atualiza foto de perfil na navbar se existir
                        if (dados.foto) {
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

                        // Se for admin, exibe a seção de administração na sidebar
                        if (dados.adm === true || dados.adm === 1) {
                            const admSection = document.getElementById("adm-section");
                            if (admSection) {
                                admSection.classList.remove("d-none");
                            }
                        }
                    }
                })
                .catch(erro => console.error('Erro ao carregar dados do perfil/permissões:', erro));
        }
    })
    .catch(erro => console.error('Erro ao carregar sidebar:', erro));  