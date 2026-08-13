import React, { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useProjects } from '../context/ProjectsContext';
import DocumentWorkspace from '../components/DocumentWorkspace';
import logoMark from '../assets/axentra-mark.svg';
import { DEFINE_TEMPLATES } from '../config/defineTemplates';
import { MEASURE_TEMPLATES } from '../config/measureTemplates';
import { CONTROL_TEMPLATES } from '../config/controlTemplates';
import { ANALYZE_TEMPLATES } from '../config/analyzeTemplates';
import { IMPROVE_TEMPLATES } from '../config/improveTemplates';
import { PMP_TEMPLATES } from '../config/pmpTemplates';
import './Templates.css';

const LEGACY_TEMPLATES = [
  {
    id: 'charter', name: 'Project Charter', phase: 'Define', icon: '📋',
    desc: 'Define project scope, goals, team, timeline, and business case.',
    sections: [
      {
        title: 'Project Identification', cols: 2,
        fields: [
          { id: 'title', label: 'Project Title', type: 'text', span: 2, placeholder: 'e.g. Reduce Customer Wait Time in Branch Operations' },
          { id: 'sponsor', label: 'Project Sponsor', type: 'text', placeholder: 'Name and title' },
          { id: 'leader', label: 'Project Leader (Black/Green Belt)', type: 'text', placeholder: 'Name' },
          { id: 'team', label: 'Team Members', type: 'text', placeholder: 'Names and departments' },
          { id: 'dept', label: 'Department / Business Unit', type: 'text', placeholder: 'e.g. Operations' },
          { id: 'start', label: 'Start Date', type: 'text', placeholder: 'MM/DD/YYYY' },
          { id: 'end', label: 'Target Completion', type: 'text', placeholder: 'MM/DD/YYYY' },
        ]
      },
      {
        title: 'Problem & Goal', cols: 1,
        fields: [
          { id: 'problem', label: 'Problem Statement', type: 'textarea', placeholder: 'Describe the problem in specific, measurable terms.' },
          { id: 'goal', label: 'Goal Statement (SMART)', type: 'textarea', placeholder: 'Specific, Measurable, Achievable, Relevant, Time-bound...' },
          { id: 'business', label: 'Business Case', type: 'textarea', placeholder: 'Why is this project important?' },
        ]
      },
      {
        title: 'Scope & Metrics', cols: 2,
        fields: [
          { id: 'scope', label: 'In Scope', type: 'textarea', placeholder: 'What is included?' },
          { id: 'outscope', label: 'Out of Scope', type: 'textarea', placeholder: 'What is excluded?' },
          { id: 'primary', label: 'Primary Metric (Y)', type: 'text', span: 2, placeholder: 'e.g. Average wait time (minutes)' },
          { id: 'baseline', label: 'Baseline', type: 'text', placeholder: 'e.g. 14.2 minutes' },
          { id: 'target', label: 'Target', type: 'text', placeholder: 'e.g. 8 minutes' },
        ]
      },
      {
        title: 'Risks & Constraints', cols: 1,
        fields: [
          { id: 'risks', label: 'Risks and Constraints', type: 'textarea', placeholder: 'Identify potential obstacles...' },
        ]
      },
      {
        title: 'Approval', cols: 3, sig: true,
        fields: [
          { id: 'sig1', label: 'Project Sponsor Signature', type: 'sig' },
          { id: 'sig2', label: 'Project Leader Signature', type: 'sig' },
          { id: 'sig3', label: 'Date Approved', type: 'sig' },
        ]
      }
    ]
  },
  {
    id: 'sipoc', name: 'SIPOC Diagram', phase: 'Define', icon: '📋',
    desc: 'Map Suppliers, Inputs, Process, Outputs, and Customers.',
    sections: [
      {
        title: 'Process Overview', cols: 1,
        fields: [
          { id: 'process', label: 'Process Name', type: 'text', placeholder: 'e.g. Order Fulfillment' },
          { id: 'owner', label: 'Process Owner', type: 'text', placeholder: 'Name and role' },
          { id: 'scope', label: 'Process Scope', type: 'text', placeholder: 'Start to End' },
        ]
      },
      {
        title: 'SIPOC Map', cols: 5, sipoc: true,
        fields: [
          { id: 'suppliers', label: 'Suppliers', type: 'textarea', placeholder: 'Supplier 1\nSupplier 2' },
          { id: 'inputs', label: 'Inputs', type: 'textarea', placeholder: 'Input 1\nInput 2' },
          { id: 'steps', label: 'Process Steps', type: 'textarea', placeholder: '1. Step one\n2. Step two' },
          { id: 'outputs', label: 'Outputs', type: 'textarea', placeholder: 'Output 1\nOutput 2' },
          { id: 'customers', label: 'Customers', type: 'textarea', placeholder: 'Customer 1\nCustomer 2' },
        ]
      },
      {
        title: 'Customer Requirements', cols: 1,
        fields: [
          { id: 'ctq', label: 'CTQ Requirements', type: 'textarea', placeholder: 'List measurable customer requirements...' },
        ]
      }
    ]
  },
  {
    id: 'copq', name: 'COPQ Analysis', phase: 'Define', icon: '💰',
    desc: 'Cost of Poor Quality analysis.',
    sections: [
      {
        title: 'Analysis Details', cols: 2,
        fields: [
          { id: 'dept', label: 'Department / Process', type: 'text', placeholder: 'e.g. Manufacturing Line 3' },
          { id: 'period', label: 'Analysis Period', type: 'text', placeholder: 'e.g. Q1 2026' },
          { id: 'owner', label: 'Prepared By', type: 'text', placeholder: 'Name' },
          { id: 'date', label: 'Date', type: 'text', placeholder: 'MM/DD/YYYY' },
        ]
      },
      {
        title: 'Cost Categories', cols: 2,
        fields: [
          { id: 'prevention', label: 'Prevention Costs ($)', type: 'textarea', placeholder: 'Training, planning...' },
          { id: 'appraisal', label: 'Appraisal Costs ($)', type: 'textarea', placeholder: 'Inspection, audits...' },
          { id: 'internal', label: 'Internal Failure Costs ($)', type: 'textarea', placeholder: 'Scrap, rework...' },
          { id: 'external', label: 'External Failure Costs ($)', type: 'textarea', placeholder: 'Returns, warranties...' },
          { id: 'total_copq', label: 'TOTAL COPQ ($)', type: 'text', span: 2, placeholder: '$0.00' },
        ]
      },
      {
        title: 'Notes', cols: 1,
        fields: [
          { id: 'notes', label: 'Notes / Assumptions', type: 'textarea', placeholder: 'Data sources and assumptions...' },
        ]
      }
    ]
  },
  {
    id: 'costbenefit', name: 'Cost-Benefit Analysis', phase: 'Define', icon: '📊',
    desc: 'Evaluate financial justification and ROI.',
    sections: [
      {
        title: 'Project Details', cols: 2,
        fields: [
          { id: 'project', label: 'Project Name', type: 'text', span: 2, placeholder: '' },
          { id: 'preparer', label: 'Prepared By', type: 'text', placeholder: 'Name' },
          { id: 'date', label: 'Date', type: 'text', placeholder: 'MM/DD/YYYY' },
        ]
      },
      {
        title: 'Investment & Returns', cols: 2,
        fields: [
          { id: 'investment', label: 'Total Investment ($)', type: 'text', placeholder: '$0.00' },
          { id: 'hard', label: 'Hard Savings Annual ($)', type: 'text', placeholder: '$0.00' },
          { id: 'soft', label: 'Soft Savings Annual ($)', type: 'text', placeholder: '$0.00' },
          { id: 'revenue', label: 'Revenue Impact ($)', type: 'text', placeholder: '$0.00' },
          { id: 'payback', label: 'Payback Period', type: 'text', placeholder: 'e.g. 8 months' },
          { id: 'roi', label: 'Estimated ROI (%)', type: 'text', placeholder: 'e.g. 240%' },
        ]
      },
      {
        title: 'Assumptions', cols: 1,
        fields: [
          { id: 'assumptions', label: 'Key Assumptions', type: 'textarea', placeholder: 'List major assumptions...' },
        ]
      }
    ]
  },
  {
    id: 'minutes', name: 'Meeting Minutes', phase: 'All', icon: '📝',
    desc: 'Structured DMAIC project meeting documentation.',
    sections: [
      {
        title: 'Meeting Details', cols: 2,
        fields: [
          { id: 'project', label: 'Project Name', type: 'text', span: 2, placeholder: '' },
          { id: 'date', label: 'Date & Time', type: 'text', placeholder: 'MM/DD/YYYY, HH:MM' },
          { id: 'location', label: 'Location / Platform', type: 'text', placeholder: 'e.g. Conference Room B' },
          { id: 'facilitator', label: 'Facilitator', type: 'text', placeholder: 'Name' },
          { id: 'scribe', label: 'Note Taker', type: 'text', placeholder: 'Name' },
        ]
      },
      {
        title: 'Attendees', cols: 1,
        fields: [
          { id: 'attendees', label: 'Attendees (Name — Role)', type: 'textarea', placeholder: 'John Smith — Sponsor\nJane Doe — Black Belt' },
        ]
      },
      {
        title: 'Meeting Content', cols: 1,
        fields: [
          { id: 'agenda', label: 'Agenda Items Discussed', type: 'textarea', placeholder: '1. Status update\n2. Data review' },
          { id: 'decisions', label: 'Key Decisions Made', type: 'textarea', placeholder: 'List decisions...' },
          { id: 'actions', label: 'Action Items (Action | Owner | Due Date)', type: 'textarea', placeholder: 'Complete data collection | Jane | MM/DD/YYYY' },
          { id: 'next', label: 'Next Meeting', type: 'text', placeholder: 'Date, time and agenda' },
        ]
      }
    ]
  },
  {
    id: 'sigma', name: 'Sigma Level Calculator', phase: 'Measure', icon: 'σ',
    desc: 'Calculate process sigma level and DPMO.',
    sections: [
      {
        title: 'Process Information', cols: 2,
        fields: [
          { id: 'process', label: 'Process Name', type: 'text', span: 2, placeholder: '' },
          { id: 'units', label: 'Total Units Produced', type: 'text', placeholder: 'e.g. 10000' },
          { id: 'defects', label: 'Total Defects Found', type: 'text', placeholder: 'e.g. 250' },
          { id: 'opps', label: 'Opportunities per Unit', type: 'text', placeholder: 'e.g. 5' },
          { id: 'period', label: 'Data Period', type: 'text', placeholder: 'e.g. Q1 2026' },
        ]
      },
      {
        title: 'Notes', cols: 1,
        fields: [
          { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Data source and assumptions...' },
        ]
      }
    ],
    computed: (fields) => {
      const units = parseFloat((fields.units||'').replace(/,/g,'')),
            defects = parseFloat((fields.defects||'').replace(/,/g,'')),
            opps = parseFloat((fields.opps||'').replace(/,/g,''));
      if (!units || !defects || !opps) return null;
      const dpmo = (defects / (units * opps)) * 1e6;
      const yld = (1 - dpmo / 1e6) * 100;
      const exactSigma = Math.max(0, Math.min(6, 0.8406 + Math.sqrt(29.37 - 2.221 * Math.log(dpmo))));
      return {
        'DPU': (defects/units).toFixed(4),
        'DPMO': Math.round(dpmo).toLocaleString(),
        'Yield': yld.toFixed(3) + '%',
        'Sigma Level': isNaN(exactSigma) ? 'N/A' : exactSigma.toFixed(2),
      };
    }
  },
  {
    id: 'hypothesis-plan', name: 'Hypothesis Test Plan', phase: 'Analyze', icon: '🧪',
    desc: 'Document your hypothesis test design.',
    sections: [
      {
        title: 'Test Overview', cols: 2,
        fields: [
          { id: 'project', label: 'Project Name', type: 'text', span: 2, placeholder: '' },
          { id: 'preparer', label: 'Prepared By', type: 'text', placeholder: 'Name' },
          { id: 'date', label: 'Date', type: 'text', placeholder: 'MM/DD/YYYY' },
          { id: 'question', label: 'Research Question', type: 'textarea', span: 2, placeholder: 'What are you trying to prove?' },
          { id: 'h0', label: 'Null Hypothesis (H0)', type: 'text', span: 2, placeholder: 'e.g. There is no difference between groups' },
          { id: 'h1', label: 'Alternative Hypothesis (H1)', type: 'text', span: 2, placeholder: 'e.g. There is a significant difference' },
          { id: 'test', label: 'Selected Test', type: 'text', placeholder: 'e.g. 2-Sample t-Test' },
          { id: 'alpha', label: 'Significance Level', type: 'text', placeholder: 'e.g. 0.05' },
          { id: 'sampleSize', label: 'Sample Size', type: 'text', placeholder: 'e.g. n=30 per group' },
          { id: 'dataSource', label: 'Data Source', type: 'text', placeholder: 'Where data comes from' },
        ]
      }
    ]
  },
  {
    id: 'factorial-plan', name: 'DOE Experiment Plan', phase: 'Improve', icon: '⚗️',
    desc: 'Plan your Design of Experiments.',
    sections: [
      {
        title: 'Experiment Overview', cols: 2,
        fields: [
          { id: 'project', label: 'Project Name', type: 'text', span: 2, placeholder: '' },
          { id: 'preparer', label: 'Prepared By', type: 'text', placeholder: 'Name' },
          { id: 'date', label: 'Date', type: 'text', placeholder: 'MM/DD/YYYY' },
          { id: 'response', label: 'Response Variable (Y)', type: 'text', placeholder: 'e.g. Yield (%)' },
          { id: 'design', label: 'Experimental Design', type: 'text', placeholder: 'e.g. Full Factorial 2^3' },
          { id: 'objective', label: 'Objective', type: 'textarea', span: 2, placeholder: 'What are you optimizing?' },
        ]
      },
      {
        title: 'Factors & Runs', cols: 2,
        fields: [
          { id: 'factors', label: 'Factors and Levels', type: 'textarea', placeholder: 'Temperature | 150 | 200\nPressure | 10 | 20' },
          { id: 'analysis', label: 'Planned Analysis', type: 'textarea', placeholder: 'Main effects, interactions, ANOVA...' },
          { id: 'runs', label: 'Number of Runs', type: 'text', placeholder: 'e.g. 8 runs' },
          { id: 'replicates', label: 'Replicates', type: 'text', placeholder: 'e.g. 2' },
        ]
      }
    ]
  },
];

export const TEMPLATES = [...DEFINE_TEMPLATES, ...MEASURE_TEMPLATES, ...ANALYZE_TEMPLATES, ...IMPROVE_TEMPLATES, ...CONTROL_TEMPLATES, ...PMP_TEMPLATES, ...LEGACY_TEMPLATES.filter(template => !['Define','Measure','Analyze','Improve','Control'].includes(template.phase))];

const phaseColor = {
  Define: '#1a56a0', Measure: '#00875a', Analyze: '#c05500',
  Improve: '#6941c6', Control: '#0077a0', All: '#0066ff'
};
const phaseBg = {
  Define: '#e8f0fb', Measure: '#e6f6f0', Analyze: '#fdf0e6',
  Improve: '#f0ebfd', Control: '#e6f3f8', All: '#e8f0ff'
};

function DocSection({ section, values, phaseCol }) {
  if (section.sipoc) {
    return (
      <div className="doc-section">
        <div className="doc-section-title" style={{ background: phaseCol }}>{section.title}</div>
        <table className="doc-sipoc-table">
          <thead>
            <tr>{section.fields.map(f => <th key={f.id} style={{ background: phaseCol }}>{f.label}</th>)}</tr>
          </thead>
          <tbody>
            <tr>
              {section.fields.map(f => (
                <td key={f.id} className="doc-sipoc-cell">
                  {(values[f.id] || '').split('\n').map((line, i) => line.trim() ? <div key={i}>• {line}</div> : null)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
  if (section.sig) {
    return (
      <div className="doc-section">
        <div className="doc-section-title" style={{ background: phaseCol }}>{section.title}</div>
        <div className="doc-sig-row">
          {section.fields.map(f => (
            <div key={f.id} className="doc-sig-block">
              <div className="doc-sig-line" />
              <div className="doc-sig-label">{f.label}</div>
              <div className="doc-sig-date">Date: ___________</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="doc-section">
      <div className="doc-section-title" style={{ background: phaseCol }}>{section.title}</div>
      <div className={`doc-fields cols-${section.cols}`}>
        {section.fields.map(f => (
          <div key={f.id} className={`doc-field ${f.span ? 'span-2' : ''}`}>
            <div className="doc-field-label">{f.label}</div>
            <div className={`doc-field-value ${f.type === 'textarea' ? 'multi' : ''}`}>
              {values[f.id] || <span className="doc-empty">—</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintableDoc({ template, values, computed }) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const phaseCol = phaseColor[template.phase] || '#1a56a0';
  return (
    <div className="printable-doc">
      <div className="doc-header" style={{ background: phaseCol }}>
        <div className="doc-logo-block">
          <div className="doc-logo-box"><img src={logoMark} alt="Aureqin" /></div>
          <div className="doc-brand">AUREQIN</div>
        </div>
        <div className="doc-header-center">
          <div className="doc-phase-label">Lean Six Sigma — {template.phase} Phase</div>
          <div className="doc-title">{template.name}</div>
        </div>
        <div className="doc-header-meta">
          <div>Date: {today}</div>
          <div>Doc: SSP-{template.id.slice(0,4).toUpperCase()}-{new Date().getFullYear()}</div>
          <div>Rev: 1.0</div>
        </div>
      </div>

      {template.sections.map((s, i) => (
        <DocSection key={i} section={s} values={values} phaseCol={phaseCol} />
      ))}

      {computed && (
        <div className="doc-section">
          <div className="doc-section-title" style={{ background: phaseCol }}>Calculated Results</div>
          <div className="doc-computed-row">
            {Object.entries(computed).map(([k, v]) => (
              <div key={k} className="doc-computed-item">
                <div className="doc-computed-val">{v}</div>
                <div className="doc-computed-key">{k}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="doc-footer">
        <span>Generated by Aureqin</span>
        <span>Confidential — Internal Use Only</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

function TemplateForm({ template }) {
  const [values, setValues] = useState({});
  const [computed, setComputed] = useState(null);
  const [tab, setTab] = useState('edit');
  const set = (id, val) => setValues(p => ({ ...p, [id]: val }));

  const handleCompute = () => {
    if (template.computed) setComputed(template.computed(values));
  };

  const handlePrint = () => {
    if (template.computed) setComputed(template.computed(values));
    setTab('preview');
    setTimeout(() => {
      const doc = document.querySelector('.printable-doc');
      if (!doc) return;
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html><html><head><style>
        body{margin:0;padding:20px;font-family:Arial,sans-serif;}
        .printable-doc{max-width:100%;font-family:Arial,sans-serif;font-size:11pt;color:#1a1a2e;}
        .doc-header{display:grid;grid-template-columns:140px 1fr 140px;align-items:center;padding:16px 24px;gap:16px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .doc-logo-block{display:flex;flex-direction:column;align-items:center;gap:4px;}
        .doc-logo-box{width:60px;height:42px;border:2px dashed rgba(255,255,255,0.5);border-radius:4px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);font-size:9pt;}
        .doc-logo-box img{max-width:100%;max-height:100%;object-fit:contain;}
        .doc-brand{color:white;font-size:9pt;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;}
        .doc-header-center{text-align:center;}
        .doc-phase-label{color:rgba(255,255,255,0.75);font-size:8pt;text-transform:uppercase;margin-bottom:4px;}
        .doc-title{color:#fff;font-size:17pt;font-weight:700;}
        .doc-header-meta{text-align:right;font-size:8.5pt;color:rgba(255,255,255,0.85);line-height:1.9;}
        .doc-section{border-bottom:1px solid #d0d8e8;}
        .doc-section-title{color:#fff;font-size:8.5pt;font-weight:700;text-transform:uppercase;padding:5px 20px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .doc-fields{display:grid;padding:0 20px;}
        .doc-fields.cols-1{grid-template-columns:1fr;}
        .doc-fields.cols-2{grid-template-columns:1fr 1fr;}
        .doc-fields.cols-3{grid-template-columns:1fr 1fr 1fr;}
        .doc-field{padding:9px 10px 9px 0;border-bottom:1px solid #edf0f7;}
        .doc-field.span-2{grid-column:span 2;}
        .doc-field-label{font-size:7.5pt;font-weight:700;text-transform:uppercase;color:#4a5680;margin-bottom:3px;}
        .doc-field-value{font-size:10.5pt;color:#1a1a2e;line-height:1.5;min-height:18px;}
        .doc-field-value.multi{min-height:44px;white-space:pre-wrap;}
        .doc-empty{color:#c0c8dc;font-style:italic;font-size:9pt;}
        .doc-sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;padding:0 20px;}
        .doc-sig-block{padding:16px 10px 16px 0;}
        .doc-sig-line{border-bottom:1.5px solid #1a3a6b;height:34px;margin-bottom:6px;}
        .doc-sig-label{font-size:7.5pt;font-weight:700;text-transform:uppercase;color:#4a5680;}
        .doc-computed-row{display:flex;}
        .doc-computed-item{flex:1;padding:16px;text-align:center;border-right:1px solid #d0d8e8;}
        .doc-computed-val{font-size:22pt;font-weight:700;color:#1a3a6b;}
        .doc-computed-key{font-size:8pt;text-transform:uppercase;color:#4a5680;margin-top:4px;}
        .doc-footer{display:flex;justify-content:space-between;background:#f0f4fa;border-top:2px solid #1a3a6b;padding:7px 20px;font-size:8pt;color:#6070a0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .doc-sipoc-table{width:100%;border-collapse:collapse;}
        .doc-sipoc-table th{font-size:8.5pt;font-weight:700;text-transform:uppercase;padding:7px 10px;text-align:center;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .doc-sipoc-cell{padding:10px;vertical-align:top;border-right:1px solid #d0d8e8;font-size:10pt;}
        @media print{@page{margin:10mm 12mm;size:A4;}}
      </style></head><body>${doc.outerHTML}</body></html>`);
      iframeDoc.close();
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 600);
    }, 400);
  };

  return (
    <div>
      <div className="tmpl-tab-bar no-print">
        <button className={`tmpl-tab ${tab === 'edit' ? 'active' : ''}`} onClick={() => setTab('edit')}>✏️ Edit</button>
        <button className={`tmpl-tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => { setTab('preview'); if (template.computed) setComputed(template.computed(values)); }}>👁 Preview</button>
      </div>

      {tab === 'edit' && (
        <div className="tmpl-edit-form no-print">
          {template.sections.map((section, si) => (
            <div key={si} className="tmpl-section">
              <div className="tmpl-section-header" style={{ borderLeftColor: phaseColor[template.phase], background: phaseBg[template.phase] }}>
                {section.title}
              </div>
              <div className={`tmpl-fields-grid cols-${Math.min(section.cols, 2)}`}>
                {section.fields.filter(f => f.type !== 'sig').map(f => (
                  <div key={f.id} className={`form-group ${f.span ? 'full-width' : ''}`}>
                    <label>{f.label}</label>
                    {f.type === 'textarea' ? (
                      <textarea className="tmpl-textarea" rows={4} placeholder={f.placeholder}
                        value={values[f.id] || ''} onChange={e => set(f.id, e.target.value)} />
                    ) : (
                      <input type="text" placeholder={f.placeholder}
                        value={values[f.id] || ''} onChange={e => set(f.id, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {template.computed && (
            <div style={{ margin: '1rem 0' }}>
              <button className="btn-secondary" onClick={handleCompute}>⚡ Calculate</button>
              {computed && (
                <div className="stat-grid" style={{ marginTop: '1rem' }}>
                  {Object.entries(computed).map(([k, v]) => (
                    <div key={k} className="stat-card">
                      <div className="stat-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem' }}>{v}</div>
                      <div className="stat-label">{k}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'preview' && (
        <div className="tmpl-preview-wrapper">
          <PrintableDoc template={template} values={values} computed={computed} />
        </div>
      )}

      <div className="template-actions no-print">
        <button className="btn-primary" onClick={handlePrint}>🖨️ Print / Save as PDF</button>
        <span className="template-pdf-tip">Tip: Print → destination → "Save as PDF"</span>
      </div>

      <div className="print-target">
        <PrintableDoc template={template} values={values} computed={computed} />
      </div>
    </div>
  );
}

export default function Templates() {
  const { projectId, templateId } = useParams();
  const navigate = useNavigate();
  const { projects, getProject, updateProject } = useProjects();
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [activeProjectId, setActiveProjectId] = useState(() => projectId || projects[0]?.id || '');
  const phases = ['All', 'Define', 'Measure', 'Analyze', 'Improve', 'Control'];
  const activeProject = projects.find(project => project.id === activeProjectId);
  const documentTypes = ['All', ...new Set(TEMPLATES.map(template => template.documentType || 'Workspace'))];
  const lifecycles = ['All', ...new Set(TEMPLATES.map(template => template.pmpLifecycle).filter(Boolean))];
  const filtered = TEMPLATES.filter(template => (filter === 'All' || template.phase === filter) && (lifecycleFilter === 'All' || template.pmpLifecycle === lifecycleFilter) && (typeFilter === 'All' || (template.documentType || 'Workspace') === typeFilter) && `${template.name} ${template.desc}`.toLowerCase().includes(search.toLowerCase()));
  const workspaceStatus = template => { const record = template.id === 'charter' ? activeProject?.charter : activeProject?.documents?.[`document-${template.id}`]; if (!record) return 'Not Started'; return record.status === 'complete' ? 'Available' : 'In Progress'; };

  if (templateId && !projectId) {
    const template = TEMPLATES.find(item => item.id === templateId);
    if (!template) return <div className="templates-not-found"><h1>Document not found</h1><p>This document is not registered in the library.</p><button className="btn-primary" onClick={() => navigate('/templates')}>Open Document Library</button></div>;
    return <div className="document-launcher"><div className="document-launcher-card"><span>{template.phase.toUpperCase()} DOCUMENT</span><div>{template.icon}</div><h1>{template.name}</h1><p>{template.desc}</p><label>Active project<select value={activeProjectId} onChange={event => setActiveProjectId(event.target.value)}><option value="">Select a project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>{projects.length ? <button className="btn-primary" disabled={!activeProjectId} onClick={() => navigate(template.id === 'charter' ? `/projects/${activeProjectId}/charter` : `/projects/${activeProjectId}/documents/${template.id}`)}>Open Workspace →</button> : <><p>Create a project before opening this workspace.</p><button className="btn-primary" onClick={() => navigate('/projects')}>Create Project</button></>}<button className="btn-ghost" onClick={() => navigate('/templates')}>Browse Document Library</button></div></div>;
  }

  if (projectId && templateId) {
    const project = getProject(projectId);
    const template = TEMPLATES.find(item => item.id === templateId);
    if (!project || !template) return <div className="templates-not-found"><h1>Document workspace not found</h1><p>Select a valid project and template from the document library.</p><button className="btn-primary" onClick={() => navigate('/templates')}>Return to templates</button></div>;
    if (template.id === 'charter') return <Navigate to={`/projects/${project.id}/charter`} replace />;
    return <DocumentWorkspace key={`${project.id}:${template.id}`} template={template} project={project} updateProject={updateProject} />;
  }

  const openTemplate = template => {
    if (!activeProjectId) return;
    navigate(template.id === 'charter' ? `/projects/${activeProjectId}/charter` : `/projects/${activeProjectId}/documents/${template.id}`);
  };

  return (
    <div className="templates-page">
      <div className="templates-header no-print">
        <h1>Document Library</h1>
        <label className="templates-project-select">Active project<select value={activeProjectId} onChange={event => setActiveProjectId(event.target.value)}><option value="">Select a project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <p>Search project-connected Lean Six Sigma and Project Management workspaces.</p>
      </div>

      {!selected ? (
        <>
          <div className="library-controls no-print"><label>Search documents<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by document name" /></label><label>PMP lifecycle<select value={lifecycleFilter} onChange={event => setLifecycleFilter(event.target.value)}>{lifecycles.map(value => <option key={value}>{value}</option>)}</select></label><label>Document type<select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>{documentTypes.map(value => <option key={value}>{value}</option>)}</select></label></div>
          <div className="tab-bar no-print" style={{ marginBottom: '1.5rem' }}>
            {phases.map(p => (
              <button key={p} className={`tab-btn ${filter === p ? 'active' : ''}`} onClick={() => setFilter(p)}>{p}</button>
            ))}
          </div>
          <div className="templates-grid no-print">
            {filtered.map(t => (
              <button key={t.id} className="template-card" disabled={!activeProjectId} onClick={() => openTemplate(t)}>
                <div className="template-icon">{t.icon}</div>
                <div className="template-phase-badge" style={{ color: phaseColor[t.phase] }}>{t.phase}</div>
                <h3>{t.name}</h3>
                <p>{t.desc}</p>
                <span className={`library-status status-${workspaceStatus(t).toLowerCase().replace(' ','-')}`}>{workspaceStatus(t)}</span>
                <div className="template-open-btn">Open Template →</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div>
          <button className="btn-ghost no-print" onClick={() => setSelected(null)} style={{ marginBottom: '1.5rem' }}>
            ← Back to Templates
          </button>
          <div className="template-form-wrapper card no-print" style={{ padding: '2rem' }}>
            <div className="template-form-header no-print">
              <span style={{ fontSize: '1.5rem' }}>{selected.icon}</span>
              <div>
                <h2>{selected.name}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{selected.desc}</p>
              </div>
            </div>
            <TemplateForm template={selected} />
          </div>
        </div>
      )}
    </div>
  );
}
