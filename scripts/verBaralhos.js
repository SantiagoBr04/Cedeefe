const API_BASE = '/api';

function getToken() {
    return localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
}

function getAuthHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

let todosBaralhos = [];
let baralhoParaDeletarId = null;
let modalCriarInstance = null;
let modalEditarInstance = null;
let modalDeletarInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Inicialização dos Modais Bootstrap
    const modalCriarElement = document.getElementById('modalCriarBaralho');
    if (modalCriarElement && typeof bootstrap !== 'undefined') {
        modalCriarInstance = new bootstrap.Modal(modalCriarElement);
    }

    const modalEditarElement = document.getElementById('modalEditarBaralho');
    if (modalEditarElement && typeof bootstrap !== 'undefined') {
        modalEditarInstance = new bootstrap.Modal(modalEditarElement);
    }

    const modalDeletarElement = document.getElementById('modalDeletarBaralho');
    if (modalDeletarElement && typeof bootstrap !== 'undefined') {
        modalDeletarInstance = new bootstrap.Modal(modalDeletarElement);
    }

    // Configuração de Eventos
    configurarEventos();

    // Carregamento Inicial
    carregarBaralhos();
});

function configurarEventos() {
    const btnAbrirModal = document.getElementById('btn-abrir-modal-baralho');
    const btnCriarPrimeiro = document.getElementById('btn-criar-primeiro-baralho');
    const btnSalvar = document.getElementById('btnSalvarBaralho');
    const nomeInput = document.getElementById('nomeBaralhoInput');
    const erroCriarDiv = document.getElementById('erroCriarBaralho');

    const btnSalvarEdicao = document.getElementById('btnSalvarEdicaoBaralho');
    const btnConfirmarDeletar = document.getElementById('btnConfirmarDeletarBaralho');

    const inputBusca = document.getElementById('filtro-busca-baralho');
    const selectStatus = document.getElementById('filtro-status-baralho');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');

    // Abrir Modal Criar
    const abrirModalCriarHandler = () => {
        if (nomeInput) nomeInput.value = '';
        if (erroCriarDiv) erroCriarDiv.style.display = 'none';
        if (modalCriarInstance) modalCriarInstance.show();
    };

    if (btnAbrirModal) btnAbrirModal.addEventListener('click', abrirModalCriarHandler);
    if (btnCriarPrimeiro) btnCriarPrimeiro.addEventListener('click', abrirModalCriarHandler);

    // Salvar Novo Baralho
    if (btnSalvar) {
        btnSalvar.addEventListener('click', async () => {
            const nome = nomeInput.value.trim();
            if (!nome) {
                erroCriarDiv.textContent = 'Por favor, informe o nome do baralho.';
                erroCriarDiv.style.display = 'block';
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/baralhos`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ nome })
                });

                const data = await res.json();

                if (!res.ok) {
                    erroCriarDiv.textContent = data.error || 'Erro ao criar baralho.';
                    erroCriarDiv.style.display = 'block';
                    return;
                }

                if (modalCriarInstance) modalCriarInstance.hide();
                mostrarFeedback('Baralho criado com sucesso!', 'success');
                carregarBaralhos();
            } catch (error) {
                console.error('Erro ao criar baralho:', error);
                erroCriarDiv.textContent = 'Erro ao conectar com o servidor.';
                erroCriarDiv.style.display = 'block';
            }
        });
    }

    // Salvar Edição de Baralho
    if (btnSalvarEdicao) {
        btnSalvarEdicao.addEventListener('click', async () => {
            const id = document.getElementById('editBaralhoIdInput').value;
            const nomeEditarInput = document.getElementById('nomeBaralhoEditarInput');
            const erroEditarDiv = document.getElementById('erroEditarBaralho');
            const novoNome = nomeEditarInput.value.trim();

            if (!novoNome) {
                erroEditarDiv.textContent = 'Por favor, informe o nome do baralho.';
                erroEditarDiv.style.display = 'block';
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/baralhos/${id}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ nome: novoNome })
                });

                const data = await res.json();

                if (!res.ok) {
                    erroEditarDiv.textContent = data.error || 'Erro ao editar baralho.';
                    erroEditarDiv.style.display = 'block';
                    return;
                }

                if (modalEditarInstance) modalEditarInstance.hide();
                mostrarFeedback('Baralho atualizado com sucesso!', 'success');
                carregarBaralhos();
            } catch (error) {
                console.error('Erro ao editar baralho:', error);
                erroEditarDiv.textContent = 'Erro ao conectar com o servidor.';
                erroEditarDiv.style.display = 'block';
            }
        });
    }

    // Confirmar Exclusão de Baralho
    if (btnConfirmarDeletar) {
        btnConfirmarDeletar.addEventListener('click', async () => {
            if (!baralhoParaDeletarId) return;

            try {
                const res = await fetch(`${API_BASE}/baralhos/${baralhoParaDeletarId}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Erro ao excluir baralho.');
                }

                if (modalDeletarInstance) modalDeletarInstance.hide();
                mostrarFeedback('Baralho excluído com sucesso!', 'success');
                carregarBaralhos();
            } catch (error) {
                console.error('Erro ao deletar baralho:', error);
                mostrarFeedback('Não foi possível excluir o baralho.', 'danger');
            } finally {
                baralhoParaDeletarId = null;
            }
        });
    }

    // Filtros e Busca
    if (inputBusca) inputBusca.addEventListener('input', aplicarFiltros);
    if (selectStatus) selectStatus.addEventListener('change', aplicarFiltros);
    if (btnLimparFiltros) {
        btnLimparFiltros.addEventListener('click', () => {
            if (inputBusca) inputBusca.value = '';
            if (selectStatus) selectStatus.value = 'todos';
            aplicarFiltros();
        });
    }
}

