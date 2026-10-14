import { spawn } from "node:child_process";

// Pages serves this static app at the origin root, including its browser Worker
// and same-origin EPANET WASM. Do not reuse the GitHub Pages repository base.
const isWindows = process.platform === "win32";
const child = spawn(isWindows ? "npm.cmd" : "npm", ["run", "build"], {
  stdio: "inherit",
  shell: isWindows,
  env: { ...process.env, VITE_BASE_PATH: "/" },
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
