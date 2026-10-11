import { useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  MarkerType,
  useReactFlow,
  type Node,
  type NodeProps,
  type Edge,
  type EdgeProps,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Maximize,
  Eye,
  Plus,
  Search,
  ArrowUpRight,
  Move,
} from "lucide-react";
import { useStore, currentResult } from "../../app/store";
import {
  makeNode,
  makeLink,
  makeCurve,
  newId,
  type NetworkNode,
  type NetworkLink,
} from "../../types/network";
import { Icon } from "../../components/common";
import { useT, localizedName, type TextKey } from "../../i18n";
import { pressureFromM, flowFromLps, format } from "../../hydraulic/units";

type NodeData = {
  item: NetworkNode;
  pressure: number | null;
  unit: string;
  displayLabels: boolean;
  low: number;
  high: number;
  language: "ar" | "en";
};
type FlowNode = Node<NodeData, "hydraulic">;
type EdgeData = {
  item: NetworkLink;
  flow: number | null;
  unit: string;
  displayLabels: boolean;
  language: "ar" | "en";
  parallel: number;
};
type FlowEdge = Edge<EdgeData, "hydraulic">;
function HydraulicNode({ data, selected }: NodeProps<FlowNode>) {
  const t = useT();
  const bar =
    data.pressure == null ? null : pressureFromM(data.pressure, "bar");
  const warning = bar != null && (bar < data.low || bar > data.high);
  const color =
    bar == null
      ? "var(--muted)"
      : warning
        ? "#f89a47"
        : `hsl(${28 + 190 * Math.max(0, Math.min(1, bar / data.high))} 60% 62%)`;
  return (
    <div
      className={`hydraulic-node ${selected ? "selected" : ""} ${data.item.type}`}
      style={{ "--pressure-color": color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" />
      <div className="node-top">
        <span className="node-icon">
          <Icon type={data.item.type} size={19} />
        </span>
        <span className="node-id" dir="ltr">
          {data.item.id}
        </span>
      </div>
      {data.displayLabels && (
        <div className="node-name">
          {localizedName(data.item.name, data.language)}
        </div>
      )}
      <div className="node-bottom">
        {data.pressure != null ? (
          <strong style={{ color }} dir="ltr">
            {format(
              pressureFromM(data.pressure, data.unit as "bar" | "psi" | "mH2O"),
            )}
            <small>{data.unit}</small>
          </strong>
        ) : (
          <span>{t(data.item.type as TextKey)}</span>
        )}
        <span dir="ltr">{data.item.elevation} m</span>
      </div>
    </div>
  );
}
function HydraulicEdge(props: EdgeProps<FlowEdge>) {
  const { data } = props;
  if (!data) return null;
  const offset = data.parallel;
  let [path, x, y] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
    borderRadius: 15,
    offset: 20,
  });
  if (offset) {
    const sx = props.sourceX,
      sy = props.sourceY,
      tx = props.targetX,
      ty = props.targetY;
    path = `M ${sx},${sy} C ${sx + 70},${sy + offset} ${tx - 70},${ty + offset} ${tx},${ty}`;
    x = (sx + tx) / 2;
    y = (sy + ty) / 2 + offset * 0.75;
  }
  const moving =
    data.flow != null &&
    Math.abs(data.flow) > 0.00001 &&
    data.item.status === "open";
  const color = props.selected
    ? "#ff8b48"
    : data.item.status === "closed"
      ? "#596271"
      : moving
        ? "#5bbcaf"
        : "#546778";
  const special = data.item.type !== "pipe";
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        markerStart={props.markerStart}
        style={{ stroke: color, strokeWidth: props.selected ? 3 : 2 }}
        interactionWidth={20}
      />
      {moving && (
        <path
          d={path}
          className={`flow-animation ${data.flow! < 0 ? "reverse" : ""}`}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeDasharray="4 22"
        />
      )}
      {(data.displayLabels || special) && (
        <EdgeLabelRenderer>
          <button
            className={`edge-badge nodrag nopan ${special ? "equipment-badge" : ""} ${props.selected ? "selected" : ""}`}
            style={{
              transform: `translate(-50%,-50%) translate(${x}px,${y}px)`,
            }}
            onClick={() => useStore.getState().select(data.item.id)}
            title={localizedName(data.item.name, data.language)}
          >
            {special && <Icon type={data.item.type} size={15} />}
            <span>{special ? data.item.type.toUpperCase() : data.item.id}</span>
            {data.flow != null && (
              <b dir="ltr">
                {format(
                  flowFromLps(data.flow, data.unit as "L/s" | "L/min" | "m3/h"),
                )}{" "}
                <small>{data.unit}</small>
              </b>
            )}
            {data.item.status === "closed" && <i>×</i>}
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
const nodeTypes = { hydraulic: HydraulicNode };
const edgeTypes = { hydraulic: HydraulicEdge };
const nodeKinds: NetworkNode["type"][] = [
  "tank",
  "reservoir",
  "junction",
  "gauge",
  "demand",
  "floor",
];
const linkKinds: NetworkLink["type"][] = [
  "pipe",
  "pump",
  "prv",
  "zcv",
  "gate",
  "butterfly",
  "check",
  "isolation",
];
export function NetworkEditor() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
function Editor() {
  const t = useT();
  const state = useStore();
  const p = state.project;
  const result = currentResult(p);
  const solved = result?.status === "calculated" ? result : null;
  const [connectionType, setConnectionType] =
    useState<NetworkLink["type"]>("pipe");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { screenToFlowPosition, fitView } = useReactFlow();
  const canvas = useRef<HTMLDivElement>(null);
  const add = useCallback(
    (kind: string, position?: { x: number; y: number }) => {
      state.edit((project) => {
        const pos = position ?? {
          x: 200 + (project.nodes.length % 4) * 180,
          y: 60 + Math.floor(project.nodes.length / 4) * 130,
        };
        if (kind === "flowMeter") {
          const l = project.links.find((l) => l.id === state.selected);
          if (l) l.flowMeter = true;
          else
            state.setNotice(
              state.language === "ar"
                ? "حدد وصلة لإضافة مقياس التدفق."
                : "Select a link to attach a flow meter.",
            );
          return;
        }
        if (nodeKinds.includes(kind as NetworkNode["type"])) {
          const n = makeNode(kind as NetworkNode["type"], pos);
          n.name = t(kind as TextKey);
          project.nodes.push(n);
          state.select(n.id);
        } else {
          const a = makeNode("junction", pos),
            b = makeNode("junction", { x: pos.x + 270, y: pos.y });
          a.name = state.language === "ar" ? "مدخل" : "Inlet";
          b.name = state.language === "ar" ? "مخرج" : "Outlet";
          project.nodes.push(a, b);
          const c = kind === "pump" ? makeCurve() : null;
          if (c) project.pumpCurves.push(c);
          const l = makeLink(kind as NetworkLink["type"], a.id, b.id, c?.id);
          l.name = t(kind as TextKey);
          project.links.push(l);
          state.select(l.id);
        }
      });
    },
    [state, t],
  );
  const nodes: FlowNode[] = p.nodes.map((n) => ({
    id: n.id,
    type: "hydraulic",
    position: n.position,
    selected: selectedIds.has(n.id) || state.selected === n.id,
    data: {
      item: n,
      pressure: solved?.nodes.find((r) => r.id === n.id)?.pressureM ?? null,
      unit: p.settings.pressureUnit,
      displayLabels: p.settings.labels,
      low: p.settings.lowPressureBar,
      high: p.settings.highPressureBar,
      language: state.language,
    },
  }));
  const edges: FlowEdge[] = p.links.map((l) => {
    const r = solved?.links.find((r) => r.id === l.id);
    const parallels = p.links.filter(
      (other) => other.from === l.from && other.to === l.to,
    );
    return {
      id: l.id,
      source: l.from,
      target: l.to,
      sourceHandle: "out",
      targetHandle: "in",
      type: "hydraulic",
      selected: state.selected === l.id,
      markerEnd:
        r && r.flowLps > 0.00001
          ? { type: MarkerType.ArrowClosed, color: "#5bbcaf" }
          : undefined,
      markerStart:
        r && r.flowLps < -0.00001
          ? { type: MarkerType.ArrowClosed, color: "#5bbcaf" }
          : undefined,
      data: {
        item: l,
        flow: r?.flowLps ?? null,
        unit: p.settings.flowUnit,
        displayLabels: p.settings.labels,
        language: state.language,
        parallel:
          parallels.length > 1 ? (parallels.indexOf(l) % 2 ? 1 : -1) * 65 : 0,
      },
    };
  });
  const onNodesChange = (changes: NodeChange<FlowNode>[]) => {
    const positions = changes.filter((c) => c.type === "position");
    if (positions.length)
      state.edit((project) => {
        for (const c of positions) {
          const n = project.nodes.find((n) => n.id === c.id);
          if (n && c.position) n.position = c.position;
        }
      }, false);
    const selections = changes.filter((c) => c.type === "select");
    if (selections.length)
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const c of selections) {
          if (c.selected) next.add(c.id);
          else next.delete(c.id);
        }
        return next;
      });
    const remove = changes.filter((c) => c.type === "remove").map((c) => c.id);
    if (remove.length)
      state.edit((project) => {
        project.nodes = project.nodes.filter((n) => !remove.includes(n.id));
        project.links = project.links.filter(
          (l) => !remove.includes(l.from) && !remove.includes(l.to),
        );
      });
  };
  const onEdgesChange = (changes: EdgeChange<FlowEdge>[]) => {
    const remove = changes.filter((c) => c.type === "remove").map((c) => c.id);
    if (remove.length)
      state.edit((project) => {
        project.links = project.links.filter((l) => !remove.includes(l.id));
      });
  };
  const removeSelected = () => {
    const ids = new Set([
      ...selectedIds,
      ...(state.selected ? [state.selected] : []),
    ]);
    state.edit((project) => {
      project.nodes = project.nodes.filter((n) => !ids.has(n.id));
      project.links = project.links.filter(
        (l) => !ids.has(l.id) && !ids.has(l.from) && !ids.has(l.to),
      );
    });
    state.select(null);
    setSelectedIds(new Set());
  };
  const duplicate = () =>
    state.edit((project) => {
      const ids = new Set([
        ...selectedIds,
        ...(state.selected ? [state.selected] : []),
      ]);
      const mapping = new Map<string, string>();
      const originals = project.nodes.filter((n) => ids.has(n.id));
      for (const n of originals) {
        const copy = {
          ...structuredClone(n),
          id: newId(),
          position: { x: n.position.x + 45, y: n.position.y + 100 },
        };
        mapping.set(n.id, copy.id);
        project.nodes.push(copy);
      }
      const copyLinks = project.links.filter(
        (l) => mapping.has(l.from) && mapping.has(l.to),
      );
      for (const l of copyLinks)
        project.links.push({
          ...structuredClone(l),
          id: newId("L"),
          from: mapping.get(l.from)!,
          to: mapping.get(l.to)!,
        });
      if (!originals.length) {
        const l = project.links.find((l) => l.id === state.selected);
        if (l) project.links.push({ ...structuredClone(l), id: newId("L") });
      }
    });
  return (
    <div className="editor-layout">
      <aside className="palette panel">
        <div className="panel-heading">
          <span>
            <Icon type="pipe" />
            {t("components")}
          </span>
          <small>15</small>
        </div>
        <p className="subtle palette-hint">{t("paletteHint")}</p>
        <div className="search-box">
          <Search size={15} />
          <input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(
          [
            { title: "equipment", kinds: ["pump", "tank", "reservoir"] },
            {
              title: "connections",
              kinds: linkKinds.filter((k) => k !== "pump"),
            },
            {
              title: "measurement",
              kinds: ["junction", "gauge", "flowMeter", "demand", "floor"],
            },
          ] as { title: TextKey; kinds: string[] }[]
        ).map((group) => (
          <section className="palette-group" key={group.title}>
            <h3>{t(group.title)}</h3>
            {group.kinds
              .filter((kind) =>
                t(kind as TextKey)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((kind) => (
                <button
                  key={kind}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("application/fireflow", kind)
                  }
                  onClick={() => add(kind)}
                  className="component-button"
                >
                  <span className={`component-icon ${kind}`}>
                    <Icon
                      type={
                        kind as keyof typeof import("../../components/common").icons
                      }
                    />
                  </span>
                  <span>{t(kind as TextKey)}</span>
                  <Plus size={13} />
                </button>
              ))}
          </section>
        ))}
        <div className="palette-note">
          <Move size={16} />
          <span>
            {state.language === "ar"
              ? "الموضع رسومي فقط؛ الارتفاع خاصية مستقلة."
              : "Canvas positions are visual. Elevation is a separate input."}
          </span>
        </div>
      </aside>
      <section className="network-workspace panel">
        <div className="workspace-top">
          <div>
            <span className="eyebrow">NETWORK WORKSPACE</span>
            <h2>
              {t("network")}{" "}
              <small>
                {p.nodes.length} {t("nodes")} · {p.links.length} {t("links")}
              </small>
            </h2>
          </div>
          <span className="pill neutral">STEADY STATE</span>
        </div>
        <div className="canvas-toolbar">
          <div className="toolbar-buttons">
            <button
              title={t("undo")}
              aria-label={t("undo")}
              disabled={!state.past.length}
              onClick={state.undo}
            >
              <Undo2 size={16} />
            </button>
            <button
              title={t("redo")}
              aria-label={t("redo")}
              disabled={!state.future.length}
              onClick={state.redo}
            >
              <Redo2 size={16} />
            </button>
            <span className="separator" />
            <button
              title={t("copy")}
              aria-label={t("copy")}
              disabled={!state.selected && !selectedIds.size}
              onClick={duplicate}
            >
              <Copy size={16} />
            </button>
            <button
              title={t("delete")}
              aria-label={t("delete")}
              disabled={!state.selected && !selectedIds.size}
              onClick={removeSelected}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <label className="connection-picker">
            <span>{t("connect")}</span>
            <select
              value={connectionType}
              onChange={(e) =>
                setConnectionType(e.target.value as NetworkLink["type"])
              }
            >
              {linkKinds.map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </label>
          <div className="toolbar-buttons">
            <button
              title={t("labels")}
              aria-label={t("labels")}
              className={p.settings.labels ? "active" : ""}
              onClick={() =>
                state.edit((p) => {
                  p.settings.labels = !p.settings.labels;
                }, false)
              }
            >
              <Eye size={16} />
            </button>
            <button
              title={t("fit")}
              aria-label={t("fit")}
              onClick={() => void fitView({ padding: 0.13, duration: 400 })}
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
        <div
          ref={canvas}
          className="network-canvas"
          dir="ltr"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const kind = e.dataTransfer.getData("application/fireflow");
            if (kind)
              add(kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
          }}
        >
          <ReactFlow<FlowNode, FlowEdge>
            key={p.id}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, n) => state.select(n.id)}
            onEdgeClick={(_, e) => state.select(e.id)}
            onPaneClick={() => {
              state.select(null);
              setSelectedIds(new Set());
            }}
            onNodeDragStart={() => state.edit(() => {})}
            onConnect={(connection) => {
              if (
                !connection.source ||
                !connection.target ||
                connection.source === connection.target
              ) {
                state.setNotice("Invalid connection / توصيل غير صالح");
                return;
              }
              state.edit((project) => {
                let curveId: string | undefined;
                if (connectionType === "pump") {
                  const c = makeCurve();
                  project.pumpCurves.push(c);
                  curveId = c.id;
                }
                const l = makeLink(
                  connectionType,
                  connection.source!,
                  connection.target!,
                  curveId,
                );
                l.name = t(connectionType);
                project.links.push(l);
                state.select(l.id);
              });
            }}
            onInit={() =>
              setTimeout(() => void fitView({ padding: 0.13 }), 120)
            }
            fitView
            fitViewOptions={{ padding: 0.13 }}
            minZoom={0.15}
            maxZoom={2}
            deleteKeyCode={["Backspace", "Delete"]}
            multiSelectionKeyCode="Shift"
            selectionOnDrag
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} size={1} color="var(--grid)" />
            <Controls showInteractive={false} />
            <MiniMap<FlowNode>
              nodeColor={(n) =>
                n.data.item.type === "tank" || n.data.item.type === "reservoir"
                  ? "#ff8b48"
                  : "#5bbcaf"
              }
              maskColor="var(--minimap-mask)"
              pannable
              zoomable
            />
          </ReactFlow>
          {p.nodes.length === 0 && (
            <div className="canvas-empty">
              <Icon type="pipe" size={36} />
              <h3>{t("paletteHint")}</h3>
              <p>{t("selectHint")}</p>
            </div>
          )}
          <div className="canvas-legend">
            <span className="legend-dot" />
            {state.language === "ar"
              ? "اتجاه وتدفق محسوب"
              : "Calculated flow direction"}
            <span className="legend-scale" />
            <span>0 → {p.settings.highPressureBar} bar</span>
          </div>
        </div>
        <div className="workspace-bottom">
          <span>
            <span className="live-dot" />{" "}
            {state.language === "ar"
              ? "الحساب محلي · لا يلزم مفتاح API"
              : "Local calculations · No API key"}
          </span>
          <button onClick={() => state.setTab("dashboard")}>
            {t("dashboard")}
            <ArrowUpRight size={14} />
          </button>
        </div>
      </section>
      <PropertiesPanel />
    </div>
  );
}
import { PropertiesPanel } from "./PropertiesPanel";
