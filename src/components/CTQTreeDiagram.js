import React from 'react';
import './CTQTreeDiagram.css';

const clean=value=>String(value??'').trim();
const keyFor=(value,index)=>`${value||'empty'}-${index}`;

export function buildCTQTree(branches=[]){
 const needs=[];
 for(const branch of branches){
  const path={id:branch.id,need:clean(branch.need),driver:clean(branch.driver),ctq:clean(branch.ctq),specification:clean(branch.specification)};
  if(!path.need&&!path.driver&&!path.ctq&&!path.specification)continue;
  let need=needs.find(item=>item.label===path.need);
  if(!need){need={label:path.need,drivers:[]};needs.push(need)}
  let driver=need.drivers.find(item=>item.label===path.driver);
  if(!driver){driver={label:path.driver,ctqs:[]};need.drivers.push(driver)}
  let ctq=driver.ctqs.find(item=>item.label===path.ctq);
  if(!ctq){ctq={label:path.ctq,specifications:[]};driver.ctqs.push(ctq)}
  ctq.specifications.push({id:path.id,label:path.specification});
 }
 return needs;
}

const Node=({kind,children})=><div className={`ctq-node ctq-node-${kind}`}><small>{kind==='ctq'?'CTQ':kind}</small><strong>{children||`Not specified`}</strong></div>;

export const CTQ_PRINT_LAYOUT={hierarchyColumns:4,terminalTrack:false,wrapLongText:true,startsWithDiagram:true};

export default function CTQTreeDiagram({branches=[],projectName='',title='CTQ Tree',className=''}){
 const tree=buildCTQTree(branches);
 return <section className={`ctq-diagram ${className}`} aria-label="CTQ Tree diagram"><header><span>DEFINE DELIVERABLE</span><h2>{title}</h2>{projectName&&<p>{projectName}</p>}</header>{tree.length?<div className="ctq-tree" role="tree">{tree.map((need,needIndex)=><div className="ctq-need-group" key={keyFor(need.label,needIndex)}><Node kind="need">{need.label}</Node><div className="ctq-children">{need.drivers.map((driver,driverIndex)=><div className="ctq-driver-group" key={keyFor(driver.label,driverIndex)}><Node kind="driver">{driver.label}</Node><div className="ctq-children">{driver.ctqs.map((ctq,ctqIndex)=><div className="ctq-ctq-group" key={keyFor(ctq.label,ctqIndex)}><Node kind="ctq">{ctq.label}</Node><div className="ctq-children">{ctq.specifications.map((spec,index)=><div className="ctq-leaf" key={spec.id||keyFor(spec.label,index)}><Node kind="specification">{spec.label}</Node></div>)}</div></div>)}</div></div>)}</div></div>)}</div>:<p className="ctq-diagram-empty">No completed CTQ branches to display.</p>}</section>;
}
