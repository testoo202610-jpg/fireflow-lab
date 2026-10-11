import type {
  HydraulicModel,
  SimulationResult,
  Language,
} from "../../types/network";
import { pressureFromM, format } from "../../hydraulic/units";
export function engineeringInsights(
  m: HydraulicModel,
  r: SimulationResult | null,
  lang: Language,
): string[] {
  const ar = lang === "ar";
  if (!r)
    return [
      ar
        ? "شغّل المحاكاة للحصول على تحليل مرتبط بالنتائج."
        : "Run a simulation for evidence-based insights.",
    ];
  if (r.status !== "calculated")
    return r.issues.map((i) => `${i.elementId ?? "Model"}: ${i.message}`);
  const out: string[] = [];
  for (const n of r.nodes) {
    const original = m.nodes.find((x) => x.id === n.id);
    if (!original || ["reservoir", "tank"].includes(original.type)) continue;
    const bar = pressureFromM(n.pressureM, "bar");
    if (bar < m.settings.lowPressureBar)
      out.push(
        ar
          ? `${original.name}: الضغط ${format(bar)} bar أقل من الحد المختار ${m.settings.lowPressureBar} bar؛ الرأس ${format(n.headM)} m والارتفاع ${original.elevation} m.`
          : `${original.name}: ${format(bar)} bar is below your ${m.settings.lowPressureBar} bar limit; head ${format(n.headM)} m, elevation ${original.elevation} m.`,
      );
    if (bar > m.settings.highPressureBar)
      out.push(
        ar
          ? `${original.name}: ${format(bar)} bar أعلى من حدك ${m.settings.highPressureBar} bar.`
          : `${original.name}: ${format(bar)} bar exceeds your ${m.settings.highPressureBar} bar limit.`,
      );
  }
  for (const l of r.links) {
    const o = m.links.find((x) => x.id === l.id);
    if (!o) continue;
    if (
      o.type === "pipe" &&
      Math.abs(l.headlossM) > m.settings.frictionWarningM
    )
      out.push(
        ar
          ? `${o.name}: فقد رأس ${format(Math.abs(l.headlossM))} m عند تدفق ${format(Math.abs(l.flowLps))} L/s؛ يلزم إعادة التقييم عند تغيير القطر ${o.diameter} mm.`
          : `${o.name}: ${format(Math.abs(l.headlossM))} m head loss at ${format(Math.abs(l.flowLps))} L/s. A diameter change from ${o.diameter} mm requires recalculation.`,
      );
    if (o.type === "prv" && o.status === "open") {
      const up = r.nodes.find((n) => n.id === o.from),
        down = r.nodes.find((n) => n.id === o.to);
      if (up && down && down.pressureM < o.setting - 0.1)
        out.push(
          ar
            ? `${o.name}: ضغط المخرج الفعلي ${format(down.pressureM)} m دون ضبط ${format(o.setting)} m؛ الرأس المتاح ${format(up.headM)} m، ولم يضف PRV أي طاقة.`
            : `${o.name}: actual outlet pressure ${format(down.pressureM)} m is below the ${format(o.setting)} m setting; upstream head ${format(up.headM)} m. PRV adds no energy.`,
        );
    }
  }
  const requested =
      m.settings.mode === "static"
        ? 0
        : m.nodes.reduce((a, n) => a + n.demand, 0),
    delivered = r.nodes
      .filter(
        (n) =>
          !["reservoir", "tank"].includes(
            m.nodes.find((x) => x.id === n.id)?.type ?? "",
          ),
      )
      .reduce((a, n) => a + n.demandLps, 0);
  if (delivered < requested - 0.01)
    out.push(
      ar
        ? `الطلب الواصل ${format(delivered)} من ${format(requested)} L/s المطلوب؛ نموذج PDA خفّض الطلب بسبب الضغط المتاح.`
        : `Delivered demand ${format(delivered)} of ${format(requested)} L/s requested; PDA reduced demand according to available pressure.`,
    );
  if (!out.length)
    out.push(
      ar
        ? "الضغوط المحسوبة ضمن حدود التنبيه المختارة. هذا لا يثبت مطابقة معيار أو اعتماد تصميم."
        : "Calculated pressures lie within your warning limits. This does not establish code compliance or design approval.",
    );
  return [...out, ...r.issues.map((i) => i.message)];
}
