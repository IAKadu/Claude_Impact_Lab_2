# Claude Impact Lab Rio #2

Este repositório reúne o projeto desenvolvido durante a segunda edição do **Claude Impact Lab no Brasil**, um hackathon patrocinado pela **Anthropic** e realizado na cidade do Rio de Janeiro.

## Sobre o evento

O Claude Impact Lab Rio #2 é um hackathon de um dia inteiro, aberto a pessoas de todos os perfis. Durante o evento, as equipes utilizarão o Claude para criar soluções voltadas a um problema real da cidade do Rio de Janeiro.

A iniciativa é realizada em parceria com:

- Prefeitura do Rio de Janeiro;
- Secretaria de Desenvolvimento Econômico;
- Secretaria Municipal de Educação.

## O desafio

As equipes trabalharão em um problema concreto apresentado pela Secretaria Municipal de Educação.

O briefing completo, os conjuntos de dados e os critérios de avaliação serão divulgados no dia do evento. Este README poderá ser atualizado após a apresentação do desafio com informações sobre a solução, a arquitetura, as tecnologias utilizadas e as instruções de execução.

## Objetivos

- Desenvolver uma solução útil para um desafio real da cidade;
- Explorar o uso de inteligência artificial com o Claude;
- Promover colaboração e troca de experiências entre participantes e mentores;
- Gerar impacto positivo para quem vive no Rio de Janeiro.

## Impacto esperado

Ao final do hackathon, as melhores soluções serão doadas para a cidade do Rio de Janeiro, contribuindo para transformar os protótipos desenvolvidos durante o evento em iniciativas de impacto real.

## Equipe

**Nome da equipe:** Creche Rio Inteligente 35

- **Kadu Bruns** — [kadubruns@gmail.com](mailto:kadubruns@gmail.com)
- **Werônica Oliveira** — [weronicasoliveira@gmail.com](mailto:weronicasoliveira@gmail.com)
- **Caio Silva** — [the.caiosilva@gmail.com](mailto:the.caiosilva@gmail.com)
- **Erick Muniz** — [curvello.muniz@gmail.com](mailto:curvello.muniz@gmail.com)

## Resumo da solução — Fila Viva

O **Fila Viva** é uma camada de orquestração auditável para vagas de creche, cobrindo três papéis da
jornada num único aplicativo (este repositório):

1. **Inscrição da família** — localização por CEP/bairro, mapa de unidades próximas, seleção de até
   cinco preferências, entrevista declaratória (texto ou voz) e revisão, com handoff auditável e
   tipado para a operação (nenhum dado sensível atravessa o handoff).
2. **Operação (gestor de vaga)** — centro de operação com fila elegível, oferta única por criança,
   convocação por etapas, leitura territorial agregada e trilha de auditoria append-only exportável.
3. **Otimização (gestor de CRE)** — aba nativa que cruza vaga ociosa das unidades parceiras com a
   fila de espera (dados reais 2021–2025 da SME-Rio), recomenda unidade alternativa e sequência de
   convocação, com KPIs, gráficos, mapa de unidades e um assistente conversacional.

A aplicação não substitui a regra pública de classificação, não cria um novo ranking e não
automatiza decisões de direito — ver os guardrails e limites detalhados em
[`DOCUMENTACAO.md`](DOCUMENTACAO.md).

## Arquitetura / como o Claude foi usado

- **Claude Code** construiu a aplicação (Next.js/React/TypeScript, Tailwind, shadcn, Leaflet,
  recharts) e o pipeline Python de dados (DuckDB sobre a extração `dadoscreche`).
- **Claude API** (`claude-opus-5`) atua em dois pontos, sempre como camada de explicação, nunca de
  cálculo: (1) gera o resumo executivo e a justificativa de cada recomendação no pipeline, restrito
  aos números já calculados deterministicamente; (2) alimenta o **Assistente** da aba Otimização —
  um agente com uma única ferramenta (`run_sql`, somente leitura) que escreve a consulta, lê o
  resultado real e só responde depois de ver o dado, nunca de memória. Perguntas comparativas
  também retornam um gráfico renderizado a partir da própria consulta.
- Ver a arquitetura completa, o contrato de handoff entre inscrição e operação, e os limites para
  produção em [`DOCUMENTACAO.md`](DOCUMENTACAO.md).
- O agente do Otimizador roda via `creche-otimizador/agent/sql_server.py` (companion local em
  DuckDB) — não incluído neste repositório; ver "Como testar localmente" em `DOCUMENTACAO.md`.

## Links

- **Aplicação:** não publicada nesta etapa — rodar localmente conforme
  [`DOCUMENTACAO.md`](DOCUMENTACAO.md) (seção "Como testar localmente").
- **Vídeo demo:** _pendente._

## Status do projeto

> MVP funcional, validado localmente. Ver `DOCUMENTACAO.md` para escopo implementado,
> limites conhecidos e gates necessários antes de qualquer piloto conectado à SME-Rio.

---

Desenvolvido durante o **Claude Impact Lab Rio #2**.
