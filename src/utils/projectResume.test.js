import {artifactResume,documentRoute,PROJECT_HUB_BACK_LABEL,projectHubRoute,projectResumeCta,resumeTargetFor} from './projectResume';
import {createDocument,documentResumeIndex} from './documentModel';
const project={id:'project-1',documents:{}};
test('new project starts Project Charter',()=>expect(projectResumeCta(project).label).toBe('Start Project Charter'));
test('working charter resumes exact charter route',()=>{const next={...project,charter:{projectSummary:'started'},resumeTarget:artifactResume({projectId:project.id,artifactId:'charter',artifactName:'Project Charter',sectionId:'scope'})};expect(projectResumeCta(next)).toMatchObject({label:'Continue Project Charter',target:{route:'/projects/project-1/charter',sectionId:'scope'}})});
test('progress to SIPOC changes CTA and opens the saved canonical SIPOC',()=>{const sipoc=createDocument({id:'sipoc',name:'SIPOC',sections:[]},project.id);const next={...project,documents:{[sipoc.id]:sipoc},resumeTarget:artifactResume({projectId:project.id,artifactId:'sipoc',artifactName:'SIPOC',sectionId:'process'})};expect(projectResumeCta(next)).toMatchObject({label:'Continue SIPOC',target:{route:documentRoute(project.id,'sipoc')}});expect(Object.keys(next.documents)).toEqual(['document-sipoc'])});
test('document section resume restores the exact saved section',()=>{const template={id:'sipoc',sections:[{id:'suppliers'},{id:'process'},{id:'customers'}]},record={sectionState:{activeSectionId:'process'}};expect(documentResumeIndex(template,record,resumeTargetFor(project))).toBe(1)});
test('existing SIPOC identity is deterministic and is reused',()=>{const template={id:'sipoc',name:'SIPOC',sections:[]},first=createDocument(template,project.id),second=createDocument(template,project.id,first);expect(first.id).toBe('document-sipoc');expect(second.id).toBe(first.id)});

// projectHubRoute/PROJECT_HUB_BACK_LABEL are the single source of truth every "back" link pointing
// at a Project Hub (Worksheet, Templates, AnalysisLauncher, ReportBuilder, DocumentWorkspace,
// ProjectCharter) is meant to use, so they all read "Back to Project Hub" and route to this
// project's own hub — never the top-level /projects list — without each surface re-deriving either
// string independently.
test('projectHubRoute always points at the project\'s own hub, not the top-level projects list',()=>{
  expect(projectHubRoute('project-1')).toBe('/projects/project-1');
  expect(projectHubRoute('project-1')).not.toBe('/projects');
});
test('PROJECT_HUB_BACK_LABEL is the canonical "Back to X" label text',()=>{
  expect(PROJECT_HUB_BACK_LABEL).toBe('Project Hub');
});
