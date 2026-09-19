import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Kind = 'person' | 'org' | 'place' | 'alias' | 'document' | 'note';
type Entity = { id: string; kind: Kind; title: string; subtitle: string; x: number; y: number; accent: string; tags?: string[]; content?: string };
type Relationship = { id: string; from: string; to: string; label: string };
type Investigation = { id: string; name: string; description: string; entities: Entity[]; relationships: Relationship[] };
type Modal = 'new' | 'edit-case' | 'summary' | 'export' | 'thread' | 'profile' | 'suggests' | 'replay' | null;
type Pair = { from: string; to: string };

const seedEntities: Entity[] = [
  { id: 'nightfall', kind: 'document', title: 'Project Nightfall', subtitle: 'case file · 2024-11-04', x: 42, y: 42, accent: '#8b5cf6', tags: ['priority', 'simulated'] },
  { id: 'mara', kind: 'person', title: 'Mara Voss', subtitle: 'person · @mvoss', x: 21, y: 22, accent: '#22d3ee', tags: ['primary'] },
  { id: 'aegis', kind: 'org', title: 'Aegis Meridian', subtitle: 'organization · registered 2019', x: 66, y: 22, accent: '#f59e0b', tags: ['corporate'] },
  { id: 'osprey', kind: 'alias', title: 'OSPREY_7', subtitle: 'alias · forum identity', x: 77, y: 62, accent: '#fb7185', tags: ['unverified'] },
  { id: 'reykjavik', kind: 'place', title: 'Reykjavík, IS', subtitle: 'location · 64.1466° N', x: 17, y: 70, accent: '#34d399', tags: ['incident'] },
  { id: 'ledger', kind: 'document', title: 'Ledger fragment 04', subtitle: 'evidence · sha256: 7a91…', x: 59, y: 78, accent: '#a78bfa', tags: ['high confidence'] },
];
const seedRelationships: Relationship[] = [
  { id: 'r1', from: 'nightfall', to: 'mara', label: 'references' }, { id: 'r2', from: 'nightfall', to: 'aegis', label: 'associated with' },
  { id: 'r3', from: 'nightfall', to: 'osprey', label: 'mentions' }, { id: 'r4', from: 'nightfall', to: 'reykjavik', label: 'located near' },
  { id: 'r5', from: 'nightfall', to: 'ledger', label: 'supported by' }, { id: 'r6', from: 'aegis', to: 'osprey', label: 'linked to' },
];
const seedCase: Investigation = { id: 'nightfall-case', name: 'Project Nightfall', description: 'Mapping the Osprey network and related identities.', entities: seedEntities, relationships: seedRelationships };
const icon = (name: string) => ({ search: '⌕', bell: '◌', plus: '+', export: '⇩', note: '▤', person: '♙', org: '◈', place: '⌖', alias: '◎', document: '▤' } as Record<string, string>)[name] || '•';
const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; } };

