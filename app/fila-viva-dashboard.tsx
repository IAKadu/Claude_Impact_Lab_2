'use client';
/* oxlint-disable next/no-img-element */

import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  Download,
  FileCheck2,
  Gauge,
  History,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Map as MapIcon,
  MapPinned,
  MessageCircle,
  PhoneCall,
  RefreshCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
  Users,
  Waypoints,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { IntakeCase } from '@/lib/intake-contract';
import { cn } from '@/lib/utils';
import { OtimizadorPanel } from './otimizador-panel';

type Section = 'operacao' | 'territorio' | 'auditoria' | 'otimizacao';
type OfferStage = 'ready' | 'contacting' | 'notified' | 'accepted' | 'enrolled';
type ContactChannel = 'whatsapp' | 'phone' | 'email';

type Vacancy = {
  id: string;
  unit: string;
  cre: string;
  group: string;
  shift: string;
  microarea: string;
  ageHours: number;
  needsAction: number;
  activeOffers: number;
  enrollmentRate: number;
  invalidContacts: number;
  eligibleCandidate: string;
};

type Candidate = {
  position: number;
  id: string;
  score: number;
  preference: string;
  criteria: string;
  status: 'eligible' | 'validate' | 'locked' | 'queue';
  contact: string;
};

type Territory = {
  id: string;
  cre: string;
  pressure: number;
  waiting: number;
  seats: number;
  medianDays: number;
  trend: number;
  units: number;
  freshness: string;
};

type AuditEvent = {
  id: string;
  type: string;
  label: string;
  object: string;
  actor: string;
  timestamp: string;
  proof: string;
  integrity: string;
};

const vacancies: Vacancy[] = [
  {
    id: 'VG-2026-0187',
    unit: 'CMEI Caminhos do Sol',
    cre: '4ª CRE',
    group: 'Maternal I',
    shift: 'Integral',
    microarea: '4.3',
    ageHours: 19,
    needsAction: 7,
    activeOffers: 16,
    enrollmentRate: 81,
    invalidContacts: 9,
    eligibleCandidate: 'CRI-02481',
  },
  {
    id: 'VG-2026-0214',
    unit: 'EDI Sementes do Amanhã',
    cre: '4ª CRE',
    group: 'Maternal II',
    shift: 'Manhã',
    microarea: '4.8',
    ageHours: 31,
    needsAction: 6,
    activeOffers: 14,
    enrollmentRate: 76,
    invalidContacts: 11,
    eligibleCandidate: 'CRI-05206',
  },
  {
    id: 'VG-2026-0231',
    unit: 'Creche Municipal Maré Serena',
    cre: '6ª CRE',
    group: 'Berçário',
    shift: 'Integral',
    microarea: '6.2',
    ageHours: 52,
    needsAction: 5,
    activeOffers: 13,
    enrollmentRate: 72,
    invalidContacts: 7,
    eligibleCandidate: 'CRI-06144',
  },
];

const candidatesByVacancy: Record<string, Candidate[]> = {
  'VG-2026-0187': [
    {
      position: 1,
      id: 'CRI-02481',
      score: 61,
      preference: '1ª escolha',
      criteria: 'Critérios B1 · P2 confirmados',
      status: 'eligible',
      contact: 'validado há 12 dias',
    },
    {
      position: 2,
      id: 'CRI-01832',
      score: 56,
      preference: '2ª escolha',
      criteria: 'Critérios B1 · F1 confirmados',
      status: 'validate',
      contact: 'reconfirmação pendente',
    },
    {
      position: 3,
      id: 'CRI-04109',
      score: 53,
      preference: '1ª escolha',
      criteria: 'Critério B1 confirmado',
      status: 'locked',
      contact: 'em outra oferta ativa',
    },
    {
      position: 4,
      id: 'CRI-03617',
      score: 25,
      preference: '3ª escolha',
      criteria: 'Critério E2 confirmado',
      status: 'queue',
      contact: 'validado há 7 dias',
    },
  ],
  'VG-2026-0214': [
    {
      position: 1,
      id: 'CRI-05206',
      score: 58,
      preference: '2ª escolha',
      criteria: 'Critérios B1 · F1 confirmados',
      status: 'eligible',
      contact: 'validado há 5 dias',
    },
    {
      position: 2,
      id: 'CRI-04420',
      score: 54,
      preference: '1ª escolha',
      criteria: 'Critério B1 confirmado',
      status: 'validate',
      contact: 'reconfirmação pendente',
    },
    {
      position: 3,
      id: 'CRI-07018',
      score: 49,
      preference: '4ª escolha',
      criteria: 'Critério P2 confirmado',
      status: 'queue',
      contact: 'validado há 9 dias',
    },
  ],
  'VG-2026-0231': [
    {
      position: 1,
      id: 'CRI-06144',
      score: 64,
      preference: '1ª escolha',
      criteria: 'Critérios B1 · E2 confirmados',
      status: 'eligible',
      contact: 'validado há 2 dias',
    },
    {
      position: 2,
      id: 'CRI-03911',
      score: 59,
      preference: '3ª escolha',
      criteria: 'Critérios B1 · P2 confirmados',
      status: 'locked',
      contact: 'em outra oferta ativa',
    },
    {
      position: 3,
      id: 'CRI-08227',
      score: 45,
      preference: '2ª escolha',
      criteria: 'Critério F1 confirmado',
      status: 'queue',
      contact: 'validado há 15 dias',
    },
  ],
};

const territories: Territory[] = [
  {
    id: '4.3',
    cre: '4ª CRE',
    pressure: 94,
    waiting: 94,
    seats: 12,
    medianDays: 36,
    trend: 12,
    units: 7,
    freshness: 'há 4h',
  },
  {
    id: '4.8',
    cre: '4ª CRE',
    pressure: 82,
    waiting: 66,
    seats: 11,
    medianDays: 29,
    trend: 8,
    units: 6,
    freshness: 'há 6h',
  },
  {
    id: '4.1',
    cre: '4ª CRE',
    pressure: 68,
    waiting: 51,
    seats: 13,
    medianDays: 22,
    trend: -3,
    units: 8,
    freshness: 'há 4h',
  },
  {
    id: '4.6',
    cre: '4ª CRE',
    pressure: 55,
    waiting: 37,
    seats: 15,
    medianDays: 17,
    trend: 2,
    units: 5,
    freshness: 'há 9h',
  },
  {
    id: '6.2',
    cre: '6ª CRE',
    pressure: 88,
    waiting: 79,
    seats: 10,
    medianDays: 33,
    trend: 11,
    units: 7,
    freshness: 'há 3h',
  },
  {
    id: '6.5',
    cre: '6ª CRE',
    pressure: 72,
    waiting: 58,
    seats: 14,
    medianDays: 24,
    trend: 5,
    units: 9,
    freshness: 'há 5h',
  },
  {
    id: '6.7',
    cre: '6ª CRE',
    pressure: 43,
    waiting: 29,
    seats: 18,
    medianDays: 13,
    trend: -6,
    units: 6,
    freshness: 'há 7h',
  },
  {
    id: '8.1',
    cre: '8ª CRE',
    pressure: 77,
    waiting: 63,
    seats: 13,
    medianDays: 27,
    trend: 7,
    units: 8,
    freshness: 'há 5h',
  },
  {
    id: '8.4',
    cre: '8ª CRE',
    pressure: 61,
    waiting: 42,
    seats: 16,
    medianDays: 19,
    trend: 1,
    units: 7,
    freshness: 'há 8h',
  },
];

