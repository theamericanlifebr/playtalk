# Autenticação PlayTalk (PostgreSQL + bcrypt + JWT)

## Arquitetura
- `api/users/register`: cria usuário no PostgreSQL com senha hash (`bcrypt`).
- `api/users/login`: valida senha com `bcrypt.compare` e retorna JWT.
- `api/users/index`: endpoint protegido por JWT para obter o perfil autenticado.
- `api/users/update`: endpoint protegido por JWT para atualizar perfil/senha do próprio usuário.
- `api/_utils/db.js`: camada simples de acesso ao PostgreSQL.
- `api/_utils/auth.js`: criação e validação de JWT (Bearer Token).
- `js/auth-client.js`: cliente de autenticação no front-end (`window.playtalkAuth`).

## Onde os dados do usuário ficam no PostgreSQL?
Os dados ficam na tabela `users`, criada por `sql/auth_schema.sql`.

Campos principais:
- `username_key`: chave única normalizada do usuário (ex.: `joao`).
- `username`: nome exibido.
- `password_hash`: hash `bcrypt` da senha (nunca senha em texto puro).
- `data` (`jsonb`): progresso completo do jogo (pontos, modos, stats, etc.).
- `created_at` e `updated_at`: auditoria de criação/atualização.

## Variáveis de ambiente (Render)
- `DATABASE_URL`: URL de conexão PostgreSQL do Render.
- `JWT_SECRET`: segredo forte para assinar o token JWT.
- `JWT_EXPIRES_IN`: validade do token (ex.: `7d`).
- `BCRYPT_ROUNDS`: custo do bcrypt (recomendado: `12`).
- `PGSSL`: `true` para forçar SSL quando necessário.

## Endpoints

### POST `/api/users/register`
Body:
```json
{
  "username": "seu_usuario",
  "password": "senha-forte-8+"
}
```

Resposta `201`:
```json
{
  "success": true,
  "token": "<jwt>",
  "user": {
    "key": "seu_usuario_normalizado",
    "username": "seu_usuario",
    "data": {}
  }
}
```

### POST `/api/users/login`
Body:
```json
{
  "username": "seu_usuario",
  "password": "senha"
}
```

Resposta `200`: mesmo formato de `register`.

### GET `/api/users`
Headers:
- `Authorization: Bearer <jwt>`

Retorna o usuário autenticado.

### POST `/api/users/update`
Headers:
- `Authorization: Bearer <jwt>`

Body:
```json
{
  "key": "usuario_normalizado",
  "username": "novo_nome_opcional",
  "password": "nova_senha_opcional",
  "data": { "points": 100 }
}
```

## Como usar no front-end do site
A página principal já carrega `js/auth-client.js`, que expõe:
- `playtalkAuth.register(username, password)`
- `playtalkAuth.login(username, password)`
- `playtalkAuth.getMe()`
- `playtalkAuth.updateUserData(dataPatch)`
- `playtalkAuth.logout()`
- `playtalkAuth.getToken()` e `playtalkAuth.getCurrentUser()`

Exemplo rápido:
```js
const user = await window.playtalkAuth.login('joao', 'senha1234');
console.log('Logado como:', user.username);

const me = await window.playtalkAuth.getMe();
console.log('Perfil atual:', me);

await window.playtalkAuth.updateUserData({ points: 120, tutorialDone: true });
```

> Observação: o cliente salva sessão no storage do navegador (`playtalk.auth.token` e `playtalk.auth.user`).

## Checklist Render
1. Definir env vars (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_ROUNDS`, `PGSSL`).
2. Rodar `sql/auth_schema.sql` no banco PostgreSQL do Render.
3. Fazer deploy.
4. Validar `POST /api/users/register`, `POST /api/users/login` e rota protegida com Bearer.

## Segurança
- Nunca retornar `password_hash` na API.
- JWT assinado com segredo forte e expiração.
- Senha sempre hash com bcrypt.
- Bloqueio de atualização de outro usuário (token deve casar com `key`).
- Recomenda-se adicionar rate limiting para rotas de login em camada de edge/reverse proxy.
