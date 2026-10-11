import type { Settings } from "../../types/network";
export const METERS_PER_BAR = 100000 / (1000 * 9.80665);
export const PA_PER_PSI = 6894.757293168;
export function pressureFromM(
  m: number,
  unit: Settings["pressureUnit"],
): number {
  return unit === "bar"
    ? m / METERS_PER_BAR
    : unit === "psi"
      ? (m * 9806.65) / PA_PER_PSI
      : m;
}
export function pressureToM(
  value: number,
  unit: Settings["pressureUnit"],
): number {
  return unit === "bar"
    ? value * METERS_PER_BAR
    : unit === "psi"
      ? (value * PA_PER_PSI) / 9806.65
      : value;
}
export function flowFromLps(q: number, unit: Settings["flowUnit"]): number {
  return unit === "L/min" ? q * 60 : unit === "m3/h" ? q * 3.6 : q;
}
export function flowToLps(q: number, unit: Settings["flowUnit"]): number {
  return unit === "L/min" ? q / 60 : unit === "m3/h" ? q / 3.6 : q;
}
export function diameterFromMm(
  d: number,
  unit: Settings["diameterUnit"],
): number {
  return unit === "inch" ? d / 25.4 : d;
}
export function diameterToMm(
  d: number,
  unit: Settings["diameterUnit"],
): number {
  return unit === "inch" ? d * 25.4 : d;
}
export const pressureAtElevation = (headM: number, elevationM: number) =>
  headM - elevationM;
export const format = (n: number, digits = 2) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      })
    : "—";
