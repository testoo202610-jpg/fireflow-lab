import { CheckCircle2, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  Legend,
} from "recharts";
import { useStore, currentResult } from "../../app/store";
import { useT, localizedName } from "../../i18n";
import { pressureFromM, flowFromLps } from "../../hydraulic/units";
import { validateModel, disconnectedNodes } from "../../hydraulic/validation";
import { ResultStrip, ResultsPanel } from "./Results";
export function Dashboard() {
  const state = useStore(),
    t = useT(),
    p = state.project,
    r = currentResult(p);
  const ar = state.language === "ar";
  if (!r || r.status !== "calculated")
    return (
      <>
        <ResultStrip />
        <div className="dashboard-status panel">
          <span className={`pill ${r ? "danger" : "neutral"}`}>
            <AlertTriangle size={13} />
            {r ? t(r.status) : t("noResults")}
          </span>
          <span>
            {t("disconnected")}:{" "}
            <b>{r?.disconnected.length ?? disconnectedNodes(p).length}</b>
          </span>
          <span>
            {t("warnings")}: <b>{(r?.issues ?? validateModel(p)).length}</b>
          </span>
        </div>
        <ResultsPanel />
      </>
    );
  const floors = r.nodes
    .filter((n) =>
      ["floor", "demand", "gauge"].includes(
        p.nodes.find((x) => x.id === n.id)?.type ?? "",
      ),
    )
    .map((n) => ({
      name: localizedName(
        p.nodes.find((x) => x.id === n.id)?.name ?? n.id,
        state.language,
      ),
      pressure: pressureFromM(n.pressureM, p.settings.pressureUnit),
      elevation: p.nodes.find((x) => x.id === n.id)?.elevation ?? 0,
    }));
  const flows = r.links.map((l) => ({
    name: l.id,
    flow: flowFromLps(l.flowLps, p.settings.flowUnit),
  }));
  const pumpLinks = p.links.filter((l) => l.type === "pump");
  return (
    <>
      <ResultStrip />
      <div className="dashboard-status panel">
        <span className="pill success">
          <CheckCircle2 size={13} />
          {t("calculated")}
        </span>
        <span>
          {t("disconnected")}: <b>{r.disconnected.length}</b>
        </span>
        <span>
          {t("warnings")}: <b>{r.issues.length}</b>
        </span>
        <span dir="ltr">
          EPANET 2.2 · {r.iterations} iterations · ε ={" "}
          {r.relativeError.toExponential(2)}
        </span>
      </div>
      <div className="charts-grid">
        <ChartCard title={t("pressureFloor")} unit={p.settings.pressureUnit}>
          <BarChart data={floors}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip />
            <Bar
              dataKey="pressure"
              name={t("pressure")}
              fill="#5bbcaf"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartCard>
        <ChartCard title={t("flowPipe")} unit={p.settings.flowUnit}>
          <BarChart data={flows}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={1} />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip />
            <Bar
              dataKey="flow"
              name={t("flow")}
              fill="#ee9057"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartCard>
        {pumpLinks.map((pump) => {
          const curve = p.pumpCurves.find((c) => c.id === pump.curveId),
            lr = r.links.find((l) => l.id === pump.id);
          return (
            <ChartCard
              key={pump.id}
              title={`${t("pumpChart")} · ${pump.id}`}
              unit={`${p.settings.flowUnit} / m`}
            >
              <LineChart
                data={curve?.points.map((point) => ({
                  flow: flowFromLps(point.flow, p.settings.flowUnit),
                  head: point.head,
                }))}
              >
                <CartesianGrid stroke="var(--border)" />
                <XAxis
                  dataKey="flow"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip />
                <Legend />
                <Line
                  type="linear"
                  dataKey="head"
                  name={curve?.educational ? t("educational") : t("curve")}
                  stroke="#ee9057"
                  strokeWidth={2}
                />
                {lr && (
                  <Line
                    data={[
                      {
                        flow: flowFromLps(lr.flowLps, p.settings.flowUnit),
                        operating: -lr.headlossM,
                      },
                    ]}
                    dataKey="operating"
                    name={ar ? "نقطة التشغيل" : "Operating point"}
                    stroke="#5bbcaf"
                    dot={{ r: 7, fill: "#5bbcaf" }}
                  />
                )}
              </LineChart>
            </ChartCard>
          );
        })}
        <ChartCard
          title={t("elevationChart")}
          unit={`m / ${p.settings.pressureUnit}`}
        >
          <ScatterChart>
            <CartesianGrid stroke="var(--border)" />
            <XAxis
              type="number"
              dataKey="elevation"
              name={t("elevation")}
              unit=" m"
              tick={{ fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="pressure"
              name={t("pressure")}
              tick={{ fontSize: 10 }}
              width={40}
            />
            <Tooltip />
            <Scatter data={floors} fill="#5bbcaf" />
          </ScatterChart>
        </ChartCard>
      </div>
      <ResultsPanel />
    </>
  );
}
function ChartCard({
  title,
  unit,
  children,
}: {
  title: string;
  unit: string;
  children: React.ReactElement;
}) {
  return (
    <section className="panel chart-card">
      <div className="panel-heading">
        <span>{title}</span>
        <small dir="ltr">{unit}</small>
      </div>
      <div className="chart" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
