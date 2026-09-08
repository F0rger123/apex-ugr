export type SpeedUnit = "mph" | "kph";
export type StoredSpeedUnit = "MPH" | "KMH";

const MPH_PER_KPH = 0.621371;
const MILES_PER_KM = 0.621371;

export function normalizeSpeedUnit(value: unknown): SpeedUnit {
  const text = String(value || "").trim().toLowerCase();
  return text === "kph" || text === "kmh" || text === "km/h" ? "kph" : "mph";
}

export function toStoredSpeedUnit(unit: SpeedUnit): StoredSpeedUnit {
  return unit === "kph" ? "KMH" : "MPH";
}

export function speedFromKph(kph: number, unit: SpeedUnit): number {
  const value = Number.isFinite(kph) ? kph : 0;
  return unit === "mph" ? value * MPH_PER_KPH : value;
}

export function distanceFromKm(km: number, unit: SpeedUnit): number {
  const value = Number.isFinite(km) ? km : 0;
  return unit === "mph" ? value * MILES_PER_KM : value;
}

export function unitLabel(unit: SpeedUnit): "MPH" | "KPH" {
  return unit === "kph" ? "KPH" : "MPH";
}

export function distanceUnitLabel(unit: SpeedUnit): "MI" | "KM" {
  return unit === "kph" ? "KM" : "MI";
}

export function formatSpeed(kph: number, unit: SpeedUnit, digits = 0): string {
  return `${speedFromKph(kph, unit).toFixed(digits)} ${unitLabel(unit)}`;
}

export function formatDistance(km: number, unit: SpeedUnit, compact = false): string {
  if (unit === "mph") {
    if (km < 0.32) return `${Math.max(50, Math.round(km * 3280.84 / 50) * 50)} FT`;
    const miles = distanceFromKm(km, unit);
    return `${miles.toFixed(miles < 10 && !compact ? 1 : 0)} MI`;
  }
  if (km < 1 && !compact) return `${Math.max(25, Math.round(km * 1000 / 25) * 25)} M`;
  return `${km.toFixed(km < 10 && !compact ? 1 : 0)} KM`;
}
