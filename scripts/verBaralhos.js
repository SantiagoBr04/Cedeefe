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

let baralhoParaDeletarId = null;
let baralhoParaEditarId = null;

document.addEventListener('DOMContentLoaded', () => {
    carregarBaralhos();

    // Eventos do Modal Criar Baralho
    const btnAbrirModal = document.getElementById('btn-abrir-modal-baralho');
    const modalCriarElement = document.getElementById('modalCriarBaralho');
    const modalCriarInstance = new bootstrap.Modal(modalCriarElement);
    const btnSalvar = document.getElementById('btnSalvarBaralho');
    const nomeInput = document.getElementById('nomeBaralhoInput');
    const erroDiv = document.getElementById('erroCriarBaralho');

    btnAbrirModal.addEventListener('click', () => {
        nomeInput.value = '';
        erroDiv.style.display = 'none';
        modalCriarInstance.show();
    });

    btnSalvar.addEventListener('click', async () => {
        const nome = nomeInput.value.trim();
        if (!nome) {
            erroDiv.textContent = 'Por favor, informe o nome do baralho.';
            erroDiv.style.display = 'block';
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
                erroDiv.textContent = data.error || 'Erro ao criar baralho.';
                erroDiv.style.display = 'block';
                return;
            }

            modalCriarInstance.hide();
            carregarBaralhos();
        } catch (error) {
            console.error(error);
            erroDiv.textContent = 'Erro de conexão ao criar baralho.';
            erroDiv.style.display = 'block';
        }
    });

    // Eventos do Modal Editar Baralho
    const modalEditarElement = document.getElementById('modalEditarBaralho');
    const modalEditarInstance = new bootstrap.Modal(modalEditarElement);
    const btnSalvarEdicao = document.getElementById('btnSalvarEdicaoBaralho');
    const editNomeInput = document.getElementById('nomeBaralhoEditarInput');
    const erroEditarDiv = document.getElementById('erroEditarBaralho');

    btnSalvarEdicao.addEventListener('click', async () => {
        const nome = editNomeInput.value.trim();
        if (!nome) {
            erroEditarDiv.textContent = 'Por favor, informe o nome do baralho.';
            erroEditarDiv.style.display = 'block';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/baralhos/${baralhoParaEditarId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ nome })
            });

            const data = await res.json();

            if (!res.ok) {
                erroEditarDiv.textContent = data.error || 'Erro ao editar baralho.';
                erroEditarDiv.style.display = 'block';
                return;
            }

            modalEditarInstance.hide();
            carregarBaralhos();
        } catch (error) {
            console.error(error);
            erroEditarDiv.textContent = 'Erro de conexão ao editar baralho.';
            erroEditarDiv.style.display = 'block';
        }
    });

    // Eventos do Modal Deletar Baralho
    const modalDeletarElement = document.getElementById('modalDeletarBaralho');
    const modalDeletarInstance = new bootstrap.Modal(modalDeletarElement);
    const btnConfirmarDeletar = document.getElementById('btnConfirmarDeletarBaralho');

    btnConfirmarDeletar.addEventListener('click', async () => {
        if (!baralhoParaDeletarId) return;

        try {
            const res = await fetch(`${API_BASE}/baralhos/${baralhoParaDeletarId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (res.ok) {
                modalDeletarInstance.hide();
                carregarBaralhos();
            } else {
                const data = await res.json();
                alert(data.error || 'Erro ao deletar baralho.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro de conexão ao deletar baralho.');
        } finally {
            baralhoParaDeletarId = null;
        }
    });
});

async function carregarBaralhos() {
    const container = document.getElementById('baralhos-container');
    
    const token = getToken();
    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin('Acesso negado: Faça login para ver seus baralhos.');
        } else {
            window.location.href = 'login.html';
        }
        return;
    }

    container.innerHTML = '<div class="text-muted p-3">Carregando seus baralhos...</div>';

    try {
        const response = await fetch(`${API_BASE}/baralhos`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (typeof tratarRespostaNaoAutorizada === 'function' && tratarRespostaNaoAutorizada(response)) {
                return;
            }
            container.innerHTML = '<div class="text-danger p-3">Erro ao carregar baralhos.</div>';
            return;
        }

        const baralhos = await response.json();

        if (!baralhos || baralhos.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center p-5 bg-white rounded-3 border">
                    <p class="text-muted mb-3">Você ainda não criou nenhum baralho.</p>
                    <button class="btn btn-rosa" onclick="document.getElementById('btn-abrir-modal-baralho').click()">
                        <i class="bi bi-plus-lg"></i> Criar meu primeiro baralho
                    </button>
                </div>
            `;
            return;
        }

        // Buscar dados dos cartões para cada baralho para calcular totais e pendentes
        const baralhosComInfo = await Promise.all(baralhos.map(async (baralho) => {
            try {
                const resCartoes = await fetch(`${API_BASE}/cartoes/baralho/${baralho.id}`, {
                    headers: getAuthHeaders()
                });
                if (resCartoes.ok) {
                    const cartoes = await resCartoes.json();
                    const agora = new Date();
                    agora.setHours(0, 0, 0, 0);

                    const paraRevisar = cartoes.filter(c => {
                        if (!c.data_proxima_revisao) return true;
                        const proxima = new Date(c.data_proxima_revisao);
                        proxima.setHours(0, 0, 0, 0);
                        return proxima <= agora;
                    }).length;
                    return { ...baralho, totalCartoes: cartoes.length, paraRevisar };
                }
            } catch (e) {
                console.error(e);
            }
            return { ...baralho, totalCartoes: 0, paraRevisar: 0 };
        }));

        renderizarBaralhos(baralhosComInfo);

    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="text-danger p-3">Erro de conexão ao carregar baralhos.</div>';
    }
}

function renderizarBaralhos(baralhos) {
    const container = document.getElementById('baralhos-container');
    container.innerHTML = '';

    baralhos.forEach(baralho => {
        const card = document.createElement('div');
        card.className = 'flashcard-container';

        card.innerHTML = `
            <div>
                <div class="flashcard-header-card">
                    <h4 class="flashcard-title">${escapeHtml(baralho.nome)}</h4>
                    <div class="card-acoes-baralho">
                        <button class="btn-deletar-baralho" title="Excluir baralho" onclick="confirmarExclusaoBaralho(event, ${baralho.id}, '${escapeHtml(baralho.nome)}')">
                            <i class="bi bi-trash"></i>
                        </button>
                        <button class="btn-editar-baralho" title="Editar nome do baralho" onclick="abrirModalEditarBaralho(event, ${baralho.id}, '${escapeHtml(baralho.nome)}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="flashcard-info">
                <span><i class="bi bi-card-heading"></i> ${baralho.totalCartoes} cartões</span>
                <span class="badge-revisar ${baralho.paraRevisar > 0 ? 'pendente' : ''}">
                    <i class="bi bi-clock-history"></i> ${baralho.paraRevisar} a revisar
                </span>
            </div>
        `;

        // Clique no card redireciona para verFlashcards.html
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-acoes-baralho')) return;
            window.location.href = `verFlashcards.html?baralho_id=${baralho.id}`;
        });

        container.appendChild(card);
    });
}

function abrirModalEditarBaralho(event, id, nome) {
    event.stopPropagation();
    baralhoParaEditarId = id;
    document.getElementById('editBaralhoIdInput').value = id;
    document.getElementById('nomeBaralhoEditarInput').value = nome;
    document.getElementById('erroEditarBaralho').style.display = 'none';

    const modalElement = document.getElementById('modalEditarBaralho');
    const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modalInstance.show();
}

function confirmarExclusaoBaralho(event, id, nome) {
    event.stopPropagation();
    baralhoParaDeletarId = id;
    document.getElementById('nomeBaralhoDeletar').textContent = nome;
    const modalDeletarElement = document.getElementById('modalDeletarBaralho');
    const modalDeletarInstance = bootstrap.Modal.getInstance(modalDeletarElement) || new bootstrap.Modal(modalDeletarElement);
    modalDeletarInstance.show();
}

function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
