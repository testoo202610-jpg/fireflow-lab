import { useEffect, useRef, useState, lazy, Suspense } from "react";
import {
  Flame,
  FolderOpen,
  Save,
  Plus,
  Play,
  Download,
  Upload,
  ChevronDown,
  Sun,
  Moon,
  Check,
  X,
  Folder,
  Copy,
  Trash2,
  GitBranch,
  Activity,
  GitCompareArrows,
  FileText,
  RotateCcw,
  LoaderCircle,
  Info,
  Menu,
} from "lucide-react";
import { useStore, currentResult } from "./store";
import { useT, DISCLAIMER_AR, DISCLAIMER_EN } from "../i18n";
import { NetworkEditor } from "../features/editor/NetworkEditor";
import {
  ResultStrip,
  ResultsPanel,
  resultsCsv,
} from "../features/results/Results";
const ScenariosPanel = lazy(() =>
  import("../features/scenarios/ScenariosPanel").then((m) => ({
    default: m.ScenariosPanel,
  })),
);
const Dashboard = lazy(() =>
  import("../features/results/Dashboard").then((m) => ({
    default: m.Dashboard,
  })),
);
const Report = lazy(() =>
  import("../features/reports/Report").then((m) => ({ default: m.Report })),
);
import { createDemo, emptyProject, DEMOS } from "../demo/projects";
import {
  saveProject,
  listProjects,
  loadProject,
  restoreActive,
  deleteProject,
  duplicateProject,
  parseProject,
  download,
  exportProject,
} from "../storage/projects";
import { runSimulation } from "../features/simulation/service";
import { snapshotScenario } from "../features/scenarios/scenarios";
import {
  hydraulicSignature,
  modelOf,
  newId,
  type Project,
  type SimulationResult,
} from "../types/network";
import { toInp } from "../hydraulic/adapters/inp";
import { validateModel, disconnectedNodes } from "../hydraulic/validation";
import { ENGINE_NAME } from "../hydraulic/epanet/version";
export function App() {
  const state = useStore(),
    t = useT(),
    p = state.project,
    ar = state.language === "ar";
  const [library, setLibrary] = useState(false),
    [hydrated, setHydrated] = useState(false),
    [saveStatus, setSaveStatus] = useState(""),
    [menuOpen, setMenu] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let mounted = true;
    void restoreActive()
      .then((project) => {
        if (mounted) {
          if (project) useStore.getState().load(project);
          setHydrated(true);
        }
      })
      .catch((e) => {
        if (mounted) {
          setHydrated(true);
          useStore.getState().setNotice(String(e));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = state.language;
    document.documentElement.dir = ar ? "rtl" : "ltr";
    document.documentElement.dataset.theme = state.dark ? "dark" : "light";
  }, [state.language, state.dark, ar]);
  useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      setSaveStatus("saving");
      void saveProject(p)
        .then(() => setSaveStatus("saved"))
        .catch((e) => {
          setSaveStatus("error");
          useStore.getState().setNotice(String(e));
        });
    }, 750);
    return () => clearTimeout(timeout);
  }, [p, hydrated]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        if (e.shiftKey) useStore.getState().redo();
        else useStore.getState().undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const save = async () => {
    try {
      await saveProject(p);
      setSaveStatus("saved");
      state.setNotice(t("saved"));
    } catch (e) {
      state.setNotice(String(e));
    }
  };
  const run = async () => {
    state.setBusy(true);
    state.setNotice("");
    state.edit((p) => {
      p.lastResult = null;
    }, false);
    const input = modelOf(p);
    try {
      const r = await runSimulation(input);
      state.setResult(r);
      state.edit((p) => {
        p.scenarios.push(
          snapshotScenario(
            `${input.settings.mode} • ${p.scenarios.length + 1}`,
            input,
            r,
          ),
        );
        p.scenarios = p.scenarios.slice(-100);
      }, false);
    } catch (e) {
      const r: SimulationResult = {
        id: newId("R"),
        createdAt: new Date().toISOString(),
        engine: ENGINE_NAME,
        status: "solver_failed",
        signature: hydraulicSignature(input),
        input,
        issues: [{ severity: "error", code: "worker", message: String(e) }],
        disconnected: disconnectedNodes(input),
        nodes: [],
        links: [],
        iterations: 0,
        relativeError: 0,
        report: "",
      };
      state.setResult(r);
    } finally {
      state.setBusy(false);
    }
  };
  const newProject = async () => {
    try {
      await saveProject(p);
      state.load(emptyProject());
      state.setTab("network");
    } catch (error) {
      state.setNotice(String(error));
    }
  };
  const result = currentResult(p),
    validation = validateModel(p);
  const tabs = [
    { key: "network", icon: GitBranch },
    { key: "dashboard", icon: Activity },
    { key: "scenarios", icon: GitCompareArrows },
    { key: "report", icon: FileText },
  ] as const;
  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            state.setTab("network");
          }}
        >
          <span className="brand-mark">
            <Flame size={24} strokeWidth={2} />
          </span>
          <div>
            <strong dir="ltr">
              FireFlow <span>Lab</span>
            </strong>
            <small>{t("laboratory")}</small>
          </div>
        </a>
        <div className="header-actions">
          <button className="header-action" onClick={() => void newProject()}>
            <Plus size={17} />
            <span>{t("new")}</span>
          </button>
          <button
            className="header-action"
            onClick={() => {
              setLibrary(true);
              setMenu(false);
            }}
          >
            <FolderOpen size={17} />
            <span>{t("open")}</span>
          </button>
          <button className="header-action" onClick={() => void save()}>
            <Save size={16} />
            <span>{t("save")}</span>
          </button>
          <details className="export-menu">
            <summary>
              <Download size={16} />
              <span>{t("export")}</span>
              <ChevronDown size={12} />
            </summary>
            <div className="dropdown">
              <button
                onClick={() => download(`${p.name}.json`, exportProject(p))}
              >
                {t("exportJson")}
              </button>
              <button
                onClick={() => {
                  const errors = validateModel(p).filter(
                    (i) => i.severity === "error",
                  );
                  if (errors.length) {
                    state.setNotice(errors.map((i) => i.message).join(" · "));
                    return;
                  }
                  download("fireflow-network.inp", toInp(p), "text/plain");
                }}
              >
                {t("exportInp")}
              </button>
              <button
                disabled={result?.status !== "calculated"}
                onClick={() =>
                  result &&
                  download(
                    "fireflow-results.csv",
                    resultsCsv(result),
                    "text/csv;charset=utf-8",
                  )
                }
              >
                {t("exportCsv")}
              </button>
              <button
                onClick={() => {
                  state.setTab("report");
                }}
              >
                {t("print")}
              </button>
            </div>
          </details>
          <button
            className="header-action import-button"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={16} />
            <span>{t("import")}</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label={t("import")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 15_000_000) {
                  state.setNotice("Max 15 MB");
                  return;
                }
                void file
                  .text()
                  .then((text) => {
                    const imported = parseProject(text);
                    state.load(imported);
                    state.setTab("network");
                  })
                  .catch((error) => state.setNotice(String(error)));
              }
              e.target.value = "";
            }}
          />
        </div>
        <div className="header-end">
          <button
            className="language-button"
            onClick={() => state.setLanguage(ar ? "en" : "ar")}
            aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}
          >
            {ar ? "EN" : "عربي"}
          </button>
          <button
            className="icon-btn theme-button"
            aria-label={ar ? "تغيير المظهر" : "Toggle theme"}
            onClick={state.toggleTheme}
          >
            {state.dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="icon-btn mobile-menu"
            aria-label={ar ? "القائمة" : "Menu"}
            onClick={() => setMenu(!menuOpen)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="mobile-actions">
          <button onClick={() => void newProject()}>{t("new")}</button>
          <button
            onClick={() => {
              setLibrary(true);
              setMenu(false);
            }}
          >
            {t("open")}
          </button>
          <button onClick={() => void save()}>{t("save")}</button>
          <button onClick={() => fileInput.current?.click()}>
            {t("import")}
          </button>
          <button onClick={() => download(`${p.name}.json`, exportProject(p))}>
            {t("exportJson")}
          </button>
        </div>
      )}
      <main aria-busy={state.busy}>
        <div className="project-bar">
          <div className="project-heading">
            <span className="eyebrow">FIRE PROTECTION / HYDRAULICS</span>
            <div className="project-title">
              <input
                value={p.name}
                aria-label={ar ? "اسم المشروع" : "Project name"}
                maxLength={100}
                onChange={(e) =>
                  state.edit((p) => {
                    p.name = e.target.value || "FireFlow";
                  })
                }
              />
              <span className="pill educational">
                <span className="live-dot" />
                {t("educational")}
              </span>
            </div>
            <div className="project-meta">
              <span>
                {saveStatus === "saved" ? (
                  <Check size={12} />
                ) : saveStatus === "saving" ? (
                  <LoaderCircle size={12} />
                ) : (
                  <Save size={12} />
                )}{" "}
                {saveStatus === "saved"
                  ? t("autosaved")
                  : ar
                    ? "حفظ محلي في المتصفح"
                    : "Local browser storage"}
              </span>
              <span dir="ltr">EPANET 2.2 · WASM</span>
            </div>
          </div>
          <div className="simulation-actions">
            <button
              className="icon-btn reset-button"
              title={t("reset")}
              aria-label={t("reset")}
              onClick={state.reset}
            >
              <RotateCcw size={16} />
            </button>
            <select
              aria-label={t("mode")}
              value={p.settings.mode}
              onChange={(e) =>
                state.edit((p) => {
                  p.settings.mode = e.target.value as "static" | "residual";
                })
              }
            >
              <option value="static">{t("static")}</option>
              <option value="residual">{t("residual")}</option>
            </select>
            <button
              className="primary-button run-button"
              disabled={state.busy || !hydrated}
              onClick={() => void run()}
            >
              {state.busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
              {state.busy ? t("running") : t("run")}
            </button>
          </div>
        </div>
        <nav
          className="main-tabs"
          aria-label={ar ? "أقسام التطبيق" : "Application sections"}
        >
          {tabs.map(({ key, icon: I }) => (
            <button
              key={key}
              className={state.activeTab === key ? "active" : ""}
              onClick={() => state.setTab(key)}
            >
              <I size={16} />
              {t(key)}
              {key === "scenarios" && p.scenarios.length > 0 && (
                <small>{p.scenarios.length}</small>
              )}
            </button>
          ))}
          <span
            className={`validation-summary ${validation.some((i) => i.severity === "error") ? "orange" : "teal"}`}
          >
            <span className="live-dot" />
            {validation.some((i) => i.severity === "error")
              ? `${validation.filter((i) => i.severity === "error").length} ${t("warnings")}`
              : ar
                ? "نموذج قابل للحساب"
                : "Model ready to calculate"}
          </span>
        </nav>
        {state.notice && (
          <div className="notice" role="status">
            <Info size={17} />
            <span>{state.notice}</span>
            <button
              className="icon-btn"
              aria-label={t("close")}
              onClick={() => state.setNotice("")}
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className="page-content">
          <Suspense
            fallback={
              <div className="panel loading-panel">
                <LoaderCircle className="spin" size={22} />
                {ar ? "جاري تحميل اللوحة…" : "Loading panel…"}
              </div>
            }
          >
            {state.activeTab === "network" ? (
              <>
                <ResultStrip />
                <NetworkEditor />
                <ResultsPanel />
              </>
            ) : state.activeTab === "dashboard" ? (
              <Dashboard />
            ) : state.activeTab === "scenarios" ? (
              <ScenariosPanel />
            ) : (
              <Report />
            )}
          </Suspense>
        </div>
      </main>
      <footer className="app-footer">
        <span>
          <Flame size={13} /> {t("footnote")}
        </span>
        <button
          onClick={() => {
            state.setTab("report");
          }}
          title={ar ? DISCLAIMER_AR : DISCLAIMER_EN}
        >
          {ar ? "الافتراضات والقيود" : "Assumptions & limitations"}
          <Info size={12} />
        </button>
        <small dir="ltr">FireFlow Lab v1.0 · Browser local</small>
      </footer>
      {library && <ProjectLibrary onClose={() => setLibrary(false)} />}
    </div>
  );
}
function ProjectLibrary({ onClose }: { onClose: () => void }) {
  const state = useStore(),
    t = useT(),
    ar = state.language === "ar",
    dialog = useRef<HTMLDialogElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const refresh = () =>
    void listProjects()
      .then(setProjects)
      .catch((e) => useStore.getState().setNotice(String(e)));
  useEffect(() => {
    dialog.current?.showModal();
    void listProjects()
      .then(setProjects)
      .catch((e) => useStore.getState().setNotice(String(e)));
  }, []);
  const switchProject = async (project: Project) => {
    await saveProject(state.project);
    state.load(project);
    state.setTab("network");
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="project-dialog"
      onCancel={onClose}
      aria-labelledby="library-title"
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">PROJECT LIBRARY</span>
          <h2 id="library-title">{t("demoLibrary")}</h2>
        </div>
        <button className="icon-btn" aria-label={t("close")} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <h3>{t("welcome")}</h3>
      <p className="subtle">{t("demoDescription")}</p>
      <div className="demo-cards">
        {DEMOS.map((name, i) => (
          <button
            className="demo-card"
            key={name}
            onClick={() => void switchProject(createDemo(i))}
          >
            <span className={`demo-graphic graphic-${i}`}>
              <GitBranch size={28} />
              <span>0{i + 1}</span>
            </span>
            <strong dir="ltr">{name}</strong>
            <p>
              {i === 0
                ? ar
                  ? "خزان، مضخة، PRV وثلاثة أدوار"
                  : "Tank, pump, PRV and three floors"
                : i === 1
                  ? ar
                    ? "مضختان، منحنيات مستقلة وشبكة متفرعة"
                    : "Two pumps and a branching network"
                  : ar
                    ? "عشرة مستويات ومقارنة قياسات ميدانية"
                    : "Ten levels and field comparison"}
            </p>
            <small>
              {t("educational")} <Play size={12} />
            </small>
          </button>
        ))}
      </div>
      <h3>{t("localProjects")}</h3>
      <div className="local-projects">
        {projects.length ? (
          projects.map((p) => (
            <article key={p.id}>
              <Folder size={19} />
              <div>
                <strong>{p.name}</strong>
                <small>
                  {p.nodes.length} {t("nodes")} ·{" "}
                  {new Date(p.updatedAt).toLocaleString(ar ? "ar" : "en")}
                </small>
              </div>
              <button
                className="secondary-button"
                onClick={() =>
                  void loadProject(p.id).then((project) => {
                    if (project) void switchProject(project);
                  })
                }
              >
                {t("load")}
              </button>
              <button
                className="icon-btn"
                aria-label={`${t("copy")} ${p.name}`}
                onClick={() =>
                  void saveProject(duplicateProject(p)).then(refresh)
                }
              >
                <Copy size={15} />
              </button>
              <button
                className="icon-btn"
                aria-label={`${t("delete")} ${p.name}`}
                onClick={() =>
                  void deleteProject(p.id).then(() => {
                    if (p.id === state.project.id) state.load(emptyProject());
                    refresh();
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))
        ) : (
          <p className="subtle">
            {ar
              ? "سيظهر هنا كل مشروع تحفظه في هذا المتصفح."
              : "Saved projects in this browser appear here."}
          </p>
        )}
      </div>
    </dialog>
  );
}
