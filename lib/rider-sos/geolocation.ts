export type GeolocationResult =
  | {
      ok: true;
      latitude: number;
      longitude: number;
      accuracy: number | null;
    }
  | {
      ok: false;
      code: "unsupported" | "denied" | "unavailable" | "timeout" | "unknown";
      message: string;
    };

export async function requestCurrentPosition(timeoutMs = 12000): Promise<GeolocationResult> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return {
      ok: false,
      code: "unsupported",
      message: "Location is not supported in this browser.",
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({
            ok: false,
            code: "denied",
            message: "Location permission was denied. You can still send SOS without GPS.",
          });
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          resolve({
            ok: false,
            code: "unavailable",
            message: "Location is unavailable right now. You can still send SOS without GPS.",
          });
          return;
        }

        if (error.code === error.TIMEOUT) {
          resolve({
            ok: false,
            code: "timeout",
            message: "Location timed out. You can still send SOS without GPS.",
          });
          return;
        }

        resolve({
          ok: false,
          code: "unknown",
          message: "Could not read your location. You can still send SOS without GPS.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      },
    );
  });
}
