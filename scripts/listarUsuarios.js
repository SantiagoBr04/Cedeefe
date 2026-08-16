let todosUsuarios = [];
let usuarioCodParaExcluir = null;
let modalExclusaoInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Inicialização do Modal Bootstrap
    const modalEl = document.getElementById('modalConfirmarExclusaoUsuario');
    if (modalEl && typeof bootstrap !== 'undefined') {
        modalExclusaoInstance = new bootstrap.Modal(modalEl);
    }

    configurarEventos();
    carregarUsuariosAdmin();
});

function configurarEventos() {
    const inputBusca = document.getElementById('filtro-busca-usuario');
    const selectTipo = document.getElementById('filtro-tipo-usuario');
    const btnLimpar = document.getElementById('btn-limpar-filtros-usuario');
    const btnConfirmarModal = document.getElementById('btn-confirmar-exclusao-modal');

    if (inputBusca) inputBusca.addEventListener('input', aplicarFiltros);
    if (selectTipo) selectTipo.addEventListener('change', aplicarFiltros);

    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            if (inputBusca) inputBusca.value = '';
            if (selectTipo) selectTipo.value = 'todos';
            aplicarFiltros();
        });
    }

    if (btnConfirmarModal) {
        btnConfirmarModal.addEventListener('click', executarExclusaoUsuario);
    }
}

