document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = '/api';
    const accordionContainer = document.getElementById('accordionQuestoes');
    const estadoVazioContainer = document.getElementById('estado-vazio-reportes');
    const badgeTotalReportes = document.getElementById('badge-total-reportes');
    const statQuestoesPendentes = document.getElementById('stat-questoes-pendentes');
    const statTotalApontamentos = document.getElementById('stat-total-apontamentos');
    const statStatusFila = document.getElementById('stat-status-fila');

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
        return url.startsWith('/') ? url : '/' + url;
    }

    const editoresPorQuestao = new Map();
    const sessoesAtivas = new Map();
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
            sessoesAtivas.clear();

            const totalQuestoes = Array.isArray(dados) ? dados.length : 0;
            const totalApontamentos = Array.isArray(dados) 
                ? dados.reduce((acc, curr) => acc + (curr.total_reportes || curr.reportes?.length || 0), 0)
                : 0;

            // Atualiza estatísticas rápidas
            if (badgeTotalReportes) badgeTotalReportes.textContent = `${totalQuestoes} ${totalQuestoes === 1 ? 'questão' : 'questões'}`;
            if (statQuestoesPendentes) statQuestoesPendentes.textContent = totalQuestoes;
            if (statTotalApontamentos) statTotalApontamentos.textContent = totalApontamentos;
            if (statStatusFila) statStatusFila.textContent = totalQuestoes === 0 ? 'Fila Limpa' : 'Moderação Pendente';

            if (!Array.isArray(dados) || dados.length === 0) {
                if (estadoVazioContainer) estadoVazioContainer.classList.remove('d-none');
                if (accordionContainer) {
                    accordionContainer.classList.add('d-none');
                    accordionContainer.innerHTML = '';
                }
                return;
            }

            if (estadoVazioContainer) estadoVazioContainer.classList.add('d-none');
            if (accordionContainer) {
                accordionContainer.classList.remove('d-none');
                accordionContainer.innerHTML = '';
            }

            dados.forEach((item) => {
                const questao = item.questao;
                const reportes = item.reportes || [];
                const totalReportes = item.total_reportes || reportes.length;
                const collapseId = `questao-collapse-${questao.cod}`;
                const headingId = `heading-${questao.cod}`;

                const sessao = new SessaoImagensQuestao(questao.cod);
                sessoesAtivas.set(questao.cod, sessao);

                const itemElement = document.createElement('div');
                itemElement.classList.add('accordion-item', 'questao-item');

                let HTMLMotivos = '';
                reportes.forEach((rep) => {
                    const dataStr = rep.data ? new Date(rep.data).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '';

                    HTMLMotivos += `
                        <div class="item-reporte-unico">
                            <div class="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
                                <span class="rep-autor">
                                    <i class="bi bi-person-circle me-1"></i>
                                    ${escapeHtml(rep.usuario ? rep.usuario.nome_completo : 'Usuário')}
                                    ${rep.usuario ? `(@${escapeHtml(rep.usuario.login)})` : ''}
                                </span>
                                <small class="text-muted"><i class="bi bi-clock me-1"></i>${dataStr}</small>
                            </div>
                            <div class="rep-motivo"><i class="bi bi-tag-fill me-1 accent-rosa"></i>${escapeHtml(rep.motivo)}</div>
                            ${rep.descricao_detalhada ? `
                                <p class="mt-2 mb-0 text-secondary" style="font-style: italic; font-size: 0.9rem;">
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
                            <div class="col-md-12 mb-3 border p-3 rounded-3 bg-white">
                                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                    <label class="fw-bold mb-0 text-dark">Alternativa ${letra}</label>
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

                // Prévia do texto limpo do enunciado
                const previaTexto = questao.descricao ? questao.descricao.replace(/<[^>]*>?/gm, '').substring(0, 70) + '...' : 'Sem enunciado';

                itemElement.innerHTML = `
                    <h2 class="accordion-header" id="${headingId}">
                        <button class="accordion-button collapsed d-flex align-items-center justify-content-between" type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#${collapseId}">
                            
                            <div class="titulo-questao">
                                <strong>#${questao.cod}</strong>
                                <span class="badge-disciplina-pill">${escapeHtml(questao.disciplina_nome)}</span>
                                <span class="previa-enunciado d-none d-md-inline">${escapeHtml(previaTexto)}</span>
                            </div>

                            <span class="badge-reportes ms-auto me-3">
                                <i class="bi bi-flag-fill"></i>${totalReportes} ${totalReportes > 1 ? 'reportes' : 'reporte'}
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
                                <h5><i class="bi bi-pencil-square accent-rosa"></i> Editar Questão</h5>

                                <div class="row mb-3 p-3 bg-light rounded-3 border mx-0">
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

                                <h6 class="fw-bold mt-4 mb-2">Alternativas</h6>
                                <div class="row">
                                    ${HTMLAlternativas}
                                </div>

                                <label class="fw-bold mt-3 mb-1">Alternativa Correta (Gabarito)</label>
                                ${HTMLSelectCorreta}

                                <label class="fw-bold mb-1">Explicação / Resolução Comentada</label>
                                <div id="editor-explicacao-reportada-${questao.cod}" class="mb-3"></div>

                                <div class="acoes">
                                    <button type="button" class="btn btn-outline-rosa btn-descartar-reporte" data-cod="${questao.cod}">
                                        <i class="bi bi-x-circle me-1"></i> Descartar Reportes
                                    </button>
                                    <button type="button" class="btn btn-verde btn-salvar-questao" data-cod="${questao.cod}">
                                        <i class="bi bi-check-lg me-1"></i> Salvar e Resolver
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                `;

                accordionContainer.appendChild(itemElement);

                // Inicialização dos selects de disciplina e tema
                const selectDisc = itemElement.querySelector(`#select-disciplina-${questao.cod}`);
                const selectTema = itemElement.querySelector(`#select-tema-${questao.cod}`);

                if (selectDisc) {
                    selectDisc.innerHTML = '<option value="" disabled>Selecione a disciplina</option>';
                    disciplinasCache.forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d.cod;
                        opt.textContent = d.descricao;
                        if (d.cod === questao.disciplina_cod) opt.selected = true;
                        selectDisc.appendChild(opt);
                    });

                    selectDisc.addEventListener('change', () => {
                        atualizarSelectTemas(selectDisc.value, selectTema, null);
                    });
                }

                function atualizarSelectTemas(discCod, temaEl, temaSelecionadoCod) {
                    if (!temaEl) return;
                    temaEl.innerHTML = '<option value="">(Sem Tema)</option>';
                    const temasFiltrados = temasCache.filter(t => String(t.disciplina_cod) === String(discCod));
                    temasFiltrados.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t.cod;
                        opt.textContent = t.descricao;
                        if (temaSelecionadoCod && String(t.cod) === String(temaSelecionadoCod)) {
                            opt.selected = true;
                        }
                        temaEl.appendChild(opt);
                    });
                }

                if (selectDisc && selectTema) {
                    atualizarSelectTemas(questao.disciplina_cod, selectTema, questao.tema_cod);
                }

                // Inicialização dos editores ricos
                const editorEnunciado = new EditorQuestao(`#editor-enunciado-reportada-${questao.cod}`, {
                    placeholder: 'Digite o enunciado da questão...',
                    initialValue: questao.descricao || '',
                    permitirImagem: true,
                    sessaoImagens: sessao,
                    imagemLegadaUrl: questao.imagem_url ? formatarUrlImagem(questao.imagem_url) : null
                });

                const editorExplicacao = new EditorQuestao(`#editor-explicacao-reportada-${questao.cod}`, {
                    placeholder: 'Explicação ou resolução detalhada...',
                    initialValue: questao.explicacao || '',
                    permitirImagem: true,
                    sessaoImagens: sessao
                });

                const editoresAltMap = new Map();
                if (Array.isArray(questao.alternativas)) {
                    questao.alternativas.forEach((alt, i) => {
                        const edAlt = new EditorQuestao(`#editor-alt-reportada-${questao.cod}-${alt.cod}`, {
                            placeholder: `Texto da alternativa ${letras[i] || (i + 1)}...`,
                            compact: true,
                            initialValue: alt.texto || '',
                            permitirImagem: true,
                            sessaoImagens: sessao
                        });
                        editoresAltMap.set(alt.cod, edAlt);
                    });
                }

                editoresPorQuestao.set(String(questao.cod), {
                    enunciado: editorEnunciado,
                    explicacao: editorExplicacao,
                    alternativas: editoresAltMap
                });
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
                    <div class="alert alert-danger p-4 rounded-4 shadow-sm text-center">
                        <i class="bi bi-exclamation-circle fs-3 d-block mb-2"></i>
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
        const sessao = sessoesAtivas.get(parseInt(questaoCod));

        if (!edObj || !selectCorreta) return;

        const descricaoHtml = edObj.enunciado.obterHtml();
        const explicacaoHtml = edObj.explicacao.obterHtml();
        const altCorretaCod = selectCorreta.value;
        const disciplina_cod = selectDisc ? selectDisc.value : null;
        const tema_cod = selectTema ? selectTema.value : null;
        const autor = inputAutor ? inputAutor.value.trim() : null;
        const ano = inputAno ? inputAno.value.trim() : null;

        if (!descricaoHtml || !edObj.enunciado.obterTexto()) {
            mostrarFeedback('O enunciado da questão não pode ficar em branco.', 'danger');
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
        btnElement.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Salvando...';

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
                    imagem_url: null, // As imagens antigas agora estão inline
                    alternativas: alternativasPayload
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao salvar alterações na questão.');
            }

            if (sessao) {
                await sessao.finalizar(descricaoHtml, explicacaoHtml, ...alternativasPayload.map(a => a.texto));
            }

            mostrarFeedback('Questão atualizada e reportes resolvidos com sucesso!', 'success');
            await carregarQuestoesReportadas();

        } catch (error) {
            console.error('Erro ao salvar alterações da questão:', error);
            mostrarFeedback(error.message || 'Erro ao salvar alterações.', 'danger');
            btnElement.disabled = false;
            btnElement.innerHTML = textoOriginal;
        }
    }

    async function descartarReportes(questaoCod, btnElement) {
        if (!confirm(`Deseja realmente descartar os reportes da questão #${questaoCod} sem fazer alterações?`)) {
            return;
        }

        const sessao = sessoesAtivas.get(parseInt(questaoCod));

        btnElement.disabled = true;
        btnElement.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Descartando...';

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

            if (sessao) {
                await sessao.descartarTudo();
            }

            mostrarFeedback(`Reportes da questão #${questaoCod} descartados.`, 'success');
            await carregarQuestoesReportadas();

        } catch (error) {
            console.error('Erro ao descartar reportes:', error);
            mostrarFeedback(error.message || 'Erro ao descartar reportes.', 'danger');
            btnElement.disabled = false;
            btnElement.innerHTML = '<i class="bi bi-x-circle me-1"></i> Descartar Reportes';
        }
    }

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
        }, 4500);
    }

    await carregarQuestoesReportadas();
});
