document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3000/api';
    const token = typeof obterToken === 'function' ? obterToken() : (localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token'));

    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin('Sessão expirada. Faça login para acessar esta página.');
        } else {
            window.location.href = 'login.html';
        }
        return;
    }

    // Elementos do DOM
    const formUpload = document.getElementById('form-upload-pdf');
    const cardUpload = document.getElementById('card-upload');
    const cardLoading = document.getElementById('card-loading');
    const alertaFeedback = document.getElementById('alerta-feedback');
    const selectDisciplinaPadrao = document.getElementById('disciplina-padrao');

    let disciplinasCache = [];

    // Carrega Disciplinas para preencher o seletor padrão
    async function carregarDisciplinas() {
        try {
            const resp = await fetch(`${API_BASE_URL}/disciplinas`, { headers: { Authorization: `Bearer ${token}` } });
            if (resp.ok) {
                disciplinasCache = await resp.json();
                preencherSelectDisciplinaPadrao(disciplinasCache);
            }
        } catch (err) {
            console.error('Erro ao carregar disciplinas:', err);
        }
    }

    function preencherSelectDisciplinaPadrao(disciplinas) {
        selectDisciplinaPadrao.innerHTML = '<option value="">-- Prova Multidisciplinar (Usar sugestão da IA) --</option>';
        disciplinas.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.cod;
            opt.textContent = d.descricao || d.nome || `Disciplina #${d.cod}`;
            selectDisciplinaPadrao.appendChild(opt);
        });
    }

    // Exibe a tela de conclusão após a análise da IA com link para revisão
    function exibirConclusaoAnalise(payload, loteId) {
        const urlDestino = loteId ? `revisarImportacaoPdf.html?loteId=${loteId}` : 'revisarImportacaoPdf.html';

        cardLoading.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-check-circle-fill text-verde display-3 mb-3"></i>
                <h3 class="fw-bold">Análise Concluída com Sucesso!</h3>
                <p class="text-muted fs-5">A IA extraiu ${payload.questoes.length} questões da sua prova e salvou o rascunho no servidor.</p>
                <div class="mt-4 d-flex justify-content-center gap-3 flex-wrap">
                    <a href="${urlDestino}" class="btn btn-verde btn-lg px-5 py-3 font-weight-bold shadow">
                        <i class="bi bi-box-arrow-up-right me-2"></i>Abrir Tela de Revisão desta Prova
                    </a>
                    <a href="revisarImportacaoPdf.html" class="btn btn-outline-secondary btn-lg px-4 py-3 font-weight-bold">
                        <i class="bi bi-folder2-open me-2"></i>Ver Todos os Rascunhos
                    </a>
                </div>
                <div class="mt-3">
                    <button class="btn btn-link text-secondary" id="btn-novo-upload">Enviar Outra Prova</button>
                </div>
            </div>
        `;

        document.getElementById('btn-novo-upload')?.addEventListener('click', () => {
            window.location.reload();
        });

        exibirAlerta('A análise foi concluída! Clique no botão acima para acessar a revisão.', 'alert-success');
    }

    // Manipula o envio dos PDFs
    formUpload.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileProva = document.getElementById('input-pdf-prova').files[0];
        const fileGabarito = document.getElementById('input-pdf-gabarito').files[0];
        const autorGlobal = document.getElementById('autor-global').value;
        const anoGlobal = document.getElementById('ano-global').value;
        const disciplinaPadraoCod = selectDisciplinaPadrao.value;

        if (!fileProva || !fileGabarito) {
            exibirAlerta('Por favor, selecione ambos os arquivos PDF (Prova e Gabarito).', 'alert-danger');
            return;
        }

        const formData = new FormData();
        formData.append('pdf_prova', fileProva);
        formData.append('pdf_gabarito', fileGabarito);
        if (autorGlobal) formData.append('autor', autorGlobal);
        if (anoGlobal) formData.append('ano', anoGlobal);
        if (disciplinaPadraoCod) formData.append('disciplina_padrao_cod', disciplinaPadraoCod);

        // Exibe o card animado de carregamento na página
        cardUpload.classList.add('d-none');
        cardLoading.classList.remove('d-none');
        alertaFeedback.classList.add('d-none');

        try {
            console.log('[ImportPDF UI] Enviando requisição de análise ao backend...');
            const response = await fetch(`${API_BASE_URL}/questoes/importar-pdf-analise`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const dados = await response.json();

            if (!response.ok) {
                throw new Error(dados.error || 'Falha ao analisar os arquivos PDF.');
            }

            const questoesExtraidas = dados.questoes || [];

            if (!questoesExtraidas || questoesExtraidas.length === 0) {
                throw new Error('A IA não retornou nenhuma questão válida.');
            }

            const payload = {
                questoes: questoesExtraidas,
                autor: autorGlobal,
                ano: anoGlobal,
                disciplinaPadraoCod
            };

            exibirConclusaoAnalise(payload, dados.loteId);

        } catch (error) {
            console.error('Erro na análise:', error);

            cardLoading.classList.add('d-none');
            cardUpload.classList.remove('d-none');
            exibirAlerta(error.message, 'alert-danger');
        }
    });

    function exibirAlerta(msg, tipo) {
        alertaFeedback.className = `alert ${tipo}`;
        alertaFeedback.textContent = msg;
        alertaFeedback.classList.remove('d-none');
        alertaFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Inicialização
    carregarDisciplinas();
});
