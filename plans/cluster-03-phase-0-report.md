# Phase 0 report — CAD source and GLB inventory

## Status

**Verified**

Execution mode: Standard  
TDD: Off  
Scope: read-only CAD/GLB inventory only

## Target and source

- Workspace: C:/GitHub/BEANS/SCM-BEANS_Dashboard_FE
- CAD assembly: C:/FPT/3D/Coffee_Machine_V3/Coffee_Machine_V3/He01_ThietBiBenTrong/ThietBiCafe/may_nenv2/Final.SLDASM
- SolidWorks revision: 32.1.0
- Coordinate system: SOLIDWORKS assembly coordinate system
- Unit policy: SolidWorks API component transforms and Sketch coordinates are meters; runtime uses meters.
- Source CAD was not saved or modified.

## Evidence artifacts

- Extractor source: scripts/digital-twin/cluster-03/cad/Cluster03CadInventory.cs
- Inventory JSON: plans/cluster-03-phase-0-inventory.json
- Existing product changes were preserved; no product source file was modified in this phase.

## Inventory results

- Components in Final.SLDASM: 18
- Unique component IDs: 18
- Referenced SLDPRT parts: 18
- Assembly mate feature records: 51
- Extractor warnings: 0
- Part open errors/warnings: 0
- Temporary SolidWorks lock files were excluded from the report.

The 18 components are:

body_may, oc_left, oc_right, arm_left_1, arm_left_2, arm_left_3, arm_right_1, arm_right_2, arm_right_3, truc_chinh, truc_nen, gear_motor_chinh, gear_motor_nen, gear_nen, box_nen, head_nen, gac_coffee and wiper_gear.

## GLB mapping result

- Source final.glb: SOLIDWORKSGLTF, 18 meshes, 18 named mesh nodes.
- Target public/models/digital-twin/cluster-03/final.glb: 18 meshes, 18 named mesh nodes.
- Target final.glb component-to-node mapping: exact match for all 18 component IDs; no missing or extra node.
- oc_left.glb is a separate one-mesh artifact, but final.glb already contains oc_left-1. It must not be overlaid in runtime until render ownership is explicitly defined.

## CAD feature and Sketch result

Recorded Sketch features include:

- body_may.SLDPRT: Sketch1, Sketch2, Sketch3, Sketch6
- oc_left.SLDPRT: Sketch1, Sketch3
- oc_right.SLDPRT: Sketch1, Sketch2
- arm_left_1.SLDPRT: Sketch1, Sketch2
- arm_left_2.SLDPRT: Sketch1, Sketch3
- arm_left_3.SLDPRT: Sketch1
- arm_right_1.SLDPRT: Sketch1
- arm_right_2.SLDPRT: Sketch1, Sketch2
- arm_right_3.SLDPRT: Sketch1
- gac_coffee.SLDPRT: Sketch3, Sketch4
- truc_nen.SLDPRT: Sketch2
- wiper_gear.SLDPRT: Sketch1

The inventory stores each Sketch transform, segment identity, line/circle classification, parameters, raw evaluated points and curve parameters. body_may Sketch1 and Sketch2 each contain two segments and are available for the next path/connection phase.

## Verification record

| Check | Result | Evidence |
| --- | --- | --- |
| Active document is the requested Final.SLDASM | Passed | Inventory source.activePath |
| 18 components and 18 unique IDs | Passed | Inventory validation |
| All 18 required SLDPRT files present | Passed | Inventory validation |
| All parts opened without API errors/warnings | Passed | Part open result fields |
| 51 mate features discovered | Passed | Assembly feature tree |
| final.glb has exact 18-node mapping | Passed | Component/node comparison |
| Sketch records exist for required moving parts | Passed | Part Sketch inventory |
| Extractor compiles with installed SolidWorks Interop | Passed | Framework csc build |
| No lock file included in report | Passed | Inventory source file filter |
| No whitespace error in workspace diff | Passed | git diff --check |
| Product TypeScript/build checks | Deferred | No product code changed in Phase 0; required in Phase 11 |

## Review result

No material review findings.

The extractor:

- attaches to the already-open SolidWorks session instead of launching another one;
- verifies the active assembly path before reading;
- opens missing parts with silent/read-only options;
- closes only parts opened by the extractor;
- does not call Save or ExitApp;
- keeps SolidWorks/COM types inside the CAD extraction boundary;
- writes only the task-specific inventory artifact.

## Remaining risks and next gate

Phase 0 does not yet normalize mates into runtime connections, resolve the final parent/child dependency graph, or calibrate GLB pivots. Those are Phase 1 and later responsibilities.

The next gate is Phase 1: define and generate the cluster-03-only manifest under public/models/digital-twin/cluster-03/connections/. Do not animate or change the viewer before that manifest contract is reviewed.

