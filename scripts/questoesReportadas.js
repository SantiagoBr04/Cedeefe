document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'http://localhost:3000/api';
    const accordionContainer = document.getElementById('accordionQuestoes');
    const estadoVazioContainer = document.getElementById('estado-vazio-reportes');

    const token = typeof obterToken === 'function' ? obterToken() : (localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token'));

    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin('Acesso negado: Faça login como administrador.');
        } else {
            window.location.href = 'login.html';
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

    const editoresPorQuestao = new Map();
    let disciplinasCache = [];
    let temasCache = [];

    async function carregarDisciplinasETemas() {
        try {
            const [respDisc, respTemas] = await Promise.all([
                fetch(`${API_BASE_URL}/disciplinas`),
                fetch(`${API_BASE_URL}/temas`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (respDisc.ok) disciplinasCache = await respDisc.json();
            if (respTemas.ok) temasCache = await respTemas.json();
        } catch (err) {
            console.warn('Aviso ao carregar disciplinas e temas:', err);
        }
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

    async function carregarQuestoesReportadas() {
        try {
            if (disciplinasCache.length === 0) {
                await carregarDisciplinasETemas();
            }

            const response = await fetch(`${API_BASE_URL}/admin/questoes-reportadas`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Falha ao carregar lista de questões reportadas.');
            }

            const dados = await response.json();
            editoresPorQuestao.clear();

            if (!Array.isArray(dados) || dados.length === 0) {
                if (estadoVazioContainer) estadoVazioContainer.style.display = 'block';
                if (accordionContainer) {
                    accordionContainer.style.display = 'none';
                    accordionContainer.innerHTML = '';
                }
                return;
            }

            if (estadoVazioContainer) estadoVazioContainer.style.display = 'none';
            if (accordionContainer) {
                accordionContainer.style.display = 'block';
                accordionContainer.innerHTML = '';
            }

            dados.forEach((item) => {
                const questao = item.questao;
                const reportes = item.reportes || [];
                const totalReportes = item.total_reportes || reportes.length;
                const collapseId = `questao-collapse-${questao.cod}`;
                const headingId = `heading-${questao.cod}`;

                const itemElement = document.createElement('div');
                itemElement.classList.add('accordion-item', 'questao-item');

                let HTMLMotivos = '';
                reportes.forEach((rep) => {
                    const dataStr = rep.data ? new Date(rep.data).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '';

                    HTMLMotivos += `
                        <div class="item-reporte-unico mb-2">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="rep-autor">
                                    <i class="bi bi-person-circle me-1"></i>
                                    ${escapeHtml(rep.usuario ? rep.usuario.nome_completo : 'Usuário')}
                                    ${rep.usuario ? `(@${escapeHtml(rep.usuario.login)})` : ''}
                                </span>
                                <small class="text-muted">${dataStr}</small>
                            </div>
                            <div class="rep-motivo"><i class="bi bi-tag-fill me-1"></i>${escapeHtml(rep.motivo)}</div>
                            ${rep.descricao_detalhada ? `
                                <p class="mt-2 mb-0 text-secondary" style="font-style: italic;">
                                    "${escapeHtml(rep.descricao_detalhada)}"
                                </p>
                            ` : ''}
                        </div>
                    `;
                });

                let HTMLAlternativas = '';
                const letras = ['A', 'B', 'C', 'D', 'E', 'F'];

                if (Array.isArray(questao.alternativas)) {
                    questao.alternativas.forEach((alt, i) => {
                        const letra = letras[i] || `${i + 1}`;
                        HTMLAlternativas += `
                            <div class="col-md-12 mb-3 border p-2 rounded">
                                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                    <label class="fw-bold mb-0">Alternativa ${letra}</label>
                                    <label class="btn btn-sm btn-outline-primary mb-0 d-inline-flex align-items-center gap-1 cursor-pointer">
                                        <i class="bi bi-upload"></i> Imagem p/ Alt ${letra}
                                        <input type="file" class="d-none input-file-alt-rep" data-qcod="${questao.cod}" data-altcod="${alt.cod}" accept="image/*">
                                    </label>
                                </div>
                                <div id="editor-alt-reportada-${questao.cod}-${alt.cod}"></div>
                            </div>
                        `;
                    });
                }

                let HTMLSelectCorreta = `<select id="select-correta-${questao.cod}" class="form-select mb-4">`;
                if (Array.isArray(questao.alternativas)) {
                    questao.alternativas.forEach((alt, i) => {
                        const letra = letras[i] || `${i + 1}`;
                        const selected = alt.correta ? 'selected' : '';
                        HTMLSelectCorreta += `<option value="${alt.cod}" ${selected}>Alternativa ${letra}</option>`;
                    });
                }
                HTMLSelectCorreta += `</select>`;

                itemElement.innerHTML = `
                    <h2 class="accordion-header" id="${headingId}">
                        <button class="accordion-button collapsed d-flex align-items-center justify-content-between" type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#${collapseId}">
                            
                            <div class="titulo-questao">
                                <strong>#${questao.cod}</strong>
                                <span>${escapeHtml(questao.disciplina_nome)}${questao.tema_nome ? ' - ' + escapeHtml(questao.tema_nome) : ''}</span>
                            </div>

                            <span class="badge-reportes ms-auto me-3">
                                <i class="bi bi-flag-fill me-1"></i>${totalReportes} ${totalReportes > 1 ? 'reportes' : 'reporte'}
                            </span>
                        </button>
                    </h2>

                    <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#accordionQuestoes">
                        <div class="accordion-body">

                            <!-- Motivo do Reporte -->
                            <div class="erro-box">
                                <h5>
                                    <i class="bi bi-exclamation-triangle-fill"></i>
                                    Motivo${totalReportes > 1 ? 's' : ''} do reporte (${totalReportes})
                                </h5>
                                ${HTMLMotivos}
                            </div>

                            <!-- Área de Edição -->
                            <div class="edicao-box">
                                <h5>Editar Questão</h5>

                                <div class="row mb-3 p-3 bg-light rounded border mx-0">
                                    <div class="col-md-3 mb-2">
                                        <label class="fw-bold small text-muted mb-1">Disciplina</label>
                                        <select id="select-disciplina-${questao.cod}" class="form-select form-select-sm select-disciplina-rep" data-qcod="${questao.cod}">
                                        </select>
                                    </div>
                                    <div class="col-md-3 mb-2">
                                        <label class="fw-bold small text-muted mb-1">Tema</label>
                                        <select id="select-tema-${questao.cod}" class="form-select form-select-sm select-tema-rep" data-qcod="${questao.cod}">
                                            <option value="">(Sem Tema)</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3 mb-2">
                                        <label class="fw-bold small text-muted mb-1">Autor / Banca</label>
                                        <input id="input-autor-${questao.cod}" class="form-control form-control-sm" value="${escapeHtml(questao.autor || '')}" placeholder="Ex: IFC">
                                    </div>
                                    <div class="col-md-3 mb-2">
                                        <label class="fw-bold small text-muted mb-1">Ano</label>
                                        <input id="input-ano-${questao.cod}" type="number" class="form-control form-control-sm" value="${questao.ano || ''}" placeholder="Ex: 2024">
                                    </div>
                                </div>

                                <label class="fw-bold mb-1">Enunciado da Questão</label>
                                <div id="editor-enunciado-reportada-${questao.cod}" class="mb-3"></div>

                                <div class="mb-3 p-3 bg-light rounded border">
                                    <label class="fw-bold mb-1 d-block">Upload de Imagem p/ a Questão #${questao.cod}</label>
                                    <div class="d-flex align-items-center gap-2">
                                        <label class="btn btn-sm btn-outline-primary mb-0 d-inline-flex align-items-center gap-1 cursor-pointer">
                                            <i class="bi bi-upload"></i> Selecionar Imagem
                                            <input type="file" class="d-none input-file-geral-rep" data-qcod="${questao.cod}" accept="image/*">
                                        </label>
                                        <div class="status-upload-rep text-muted small">Nenhuma imagem enviada nesta sessão.</div>
                                    </div>
                                    <div class="box-acoes-rep mt-2 d-none">
                                        <div class="d-flex gap-2">
                                            <button type="button" class="btn btn-sm btn-success btn-ins-enunciado-rep" data-qcod="${questao.cod}">
                                                <i class="bi bi-plus-circle me-1"></i> Inserir Tag no Enunciado
                                            </button>
                                            <button type="button" class="btn btn-sm btn-primary btn-ins-gabarito-rep" data-qcod="${questao.cod}">
                                                <i class="bi bi-plus-circle me-1"></i> Inserir Tag no Gabarito
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div class="row mt-3 mb-2">
                                    ${HTMLAlternativas}
                                </div>

                                <label class="fw-bold">Resposta Correta</label>
                                ${HTMLSelectCorreta}

                                <label class="fw-bold mb-1">Explicação da Resposta (Gabarito Comentado)</label>
                                <div id="editor-explicacao-reportada-${questao.cod}" class="mb-4"></div>

                                <div class="acoes d-flex justify-content-end gap-2">
                                    <button type="button" class="btn btn-cinza btn-descartar-reporte" data-cod="${questao.cod}">
                                        <i class="bi bi-x-circle-fill me-1"></i> Descartar Reportes
                                    </button>
                                    <button type="button" class="btn btn-verde btn-salvar-questao" data-cod="${questao.cod}">
                                        <i class="bi bi-floppy-fill me-1"></i> Salvar Alterações
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                `;

                accordionContainer.appendChild(itemElement);

                const selectDisc = itemElement.querySelector(`#select-disciplina-${questao.cod}`);
                const selectTema = itemElement.querySelector(`#select-tema-${questao.cod}`);

                if (selectDisc && Array.isArray(disciplinasCache)) {
                    selectDisc.innerHTML = disciplinasCache.map(d => 
                        `<option value="${d.cod}" ${String(d.cod) === String(questao.disciplina_cod) ? 'selected' : ''}>${escapeHtml(d.descricao || d.nome || (`Disciplina #${d.cod}`))}</option>`
                    ).join('');
                }

                function atualizarOpcoesTema(discCod, temaCodSelecionado) {
                    if (!selectTema) return;
                    const temasFiltrados = temasCache.filter(t => String(t.disciplina_cod) === String(discCod));
                    let htmlTemas = '<option value="">(Sem Tema)</option>';
                    temasFiltrados.forEach(t => {
                        const sel = String(t.cod) === String(temaCodSelecionado) ? 'selected' : '';
                        htmlTemas += `<option value="${t.cod}" ${sel}>${escapeHtml(t.descricao || t.nome || (`Tema #${t.cod}`))}</option>`;
                    });
                    selectTema.innerHTML = htmlTemas;
                }

                atualizarOpcoesTema(selectDisc ? selectDisc.value : questao.disciplina_cod, questao.tema_cod);

                if (selectDisc) {
                    selectDisc.addEventListener('change', () => {
                        atualizarOpcoesTema(selectDisc.value, null);
                    });
                }

                const editorEnunciado = new EditorQuestao(`#editor-enunciado-reportada-${questao.cod}`, {
                    placeholder: 'Edite o enunciado da questão...',
                    initialValue: questao.descricao || ''
                });

                const editorExplicacao = new EditorQuestao(`#editor-explicacao-reportada-${questao.cod}`, {
                    placeholder: 'Edite a explicação...',
                    initialValue: questao.explicacao || ''
                });

                const editoresAltMap = new Map();
                if (Array.isArray(questao.alternativas)) {
                    questao.alternativas.forEach((alt, i) => {
                        const edAlt = new EditorQuestao(`#editor-alt-reportada-${questao.cod}-${alt.cod}`, {
                            placeholder: `Texto da alternativa ${letras[i] || (i + 1)}...`,
                            compact: true,
                            initialValue: alt.texto || ''
                        });
                        editoresAltMap.set(alt.cod, edAlt);

                        const fileAltInput = itemElement.querySelector(`.input-file-alt-rep[data-altcod="${alt.cod}"]`);
                        if (fileAltInput) {
                            fileAltInput.addEventListener('change', async (ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();

                                const file = ev.target.files[0];
                                if (!file) return;

                                const formData = new FormData();
                                formData.append('imagem', file);

                                try {
                                    const resp = await fetch(`${API_BASE_URL}/questoes/upload-imagem`, {
                                        method: 'POST',
                                        headers: { Authorization: `Bearer ${token}` },
                                        body: formData
                                    });

                                    const data = await resp.json();
                                    if (!resp.ok) throw new Error(data.error || 'Erro no upload.');

                                    edAlt.inserirTagImagem(data.imagem_url);
                                } catch (err) {
                                    alert(`Erro no upload da imagem: ${err.message}`);
                                }
                            });
                        }
                    });
                }

                editoresPorQuestao.set(String(questao.cod), {
                    enunciado: editorEnunciado,
                    explicacao: editorExplicacao,
                    alternativas: editoresAltMap
                });

                const fileGeralInput = itemElement.querySelector('.input-file-geral-rep');
                const statusUploadDiv = itemElement.querySelector('.status-upload-rep');
                const boxAcoesDiv = itemElement.querySelector('.box-acoes-rep');
                let imgUrlEnviada = null;

                if (fileGeralInput) {
                    fileGeralInput.addEventListener('change', async (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();

                        const file = ev.target.files[0];
                        if (!file) return;

                        const formData = new FormData();
                        formData.append('imagem', file);

                        try {
                            statusUploadDiv.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Enviando...';
                            const resp = await fetch(`${API_BASE_URL}/questoes/upload-imagem`, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` },
                                body: formData
                            });

                            const data = await resp.json();
                            if (!resp.ok) throw new Error(data.error || 'Erro no upload.');

                            imgUrlEnviada = data.imagem_url;
                            const srcCompleto = formatarUrlImagem(imgUrlEnviada);
                            statusUploadDiv.innerHTML = `
                                <div class="d-flex align-items-center gap-2 mt-1">
                                    <img src="${srcCompleto}" class="rounded border shadow-sm" style="max-height: 80px; max-width: 150px; object-fit: contain;" alt="Preview">
                                    <span class="text-success font-weight-bold"><i class="bi bi-check-circle-fill me-1"></i>Imagem enviada!</span>
                                </div>
                            `;
                            boxAcoesDiv.classList.remove('d-none');
                        } catch (err) {
                            statusUploadDiv.innerHTML = `<span class="text-danger">Erro no upload: ${err.message}</span>`;
                        }
                    });
                }

                const btnInsEnunciado = itemElement.querySelector('.btn-ins-enunciado-rep');
                const btnInsGabarito = itemElement.querySelector('.btn-ins-gabarito-rep');

                if (btnInsEnunciado) {
                    btnInsEnunciado.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        if (imgUrlEnviada) editorEnunciado.inserirTagImagem(imgUrlEnviada);
                    });
                }

                if (btnInsGabarito) {
                    btnInsGabarito.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        if (imgUrlEnviada) editorExplicacao.inserirTagImagem(imgUrlEnviada);
                    });
                }
            });

            document.querySelectorAll('.btn-salvar-questao').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const questaoCod = e.currentTarget.dataset.cod;
                    salvarEdicaoQuestao(questaoCod, e.currentTarget);
                });
            });

            document.querySelectorAll('.btn-descartar-reporte').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const questaoCod = e.currentTarget.dataset.cod;
                    descartarReportes(questaoCod, e.currentTarget);
                });
            });

        } catch (error) {
            console.error('Erro ao carregar questões reportadas:', error);
            if (accordionContainer) {
                accordionContainer.innerHTML = `
                    <div class="alert alert-danger p-3">
                        Ocorreu um erro ao carregar as questões reportadas. Por favor, recarregue a página.
                    </div>
                `;
            }
        }
    }

    async function salvarEdicaoQuestao(questaoCod, btnElement) {
        const selectCorreta = document.getElementById(`select-correta-${questaoCod}`);
        const selectDisc = document.getElementById(`select-disciplina-${questaoCod}`);
        const selectTema = document.getElementById(`select-tema-${questaoCod}`);
        const inputAutor = document.getElementById(`input-autor-${questaoCod}`);
        const inputAno = document.getElementById(`input-ano-${questaoCod}`);
        const edObj = editoresPorQuestao.get(String(questaoCod));

        if (!edObj || !selectCorreta) return;

        const descricaoHtml = edObj.enunciado.obterHtml();
        const explicacaoHtml = edObj.explicacao.obterHtml();
        const altCorretaCod = selectCorreta.value;
        const disciplina_cod = selectDisc ? selectDisc.value : null;
        const tema_cod = selectTema ? selectTema.value : null;
        const autor = inputAutor ? inputAutor.value.trim() : null;
        const ano = inputAno ? inputAno.value.trim() : null;

        if (!descricaoHtml || !edObj.enunciado.obterTexto()) {
            alert('O enunciado da questão não pode ficar em branco.');
            return;
        }

        const alternativasPayload = [];
        edObj.alternativas.forEach((edAlt, altCod) => {
            alternativasPayload.push({
                cod: parseInt(altCod),
                texto: edAlt.obterHtml() || edAlt.obterTexto(),
                correta: String(altCod) === String(altCorretaCod)
            });
        });

        btnElement.disabled = true;
        const textoOriginal = btnElement.innerHTML;
        btnElement.innerText = 'Salvando...';

        try {
            const response = await fetch(`${API_BASE_URL}/admin/questoes-reportadas/${questaoCod}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    descricao: descricaoHtml,
                    explicacao: explicacaoHtml,
                    disciplina_cod,
                    tema_cod,
                    autor,
                    ano,
                    alternativas: alternativasPayload
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao salvar alterações na questão.');
            }

            alert('Questão atualizada e reportes resolvidos com sucesso!');
            await carregarQuestoesReportadas();

        } catch (error) {
            console.error('Erro ao salvar alterações da questão:', error);
            alert(error.message || 'Erro ao salvar alterações.');
            btnElement.disabled = false;
            btnElement.innerHTML = textoOriginal;
        }
    }

    async function descartarReportes(questaoCod, btnElement) {
        if (!confirm(`Deseja realmente descartar os reportes da questão #${questaoCod} sem fazer alterações?`)) {
            return;
        }

        btnElement.disabled = true;
        btnElement.innerText = 'Descartando...';

        try {
            const response = await fetch(`${API_BASE_URL}/admin/questoes-reportadas/${questaoCod}/descartar`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao descartar reportes.');
            }

            await carregarQuestoesReportadas();

        } catch (error) {
            console.error('Erro ao descartar reportes:', error);
            alert(error.message || 'Erro ao descartar reportes.');
            btnElement.disabled = false;
            btnElement.innerHTML = '<i class="bi bi-x-circle-fill me-1"></i> Descartar Reportes';
        }
    }

    await carregarQuestoesReportadas();

});
