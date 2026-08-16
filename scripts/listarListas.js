let todasListasAdmin = [];
let listaCodParaExcluir = null;
let modalExclusaoInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Inicialização do Modal Bootstrap
    const modalEl = document.getElementById('modalConfirmarExclusaoListaAdmin');
    if (modalEl && typeof bootstrap !== 'undefined') {
        modalExclusaoInstance = new bootstrap.Modal(modalEl);
    }

    configurarEventos();
    carregarListasAdmin();
});

function configurarEventos() {
    const inputBusca = document.getElementById('filtro-busca-lista-admin');
    const selectStatus = document.getElementById('filtro-status-lista-admin');
    const selectOrdem = document.getElementById('filtro-ordem-lista-admin');
    const btnLimpar = document.getElementById('btn-limpar-filtros-lista-admin');
    const btnConfirmarModal = document.getElementById('btn-confirmar-exclusao-lista-modal');

    if (inputBusca) inputBusca.addEventListener('input', aplicarFiltros);
    if (selectStatus) selectStatus.addEventListener('change', aplicarFiltros);
    if (selectOrdem) selectOrdem.addEventListener('change', aplicarFiltros);

    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            if (inputBusca) inputBusca.value = '';
            if (selectStatus) selectStatus.value = 'todos';
            if (selectOrdem) selectOrdem.value = 'recentes';
            aplicarFiltros();
        });
    }

    if (btnConfirmarModal) {
        btnConfirmarModal.addEventListener('click', executarExclusaoLista);
    }
}