function App() {
  const [cases, setCases] = useState<Investigation[]>(() => read('shadow-cases', [read('shadow-case', seedCase)]));
  const [activeId, setActiveId] = useState(() => localStorage.getItem('shadow-active-case') || cases[0].id);
  const activeCase = cases.find(item => item.id === activeId) || cases[0];
  const [selected, setSelected] = useState(activeCase.entities[0]?.id || '');
  const [modal, setModal] = useState<Modal>(null);
  const [query, setQuery] = useState('');
  const [follow, setFollow] = useState(false);
  const [activeTab, setActiveTab] = useState<'board' | 'timeline'>('board');
  const [toast, setToast] = useState('');
  const [draftCase, setDraftCase] = useState({ name: '', description: '' });
  const [noteDraft, setNoteDraft] = useState({ title: '', content: '' });
  const [entityDraft, setEntityDraft] = useState({ title: '', subtitle: '' });
  const [threadDraft, setThreadDraft] = useState({ from: '', to: '', label: 'supports' });
  const [highlightedPair, setHighlightedPair] = useState<Pair | null>(null);
  const [profile, setProfile] = useState(() => read('shadow-profile', { name: 'Alex Kim', role: 'analyst', initials: 'AK' }));
  const boardRef = useRef<HTMLDivElement>(null);
  const selectedEntity = activeCase.entities.find(entity => entity.id === selected);
  const visible = useMemo(() => activeCase.entities.filter(entity => `${entity.title} ${entity.subtitle} ${entity.content || ''} ${entity.tags?.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [activeCase, query]);

  useEffect(() => { localStorage.setItem('shadow-cases', JSON.stringify(cases)); localStorage.setItem('shadow-active-case', activeId); }, [cases, activeId]);
  useEffect(() => { localStorage.setItem('shadow-profile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (selectedEntity?.kind === 'note') setNoteDraft({ title: selectedEntity.title, content: selectedEntity.content || '' }); else if (selectedEntity) setEntityDraft({ title: selectedEntity.title, subtitle: selectedEntity.subtitle }); }, [selected, activeId]);

  const updateCase = (patch: Partial<Investigation>) => setCases(prev => prev.map(item => item.id === activeCase.id ? { ...item, ...patch } : item));
  const addEntity = (kind: Kind) => {
    const id = `${kind}-${Date.now()}`;
    const entity: Entity = { id, kind, title: kind === 'note' ? 'Investigator note' : `New ${kind}`, subtitle: kind === 'note' ? 'working hypothesis' : 'unclassified entity', x: 33 + Math.random() * 34, y: 32 + Math.random() * 40, accent: kind === 'note' ? '#f472b6' : '#38bdf8', tags: ['new'], content: kind === 'note' ? 'Write your observation or hypothesis here.' : undefined };
    updateCase({ entities: [...activeCase.entities, entity] }); setSelected(id); setToast(`${kind[0].toUpperCase() + kind.slice(1)} added to board`);
  };
  const saveSelected = () => {
    if (!selectedEntity) return;
    const patch = selectedEntity.kind === 'note' ? { title: noteDraft.title.trim() || 'Untitled note', content: noteDraft.content, subtitle: 'edited just now' } : { title: entityDraft.title.trim() || 'Untitled entity', subtitle: entityDraft.subtitle.trim() || 'edited just now' };
    updateCase({ entities: activeCase.entities.map(entity => entity.id === selectedEntity.id ? { ...entity, ...patch } : entity) }); setToast('Changes saved');
  };
  const deleteSelected = () => {
    if (!selectedEntity) return;
    updateCase({ entities: activeCase.entities.filter(entity => entity.id !== selectedEntity.id), relationships: activeCase.relationships.filter(edge => edge.from !== selectedEntity.id && edge.to !== selectedEntity.id) });
    setSelected(activeCase.entities.find(entity => entity.id !== selectedEntity.id)?.id || ''); setToast('Item deleted');
  };
  const createCase = () => {
    if (!draftCase.name.trim()) { setToast('Enter an investigation name'); return; }
    const created: Investigation = { id: `case-${Date.now()}`, name: draftCase.name.trim(), description: draftCase.description.trim() || 'New simulated investigation workspace.', entities: [{ id: `root-${Date.now()}`, kind: 'document', title: draftCase.name.trim(), subtitle: 'case file · just created', x: 50, y: 45, accent: '#8b5cf6', tags: ['simulated', 'new'] }], relationships: [] };
    setCases(prev => [...prev, created]); setActiveId(created.id); setSelected(created.entities[0].id); setDraftCase({ name: '', description: '' }); setModal(null); setToast(`Investigation "${created.name}" created`);
  };
  const openCase = (item: Investigation) => { setActiveId(item.id); setSelected(item.entities[0]?.id || ''); setModal(null); setQuery(''); };
  const deleteCase = (id: string) => { if (cases.length === 1) { setToast('Keep at least one investigation'); return; } const remaining = cases.filter(item => item.id !== id); setCases(remaining); if (id === activeId) openCase(remaining[0]); setToast('Investigation deleted'); };
  const saveThread = () => {
    if (!threadDraft.from || !threadDraft.to || threadDraft.from === threadDraft.to) { setToast('Choose two different entities'); return; }
    updateCase({ relationships: [...activeCase.relationships, { id: `r-${Date.now()}`, ...threadDraft }] }); setModal(null); setToast('Thread added');
  };
  const drag = (id: string, ev: React.PointerEvent) => { const board = boardRef.current; if (!board) return; (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId); const move = (event: PointerEvent) => { const rect = board.getBoundingClientRect(); const x = Math.min(91, Math.max(5, ((event.clientX - rect.left) / rect.width) * 100)); const y = Math.min(86, Math.max(8, ((event.clientY - rect.top) / rect.height) * 100)); updateCase({ entities: activeCase.entities.map(entity => entity.id === id ? { ...entity, x, y } : entity) }); }; const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); };
  const exportJson = () => { const blob = new Blob([JSON.stringify({ ...activeCase, simulated: true, profile }, null, 2)], { type: 'application/json' }); const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = `${activeCase.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`; anchor.click(); URL.revokeObjectURL(anchor.href); setModal(null); setToast('Investigation JSON exported'); };
  const investigatePair = (pair: Pair) => { setHighlightedPair(pair); setSelected(pair.from); setModal(null); setToast('Pair highlighted for investigation'); };

  return <div className="app">
    <header className="topbar"><div className="brand"><span className="brand-mark">S</span><span>SHADOW</span><small>OSINT WORKSPACE</small></div><div className="top-actions"><span className="simulated"><i /> SIMULATED DATA</span><button className="icon-btn">{icon('bell')}</button><button className="avatar" onClick={() => setModal('profile')}>{profile.initials}</button></div></header>
    <main className="shell"><aside className="sidebar"><div className="workspace-label">WORKSPACE <span>⌄</span></div><div className="workspace-card"><div className="workspace-symbol">N</div><div><strong>Nightfall Lab</strong><small>private workspace</small></div><span className="status-dot" /></div>
      <div className="side-section"><div className="section-title">INVESTIGATIONS <button onClick={() => setModal('new')}>+</button></div>{cases.map(item => <div className="case-row-wrap" key={item.id}><button className={`case-row ${item.id === activeCase.id ? 'active' : ''}`} onClick={() => openCase(item)}><span className="case-icon purple">◈</span><span><b>{item.name}</b><small>{item.entities.length} items</small></span><em>{item.entities.length}</em></button><button className="case-edit" onClick={() => { setActiveId(item.id); setSelected(item.entities[0]?.id || ''); setDraftCase({ name: item.name, description: item.description }); setModal('edit-case'); }}>•••</button></div>)}</div>
      <div className="side-section"><div className="section-title">COLLECTIONS <button onClick={() => addEntity('note')}>+</button></div><div className="collection">▧ <span>Unsorted evidence</span><em>{activeCase.entities.length}</em></div><div className="collection">⌖ <span>Places &amp; routes</span><em>{activeCase.entities.filter(entity => entity.kind === 'place').length}</em></div></div>
      <div className="side-bottom"><button className="profile-line profile-button" onClick={() => setModal('profile')}><div className="avatar small">{profile.initials}</div><span><b>{profile.name}</b><small>{profile.role}</small></span><span>✎</span></button><div className="shortcut">⌘ K <span>Quick search</span></div></div>
    </aside>
    <section className="content"><div className="content-head"><div><div className="crumb">INVESTIGATIONS <span>/</span> {activeCase.name.toUpperCase()}</div><h1>{activeCase.name} <span className="lock">▣</span></h1><p>{activeCase.description}</p></div><div className="head-buttons"><button className="ghost" onClick={() => setModal('summary')}>Case summary</button><button className="primary" onClick={() => { setDraftCase({ name: '', description: '' }); setModal('new'); }}>{icon('plus')} New investigation</button></div></div>
      <div className="toolbar"><div className="tabs"><button className={activeTab === 'board' ? 'tab active' : 'tab'} onClick={() => setActiveTab('board')}>⌘ Board <span>{activeCase.entities.length}</span></button><button className={activeTab === 'timeline' ? 'tab active' : 'tab'} onClick={() => setActiveTab('timeline')}>◷ Timeline</button></div><label className="search">{icon('search')}<input placeholder="Search entities, tags, evidence…" value={query} onChange={event => setQuery(event.target.value)} /><kbd>/</kbd></label><div className="toolbar-actions"><button className="ghost" onClick={() => setModal('suggests')}>✦ Suggests</button><button className="ghost" onClick={() => setModal('replay')}>▶ Replay</button><button className="ghost" onClick={() => setModal('thread')}>⌁ Add thread</button><button className="ghost" onClick={() => setModal('export')}>{icon('export')} Export</button></div></div>
      {highlightedPair && <div className="investigation-banner"><span>PAIR HIGHLIGHTED · {activeCase.entities.find(entity => entity.id === highlightedPair.from)?.title} ↔ {activeCase.entities.find(entity => entity.id === highlightedPair.to)?.title}</span><button className="primary" onClick={() => { setThreadDraft({ from: highlightedPair.from, to: highlightedPair.to, label: 'supports' }); setModal('thread'); }}>Open relationship creator</button><button className="banner-dismiss" onClick={() => setHighlightedPair(null)}>×</button></div>}
      {activeTab === 'timeline' ? <Timeline relationships={activeCase.relationships} /> : <div className="board-layout"><div className="board-wrap"><div className="board" ref={boardRef}><div className="grid" /><svg className="connections" viewBox="0 0 100 100" preserveAspectRatio="none">{activeCase.relationships.map(edge => { const from = activeCase.entities.find(entity => entity.id === edge.from); const to = activeCase.entities.find(entity => entity.id === edge.to); return from && to ? <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} /> : null; })}{highlightedPair && (() => { const from = activeCase.entities.find(entity => entity.id === highlightedPair.from); const to = activeCase.entities.find(entity => entity.id === highlightedPair.to); return from && to ? <line className="suggested-line" x1={from.x} y1={from.y} x2={to.x} y2={to.y} /> : null; })()}</svg>{visible.map(entity => <button key={entity.id} className={`node ${selected === entity.id ? 'selected' : ''} ${highlightedPair && (entity.id === highlightedPair.from || entity.id === highlightedPair.to) ? 'pair-highlight' : ''} ${follow ? 'follow-highlight' : ''}`} style={{ left: `${entity.x}%`, top: `${entity.y}%`, '--accent': entity.accent } as React.CSSProperties} onClick={() => setSelected(entity.id)} onPointerDown={event => drag(entity.id, event)}><span className="node-icon">{icon(entity.kind)}</span><span className="node-copy"><b>{entity.title}</b><small>{entity.kind === 'note' ? entity.content : entity.subtitle}</small></span></button>)}</div><div className="zoom"><button>+</button><button>−</button><span>100%</span><button>⊙</button></div><div className="board-hint">Drag nodes to arrange <span>·</span> Click a node to inspect</div></div>
        <aside className="inspector"><div className="inspector-head"><span>ENTITY INSPECTOR</span><button onClick={() => setSelected('')}>×</button></div>{selectedEntity ? <><div className="entity-hero"><div className="large-icon" style={{ color: selectedEntity.accent }}>{icon(selectedEntity.kind)}</div><div><div className="entity-kind">{selectedEntity.kind.toUpperCase()}</div><h2>{selectedEntity.title}</h2><p>{selectedEntity.subtitle}</p></div></div><div className="confidence-row"><span className="confidence-pill">● {selectedEntity.tags?.includes('unverified') ? 'UNVERIFIED' : 'HIGH CONFIDENCE'}</span><span>{activeCase.relationships.filter(edge => edge.from === selectedEntity.id || edge.to === selectedEntity.id).length} threads</span></div><div className="inspector-actions"><button onClick={() => setFollow(!follow)} className={follow ? 'active-action' : ''}>⌁ {follow ? 'Following thread' : 'Follow thread'}</button><button onClick={() => { addEntity('note'); }}>▤ Add note</button><button onClick={() => setModal('thread')}>⌁ Thread</button></div>{selectedEntity.kind === 'note' ? <div className="note-editor"><label>EDIT NOTE HEADING</label><input value={noteDraft.title} onChange={event => setNoteDraft({ ...noteDraft, title: event.target.value })} /><label>EDIT NOTE</label><textarea value={noteDraft.content} onChange={event => setNoteDraft({ ...noteDraft, content: event.target.value })} /><button className="primary wide" onClick={saveSelected}>Save note</button><button className="danger wide" onClick={deleteSelected}>Delete note</button></div> : <div className="note-editor"><label>EDIT ENTITY</label><input value={entityDraft.title} onChange={event => setEntityDraft({ ...entityDraft, title: event.target.value })} /><input value={entityDraft.subtitle} onChange={event => setEntityDraft({ ...entityDraft, subtitle: event.target.value })} /><button className="primary wide" onClick={saveSelected}>Save entity</button><button className="danger wide" onClick={deleteSelected}>Delete entity</button></div>}<div className="detail-section"><label>TAGGED AS</label><div className="tags">{(selectedEntity.tags || ['simulated']).map(tag => <span key={tag}>#{tag}</span>)}</div></div></> : <div className="empty-inspector">Select an entity to inspect it.</div>}</aside></div>}</section></main>
    {modal && <Modal type={modal} close={() => setModal(null)} draftCase={draftCase} setDraftCase={setDraftCase} createCase={createCase} activeCase={activeCase} cases={cases} openCase={openCase} deleteCase={deleteCase} updateCase={updateCase} exportJson={exportJson} threadDraft={threadDraft} setThreadDraft={setThreadDraft} saveThread={saveThread} profile={profile} setProfile={setProfile} investigatePair={investigatePair} />}
    {toast && <div className="toast">✓ {toast}</div>}
  </div>;
}

function Timeline({ relationships }: { relationships: Relationship[] }) { return <div className="timeline"><div className="timeline-head"><span>THREAD ACTIVITY</span><span>SIMULATED TIMESTAMPS</span></div>{relationships.map(edge => <div className="event" key={edge.id}><div className="event-date">JUST NOW</div><div className="event-line" /><div><span className="event-type">RELATIONSHIP</span><h3>{edge.label}</h3><p>{edge.from} → {edge.to}</p></div></div>)}</div>; }

function SuggestsModal({ activeCase, close, investigatePair }: { activeCase: Investigation; close: () => void; investigatePair: (pair: Pair) => void }) {
  const [scanning, setScanning] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => { const timer = setTimeout(() => setScanning(false), 650); return () => clearTimeout(timer); }, []);
  const suggestions = useMemo(() => {
    const linked = new Set(activeCase.relationships.flatMap(edge => [`${edge.from}|${edge.to}`, `${edge.to}|${edge.from}`]));
    const result: { key: string; pair: Pair; score: number; reasons: string[] }[] = [];
    activeCase.entities.forEach((a, i) => activeCase.entities.slice(i + 1).forEach(b => {
      if (linked.has(`${a.id}|${b.id}`)) return;
      const aText = `${a.title} ${a.subtitle} ${a.content || ''} ${(a.tags || []).join(' ')}`.toLowerCase();
      const bText = `${b.title} ${b.subtitle} ${b.content || ''} ${(b.tags || []).join(' ')}`.toLowerCase();
      const sharedTags = (a.tags || []).filter(tag => (b.tags || []).includes(tag));
      const tokens = aText.split(/[^a-z0-9@]+/).filter(token => token.length > 3);
      const sharedWords = tokens.filter(token => bText.includes(token) && !sharedTags.includes(token));
      const reasons = [...sharedTags.map(tag => `Shared tag #${tag}`), ...sharedWords.slice(0, 2).map(word => `Matching identifier “${word}”`)];
      if (reasons.length) result.push({ key: `${a.id}-${b.id}`, pair: { from: a.id, to: b.id }, score: Math.min(96, 67 + reasons.length * 9), reasons });
    }));
    return result.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key)).slice(0, 5);
  }, [activeCase]);
  const name = (id: string) => activeCase.entities.find(entity => entity.id === id)?.title || id;
  return <div className="modal-backdrop" onClick={close}><div className="modal suggests-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={close}>×</button><div className="modal-icon">✦</div><div className="crumb">LOCAL ANALYSIS · DETERMINISTIC</div><h2>SHADOW SUGGESTS</h2><p>Potential links inferred only from this investigation’s entities, notes, tags and identifiers.</p>{scanning ? <div className="scan-state"><span className="scan-dot" />Scanning {activeCase.entities.length} entities and {activeCase.relationships.length} existing threads…</div> : <>{suggestions.filter(item => !dismissed.includes(item.key)).length === 0 ? <div className="empty-suggestions">No new connections found in the current case.</div> : <div className="suggestion-list">{suggestions.filter(item => !dismissed.includes(item.key)).map(item => <div className="suggestion-card" key={item.key}><div className="suggestion-card-head"><div><span className="suggestion-kicker">POSSIBLE LINK</span><h3>{name(item.pair.from)} <span>↔</span> {name(item.pair.to)}</h3></div><strong>{item.score}% <small>confidence</small></strong></div><ul>{item.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><div className="suggestion-actions"><button className="ghost" onClick={() => setDismissed([...dismissed, item.key])}>Dismiss</button><button className="primary" onClick={() => investigatePair(item.pair)}>Investigate pair</button></div></div>)}</div>}</>}</div></div>;
}

