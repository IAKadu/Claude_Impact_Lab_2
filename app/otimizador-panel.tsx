'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Sector,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Building2,
  Info,
  MapPinned,
  MessageCircle,
  Search,
  Send,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { OtimizadorUnit } from './otimizador-map';

const OtimizadorMap = dynamic(() => import('./otimizador-map'), {
  ssr: false,
  loading: () => (
    <div className="grid h-[560px] place-items-center bg-[#eceded] text-sm text-muted-foreground">
      Preparando o mapa das unidades…
    </div>
  ),
});

const CORES = {
  azul: '#2563eb',
  ceu: '#42b9eb',
  verde: '#0f9960',
  vermelho: '#dc2626',
};

type Kpi = {
  ano_referencia: number;
  total_fila_espera: number;
  total_vagas_ociosas_parceiras: number;
  criancas_fila_deficit_confirmado_parceiras: number;
  criancas_fila_capacidade_publica_desconhecida: number;
  unidades_em_descompasso: number;
  creches_cobertas: number;
};

type CreResumo = {
  cre: number;
  fila_espera: number;
  vagas_ociosas: number;
  deficit: number;
  unidades_em_descompasso: number;
  unidades: number;
};

type HistoricoRow = {
  ano: number;
  situacao: string;
  linhas: number;
  criancas: number;
};

type UnidadeRow = {
  esc_codigo: number;
  nome: string;
  rede: 'parceira' | 'publica';
  cre: number;
  bairro: string | null;
  lat: number | null;
  lon: number | null;
  coord_aproximada: boolean;
  grupamento: string;
  fila_espera: number;
  vagas_ociosas: number;
  capacidade_conhecida: boolean;
  descompasso: boolean;
  deficit: number;
};

type VagaOciosaRow = {
  esc_codigo: number;
  nome: string;
  cre: number;
  bairro: string | null;
  grupamento: string;
  vagas_ociosas: number;
};

type Recomendacao = {
  esc_codigo: number;
  nome: string;
  cre: number;
  bairro: string | null;
  grupamento: string;
  fila_espera: number;
  vagas_ociosas_local: number;
  deficit: number;
  capacidade_conhecida: boolean;
  alternativa: {
    esc_codigo: number;
    nome: string;
    vagas_ociosas: number;
    match: 'bairro' | 'cre';
  } | null;
};

type Narrativas = {
  fonte: 'template' | 'claude';
  resumo_executivo: string;
  por_recomendacao: Record<string, string>;
};

type OtimizadorData = {
  kpi: Kpi;
  cres: CreResumo[];
  unidades: UnidadeRow[];
  ociosas: VagaOciosaRow[];
  historico: HistoricoRow[];
  narrativas: Narrativas;
  recomendacoes: Recomendacao[];
};

type ChatGrafico = {
  tipo: 'barra' | 'linha' | 'pizza';
  titulo?: string;
  labels: string[];
  series: { nome?: string; valores: number[] }[];
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  grafico?: ChatGrafico | null;
  sql?: string[];
  error?: boolean;
};

const PALETA_GRAFICO = [
  '#13335a',
  '#2a688f',
  '#42b9eb',
  '#b7791f',
  '#1f8a4c',
  '#c0392b',
];

