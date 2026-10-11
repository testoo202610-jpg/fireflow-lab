# Verified delivery — 2026-10-11 UTC

These are executed results, not planned checks.

| Check | Actual result |
| --- | --- |
| `npm install` / reproducible `npm ci` | Passed; postinstall copied the installed WASM binary |
| `npm run dev` + HTTP GET | Served the application successfully |
| `npm run typecheck` | Passed, strict TypeScript |
| `npm run lint` | Passed, no errors or warnings in final check |
| `npm run test` | **34 tests passed in 7 files** |
| `npm run build` | Passed; generated production `dist/` |
| `npm run test:e2e` (dev) | **8 passed**: 4 desktop Chromium + 4 Pixel 7 Chromium |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e` | **8 passed against final production build**, 17.0 s |
| Pages-style `/fireflow-lab/` build | Built and served locally; same-origin WASM returned HTTP 200; High-Rise solve, charts and report verified; no page errors |
| Printable report | Chromium generated an A4, 5-page PDF; text inspection found EPANET version, pressures and highest floor results |
| Actions configuration | Both workflow YAML files parsed successfully; remote workflows have not run |

## Test coverage

- Standard-gravity pressure conversions, flow/diameter conversions and hydraulic
  head/elevation relationship.
- Pump curve data, PRV restrictions, pipe inputs, demands, tank/source topology
  and parallel source reachability.
- IndexedDB save/load/active restoration/deletion, schema v1 JSON roundtrip and
  rejection, independent project/scenario copies and result validity signatures.
- Real EPANET solves for all three demos; independently evaluated Hazen–Williams
  loss; official OWA Net1 reference binary pressure/flow regression (all elements).
- Demand/friction response, changed pump curve response, shutdown of one parallel
  pump, PRV insufficient head, invalid isolated input and real toolkit failure.
- Stable element ID result mapping with reversed arrays and changed positions.
- Static zero demands vs residual demands, stale result removal, invalid rated
  pump data and changed report limits, bilingual property controls, curve undo/redo.
- Browser demo selection, PRV change, runs, changed numeric results, pump stop,
  no stale numbers on invalid solve, scenario comparison, matched static/residual,
  save/reload, language and direction, mobile layout, field references, four
  dashboard charts, report, JSON download, duplicate and undo/redo.

The hydraulic reference tests do not use fabricated expected solver results.
Official Net1 test fixtures retain their source URL and original engine version;
Hazen–Williams reference values are independently evaluated from the manual equation.

## Deployment blocker

Authenticated GitHub account: `testoo202610-jpg`. A new unrelated repository was
not reused. Creation of `fireflow-lab` was attempted once via GraphQL CLI and once
via REST. Both were rejected: `Resource not accessible by integration`; REST HTTP
403. **No GitHub repository was created, no remote workflow ran, and no public
production deployment is claimed.** Local Git and ready-to-run CI/Pages workflows
are supplied. The permission required is creating a new repository, followed by
Actions/Pages setup in that repository.

Sites hosting helpers were also unavailable in this execution environment; no
Site was registered and no Sites production URL is claimed. The verified preview
URLs are local execution URLs, not public hosting URLs.

## Scope and remaining work

Working core: actual editor, real steady-state EPANET, three demos, editable pumps
and valves, derived visual results, local durable storage, input snapshots,
comparison, bilingual responsive UI, dashboard, exports and printable report.

Not implemented: INP import, extended-period simulation, transient/water hammer,
manufacturer valve opening models, automatic calibration, cloud project sync,
automatic pump/check-valve assembly association. Explicit check-valve links are
available and pump elevations belong to their inlet/outlet nodes.

Only Chromium desktop and Android-sized Chromium were browser-tested. Firefox
and Safari were not tested. No formal accessibility or regulatory certification
is claimed. Vite emitted its standard >500 kB chunk warning (main ~577 kB raw,
~181 kB gzip; toolkit Worker ~770 kB raw); dashboard/report/comparison are lazy
loaded. The build succeeded and actual browser runs passed. These checks establish
software behavior on the supplied models, not approval for real fire systems.
