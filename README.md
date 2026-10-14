# FireFlow Lab

A working Arabic/English laboratory for **steady-state fire network hydraulics**.
React 19, TypeScript, Vite, Tailwind 4, React Flow, Zustand, Recharts, IndexedDB.
All calculated pressure and flow values come from **OWA EPANET 2.2** through
**epanet-js 0.9.0 / WebAssembly**, in an isolated browser Worker. No backend,
subscription, external AI API or API key is required for core use.

[الدليل العربي](README_AR.md) · [Engineering model](docs/ENGINEERING.md) · [Verified delivery](docs/VERIFICATION.md) · [Cloudflare deployment](docs/CLOUDFLARE.md)

## Run

Node.js 24+ and npm are recommended. From this directory:

```sh
npm install
npm run dev
```

Open `http://localhost:5173`. The default UI is Arabic (RTL); use **EN** in the
header to switch to English. `npm install` copies the pinned EPANET WASM asset
from the installed package into `public/`. The application serves it from the
same origin; calculations do not call an external server.

```sh
npm run typecheck
npm run lint
npm run test
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
npm run preview
```

The lockfile pins the versions verified in this session. Use `npm ci` for CI.

## Working features

- Interactive nodes and hydraulic links: drag, pan, zoom, fit, multi-select with
  Shift, connect handles, delete, duplicate, undo/redo (including Ctrl/Cmd+Z).
- Real tank/reservoir distinction; demand, floor and gauge nodes; pump curves;
  PRVs; pipe/CV and pipe + K valve equivalents. Dragging a pump or valve inserts
  its inlet/outlet junctions and a hydraulic link; connect it to the network.
- Editable SI properties and centralized bar/psi/m H₂O, L/s/L/min/m³/h, mm/inch
  conversions. Pipe diameters are **internal**, not nominal pipe schedule sizes.
- Steady-state PDA (default) or DDA; Hazen–Williams or Darcy–Weisbach.
- Validation, solver status, actual pressures/flows/heads/operating points,
  nonzero-flow arrows, source reachability, local engineering explanations.
- Three working demos, including two parallel pumps and a ten-level high rise.
- Input snapshots retained for every run; named/duplicated scenarios; pressure,
  flow, state and disconnection comparison; matched static/residual runs.
- IndexedDB autosave (750 ms debounce), restoration on reopen, library,
  create/duplicate/delete projects, schema-validated JSON import/export.
- EPANET INP export, results CSV, a print stylesheet and PDF via browser print.
- Pressure/floor, flow/link, pump curve/operating point, elevation/pressure and
  saved-scenario charts. Values are drawn from retained computed results.
- Responsive layouts, Arabic RTL/English LTR, themes, keyboard labels, native
  modal focus management and Error Boundary.

A hydraulic edit immediately clears the current result. Late Worker results
are accepted only when their hydraulic signature still matches current inputs.
Failed/invalid solves never reuse old numbers. Coordinates, units, names and
reference field readings do not affect hydraulic connectivity or the solver.

## Demos and field measurements

Choose **Open project → High-Rise Building → Run simulation**. On a phone,
**Menu → Open project**. The model has five main levels and five additional
tower levels, source, pump, main, risers, PRV and ZCV.

Select each floor/gauge node to edit elevation, demand and the optional
**Reference field pressure (bar)**. Edit pipe length, internal diameter and
roughness in link properties, and input the actual manufacturer pump curve
as `flow L/s, head m` points, one point per line. Rated flow/head are descriptive
inputs; **the head curve determines hydraulics**. Disable the educational flag
only when the entered curve is from actual data.

**Scenarios** and **Report** show Model − Field comparisons. Ground 11.5 bar
and highest point 6.6 bar in the high-rise demo are explicitly training
references. They are not imposed targets, solver outputs or evidence of
calibration. Add more measurements through node properties as needed.

## Files

| Path | Responsibility |
| --- | --- |
| `src/types/network.ts` | Strict domain/schema v1, snapshots and hydraulic signature |
| `src/hydraulic/epanet/engine.ts` | Real EPANET execution, status, convergence and result mapping |
| `src/hydraulic/adapters/inp.ts` | Pure domain → INP adapter |
| `src/hydraulic/validation/` / `units/` | Engineering checks and centralized conversions |
| `src/features/editor/` | React Flow editor and property/settings controls |
| `src/features/simulation/` | Worker lifecycle, timeout, WASM loading |
| `src/features/scenarios/` | Immutable snapshots, comparison and field values |
| `src/features/results/` / `reports/` | Tables, charts, rule insights, CSV, print report |
| `src/storage/projects.ts` | IndexedDB and JSON validation |
| `src/demo/projects.ts` | Educational inputs only; no fabricated calculated results |
| `src/tests/` / `e2e/` | Executable numerical, storage, component and browser tests |
| `.github/workflows/` | Checks and deployment to Pages |

## Deployment

The repository is now available at https://github.com/testoo202610-jpg/fireflow-lab.
The integration could not create it (HTTP 403); after it was created externally,
this session verified that it was empty and accessible for source upload.

The verified temporary Cloudflare preview is:
https://fireflow-lab.frosted-editor.workers.dev/

For permanent Cloudflare hosting, see [Cloudflare deployment](docs/CLOUDFLARE.md).
The account connection and deployment secrets are still required. Source upload
verification and deployment checks are recorded in `docs/VERIFICATION.md`.

The source is uploaded to the repository above. A normal clone already has its
remote configured; use `git push origin main` for subsequent changes. To publish a
separate copy from the ZIP, initialize Git and choose a new repository in your own
account rather than recreating this existing one.

Select **Settings → Pages → Source: GitHub Actions** in that new repository.
The optional manual `Deploy GitHub Pages` workflow builds with `/<repository-name>/` as Vite's base path and uploads `dist/`.
A manual deployment is available via `workflow_dispatch`. Deployment requires
Pages/Actions permissions. Always verify the returned production URL and run a
real simulation there before reporting deployment success.

## Limits

No extended-period simulation, water hammer, manufacturer valve opening
characteristics, automatic calibration or INP import. No claim of NFPA 13/20/25
compliance. Browser storage is local to the origin/device and is not cloud sync;
export JSON for backups. Worker execution times out at 30 seconds; schema v1
limits projects to 3,000 nodes, 5,000 links and 100 retained scenarios; imported
JSON is limited to 15 MB. Scope and actual checks are documented in `docs/`.

**This is an educational and analytical tool. Its outputs alone must not approve
the design, modification or operation of a real fire protection system. Verify
inputs and applicable standards with a qualified engineer.**

For the current Cloudflare target, see [Cloudflare deployment](docs/CLOUDFLARE.md).
The verified temporary preview is https://fireflow-lab.frosted-editor.workers.dev/.
GitHub source upload is complete; permanent Cloudflare hosting still requires the account secrets described there.
