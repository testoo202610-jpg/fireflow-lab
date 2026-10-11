import type { HydraulicModel, Issue, PumpCurve } from "../../types/network";
export function curveValid(c: PumpCurve | undefined): boolean {
  return (
    !!c &&
    c.points.length >= 2 &&
    c.points.every(
      (p, i) =>
        Number.isFinite(p.flow) &&
        Number.isFinite(p.head) &&
        p.flow >= 0 &&
        p.head > 0 &&
        (i === 0 ||
          (p.flow > c.points[i - 1].flow && p.head < c.points[i - 1].head)),
    )
  );
}
export function disconnectedNodes(m: HydraulicModel): string[] {
  const seen = new Set(
    m.nodes
      .filter((n) => n.type === "reservoir" || n.type === "tank")
      .map((n) => n.id),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const l of m.links) {
      if (l.status === "closed") continue;
      const directed = ["pump", "check", "prv"].includes(l.type);
      if (seen.has(l.from) && !seen.has(l.to)) {
        seen.add(l.to);
        changed = true;
      }
      if (!directed && seen.has(l.to) && !seen.has(l.from)) {
        seen.add(l.from);
        changed = true;
      }
    }
  }
  return m.nodes.filter((n) => !seen.has(n.id)).map((n) => n.id);
}
export function validateModel(m: HydraulicModel): Issue[] {
  const issues: Issue[] = [];
  const add = (
    code: string,
    message: string,
    elementId?: string,
    severity: Issue["severity"] = "error",
  ) => issues.push({ code, message, elementId, severity });
  if (!m.nodes.some((n) => n.type === "reservoir" || n.type === "tank"))
    add("no_source", "No water source / لا يوجد مصدر مياه");
  const ids = new Set<string>();
  for (const n of m.nodes) {
    if (ids.has(n.id)) add("duplicate_id", "Duplicate ID / معرّف مكرر", n.id);
    ids.add(n.id);
    if (n.demand < 0)
      add(
        "negative_demand",
        "Negative demand is unsupported / طلب سالب غير مدعوم",
        n.id,
      );
    if (
      n.type === "tank" &&
      (n.tankDiameter <= 0 ||
        n.minLevel < 0 ||
        n.maxLevel <= n.minLevel ||
        n.level < n.minLevel ||
        n.level > n.maxLevel)
    )
      add(
        "invalid_tank",
        "Invalid tank levels or diameter / مستويات أو قطر الخزان غير صالح",
        n.id,
      );
  }
  for (const c of m.pumpCurves) {
    if (ids.has(c.id)) add("duplicate_id", "Duplicate ID", c.id);
    ids.add(c.id);
  }
  const nodeIds = new Set(m.nodes.map((n) => n.id));
  for (const l of m.links) {
    if (ids.has(l.id)) add("duplicate_id", "Duplicate ID", l.id);
    ids.add(l.id);
    if (!nodeIds.has(l.from) || !nodeIds.has(l.to) || l.from === l.to)
      add("connection", "Invalid endpoints / توصيل غير صالح", l.id);
    if (l.type !== "pump" && l.diameter <= 0)
      add(
        "diameter",
        "Diameter must be positive / يجب أن يكون القطر موجبًا",
        l.id,
      );
    if (l.type !== "pump" && l.type !== "prv" && l.length <= 0)
      add("length", "Length must be positive / يجب أن يكون الطول موجبًا", l.id);
    if (l.minorLoss < 0)
      add(
        "minor_loss",
        "Minor loss must be nonnegative / معامل الفقد لا يكون سالبًا",
        l.id,
      );
    if (l.roughness <= 0)
      add("roughness", "Invalid roughness / خشونة غير صالحة", l.id);
    if (
      l.type === "pump" &&
      (!curveValid(m.pumpCurves.find((c) => c.id === l.curveId)) ||
        l.ratedFlow <= 0 ||
        l.ratedHead <= 0)
    )
      add(
        "pump",
        "Pump needs a decreasing head curve and positive rated data / بيانات المضخة أو منحناها غير صالح",
        l.id,
      );
    if (l.type === "prv") {
      if (l.setting < 0)
        add(
          "prv_setting",
          "PRV pressure setting must be nonnegative / ضبط PRV سالب",
          l.id,
        );
      const a = m.nodes.find((n) => n.id === l.from),
        b = m.nodes.find((n) => n.id === l.to);
      if (
        a?.type === "reservoir" ||
        a?.type === "tank" ||
        b?.type === "reservoir" ||
        b?.type === "tank"
      )
        add(
          "prv_storage",
          "EPANET PRV endpoints must be junctions / يجب توصيل PRV بعقدتين",
          l.id,
        );
      if (
        m.links.some(
          (other) =>
            other.id !== l.id &&
            other.type === "prv" &&
            (other.to === l.to || other.to === l.from || other.from === l.to),
        )
      )
        add(
          "prv_adjacency",
          "Adjacent or parallel PRVs require an intervening pipe / يلزم فصل محابس PRV بماسورة",
          l.id,
        );
    }
  }
  for (const id of disconnectedNodes(m))
    add("disconnected", "No active supply path / لا يوجد مسار تغذية مفتوح", id);
  if (m.nodes.length < 2 || m.links.length < 1)
    add(
      "empty",
      "At least two nodes and one link are required / يلزم عقدتان ووصلة",
    );
  if (m.settings.lowPressureBar >= m.settings.highPressureBar)
    add(
      "limits",
      "Low pressure limit must be below high limit / حدود الضغط غير صالحة",
    );
  if (m.settings.requiredPressureM <= 0)
    add("required_pressure", "PDA required pressure must be positive");
  if (m.settings.demandModel === "DDA")
    add(
      "dda",
      "DDA forces the requested demand even at negative pressure; delivered demand is a mathematical value / الطلب المفروض لا يثبت قدرة التغذية",
      undefined,
      "warning",
    );
  if (m.settings.headloss === "D-W")
    add(
      "dw",
      "Darcy-Weisbach roughness is absolute roughness in mm, not a Hazen-Williams C coefficient / الخشونة في D-W بوحدة mm",
      undefined,
      "warning",
    );
  return issues;
}
