'use client';
/* oxlint-disable next/no-img-element */

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Info,
  MapPin,
  Mic,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  User,
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
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  saveIntakeCase,
  type IntakeAnswer,
  type IntakeCase,
  type IntakeCluster,
} from '@/lib/intake-contract';

const IntakeMap = dynamic(() => import('./intake-map'), {
  ssr: false,
  loading: () => (
    <div className="grid h-[520px] place-items-center bg-[#eceded] text-sm text-muted-foreground">
      Preparando o mapa local…
    </div>
  ),
});

type Unit = {
  code: string;
  name: string;
  address: string;
  bairro: string;
  cep: string;
  lat: number;
  lon: number;
  type: string;
  cre: string;
  options: number;
  first: number;
  wait: number;
  confirmed: number;
};

type Place = {
  label: string;
  lat: number;
  lon: number;
};

type Recommendation = Unit & {
  distance: number;
  origin: number;
};

type IntakeStage = 'location' | 'selection' | 'interview' | 'review';

type FamilyContact = {
  name: string;
  relation: string;
  phone: string;
};

type Question = {
  id: string;
  text: string;
  points: number;
};

type VoiceRecognitionEvent = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type VoiceRecognition = {
  lang: string;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: VoiceRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => VoiceRecognition;
    SpeechRecognition?: new () => VoiceRecognition;
  }
}

const questions: Question[] = [
  {
    id: 'cadunico',
    text: 'A família da criança está inscrita no CadÚnico?',
    points: 51,
  },
  {
    id: 'educacao-especial',
    text: 'A criança é público-alvo da educação especial?',
    points: 25,
  },
  {
    id: 'beneficio',
    text: 'A família recebe Bolsa Família ou possui Cartão Carioca?',
    points: 2,
  },
  {
    id: 'violencia',
    text: 'A criança ou familiar do convívio diário é vítima de violência doméstica?',
    points: 4,
  },
  {
    id: 'monoparental',
    text: 'A criança pertence a uma família monoparental?',
    points: 4,
  },
  {
    id: 'responsavel-pcd',
    text: 'A criança possui pais ou responsáveis com deficiência?',
    points: 3,
  },
  {
    id: 'doenca-cronica',
    text: 'A criança ou alguém do núcleo familiar apresenta doença crônica grave?',
    points: 3,
  },
  {
    id: 'drogas-alcool',
    text: 'Existe no núcleo familiar uso abusivo de drogas ou álcool?',
    points: 2,
  },
  {
    id: 'sistema-prisional',
    text: 'Existe no núcleo familiar pessoa presa ou egressa do sistema prisional nos últimos cinco anos?',
    points: 2,
  },
  { id: 'refugiado', text: 'A criança é refugiada?', points: 2 },
  {
    id: 'fila-anterior',
    text: 'A criança aguardou na fila no ano anterior sem ser atendida?',
    points: 2,
  },
  {
    id: 'irmao-rede',
    text: 'A criança possui irmão matriculado na rede pública ou parceira?',
    points: 0,
  },
  {
    id: 'responsavel-menor',
    text: 'Os pais ou responsáveis possuem menos de 18 anos?',
    points: 0,
  },
];

const stageOrder: IntakeStage[] = [
  'location',
  'selection',
  'interview',
  'review',
];