function ReplayModal({ activeCase, close }: { activeCase: Investigation; close: () => void }) {
  const events = useMemo(() => [
    ...activeCase.entities.map(entity => ({ id: `entity-${entity.id}`, type: 'ENTITY', title: entity.title, detail: `${entity.kind} · ${entity.subtitle}` })),
    ...activeCase.relationships.map(edge => ({ id: `relationship-${edge.id}`, type: 'THREAD', title: edge.label, detail: `${activeCase.entities.find(entity => entity.id === edge.from)?.title || edge.from} → ${activeCase.entities.find(entity => entity.id === edge.to)?.title || edge.to}` })),
  ], [activeCase]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => { if (!playing || !events.length) return; const timer = setInterval(() => { setIndex(current => { if (current >= events.length - 1) { setPlaying(false); return current; } return current + 1; }); }, 1800 / speed); return () => clearInterval(timer); }, [playing, speed, events.length]);
  const current = events[index];
  return <div className="modal-backdrop replay-backdrop" onClick={close}><div className="modal replay-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={close}>×</button><div className="replay-top"><div><div className="crumb">CASE THREAD · READ-ONLY</div><h2>THREAD REPLAY</h2><p>Replay the recorded order of this case without changing it.</p></div><span className="replay-count">{events.length ? index + 1 : 0} / {events.length}</span></div><div className="replay-stage">{current ? <><span className="suggestion-kicker">{current.type}</span><h3>{current.title}</h3><p>{current.detail}</p></> : <p>No entities or relationships to replay.</p>}</div><input className="scrubber" type="range" min="0" max={Math.max(0, events.length - 1)} value={index} onChange={event => { setPlaying(false); setIndex(Number(event.target.value)); }} /><div className="replay-controls"><button className="ghost" onClick={() => { setPlaying(false); setIndex(0); }}>↺ Restart</button><button className="ghost" onClick={() => { setPlaying(false); setIndex(Math.max(0, index - 1)); }}>‹ Prev</button><button className="primary play-button" onClick={() => setPlaying(!playing)}>{playing ? 'Ⅱ Pause' : '▶ Play'}</button><button className="ghost" onClick={() => { setPlaying(false); setIndex(Math.min(events.length - 1, index + 1)); }}>Next ›</button></div><div className="replay-footer"><span>EVENT {events.length ? index + 1 : 0} OF {events.length} · {events.length ? Math.round(((index + 1) / events.length) * 100) : 0}% COMPLETE</span><div className="speed-buttons">{[0.5, 1, 2, 4].map(value => <button className={speed === value ? 'active' : ''} key={value} onClick={() => setSpeed(value)}>{value}×</button>)}</div></div></div></div>;
}

