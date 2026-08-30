'use client';

import { Fragment, useEffect } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';

export type IntakeMapPoint = {
  lat: number;
  lon: number;
  label?: string;
  origin?: number;
  code?: string;
  name?: string;
  distance?: number;
};

function FitMap({ points }: { points: IntakeMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(
      points.map((point) => [point.lat, point.lon] as [number, number]),
      { padding: [35, 35], maxZoom: 14 },
    );
  }, [map, points]);

  return null;
}

export default function IntakeMap({
  origins,
  schools,
  selected,
}: {
  origins: IntakeMapPoint[];
  schools: IntakeMapPoint[];
  selected: string[];
}) {
  const points = [...origins, ...schools];
  const colors = ['#13335a', '#42b9eb'];

  return (
    <MapContainer
      center={[-22.91, -43.2]}
      zoom={11}
      scrollWheelZoom
      className="intake-leaflet-map"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitMap points={points} />

      {origins.map((origin, index) => {
        const group = schools.filter((school) => school.origin === index);
        const radius = Math.max(
          300,
          ...group.map((school) => (school.distance ?? 0) * 1000),
        );
        return (
          <Circle
            key={`area-${index}`}
            center={[origin.lat, origin.lon]}
            radius={radius}
            pathOptions={{
              color: colors[index],
              fillColor: colors[index],
              fillOpacity: 0.06,
              weight: 2,
              dashArray: '7 7',
            }}
          />
        );
      })}

      {origins.map((origin, index) => (
        <CircleMarker
          key={`origin-${index}`}
          center={[origin.lat, origin.lon]}
          radius={9}
          pathOptions={{
            color: '#ffffff',
            weight: 3,
            fillColor: colors[index],
            fillOpacity: 1,
          }}
        >
          <Tooltip permanent direction="top">
            {index === 0 ? 'Local A' : 'Local B'}
          </Tooltip>
        </CircleMarker>
      ))}

      {schools.map((school) => {
        const originIndex = school.origin ?? 0;
        const origin = origins[originIndex];
        if (!origin) return null;
        const active = selected.includes(school.code ?? '');

        return (
          <Fragment key={`${originIndex}-${school.code}`}>
            <Polyline
              positions={[
                [origin.lat, origin.lon],
                [school.lat, school.lon],
              ]}
              pathOptions={{
                color: colors[originIndex],
                weight: active ? 3 : 1,
                opacity: active ? 0.85 : 0.25,
              }}
            />
            <CircleMarker
              center={[school.lat, school.lon]}
              radius={active ? 8 : 6}
              pathOptions={{
                color: active ? '#ffffff' : colors[originIndex],
                weight: active ? 3 : 2,
                fillColor: active ? '#2a688f' : colors[originIndex],
                fillOpacity: 1,
              }}
            >
              <Tooltip>{school.name}</Tooltip>
            </CircleMarker>
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
