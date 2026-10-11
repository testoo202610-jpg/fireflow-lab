import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Activity,
  Gauge,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { useStore, currentResult } from "../../app/store";
import { useT, localizedName } from "../../i18n";
import { format, pressureFromM, flowFromLps } from "../../hydraulic/units";
import { engineeringInsights } from "./insights";
import { download } from "../../storage/projects";
import type { SimulationResult } from "../../types/network";
export function ResultStrip() {
  const state = useStore(),
    t = useT(),
    p = state.project,
    r = currentResult(p);
  const pressures =
    r?.status === "calculated"
      ? r.nodes
          .filter(
            (n) =>
              !["tank", "reservoir"].includes(
                p.nodes.find((x) => x.id === n.id)?.type ?? "",
              ),
          )
          .map((n) => n.pressureM)
      : [];
  const delivered =
    r?.status === "calculated"
      ? r.nodes
          .filter(
            (n) =>
              !["tank", "reservoir"].includes(
                p.nodes.find((x) => x.id === n.id)?.type ?? "",
              ),
          )
          .reduce((a, n) => a + n.demandLps, 0)
      : null;
  const pumps =
    r?.status === "calculated"
      ? r.links
          .filter((l) => p.links.find((x) => x.id === l.id)?.type === "pump")
          .reduce((a, l) => a + Math.abs(l.flowLps), 0)
      : null;
  const values = [
    {
      label: "minPressure",
      icon: ArrowDown,
      value: pressures.length
        ? format(pressureFromM(Math.min(...pressures), p.settings.pressureUnit))
        : null,
      unit: p.settings.pressureUnit,
    },
    {
      label: "maxPressure",
      icon: ArrowUp,
      value: pressures.length
        ? format(pressureFromM(Math.max(...pressures), p.settings.pressureUnit))
        : null,
      unit: p.settings.pressureUnit,
    },
    {
      label: "delivered",
      icon: Activity,
      value:
        delivered != null
          ? format(flowFromLps(delivered, p.settings.flowUnit))
          : null,
      unit: p.settings.flowUnit,
    },
    {
      label: "pumpFlow",
      icon: Gauge,
      value:
        pumps != null ? format(flowFromLps(pumps, p.settings.flowUnit)) : null,
      unit: p.settings.flowUnit,
    },
  ] as const;
  return (
    <div className="metrics-grid">
      {values.map(({ label, icon: I, value, unit }) => (
        <div className="metric-card" key={label}>
          <div>
            <span>{t(label)}</span>
            <I size={17} />
          </div>
          <strong dir="ltr">
            {value ?? "—"} <small>{unit}</small>
          </strong>
          <span className="metric-caption">
            {value == null
              ? state.language === "ar"
                ? "في انتظار المحاكاة"
                : "Awaiting simulation"
              : state.language === "ar"
                ? "من نتائج EPANET"
                : "From EPANET results"}
          </span>
        </div>
      ))}
    </div>
  );
}
export function ResultsPanel() {
  const state = useStore(),
    t = useT(),
    p = state.project,
    r = currentResult(p);
  const [view, setView] = useState<"nodes" | "links">("nodes");
  const ar = state.language === "ar";
  return (
    <section className="results-layout">
      <div className="panel result-panel">
        <div className="panel-heading">
          <span>
            <Activity size={18} />
            {t("results")}
          </span>
          {r && (
            <span
              className={`pill ${r.status === "calculated" ? "success" : "danger"}`}
            >
              {r.status === "calculated" ? (
                <CheckCircle2 size={12} />
              ) : (
                <AlertTriangle size={12} />
              )}{" "}
              {t(r.status)}
            </span>
          )}
        </div>
        {!r ? (
          <div className="empty-results">
            <span className="large-icon">
              <Gauge size={26} />
            </span>
            <h3>{t("noResults")}</h3>
            <p>{t("noResultsHint")}</p>
          </div>
        ) : r.status !== "calculated" ? (
          <div className="error-results">
            <AlertTriangle size={24} />
            <h3>{t(r.status)}</h3>
            {r.issues.map((i, index) => (
              <p key={index}>
                <code>{i.elementId}</code> {i.message}
              </p>
            ))}
          </div>
        ) : (
          <>
            <div className="results-toolbar">
              <div className="segmented">
                {(["nodes", "links"] as const).map((v) => (
                  <button
                    className={view === v ? "active" : ""}
                    key={v}
                    onClick={() => setView(v)}
                  >
                    {t(v)}
                  </button>
                ))}
              </div>
              <span>
                {r.iterations} {ar ? "تكرارات" : "iterations"} ·{" "}
                {ar ? "خطأ نسبي" : "relative error"}{" "}
                {r.relativeError.toExponential(1)}
              </span>
              <button
                className="icon-btn"
                title={t("exportCsv")}
                aria-label={t("exportCsv")}
                onClick={() =>
                  download(
                    "fireflow-results.csv",
                    resultsCsv(r),
                    "text/csv;charset=utf-8",
                  )
                }
              >
                <FileDown size={17} />
              </button>
            </div>
            <ResultTable result={r} view={view} />
          </>
        )}
      </div>
      <aside className="panel insights-panel">
        <div className="panel-heading">
          <span>
            <Lightbulb size={18} />
            {t("insights")}
          </span>
          <span className="pill neutral">LOCAL</span>
        </div>
        <ul>
          {engineeringInsights(p, r, state.language).map((line, i) => (
            <li key={i}>
              <span className="insight-icon">
                {r?.status === "calculated" ? (
                  <ArrowRight size={13} />
                ) : (
                  <AlertTriangle size={13} />
                )}
              </span>
              <p>{line}</p>
            </li>
          ))}
        </ul>
        <p className="insights-caption">
          {ar
            ? "تفسيرات مبنية على البيانات، تستلزم مراجعة هندسية قبل تطبيقها."
            : "Data-based explanations require engineering review before application."}
        </p>
      </aside>
    </section>
  );
}
export function ResultTable({
  result: r,
  view = "nodes",
}: {
  result: SimulationResult;
  view?: "nodes" | "links";
}) {
  const state = useStore(),
    t = useT(),
    s = state.project.settings;
  const input = r.input;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{view === "nodes" ? t("nodes") : t("links")}</th>
            {view === "nodes" ? (
              <>
                <th>
                  {t("elevation")} <small>m</small>
                </th>
                <th>
                  {t("pressure")} <small>{s.pressureUnit}</small>
                </th>
                <th>
                  {t("head")} <small>m</small>
                </th>
                <th>
                  {t("demandLabel")} <small>{s.flowUnit}</small>
                </th>
              </>
            ) : (
              <>
                <th>
                  {t("flow")} <small>{s.flowUnit}</small>
                </th>
                <th>
                  {t("headloss")} <small>m</small>
                </th>
                <th>{t("status")}</th>
                <th>
                  {state.language === "ar" ? "اتجاه التدفق" : "Direction"}
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {view === "nodes"
            ? r.nodes.map((n) => {
                const original = input.nodes.find((x) => x.id === n.id);
                const bar = pressureFromM(n.pressureM, "bar");
                const warning =
                  original &&
                  !["tank", "reservoir"].includes(original.type) &&
                  (bar < s.lowPressureBar || bar > s.highPressureBar);
                return (
                  <tr
                    key={n.id}
                    onClick={() => state.select(n.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") state.select(n.id);
                    }}
                  >
                    <td>
                      <span>
                        {localizedName(original?.name ?? n.id, state.language)}
                      </span>
                      <code>{n.id}</code>
                    </td>
                    <td>{format(original?.elevation ?? 0)}</td>
                    <td className={warning ? "orange" : "teal"}>
                      {format(pressureFromM(n.pressureM, s.pressureUnit))}
                      {warning && <AlertTriangle size={11} />}
                    </td>
                    <td>{format(n.headM)}</td>
                    <td>{format(flowFromLps(n.demandLps, s.flowUnit))}</td>
                  </tr>
                );
              })
            : r.links.map((l) => {
                const original = input.links.find((x) => x.id === l.id);
                return (
                  <tr
                    key={l.id}
                    onClick={() => state.select(l.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") state.select(l.id);
                    }}
                  >
                    <td>
                      <span>
                        {localizedName(original?.name ?? l.id, state.language)}
                      </span>
                      <code>{l.id}</code>
                    </td>
                    <td className="teal">
                      {format(flowFromLps(l.flowLps, s.flowUnit))}
                    </td>
                    <td>{format(l.headlossM)}</td>
                    <td>
                      <span
                        className={`pill ${l.status === 0 ? "neutral" : "success"}`}
                      >
                        {l.status === 0
                          ? t("off")
                          : l.status === 2
                            ? "ACTIVE"
                            : t("on")}
                      </span>
                    </td>
                    <td dir="ltr">
                      {Math.abs(l.flowLps) < 1e-5
                        ? "—"
                        : l.flowLps > 0
                          ? `${original?.from} → ${original?.to}`
                          : `${original?.to} → ${original?.from}`}
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
const csvCell = (s: string) => '"' + s.replaceAll('"', '""') + '"';
export function resultsCsv(r: SimulationResult): string {
  const rows = [
    "\uFEFFType,ID,Name,Pressure_bar,Head_m,Demand_Lps,Flow_Lps,Headloss_m,Status",
  ];
  if (r.status !== "calculated") return rows.join("\r\n");
  for (const n of r.nodes)
    rows.push(
      [
        "node",
        n.id,
        csvCell(r.input.nodes.find((x) => x.id === n.id)?.name ?? n.id),
        pressureFromM(n.pressureM, "bar"),
        n.headM,
        n.demandLps,
        "",
        "",
        "",
      ].join(","),
    );
  for (const l of r.links)
    rows.push(
      [
        "link",
        l.id,
        csvCell(r.input.links.find((x) => x.id === l.id)?.name ?? l.id),
        "",
        "",
        "",
        l.flowLps,
        l.headlossM,
        l.status,
      ].join(","),
    );
  return rows.join("\r\n");
}