function Modal({ type, close, draftCase, setDraftCase, createCase, activeCase, cases, openCase, deleteCase, updateCase, exportJson, threadDraft, setThreadDraft, saveThread, profile, setProfile, investigatePair }: { type: Modal; close: () => void; draftCase: { name: string; description: string }; setDraftCase: (value: { name: string; description: string }) => void; createCase: () => void; activeCase: Investigation; cases: Investigation[]; openCase: (item: Investigation) => void; deleteCase: (id: string) => void; updateCase: (patch: Partial<Investigation>) => void; exportJson: () => void; threadDraft: { from: string; to: string; label: string }; setThreadDraft: (value: { from: string; to: string; label: string }) => void; saveThread: () => void; profile: { name: string; role: string; initials: string }; setProfile: (value: { name: string; role: string; initials: string }) => void; investigatePair: (pair: Pair) => void }) {
  const backdrop = (children: React.ReactNode) => <div className="modal-backdrop" onClick={close}><div className="modal" onClick={event => event.stopPropagation()}>{children}</div></div>;
  if (type === 'suggests') return <SuggestsModal activeCase={activeCase} close={close} investigatePair={investigatePair} />;
  if (type === 'replay') return <ReplayModal activeCase={activeCase} close={close} />;
  if (type === 'export') return backdrop(<><button className="modal-close" onClick={close}>×</button><div className="modal-icon">⇩</div><h2>Export investigation</h2><p>Download a portable JSON snapshot of this simulated investigation.</p><button className="primary wide" onClick={exportJson}>Download JSON</button></>);
  if (type === 'summary') return backdrop(<><button className="modal-close" onClick={close}>×</button><div className="crumb">CASE BRIEF · SIMULATED DATA</div><h2>{activeCase.name}</h2><p className="lead">{activeCase.description}</p><div className="summary-stats"><div><b>{String(activeCase.entities.length).padStart(2, '0')}</b><span>entities</span></div><div><b>{String(activeCase.relationships.length).padStart(2, '0')}</b><span>threads</span></div><div><b>03</b><span>evidence items</span></div></div><button className="primary wide" onClick={close}>Back to board</button></>);
  if (type === 'thread') return backdrop(<><button className="modal-close" onClick={close}>×</button><div className="modal-icon">⌁</div><h2>Add thread</h2><p>Connect any two entities or notes with an explainable relationship.</p><label className="field-label">FROM<select value={threadDraft.from} onChange={event => setThreadDraft({ ...threadDraft, from: event.target.value })}><option value="">Choose entity</option>{activeCase.entities.map(entity => <option value={entity.id} key={entity.id}>{entity.title}</option>)}</select></label><label className="field-label">TO<select value={threadDraft.to} onChange={event => setThreadDraft({ ...threadDraft, to: event.target.value })}><option value="">Choose entity</option>{activeCase.entities.map(entity => <option value={entity.id} key={entity.id}>{entity.title}</option>)}</select></label><label className="field-label">RELATIONSHIP<input value={threadDraft.label} onChange={event => setThreadDraft({ ...threadDraft, label: event.target.value })} /></label><button className="primary wide" onClick={saveThread}>Add thread</button></>);
  if (type === 'profile') return backdrop(<><button className="modal-close" onClick={close}>×</button><div className="modal-icon">✎</div><h2>Edit profile</h2><p>Update the investigator identity shown across this workspace.</p><label className="field-label">NAME<input value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value, initials: event.target.value.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() })} /></label><label className="field-label">ROLE<input value={profile.role} onChange={event => setProfile({ ...profile, role: event.target.value })} /></label><label className="field-label">INITIALS<input value={profile.initials} maxLength={2} onChange={event => setProfile({ ...profile, initials: event.target.value.toUpperCase() })} /></label><button className="primary wide" onClick={() => { close(); }}>Save profile</button></>);
  const editing = type === 'edit-case';
  return backdrop(<><button className="modal-close" onClick={close}>×</button><div className="modal-icon">+</div><h2>{editing ? 'Edit investigation' : 'New investigation'}</h2><p>{editing ? 'Update this case or remove it from the workspace.' : 'Start a focused workspace for a new OSINT inquiry.'}</p><label className="field-label">INVESTIGATION NAME<input autoFocus value={draftCase.name} onChange={event => setDraftCase({ ...draftCase, name: event.target.value })} /></label><label className="field-label">DESCRIPTION<textarea value={draftCase.description} onChange={event => setDraftCase({ ...draftCase, description: event.target.value })} /></label>{editing ? <><button className="primary wide" onClick={() => { updateCase({ name: draftCase.name.trim() || activeCase.name, description: draftCase.description }); close(); }}>Save investigation</button><button className="danger wide" onClick={() => { deleteCase(activeCase.id); close(); }}>Delete investigation</button></> : <button className="primary wide" onClick={createCase}>Create investigation</button>}</>);
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
