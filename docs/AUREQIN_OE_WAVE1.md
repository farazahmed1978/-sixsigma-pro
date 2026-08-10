# Aureqin OE Wave 1: Data workspace, assumptions, and validation

## Scope and compatibility

Wave 1 extends the existing local-storage dataset registry and existing statistical tools. It does not replace project, authentication, organization, billing, entitlement, report, or analysis persistence. No database migration is required. Legacy columns without an explicit type continue to load as `auto`, and legacy datasets receive a deterministic compatibility version identifier when normalized.

## Worksheet audit

Already present before Wave 1:

- CSV import with Papa Parse, paste-data entry, blank worksheets, editable grid cells, multiple named project datasets, project assignment, dataset selection, rename, duplicate, archive, delete, metadata, history labels, summary/profile tabs, tool launch links, and coarse automatic numeric/categorical detection.
- A single text-contains filter and single-column sorting were available, but sorting changed the stored row order.
- Dataset version counters existed, but material transformations did not carry structured source/result lineage.

Added in Wave 1:

- Explicit `auto`, numeric, categorical, text, boolean, date, and date-time column declarations with inference confidence and visible conversion-failure counts. Invalid values are reported rather than silently coerced.
- A shared missing-value contract for blank, `null`, `undefined`, and numeric `NaN`; zero remains valid. Counts, percentages, variables with missingness, and complete-case selection are reusable.
- Non-destructive sort/filter row-index operations. The canonical source columns remain unchanged and the Worksheet distinguishes an active view from source data.
- Safe structured calculated expressions without `eval`; arithmetic, conditional logic, log, natural log, square root, absolute value, and power operations.
- Recode, z-score, center, scale, min-max, log, square-root, stack, pivot, unpivot, and keyed left/inner joins. Material preparation creates a derived dataset instead of overwriting its source.
- Reusable numeric and categorical profiles.

Deferred deliberately: XLS/XLSX ingestion, saved preparation recipes, grouped calculations, sampling UI, localized date parsing/extraction, Box-Cox, full unstack UX, snapshot rollback/undo, and server-side collaborative dataset versions. These need dedicated product and numerical contracts rather than implicit behavior.

## View operations and data mutations

`filter` and `sort` are view operations. They produce row indices and do not create a dataset version or alter canonical columns.

Calculated columns, recodes, transforms, stack/unpivot/pivot, and joins are data mutations. A mutation creates a new dataset ID/version ID and records operation, parameters, source dataset IDs, source version IDs, result identifiers, timestamp, and operation class. The current local registry persists this additively; a later server adapter can map the same lineage object to Foundation-0 dataset-version storage.

## Assumption diagnostic contract

Diagnostics are deterministic objects with `PASS`, `WARNING`, `FAIL`, or `NOT_ASSESSABLE`, plus method, statistic, p-value when applicable, practitioner message, implication, recommended next step, and rule version.

- Normality: Anderson-Darling, Q-Q coordinates, sample-size context, and explicit warning that a non-significant p-value does not prove normality. Shapiro-Wilk is reported as not assessable until an independently verified JS implementation is available.
- Equal variance: Brown-Forsythe/Levene as the robust default plus Bartlett with its sensitivity to nonnormality stated.
- Outliers: IQR and absolute standardized-score flags. Flags are potential outliers, never automatic deletions or declarations of data error.
- Sample size: deterministic information warning.
- Independence/stability: not assessable without ordering/design metadata; ordered input can receive a preliminary I-MR screen but never a claim that independence was proved.

The reusable `AssumptionReportCard` is integrated into one- and two-sample t workflows, one-way ANOVA, and linear regression. Report payloads can carry the diagnostic report and calculation provenance without screenshots.

## Extracted calculation engines

Pure versioned engines now cover one-sample t, Welch two-sample t, one-way ANOVA (wrapping the single existing shared implementation), simple linear regression, and I-MR. The normal application paths call these engines, preventing a second formula copy in their page components. Engines reject missing/non-numeric input unless the caller supplies an explicit preparation policy, and reject insufficient samples, zero variance, and incompatible lengths with actionable errors.

## Validation status

Executable manifests record method/version, runner, independent source, input dataset, expected outputs, tolerances, and notes. Coverage is output-aware: a passing fixture cannot promote a method to `VALIDATED` unless independent evidence covers every required output.

Current status after Wave 1:

| Method | Status | Reason |
| --- | --- | --- |
| One-sample t | PARTIALLY VALIDATED | NIST supports N, mean, SD, t, and df; exact SE, p-value, and CI are not certified by that source. |
| Welch two-sample t | PARTIALLY VALIDATED | Transparent independent arithmetic covers estimates, SE, t, and Welch-Satterthwaite df; exact p-value and CI still need a software oracle fixture. |
| One-way ANOVA | PARTIALLY VALIDATED | NIST raw data support SS, df, and rounded MS. Its displayed F is internally inconsistent with those observations, and exact p is not printed, so neither is certified. |
| Simple linear regression | PARTIALLY VALIDATED | NIST StRD supports coefficients, residual metrics, R-squared, sums/means of squares, and F; nested coefficient SE/t/p coverage remains separate. |
| I-MR | PARTIALLY VALIDATED | NIST supports observations, moving ranges, centers, I limits, and absence of outside points; MR-chart limits are not printed. |

No method is labeled fully `VALIDATED` in this wave. Shapiro-Wilk remains unvalidated and was not implemented. Box-Cox remains deferred.

## Reference authorities

- NIST/SEMATECH Engineering Statistics Handbook: one-sample t, Welch formulas, one-way ANOVA, and I-MR examples.
- NIST Statistical Reference Datasets: Norris linear-regression certified values.

References are stored on the executable catalog entries, including access date and qualification notes.
