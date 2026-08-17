---
name: univer-sheet
description: Read, write, format, calculate, and structurally verify Univer Sheet Units. Use for spreadsheet values, formulas, ranges, tables, formatting, and Sheet export.
---

# Univer Sheet Units

Load `univer` first. `univer_execute` provides `univerAPI`, `api`, and `workbook`; do not redeclare them and do not use `require`.

## Cell model

Write explicit cell data:

```js
{ v: "text", t: 1 }
{ v: 42, t: 2 }
{ v: 1, t: 3 }
{ v: "00123", t: 4 }
{ f: "=A1+B1" }
```

`v` is the stored value, `t` is its type, `f` is formula source, and `s.n.pattern` is display formatting. Dates, percentages, and currencies are numbers plus number formats. Never write display text back as the stored value.

Use `workbook.getActiveSheet()` or `workbook.getSheetByName(name)`. Use `getCellDatas()` for authoritative `v/t/f/s` reads and `getDisplayValues()` only for visible text. `setValues()` merges cell fields; clear content explicitly before replacing a region.

## Formulas

Calculation is asynchronous. Register `api.getFormula().onCalculationResultApplied()` before triggering calculation, call `executeCalculation()` when recalculating existing formulas, and await the completion before reading cached values or exporting.

Use exact OOXML structured references for table formulas. Obtain the real table name from metadata; do not invent `table` as an alias. Distinguish `[#This Row]` from `[#Data]`.

## Verification

Use `univer_inspect` with an explicit Sheet range such as `Sheet1!A1:D20`. Verify stored values, types, formulas, and display values. For styles or rich text omitted by structured range inspection, use a read-only `univer_execute` call and return `getCellDatas()`.

Use `univer_api` before unfamiliar formatting, chart, table, filter, validation, pivot, image, comment, or conditional-formatting calls.
