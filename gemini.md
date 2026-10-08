# Diretrizes e Regras do Projeto - Gemini AI

Este arquivo estabelece o conjunto de regras, padrões de arquitetura, diretrizes de código e armadilhas comuns para assistentes IA (Gemini) ao atuarem na base de código do **Cedeefe**.

---

## 1. Visão Geral do Projeto
O **Cedeefe** é uma plataforma de estudos voltada para auxiliar estudantes na preparação para a prova de ingresso no ensino técnico integrado ao ensino médio do Instituto Federal Catarinense (IFC).

---

## 2. Build, Execução e Comandos

- **Instalar Dependências:** `npm install`
- **Popular o Banco de Dados:** `npm run seed` (executa `node src/seeders/run.js` para popular disciplinas e questões base)
- **Popular Taxonomia (Temas e Subtemas):** `npm run seed:taxonomia` (lê a taxonomia e insere as categorias sem sobrescrever dados)
- **Iniciar Backend (Desenvolvimento):** `npm run dev` (utiliza `nodemon src/server.js`)
- **URL Base do Backend:** `http://localhost:3000`
- **Testes Automatizados:** Não há suíte ou comando de testes automatizados configurado no `package.json`.

---

## 3. Ambiente e Banco de Dados

- **Arquivo de Configuração:** Crie um arquivo `.env` na raiz do projeto antes de iniciar o servidor.
- **Variáveis Obrigatórias:**
  - `DB_HOST`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_DATABASE`
  - `DB_PORT`
  - `JWT_SECRET`
  - `GEMINI_API_KEY` (obrigatória para a funcionalidade de OCR / Parsing de PDFs de exames via IA Google Gemini)
  - `PORT` (opcional, padrão: `3000`)
- **Sincronização Sequelize:**
  - O backend executa `sequelize.sync()` no momento da inicialização em `src/server.js`.
  - Mantenha `RECONSTRUIR_BANCO = false` em `src/server.js`, a menos que deseje recriar (dropar e refazer) as tabelas intencionalmente.
  - O servidor faz um `ALTER TABLE` dinâmico em `src/server.js` nas colunas de `questoes` e `alternativas` para garantir o tipo `TEXT`.
  - Para popular dados, utilize o comando `npm run seed`.
- **Autenticação no Frontend:**
  - O Bearer Token de sessão do usuário deve ser armazenado/recuperado sempre via chave `jwt_token` no `localStorage` ou `sessionStorage`. Nunca utilize a chave genérica `token`.

---

## 4. Arquitetura da Aplicação

### Backend (`src/`)
- **Tecnologias:** Node.js, Express, Sequelize ORM (PostgreSQL), Google GenAI SDK (`@google/genai`), PDF-Lib, ES Modules.
- **Padrão de Camadas:** Segue o fluxo `Route -> Middleware -> Controller -> Model` (além da camada `src/services/` para integrações como a API do Gemini).
- **Ponto de Entrada:** `src/server.js`, que registra as rotas base da API:
  - `/api/users` (`userRoutes.js`)
  - `/api/listas` (`listaRoutes.js`)
  - `/api/questoes` (`questaoRoutes.js`)
  - `/api/disciplinas` (`disciplinaRoutes.js`)
  - `/api/estatisticas` (`estatisticasRoutes.js`)
  - `/api/temas` (`temaRoutes.js`)
  - `/api/subtemas` (`subtemaRoutes.js`)
  - `/api/baralhos` (`baralhoRoutes.js`)
  - `/api/cartoes` (`cartaoRoutes.js`)
  - `/api/admin` (`adminRoutes.js`)
  - `/api/roadmaps` (`roadmapRoutes.js`)
- **Arquivos Estáticos:** A rota `/imagens` serve estaticamente o diretório `uploads/` (usado para imagens de cartões, fotos de perfil de usuário e ilustrações de questões).
- **Models:** Factories do Sequelize localizadas em `src/models/`, carregadas centralizadamente por `src/models/index.js` e associadas via método `associate` de cada model.

### Frontend (`pages/`, `estilos/`, `scripts/`, `componentes/`, `index.html`)
- **Tecnologias:** HTML5 estático, CSS3 Vanilla, **Bootstrap 5.3.3** (via CDN), JavaScript puro (ES6+ com `fetch`).
- **Estrutura:**
  - `pages/`: Arquivos HTML das páginas da aplicação (incluindo Roadmaps, Flashcards, Simulados, Perfil e Painéis de Administração).
  - `estilos/`: Folhas de estilo CSS separadas por página/componente.
  - `scripts/`: Scripts JS de nível de página consumindo a API backend via `fetch()`.
- **Componentes Compartilhados:** 
  - A **Sidebar** é injetada dinamicamente via `scripts/loadSidebar.js` no container `<div id="sidebar-container"></div>`, carregando `componentes/sidebar.html` (ou `sidebarAdm.html`) e preenchendo os dados de perfil do usuário.
- **Guardião de Autenticação (`scripts/authGuard.js`):**
  - Gerencia o acesso a páginas restritas no cliente. Deve ser incluído na `<head>` das páginas HTML com as propriedades `data-auth-required="true"` e/ou `data-admin-required="true"` configuradas no elemento `<body>`.

---

## 5. Frontend (Estrutura e Padrões Visuais)

- **HTML:** Utiliza estrutura semântica HTML5. A Sidebar é injetada dinamicamente no container `#sidebar-container` através do script `loadSidebar.js`.
- **CSS e Frameworks:**
  - O projeto utiliza **Bootstrap 5.3.3** via CDN para o sistema de Grid responsivo (`container-fluid`, `col-lg-*`), modais, carrosséis e classes utilitárias de layout (`d-none`, `d-flex`, `gap-*`, etc.).
  - Mantenha a separação entre CSS global (ex: `sidebar.css`) e CSS específico de cada página (ex: `login.css`).
  - Disposição visual complementar baseada em **Flexbox**.
  - Evite criar ou utilizar variáveis CSS customizadas (`var(--minha-cor)`). Mantenha o padrão existente com valores hexadecimais ou RGB.
  - Ícones obtidos via FontAwesome, Bootstrap Icons ou Material Symbols.
  - Tipografia: Google Fonts (**Poppins**).
