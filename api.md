# Documentação da API - Cedeefe

## Visão Geral
- Base URL local: http://localhost:3000
- Prefixo da API: /api
- Formato de resposta: JSON
- Autenticação: Bearer Token no header Authorization para rotas protegidas

Exemplo de header autenticado:

```http
Authorization: Bearer <seu_jwt_token>
```

## 1. Usuários

### Endpoint e Método
POST /api/users/register

### Descrição
Cria um novo usuário no sistema com senha criptografada.

### Parâmetros
- Body (JSON):
  - login (string, obrigatório)
  - senha (string, obrigatório)
  - adm (boolean, opcional)
  - data_nasc (string, opcional)
  - motivo (string, opcional)
  - escola (string, opcional)
  - genero (string, opcional)
  - endereco (string, opcional)
  - estado_civil (string, opcional)

### Respostas (Sucesso)
Status: 201

### Respostas (Erro)
Status: 400 ou 500
---

### Endpoint e Método
POST /api/users/login

### Descrição
Autentica o usuário e retorna um token JWT.

### Parâmetros
- Body (JSON):
  - login (string, obrigatório)
  - senha (string, obrigatório)

### Respostas (Sucesso)
Status: 200

### Respostas (Erro)
Status: 400  ou 500
---

### Endpoint e Método
GET /api/users/profile

### Descrição
Retorna os dados básicos do perfil do usuário autenticado.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)

### Respostas (Sucesso)
Status: 200

### Respostas (Erro)
Status: 400 ou 500
---

### Endpoint e Método
PUT /api/users/profile

### Descrição
Atualiza login e/ou senha do usuário autenticado.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Body (JSON):
  - login (string, opcional)
  - oldPassword (string, obrigatório se enviar newPassword)
  - newPassword (string, opcional)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 400 ou 500
---

### Endpoint e Método
DELETE /api/users/profile

