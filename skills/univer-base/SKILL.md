---
name: univer-base
description: Create, edit, inspect, and structurally verify Univer Base Units. Use for Base tables, fields, records, views, and formulas.
---

# Univer Base Units

Load `univer` first. Resolve the Base with `univerAPI.getBase(unitId)` and query exact `FBase`, table, field, record, and view methods through `univer_api` before writing unfamiliar code.

Base Formula fields use Excel structured references. Resolve each table's actual formula name with `table.getFormulaName()`; it may differ from the display name. Use `[#This Row]` only for row-aligned scalar access and `[#Data]` for complete columns. Never use `table` as a placeholder identifier.

When a Base Formula field references another Unit, persist the complete external-reference binding and keep its qualifier identical to the formula text. Await calculation and read computed record values back; stored formula text alone is not evidence.

After mutation, verify table IDs, formula names, field names and types, record values, view configuration, formula source, bindings, and calculated values. Base may export to `.xlsx`, `.csv`, or `.tsv`.
