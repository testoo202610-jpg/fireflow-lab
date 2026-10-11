import { z } from "zod";
const number = z.number().finite();
const id = z.string().regex(/^[A-Za-z0-9_-]{1,31}$/);
export const nodeSchema = z.object({
  id,
  name: z.string().max(100),
  type: z.enum(["reservoir", "tank", "junction", "demand", "gauge", "floor"]),
  elevation: number,
  demand: number,
  head: number,
  level: number,
  minLevel: number,
  maxLevel: number,
  tankDiameter: number,
  position: z.object({ x: number, y: number }),
  zone: z.string().max(100),
  fieldPressureBar: number.nullable(),
});
export const linkSchema = z.object({
  id,
  name: z.string().max(100),
  type: z.enum([
    "pipe",
    "pump",
    "prv",
    "zcv",
    "gate",
    "butterfly",
    "check",
    "isolation",
  ]),
  from: id,
  to: id,
  length: number,
  diameter: number,
  roughness: number,
  minorLoss: number,
  material: z.string().max(80),
  status: z.enum(["open", "closed"]),
  setting: number,
  curveId: id,
  ratedFlow: number,
  ratedHead: number,
  zone: z.string().max(100),
  flowMeter: z.boolean(),
  tamper: z.boolean(),
  flowSwitch: z.boolean(),
});
export const curveSchema = z.object({
  id,
  name: z.string().max(100),
  educational: z.boolean(),
  points: z.array(z.object({ flow: number, head: number })).max(200),
});
export const settingsSchema = z.object({
  headloss: z.enum(["H-W", "D-W"]),
  mode: z.enum(["static", "residual"]),
  pressureUnit: z.enum(["bar", "psi", "mH2O"]),
  flowUnit: z.enum(["L/s", "L/min", "m3/h"]),
  diameterUnit: z.enum(["mm", "inch"]),
  lowPressureBar: number,
  highPressureBar: number,
  frictionWarningM: number,
  labels: z.boolean(),
  demandModel: z.enum(["PDA", "DDA"]),
  requiredPressureM: number,
});
export const modelSchema = z.object({
  nodes: z.array(nodeSchema).max(3000),
  links: z.array(linkSchema).max(5000),
  pumpCurves: z.array(curveSchema).max(200),
  settings: settingsSchema,
});
const issueSchema = z.object({
  severity: z.enum(["warning", "error"]),
  code: z.string(),
  elementId: z.string().optional(),
  message: z.string(),
});
const resultSchema = z.object({
  id,
  createdAt: z.string(),
  engine: z.string(),
  status: z.enum(["calculated", "invalid", "solver_failed"]),
  signature: z.string(),
  input: modelSchema,
  issues: z.array(issueSchema),
  disconnected: z.array(z.string()),
  nodes: z.array(
    z.object({
      id: z.string(),
      headM: number,
      pressureM: number,
      demandLps: number,
    }),
  ),
  links: z.array(
    z.object({
      id: z.string(),
      flowLps: number,
      velocityMps: number,
      headlossM: number,
      status: number,
    }),
  ),
  iterations: number,
  relativeError: number,
  report: z.string(),
});
export const scenarioSchema = z.object({
  id,
  name: z.string().max(100),
  createdAt: z.string(),
  input: modelSchema,
  result: resultSchema.nullable(),
});
export const projectSchema = modelSchema.extend({
  schemaVersion: z.literal(1),
  id,
  name: z.string().min(1).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
  scenarios: z.array(scenarioSchema).max(100),
  lastResult: resultSchema.nullable(),
});
export type NetworkNode = z.infer<typeof nodeSchema>;
export type NetworkLink = z.infer<typeof linkSchema>;
export type PumpCurve = z.infer<typeof curveSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type HydraulicModel = z.infer<typeof modelSchema>;
export type SimulationResult = z.infer<typeof resultSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type Language = "ar" | "en";
export const newId = (prefix = "N") =>
  prefix + crypto.randomUUID().replaceAll("-", "").slice(0, 12);
export const defaultSettings: Settings = {
  headloss: "H-W",
  mode: "residual",
  pressureUnit: "bar",
  flowUnit: "L/s",
  diameterUnit: "mm",
  lowPressureBar: 2,
  highPressureBar: 12,
  frictionWarningM: 10,
  labels: true,
  demandModel: "PDA",
  requiredPressureM: 20,
};
export const makeNode = (
  type: NetworkNode["type"],
  position = { x: 0, y: 0 },
): NetworkNode => ({
  id: newId(),
  name: type,
  type,
  elevation: 0,
  demand: type === "demand" || type === "floor" ? 5 : 0,
  head: 10,
  level: 5,
  minLevel: 0,
  maxLevel: 10,
  tankDiameter: 10,
  position,
  zone: "",
  fieldPressureBar: null,
});
export const makeCurve = (): PumpCurve => ({
  id: newId("C"),
  name: "Educational curve / منحنى تعليمي",
  educational: true,
  points: [
    { flow: 0, head: 100 },
    { flow: 20, head: 85 },
    { flow: 40, head: 50 },
  ],
});
export const makeLink = (
  type: NetworkLink["type"],
  from: string,
  to: string,
  curveId = "Cdefault",
): NetworkLink => ({
  id: newId("L"),
  name: type,
  type,
  from,
  to,
  length: 10,
  diameter: 150,
  roughness: 120,
  minorLoss: type === "pipe" ? 0 : 1,
  material: "Steel",
  status: "open",
  setting: 50,
  curveId,
  ratedFlow: 20,
  ratedHead: 85,
  zone: "",
  flowMeter: false,
  tamper: true,
  flowSwitch: true,
});
export const modelOf = (p: HydraulicModel): HydraulicModel =>
  structuredClone({
    nodes: p.nodes,
    links: p.links,
    pumpCurves: p.pumpCurves,
    settings: p.settings,
  });
// Visual positions, labels, field measurements and display units do not affect hydraulics.
export function hydraulicSignature(m: HydraulicModel): string {
  return JSON.stringify({
    nodes: m.nodes.map(
      ({
        id,
        type,
        elevation,
        demand,
        head,
        level,
        minLevel,
        maxLevel,
        tankDiameter,
      }) => ({
        id,
        type,
        elevation,
        demand,
        head,
        level,
        minLevel,
        maxLevel,
        tankDiameter,
      }),
    ),
    links: m.links.map(
      ({
        id,
        type,
        from,
        to,
        length,
        diameter,
        roughness,
        minorLoss,
        status,
        setting,
        curveId,
        ratedFlow,
        ratedHead,
      }) => ({
        id,
        type,
        from,
        to,
        length,
        diameter,
        roughness,
        minorLoss,
        status,
        setting,
        curveId,
        ratedFlow,
        ratedHead,
      }),
    ),
    curves: m.pumpCurves.map(({ id, points }) => ({ id, points })),
    mode: m.settings.mode,
    headloss: m.settings.headloss,
    demandModel: m.settings.demandModel,
    requiredPressureM: m.settings.requiredPressureM,
    lowPressureBar: m.settings.lowPressureBar,
    highPressureBar: m.settings.highPressureBar,
    frictionWarningM: m.settings.frictionWarningM,
  });
}