const stageLabels: Record<IntakeStage, string> = {
  location: 'Localização',
  selection: 'Preferências',
  interview: 'Entrevista',
  review: 'Revisão',
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function distanceKm(origin: Place, unit: Unit) {
  const earthRadius = 6371;
  const latitudeDelta = ((unit.lat - origin.lat) * Math.PI) / 180;
  const longitudeDelta = ((unit.lon - origin.lon) * Math.PI) / 180;
  const latitudeA = (origin.lat * Math.PI) / 180;
  const latitudeB = (unit.lat * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
}

function clusterFor(score: number): {
  code: IntakeCluster;
  label: string;
  range: string;
  color: string;
} {
  if (score <= 3)
    return {
      code: 'V0',
      label: 'Baixa pontuação declarada',
      range: '0–3',
      color: '#6c7f92',
    };
  if (score <= 30)
    return {
      code: 'V1',
      label: 'Vulnerabilidade leve declarada',
      range: '4–30',
      color: '#42b9eb',
    };
  if (score <= 66)
    return {
      code: 'V2',
      label: 'Vulnerabilidade socioeconômica declarada',
      range: '31–66',
      color: '#2a688f',
    };
  return {
    code: 'V3',
    label: 'Vulnerabilidade acumulada declarada',
    range: '67–100',
    color: '#a23241',
  };
}

function IntakeHeader({ stage }: { stage: IntakeStage }) {
  const currentIndex = stageOrder.indexOf(stage);

  return (
    <>
      <div className="border-b border-[#cfd7df] bg-[#eceded] px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#13335a]">
        Protótipo local · dados históricos anonimizados · nenhuma inscrição é
        enviada à SME
      </div>
      <header className="border-b border-[#2a688f] bg-[#13335a] text-white">
        <div className="mx-auto flex min-h-[5.5rem] max-w-[1500px] items-center gap-5 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="brand-product-mark shrink-0" aria-hidden="true" />
            <div>
              <p className="brand-heading text-[15px] leading-tight">
                Fila Viva
              </p>
              <p className="mt-0.5 hidden text-[11px] text-white/65 sm:block">
                Da inscrição à coordenação auditável
              </p>
            </div>
          </div>

          <ol
            className="ml-auto hidden items-center gap-1 lg:flex"
            aria-label="Etapas da inscrição"
          >
            {stageOrder.map((item, index) => {
              const active = item === stage;
              const complete = index < currentIndex;
              return (
                <li
                  key={item}
                  className={cn(
                    'flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-white/55',
                    active && 'border-[#42b9eb] text-white',
                    complete && 'text-white/85',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-5 place-items-center rounded-full border border-white/30 text-[10px]',
                      active && 'border-[#42b9eb] bg-[#42b9eb] text-[#13335a]',
                      complete && 'border-white bg-white text-[#13335a]',
                    )}
                  >
                    {complete ? <Check className="size-3" /> : index + 1}
                  </span>
                  {stageLabels[item]}
                </li>
              );
            })}
          </ol>

          <span
            className="mx-1 hidden h-9 w-px bg-white/20 sm:block"
            aria-hidden="true"
          />
          <img
            src="/prefeitura-rio-horizontal-white.png"
            alt="Prefeitura do Rio"
            width="1863"
            height="825"
            className="h-auto w-[92px] shrink-0 sm:w-[118px]"
          />
        </div>
      </header>
      <div className="border-b bg-white px-4 py-2 lg:hidden">
        <p className="mx-auto max-w-[1500px] text-xs font-semibold text-[#13335a]">
          Etapa {currentIndex + 1} de 4 · {stageLabels[stage]}
        </p>
      </div>
    </>
  );
}

export function CrecheIntake() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [childName, setChildName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [contacts, setContacts] = useState<FamilyContact[]>([
    { name: '', relation: '', phone: '' },
    { name: '', relation: '', phone: '' },
    { name: '', relation: '', phone: '' },
  ]);
  const [places, setPlaces] = useState(['', '']);
  const [located, setLocated] = useState<Place[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [stage, setStage] = useState<IntakeStage>('location');
  const [group, setGroup] = useState('Maternal I');
  const [shift, setShift] = useState('Integral');
  const [answers, setAnswers] = useState<IntakeAnswer[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [message, setMessage] = useState(
    'Carregando o retrato histórico das unidades…',
  );
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/data/creches-2025.json')
      .then((response) => {
        if (!response.ok) throw new Error('snapshot indisponível');
        return response.json() as Promise<Unit[]>;
      })
      .then((data) => {
        if (!mounted) return;
        setUnits(data);
        setMessage(
          'Informe dois CEPs ou bairros para localizar unidades próximas.',
        );
      })
      .catch(() => {
        if (!mounted) return;
        setMessage('Não foi possível carregar o snapshot local de unidades.');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const chosen = useMemo(
    () =>
      selected
        .map(
          (code) =>
            recommendations
              .filter((unit) => unit.code === code)
              .sort((left, right) => left.distance - right.distance)[0],
        )
        .filter((unit): unit is Recommendation => Boolean(unit)),
    [recommendations, selected],
  );

  const score = answers.reduce((total, answer) => total + answer.points, 0);
  const cluster = clusterFor(score);
  const currentQuestion = questions[questionIndex];

  function speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    if (stage !== 'interview') return;
    speak(`${questions[questionIndex].text} Responda sim ou não.`);
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [stage, questionIndex]);

  async function locate(value: string): Promise<Place> {
    const normalized = normalize(value);
    const digits = value.replace(/\D/g, '');

    if (digits.length >= 5) {
      const target = Number(digits.padEnd(8, '0').slice(0, 8));
      const candidates = units
        .filter((unit) => /^\d{8}$/.test(unit.cep))
        .map((unit) => ({
          unit,
          difference: Math.abs(Number(unit.cep) - target),
        }))
        .sort((left, right) => left.difference - right.difference);
      const exact = candidates.filter(
        (candidate) => candidate.difference === 0,
      );
      const prefix = candidates
        .filter(
          (candidate) => candidate.unit.cep.slice(0, 5) === digits.slice(0, 5),
        )
        .slice(0, 5);
      const sample = exact.length
        ? exact
        : prefix.length
          ? prefix
          : candidates.slice(0, 3);

      if (sample.length) {
        return {
          label: exact.length ? value : `${value} · referência aproximada`,
          lat:
            sample.reduce((total, item) => total + item.unit.lat, 0) /
            sample.length,
          lon:
            sample.reduce((total, item) => total + item.unit.lon, 0) /
            sample.length,
        };
      }
    }

    const localMatches = units.filter(
      (unit) =>
        normalize(unit.bairro).includes(normalized) ||
        normalized.includes(normalize(unit.bairro)),
    );
    if (localMatches.length) {
      return {
        label: value,
        lat:
          localMatches.reduce((total, unit) => total + unit.lat, 0) /
          localMatches.length,
        lon:
          localMatches.reduce((total, unit) => total + unit.lon, 0) /
          localMatches.length,
      };
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(`${value}, Rio de Janeiro, RJ`)}`,
      );
      if (!response.ok) throw new Error('geocodificação indisponível');
      const rows = (await response.json()) as Array<{
        lat: string;
        lon: string;
      }>;
      if (rows[0]) {
        return {
          label: value,
          lat: Number(rows[0].lat),
          lon: Number(rows[0].lon),
        };
      }
    } catch {
      // The local snapshot remains the primary lookup. Network fallback is optional.
    }

    throw new Error(value);
  }

  async function searchLocations() {
    if (!places[0].trim() || !places[1].trim()) {
      setMessage('Preencha os dois CEPs ou bairros para continuar.');
      return;
    }

    setLoading(true);
    setMessage('Localizando as referências e calculando as unidades próximas…');
    try {
      const found = await Promise.all(places.map(locate));
      const next = found.flatMap((place, origin) =>
        units
          .map((unit) => ({
            ...unit,
            distance: distanceKm(place, unit),
            origin,
          }))
          .sort(
            (left, right) =>
              left.distance - right.distance ||
              right.confirmed - left.confirmed,
          )
          .slice(0, 5),
      );
      setLocated(found);
      setRecommendations(next);
      setSelected([]);
      setStage('selection');
      setMessage(
        found.some((place) => place.label.includes('aproximada'))
          ? 'Uma das referências foi aproximada pelo CEP mais próximo disponível no snapshot.'
          : 'Referências localizadas no retrato histórico de 2025.',
      );
    } catch (error) {
      setMessage(
        `Não localizei “${error instanceof Error ? error.message : 'uma das referências'}”. Revise o CEP ou informe um bairro do Rio.`,
      );
    } finally {
      setLoading(false);
    }
  }

  function updateContact(
    index: number,
    field: keyof FamilyContact,
    value: string,
  ) {
    setContacts((current) =>
      current.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    );
  }

  function toggleUnit(code: string) {
    setSelected((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : current.length < 5
          ? [...current, code]
          : current,
    );
  }

  function startInterview() {
    if (!selected.length) return;
    setStage('interview');
    setAnswers([]);
    setQuestionIndex(0);
    setVoiceDraft('');
  }

  function answerQuestion(value: 'yes' | 'no') {
    const answer: IntakeAnswer = {
      criterionId: currentQuestion.id,
      value,
      points: value === 'yes' ? currentQuestion.points : 0,
    };
    const next = [...answers, answer];
    setAnswers(next);
    setVoiceDraft('');

    if (questionIndex === questions.length - 1) {
      setStage('review');
    } else {
      setQuestionIndex((current) => current + 1);
    }
  }

  function previousQuestion() {
    if (questionIndex === 0) {
      setStage('selection');
      return;
    }
    setAnswers((current) => current.slice(0, -1));
    setQuestionIndex((current) => current - 1);
    setVoiceDraft('');
  }

  function reviseLastAnswer() {
    setAnswers((current) => current.slice(0, -1));
    setQuestionIndex(questions.length - 1);
    setStage('interview');
  }

  function listen() {
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceDraft('Reconhecimento de voz indisponível neste navegador.');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = true;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ');
      setVoiceDraft(transcript);
    };
    recognition.onerror = () =>
      setVoiceDraft('Não consegui ouvir. Use os botões Sim ou Não.');
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  function completeIntake() {
    if (!acknowledged || !chosen.length) return;
    const suffix = window.crypto
      .randomUUID()
      .replaceAll('-', '')
      .slice(0, 12)
      .toUpperCase();
    const intakeId = `INT-${suffix}`;
    const intake: IntakeCase = {
      schemaVersion: '1.0',
      intakeId,
      applicantRef: `CRI-DEMO-${suffix.slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      ruleYear: 2025,
      ruleVersion: 'historical-2025',
      source: 'dashboard-creche',
      sourceNotice: 'historical-anonymized-data',
      selection: {
        group,
        shift,
        locationsCount: located.length,
        preferences: chosen.map((unit, index) => ({
          rank: index + 1,
          unitCode: unit.code,
          unitName: unit.name,
          cre: unit.cre,
          bairro: unit.bairro,
          distanceKm: Number(unit.distance.toFixed(2)),
        })),
      },
      assessment: {
        nature: 'self_declared_simulation',
        declaredScore: score,
        cluster: cluster.code,
        criteriaCount: answers.length,
        positiveCriteriaCount: answers.filter(
          (answer) => answer.value === 'yes',
        ).length,
        answersIncluded: false,
        authoritative: false,
        validationStatus: 'pending',
      },
      constraints: {
        mayChangeOfficialRanking: false,
        mayStartOffer: false,
        requiresOfficialQueueMatch: true,
        requiresHumanReview: true,
      },
    };
    saveIntakeCase(intake);
    window.location.assign(`/operacao?intake=${encodeURIComponent(intakeId)}`);
  }

  function resetFlow() {
    setChildName('');
    setBirthDate('');
    setGuardianName('');
    setContacts([
      { name: '', relation: '', phone: '' },
      { name: '', relation: '', phone: '' },
      { name: '', relation: '', phone: '' },
    ]);
    setPlaces(['', '']);
    setLocated([]);
    setRecommendations([]);
    setSelected([]);
    setAnswers([]);
    setQuestionIndex(0);
    setAcknowledged(false);
    setStage('location');
    setMessage(
      'Informe dois CEPs ou bairros para localizar unidades próximas.',
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <IntakeHeader stage={stage} />

      {stage === 'location' && (
        <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <section className="brand-hero grid gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(460px,1.3fr)] lg:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2a688f]">
                <span
                  className="brand-product-mark scale-50"
                  aria-hidden="true"
                />
                Início do fluxo integrado
              </div>
              <h1 className="brand-heading max-w-4xl text-3xl sm:text-4xl lg:text-5xl">
                Encontre unidades próximas e registre as preferências
                <span className="brand-title-triangle" aria-hidden="true" />
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
                Comece por duas referências de localização. O mapa usa o retrato
                anonimizado de 2025 para apoiar a escolha; depois, a entrevista
                segue para validação no Fila Viva.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  ['820', 'unidades no snapshot'],
                  ['11', 'CREs representadas'],
                  ['2025', 'ano histórico da base'],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="border-l-4 border-[#42b9eb] bg-white p-4 shadow-sm ring-1 ring-foreground/10"
                  >
                    <strong className="brand-heading block text-2xl">
                      {value}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-t-[6px] border-t-[#42b9eb]">
              <CardHeader>
                <CardDescription>Etapa 1 de 4</CardDescription>
                <CardTitle className="text-xl">
                  Quais locais devem orientar a busca?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void searchLocations();
                  }}
                >
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#2a688f]">
                      Informações da criança
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label
                        htmlFor="child-name"
                        className="grid gap-2 text-sm font-semibold"
                      >
                        Nome completo *
                        <div className="relative">
                          <Baby className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#2a688f]" />
                          <Input
                            id="child-name"
                            value={childName}
                            onChange={(event) =>
                              setChildName(event.target.value)
                            }
                            className="h-11 bg-white pl-10"
                            placeholder="Nome completo da criança"
                            autoComplete="name"
                          />
                        </div>
                      </label>
                      <label
                        htmlFor="child-birth-date"
                        className="grid gap-2 text-sm font-semibold"
                      >
                        Data de nascimento *
                        <div className="relative">
                          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#2a688f]" />
                          <Input
                            id="child-birth-date"
                            type="date"
                            value={birthDate}
                            onChange={(event) =>
                              setBirthDate(event.target.value)
                            }
                            className="h-11 bg-white pl-10"
                          />
                        </div>
                      </label>
                      <label
                        htmlFor="guardian-name"
                        className="grid gap-2 text-sm font-semibold"
                      >
                        Responsável principal *
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#2a688f]" />
                          <Input
                            id="guardian-name"
                            value={guardianName}
                            onChange={(event) =>
                              setGuardianName(event.target.value)
                            }
                            className="h-11 bg-white pl-10"
                            placeholder="Nome do responsável"
                            autoComplete="name"
                          />
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#2a688f]">
                        Contatos da família
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Cadastre pelo menos três pessoas que possam receber
                        comunicações sobre a inscrição.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {contacts.map((contact, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-[auto_1fr] gap-3 border-l-2 border-[#42b9eb] bg-[#f7f9fa] p-3"
                        >
                          <span className="self-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            Contato {index + 1}
                          </span>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <label
                              htmlFor={`contact-${index}-name`}
                              className="grid gap-1.5 text-xs font-semibold"
                            >
                              Nome *
                              <Input
                                id={`contact-${index}-name`}
                                value={contact.name}
                                onChange={(event) =>
                                  updateContact(
                                    index,
                                    'name',
                                    event.target.value,
                                  )
                                }
                                className="h-10 bg-white"
                                placeholder="Nome completo"
                              />
                            </label>
                            <label
                              htmlFor={`contact-${index}-relation`}
                              className="grid gap-1.5 text-xs font-semibold"
                            >
                              Vínculo *
                              <Input
                                id={`contact-${index}-relation`}
                                value={contact.relation}
                                onChange={(event) =>
                                  updateContact(
                                    index,
                                    'relation',
                                    event.target.value,
                                  )
                                }
                                className="h-10 bg-white"
                                placeholder="Ex.: mãe, pai, avó"
                              />
                            </label>
                            <label
                              htmlFor={`contact-${index}-phone`}
                              className="grid gap-1.5 text-xs font-semibold"
                            >
                              Telefone *
                              <div className="relative">
                                <Phone className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#2a688f]" />
                                <Input
                                  id={`contact-${index}-phone`}
                                  type="tel"
                                  value={contact.phone}
                                  onChange={(event) =>
                                    updateContact(
                                      index,
                                      'phone',
                                      event.target.value,
                                    )
                                  }
                                  className="h-10 bg-white pl-8"
                                  placeholder="(21) 99999-9999"
                                  autoComplete="tel"
                                />
                              </div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#2a688f]">
                      Locais para a busca
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {places.map((place, index) => (
                        <label
                          key={index}
                          className="grid gap-2 text-sm font-semibold"
                        >
                          Local {index === 0 ? 'A' : 'B'}
                          <div className="relative">
                            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#2a688f]" />
                            <Input
                              value={place}
                              onChange={(event) =>
                                setPlaces((current) =>
                                  index === 0
                                    ? [event.target.value, current[1]]
                                    : [current[0], event.target.value],
                                )
                              }
                              className="h-11 bg-white pl-10"
                              placeholder={
                                index === 0
                                  ? 'CEP ou bairro principal'
                                  : 'Segundo CEP ou bairro'
                              }
                              autoComplete="postal-code"
                            />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="h-11 w-full justify-between"
                    disabled={loading || !units.length}
                  >
                    <span className="flex items-center gap-2">
                      <Search />
                      {loading ? 'Calculando…' : 'Mostrar unidades próximas'}
                    </span>
                    {!loading && <ArrowRight />}
                  </Button>
                  <output
                    aria-live="polite"
                    className="block rounded-md bg-[#eceded] p-3 text-xs leading-relaxed text-muted-foreground"
                  >
                    {message}
                  </output>
                </form>
              </CardContent>
            </Card>
          </section>

          <section className="mt-8 flex items-start gap-3 rounded-lg border border-[#b8dff0] bg-[#eaf7fc] p-4 text-sm text-[#13335a]">
            <Info className="mt-0.5 size-4 shrink-0 text-[#2a688f]" />
            <p>
              <strong>Limite do protótipo:</strong> contagens históricas não
              representam vagas disponíveis hoje. Nenhum endereço informado sai
              desta sessão local.
            </p>
          </section>
        </div>
      )}

      {stage === 'selection' && (
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <section className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <button
                type="button"
                className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#2a688f] hover:underline"
                onClick={() => setStage('location')}
              >
                <ArrowLeft className="size-4" />
                Alterar localizações
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2a688f]">
                Preferências de unidade
              </p>
              <h1 className="brand-heading mt-2 text-2xl sm:text-3xl">
                Escolha até cinco unidades
                <span className="brand-title-triangle" aria-hidden="true" />
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Ordene as preferências selecionando as unidades. A ordem de
                clique será preservada no encaminhamento.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-white text-sm">
                {selected.length}/5 selecionadas
              </Badge>
              <Badge variant="secondary">Snapshot 2025</Badge>
            </div>
          </section>

          <div className="mb-5 flex items-start gap-3 rounded-lg border border-[#b8dff0] bg-[#eaf7fc] p-3 text-xs text-[#13335a]">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>
              {message} Distância e confirmações são apenas referências
              históricas.
            </p>
          </div>

          <section className="grid gap-5 xl:grid-cols-[minmax(380px,0.85fr)_minmax(580px,1.15fr)]">
            <Card className="self-start xl:sticky xl:top-4">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="size-4 text-[#2a688f]" />
                  Mapa de proximidade
                </CardTitle>
                <CardDescription>
                  Linhas conectam cada referência às cinco unidades mais
                  próximas.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <IntakeMap
                  origins={located}
                  schools={recommendations}
                  selected={selected}
                />
              </CardContent>
              <div className="flex flex-wrap gap-4 border-t px-4 py-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <i className="size-2.5 rounded-full bg-[#13335a]" />
                  Local A
                </span>
                <span className="flex items-center gap-2">
                  <i className="size-2.5 rounded-full bg-[#42b9eb]" />
                  Local B
                </span>
                <span className="flex items-center gap-2">
                  <i className="size-2.5 rounded-full border-2 border-white bg-[#2a688f] shadow-[0_0_0_1px_#2a688f]" />
                  Selecionada
                </span>
              </div>
            </Card>

            <div className="space-y-4">
              {[0, 1].map((origin) => (
                <Card key={origin}>
                  <CardHeader className="border-b">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'grid size-8 place-items-center bg-[#13335a] text-xs font-bold text-white',
                          origin === 1 && 'bg-[#2a688f]',
                        )}
                      >
                        {origin === 0 ? 'A' : 'B'}
                      </span>
                      <div>
                        <CardTitle>{located[origin]?.label}</CardTitle>
                        <CardDescription>
                          Cinco unidades mais próximas no snapshot
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {recommendations
                      .filter((unit) => unit.origin === origin)
                      .map((unit, index) => {
                        const checked = selected.includes(unit.code);
                        const disabled = !checked && selected.length >= 5;
                        const rank = selected.indexOf(unit.code) + 1;
                        return (
                          <label
                            key={`${origin}-${unit.code}`}
                            className={cn(
                              'grid cursor-pointer grid-cols-[22px_28px_minmax(0,1fr)] items-center gap-3 border-b py-3 last:border-0',
                              disabled && 'cursor-not-allowed opacity-45',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleUnit(unit.code)}
                              className="size-4 accent-[#13335a]"
                            />
                            <span
                              className={cn(
                                'grid size-7 place-items-center rounded-full bg-[#eceded] text-xs font-bold text-muted-foreground',
                                checked && 'bg-[#42b9eb] text-[#13335a]',
                              )}
                            >
                              {checked ? rank : index + 1}
                            </span>
                            <span className="min-w-0">
                              <strong className="block truncate text-sm">
                                {unit.name}
                              </strong>
                              <span className="mt-1 block text-xs font-medium text-[#2a688f]">
                                {unit.cre}ª CRE · {unit.bairro} ·{' '}
                                {unit.distance.toFixed(1).replace('.', ',')} km
                              </span>
                              <small className="mt-1 block truncate text-[11px] text-muted-foreground">
                                {unit.type} · código {unit.code} ·{' '}
                                {unit.confirmed} confirmações históricas
                              </small>
                            </span>
                          </label>
                        );
                      })}
                  </CardContent>
                </Card>
              ))}

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    Contexto da inscrição
                  </CardTitle>
                  <CardDescription>
                    Esses campos acompanham as preferências até a validação
                    operacional.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <label
                    htmlFor="intake-group"
                    className="grid gap-2 text-xs font-semibold"
                  >
                    Grupamento
                    <NativeSelect
                      id="intake-group"
                      value={group}
                      onChange={(event) => setGroup(event.target.value)}
                      aria-label="Selecionar grupamento"
                    >
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
                  </label>
                  <label
                    htmlFor="intake-shift"
                    className="grid gap-2 text-xs font-semibold"
                  >
                    Turno preferencial
                    <NativeSelect
                      id="intake-shift"
                      value={shift}
                      onChange={(event) => setShift(event.target.value)}
                      aria-label="Selecionar turno"
                    >
                      <NativeSelectOption value="Integral">
                        Integral
                      </NativeSelectOption>
                      <NativeSelectOption value="Manhã">
                        Manhã
                      </NativeSelectOption>
                      <NativeSelectOption value="Tarde">
                        Tarde
                      </NativeSelectOption>
                      <NativeSelectOption value="Flexível">
                        Flexível
                      </NativeSelectOption>
                    </NativeSelect>
                  </label>
                </CardContent>
              </Card>
            </div>
          </section>

          <div className="sticky bottom-3 z-20 mt-5 ml-auto flex w-full max-w-2xl flex-col gap-3 border border-border bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              <strong className="text-base text-foreground">
                {selected.length}
              </strong>{' '}
              preferências prontas para a entrevista
            </p>
            <Button
              size="lg"
              className="h-11 justify-between sm:min-w-64"
              disabled={!selected.length}
              onClick={startInterview}
            >
              <span className="flex items-center gap-2">
                <ClipboardCheck />
                Continuar para entrevista
              </span>
              <ArrowRight />
            </Button>
          </div>
        </div>
      )}

      {stage === 'interview' && (
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <section className="grid gap-5 lg:grid-cols-[minmax(300px,0.7fr)_minmax(0,1.3fr)]">
            <Card className="self-start">
              <CardHeader>
                <CardDescription>Contexto selecionado</CardDescription>
                <CardTitle>
                  {group} · {shift}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#2a688f]">
                    Preferências
                  </p>
                  <ol className="space-y-2">
                    {chosen.map((unit, index) => (
                      <li
                        key={unit.code}
                        className="flex gap-3 border-b pb-2 text-xs last:border-0"
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#eceded] font-bold">
                          {index + 1}
                        </span>
                        <span>
                          <strong className="block">{unit.name}</strong>
                          <span className="mt-1 block text-muted-foreground">
                            {unit.cre}ª CRE · {unit.bairro}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-md bg-[#eceded] p-3 text-xs text-muted-foreground">
                  <strong className="block text-foreground">
                    {answers.length} de {questions.length} respostas
                  </strong>
                  <span className="mt-1 block">
                    Pontuação parcial declarada: {score}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={previousQuestion}
                >
                  <ArrowLeft />
                  {questionIndex === 0
                    ? 'Voltar às preferências'
                    : 'Revisar resposta anterior'}
                </Button>
              </CardContent>
            </Card>

            <Card className="brand-dark-pattern min-h-[520px] border-[#13335a] text-white">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardDescription className="text-[#42b9eb]">
                      Critério {questionIndex + 1} de {questions.length} · régua
                      histórica de 2025
                    </CardDescription>
                    <CardTitle className="brand-heading mt-3 max-w-4xl text-2xl leading-tight text-white sm:text-3xl">
                      {currentQuestion.text}
                    </CardTitle>
                  </div>
                  <Badge className="shrink-0 bg-white/10 text-white">
                    {currentQuestion.points} pts
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-8">
                <div>
                  <Progress
                    value={((questionIndex + 1) / questions.length) * 100}
                    className="bg-white/15 [&_[data-slot=progress-indicator]]:bg-[#42b9eb]"
                  />
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    Responda Sim ou Não. A declaração só produzirá efeito após
                    validação documental conforme a regra vigente.
                  </p>
                </div>

                <div className="mx-auto grid w-full max-w-2xl gap-4 sm:grid-cols-2">
                  <Button
                    type="button"
                    size="lg"
                    className="h-24 border border-white/15 bg-white text-lg text-[#13335a] hover:bg-[#eceded]"
                    onClick={() => answerQuestion('yes')}
                  >
                    <CheckCircle2 className="size-5" />
                    Sim
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="h-24 border border-white/25 bg-white/5 text-lg text-white hover:bg-white/12 hover:text-white"
                    onClick={() => answerQuestion('no')}
                  >
                    <ArrowRight className="size-5" />
                    Não
                  </Button>
                </div>

                <div className="border-t border-white/15 pt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/25 bg-white/5 text-white hover:bg-white/12 hover:text-white"
                      onClick={listen}
                      disabled={listening}
                    >
                      <Mic />
                      {listening ? 'Ouvindo…' : 'Ouvir resposta'}
                    </Button>
                    <p className="min-w-0 flex-1 text-xs leading-relaxed text-white/60">
                      {voiceDraft ||
                        'O microfone é opcional e a transcrição não é armazenada no encaminhamento.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      )}

      {stage === 'review' && (
        <div className="mx-auto max-w-[1300px] px-4 py-8 sm:px-6 lg:px-8">
          <section className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2a688f]">
              Revisão e encaminhamento
            </p>
            <h1 className="brand-heading mt-2 text-3xl sm:text-4xl">
              Inscrição pronta para validação
              <span className="brand-title-triangle" aria-hidden="true" />
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Confira o resumo. O Fila Viva receberá este caso como pendente;
              não haverá classificação, oferta ou mudança na fila antes da
              validação humana.
            </p>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
            <div className="space-y-5">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    Preferências registradas
                  </CardTitle>
                  <CardDescription>
                    {group} · {shift} · ordem de escolha preservada
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {chosen.map((unit, index) => (
                    <div
                      key={unit.code}
                      className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b py-3 last:border-0"
                    >
                      <span className="grid size-8 place-items-center rounded-full bg-[#42b9eb] text-xs font-bold text-[#13335a]">
                        {index + 1}
                      </span>
                      <div>
                        <strong className="block text-sm">{unit.name}</strong>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {unit.cre}ª CRE · {unit.bairro} · código {unit.code}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#2a688f]">
                        {unit.distance.toFixed(1).replace('.', ',')} km
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="size-4 text-primary" />
                    Entrevista declaratória
                  </CardTitle>
                  <CardDescription>
                    Resumo técnico da régua histórica; respostas detalhadas
                    permanecem nesta sessão.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md bg-[#eceded] p-4">
                    <span className="text-xs text-muted-foreground">
                      Critérios avaliados
                    </span>
                    <strong className="brand-heading mt-1 block text-2xl">
                      {answers.length}
                    </strong>
                  </div>
                  <div className="rounded-md bg-[#eceded] p-4">
                    <span className="text-xs text-muted-foreground">
                      Respostas “Sim”
                    </span>
                    <strong className="brand-heading mt-1 block text-2xl">
                      {
                        answers.filter((answer) => answer.value === 'yes')
                          .length
                      }
                    </strong>
                  </div>
                  <div className="rounded-md bg-[#eceded] p-4">
                    <span className="text-xs text-muted-foreground">
                      Pontuação declarada
                    </span>
                    <strong className="brand-heading mt-1 block text-2xl">
                      {score}
                    </strong>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="grid size-11 place-items-center text-sm font-black text-white"
                    style={{ backgroundColor: cluster.color }}
                  >
                    {cluster.code}
                  </span>
                  <Badge variant="outline">faixa {cluster.range}</Badge>
                </div>
                <CardDescription>
                  Resultado declaratório de 2025
                </CardDescription>
                <CardTitle className="text-xl">{cluster.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-lg border border-[#b8dff0] bg-[#eaf7fc] p-4 text-xs leading-relaxed text-[#13335a]">
                  <div className="flex gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#2a688f]" />
                    <p>
                      <strong>Guardrail:</strong> esse resultado não será usado
                      como posição oficial. O Fila Viva abrirá uma pendência de
                      validação e registrará a origem do snapshot.
                    </p>
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs leading-relaxed">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-[#13335a]"
                  />
                  <span>
                    Estou ciente de que este é um teste local com dados
                    históricos anonimizados e que nenhuma inscrição real será
                    enviada.
                  </span>
                </label>
                <Button
                  size="lg"
                  className="h-12 w-full justify-between"
                  disabled={!acknowledged}
                  onClick={completeIntake}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles />
                    Acompanhar no Fila Viva
                  </span>
                  <ArrowRight />
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={reviseLastAnswer}
                >
                  <ArrowLeft />
                  Revisar entrevista
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={resetFlow}
                >
                  <RotateCcw />
                  Recomeçar fluxo
                </Button>
              </CardContent>
            </Card>
          </div>

          <footer className="mt-6 flex items-center justify-between border-t py-4 text-[11px] text-muted-foreground">
            <p>
              Fonte: CIT-SME-RJ · Unidades e inscrições anonimizadas de 2025
            </p>
            <div className="flex items-center gap-1.5">
              <Database className="size-3.5" />
              Contrato de handoff v1.0 · armazenamento de sessão
            </div>
          </footer>
        </div>
      )}
    </main>
  );
}
