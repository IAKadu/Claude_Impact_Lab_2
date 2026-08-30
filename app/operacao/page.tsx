'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CircleAlert, LayoutDashboard } from 'lucide-react';

import { FilaVivaDashboard } from '../fila-viva-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { readIntakeCase, type IntakeCase } from '@/lib/intake-contract';

type BootstrapState =
  | { status: 'loading'; intake: null }
  | { status: 'ready'; intake: IntakeCase | null }
  | { status: 'missing'; intake: null };

export default function OperationPage() {
  const [bootstrap, setBootstrap] = useState<BootstrapState>({
    status: 'loading',
    intake: null,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const intakeId = new URLSearchParams(window.location.search).get(
        'intake',
      );
      if (!intakeId) {
        setBootstrap({ status: 'ready', intake: null });
        return;
      }

      const intake = readIntakeCase(intakeId);
      setBootstrap(
        intake
          ? { status: 'ready', intake }
          : { status: 'missing', intake: null },
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (bootstrap.status === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <div className="text-center">
          <span
            className="brand-product-mark mx-auto block"
            aria-hidden="true"
          />
          <p className="mt-4 text-sm text-muted-foreground">
            Carregando o contexto da inscrição…
          </p>
        </div>
      </main>
    );
  }

  if (bootstrap.status === 'missing') {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <Card className="w-full max-w-lg border-primary/20">
          <CardHeader>
            <span className="mb-3 grid size-11 place-items-center rounded-md bg-[#eaf7fc] text-[#2a688f]">
              <CircleAlert className="size-5" />
            </span>
            <CardTitle className="text-xl">
              Contexto de inscrição não encontrado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              O identificador pode ter expirado ao fechar a aba. O protótipo
              mantém o caso somente durante esta sessão local.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => window.location.assign('/')}
              >
                <ArrowLeft /> Voltar à inscrição
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setBootstrap({ status: 'ready', intake: null })}
              >
                <LayoutDashboard /> Abrir demonstração
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <FilaVivaDashboard
      intake={bootstrap.intake}
      onBack={() => window.location.assign('/')}
    />
  );
}