const initialEvents: AuditEvent[] = [
  {
    id: 'evt-9841',
    type: 'candidate_eligible',
    label: 'Elegibilidade reproduzida pela regra oficial',
    object: 'CRI-02481 · VG-2026-0187',
    actor: 'Motor determinístico 2026.1',
    timestamp: 'Hoje, 11:42:10',
    proof:
      'Posição, desempates e critérios foram reproduzidos sem inferência probabilística.',
    integrity: 'sha256: 8f31…a102',
  },
  {
    id: 'evt-9839',
    type: 'vacancy_available',
    label: 'Vaga disponibilizada para orquestração',
    object: 'VG-2026-0187 · Maternal I',
    actor: 'Integração de capacidade',
    timestamp: 'Ontem, 16:31:04',
    proof:
      'Capacidade reconciliada com a unidade; carimbo de origem preservado.',
    integrity: 'sha256: 17bc…923e',
  },
  {
    id: 'evt-9822',
    type: 'contact_updated',
    label: 'Contato reconfirmado em canal assistido',
    object: 'CRI-02481',
    actor: 'Operadora GR · Unidade',
    timestamp: '18 ago, 14:08:52',
    proof:
      'Atualização autenticada; valor do contato não é exposto no log analítico.',
    integrity: 'sha256: f422…02c8',
  },
  {
    id: 'evt-9787',
    type: 'exception_decided',
    label: 'Exceção de integração resolvida manualmente',
    object: 'VG-2026-0172',
    actor: 'Supervisão · 4ª CRE',
    timestamp: '17 ago, 10:22:31',
    proof: 'Fallback aplicado sem alteração de prioridade; decisão revisável.',
    integrity: 'sha256: 0be7…d819',
  },
];

function buildIntakeEvent(intake: IntakeCase): AuditEvent {
  return {
    id: `intake-${intake.intakeId}`,
    type: 'application_received',
    label: 'Inscrição recebida para validação',
    object: `${intake.applicantRef} · ${intake.selection.preferences.length} preferências`,
    actor: 'Dashboard Creche · Handoff v1.0',
    timestamp: new Date(intake.createdAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    proof:
      'Caso autodeclarado recebido do snapshot histórico de 2025. Correspondência com fila oficial e validação humana permanecem obrigatórias.',
    integrity: `local-ref: ${intake.intakeId}`,
  };
}

const initialStages: Record<string, OfferStage> = {
  'VG-2026-0187': 'ready',
  'VG-2026-0214': 'ready',
  'VG-2026-0231': 'ready',
};

const stageMeta: Record<
  OfferStage,
  { label: string; action: string; progress: number; rank: number }
> = {
  ready: {
    label: 'Pronta para oferta',
    action: 'Iniciar convocação',
    progress: 79,
    rank: 0,
  },
  contacting: {
    label: 'Contato em andamento',
    action: 'Registrar ciência',
    progress: 86,
    rank: 1,
  },
  notified: {
    label: 'Família notificada',
    action: 'Registrar aceite',
    progress: 92,
    rank: 2,
  },
  accepted: {
    label: 'Oferta aceita',
    action: 'Confirmar matrícula',
    progress: 100,
    rank: 3,
  },
  enrolled: {
    label: 'Matrícula confirmada',
    action: 'Matrícula confirmada',
    progress: 100,
    rank: 4,
  },
};

const navigation: Array<{ id: Section; label: string; icon: LucideIcon }> = [
  { id: 'operacao', label: 'Operação', icon: LayoutDashboard },
  { id: 'territorio', label: 'Território', icon: MapIcon },
  { id: 'otimizacao', label: 'Otimização', icon: Gauge },
  { id: 'auditoria', label: 'Auditoria', icon: History },
];

const contactChannelOptions: Array<{
  key: ContactChannel;
  label: string;
  icon: LucideIcon;
}> = [
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'phone', label: 'Ligação', icon: PhoneCall },
  { key: 'email', label: 'E-mail', icon: Mail },
];

const sectionCopy: Record<
  Section,
  { eyebrow: string; title: string; description: string }
> = {
  operacao: {
    eyebrow: 'Centro de operação',
    title: 'Vagas que precisam de ação hoje',
    description:
      'Coordene cada oferta até a matrícula, sem alterar a prioridade oficial e sem deixar a mesma criança bloquear duas vagas.',
  },
  territorio: {
    eyebrow: 'Leitura territorial',
    title: 'Onde a pressão por vagas exige atenção',
    description:
      'Compare demanda e capacidade por microárea para planejar a rede. O sinal orienta gestão agregada e nunca restringe a escolha da família.',
  },
  otimizacao: {
    eyebrow: 'Decisão de capacidade',
    title: 'Onde abrir vaga e em que ordem convocar',
    description:
      'Cruza vaga ociosa das unidades parceiras com a fila de espera para recomendar unidade alternativa e sequência de convocação — decisão entre unidades, fora da fila oficial deste painel.',
  },
  auditoria: {
    eyebrow: 'Controle e explicabilidade',
    title: 'Cada transição deixa uma prova verificável',
    description:
      'Inspecione a versão da regra, os eventos do fluxo e os guardrails que impedem reordenação, duplicidade e decisões opacas.',
  },
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card className="metric-card" data-tone={tone}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardAction>
          <span className="metric-icon">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </CardAction>
        <CardTitle className="text-3xl font-bold tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs font-medium text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function formatCandidateStatus(
  candidate: Candidate,
  stage: OfferStage,
  vacancy: Vacancy,
) {
  if (candidate.id === vacancy.eligibleCandidate && stage !== 'ready')
    return stageMeta[stage].label;
  return {
    eligible: 'Pronta para oferta',
    validate: 'Contato a validar',
    locked: 'Em outra oferta',
    queue: 'Na fila',
  }[candidate.status];
}

function pressureLevel(pressure: number) {
  if (pressure >= 85) return 'critical';
  if (pressure >= 70) return 'high';
  if (pressure >= 55) return 'attention';
  return 'stable';
}