async function carregarListasAdmin() {
    const tbody = document.getElementById('lista-tbody');
    const estadoVazio = document.getElementById('estado-vazio');
    const tabelaWrapper = document.getElementById('listas-table-container');

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

        const response = await fetch('/api/admin/listas', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (typeof tratarRespostaNaoAutorizada === 'function' && tratarRespostaNaoAutorizada(response)) {
                return;
            }
            throw new Error('Falha ao obter listas admin');
        }

        todasListasAdmin = await response.json();

        // Atualiza as estatísticas rápidas
        atualizarEstatisticas(todasListasAdmin);

        // Aplica filtros e renderiza
        aplicarFiltros();

    } catch (error) {
        console.error('Erro ao carregar listas admin:', error);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <i class="bi bi-exclamation-circle text-danger fs-1"></i>
                        <p class="mt-3 text-muted">Não foi possível carregar as listas da plataforma.</p>
                        <button class="btn btn-outline-rosa mt-2" onclick="carregarListasAdmin()">
                            <i class="bi bi-arrow-clockwise me-1"></i> Tentar novamente
                        </button>
                    </td>
                </tr>
            `;
        }
        if (estadoVazio) estadoVazio.classList.add('d-none');
    }
}

function atualizarEstatisticas(listas) {
    const total = listas.length;
    const andamento = listas.filter(l => (l.status || '').toLowerCase() === 'em_andamento').length;
    const concluidas = listas.filter(l => (l.status || '').toLowerCase() === 'finalizada').length;
    const totalQuestoes = listas.reduce((acc, l) => acc + (Number(l.quantidade_questoes) || 0), 0);

    const elTotal = document.getElementById('stat-total-listas-admin');
    const elAndamento = document.getElementById('stat-andamento-listas-admin');
    const elConcluidas = document.getElementById('stat-concluidas-listas-admin');
    const elQuestoes = document.getElementById('stat-questoes-listas-admin');
    const elBadge = document.getElementById('badge-total-listas-admin');

    if (elTotal) elTotal.textContent = total;
    if (elAndamento) elAndamento.textContent = andamento;
    if (elConcluidas) elConcluidas.textContent = concluidas;
    if (elQuestoes) elQuestoes.textContent = totalQuestoes;
    if (elBadge) elBadge.textContent = `${total} ${total === 1 ? 'lista' : 'listas'}`;
}

function aplicarFiltros() {
    const termo = (document.getElementById('filtro-busca-lista-admin')?.value || '').toLowerCase().trim();
    const status = document.getElementById('filtro-status-lista-admin')?.value || 'todos';
    const ordem = document.getElementById('filtro-ordem-lista-admin')?.value || 'recentes';

    let filtradas = [...todasListasAdmin];

    if (status !== 'todos') {
        filtradas = filtradas.filter(l => (l.status || '').toLowerCase() === status);
    }

    if (termo) {
        filtradas = filtradas.filter(l => {
            const nome = (l.nome || '').toLowerCase();
            const email = (l.usuario?.login || '').toLowerCase();
            const usuarioNome = (l.usuario?.nome_completo || '').toLowerCase();
            const cod = String(l.cod || '');
            return nome.includes(termo) || email.includes(termo) || usuarioNome.includes(termo) || cod.includes(termo);
        });
    }

    if (ordem === 'recentes') {
        filtradas.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
    } else if (ordem === 'antigas') {
        filtradas.sort((a, b) => new Date(a.data_criacao) - new Date(b.data_criacao));
    } else if (ordem === 'mais_questoes') {
        filtradas.sort((a, b) => (Number(b.quantidade_questoes) || 0) - (Number(a.quantidade_questoes) || 0));
    }

    renderizarTabelaListas(filtradas);
}

function renderizarTabelaListas(listas) {
    const tbody = document.getElementById('lista-tbody');
    const estadoVazio = document.getElementById('estado-vazio');
    const tabelaWrapper = document.getElementById('listas-table-container');

    if (!tbody) return;
    tbody.innerHTML = '';

    if (listas.length === 0) {
        if (tabelaWrapper) tabelaWrapper.classList.add('d-none');
        if (estadoVazio) estadoVazio.classList.remove('d-none');
        return;
    }

    if (tabelaWrapper) tabelaWrapper.classList.remove('d-none');
    if (estadoVazio) estadoVazio.classList.add('d-none');

    listas.forEach(lista => {
        const tr = document.createElement('tr');
        const statusNormalizado = (lista.status || '').toLowerCase();
        const isFinalizada = statusNormalizado === 'finalizada';
        const badgeStatusClass = isFinalizada ? 'badge-status-finalizada' : 'badge-status-andamento';
        const textoStatus = isFinalizada ? 'Finalizada' : 'Em Andamento';
        const iconStatus = isFinalizada ? 'bi-check2-all' : 'bi-clock-history';

        const dataFormatada = lista.data_criacao 
            ? new Date(lista.data_criacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '-';

        const usuarioNome = lista.usuario?.nome_completo || lista.usuario?.login || 'Usuário Desconhecido';
        const usuarioLogin = lista.usuario?.login || '';
        const inicial = usuarioNome.charAt(0).toUpperCase();
        const qtdQuestoes = Number(lista.quantidade_questoes) || 0;

        tr.innerHTML = `
            <td class="fw-bold text-muted">#${lista.cod}</td>
            <td>
                <div class="lista-nome-titulo">${escapeHtml(lista.nome || 'Lista sem nome')}</div>
                ${lista.descricao ? `<small class="text-muted d-block text-truncate" style="max-width: 260px;">${escapeHtml(lista.descricao)}</small>` : ''}
            </td>
            <td>
                <div class="lista-criador-info">
                    <div class="avatar-criador-mini">
                        ${inicial}
                    </div>
                    <div>
                        <div class="fw-semibold text-dark" style="font-size: 0.88rem;">${escapeHtml(usuarioNome)}</div>
                        ${usuarioLogin ? `<small class="text-muted"><i class="bi bi-envelope me-1"></i>${escapeHtml(usuarioLogin)}</small>` : ''}
                    </div>
                </div>
            </td>
            <td>
                <span class="badge-questoes-count">
                    <i class="bi bi-patch-question me-1 accent-rosa"></i> ${qtdQuestoes} questões
                </span>
            </td>
            <td>
                <span class="badge-status ${badgeStatusClass}">
                    <i class="bi ${iconStatus}"></i> ${textoStatus}
                </span>
            </td>
            <td>
                <span class="text-secondary small"><i class="bi bi-calendar3 me-1"></i> ${dataFormatada}</span>
            </td>
            <td class="text-end">
                <button type="button" class="btn-icon-action" title="Excluir Lista" onclick="solicitarExclusaoLista(${lista.cod}, '${escapeJsString(lista.nome)}')">
                    <i class="bi bi-trash3"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function solicitarExclusaoLista(cod, nome) {
    listaCodParaExcluir = cod;
    const nomeEl = document.getElementById('nome-lista-admin-excluir');
    if (nomeEl) nomeEl.textContent = nome || `Lista #${cod}`;

    if (modalExclusaoInstance) {
        modalExclusaoInstance.show();
    } else {
        if (confirm(`Tem certeza de que deseja excluir a lista "${nome}"?`)) {
            executarExclusaoLista();
        }
    }
}

async function executarExclusaoLista() {
    if (!listaCodParaExcluir) return;

    try {
        const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
        const response = await fetch(`/api/admin/listas/${listaCodParaExcluir}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.error || 'Erro ao excluir lista');
        }

        if (modalExclusaoInstance) {
            modalExclusaoInstance.hide();
        }

        mostrarFeedback('Lista excluída com sucesso!', 'success');
        carregarListasAdmin();

    } catch (error) {
        console.error('Erro ao excluir lista admin:', error);
        mostrarFeedback('Não foi possível excluir a lista.', 'danger');
    } finally {
        listaCodParaExcluir = null;
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