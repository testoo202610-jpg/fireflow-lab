import type { HydraulicModel } from "../../types/network";
export function toInp(m: HydraulicModel): string {
  const s: string[] = [
    "[TITLE]",
    "FireFlow Lab - educational steady-state model",
    "[JUNCTIONS]",
    ";ID Elevation Demand (L/s)",
  ];
  for (const n of m.nodes.filter(
    (n) => !["tank", "reservoir"].includes(n.type),
  ))
    s.push(
      `${n.id} ${n.elevation} ${m.settings.mode === "static" ? 0 : n.demand}`,
    );
  s.push("[RESERVOIRS]");
  for (const n of m.nodes.filter((n) => n.type === "reservoir"))
    s.push(`${n.id} ${n.head}`);
  s.push("[TANKS]");
  for (const n of m.nodes.filter((n) => n.type === "tank"))
    s.push(
      `${n.id} ${n.elevation} ${n.level} ${n.minLevel} ${n.maxLevel} ${n.tankDiameter} 0`,
    );
  s.push("[PIPES]", ";ID From To Length Diameter Roughness MinorLoss Status");
  for (const l of m.links.filter((l) => l.type !== "pump" && l.type !== "prv"))
    s.push(
      `${l.id} ${l.from} ${l.to} ${l.length} ${l.diameter} ${l.roughness} ${l.minorLoss} ${l.type === "check" && l.status === "open" ? "CV" : l.status.toUpperCase()}`,
    );
  s.push("[PUMPS]");
  for (const l of m.links.filter((l) => l.type === "pump"))
    s.push(`${l.id} ${l.from} ${l.to} HEAD ${l.curveId}`);
  s.push("[VALVES]");
  for (const l of m.links.filter((l) => l.type === "prv"))
    s.push(
      `${l.id} ${l.from} ${l.to} ${l.diameter} PRV ${l.setting} ${l.minorLoss}`,
    );
  s.push("[CURVES]", "; Educational/user-defined head curves: L/s, m");
  for (const c of m.pumpCurves.filter((c) =>
    m.links.some((l) => l.type === "pump" && l.curveId === c.id),
  ))
    for (const p of c.points) s.push(`${c.id} ${p.flow} ${p.head}`);
  s.push("[STATUS]");
  for (const l of m.links.filter(
    (l) => l.type === "pump" || l.type === "prv",
  )) {
    if (l.status === "closed") s.push(`${l.id} CLOSED`);
    else if (l.type === "pump") s.push(`${l.id} OPEN`);
  }
  // EPANET CV pipes cannot be closed using STATUS. A closed check valve is modeled as a closed ordinary pipe.
  s.push(
    "[OPTIONS]",
    "UNITS LPS",
    `HEADLOSS ${m.settings.headloss}`,
    "SPECIFIC GRAVITY 1.0",
    "TRIALS 200",
    "ACCURACY 0.001",
    "UNBALANCED STOP",
    `DEMAND MODEL ${m.settings.demandModel}`,
  );
  if (m.settings.demandModel === "PDA")
    s.push(
      "MINIMUM PRESSURE 0",
      `REQUIRED PRESSURE ${m.settings.requiredPressureM}`,
      "PRESSURE EXPONENT 0.5",
    );
  s.push(
    "[TIMES]",
    "DURATION 0",
    "[REPORT]",
    "STATUS FULL",
    "SUMMARY YES",
    "NODES ALL",
    "LINKS ALL",
    "[COORDINATES]",
  );
  for (const n of m.nodes) s.push(`${n.id} ${n.position.x} ${-n.position.y}`);
  s.push("[END]");
  return s.join("\n") + "\n";
}
