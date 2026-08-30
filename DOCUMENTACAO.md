# Fila Viva — documentação do protótipo local

**Status:** protótipo funcional para validação local  
**Última atualização:** 30 de agosto de 2026  
**Publicação:** não realizada nesta etapa

## 1. Objetivo

O Fila Viva demonstra uma jornada integrada da localização e escolha de unidades até a orquestração auditável de vagas. A aplicação incorpora o fluxo funcional antes separado em `dashboard-creche`, sem substituir a regra pública de classificação, criar um novo ranking ou automatizar decisões de direito.

A fundamentação completa — transcrição, dados, processo, riscos, piloto e arquitetura-alvo — está no arquivo [`../DOSSIE_INTELIGENCIA_FILA_CRECHE.md`](../DOSSIE_INTELIGENCIA_FILA_CRECHE.md).

## 2. Escopo já implementado

- Entrada integrada com busca por dois CEPs ou bairros.
- Snapshot local de 2025 com 820 unidades, 793 com CEP, gerado a partir de `dadoscreche`.
- Mapa de proximidade, recomendação e seleção ordenada de até cinco unidades.
- Definição de grupamento e turno preferencial.
- Entrevista declaratória com 13 critérios históricos, resposta por botões e apoio opcional de voz.
- Revisão do resultado histórico com aviso de validação obrigatória.
- Handoff tipado para o painel por identificador opaco e `sessionStorage`.
- Entrada no Fila Viva como `received_unverified`, sem criar elegibilidade ou oferta.
- Centro de operação com métricas, filtros por CRE e grupamento e priorização de vagas.
- Lista elegível que preserva posição, pontuação, preferência e critérios confirmados.
- Oferta única demonstrativa por criança e protocolo de convocação por etapas.
- Registro local de tentativas de contato.
- Leitura territorial agregada de demanda e capacidade.
- Ponta final do fluxo, integrada na mesma aplicação (aba **Otimização** do painel, não um link externo): KPIs, resumo executivo, série histórica, recomendações prioritárias, mapa de unidades e ranking de vaga ociosa do `creche-otimizador`, portados para React/recharts/Leaflet a partir dos JSONs gerados pelo pipeline Python. Inclui um Assistente conversacional (Claude API + SQL sobre os dados do pipeline) — ver seção 4.1.
- Trilha de auditoria append-only simulada, inspeção de evidências e exportação JSON.
- Guardrails visíveis contra reordenação, duplicidade e decisão opaca.
- Dados totalmente ilustrativos e estados reiniciáveis.

## 3. Adaptação ao Manual de Marca Prefeitura Rio 2025

Fonte visual: `../MANUAL-DE-MARCA-PREFEITURA-RIO-2025.pdf`.

### Paleta aplicada

| Token              |     Valor | Uso na interface                               | Página do manual |
| ------------------ | --------: | ---------------------------------------------- | ---------------: |
| Azul institucional | `#13335A` | texto, cabeçalho, botões e superfícies escuras |                3 |
| Cinza-claro        | `#ECEDED` | superfícies neutras e estados pendentes        |                3 |
| Azul médio         | `#2A688F` | apoio, hover e visualizações                   |                4 |
| Azul-claro         | `#42B9EB` | foco, seleção, triângulos e destaques          |                4 |

O valor RGB impresso ao lado de `#2A688F` na página 4 não corresponde ao hexadecimal. A implementação usa o hexadecimal oficial indicado para telas.

O coral `#F06949` não foi usado: o manual restringe esse degradê à assinatura de filmes publicitários (páginas 34–35).

### Tipografia

- Títulos principais: peso Black/900, caixa alta e `letter-spacing: -0.03em`.
- Títulos curtos e navegação: peso Medium/Semibold e caixa alta.
- Textos longos: caixa normal, com legibilidade prioritária.
- Stack prevista: `Cera Pro`, Geist, Arial e sans-serif.

A Cera Pro não foi incorporada porque os arquivos web licenciados não acompanham o material. O protótipo usa Geist como fallback. Para fidelidade tipográfica final, a equipe de marca deve fornecer WOFF2 licenciados.

### Marca e grafismos

- A assinatura horizontal oficial branca foi extraída do próprio manual e aplicada à direita sobre o cabeçalho azul, sem remontar ou separar seus elementos.
- As proporções do arquivo foram preservadas; não há rotação, outline, distorção nem lockup inventado com “Fila Viva”.
- O nome Fila Viva é apresentado como produto independente da área de respiro da marca institucional.
- Triângulos modulares aparecem como ponto-final, ícone do produto e padrão rebaixado, conforme as páginas 20–24 e 28–33.
- O layout permanece preferencialmente alinhado à esquerda e a marca horizontal fica à direita, seguindo a página 25.
- O favicon usa um padrão geométrico da paleta; ele não separa o brasão da assinatura oficial.

