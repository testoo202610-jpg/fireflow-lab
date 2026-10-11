`net1.inp` and `net1.out` are the official OWA EPANET test data, retrieved from:
https://github.com/OpenWaterAnalytics/EPANET/tree/dev/tests/data

The binary output header identifies EPANET 2.00.12. The regression test reads its
first-period pressure and flow blocks using the EPANET binary output format and
compares the same network at t=0 with OWA EPANET 2.2. Small tolerances allow solver
version changes. Values are not generated from this application's implementation.

The second independent reference is a reservoir/pipe/demand network evaluated
using the Hazen–Williams SI equation, described in EPANET 2.2 User Manual §3.1
and Appendix D. Diameter is internal diameter, roughness C=120, Q=0.010 m³/s.
