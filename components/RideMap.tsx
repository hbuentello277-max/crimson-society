"use client";
import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
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
  rider_username?: string | null;
  rider_display_name?: string | null;
  rider_photo: string | null;
  lat: number;
  lng: number;
  distance_label?: string | null;
  last_updated_label?: string | null;
  profile_href?: string | null;
};

type Waypoint = { id: string; label: string; lat: number; lng: number };

type RideMapProps = {
  lat: number;
  lng: number;
  meetPoint: string;
  route?: RoutePoint[];
  riders?: LiveRideRider[];
  selfLocation?: RoutePoint | null;
  selfRider?: LiveRideRider | null;
  showSelfMarker?: boolean;
  editable?: boolean;
  height?: number;
  compact?: boolean;
  hideHint?: boolean;
  interactive?: boolean;
  showMeetMarker?: boolean;
  showDestination?: boolean;
  showWaypoints?: boolean;
  recenterSignal?: number;
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createRiderIcon(name?: string | null, photo?: string | null) {
  const initial = (name?.trim()?.charAt(0) || "R").toUpperCase();
  const safeName = escapeHtml(name?.trim() || "Rider");
  const safePhoto = photo?.trim() ? escapeHtml(photo.trim()) : null;

  return L.divIcon({
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 112px;
        filter: drop-shadow(0 12px 24px rgba(0,0,0,0.62));
      ">
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 43px;
          height: 43px;
          border-radius: 9999px;
          background: linear-gradient(135deg, rgba(40,14,17,0.98), rgba(22,8,10,0.98));
          border: 3px solid rgba(180,20,30,0.98);
          box-shadow:
            0 0 0 2px rgba(244,209,214,0.95),
            0 0 0 8px rgba(180,20,30,0.2),
            0 0 26px rgba(180,20,30,0.46),
            0 13px 28px rgba(0,0,0,0.64);
          color: rgba(244,209,214,0.94);
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.04em;
          font-family: inherit;
          overflow: hidden;
        ">${
          safePhoto
            ? `<img src="${safePhoto}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
            : escapeHtml(initial)
        }</div>
        <div style="
          margin-top: 6px;
          max-width: 108px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 9999px;
          background: rgba(5,4,5,0.82);
          padding: 5px 9px;
          color: rgba(255,245,246,0.96);
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0.01em;
          backdrop-filter: blur(10px);
        ">${safeName}</div>
      </div>
    `,
    className: "",
    iconSize: [112, 72],
    iconAnchor: [56, 22],
    popupAnchor: [0, -24],
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
      fitted.current = true;
    }
  }, [lat, lng, map, route, compact]);
  return null;
}

