'use client';

import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';

export type OtimizadorUnit = {
  esc_codigo: number;
  nome: string;
  cre: number;
  bairro: string | null;
  lat: number;
  lon: number;
  coord_aproximada: boolean;
  fila_espera: number;
  vagas_ociosas: number;
  capacidade_conhecida: boolean;
  descompasso: boolean;
  status: 'ok' | 'deficit' | 'desconhecida';
};

const STATUS_COLOR: Record<OtimizadorUnit['status'], string> = {
  ok: '#0f9960',
  deficit: '#dc2626',
  desconhecida: '#2563eb',
};

function radius(fila: number) {
  return Math.max(5, Math.min(24, 5 + Math.sqrt(fila) * 1.3));
}

function FitBounds({ units }: { units: OtimizadorUnit[] }) {
  const map = useMap();

  useEffect(() => {
    if (!units.length) return;
    map.fitBounds(
      units.map((unit) => [unit.lat, unit.lon] as [number, number]),
      { padding: [30, 30], maxZoom: 15 },
    );
  }, [map, units]);

  return null;
}

export default function OtimizadorMap({ units }: { units: OtimizadorUnit[] }) {
  return (
    <MapContainer
      center={[-22.91, -43.35]}
      zoom={11}
      scrollWheelZoom
      className="otimizador-leaflet-map"
      preferCanvas
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds units={units} />
      {units.map((unit) => (
        <CircleMarker
          key={unit.esc_codigo}
          center={[unit.lat, unit.lon]}
          radius={radius(unit.fila_espera)}
          pathOptions={{
            color: 'rgba(0,0,0,.3)',
            weight: 1.5,
            dashArray: unit.status === 'desconhecida' ? '3,2' : undefined,
            fillColor: STATUS_COLOR[unit.status],
            fillOpacity: unit.coord_aproximada ? 0.45 : 0.8,
          }}
        >
          <Popup>
            <strong>{unit.nome}</strong>
            <br />
            CRE {unit.cre} · {unit.bairro || 'bairro n/d'}
            <br />
            Fila de espera: {unit.fila_espera.toLocaleString('pt-BR')} · Vaga
            ociosa:{' '}
            {unit.capacidade_conhecida
              ? unit.vagas_ociosas.toLocaleString('pt-BR')
              : 'desconhecida'}
            {unit.coord_aproximada && (
              <>
                <br />
                <em>Localização aproximada (centro do bairro)</em>
              </>
            )}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