// Busca a lista de baralhos da API
async function carregarBaralhos() {
    const container = document.getElementById('baralhos-container');
    const estadoVazio = document.getElementById('estado-vazio');

    try {
        const token = getToken();
        if (!token) {
            if (typeof redirecionarParaLogin === 'function') {
                redirecionarParaLogin('Acesso negado: Faça login para ver seus flashcards.');
            } else {
                window.location.href = 'login.html';
            }
            return;
        }

        const res = await fetch(`${API_BASE}/baralhos`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            if (typeof tratarRespostaNaoAutorizada === 'function' && tratarRespostaNaoAutorizada(res)) {
                return;
            }
            throw new Error('Falha ao carregar baralhos.');
        }

        todosBaralhos = await res.json();

        // Atualiza as estatísticas rápidas
        atualizarEstatisticas(todosBaralhos);

        // Aplica filtros e renderiza
        aplicarFiltros();

    } catch (error) {
        console.error('Erro ao listar baralhos:', error);
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-exclamation-circle text-danger fs-1"></i>
                    <p class="mt-3 text-muted">Não foi possível carregar seus baralhos.</p>
                    <button class="btn btn-outline-rosa mt-2" onclick="carregarBaralhos()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Tentar novamente
                    </button>
                </div>
            `;
        }
        if (estadoVazio) estadoVazio.classList.add('d-none');
    }
}

// Atualiza os indicadores de métricas rápidas no topo
function atualizarEstatisticas(baralhos) {
    const totalBaralhos = baralhos.length;
    let totalCartoes = 0;
    let totalParaRevisar = 0;

    baralhos.forEach(b => {
        const cartoesCount = Number(b.total_cartoes || 0);
        const pendentesCount = Number(b.cartoes_para_revisar !== undefined ? b.cartoes_para_revisar : b.cartoes_pendentes || 0);
        totalCartoes += cartoesCount;
        totalParaRevisar += pendentesCount;
    });

    const emDia = Math.max(0, totalCartoes - totalParaRevisar);

    const elTotalBaralhos = document.getElementById('stat-total-baralhos');
    const elTotalCartoes = document.getElementById('stat-total-cartoes');
    const elParaRevisar = document.getElementById('stat-para-revisar');
    const elEmDia = document.getElementById('stat-em-dia');
    const elBadgeTotal = document.getElementById('badge-total-baralhos');

    if (elTotalBaralhos) elTotalBaralhos.textContent = totalBaralhos;
    if (elTotalCartoes) elTotalCartoes.textContent = totalCartoes;
    if (elParaRevisar) elParaRevisar.textContent = totalParaRevisar;
    if (elEmDia) elEmDia.textContent = emDia;
    if (elBadgeTotal) elBadgeTotal.textContent = `${totalBaralhos} ${totalBaralhos === 1 ? 'baralho' : 'baralhos'}`;
}

// Filtra baralhos por texto e status
function aplicarFiltros() {
    const termo = (document.getElementById('filtro-busca-baralho')?.value || '').toLowerCase().trim();
    const status = document.getElementById('filtro-status-baralho')?.value || 'todos';

    let filtrados = [...todosBaralhos];

    if (status === 'pendentes') {
        filtrados = filtrados.filter(b => (b.cartoes_para_revisar || b.cartoes_pendentes || 0) > 0);
    } else if (status === 'em_dia') {
        filtrados = filtrados.filter(b => (b.cartoes_para_revisar || b.cartoes_pendentes || 0) === 0);
    }

    if (termo) {
        filtrados = filtrados.filter(b => (b.nome || '').toLowerCase().includes(termo));
    }

    renderizarBaralhos(filtrados);
}

// Renderiza os cards de baralho
function renderizarBaralhos(baralhos) {
    const container = document.getElementById('baralhos-container');
    const estadoVazio = document.getElementById('estado-vazio');

    if (!container) return;
    container.innerHTML = '';

    if (baralhos.length === 0) {
        container.classList.add('d-none');
        if (estadoVazio) estadoVazio.classList.remove('d-none');
        return;
    }

    container.classList.remove('d-none');
    if (estadoVazio) estadoVazio.classList.add('d-none');

    baralhos.forEach((baralho, index) => {
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4 baralho-card-wrapper';
        col.style.animationDelay = `${(index * 0.05).toFixed(2)}s`;

        const totalCartoes = Number(baralho.total_cartoes || 0);
        const pendentes = Number(baralho.cartoes_para_revisar !== undefined ? baralho.cartoes_para_revisar : baralho.cartoes_pendentes || 0);
        const temPendentes = pendentes > 0;

        col.innerHTML = `
            <div class="baralho-card">
                <div class="baralho-card-header">
                    <span class="badge-status-revisao ${temPendentes ? 'badge-revisao-pendente' : 'badge-revisao-emdia'}">
                        <i class="bi ${temPendentes ? 'bi-clock-history' : 'bi-check2-circle'}"></i>
                        ${temPendentes ? `${pendentes} para revisar` : 'Em dia'}
                    </span>
                    <div class="d-flex gap-1">
                        <button type="button" class="btn-icon-action edit" title="Editar Baralho" onclick="abrirModalEditar(${baralho.id}, '${escapeJsString(baralho.nome)}')">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button type="button" class="btn-icon-action" title="Excluir Baralho" onclick="abrirModalDeletar(${baralho.id}, '${escapeJsString(baralho.nome)}')">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>

                <div class="baralho-card-body">
                    <h4 class="baralho-titulo">${escapeHtml(baralho.nome)}</h4>

                    <div class="baralho-meta">
                        <div class="baralho-meta-item">
                            <i class="bi bi-card-text accent-rosa"></i>
                            <span>${totalCartoes} ${totalCartoes === 1 ? 'cartão' : 'cartões'}</span>
                        </div>
                    </div>

                    <div class="baralho-card-footer">
                        <a href="fazendoFlashcards.html?baralho_id=${baralho.id}" class="btn ${temPendentes ? 'btn-verde' : 'btn-outline-verde'} flex-grow-1">
                            <i class="bi bi-play-fill"></i> ${temPendentes ? 'Estudar Agora' : 'Praticar Baralho'}
                        </a>
                        <a href="verFlashcards.html?baralho_id=${baralho.id}" class="btn btn-outline-rosa" title="Ver todos os cartões">
                            <i class="bi bi-eye"></i> Cartões
                        </a>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(col);
    });
}

function abrirModalEditar(id, nome) {
    document.getElementById('editBaralhoIdInput').value = id;
    const nomeEditarInput = document.getElementById('nomeBaralhoEditarInput');
    const erroEditarDiv = document.getElementById('erroEditarBaralho');

    nomeEditarInput.value = nome;
    erroEditarDiv.style.display = 'none';

    if (modalEditarInstance) modalEditarInstance.show();
}

function abrirModalDeletar(id, nome) {
    baralhoParaDeletarId = id;
    const nomeEl = document.getElementById('nomeBaralhoDeletar');
    if (nomeEl) nomeEl.textContent = nome;

    if (modalDeletarInstance) modalDeletarInstance.show();
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
