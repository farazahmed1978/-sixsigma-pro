import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import WBSTreeDiagram,{buildWbsTree} from './WBSTreeDiagram';

const row=(wbsId,level,parentId,workPackage,owner='',acceptance='')=>({id:`row-${wbsId}`,wbsId,level,parentId,workPackage,owner,acceptance});

test('builds a multi-level hierarchy from flat parentId/wbsId rows',()=>{
  const rows=[
    row('1','1','','Reduce cycle time'),
    row('1.1','2','1','Discovery'),
    row('1.2','2','1','Build'),
    row('1.2.1','3','1.2','Implementation'),
  ];
  const tree=buildWbsTree(rows);
  expect(tree).toHaveLength(1);
  expect(tree[0].children).toHaveLength(2);
  expect(tree[0].children[1].children).toHaveLength(1);
  expect(tree[0].children[1].children[0].workPackage).toBe('Implementation');
});

test('rows with no Parent WBS ID, or a parent that does not exist, surface as roots instead of disappearing',()=>{
  const rows=[row('1','1','','Root'),row('2','2','9','Orphaned — parent 9 does not exist')];
  const tree=buildWbsTree(rows);
  expect(tree.map(node=>node.wbsId).sort()).toEqual(['1','2']);
});

test('rows missing a WBS ID entirely still render as their own root rather than being dropped',()=>{
  const tree=buildWbsTree([row('','1','','No ID assigned yet')]);
  expect(tree).toHaveLength(1);
  expect(tree[0].workPackage).toBe('No ID assigned yet');
});

test('a cycle in authored Parent WBS ID data does not infinite-loop; the cycle breaks and both rows still render',()=>{
  const rows=[row('A','1','B','A points at B'),row('B','1','A','B points at A')];
  expect(()=>buildWbsTree(rows)).not.toThrow();
  const html=renderToStaticMarkup(<WBSTreeDiagram rows={rows}/>);
  expect(html).toContain('A points at B');
  expect(html).toContain('B points at A');
});

test('renders WBS ID, deliverable, owner, and acceptance criteria for a populated hierarchy, and prompts when empty',()=>{
  const rows=[row('1','1','','Discovery','Jane Owner','Signed off by sponsor')];
  const html=renderToStaticMarkup(<WBSTreeDiagram rows={rows} projectName="QA Project"/>);
  expect(html).toContain('WBS 1');
  expect(html).toContain('Discovery');
  expect(html).toContain('Jane Owner');
  expect(html).toContain('Signed off by sponsor');
  expect(html).toContain('QA Project');
  expect(html).not.toContain('<input');
  const empty=renderToStaticMarkup(<WBSTreeDiagram rows={[]}/>);
  expect(empty).toContain('No WBS hierarchy rows to display yet');
});
