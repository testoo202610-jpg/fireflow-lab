import {
  modelOf,
  newId,
  type HydraulicModel,
  type Scenario,
  type SimulationResult,
} from "../../types/network";
export function snapshotScenario(
  name: string,
  input: HydraulicModel,
  result: SimulationResult | null,
): Scenario {
  return {
    id: newId("S"),
    name,
    createdAt: new Date().toISOString(),
    input: modelOf(input),
    result: result ? structuredClone(result) : null,
  };
}
export function duplicateScenario(s: Scenario): Scenario {
  return {
    ...structuredClone(s),
    id: newId("S"),
    name: s.name + " (copy)",
    createdAt: new Date().toISOString(),
  };
}
export function compareScenarios(a: Scenario, b: Scenario) {
  return {
    nodes: a.input.nodes.map((n) => {
      const ra =
        a.result?.status === "calculated"
          ? a.result.nodes.find((r) => r.id === n.id)
          : undefined;
      const rb =
        b.result?.status === "calculated"
          ? b.result.nodes.find((r) => r.id === n.id)
          : undefined;
      return {
        id: n.id,
        name: n.name,
        a: ra?.pressureM ?? null,
        b: rb?.pressureM ?? null,
        difference: ra && rb ? rb.pressureM - ra.pressureM : null,
        disconnected: b.result?.disconnected.includes(n.id) ?? false,
      };
    }),
    links: a.input.links.map((l) => {
      const ra =
        a.result?.status === "calculated"
          ? a.result.links.find((r) => r.id === l.id)
          : undefined;
      const rb =
        b.result?.status === "calculated"
          ? b.result.links.find((r) => r.id === l.id)
          : undefined;
      return {
        id: l.id,
        name: l.name,
        a: ra?.flowLps ?? null,
        b: rb?.flowLps ?? null,
        difference: ra && rb ? rb.flowLps - ra.flowLps : null,
        statusA: a.input.links.find((x) => x.id === l.id)?.status,
        statusB: b.input.links.find((x) => x.id === l.id)?.status,
      };
    }),
  };
}
