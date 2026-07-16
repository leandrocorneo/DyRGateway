# Arquitetura do frontend

## Stack

- Next.js 16 com App Router.
- React 19 e TypeScript strict.
- Tailwind CSS 4 e tokens CSS em `app/globals.css`.
- Axios para HTTP, Lucide para ícones e Recharts para visualizações.

## Rotas

- `/login`: autenticação.
- `/`: Dashboard híbrido de métricas e configuração.
- `/applications`: CRUD de aplicações.
- `/domains`: CRUD de domínios.
- `/services`: CRUD de serviços.
- `/gateway`: diagnóstico de host e path.
- `/health`: hub com Visão geral, API, Redis, Banco e Containers.
- `/users/new`: criação de usuário; não existe listagem.

## Composição

`app/layout.tsx` aplica fontes, tema e `AdminFrame`. O frame contém sidebar, header, toggle de tema e logout. Páginas controlam sua própria composição e densidade; componentes compartilhados devem representar padrões reais, não abstrações especulativas.

Componentes principais:

- `app/components/ui.tsx`: campos, botões, badges, feedback e estados vazios.
- `app/components/monitoring.tsx`: ranges, abas, KPIs, status e gráficos.
- `app/components/ContainerOrchestrationActions.tsx`: start direto, confirmação de stop e erros operacionais.
- `app/health/*MonitoringTab.tsx`: visualizações especializadas por subsistema.

## Dados e autenticação

`lib/apiClient.ts` configura `NEXT_PUBLIC_API_URL`, JSON e `withCredentials: true`. O interceptor redireciona 401 para `/login?next=...`.

As páginas são Client Components e carregam dados diretamente pela API. `usePollingData` mantém o último valor durante refresh, cancela requests concorrentes, atualiza a cada 60 segundos e pausa quando a aba está oculta.

Não há store global. Adicione estado compartilhado somente quando existir necessidade entre rotas; aba, range e filtros do catálogo pertencem à query string, enquanto o UUID lógico do container pertence à rota de detalhe.

## Monitoramento

- Dashboard consome `/monitoring/overview` e mantém resumos de aplicações, domínios e serviços.
- Saúde carrega somente os endpoints da aba ativa; o catálogo operacional usa `/monitoring/container-groups` e o detalhe individual usa `/monitoring/containers/:id`.
- Projetos Compose são faixas expansíveis inicialmente recolhidas; standalone permanece no primeiro nível. Grupo e detalhe usam permissões da API e aplicam resultados antes da confirmação pelo polling.
- Ranges aceitos: `15m`, `1h`, `6h`, `24h`, `7d`, `15d`.
- Lacunas recebem pontos com valores nulos e `connectNulls=false`.
- Percentuais e unidades são formatados no frontend, mas não são substituídos por estimativas.

## Limites de responsabilidade

- Regras de roteamento, autenticação e agregação pertencem à API.
- O frontend não calcula percentis, disponibilidade histórica ou capacidade de disco ausente.
- Funcionalidades sem endpoint ficam em `roadmap.md`.