export function FilaVivaDashboard({
  intake = null,
  onBack,
}: {
  intake?: IntakeCase | null;
  onBack?: () => void;
}) {
  const intakeEvents = useMemo(
    () =>
      intake ? [buildIntakeEvent(intake), ...initialEvents] : initialEvents,
    [intake],
  );
  const intakeCre = intake?.selection.preferences[0]?.cre;
  const mappedIntakeCre = intakeCre ? `${intakeCre}ª CRE` : 'all';
  const initialCre = vacancies.some(
    (vacancy) => vacancy.cre === mappedIntakeCre,
  )
    ? mappedIntakeCre
    : 'all';
  const initialGroup =
    intake &&
    vacancies.some((vacancy) => vacancy.group === intake.selection.group)
      ? intake.selection.group
      : 'all';
  const initialVacancy =
    vacancies.find(
      (vacancy) =>
        (initialCre === 'all' || vacancy.cre === initialCre) &&
        (initialGroup === 'all' || vacancy.group === initialGroup),
    ) ?? vacancies[0];

  const [section, setSection] = useState<Section>('operacao');
  const [selectedCre, setSelectedCre] = useState(initialCre);
  const [selectedGroup, setSelectedGroup] = useState(initialGroup);
  const [selectedVacancyId, setSelectedVacancyId] = useState(initialVacancy.id);
  const [selectedAreaId, setSelectedAreaId] = useState(territories[0].id);
  const [query, setQuery] = useState('');
  const [offerStages, setOfferStages] = useState(initialStages);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [auditEvents, setAuditEvents] = useState(intakeEvents);
  const [selectedAuditEvent, setSelectedAuditEvent] = useState(
    intakeEvents[0].id,
  );
  const [eventFilter, setEventFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [channels, setChannels] = useState({
    whatsapp: true,
    phone: true,
    email: false,
  });
  const [operatorNote, setOperatorNote] = useState('');
  const [notice, setNotice] = useState<{
    title: string;
    description: string;
    type: 'success' | 'info';
  } | null>(null);

  const visibleVacancies = useMemo(
    () =>
      vacancies.filter(
        (vacancy) =>
          (selectedCre === 'all' || vacancy.cre === selectedCre) &&
          (selectedGroup === 'all' || vacancy.group === selectedGroup),
      ),
    [selectedCre, selectedGroup],
  );

  const activeVacancy =
    vacancies.find((vacancy) => vacancy.id === selectedVacancyId) ??
    vacancies[0];
  const currentStage = offerStages[activeVacancy.id];
  const currentStageMeta = stageMeta[currentStage];
  const activeCandidates = candidatesByVacancy[activeVacancy.id];
  const eligibleCandidate =
    activeCandidates.find(
      (candidate) => candidate.id === activeVacancy.eligibleCandidate,
    ) ?? activeCandidates[0];

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return activeCandidates;
    const vacancyMatch =
      `${activeVacancy.id} ${activeVacancy.unit} ${activeVacancy.microarea}`
        .toLocaleLowerCase('pt-BR')
        .includes(normalized);
    if (vacancyMatch) return activeCandidates;
    return activeCandidates.filter((candidate) =>
      `${candidate.id} ${candidate.criteria} ${candidate.preference}`
        .toLocaleLowerCase('pt-BR')
        .includes(normalized),
    );
  }, [activeCandidates, activeVacancy, query]);

  const operationMetrics = useMemo(() => {
    const source = visibleVacancies;
    const enrollmentRate = source.length
      ? Math.round(
          source.reduce((sum, vacancy) => sum + vacancy.enrollmentRate, 0) /
            source.length,
        )
      : 0;
    return [
      {
        label: 'Vagas aguardando ação',
        value: String(source.reduce((sum, item) => sum + item.needsAction, 0)),
        detail: `${source.filter((item) => item.ageHours >= 24).length} grupos acima de 24h`,
        icon: BellRing,
        tone: 'amber',
      },
      {
        label: 'Ofertas ativas',
        value: String(source.reduce((sum, item) => sum + item.activeOffers, 0)),
        detail: 'uma oferta ativa por criança',
        icon: CircleDot,
        tone: 'teal',
      },
      {
        label: 'Matrículas em até 7 dias',
        value: `${enrollmentRate}%`,
        detail: '+9 p.p. no cenário do piloto',
        icon: CheckCircle2,
        tone: 'green',
      },
      {
        label: 'Contatos a reconfirmar',
        value: String(
          source.reduce((sum, item) => sum + item.invalidContacts, 0),
        ),
        detail: 'nenhuma expiração automática',
        icon: PhoneCall,
        tone: 'rose',
      },
    ];
  }, [visibleVacancies]);

  const filteredTerritories = useMemo(
    () =>
      territories.filter(
        (territory) => selectedCre === 'all' || territory.cre === selectedCre,
      ),
    [selectedCre],
  );
  const selectedArea =
    filteredTerritories.find((area) => area.id === selectedAreaId) ??
    filteredTerritories[0] ??
    territories[0];

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return auditEvents.filter((event) => {
      const matchesType = eventFilter === 'all' || event.type === eventFilter;
      const matchesQuery =
        !normalized ||
        `${event.type} ${event.label} ${event.object} ${event.actor}`
          .toLocaleLowerCase('pt-BR')
          .includes(normalized);
      return matchesType && matchesQuery;
    });
  }, [auditEvents, eventFilter, query]);
  const inspectedEvent =
    auditEvents.find((event) => event.id === selectedAuditEvent) ??
    filteredEvents[0] ??
    auditEvents[0];

  function chooseFilteredVacancy(nextCre: string, nextGroup: string) {
    const next = vacancies.find(
      (vacancy) =>
        (nextCre === 'all' || vacancy.cre === nextCre) &&
        (nextGroup === 'all' || vacancy.group === nextGroup),
    );
    if (next) setSelectedVacancyId(next.id);
  }

  function handleCreChange(nextCre: string) {
    setSelectedCre(nextCre);
    chooseFilteredVacancy(nextCre, selectedGroup);
    const nextArea = territories.find(
      (area) => nextCre === 'all' || area.cre === nextCre,
    );
    if (nextArea) setSelectedAreaId(nextArea.id);
  }

  function handleGroupChange(nextGroup: string) {
    setSelectedGroup(nextGroup);
    chooseFilteredVacancy(selectedCre, nextGroup);
  }

  function makeTimestamp() {
    return `Hoje, ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }

  function appendEvent(
    type: string,
    label: string,
    proof: string,
    actor = 'Operadora GR · Unidade',
  ) {
    const event: AuditEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      type,
      label,
      object: `${eligibleCandidate.id} · ${activeVacancy.id}`,
      actor,
      timestamp: makeTimestamp(),
      proof,
      integrity: `sha256: demo-${Date.now().toString(16).slice(-6)}`,
    };
    setAuditEvents((current) => [event, ...current]);
    setSelectedAuditEvent(event.id);
  }

  function showNotice(
    title: string,
    description: string,
    type: 'success' | 'info' = 'success',
  ) {
    setNotice({ title, description, type });
  }

  function startOffer() {
    const selectedChannels = Object.entries(channels)
      .filter(([, enabled]) => enabled)
      .map(([channel]) => channel);
    if (!selectedChannels.length) return;
    setOfferStages((current) => ({
      ...current,
      [activeVacancy.id]: 'contacting',
    }));
    setAttempts((current) => ({
      ...current,
      [activeVacancy.id]:
        (current[activeVacancy.id] ?? 0) + selectedChannels.length,
    }));
    appendEvent(
      'offer_created',
      'Oferta única criada e demais opções bloqueadas',
      `Lock transacional demonstrativo criado para ${eligibleCandidate.id}; canais previstos: ${selectedChannels.join(', ')}.`,
      'Fila Viva · Orquestrador',
    );
    appendEvent(
      'contact_attempted',
      'Primeira tentativa de contato registrada',
      `Tentativa multicanal registrada com conteúdo mínimo.${operatorNote ? ' Nota operacional anexada.' : ''}`,
    );
    setDialogOpen(false);
    setOperatorNote('');
    showNotice(
      'Convocação iniciada',
      'A oferta foi bloqueada para uma única criança e entrou na trilha auditável.',
    );
  }

  function advanceStage() {
    if (currentStage === 'ready') {
      setDialogOpen(true);
      return;
    }
    const next: Partial<Record<OfferStage, OfferStage>> = {
      contacting: 'notified',
      notified: 'accepted',
      accepted: 'enrolled',
    };
    const nextStage = next[currentStage];
    if (!nextStage) return;
    const eventByStage: Record<
      OfferStage,
      { type: string; label: string; proof: string }
    > = {
      ready: { type: '', label: '', proof: '' },
      contacting: {
        type: 'family_notified',
        label: 'Ciência da família registrada',
        proof: 'Canal, horário e protocolo de ciência vinculados à oferta.',
      },
      notified: {
        type: 'offer_accepted',
        label: 'Aceite da oferta registrado',
        proof:
          'Aceite vinculado ao prazo aplicável e aos documentos orientados.',
      },
      accepted: {
        type: 'enrollment_confirmed',
        label: 'Matrícula confirmada pela unidade',
        proof:
          'Vaga ocupada; lock encerrado e demais filas atualizadas conforme regra.',
      },
      enrolled: { type: '', label: '', proof: '' },
    };
    setOfferStages((current) => ({
      ...current,
      [activeVacancy.id]: nextStage,
    }));
    const event = eventByStage[currentStage];
    appendEvent(event.type, event.label, event.proof);
    showNotice(
      stageMeta[nextStage].label,
      nextStage === 'enrolled'
        ? 'O ciclo foi concluído e a vaga saiu da fila operacional.'
        : 'A transição foi registrada sem alterar a ordem oficial.',
    );
  }

  function recordContact(channel: string) {
    setAttempts((current) => ({
      ...current,
      [activeVacancy.id]: (current[activeVacancy.id] ?? 0) + 1,
    }));
    appendEvent(
      'contact_attempted',
      `Nova tentativa por ${channel} registrada`,
      'Resultado pendente; horário e operador preservados no log append-only.',
    );
    showNotice(
      'Tentativa registrada',
      `O contato por ${channel} foi anexado à oferta ${activeVacancy.id}.`,
      'info',
    );
  }

  function exportAuditLog() {
    const blob = new Blob([JSON.stringify(auditEvents, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'fila-viva-eventos-demonstrativos.json';
    anchor.click();
    URL.revokeObjectURL(url);
    showNotice(
      'Trilha exportada',
      'O arquivo JSON contém apenas identificadores e dados demonstrativos.',
    );
  }

  function resetDemo() {
    setOfferStages(initialStages);
    setAttempts({});
    setAuditEvents(intakeEvents);
    setSelectedAuditEvent(intakeEvents[0].id);
    showNotice(
      'Demonstração reiniciada',
      'Os eventos simulados voltaram ao estado inicial.',
      'info',
    );
  }

  const selectedChannelCount = Object.values(channels).filter(Boolean).length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b border-[#cfd7df] bg-[#eceded] px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#13335a]">
        {intake
          ? 'Caso de entrada não verificado · validação humana obrigatória · nenhuma ação altera a fila oficial'
          : 'Ambiente demonstrativo · dados e identidades ilustrativos · nenhuma ação altera a fila oficial'}
      </div>

      <header className="sticky top-0 z-30 border-b border-[#2a688f] bg-[#13335a] text-white shadow-[0_8px_24px_-20px_rgba(19,51,90,0.95)]">
        <div className="mx-auto flex h-[4.5rem] max-w-[1500px] items-center gap-5 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Ir para o início do Fila Viva"
            className="flex min-w-0 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-[#42b9eb]"
            onClick={() => setSection('operacao')}
          >
            <span className="brand-product-mark shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="brand-heading block truncate text-[15px] leading-tight text-white">
                Fila Viva
              </span>
              <span className="hidden truncate text-[11px] text-white/65 sm:block">
                Orquestração auditável de vagas
              </span>
            </span>
          </button>

          <nav
            className="hidden h-full items-center gap-5 lg:flex"
            aria-label="Navegação principal"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={cn(
                    'relative flex h-full items-center gap-2 border-b-[3px] border-transparent px-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/65 outline-none transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#42b9eb]',
                    section === item.id && 'border-[#42b9eb] text-white',
                  )}
                  onClick={() => setSection(item.id)}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {onBack && (
              <Button
                variant="outline"
                className="hidden h-9 border-white/25 bg-white/5 text-white hover:bg-white/12 hover:text-white xl:inline-flex"
                onClick={onBack}
              >
                <ArrowLeft /> Nova inscrição
              </Button>
            )}
            <div className="relative hidden w-52 xl:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/60" />
              <Input
                className="h-9 border-white/20 bg-white/10 pl-9 text-white placeholder:text-white/55 focus-visible:border-[#42b9eb] focus-visible:ring-[#42b9eb]/40"
                placeholder="Buscar no painel"
                aria-label="Buscar criança, vaga ou evento"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="hidden h-9 border-white/25 bg-white/5 text-white hover:bg-white/12 hover:text-white 2xl:inline-flex"
              onClick={() => setSection('auditoria')}
            >
              <ShieldCheck />
              Regra 2026.1
            </Button>
            <div
              className="hidden size-9 place-items-center rounded-full bg-[#42b9eb] text-xs font-bold text-[#13335a] md:grid"
              aria-label="Operadora GR"
            >
              GR
            </div>
            <span
              className="mx-1 hidden h-8 w-px bg-white/20 sm:block"
              aria-hidden="true"
            />
            <img
              src="/prefeitura-rio-horizontal-white.png"
              alt="Prefeitura do Rio"
              width="1863"
              height="825"
              className="h-auto w-[92px] shrink-0 sm:w-[118px] xl:w-[132px]"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <nav
          className="mb-5 flex gap-0 overflow-x-auto border-b-2 border-[#cbd5df] bg-white lg:hidden"
          aria-label="Navegação principal móvel"
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={cn(
                  'flex min-w-fit flex-1 items-center justify-center gap-2 border-b-[3px] border-transparent px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[#42b9eb]',
                  section === item.id && 'border-[#42b9eb] text-primary',
                )}
                onClick={() => setSection(item.id)}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <section className="brand-hero mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2a688f]">
              <span
                className="brand-product-mark scale-50"
                aria-hidden="true"
              />
              {sectionCopy[section].eyebrow}
            </div>
            <h1 className="brand-heading text-2xl sm:text-3xl">
              {sectionCopy[section].title}
              <span className="brand-title-triangle" aria-hidden="true" />
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {sectionCopy[section].description}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative md:hidden">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 bg-card pl-9"
                placeholder="Buscar no painel"
                aria-label="Buscar no painel"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {section !== 'otimizacao' && (
              <NativeSelect
                value={selectedCre}
                aria-label="Selecionar CRE"
                onChange={(event) => handleCreChange(event.target.value)}
              >
                <NativeSelectOption value="all">
                  Todas as CREs
                </NativeSelectOption>
                <NativeSelectOption value="4ª CRE">4ª CRE</NativeSelectOption>
                <NativeSelectOption value="6ª CRE">6ª CRE</NativeSelectOption>
                <NativeSelectOption value="8ª CRE">8ª CRE</NativeSelectOption>
              </NativeSelect>
            )}
            {section === 'operacao' && (
              <NativeSelect
                value={selectedGroup}
                aria-label="Selecionar grupamento"
                onChange={(event) => handleGroupChange(event.target.value)}
              >
                <NativeSelectOption value="all">
                  Todos os grupamentos
                </NativeSelectOption>
                <NativeSelectOption value="Berçário">
                  Berçário
                </NativeSelectOption>
                <NativeSelectOption value="Maternal I">
                  Maternal I
                </NativeSelectOption>
                <NativeSelectOption value="Maternal II">
                  Maternal II
                </NativeSelectOption>
              </NativeSelect>
            )}
            {section === 'auditoria' && (
              <Button variant="outline" onClick={exportAuditLog}>
                <Download />
                Exportar eventos
              </Button>
            )}
          </div>
        </section>

        {section === 'operacao' && intake && (
          <Card className="mb-5 border-2 border-[#2a688f]/35 bg-[#eef8fc]">
            <CardHeader className="border-b border-[#2a688f]/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#13335a] text-white">
                    <Inbox className="size-5" />
                  </span>
                  <div>
                    <CardDescription className="font-mono text-[#2a688f]">
                      {intake.intakeId} · {intake.applicantRef}
                    </CardDescription>
                    <CardTitle className="mt-1 text-lg">
                      Inscrição recebida — validação pendente
                    </CardTitle>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Origem: Dashboard Creche · snapshot e régua histórica de{' '}
                      {intake.ruleYear}. O painel operacional abaixo continua
                      sendo um cenário ilustrativo de 2026.
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit border-[#2a688f]/35 bg-white text-[#13335a]"
                >
                  <ShieldCheck /> received_unverified
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{intake.selection.group}</Badge>
                  <Badge variant="secondary">{intake.selection.shift}</Badge>
                  <Badge variant="secondary">
                    {intake.selection.preferences.length} preferências
                  </Badge>
                  <Badge variant="secondary">score não autoritativo</Badge>
                </div>
                <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {intake.selection.preferences.map((preference) => (
                    <li
                      key={preference.unitCode}
                      className="flex min-w-0 gap-2 rounded-md border border-[#2a688f]/15 bg-white p-3"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#42b9eb] text-[11px] font-bold text-[#13335a]">
                        {preference.rank}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-xs">
                          {preference.unitName}
                        </strong>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {preference.cre}ª CRE · {preference.bairro}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                {onBack && (
                  <Button variant="outline" onClick={onBack}>
                    <ArrowLeft /> Revisar inscrição
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSection('auditoria')}
                >
                  <History /> Ver evento de entrada
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {section === 'operacao' && (
          <div className="section-enter">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {operationMetrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </section>

            <Card className="mt-5">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  Prioridade operacional
                </CardTitle>
                <CardDescription>
                  Selecione uma vaga liberada para inspecionar a fila elegível.
                </CardDescription>
                <CardAction>
                  <Badge variant="outline">
                    {visibleVacancies.length} grupos visíveis
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleVacancies.length ? (
                  visibleVacancies.map((vacancy) => {
                    const isActive = vacancy.id === activeVacancy.id;
                    const stage = offerStages[vacancy.id];
                    return (
                      <button
                        type="button"
                        key={vacancy.id}
                        onClick={() => setSelectedVacancyId(vacancy.id)}
                        className={cn(
                          'group rounded-xl border p-4 text-left transition-all outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50',
                          isActive &&
                            'border-primary/45 bg-primary/[0.045] shadow-sm',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-mono text-xs font-semibold text-primary">
                            {vacancy.id}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              vacancy.ageHours >= 48 &&
                                'bg-rose-100 text-rose-800',
                              vacancy.ageHours >= 24 &&
                                vacancy.ageHours < 48 &&
                                'bg-amber-100 text-amber-900',
                            )}
                          >
                            {vacancy.ageHours}h
                          </Badge>
                        </div>
                        <p className="mt-3 font-semibold leading-snug">
                          {vacancy.unit}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {vacancy.group} · {vacancy.shift} · microárea{' '}
                          {vacancy.microarea}
                        </p>
                        <div className="mt-4 flex items-center justify-between text-xs">
                          <span className="font-medium text-muted-foreground">
                            {stageMeta[stage].label}
                          </span>
                          <ChevronRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Nenhuma vaga corresponde aos filtros escolhidos.
                  </div>
                )}
              </CardContent>
            </Card>

            <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(350px,0.75fr)]">
              <Card className="min-w-0">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    Próximas pessoas elegíveis
                  </CardTitle>
                  <CardDescription>
                    {activeVacancy.unit} · {activeVacancy.group} ·{' '}
                    {activeVacancy.shift}
                  </CardDescription>
                  <CardAction>
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-800"
                    >
                      <LockKeyhole /> Ordem preservada
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Posição</TableHead>
                        <TableHead>Criança</TableHead>
                        <TableHead>Pontuação</TableHead>
                        <TableHead>Preferência</TableHead>
                        <TableHead>Critérios confirmados</TableHead>
                        <TableHead className="pr-4 text-right">
                          Situação
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCandidates.length ? (
                        filteredCandidates.map((candidate) => {
                          const isEligible =
                            candidate.id === activeVacancy.eligibleCandidate;
                          return (
                            <TableRow
                              key={candidate.id}
                              className={isEligible ? 'bg-primary/[0.035]' : ''}
                            >
                              <TableCell className="pl-4 font-semibold tabular-nums">
                                {candidate.position}º
                              </TableCell>
                              <TableCell>
                                <span className="block font-mono text-xs font-semibold">
                                  {candidate.id}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                  {candidate.contact}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold tabular-nums">
                                  {candidate.score}
                                </span>
                                <span className="ml-1 text-xs text-muted-foreground">
                                  pts
                                </span>
                              </TableCell>
                              <TableCell>{candidate.preference}</TableCell>
                              <TableCell className="max-w-52 truncate text-muted-foreground">
                                {candidate.criteria}
                              </TableCell>
                              <TableCell className="pr-4 text-right">
                                <Badge
                                  variant={
                                    isEligible
                                      ? 'default'
                                      : candidate.status === 'locked'
                                        ? 'outline'
                                        : 'secondary'
                                  }
                                  className={isEligible ? 'bg-primary' : ''}
                                >
                                  {formatCandidateStatus(
                                    candidate,
                                    currentStage,
                                    activeVacancy,
                                  )}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="h-32 text-center text-muted-foreground"
                          >
                            Nenhum registro encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="offer-card border-primary/20 bg-[#eef8fc]">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                      <MapPinned className="size-5" />
                    </span>
                    <Badge
                      className={cn(
                        'bg-amber-100 text-amber-900',
                        currentStage === 'enrolled' &&
                          'bg-emerald-100 text-emerald-800',
                      )}
                      variant="secondary"
                    >
                      {currentStage === 'enrolled'
                        ? 'ciclo concluído'
                        : `aberta há ${activeVacancy.ageHours}h`}
                    </Badge>
                  </div>
                  <CardDescription>
                    Vaga em foco · {activeVacancy.id}
                  </CardDescription>
                  <CardTitle className="text-xl font-bold">
                    {activeVacancy.group} · {activeVacancy.shift}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {activeVacancy.unit} · {activeVacancy.cre} · microárea{' '}
                    {activeVacancy.microarea}
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl border border-primary/15 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                          Próxima candidata
                        </p>
                        <p className="mt-1 font-mono text-base font-bold">
                          {eligibleCandidate.id}
                        </p>
                      </div>
                      <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">
                        {eligibleCandidate.score} pts
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      Sem outra oferta ativa · {eligibleCandidate.contact}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {currentStage === 'enrolled'
                          ? 'Fluxo da oferta'
                          : 'SLA para avanço'}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {currentStageMeta.label}
                      </span>
                    </div>
                    <Progress
                      value={currentStageMeta.progress}
                      className={cn(
                        '[&_[data-slot=progress-indicator]]:bg-[#2a688f]',
                        currentStageMeta.rank >= 2 &&
                          '[&_[data-slot=progress-indicator]]:bg-primary',
                        currentStage === 'enrolled' &&
                          '[&_[data-slot=progress-indicator]]:bg-emerald-600',
                      )}
                    />
                  </div>
                  {currentStage !== 'ready' && currentStage !== 'enrolled' && (
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold">
                          Tentativas registradas
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {attempts[activeVacancy.id] ?? 0}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => recordContact('WhatsApp')}
                          aria-label="Registrar tentativa por WhatsApp"
                        >
                          <MessageCircle />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => recordContact('ligação')}
                          aria-label="Registrar tentativa por ligação"
                        >
                          <PhoneCall />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => recordContact('e-mail')}
                          aria-label="Registrar tentativa por e-mail"
                        >
                          <Mail />
                        </Button>
                      </div>
                    </div>
                  )}
                  <Button
                    size="lg"
                    className="h-11 w-full justify-between px-4"
                    onClick={advanceStage}
                    disabled={currentStage === 'enrolled'}
                  >
                    <span className="flex items-center gap-2">
                      {currentStage === 'enrolled' ? (
                        <CheckCircle2 />
                      ) : (
                        <PhoneCall />
                      )}
                      {currentStageMeta.action}
                    </span>
                    {currentStage !== 'enrolled' && <ArrowRight />}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-between px-1 py-1 text-xs text-muted-foreground"
                    onClick={() => setSection('auditoria')}
                  >
                    Ver regra aplicada e histórico da vaga
                    <ChevronRight className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Waypoints className="size-4 text-primary" />
                    Protocolo de convocação
                  </CardTitle>
                  <CardDescription>
                    Uma sequência comum para unidade, CRE e controle central.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-4">
                  {[
                    ['1', 'Oferta única'],
                    ['2', 'Contato'],
                    ['3', 'Ciência e aceite'],
                    ['4', 'Matrícula'],
                  ].map(([number, label], index) => {
                    const complete = currentStageMeta.rank > index;
                    const active = currentStageMeta.rank === index;
                    return (
                      <div
                        key={number}
                        className={cn(
                          'rounded-xl border p-3',
                          active && 'border-primary/40 bg-primary/[0.04]',
                          complete && 'border-emerald-200 bg-emerald-50/70',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-7 place-items-center rounded-full bg-muted text-xs font-bold',
                            active && 'bg-primary text-primary-foreground',
                            complete && 'bg-emerald-600 text-white',
                          )}
                        >
                          {complete ? <Check className="size-4" /> : number}
                        </span>
                        <p className="mt-3 text-xs font-semibold">{label}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <Card className="brand-dark-pattern border-[#13335a]/15 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-[#42b9eb]" />
                    Guardrails ativos
                  </CardTitle>
                  <CardDescription className="text-white/65">
                    O protótipo automatiza coordenação, não direitos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    'Pontuação oficial reproduzível',
                    'Uma oferta ativa por criança',
                    'Decisão negativa revisável',
                    'Fallback manual sem reordenação',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#13335a]/85 p-3"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#42b9eb]" />
                      <span className="text-white/85">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          </div>
        )}

        {section === 'territorio' && (
          <div className="section-enter">
            <div className="mb-5 rounded-lg border border-[#b8dff0] bg-[#eaf7fc] px-4 py-3 text-sm text-[#13335a]">
              <div className="flex items-start gap-2.5">
                <MapPinned className="mt-0.5 size-4 shrink-0 text-[#2a688f]" />
                <p>
                  <strong>Uso permitido:</strong> dimensionar capacidade e
                  investigar gargalos agregados. Este painel não pontua
                  crianças, não bloqueia escolhas e suprime qualquer célula
                  individual.
                </p>
              </div>
            </div>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Crianças aguardando"
                value={String(
                  filteredTerritories.reduce(
                    (sum, area) => sum + area.waiting,
                    0,
                  ),
                )}
                detail="sinal agregado do cenário"
                icon={Users}
                tone="teal"
              />
              <MetricCard
                label="Vagas sinalizadas"
                value={String(
                  filteredTerritories.reduce(
                    (sum, area) => sum + area.seats,
                    0,
                  ),
                )}
                detail="capacidade a reconciliar"
                icon={Building2}
                tone="green"
              />
              <MetricCard
                label="Microáreas críticas"
                value={String(
                  filteredTerritories.filter((area) => area.pressure >= 85)
                    .length,
                )}
                detail="pressão igual ou superior a 85"
                icon={TriangleAlert}
                tone="rose"
              />
              <MetricCard
                label="Espera mediana"
                value={`${Math.round(filteredTerritories.reduce((sum, area) => sum + area.medianDays, 0) / Math.max(filteredTerritories.length, 1))}d`}
                detail="indicador ilustrativo"
                icon={Clock3}
                tone="amber"
              />
            </section>
            <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.7fr)]">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <MapIcon className="size-4 text-primary" />
                    Pressão comparada por microárea
                  </CardTitle>
                  <CardDescription>
                    Grade analítica demonstrativa; não representa limites
                    geográficos.
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline">atualização intradiária</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTerritories.map((area) => (
                    <button
                      type="button"
                      key={area.id}
                      data-level={pressureLevel(area.pressure)}
                      className={cn(
                        'territory-tile text-left',
                        selectedArea.id === area.id && 'is-selected',
                      )}
                      onClick={() => setSelectedAreaId(area.id)}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.11em] opacity-70">
                            Microárea
                          </span>
                          <span className="mt-0.5 block text-xl font-bold">
                            {area.id}
                          </span>
                        </span>
                        <span className="rounded-md bg-white/75 px-2 py-1 text-sm font-bold tabular-nums text-[#13335a]">
                          {area.pressure}
                        </span>
                      </span>
                      <span className="mt-5 grid grid-cols-2 gap-3 text-xs">
                        <span>
                          <strong className="block text-base">
                            {area.waiting}
                          </strong>
                          <span className="opacity-70">aguardando</span>
                        </span>
                        <span>
                          <strong className="block text-base">
                            {area.seats}
                          </strong>
                          <span className="opacity-70">vagas</span>
                        </span>
                      </span>
                      <span className="mt-4 flex items-center justify-between border-t border-current/10 pt-3 text-xs font-medium">
                        {area.cre}
                        <span
                          className={
                            area.trend > 0
                              ? 'text-rose-800'
                              : 'text-emerald-800'
                          }
                        >
                          {area.trend > 0 ? '+' : ''}
                          {area.trend}%
                        </span>
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                      <MapPinned className="size-5" />
                    </span>
                    <Badge
                      variant={
                        selectedArea.pressure >= 85
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {selectedArea.pressure >= 85
                        ? 'pressão crítica'
                        : 'em observação'}
                    </Badge>
                  </div>
                  <CardDescription>Microárea selecionada</CardDescription>
                  <CardTitle className="text-2xl">
                    {selectedArea.id} · {selectedArea.cre}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/65 p-3">
                      <span className="text-xs text-muted-foreground">
                        Pressão demanda/vaga
                      </span>
                      <strong className="mt-1 block text-xl">
                        {(selectedArea.waiting / selectedArea.seats).toFixed(1)}
                        ×
                      </strong>
                    </div>
                    <div className="rounded-xl bg-muted/65 p-3">
                      <span className="text-xs text-muted-foreground">
                        Espera mediana
                      </span>
                      <strong className="mt-1 block text-xl">
                        {selectedArea.medianDays} dias
                      </strong>
                    </div>
                    <div className="rounded-xl bg-muted/65 p-3">
                      <span className="text-xs text-muted-foreground">
                        Unidades no sinal
                      </span>
                      <strong className="mt-1 block text-xl">
                        {selectedArea.units}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-muted/65 p-3">
                      <span className="text-xs text-muted-foreground">
                        Atualizado
                      </span>
                      <strong className="mt-1 block text-xl">
                        {selectedArea.freshness}
                      </strong>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                      Próximas verificações
                    </p>
                    <ul className="mt-3 space-y-3 text-sm">
                      <li className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>
                          Reconciliar capacidade e turnos com as unidades.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <CircleDot className="mt-0.5 size-4 shrink-0 text-amber-600" />
                        <span>
                          Separar recusa por turno, distância e preferência.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <CircleDot className="mt-0.5 size-4 shrink-0 text-amber-600" />
                        <span>
                          Validar demanda invisível com sinais externos e campo.
                        </span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/25">
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedCre(selectedArea.cre);
                      setSection('operacao');
                      chooseFilteredVacancy(selectedArea.cre, 'all');
                    }}
                  >
                    Ver operação desta CRE <ArrowRight />
                  </Button>
                </CardFooter>
              </Card>
            </section>
            <section className="mt-5 grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="size-4 text-primary" />
                    Demanda e capacidade
                  </CardTitle>
                  <CardDescription>
                    Leitura relativa das microáreas visíveis.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredTerritories.slice(0, 6).map((area) => (
                    <div key={area.id}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold">
                          Microárea {area.id}
                        </span>
                        <span className="text-muted-foreground">
                          {area.waiting} / {area.seats} vagas
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(8, area.pressure)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="size-4 text-primary" />
                    Qualidade antes da previsão
                  </CardTitle>
                  <CardDescription>
                    Condições para que um sinal territorial seja acionável.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    ['Capacidade com carimbo de origem', '92%', 'green'],
                    ['Vínculo unidade–microárea normalizado', '84%', 'teal'],
                    ['Motivo estruturado de recusa', '61%', 'amber'],
                    ['Demanda latente validada em campo', '38%', 'rose'],
                  ].map(([label, value, tone]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 rounded-xl border p-3"
                    >
                      <span className="text-sm font-medium">{label}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          tone === 'green' && 'bg-emerald-100 text-emerald-800',
                          tone === 'amber' && 'bg-amber-100 text-amber-900',
                          tone === 'rose' && 'bg-rose-100 text-rose-800',
                        )}
                      >
                        {value}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
            <Card className="mt-5 border-primary/20 bg-[#eaf7fc]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Gauge className="size-5" />
                  </span>
                  <div>
                    <CardDescription>
                      Próximo passo para o gestor de CRE
                    </CardDescription>
                    <CardTitle>Otimizador de Alocação e Convocação</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-[#13335a]">
                  Cruza a vaga ociosa reportada pelas unidades parceiras com a
                  fila de espera por CRE, recomenda unidade alternativa mais
                  próxima e a sequência de convocação — decisão de capacidade
                  entre unidades, fora da fila oficial deste painel.
                </p>
              </CardContent>
              <CardFooter className="border-t bg-white/60">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => setSection('otimizacao')}
                >
                  Abrir Otimizador de Alocação
                  <ArrowRight />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {section === 'otimizacao' && (
          <div className="section-enter">
            <OtimizadorPanel />
          </div>
        )}

        {section === 'auditoria' && (
          <div className="section-enter">
            <div className="mb-5 rounded-lg border border-[#9fc9df] bg-[#eef8fc] px-4 py-3 text-sm text-[#13335a]">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#2a688f]" />
                <p>
                  <strong>Regra de ouro:</strong> o Fila Viva registra, coordena
                  e explica. Pontuação, desempates e elegibilidade permanecem
                  determinísticos e versionados.
                </p>
              </div>
            </div>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Eventos no recorte"
                value={String(auditEvents.length)}
                detail="log append-only demonstrativo"
                icon={History}
                tone="teal"
              />
              <MetricCard
                label="Versão normativa"
                value="2026.1"
                detail="vigência e hash registrados"
                icon={FileCheck2}
                tone="green"
              />
              <MetricCard
                label="Ofertas duplicadas"
                value="0"
                detail="lock transacional ativo"
                icon={LockKeyhole}
                tone="amber"
              />
              <MetricCard
                label="Exceções abertas"
                value="1"
                detail="revisão humana obrigatória"
                icon={TriangleAlert}
                tone="rose"
              />
            </section>
            <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.7fr)]">
              <Card className="min-w-0">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <History className="size-4 text-primary" />
                    Trilha de eventos
                  </CardTitle>
                  <CardDescription>
                    Selecione um registro para verificar fundamento e
                    integridade.
                  </CardDescription>
                  <CardAction>
                    <NativeSelect
                      value={eventFilter}
                      aria-label="Filtrar tipo de evento"
                      onChange={(event) => setEventFilter(event.target.value)}
                    >
                      <NativeSelectOption value="all">
                        Todos os eventos
                      </NativeSelectOption>
                      <NativeSelectOption value="application_received">
                        Inscrição recebida
                      </NativeSelectOption>
                      <NativeSelectOption value="vacancy_available">
                        Vaga disponível
                      </NativeSelectOption>
                      <NativeSelectOption value="candidate_eligible">
                        Elegibilidade
                      </NativeSelectOption>
                      <NativeSelectOption value="offer_created">
                        Oferta criada
                      </NativeSelectOption>
                      <NativeSelectOption value="contact_attempted">
                        Tentativa de contato
                      </NativeSelectOption>
                      <NativeSelectOption value="family_notified">
                        Ciência da família
                      </NativeSelectOption>
                      <NativeSelectOption value="offer_accepted">
                        Aceite
                      </NativeSelectOption>
                      <NativeSelectOption value="enrollment_confirmed">
                        Matrícula
                      </NativeSelectOption>
                    </NativeSelect>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Horário</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Objeto</TableHead>
                        <TableHead className="pr-4">Ator</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.length ? (
                        filteredEvents.map((event) => (
                          <TableRow
                            key={event.id}
                            className={cn(
                              'cursor-pointer',
                              inspectedEvent.id === event.id &&
                                'bg-primary/[0.04]',
                            )}
                            onClick={() => setSelectedAuditEvent(event.id)}
                          >
                            <TableCell className="pl-4 text-xs tabular-nums text-muted-foreground">
                              {event.timestamp}
                            </TableCell>
                            <TableCell>
                              <button
                                type="button"
                                className="text-left outline-none focus-visible:underline"
                                onClick={() => setSelectedAuditEvent(event.id)}
                              >
                                <span className="block font-mono text-[11px] font-semibold text-primary">
                                  {event.type}
                                </span>
                                <span className="mt-0.5 block font-medium">
                                  {event.label}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {event.object}
                            </TableCell>
                            <TableCell className="pr-4 text-xs text-muted-foreground">
                              {event.actor}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-32 text-center text-muted-foreground"
                          >
                            Nenhum evento encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-md bg-[#13335a] text-white">
                      <FileCheck2 className="size-5" />
                    </span>
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-800"
                    >
                      <CheckCircle2 /> íntegro
                    </Badge>
                  </div>
                  <CardDescription>Evento selecionado</CardDescription>
                  <CardTitle className="text-lg leading-snug">
                    {inspectedEvent.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-muted/65 p-4">
                    <p className="font-mono text-xs font-semibold text-primary">
                      {inspectedEvent.type}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {inspectedEvent.proof}
                    </p>
                  </div>
                  <dl className="grid gap-3 text-sm">
                    <div className="flex items-start justify-between gap-4 border-b pb-3">
                      <dt className="text-muted-foreground">Objeto</dt>
                      <dd className="text-right font-mono text-xs font-semibold">
                        {inspectedEvent.object}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 border-b pb-3">
                      <dt className="text-muted-foreground">Ator</dt>
                      <dd className="text-right font-medium">
                        {inspectedEvent.actor}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 border-b pb-3">
                      <dt className="text-muted-foreground">Timestamp</dt>
                      <dd className="text-right font-medium tabular-nums">
                        {inspectedEvent.timestamp}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-muted-foreground">Integridade</dt>
                      <dd className="text-right font-mono text-xs">
                        {inspectedEvent.integrity}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </section>
            <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    Contrato da regra 2026.1
                  </CardTitle>
                  <CardDescription>
                    O resultado deve ser reproduzível sem modelo generativo.
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline" className="font-mono">
                      rv26.1-8f31
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {[
                    [
                      'Entrada versionada',
                      'Processo, CRE, unidade, grupamento e turno com carimbo de origem.',
                    ],
                    [
                      'Cálculo determinístico',
                      'Pontuação, desempates e posição executados pela regra publicada.',
                    ],
                    [
                      'Explicação por registro',
                      'Toda oferta aponta para os critérios e para a versão que a fundamentou.',
                    ],
                    [
                      'Revisão humana',
                      'Ausência em base não vira negativa automática; prova alternativa permanece possível.',
                    ],
                  ].map(([title, description]) => (
                    <div key={title} className="rounded-xl border p-4">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        {title}
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCcw className="size-4 text-primary" />
                    Controles da demonstração
                  </CardTitle>
                  <CardDescription>
                    Ferramentas locais para apresentar o fluxo com segurança.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={exportAuditLog}
                  >
                    Baixar eventos em JSON <Download />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={resetDemo}
                  >
                    Reiniciar estados simulados <RefreshCcw />
                  </Button>
                  <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
                    O MVP não persiste dados, não envia mensagens e não executa
                    integração com sistemas oficiais.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
        )}

        <footer className="mt-6 flex flex-col gap-2 border-t py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Protótipo funcional · cenário ilustrativo para piloto em modo shadow
          </p>
          <div className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            Toda alteração local gera um evento auditável
          </div>
        </footer>
      </div>

      {notice && (
        <output
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl border bg-card p-4 shadow-xl"
        >
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-full bg-[#dff4fc] text-[#2a688f]',
              notice.type === 'success' && 'bg-emerald-100 text-emerald-700',
            )}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <CircleDot className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{notice.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {notice.description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setNotice(null)}
            aria-label="Fechar notificação"
          >
            <X />
          </Button>
        </output>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Iniciar convocação</DialogTitle>
            <DialogDescription>
              Crie uma oferta única para {eligibleCandidate.id} e registre a
              primeira tentativa de contato.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-semibold text-primary">
                  {activeVacancy.id}
                </p>
                <p className="mt-1 font-semibold">{activeVacancy.unit}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeVacancy.group} · {activeVacancy.shift}
                </p>
              </div>
              <Badge>{eligibleCandidate.position}ª posição</Badge>
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              Canais da primeira tentativa
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {contactChannelOptions.map(({ key, label, icon: Icon }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium has-[:checked]:border-primary/40 has-[:checked]:bg-primary/[0.04]"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={channels[key]}
                    onChange={(event) =>
                      setChannels((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                  <Icon className="size-4 text-primary" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <Label htmlFor="operator-note" className="mb-2">
              Nota operacional{' '}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Textarea
              id="operator-note"
              value={operatorNote}
              onChange={(event) => setOperatorNote(event.target.value)}
              placeholder="Registre apenas o necessário; não inclua dados sensíveis."
            />
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            Ao confirmar, as demais opções desta criança ficam bloqueadas no
            cenário demonstrativo. Nenhuma posição é alterada.
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={startOffer} disabled={selectedChannelCount === 0}>
              <UserCheck /> Confirmar e registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
