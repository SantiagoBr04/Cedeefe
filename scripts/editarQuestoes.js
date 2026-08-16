document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '/api';
    const token = typeof obterToken === 'function' ? obterToken() : (localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token'));

    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin('Sessão expirada. Faça login para acessar esta página.');
        } else {
            window.location.href = 'login.html';
        }
        return;
    }

    // Elementos DOM
    const containerQuestoes = document.getElementById('container-questoes-editar');
    const badgeTotalQuestoes = document.getElementById('badge-total-questoes');
    const alertaFeedback = document.getElementById('alerta-feedback');
    const containerPaginacao = document.getElementById('container-paginacao');
    const formFiltros = document.getElementById('form-filtros');
    const selectDisciplina = document.getElementById('filtro-disciplina');
    const selectTema = document.getElementById('filtro-tema');
    const selectAno = document.getElementById('filtro-ano');
    const selectAutor = document.getElementById('filtro-autor');
    const inputBusca = document.getElementById('filtro-busca');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao');
    const modalExclusaoEl = document.getElementById('modalConfirmarExclusao');
    let modalExclusaoInstance = null;

    if (modalExclusaoEl && typeof bootstrap !== 'undefined') {
        modalExclusaoInstance = new bootstrap.Modal(modalExclusaoEl);
    }

    let disciplinasCache = [];
    let temasCache = [];
    let anosCache = [];
    let autoresCache = [];
    let questaoCodParaExcluir = null;
    let paginaAtual = 1;

    // Mapa para guardar instâncias ativas do EditorQuestao por ID do card
    const editoresAtivos = new Map();

    function formatarUrlImagem(url) {
        if (!url || typeof url !== 'string') return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        return url.startsWith('/') ? url : '/' + url;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function exibirAlerta(mensagem, tipo = 'alert-success') {
        if (!alertaFeedback) return;
        alertaFeedback.className = `alert ${tipo} alert-dismissible fade show shadow-sm`;
        alertaFeedback.innerHTML = `
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertaFeedback.classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function carregarFiltrosEAuxiliares() {
        try {
            const [respDisc, respTemas, respFiltros] = await Promise.all([
                fetch(`${API_BASE_URL}/disciplinas`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/temas`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/questoes/filtros`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (respDisc.ok) disciplinasCache = await respDisc.json();
            if (respTemas.ok) temasCache = await respTemas.json();
            if (respFiltros.ok) {
                const filtrosData = await respFiltros.json();
                anosCache = filtrosData.anos || [];
                autoresCache = filtrosData.autores || [];
            }

            preencherSelectDisciplinas();
            preencherSelectAnos();
            preencherSelectAutores();
            atualizarSelectTemas();

        } catch (err) {
            console.error('Erro ao carregar auxiliares dos filtros:', err);
        }
    }

    function preencherSelectDisciplinas() {
        if (!selectDisciplina) return;
        selectDisciplina.innerHTML = '<option value="">Todas as disciplinas</option>' +
            disciplinasCache.map(d => `<option value="${d.cod}">${escapeHtml(d.descricao || d.nome)}</option>`).join('');
    }

    function preencherSelectAnos() {
        if (!selectAno) return;
        selectAno.innerHTML = '<option value="">Todos os anos</option>' +
            anosCache.map(a => `<option value="${a}">${a}</option>`).join('');
    }

    function preencherSelectAutores() {
        if (!selectAutor) return;
        selectAutor.innerHTML = '<option value="">Todos os autores</option>' +
            autoresCache.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    }

    function atualizarSelectTemas(disciplinaCod = '') {
        if (!selectTema) return;
        let temasFiltrados = temasCache;
        if (disciplinaCod) {
            temasFiltrados = temasCache.filter(t => String(t.disciplina_cod) === String(disciplinaCod));
        }

        selectTema.innerHTML = '<option value="">Todos os temas</option>' +
            temasFiltrados.map(t => `<option value="${t.cod}">${escapeHtml(t.descricao || t.nome)}</option>`).join('');
    }

    if (selectDisciplina) {
        selectDisciplina.addEventListener('change', (e) => {
            atualizarSelectTemas(e.target.value);
        });
    }

    async function buscarQuestoes(pagina = 1) {
        paginaAtual = pagina;
        if (containerQuestoes) {
            containerQuestoes.innerHTML = `
                <div class="text-center py-5 bg-white rounded shadow-sm border">
                    <div class="spinner-border text-verde mb-3" role="status"></div>
                    <p class="text-muted fw-semibold mb-0">Carregando questões do banco de dados...</p>
                </div>
            `;
        }

        const params = new URLSearchParams();
        params.append('pagina', pagina);
        params.append('limite', '10');

        if (selectDisciplina && selectDisciplina.value) params.append('disciplina_cod', selectDisciplina.value);
        if (selectTema && selectTema.value) params.append('tema_cod', selectTema.value);
        if (selectAno && selectAno.value) params.append('ano', selectAno.value);
        if (selectAutor && selectAutor.value) params.append('autor', selectAutor.value);
        if (inputBusca && inputBusca.value.trim()) params.append('busca', inputBusca.value.trim());

        try {
            const resp = await fetch(`${API_BASE_URL}/questoes?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!resp.ok) {
                exibirAlerta('Erro ao carregar a lista de questões do servidor.', 'alert-danger');
                return;
            }

            const data = await resp.json();
            const questoes = data.questoes || [];

            if (badgeTotalQuestoes) {
                badgeTotalQuestoes.textContent = `${data.total || 0} questão(ões) encontrada(s)`;
            }

            renderizarQuestoes(questoes);
            renderizarPaginacao(data.total || 0, data.paginas || 1, data.paginaAtual || 1);

        } catch (err) {
            console.error('Erro ao buscar questões:', err);
            exibirAlerta('Erro de conexão com o servidor ao consultar questões.', 'alert-danger');
        }
    }

    function renderizarQuestoes(questoes) {
        if (!containerQuestoes) return;
        editoresAtivos.clear();

        if (!Array.isArray(questoes) || questoes.length === 0) {
            containerQuestoes.innerHTML = `
                <div class="card p-5 text-center bg-white shadow-sm border">
                    <i class="bi bi-search display-4 text-muted mb-3"></i>
                    <h5 class="fw-bold text-dark mb-1">Nenhuma questão encontrada</h5>
                    <p class="text-muted mb-0">Tente ajustar os filtros ou limpar a pesquisa para exibir outras questões.</p>
                </div>
            `;
            return;
        }

        containerQuestoes.innerHTML = meConstruirCardsHtml(questoes);
        vincularEventosCards(questoes);
    }

    function meConstruirCardsHtml(questoes) {
        return questoes.map((q, idx) => {
            const discNome = q.disciplina ? (q.disciplina.descricao || q.disciplina.nome) : 'Sem Disciplina';
            const temaNome = q.tema ? (q.tema.descricao || q.tema.nome) : 'Sem Tema';
            const autorStr = q.autor ? q.autor : 'N/A';
            const anoStr = q.ano ? q.ano : 'N/A';
            const imagemUrlFmt = q.imagem_url ? formatarUrlImagem(q.imagem_url) : '';

            // Alternativas no Modo Leitura
            const alternativasHtml = Array.isArray(q.alternativas) ? q.alternativas.map((alt, i) => {
                const letra = String.fromCharCode(65 + i);
                const isCorreta = Boolean(alt.correta);
                return `
                    <div class="alternativa-item-leitura ${isCorreta ? 'correta' : ''}">
                        <span class="badge-alternativa">${letra}</span>
                        <div class="flex-grow-1">${alt.texto || ''}</div>
                        ${isCorreta ? '<span class="badge bg-success text-white"><i class="bi bi-check-lg me-1"></i>Gabarito</span>' : ''}
                    </div>
                `;
            }).join('') : '';

            return `
                <div class="card card-questao-gerenciamento shadow-sm border mb-4" id="card-questao-${q.cod}">
                    <!-- Cabeçalho do Card -->
                    <div class="questao-card-header p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div class="d-flex align-items-center flex-wrap gap-2">
                            <span class="badge bg-dark fs-6">Questão #${q.cod}</span>
                            <span class="badge bg-primary">${escapeHtml(discNome)}</span>
                            <span class="badge bg-info text-dark">${escapeHtml(temaNome)}</span>
                            <span class="badge bg-light text-dark border">
                                <i class="bi bi-building me-1"></i>${escapeHtml(autorStr)} ${anoStr !== 'N/A' ? `(${anoStr})` : ''}
                            </span>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary btn-toggle-editar" data-cod="${q.cod}">
                                <i class="bi bi-pencil me-1"></i>Editar
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-abrir-excluir" data-cod="${q.cod}">
                                <i class="bi bi-trash me-1"></i>Excluir
                            </button>
                        </div>
                    </div>

                    <!-- Conteúdo: Modo Leitura -->
                    <div class="card-body p-4 modo-leitura" id="modo-leitura-${q.cod}">
                        <div class="mb-3 text-dark fs-6 questao-enunciado-preview">
                            ${q.descricao || ''}
                        </div>

                        ${imagemUrlFmt ? `
                            <div class="mb-3 text-center">
                                <img src="${imagemUrlFmt}" alt="Imagem da questão" class="img-fluid rounded border shadow-sm style="max-height:260px;">
                            </div>
                        ` : ''}

                        <h6 class="fw-bold mb-2 text-secondary"><i class="bi bi-list-check me-1"></i>Alternativas:</h6>
                        <div class="mb-3">
                            ${alternativasHtml}
                        </div>

                        ${q.explicacao ? `
                            <div class="p-3 bg-light rounded border border-info border-start border-4">
                                <strong class="text-info d-block mb-1"><i class="bi bi-lightbulb me-1"></i>Explicação / Resolução:</strong>
                                <div>${q.explicacao}</div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Conteúdo: Modo Edição (Oculto inicialmente) -->
                    <div class="card-body p-4 modo-edicao d-none" id="modo-edicao-${q.cod}">
                        <form id="form-editar-questao-${q.cod}">
                            <div class="row g-3 mb-3">
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold text-secondary">Disciplina *</label>
                                    <select class="form-select select-edicao-disciplina" data-cod="${q.cod}" id="edit-disciplina-${q.cod}" required>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold text-secondary">Tema</label>
                                    <select class="form-select select-edicao-tema" id="edit-tema-${q.cod}">
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold text-secondary">Autor / Prova</label>
                                    <input type="text" class="form-control" id="edit-autor-${q.cod}" value="${escapeHtml(q.autor || '')}" placeholder="Ex: IFC, IFRJ, Federal...">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold text-secondary">Ano</label>
                                    <input type="number" class="form-control" id="edit-ano-${q.cod}" value="${q.ano || ''}" placeholder="Ex: 2024">
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label fw-semibold text-secondary">Enunciado da Questão *</label>
                                <div id="editor-enunciado-container-${q.cod}" class="editor-container-wrap"></div>
                            </div>

                            <!-- Gerenciamento de Imagem da Questão -->
                            <div class="mb-3 p-3 bg-light rounded border">
                                <label class="form-label fw-semibold text-secondary d-block">Imagem Ilustrativa</label>
                                <div class="d-flex align-items-center flex-wrap gap-3">
                                    <input type="file" class="form-control input-imagem-upload" id="edit-imagem-input-${q.cod}" accept="image/*" style="max-width:320px;">
                                    <button type="button" class="btn btn-sm btn-outline-secondary btn-remover-imagem" id="btn-remover-img-${q.cod}">
                                        <i class="bi bi-image-fill me-1"></i>Remover Imagem
                                    </button>
                                </div>
                                <input type="hidden" id="edit-imagem-url-${q.cod}" value="${q.imagem_url || ''}">
                                <div class="mt-2 text-center img-preview-box" id="img-preview-box-${q.cod}">
                                    ${imagemUrlFmt ? `<img src="${imagemUrlFmt}" class="img-fluid rounded border mt-2" style="max-height:180px;">` : ''}
                                </div>
                            </div>

                            <!-- Alternativas -->
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <label class="form-label fw-semibold text-secondary mb-0">Alternativas (Selecione a Correta) *</label>
                                    <button type="button" class="btn btn-sm btn-outline-success btn-add-alternativa" data-cod="${q.cod}">
                                        <i class="bi bi-plus-circle me-1"></i>Adicionar Opção
                                    </button>
                                </div>
                                <div id="container-alternativas-edicao-${q.cod}">
                                    <!-- Alternativas editáveis serão injetadas via JS -->
                                </div>
                            </div>

                            <!-- Explicação / Resolução -->
                            <div class="mb-3">
                                <label class="form-label fw-semibold text-secondary">Explicação / Resolução (Opcional)</label>
                                <textarea class="form-control" id="edit-explicacao-${q.cod}" rows="3" placeholder="Digite uma explicação passo a passo da resposta...">${q.explicacao || ''}</textarea>
                            </div>

                            <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                                <button type="button" class="btn btn-outline-secondary btn-cancelar-edicao" data-cod="${q.cod}">
                                    Cancelar
                                </button>
                                <button type="button" class="btn btn-verde px-4 font-weight-bold btn-salvar-edicao" data-cod="${q.cod}">
                                    <i class="bi bi-check-circle-fill me-1"></i>Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }).join('');
    }

    function vincularEventosCards(questoes) {
        questoes.forEach(q => {
            const cod = q.cod;

            // Botão Alternar Modo Edição
            const btnEditar = document.querySelector(`.btn-toggle-editar[data-cod="${cod}"]`);
            const btnCancelar = document.querySelector(`.btn-cancelar-edicao[data-cod="${cod}"]`);
            const btnSalvar = document.querySelector(`.btn-salvar-edicao[data-cod="${cod}"]`);
            const btnExcluir = document.querySelector(`.btn-abrir-excluir[data-cod="${cod}"]`);

            if (btnEditar) {
                btnEditar.addEventListener('click', () => abrirEdicaoCard(q));
            }

            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => fecharEdicaoCard(cod));
            }

            if (btnSalvar) {
                btnSalvar.addEventListener('click', () => salvarEdicaoCard(q));
            }

            if (btnExcluir) {
                btnExcluir.addEventListener('click', () => solicitarExclusaoQuestao(cod));
            }
        });
    }

    function abrirEdicaoCard(q) {
        const cod = q.cod;
        const modoLeitura = document.getElementById(`modo-leitura-${cod}`);
        const modoEdicao = document.getElementById(`modo-edicao-${cod}`);

        if (!modoEdicao || !modoLeitura) return;

        modoLeitura.classList.add('d-none');
        modoEdicao.classList.remove('d-none');

        // Preenche select de disciplinas
        const selectDisc = document.getElementById(`edit-disciplina-${cod}`);
        if (selectDisc) {
            selectDisc.innerHTML = disciplinasCache.map(d => `<option value="${d.cod}" ${String(d.cod) === String(q.disciplina_cod) ? 'selected' : ''}>${escapeHtml(d.descricao || d.nome)}</option>`).join('');

            selectDisc.addEventListener('change', () => {
                preencherSelectTemaEdicao(cod, selectDisc.value, q.tema_cod);
            });
        }

        preencherSelectTemaEdicao(cod, q.disciplina_cod, q.tema_cod);

        // Inicializa o EditorQuestao para a descrição caso ainda não tenha sido criado
        const editorContainer = document.getElementById(`editor-enunciado-container-${cod}`);
        if (editorContainer && !editoresAtivos.has(cod)) {
            const editorInstancia = new window.EditorQuestao(editorContainer, {
                initialValue: q.descricao || '',
                placeholder: 'Digite o enunciado da questão...'
            });
            editoresAtivos.set(cod, editorInstancia);
        }

        // Renderiza lista de alternativas editáveis
        renderizarAlternativasEdicao(cod, q.alternativas || []);

        // Eventos de Upload de Imagem
        const inputImg = document.getElementById(`edit-imagem-input-${cod}`);
        const btnRemoverImg = document.getElementById(`btn-remover-img-${cod}`);
        const imgHidden = document.getElementById(`edit-imagem-url-${cod}`);
        const previewBox = document.getElementById(`img-preview-box-${cod}`);

        if (inputImg) {
            inputImg.onchange = async () => {
                if (inputImg.files && inputImg.files[0]) {
                    const formData = new FormData();
                    formData.append('imagem', inputImg.files[0]);

                    try {
                        const resp = await fetch(`${API_BASE_URL}/questoes/upload-imagem`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                            body: formData
                        });

                        if (resp.ok) {
                            const resData = await resp.json();
                            imgHidden.value = resData.imagem_url;
                            const fmtUrl = formatarUrlImagem(resData.imagem_url);
                            if (previewBox) {
                                previewBox.innerHTML = `<img src="${fmtUrl}" class="img-fluid rounded border mt-2" style="max-height:180px;">`;
                            }
                        } else {
                            alert('Erro ao fazer upload da imagem.');
                        }
                    } catch (e) {
                        console.error('Erro no upload da imagem:', e);
                        alert('Erro de conexão ao enviar imagem.');
                    }
                }
            };
        }

        if (btnRemoverImg) {
            btnRemoverImg.onclick = () => {
                if (imgHidden) imgHidden.value = '';
                if (previewBox) previewBox.innerHTML = '';
                if (inputImg) inputImg.value = '';
            };
        }

        // Evento de Adicionar Nova Alternativa
        const btnAddAlt = document.querySelector(`.btn-add-alternativa[data-cod="${cod}"]`);
        if (btnAddAlt) {
            btnAddAlt.onclick = () => {
                adicionarNovaAlternativaEdicao(cod);
            };
        }
    }

    function fecharEdicaoCard(cod) {
        const modoLeitura = document.getElementById(`modo-leitura-${cod}`);
        const modoEdicao = document.getElementById(`modo-edicao-${cod}`);

        if (modoLeitura && modoEdicao) {
            modoEdicao.classList.add('d-none');
            modoLeitura.classList.remove('d-none');
        }
    }

    function preencherSelectTemaEdicao(cod, disciplinaCod, temaCodSelecionado) {
        const selectTemaEdit = document.getElementById(`edit-tema-${cod}`);
        if (!selectTemaEdit) return;

        let temasFiltrados = temasCache;
        if (disciplinaCod) {
            temasFiltrados = temasCache.filter(t => String(t.disciplina_cod) === String(disciplinaCod));
        }

        selectTemaEdit.innerHTML = '<option value="">Sem Tema Específico</option>' +
            temasFiltrados.map(t => `<option value="${t.cod}" ${String(t.cod) === String(temaCodSelecionado) ? 'selected' : ''}>${escapeHtml(t.descricao || t.nome)}</option>`).join('');
    }

    function renderizarAlternativasEdicao(cod, alternativas) {
        const container = document.getElementById(`container-alternativas-edicao-${cod}`);
        if (!container) return;

        let alts = Array.isArray(alternativas) && alternativas.length > 0 ? alternativas : [
            { texto: '', correta: true },
            { texto: '', correta: false },
            { texto: '', correta: false },
            { texto: '', correta: false }
        ];

        container.innerHTML = alts.map((alt, idx) => {
            const letra = String.fromCharCode(65 + idx);
            const isCorreta = Boolean(alt.correta);
            return `
                <div class="alternativa-edit-row d-flex align-items-center gap-3 ${isCorreta ? 'is-correct' : ''}" id="alt-edit-row-${cod}-${idx}">
                    <div class="form-check">
                        <input class="form-check-input radio-correta-${cod}" type="radio" name="radio-correta-${cod}" value="${idx}" ${isCorreta ? 'checked' : ''} id="radio-alt-${cod}-${idx}">
                        <label class="form-check-label fw-bold" for="radio-alt-${cod}-${idx}">${letra}</label>
                    </div>
                    <input type="text" class="form-control input-alt-texto-${cod}" value="${escapeHtml(alt.texto || '')}" placeholder="Texto da alternativa ${letra}..." required>
                    <button type="button" class="btn btn-sm btn-outline-danger btn-remove-alt" onclick="this.closest('.alternativa-edit-row').remove()">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    function adicionarNovaAlternativaEdicao(cod) {
        const container = document.getElementById(`container-alternativas-edicao-${cod}`);
        if (!container) return;

        const count = container.querySelectorAll('.alternativa-edit-row').length;
        const idx = count;
        const letra = String.fromCharCode(65 + idx);

        const row = document.createElement('div');
        row.className = 'alternativa-edit-row d-flex align-items-center gap-3';
        row.id = `alt-edit-row-${cod}-${idx}`;
        row.innerHTML = `
            <div class="form-check">
                <input class="form-check-input radio-correta-${cod}" type="radio" name="radio-correta-${cod}" value="${idx}" id="radio-alt-${cod}-${idx}">
                <label class="form-check-label fw-bold" for="radio-alt-${cod}-${idx}">${letra}</label>
            </div>
            <input type="text" class="form-control input-alt-texto-${cod}" value="" placeholder="Texto da alternativa ${letra}..." required>
            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-alt" onclick="this.closest('.alternativa-edit-row').remove()">
                <i class="bi bi-x-lg"></i>
            </button>
        `;
        container.appendChild(row);
    }

    async function salvarEdicaoCard(q) {
        const cod = q.cod;

        const editorInstancia = editoresAtivos.get(cod);
        const descricaoHtml = editorInstancia ? editorInstancia.obterHtml() : q.descricao;

        const disciplina_cod = document.getElementById(`edit-disciplina-${cod}`)?.value;
        const tema_cod = document.getElementById(`edit-tema-${cod}`)?.value || null;
        const autor = document.getElementById(`edit-autor-${cod}`)?.value || null;
        const ano = document.getElementById(`edit-ano-${cod}`)?.value || null;
        const explicacao = document.getElementById(`edit-explicacao-${cod}`)?.value || null;
        const imagem_url = document.getElementById(`edit-imagem-url-${cod}`)?.value || null;

        if (!descricaoHtml || !descricaoHtml.trim()) {
            alert('O enunciado da questão não pode estar vazio.');
            return;
        }

        if (!disciplina_cod) {
            alert('Selecione a disciplina da questão.');
            return;
        }

        // Coleta alternativas
        const containerAlts = document.getElementById(`container-alternativas-edicao-${cod}`);
        const rows = containerAlts ? containerAlts.querySelectorAll('.alternativa-edit-row') : [];
        const alternativasPayload = [];

        rows.forEach((row) => {
            const radio = row.querySelector(`input[type="radio"]`);
            const inputTexto = row.querySelector(`input[type="text"]`);
            if (inputTexto && inputTexto.value.trim() !== '') {
                alternativasPayload.push({
                    texto: inputTexto.value.trim(),
                    correta: Boolean(radio && radio.checked)
                });
            }
        });

        if (alternativasPayload.length < 2) {
            alert('A questão deve possuir pelo menos 2 alternativas com texto.');
            return;
        }

        const temCorreta = alternativasPayload.some(a => a.correta);
        if (!temCorreta) {
            alert('Selecione qual alternativa é a resposta correta.');
            return;
        }

        const payload = {
            descricao: descricaoHtml,
            disciplina_cod: parseInt(disciplina_cod),
            tema_cod: tema_cod ? parseInt(tema_cod) : null,
            autor,
            ano: ano ? parseInt(ano) : null,
            explicacao,
            imagem_url,
            alternativas: alternativasPayload
        };

        try {
            const resp = await fetch(`${API_BASE_URL}/questoes/${cod}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                const errData = await resp.json();
                exibirAlerta(errData.error || 'Erro ao atualizar a questão.', 'alert-danger');
                return;
            }

            exibirAlerta(`Questão #${cod} atualizada com sucesso!`, 'alert-success');
            buscarQuestoes(paginaAtual);

        } catch (err) {
            console.error('Erro ao salvar edição da questão:', err);
            exibirAlerta('Erro de conexão ao salvar alterações da questão.', 'alert-danger');
        }
    }

    function solicitarExclusaoQuestao(cod) {
        questaoCodParaExcluir = cod;
        const textoEl = document.getElementById('texto-confirmacao-exclusao');
        if (textoEl) {
            textoEl.innerHTML = `Tem certeza que deseja excluir permanentemente a <strong>Questão #${cod}</strong>?`;
        }

        if (modalExclusaoInstance) {
            modalExclusaoInstance.show();
        } else {
            if (confirm(`Tem certeza que deseja excluir permanentemente a Questão #${cod}?`)) {
                executarExclusaoQuestao(cod);
            }
        }
    }

    if (btnConfirmarExclusao) {
        btnConfirmarExclusao.addEventListener('click', async () => {
            if (questaoCodParaExcluir) {
                if (modalExclusaoInstance) {
                    modalExclusaoInstance.hide();
                }
                await executarExclusaoQuestao(questaoCodParaExcluir);
                questaoCodParaExcluir = null;
            }
        });
    }

    async function executarExclusaoQuestao(cod) {
        try {
            const resp = await fetch(`${API_BASE_URL}/questoes/${cod}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!resp.ok) {
                const errData = await resp.json();
                exibirAlerta(errData.error || 'Não foi possível excluir a questão.', 'alert-danger');
                return;
            }

            exibirAlerta(`Questão #${cod} excluída com sucesso do banco de dados!`, 'alert-success');
            buscarQuestoes(paginaAtual);

        } catch (err) {
            console.error('Erro ao excluir questão:', err);
            exibirAlerta('Erro de conexão ao tentar excluir a questão.', 'alert-danger');
        }
    }

    function renderizarPaginacao(total, paginas, paginaAtual) {
        if (!containerPaginacao) return;

        if (paginas <= 1) {
            containerPaginacao.innerHTML = '';
            return;
        }

        let html = `
            <button class="page-link-custom ${paginaAtual <= 1 ? 'disabled' : ''}" id="btn-page-prev">
                <i class="bi bi-chevron-left me-1"></i>Anterior
            </button>
            <span class="mx-2 text-muted fw-semibold small">Página ${paginaAtual} de ${paginas}</span>
            <button class="page-link-custom ${paginaAtual >= paginas ? 'disabled' : ''}" id="btn-page-next">
                Próxima<i class="bi bi-chevron-right ms-1"></i>
            </button>
        `;

        containerPaginacao.innerHTML = html;

        const btnPrev = document.getElementById('btn-page-prev');
        const btnNext = document.getElementById('btn-page-next');

        if (btnPrev && paginaAtual > 1) {
            btnPrev.addEventListener('click', () => buscarQuestoes(paginaAtual - 1));
        }

        if (btnNext && paginaAtual < paginas) {
            btnNext.addEventListener('click', () => buscarQuestoes(paginaAtual + 1));
        }
    }

    // Formulário de Filtros (Submit)
    if (formFiltros) {
        formFiltros.addEventListener('submit', (e) => {
            e.preventDefault();
            buscarQuestoes(1);
        });
    }

    // Botão Limpar Filtros
    if (btnLimparFiltros) {
        btnLimparFiltros.addEventListener('click', () => {
            if (selectDisciplina) selectDisciplina.value = '';
            if (selectTema) selectTema.value = '';
            if (selectAno) selectAno.value = '';
            if (selectAutor) selectAutor.value = '';
            if (inputBusca) inputBusca.value = '';

            atualizarSelectTemas();
            buscarQuestoes(1);
        });
    }

    // Inicialização da página
    carregarFiltrosEAuxiliares().then(() => {
        buscarQuestoes(1);
    });
});
