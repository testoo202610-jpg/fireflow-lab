# Hydraulic model contract

## Engine and units

The installed epanet-js 0.9.0 package defaults to a newer engine. This application
explicitly uses `Workspace` from `epanet-js/slim` and `EpanetEngine` from
`epanet-js/engines/v2.2`; the reference test verifies engine integer version 20200.
`Project` methods and enum definitions were checked against the installed package.
Browser Workers fetch same-origin WASM and pass its bytes directly to the factory.
Node tests also pass the installed binary explicitly to avoid file:// fetch failures.

INP units are LPS. Head, elevation, gauge pressure and PRV setting are meters of
water; pipe internal diameter is mm. Water specific gravity is 1. Pressure display
uses density 1000 kg/m³ and standard g=9.80665 m/s². 1 bar=100,000 Pa;
1 psi=6894.757293168 Pa. Head minus elevation gives gauge pressure, not absolute
pressure. Hazen–Williams roughness is C; Darcy–Weisbach roughness is mm. Switching
friction model resets roughness to clearly notified educational defaults (C=120
or ε=0.045 mm); users must then enter actual roughness data.

## Topology

Nodes are junctions/demands/gauges/floors, finite cylindrical tanks, or reservoirs
with fixed total hydraulic head. Hydraulic links connect independent immutable
IDs. Visual coordinates never define length, connectivity or elevation. A dropped
pump/valve creates two endpoint junctions plus one link. Sources and finite tanks
are distinct. Tank water volume changes over time are outside a duration-zero solve.

Pumps are native EPANET head-curve links; parallel/series placement is unrestricted.
Each pump may reference a different curve. The solver calculates the coupled
operating points rather than equally dividing flow. Enter at least two increasing
flow/decreasing positive-head points. Rated head/flow are descriptive; they do not
replace the curve. EPANET fits a power function for a three-point curve and uses
piecewise behavior for multipoint curves. Demo curves are educational inputs.
Separate CV links can be inserted for check-valve inspection. The pump's inlet and
outlet elevations and pressures belong to its endpoint nodes; there is no separate
pump elevation datum that overrides them.

PRV is the native pressure-reducing valve. Enabled PRVs retain numeric pressure
setting (not forced OPEN status); closed PRVs get CLOSED status. Actual downstream
pressure may be less than set pressure when head is insufficient. The solver handles
control status and reverse-flow restrictions. Validation rejects storage endpoints,
shared downstream PRVs and PRVs directly in series. Shared upstream PRVs are allowed.

Pipe is native PIPE; an open check valve is CV. A user-closed check valve becomes
an ordinary closed pipe because EPANET does not allow closing a CV via STATUS.
Gate, butterfly, isolation and ZCV links are finite-length pipe equivalents with
user-defined K, diameter, roughness, and open/closed state. They do **not** simulate
manufacturer valve opening curves, Cv tables or a hydraulic control valve.

ZCV isolation has the hydraulic effect above. Gauge readings reference inlet/outlet
nodes. Flow switch indication derives from computed nonzero link flow; tamper
indication derives from configured switch presence and closed isolation state.
Both are idealized logical monitoring metadata, not electrical device simulation.
The assembly is not a pump and creates no hydraulic energy. Attached flow meters
read computed link flow; pressure gauges read their actual hydraulic node pressure.

## Solve validity and snapshots

Validation checks sources, active supply reachability (directed through pumps,
CVs and PRVs), endpoints, duplicate IDs, diameters, lengths, roughness, K, demands,
pump curves, PRVs, tanks and warning limits. Disconnected models return Invalid
with **no numeric node/link results**. Reachability is a topological precheck;
EPANET can still close/reclassify a reachable component in its hydraulic solution.

Duration is zero. The toolkit uses openH/initH/runH at t=0 with 200 trials,
accuracy 0.001 and UNBALANCED STOP. Result mapping uses `getNodeIndex(id)` and
`getLinkIndex(id)`, never array position. Relative hydraulic error, iterations,
EPANET report warnings and finite-value checks are retained. Nonconvergence,
toolkit/WASM errors or worker timeout yield Solver Failed with no result numbers.
Link head loss is **signed difference of computed endpoint heads** (m); a pump
has negative head loss when it adds head. No m/km value is mislabeled as m.
Flow sign defines from→to or reverse direction; zero flow has no animation.

PDA default: minimum pressure 0 m, full-demand required pressure set by the user
(default 20 m), exponent 0.5. DDA forces requested demand and may return negative
pressures; it must not be interpreted as physically delivered demand. Static mode
sets consumer demands to zero. Matched static/residual comparisons change only
that demand condition, preserving equipment, head, elevations and loss inputs.
Arbitrary saved scenarios can also change pumps/valves and need not follow a blanket
rule that all residual pressures are lower than all static pressures.

Every run saves its complete input and output snapshot. Hydraulic signatures
exclude visual/display/reference-only metadata. A result from an earlier input is
cleared on hydraulic editing and cannot replace current data after a late response.
A failed current run never draws previous successful values. Undo/redo retains
input history without recycling previous computed results.

## Reference validation

Official OWA Net1 INP and binary output are retained under `src/tests/fixtures/`,
with source and binary format documented there. Tests compare all t=0 pressure
and flow results to this independent published reference; tolerances account for
EPANET 2.00.12 vs 2.2 solver differences. A reservoir/pipe/demand integration case
also compares EPANET to the independently evaluated SI Hazen–Williams formula.
Other tests use conservation, monotonic friction response, changed pump curves,
parallel shutdown, PRV insufficient head, invalid isolation, and toolkit failures.

Field readings are optional references, not constraints and not calculated
outputs. Model − Field is reported explicitly. No optimizer, calibration claim,
code-compliance certification, transient model or automatic real-system operating
recommendation is provided. Real system design/operation requires qualified review.

The pump flow metric explicitly sums individual pump link rates. In a series
arrangement the same water is counted at each pump; this metric is not net system
supply. Inspect each pump's calculated operating point and total delivered demand
for the quantities of interest.
