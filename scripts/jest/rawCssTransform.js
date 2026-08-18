// Jest doesn't understand webpack's inline loader syntax (`!!raw-loader!./File.css`), so
// DocumentReport.js's raw-loader imports of DocumentReport.css/WBSTreeDiagram.css/CTQTreeDiagram.css
// need a matching test-time path. package.json's jest.moduleNameMapper strips the `!!raw-loader!`
// prefix so those imports resolve to the same .css files everyone else bare-imports for side
// effects; this transform (registered over the same '^.+\\.css$' pattern react-scripts uses)
// exports each file's actual source text instead of react-scripts' default `{}` stub. Bare
// side-effect imports (`import './x.css';`) never read the export, so this is a strict upgrade —
// nothing that only had `{}` starts depending on real text, but the raw-loader imports that need
// real text now get it, keeping collectDocumentCss()'s test behavior aligned with what webpack
// actually inlines into the print/export iframe in the browser.
module.exports = {
  process(sourceText) {
    return `module.exports = ${JSON.stringify(sourceText)};`;
  },
  getCacheKey(sourceText, filename) {
    return filename;
  },
};
