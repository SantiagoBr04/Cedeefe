document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'http://localhost:3000/api';
    const token = typeof obterToken === 'function' ? obterToken() : (localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token'));

    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin("Você precisa estar logado como administrador!");
        } else {
            window.location.href = "login.html";
        }
        return;
    }

    function formatarUrlImagem(url) {
        if (!url || typeof url !== 'string') return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        return `http://localhost:3000${url.startsWith('/') ? url : '/' + url}`;
    }

    const selectDisciplina = document.getElementById('disciplina-select');
    const selectTema = document.getElementById('tema-select');
    const containerAlternativas = document.getElementById('container-alternativas-add');
    const formAddQuestao = document.getElementById('form-add-questao');

    let disciplinasCache = [];
    let temasCache = [];

    // 1. Inicializa o Editor do Enunciado e da Explicação
    const editorEnunciado = new EditorQuestao('#container-editor-enunciado', {
        placeholder: 'Digite o enunciado completo da questão aqui... Use a barra acima para formatar.',
        compact: false
    });

    const editorExplicacao = new EditorQuestao('#container-editor-explicacao', {
        placeholder: 'Explique o passo a passo da resolução da questão (aparecerá para o aluno após responder).',
        compact: false
    });

    // Editores para cada alternativa (A, B, C, D, E)
    const editoresAlternativas = [];

    // Lógica do Upload de Imagem e Gerador de Tag <img>
    const inputImagemGeral = document.getElementById('input-imagem');
    let imagemEnviadaUrl = null;

    if (inputImagemGeral) {
        inputImagemGeral.addEventListener('change', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('imagem', file);

            try {
                const parentBox = inputImagemGeral.closest('.bg-light');
                let statusMsg = parentBox.querySelector('.status-upload');
                if (!statusMsg) {
                    statusMsg = document.createElement('div');
                    statusMsg.className = 'status-upload mt-2 text-primary font-weight-bold';
                    parentBox.appendChild(statusMsg);
                }
                statusMsg.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando imagem ao servidor...';

                const response = await fetch(`${API_BASE_URL}/questoes/upload-imagem`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erro no upload.');

                imagemEnviadaUrl = data.imagem_url;
                const previewSrc = formatarUrlImagem(imagemEnviadaUrl);

                // Renderiza a tag pronta e botões simples para colocar a tag de imagem no enunciado ou explicação
                statusMsg.className = 'status-upload mt-3 p-3 bg-white rounded border shadow-sm';
                statusMsg.innerHTML = `
                    <div class="d-flex align-items-center gap-3 flex-wrap">
                        <img src="${previewSrc}" class="rounded border shadow-sm" style="max-height: 100px; max-width: 180px; object-fit: contain;" alt="Preview">
                        <div>
                            <p class="mb-1 font-weight-bold text-success"><i class="bi bi-check-circle-fill me-1"></i> Imagem enviada com sucesso!</p>
                            <small class="text-muted d-block mb-2">URL: <code>${imagemEnviadaUrl}</code></small>
                            <div class="d-flex gap-2 flex-wrap">
                                <button type="button" class="btn btn-sm btn-success btn-inserir-tag-enunciado">
                                    <i class="bi bi-plus-circle me-1"></i> Inserir Tag no Enunciado
                                </button>
                                <button type="button" class="btn btn-sm btn-primary btn-inserir-tag-gabarito">
                                    <i class="bi bi-plus-circle me-1"></i> Inserir Tag no Gabarito
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                statusMsg.querySelector('.btn-inserir-tag-enunciado').addEventListener('click', (ev) => {
                    ev.preventDefault();
                    editorEnunciado.inserirTagImagem(imagemEnviadaUrl);
                });

                statusMsg.querySelector('.btn-inserir-tag-gabarito').addEventListener('click', (ev) => {
                    ev.preventDefault();
                    editorExplicacao.inserirTagImagem(imagemEnviadaUrl);
                });

            } catch (err) {
                console.error('Erro no upload de imagem:', err);
                alert(`Erro ao fazer upload da imagem: ${err.message}`);
            }
        });
    }

    // 2. Carrega Disciplinas e Temas da API
    async function carregarAuxiliares() {
        try {
            const [respDisc, respTemas] = await Promise.all([
                fetch(`${API_BASE_URL}/disciplinas`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/temas`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (respDisc.ok) disciplinasCache = await respDisc.json();
            if (respTemas.ok) temasCache = await respTemas.json();

            renderizarSelectDisciplinas();
        } catch (err) {
            console.error('Erro ao carregar dados auxiliares:', err);
            if (selectDisciplina) selectDisciplina.innerHTML = '<option value="">Erro ao carregar disciplinas</option>';
        }
    }

    function renderizarSelectDisciplinas() {
        if (!selectDisciplina) return;
        selectDisciplina.innerHTML = '<option value="">-- Selecione uma Disciplina --</option>';
        disciplinasCache.forEach(d => {
            const option = document.createElement('option');
            option.value = d.cod;
            option.textContent = d.descricao || d.nome || `Disciplina #${d.cod}`;
            selectDisciplina.appendChild(option);
        });
    }

    if (selectDisciplina && selectTema) {
        selectDisciplina.addEventListener('change', (e) => {
            const discCod = e.target.value;
            if (!discCod) {
                selectTema.innerHTML = '<option value="">-- Selecione uma disciplina primeiro --</option>';
                return;
            }

            const temasFiltrados = temasCache.filter(t => String(t.disciplina_cod) === String(discCod));
            selectTema.innerHTML = '<option value="">-- Nenhum tema específico --</option>' + temasFiltrados.map(t =>
                `<option value="${t.cod}">${t.descricao || t.nome || `Tema #${t.cod}`}</option>`
            ).join('');
        });
    }

    // 3. Renderiza as 5 Alternativas (A, B, C, D, E)
    function renderizarAlternativas() {
        if (!containerAlternativas) return;
        containerAlternativas.innerHTML = '';
        editoresAlternativas.length = 0;

        const letras = ['A', 'B', 'C', 'D', 'E'];

        letras.forEach((letra, idx) => {
            const isCorretaPadrao = (idx === 0);
            const cardAlt = document.createElement('div');
            cardAlt.className = `card mb-3 border ${isCorretaPadrao ? 'border-success bg-light-subtle' : ''}`;
            cardAlt.id = `card-alt-${idx}`;

            cardAlt.innerHTML = `
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                        <div class="form-check form-radio-lg">
                            <input class="form-check-input radio-correta cursor-pointer" type="radio" name="correta" value="${idx}" id="radio-alt-${idx}" ${isCorretaPadrao ? 'checked' : ''}>
                            <label class="form-check-input-label fw-bold cursor-pointer ms-1 text-dark" for="radio-alt-${idx}">
                                Alternativa ${letra} ${isCorretaPadrao ? '<span class="badge bg-success ms-1">Correta</span>' : ''}
                            </label>
                        </div>
                        <label class="btn btn-sm btn-outline-primary mb-0 d-inline-flex align-items-center gap-1 cursor-pointer">
                            <i class="bi bi-upload"></i> Imagem p/ Alt ${letra}
                            <input type="file" class="d-none input-file-alt" data-altindex="${idx}" accept="image/*">
                        </label>
                    </div>
                    <div id="editor-alt-container-${idx}"></div>
                </div>
            `;

            containerAlternativas.appendChild(cardAlt);

            const radio = cardAlt.querySelector('.radio-correta');
            radio.addEventListener('change', () => {
                document.querySelectorAll('#container-alternativas-add .card').forEach((c, cIdx) => {
                    if (cIdx === idx) {
                        c.classList.add('border-success', 'bg-light-subtle');
                        const label = c.querySelector('.form-check-input-label');
                        if (label) label.innerHTML = `Alternativa ${letras[cIdx]} <span class="badge bg-success ms-1">Correta</span>`;
                    } else {
                        c.classList.remove('border-success', 'bg-light-subtle');
                        const label = c.querySelector('.form-check-input-label');
                        if (label) label.innerHTML = `Alternativa ${letras[cIdx]}`;
                    }
                });
            });

            const editorAlt = new EditorQuestao(`#editor-alt-container-${idx}`, {
                placeholder: `Texto ou imagem para a alternativa ${letra}...`,
                compact: true
            });

            editoresAlternativas.push(editorAlt);

            const fileAltInput = cardAlt.querySelector('.input-file-alt');
            fileAltInput.addEventListener('change', async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();

                const file = ev.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('imagem', file);

                try {
                    const response = await fetch(`${API_BASE_URL}/questoes/upload-imagem`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData
                    });

                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Erro no upload.');

                    editorAlt.inserirTagImagem(data.imagem_url);
                } catch (err) {
                    console.error('Erro no upload de imagem da alternativa:', err);
                    alert(`Erro ao carregar imagem para alternativa: ${err.message}`);
                }
            });
        });
    }

    formAddQuestao.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && ev.target.tagName === 'INPUT' && ev.target.type !== 'submit') {
            ev.preventDefault();
        }
    });

    // 4. Submissão do Formulário
    formAddQuestao.addEventListener('submit', async (e) => {
        e.preventDefault();

        const enunciadoHtml = editorEnunciado.obterHtml();
        const enunciadoTexto = editorEnunciado.obterTexto();
        const explicacaoHtml = editorExplicacao.obterHtml();

        const disciplinaCod = selectDisciplina.value;
        const temaCod = selectTema ? selectTema.value : null;
        const autor = document.getElementById('autor-input').value.trim();
        const ano = document.getElementById('ano-input').value;

        if (!disciplinaCod) return alert("Selecione uma disciplina para a questão!");
        if (!enunciadoTexto && !enunciadoHtml) return alert("O enunciado da questão não pode ficar em branco!");

        const radioCorreta = document.querySelector('input[name="correta"]:checked');
        if (!radioCorreta) return alert("Marque qual alternativa é a correta!");

        const indexCorreta = parseInt(radioCorreta.value, 10);
        const alternativasPayload = [];

        editoresAlternativas.forEach((editor, idx) => {
            const htmlAlt = editor.obterHtml();
            const textoAlt = editor.obterTexto();

            alternativasPayload.push({
                texto: htmlAlt || textoAlt,
                correta: (idx === indexCorreta)
            });
        });

        const alternativasValidas = alternativasPayload.filter(a => a.texto && a.texto.trim() !== '');
        if (alternativasValidas.length < 2) {
            return alert("Preencha pelo menos 2 alternativas para criar a questão!");
        }

        const formData = new FormData();
        formData.append('descricao', enunciadoHtml);
        formData.append('disciplina_cod', disciplinaCod);
        if (temaCod) formData.append('tema_cod', temaCod);
        if (autor) formData.append('autor', autor);
        if (ano) formData.append('ano', ano);
        if (explicacaoHtml) formData.append('explicacao', explicacaoHtml);
        if (imagemEnviadaUrl) formData.append('imagem_url', imagemEnviadaUrl);

        formData.append('alternativas', JSON.stringify(alternativasPayload));

        try {
            const btnSubmit = formAddQuestao.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

            const response = await fetch(`${API_BASE_URL}/questoes`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Sucesso! Questão adicionada com código #${result.cod}`);
                formAddQuestao.reset();
                editorEnunciado.definirHtml('');
                editorExplicacao.definirHtml('');
                editoresAlternativas.forEach(ed => ed.definirHtml(''));
            } else {
                throw new Error(result.error || "Erro desconhecido ao salvar questão.");
            }

        } catch (error) {
            alert("Erro ao salvar questão: " + error.message);
            console.error(error);
        } finally {
            const btnSubmit = formAddQuestao.querySelector('button[type="submit"]');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-check-lg me-1"></i> Salvar Questão';
        }
    });

    await carregarAuxiliares();
    renderizarAlternativas();
});