- **Padronização:**
  - Mantenha o layout da Sidebar e Navbar coerente ao padrão carregado por `loadSidebar.js`.
  - Siga a paleta de cores dominante do site (tons de rosa e verde; consulte os valores exatos nos arquivos CSS em `estilos/`).

---

## 6. Convenções de Código e Desenvolvimento

1. **Módulos ES:** Utilize obrigatoriamente a sintaxe ES Modules (`import` / `export`) em todo o projeto, conforme `"type": "module"` no `package.json`.
2. **Idioma dos Comentários:** Todos os comentários no código devem ser escritos estritamente em **Português**.
3. **Modelos Sequelize:** Defina e mantenha a propriedade `tableName` explicitamente em cada model do Sequelize para evitar discrepâncias em nomes de tabelas/pluralizações.
4. **Middlewares de Autenticação e Autorização:**
   - Rotas protegidas devem incluir o `authMiddleware` antes dos controllers.
   - Rotas exclusivas de administradores devem encadear `authMiddleware` e em seguida `adminMiddleware`.
5. **Extração de ID do Usuário:** Em rotas protegidas por autenticação, obtenha o ID do usuário exclusivamente via `req.userId` (injetado pelo `authMiddleware` a partir do token JWT). NUNCA receba o ID do usuário diretamente pelo `body` ou por parâmetros da requisição (`req.params`).
6. **Proteção contra IDOR (Insecure Direct Object Reference):**
   - Ao ler, atualizar ou remover recursos vinculados a um usuário (listas, cartões, baralhos, temas, etc.), valide obrigatoriamente se o recurso pertence ao usuário autenticado (`registro.usuario_cod === req.userId`).
   - Retorne `403 Forbidden` ou `404 Not Found` caso o recurso pertença a outro usuário.
7. **Validação de Chaves Estrangeiras (Foreign Keys):**
   - Antes de criar ou vincular registros com tabelas relacionadas (ex: associar Tema a uma Disciplina), execute `Model.findByPk()` para validar a existência da chave estrangeira.
   - Retorne status `404 Not Found` em caso de inexistência para evitar exceções não tratadas no banco.
8. **Prevenção de Duplicidades:**
   - Para campos com nomes textuais ou identificadores únicos, faça a verificação prévia via `findOne`. Em caso de duplicidade, retorne status `409 Conflict`.
