import fs from 'fs';
import path from 'path';

const source=fs.readFileSync(path.join(__dirname,'Layout.js'),'utf8');

test('Layout switches to current-project DMAIC navigation only for an OE project',()=>{
  expect(source).toContain('projectContextNavigation(guidedProject)');
  expect(source).toContain('Current OE Project');
  expect(source).toContain('projectNavigation.phases.map');
});

test('global navigation remains the fallback outside OE project context',()=>{
  expect(source).toContain(':!toolQuery&&NAVIGATION.map');
});
