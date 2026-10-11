import { Printer, FileDown, FileText } from "lucide-react";
import { useStore, currentResult } from "../../app/store";
import { useT, DISCLAIMER_AR, DISCLAIMER_EN } from "../../i18n";
import { ResultTable, resultsCsv } from "../results/Results";
import { engineeringInsights } from "../results/insights";
import { FieldComparison } from "../scenarios/ScenariosPanel";
import { download } from "../../storage/projects";
import { ENGINE_NAME } from "../../hydraulic/epanet/version";
export function Report() {
  const state = useStore(),
    t = useT(),
    p = state.project,
    r = currentResult(p),
    ar = state.language === "ar";
  return (
    <article className="report-page">
      <div className="report-actions">
        <button className="primary-button" onClick={() => window.print()}>
          <Printer size={16} />
          {t("print")}
        </button>
        <button
          className="secondary-button"
          disabled={r?.status !== "calculated"}
          onClick={() =>
            r &&
            download(
              "fireflow-results.csv",
              resultsCsv(r),
              "text/csv;charset=utf-8",
            )
          }
        >
          <FileDown size={16} />
          {t("exportCsv")}
        </button>
      </div>
      <section className="panel report-document">
        <div className="report-brand">
          <FileText size={28} />
          <span>
            FireFlow <b>Lab</b>
          </span>
          <small>ENGINEERING REPORT</small>
        </div>
        <h1>{t("reportTitle")}</h1>
        <h2>{p.name}</h2>
        <dl className="report-meta">
          <dt>{ar ? "تاريخ الحساب" : "Simulation date"}</dt>
          <dd>
            {r ? new Date(r.createdAt).toLocaleString(ar ? "ar" : "en") : "—"}
          </dd>
          <dt>{ar ? "المحرك" : "Engine"}</dt>
          <dd dir="ltr">{r?.engine ?? ENGINE_NAME}</dd>
          <dt>{t("status")}</dt>
          <dd>{r ? t(r.status) : t("noResults")}</dd>
          <dt>{t("units")}</dt>
          <dd dir="ltr">
            SI: m, mm, L/s, m H₂O · Display: {p.settings.pressureUnit},{" "}
            {p.settings.flowUnit}
          </dd>
          <dt>{t("headlossModel")}</dt>
          <dd>{r?.input.settings.headloss ?? p.settings.headloss}</dd>
          <dt>{t("mode")}</dt>
          <dd>
            {t(r?.input.settings.mode ?? p.settings.mode)} ·{" "}
            {r?.input.settings.demandModel ?? p.settings.demandModel}
          </dd>
          <dt>{ar ? "حدود التنبيه المختارة" : "User warning limits"}</dt>
          <dd>
            {r?.input.settings.lowPressureBar ?? p.settings.lowPressureBar}–
            {r?.input.settings.highPressureBar ?? p.settings.highPressureBar}{" "}
            bar
          </dd>
        </dl>
        <div className="report-disclaimer">
          {ar ? DISCLAIMER_AR : DISCLAIMER_EN}
        </div>
        {r?.status === "calculated" ? (
          <>
            <h3>
              {t("pressure")} · {t("nodes")}
            </h3>
            <ResultTable result={r} />
            <h3>
              {t("flow")} · {t("links")}
            </h3>
            <ResultTable result={r} view="links" />
          </>
        ) : (
          <p>{t("noResultsHint")}</p>
        )}
        <h3>{t("insights")}</h3>
        <ul>
          {engineeringInsights(r?.input ?? p, r, state.language).map(
            (insight, i) => (
              <li key={i}>{insight}</li>
            ),
          )}
        </ul>
        <h3>{t("inputs")}</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{ar ? "النوع" : "Type"}</th>
                <th>
                  {t("from")} → {t("to")}
                </th>
                <th>{t("status")}</th>
                <th>L (m) / D (mm) / K</th>
                <th>{t("setPressure")} (m)</th>
              </tr>
            </thead>
            <tbody>
              {(r?.input.links ?? p.links).map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td>{l.type}</td>
                  <td>
                    {l.from} → {l.to}
                  </td>
                  <td>{l.status}</td>
                  <td>
                    {l.length} / {l.diameter} / {l.minorLoss}
                  </td>
                  <td>{l.type === "prv" ? l.setting : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>{t("assumptions")}</h3>
        <ul>
          {(ar
            ? [
                "محاكاة حالة مستقرة فقط. لا تحسب الصدمات المائية أو استنزاف الخزان مع الزمن.",
                "المواسير: Hazen–Williams بمعامل C، أو Darcy–Weisbach بخشونة مطلقة mm حسب الإعداد.",
                "محابس Gate وButterfly وIsolation وZCV ممثلة بماسورة ومعامل فقد موضعي K، دون منحنيات فتح مصنّع. إشارات المراقبة لا تضيف طاقة.",
                "PRV يحسبه EPANET مع قيود اتجاه التدفق والرأس المتاح. المضخات تعتمد على المنحنيات المدخلة؛ المنحنيات التجريبية تعليمية.",
                "القياسات الميدانية مراجع للمقارنة فقط. هذا النموذج غير معاير.",
                "PDA يقلل الطلب عند نقص الضغط؛ DDA يفرض الطلب حتى عند ضغوط سالبة.",
                "استخدام EPANET لا يثبت التوافق مع NFPA 13 أو NFPA 20 أو NFPA 25.",
              ]
            : [
                "Steady-state hydraulics only. Water hammer and time-dependent tank depletion are not simulated.",
                "Pipes use Hazen–Williams C or Darcy–Weisbach absolute roughness in mm as selected.",
                "Gate, butterfly, isolation and ZCV links use pipe + K equivalents, without manufacturer opening curves. Monitoring signals add no energy.",
                "EPANET resolves PRV direction and available head. Pumps use the entered curves; demo curves are educational.",
                "Field measurements are references only. This model is not calibrated.",
                "PDA reduces demand at low pressure; DDA imposes demand even at negative pressures.",
                "EPANET usage alone does not establish NFPA 13, NFPA 20 or NFPA 25 compliance.",
              ]
          ).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <details>
          <summary>
            {ar
              ? "المدخلات الكاملة المحفوظة"
              : "Full retained simulation inputs"}
          </summary>
          <pre dir="ltr">{JSON.stringify(r?.input ?? p, null, 2)}</pre>
        </details>
        {r && (
          <details>
            <summary>EPANET solver report</summary>
            <pre dir="ltr">{r.report}</pre>
          </details>
        )}
      </section>
      <FieldComparison />
    </article>
  );
}
