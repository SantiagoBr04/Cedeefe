// Estado global das listas carregadas
let todasListas = [];
let listaIdParaExcluir = null;
let modalExclusaoInstancia = null;

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o modal de exclusão do Bootstrap
    const modalEl = document.getElementById('modalConfirmarExclusao');
    if (modalEl && typeof bootstrap !== 'undefined') {
        modalExclusaoInstancia = new bootstrap.Modal(modalEl);
    }

    // Configura eventos dos filtros e busca
    configurarEventosFiltro();

    // Carrega os dados das listas
    carregarListas();
});

// Configura ouvintes de eventos para busca, filtros e ordenação
function configurarEventosFiltro() {
    const inputBusca = document.getElementById('filtro-busca-lista');
    const selectStatus = document.getElementById('filtro-status-lista');
    const selectOrdem = document.getElementById('filtro-ordem-lista');
    const btnLimpar = document.getElementById('btn-limpar-filtros');
    const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao-modal');

    if (inputBusca) {
        inputBusca.addEventListener('input', aplicarFiltros);
    }

    if (selectStatus) {
        selectStatus.addEventListener('change', aplicarFiltros);
    }

    if (selectOrdem) {
        selectOrdem.addEventListener('change', aplicarFiltros);
    }

    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            if (inputBusca) inputBusca.value = '';
            if (selectStatus) selectStatus.value = 'todos';
            if (selectOrdem) selectOrdem.value = 'recentes';
            aplicarFiltros();
        });
    }

    if (btnConfirmarExclusao) {
        btnConfirmarExclusao.addEventListener('click', confirmarExclusaoApi);
    }
}

