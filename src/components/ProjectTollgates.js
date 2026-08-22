import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useInteractions } from "../context/InteractionContext";
import { useReport } from "../context/ReportContext";
import { tollgateRepository } from "../repositories/tollgateRepository";
import {
  TOLLGATE_PHASES,
  TOLLGATE_STATUSES,
  appendTollgateEvent,
  canReviewTollgate,
  defineRemediationDestinations,
  eligibleTollgateReviewers,
  evaluateTollgateReadiness,
  phaseAfterDecision,
  reviewerIdentity,
  tollgateReviewerEligibility,
  tollgateDetail,
  tollgateReportItem,
} from "../foundation/tollgate";
import "./ProjectTollgates.css";
import "./ProjectTollgatesStates.css";
const activeStatus = (status) =>
    [TOLLGATE_STATUSES.SUBMITTED, TOLLGATE_STATUSES.IN_REVIEW].includes(status),
  latestFor = (reviews, phase) =>
    reviews
      .filter((row) => tollgateDetail(row).phase === phase)
      .sort(
        (a, b) =>
          (tollgateDetail(b).attempt || 1) - (tollgateDetail(a).attempt || 1),
      )[0];
const APPROVED_HANDOFF={
  Define:{label:'Measure',description:'Begin measurement planning and establish the project baseline.',path:'data-collection-plan'},
  Measure:{label:'Analyze',description:'Begin the investigation plan and validate the causes of variation.',path:'hypothesis-plan'},
  Analyze:{label:'Improve',description:'Select the solution approach, assess risk, and plan validation.',path:'solution-selection-matrix'},
  Improve:{label:'Control',description:'Build the control strategy and sustain the verified improvement.',path:'control-plan'},
  Control:{label:'Project Closure',description:'Control governance is approved. Complete the formal operational handoff and closure record.',path:'project-closure'},
};
export default function ProjectTollgates({
  project,
  documents = [],
  analyses = [],
  evidence = [],
  datasets = [],
  correctiveActions = [],
  reviews = [],
  onReviewsChange,
  updateProject,
  onOpenBinder,
  requestedPhase = "",
  requestedAttempt = "",
}) {
  const navigate = useNavigate(),
    { user, profile } = useAuth(),
    { toast } = useInteractions(),
    report = useReport(),
    [phase, setPhase] = useState(
      requestedPhase || project.currentPhase || "Define",
    ),
    [loading, setLoading] = useState(!reviews.length),
    [error, setError] = useState(""),
    [role, setRole] = useState(""),
    [reviewerKey, setReviewerKey] = useState(""),
    [comments, setComments] = useState(""),
    [saving, setSaving] = useState(false);
  const context = {
    organizationId: project.organizationId || profile?.default_organization_id,
    projectId: project.id,
  };
  useEffect(() => {
    let active = true;
    Promise.all([
      tollgateRepository.list(project.id),
      tollgateRepository.organizationRole(context.organizationId, user?.id),
    ])
      .then(([rows, nextRole]) => {
        if (active) {
          onReviewsChange(rows);
          setRole(nextRole);
        }
      })
      .catch(
        (next) =>
          active && setError(next.message || "Tollgates could not be loaded."),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [project.id, context.organizationId, user?.id, onReviewsChange]);
  useEffect(() => {
    if (requestedPhase) setPhase(requestedPhase);
  }, [requestedPhase]);
  const resources = useMemo(
      () => ({ documents, analyses, evidence, datasets, correctiveActions }),
      [documents, analyses, evidence, datasets, correctiveActions],
    ),
    readiness = evaluateTollgateReadiness(project, phase, resources),
    attempts = reviews
      .filter((row) => tollgateDetail(row).phase === phase)
      .sort(
        (a, b) =>
          (tollgateDetail(b).attempt || 1) - (tollgateDetail(a).attempt || 1),
      ),
    requestedReview = requestedAttempt
      ? attempts.find((row) => String(tollgateDetail(row).attempt || 1) === String(requestedAttempt))
      : null,
    latest = requestedReview || attempts[0],
    gate = latest && tollgateDetail(latest),
    governanceLabel = gate?.status || (readiness.readyToSubmit ? "Work Ready" : "Blocked"),
    teamMembers = project.team || [],
    team = eligibleTollgateReviewers(project, user),
    incompleteReviewers = teamMembers.filter(
      (member) => tollgateReviewerEligibility(member, user).code === "missing-identity",
    ),
    selfExcludedReviewers = teamMembers.filter(
      (member) => tollgateReviewerEligibility(member, user).code === "self-approval",
    ),
    reviewer = team.find((member) => reviewerIdentity(member) === reviewerKey),
    authorized =
      gate && canReviewTollgate({ user, organizationRole: role, review: gate }),
    reviewerContext = Boolean(authorized && activeStatus(gate?.status));
  const submissionEvent=gate?.events?.find(event=>event.type==="submitted"||event.type==="resubmitted");
  useEffect(() => {
    setReviewerKey(
      gate?.assignedReviewerId ||
        String(gate?.assignedReviewerEmail || "").toLowerCase(),
    );
  }, [gate?.id, gate?.assignedReviewerId, gate?.assignedReviewerEmail]);
  const submit = async () => {
    if (!readiness.readyToSubmit || saving) return;
    if (!reviewer) {
      setError("Assign a project-team reviewer before submission.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const attempt =
          (attempts[0] ? tollgateDetail(attempts[0]).attempt : 0) + 1,
        at = new Date().toISOString(),
        content = {
          phase,
          attempt,
          submittedBy: user.id,
          submittedByName: user.user_metadata?.full_name || user.email,
          submittedAt: at,
          assignedReviewerId: reviewer.userId || "",
          assignedReviewerName: reviewer.name || reviewer.email,
          assignedReviewerEmail: String(reviewer.email || "").trim().toLowerCase(),
          readiness,
          evidenceSnapshot: readiness.evidenceSnapshot,
          reviewComments: "",
          decision: "",
          decisionBy: "",
          decisionByName: "",
          decisionAt: "",
          returnReason: "",
          events: [
            {
              id: crypto.randomUUID(),
              type: attempt > 1 ? "resubmitted" : "submitted",
              at,
              actorId: user.id,
              actorName: user.email,
              comments: comments.trim(),
            },
          ],
        };
      const saved = await tollgateRepository.create({
        project_id: project.id,
        organization_id: context.organizationId,
        created_by: user.id,
        title: `${phase} Tollgate — Attempt ${attempt}`,
        status: TOLLGATE_STATUSES.SUBMITTED,
        methodology: "lean-six-sigma",
        lifecycle_phase: phase,
        content,
      });
      onReviewsChange([saved, ...reviews]);
      setComments("");
      toast(`${phase} gate submitted for review.`);
    } catch (next) {
      setError(next.message || "The tollgate could not be submitted.");
    } finally {
      setSaving(false);
    }
  };
  const decide = async (status) => {
    if (!authorized || saving) return;
    const note = comments.trim();
    if (
      [
        TOLLGATE_STATUSES.RETURNED,
        TOLLGATE_STATUSES.CONDITIONAL,
        TOLLGATE_STATUSES.REJECTED,
      ].includes(status) &&
      !note
    ) {
      setError("Comments are required for this decision.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const at = new Date().toISOString(),
        prior = tollgateDetail(latest),
        eventType =
          status === TOLLGATE_STATUSES.IN_REVIEW
            ? "review-started"
            : status === TOLLGATE_STATUSES.RETURNED
              ? "returned-for-revision"
              : "decision",
        next = appendTollgateEvent(prior, {
          type: eventType,
          at,
          actorId: user.id,
          actorName: user.user_metadata?.full_name || user.email,
          status,
          comments: note,
        }),
        content = {
          ...latest.content,
          ...next,
          reviewComments: note || prior.reviewComments,
          decision: status === TOLLGATE_STATUSES.IN_REVIEW ? "" : status,
          decisionBy: status === TOLLGATE_STATUSES.IN_REVIEW ? "" : user.id,
          decisionByName:
            status === TOLLGATE_STATUSES.IN_REVIEW
              ? ""
              : user.user_metadata?.full_name || user.email,
          decisionAt: status === TOLLGATE_STATUSES.IN_REVIEW ? "" : at,
          returnReason:
            status === TOLLGATE_STATUSES.RETURNED ? note : prior.returnReason,
        };
      const { created_by, created_at, updated_at, ...existing } = latest,
        saved = await tollgateRepository.update({
          ...existing,
          status,
          content,
        });
      onReviewsChange(
        reviews.map((row) => (row.id === saved.id ? saved : row)),
      );
      if (
        [TOLLGATE_STATUSES.APPROVED, TOLLGATE_STATUSES.CONDITIONAL].includes(
          status,
        )
      ) {
        const nextPhase = phaseAfterDecision(phase, status);
        if (nextPhase !== project.currentPhase)
          await updateProject(project.id, {
            currentPhase: nextPhase,
            activityLog: [
              {
                id: `tollgate-${saved.id}`,
                action: `${phase} tollgate ${status.toLowerCase()}`,
                assetType: "tollgate",
                assetId: saved.id,
                at,
              },
              ...(project.activityLog || []),
            ],
          });
      }
      setComments("");
      toast(`${phase} gate marked ${status.toLowerCase()}.`);
    } catch (next) {
      setError(next.message || "The review decision could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  const addReport = async () => {
    if (!latest) return;
    await report.addReportItem(tollgateReportItem(latest, project));
    toast("Tollgate summary added to the report.");
  };
  const addComment = async () => {
    const note = comments.trim();
    if (!authorized || !note || saving) return;
    setSaving(true);
    setError("");
    try {
      const prior = tollgateDetail(latest),
        next = appendTollgateEvent(prior, {
          type: "comment",
          actorId: user.id,
          actorName: user.user_metadata?.full_name || user.email,
          comments: note,
        }),
        { created_by, created_at, updated_at, ...existing } = latest,
        saved = await tollgateRepository.update({
          ...existing,
          content: { ...latest.content, ...next, reviewComments: note },
        });
      onReviewsChange(
        reviews.map((row) => (row.id === saved.id ? saved : row)),
      );
      setComments("");
      toast("Review comment recorded.");
    } catch (next) {
      setError(next.message || "The review comment could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="oe-tollgates">
      <header>
        <div>
          <span>{project.name} · {phase.toUpperCase()} DMAIC GOVERNANCE</span>
          <h2>Phase Tollgates</h2>
          <p>
            Submit evidence-backed phases for accountable review without locking
            historical work.
          </p>
          {phase === "Define" && (
            <p className="oe-tollgate-context">
              Professional Define closes here. Confirm the Charter, SIPOC, VOC,
              and CTQ evidence, then submit for independent approval before
              Measure begins.
            </p>
          )}
        </div>
        <button type="button" className="btn-secondary" onClick={onOpenBinder}>
          Open Project Binder
        </button>
      </header>
      {error && (
        <div className="oe-tollgate-error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <p role="status">Loading tollgates…</p>
      ) : (
        <>
          <nav aria-label="DMAIC tollgates">
            {TOLLGATE_PHASES.map((item) => {
              const itemGate = latestFor(reviews, item),
                status = itemGate
                  ? tollgateDetail(itemGate).status
                  : "Not Submitted";
              return (
                <button
                  type="button"
                  className={phase === item ? "active" : ""}
                  key={item}
                  onClick={() => {
                    setPhase(item);
                    setComments("");
                  }}
                >
                  <b>{item}</b>
                  <small>{status}</small>
                </button>
              );
            })}
          </nav>
          {phase === "Define" && <section className="oe-tollgate-guidance" aria-label="Define Tollgate guidance"><div><b>Readiness</b><span>The package has the required governed work to submit; it does not mean Define is approved.</span></div><div><b>Reviewer</b><span>An eligible project team member independently reviews this attempt. Self-approval is prohibited.</span></div><div><b>After submission</b><span>Define remains current while the attempt is submitted, under review, returned, conditional, or rejected.</span></div><div><b>After approval</b><span>Approval completes Define and advances the project’s canonical phase to Measure.</span></div></section>}
          <div className="oe-tollgate-layout">
            <section className="oe-tollgate-readiness">
              <header>
                <div>
                  <span>{phase.toUpperCase()} GATE</span>
                  <h3>Submission readiness</h3>
                </div>
                <strong className={gate?.status===TOLLGATE_STATUSES.APPROVED?"approved":readiness.readyToSubmit&&!gate?"work-ready":"blocked"}>{governanceLabel}</strong>
              </header>
              <RequirementList title="Blockers" items={readiness.blockers} />
              <RequirementList title="Warnings" items={readiness.warnings} />
              {readiness.completedRequirements.length > 0 && (
                <details>
                  <summary>
                    {readiness.completedRequirements.length} requirements
                    complete
                  </summary>
                  <ul>
                    {readiness.completedRequirements.map((item) => (
                      <li key={item.code}>{item.label}</li>
                    ))}
                  </ul>
                </details>
              )}
              {reviewerContext && <div className="oe-tollgate-reviewer-context"><b>Reviewer workspace</b><span>Review the submitted evidence and record your independent decision.</span></div>}
              {!reviewerContext && <>
              <label>
                Reviewer
                <select
                  value={reviewerKey}
                  disabled={Boolean(gate && activeStatus(gate.status))}
                  onChange={(event) => setReviewerKey(event.target.value)}
                >
                  <option value="">Assign reviewer</option>
                  {team.map((member) => (
                    <option
                      key={reviewerIdentity(member)}
                      value={reviewerIdentity(member)}
                    >
                      {member.name || member.email} ·{" "}
                      {member.role || "Team member"}
                    </option>
                  ))}
                </select>
              </label>
              {!team.length && !(gate && activeStatus(gate.status)) && (
                <div className="oe-tollgate-reviewer-empty" role="status">
                  <strong>
                    {!teamMembers.length
                      ? "No project team members exist."
                      : incompleteReviewers.length
                        ? `${incompleteReviewers.length} team member${incompleteReviewers.length===1?'':'s'} cannot be assigned as reviewer.`
                        : selfExcludedReviewers.length
                          ? "Only the current submitter is available."
                          : "No eligible reviewer is available."}
                  </strong>
                  <p>{incompleteReviewers.length
                    ? `Complete the account email for ${incompleteReviewers.map(member=>member.name||"the unnamed team member").join(", ")}.`
                    : selfExcludedReviewers.length
                      ? "Self-approval is prohibited. Add a different project team member with their account email."
                      : "Add a project team member with the account email they use to sign in to Aureqin."}</p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      navigate(defineRemediationDestinations(project.id).team)
                    }
                  >
                    Manage Project Team
                  </button>
                </div>
              )}
              <label>
                Submission note
                <textarea
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  placeholder="Context for the reviewer"
                />
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={
                  !readiness.readyToSubmit ||
                  saving ||
                  Boolean(gate && activeStatus(gate.status))
                }
                onClick={submit}
              >
                {[TOLLGATE_STATUSES.RETURNED,TOLLGATE_STATUSES.REJECTED,TOLLGATE_STATUSES.CONDITIONAL].includes(gate?.status)
                  ? "Resubmit Phase"
                  : "Submit Phase"}
              </button>
              </>}
            </section>
            <section className="oe-tollgate-review">
              {gate ? (
                <>
                  <header>
                    <div>
                      <span>ATTEMPT {gate.attempt || 1}</span>
                      <h3>{gate.status}</h3>
                    </div>
                    <small>
                      {gate.assignedReviewerName || "Unassigned reviewer"}
                    </small>
                  </header>
                  <dl>
                    <div>
                      <dt>Submitted</dt>
                      <dd>
                        {new Date(gate.submittedAt).toLocaleString()} by{" "}
                        {gate.submittedByName}
                      </dd>
                    </div>
                    <div>
                      <dt>Decision</dt>
                      <dd>
                        {gate.decision || "Pending"}
                        {gate.decisionAt &&
                          ` · ${new Date(gate.decisionAt).toLocaleString()}`}
                      </dd>
                    </div>
                  </dl>
                  {phase==="Define"&&<div className="oe-tollgate-evidence"><div><b>Submission note</b><p>{submissionEvent?.comments||"No submission note was recorded."}</p></div><nav aria-label="Canonical Define submission evidence"><Link to={`/projects/${project.id}/charter`}>Project Charter</Link><Link to={`/projects/${project.id}/documents/sipoc`}>SIPOC</Link><Link to={`/projects/${project.id}/documents/voc`}>VOC</Link><Link to={`/projects/${project.id}/documents/ctq-tree`}>CTQ Tree</Link><Link to={defineRemediationDestinations(project.id).binder}>Define Binder / evidence</Link></nav></div>}
                  {authorized && activeStatus(gate.status) && (
                    <>
                      <label>
                        Review comments
                        <textarea
                          value={comments}
                          onChange={(event) => setComments(event.target.value)}
                          placeholder="Record review findings, conditions, or revision instructions"
                        />
                      </label>
                      <div className="oe-tollgate-actions">
                        <button
                          className="btn-secondary"
                          disabled={!comments.trim()}
                          onClick={addComment}
                        >
                          Add Comment
                        </button>
                        {gate.status === TOLLGATE_STATUSES.SUBMITTED && (
                          <button
                            className="btn-secondary"
                            onClick={() => decide(TOLLGATE_STATUSES.IN_REVIEW)}
                          >
                            Start Review
                          </button>
                        )}
                        <button
                          className="btn-secondary"
                          onClick={() => decide(TOLLGATE_STATUSES.RETURNED)}
                        >
                          Return for Revision
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => decide(TOLLGATE_STATUSES.CONDITIONAL)}
                        >
                          Conditionally Approve
                        </button>
                        <button
                          className="btn-primary"
                          onClick={() => decide(TOLLGATE_STATUSES.APPROVED)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-ghost danger"
                          onClick={() => decide(TOLLGATE_STATUSES.REJECTED)}
                        >
                          Reject
                        </button>
                      </div>
                    </>
                  )}{" "}
                  {!authorized && activeStatus(gate.status) && (
                    <p className="oe-tollgate-notice">
                      Decision controls are limited to the assigned reviewer or
                      an organization owner/admin. Submitters cannot approve
                      their own gate.
                    </p>
                  )}
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={addReport}
                  >
                    Add summary to Report
                  </button>
                  {gate.status===TOLLGATE_STATUSES.APPROVED&&<div className="oe-tollgate-measure-handoff"><span>{phase.toUpperCase()} APPROVED</span><h4>{phase} governance is complete</h4><p>{APPROVED_HANDOFF[phase].description}</p><Link className="btn-primary" to={`/projects/${project.id}/documents/${APPROVED_HANDOFF[phase].path}`}>Continue to {APPROVED_HANDOFF[phase].label} →</Link></div>}
                  <h4>Review history</h4>
                  <ol className="oe-tollgate-history">
                    {[...(gate.events || [])].reverse().map((event) => (
                      <li key={event.id}>
                        <b>
                          {String(event.type || "event").replace(/-/g, " ")}
                        </b>
                        <span>
                          {event.actorName} ·{" "}
                          {new Date(event.at).toLocaleString()}
                        </span>
                        {event.comments && <p>{event.comments}</p>}
                      </li>
                    ))}
                  </ol>
                  {attempts.length > 1 && (
                    <small>
                      {attempts.length} durable submission attempts retained.
                    </small>
                  )}
                </>
              ) : (
                <div className="oe-tollgate-empty">
                  <h3>Not submitted</h3>
                  <p>
                    Resolve hard blockers, assign a reviewer, and submit this
                    phase.
                  </p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
function RequirementList({ title, items }) {
  const navigate = useNavigate();
  if (!items.length) return null;
  return (
    <div className={`oe-tollgate-requirements ${title.toLowerCase()}`}>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item.code}>
            <span>{item.label}</span>
            <span className="oe-tollgate-requirement-actions">
              {item.actions.map((next) => (
                <button
                  type="button"
                  className="btn-ghost"
                  key={`${item.code}-${next.destination}`}
                  onClick={() => navigate(next.destination)}
                >
                  {next.actionLabel}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
