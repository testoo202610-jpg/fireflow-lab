import type { HydraulicModel, SimulationResult } from "../../types/network";
export function runSimulation(
  model: HydraulicModel,
): Promise<SimulationResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./simulation.worker.ts", import.meta.url),
      { type: "module" },
    );
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("EPANET timeout (30 s)"));
    }, 30000);
    worker.onmessage = (
      e: MessageEvent<{ result?: SimulationResult; error?: string }>,
    ) => {
      clearTimeout(timeout);
      worker.terminate();
      if (e.data.result) resolve(e.data.result);
      else reject(new Error(e.data.error ?? "Worker failure"));
    };
    worker.onerror = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(e.message));
    };
    worker.postMessage({
      input: model,
      wasmUrl: new URL(
        `${import.meta.env.BASE_URL}epanet-2.2.wasm`,
        document.baseURI,
      ).href,
    });
  });
}
