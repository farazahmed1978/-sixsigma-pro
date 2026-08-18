import React from 'react';
import './WBSTreeDiagram.css';

const clean=value=>String(value??'').trim();

// Builds a hierarchy from flat WBS rows using parentId -> wbsId links (level is a display hint
// only, not load-bearing for structure). Rows without a WBS ID, rows whose Parent WBS ID doesn't
// match any row, and rows that would form a cycle through their own ancestry all surface as roots
// rather than being silently dropped, since this is free-typed data.
export function buildWbsTree(rows=[]){
  const byId=new Map();
  rows.forEach((row,index)=>{
    const key=clean(row.wbsId)||`__row-${index}`;
    byId.set(key,{...row,key,children:[]});
  });
  const wouldCycle=(node,parent)=>{
    let current=parent;const seen=new Set();
    while(current){
      if(current.key===node.key)return true;
      if(seen.has(current.key))return true;
      seen.add(current.key);
      const parentKey=clean(current.parentId);
      current=parentKey?byId.get(parentKey):null;
    }
    return false;
  };
  const roots=[];
  byId.forEach(node=>{
    const parentKey=clean(node.parentId);
    const parent=parentKey?byId.get(parentKey):null;
    if(parent&&parent!==node&&!wouldCycle(node,parent))parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

const Node=({node})=><div className="wbs-node"><small>{node.wbsId?`WBS ${clean(node.wbsId)}`:'Unassigned WBS ID'}{clean(node.level)?` · Level ${clean(node.level)}`:''}</small><strong>{clean(node.workPackage)||'Untitled deliverable'}</strong>{clean(node.owner)&&<span className="wbs-owner">Owner: {clean(node.owner)}</span>}{clean(node.acceptance)&&<p className="wbs-acceptance">{clean(node.acceptance)}</p>}</div>;

function Branch({node}){
  if(!node.children.length)return <div className="wbs-leaf"><Node node={node}/></div>;
  return <div className="wbs-group"><Node node={node}/><div className="wbs-children">{node.children.map(child=><Branch key={child.key} node={child}/>)}</div></div>;
}

export default function WBSTreeDiagram({rows=[],projectName='',title='Work Breakdown Structure',className=''}){
  const tree=buildWbsTree(rows);
  return <section className={`wbs-diagram ${className}`} aria-label="WBS tree diagram"><header><span>PLANNING DELIVERABLE</span><h2>{title}</h2>{projectName&&<p>{projectName}</p>}</header>{tree.length?<div className="wbs-tree" role="tree">{tree.map(node=><Branch key={node.key} node={node}/>)}</div>:<p className="wbs-diagram-empty">No WBS hierarchy rows to display yet. Add rows with a WBS ID (and a Parent WBS ID for children) to build the tree.</p>}</section>;
}
