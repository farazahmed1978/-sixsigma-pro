import React from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {resolveProjectSuiteId} from '../foundation/lifecycle';
import {getMandatorySequence, getGuidedProgress} from '../config/guidedFlow';
import {projectHubRoute} from '../utils/projectResume';
import './GuidedProgressTracker.css';

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" className="gpt-check" aria-hidden="true"><polyline points="3,9 7,13 13,4" /></svg>
);

// Self-gating on location.state.guided so ProjectCharter.js and DocumentWorkspace.js can mount
// this unconditionally as their first child without each remembering the gate themselves — a
// drop-in that "must not interfere with any existing component rendering" per the Phase 5C spec.
export default function GuidedProgressTracker({project}) {
  const location = useLocation();
  const navigate = useNavigate();
  if (!location.state?.guided) return null;

  const suiteId = resolveProjectSuiteId(project);
  const sequence = getMandatorySequence(suiteId);
  const completedIds = project.guidedFlowState?.completedMandatoryDocs || [];
  const progress = getGuidedProgress(suiteId, completedIds);
  const stepLabel = progress.current
    ? `Step ${progress.completed + 1} of ${progress.total} — ${progress.current.label}`
    : 'All mandatory documents complete';

  return (
    <div className="guided-progress-tracker" role="status" aria-label="Guided setup progress">
      <div className="gpt-top">
        <strong className="gpt-heading">Setting up {project.name}</strong>
        <button type="button" className="gpt-exit" onClick={() => navigate(projectHubRoute(project.id))}>Exit to full view →</button>
      </div>
      <p className="gpt-step-label">{stepLabel}</p>
      <div className="gpt-track">
        {sequence.map((doc, index) => {
          const status = index < progress.completed ? 'done' : index === progress.completed ? 'current' : 'pending';
          return (
            <React.Fragment key={doc.id}>
              {index > 0 && <div className={`gpt-line${index <= progress.completed ? ' done' : ''}`} />}
              <div className="gpt-node-wrap">
                <div className={`gpt-node ${status}`}>
                  {status === 'done' ? <CheckIcon /> : <span className="gpt-node-number">{index + 1}</span>}
                </div>
                <span className={`gpt-node-label${status === 'current' ? ' current' : ''}`}>{doc.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
