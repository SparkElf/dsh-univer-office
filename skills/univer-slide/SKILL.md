---
name: univer-slide
description: Create, edit, inspect, and structurally verify Univer Slide Units. Use for presentations, pages, shapes, text, images, tables, charts, and slide export.
---

# Univer Slide Units

Load `univer` first. `univer_execute` provides `univerAPI`, `api`, and `presentation`; do not redeclare them.

A presentation contains ordered slides, and each slide contains ordered elements such as shapes, images, groups, tables, and charts. Select pages with `presentation.getSlideByIndex(index)`, `getSlideById(id)`, or `getSlides()`.

Use `univer_api` for exact insertion and mutation signatures. Record returned element IDs immediately. Mutate live Facade handles; detached values from getters do not persist when modified. Explicitly set transforms, fill, stroke, text color, wrapping, auto-fit, padding, and stacking order instead of relying on renderer defaults.

Preserve each text paragraph's terminating `\r`. After text insertion or deletion, reacquire text-run handles before later edits.

After each page mutation, inspect that page and verify element IDs, kinds, coordinates, dimensions, text, ordering, and references. Inspect the complete presentation before marking ready. Structural inspection cannot prove clipping, font substitution, or overall visual quality; disclose that limitation when it matters. Export to `.pptx` only after readback succeeds.
