import {projectContextNavigation} from './projectContextNavigation';

test('OE project navigation stays project-qualified and contains only DMAIC phases',()=>{
  const navigation=projectContextNavigation({id:'oe-1',name:'Yield',suiteId:'operational-excellence'});
  expect(navigation.phases.map(item=>item.name)).toEqual(['Define','Measure','Analyze','Improve','Control']);
  navigation.phases.forEach(item=>expect(item.path).toContain('/projects/oe-1?tab=tollgates'));
});

test('PM project preserves the existing global/PM navigation behavior',()=>{
  expect(projectContextNavigation({id:'pm-1',suiteId:'project-management'})).toBeNull();
});

test('outside a project preserves global navigation',()=>{
  expect(projectContextNavigation(null)).toBeNull();
});
