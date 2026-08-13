import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import CTQTreeDiagram,{buildCTQTree,CTQ_PRINT_LAYOUT} from './CTQTreeDiagram';
import {ReportPrintDocument} from '../pages/ReportPrintDocument';

const branch=(id,need,driver,ctq,specification)=>({id,need,driver,ctq,specification,collapsed:false});
const rows=[
 branch('1','Fast service','Responsiveness','Wait time','Under 5 minutes'),
 branch('2','Fast service','Responsiveness','Answer time','Under 20 seconds'),
 branch('3','Fast service','Availability','Uptime','99.9%'),
 branch('4','Accurate orders','Order quality','Defect rate','Below 0.5%'),
];

test('builds exact Need → Driver → CTQ → Specification hierarchy and shares nodes',()=>{
 const tree=buildCTQTree(rows);
 expect(tree).toHaveLength(2);
 expect(tree[0].drivers).toHaveLength(2);
 expect(tree[0].drivers[0].ctqs).toHaveLength(2);
 expect(tree[0].drivers[0].ctqs[0].specifications[0].label).toBe('Under 5 minutes');
});

test('existing saved branches and long labels render without migration or editing controls',()=>{
 const long='Customer response must remain readable even when this saved label contains substantially more detail than usual';
 const html=renderToStaticMarkup(<CTQTreeDiagram branches={[...rows,branch('5',long,'Driver','CTQ','Specification')]}/>);
 expect(html).toContain(long);
 expect(html).toContain('ctq-node-specification');
 expect(html).not.toContain('<input');
 expect(html).not.toContain('Add branch');
});

test('empty optional branches do not create meaningless nodes',()=>{
 expect(buildCTQTree([branch('empty','','','','')])).toEqual([]);
});

test('report print uses the shared CTQ diagram for a saved CTQ document snapshot',()=>{
 const reportModel={sections:[{phase:'Define',items:[{id:'ctq-report',title:'CTQ Tree',statsSummary:{},documentSnapshot:{templateId:'ctq-tree',values:{ctqTree:rows}}}]}]};
 const html=renderToStaticMarkup(<ReportPrintDocument reportTitle="QA" preparedBy="QA" project={{name:'Persistence Project'}} reportModel={reportModel}/>);
 expect(html).toContain('aria-label="CTQ Tree diagram"');
 expect(html).toContain('Fast service');
 expect(html).not.toContain('<input');
});

test('print layout declares four fitting hierarchy columns without a terminal trailing track',()=>{
 expect(CTQ_PRINT_LAYOUT).toEqual(expect.objectContaining({hierarchyColumns:4,terminalTrack:false,wrapLongText:true}));
 const html=renderToStaticMarkup(<CTQTreeDiagram branches={rows}/>),host=document.createElement('div');host.innerHTML=html;
 expect(host.querySelectorAll('.ctq-leaf')).toHaveLength(4);
 expect(host.querySelectorAll('.ctq-leaf > .ctq-node-specification')).toHaveLength(4);
 expect(host.querySelectorAll('.ctq-leaf > .ctq-children')).toHaveLength(0);
});

test('print CSS removes the preceding workspace box from layout and prevents horizontal clipping',()=>{
 const workspaceCss=fs.readFileSync(path.join(__dirname,'DocumentWorkspace.css'),'utf8');
 const diagramCss=fs.readFileSync(path.join(__dirname,'CTQTreeDiagram.css'),'utf8');
 expect(workspaceCss).toMatch(/\.dw-edit-output\{display:none!important\}/);
 expect(workspaceCss).not.toMatch(/workspace-shell-content>div:first-of-type/);
 expect(workspaceCss).toMatch(/min-height:0!important/);
 expect(diagramCss).toMatch(/@page\{size:A4 landscape/);
 expect(diagramCss).toMatch(/\.ctq-leaf\{[^}]*display:block/);
 expect(diagramCss).toMatch(/max-width:100%!important/);
 expect(diagramCss).toMatch(/overflow-wrap:anywhere/);
 expect(diagramCss).not.toMatch(/@page ctq-landscape/);
});