9. **Estrutura dos Controllers:**
   - Métodos assíncronos (`async/await`) envolvidos por blocos `try/catch`.
   - Respostas HTTP com status adequados (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`) e mensagens em formato JSON claro.
   - Exporte o controller como objeto padrão (ex: `export default usuarioController;`), em vez de exportações nomeadas individuais.

---

## 7. Armadilhas Comuns e Regras Críticas

- **`JWT_SECRET` e `GEMINI_API_KEY` Ausentes:** Sem a variável `JWT_SECRET` no `.env`, a autenticação falhará em todas as rotas protegidas. Sem a `GEMINI_API_KEY`, a importação/parsing de provas por IA falhará.
- **Sincronização Forçada do Banco (`force: true`):** Nunca execute `sequelize.sync({ force: true })` em ambientes produtivos ou de teste contínuo, pois os dados serão destruídos e redefinidos.
- **URLs de API no Frontend:** Os scripts JS do frontend contêm URLs de endpoint apontando para `http://localhost:3000`. Atente-se ao alterar portas ou ambientes.
- **Segurança no Upload de Arquivos (Multer):**
  - O diretório `uploads/` é servido publicamente via `/imagens`.
  - Qualquer novo fluxo de upload deve reutilizar o middleware em `src/config/multer.js` (usado para cartões de flashcard, imagens de questões e fotos de perfil de usuário em `/api/users/profile/photo`).
  - Valide estritamente as extensões de arquivo permitidas (ex: imagens, `.csv` ou `.pdf`) e restrinja o tamanho limite (`fileSize`) para evitar vulnerabilidades.
- **Inicialização de Cache de Estatísticas:**
  - A tabela `usuario_estatisticas_gerais` atua como cache e **DEVE** ser criada e inicializada com valores `0` no momento do registro de um novo usuário para evitar exceções (`null pointer`) em relatórios e dashboards.
  - A tabela `usuario_estatisticas_por_area` segue o mesmo princípio (inicializada no registro ou tratada via fallback em `estatisticasController.js`).
  - **Importante:** A métrica de "simulados" foi removida das estatísticas por área. Não adicione colunas ou atributos com prefixo de simulados nesse cálculo; foque apenas nas estatísticas de área vinculadas às respostas globais registradas.

---

## 8. Sistema de Flashcards (SRS - Spaced Repetition System)

- **Motor de Repetição Espaçada:** Localizado no endpoint `/api/cartoes/:id/revisar`.
- **Cálculo de Intervalo:** O algoritmo calcula o próximo `intervalo_dias` considerando o atraso em dias reais da revisão combinando com o Fator de Facilidade baseado na avaliação da resposta (*1: Errei, 2: Difícil, 3: Médio, 4: Fácil*).
- **Gamificação e Heatmap:** Os dados para o Mapa de Calor dos flashcards (`/api/estatisticas/flashcards`) são agregados por ano.
- **Upload e Importação de Baralhos/Cartões:**
  - Reutilize o middleware de upload (`src/config/multer.js`) com os campos apropriados (`imagem` para cartão ou `arquivo_importacao` para baralho).
  - Em importações de arquivos texto de baralho, utilize o delimitador `;`.
  - **Remoção de Arquivos Temporários:** Arquivos temporários salvos no storage devem ser deletados imediatamente após o processamento da importação usando a biblioteca `fs` do Node.js.

---

## 9. Módulo de Importação Inteligente de Questões (OCR / Parsing de PDF via IA Gemini)

- **Serviço Responsável:** `src/services/geminiPdfService.js` utilizando `@google/genai`.
- **Fluxo de Trabalho:**
  1. O administrador envia o PDF da prova e do gabarito oficial em `pages/importarQuestoesPdf.html`.
  2. O backend faz o parsing multimodal com o Gemini, extraindo questões, enunciados (formatados em HTML/LaTeX), alternativas e cruzando com o gabarito.
  3. O lote fica salvo temporariamente no banco como rascunho de importação (`/api/questoes/rascunho`).
  4. O administrador revisa e edita as questões extraídas em `pages/revisarImportacaoPdf.html` e confirma a inserção definitiva no banco de dados (`/api/questoes/importar-pdf-confirmar`).

---

## 10. Módulo de Roadmaps de Estudo e Painel Administrativo

- **Trilhas de Estudos (Roadmaps):** 
  - Estrutura frontend composta por `pages/roadmaps.html` e páginas específicas por disciplina (`roadmapBio.html`, `roadmapFis.html`, `roadmapGeo.html`, `roadmapHist.html`, `roadmapMat.html`, `roadmapPort.html`, `roadmapQui.html`).
- **Gerenciamento Administrativo (`/api/admin`):**
  - Rotas protegidas por `authMiddleware` + `adminMiddleware`.
  - Permite listar e excluir usuários (`GET/DELETE /api/admin/usuarios`), gerenciar listas da plataforma (`GET/DELETE /api/admin/listas`), visualizar o `dashboardAdm.html` e gerenciar questões reportadas (`questoesReportadas.html`).
- **Gestão de Temas e Subtemas (`/api/temas` e `/api/subtemas`):**
  - O sistema possui uma taxonomia estruturada em 3 níveis: **Disciplina -> Tema -> Subtemas**.
  - As questões são associadas a no máximo 1 Tema (tabela `questoes.tema_cod`) e múltiplos Subtemas via relação N:N (`questao_subtema`).
  - Criação, edição e exclusão restritas a administradores.
  - Leitura aberta para usuários autenticados por disciplina (`GET /api/temas/disciplina/:disciplina_cod`) e por tema (`GET /api/subtemas?tema_cod=X`).

---

## 11. Arquivos de Referência Rápida

- [README.md](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/README.md): Contexto geral da aplicação.
- [api.md](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/api.md): Documentação detalhada das rotas e payloads da API.
- [server.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/src/server.js): Ponto de entrada, configuração do Express e sincronização do banco.
- [index.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/src/models/index.js): Carregamento dos modelos Sequelize e inicialização de relacionamentos.
- [geminiPdfService.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/src/services/geminiPdfService.js): Serviço de OCR e parsing estruturado de exames via Google Gemini SDK.
- [authGuard.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/scripts/authGuard.js): Guardião de autenticação client-side para o frontend.
- [loadSidebar.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/scripts/loadSidebar.js): Carregador dinâmico do componente de Sidebar e Perfil.
- [userRoutes.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/src/routes/userRoutes.js): Exemplo de estruturação de rotas e encadeamento de middlewares.
- [userController.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/src/controllers/userController.js): Padrão de respostas JSON, códigos HTTP e tratamento de erros.
- [authMiddleware.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/src/middlewares/authMiddleware.js): Implementação da verificação do token JWT.

---

## 12. Guia de Estilização Visual — Identidade do Cedeefe

Esta seção define as regras obrigatórias de estilização para que **todas** as páginas do Cedeefe mantenham uma identidade visual coesa, premium e moderna. As páginas de referência que exemplificam o padrão visual são `dashboard.html`/`dashboard.css` e `procurarQuestoes.html`/`procurarQuestoes.css`.

### 12.1. Paleta de Cores Oficial

A identidade visual do Cedeefe é construída sobre dois eixos de cor: **rosa** (destaque, acento, interação) e **verde** (ação positiva, sucesso, botões primários). **Nunca utilize cores genéricas do Bootstrap** (`bg-success`, `bg-primary`, `bg-danger`, `bg-info`, `bg-secondary`, `text-success`, `text-danger`) diretamente. Crie classes customizadas com os valores hexadecimais abaixo.

#### Rosa (Destaque e Identidade)
| Função | Hex | Uso |
|---|---|---|
| Rosa principal (accent) | `#c23672` | Ícones de destaque, bordas de avatar, paginação ativa, títulos de calendário, badges de status |
| Rosa escuro | `#a0285b` | Hover do rosa principal, texto forte sobre fundos rosa |
| Rosa botão (CTA suave) | `#FFCAD4` | Botões da landing page, fundo de "dia de hoje" no calendário |
| Rosa hover botão | `#FFB8C5` | Hover do botão rosa suave |
| Rosa fundo card | `#FFD8DF` | Fundo de cards de estatísticas, badges de ano, seções de destaque |
| Rosa fundo badge | `#fce8f0` | Fundo de badges de tema, hover de alternativas incorretas, hover de calendário |
| Rosa borda | `#f4d6dd` | Bordas de cards, inputs, divisores, stat cards |
| Rosa header card | `#fff7f9` | Background do header de cards de questão |
| Rosa texto kicker | `#ff9cae` | Kickers de seção, texto de destaque suave |
| Rosa checkbox | `#ff7ca3` | Accent de checkboxes |
| Rosa borda login | `rgb(255, 156, 156)` | Borda dos formulários de login e cadastro |
| Rosa sombra | `rgba(194, 54, 114, 0.08~0.12)` | Box-shadow de cards e containers |

#### Verde (Ação e Sucesso)
| Função | Hex | Uso |
|---|---|---|
| Verde botão primário | `#80C242` | `.btn-verde`, botões de ação principal (Filtrar, Responder, Criar) |
| Verde hover | `#69a730` | Hover dos botões verdes |
| Verde texto | `#2f6b3d` | Texto forte sobre fundo verde claro |
| Verde stat texto | `#538d24` | Texto de badges de disciplina, título de explicação |
| Verde fundo badge | `#eef7e5` | Fundo de badges de disciplina, stat cards verdes |
| Verde fundo suave | `#E9FFD3` | Fundo de badges de autor, gradientes |
| Verde borda | `#d4edc2` | Borda de stat cards verdes |
| Verde fundo hover alt. | `#f5faf0` | Hover de alternativas interativas |
| Verde fundo explicação | `#e0f0d0` | Fundo de alternativas corretas |
| Verde sombra | `rgba(128, 194, 66, 0.15~0.25)` | Box-shadow de botões verdes no hover |

#### Neutros
| Função | Hex | Uso |
|---|---|---|
| Fundo body | `#f9f9f9` | Background geral de todas as páginas internas |
| Branco sidebar/menu | `#FDFDFD` | Background da sidebar e menu superior |
| Texto principal | `#1f1f1f` | Títulos e headings |
| Texto secundário | `#555` ou `#7b7b7b` | Labels, subtítulos, descrições |
| Texto muted | `#6f6f6f` ou `#7b7b7b` | Texto de apoio, metadados |
| Borda suave | `#e9ecef` | Bordas de inputs, divisores neutros |
| Fundo input | `#f0f0f0` | Background de badges de letra neutros |
| Fundo vazio (gráficos) | `#f0f0f0` | Gráficos sem dados |

### 12.2. Padrão de Componentes CSS

Ao criar ou redesenhar qualquer página interna do Cedeefe, siga rigorosamente estes padrões:

#### Cards e Containers
- `border-radius: 24px` para cards principais, `20px` para cards de conteúdo, `14px~16px` para elementos menores
- `border: 1px solid rgba(255, 184, 197, 0.35)` ou `1px solid #f4d6dd` — **nunca** usar `.border` genérica do Bootstrap
- `box-shadow: 0 14px 34px rgba(30, 30, 30, 0.08)` para cards normais
- `box-shadow: 0 8px 24px rgba(194, 54, 114, 0.08~0.10)` para cards em destaque
- Background: `#ffffff` para cards normais, `#fff7f9` para headers de card

#### Botões
- **Botão principal (ação):** classe `.btn-verde` — `background: #80C242`, `color: #fff`, `border-radius: 12px`, hover com `#69a730` e `translateY(-1px)`
- **Botão secundário (cancelar/limpar):** classe `.btn-outline-rosa` — `border: 1px solid #f4d6dd`, `color: #c23672`, hover com `background: #fce8f0`
- **Botão terciário (explicação/detalhe):** classe `.btn-outline-verde` — `border: 1px solid #d4edc2`, `color: #80C242`, hover com `background: #eef7e5`
- **Nunca** use `btn-success`, `btn-primary`, `btn-danger`, `btn-info`, `btn-outline-success`, `btn-outline-primary` do Bootstrap

#### Badges
- **Disciplina:** `.badge-disciplina` — fundo `#eef7e5`, texto `#538d24`
- **Tema:** `.badge-tema` — fundo `#fce8f0`, texto `#c23672`
- **Ano:** `.badge-ano` — fundo `#FFD8DF`, texto `#a0285b`
- **Autor/Prova:** `.badge-autor` — fundo `#E9FFD3`, texto `#2f6b3d`
- **Total/Contagem:** `.badge-total` — fundo `#c23672`, texto `#fff`
- **Status positivo:** fundo `#80C242`, texto `#fff`
- **Status pendente:** fundo `#FFD8DF`, texto `#a0285b`
- Todos com `border-radius: 12px~20px`, `font-weight: 600`, `padding: 5px 12px`
- **Nunca** use `bg-success`, `bg-primary`, `bg-secondary`, `bg-info`, `bg-warning`, `bg-danger` do Bootstrap

#### Inputs e Selects
- `border-radius: 12px`
- `border: 1px solid #e9ecef`
- `:focus` → `border-color: #c23672` + `box-shadow: 0 0 0 3px rgba(194, 54, 114, 0.10)`
- Input group icon: fundo `#fff7f9`, cor `#c23672`

#### Animações
- Usar `@keyframes fadeInUp` (`from: opacity 0, translateY(18px)` → `to: opacity 1, translateY(0)`) em cards e seções
- Duração: `0.45s~0.5s ease both`
- Delays escalonados para múltiplos cards: `0.06s`, `0.12s`, `0.18s`, `0.24s`...
- Hover em cards: `transform: translateY(-2px~-4px)` + sombra expandida
- Hover em elementos menores (heatmap, calendário): `transform: scale(1.08~1.4)`
- **Nunca** deixe uma página estática — sempre adicione ao menos `fadeInUp` nos blocos principais

#### Gráficos (Chart.js)
- Cor de acertos: `#80C242` (verde do projeto)
- Cor de erros: `#c23672` (rosa do projeto)
- Paleta de disciplinas: `['#c23672', '#80C242', '#ff9cae', '#69a730', '#FFCAD4', '#538d24', '#a0285b', '#E9FFD3']`
- `borderWidth: 2`, `borderColor: '#ffffff'`
- Doughnut: `cutout: '65%'`
- Legendas: `usePointStyle: true`, `pointStyleWidth: 12`
- Estado vazio: `backgroundColor: '#f0f0f0'`

#### Paginação
- Cor do link: `#c23672`, borda `#f4d6dd`
- Ativo: fundo `#c23672`, texto `#fff`
- Hover: fundo `#fce8f0`
- `border-radius: 10px`, `font-weight: 600`

### 12.3. Regras Obrigatórias

1. **Fundo do body**: Sempre `#f9f9f9` em páginas internas autenticadas (dashboard, questões, flashcards, desempenho, perfil, etc.)
2. **Nunca usar classes de cor do Bootstrap** (`bg-success`, `bg-primary`, `bg-danger`, `bg-info`, `bg-secondary`, `text-success`, `text-primary`, `text-danger`, `btn-success`, `btn-primary`, `btn-danger`) — sempre criar classes customizadas com os hexadecimais da paleta acima
3. **Nunca usar variáveis CSS** (`var(--minha-cor)`) — manter valores hexadecimais ou RGB diretos
4. **Sempre incluir animação `fadeInUp`** nos blocos principais de cada página
5. **Sempre usar `border-radius` arredondado** — mínimo `12px` para elementos pequenos, `20px~24px` para cards
6. **Sombras rosadas** em cards principais — usar `rgba(194, 54, 114, 0.06~0.12)` ao invés de sombras genéricas cinzas
7. **Hover com elevação** — cards devem ter `transform: translateY(-2px~-4px)` no hover
8. **Spinner de loading**: classe `.spinner-rosa` (cor `#c23672`) ao invés de `text-primary`, `text-success` etc.
9. **Estados vazios**: usar classe `.estado-vazio` com `border-radius: 20px`, borda `#f4d6dd`, sombra rosada
10. **Avatar do usuário**: borda `3px solid #c23672`, fallback de cor `background=c23672&color=fff`

### 12.4. Páginas de Referência

Ao redesenhar qualquer página existente, use como referência visual e de código:
- [dashboard.css](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/estilos/dashboard.css): Padrão de cards, heatmap, calendário, perfil e stats
- [dashboard.html](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/pages/dashboard.html): Estrutura de banner, cards de stats rápidas, gráficos
- [procurarQuestoes.css](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/estilos/procurarQuestoes.css): Padrão de filtros, cards de questão, badges, alternativas interativas, paginação
- [procurarQuestoes.html](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/pages/procurarQuestoes.html): Estrutura de cabeçalho de página, painel de filtros, container de conteúdo

