import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extractCv, useGetCvSkills, useMatchCv, type CvMatch, type CvMatchResult } from '@workspace/api-client-react';
import { ExternalLink, FileText, Pencil, Plus, Trash2, Upload, X, Check, ChevronDown } from 'lucide-react';
import { getSessionEmail } from '../lib/session-email';
import { uploadCvFile } from '../lib/cv-upload';
import { LoadingIndicator } from './loading-indicator';
import {
  LEVELS, LEVEL_LABEL, MAX_SKILLS, buildDictionary, canonicalName, clearCvProfile, loadCvProfile, normalizeSkills, normalizeYears, saveCvProfile,
  type Level, type ProfileSkill,
} from '../lib/cv-profile';

const MAX_BYTES = 8 * 1024 * 1024;
const fmt = (v?: string | null) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d); };
const errMsg = (e: unknown, fb: string) => {
  const d = e as { data?: { error?: string }; message?: string };
  return d?.data?.error || (e instanceof Error && e.message) || fb;
};
const ELIG: Record<CvMatch['eligibility'], string> = { meets: 'Meets stated experience', 'below-stated': 'Slightly below stated experience (2 years or less)', 'above-current': 'Above your current experience (over 2 years)', unknown: 'Experience comparison unknown' };

function SkillRow({ skill, index, onChange, onRemove, disabled }: { skill: ProfileSkill; index: number; onChange: (name: string, level: Level) => string | null; onRemove: () => void; disabled?: boolean }) {
  const [editing, setEditing] = useState(false); const [name, setName] = useState(skill.name); const [err, setErr] = useState('');
  const commit = () => { const e = onChange(name, skill.level); if (e) setErr(e); else { setErr(''); setEditing(false); } };
  return (
    <div className="list-row" data-testid={`row-cv-skill-${index}`} style={{ flexWrap: 'wrap', gap: 8 }}>
      <div className="list-main" style={{ minWidth: 140 }}>
        {editing ? (
          <>
            <input className="control" aria-label={`Edit name of ${skill.name}`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commit(); }} data-testid={`input-cv-skill-name-${index}`} />
            {err && <span role="alert">{err}</span>}
          </>
        ) : <strong>{skill.name}</strong>}
      </div>
      <select className="control" style={{ width: 'auto' }} aria-label={`Self-reported level for ${skill.name}`} value={skill.level} disabled={disabled} onChange={(e) => onChange(skill.name, e.target.value as Level)} data-testid={`select-cv-skill-level-${index}`}>
        {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
      </select>
      {editing
        ? <button type="button" className="small-btn primary" onClick={commit} aria-label={`Save ${skill.name}`} data-testid={`button-cv-skill-save-${index}`}><Check size={12} /> Save</button>
        : <button type="button" className="small-btn" onClick={() => { setName(skill.name); setEditing(true); }} aria-label={`Edit ${skill.name}`} data-testid={`button-cv-skill-edit-${index}`}><Pencil size={12} /> Edit</button>}
      <button type="button" className="small-btn danger" onClick={onRemove} aria-label={`Remove ${skill.name}`} data-testid={`button-cv-skill-remove-${index}`}><Trash2 size={12} /> Remove</button>
    </div>
  );
}

