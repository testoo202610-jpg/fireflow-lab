import { useState } from "react";
import {
  Copy,
  Trash2,
  Play,
  GitCompareArrows,
  BookmarkPlus,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useStore, currentResult } from "../../app/store";
import {
  compareScenarios,
  duplicateScenario,
  snapshotScenario,
} from "./scenarios";
import { useT, localizedName } from "../../i18n";
import { runSimulation } from "../simulation/service";
import { modelOf } from "../../types/network";
import { format, pressureFromM, flowFromLps } from "../../hydraulic/units";
export function ScenariosPanel() {
  const state = useStore(),
    t = useT(),
    p = state.project,
    ar = state.language === "ar";
  const [name, setName] = useState("");
  const [aId, setA] = useState(""),
    [bId, setB] = useState("");
  const a = p.scenarios.find((s) => s.id === aId) ?? p.scenarios.at(-2),
    b = p.scenarios.find((s) => s.id === bId) ?? p.scenarios.at(-1);
  const comparison = a && b ? compareScenarios(a, b) : null;
  const pair = async () => {
    state.setBusy(true);
    state.setNotice("");
    const original = modelOf(p);
    try {
      const sm = modelOf(original);
      sm.settings.mode = "static";
      const rm = modelOf(original);
      rm.settings.mode = "residual";
      const sr = await runSimulation(sm),
        rr = await runSimulation(rm);
      const sa = snapshotScenario(
          ar ? "ثابت • نفس المدخلات" : "Static • matched inputs",
          sm,
          sr,
        ),
        sb = snapshotScenario(
          ar ? "متبقٍ • نفس المدخلات" : "Residual • matched inputs",
          rm,
          rr,
        );
      state.edit((p) => {
        p.scenarios.push(sa, sb);
        p.scenarios = p.scenarios.slice(-100);
      }, false);
      state.setResult(original.settings.mode === "static" ? sr : rr);
      setA(sa.id);
      setB(sb.id);
    } catch (e) {
      state.edit((p) => {
        p.lastResult = null;
      }, false);
      state.setNotice(String(e));
    } finally {
      state.setBusy(false);
    }
  };
  return (
    <div className="scenario-page">
      <section className="panel">
        <div className="panel-heading">
          <span>
            <BookmarkPlus size={18} />
            {t("scenarios")}
          </span>
          <span className="pill neutral">INPUT SNAPSHOTS</span>
        </div>
        <div className="scenario-actions">
          <input
            aria-label={t("scenarioName")}
            placeholder={t("scenarioName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          <button
            className="secondary-button"
            onClick={() => {
              state.saveScenario(
                name || `${p.settings.mode} ${p.scenarios.length + 1}`,
              );
              setName("");
            }}
          >
            <BookmarkPlus size={15} />
            {t("saveScenario")}
          </button>
          <button
            className="primary-button"
            disabled={state.busy}
            onClick={() => void pair()}
          >
            <GitCompareArrows size={16} />
            {state.busy ? t("running") : t("staticResidual")}
          </button>
        </div>
        <p className="scenario-explanation">
          {ar
            ? "كل تشغيل يحفظ مدخلاته ونتيجته. المقارنة أدناه B − A؛ زر الثابت والمتبقي يحافظ على تشغيل المضخات وضبط المحابس والارتفاعات نفسها ويغيّر الطلب فقط."
            : "Each run retains its inputs and result. The comparison below is B − A. Static & residual keeps pump states, valve settings and elevations identical and changes only demand."}
        </p>
        <div className="scenario-list">
          {!p.scenarios.length ? (
            <p className="subtle">{t("emptyScenarios")}</p>
          ) : (
            p.scenarios.map((s) => (
              <article key={s.id} className="scenario-card">
                <div>
                  <span
                    className={`scenario-status ${s.result?.status === "calculated" ? "teal" : "orange"}`}
                  >
                    {s.result?.status === "calculated" ? (
                      <CheckCircle2 size={19} />
                    ) : (
                      <AlertTriangle size={19} />
                    )}
                  </span>
                  <h3>{s.name}</h3>
                  <small>
                    {new Date(s.createdAt).toLocaleTimeString(ar ? "ar" : "en")}{" "}
                    · {s.input.settings.mode} ·{" "}
                    {s.result ? t(s.result.status) : "—"}
                  </small>
                </div>
                <div className="scenario-card-actions">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      state.loadScenario(s.id);
                      state.setTab("network");
                    }}
                  >
                    <Play size={13} />
                    {t("load")}
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`${t("copy")} ${s.name}`}
                    onClick={() =>
                      state.edit((p) => {
                        p.scenarios.push(duplicateScenario(s));
                      })
                    }
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`${t("delete")} ${s.name}`}
                    onClick={() =>
                      state.edit((p) => {
                        p.scenarios = p.scenarios.filter((x) => x.id !== s.id);
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      {comparison && a && b && (
        <section className="panel comparison-panel">
          <div className="panel-heading">
            <span>
              <GitCompareArrows size={18} />
              {t("compare")}
            </span>
            <small>{t("difference")}</small>
          </div>
          <div className="comparison-selectors">
            <label>
              A{" "}
              <select
                aria-label="Scenario A"
                value={a.id}
                onChange={(e) => setA(e.target.value)}
              >
                {p.scenarios.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <span>→</span>
            <label>
              B{" "}
              <select
                aria-label="Scenario B"
                value={b.id}
                onChange={(e) => setB(e.target.value)}
              >
                {p.scenarios.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="comparison-status">
            <span>A: {a.result ? t(a.result.status) : "—"}</span>
            <span>B: {b.result ? t(b.result.status) : "—"}</span>
            <span>
              {t("disconnected")}: {b.result?.disconnected.length ?? "—"}
            </span>
          </div>
          <div className="chart" dir="ltr">
            <ResponsiveContainer>
              <BarChart
                data={comparison.nodes
                  .filter(
                    (n) =>
                      !["reservoir", "tank", "junction"].includes(
                        a.input.nodes.find((x) => x.id === n.id)?.type ?? "",
                      ),
                  )
                  .map((n) => ({
                    name: n.id,
                    A:
                      n.a == null
                        ? null
                        : pressureFromM(n.a, p.settings.pressureUnit),
                    B:
                      n.b == null
                        ? null
                        : pressureFromM(n.b, p.settings.pressureUnit),
                  }))}
              >
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="A" fill="#ee9057" radius={[4, 4, 0, 0]} />
                <Bar dataKey="B" fill="#5bbcaf" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("nodes")}</th>
                  <th>
                    A <small>{p.settings.pressureUnit}</small>
                  </th>
                  <th>
                    B <small>{p.settings.pressureUnit}</small>
                  </th>
                  <th>{t("difference")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.nodes.map((n) => (
                  <tr key={n.id}>
                    <td>
                      {localizedName(n.name, state.language)}
                      <code>{n.id}</code>
                    </td>
                    <td>
                      {n.a == null
                        ? "—"
                        : format(pressureFromM(n.a, p.settings.pressureUnit))}
                    </td>
                    <td>
                      {n.b == null
                        ? "—"
                        : format(pressureFromM(n.b, p.settings.pressureUnit))}
                    </td>
                    <td className="teal">
                      {n.difference == null
                        ? "—"
                        : format(
                            pressureFromM(
                              n.difference,
                              p.settings.pressureUnit,
                            ),
                          )}
                    </td>
                    <td>{n.disconnected ? t("disconnected") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("links")}</th>
                  <th>
                    A <small>{p.settings.flowUnit}</small>
                  </th>
                  <th>
                    B <small>{p.settings.flowUnit}</small>
                  </th>
                  <th>{t("difference")}</th>
                  <th>{t("status")} A → B</th>
                </tr>
              </thead>
              <tbody>
                {comparison.links.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.name}
                      <code>{l.id}</code>
                    </td>
                    <td>
                      {l.a == null
                        ? "—"
                        : format(flowFromLps(l.a, p.settings.flowUnit))}
                    </td>
                    <td>
                      {l.b == null
                        ? "—"
                        : format(flowFromLps(l.b, p.settings.flowUnit))}
                    </td>
                    <td>
                      {l.difference == null
                        ? "—"
                        : format(
                            flowFromLps(l.difference, p.settings.flowUnit),
                          )}
                    </td>
                    <td>
                      {l.statusA} → {l.statusB}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(a.result?.status !== "calculated" ||
            b.result?.status !== "calculated") && (
            <div className="error-results">
              {[a, b]
                .filter((s) => s.result?.status !== "calculated")
                .map((s) => (
                  <div key={s.id}>
                    <strong>{s.name}</strong>
                    {s.result?.issues.map((i, index) => (
                      <p key={index}>{i.message}</p>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </section>
      )}
      <FieldComparison />
    </div>
  );
}
export function FieldComparison() {
  const state = useStore(),
    p = state.project,
    t = useT(),
    r = currentResult(p);
  const fields = p.nodes.filter((n) => n.fieldPressureBar != null);
  if (!fields.length) return null;
  return (
    <section className="panel field-comparison">
      <div className="panel-heading">
        <span>
          {state.language === "ar"
            ? "مقارنة القياسات الميدانية"
            : "Field measurements comparison"}
        </span>
        <span className="pill neutral">REFERENCE · NOT CALIBRATED</span>
      </div>
      <p className="scenario-explanation">
        {state.language === "ar"
          ? "أدخل القياس والارتفاع من خصائص العقدة. القراءات المرجعية لا تغيّر حساب المحرك."
          : "Enter measured pressure and elevation in node properties. Reference readings do not change solver calculations."}
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t("nodes")}</th>
              <th>{t("elevation")} m</th>
              <th>Model (bar)</th>
              <th>Field (bar)</th>
              <th>Model − Field</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((n) => {
              const value =
                r?.status === "calculated"
                  ? r.nodes.find((x) => x.id === n.id)?.pressureM
                  : undefined;
              return (
                <tr key={n.id}>
                  <td>
                    {localizedName(n.name, state.language)}
                    <code>{n.id}</code>
                  </td>
                  <td>{n.elevation}</td>
                  <td>
                    {value == null ? "—" : format(pressureFromM(value, "bar"))}
                  </td>
                  <td>
                    <input
                      aria-label={`Field ${n.id}`}
                      type="number"
                      step="any"
                      value={n.fieldPressureBar ?? ""}
                      onChange={(e) =>
                        state.edit((p) => {
                          const node = p.nodes.find((x) => x.id === n.id);
                          if (node)
                            node.fieldPressureBar =
                              e.target.value === ""
                                ? null
                                : Number(e.target.value);
                        })
                      }
                    />
                  </td>
                  <td>
                    {value == null
                      ? "—"
                      : format(
                          pressureFromM(value, "bar") - n.fieldPressureBar!,
                        )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
