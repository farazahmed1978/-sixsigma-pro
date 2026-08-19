// Jest/jsdom test environment setup. Create React App auto-loads this file (via
// setupFilesAfterEnv) whenever it exists, with no config changes required.
//
// jsdom has no ResizeObserver, and recharts' <ResponsiveContainer> (used throughout
// ProjectHealthCharts.js) requires one to measure its container on mount. This is a minimal,
// no-op polyfill — it never actually fires resize callbacks, so a chart in jsdom renders at 0x0,
// which is fine for tests that assert on rendered text/DOM structure rather than pixel geometry.
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