function MatchCard({ m, i, prefix }: { m: CvMatch; i: number; prefix: string }) {
  const j = m.job; const fetched = fmt(j.fetchedAt);
  return (
    <article className="list-row" data-testid={`card-${prefix}-${i}`} style={{ alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
      <div className="list-main" style={{ flex: '1 1 260px', gap: 3 }}>
        <strong>{j.title}</strong>
        <span>{j.company} · {j.location ?? 'Location not stated'}</span>
        <span data-testid={`text-${prefix}-matched-${i}`}>Matched required skills: {!m.requiredSkills.length ? 'Unknown (requirements not determined)' : m.matchedSkills.length ? m.matchedSkills.join(', ') : 'None'}</span>
        <span data-testid={`text-${prefix}-missing-${i}`}>Missing required skills: {!m.requiredSkills.length ? 'Unknown (requirements not determined)' : m.missingSkills.length ? m.missingSkills.join(', ') : 'None'}</span>
        <span>Experience required: {m.experienceRequired === null ? 'Unknown (not determined)' : `${m.experienceRequired} years`}</span>
        <span data-testid={`text-${prefix}-eligibility-${i}`}>Experience status: {ELIG[m.eligibility]}</span>
        {m.evidence.length > 0 && <span>Evidence: {m.evidence.join('; ')}</span>}
        <span>Source: {j.provider} board · fetched {fetched ?? 'time unknown'}</span>
        <a href={j.url} target="_blank" rel="noreferrer" style={{ color: '#176e83', fontWeight: 700, fontSize: 10 }} data-testid={`link-${prefix}-${i}`}>View original listing <ExternalLink size={10} style={{ display: 'inline' }} /></a>
      </div>
      <span className="pill" data-testid={`text-${prefix}-score-${i}`}>{m.score === null ? 'Skill overlap: Unknown' : `${Math.round(m.score * 10) / 10}% skill overlap`}</span>
    </article>
  );
}

function Fold({ title, count, total, testId, children }: { title: string; count: number; total: number; testId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 14 }} data-testid={testId}>
      <button type="button" className="small-btn" aria-expanded={open} onClick={() => setOpen(!open)} data-testid={`${testId}-toggle`}>
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : undefined }} /> {title} ({total} total{total > count ? `, showing ${count}` : ''})
      </button>
      {open && <div className="mini-list" style={{ marginTop: 8 }}>{children}</div>}
    </div>
  );
}

