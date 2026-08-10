import {NAVIGATION} from '../config/navigation';
import {addRecentTool,canonicalNavigationItems,navigationItems,reconcileStoredTools,searchTools,toggleFavoriteTool,toolIndex} from './navigationTools';

const legacyNavigation=[{section:'Operational Excellence',suiteId:'operational-excellence',groups:[{id:'measure',name:'Measure',subgroups:[{label:'Tools',items:[{id:'tool-msa',name:'Gage R&R',path:'/tool/msa',aliases:['gage','gauge']},{id:'tool-control-chart',name:'Control Chart',path:'/tool/control-chart'}]}]},{id:'analyze',name:'Analyze',subgroups:[{label:'Tools',items:[{id:'tool-anova',name:'ANOVA',path:'/tool/anova',aliases:['analysis of variance']}]}]}]}];

test('searches tools by name, alias, phase, workflow cluster, and suite',()=>{
 const tools=toolIndex(NAVIGATION);
 expect(searchTools(tools,'Control')[0].path).toBe('/tool/control-chart');
 expect(searchTools(tools,'gage')[0].path).toBe('/tool/msa');
 expect(searchTools(tools,'analysis of variance')[0].path).toBe('/tool/anova');
 expect(searchTools(tools,'measurement system Measure')[0].context).toBe('Measurement System · Measure · Operational Excellence');
 expect(searchTools(tools,'process performance capability')[0].path).toBe('/tool/capability');
});

test('retains compatibility with legacy subgroup-shaped navigation',()=>{
 const tools=toolIndex(legacyNavigation);
 expect(searchTools(tools,'gage')[0].path).toBe('/tool/msa');
 expect(searchTools(tools,'Measure')).toHaveLength(2);
});

test('all OE and PM phases use practitioner clusters instead of object-type groups',()=>{
 const lifecycleSections=NAVIGATION.filter(section=>section.suiteId);
 expect(lifecycleSections.map(section=>section.groups.length)).toEqual([5,5]);
 lifecycleSections.forEach(section=>section.groups.forEach(phase=>{
  expect(phase.clusters.length).toBeGreaterThan(0);
  expect(phase.clusters.every(workflow=>workflow.id&&workflow.label&&workflow.items.length)).toBe(true);
  expect(phase.clusters.some(workflow=>['Documents','Tools'].includes(workflow.label))).toBe(false);
 }));
});

test('navigation inventory has complete metadata and a unique canonical route record',()=>{
 const placements=navigationItems(NAVIGATION).filter(item=>item.suiteId);
 expect(placements.length).toBeGreaterThan(100);
 placements.forEach(item=>{
  expect(item).toEqual(expect.objectContaining({id:expect.any(String),name:expect.any(String),path:expect.any(String),type:expect.any(String),suite:expect.any(String),phase:expect.any(String),cluster:expect.any(String)}));
 });
 const canonical=canonicalNavigationItems(NAVIGATION);
 expect(new Set(canonical.map(item=>item.path)).size).toBe(canonical.length);
 expect(placements.filter(item=>item.path==='/tool/fmea')).toHaveLength(2);
 expect(canonical.filter(item=>item.path==='/tool/fmea')).toHaveLength(1);
});

test('recent and favorites use route identity and reconcile old stored metadata',()=>{
 const canonical=toolIndex(NAVIGATION),gage=canonical.find(item=>item.path==='/tool/msa'),anova=canonical.find(item=>item.path==='/tool/anova');
 expect(addRecentTool(addRecentTool([gage],anova),gage)).toEqual([gage,anova]);
 expect(toggleFavoriteTool([],gage)).toEqual([gage]);
 expect(toggleFavoriteTool([gage],gage)).toEqual([]);
 expect(reconcileStoredTools([{id:'old-id',path:'/tool/msa',name:'Old label'},{path:'/missing'}],canonical)).toEqual([gage]);
});
