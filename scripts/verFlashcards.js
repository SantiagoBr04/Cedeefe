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
let cartaoParaEditarId = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    baralhoIdAtual = urlParams.get('baralho_id');

    if (!baralhoIdAtual) {
        alert('Baralho não especificado.');
        window.location.href = 'verBaralhos.html';
        return;
    }

    // Configurar botões do header
    document.getElementById('btnAdicionarCartao').addEventListener('click', () => {
        window.location.href = `adicionarCartao.html?baralho_id=${baralhoIdAtual}`;
    });

    document.getElementById('btnIniciarRevisao').addEventListener('click', () => {
        window.location.href = `fazendoFlashcards.html?baralho_id=${baralhoIdAtual}`;
    });

    carregarDadosBaralhoECartoes();

    // Eventos do Modal Editar Cartão
    const modalEditarElement = document.getElementById('modalEditarCartao');
    const modalEditarInstance = new bootstrap.Modal(modalEditarElement);
    const btnSalvarEdicao = document.getElementById('btnSalvarEdicaoCartao');
    const btnExcluirCartao = document.getElementById('btnExcluirCartaoModal');
    const erroDiv = document.getElementById('erroEditarCartao');

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

            modalEditarInstance.hide();
            carregarDadosBaralhoECartoes();
        } catch (error) {
            console.error(error);
            erroDiv.textContent = 'Erro de conexão ao editar cartão.';
            erroDiv.style.display = 'block';
        }
    });

    btnExcluirCartao.addEventListener('click', async () => {
        if (!confirm('Tem certeza de que deseja excluir este cartão?')) return;

        try {
            const res = await fetch(`${API_BASE}/cartoes/${cartaoParaEditarId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (res.ok) {
                modalEditarInstance.hide();
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
});

async function carregarDadosBaralhoECartoes() {
    const token = getToken();
    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin('Acesso negado: Faça login para ver seus flashcards.');
        } else {
            window.location.href = 'login.html';
        }
        return;
    }

    const container = document.getElementById('cartoesContainer');
    const tituloEl = document.getElementById('tituloBaralho');

    container.innerHTML = '<div class="text-muted p-3">Carregando cartões...</div>';

    try {
        // Buscar nome do baralho
        const resBaralhos = await fetch(`${API_BASE}/baralhos`, { headers: getAuthHeaders() });
        if (!resBaralhos.ok) {
            if (typeof tratarRespostaNaoAutorizada === 'function' && tratarRespostaNaoAutorizada(resBaralhos)) {
                return;
            }
        } else {
            const baralhos = await resBaralhos.json();
            const baralhoEncontrado = baralhos.find(b => b.id === Number(baralhoIdAtual));
            if (baralhoEncontrado) {
                tituloEl.textContent = baralhoEncontrado.nome;
            } else {
                tituloEl.textContent = 'Baralho';
            }
        }

        // Buscar cartões do baralho
        const resCartoes = await fetch(`${API_BASE}/cartoes/baralho/${baralhoIdAtual}`, {
            headers: getAuthHeaders()
        });

        if (!resCartoes.ok) {
            container.innerHTML = '<div class="text-danger p-3">Erro ao carregar cartões deste baralho.</div>';
            return;
        }

        const cartoes = await resCartoes.json();

        if (!cartoes || cartoes.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center p-5 bg-white rounded-3 border">
                    <p class="text-muted mb-3">Este baralho ainda não possui cartões.</p>
                    <a href="adicionarCartao.html?baralho_id=${baralhoIdAtual}" class="btn btn-rosa">
                        <i class="bi bi-plus-lg"></i> Adicionar o primeiro cartão
                    </a>
                </div>
            `;
            return;
        }

        renderizarCartoes(cartoes);

    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="text-danger p-3">Erro de conexão ao carregar cartões.</div>';
    }
}

function getTempoRevisaoInfo(cartao) {
    if (!cartao.data_proxima_revisao) {
        return { texto: 'A revisar hoje', pendente: true };
    }

    const agora = new Date();
    agora.setHours(0, 0, 0, 0);

    const proxima = new Date(cartao.data_proxima_revisao);
    proxima.setHours(0, 0, 0, 0);

    const diffMs = proxima.getTime() - agora.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias <= 0) {
        return { texto: 'A revisar hoje', pendente: true };
    } else if (diffDias === 1) {
        return { texto: 'Revisão amanhã', futuro: true };
    } else {
        return { texto: `Revisão em ${diffDias} dias`, futuro: true };
    }
}

function renderizarCartoes(cartoes) {
    const container = document.getElementById('cartoesContainer');
    container.innerHTML = '';

    cartoes.forEach((cartao, index) => {
        const card = document.createElement('div');
        card.className = 'flashcard-container';
        card.title = 'Clique para editar este cartão';

        const infoRevisao = getTempoRevisaoInfo(cartao);

        card.innerHTML = `
            <div class="flashcard-header">
                <h4><span class="text-muted fs-6">#${index + 1}</span> ${escapeHtml(cartao.frente)}</h4>
                <span class="edit-hint"><i class="bi bi-pencil"></i> Editar</span>
            </div>
            <div class="flashcard-body">
                <span class="badge ${cartao.tipo === 'escrita' ? 'bg-info text-dark' : 'bg-light text-secondary'} mb-2 align-self-start">
                    <i class="bi ${cartao.tipo === 'escrita' ? 'bi-keyboard' : 'bi-card-text'}"></i> ${cartao.tipo === 'escrita' ? 'Resposta Escrita' : 'Tradicional'}
                </span>
            </div>
            <div class="flashcard-footer-info">
                <span class="badge-revisar ${infoRevisao.pendente ? 'pendente' : (infoRevisao.futuro ? 'futuro' : '')}">
                    <i class="bi bi-clock-history"></i> ${infoRevisao.texto}
                </span>
                <span class="text-muted small"><i class="bi bi-eye-slash"></i> Resposta oculta</span>
            </div>
        `;

        card.addEventListener('click', () => {
            abrirModalEdicao(cartao);
        });

        container.appendChild(card);
    });
}

function abrirModalEdicao(cartao) {
    cartaoParaEditarId = cartao.id;
    document.getElementById('editCartaoId').value = cartao.id;
    document.getElementById('editFrenteInput').value = cartao.frente;
    document.getElementById('editVersoInput').value = cartao.verso;
    document.getElementById('erroEditarCartao').style.display = 'none';

    const modalEditarElement = document.getElementById('modalEditarCartao');
    const modalEditarInstance = bootstrap.Modal.getInstance(modalEditarElement) || new bootstrap.Modal(modalEditarElement);
    modalEditarInstance.show();
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
