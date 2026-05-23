"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Tooltip,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type RoutePoint = { lat: number; lng: number };

export type LiveRideRider = {
  user_id: string;
  rider_name: string | null;
  rider_photo: string | null;
  lat: number;
  lng: number;
};

type RideMapProps = {
  lat: number;
  lng: number;
  meetPoint: string;
  route?: RoutePoint[];
  riders?: LiveRideRider[];
  editable?: boolean;
  height?: number;
  compact?: boolean;
  hideHint?: boolean;
  onMeetPointChange?: (point: RoutePoint) => void;
  onRouteChange?: (route: RoutePoint[]) => void;
};

const meetIcon = L.divIcon({
  html: `
    <div style="
      position: relative;
      width: 22px;
      height: 22px;
      border-radius: 9999px;
      background:
        radial-gradient(circle at 32% 30%, rgba(255,238,241,0.98) 0%, rgba(214,109,123,0.95) 18%, rgba(159,24,39,0.98) 52%, rgba(90,9,18,1) 100%);
      border: 2px solid rgba(244,240,234,0.98);
      box-shadow:
        0 0 0 7px rgba(127,17,27,0.18),
        0 10px 24px rgba(18,6,8,0.5),
        0 0 28px rgba(127,17,27,0.24),
        inset 0 1px 0 rgba(255,255,255,0.22);
    ">
      <div style="
        position: absolute;
        inset: 5px;
        border-radius: 9999px;
        border: 1px solid rgba(255,255,255,0.16);
      "></div>
    </div>
  `,
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function createRiderIcon(name?: string | null) {
  const initial = (name?.trim()?.charAt(0) || "R").toUpperCase();

  return L.divIcon({
    html: `
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        width:20px;
        height:20px;
        border-radius:9999px;
        background:linear-gradient(180deg, rgba(245,241,235,0.98), rgba(214,109,123,0.96));
        color:#25080c;
        font-size:10px;
        font-weight:700;
        border:1.5px solid rgba(127,17,27,0.72);
        box-shadow:
          0 0 0 5px rgba(127,17,27,0.16),
          0 8px 18px rgba(0,0,0,0.45);
      ">${initial}</div>
    `,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function FitToRoute({
  lat,
  lng,
  route,
  compact,
}: {
  lat: number;
  lng: number;
  route: RoutePoint[];
  compact: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (route.length > 1) {
      const bounds = L.latLngBounds(
        route.map((p) => [p.lat, p.lng] as [number, number])
      );
      map.fitBounds(bounds.pad(compact ? 0.12 : 0.18), { animate: true });
    } else {
      map.setView([lat, lng], compact ? 10 : 11, { animate: true });
    }
  }, [lat, lng, map, route, compact]);

  return null;
}

function EditableEvents({
  editable,
  route,
  onMeetPointChange,
  onRouteChange,
}: {
  editable: boolean;
  route: RoutePoint[];
  onMeetPointChange?: (point: RoutePoint) => void;
  onRouteChange?: (route: RoutePoint[]) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (!editable) return;

      const point = {
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      };

      if (route.length === 0) {
        onMeetPointChange?.(point);
        onRouteChange?.([point]);
        return;
      }

      onRouteChange?.([...route, point]);
    },
  });

  return null;
}

export default function RideMap({
  lat,
  lng,
  meetPoint,
  route = [],
  riders = [],
  editable = false,
  height = 320,
  compact = false,
  hideHint = false,
  onMeetPointChange,
  onRouteChange,
}: RideMapProps) {
  const displayRoute = route.length > 0 ? route : [{ lat, lng }];

  return (
    <div
      style={{ height }}
      className="group relative w-full overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[#090607] shadow-[0_24px_80px_-36px_rgba(0,0,0,0.95)]"
    >
      <div className="pointer-events-none absolute inset-0 z-[300] bg-[radial-gradient(ellipse_at_top,rgba(127,17,27,0.24),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 z-[301] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%,transparent_72%,rgba(0,0,0,0.18))]" />
      <div className="pointer-events-none absolute inset-0 z-[302] ring-1 ring-inset ring-[rgba(255,255,255,0.05)]" />
      <div className="pointer-events-none absolute inset-0 z-[303] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" />

      <MapContainer
        center={[lat, lng]}
        zoom={11}
        scrollWheelZoom={!compact}
        dragging={!compact || editable}
        doubleClickZoom={!compact}
        touchZoom={!compact || editable}
        boxZoom={false}
        keyboard={!compact}
        zoomControl={false}
        attributionControl={!compact}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitToRoute lat={lat} lng={lng} route={displayRoute} compact={compact} />

        <EditableEvents
          editable={editable}
          route={route}
          onMeetPointChange={onMeetPointChange}
          onRouteChange={onRouteChange}
        />

        <Marker position={[lat, lng]} icon={meetIcon}>
          {!compact && (
            <Tooltip direction="top" offset={[0, -14]} opacity={1} permanent={false}>
              {meetPoint || "Meet point"}
            </Tooltip>
          )}
        </Marker>

        {riders.map((rider) => (
          <Marker
            key={rider.user_id}
            position={[rider.lat, rider.lng]}
            icon={createRiderIcon(rider.rider_name)}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={1} permanent={false}>
              {rider.rider_name || "Rider"}
            </Tooltip>
          </Marker>
        ))}

        {displayRoute.length > 1 && (
          <>
            <Polyline
              positions={displayRoute.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: "#4f0710",
                weight: compact ? 8 : 9,
                opacity: 0.46,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={displayRoute.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: "#7f111b",
                weight: compact ? 6 : 7,
                opacity: 0.96,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={displayRoute.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: "#bf3242",
                weight: compact ? 3.5 : 4,
                opacity: 0.92,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={displayRoute.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: "#f3d7db",
                weight: compact ? 1.2 : 1.5,
                opacity: 0.38,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}
      </MapContainer>

      {editable && !hideHint && (
        <div className="pointer-events-none absolute left-4 top-4 z-[400] rounded-full border border-[rgba(127,17,27,0.28)] bg-[linear-gradient(180deg,rgba(20,9,11,0.94),rgba(10,6,7,0.9))] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-100 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.95)] backdrop-blur-md">
          Click to place the route
        </div>
      )}

      {!compact && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-full border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(24,11,13,0.92),rgba(10,6,7,0.88))] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-200 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.95)] backdrop-blur-md">
          {editable ? "Route authoring" : "Route preview"}
        </div>
      )}

      {!compact && displayRoute.length > 1 && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-[400] rounded-full border border-[rgba(127,17,27,0.22)] bg-[linear-gradient(180deg,rgba(24,11,13,0.92),rgba(10,6,7,0.88))] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f1d8db] shadow-[0_14px_30px_-18px_rgba(0,0,0,0.95)] backdrop-blur-md">
          {displayRoute.length} points plotted
        </div>
      )}

      <style jsx global>{`
        .leaflet-container {
          background:
            radial-gradient(circle at top, rgba(127, 17, 27, 0.22), transparent 40%),
            linear-gradient(180deg, #090607 0%, #080506 100%);
          font-family: inherit;
        }

        .leaflet-pane,
        .leaflet-top,
        .leaflet-bottom {
          z-index: auto;
        }

        .leaflet-tile-pane {
          opacity: 0.94;
        }

        .leaflet-tile {
          filter:
            saturate(0.42)
            hue-rotate(-10deg)
            brightness(0.58)
            contrast(1.08)
            sepia(0.18);
        }

        .leaflet-control-attribution {
          background: linear-gradient(
            180deg,
            rgba(22, 10, 12, 0.9),
            rgba(10, 6, 7, 0.88)
          ) !important;
          color: rgba(244, 240, 234, 0.72) !important;
          border-top-left-radius: 14px;
          border: 1px solid rgba(127, 17, 27, 0.18);
          backdrop-filter: blur(10px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.24);
          padding: 5px 9px !important;
        }

        .leaflet-control-attribution a {
          color: rgba(244, 209, 214, 0.94) !important;
        }

        .leaflet-tooltip {
          background: linear-gradient(
            180deg,
            rgba(24, 11, 13, 0.98),
            rgba(10, 6, 7, 0.98)
          );
          color: #f4f0ea;
          border: 1px solid rgba(127, 17, 27, 0.3);
          border-radius: 9999px;
          box-shadow:
            0 14px 28px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          padding: 7px 11px;
          letter-spacing: 0.03em;
          font-size: 11px;
          text-transform: uppercase;
        }

        .leaflet-tooltip-top:before {
          border-top-color: rgba(18, 8, 10, 0.98) !important;
        }

        .leaflet-interactive:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}