function RecenterSelfLocation({
  selfLocation,
  recenterSignal,
}: {
  selfLocation?: RoutePoint | null;
  recenterSignal?: number;
}) {
  const map = useMap();
  const centeredOnSelf = useRef(false);
  const lastRecenterSignal = useRef(0);

  useEffect(() => {
    if (!selfLocation || centeredOnSelf.current) return;

    map.setView([selfLocation.lat, selfLocation.lng], Math.max(map.getZoom(), 13), {
      animate: true,
    });
    centeredOnSelf.current = true;
  }, [map, selfLocation]);

  useEffect(() => {
    if (!selfLocation || !recenterSignal || recenterSignal === lastRecenterSignal.current) return;

    map.setView([selfLocation.lat, selfLocation.lng], Math.max(map.getZoom(), 13), {
      animate: true,
    });
    lastRecenterSignal.current = recenterSignal;
  }, [map, recenterSignal, selfLocation]);

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
  selfLocation = null,
  selfRider = null,
  showSelfMarker = true,
  editable = false,
  height = 320,
  compact = false,
  hideHint = false,
  interactive = true,
  showMeetMarker = true,
  showDestination = false,
  showWaypoints = false,
  recenterSignal = 0,
  waypoints = [],
  onMeetPointChange,
  onRouteChange,
}: RideMapProps) {
  const [mapKey] = useState(() => Math.random().toString(36).slice(2));
  const displayRoute = route.length > 0 ? route : [{ lat, lng }];
  const destination = displayRoute[displayRoute.length - 1];
  const hasMultiplePoints = displayRoute.length > 1;
  const selfMarker = selfLocation
    ? {
        user_id: selfRider?.user_id || "current-user",
        rider_name: selfRider?.rider_name || selfRider?.rider_display_name || "You",
        rider_username: selfRider?.rider_username || null,
        rider_display_name: selfRider?.rider_display_name || selfRider?.rider_name || "You",
        rider_photo: selfRider?.rider_photo || null,
        lat: selfLocation.lat,
        lng: selfLocation.lng,
        distance_label: "You are here",
        last_updated_label: selfRider?.last_updated_label || "Current GPS location",
        profile_href: selfRider?.profile_href || null,
      }
    : null;
  const displayedRiders =
    selfMarker && selfMarker.user_id
      ? riders.filter((rider) => rider.user_id !== selfMarker.user_id)
      : riders;

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
        <RecenterSelfLocation
          selfLocation={selfLocation}
          recenterSignal={recenterSignal}
        />
        <EditableEvents
          editable={editable}
          route={route}
          onMeetPointChange={onMeetPointChange}
          onRouteChange={onRouteChange}
        />

        {showMeetMarker && !compact && (
          <Marker position={[lat, lng]} icon={meetIcon}>
            <Tooltip direction="top" offset={[0, -14]} opacity={1} permanent={false}>
              {meetPoint || "Meet point"}
            </Tooltip>
          </Marker>
        )}

        {showSelfMarker && selfMarker && (
          <Marker
            position={[selfMarker.lat, selfMarker.lng]}
            icon={createRiderIcon(selfMarker.rider_name, selfMarker.rider_photo)}
          >
            <Popup>
              <div style={{ minWidth: 190, color: "#171112" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 44,
                      height: 44,
                      borderRadius: 9999,
                      overflow: "hidden",
                      background: "#160709",
                      border: "2px solid #b4141e",
                      color: "#f1c3c7",
                      fontWeight: 800,
                    }}
                  >
                    {selfMarker.rider_photo ? (
                      <img
                        src={selfMarker.rider_photo}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      (selfMarker.rider_name?.trim().charAt(0) || "Y").toUpperCase()
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 14 }}>
                      {selfMarker.rider_display_name || selfMarker.rider_name || "You"}
                    </strong>
                    <span style={{ display: "block", color: "#6f6265", fontSize: 12 }}>
                      {selfMarker.rider_username ? `@${selfMarker.rider_username}` : "Current location"}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 4, fontSize: 12 }}>
                  <span>You are here</span>
                  <span style={{ color: "#6f6265" }}>
                    {selfMarker.last_updated_label || "Current GPS location"}
                  </span>
                </div>

                {selfMarker.profile_href && (
                  <a
                    href={selfMarker.profile_href}
                    style={{
                      display: "block",
                      marginTop: 12,
                      borderRadius: 9999,
                      background: "#b4141e",
                      padding: "8px 12px",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textAlign: "center",
                      textDecoration: "none",
                      textTransform: "uppercase",
                    }}
                  >
                    View Profile
                  </a>
                )}
              </div>
            </Popup>
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

        {displayedRiders.map((rider) => (
          <Marker
            key={rider.user_id}
            position={[rider.lat, rider.lng]}
            icon={createRiderIcon(rider.rider_name, rider.rider_photo)}
          >
            <Popup>
              <div style={{ minWidth: 190, color: "#171112" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 44,
                      height: 44,
                      borderRadius: 9999,
                      overflow: "hidden",
                      background: "#160709",
                      border: "2px solid #b4141e",
                      color: "#f1c3c7",
                      fontWeight: 800,
                    }}
                  >
                    {rider.rider_photo ? (
                      <img
                        src={rider.rider_photo}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      (rider.rider_name?.trim().charAt(0) || "R").toUpperCase()
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 14 }}>
                      {rider.rider_display_name || rider.rider_name || "Crimson rider"}
                    </strong>
                    <span style={{ display: "block", color: "#6f6265", fontSize: 12 }}>
                      {rider.rider_username ? `@${rider.rider_username}` : "Crimson Society"}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 4, fontSize: 12 }}>
                  <span>{rider.distance_label || "Distance unavailable"}</span>
                  <span style={{ color: "#6f6265" }}>
                    {rider.last_updated_label || "Live location active"}
                  </span>
                </div>

                {rider.profile_href && (
                  <a
                    href={rider.profile_href}
                    style={{
                      display: "block",
                      marginTop: 12,
                      borderRadius: 9999,
                      background: "#b4141e",
                      padding: "8px 12px",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textAlign: "center",
                      textDecoration: "none",
                      textTransform: "uppercase",
                    }}
                  >
                    View Profile
                  </a>
                )}
              </div>
            </Popup>
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
