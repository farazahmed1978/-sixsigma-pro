// The Project Charter's schema, authored once here so both its bespoke editor (pages/ProjectCharter.js —
// its own route, its own schema, outside the generic DocumentWorkspace/template system) and the
// project-level report pipeline (utils/projectReport.js) read the exact same field/table/section
// definitions. Centralizing it here — rather than defining it inside the page component and having
// utils/ reach into pages/ to get it, or duplicating it — keeps the dependency direction the normal
// way (config consumed by both pages and utils) and means there is exactly one place this schema
// can drift out of sync with itself.
export const PROJECT_CHARTER_SCHEMA_VERSION = 2;

export const PROJECT_CHARTER_EMPTY = { schemaVersion: PROJECT_CHARTER_SCHEMA_VERSION, projectSummary: '', targetDate: '', businessCase: '', problemStatement: '', goalStatement: '', scopeIn: '', scopeOut: '', team: [], stakeholders: [], timeline: [], financialImpact: '', risks: [], assumptions: '', constraints: '', approvals: [] };

export const PROJECT_CHARTER_REQUIRED_FIELDS = ['projectSummary','targetDate','businessCase','problemStatement','goalStatement','scopeIn','scopeOut','team','stakeholders','timeline','financialImpact','risks','assumptions','constraints','approvals'];
export const PROJECT_CHARTER_REVIEW_READY_SCORE = 80;
const charterText=value=>String(value||'').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();
export const charterFieldComplete=(charter,field)=>Array.isArray(charter?.[field])?charter[field].some(row=>Object.entries(row).some(([key,value])=>key!=='id'&&charterText(value))):Boolean(charterText(charter?.[field]));
export const charterCompletionState=charter=>{const completedFields=PROJECT_CHARTER_REQUIRED_FIELDS.filter(field=>charterFieldComplete(charter,field));return{complete:completedFields.length===PROJECT_CHARTER_REQUIRED_FIELDS.length,completion:Math.round(completedFields.length/PROJECT_CHARTER_REQUIRED_FIELDS.length*100),completedFields,missingFields:PROJECT_CHARTER_REQUIRED_FIELDS.filter(field=>!completedFields.includes(field))}};
export const charterQualityState=charter=>{const checks=[charterText(charter?.projectSummary).length>=40,Boolean(charter?.targetDate),charterText(charter?.businessCase).length>=80,charterText(charter?.problemStatement).length>=50&&/\d/.test(charterText(charter?.problemStatement)),/\d/.test(charterText(charter?.goalStatement)),charterText(charter?.scopeIn)&&charterText(charter?.scopeOut),charter?.team?.some(row=>row.name&&row.role),charter?.stakeholders?.length>0,charter?.timeline?.some(row=>row.date),/\d/.test(charterText(charter?.financialImpact)),charter?.risks?.some(row=>row.risk&&row.mitigation),charter?.approvals?.some(row=>row.name&&row.status)];const score=Math.round(checks.filter(Boolean).length/checks.length*100);return{score,reviewReady:score>=PROJECT_CHARTER_REVIEW_READY_SCORE,threshold:PROJECT_CHARTER_REVIEW_READY_SCORE,checks}};

// Column definitions for the charter's five editable tables, used both by the live editor's
// EditableTable instances and by CHARTER_REPORT_TEMPLATE's table fields below.
export const CHARTER_TABLE_COLUMNS = {
  team: [{ key: 'name', label: 'Name', placeholder: 'Full name' }, { key: 'role', label: 'Role', placeholder: 'Process owner' }, { key: 'allocation', label: 'Allocation', placeholder: '20%' }],
  stakeholders: [{ key: 'name', label: 'Stakeholder', placeholder: 'Name or group' }, { key: 'interest', label: 'Interest', placeholder: 'Primary concern' }, { key: 'engagement', label: 'Engagement', placeholder: 'Weekly review' }],
  timeline: [{ key: 'milestone', label: 'Milestone', placeholder: 'Define gate' }, { key: 'owner', label: 'Owner', placeholder: 'Accountable lead' }, { key: 'date', label: 'Target date', type: 'date' }],
  risks: [{ key: 'risk', label: 'Risk', placeholder: 'Describe exposure' }, { key: 'impact', label: 'Impact', placeholder: 'High / Medium / Low' }, { key: 'mitigation', label: 'Mitigation', placeholder: 'Action and owner' }],
  approvals: [{ key: 'name', label: 'Approver', placeholder: 'Full name' }, { key: 'role', label: 'Role', placeholder: 'Executive sponsor' }, { key: 'status', label: 'Status', placeholder: 'Pending / Approved' }, { key: 'date', label: 'Date', type: 'date' }],
};

// The charter's fields, shaped as a DocumentReport-compatible template (sections of
// {id,label,type,columns}), so utils/projectReport.js's project-level Print All / Save to File can
// render the charter's actual content through the exact same DocumentReport component every other
// document's Print/Export PDF already uses — one renderer, not a second bespoke one — even though
// the charter itself has its own schema, route, and editing UI outside the generic
// DocumentWorkspace/template system. record.values for this template is
// {...PROJECT_CHARTER_EMPTY, ...project.charter}.
export const CHARTER_REPORT_TEMPLATE = {
  id: 'charter',
  name: 'Project Charter',
  sections: [
    { id: 'overview', title: 'Project Overview', fields: [{ id: 'projectSummary', label: 'Executive Summary' }, { id: 'targetDate', label: 'Target Completion Date' }] },
    { id: 'need', title: 'Business Need', fields: [{ id: 'businessCase', label: 'Business Case', span: true }, { id: 'problemStatement', label: 'Problem Statement', span: true }] },
    { id: 'goals', title: 'Goals', fields: [{ id: 'goalStatement', label: 'Goal Statement', span: true }] },
    { id: 'scope', title: 'Scope', fields: [{ id: 'scopeIn', label: 'In Scope' }, { id: 'scopeOut', label: 'Out of Scope' }] },
    { id: 'team', title: 'Team', fields: [{ id: 'team', label: 'Core Team', type: 'table', columns: CHARTER_TABLE_COLUMNS.team }] },
    { id: 'stakeholders', title: 'Stakeholders', fields: [{ id: 'stakeholders', label: 'Stakeholder Register', type: 'table', columns: CHARTER_TABLE_COLUMNS.stakeholders }] },
    { id: 'timeline', title: 'Timeline', fields: [{ id: 'timeline', label: 'Milestone Plan', type: 'table', columns: CHARTER_TABLE_COLUMNS.timeline }] },
    { id: 'financial', title: 'Financial Impact', fields: [{ id: 'financialImpact', label: 'Financial Impact', span: true }] },
    { id: 'risks', title: 'Risks', fields: [{ id: 'risks', label: 'Risk Register', type: 'table', columns: CHARTER_TABLE_COLUMNS.risks }] },
    { id: 'assumptions', title: 'Assumptions', fields: [{ id: 'assumptions', label: 'Assumptions', span: true }] },
    { id: 'constraints', title: 'Constraints', fields: [{ id: 'constraints', label: 'Constraints', span: true }] },
    { id: 'approval', title: 'Approval', fields: [{ id: 'approvals', label: 'Approval Register', type: 'table', columns: CHARTER_TABLE_COLUMNS.approvals }] },
  ],
};