### Acessibilidade complementar

O manual não especifica WCAG. A interface acrescenta:

- azul institucional sobre branco como combinação principal (`12,74:1`);
- azul-claro reservado a elementos de destaque, pois seu contraste sobre branco é insuficiente para texto normal;
- foco visível em `#42B9EB`;
- nomes acessíveis em botões, busca, filtros e marca;
- suporte a `prefers-reduced-motion`;
- navegação responsiva por teclado.

## 4. Arquitetura local

| Caminho                            | Responsabilidade                                           |
| ---------------------------------- | ---------------------------------------------------------- |
| `app/page.tsx`                     | rota inicial da jornada integrada                          |
| `app/creche-intake.tsx`            | localização, preferências, entrevista, revisão e handoff   |
| `app/intake-map.tsx`               | mapa Leaflet e raios de proximidade                        |
| `app/operacao/page.tsx`            | leitura segura do caso e entrada no painel operacional     |
| `app/fila-viva-dashboard.tsx`      | dados demonstrativos, estados, regras de interação e telas |
| `app/globals.css`                  | tokens de marca, tipografia, padrões e estilos globais     |
| `app/layout.tsx`                   | metadados locais, idioma, favicon e card social            |
| `lib/intake-contract.ts`           | schema, validação e armazenamento temporário do handoff    |
| `scripts/build_creches_2025.py`    | geração reproduzível do snapshot a partir de `dadoscreche` |
| `public/data/creches-2025.json`    | snapshot histórico consumido pela jornada                  |
| `app/otimizador-panel.tsx`         | aba Otimização: KPIs, gráficos, recomendações, assistente  |
| `app/otimizador-map.tsx`           | mapa Leaflet das unidades por status de descompasso         |
| `app/api/otimizador-chat/route.ts` | rota do Assistente: loop de tool-use com a Claude API       |
| `public/data/otimizador/*.json`    | saída do pipeline `creche-otimizador` consumida pela aba    |
| `components/ui/`                   | componentes de interface reutilizáveis                     |
| `public/prefeitura-rio-*.png`      | assinaturas oficiais extraídas do manual                   |
| `public/fila-viva-social-card.svg` | cartão social local na identidade adaptada                 |

O protótipo usa React 19, TypeScript, Tailwind CSS 4, componentes shadcn/Base UI, Leaflet, OpenStreetMap, recharts e Vinext. Não há banco de dados, autenticação, envio de mensagem ou conexão com sistemas oficiais nesta versão, além da chamada à Claude API feita pelo Assistente da aba Otimização.

### 4.1 Aba Otimização e o Assistente

Os dados de KPIs, CREs, unidades, vaga ociosa, histórico e recomendações são gerados pelo pipeline Python de `../creche-otimizador/pipeline` (execução única, offline) e copiados como JSON estático para `public/data/otimizador/`. A aba em si (`otimizador-panel.tsx`) só lê esses arquivos — não depende de nenhum processo rodando para os gráficos, o mapa e as recomendações.

O Assistente (busca livre em português, respondida com SQL real) é a única parte que depende de dois processos locais adicionais, por uma restrição de plataforma: o `vinext dev` roda os route handlers sob emulação de Cloudflare Workers (via Miniflare), que **não tem `child_process`** — por isso a rota não pode chamar o Python via shell como o `creche-otimizador/agent/server.py` original fazia. A solução foi expor a mesma lógica de `sql_tool.py` como um servidor HTTP local, chamado por `fetch` (compatível com Workers):

1. **`creche-otimizador/agent/sql_server.py`** (porta 8010) — DuckDB somente-leitura sobre `pipeline/build/*.parquet`, a mesma validação de `sql_tool.py` (só `SELECT`/`WITH`).
2. **`fila-viva/app/api/otimizador-chat/route.ts`** — chama a Claude API (`@anthropic-ai/sdk`, modelo `claude-opus-5`) com uma ferramenta `run_sql`; a cada chamada da ferramenta, faz `fetch` no servidor acima, devolve o resultado à Claude e repete até a resposta final. Extrai o bloco `` ```grafico ``` `` opcional e devolve `{ reply, sql_executado, grafico }`.

Pré-requisitos para o Assistente funcionar: `ANTHROPIC_API_KEY` em `fila-viva/.env`; um venv Python em `creche-otimizador/.venv` com `pip install -r requirements.txt`; o pipeline já executado (`python pipeline/run_all.py`) para existir `pipeline/build/*.parquet`; e o `sql_server.py` rodando. Sem isso, a aba mostra o aviso de status e as demais abas continuam funcionando normalmente.

