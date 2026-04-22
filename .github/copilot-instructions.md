# Diretrizes do Projeto

## Build e Execução
- Instale as dependências: npm install
- Para popular o banco de dados com disciplinas e questões base: npm run seed
- Inicie o backend em desenvolvimento: npm run dev
- URL padrão do backend: http://localhost:3000
- Ainda não existe comando de teste automatizado definido no package.json

## Ambiente e Banco de Dados
- Crie um arquivo .env antes de executar o servidor.
- Variáveis obrigatórias: DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE, DB_PORT, JWT_SECRET.
- PORT é opcional (padrão: 3000).
- O backend executa sequelize sync na inicialização a partir de src/server.js.
- Mantenha RECONSTRUIR_BANCO como false, a menos que você queira intencionalmente recriar (dropar e refazer as tabelas) o seu banco de dados. Para popular, utilize o atalho de script descrito em Build e Execução.

## Arquitetura
- O backend fica em src/ e segue o fluxo route -> controller -> model.
- Entrada principal: src/server.js monta:
  - /api/users
  - /api/listas
  - /api/questoes
  - /api/disciplinas
  - /api/estatisticas
  - /api/temas
  - /api/baralhos
  - /api/cartoes
- Os models são factories do Sequelize carregadas em src/models/index.js, depois associadas via método associate de cada model.
- O frontend é estático em HTML/CSS/JS:
  - pages/ for HTML pages
  - estilos/ for per-page CSS
  - scripts/ for page-level JavaScript using fetch

## Convenções
- Use ES Modules em todo o projeto (import/export), conforme package.json type module.
- Mantenha tableName explícito nas definições de model do Sequelize para evitar problemas de nomenclatura/pluralização.
- Mantenha rotas protegidas com auth com middleware antes dos controllers.
- Para rotas exclusivas de admin, encadeie auth middleware antes de admin middleware.
- Siga o estilo atual de controller: métodos async com try/catch e códigos HTTP claros.
- Ao criar, vincular ou alterar dependências entre tabelas (Exemplo: Temas referenciando Disciplinas), garanta validação com `Model.findByPk()` para travar Foreign Key Exceptions que derrubariam o servidor, retornando um status `404`.
- Previna envios duplicados em nomes textuais via `findOne` antes de ações destrutivas ou inserções (garantindo retorno em `409 Conflict`).
- Ao alterar arquivos existentes, mantenha comentários e textos visíveis ao usuário consistentes com o padrão em português já adotado. Todos os comentários no código devem ser estritamente em português.
- Os controllers devem agrupar suas funções e utilizar exportação padrão (ex: `export default nomeController;`), ao invés de exportar cada módulo ou função separadamente.
- Em rotas protegidas, sempre verifique a forma como o ID do usuário está sendo obtido: ele deve vir do token JWT (ex: `req.userId` extraído pelo auth middleware) e não ser solicitado diretamente no corpo (body) ou parâmetros da requisição.
- Proteção contra IDOR (Insecure Direct Object Reference): Ao acessar, atualizar ou excluir recursos específicos por ID (como listas, cartões, temas), valide ativamente se o registro retornado pelo banco (`usuario_cod`, ou equivalente) pertence de fato ao usuário da requisição (`req.userId`), bloqueando acessos indevidos com staus `403` ou `404`.

## Armadilhas Comuns
- Ausência de JWT_SECRET quebra a validação de token no auth middleware.
- Alterar sequelize sync para force true pode apagar/recriar tabelas.
- Scripts do frontend usam URLs fixas de localhost para a API; altere com cuidado se o ambiente mudar.
- Risco de execução de código (RCE) e DoS: Arquivos enviados via Multer são expostos por /imagens mapeado para uploads/ em src/server.js. Ao adicionar fluxos de upload, valide terminantemente extensões restritas (ex: imagens ou .csv para dicionários) no arquivo `src/config/multer.js` e imponha limites de tamanho para a Payload (`fileSize`), evitando uso do disco por backdoors maliciosos disfarçados.
- A tabela usuario_estatisticas_gerais atua como cache e deve ser criada (inicializada com 0) logo na criação de uma nova conta de usuário para evitar `null pointers` em rotas de desempenho. O mesmo princípio se aplica para usuario_estatisticas_por_area, que é preenchida no registro ou via lógica de fallback (`estatisticasController.js`) caso existam matérias não rastreadas para aquele usuário.
  - O projeto não utiliza mais a métrica de "simulados" no cálculo de estatísticas por área, portanto não tente inserir colunas com esse prefixo, foque apenas em estatísticas de área restritas a primeira resposta global registrada.

## Sistema de Flashcards (SRS)
- O Cedeefe possui um motor de "Spaced Repetition System" em `/api/cartoes/:id/revisar`.
- O algoritmo calcula e atualiza o `intervalo_dias` levando em consideração os dias REAIS de atraso da revisão na vida real (somando com o Fator de Facilidade gerado pelas repostas: *1: Errei, 2: Difícil, 3: Médio, 4: Fácil*).
- O Heatmap (Mapa de calor) da gamificação dos flashcards extrai dados agrupados pelo ano, sem precisar processar datas defasadas (`/api/estatisticas/flashcards`).
- Ao manipular rotas de upload para Baralhos/Cartões, reaproveite o middleware em `src/config/multer.js` (como form-data em `imagem` para Cartão ou `arquivo_importacao` em Baralho).
- Para arquivos textuais importados em Baralho, garanta que seja separado por `;` e que o arquivo temporário será deletado (função assíncrona/síncrona de deleção node `fs`) do storage imediatamente após o processamento lógico.

## Referências Principais
- README.md para contexto do projeto
- api.md para documentação da api
- src/server.js para inicialização e montagem de rotas
- src/models/index.js para carregamento de models e associações
- src/routes/userRoutes.js para padrão de rotas e middlewares
- src/controllers/userController.js para padrão de resposta/erro em controllers
- src/middlewares/authMiddleware.js para comportamento de autenticação JWT
