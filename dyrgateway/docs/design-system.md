# Sistema visual

## Identidade

- Tipografia: Geist para interface e Geist Mono para IDs, rotas e valores técnicos.
- Tema central: azul-claro com fundos frios e sidebar azul-escura.
- Claro e escuro compartilham os mesmos tokens sem trocar a identidade.
- Vermelho indica erro/indisponibilidade real; âmbar indica atenção real; azul indica operação e seleção.

Tokens ficam em `app/globals.css`. Prefira `var(--accent)`, `var(--panel)`, `var(--border)` e tokens de gráficos a valores hexadecimais locais.

## Composição

- Painéis e cards têm raio máximo de 8px.
- Não aninhar cards nem transformar seções inteiras em cards flutuantes.
- Cabeçalhos de página usam eyebrow, título, descrição curta e ações.
- Dashboards são densos, escaneáveis e voltados à operação; não usar composição de landing page.
- Botões de ferramenta usam ícones Lucide e labels/tooltip quando necessário.

## Gráficos

- Usar Recharts e `ResponsiveContainer`.
- Alturas devem ser estáveis para evitar layout shift.
- Legendas podem ocultar séries; tooltips exibem unidade e timestamp.
- Não conectar lacunas nem transformar `null` em zero.
- Evitar pizza, gauge decorativo, 3D, neon, brilho e animação excessiva.
- Muitos containers devem usar seleção/tabela em vez de dezenas de séries simultâneas.

## Responsividade

- Validar 390px, 768px, 1440px e viewport amplo.
- KPIs empilham em telas pequenas.
- Tabelas usam scroll horizontal e largura mínima explícita.
- Controles numéricos, tabs, toolbars e gráficos mantêm dimensões estáveis.
- Texto não pode sobrepor ícones, botões, cards ou conteúdo adjacente.

## Estados

Toda tela de dados deve prever:

- carregamento inicial;
- atualização em segundo plano sem apagar dados;
- erro com possibilidade de retry;
- vazio real;
- período parcial;
- `unknown` e `unsupported`;
- sessão expirada via fluxo global de 401.
