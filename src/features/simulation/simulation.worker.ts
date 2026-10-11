import { simulate } from "../../hydraulic/epanet/engine";
import type { HydraulicModel } from "../../types/network";
self.onmessage = async (
  event: MessageEvent<{ input: HydraulicModel; wasmUrl: string }>,
) => {
  try {
    const response = await fetch(event.data.wasmUrl);
    if (!response.ok) throw new Error(`WASM HTTP ${response.status}`);
    self.postMessage({
      result: await simulate(
        event.data.input,
        new Uint8Array(await response.arrayBuffer()),
      ),
    });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
