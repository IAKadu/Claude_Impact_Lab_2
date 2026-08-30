import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

// O fila-viva roda em dev sob emulação de Cloudflare Workers (vinext/Miniflare),
// que não tem child_process -- por isso a execução SQL não pode chamar o Python
// via shell aqui. Em vez disso, um companion HTTP local
// (creche-otimizador/agent/sql_server.py) expõe a mesma lógica de sql_tool.py
// via fetch, que funciona em Workers.
const SQL_SERVER_URL =
  process.env.OTIMIZADOR_SQL_SERVER_URL || 'http://127.0.0.1:8010';
const MAX_TURNS = 6;
const MODEL = 'claude-opus-5';

const SCHEMA_DESCRICAO = `
Você tem acesso a três tabelas somente-leitura em DuckDB (SQL padrão, dialeto DuckDB), via a ferramenta run_sql:

TABELA base -- uma linha por (unidade escolar, grupamento etário), processo 2025:
  esc_codigo INT, nome VARCHAR
  rede VARCHAR              -- 'parceira' ou 'publica'
  cre INT                   -- 1 a 11
  bairro VARCHAR, lat, lon DOUBLE
  grupamento VARCHAR         -- 'Bercario', 'Maternal I', 'Maternal II'
  fila_espera INT            -- crianças na fila de espera desse grupamento nessa unidade
  pontuacao_media DOUBLE, espera_mais_antiga TIMESTAMP  -- podem ser NULL se fila=0
  meta DOUBLE, matriculados DOUBLE   -- só preenchidos para rede='parceira'
  vagas_ociosas INT          -- só é um FATO real quando capacidade_conhecida=true; senão é 0 por convenção
  capacidade_conhecida BOOLEAN -- true só para unidades parceiras
  descompasso BOOLEAN, deficit INT   -- deficit = fila_espera - vagas_ociosas, truncado em 0
  alt_esc_codigo, alt_nome, alt_vagas_ociosas, alt_match -- unidade parceira alternativa mais
      próxima com vaga, só preenchido quando descompasso=true

TABELA convocacao -- uma linha por criança na fila de espera 2025:
  esc_codigo INT, grupamento VARCHAR, posicao_sugerida INT, aluno_anon VARCHAR
  pontuacao DOUBLE, data_criacao TIMESTAMP, horario VARCHAR, bairro_familia VARCHAR

TABELA historico -- série 2021-2025 agregada, nível cidade:
  ano INT, situacao VARCHAR, linhas INT, criancas INT

REGRAS:
- 'vagas_ociosas' e 'deficit' só são fatos confiáveis quando capacidade_conhecida=true (rede
  parceira). Para rede='publica', NUNCA diga "não tem vaga" ou "déficit de N" como certeza --
  diga que a capacidade dessa unidade pública não está nos dados.
- Os dados são anonimizados; não dá pra identificar uma criança ou família específica.
- 2025 é o processo mais recente na extração; 2026 não está nos dados.
`.trim();

const GRAFICO_INSTRUCOES = `
GRÁFICOS: quando a pergunta pedir ou se beneficiar de uma comparação entre várias linhas --
ranking entre unidades/CREs/bairros, distribuição por categoria, ou evolução ao longo dos anos --
inclua, além da frase de resposta, UM bloco de gráfico neste formato exato (é a única exceção à
regra de "sem markdown"):

\`\`\`grafico
{"tipo": "barra", "titulo": "Fila de espera por CRE", "labels": ["CRE 7", "CRE 4", "CRE 10"], "series": [{"nome": "Fila de espera", "valores": [8234, 1785, 1236]}]}
\`\`\`

Regras do bloco:
- \`tipo\` é "barra", "linha" ou "pizza" ("linha" só para série temporal por ano; "pizza" só para
  poucas categorias, no máximo 6; "barra" no caso geral).
- \`labels\` e cada \`valores\` têm o MESMO tamanho, na mesma ordem.
- Os números em \`valores\` são exatamente os que vieram da consulta -- não arredonde, não invente.
- No máximo 15 categorias em \`labels\`.
- Pergunta que já é resposta de um número só NÃO precisa de gráfico.
- No máximo um bloco de gráfico por resposta.
`.trim();

const SYSTEM_PROMPT = `Você é o assistente analítico do painel Otimizador de Alocação e \
Convocação de vagas de creche da SME/RJ, usado por gestores de CRE dentro do Fila Viva. Responda \
em português do Brasil, direto e institucional, em texto puro (sem markdown -- sem asteriscos, \
sem cabeçalhos, sem listas com marcadores) -- exceto o bloco de gráfico descrito abaixo, quando \
aplicável.

${SCHEMA_DESCRICAO}

Para responder, use a ferramenta run_sql com uma consulta SELECT ou WITH (dialeto DuckDB). NUNCA \
responda um número que você não tenha acabado de consultar dessa forma. Se a primeira consulta \
der erro, ajuste o SQL e tente de novo. Se a pergunta não tiver resposta nos dados disponíveis, \
diga isso claramente em vez de estimar. Depois de ver o resultado, escreva uma resposta curta \
(poucas frases) -- não devolva a tabela bruta, sintetize.

${GRAFICO_INSTRUCOES}`;

