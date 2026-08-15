import React,{useEffect,useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {useInteractions} from '../context/InteractionContext';
import {pmRepository} from '../repositories/pmRepository';
import './ProjectRisks.css';

const EMPTY={title:'',description:'',probability:'Medium',impact:'Medium',owner:'',mitigation:'',status:'Open'};
const LEVELS=['Low','Medium','High'];
const STATUSES=['Open','Monitoring','Triggered','Closed'];
const detail=risk=>({...EMPTY,...(risk.content||{}),title:risk.title||'',status:risk.status||'Open'});
const message=error=>error?.message||'Project risks could not be loaded.';

export default function ProjectRisks({project}){
  const{user,profile}=useAuth();
  const{confirm,toast}=useInteractions();
  const[risks,setRisks]=useState([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const[editor,setEditor]=useState(null);
  const[saving,setSaving]=useState(false);
  const[deletingId,setDeletingId]=useState('');

  const load=async()=>{setLoading(true);setError('');try{setRisks(await pmRepository.risks.list(project.id))}catch(nextError){setError(message(nextError))}finally{setLoading(false)}};
  useEffect(()=>{let active=true;setLoading(true);setError('');pmRepository.risks.list(project.id).then(rows=>{if(active)setRisks(rows)}).catch(nextError=>{if(active)setError(message(nextError))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[project.id]);

  const beginCreate=()=>setEditor({record:null,values:{...EMPTY}});
  const beginEdit=risk=>setEditor({record:risk,values:detail(risk)});
  const change=(field,value)=>setEditor(current=>({...current,values:{...current.values,[field]:value}}));
  const save=async event=>{event.preventDefault();if(!editor||saving)return;setSaving(true);setError('');const values=editor.values,content={description:values.description.trim(),probability:values.probability,impact:values.impact,owner:values.owner.trim(),mitigation:values.mitigation.trim()};try{let saved;if(editor.record){const{created_by,...existing}=editor.record;saved=await pmRepository.risks.update({...existing,project_id:project.id,organization_id:project.organizationId||profile?.default_organization_id,title:values.title.trim(),status:values.status,methodology:project.methodology||'pmp',lifecycle_phase:existing.lifecycle_phase||project.currentPhase||'Planning',content});setRisks(current=>current.map(risk=>risk.id===saved.id?saved:risk))}else{saved=await pmRepository.risks.create({project_id:project.id,organization_id:project.organizationId||profile?.default_organization_id,created_by:user?.id,title:values.title.trim(),status:values.status,methodology:project.methodology||'pmp',lifecycle_phase:project.currentPhase||'Planning',content});setRisks(current=>[saved,...current])}setEditor(null);toast(editor.record?'Risk updated.':'Risk created.')}catch(nextError){setError(message(nextError))}finally{setSaving(false)}};
  const remove=async risk=>{if(!await confirm({title:'Delete risk?',message:`“${risk.title}” will be permanently removed from this project.`,confirmLabel:'Delete Risk',destructive:true}))return;setDeletingId(risk.id);setError('');try{await pmRepository.risks.remove(risk.id);setRisks(current=>current.filter(item=>item.id!==risk.id));toast('Risk deleted.')}catch(nextError){setError(message(nextError))}finally{setDeletingId('')}};

  return <section className="pm-risks" aria-labelledby="pm-risks-title">
    <header><div><span>PROJECT MANAGEMENT</span><h2 id="pm-risks-title">Project Risks</h2><p>Identify threats, assess exposure, and maintain accountable mitigation.</p></div><button type="button" className="btn-primary" onClick={beginCreate}>+ Add Risk</button></header>
    {error&&<div className="pm-risk-error" role="alert"><span>{error}</span>{!editor&&<button type="button" onClick={load}>Retry</button>}</div>}
    {loading?<div className="pm-risk-state" role="status">Loading project risks…</div>:risks.length?<div className="pm-risk-list">{risks.map(risk=>{const values=detail(risk);return <article key={risk.id}><header><div><span className={`pm-risk-level level-${values.impact.toLowerCase()}`}>{values.probability} probability · {values.impact} impact</span><h3>{values.title}</h3></div><span className={`pm-risk-status status-${values.status.toLowerCase()}`}>{values.status}</span></header><p>{values.description||'No description provided.'}</p><dl><div><dt>Owner</dt><dd>{values.owner||'Unassigned'}</dd></div><div><dt>Mitigation</dt><dd>{values.mitigation||'Not documented'}</dd></div></dl><footer><button type="button" onClick={()=>beginEdit(risk)}>Edit</button><button type="button" className="danger" disabled={deletingId===risk.id} onClick={()=>remove(risk)}>{deletingId===risk.id?'Deleting…':'Delete'}</button></footer></article>})}</div>:<div className="pm-risk-empty"><div>◇</div><h3>No project risks yet</h3><p>Add the first risk to establish ownership, exposure, and mitigation.</p><button type="button" className="btn-primary" onClick={beginCreate}>Add First Risk</button></div>}
    {editor&&<div className="pm-risk-editor" role="dialog" aria-modal="true" aria-labelledby="pm-risk-editor-title"><button type="button" className="pm-risk-backdrop" aria-label="Close risk editor" onClick={()=>!saving&&setEditor(null)}/><form onSubmit={save}><header><div><span>{editor.record?'EDIT RISK':'NEW RISK'}</span><h2 id="pm-risk-editor-title">{editor.record?'Update project risk':'Add project risk'}</h2></div><button type="button" aria-label="Close risk editor" onClick={()=>setEditor(null)} disabled={saving}>×</button></header><label>Title<input required value={editor.values.title} onChange={event=>change('title',event.target.value)}/></label><label className="wide">Description<textarea rows="3" value={editor.values.description} onChange={event=>change('description',event.target.value)}/></label><label>Probability<select value={editor.values.probability} onChange={event=>change('probability',event.target.value)}>{LEVELS.map(value=><option key={value}>{value}</option>)}</select></label><label>Impact<select value={editor.values.impact} onChange={event=>change('impact',event.target.value)}>{LEVELS.map(value=><option key={value}>{value}</option>)}</select></label><label>Owner<input value={editor.values.owner} onChange={event=>change('owner',event.target.value)}/></label><label>Status<select value={editor.values.status} onChange={event=>change('status',event.target.value)}>{STATUSES.map(value=><option key={value}>{value}</option>)}</select></label><label className="wide">Mitigation<textarea rows="3" value={editor.values.mitigation} onChange={event=>change('mitigation',event.target.value)}/></label><footer><button type="button" className="btn-secondary" disabled={saving} onClick={()=>setEditor(null)}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving?'Saving…':editor.record?'Save Changes':'Create Risk'}</button></footer></form></div>}
  </section>;
}
