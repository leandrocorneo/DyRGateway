# DyRGateway Admin

Painel administrativo Next.js para configuração, diagnóstico e monitoramento do DyRGateway.

## Documentação

- Orientação para agentes: [`AGENTS.md`](AGENTS.md)
- Índice técnico: [`docs/README.md`](docs/README.md)
- Contratos consumidos: [`docs/api-contracts.md`](docs/api-contracts.md)
- Sistema visual: [`docs/design-system.md`](docs/design-system.md)

## Ambiente

- Frontend: `http://localhost:9100`
- API: `NEXT_PUBLIC_API_URL`, localmente `http://localhost:9000/api`

Comandos npm devem ser executados no container `next-app`:

```bash
docker exec next-app npm run lint
docker exec next-app npm run build
```

Consulte `docs/development.md` para o fluxo completo.
