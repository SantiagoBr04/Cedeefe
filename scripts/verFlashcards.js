const API_BASE = 'http://localhost:3000/api';

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

let baralhoIdAtual = null;
let todosCartoes = [];
let cartaoParaEditarId = null;
let modalEditarInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    baralhoIdAtual = urlParams.get('baralho_id');

    if (!baralhoIdAtual) {
        alert('Baralho não especificado.');
        window.location.href = 'verBaralhos.html';
        return;
    }

    // Inicialização do Modal Bootstrap
    const modalEditarElement = document.getElementById('modalEditarCartao');
    if (modalEditarElement && typeof bootstrap !== 'undefined') {
        modalEditarInstance = new bootstrap.Modal(modalEditarElement);
    }

    // Configuração dos Botões
    configurarEventos();

    // Carregamento dos dados
    carregarDadosBaralhoECartoes();
});

function configurarEventos() {
    const btnAdicionar = document.getElementById('btnAdicionarCartao');
    const btnCriarPrimeiro = document.getElementById('btnCriarPrimeiroCartao');
    const btnIniciarRevisao = document.getElementById('btnIniciarRevisao');

    const irParaAdicionar = () => {
        window.location.href = `adicionarCartao.html?baralho_id=${baralhoIdAtual}`;
    };

    if (btnAdicionar) btnAdicionar.addEventListener('click', irParaAdicionar);
    if (btnCriarPrimeiro) btnCriarPrimeiro.addEventListener('click', irParaAdicionar);

    if (btnIniciarRevisao) {
        btnIniciarRevisao.addEventListener('click', () => {
            window.location.href = `fazendoFlashcards.html?baralho_id=${baralhoIdAtual}`;
        });
    }

    // Filtros e Busca
    const inputBusca = document.getElementById('filtro-busca-cartao');
    const selectStatus = document.getElementById('filtro-status-cartao');
    const btnLimpar = document.getElementById('btn-limpar-filtros-cartao');

    if (inputBusca) inputBusca.addEventListener('input', aplicarFiltros);
    if (selectStatus) selectStatus.addEventListener('change', aplicarFiltros);
    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            if (inputBusca) inputBusca.value = '';
            if (selectStatus) selectStatus.value = 'todos';
            aplicarFiltros();
        });
    }

    // Eventos do Modal Editar
    const btnSalvarEdicao = document.getElementById('btnSalvarEdicaoCartao');
    const btnExcluirCartao = document.getElementById('btnExcluirCartaoModal');
    const erroDiv = document.getElementById('erroEditarCartao');

    if (btnSalvarEdicao) {
        btnSalvarEdicao.addEventListener('click', async () => {
            const frente = document.getElementById('editFrenteInput').value.trim();
            const verso = document.getElementById('editVersoInput').value.trim();

            if (!frente || !verso) {
                erroDiv.textContent = 'Frente e verso são obrigatórios.';
                erroDiv.style.display = 'block';
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/cartoes/${cartaoParaEditarId}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ frente, verso })
                });

                const data = await res.json();

                if (!res.ok) {
                    erroDiv.textContent = data.error || 'Erro ao editar cartão.';
                    erroDiv.style.display = 'block';
                    return;
                }

                if (modalEditarInstance) modalEditarInstance.hide();
                mostrarFeedback('Cartão atualizado com sucesso!', 'success');
                carregarDadosBaralhoECartoes();
            } catch (error) {
                console.error(error);
                erroDiv.textContent = 'Erro de conexão ao editar cartão.';
                erroDiv.style.display = 'block';
            }
        });
    }

    if (btnExcluirCartao) {
        btnExcluirCartao.addEventListener('click', async () => {
            if (!confirm('Tem certeza de que deseja excluir este cartão?')) return;

            try {
                const res = await fetch(`${API_BASE}/cartoes/${cartaoParaEditarId}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });

                if (res.ok) {
                    if (modalEditarInstance) modalEditarInstance.hide();
                    mostrarFeedback('Cartão excluído com sucesso!', 'success');
                    carregarDadosBaralhoECartoes();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Erro ao excluir cartão.');
                }
            } catch (error) {
                console.error(error);
                alert('Erro de conexão ao excluir cartão.');
            }
        });
    }
}

// Carrega dados do baralho e seus cartões
async function carregarDadosBaralhoECartoes() {
    const container = document.getElementById('cartoesContainer');
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

        // Busca informações do baralho e seus cartões
        const [baralhosRes, cartoesRes] = await Promise.all([
            fetch(`${API_BASE}/baralhos`, { method: 'GET', headers: getAuthHeaders() }),
            fetch(`${API_BASE}/cartoes/baralho/${baralhoIdAtual}`, { method: 'GET', headers: getAuthHeaders() })
        ]);

        if (!baralhosRes.ok || !cartoesRes.ok) {
            throw new Error('Falha ao carregar informações.');
        }

        const baralhos = await baralhosRes.json();
        const baralho = baralhos.find(b => String(b.id) === String(baralhoIdAtual));

        if (baralho) {
            document.getElementById('tituloBaralho').textContent = baralho.nome;
            document.title = `${baralho.nome} - Flashcards - Cedeefe`;
        }

        todosCartoes = await cartoesRes.json();

        // Atualiza estatísticas rápidas
        atualizarEstatisticas(todosCartoes);

        // Aplica filtros e renderiza
        aplicarFiltros();

    } catch (error) {
        console.error('Erro ao carregar dados do baralho:', error);
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-exclamation-circle text-danger fs-1"></i>
                    <p class="mt-3 text-muted">Não foi possível carregar os cartões deste baralho.</p>
                    <button class="btn btn-outline-rosa mt-2" onclick="carregarDadosBaralhoECartoes()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Tentar novamente
                    </button>
                </div>
            `;
        }
        if (estadoVazio) estadoVazio.classList.add('d-none');
    }
}

// Atualiza contadores no topo
function atualizarEstatisticas(cartoes) {
    const total = cartoes.length;
    const hoje = new Date();

    let pendentes = 0;
    let aprendendo = 0;
    let revisados = 0;

    cartoes.forEach(c => {
        const prox = c.proxima_revisao ? new Date(c.proxima_revisao) : null;
        const rep = Number(c.repeticoes || 0);

        if (!prox || prox <= hoje) {
            pendentes++;
        }

        if (rep <= 1) {
            aprendendo++;
        } else {
            revisados++;
        }
    });

    const elTotal = document.getElementById('stat-total-baralho-cartoes');
    const elPendentes = document.getElementById('stat-pendentes-hoje');
    const elAprendendo = document.getElementById('stat-aprendendo-cartoes');
    const elRevisados = document.getElementById('stat-revisados-cartoes');
    const elBadge = document.getElementById('badge-total-cartoes');

    if (elTotal) elTotal.textContent = total;
    if (elPendentes) elPendentes.textContent = pendentes;
    if (elAprendendo) elAprendendo.textContent = aprendendo;
    if (elRevisados) elRevisados.textContent = revisados;
    if (elBadge) elBadge.textContent = `${total} ${total === 1 ? 'cartão' : 'cartões'}`;
}

// Filtra cartões por texto e status SRS
function aplicarFiltros() {
    const termo = (document.getElementById('filtro-busca-cartao')?.value || '').toLowerCase().trim();
    const status = document.getElementById('filtro-status-cartao')?.value || 'todos';
    const hoje = new Date();

    let filtrados = [...todosCartoes];

    if (status === 'pendentes') {
        filtrados = filtrados.filter(c => {
            const prox = c.proxima_revisao ? new Date(c.proxima_revisao) : null;
            return !prox || prox <= hoje;
        });
    } else if (status === 'novos') {
        filtrados = filtrados.filter(c => Number(c.repeticoes || 0) <= 1);
    } else if (status === 'em_dia') {
        filtrados = filtrados.filter(c => {
            const prox = c.proxima_revisao ? new Date(c.proxima_revisao) : null;
            return prox && prox > hoje;
        });
    }

    if (termo) {
        filtrados = filtrados.filter(c => {
            const frente = (c.frente || '').toLowerCase();
            const verso = (c.verso || '').toLowerCase();
            return frente.includes(termo) || verso.includes(termo);
        });
    }

    renderizarCartoes(filtrados);
}

// Renderiza a lista de cartões
function renderizarCartoes(cartoes) {
    const container = document.getElementById('cartoesContainer');
    const estadoVazio = document.getElementById('estado-vazio');

    if (!container) return;
    container.innerHTML = '';

    if (cartoes.length === 0) {
        container.classList.add('d-none');
        if (estadoVazio) estadoVazio.classList.remove('d-none');
        return;
    }

    container.classList.remove('d-none');
    if (estadoVazio) estadoVazio.classList.add('d-none');

    const hoje = new Date();

    cartoes.forEach((cartao, index) => {
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4 cartao-card-wrapper';
        col.style.animationDelay = `${(index * 0.05).toFixed(2)}s`;

        const prox = cartao.proxima_revisao ? new Date(cartao.proxima_revisao) : null;
        const rep = Number(cartao.repeticoes || 0);
        const intervalo = Number(cartao.intervalo_dias || 0);
        const isPendente = !prox || prox <= hoje;

        let badgeStatusHtml = '';
        if (isPendente) {
            badgeStatusHtml = '<span class="badge-srs-status badge-srs-pendente"><i class="bi bi-clock-history"></i> Revisão Hoje</span>';
        } else if (rep <= 1) {
            badgeStatusHtml = '<span class="badge-srs-status badge-srs-aprendendo"><i class="bi bi-lightning-charge-fill"></i> Aprendendo</span>';
        } else {
            badgeStatusHtml = `<span class="badge-srs-status badge-srs-revisado"><i class="bi bi-check2-circle"></i> Em dia (${intervalo}d)</span>`;
        }

        col.innerHTML = `
            <div class="cartao-item-card">
                <div class="cartao-item-header">
                    <span class="text-muted small fw-semibold">
                        <i class="bi ${cartao.tipo === 'escrita' ? 'bi-pencil-square' : 'bi-card-text'} accent-rosa me-1"></i>
                        ${cartao.tipo === 'escrita' ? 'Escrita' : 'Tradicional'}
                    </span>
                    <div class="d-flex gap-1">
                        <button type="button" class="btn-icon-action edit" title="Editar Cartão" onclick="abrirModalEditarCartao(${cartao.id}, '${escapeJsString(cartao.frente)}', '${escapeJsString(cartao.verso)}')">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                    </div>
                </div>

                <div class="cartao-item-body">
                    <div class="cartao-secao-frente">
                        <span class="cartao-label-frente"><i class="bi bi-question-circle"></i> Pergunta</span>
                        <p class="cartao-texto-frente">${escapeHtml(cartao.frente)}</p>
                    </div>

                    <div class="cartao-secao-verso">
                        <span class="cartao-label-verso"><i class="bi bi-check-circle"></i> Resposta</span>
                        <p class="cartao-texto-verso">${escapeHtml(cartao.verso)}</p>
                    </div>

                    <div class="cartao-item-footer">
                        ${badgeStatusHtml}
                        <small class="text-muted">${rep} ${rep === 1 ? 'revisão' : 'revisões'}</small>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(col);
    });
}

function abrirModalEditarCartao(id, frente, verso) {
    cartaoParaEditarId = id;
    document.getElementById('editCartaoId').value = id;
    document.getElementById('editFrenteInput').value = frente;
    document.getElementById('editVersoInput').value = verso;
    document.getElementById('erroEditarCartao').style.display = 'none';

    if (modalEditarInstance) modalEditarInstance.show();
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
