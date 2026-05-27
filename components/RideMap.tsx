"use client";
import { useEffect, useRef, useState } from "react";
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

type Waypoint = { id: string; label: string; lat: number; lng: number };

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
  interactive?: boolean;
  showDestination?: boolean;
  showWaypoints?: boolean;
  waypoints?: Waypoint[];
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
        radial-gradient(circle at 32% 30%, rgba(255,238,241,0.98) 0%, rgba(214,109,123,0.95) 18%, rgba(159,24,39,0.98) 52%);
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

const destIcon = L.divIcon({
  html: `
    <div style="
      position: relative;
      width: 26px;
      height: 26px;
      border-radius: 9999px;
      background: radial-gradient(circle at 32% 30%, rgba(255,248,220,0.98) 0%, rgba(255,200,80,0.95) 20%, rgba(200,130,0,0.98) 55%);
      border: 2px solid rgba(255,240,180,0.98);
      box-shadow:
        0 0 0 6px rgba(180,120,0,0.18),
        0 8px 20px rgba(10,6,0,0.5),
        0 0 22px rgba(180,130,0,0.28),
        inset 0 1px 0 rgba(255,255,255,0.28);
    ">
      <div style="
        position: absolute;
        inset: 6px;
        border-radius: 9999px;
        border: 1px solid rgba(255,255,255,0.2);
      "></div>
    </div>
  `,
  className: "",
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function createWaypointIcon(label: string) {
  return L.divIcon({
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 9999px;
        background: rgba(22,10,12,0.92);
        border: 1.5px solid rgba(127,17,27,0.6);
        box-shadow: 0 0 0 4px rgba(127,17,27,0.12), 0 4px 12px rgba(0,0,0,0.4);
        color: rgba(244,209,214,0.9);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.04em;
        font-family: inherit;
        text-transform: uppercase;
      ">${label.slice(0, 2)}</div>
    `,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function createRiderIcon(name?: string | null) {
  const initial = (name?.trim()?.charAt(0) || "R").toUpperCase();
  return L.divIcon({
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 9999px;
        background: linear-gradient(135deg, rgba(40,14,17,0.98), rgba(22,8,10,0.98));
        border: 1.5px solid rgba(159,24,39,0.7);
        box-shadow: 0 0 0 4px rgba(127,17,27,0.16), 0 4px 12px rgba(0,0,0,0.42);
        color: rgba(244,209,214,0.94);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.04em;
        font-family: inherit;
      ">${initial}</div>
    `,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function MobileTouchFix({ interactive }: { interactive: boolean }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.style.touchAction = interactive ? "none" : "auto";
    const t = setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 350);
    return () => clearTimeout(t);
  }, [map, interactive]);
  return null;
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
  const fitted = useRef(false);
  useEffect(() => {
    if (route.length > 1) {
      const bounds = L.latLngBounds(
        route.map((p) => [p.lat, p.lng] as [number, number])
      );
      map.fitBounds(bounds.pad(compact ? 0.12 : 0.18), { animate: false });
      fitted.current = true;
    } else if (!fitted.current) {
      map.setView([lat, lng], compact ? 10 : 11, { animate: false });
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
  interactive = true,
  showDestination = false,
  showWaypoints = false,
  waypoints = [],
  onMeetPointChange,
  onRouteChange,
}: RideMapProps) {
  const [mapKey] = useState(() => Math.random().toString(36).slice(2));
  const displayRoute = route.length > 0 ? route : [{ lat, lng }];
  const destination = displayRoute[displayRoute.length - 1];
  const hasMultiplePoints = displayRoute.length > 1;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: compact ? "100%" : height,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        borderRadius: compact ? 0 : 16,
        overflow: "hidden",
      }}
    >
      <MapContainer
        key={mapKey}
        center={[lat, lng]}
        zoom={compact ? 10 : 11}
        style={{ width: "100%", height: "100%" }}
        zoomControl={!compact}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        scrollWheelZoom={interactive}
        attributionControl={!compact}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        <MobileTouchFix interactive={interactive} />
        <FitToRoute lat={lat} lng={lng} route={displayRoute} compact={compact} />
        <EditableEvents
          editable={editable}
          route={route}
          onMeetPointChange={onMeetPointChange}
          onRouteChange={onRouteChange}
        />

        {!compact && (
          <Marker position={[lat, lng]} icon={meetIcon}>
            <Tooltip direction="top" offset={[0, -14]} opacity={1} permanent={false}>
              {meetPoint || "Meet point"}
            </Tooltip>
          </Marker>
        )}

        {showDestination && hasMultiplePoints && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Tooltip direction="top" offset={[0, -16]} opacity={1}>
              Destination
            </Tooltip>
          </Marker>
        )}

        {showWaypoints &&
          waypoints.map((wp) => (
            <Marker
              key={wp.id}
              position={[wp.lat, wp.lng]}
              icon={createWaypointIcon(wp.label)}
            >
              <Tooltip direction="top" offset={[0, -13]} opacity={1}>
                {wp.label}
              </Tooltip>
            </Marker>
          ))}

        {riders.map((rider) => (
          <Marker
            key={rider.user_id}
            position={[rider.lat, rider.lng]}
            icon={createRiderIcon(rider.rider_name)}
          >
            <Tooltip direction="top" offset={[0, -13]} opacity={1}>
              {rider.rider_name || "Rider"}
            </Tooltip>
          </Marker>
        ))}

        {hasMultiplePoints && (
          <>
            <Polyline
              positions={displayRoute.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: "#4f0710", weight: compact ? 8 : 9, opacity: 0.46, lineCap: "round", lineJoin: "round" }}
            />
            <Polyline
              positions={displayRoute.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: "#7f111b", weight: compact ? 6 : 7, opacity: 0.96, lineCap: "round", lineJoin: "round" }}
            />
            <Polyline
              positions={displayRoute.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: "#bf3242", weight: compact ? 3.5 : 4, opacity: 0.92, lineCap: "round", lineJoin: "round" }}
            />
            <Polyline
              positions={displayRoute.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: "#f3d7db", weight: compact ? 1.2 : 1.5, opacity: 0.38, lineCap: "round", lineJoin: "round" }}
            />
          </>
        )}
      </MapContainer>

      {editable && !hideHint && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 500,
            pointerEvents: "none",
            background: "rgba(10,5,6,0.82)",
            border: "1px solid rgba(127,17,27,0.28)",
            borderRadius: 9999,
            padding: "6px 14px",
            color: "rgba(244,209,214,0.82)",
            fontSize: 11,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            backdropFilter: "blur(8px)",
            whiteSpace: "nowrap",
          }}
        >
          Click to place the route
        </div>
      )}

      {!compact && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 500,
            pointerEvents: "none",
            background: "rgba(10,5,6,0.82)",
            border: "1px solid rgba(127,17,27,0.22)",
            borderRadius: 9999,
            padding: "4px 10px",
            color: "rgba(244,209,214,0.7)",
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            backdropFilter: "blur(8px)",
          }}
        >
          {editable ? "Route authoring" : "Route preview"}
        </div>
      )}

      {!compact && hasMultiplePoints && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 500,
            pointerEvents: "none",
            background: "rgba(10,5,6,0.82)",
            border: "1px solid rgba(127,17,27,0.22)",
            borderRadius: 9999,
            padding: "4px 10px",
            color: "rgba(244,209,214,0.7)",
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            backdropFilter: "blur(8px)",
          }}
        >
          {displayRoute.length} points plotted
        </div>
      )}

      <style>{`
        .leaflet-container {
          background: radial-gradient(circle at top, rgba(127,17,27,0.22), transparent 40%),
            linear-gradient(180deg, #090607 0%, #080506 100%);
          font-family: inherit;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .leaflet-pane, .leaflet-top, .leaflet-bottom { z-index: auto; }
        .leaflet-tile-pane { opacity: 0.94; }
        .leaflet-tile {
          filter: saturate(0.42) hue-rotate(-10deg) brightness(0.58) contrast(1.08) sepia(0.18);
        }
        .leaflet-control-attribution {
          background: linear-gradient(180deg, rgba(22,10,12,0.9), rgba(10,6,7,0.88)) !important;
          color: rgba(244,240,234,0.72) !important;
          border-top-left-radius: 14px;
          border: 1px solid rgba(127,17,27,0.18);
          backdrop-filter: blur(10px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.24);
          padding: 5px 9px !important;
        }
        .leaflet-control-attribution a { color: rgba(244,209,214,0.94) !important; }
        .leaflet-tooltip {
          background: linear-gradient(180deg, rgba(24,11,13,0.98), rgba(10,6,7,0.98));
          color: #f4f0ea;
          border: 1px solid rgba(127,17,27,0.3);
          border-radius: 9999px;
          box-shadow: 0 14px 28px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04);
          padding: 7px 11px;
          letter-spacing: 0.03em;
          font-size: 11px;
          text-transform: uppercase;
        }
        .leaflet-tooltip-top:before { border-top-color: rgba(18,8,10,0.98) !important; }
        .leaflet-interactive:focus { outline: none; }
      `}</style>
    </div>
  );
}
