# AGENTS.md

Este arquivo contém instruções duráveis para agentes que trabalham no frontend administrativo DyRGateway. Leia `docs/README.md` antes de alterar o código.

## Objetivo do repositório

Painel administrativo Next.js para configurar e observar o DyRGateway. A API vive em `/home/leandro/DyRGatewayAPI` e é a única fonte de dados.

## Mapa rápido

- `app/`: páginas do App Router.
- `app/components/`: frame administrativo e componentes compartilhados.
- `app/health/`: workspace de monitoramento e abas especializadas.
- `app/globals.css`: tokens dos temas e estilos base.
- `lib/apiClient.ts`: Axios, cookies e tratamento global de 401.
- `lib/types.ts`: contratos consumidos da API.
- `lib/monitoring.ts`: ranges, estados e formatadores de métricas.
- `docs/`: arquitetura, contratos, design, desenvolvimento e roadmap.

## Fluxo de trabalho esperado

1. Leia a documentação e a página/componente envolvido.
2. Confirme o endpoint e o payload no repositório da API antes de criar tipos ou UI.
3. Planeje mudanças amplas de navegação, contratos ou design antes de editar.
4. Preserve a composição e os tokens existentes; mantenha alterações focadas.
5. Valide lint, build, temas e responsividade antes de concluir.

## Comandos e ambiente

- O frontend roda no container `next-app` e é exposto em `http://localhost:9100`.
- Instalação: `docker exec next-app npm install`
- Lint: `docker exec next-app npm run lint`
- Build: `docker exec next-app npm run build`
- Execute Docker Compose a partir de `/home/leandro/DyRGateway/dyrgateway` no WSL.
- Não execute npm no host quando o ambiente do container estiver disponível.
- Não faça push sem solicitação explícita.

## Regras de produto e contratos

- Não invente endpoints, payloads, métricas, permissões ou dados de exemplo.
- Não use mocks para substituir funcionalidades ausentes; registre a lacuna em `docs/roadmap.md`.
- Continue usando `NEXT_PUBLIC_API_URL`, Axios e `withCredentials: true`.
- Preserve redirect para `/login` em 401.
- Trate `503` de `/health/ready` como payload válido de diagnóstico.
- Valores `null`, `unknown` e `unsupported` não são zero.
- Séries devem preservar lacunas e limites de 720 pontos da API.
- Contadores acumulados de containers não devem ser rotulados como throughput.
- Ao mudar um contrato compartilhado, atualize `lib/types.ts` e `docs/api-contracts.md`.

## Regras de interface

- Preserve Geist/Geist Mono, temas claro/escuro e os tokens de azul-claro existentes.
- Evite neon, brilho, gradientes decorativos e predominância monocromática sem contraste funcional.
- Use vermelho e âmbar apenas para estados reais retornados pela API.
- Use Lucide para ícones e Recharts para gráficos.
- Painéis e cards usam raio máximo de 8px; não aninhe cards.
- Mantenha dimensões estáveis, tabelas roláveis e texto sem sobreposição em mobile.
- Não transforme páginas operacionais em landing pages nem adicione texto promocional.
- Preserve mudanças locais não relacionadas e não reformate arquivos fora do escopo.

## Definição de pronto

- A UI usa apenas contratos reais e mantém autenticação por cookie.
- Loading, atualização, vazio, erro, parcialidade e nulabilidade foram tratados.
- Lint e build passam no container.
- Fluxos principais foram verificados em desktop e mobile, nos dois temas.
- Gráficos exibem unidades e semântica corretas.
- Documentação correspondente foi atualizada.
- O diff está focado e não contém segredos, mocks ou mudanças acidentais.
