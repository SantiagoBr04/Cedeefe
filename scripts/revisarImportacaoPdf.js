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
    const containerQuestoes = document.getElementById('container-questoes-revisao');
    const badgeTotalQuestoes = document.getElementById('badge-total-questoes');
    const alertaFeedback = document.getElementById('alerta-feedback');
    const bannerStatusRascunho = document.getElementById('banner-status-rascunho');
    const listaRascunhosModal = document.getElementById('lista-rascunhos-modal');
    const btnConfirmarTudo = document.getElementById('btn-confirmar-tudo');
    const btnConfirmarTudoBottom = document.getElementById('btn-confirmar-tudo-bottom');

    let disciplinasCache = [];
    let temasCache = [];
    let rascunhosLista = [];
    let payloadImportacao = null;
    let questoesEmRevisao = [];
    let loteIdAtual = null;

    // Carrega Disciplinas e Temas para preencher os seletores
    async function carregarAuxiliares() {
        try {
            const [respDisc, respTemas] = await Promise.all([
                fetch(`${API_BASE_URL}/disciplinas`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/temas`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (respDisc.ok) disciplinasCache = await respDisc.json();
            if (respTemas.ok) temasCache = await respTemas.json();
        } catch (err) {
            console.error('Erro ao carregar disciplinas ou temas:', err);
        }
    }

    // Busca a lista de rascunhos disponíveis no servidor e popula o modal
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

    // Renderiza a lista de rascunhos dentro do modal de seleção
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

        // Adiciona evento de clique a cada item do modal
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

    // Carrega os dados de um rascunho específico pelo loteId
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

            // Atualiza a URL sem recarregar a página
            if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, `revisarImportacaoPdf.html?loteId=${loteId}`);
            }

            // Atualiza o banner de status da prova
            atualizarBannerStatus(payloadImportacao);

            // Renderiza as questões na tela
            renderizarRevisaoQuestoes(questoesEmRevisao, payloadImportacao.disciplinaPadraoCod || '');

            // Atualiza destaque no modal
            renderizarModalRascunhos(rascunhosLista);

            exibirAlerta(`${questoesEmRevisao.length} questões carregadas do rascunho selecionado.`, 'alert-success');
            return true;

        } catch (e) {
            console.error('Erro ao buscar rascunho do servidor:', e);
            exibirAlerta('Erro de conexão ao carregar os dados do rascunho.', 'alert-danger');
            return false;
        }
    }

    // Atualiza o banner no topo da página conforme o status de revisão da prova
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

    // Renderiza a lista de questões na tela de revisão
    function renderizarRevisaoQuestoes(questoes, disciplinaPadraoCod) {
        containerQuestoes.innerHTML = '';
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
            const card = document.createElement('div');
            card.className = 'card card-questao-item mb-4';
            card.dataset.index = index;

            // Tratamento de disciplina sugerida com mapeamento inteligente de subdisciplinas
            let disciplinaSelecionada = disciplinaPadraoCod;
            const sugestaoStr = typeof q.disciplina_sugerida === 'string'
                ? q.disciplina_sugerida
                : (q.disciplina_sugerida && typeof q.disciplina_sugerida === 'object' ? (q.disciplina_sugerida.nome || q.disciplina_sugerida.descricao || '') : '');

            if (!disciplinaSelecionada && sugestaoStr) {
                disciplinaSelecionada = resolverDisciplinaSugerida(sugestaoStr, listDisc);
            }

            // Opções de disciplinas para o select
            const optionsDisc = listDisc.map(d =>
                `<option value="${d.cod}" ${String(d.cod) === String(disciplinaSelecionada) ? 'selected' : ''}>${escapeHtml(d.descricao || d.nome || `Disciplina #${d.cod}`)}</option>`
            ).join('');

            // Opções de temas
            const getOptionsTema = (discCod, temaAtualCod) => {
                const temasFiltrados = discCod
                    ? listTemas.filter(t => String(t.disciplina_cod) === String(discCod))
                    : listTemas;
                return '<option value="">-- Nenhum tema específico --</option>' + temasFiltrados.map(t =>
                    `<option value="${t.cod}" ${String(t.cod) === String(temaAtualCod) ? 'selected' : ''}>${escapeHtml(t.descricao || t.nome || `Tema #${t.cod}`)}</option>`
                ).join('');
            };

            const optionsTema = getOptionsTema(disciplinaSelecionada, q.tema_cod);

            // Alternativas
            const alternativasLista = Array.isArray(q.alternativas) ? q.alternativas : [];
            const alternativasHtml = alternativasLista.map((alt, aIdx) => {
                const textoAlt = typeof alt === 'string' ? alt : (alt && alt.texto ? alt.texto : '');
                const isCorreta = alt && typeof alt === 'object' ? Boolean(alt.correta) : (aIdx === 0);

                return `
                    <div class="grupo-alternativa-item input-group mb-2 ${isCorreta ? 'is-correta' : ''}" id="group-alt-${index}-${aIdx}">
                        <div class="input-group-text">
                            <input class="form-check-input mt-0 radio-correta" type="radio" name="correta-q-${index}" value="${aIdx}" ${isCorreta ? 'checked' : ''} onchange="atualizarCorreta(${index}, ${aIdx})">
                        </div>
                        <span class="input-group-text font-weight-bold bg-white">${String.fromCharCode(65 + aIdx)})</span>
                        <input type="text" class="form-control input-texto-alt" value="${escapeHtml(textoAlt)}" required>
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
                        <div class="col-12 col-md-6">
                            <label class="form-label font-weight-bold">Tema (Opcional)</label>
                            <select class="form-select select-tema">
                                ${optionsTema}
                            </select>
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
                            <small class="text-muted fw-normal"><i class="bi bi-fonts me-1"></i>Editor de Formatação (Negrito, Itálico, Fontes)</small>
                        </label>
                        <div class="editor-toolbar">
                            <button type="button" class="btn-fmt btn-bold" title="Negrito"><i class="bi bi-type-bold"></i></button>
                            <button type="button" class="btn-fmt btn-italic" title="Itálico"><i class="bi bi-type-italic"></i></button>
                            <button type="button" class="btn-fmt btn-underline" title="Sublinhado"><i class="bi bi-type-underline"></i></button>
                            <button type="button" class="btn-fmt btn-subscript" title="Subscrito">H<sub>2</sub>O</button>
                            <button type="button" class="btn-fmt btn-superscript" title="Sobrescrito">X<sup>2</sup></button>
                            <span class="border-end mx-1" style="height: 18px;"></span>
                            <button type="button" class="btn-fmt btn-ul" title="Lista Marcadores"><i class="bi bi-list-ul"></i></button>
                            <button type="button" class="btn-fmt btn-ol" title="Lista Numerada"><i class="bi bi-list-ol"></i></button>
                            <span class="border-end mx-1" style="height: 18px;"></span>
                            <select class="select-fmt select-font" title="Fonte">
                                <option value="Poppins, sans-serif">Poppins</option>
                                <option value="Arial, sans-serif">Arial</option>
                                <option value="Times New Roman, serif">Times New Roman</option>
                                <option value="Courier New, monospace">Courier</option>
                            </select>
                            <button type="button" class="btn-fmt btn-clear ms-auto" title="Limpar Formatação"><i class="bi bi-eraser me-1"></i>Limpar</button>
                        </div>
                        <div class="editor-enunciado" contenteditable="true"></div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-weight-bold d-flex align-items-center justify-content-between">
                            <span>Imagem da Questão (Opcional)</span>
                            <small class="text-muted fw-normal"><i class="bi bi-image me-1"></i>URL ou Upload de Imagem</small>
                        </label>
                        <div class="container-imagem-questao">
                            <div class="row g-2 align-items-center">
                                <div class="col">
                                    <input type="text" class="form-control input-imagem-url" placeholder="URL da imagem (ex: /imagens/figura1.png ou https://...)" value="${escapeHtml(q.imagem_url || '')}">
                                </div>
                                <div class="col-auto d-flex gap-2">
                                    <label class="btn btn-outline-primary btn-sm mb-0 d-flex align-items-center gap-1 cursor-pointer">
                                        <i class="bi bi-upload"></i> Upload
                                        <input type="file" class="d-none input-file-imagem" accept="image/*">
                                    </label>
                                    <button type="button" class="btn btn-outline-danger btn-sm btn-remover-imagem ${q.imagem_url ? '' : 'd-none'}" title="Remover Imagem">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="preview-imagem-container text-center mt-2 ${q.imagem_url ? '' : 'd-none'}">
                                <img src="${escapeHtml(q.imagem_url || '')}" class="preview-imagem-questao img-fluid shadow-sm" alt="Preview da imagem">
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label font-weight-bold">Alternativas</label>
                        <div class="container-alternativas-card">
                            ${alternativasHtml}
                        </div>
                    </div>

                    <div>
                        <label class="form-label font-weight-bold">Explicação / Gabarito Comentado (Passo a Passo)</label>
                        <textarea class="form-control textarea-explicacao" rows="6" placeholder="Digite a explicação passo a passo da resposta...">${escapeHtml(q.explicacao || '')}</textarea>
                    </div>
                </div>
            `;

            containerQuestoes.appendChild(card);

            // Popula o conteúdo inicial do editor do enunciado com suporte a notação matemática e HTML
            const editorEnunciado = card.querySelector('.editor-enunciado');
            if (editorEnunciado) {
                editorEnunciado.innerHTML = processarFormatacaoTexto(q.enunciado || '');
            }

            // Eventos da barra de ferramentas de formatação do enunciado
            if (editorEnunciado) {
                const execFmt = (command, value = null) => {
                    editorEnunciado.focus();
                    document.execCommand(command, false, value);
                };

                card.querySelector('.btn-bold')?.addEventListener('click', () => execFmt('bold'));
                card.querySelector('.btn-italic')?.addEventListener('click', () => execFmt('italic'));
                card.querySelector('.btn-underline')?.addEventListener('click', () => execFmt('underline'));
                card.querySelector('.btn-subscript')?.addEventListener('click', () => execFmt('subscript'));
                card.querySelector('.btn-superscript')?.addEventListener('click', () => execFmt('superscript'));
                card.querySelector('.btn-ul')?.addEventListener('click', () => execFmt('insertUnorderedList'));
                card.querySelector('.btn-ol')?.addEventListener('click', () => execFmt('insertOrderedList'));
                card.querySelector('.select-font')?.addEventListener('change', (e) => execFmt('fontName', e.target.value));
                card.querySelector('.btn-clear')?.addEventListener('click', () => execFmt('removeFormat'));
            }

            // Eventos da Imagem da Questão
            const inputImagemUrl = card.querySelector('.input-imagem-url');
            const previewContainer = card.querySelector('.preview-imagem-container');
            const previewImg = card.querySelector('.preview-imagem-questao');
            const btnRemoverImg = card.querySelector('.btn-remover-imagem');
            const inputFileImg = card.querySelector('.input-file-imagem');

            const atualizarPreviewImg = (url) => {
                if (url && url.trim()) {
                    previewImg.src = url.trim();
                    previewContainer.classList.remove('d-none');
                    btnRemoverImg.classList.remove('d-none');
                } else {
                    previewImg.src = '';
                    previewContainer.classList.add('d-none');
                    btnRemoverImg.classList.add('d-none');
                }
            };

            if (inputImagemUrl) {
                inputImagemUrl.addEventListener('input', (e) => atualizarPreviewImg(e.target.value));
            }

            if (btnRemoverImg) {
                btnRemoverImg.addEventListener('click', () => {
                    if (inputImagemUrl) inputImagemUrl.value = '';
                    if (inputFileImg) inputFileImg.value = '';
                    atualizarPreviewImg('');
                });
            }

            if (inputFileImg) {
                inputFileImg.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append('imagem', file);

                    try {
                        const resp = await fetch(`${API_BASE_URL}/questoes/upload-imagem`, {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${token}`
                            },
                            body: formData
                        });

                        const data = await resp.json();
                        if (!resp.ok) throw new Error(data.error || 'Falha ao enviar imagem.');

                        if (inputImagemUrl) inputImagemUrl.value = data.imagem_url;
                        atualizarPreviewImg(data.imagem_url);
                    } catch (errUpload) {
                        console.error('Erro no upload de imagem:', errUpload);
                        alert(`Erro ao fazer upload da imagem: ${errUpload.message}`);
                    }
                });
            }

            // Marcador visual de questão revisada
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

        // Atualiza temas ao mudar disciplina
        containerQuestoes.querySelectorAll('.card-questao-item').forEach(card => {
            const selectDisc = card.querySelector('.select-disciplina');
            const selectTema = card.querySelector('.select-tema');
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
                });
            }
        });

        // Botões de remover questão
        containerQuestoes.querySelectorAll('.btn-remover-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.index;
                removerQuestao(idx);
            });
        });
    }

    // Atualizar estilo visual da alternativa marcada como correta
    window.atualizarCorreta = function (qIndex, altIndex) {
        const card = containerQuestoes.querySelector(`.card-questao-item[data-index="${qIndex}"]`);
        if (!card) return;

        const grupos = card.querySelectorAll('.grupo-alternativa-item');
        grupos.forEach((g, idx) => {
            if (idx === altIndex) {
                g.classList.add('is-correta');
            } else {
                g.classList.remove('is-correta');
            }
        });
    };

    function removerQuestao(index) {
        if (confirm('Tem certeza que deseja remover esta questão da importação?')) {
            const card = containerQuestoes.querySelector(`.card-questao-item[data-index="${index}"]`);
            if (card) card.remove();

            const restantes = containerQuestoes.querySelectorAll('.card-questao-item').length;
            badgeTotalQuestoes.textContent = `${restantes} Questão(ões)`;
        }
    }

    // Salva as questões no banco de dados e marca o rascunho no servidor como revisado
    async function salvarTodasEmLote() {
        const cards = containerQuestoes.querySelectorAll('.card-questao-item');
        if (cards.length === 0) {
            alert('Nenhuma questão para salvar.');
            return;
        }

        // Se a prova já foi revisada/enviada, solicita confirmação ao usuário para evitar duplicidade
        if (payloadImportacao && payloadImportacao.revisada) {
            const confirmaReenvio = confirm(
                'Atenção! Esta prova já foi enviada ao banco de dados anteriormente.\n\n' +
                'Deseja salvar novamente as questões cadastradas nesta tela no banco de dados?'
            );
            if (!confirmaReenvio) return;
        }

        const questoesParaEnviar = [];
        let erroValidacao = null;

        cards.forEach((card, idx) => {
            if (erroValidacao) return;

            const editorEnunciado = card.querySelector('.editor-enunciado');
            const enunciadoHtml = editorEnunciado ? editorEnunciado.innerHTML.trim() : '';
            const enunciadoText = editorEnunciado ? editorEnunciado.innerText.trim() : '';

            const disciplinaCod = card.querySelector('.select-disciplina').value;
            const temaCod = card.querySelector('.select-tema').value;
            const autor = card.querySelector('.input-autor').value.trim();
            const ano = card.querySelector('.input-ano').value;
            const explicacao = card.querySelector('.textarea-explicacao').value.trim();
            const imagemUrl = card.querySelector('.input-imagem-url')?.value.trim();

            if (!enunciadoText && !enunciadoHtml) {
                erroValidacao = `A questão ${idx + 1} está sem enunciado.`;
                return;
            }
            if (!disciplinaCod) {
                erroValidacao = `Selecione a disciplina para a questão ${idx + 1}.`;
                return;
            }

            const altInputs = card.querySelectorAll('.input-texto-alt');
            const radioCorreta = card.querySelector('.radio-correta:checked');

            if (altInputs.length === 0) {
                erroValidacao = `A questão ${idx + 1} precisa ter alternativas.`;
                return;
            }

            const alternativas = [];
            altInputs.forEach((inp, aIdx) => {
                alternativas.push({
                    texto: inp.value.trim(),
                    correta: radioCorreta ? (parseInt(radioCorreta.value, 10) === aIdx) : (aIdx === 0)
                });
            });

            questoesParaEnviar.push({
                descricao: enunciadoHtml,
                disciplina_cod: parseInt(disciplinaCod, 10),
                tema_cod: temaCod ? parseInt(temaCod, 10) : null,
                autor: autor || null,
                ano: ano ? parseInt(ano, 10) : null,
                explicacao: explicacao || null,
                imagem_url: imagemUrl || null,
                alternativas
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

    // Mapeamento inteligente entre termos de subdisciplinas sugeridas pela IA e disciplinas do banco
    function resolverDisciplinaSugerida(sugestaoStr, listDisc) {
        if (!sugestaoStr || !Array.isArray(listDisc) || listDisc.length === 0) return null;
        const sugClean = String(sugestaoStr).toLowerCase().trim();

        let categoriaAlvo = null;

        if (/química|quimica|física|fisica|biologia|natureza|ciências da natureza|ciencias da natureza/i.test(sugClean)) {
            categoriaAlvo = 'ciências da natureza';
        } else if (/história|historia|geografia|filosofia|sociologia|humanas|ciências humanas|ciencias humanas/i.test(sugClean)) {
            categoriaAlvo = 'ciências humanas';
        } else if (/português|portugues|língua portuguesa|lingua portuguesa|gramática|gramatica|literatura|redação|redacao/i.test(sugClean)) {
            categoriaAlvo = 'português';
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

    // Processa notações matemáticas e LaTeX ($ $, \cdot, \frac, \sqrt, operadores, letras gregas), markdown e quebras de linha
    function processarFormatacaoTexto(texto) {
        if (texto === null || texto === undefined) return '';
        let html = String(texto);

        // 1. Remove demarcadores de bloco/inline de LaTeX: $$...$$, \[...\], $...$, \(...\)
        html = html.replace(/\$\$(.*?)\$\$/gs, '$1');
        html = html.replace(/\\\[(.*?)\\\]/gs, '$1');
        html = html.replace(/\$(.*?)\$/g, '$1');
        html = html.replace(/\\\((.*?)\\\)/g, '$1');

        // 2. Comandos complexos de LaTeX: \frac{numerador}{denominador} -> (numerador/denominador) e \sqrt{expressao}
        html = html.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');
        html = html.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
        html = html.replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, '√$1');

        // 3. Comandos de operadores e símbolos matemáticos LaTeX
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

        // 4. Letras gregas LaTeX
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

        // 5. Flechas e conectivos LaTeX
        html = html.replace(/\\rightarrow/g, ' → ');
        html = html.replace(/\\leftarrow/g, ' ← ');
        html = html.replace(/\\Rightarrow/g, ' ⇒ ');
        html = html.replace(/\\Leftrightarrow/g, ' ⇔ ');

        // 6. Expoentes/Potências com chaves, parênteses ou simples ex: x^{2+n}, x^(2+n), 5^2
        html = html.replace(/([a-zA-Z0-9\)])\^\{([^}]+)\}/g, '$1<sup>$2</sup>');
        html = html.replace(/([a-zA-Z0-9\)])\^\(([^)]+)\)/g, '$1<sup>$2</sup>');
        html = html.replace(/([a-zA-Z0-9\)])\^([a-zA-Z0-9+\-]+)/g, '$1<sup>$2</sup>');

        // 7. Subscritos com chaves, parênteses ou simples ex: x_{1}, H_2O
        html = html.replace(/([a-zA-Z0-9])_\{([^}]+)\}/g, '$1<sub>$2</sub>');
        html = html.replace(/([a-zA-Z0-9])_\(([^)]+)\)/g, '$1<sub>$2</sub>');
        html = html.replace(/([a-zA-Z0-9])_([a-zA-Z0-9+\-]+)/g, '$1<sub>$2</sub>');

        // 8. Notações Markdown para Negrito e Itálico
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

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

    // Inicialização da página
    async function inicializar() {
        await carregarAuxiliares();
        await carregarListaRascunhos();

        const urlParams = new URLSearchParams(window.location.search);
        let loteId = urlParams.get('loteId');

        // Se o loteId não for informado na URL, seleciona o primeiro rascunho pendente ou o mais recente
        if (!loteId && Array.isArray(rascunhosLista) && rascunhosLista.length > 0) {
            const pendente = rascunhosLista.find(r => !r.revisada);
            loteId = pendente ? pendente.loteId : rascunhosLista[0].loteId;
        }

        if (loteId) {
            await carregarRascunho(loteId);
        } else {
            containerQuestoes.innerHTML = `
                <div class="card p-5 text-center bg-white shadow-sm border">
                    <i class="bi bi-folder-x fs-1 text-warning mb-3"></i>
                    <h4>Nenhum rascunho de prova encontrado</h4>
                    <p class="text-muted">Faça o upload de uma prova em PDF para gerar um rascunho de questões.</p>
                    <div>
                        <a href="importarQuestoesPdf.html" class="btn btn-verde px-4 py-2">Ir para Upload de Provas</a>
                    </div>
                </div>
            `;
        }
    }

    inicializar();
});
