# Adding a Validated Statistical Method

Validation is an executable evidence claim. A comment saying that a value was checked is not validation.

## Procedure

1. Put the calculation in a pure, versioned module. Do not import React components into the harness.
2. Add a catalog entry in `src/foundation/validationCatalog.js` with a stable `methodId`, `methodVersion`, implementation path, runner, and cases.
3. Use an authoritative independent source such as published method examples, Minitab Session output, R, or SciPy/statsmodels. Record product/library name, version, command, dataset provenance, and retrieval/publication date.
4. Store the exact input and expected structured outputs. Never transcribe only a rounded screen label when higher precision is available.
5. Mark `expected.referenceVerified: true` only after a second reviewer confirms the fixture and source. Until then, leave expected output absent and the method remains `UNVALIDATED`.
6. Set per-field tolerances. Use tight absolute tolerance near zero and relative tolerance for scale-dependent values. Explain any broad tolerance in reference metadata.
7. Cover ordinary, missing/NaN, invalid, constant, small-sample, extreme-tail, unbalanced, and method-specific edge cases.
8. Run `npm test -- --watchAll=false` and `CI=true npm run build`.

## Fixture shape

```js
{
  id: 'stable-case-id',
  input: { /* exact method input */ },
  expected: {
    referenceVerified: true,
    outputs: {
      estimate: 0,
      statistic: 0,
      df: 0,
      pValue: 0,
      confidenceInterval: [0, 0]
    }
  },
  tolerances: {
    default: { absolute: 1e-8, relative: 1e-6 },
    pValue: { absolute: 1e-10, relative: 1e-6 }
  },
  reference: {
    product: 'R',
    version: 'x.y.z',
    command: '...',
    source: '...',
    reviewedBy: '...',
    reviewedAt: '...'
  }
}
```

## Status rules

- `VALIDATED`: every required catalog case is independently verified and passes.
- `PARTIALLY VALIDATED`: verified passing evidence exists, but coverage is incomplete or another verified case fails.
- `UNVALIDATED`: no independently verified executable case exists.

Never change status manually in UI code. Derive it with `validateMethod` and persist the resulting status with the analysis reproducibility metadata.
