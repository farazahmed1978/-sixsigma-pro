import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { PMP_STAGE_LABELS } from '../config/navigation';
import './ComingSoon.css';

const titleCase=value=>value.split('-').map(word=>word==='evm'?'EVM':word==='kpi'?'KPI':word==='wbs'?'WBS':word.charAt(0).toUpperCase()+word.slice(1)).join(' ');

export default function ComingSoon(){
 const {stage,documentId}=useParams();
 const stageLabel=PMP_STAGE_LABELS[stage]||'Project Management';
 const title=titleCase(documentId||'Document');
 return <div className="coming-soon-page"><div className="coming-soon-card"><span>PROJECT MANAGEMENT · {stageLabel.toUpperCase()}</span><div className="coming-soon-icon">◇</div><h1>{title}</h1><strong>Coming Soon</strong><p>This interactive workspace is part of the planned PMP document ecosystem. It will use the same project-connected shell, autosave, quality scoring, asset references, reporting, and future AI-ready schema as existing documents.</p><div><Link className="btn-primary" to="/projects">Back to Projects</Link><Link className="btn-secondary" to="/templates">Open Document Library</Link></div></div></div>;
}
