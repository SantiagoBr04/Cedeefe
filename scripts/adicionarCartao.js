const API_BASE = 'http://localhost:3000/api';

function getToken() {
    return localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
}

document.addEventListener('DOMContentLoaded', () => {
    carregarBaralhosSelect();

    const form = document.getElementById('formAdicionarCartao');
    const btnCancelar = document.getElementById('btnCancelar');
    const feedbackDiv = document.getElementById('mensagemFeedback');

    btnCancelar.addEventListener('click', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const baralhoId = urlParams.get('baralho_id');
        if (baralhoId) {
            window.location.href = `verFlashcards.html?baralho_id=${baralhoId}`;
        } else {
            window.location.href = 'verBaralhos.html';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        feedbackDiv.style.display = 'none';

        const token = getToken();
        if (!token) {
            exibirFeedback('Sessão expirada. Faça login novamente.', 'danger');
            return;
        }

        const baralhoId = document.getElementById('baralhoSelect').value;
        const frente = document.getElementById('frenteInput').value.trim();
        const verso = document.getElementById('versoInput').value.trim();
        const tipo = document.getElementById('tipoSelect').value;

        if (!baralhoId || !frente || !verso) {
            exibirFeedback('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/cartoes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    frente,
                    verso,
                    baralho_id: Number(baralhoId),
                    tipo
                })
            });

            const data = await response.json();

            if (!response.ok) {
                exibirFeedback(data.error || 'Erro ao criar cartão.', 'danger');
                return;
            }

            exibirFeedback('Cartão criado com sucesso! Você pode continuar adicionando mais cartões.', 'success');

            // Limpar os campos mantendo a seleção do baralho
            document.getElementById('frenteInput').value = '';
            document.getElementById('versoInput').value = '';
            document.getElementById('frenteInput').focus();

        } catch (error) {
            console.error(error);
            exibirFeedback('Erro de conexão ao criar cartão.', 'danger');
        }
    });
});

async function carregarBaralhosSelect() {
    const select = document.getElementById('baralhoSelect');
    const token = getToken();

    const urlParams = new URLSearchParams(window.location.search);
    const baralhoIdParam = urlParams.get('baralho_id');

    try {
        const response = await fetch(`${API_BASE}/baralhos`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (!response.ok) {
            select.innerHTML = '<option value="" disabled selected>Erro ao carregar baralhos</option>';
            return;
        }

        const baralhos = await response.json();

        if (!baralhos || baralhos.length === 0) {
            select.innerHTML = '<option value="" disabled selected>Nenhum baralho encontrado. Crie um baralho primeiro!</option>';
            return;
        }

        select.innerHTML = '<option value="" disabled selected>Selecione um baralho...</option>';

        baralhos.forEach(baralho => {
            const option = document.createElement('option');
            option.value = baralho.id;
            option.textContent = baralho.nome;

            if (baralhoIdParam && Number(baralhoIdParam) === baralho.id) {
                option.selected = true;
            }

            select.appendChild(option);
        });

    } catch (error) {
        console.error(error);
        select.innerHTML = '<option value="" disabled selected>Erro de conexão ao carregar baralhos</option>';
    }
}

function exibirFeedback(mensagem, tipo) {
    const feedbackDiv = document.getElementById('mensagemFeedback');
    feedbackDiv.className = `alert alert-${tipo} mt-3`;
    feedbackDiv.textContent = mensagem;
    feedbackDiv.style.display = 'block';
}