### Descrição
Exclui a conta do usuário autenticado após confirmação de senha.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Body (JSON):
  - senha (string, obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 400 ou 500
---

## 2. Listas

### Endpoint e Método
POST /api/listas/gerar

### Descrição
Gera uma lista de questões aleatórias com base nos critérios enviados e cria uma atividade vinculada ao usuário logado.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Body (JSON):
  - quantidade (number, obrigatório)
  - disciplinas (array de number, obrigatório)
  - nome (string, opcional)
  - descricao (string, opcional)
  - disciplina_cod (number, obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 400 ou 500
---

### Endpoint e Método
GET /api/listas/:id

### Descrição
Retoma uma lista já criada pelo ID da atividade.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - id (number, obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 400 ou 500
---

## 3. Questões

### Endpoint e Método
POST /api/questoes

### Descrição
Cria uma nova questão com alternativas. Rota protegida e exclusiva para administrador.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
  - Content-Type: multipart/form-data
- Body (multipart/form-data):
  - descricao (string, obrigatório)
  - alternativas (JSON string ou array, obrigatório)
  - disciplina_cod (number, obrigatório)
  - explicacao (string, opcional)
  - autor (string, opcional)
  - ano (number, opcional)
  - imagem (file, opcional)
  - imagem_url (string, opcional)
  - tema_cod (number, opcional)

Exemplo de alternativas:

```json
[
  { "texto": "Alternativa A", "correta": false },
  { "texto": "Alternativa B", "correta": true }
]
```

### Respostas (Sucesso)
Status: 201


### Respostas (Erro)
Status: 400 ou 500
---

### Endpoint e Método
DELETE /api/questoes/:cod

### Descrição
Exclui uma questão pelo código e remove a imagem física associada, se existir. Rota protegida e exclusiva para administrador.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - cod (number, obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 400 ou 500
---

## 4. Disciplinas

### Endpoint e Método
GET /api/disciplinas

### Descrição
Retorna todas as disciplinas ordenadas por descrição.

### Parâmetros
- Não exige Body, Headers de autenticação, Query params ou Path params.

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 400 ou 500
---

## 5. Estatísticas Gerais

### Endpoint e Método
GET /api/estatisticas/gerais

### Descrição
Retorna as estatísticas consolidadas de desempenho do usuário logado (questões respondidas, acertos, erros, etc). A linha correspondente do banco é criada ao registrar o usuário.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 404
---

## 6. Estatísticas por Área

### Endpoint e Método
GET /api/estatisticas/por-area

### Descrição
Retorna as estatísticas de desempenho do usuário logado divididas por disciplina (Matemática, Português, etc). As categorias são criadas ou conferidas automaticamente via Fallback na chamada da requisição, cobrindo o aluno em caso de matérias recém-adicionadas.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 500
---

## 7. Ações em Listas

### Endpoint e Método
POST /api/listas/responder

### Descrição
Registra a resposta dada pelo usuário em uma questão de uma lista em andamento e atualiza as estatísticas (gerais e por área) de acertos e erros em tempo real (apenas se for a *primeira vez global* que a questão é respondida).

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Body (JSON):
  - atividade_cod (number, obrigatório)
  - questao_cod (number, obrigatório)
  - alternativa_cod (number, obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 403
---

### Endpoint e Método
POST /api/listas/:id/finalizar

### Descrição
Encerra a lista em andamento e computa a visualização no histórico, incrementando também as estatísticas de fechamento de listas no perfil.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - id (number, obrigatório) — ID numérico correspondente à atividade/lista

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 400
---

## 8. Temas

### Endpoint e Método
GET /api/temas/disciplina/:disciplina_cod

### Descrição
Retorna todos os temas vinculados a uma disciplina específica. Qualquer usuário logado pode acessar.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - disciplina_cod (number, obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 500
---

### Endpoint e Método
POST /api/temas

### Descrição
Cria um novo tema vinculado a uma disciplina submetida. Impede duplicações nominais exatas dentro da mesma disciplina. Rota protegida e exclusiva para administrador.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Body (JSON):
  - descricao (string, obrigatório)
  - disciplina_cod (number, obrigatório)

### Respostas (Sucesso)
Status: 201


### Respostas (Erro)
Status: 409 ou 404
---

### Endpoint e Método
PUT /api/temas/:cod

### Descrição
Edita a descrição e/ou a disciplina atrelada de um tema existente. Checa previamente por duplicidade nominal contra a disciplina alvo. Rota protegida e exclusiva para administrador.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - cod (number, obrigatório)
- Body (JSON):
  - descricao (string, opcional)
  - disciplina_cod (number, opcional)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 409
---

### Endpoint e Método
DELETE /api/temas/:cod

### Descrição
Exclui logicamente o tema pelo seu código primário. Rota protegida e exclusiva para administrador.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - cod (number, obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 404
---

## Observações Importantes
- Algumas rotas retornam 401, 403, 404 e 409 em casos específicos (token inválido, falta de permissão, recurso não encontrado, conflito de cadastro).
- Os exemplos de erro com 400 mostrados acima seguem o formato solicitado e representam cenários comuns de validação.
- Para rotas protegidas, sem token válido a API retorna erro de autenticação.

## 9. Baralhos (Flashcards)

### Endpoint e Método
POST /api/baralhos

### Descrição
Cria um novo baralho atribuído ao usuário logado.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Body (JSON):
  - nome (string, obrigatório)

### Respostas (Sucesso)
Status: 201


### Respostas (Erro)
Status: 400 ou 409
---

### Endpoint e Método
GET /api/baralhos

### Descrição
Retorna todos os baralhos pertencentes ao usuário logado.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 500
---

### Endpoint e Método
POST /api/baralhos/importar

### Descrição
Importa até 50 cartões para um novo baralho a partir de um arquivo de texto (.txt ou .csv). As frentes e versos devem ser separados por ponto-e-vírgula (;).

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
  - Content-Type: multipart/form-data
- Body (multipart/form-data):
  - arquivo_importacao (file, obrigatório)
  - nomeDaImportacao (string, opcional, nome do baralho gerado)

### Respostas (Sucesso)
Status: 201


### Respostas (Erro)
Status: 400 ou 500
---

### Endpoint e Método
PUT /api/baralhos/:id

### Descrição
Atualiza o nome do baralho do usuário logado.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - id (number, obrigatório)
- Body (JSON):
  - nome (string, obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 404
---

### Endpoint e Método
DELETE /api/baralhos/:id

### Descrição
Exclui um baralho e todos os cartões vinculados a ele por cascata.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - id (number, obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 404
---

## 10. Cartões (Flashcards)

### Endpoint e Método
POST /api/cartoes

### Descrição
Cria um cartão dentro de um baralho existente pertencente ao usuário. Permite envio de imagem opcional.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
  - Content-Type: multipart/form-data
- Body (multipart/form-data):
  - frente (string, obrigatório)
  - verso (string, obrigatório)
  - baralho_id (number, obrigatório)
  - tipo (string, opcional - ex: 'tradicional' ou 'escrita')
  - imagem (file, opcional)

### Respostas (Sucesso)
Status: 201


### Respostas (Erro)
Status: 404 ou 500
---

### Endpoint e Método
GET /api/cartoes/baralho/:baralho_id

### Descrição
Traz todos os cartões (e sua progressão no algoritmo SRS) para um baralho específico do perfil.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - baralho_id (number, obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 404
---

### Endpoint e Método
POST /api/cartoes/:id/revisar

### Descrição
Executa e atualiza a lógica do algoritmo SRS (Repetição Espaçada) de um cartão após o usuário respondê-lo. Retorna quando deverá ser a próxima revisão.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - id (number, obrigatório)
- Body (JSON):
  - dificuldade (number de 1 a 4, obrigatório - 1: Errei, 2: Difícil, 3: Médio, 4: Fácil)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 400 ou 404
---

### Endpoint e Método
PUT /api/cartoes/:id

### Descrição
Atualiza parcialmente os conteúdos textuais de frente, verso ou da imagem em um cartão.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
  - Content-Type: multipart/form-data
- Path params:
  - id (number, obrigatório)
- Body (multipart/form-data):
  - frente (string, opcional)
  - verso (string, opcional)
  - imagem (file, opcional)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 404
---

### Endpoint e Método
DELETE /api/cartoes/:id

### Descrição
Exclui puramente o cartão específico pertencente ao usuário logado.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - id (number, obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 404
---

## 11. Gamificação de Flashcards

### Endpoint e Método
GET /api/estatisticas/flashcards

### Descrição
Heatmap de contribuição: Retorna a quantidade de cartões respondidos ou revisados em cada data estrita, limitado ao total de contribuições por dia atrelado ao usuário no ano vigente.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)

### Respostas (Sucesso)
Status: 200


### Respostas (Erro)
Status: 500
---