export function CvWorkspace() {
  const dictQ = useGetCvSkills();
  const dict = useMemo(() => buildDictionary(dictQ.data), [dictQ.data]);
  const match = useMatchCv();
  const abortRef = useRef<AbortController | null>(null);
  const matchRef = useRef(match.mutateAsync); matchRef.current = match.mutateAsync;
  const dictRef = useRef(dict); dictRef.current = dict;
  const gen = useRef(0);
  const email = getSessionEmail();
  const initial = useMemo(() => loadCvProfile(email), [email]);
  const [skills, setSkills] = useState<ProfileSkill[]>(initial?.skills ?? []);
  const [years, setYears] = useState<string>(initial?.experienceYears != null ? String(initial.experienceYears) : '');
  const [file, setFile] = useState<File | null>(null); const [doneName, setDoneName] = useState('');
  const [fileErr, setFileErr] = useState(''); const [warnings, setWarnings] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false); const [extractErr, setExtractErr] = useState('');
  const [matching, setMatching] = useState(false); const [matchErr, setMatchErr] = useState('');
  const [result, setResult] = useState<CvMatchResult | null>(null);
  const [newName, setNewName] = useState(''); const [newLevel, setNewLevel] = useState<Level>('unspecified'); const [addErr, setAddErr] = useState('');
  const [saved, setSaved] = useState(!!initial); const [storageNote, setStorageNote] = useState(''); const [info, setInfo] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { gen.current++; abortRef.current?.abort(); }, []);
  const invalidate = useCallback(() => { gen.current++; abortRef.current?.abort(); abortRef.current = null; setExtracting(false); setResult(null); setMatching(false); setMatchErr(''); setSaved(false); setInfo(''); }, []);

  const editSkills = (next: ProfileSkill[]) => { invalidate(); setSkills(next); };
  const addSkill = () => {
    const c = canonicalName(newName, dict);
    if (!c) { setAddErr(newName.trim() ? 'Skill names can be at most 80 characters.' : 'Enter a skill name.'); return; }
    if (skills.some((s) => s.name.toLowerCase() === c.name.toLowerCase())) { setAddErr(`${c.name} is already in your list.`); return; }
    if (skills.length >= MAX_SKILLS) { setAddErr(`You can confirm at most ${MAX_SKILLS} skills.`); return; }
    editSkills([...skills, { name: c.name, level: newLevel }]);
    setNewName(''); setNewLevel('unspecified'); setAddErr('');
    setInfo(c.inDictionary ? '' : `${c.name} is not in the skill dictionary. It is kept in your profile but cannot be recognised in job requirements.`);
  };
  const changeSkill = (idx: number, name: string, level: Level): string | null => {
    const c = canonicalName(name, dict);
    if (!c) return 'Enter a skill name (80 characters at most).';
    if (skills.some((s, k) => k !== idx && s.name.toLowerCase() === c.name.toLowerCase())) return `${c.name} is already in your list.`;
    editSkills(skills.map((s, k) => (k === idx ? { name: c.name, level } : s)));
    return null;
  };

  const resetFile = () => { gen.current++; abortRef.current?.abort(); abortRef.current = null; setDoneName(''); setFile(null); setWarnings([]); setExtractErr(''); setFileErr(''); setExtracting(false); setResult(null); setMatching(false); setMatchErr(''); setSaved(false); if (fileInput.current) fileInput.current.value = ''; };
  const pick = (f?: File) => {
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') { resetFile(); setFileErr('Choose a PDF or DOCX file.'); return; }
    if (f.size === 0) { resetFile(); setFileErr('That file is empty.'); return; }
    if (f.size > MAX_BYTES) { resetFile(); setFileErr('File must be 8 MB or smaller.'); return; }
    resetFile(); setFile(f);
  };
  const runExtract = async () => {
    if (!file) return;
    abortRef.current?.abort(); const ac = new AbortController(); abortRef.current = ac;
    const g = ++gen.current; setExtracting(true); setExtractErr(''); setResult(null); setSaved(false); setMatchErr('');
    try {
      const r = await uploadCvFile(file, ac.signal, extractCv);
      if (g !== gen.current) return;
      const found = normalizeSkills(r.skills.map((s) => ({ name: s.name, level: 'unspecified' })), dictRef.current);
      setSkills((cur) => { const prev = new Map(cur.map((s) => [s.name.toLowerCase(), s.level])); return found.map((s) => ({ name: s.name, level: prev.get(s.name.toLowerCase()) ?? 'unspecified' })); });
      setYears(r.experienceYears === null ? '' : String(r.experienceYears));
      setWarnings(r.warnings ?? []);
      setDoneName(file.name); setFile(null); if (fileInput.current) fileInput.current.value = '';
    } catch (e) {
      if (g !== gen.current) return;
      setExtractErr(errMsg(e, 'The CV could not be read.'));
    } finally { if (g === gen.current) { setExtracting(false); abortRef.current = null; } }
  };

  const confirm = async () => {
    if (!skills.length || matching || extracting) return;
    const yrs = years.trim() === '' ? null : normalizeYears(Number(years));
    if (years.trim() !== '' && yrs === null) { setMatchErr('Experience must be a number from 0 to 80, or left unknown.'); return; }
    const profile = { skills, experienceYears: yrs };
    const ok = saveCvProfile(profile); setSaved(ok); setStorageNote(ok ? '' : 'Browser storage is unavailable, so this profile will not persist after refresh.');
    const g = ++gen.current; setMatching(true); setMatchErr(''); setResult(null);
    try {
      const r = await matchRef.current({ data: profile });
      if (g !== gen.current) return;
      const canon = { skills: normalizeSkills(r.profile.skills, dictRef.current), experienceYears: normalizeYears(r.profile.experienceYears) };
      if (canon.skills.length) { const ok2 = saveCvProfile(canon); setSaved(ok2); setSkills(canon.skills); setYears(canon.experienceYears === null ? '' : String(canon.experienceYears)); }
      setResult(r);
    } catch (e) {
      if (g !== gen.current) return;
      setMatchErr(errMsg(e, 'The job service could not be reached.'));
    } finally { if (g === gen.current) setMatching(false); }
  };
  const clearAll = () => {
    const ok = clearCvProfile(); resetFile(); setSkills([]); setYears(''); setSaved(false); setInfo('');
    setStorageNote(ok ? '' : 'Browser storage is unavailable; nothing could be cleared there.');
  };

  const busy = extracting || matching;
  const st = result?.status;
  return (
    <div data-testid="panel-cv-workspace">
      <div className="notice" data-testid="status-cv-privacy">
        CV files are sent to Futurique to extract skills and are processed transiently; the file and its text are not stored in your browser. Only the skills, self-reported levels and experience you confirm are saved in this browser for the demo email you entered. Demo access is not a real account or secure email authentication, so anyone using this browser profile can see saved data. Other dashboard data stays illustrative.
      </div>

      <section className="panel" style={{ marginTop: 14 }} data-testid="section-cv-upload">
        <div className="panel-head"><div><h2>1. Upload a CV (optional)</h2><p className="panel-sub">PDF or DOCX up to 8 MB. Text-based files only; scanned images are not read. A new extraction replaces the skill list and experience below (levels are kept only for skills that appear again). You can skip this and enter skills manually.</p></div><FileText size={17} color="#16839c" /></div>
        <div className="form-field"><label htmlFor="cv-file">CV file</label>
          <input id="cv-file" ref={fileInput} className="control" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={extracting} onChange={(e) => pick(e.target.files?.[0])} data-testid="input-cv-file" />
        </div>
        {fileErr && <div className="notice warning" role="alert" data-testid="status-cv-file-error">{fileErr} You can still enter skills manually below.</div>}
        {file && <div className="list-row" style={{ gap: 8, flexWrap: 'wrap' }} data-testid="status-cv-selected">
          <div className="list-main"><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(0)} KB · {extracting ? 'Extracting skills' : 'Ready to extract'}</span></div>
          <button type="button" className="small-btn primary" disabled={extracting} onClick={() => void runExtract()} data-testid="button-cv-extract"><Upload size={12} /> {extracting ? 'Extracting' : 'Extract skills'}</button>
          <button type="button" className="small-btn" onClick={resetFile} data-testid="button-cv-remove-file"><X size={12} /> Remove file</button>
          <button type="button" className="small-btn" onClick={() => fileInput.current?.click()} disabled={extracting} data-testid="button-cv-replace-file">Replace file</button>
        </div>}
        {doneName && !file && <div className="list-row" data-testid="status-cv-done"><div className="list-main"><strong>{doneName}</strong><span>Extracted; the file itself is no longer held.</span></div><button type="button" className="small-btn" onClick={resetFile} data-testid="button-cv-dismiss-file">Dismiss</button></div>}
        {extracting && <div className="notice" aria-busy="true" data-testid="status-cv-extracting"><LoadingIndicator label="Reading your CV. Nothing is matched yet." /></div>}
        {extractErr && <div className="notice warning" role="alert" data-testid="status-cv-extract-error">{extractErr} Enter your profile manually below instead.</div>}
        {warnings.length > 0 && <div className="notice" data-testid="status-cv-warnings">{warnings.map((w, i) => <div key={i}>{w}</div>)}</div>}
        {doneName && !extracting && !extractErr && skills.length > 0 && <p className="panel-sub" data-testid="status-cv-review">Review the extracted skills and experience below. Extracted skills start as Not specified; nothing is matched until you confirm.</p>}
      </section>

      <section className="panel" style={{ marginTop: 14 }} data-testid="section-cv-skills">
        <div className="panel-head"><div><h2>2. Skills and experience</h2><p className="panel-sub">Levels are self-reported, unverified, and not used in the score. Add, edit or remove anything before confirming.</p></div></div>
        {dictQ.isFetching && <LoadingIndicator compact label={dictQ.data ? 'Refreshing the skill dictionary…' : 'Loading the skill dictionary…'} />}
        {dictQ.isError && <div className="notice warning" role="alert" data-testid="status-cv-dict-error">The skill dictionary could not be loaded. Names are kept as typed and will not be normalised. <button type="button" className="small-btn" onClick={() => void dictQ.refetch()}>Retry</button></div>}
        {skills.length === 0
          ? <div className="empty-state" data-testid="empty-cv-skills">No skills yet. Extract them from a CV or add your first skill below.</div>
          : <div className="mini-list" data-testid="list-cv-skills">{skills.map((s, i) => <SkillRow key={`${s.name}-${s.level}`} skill={s} index={i} disabled={busy} onChange={(n, l) => changeSkill(i, n, l)} onRemove={() => editSkills(skills.filter((_, k) => k !== i))} />)}</div>}
        <form onSubmit={(e) => { e.preventDefault(); addSkill(); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12 }} data-testid="form-cv-add-skill">
          <div className="form-field" style={{ flex: '1 1 180px' }}><label htmlFor="cv-new-skill">Skill name</label><input id="cv-new-skill" className="control" value={newName} maxLength={80} onChange={(e) => { setNewName(e.target.value); setAddErr(''); }} placeholder="e.g. JS or Python" data-testid="input-cv-new-skill" /></div>
          <div className="form-field"><label htmlFor="cv-new-level">Self-reported level</label><select id="cv-new-level" className="control" value={newLevel} onChange={(e) => setNewLevel(e.target.value as Level)} data-testid="select-cv-new-level">{LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}</select></div>
          <button type="submit" className="small-btn primary" style={{ marginBottom: 8 }} data-testid="button-cv-add-skill"><Plus size={12} /> Add skill</button>
        </form>
        {addErr && <div className="notice warning" role="alert" data-testid="status-cv-add-error">{addErr}</div>}
        {info && <div className="notice" role="status" data-testid="status-cv-custom-skill">{info}</div>}
        <p className="panel-sub">Custom skills are allowed, but only skills in the dictionary can be recognised in job requirements; others cannot raise your overlap score.</p>
        <div className="form-field" style={{ maxWidth: 280 }}><label htmlFor="cv-years">Years of experience</label>
          <input id="cv-years" className="control" type="number" min={0} max={80} step={0.5} value={years} placeholder="Unknown" onChange={(e) => { invalidate(); setYears(e.target.value); }} data-testid="input-cv-years" />
          <button type="button" className="link-button" onClick={() => { invalidate(); setYears(''); }} data-testid="button-cv-years-unknown">Leave unknown</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" className="small-btn primary" disabled={!skills.length || busy} onClick={() => void confirm()} data-testid="button-cv-confirm">{matching ? 'Matching cached listings' : 'Confirm profile and find matches'}</button>
          <button type="button" className="small-btn danger" onClick={clearAll} data-testid="button-cv-clear-profile"><Trash2 size={12} /> Clear saved profile</button>
        </div>
        {saved && <p className="panel-sub" data-testid="status-cv-saved">Confirmed profile saved in this browser for {email}.</p>}
        {storageNote && <div className="notice warning" role="status" data-testid="status-cv-storage">{storageNote}</div>}
      </section>

      <section className="panel" style={{ marginTop: 14 }} data-testid="section-cv-results">
        <div className="panel-head"><div><h2>3. Current opportunities</h2><p className="panel-sub">Compared only with listings already cached. Matching never refreshes or fetches jobs.</p></div></div>
        <div className="notice" data-testid="text-cv-method">
          Score = matching required skills / total known required skills x 100. It measures skill overlap only, not hiring probability. Required skills are read from cached descriptions using the dictionary, so recognition may be incomplete. Your levels are unverified and not weighted. Jobs stating more than 2 years above your confirmed experience are set aside as above current experience; 2 years or less below is shown with a warning. Unknown experience is labelled Unknown.
        </div>
        {matching && <div aria-busy="true" data-testid="status-cv-matching"><LoadingIndicator label="Matching your profile to cached listings…" /><div className="opportunity-row">{[0, 1, 2].map((i) => <div key={i} className="opportunity" style={{ minHeight: 120, opacity: 0.5 }} />)}</div></div>}
        {matchErr && <div className="notice warning labour-error" role="alert" data-testid="status-cv-match-error"><span>{matchErr} Your confirmed profile is still saved.</span><button type="button" className="small-btn primary" onClick={() => void confirm()}>Retry</button></div>}
        {!result && !matching && !matchErr && <div className="empty-state" data-testid="empty-cv-results">{skills.length ? 'Confirm your profile above to see matches. Nothing is sent until you do.' : 'Add skills to begin.'}</div>}
        {result && st && (
          <>
            <p className="panel-sub" data-testid="status-cv-cache">Cache status (read-only): {st.state}{st.refreshing ? ', collection in progress elsewhere' : ''}{st.stale ? ', some listings may be out of date' : ''} · {st.totalJobs} cached listings · last collected {fmt(st.fetchedAt) ?? 'unknown'} · {st.coverage}</p>
            <p className="panel-sub" data-testid="text-cv-totals">{result.totalRanked} ranked · {result.totalUnscored} with unknown requirements · {result.totalExcluded} above your current experience. Method: {result.method}</p>
            {result.matches.length === 0
              ? <div className="empty-state" data-testid="empty-cv-matches">No cached listing can be ranked for this profile right now. That is a truthful result; none are substituted.</div>
              : <div className="mini-list" data-testid="list-cv-matches">{result.matches.slice(0, 10).map((m, i) => <MatchCard key={m.job.id} m={m} i={i} prefix="cv-match" />)}</div>}
            {result.totalUnscored > 0 && <Fold title="Unknown requirements (unscored)" count={result.unscored.length} total={result.totalUnscored} testId="fold-cv-unscored">{result.unscored.map((m, i) => <MatchCard key={m.job.id} m={m} i={i} prefix="cv-unscored" />)}</Fold>}
            {result.totalExcluded > 0 && <Fold title="Above current experience" count={result.excluded.length} total={result.totalExcluded} testId="fold-cv-excluded">{result.excluded.map((m, i) => <MatchCard key={m.job.id} m={m} i={i} prefix="cv-excluded" />)}</Fold>}
          </>
        )}
      </section>
    </div>
  );
}
