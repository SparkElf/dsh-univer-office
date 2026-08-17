---
name: univer-board
description: Create, edit, inspect, and structurally verify Univer Board Units. Use for canvas shapes, connectors, images, charts, and layout.
---

# Univer Board Units

Load `univer` first. Resolve the Board with `univerAPI.getBoard(unitId)` and use `univer_api` for exact Board, shape, connector, image, and chart methods.

Record every created element ID. Use public Facade handles for mutation and explicit geometry, fill, stroke, text, and stacking values. Connectors must reference stable endpoint element IDs; do not infer a valid route from appearance or leave unresolved endpoint semantics.

After mutation, read back all relevant elements and verify IDs, kinds, bounds, text, stacking order, connector endpoints and route data, image sources, and chart references. Structural inspection cannot prove visual routing or clipping without screenshot support.

Board export is currently unsupported; deliver the ready worktree for review instead.
