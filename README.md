# PlayTalk mobile (Capacitor + Android)

Este repositório está organizado para usar **`www/`** como a Web UI do app Capacitor.

## Estrutura

- `www/`: frontend/web assets renderizados no app (single source of truth atual).
- `android/`: projeto nativo Android gerado pelo Capacitor.
- demais pastas (`api/`, `config/`, `docs/`, `server.js`, etc.): código de backend/infra e suporte.

## Fluxo rápido

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

> Se o Android já tiver sido adicionado antes, rode apenas `npx cap sync android` e `npx cap open android`.

## Onde editar o frontend

Por enquanto, edite diretamente em **`www/`**.
Qualquer alteração nessa pasta deve ser seguida de:

```bash
npx cap sync android
```
