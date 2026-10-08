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

    function formatarUrlImagem(url) {
        if (!url || typeof url !== 'string') return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        return url.startsWith('/') ? url : '/' + url;
    }

    const containerQuestoes = document.getElementById('container-questoes-revisao');
    const badgeTotalQuestoes = document.getElementById('badge-total-questoes');
    const alertaFeedback = document.getElementById('alerta-feedback');
    const bannerStatusRascunho = document.getElementById('banner-status-rascunho');
    const listaRascunhosModal = document.getElementById('lista-rascunhos-modal');
    const btnConfirmarTudo = document.getElementById('btn-confirmar-tudo');
    const btnConfirmarTudoBottom = document.getElementById('btn-confirmar-tudo-bottom');

    let disciplinasCache = [];
    let temasCache = [];
    let subtemasCache = [];
    let rascunhosLista = [];
    let payloadImportacao = null;
    let questoesEmRevisao = [];
    let loteIdAtual = null;

    const editoresPorCard = new Map();
    const sessoesAtivas = new Map();

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
        } catch (err) {
            console.error('Erro ao carregar disciplinas ou temas:', err);
        }
    }

    async function carregarListaRascunhos() {
        try {
            const resp = await fetch(`${API_BASE_URL}/questoes/rascunhos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resp.ok) {
                rascunhosLista = await resp.json();
                renderizarModalRascunhos(rascunhosLista);
            }
        } catch (err) {
            console.error('Erro ao carregar lista de rascunhos:', err);
        }
    }

    function renderizarModalRascunhos(rascunhos) {
        if (!listaRascunhosModal) return;

        if (!Array.isArray(rascunhos) || rascunhos.length === 0) {
            listaRascunhosModal.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-inbox fs-1 text-muted mb-2"></i>
                    <p class="text-muted fw-bold">Nenhuma prova encontrada em uploads/rascunhos.</p>
                    <a href="importarQuestoesPdf.html" class="btn btn-sm btn-verde mt-2">Importar Nova Prova (PDF)</a>
                </div>
            `;
            return;
        }

        listaRascunhosModal.innerHTML = rascunhos.map(r => {
            const isSelected = String(r.loteId) === String(loteIdAtual);
            const dataStr = r.dataCriacao ? new Date(r.dataCriacao).toLocaleString('pt-BR') : '';
            const statusBadge = r.revisada
                ? `<span class="badge bg-success text-white"><i class="bi bi-check-circle-fill me-1"></i>Revisada e Enviada ao Banco</span>`
                : `<span class="badge bg-warning text-dark"><i class="bi bi-clock-history me-1"></i>Pendente de Revisão</span>`;

            return `
                <button type="button" class="list-group-item list-group-item-action p-3 ${isSelected ? 'active bg-light border-verde' : ''} btn-item-rascunho" data-loteid="${r.loteId}">
                    <div class="d-flex w-100 justify-content-between align-items-center mb-1">
                        <h6 class="mb-0 fw-bold ${isSelected ? 'text-verde' : 'text-dark'}">
                            <i class="bi bi-file-earmark-text me-2"></i>Prova: ${escapeHtml(r.autor)} ${r.ano ? `(${r.ano})` : ''}
                        </h6>
                        ${statusBadge}
                    </div>
                    <div class="d-flex w-100 justify-content-between align-items-center text-muted small">
                        <span><i class="bi bi-list-ol me-1"></i>${r.totalQuestoes} questão(ões)</span>
                        <span><i class="bi bi-calendar3 me-1"></i>${dataStr}</span>
                    </div>
                </button>
            `;
        }).join('');

        listaRascunhosModal.querySelectorAll('.btn-item-rascunho').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const loteId = e.currentTarget.dataset.loteid;
                if (loteId) {
                    carregarRascunho(loteId);
                    const modalEl = document.getElementById('modalRascunhos');
                    const bsModal = bootstrap.Modal.getInstance(modalEl);
                    if (bsModal) bsModal.hide();
                }
            });
        });
    }

    async function carregarRascunho(loteId) {
        if (!loteId) return false;

        try {
            console.log('[RevisarImportacao] Carregando rascunho. loteId =', loteId);
            const response = await fetch(`${API_BASE_URL}/questoes/rascunho/${loteId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                exibirAlerta('Não foi possível carregar o rascunho selecionado do servidor.', 'alert-danger');
                return false;
            }

            payloadImportacao = await response.json();
            questoesEmRevisao = payloadImportacao.questoes || [];
            loteIdAtual = loteId;

            if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, `revisarImportacaoPdf.html?loteId=${loteId}`);
            }

            atualizarBannerStatus(payloadImportacao);
            
            // Limpa as sessões ativas (se houver descartes pendentes de outra revisão não salvos)
            sessoesAtivas.forEach(sessao => sessao.descartarTudo());
            sessoesAtivas.clear();
            
            renderizarRevisaoQuestoes(questoesEmRevisao, payloadImportacao.disciplinaPadraoCod || '');
            renderizarModalRascunhos(rascunhosLista);

            exibirAlerta(`${questoesEmRevisao.length} questões carregadas do rascunho selecionado.`, 'alert-success');
            return true;

        } catch (e) {
            console.error('Erro ao buscar rascunho do servidor:', e);
            exibirAlerta('Erro de conexão ao carregar os dados do rascunho.', 'alert-danger');
            return false;
        }
    }

    function atualizarBannerStatus(payload) {
        if (!bannerStatusRascunho) return;

        if (payload && payload.revisada) {
            const dataEnvioStr = payload.dataEnvio ? new Date(payload.dataEnvio).toLocaleString('pt-BR') : 'Data não registrada';
            bannerStatusRascunho.innerHTML = `
                <div class="alert alert-success border-success shadow-sm d-flex align-items-center gap-3 p-3">
                    <i class="bi bi-check-circle-fill display-6 text-success"></i>
                    <div>
                        <h5 class="alert-heading fw-bold mb-1">
                            <span class="badge bg-success me-2">REVISADA E SALVA NO BANCO</span> Prova já importada com sucesso!
                        </h5>
                        <p class="mb-0 text-dark">
                            Esta prova (Autor: <strong>${escapeHtml(payload.autor || 'N/A')}</strong> | Ano: <strong>${payload.ano || 'N/A'}</strong>) foi revisada e enviada ao banco de dados em <strong>${dataEnvioStr}</strong>.
                        </p>
                    </div>
                </div>
            `;
            if (btnConfirmarTudo) {
                btnConfirmarTudo.className = 'btn btn-outline-success px-4 py-2 font-weight-bold shadow-sm';
                btnConfirmarTudo.innerHTML = '<i class="bi bi-check-all me-2"></i>Prova Já Salvou (Reenviar)';
            }
            if (btnConfirmarTudoBottom) {
                btnConfirmarTudoBottom.className = 'btn btn-outline-success btn-lg px-5 py-3 font-weight-bold shadow';
                btnConfirmarTudoBottom.innerHTML = '<i class="bi bi-check-all me-2"></i>Prova Já Salva no Banco (Reenviar)';
            }
        } else {
            bannerStatusRascunho.innerHTML = `
                <div class="alert alert-warning border-warning shadow-sm d-flex align-items-center gap-3 p-3">
                    <i class="bi bi-exclamation-triangle-fill display-6 text-warning"></i>
                    <div>
                        <h5 class="alert-heading fw-bold mb-1">
                            <span class="badge bg-warning text-dark me-2">PENDENTE DE REVISÃO</span> Verifique as questões abaixo
                        </h5>
                        <p class="mb-0 text-dark">
                            Esta prova ainda não foi enviada ao banco de dados. Revise os enunciados, gabaritos e disciplinas antes de clicar em <strong>Salvar Todas no Banco</strong>.
                        </p>
                    </div>
                </div>
            `;
            if (btnConfirmarTudo) {
                btnConfirmarTudo.className = 'btn btn-verde px-4 py-2 font-weight-bold shadow-sm';
                btnConfirmarTudo.innerHTML = '<i class="bi bi-cloud-upload-fill me-2"></i>Salvar Todas no Banco';
            }
            if (btnConfirmarTudoBottom) {
                btnConfirmarTudoBottom.className = 'btn btn-verde btn-lg px-5 py-3 font-weight-bold shadow';
                btnConfirmarTudoBottom.innerHTML = '<i class="bi bi-cloud-upload-fill me-2"></i>Confirmar e Salvar Todas no Banco';
            }
        }
    }

    function renderizarRevisaoQuestoes(questoes, disciplinaPadraoCod) {
        containerQuestoes.innerHTML = '';
        editoresPorCard.clear();

        const listDisc = Array.isArray(disciplinasCache) ? disciplinasCache : [];
        const listTemas = Array.isArray(temasCache) ? temasCache : [];

        badgeTotalQuestoes.textContent = `${questoes.length} Questão(ões)`;

        if (!questoes || questoes.length === 0) {
            containerQuestoes.innerHTML = `
                <div class="card p-5 text-center bg-white shadow-sm border">
                    <i class="bi bi-journal-x fs-1 text-muted mb-3"></i>
                    <h4>Nenhuma questão encontrada neste rascunho</h4>
                    <p class="text-muted">Selecione outra prova no botão acima ou realize um novo upload.</p>
                </div>
            `;
            return;
        }

        questoes.forEach((q, index) => {
            const sessao = new SessaoImagensQuestao(`pdf-${index}`);
            sessoesAtivas.set(index, sessao);

            const card = document.createElement('div');
            card.className = 'card card-questao-item mb-4';
            card.dataset.index = index;

            let disciplinaSelecionada = q.disciplina_cod || disciplinaPadraoCod;
            const sugestaoStr = typeof q.disciplina_sugerida === 'string'
                ? q.disciplina_sugerida
                : (q.disciplina_sugerida && typeof q.disciplina_sugerida === 'object' ? (q.disciplina_sugerida.nome || q.disciplina_sugerida.descricao || '') : '');

            if (!disciplinaSelecionada && sugestaoStr) {
                disciplinaSelecionada = resolverDisciplinaSugerida(sugestaoStr, listDisc);
            }

            const optionsDisc = listDisc.map(d =>
                `<option value="${d.cod}" ${String(d.cod) === String(disciplinaSelecionada) ? 'selected' : ''}>${escapeHtml(d.descricao || d.nome || `Disciplina #${d.cod}`)}</option>`
            ).join('');

            const listSubtemas = Array.isArray(subtemasCache) ? subtemasCache : [];

            // A taxonomiaService já resolve isso no backend e preenche q.tema_cod e q.subtemas_cods
            let temaSelecionado = q.tema_cod || null;
            let subtemasSelecionados = q.subtemas_cods || [];

            // Fallback caso o backend não tenha conseguido resolver (ex: rascunho antigo)
            if (!temaSelecionado && q.tema_maior_sugerido && disciplinaSelecionada) {
                const sugestaoTemaStr = q.tema_maior_sugerido;
                const temaMatch = listTemas.find(t => String(t.disciplina_cod) === String(disciplinaSelecionada) && t.descricao.toLowerCase().includes(sugestaoTemaStr.toLowerCase()));
                if (temaMatch) temaSelecionado = temaMatch.cod;
            }

            if (temaSelecionado && subtemasSelecionados.length === 0 && Array.isArray(q.subtemas_sugeridos) && q.subtemas_sugeridos.length > 0) {
                q.subtemas_sugeridos.forEach(subStr => {
                    if(typeof subStr === 'string') {
                        const subMatch = listSubtemas.find(s => String(s.tema_cod) === String(temaSelecionado) && s.descricao.toLowerCase().includes(subStr.toLowerCase()));
                        if (subMatch) subtemasSelecionados.push(subMatch.cod);
                    }
                });
            }

            const getOptionsTema = (discCod, temaAtualCod) => {
                const temasFiltrados = discCod
                    ? listTemas.filter(t => String(t.disciplina_cod) === String(discCod))
                    : listTemas;
                return '<option value="">-- Nenhum tema específico --</option>' + temasFiltrados.map(t =>
                    `<option value="${t.cod}" ${String(t.cod) === String(temaAtualCod) ? 'selected' : ''}>${escapeHtml(t.descricao || t.nome || `Tema #${t.cod}`)}</option>`
                ).join('');
            };

            const optionsTema = getOptionsTema(disciplinaSelecionada, temaSelecionado);

            const getHtmlSubtemas = (temaCod, subtemasAtualIds) => {
                const subtemasFiltrados = temaCod 
                    ? listSubtemas.filter(s => String(s.tema_cod) === String(temaCod)) 
                    : [];
                if (subtemasFiltrados.length === 0) return '<div class="text-muted small mt-2">Selecione um tema com subtemas.</div>';
                
                return subtemasFiltrados.map(s => {
                    const checked = subtemasAtualIds.includes(s.cod) ? 'checked' : '';
                    return `
                        <div class="form-check form-check-inline">
                            <input class="form-check-input check-subtema" type="checkbox" value="${s.cod}" id="subt-${index}-${s.cod}" ${checked}>
                            <label class="form-check-label" for="subt-${index}-${s.cod}">
                                ${escapeHtml(s.descricao)}
                            </label>
                        </div>
                    `;
                }).join('');
            };

            const htmlSubtemas = getHtmlSubtemas(temaSelecionado, subtemasSelecionados);

            const alternativasLista = Array.isArray(q.alternativas) ? q.alternativas : [];
            const alternativasHtml = alternativasLista.map((alt, aIdx) => {
                const isCorreta = alt && typeof alt === 'object' ? Boolean(alt.correta) : (aIdx === 0);

                return `
                    <div class="grupo-alternativa-item mb-3 p-3 rounded border ${isCorreta ? 'is-correta bg-light-subtle border-success' : ''}" id="group-alt-${index}-${aIdx}">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                            <div class="d-flex align-items-center gap-2">
                                <input class="form-check-input mt-0 radio-correta cursor-pointer" type="radio" name="correta-q-${index}" value="${aIdx}" ${isCorreta ? 'checked' : ''} onchange="atualizarCorreta(${index}, ${aIdx})">
                                <span class="font-weight-bold text-dark">${String.fromCharCode(65 + aIdx)})</span>
                            </div>
                        </div>
                        <div id="editor-alt-pdf-${index}-${aIdx}"></div>
                    </div>
                `;
            }).join('');

            card.innerHTML = `
                <div class="questao-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div class="d-flex align-items-center gap-2">
                        <h5 class="mb-0 fw-bold text-dark">
                            <span class="badge bg-secondary me-2">Questão ${q.numero || (index + 1)}</span>
                            ${sugestaoStr ? `<span class="badge bg-info text-dark">${escapeHtml(sugestaoStr)}</span>` : ''}
                        </h5>
                        <span class="badge bg-success badge-status-revisada d-none"><i class="bi bi-check-all me-1"></i>Revisada</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <button type="button" class="btn-toggle-revisada" title="Marcar esta questão como revisada">
                            <i class="bi bi-check-lg fs-5"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-remover-card" data-index="${index}">
                            <i class="bi bi-trash"></i> Remover Questão
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-3">
                        <div class="col-12 col-md-6">
                            <label class="form-label font-weight-bold">Disciplina <span class="text-danger">*</span></label>
                            <select class="form-select select-disciplina" required>
                                <option value="">-- Selecione a Disciplina --</option>
                                ${optionsDisc}
                            </select>
                        </div>
                        <div class="col-12 col-md-4">
                            <label class="form-label font-weight-bold">Tema (Opcional)</label>
                            <select class="form-select select-tema">
                                ${optionsTema}
                            </select>
                        </div>
                        <div class="col-12 col-md-12 mt-3 mt-md-0">
                            <label class="form-label font-weight-bold d-block">Subtemas</label>
                            <div class="container-subtemas bg-light p-2 rounded border">
                                ${htmlSubtemas}
                            </div>
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-12 col-md-8">
                            <label class="form-label">Instituição / Autor</label>
                            <input type="text" class="form-control input-autor" value="${escapeHtml(q.autor || payloadImportacao?.autor || '')}">
                        </div>
                        <div class="col-12 col-md-4">
                            <label class="form-label">Ano</label>
                            <input type="number" class="form-control input-ano" value="${q.ano || payloadImportacao?.ano || ''}">
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-weight-bold d-flex align-items-center justify-content-between">
                            <span>Enunciado da Questão <span class="text-danger">*</span></span>
                            <small class="text-muted fw-normal"><i class="bi bi-fonts me-1"></i>Formatação Rica</small>
                        </label>
                        <div id="editor-enunciado-pdf-${index}"></div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-weight-bold">Alternativas</label>
                        <div class="container-alternativas-card">
                            ${alternativasHtml}
                        </div>
                    </div>

                    <div>
                        <label class="form-label font-weight-bold">Explicação / Gabarito Comentado (Passo a Passo)</label>
                        <div id="editor-explicacao-pdf-${index}"></div>
                    </div>
                </div>
            `;

            containerQuestoes.appendChild(card);

            const editorEnunciadoObj = new EditorQuestao(`#editor-enunciado-pdf-${index}`, {
                placeholder: 'Edite o enunciado da questão...',
                initialValue: processarFormatacaoTexto(q.enunciado || ''),
                permitirImagem: true,
                sessaoImagens: sessao,
                imagemLegadaUrl: q.imagem_url ? formatarUrlImagem(q.imagem_url) : null
            });

            const editorExplicacaoObj = new EditorQuestao(`#editor-explicacao-pdf-${index}`, {
                placeholder: 'Edite a explicação/gabarito comentado...',
                initialValue: processarFormatacaoTexto(q.explicacao || ''),
                permitirImagem: true,
                sessaoImagens: sessao
            });

            const editoresAltList = [];
            alternativasLista.forEach((alt, aIdx) => {
                const textoAlt = typeof alt === 'string' ? alt : (alt && alt.texto ? alt.texto : '');
                const edAltObj = new EditorQuestao(`#editor-alt-pdf-${index}-${aIdx}`, {
                    placeholder: `Texto da alternativa ${String.fromCharCode(65 + aIdx)}...`,
                    compact: true,
                    initialValue: processarFormatacaoTexto(textoAlt),
                    permitirImagem: true,
                    sessaoImagens: sessao
                });

                editoresAltList.push(edAltObj);
            });

            editoresPorCard.set(index, {
                enunciado: editorEnunciadoObj,
                explicacao: editorExplicacaoObj,
                alternativas: editoresAltList
            });

            const btnToggleRevisada = card.querySelector('.btn-toggle-revisada');
            const badgeStatusRevisada = card.querySelector('.badge-status-revisada');

            if (btnToggleRevisada) {
                btnToggleRevisada.addEventListener('click', () => {
                    const isRevisada = card.classList.toggle('is-revisada');
                    if (badgeStatusRevisada) {
                        if (isRevisada) {
                            badgeStatusRevisada.classList.remove('d-none');
                            btnToggleRevisada.setAttribute('title', 'Desmarcar questão como revisada');
                        } else {
                            badgeStatusRevisada.classList.add('d-none');
                            btnToggleRevisada.setAttribute('title', 'Marcar esta questão como revisada');
                        }
                    }
                });
            }
        });

        containerQuestoes.querySelectorAll('.card-questao-item').forEach(card => {
            const selectDisc = card.querySelector('.select-disciplina');
            const selectTema = card.querySelector('.select-tema');
            const containerSubtemas = card.querySelector('.container-subtemas');
            const cardIndex = card.dataset.index;

            if (selectDisc && selectTema) {
                selectDisc.addEventListener('change', (e) => {
                    const newDiscCod = e.target.value;
                    const listTemas = Array.isArray(temasCache) ? temasCache : [];
                    const temasFiltrados = newDiscCod
                        ? listTemas.filter(t => String(t.disciplina_cod) === String(newDiscCod))
                        : listTemas;
                    selectTema.innerHTML = '<option value="">-- Nenhum tema específico --</option>' + temasFiltrados.map(t =>
                        `<option value="${t.cod}">${escapeHtml(t.descricao || t.nome || `Tema #${t.cod}`)}</option>`
                    ).join('');
                    if (containerSubtemas) {
                        containerSubtemas.innerHTML = '<div class="text-muted small mt-2">Selecione um tema com subtemas.</div>';
                    }
                });

                selectTema.addEventListener('change', (e) => {
                    const newTemaCod = e.target.value;
                    if (containerSubtemas) {
                        const listSubtemas = Array.isArray(subtemasCache) ? subtemasCache : [];
                        const subtemasFiltrados = newTemaCod 
                            ? listSubtemas.filter(s => String(s.tema_cod) === String(newTemaCod)) 
                            : [];
                        
                        if (subtemasFiltrados.length === 0) {
                            containerSubtemas.innerHTML = '<div class="text-muted small mt-2">Selecione um tema com subtemas.</div>';
                        } else {
                            containerSubtemas.innerHTML = subtemasFiltrados.map(s => `
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input check-subtema" type="checkbox" value="${s.cod}" id="subt-${cardIndex}-${s.cod}">
                                    <label class="form-check-label" for="subt-${cardIndex}-${s.cod}">
                                        ${escapeHtml(s.descricao)}
                                    </label>
                                </div>
                            `).join('');
                        }
                    }
                });
            }
        });

        containerQuestoes.querySelectorAll('.btn-remover-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index, 10);
                removerQuestao(idx);
            });
        });
    }

    window.atualizarCorreta = function (qIndex, altIndex) {
        const card = containerQuestoes.querySelector(`.card-questao-item[data-index="${qIndex}"]`);
        if (!card) return;

        const grupos = card.querySelectorAll('.grupo-alternativa-item');
        grupos.forEach((g, idx) => {
            if (idx === altIndex) {
                g.classList.add('is-correta', 'bg-light-subtle', 'border-success');
            } else {
                g.classList.remove('is-correta', 'bg-light-subtle', 'border-success');
            }
        });
    };

    function removerQuestao(index) {
        if (confirm('Tem certeza que deseja remover esta questão da importação?')) {
            const sessao = sessoesAtivas.get(index);
            if (sessao) {
                sessao.descartarTudo();
                sessoesAtivas.delete(index);
            }

            const card = containerQuestoes.querySelector(`.card-questao-item[data-index="${index}"]`);
            if (card) card.remove();
            editoresPorCard.delete(index);

            const restantes = containerQuestoes.querySelectorAll('.card-questao-item').length;
            badgeTotalQuestoes.textContent = `${restantes} Questão(ões)`;
        }
    }

    async function salvarTodasEmLote() {
        const cards = containerQuestoes.querySelectorAll('.card-questao-item');
        if (cards.length === 0) {
            alert('Nenhuma questão para salvar.');
            return;
        }

        if (payloadImportacao && payloadImportacao.revisada) {
            const confirmaReenvio = confirm(
                'Atenção! Esta prova já foi enviada ao banco de dados anteriormente.\n\n' +
                'Deseja salvar novamente as questões cadastradas nesta tela no banco de dados?'
            );
            if (!confirmaReenvio) return;
        }

        const questoesParaEnviar = [];
        let erroValidacao = null;
        const indicesSessoesParaConfirmar = [];

        cards.forEach((card) => {
            if (erroValidacao) return;

            const idx = parseInt(card.dataset.index, 10);
            const edObj = editoresPorCard.get(idx);

            const enunciadoHtml = edObj ? edObj.enunciado.obterHtml() : '';
            const enunciadoText = edObj ? edObj.enunciado.obterTexto() : '';
            const explicacaoHtml = edObj ? edObj.explicacao.obterHtml() : '';

            const disciplinaCod = card.querySelector('.select-disciplina').value;
            const temaCod = card.querySelector('.select-tema').value;
            
            const checksSubtemas = card.querySelectorAll('.check-subtema:checked');
            const subtemasCods = Array.from(checksSubtemas).map(cb => parseInt(cb.value, 10));

            const autor = card.querySelector('.input-autor').value.trim();
            const ano = card.querySelector('.input-ano').value;

            if (!enunciadoText && !enunciadoHtml) {
                erroValidacao = `A questão ${idx + 1} está sem enunciado.`;
                return;
            }
            if (!disciplinaCod) {
                erroValidacao = `Selecione a disciplina para a questão ${idx + 1}.`;
                return;
            }

            const radioCorreta = card.querySelector('.radio-correta:checked');
            const alternativas = [];
            const alternativasTextosHtml = [];

            if (edObj && Array.isArray(edObj.alternativas)) {
                edObj.alternativas.forEach((edAlt, aIdx) => {
                    const altContent = edAlt.obterHtml() || edAlt.obterTexto();
                    alternativasTextosHtml.push(altContent);
                    alternativas.push({
                        texto: altContent,
                        correta: radioCorreta ? (parseInt(radioCorreta.value, 10) === aIdx) : (aIdx === 0)
                    });
                });
            }

            if (alternativas.length === 0) {
                erroValidacao = `A questão ${idx + 1} precisa ter alternativas.`;
                return;
            }

            questoesParaEnviar.push({
                descricao: enunciadoHtml,
                disciplina_cod: parseInt(disciplinaCod, 10),
                tema_cod: temaCod ? parseInt(temaCod, 10) : null,
                subtemas_cods: subtemasCods,
                autor: autor || null,
                ano: ano ? parseInt(ano, 10) : null,
                explicacao: explicacaoHtml || null,
                imagem_url: null, // As imagens antigas agora estão inline
                alternativas
            });
            
            indicesSessoesParaConfirmar.push({
                idx,
                htmls: [enunciadoHtml, explicacaoHtml, ...alternativasTextosHtml]
            });
        });

        if (erroValidacao) {
            alert(erroValidacao);
            return;
        }

        btnConfirmarTudo.disabled = true;
        btnConfirmarTudoBottom.disabled = true;
        btnConfirmarTudo.textContent = 'Salvando no banco...';

        try {
            const response = await fetch(`${API_BASE_URL}/questoes/importar-pdf-confirmar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    questoes: questoesParaEnviar,
                    loteId: loteIdAtual
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao salvar lote no banco de dados.');
            }

            // Confirma as imagens nas sessões ativas
            for (const { idx, htmls } of indicesSessoesParaConfirmar) {
                const sessao = sessoesAtivas.get(idx);
                if (sessao) {
                    await sessao.finalizar(...htmls);
                    sessoesAtivas.delete(idx);
                }
            }

            if (payloadImportacao) {
                payloadImportacao.revisada = true;
                payloadImportacao.dataEnvio = new Date().toISOString();
            }

            atualizarBannerStatus(payloadImportacao);
            await carregarListaRascunhos();

            alert(`Sucesso! ${data.questoesCriadas || questoesParaEnviar.length} questões foram cadastradas no banco de dados.`);

        } catch (err) {
            console.error('Erro ao salvar lote:', err);
            alert(`Falha ao salvar: ${err.message}`);
        } finally {
            btnConfirmarTudo.disabled = false;
            btnConfirmarTudoBottom.disabled = false;
        }
    }

    if (btnConfirmarTudo) btnConfirmarTudo.addEventListener('click', salvarTodasEmLote);
    if (btnConfirmarTudoBottom) btnConfirmarTudoBottom.addEventListener('click', salvarTodasEmLote);

    function resolverDisciplinaSugerida(sugestaoStr, listDisc) {
        if (!sugestaoStr || !Array.isArray(listDisc) || listDisc.length === 0) return null;
        const sugClean = String(sugestaoStr).toLowerCase().trim();

        let categoriaAlvo = null;

        if (/química|quimica|física|fisica|biologia|natureza|ciências da natureza|ciencias da natureza/i.test(sugClean)) {
            categoriaAlvo = 'ciências da natureza';
        } else if (/história|historia|geografia|filosofia|sociologia|humanas|ciências humanas|ciencias humanas/i.test(sugClean)) {
            categoriaAlvo = 'ciências humanas';
        } else if (/português|portugues|língua portuguesa|lingua portuguesa|gramática|gramatica|literatura|redação|redacao/i.test(sugClean)) {
            categoriaAlvo = 'língua portuguesa';
        } else if (/matemática|matematica|geometria|álgebra|algebra|raciocínio/i.test(sugClean)) {
            categoriaAlvo = 'matemática';
        }

        if (categoriaAlvo) {
            const discMapeada = listDisc.find(d => {
                const nomeDisc = (d.descricao || d.nome || '').toLowerCase().trim();
                return nomeDisc === categoriaAlvo || nomeDisc.includes(categoriaAlvo) || categoriaAlvo.includes(nomeDisc);
            });
            if (discMapeada) return discMapeada.cod;
        }

        const discDireta = listDisc.find(d => {
            const nomeDisc = (d.descricao || d.nome || '').toLowerCase().trim();
            return nomeDisc.includes(sugClean) || sugClean.includes(nomeDisc);
        });

        return discDireta ? discDireta.cod : null;
    }

    function processarFormatacaoTexto(texto) {
        if (texto === null || texto === undefined) return '';
        let html = String(texto);

        const htmlTags = [];
        html = html.replace(/<[^>]+>/g, (match) => {
            htmlTags.push(match);
            return `%%%HTMLTAG${htmlTags.length - 1}%%%`;
        });

        html = html.replace(/\$\$(.*?)\$\$/gs, '$1');
        html = html.replace(/\\\[(.*?)\\\]/gs, '$1');
        html = html.replace(/\$(.*?)\$/g, '$1');
        html = html.replace(/\\\((.*?)\\\)/g, '$1');

        html = html.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');
        html = html.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
        html = html.replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, '√$1');

        html = html.replace(/\\cdot/g, ' · ');
        html = html.replace(/\\times/g, ' × ');
        html = html.replace(/\\div/g, ' ÷ ');
        html = html.replace(/\\pm/g, ' ± ');
        html = html.replace(/\\mp/g, ' ∓ ');
        html = html.replace(/\\neq/g, ' ≠ ');
        html = html.replace(/\\leq/g, ' ≤ ');
        html = html.replace(/\\geq/g, ' ≥ ');
        html = html.replace(/\\approx/g, ' ≈ ');
        html = html.replace(/\\infty/g, ' ∞ ');
        html = html.replace(/\\degree/g, '°');
        html = html.replace(/\^\\circ/g, '°');

        html = html.replace(/\\alpha/g, 'α');
        html = html.replace(/\\beta/g, 'β');
        html = html.replace(/\\gamma/g, 'γ');
        html = html.replace(/\\delta/g, 'δ');
        html = html.replace(/\\theta/g, 'θ');
        html = html.replace(/\\lambda/g, 'λ');
        html = html.replace(/\\pi/g, 'π');
        html = html.replace(/\\sigma/g, 'σ');
        html = html.replace(/\\omega/g, 'ω');
        html = html.replace(/\\Delta/g, 'Δ');
        html = html.replace(/\\Omega/g, 'Ω');
        html = html.replace(/\\Pi/g, 'Π');

        html = html.replace(/\\rightarrow/g, ' → ');
        html = html.replace(/\\leftarrow/g, ' ← ');
        html = html.replace(/\\Rightarrow/g, ' ⇒ ');
        html = html.replace(/\\Leftrightarrow/g, ' ⇔ ');

        html = html.replace(/([a-zA-Z0-9\)])\^\{([^}]+)\}/g, '$1<sup>$2</sup>');
        html = html.replace(/([a-zA-Z0-9\)])\^\(([^)]+)\)/g, '$1<sup>$2</sup>');
        html = html.replace(/([a-zA-Z0-9\)])\^([a-zA-Z0-9+\-]+)/g, '$1<sup>$2</sup>');

        html = html.replace(/([a-zA-Z0-9])_\{([^}]+)\}/g, '$1<sub>$2</sub>');
        html = html.replace(/([a-zA-Z0-9])_\(([^)]+)\)/g, '$1<sub>$2</sub>');
        html = html.replace(/([a-zA-Z0-9])_([a-zA-Z0-9+\-]+)/g, '$1<sub>$2</sub>');

        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        html = html.replace(/%%%HTMLTAG(\d+)%%%/g, (match, p1) => {
            return htmlTags[parseInt(p1)];
        });

        return html;
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        if (typeof text === 'object') return String(JSON.stringify(text));
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function exibirAlerta(msg, tipo) {
        alertaFeedback.className = `alert ${tipo}`;
        alertaFeedback.textContent = msg;
        alertaFeedback.classList.remove('d-none');
        alertaFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function inicializar() {
        await carregarAuxiliares();
        await carregarListaRascunhos();

        const urlParams = new URLSearchParams(window.location.search);
        let loteId = urlParams.get('loteId');

        if (!loteId && Array.isArray(rascunhosLista) && rascunhosLista.length > 0) {
            const pendente = rascunhosLista.find(r => !r.revisada);
            loteId = pendente ? pendente.loteId : rascunhosLista[0].loteId;
        }

        if (loteId) {
            await carregarRascunho(loteId);
        } else {
            renderizarRevisaoQuestoes([], '');
        }
    }

    inicializar();
});