const tools: Anthropic.Tool[] = [
  {
    name: 'run_sql',
    description:
      'Executa uma consulta SELECT ou WITH somente-leitura em DuckDB contra as tabelas base, ' +
      'convocacao e historico do pipeline do Otimizador de Alocação. Retorna até 200 linhas em JSON.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Consulta SQL SELECT ou WITH (dialeto DuckDB).',
        },
      },
      required: ['query'],
    },
  },
];

type Grafico = {
  tipo: 'barra' | 'linha' | 'pizza';
  titulo?: string;
  labels: string[];
  series: { nome?: string; valores: number[] }[];
};

const GRAFICO_RE = /```grafico\s*(\{[\s\S]*?\})\s*```/;
const TIPOS_VALIDOS = new Set(['barra', 'linha', 'pizza']);

function extrairGrafico(texto: string): { texto: string; grafico: Grafico | null } {
  const match = GRAFICO_RE.exec(texto);
  if (!match) return { texto, grafico: null };

  const limpo = (
    texto.slice(0, match.index) + texto.slice(match.index + match[0].length)
  )
    .trim()
    .replace(/\n{3,}/g, '\n\n');

  let spec: unknown;
  try {
    spec = JSON.parse(match[1]);
  } catch {
    return { texto: limpo, grafico: null };
  }

  if (!spec || typeof spec !== 'object') return { texto: limpo, grafico: null };
  const candidate = spec as Partial<Grafico>;
  const valido =
    TIPOS_VALIDOS.has(candidate.tipo as string) &&
    Array.isArray(candidate.labels) &&
    candidate.labels.length > 0 &&
    Array.isArray(candidate.series) &&
    candidate.series.length > 0 &&
    candidate.series.every(
      (serie) =>
        serie &&
        typeof serie === 'object' &&
        Array.isArray(serie.valores) &&
        serie.valores.length === candidate.labels!.length,
    );

  return { texto: limpo, grafico: valido ? (candidate as Grafico) : null };
}

async function runSql(query: string): Promise<unknown> {
  const response = await fetch(`${SQL_SERVER_URL}/run_sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return response.json();
}

export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({
      ok: false,
      detalhe:
        'ANTHROPIC_API_KEY não configurada no servidor do fila-viva (arquivo .env). Reinicie ' +
        '"npm run dev" depois de configurar.',
    });
  }
  try {
    const response = await fetch(`${SQL_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch {
    return Response.json({
      ok: false,
      detalhe:
        `Não consegui falar com o servidor SQL do otimizador em ${SQL_SERVER_URL}. Rode ` +
        '"cd creche-otimizador/agent && ../.venv/Scripts/python.exe sql_server.py" numa outra ' +
        'janela de terminal.',
    });
  }
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { erro: 'ANTHROPIC_API_KEY não configurada no servidor.' },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    message?: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
  } | null;
  const pergunta = body?.message?.trim();
  if (!pergunta) {
    return Response.json({ erro: 'Mensagem vazia.' }, { status: 400 });
  }
  const historico = Array.isArray(body?.history) ? body.history : [];

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: Anthropic.MessageParam[] = [
    ...historico.map((item) => ({
      role: (item.role === 'assistant' ? 'assistant' : 'user') as
        | 'assistant'
        | 'user',
      content: String(item.content ?? ''),
    })),
    { role: 'user', content: pergunta },
  ];

  const sqlsExecutados: string[] = [];
  let finalText = '';

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });

      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );
      finalText = textBlocks.map((block) => block.text).join('\n');

      if (response.stop_reason !== 'tool_use') break;

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const query = String(
          (toolUse.input as { query?: string })?.query ?? '',
        );
        sqlsExecutados.push(query);
        let result: unknown;
        let isError = false;
        try {
          result = await runSql(query);
        } catch (error) {
          isError = true;
          result = {
            erro: error instanceof Error ? error.message : String(error),
          };
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
          is_error: isError,
        });
      }
      messages.push({ role: 'user', content: toolResults });
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Falha desconhecida.';
    return Response.json(
      {
        erro: `Erro ao chamar a Claude API: ${detail}`,
        sql_executado: sqlsExecutados,
      },
      { status: 502 },
    );
  }

  const { texto, grafico } = extrairGrafico(
    finalText || 'Não consegui gerar uma resposta.',
  );
  return Response.json({
    reply: texto,
    sql_executado: sqlsExecutados,
    grafico,
  });
}