// Busca as listas do usuário autenticado na API backend
async function carregarListas() {
    const container = document.getElementById('listas-container');
    const estadoVazio = document.getElementById('estado-vazio');

    try {
        const token = typeof obterToken === 'function' ? obterToken() : (localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token'));
        
        if (!token) {
            if (typeof redirecionarParaLogin === 'function') {
                redirecionarParaLogin('Acesso negado: Faça login para ver suas listas.');
            } else {
                window.location.href = 'login.html';
            }
            return;
        }

        const response = await fetch('/api/listas', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (typeof tratarRespostaNaoAutorizada === 'function' && tratarRespostaNaoAutorizada(response)) {
                return;
            }
            throw new Error('Falha ao obter listas');
        }

        todasListas = await response.json();

        // Atualiza os cards de estatísticas rápidas
        atualizarEstatisticas(todasListas);

        // Aplica filtros e renderiza
        aplicarFiltros();

    } catch (error) {
        console.error('Erro ao carregar listas:', error);
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-exclamation-circle text-danger fs-1"></i>
                    <p class="mt-3 text-muted">Não foi possível carregar suas listas. Verifique sua conexão e tente novamente.</p>
                    <button class="btn btn-outline-rosa mt-2" onclick="carregarListas()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Tentar novamente
                    </button>
                </div>
            `;
        }
        if (estadoVazio) estadoVazio.classList.add('d-none');
    }
}

// Atualiza os indicadores de estatísticas rápidas no topo
function atualizarEstatisticas(listas) {
    const totalListas = listas.length;
    const emAndamento = listas.filter(l => l.status === 'em_andamento').length;
    const concluidas = listas.filter(l => l.status === 'finalizada').length;
    
    // Soma o total de questões respondidas somando cada lista
    const totalQuestoesRespondidas = listas.reduce((acc, l) => acc + (l.questoes_respondidas || 0), 0);

    const badgeTotal = document.getElementById('badge-total-listas');
    const statTotal = document.getElementById('stat-total-listas');
    const statAndamento = document.getElementById('stat-andamento-listas');
    const statConcluidas = document.getElementById('stat-concluidas-listas');
    const statQuestoes = document.getElementById('stat-questoes-respondidas');

    if (badgeTotal) badgeTotal.textContent = `${totalListas} ${totalListas === 1 ? 'lista' : 'listas'}`;
    if (statTotal) statTotal.textContent = totalListas;
    if (statAndamento) statAndamento.textContent = emAndamento;
    if (statConcluidas) statConcluidas.textContent = concluidas;
    if (statQuestoes) statQuestoes.textContent = totalQuestoesRespondidas;
}

// Aplica a busca por texto, filtro de status e ordenação
function aplicarFiltros() {
    const termoBusca = (document.getElementById('filtro-busca-lista')?.value || '').toLowerCase().trim();
    const statusFiltro = document.getElementById('filtro-status-lista')?.value || 'todos';
    const ordemFiltro = document.getElementById('filtro-ordem-lista')?.value || 'recentes';

    let filtradas = [...todasListas];

    // Filtro por status
    if (statusFiltro !== 'todos') {
        filtradas = filtradas.filter(lista => lista.status === statusFiltro);
    }

    // Filtro por termo de busca (nome, descrição ou disciplina)
    if (termoBusca) {
        filtradas = filtradas.filter(lista => {
            const nome = (lista.nome || '').toLowerCase();
            const descricao = (lista.descricao || '').toLowerCase();
            const disciplina = (lista.disciplina || '').toLowerCase();
            return nome.includes(termoBusca) || descricao.includes(termoBusca) || disciplina.includes(termoBusca);
        });
    }

    // Ordenação
    if (ordemFiltro === 'recentes') {
        filtradas.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
    } else if (ordemFiltro === 'antigas') {
        filtradas.sort((a, b) => new Date(a.data_criacao) - new Date(b.data_criacao));
    } else if (ordemFiltro === 'mais_questoes') {
        filtradas.sort((a, b) => (b.quantidade_questoes || 0) - (a.quantidade_questoes || 0));
    }

    renderizarListas(filtradas);
}

// Renderiza a grade de cards das listas
function renderizarListas(listas) {
    const container = document.getElementById('listas-container');
    const estadoVazio = document.getElementById('estado-vazio');

    if (!container) return;

    container.innerHTML = '';

    if (listas.length === 0) {
        container.classList.add('d-none');
        if (estadoVazio) estadoVazio.classList.remove('d-none');
        return;
    }

    container.classList.remove('d-none');
    if (estadoVazio) estadoVazio.classList.add('d-none');

    listas.forEach((lista, index) => {
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4 lista-card-wrapper';
        col.style.animationDelay = `${(index * 0.05).toFixed(2)}s`;

        // Formatação de data
        const dataFormatada = lista.data_criacao 
            ? new Date(lista.data_criacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : 'Data não informada';

        // Cálculo de progresso
        const totalQuestoes = lista.quantidade_questoes || 0;
        const respondidas = lista.questoes_respondidas || 0;
        const porcentagem = totalQuestoes > 0 ? Math.round((respondidas / totalQuestoes) * 100) : 0;

        // Configuração de Status
        const isFinalizada = lista.status === 'finalizada';
        const badgeStatusClass = isFinalizada ? 'badge-status-finalizada' : 'badge-status-andamento';
        const statusTexto = isFinalizada ? 'Concluída' : 'Em Andamento';
        const statusIcone = isFinalizada ? 'bi-check2-all' : 'bi-clock-history';
        const progressoClass = isFinalizada ? 'progresso-concluido' : 'progresso-andamento';

        // Disciplina
        const disciplinaNome = lista.disciplina || 'Multidisciplinar';
        const descricaoTexto = lista.descricao ? escapeHtml(lista.descricao) : 'Lista de exercícios personalizada para treino e reforço dos conteúdos.';

        col.innerHTML = `
            <div class="lista-card">
                <div class="lista-card-header">
                    <span class="badge-disciplina">
                        <i class="bi bi-book"></i> ${escapeHtml(disciplinaNome)}
                    </span>
                    <span class="badge-status ${badgeStatusClass}">
                        <i class="bi ${statusIcone}"></i> ${statusTexto}
                    </span>
                </div>

                <div class="lista-card-body">
                    <h4 class="lista-titulo">${escapeHtml(lista.nome)}</h4>
                    <p class="lista-descricao">${descricaoTexto}</p>

                    <div class="lista-progresso-container">
                        <div class="lista-progresso-header">
                            <span>Progresso</span>
                            <span>${respondidas}/${totalQuestoes} (${porcentagem}%)</span>
                        </div>
                        <div class="lista-progresso-bar-bg">
                            <div class="lista-progresso-bar-fill ${progressoClass}" style="width: ${porcentagem}%;"></div>
                        </div>
                    </div>

                    <div class="lista-meta-info">
                        <div class="lista-meta-item">
                            <i class="bi bi-calendar3"></i>
                            <span>${dataFormatada}</span>
                        </div>
                        <div class="lista-meta-item">
                            <i class="bi bi-question-circle"></i>
                            <span>${totalQuestoes} questões</span>
                        </div>
                    </div>

                    <div class="lista-card-footer">
                        <button type="button" class="btn ${isFinalizada ? 'btn-outline-verde' : 'btn-verde'} flex-grow-1" onclick="acessarLista(${lista.cod})">
                            <i class="bi ${isFinalizada ? 'bi-arrow-repeat' : 'bi-play-fill'}"></i>
                            ${isFinalizada ? 'Revisar Lista' : 'Continuar Lista'}
                        </button>
                        <button type="button" class="btn-icon-action" title="Excluir Lista" onclick="solicitarExclusao(${lista.cod}, '${escapeJsString(lista.nome)}')">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(col);
    });
}

// Redireciona para a execução da lista
function acessarLista(id) {
    window.location.href = `fazendoLista.html?codLista=${id}`;
}

// Abre o modal estilizado de confirmação de exclusão
function solicitarExclusao(id, nome) {
    listaIdParaExcluir = id;
    const nomeEl = document.getElementById('nome-lista-excluir');
    if (nomeEl) nomeEl.textContent = nome;

    if (modalExclusaoInstancia) {
        modalExclusaoInstancia.show();
    } else {
        // Fallback caso bootstrap modal falhe
        if (confirm(`Tem certeza de que deseja excluir a lista "${nome}"?`)) {
            confirmarExclusaoApi();
        }
    }
}

// Envia a requisição de exclusão para o backend
async function confirmarExclusaoApi() {
    if (!listaIdParaExcluir) return;

    try {
        const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
        const response = await fetch(`/api/listas/${listaIdParaExcluir}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erro ao deletar lista');
        }

        if (modalExclusaoInstancia) {
            modalExclusaoInstancia.hide();
        }

        mostrarFeedback('Lista excluída com sucesso!', 'success');
        
        // Recarrega as listas no frontend
        await carregarListas();

    } catch (error) {
        console.error('Erro ao deletar lista:', error);
        mostrarFeedback('Não foi possível excluir a lista. Tente novamente.', 'danger');
    } finally {
        listaIdParaExcluir = null;
    }
}

// Exibe alertas temporários estilizados no topo da página
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

// Utilitários para sanitização básica de strings no HTML
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