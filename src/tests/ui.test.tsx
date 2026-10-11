// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { beforeAll, afterEach, it, expect } from "vitest";
import {
  render,
  screen,
  cleanup,
  act,
  fireEvent,
} from "@testing-library/react";
import { createDemo } from "../demo/projects";
import { simulate } from "../hydraulic/epanet/engine";
import { ResultsPanel, ResultStrip } from "../features/results/Results";
import { PropertiesPanel } from "../features/editor/PropertiesPanel";
import { useStore, currentResult } from "../app/store";
import type { SimulationResult } from "../types/network";
let result: SimulationResult;
beforeAll(async () => {
  result = await simulate(
    createDemo(),
    new Uint8Array(readFileSync("public/epanet-2.2.wasm")),
  );
  expect(result.status).toBe("calculated");
});
afterEach(cleanup);
it("renders actual calculated values and removes stale numbers after a hydraulic edit", () => {
  const p = { ...createDemo(), ...structuredClone(result.input) };
  useStore.setState({ project: p, language: "en" });
  useStore.getState().setResult(result);
  render(
    <>
      <ResultStrip />
      <ResultsPanel />
    </>,
  );
  expect(screen.getByText("Calculated", { exact: true })).toBeInTheDocument();
  expect(screen.getAllByText("6.37").length).toBeGreaterThan(0);
  act(() =>
    useStore.getState().edit((p) => {
      p.links.find((l) => l.type === "pump")!.status = "closed";
    }),
  );
  expect(currentResult(useStore.getState().project)).toBeNull();
  expect(
    screen.queryByText("Calculated", { exact: true }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("6.37")).not.toBeInTheDocument();
  expect(screen.getByText("Ready when you are")).toBeInTheDocument();
});
it("renders solver failure issues with no old result table", () => {
  const p = { ...createDemo(), ...structuredClone(result.input) };
  p.lastResult = {
    ...result,
    status: "solver_failed",
    nodes: [],
    links: [],
    issues: [
      {
        severity: "error",
        code: "solver",
        message: "Hydraulic convergence failed",
      },
    ],
  };
  useStore.setState({ project: p, language: "en" });
  render(<ResultsPanel />);
  expect(
    screen.getByRole("heading", { name: "Solver failed" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});
it("exposes a labeled PRV control in both languages and computes its displayed unit", () => {
  const p = { ...createDemo(), ...structuredClone(result.input) };
  useStore.setState({ project: p, language: "ar", selected: "PRV_1" });
  render(<PropertiesPanel />);
  expect(
    Number(
      (
        screen.getByRole("spinbutton", {
          name: "ضغط الضبط",
        }) as HTMLInputElement
      ).value,
    ),
  ).toBeCloseTo(65 * 0.0980665, 5);
  act(() => useStore.getState().setLanguage("en"));
  expect(
    screen.getByRole("spinbutton", { name: "Set pressure" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("combobox", { name: "Operating status" }),
  ).toBeInTheDocument();
});

it("keeps pump curve text synchronized with hydraulic undo and redo", () => {
  const p = createDemo();
  useStore.setState({
    project: p,
    language: "en",
    selected: "PUMP_1",
    past: [],
    future: [],
  });
  render(<PropertiesPanel />);
  const curveInput = screen.getByRole("textbox", { name: "Pump curve" });
  fireEvent.change(curveInput, {
    target: { value: "0, 120\n20, 100\n40, 60" },
  });
  expect(useStore.getState().project.pumpCurves[0].points[0].head).toBe(120);
  act(() => useStore.getState().undo());
  act(() => useStore.getState().select("PUMP_1"));
  expect(screen.getByRole("textbox", { name: "Pump curve" })).toHaveValue(
    "0, 100\n20, 85\n40, 50",
  );
  act(() => useStore.getState().redo());
  act(() => useStore.getState().select("PUMP_1"));
  expect(screen.getByRole("textbox", { name: "Pump curve" })).toHaveValue(
    "0, 120\n20, 100\n40, 60",
  );
});

it("invalid rated pump inputs and changed warning criteria cannot retain an earlier report", () => {
  const p = { ...createDemo(), ...structuredClone(result.input) };
  useStore.setState({ project: p, language: "en" });
  useStore.getState().setResult(result);
  expect(currentResult(useStore.getState().project)?.status).toBe("calculated");
  useStore.getState().edit((p) => {
    p.links.find((l) => l.type === "pump")!.ratedFlow = 0;
  });
  expect(currentResult(useStore.getState().project)).toBeNull();
  useStore.setState({ project: { ...p, lastResult: result } });
  useStore.getState().edit((p) => {
    p.settings.highPressureBar = 6;
  });
  expect(currentResult(useStore.getState().project)).toBeNull();
});
