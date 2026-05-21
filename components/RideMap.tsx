"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import type { DivIcon } from "leaflet";

export default function RideMap({
  lat,
  lng,
  meetPoint,
}: {
  lat: number;
  lng: number;
  meetPoint: string;
}) {
  // Build the crimson pin only on the client (Leaflet touches `window`)
  const crimsonIcon = useMemo<DivIcon | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");

    return new L.DivIcon({
      className: "",
      html: `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          background: #b4141e;
          transform: rotate(-45deg);
          border: 2px solid #e87a82;
          box-shadow: 0 0 18px rgba(180,20,30,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #050505;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
  }, []);

  // Patch Leaflet's default icon path (only client-side)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
  }, []);

  if (!crimsonIcon) {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]"
        style={{ height: "280px", width: "100%" }}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "280px", width: "100%", background: "#0a0a0a" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[lat, lng]} icon={crimsonIcon}>
          <Popup>{meetPoint}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}