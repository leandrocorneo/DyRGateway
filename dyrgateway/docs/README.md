# Documentação do frontend DyRGateway

Esta pasta reúne o contexto técnico necessário para pessoas e agentes de IA desenvolverem o painel sem inventar contratos ou descaracterizar a interface.

## Índice

- [Arquitetura](architecture.md): rotas, composição, dados e responsabilidades.
- [Contratos da API](api-contracts.md): endpoints efetivamente consumidos e cuidados de serialização.
- [Sistema visual](design-system.md): identidade, temas, componentes e gráficos.
- [Desenvolvimento](development.md): container, comandos, validação e Git.
- [Roadmap](roadmap.md): necessidades sem suporte completo na API ou frontend.

## Princípios

- A API é a única fonte de verdade; não existem mocks autorizados.
- Cada página pode ter composição Tailwind própria, apoiada por componentes e tokens compartilhados.
- Dashboard e Saúde são superfícies analíticas; CRUDs permanecem orientados à tarefa.
- Estados ausentes, parciais e indisponíveis devem ser explícitos.
- Mudanças visuais preservam a identidade azul-clara e a ergonomia atual.

## Repositório relacionado

A API está em `/home/leandro/DyRGatewayAPI`. Antes de adicionar qualquer chamada, confira as rotas, DTOs e serialização nesse repositório.
