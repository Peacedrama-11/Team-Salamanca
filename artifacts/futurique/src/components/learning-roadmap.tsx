import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { ArrowUpRight, BookOpen, Check, Play, Square, X } from 'lucide-react';
import {
  addLearningPath, learningPaths, questions, rankLearningPaths, toggleLearningPath,
  type Answers, type LearningSelection,
} from '../lib/learning-paths';
import './learning-roadmap.css';

type Props = { selections: LearningSelection[]; setSelections: Dispatch<SetStateAction<LearningSelection[]>> };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' }) : 'Not stopped yet');

export function LearningRoadmap({ selections, setSelections }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('skills');
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  const added = useMemo(() => new Set(selections.map(s => s.pathId)), [selections]);
  const complete = answers.every(a => a !== null);
  const ranked = useMemo(() => (complete && showResults ? rankLearningPaths(answers as Answers).slice(0, 3) : []), [answers, complete, showResults]);

  const reset = () => { setPicked(null); setAnswers([null, null, null]); setStep(0); setShowResults(false); setTab('skills'); };
  const onOpenChange = (v: boolean) => { setOpen(v); if (!v) reset(); };
  const confirm = () => {
    if (!picked) return;
    setSelections(cur => addLearningPath(cur, picked));
    onOpenChange(false);
  };
  const answer = (q: number, o: number) => {
    setAnswers(cur => cur.map((a, i) => (i === q ? o : a)));
    setShowResults(false); setPicked(null);
  };
  const byId = (id: string) => learningPaths.find(p => p.id === id);

  return (
    <div className="panel lr" data-testid="page-learning-roadmap">
      <div className="panel-head">
        <div><h2>Your learning paths</h2><p className="panel-sub">Paths you choose to explore. Starting or stopping is only a session note, not progress or completion.</p></div>
        <button ref={opener} type="button" className="btn btn-primary" onClick={() => setOpen(true)} data-testid="button-start-learning"><Play size={14} /> Start learning</button>
      </div>

      {selections.length === 0 ? (
        <div className="empty-state" data-testid="empty-learning-paths"><BookOpen size={20} className="lr-empty-icon" /><p>No learning paths yet. Choose one to begin.</p></div>
      ) : (
        <ul className="lr-list" data-testid="list-learning-paths">
          {selections.map(sel => {
            const p = byId(sel.pathId); if (!p) return null;
            return (
              <li key={sel.pathId} className={`lr-item ${sel.active ? 'is-active' : ''}`} data-testid={`item-learning-${sel.pathId}`}>
                <div className="lr-item-main">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="lr-title" data-testid={`link-learning-${sel.pathId}`}>{p.name}<ArrowUpRight size={13} /></a>
                  <p>{p.description}</p>
                  <dl className="lr-times">
                    <div><dt>Added</dt><dd>{fmt(sel.addedAt)}</dd></div>
                    <div><dt>Last started</dt><dd>{fmt(sel.startedAt)}</dd></div>
                    <div><dt>Last stopped</dt><dd>{fmt(sel.stoppedAt)}</dd></div>
                  </dl>
                </div>
                <div className="lr-item-side">
                  <span className={`pill ${sel.active ? '' : 'dark'}`} data-testid={`status-learning-${sel.pathId}`}>{sel.active ? 'Learning' : 'Stopped'}</span>
                  <button type="button" className="small-btn" onClick={() => setSelections(cur => toggleLearningPath(cur, sel.pathId))} data-testid={`button-toggle-learning-${sel.pathId}`}>
                    {sel.active ? <><Square size={11} /> Stop learning</> : <><Play size={11} /> Start learning</>}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="lr-overlay" />
           <Dialog.Content className="lr-modal" data-testid="modal-start-learning" aria-describedby={undefined} onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
            <div className="lr-modal-head">
              <Dialog.Title>Start learning</Dialog.Title>
              <Dialog.Close className="icon-btn" aria-label="Close" data-testid="button-close-learning"><X size={16} /></Dialog.Close>
            </div>
            <Tabs.Root value={tab} onValueChange={v => { setTab(v); setPicked(null); }} className="lr-tabs">
              <Tabs.List className="lr-tablist" aria-label="Choose how to start">
                <Tabs.Trigger value="skills" className="lr-tab" data-testid="tab-skills">Skills</Tabs.Trigger>
                <Tabs.Trigger value="decide" className="lr-tab" data-testid="tab-decide">Help me Decide</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="skills" className="lr-pane">
                <div role="radiogroup" aria-label="Skills" className="lr-grid">
                  {learningPaths.map(p => (
                    <PathOption key={p.id} id={p.id} name={p.name} description={p.description} selected={picked === p.id} added={added.has(p.id)} onPick={() => setPicked(p.id)} />
                  ))}
                </div>
              </Tabs.Content>

              <Tabs.Content value="decide" className="lr-pane">
                {!showResults ? (
                  <div>
                    <p className="lr-step">Question {step + 1} of {questions.length}</p>
                    <div role="radiogroup" aria-label={questions[step].title} className="lr-q">
                      <h3>{questions[step].title}</h3>
                      {questions[step].options.map((o, i) => (
                        <label key={o} className={`lr-opt ${answers[step] === i ? 'is-selected' : ''}`}>
                          <input className="lr-radio" type="radio" name={`question-${step}`} value={i} checked={answers[step] === i} onChange={() => answer(step, i)} data-testid={`option-q${step + 1}-${i}`} />
                          <span className="lr-dot">{answers[step] === i && <Check size={11} />}</span>{o}
                        </label>
                      ))}
                    </div>
                    <div className="lr-nav">
                      <button type="button" className="small-btn" disabled={step === 0} onClick={() => setStep(step - 1)} data-testid="button-question-back">Back</button>
                      {step < questions.length - 1
                        ? <button type="button" className="small-btn primary" disabled={answers[step] === null} onClick={() => setStep(step + 1)} data-testid="button-question-next">Next</button>
                        : <button type="button" className="small-btn primary" disabled={!complete} onClick={() => { setShowResults(true); setPicked(null); }} data-testid="button-show-recommendations">See recommendations</button>}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="notice" data-testid="note-recommendation">Recommendations reflect your interests and preferences. They do not guarantee career suitability or job-market demand.</div>
                    <div role="radiogroup" aria-label="Recommendations" className="lr-grid lr-recs">
                      {ranked.map(({ path, reasons }, i) => (
                        <PathOption key={path.id} id={path.id} rank={i + 1} name={path.name} description={path.description} reasons={reasons} url={path.url} selected={picked === path.id} added={added.has(path.id)} onPick={() => setPicked(path.id)} />
                      ))}
                    </div>
                    <div className="lr-nav">
                      <button type="button" className="small-btn" onClick={() => { setShowResults(false); setPicked(null); }} data-testid="button-edit-answers">Edit answers</button>
                      <button type="button" className="small-btn" onClick={() => { setAnswers([null, null, null]); setStep(0); setShowResults(false); setPicked(null); }} data-testid="button-restart-questions">Restart</button>
                      <button type="button" className="small-btn" onClick={() => { setTab('skills'); setPicked(null); }} data-testid="button-choose-manually">Choose a skill manually</button>
                    </div>
                  </div>
                )}
              </Tabs.Content>
            </Tabs.Root>

            <div className="lr-footer">
              <span className="lr-footer-note">{picked ? `Selected: ${byId(picked)?.name}` : 'Select one path to continue.'}</span>
              <button type="button" className="btn btn-primary" disabled={!picked} onClick={confirm} data-testid="button-confirm-start-learning"><Play size={14} /> Start learning</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function PathOption({ id, name, description, selected, added, onPick, rank, reasons, url }: {
  id: string; name: string; description: string; selected: boolean; added: boolean; onPick: () => void; rank?: number; reasons?: string[]; url?: string;
}) {
  return (
    <div className={`lr-card ${selected ? 'is-selected' : ''}`}>
      <label className="lr-card-btn">
        <input className="lr-radio" type="radio" name={rank ? 'recommended-path' : 'catalog-path'} value={id} checked={selected} onChange={onPick} aria-label={name} data-testid={`option-path-${id}`} />
        <span className="lr-card-top"><strong>{rank ? `${rank}. ` : ''}{name}</strong>{added && <span className="pill dark">Already added</span>}{selected && <Check size={14} className="lr-check" />}</span>
        <span className="lr-card-desc">{description}</span>
        {reasons && reasons.length > 0 && <span className="lr-reasons">{reasons.join(' ')}</span>}
      </label>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="lr-ext" data-testid={`link-recommendation-${id}`}>View roadmap <ArrowUpRight size={12} /></a>}
    </div>
  );
}