async function carregarUsuariosAdmin() {
    const tbody = document.getElementById('usuario-tbody');
    const estadoVazio = document.getElementById('estado-vazio');
    const tabelaWrapper = document.getElementById('usuarios-table-container');

    try {
        const token = typeof obterToken === 'function' ? obterToken() : (localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token'));
        
        if (!token) {
            if (typeof redirecionarParaLogin === 'function') {
                redirecionarParaLogin('Acesso negado: Faça login para acessar esta página.');
            } else {
                window.location.href = 'login.html';
            }
            return;
        }

        const response = await fetch('http://localhost:3000/api/admin/usuarios', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (typeof tratarRespostaNaoAutorizada === 'function' && tratarRespostaNaoAutorizada(response)) {
                return;
            }
            throw new Error('Falha ao obter usuários admin');
        }

        todosUsuarios = await response.json();

        // Atualiza as estatísticas rápidas
        atualizarEstatisticas(todosUsuarios);

        // Aplica filtros e renderiza
        aplicarFiltros();

    } catch (error) {
        console.error('Erro ao carregar usuários admin:', error);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <i class="bi bi-exclamation-circle text-danger fs-1"></i>
                        <p class="mt-3 text-muted">Não foi possível carregar a lista de usuários.</p>
                        <button class="btn btn-outline-rosa mt-2" onclick="carregarUsuariosAdmin()">
                            <i class="bi bi-arrow-clockwise me-1"></i> Tentar novamente
                        </button>
                    </td>
                </tr>
            `;
        }
        if (estadoVazio) estadoVazio.classList.add('d-none');
    }
}

function atualizarEstatisticas(usuarios) {
    const total = usuarios.length;
    const admins = usuarios.filter(u => u.adm === true || u.adm === 1).length;
    const estudantes = total - admins;

    const elTotal = document.getElementById('stat-total-usuarios');
    const elAdmins = document.getElementById('stat-total-admins');
    const elEstudantes = document.getElementById('stat-total-estudantes');
    const elBadge = document.getElementById('badge-total-usuarios');

    if (elTotal) elTotal.textContent = total;
    if (elAdmins) elAdmins.textContent = admins;
    if (elEstudantes) elEstudantes.textContent = estudantes;
    if (elBadge) elBadge.textContent = `${total} ${total === 1 ? 'usuário' : 'usuários'}`;
}

function aplicarFiltros() {
    const termo = (document.getElementById('filtro-busca-usuario')?.value || '').toLowerCase().trim();
    const tipo = document.getElementById('filtro-tipo-usuario')?.value || 'todos';

    let filtrados = [...todosUsuarios];

    if (tipo === 'admin') {
        filtrados = filtrados.filter(u => u.adm === true || u.adm === 1);
    } else if (tipo === 'estudante') {
        filtrados = filtrados.filter(u => !u.adm);
    }

    if (termo) {
        filtrados = filtrados.filter(u => {
            const nome = (u.nome_completo || '').toLowerCase();
            const login = (u.login || '').toLowerCase();
            const cod = String(u.cod || '');
            const escola = (u.escola || '').toLowerCase();
            return nome.includes(termo) || login.includes(termo) || cod.includes(termo) || escola.includes(termo);
        });
    }

    renderizarTabelaUsuarios(filtrados);
}

function renderizarTabelaUsuarios(usuarios) {
    const tbody = document.getElementById('usuario-tbody');
    const estadoVazio = document.getElementById('estado-vazio');
    const tabelaWrapper = document.getElementById('usuarios-table-container');

    if (!tbody) return;
    tbody.innerHTML = '';

    if (usuarios.length === 0) {
        if (tabelaWrapper) tabelaWrapper.classList.add('d-none');
        if (estadoVazio) estadoVazio.classList.remove('d-none');
        return;
    }

    if (tabelaWrapper) tabelaWrapper.classList.remove('d-none');
    if (estadoVazio) estadoVazio.classList.add('d-none');

    usuarios.forEach(usuario => {
        const tr = document.createElement('tr');
        const isAdm = usuario.adm === true || usuario.adm === 1;
        const inicial = (usuario.nome_completo || usuario.login || 'U').charAt(0).toUpperCase();
        const listasCount = Number(usuario.total_listas || 0);

        tr.innerHTML = `
            <td class="fw-bold text-muted">#${usuario.cod}</td>
            <td>
                <div class="d-flex align-items-center gap-3">
                    <div class="avatar-usuario-circulo ${isAdm ? 'admin' : ''}">
                        ${inicial}
                    </div>
                    <div>
                        <div class="usuario-info-nome">${escapeHtml(usuario.nome_completo || 'Sem nome')}</div>
                        <div class="usuario-info-escola">${escapeHtml(usuario.escola || 'Escola não informada')}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="text-secondary"><i class="bi bi-envelope me-1"></i> ${escapeHtml(usuario.login || '-')}</span>
            </td>
            <td>
                <span class="${isAdm ? 'badge-role-admin' : 'badge-role-estudante'}">
                    <i class="bi ${isAdm ? 'bi-shield-check' : 'bi-mortarboard'}"></i>
                    ${isAdm ? 'Administrador' : 'Estudante'}
                </span>
            </td>
            <td>
                <span class="badge-listas-count">
                    <i class="bi bi-card-checklist me-1"></i> ${listasCount} ${listasCount === 1 ? 'lista' : 'listas'}
                </span>
            </td>
            <td class="text-end">
                <button type="button" class="btn-icon-action" title="Excluir Usuário" onclick="solicitarExclusaoUsuario(${usuario.cod}, '${escapeJsString(usuario.nome_completo || usuario.login)}')">
                    <i class="bi bi-trash3"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function solicitarExclusaoUsuario(cod, nome) {
    usuarioCodParaExcluir = cod;
    const nomeEl = document.getElementById('nome-usuario-excluir');
    if (nomeEl) nomeEl.textContent = nome;

    if (modalExclusaoInstance) {
        modalExclusaoInstance.show();
    } else {
        if (confirm(`Tem certeza de que deseja excluir o usuário "${nome}"?`)) {
            executarExclusaoUsuario();
        }
    }
}

async function executarExclusaoUsuario() {
    if (!usuarioCodParaExcluir) return;

    try {
        const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
        const response = await fetch(`http://localhost:3000/api/admin/usuarios/${usuarioCodParaExcluir}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.error || 'Erro ao excluir usuário');
        }

        if (modalExclusaoInstance) {
            modalExclusaoInstance.hide();
        }

        mostrarFeedback('Usuário excluído com sucesso!', 'success');
        carregarUsuariosAdmin();

    } catch (error) {
        console.error('Erro ao excluir usuário admin:', error);
        mostrarFeedback('Não foi possível excluir o usuário.', 'danger');
    } finally {
        usuarioCodParaExcluir = null;
    }
}

function mostrarFeedback(mensagem, tipo = 'success') {
    const alerta = document.getElementById('alerta-feedback');
    if (!alerta) return;

    alerta.className = `alert alert-${tipo === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alerta.style.borderRadius = '16px';
    alerta.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
    alerta.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5"></i>
            <div>${mensagem}</div>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    alerta.classList.remove('d-none');

    setTimeout(() => {
        alerta.classList.add('d-none');
    }, 4000);
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJsString(text) {
    if (!text) return '';
    return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}