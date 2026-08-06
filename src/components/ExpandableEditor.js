import React, { useEffect, useRef } from 'react';
import './ExpandableEditor.css';

export default function ExpandableEditor({ label, value = '', onChange, onClose, rich = false }) {
  const editorRef = useRef(null);
  useEffect(() => {
    const closeOnEscape = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('expandable-editor-open');
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('expandable-editor-open'); };
  }, [onClose]);
  useEffect(() => {
    if (rich && editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
    editorRef.current?.focus();
  }, [rich, value]);
  const format = command => { editorRef.current?.focus(); document.execCommand(command, false); onChange(editorRef.current?.innerHTML || ''); };

  return <div className="expandable-editor" role="dialog" aria-modal="true" aria-label={`${label} expanded editor`}>
    <button type="button" className="expandable-editor-backdrop" onClick={onClose} aria-label="Close editor" />
    <section className="expandable-editor-panel">
      <header><div><span>FOCUSED EDITOR</span><h2>{label}</h2></div><div><button type="button" className="btn-secondary" onClick={onClose}>Close</button><button type="button" className="btn-primary" onClick={onClose}>Save / Done</button></div></header>
      {rich ? <div className="expandable-editor-rich"><div className="expandable-editor-toolbar"><button type="button" onClick={() => format('bold')}><strong>B</strong></button><button type="button" onClick={() => format('italic')}><em>I</em></button><button type="button" onClick={() => format('insertUnorderedList')}>&bull; List</button><button type="button" onClick={() => format('insertOrderedList')}>1. List</button></div><div ref={editorRef} contentEditable role="textbox" aria-multiline="true" onInput={event => onChange(event.currentTarget.innerHTML)} suppressContentEditableWarning /></div> : <textarea ref={editorRef} value={value} onChange={event => onChange(event.target.value)} />}
      <footer><span>Changes synchronize immediately &middot; Escape closes the editor</span><button type="button" className="btn-primary" onClick={onClose}>Save / Done</button></footer>
    </section>
  </div>;
}
