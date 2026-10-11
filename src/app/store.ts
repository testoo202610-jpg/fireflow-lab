import { create } from "zustand";
import { createDemo } from "../demo/projects";
import {
  hydraulicSignature,
  modelOf,
  type Project,
  type SimulationResult,
  type Language,
  type HydraulicModel,
} from "../types/network";
import { snapshotScenario } from "../features/scenarios/scenarios";
interface State {
  project: Project;
  selected: string | null;
  language: Language;
  dark: boolean;
  past: Project[];
  future: Project[];
  busy: boolean;
  notice: string;
  activeTab: "network" | "dashboard" | "scenarios" | "report";
  edit: (fn: (p: Project) => void, history?: boolean) => void;
  load: (p: Project) => void;
  select: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  setLanguage: (l: Language) => void;
  toggleTheme: () => void;
  setBusy: (b: boolean) => void;
  setNotice: (s: string) => void;
  setTab: (t: State["activeTab"]) => void;
  setResult: (r: SimulationResult) => void;
  saveScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  reset: () => void;
}
const retained = (p: Project): Project => {
  const copy = structuredClone(p);
  copy.lastResult = null;
  return copy;
};
export const useStore = create<State>((set, get) => ({
  project: createDemo(),
  selected: null,
  language:
    (localStorage.getItem("fireflow-language") as Language) === "en"
      ? "en"
      : "ar",
  dark: localStorage.getItem("fireflow-theme") !== "light",
  past: [],
  future: [],
  busy: false,
  notice: "",
  activeTab: "network",
  edit: (fn, history = true) =>
    set((s) => {
      const p = structuredClone(s.project);
      fn(p);
      p.updatedAt = new Date().toISOString();
      if (p.lastResult?.signature !== hydraulicSignature(p))
        p.lastResult = null;
      return {
        project: p,
        past: history ? [...s.past, retained(s.project)].slice(-40) : s.past,
        future: history ? [] : s.future,
      };
    }),
  load: (p) =>
    set({
      project: structuredClone(p),
      selected: null,
      past: [],
      future: [],
      notice: "",
    }),
  select: (id) => set({ selected: id }),
  undo: () =>
    set((s) =>
      s.past.length
        ? {
            project: s.past[s.past.length - 1],
            past: s.past.slice(0, -1),
            future: [retained(s.project), ...s.future],
            selected: null,
          }
        : {},
    ),
  redo: () =>
    set((s) =>
      s.future.length
        ? {
            project: s.future[0],
            future: s.future.slice(1),
            past: [...s.past, retained(s.project)],
            selected: null,
          }
        : {},
    ),
  setLanguage: (language) => {
    localStorage.setItem("fireflow-language", language);
    set({ language });
  },
  toggleTheme: () =>
    set((s) => {
      localStorage.setItem("fireflow-theme", s.dark ? "light" : "dark");
      return { dark: !s.dark };
    }),
  setBusy: (busy) => set({ busy }),
  setNotice: (notice) => set({ notice }),
  setTab: (activeTab) => set({ activeTab }),
  setResult: (r) =>
    set((s) =>
      r.signature === hydraulicSignature(s.project)
        ? { project: { ...s.project, lastResult: r } }
        : {
            notice:
              "Inputs changed; discarded previous calculation / تغيرت المدخلات وأُهملت النتيجة السابقة",
          },
    ),
  saveScenario: (name) =>
    get().edit((p) => {
      p.scenarios.push(snapshotScenario(name, p, p.lastResult));
    }),
  loadScenario: (id) => {
    const s = get().project.scenarios.find((s) => s.id === id);
    if (s)
      get().edit((p) =>
        Object.assign(p, modelOf(s.input), {
          lastResult: s.result ? structuredClone(s.result) : null,
        }),
      );
  },
  reset: () => {
    const first = get().project.scenarios[0];
    if (first) get().loadScenario(first.id);
    else
      get().edit((p) => {
        p.settings.mode = "residual";
        p.links.forEach((l) => (l.status = "open"));
      });
  },
}));
export const currentResult = (p: Project) =>
  p.lastResult?.signature === hydraulicSignature(p) ? p.lastResult : null;
export const replaceModel = (p: Project, m: HydraulicModel) =>
  Object.assign(p, modelOf(m), { lastResult: null });
