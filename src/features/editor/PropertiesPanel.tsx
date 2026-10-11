import { Settings2, Info, ArrowRightLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { validateModel } from "../../hydraulic/validation";
import { useStore, currentResult } from "../../app/store";
import { useT, localizedName } from "../../i18n";
import { NumberField, Field, Icon } from "../../components/common";
import {
  pressureFromM,
  pressureToM,
  flowFromLps,
  flowToLps,
  diameterFromMm,
  diameterToMm,
  format,
} from "../../hydraulic/units";
import type {
  NetworkNode,
  NetworkLink,
  PumpCurve,
  Settings,
} from "../../types/network";
export function PropertiesPanel() {
  const state = useStore();
  const t = useT();
  const p = state.project;
  const n = p.nodes.find((n) => n.id === state.selected),
    l = p.links.find((l) => l.id === state.selected);
  const result = currentResult(p);
  const r = result?.status === "calculated" ? result : null;
  const editNode = (values: Partial<NetworkNode>) =>
    state.edit((p) => {
      const target = p.nodes.find((n) => n.id === state.selected);
      if (target) Object.assign(target, values);
    });
  const editLink = (values: Partial<NetworkLink>) =>
    state.edit((p) => {
      const target = p.links.find((l) => l.id === state.selected);
      if (target) Object.assign(target, values);
    });
  const nr = r?.nodes.find((x) => x.id === n?.id),
    lr = r?.links.find((x) => x.id === l?.id);
  return (
    <aside className="inspector panel">
      <div className="panel-heading">
        <span>
          <Settings2 size={18} />
          {t("properties")}
        </span>
        {(n || l) && (
          <button
            className="icon-btn"
            onClick={() => state.select(null)}
            title={t("settings")}
          >
            <Settings2 size={14} />
          </button>
        )}
      </div>
      <div className="inspector-content">
        {!n && !l ? (
          <>
            <div className="inspector-empty">
              <span className="large-icon">
                <Settings2 size={24} />
              </span>
              <p>{t("selectHint")}</p>
            </div>
            <ProjectSettings />
          </>
        ) : (
          <>
            <div className="element-title">
              <span className="component-icon">
                <Icon type={(n || l)!.type} />
              </span>
              <div>
                <h3>{localizedName((n || l)!.name, state.language)}</h3>
                <code>{(n || l)!.id}</code>
              </div>
              <span className="pill neutral">
                {(n || l)!.type.toUpperCase()}
              </span>
            </div>
            {validateModel(p)
              .filter((i) => i.elementId === state.selected)
              .map((i, index) => (
                <p className="help-text orange" role="alert" key={index}>
                  {i.message}
                </p>
              ))}
            <Field label={t("name")}>
              <input
                value={(n || l)!.name}
                onChange={(e) =>
                  n
                    ? editNode({ name: e.target.value })
                    : editLink({ name: e.target.value })
                }
              />
            </Field>
            {n && (
              <>
                <NumberField
                  label={t("elevation")}
                  unit="m"
                  value={n.elevation}
                  onChange={(elevation) => editNode({ elevation })}
                />
                {n.type === "reservoir" ? (
                  <>
                    <NumberField
                      label={t("head")}
                      unit="m"
                      value={n.head}
                      onChange={(head) => editNode({ head })}
                    />
                    <p className="help-text">{t("sourceHint")}</p>
                  </>
                ) : n.type === "tank" ? (
                  <>
                    <NumberField
                      label={t("level")}
                      unit="m"
                      value={n.level}
                      onChange={(level) => editNode({ level })}
                    />
                    <div className="field-pair">
                      <NumberField
                        label={t("minLevel")}
                        unit="m"
                        value={n.minLevel}
                        onChange={(minLevel) => editNode({ minLevel })}
                      />
                      <NumberField
                        label={t("maxLevel")}
                        unit="m"
                        value={n.maxLevel}
                        onChange={(maxLevel) => editNode({ maxLevel })}
                      />
                    </div>
                    <NumberField
                      label={t("tankDiameter")}
                      unit="m"
                      value={n.tankDiameter}
                      onChange={(tankDiameter) => editNode({ tankDiameter })}
                    />
                    <p className="help-text">{t("sourceHint")}</p>
                  </>
                ) : (
                  <>
                    <NumberField
                      label={t("demandLabel")}
                      unit={p.settings.flowUnit}
                      value={flowFromLps(n.demand, p.settings.flowUnit)}
                      onChange={(v) =>
                        editNode({ demand: flowToLps(v, p.settings.flowUnit) })
                      }
                    />
                    <Field label={t("zone")}>
                      <input
                        value={n.zone}
                        onChange={(e) => editNode({ zone: e.target.value })}
                      />
                    </Field>
                    <Field label={t("field")} unit="bar">
                      <input
                        type="number"
                        step="any"
                        dir="ltr"
                        placeholder="—"
                        value={n.fieldPressureBar ?? ""}
                        onChange={(e) =>
                          editNode({
                            fieldPressureBar:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <p className="help-text">
                      {state.language === "ar"
                        ? "قياس مرجعي فقط؛ لا يفرض على المحرك ولا يعني معايرة."
                        : "Reference only; does not constrain the solver or establish calibration."}
                    </p>
                  </>
                )}
                {nr && (
                  <div className="property-result">
                    <span>{t("pressure")}</span>
                    <strong dir="ltr">
                      {format(
                        pressureFromM(nr.pressureM, p.settings.pressureUnit),
                      )}{" "}
                      {p.settings.pressureUnit}
                    </strong>
                    <span>{t("head")}</span>
                    <strong dir="ltr">{format(nr.headM)} m</strong>
                  </div>
                )}
              </>
            )}
            {l && (
              <>
                <Field label={t("status")}>
                  <select
                    value={l.status}
                    onChange={(e) =>
                      editLink({
                        status: e.target.value as NetworkLink["status"],
                      })
                    }
                  >
                    <option value="open">{t("on")}</option>
                    <option value="closed">{t("off")}</option>
                  </select>
                </Field>
                <div className="field-pair">
                  {(["from", "to"] as const).map((side) => (
                    <Field key={side} label={t(side)}>
                      <select
                        value={l[side]}
                        onChange={(e) => editLink({ [side]: e.target.value })}
                      >
                        {p.nodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.id}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
                {l.type === "pump" ? (
                  <>
                    <div className="field-pair">
                      <NumberField
                        label={t("ratedFlow")}
                        unit={p.settings.flowUnit}
                        value={flowFromLps(l.ratedFlow, p.settings.flowUnit)}
                        onChange={(v) =>
                          editLink({
                            ratedFlow: flowToLps(v, p.settings.flowUnit),
                          })
                        }
                      />
                      <NumberField
                        label={t("ratedHead")}
                        unit="m"
                        value={l.ratedHead}
                        onChange={(ratedHead) => editLink({ ratedHead })}
                      />
                    </div>
                    <Field label={t("curve")}>
                      <select
                        value={l.curveId}
                        onChange={(e) => editLink({ curveId: e.target.value })}
                      >
                        {p.pumpCurves.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {p.pumpCurves.find((c) => c.id === l.curveId) && (
                      <CurveEditor
                        key={l.curveId}
                        curve={p.pumpCurves.find((c) => c.id === l.curveId)!}
                      />
                    )}
                    {lr && (
                      <div className="property-result">
                        <span>{t("flow")}</span>
                        <strong dir="ltr">
                          {format(flowFromLps(lr.flowLps, p.settings.flowUnit))}{" "}
                          {p.settings.flowUnit}
                        </strong>
                        <span>
                          {state.language === "ar"
                            ? "الرأس المضاف"
                            : "Added head"}
                        </span>
                        <strong dir="ltr">{format(-lr.headlossM)} m</strong>
                        {(["from", "to"] as const).map((side) => (
                          <span key={side}>
                            {t(side)}:{" "}
                            {format(
                              pressureFromM(
                                r!.nodes.find((n) => n.id === l[side])!
                                  .pressureM,
                                p.settings.pressureUnit,
                              ),
                            )}{" "}
                            {p.settings.pressureUnit}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="help-text">
                      {state.language === "ar"
                        ? "نقطة التشغيل يحسبها EPANET من المنحنى والشبكة. أضف محبس عدم رجوع مستقلًا إذا أردت فحصه."
                        : "EPANET computes the operating point from the curve and network. Add a separate check valve to inspect it explicitly."}
                    </p>
                  </>
                ) : (
                  <>
                    <NumberField
                      label={t("diameter")}
                      unit={p.settings.diameterUnit}
                      value={diameterFromMm(
                        l.diameter,
                        p.settings.diameterUnit,
                      )}
                      onChange={(v) =>
                        editLink({
                          diameter: diameterToMm(v, p.settings.diameterUnit),
                        })
                      }
                    />
                    {l.type === "prv" ? (
                      <NumberField
                        label={t("setPressure")}
                        unit={p.settings.pressureUnit}
                        value={pressureFromM(
                          l.setting,
                          p.settings.pressureUnit,
                        )}
                        onChange={(v) =>
                          editLink({
                            setting: pressureToM(v, p.settings.pressureUnit),
                          })
                        }
                      />
                    ) : (
                      <>
                        <NumberField
                          label={t("length")}
                          unit="m"
                          value={l.length}
                          onChange={(length) => editLink({ length })}
                        />
                        <NumberField
                          label={
                            p.settings.headloss === "H-W"
                              ? t("roughness")
                              : state.language === "ar"
                                ? "الخشونة المطلقة"
                                : "Absolute roughness"
                          }
                          unit={
                            p.settings.headloss === "D-W" ? "mm" : undefined
                          }
                          value={l.roughness}
                          onChange={(roughness) => editLink({ roughness })}
                        />
                        <Field label={t("material")}>
                          <input
                            value={l.material}
                            onChange={(e) =>
                              editLink({ material: e.target.value })
                            }
                          />
                        </Field>
                      </>
                    )}
                    <NumberField
                      label={t("minorLoss")}
                      value={l.minorLoss}
                      onChange={(minorLoss) => editLink({ minorLoss })}
                    />
                    {l.type === "zcv" && (
                      <>
                        <Field label={t("zone")}>
                          <input
                            value={l.zone}
                            onChange={(e) => editLink({ zone: e.target.value })}
                          />
                        </Field>
                        <label className="check-field">
                          <input
                            type="checkbox"
                            checked={l.tamper}
                            onChange={(e) =>
                              editLink({ tamper: e.target.checked })
                            }
                          />
                          Tamper switch
                        </label>
                        <label className="check-field">
                          <input
                            type="checkbox"
                            checked={l.flowSwitch}
                            onChange={(e) =>
                              editLink({ flowSwitch: e.target.checked })
                            }
                          />
                          Flow switch
                        </label>
                        <p className="help-text">{t("zcvHint")}</p>
                        {lr && (
                          <p className="help-text">
                            Flow switch:{" "}
                            {l.flowSwitch && Math.abs(lr.flowLps) > 0.001
                              ? "ACTIVE"
                              : "INACTIVE"}{" "}
                            · Tamper:{" "}
                            {l.tamper && l.status === "closed"
                              ? "ACTIVE"
                              : "INACTIVE"}
                          </p>
                        )}
                      </>
                    )}
                    <label className="check-field">
                      <input
                        type="checkbox"
                        checked={l.flowMeter}
                        onChange={(e) =>
                          editLink({ flowMeter: e.target.checked })
                        }
                      />
                      {t("flowMeter")}
                    </label>
                    {!["pipe", "prv", "check"].includes(l.type) && (
                      <p className="help-text">
                        <Info size={13} />
                        {t("valveHint")}
                      </p>
                    )}
                    {lr && (
                      <div className="property-result">
                        <span>{t("flow")}</span>
                        <strong dir="ltr">
                          {format(flowFromLps(lr.flowLps, p.settings.flowUnit))}{" "}
                          {p.settings.flowUnit}
                        </strong>
                        <span>{t("headloss")}</span>
                        <strong dir="ltr">{format(lr.headlossM)} m</strong>
                        {["prv", "zcv"].includes(l.type) &&
                          (["from", "to"] as const).map((side) => (
                            <span key={side}>
                              {t(side)}:{" "}
                              {format(
                                pressureFromM(
                                  r!.nodes.find((n) => n.id === l[side])!
                                    .pressureM,
                                  p.settings.pressureUnit,
                                ),
                              )}{" "}
                              {p.settings.pressureUnit}
                            </span>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            <button
              className="text-button properties-settings"
              onClick={() => state.select(null)}
            >
              <Settings2 size={14} />
              {t("settings")}
              <ArrowRightLeft size={13} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
function CurveEditor({ curve }: { curve: PumpCurve }) {
  const t = useT(),
    state = useStore();
  const [text, setText] = useState(
    curve.points.map((p) => `${p.flow}, ${p.head}`).join("\n"),
  );
  const emitted = useRef(JSON.stringify(curve.points));
  useEffect(() => {
    const signature = JSON.stringify(curve.points);
    if (signature !== emitted.current) {
      emitted.current = signature;
      setText(curve.points.map((p) => `${p.flow}, ${p.head}`).join("\n"));
    }
  }, [curve.points]);
  return (
    <div className="curve-editor">
      <p className="help-text">{t("curveHint")}</p>
      <textarea
        dir="ltr"
        aria-label={t("curve")}
        value={text}
        rows={4}
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          const lines = value
            .trim()
            .split("\n")
            .map((line) =>
              line
                .trim()
                .split(/[\s,;]+/)
                .map(Number),
            );
          const valid = lines.every(
            (line) => line.length === 2 && line.every(Number.isFinite),
          );
          state.edit((p) => {
            const c = p.pumpCurves.find((c) => c.id === curve.id);
            if (c) {
              c.points = valid
                ? lines.map(([flow, head]) => ({ flow, head }))
                : [];
              emitted.current = JSON.stringify(c.points);
            }
          });
        }}
      />
      <label className="check-field">
        <input
          type="checkbox"
          checked={curve.educational}
          onChange={(e) =>
            state.edit((p) => {
              const c = p.pumpCurves.find((c) => c.id === curve.id);
              if (c) c.educational = e.target.checked;
            })
          }
        />
        {t("educational")}
      </label>
      {curve.educational && (
        <p className="help-text orange">{t("curveEducational")}</p>
      )}
    </div>
  );
}
export function ProjectSettings() {
  const t = useT(),
    state = useStore(),
    s = state.project.settings;
  const set = (values: Partial<Settings>) =>
    state.edit((p) => Object.assign(p.settings, values));
  return (
    <div className="project-settings">
      <h3>{t("settings")}</h3>
      <Field label={t("mode")}>
        <select
          value={s.mode}
          onChange={(e) => set({ mode: e.target.value as Settings["mode"] })}
        >
          <option value="static">{t("static")}</option>
          <option value="residual">{t("residual")}</option>
        </select>
      </Field>
      <div className="field-pair">
        <Field label={t("pressureUnit")}>
          <select
            value={s.pressureUnit}
            onChange={(e) =>
              set({ pressureUnit: e.target.value as Settings["pressureUnit"] })
            }
          >
            {["bar", "psi", "mH2O"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label={t("flowUnit")}>
          <select
            value={s.flowUnit}
            onChange={(e) =>
              set({ flowUnit: e.target.value as Settings["flowUnit"] })
            }
          >
            {["L/s", "L/min", "m3/h"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("diameterUnit")}>
        <select
          value={s.diameterUnit}
          onChange={(e) =>
            set({ diameterUnit: e.target.value as Settings["diameterUnit"] })
          }
        >
          <option>mm</option>
          <option>inch</option>
        </select>
      </Field>
      <Field label={t("headlossModel")}>
        <select
          value={s.headloss}
          onChange={(e) => {
            state.edit((p) => {
              p.settings.headloss = e.target.value as Settings["headloss"];
              p.links.forEach(
                (l) =>
                  (l.roughness = p.settings.headloss === "D-W" ? 0.045 : 120),
              );
            });
            state.setNotice(
              state.language === "ar"
                ? "أُعيدت الخشونة لقيم تعليمية افتراضية (C=120 أو ε=0.045 mm). عدّلها حسب المادة الفعلية."
                : "Roughness reset to educational defaults (C=120 or ε=0.045 mm). Edit to match actual materials.",
            );
          }}
        >
          <option value="H-W">Hazen–Williams</option>
          <option value="D-W">Darcy–Weisbach</option>
        </select>
      </Field>
      <Field label={t("demandModel")}>
        <select
          value={s.demandModel}
          onChange={(e) =>
            set({ demandModel: e.target.value as Settings["demandModel"] })
          }
        >
          <option value="PDA">PDA — pressure dependent</option>
          <option value="DDA">DDA — fixed demand</option>
        </select>
      </Field>
      {s.demandModel === "PDA" && (
        <NumberField
          label={t("requiredPressure")}
          unit="m"
          value={s.requiredPressureM}
          onChange={(requiredPressureM) => set({ requiredPressureM })}
        />
      )}
      <div className="settings-divider" />
      <p className="help-text">
        {state.language === "ar"
          ? "حدود يختارها المستخدم، وليست حدودًا نظامية مفترضة."
          : "User-selected limits, not assumed regulatory criteria."}
      </p>
      <div className="field-pair">
        <NumberField
          label={t("lowLimit")}
          unit="bar"
          value={s.lowPressureBar}
          onChange={(lowPressureBar) => set({ lowPressureBar })}
        />
        <NumberField
          label={t("highLimit")}
          unit="bar"
          value={s.highPressureBar}
          onChange={(highPressureBar) => set({ highPressureBar })}
        />
      </div>
      <NumberField
        label={t("frictionLimit")}
        unit="m"
        value={s.frictionWarningM}
        onChange={(frictionWarningM) => set({ frictionWarningM })}
      />
    </div>
  );
}