### Contrato de entrada

O objeto `IntakeCase` contém versão de schema, identificadores demonstrativos, grupamento, turno e preferências ordenadas. O resumo da entrevista é explicitamente marcado como `self_declared_simulation`, `authoritative: false` e `validationStatus: pending`.

As respostas detalhadas, transcrição de voz, CEP, bairro informado e coordenadas não atravessam o handoff. A URL recebe somente o `intakeId`; o objeto temporário permanece em `sessionStorage` e desaparece ao encerrar a sessão.

Ao entrar no painel são aplicadas quatro restrições explícitas:

- não alterar ranking oficial;
- não iniciar oferta;
- exigir correspondência com a fila oficial;
- exigir revisão humana.

Um evento `application_received` registra a origem e as contagens sem gravar dados pessoais.

## 5. Como testar localmente

Pré-requisito: Node.js 22.13 ou superior.

```powershell
cd "C:\Users\Kadu\OneDrive\Desktop\Códigos\Desafio Edu\fila-viva"
npm install
npm run dev
```

Acesse `http://localhost:3000`.

Valide o fluxo completo:

1. **Localização:** informe dois CEPs ou bairros do Rio.
2. **Preferências:** selecione até cinco unidades, grupamento e turno.
3. **Entrevista:** responda aos 13 critérios históricos.
4. **Revisão:** confirme o aviso de ambiente local e avance.
5. **Operação:** confira o banner “Inscrição recebida — validação pendente”.
6. **Auditoria:** abra o evento `application_received`.

A rota `http://localhost:3000/operacao` continua disponível para abrir diretamente a demonstração operacional sem um caso de entrada. A partir dela, a aba **Otimização** mostra KPIs, gráficos, mapa e recomendações do `creche-otimizador` sem nenhum passo extra.

Para o Assistente da aba Otimização responder (opcional; as demais abas funcionam sem isso):

```powershell
cd "C:\Users\Kadu\OneDrive\Desktop\Códigos\Desafio Edu\creche-otimizador"
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python pipeline\run_all.py   # gera pipeline/build/*.parquet

cd agent
..\.venv\Scripts\python sql_server.py      # porta 8010, deixe rodando
```

Garanta `ANTHROPIC_API_KEY=...` em `fila-viva/.env` e reinicie `npm run dev` depois de criar/alterar esse arquivo.

Para reconstruir o snapshot após alterações em `dadoscreche`:

```powershell
npm run data:build
```

O mapa usa tiles do OpenStreetMap. Quando o CEP ou bairro não existe no snapshot local, a busca tenta o Nominatim como fallback; essa chamada externa deve ser substituída por serviço institucional antes de produção.

Use **Reiniciar estados simulados** para retornar ao cenário inicial. Recarregar a página também descarta as alterações, pois não há persistência.

## 6. Limites e gates para produção

Este MVP não deve receber dados pessoais reais. Antes de qualquer piloto conectado, ainda são necessários:

- validação formal da regra e dos desempates com a SME-Rio;
- aprovação da assinatura e dos ativos pela equipe de marca;
- arquivos licenciados da Cera Pro;
- definição de controlador, operadores, perfis e segregação de acesso;
- DPIA/RIPD, minimização, retenção, criptografia e trilha imutável;
- contratos de integração e idempotência com os sistemas fonte;
- endpoint servidor-servidor para substituir `sessionStorage` e vincular identidade de forma protegida;
- versão e hash aprovados do catálogo da regra vigente, sem reutilizar a régua de 2025 em 2026;
- tratamento institucional para geocodificação, mapas e reconhecimento de voz;
- política aprovada para uma oferta ativa e tratamento de exceções;
- testes de acessibilidade, segurança, carga e recuperação;
- piloto em modo shadow com critérios Scale/Adjust/Stop do dossiê.

## 7. Decisões preservadas

- IA pode apoiar explicações, sumarização de sinais e qualidade operacional; não decide elegibilidade nem posição.
- Ausência ou falha de integração nunca vira negativa automática.
- Resultado autodeclarado de 2025 nunca preenche a pontuação oficial de 2026.
- Preferência de unidade nunca é convertida diretamente em vaga ou oferta.
- Texto bruto de voz e respostas sensíveis não são enviados ao painel operacional.
- Planejamento territorial permanece agregado e não limita automaticamente as escolhas familiares.
- A aplicação evidencia sua natureza demonstrativa em todas as telas.
- Nenhuma publicação foi realizada nesta etapa; os metadados apontam para `localhost`.