const SUGESTOES = [
  'Quais 5 unidades têm o maior déficit confirmado (rede parceira)?',
  'Quantas crianças estão na fila de espera na CRE 7?',
  'Quais unidades parceiras têm vaga ociosa e nenhuma fila por perto?',
  'Qual o total de vagas ociosas por CRE?',
];

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR').format(n);
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function truncate(value: string, max: number) {
  if (!value || value.length <= max) return value || '';
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function classifyStatus(
  descompasso: boolean,
  capacidadeConhecida: boolean,
): OtimizadorUnit['status'] {
  if (!descompasso) return 'ok';
  return capacidadeConhecida ? 'deficit' : 'desconhecida';
}

function aggregateUnits(rows: UnidadeRow[]): (OtimizadorUnit & {
  rede: string;
})[] {
  const byUnit = new Map<number, OtimizadorUnit & { rede: string }>();
  for (const row of rows) {
    if (row.lat == null || row.lon == null) continue;
    if (!byUnit.has(row.esc_codigo)) {
      byUnit.set(row.esc_codigo, {
        esc_codigo: row.esc_codigo,
        nome: row.nome,
        rede: row.rede,
        cre: row.cre,
        bairro: row.bairro,
        lat: row.lat,
        lon: row.lon,
        coord_aproximada: row.coord_aproximada,
        capacidade_conhecida: row.capacidade_conhecida,
        fila_espera: 0,
        vagas_ociosas: 0,
        descompasso: false,
        status: 'ok',
      });
    }
    const aggregate = byUnit.get(row.esc_codigo)!;
    aggregate.fila_espera += row.fila_espera;
    if (row.capacidade_conhecida) aggregate.vagas_ociosas += row.vagas_ociosas;
    if (row.descompasso) aggregate.descompasso = true;
  }
  for (const unit of byUnit.values()) {
    unit.status = classifyStatus(unit.descompasso, unit.capacidade_conhecida);
  }
  return [...byUnit.values()];
}

const creChartConfig: ChartConfig = {
  fila_espera: { label: 'Fila de espera', color: CORES.azul },
  vagas_ociosas: { label: 'Vagas ociosas (parceiras)', color: CORES.ceu },
};

const historicoColors: Record<string, string> = {
  'Lista de espera': CORES.vermelho,
  Confirmado: CORES.verde,
  'Selecionado da lista': '#2a688f',
  Selecionado: '#b7791f',
};

const ociosasChartConfig: ChartConfig = {
  vagas_ociosas: { label: 'Vagas ociosas', color: CORES.azul },
};

function KpiCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        'border-t-[3px] border-[#42b9eb] bg-white p-4 shadow-sm ring-1 ring-foreground/10',
        warn && 'border-[#c0392b]',
      )}
    >
      <strong
        className={cn(
          'brand-heading block text-2xl',
          warn ? 'text-[#c0392b]' : 'text-[#13335a]',
        )}
      >
        {fmt(value)}
      </strong>
      <span className="mt-1 block text-xs leading-snug text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function VisaoGeral({ data }: { data: OtimizadorData }) {
  const anos = useMemo(
    () =>
      [...new Set(data.historico.map((row) => row.ano))].sort((a, b) => a - b),
    [data.historico],
  );
  const situacoesRelevantes = [
    'Lista de espera',
    'Confirmado',
    'Selecionado da lista',
    'Selecionado',
  ];
  const situacoesPresentes = situacoesRelevantes.filter((situacao) =>
    data.historico.some((row) => row.situacao === situacao),
  );
  const historicoChartConfig: ChartConfig = Object.fromEntries(
    situacoesPresentes.map((situacao) => [
      situacao,
      { label: situacao, color: historicoColors[situacao] },
    ]),
  );
  const historicoRows = anos.map((ano) => {
    const row: Record<string, number> = { ano };
    for (const situacao of situacoesPresentes) {
      const match = data.historico.find(
        (item) => item.ano === ano && item.situacao === situacao,
      );
      row[situacao] = match?.criancas ?? 0;
    }
    return row;
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Crianças na fila de espera (2025)"
          value={data.kpi.total_fila_espera}
        />
        <KpiCard
          label="Vagas ociosas em unidades parceiras"
          value={data.kpi.total_vagas_ociosas_parceiras}
        />
        <KpiCard
          label="Déficit confirmado (parceiras)"
          value={data.kpi.criancas_fila_deficit_confirmado_parceiras}
          warn
        />
        <KpiCard
          label="Fila em públicas sem dado de capacidade"
          value={data.kpi.criancas_fila_capacidade_publica_desconhecida}
        />
        <KpiCard
          label="Unidades em descompasso"
          value={data.kpi.unidades_em_descompasso}
        />
        <KpiCard
          label="Unidades × grupamento cobertos"
          value={data.kpi.creches_cobertas}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Resumo executivo</CardTitle>
            <Badge
              variant="secondary"
              className={cn(
                data.narrativas.fonte === 'claude' &&
                  'bg-[#e4f4fc] text-[#2a688f]',
              )}
            >
              {data.narrativas.fonte === 'claude'
                ? 'gerado pela Claude'
                : 'template (sem chamada à API)'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">
            {data.narrativas.resumo_executivo}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Fila de espera vs. confirmados por ano (2021–2025)
          </CardTitle>
          <CardDescription>
            Dado bruto de inscrições, sem normalizar a régua de pontuação
            entre anos — serve para ver a dinâmica da fila, não para comparar
            classificação entre processos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={historicoChartConfig} className="max-h-72 w-full">
            <LineChart data={historicoRows}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="ano" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {situacoesPresentes.map((situacao) => (
                <Line
                  key={situacao}
                  type="monotone"
                  dataKey={situacao}
                  stroke={historicoColors[situacao]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function Recomendacoes({ data }: { data: OtimizadorData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Onde agir primeiro</CardTitle>
        <CardDescription>
          Ordenado com prioridade para <strong>déficit confirmado</strong>{' '}
          (unidades parceiras, capacidade real conhecida) sobre{' '}
          <strong>capacidade pública desconhecida</strong> (a extração não
          traz a meta das unidades públicas — tratar como pendência de
          checagem, não como certeza).
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[640px] space-y-3 overflow-y-auto">
        {data.recomendacoes.map((rec) => {
          const key = `${rec.esc_codigo}_${rec.grupamento}`;
          const texto = data.narrativas.por_recomendacao[key] || '';
          return (
            <div
              key={key}
              className={cn(
                'border-l-4 bg-white p-4 shadow-sm ring-1 ring-foreground/10',
                rec.capacidade_conhecida
                  ? 'border-l-[#c0392b]'
                  : 'border-l-[#b7791f]',
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className="text-sm text-[#13335a]">{rec.nome}</strong>
                <span className="text-xs text-muted-foreground">
                  CRE {rec.cre} · {rec.bairro || 'bairro n/d'} ·{' '}
                  {rec.grupamento}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Fila: {fmt(rec.fila_espera)} · Vaga local:{' '}
                  {fmt(rec.vagas_ociosas_local)}
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    rec.capacidade_conhecida
                      ? 'bg-[#fdecea] text-[#c0392b]'
                      : 'bg-[#fdf3e0] text-[#b7791f]',
                  )}
                >
                  {rec.capacidade_conhecida
                    ? 'Déficit confirmado'
                    : 'Capacidade pública desconhecida'}
                </Badge>
              </div>
              {texto && (
                <p className="mt-2 text-sm leading-relaxed">{texto}</p>
              )}
              {rec.alternativa ? (
                <div className="mt-2 rounded-md bg-[#e8f6ee] px-3 py-2 text-xs text-[#1f6b3d]">
                  Alternativa mais próxima:{' '}
                  <strong>{rec.alternativa.nome}</strong> —{' '}
                  {rec.alternativa.vagas_ociosas} vaga(s) ociosa(s) (mesmo{' '}
                  {rec.alternativa.match === 'bairro' ? 'bairro' : 'CRE'}).
                </div>
              ) : (
                <div className="mt-2 rounded-md bg-[#eceded] px-3 py-2 text-xs text-muted-foreground">
                  Nenhuma unidade parceira próxima com vaga ociosa nos dados —
                  candidata a abertura de vaga nova.
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PorCre({ data }: { data: OtimizadorData }) {
  const rows = useMemo(
    () => [...data.cres].sort((a, b) => b.deficit - a.deficit),
    [data.cres],
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo por CRE</CardTitle>
        <CardDescription>
          Fila de espera e vaga ociosa (rede parceira, capacidade conhecida)
          por CRE, ordenado pelo maior número de crianças sem vaga local.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={creChartConfig} className="max-h-96 w-full">
          <BarChart data={rows.map((row) => ({ ...row, label: `CRE ${row.cre}` }))}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={48} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as CreResumo | undefined;
                    return row
                      ? `CRE ${row.cre} · ${fmt(row.unidades)} unidades · ${fmt(row.unidades_em_descompasso)} em descompasso`
                      : '';
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="fila_espera" fill={CORES.azul} radius={4} />
            <Bar dataKey="vagas_ociosas" fill={CORES.ceu} radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function Unidades({ data }: { data: OtimizadorData }) {
  const [busca, setBusca] = useState('');
  const [cre, setCre] = useState('');
  const [rede, setRede] = useState('');
  const [soDescompasso, setSoDescompasso] = useState(false);

  const cres = useMemo(
    () => [...new Set(data.unidades.map((u) => u.cre))].sort((a, b) => a - b),
    [data.unidades],
  );

  const units = useMemo(() => {
    const buscaNormalizada = normalize(busca.trim());
    const comSinal = data.unidades.filter(
      (u) => u.fila_espera > 0 || u.vagas_ociosas > 0,
    );
    const filtered = comSinal.filter((u) => {
      if (
        buscaNormalizada &&
        !normalize(`${u.nome} ${u.bairro || ''}`).includes(buscaNormalizada)
      )
        return false;
      if (cre && String(u.cre) !== cre) return false;
      if (rede && u.rede !== rede) return false;
      if (soDescompasso && !u.descompasso) return false;
      return true;
    });
    return aggregateUnits(filtered);
  }, [data.unidades, busca, cre, rede, soDescompasso]);

  const totalComSinal = useMemo(
    () =>
      new Set(
        data.unidades
          .filter((u) => u.fila_espera > 0 || u.vagas_ociosas > 0)
          .map((u) => u.esc_codigo),
      ).size,
    [data.unidades],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa das unidades</CardTitle>
        <CardDescription>
          Cada círculo é uma unidade (grupamentos somados) — o tamanho cresce
          com o tamanho da fila de espera. Clique num círculo para ver os
          números da unidade.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome ou bairro…"
              className="h-9 pl-8"
            />
          </div>
          <NativeSelect
            value={cre}
            onChange={(event) => setCre(event.target.value)}
            aria-label="Filtrar por CRE"
          >
            <NativeSelectOption value="">Todas as CREs</NativeSelectOption>
            {cres.map((value) => (
              <NativeSelectOption key={value} value={String(value)}>
                CRE {value}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            value={rede}
            onChange={(event) => setRede(event.target.value)}
            aria-label="Filtrar por rede"
          >
            <NativeSelectOption value="">Pública + parceira</NativeSelectOption>
            <NativeSelectOption value="publica">Só pública</NativeSelectOption>
            <NativeSelectOption value="parceira">
              Só parceira
            </NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            value={soDescompasso ? '1' : ''}
            onChange={(event) => setSoDescompasso(event.target.value === '1')}
            aria-label="Filtrar por descompasso"
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            <NativeSelectOption value="1">
              Só em descompasso
            </NativeSelectOption>
          </NativeSelect>
        </div>

        {units.length > 0 ? (
          <OtimizadorMap units={units} />
        ) : (
          <div className="grid h-[200px] place-items-center bg-[#eceded] text-sm text-muted-foreground">
            Nenhuma unidade encontrada com esses filtros.
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <i
              className="inline-block size-2.5 rounded-full"
              style={{ background: CORES.verde }}
            />
            Sem descompasso
          </span>
          <span className="flex items-center gap-1.5">
            <i
              className="inline-block size-2.5 rounded-full"
              style={{ background: CORES.vermelho }}
            />
            Déficit confirmado (parceira)
          </span>
          <span className="flex items-center gap-1.5">
            <i
              className="inline-block size-2.5 rounded-full border border-dashed border-current"
              style={{ background: CORES.azul }}
            />
            Capacidade pública desconhecida
          </span>
          <span className="flex items-center gap-1.5">
            <i
              className="inline-block size-2.5 rounded-full opacity-55"
              style={{ background: '#9aa3ad' }}
            />
            Localização aproximada (centro do bairro)
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          {fmt(units.length)} unidades no mapa (grupamentos somados por
          unidade), de {fmt(totalComSinal)} com fila e/ou vaga no total.
        </p>
      </CardContent>
    </Card>
  );
}

function VagaOciosa({ data }: { data: OtimizadorData }) {
  const rows = useMemo(
    () =>
      [...data.ociosas]
        .sort((a, b) => b.vagas_ociosas - a.vagas_ociosas)
        .map((row) => ({ ...row, label: truncate(row.nome, 34) })),
    [data.ociosas],
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vaga ociosa sem fila nas proximidades</CardTitle>
        <CardDescription>
          Unidades parceiras com vaga sobrando e nenhuma criança na fila de
          espera do próprio grupamento — candidatas a divulgação ativa,
          remanejamento ou revisão de meta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={ociosasChartConfig}
          className="w-full"
          style={{ height: Math.max(320, rows.length * 28 + 40) }}
        >
          <BarChart data={rows} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={160}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as
                      | VagaOciosaRow
                      | undefined;
                    return row ? row.nome : '';
                  }}
                  formatter={(value, _name, item) => {
                    const row = item?.payload as VagaOciosaRow | undefined;
                    return [
                      `${fmt(Number(value))} vagas ociosas`,
                      row
                        ? ` · CRE ${row.cre} · ${row.bairro || 'bairro n/d'} · ${row.grupamento}`
                        : '',
                    ];
                  }}
                />
              }
            />
            <Bar dataKey="vagas_ociosas" fill={CORES.azul} radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function ChatChart({ grafico }: { grafico: ChatGrafico }) {
  const data = grafico.labels.map((label, index) => {
    const row: Record<string, string | number> = { label };
    grafico.series.forEach((serie, serieIndex) => {
      row[serie.nome || `Série ${serieIndex + 1}`] = serie.valores[index] ?? 0;
    });
    return row;
  });
  const config: ChartConfig = Object.fromEntries(
    grafico.series.map((serie, index) => [
      serie.nome || `Série ${index + 1}`,
      {
        label: serie.nome || `Série ${index + 1}`,
        color: PALETA_GRAFICO[index % PALETA_GRAFICO.length],
      },
    ]),
  );

  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-3 shadow-sm">
      {grafico.titulo && (
        <p className="mb-2 text-xs font-semibold text-[#13335a]">
          {grafico.titulo}
        </p>
      )}
      <ChartContainer config={config} className="max-h-64 w-full">
        {grafico.tipo === 'pizza' ? (
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={grafico.labels.map((label, index) => ({
                label,
                value: grafico.series[0]?.valores[index] ?? 0,
              }))}
              dataKey="value"
              nameKey="label"
              outerRadius={80}
              shape={(props, index) => (
                <Sector
                  {...props}
                  fill={PALETA_GRAFICO[index % PALETA_GRAFICO.length]}
                />
              )}
            />
            <ChartLegend content={<ChartLegendContent nameKey="label" />} />
          </PieChart>
        ) : grafico.tipo === 'linha' ? (
          <LineChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {grafico.series.length > 1 && (
              <ChartLegend content={<ChartLegendContent />} />
            )}
            {grafico.series.map((serie, index) => (
              <Line
                key={serie.nome || index}
                type="monotone"
                dataKey={serie.nome || `Série ${index + 1}`}
                stroke={PALETA_GRAFICO[index % PALETA_GRAFICO.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {grafico.series.length > 1 && (
              <ChartLegend content={<ChartLegendContent />} />
            )}
            {grafico.series.map((serie, index) => (
              <Bar
                key={serie.nome || index}
                dataKey={serie.nome || `Série ${index + 1}`}
                fill={PALETA_GRAFICO[index % PALETA_GRAFICO.length]}
                radius={4}
              />
            ))}
          </BarChart>
        )}
      </ChartContainer>
    </div>
  );
}

function Assistente() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{
    text: string;
    warn: boolean;
  } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/otimizador-chat')
      .then(
        (response) =>
          response.json() as Promise<{ ok: boolean; detalhe?: string }>,
      )
      .then((body) => {
        setStatus(
          body.ok
            ? { text: 'Agente pronto — respondendo via Claude API.', warn: false }
            : {
                text:
                  body.detalhe ||
                  'Agente indisponível no momento. Verifique a configuração do servidor.',
                warn: true,
              },
        );
      })
      .catch(() =>
        setStatus({
          text: 'Não consegui falar com o backend do agente.',
          warn: true,
        }),
      );
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || sending) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setInput('');
    setSending(true);
    try {
      const response = await fetch('/api/otimizador-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, history }),
      });
      const body = (await response.json()) as {
        erro?: string;
        reply: string;
        grafico?: ChatGrafico | null;
        sql_executado?: string[];
      };
      if (!response.ok) {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: body.erro || 'Falha desconhecida.',
            error: true,
          },
        ]);
        return;
      }
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: body.reply,
          grafico: body.grafico,
          sql: body.sql_executado,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: `Erro de conexão com o agente: ${error instanceof Error ? error.message : 'desconhecido'}`,
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-4 text-primary" />
          Assistente analítico
        </CardTitle>
        <CardDescription>
          Pergunte em português sobre a fila, as vagas ou as unidades. O
          assistente escreve a consulta SQL, roda contra os dados do pipeline
          e responde só com números reais — nunca inventa unidade, bairro ou
          quantidade. Perguntas comparativas também vêm com um gráfico
          renderizado na hora.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status && (
          <div
            className={cn(
              'rounded-md px-3 py-2 text-xs',
              status.warn
                ? 'bg-[#fdf3e0] text-[#b7791f]'
                : 'bg-[#eceded] text-muted-foreground',
            )}
          >
            {status.text}
          </div>
        )}
        <div
          ref={logRef}
          className="flex max-h-[420px] min-h-[180px] flex-col gap-3 overflow-y-auto rounded-md border p-3"
        >
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhuma pergunta ainda — use uma sugestão abaixo ou digite a
              sua.
            </p>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex flex-col gap-2',
                message.role === 'user' ? 'items-end' : 'items-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[92%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'rounded-br-sm bg-[#13335a] text-white'
                    : message.error
                      ? 'rounded-bl-sm bg-[#fdecea] text-[#c0392b]'
                      : 'rounded-bl-sm bg-[#eceded] text-foreground',
                )}
              >
                {message.content}
              </div>
              {message.grafico && <ChatChart grafico={message.grafico} />}
              {message.sql && message.sql.length > 0 && (
                <details className="max-w-full text-xs text-muted-foreground">
                  <summary className="cursor-pointer">
                    {message.sql.length} consulta(s) SQL executada(s)
                  </summary>
                  {message.sql.map((sql, sqlIndex) => (
                    <pre
                      key={sqlIndex}
                      className="mt-1.5 overflow-x-auto rounded-md bg-[#13335a] p-2.5 text-[11px] text-[#d6e8f7]"
                    >
                      {sql}
                    </pre>
                  ))}
                </details>
              )}
            </div>
          ))}
          {sending && (
            <div className="max-w-[92%] rounded-xl rounded-bl-sm bg-[#eceded] px-3.5 py-2.5 text-sm text-muted-foreground">
              Pensando…
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGESTOES.map((sugestao) => (
            <button
              key={sugestao}
              type="button"
              className="rounded-full border bg-white px-3 py-1.5 text-xs hover:border-[#42b9eb] hover:text-[#2a688f]"
              onClick={() => void send(sugestao)}
            >
              {sugestao}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ex.: quais 5 unidades da CRE 3 têm mais crianças na fila?"
            className="h-10"
          />
          <Button type="submit" disabled={sending || !input.trim()}>
            <Send /> Perguntar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function OtimizadorPanel() {
  const [data, setData] = useState<OtimizadorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('visao-geral');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch('/data/otimizador/kpi.json').then((r) => r.json() as Promise<Kpi>),
      fetch('/data/otimizador/cre_resumo.json').then(
        (r) => r.json() as Promise<CreResumo[]>,
      ),
      fetch('/data/otimizador/unidades.json').then(
        (r) => r.json() as Promise<UnidadeRow[]>,
      ),
      fetch('/data/otimizador/vagas_sem_fila.json').then(
        (r) => r.json() as Promise<VagaOciosaRow[]>,
      ),
      fetch('/data/otimizador/historico_anual.json').then(
        (r) => r.json() as Promise<HistoricoRow[]>,
      ),
      fetch('/data/otimizador/narrativas.json').then(
        (r) => r.json() as Promise<Narrativas>,
      ),
      fetch('/data/otimizador/top_recomendacoes.json').then(
        (r) => r.json() as Promise<Recomendacao[]>,
      ),
    ])
      .then(
        ([
          kpi,
          cres,
          unidades,
          ociosas,
          historico,
          narrativas,
          recomendacoes,
        ]) => {
          if (!mounted) return;
          setData({
            kpi,
            cres,
            unidades,
            ociosas,
            historico,
            narrativas,
            recomendacoes,
          });
        },
      )
      .catch(() => {
        if (!mounted) return;
        setError(
          'Não foi possível carregar os dados do otimizador. Rode o pipeline (creche-otimizador/pipeline/run_all.py) antes de abrir esta aba.',
        );
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[#f0c9c9] bg-[#fdecea] p-4 text-sm text-[#c0392b]">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid h-64 place-items-center text-sm text-muted-foreground">
        Carregando dados do otimizador…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-[#b8dff0] bg-[#eaf7fc] p-4 text-sm text-[#13335a]">
        <MapPinned className="mt-0.5 size-4 shrink-0 text-[#2a688f]" />
        <p>
          <strong>Otimizador de Alocação e Convocação:</strong> cruza a vaga
          ociosa reportada pelas unidades parceiras com a fila de espera do
          processo de inscrição para recomendar onde abrir vaga, para onde
          redirecionar famílias e em que ordem convocar. Dados anonimizados
          2021–2025, SME/RJ. Painel de decisão de capacidade entre unidades —
          não altera a fila oficial do Fila Viva.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="recomendacoes">
            Recomendações prioritárias
          </TabsTrigger>
          <TabsTrigger value="cres">Por CRE</TabsTrigger>
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
          <TabsTrigger value="ociosas">Vaga ociosa sem fila</TabsTrigger>
          <TabsTrigger value="assistente">
            <Sparkles className="size-3.5" /> Assistente
          </TabsTrigger>
        </TabsList>
        <TabsContent value="visao-geral">
          <VisaoGeral data={data} />
        </TabsContent>
        <TabsContent value="recomendacoes">
          <Recomendacoes data={data} />
        </TabsContent>
        <TabsContent value="cres">
          <PorCre data={data} />
        </TabsContent>
        <TabsContent value="unidades">
          <Unidades data={data} />
        </TabsContent>
        <TabsContent value="ociosas">
          <VagaOciosa data={data} />
        </TabsContent>
        <TabsContent value="assistente">
          <Assistente />
        </TabsContent>
      </Tabs>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Building2 className="size-3.5" />
        Fonte: CIT-SME-RJ · dados anonimizados 2021–2025 — indicadores não
        representam a realidade operacional exata da rede.
      </p>
    </div>
  );
}
