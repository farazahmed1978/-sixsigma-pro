import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useProjects} from '../context/ProjectsContext';
import {lifecycleForProject, resolveProjectSuiteId} from '../foundation/lifecycle';
import {getMandatorySequence, advanceGuidedFlow, guidedContinueLabel} from '../config/guidedFlow';
import {TEMPLATES} from '../pages/Templates';
import GuidedProgressTracker from './GuidedProgressTracker';
import ProjectCharter from '../pages/ProjectCharter';
import DocumentWorkspace from './DocumentWorkspace';
import './GuidedWorkspace.css';

const EXIT_MS = 250;
const ENTER_MS = 300;

// Phase 5C — the chrome-stripped container that owns the entire guided experience for the
// duration of the mandatory document sequence. A single persistent instance (mounted once by
// ProjectDetail.js whenever location.state.guided is true) that swaps document content in place
// as project.guidedFlowState advances — never a route change — which is what makes the
// document-to-document slide/fade a real CSS transition instead of a route remount, and lets
// GuidedProgressTracker's own step-node animations run on one continuously-mounted instance
// rather than restarting fresh on every document.
//
// Architecture note (Phase 5C QA): GuidedWorkspace is the single source of truth for ALL
// guided-mode rendering decisions — the explanation panel, section navigation, when the Continue
// button appears, and the CTA footer. ProjectCharter.js/DocumentWorkspace.js's `guided` branch
// renders only the current section's fields (the one piece of genuinely non-duplicable business
// logic — their own field components/persistence) and reports its live state up via the
// onGuidedState callback prop; it renders no navigation chrome of its own.
export default function GuidedWorkspace({project}) {
  const {updateProject} = useProjects();
  const suiteId = resolveProjectSuiteId(project);
  const sequence = getMandatorySequence(suiteId);
  const completed = project.guidedFlowState?.completedMandatoryDocs || [];
  const currentDoc = sequence.find(doc => !completed.includes(doc.id)) || sequence[sequence.length - 1];
  const phaseLabel = lifecycleForProject(project).stages[0]?.label || '';

  const [displayedDoc, setDisplayedDoc] = useState(currentDoc);
  const [transitionPhase, setTransitionPhase] = useState('idle');
  // ProjectCharter.js/DocumentWorkspace.js report their live guided state via an effect that
  // deliberately has no dependency array (it must run every render so the reported handles close
  // over current state) and builds a brand-new object — including new goToPrevious/goToNext/save
  // closures — every single time. Feeding that straight into a plain useState setter would make
  // every child render call setState with a referentially-new object, which forces a GuidedWorkspace
  // re-render, which re-renders the child, which reports again — an infinite render loop. The
  // navigation handles themselves live in a ref (updating a ref never triggers a re-render); only
  // the primitive fields that actually affect what's rendered go through state, and that state
  // setter bails out (returns the same object) when nothing primitive changed, so React skips the
  // re-render and the loop never starts.
  const sectionHandlesRef = useRef(null);
  const [sectionInfo, setSectionInfo] = useState(null);
  const setSectionState = useCallback(({goToPrevious, goToNext, save, ...info}) => {
    sectionHandlesRef.current = {goToPrevious, goToNext, save};
    setSectionInfo(prev => (prev
      && prev.sectionIndex === info.sectionIndex
      && prev.totalSections === info.totalSections
      && prev.completedSections === info.completedSections
      && prev.isLastSection === info.isLastSection
      && prev.allRequiredFieldsFilled === info.allRequiredFieldsFilled)
      ? prev
      : info);
  }, []);

  useEffect(() => {
    if (currentDoc.id === displayedDoc.id) return undefined;
    setTransitionPhase('exiting');
    const exitTimer = window.setTimeout(() => {
      setDisplayedDoc(currentDoc);
      sectionHandlesRef.current = null;
      setSectionInfo(null); // the new document hasn't reported its own section state yet
      setTransitionPhase('entering');
    }, EXIT_MS);
    return () => window.clearTimeout(exitTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDoc.id]);

  useEffect(() => {
    if (transitionPhase !== 'entering') return undefined;
    const enterTimer = window.setTimeout(() => setTransitionPhase('idle'), ENTER_MS);
    return () => window.clearTimeout(enterTimer);
  }, [transitionPhase, displayedDoc.id]);

  const template = displayedDoc.id === 'charter' ? null : TEMPLATES.find(item => item.id === displayedDoc.id);

  // Completing the current mandatory document never navigates (no route change in this
  // single-container model — see the module comment above): it only saves and persists
  // guidedFlowState. ProjectDetail.js's own re-render (driven by the updated project prop) picks
  // the next document, or — once mandatoryComplete — swaps GuidedWorkspace out for
  // GuidedDocumentSelection (PM) or the plain hub (OE) on its own.
  const handleContinue = async () => {
    if (!sectionHandlesRef.current) return;
    if (!await sectionHandlesRef.current.save()) return;
    const {guidedFlowState} = advanceGuidedFlow(project, displayedDoc.id);
    await updateProject(project.id, {guidedFlowState});
  };

  const nextDocPreview = advanceGuidedFlow(project, displayedDoc.id);

  return (
    <div className="guided-workspace">
      <GuidedProgressTracker project={project} />
      <div className="gw-doc">
        <div className="gw-doc-explain" key={displayedDoc.id}>
          <div className="gw-doc-meta">
            <strong>{displayedDoc.label}</strong>
            <span>{phaseLabel}</span>
            <i className="gw-badge-mandatory">Mandatory</i>
          </div>
          {displayedDoc.explanation && <div className="gw-explanation"><p>{displayedDoc.explanation}</p></div>}
        </div>
        <div className="gw-content" data-phase={transitionPhase}>
          {displayedDoc.id === 'charter'
            ? <ProjectCharter key={displayedDoc.id} onGuidedState={setSectionState} />
            : template && <DocumentWorkspace key={displayedDoc.id} template={template} project={project} updateProject={updateProject} onGuidedState={setSectionState} />}
        </div>
      </div>
      {sectionInfo && (
        <footer className="gw-cta-footer">
          <div className="gw-cta-inner">
            <span className="gw-cta-progress">{sectionInfo.completedSections} of {sectionInfo.totalSections} sections complete</span>
            <div className="gw-cta-actions">
              <button type="button" className="btn-secondary" disabled={sectionInfo.sectionIndex === 0} onClick={() => sectionHandlesRef.current?.goToPrevious()}>← Previous section</button>
              {sectionInfo.isLastSection ? (
                sectionInfo.allRequiredFieldsFilled ? (
                  <button type="button" className="btn-primary" onClick={handleContinue}>{guidedContinueLabel(nextDocPreview)}</button>
                ) : (
                  <span className="gw-cta-hint">Complete required fields to continue</span>
                )
              ) : (
                <button type="button" className="btn-secondary" onClick={() => sectionHandlesRef.current?.goToNext()}>Next section →</button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
