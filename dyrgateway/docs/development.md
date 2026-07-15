# Desenvolvimento e validação

## Ambiente

- Workspace WSL: `/home/leandro/DyRGateway/dyrgateway`
- Container: `next-app`
- URL local: `http://localhost:9100`
- API local: `http://localhost:9000/api`

Execute npm e build dentro do container, não no host.

## Comandos

```bash
docker exec next-app npm install
docker exec next-app npm run lint
docker exec next-app npm run build
```

Para logs e estado:

```bash
docker compose ps
docker compose logs -f next-app
```

Execute Docker Compose a partir de `/home/leandro/DyRGateway/dyrgateway` no WSL.

## Checklist funcional

- Login com cookie HTTP-only e retorno após 401.
- CRUD de aplicações, domínios e serviços.
- Diagnóstico de host e path.
- Criação de usuário sem listagem fictícia.
- Dashboard e todas as abas de Saúde com API autenticada.
- Ranges em query string, atualização manual e polling de 60 segundos.
- Readiness 503, valores nulos, séries vazias e períodos parciais.
- Tema claro/escuro e navegação desktop/mobile.

## Alterações de contrato

1. Confirme a rota e o DTO no repositório da API.
2. Atualize `lib/types.ts` e o cliente/página correspondente.
3. Atualize `docs/api-contracts.md`.
4. Valide erro, ausência e compatibilidade com respostas antigas quando aplicável.

## Git

- Preserve alterações locais não relacionadas.
- Commits devem ser semânticos, em inglês e curtos.
- Separe fundação, feature e infraestrutura quando fizer sentido.
- Não faça push sem pedido explícito.
- Revise `git diff` e `git status` antes de concluir.
