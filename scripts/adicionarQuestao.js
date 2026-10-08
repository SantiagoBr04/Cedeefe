document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = '/api';
    const token = typeof obterToken === 'function' ? obterToken() : (localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token'));

    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin("Você precisa estar logado como administrador!");
        } else {
            window.location.href = "login.html";
        }
        return;
    }

    const selectDisciplina = document.getElementById('disciplina-select');
    const selectTema = document.getElementById('tema-select');
    const containerAlternativas = document.getElementById('container-alternativas-add');
    const formAddQuestao = document.getElementById('form-add-questao');

    let disciplinasCache = [];
    let temasCache = [];
    let subtemasCache = [];

    // Instancia a sessão de imagens para controlar o upload/descarte nesta questão
    const sessaoImagens = new SessaoImagensQuestao();

    // 1. Inicializa o Editor do Enunciado e da Explicação
    const editorEnunciado = new EditorQuestao('#container-editor-enunciado', {
        placeholder: 'Digite o enunciado completo da questão aqui... Use a barra acima para formatar.',
        compact: false,
        permitirImagem: true,
        sessaoImagens: sessaoImagens
    });

    const editorExplicacao = new EditorQuestao('#container-editor-explicacao', {
        placeholder: 'Explique o passo a passo da resolução da questão (aparecerá para o aluno após responder).',
        compact: false,
        permitirImagem: true,
        sessaoImagens: sessaoImagens
    });

    // Editores para cada alternativa (A, B, C, D, E)
    const editoresAlternativas = [];

    // 2. Carrega Disciplinas e Temas da API
    async function carregarAuxiliares() {
        try {
            const [respDisc, respTemas, respSubtemas] = await Promise.all([
                fetch(`${API_BASE_URL}/disciplinas`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/temas`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/subtemas`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (respDisc.ok) disciplinasCache = await respDisc.json();
            if (respTemas.ok) temasCache = await respTemas.json();
            if (respSubtemas.ok) subtemasCache = await respSubtemas.json();

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
            
            const containerSubtemas = document.getElementById('container-subtemas-add');
            if (containerSubtemas) {
                containerSubtemas.innerHTML = '<div class="text-muted small mt-2">Selecione um tema com subtemas.</div>';
            }
        });
    }
    
    if (selectTema) {
        selectTema.addEventListener('change', (e) => {
            const temaCod = e.target.value;
            const containerSubtemas = document.getElementById('container-subtemas-add');
            if (containerSubtemas) {
                const subtemasFiltrados = temaCod ? subtemasCache.filter(s => String(s.tema_cod) === String(temaCod)) : [];
                if (subtemasFiltrados.length === 0) {
                    containerSubtemas.innerHTML = '<div class="text-muted small mt-2">Nenhum subtema ou selecione um tema.</div>';
                } else {
                    containerSubtemas.innerHTML = subtemasFiltrados.map(s => `
                        <div class="form-check form-check-inline">
                            <input class="form-check-input check-subtema" type="checkbox" value="${s.cod}" id="subt-add-${s.cod}">
                            <label class="form-check-label" for="subt-add-${s.cod}">
                                ${escapeHtml(s.descricao)}
                            </label>
                        </div>
                    `).join('');
                }
            }
        });
    }

    // Helper for encoding HTML
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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
                compact: true,
                permitirImagem: true,
                sessaoImagens: sessaoImagens
            });

            editoresAlternativas.push(editorAlt);
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
        
        const checksSubtemas = document.querySelectorAll('.check-subtema:checked');
        const subtemasCods = Array.from(checksSubtemas).map(cb => parseInt(cb.value, 10));

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
        if (subtemasCods.length > 0) formData.append('subtemas_cods', JSON.stringify(subtemasCods));
        if (autor) formData.append('autor', autor);
        if (ano) formData.append('ano', ano);
        if (explicacaoHtml) formData.append('explicacao', explicacaoHtml);

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
                // Confirmar as imagens usando os HTMLs que enviamos
                await sessaoImagens.finalizar(enunciadoHtml, explicacaoHtml, ...alternativasPayload.map(a => a.texto));

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