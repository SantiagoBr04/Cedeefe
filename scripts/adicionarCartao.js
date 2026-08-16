const API_BASE = 'http://localhost:3000/api';

function getToken() {
    return localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
}

let facePreviewAtual = 'frente'; // 'frente' ou 'verso'

document.addEventListener('DOMContentLoaded', () => {
    carregarBaralhosSelect();

    const form = document.getElementById('formAdicionarCartao');
    const btnCancelar = document.getElementById('btnCancelar');
    const btnVoltarNav = document.getElementById('btnVoltarNav');
    const btnVirarPreview = document.getElementById('btnVirarPreview');

    const inputFrente = document.getElementById('frenteInput');
    const inputVerso = document.getElementById('versoInput');
    const selectTipo = document.getElementById('tipoSelect');
    const selectBaralho = document.getElementById('baralhoSelect');

    // Navegação de Voltar / Cancelar
    const voltarHandler = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const baralhoId = urlParams.get('baralho_id');
        if (baralhoId) {
            window.location.href = `verFlashcards.html?baralho_id=${baralhoId}`;
        } else {
            window.location.href = 'verBaralhos.html';
        }
    };

    if (btnCancelar) btnCancelar.addEventListener('click', voltarHandler);
    if (btnVoltarNav) btnVoltarNav.addEventListener('click', (e) => {
        e.preventDefault();
        voltarHandler();
    });

    // Reatividade do Live Preview
    if (inputFrente) {
        inputFrente.addEventListener('input', () => {
            const val = inputFrente.value.trim();
            document.getElementById('previewTextoFrente').textContent = val || 'Digite a pergunta no formulário ao lado...';
        });
    }

    if (inputVerso) {
        inputVerso.addEventListener('input', () => {
            const val = inputVerso.value.trim();
            document.getElementById('previewTextoVerso').textContent = val || 'Digite a resposta no formulário ao lado...';
        });
    }

    if (selectTipo) {
        selectTipo.addEventListener('change', () => {
            const ehEscrita = selectTipo.value === 'escrita';
            document.getElementById('previewTipoTag').textContent = ehEscrita ? 'Resposta Escrita' : 'Tradicional';
        });
    }

    if (selectBaralho) {
        selectBaralho.addEventListener('change', () => {
            const texto = selectBaralho.options[selectBaralho.selectedIndex]?.text || 'Baralho';
            document.getElementById('previewBaralhoTag').textContent = texto;
        });
    }

    // Botão de Virar Pré-visualização
    if (btnVirarPreview) {
        btnVirarPreview.addEventListener('click', () => {
            const faceFrente = document.getElementById('previewFaceFrente');
            const faceVerso = document.getElementById('previewFaceVerso');
            const labelFace = document.getElementById('labelFaceAtual');

            if (facePreviewAtual === 'frente') {
                facePreviewAtual = 'verso';
                faceFrente.classList.add('d-none');
                faceVerso.classList.remove('d-none');
                if (labelFace) labelFace.textContent = 'Verso';
            } else {
                facePreviewAtual = 'frente';
                faceFrente.classList.remove('d-none');
                faceVerso.classList.add('d-none');
                if (labelFace) labelFace.textContent = 'Frente';
            }
        });
    }

    // Submissão do Formulário
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const token = getToken();
            if (!token) {
                exibirFeedback('Sessão expirada. Faça login novamente.', 'danger');
                return;
            }

            const baralhoId = selectBaralho.value;
            const frente = inputFrente.value.trim();
            const verso = inputVerso.value.trim();
            const tipo = selectTipo.value;

            if (!baralhoId || !frente || !verso) {
                exibirFeedback('Por favor, preencha todos os campos obrigatórios (*).', 'warning');
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

                exibirFeedback('Cartão criado com sucesso! Você pode continuar adicionando outros.', 'success');

                // Limpar campos para novo cartão e atualizar preview
                inputFrente.value = '';
                inputVerso.value = '';
                document.getElementById('previewTextoFrente').textContent = 'Digite a pergunta no formulário ao lado...';
                document.getElementById('previewTextoVerso').textContent = 'Digite a resposta no formulário ao lado...';
                
                // Volta preview para frente
                if (facePreviewAtual === 'verso') {
                    btnVirarPreview.click();
                }

                inputFrente.focus();

            } catch (error) {
                console.error('Erro ao salvar cartão:', error);
                exibirFeedback('Erro de conexão com o servidor ao criar cartão.', 'danger');
            }
        });
    }
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
                document.getElementById('previewBaralhoTag').textContent = baralho.nome;
            }

            select.appendChild(option);
        });

    } catch (error) {
        console.error('Erro ao carregar baralhos:', error);
        select.innerHTML = '<option value="" disabled selected>Erro ao carregar baralhos</option>';
    }
}

function exibirFeedback(mensagem, tipo) {
    const feedbackDiv = document.getElementById('mensagemFeedback');
    if (!feedbackDiv) return;

    feedbackDiv.className = `alert alert-${tipo === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    feedbackDiv.style.borderRadius = '16px';
    feedbackDiv.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
    feedbackDiv.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5"></i>
            <div>${mensagem}</div>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    feedbackDiv.classList.remove('d-none');

    setTimeout(() => {
        feedbackDiv.classList.add('d-none');
    }, 4000);
}
