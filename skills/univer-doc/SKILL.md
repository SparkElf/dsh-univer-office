---
name: univer-doc
description: Create, edit, inspect, and structurally verify Univer Doc Units. Use for paragraphs, rich text, tables, images, charts, and document export.
---

# Univer Doc Units

Load `univer` first. `univer_execute` provides `univerAPI`, `api`, and `doc`; do not redeclare them.

Select paragraphs with `doc.getParagraphs()` or `doc.getParagraph(id)`. Preserve the Doc data-stream paragraph terminator and use public Facade methods for insertion, deletion, and styling. Pass paragraph properties and text style deliberately; later style writes can replace earlier fields.

Use `univer_api find` and `show` for exact paragraph, range, table, image, chart, header, footer, page, and document-mode APIs. Do not use Doc model internals or mutate detached data objects.

Use stable Base64 data URIs for local images. Do not persist expiring signed URLs.

After mutation, inspect the document and relevant paragraphs. Verify full text, paragraph order, styles, table dimensions, image identities, and page-mode fields that matter to the task. Export to `.docx` only after structural readback succeeds. Visual pagination is not verified without screenshot support.
