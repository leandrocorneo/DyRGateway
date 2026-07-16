# Contratos consumidos da API

Base URL: `NEXT_PUBLIC_API_URL`; desenvolvimento esperado `http://localhost:9000/api`.

## Regras gerais

- Cookies HTTP-only são enviados com `withCredentials: true`.
- 401 redireciona para login mantendo o caminho de retorno.
- `/health/ready` pode responder 503 com diagnóstico válido; não descarte o body.
- Tipos TypeScript refletem respostas existentes, mas não substituem validação do backend.

## Autenticação e recursos

- `POST /login` com `{ email, password }`
- `POST /logout`
- `GET /applications?skip&take`
- `GET /applications/:id`
- `POST /applications` com `{ name, slug, active? }`
- `PUT /applications/:id` com campos opcionais
- `DELETE /applications/:id`
- `GET /domains?skip&take`
- `GET /domains/host/:host`
- `POST /domains` com `{ host, applicationId }`
- `PUT /domains/:id` com campos opcionais
- `DELETE /domains/:id`
- `GET /services?skip&take`
- `GET /services/:id`
- `POST /services` com `{ applicationId, serviceTypeId, path, targetHost, targetPort, active? }`
- `PUT /services/:id` com campos opcionais
- `DELETE /services/:id`
- `POST /users` com `{ email, password, active? }`

O único `serviceTypeId` disponível sem endpoint de catálogo é HTTP: `00000000-0000-0000-0000-000000000001`.

## Gateway e health

- `GET /gateway/resolve-host/:host`
- `GET /gateway/resolve?host&path`
- `GET /health/live`
- `GET /health/ready`
- `GET /health`

## Monitoramento

- `GET /monitoring/overview?range`
- `GET /monitoring/api?range`
- `GET /monitoring/api/endpoints?range`
- `GET /monitoring/redis?range`
- `GET /monitoring/database?range`
- `GET /monitoring/containers?state&project&search&skip&take`
- `GET /monitoring/containers/:id?range&skip&take`
- `GET /monitoring/container-groups?state&search&skip&take`
- `POST /monitoring/container-groups/:id/start`
- `POST /monitoring/container-groups/:id/stop`
- `POST /monitoring/containers/:id/start`
- `POST /monitoring/containers/:id/stop`

Estrutura das series de API, Redis e banco:

- `meta`: range, from/to UTC, `stepSeconds`, `partial` e capacidades.
- `current`: última leitura.
- `summary`: totais, taxas e percentis.
- `series`: pontos históricos.
- `breakdown`: endpoints ou operações instrumentadas.

Semântica:

- Latência: `averageMs`, `p50Ms`, `p95Ms`, `p99Ms`, `minMs`, `maxMs`.
- Valores não observáveis: `null`, `unknown` ou `unsupported`.
- Redis/database: séries de infraestrutura; percentis de comandos/queries são agregados.
- Containers: rede, block I/O e writable layer são acumulados.
- `/monitoring/api/endpoints` não possui série temporal.

## Monitoramento global de containers

O catálogo retorna todos os containers presentes no Docker daemon:

- `state=running|stopped|all`, padrão `running`;
- `project` aplica correspondência exata ao projeto Compose;
- `search` pesquisa nome, imagem, projeto ou serviço;
- `skip` e `take` controlam a paginação, com máximo de 100 itens.

A resposta do catálogo contém `meta.pagination`, `meta.filters`, `summary` e `items`. Cada item possui identidade lógica, metadados Compose opcionais, estado atual, última amostra e `orchestration` com `protected`, `canStart`, `canStop` e `reason`.

O detalhe usa o UUID lógico no path e retorna `meta`, `container`, `current`, `summary` e `series`. O histórico é paginado em até 240 pontos por chamada, e cada ponto inclui `instanceId`.

Containers removidos retornam 404. Rede e block I/O permanecem contadores acumulados, e trocas de `instanceId` representam recriações.

## Catálogo agrupado

`GET /monitoring/container-groups` retorna projetos Compose expansíveis e containers standalone como itens individuais. A paginação conta itens de primeiro nível; cada projeto inclui todos os seus containers, resumo de estados/health e permissões agregadas.

- `state` usa `all` por padrão; projetos parcialmente ativos podem aparecer em `running` e `stopped`.
- `search` pesquisa projeto, nome, imagem e serviço.
- `take` aceita até 50.
- O frontend não calcula proteção ou permissões do grupo.

Ações coletivas usam o UUID do grupo e não enviam body. A resposta contém resumo atualizado e resultados `changed`, `unchanged` ou `failed` por container. Falhas parciais continuam sendo resposta `200` com `partial=true`.

## Orquestração de containers

As ações usam somente o UUID lógico retornado pelo catálogo e não enviam body:

- `POST /monitoring/containers/:id/start`: inicia containers externos em `created` ou `exited`.
- `POST /monitoring/containers/:id/stop`: para containers externos em `running` com timeout gracioso definido pela API.

A resposta contém `action`, `changed`, `completedAt`, estado anterior/atual, `instanceId`, health e permissões atualizadas. Erros tratados: `403` protegido, `404` removido, `409` conflito de estado/concorrência, `502` falha do Docker e `504` timeout.

O frontend nunca calcula proteção por nome ou projeto. Os controles usam exclusivamente `orchestration` retornado pela API. A especificação canônica fica em `DyRGatewayAPI/docs/features/container-orchestration.md`.
