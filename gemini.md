# Diretrizes e Regras do Projeto - Gemini AI

Este arquivo estabelece o conjunto de regras, padrões de arquitetura, diretrizes de código e armadilhas comuns para assistentes IA (Gemini) ao atuarem na base de código do **Cedeefe**.

---

## 1. Visão Geral do Projeto
O **Cedeefe** é uma plataforma de estudos voltada para auxiliar estudantes na preparação para a prova de ingresso no ensino técnico integrado ao ensino médio do Instituto Federal Catarinense (IFC).

---

## 2. Build, Execução e Comandos

- **Instalar Dependências:** `npm install`
- **Popular o Banco de Dados:** `npm run seed` (executa `node src/seeders/run.js` para popular disciplinas e questões base)
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
  - `PORT` (opcional, padrão: `3000`)
- **Sincronização Sequelize:**
  - O backend executa `sequelize.sync()` no momento da inicialização em `src/server.js`.
  - Mantenha `RECONSTRUIR_BANCO = false` em `src/server.js`, a menos que deseje recriar (dropar e refazer) as tabelas intencionalmente.
  - Para popular dados, utilize o comando `npm run seed`.
- **Autenticação no Frontend:**
  - O Bearer Token de sessão do usuário deve ser armazenado/recuperado sempre via chave `jwt_token` no `localStorage` ou `sessionStorage`. Nunca utilize a chave genérica `token`.

---

## 4. Arquitetura da Aplicação

### Backend (`src/`)
- **Tecnologias:** Node.js, Express, Sequelize ORM (PostgreSQL), ES Modules.
- **Padrão de Camadas:** Segue o fluxo `Route -> Middleware -> Controller -> Model`.
- **Ponto de Entrada:** `src/server.js`, que registra as rotas base da API:
  - `/api/users` (`userRoutes.js`)
  - `/api/listas` (`listaRoutes.js`)
  - `/api/questoes` (`questaoRoutes.js`)
  - `/api/disciplinas` (`disciplinaRoutes.js`)
  - `/api/estatisticas` (`estatisticasRoutes.js`)
  - `/api/temas` (`temaRoutes.js`)
  - `/api/baralhos` (`baralhoRoutes.js`)
  - `/api/cartoes` (`cartaoRoutes.js`)
  - `/api/admin` (`adminRoutes.js`)
- **Arquivos Estáticos:** A rota `/imagens` serve estaticamente o diretório `uploads/`.
- **Models:** Factories do Sequelize localizadas em `src/models/`, carregadas centralizadamente por `src/models/index.js` e associadas via método `associate` de cada model.

### Frontend (`pages/`, `estilos/`, `scripts/`, `componentes/`, `index.html`)
- **Tecnologias:** HTML5 estático, CSS3 Vanilla, JavaScript puro (ES6+ com `fetch`).
- **Estrutura:**
  - `pages/`: Arquivos HTML das páginas da aplicação.
  - `estilos/`: Folhas de estilo CSS separadas por página/componente.
  - `scripts/`: Scripts JS de nível de página consumindo a API backend via `fetch()`.
- **Componentes Compartilhados:** A Sidebar e a Navbar são estáticas e replicadas em cada arquivo HTML.

---

## 5. Frontend (Estrutura e Padrões Visuais)

- **HTML:** Utiliza estrutura semântica HTML5. Não há template engine dinâmica no backend ou framework de frontend (React/Vue); os elementos compartilhados (sidebar/navbar) têm estrutura replicada manualmente nas páginas.
- **CSS:**
  - Mantenha a separação entre CSS global (ex: `sidebar.css`) e CSS específico de cada página (ex: `login.css`).
  - Disposição visual baseada em **Flexbox**.
  - Evite criar ou utilizar variáveis CSS customizadas (`var(--minha-cor)`). Mantenha o padrão existente com valores hexadecimais ou RGB.
  - Ícones obtidos via FontAwesome, Bootstrap Icons ou Material Symbols.
  - Tipografia: Google Fonts (**Poppins**).
- **Padronização:**
  - Mantenha a Sidebar e a Navbar rigorosamente idênticas ao padrão atual (mesmo layout, ordem e ícones), a menos que uma alteração seja solicitada.
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

- **`JWT_SECRET` Ausente:** Sem a variável `JWT_SECRET` no `.env`, a autenticação falhará em todas as rotas protegidas.
- **Sincronização Forçada do Banco (`force: true`):** Nunca execute `sequelize.sync({ force: true })` em ambientes produtivos ou de teste contínuo, pois os dados serão destruídos e redefinidos.
- **URLs de API no Frontend:** Os scripts JS do frontend contêm URLs de endpoint apontando para `http://localhost:3000`. Atente-se ao alterar portas ou ambientes.
- **Segurança no Upload de Arquivos (Multer):**
  - O diretório `uploads/` é servido publicamente via `/imagens`.
  - Qualquer novo fluxo de upload deve reutilizar o middleware em `src/config/multer.js`.
  - Valide estritamente as extensões de arquivo permitidas (ex: imagens ou `.csv`) e restrinja o tamanho limite (`fileSize`) para evitar vulnerabilidades de RCE e DoS.
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

## 9. Arquivos de Referência Rápida

- [README.md](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/README.md): Contexto geral da aplicação.
- [api.md](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/api.md): Documentação detalhada das rotas e payloads da API.
- [copilot-instructions.md](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/.github/copilot-instructions.md): Diretrizes originais de desenvolvimento.
- [server.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/src/server.js): Ponto de entrada, configuração do Express e sincronização do banco.
- [index.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/src/models/index.js): Carregamento dos modelos Sequelize e inicialização de relacionamentos.
- [userRoutes.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/src/routes/userRoutes.js): Exemplo de estruturação de rotas e encadeamento de middlewares.
- [userController.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/src/controllers/userController.js): Padrão de respostas JSON, códigos HTTP e tratamento de erros.
- [authMiddleware.js](file:///c:/Users/santi/OneDrive/Desktop/Cedeefe/src/middlewares/authMiddleware.js): Implementação da verificação do token JWT.
