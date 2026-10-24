import { useState } from 'react';
import { ArrowRight, Pencil, Zap } from 'lucide-react';
import {
  CRASH_DISCLAIMER, getCrashScenarios, taskOptions, workOptions,
  type CrashAnswers, type ScenarioResult, type TaskType, type WorkType,
} from '../lib/career-crash-test';
import './career-crash-test.css';

function Choice<T extends string>({ name, legend, options, value, onChange }: {
  name: string; legend: string; options: readonly { id: T; label: string }[]; value: T | null; onChange: (v: T) => void;
}) {
  return <fieldset className="crash-question" data-testid={`group-${name}`}>
    <legend>{legend}</legend>
    <div className="crash-options">{options.map(o =>
      <button key={o.id} type="button" className="crash-option" aria-pressed={value === o.id} onClick={() => onChange(o.id)} data-testid={`option-${name}-${o.id}`}>{o.label}</button>)}
    </div>
  </fieldset>;
}

// Keep type arguments outside JSX: preview metadata instrumentation rewrites
// component tags before Babel and cannot instrument generic JSX tags safely.
const WorkChoice = Choice<WorkType>;
const TaskChoice = Choice<TaskType>;

function Scenario({ s }: { s: ScenarioResult }) {
  return <article className={`crash-scenario ${s.id}`} data-testid={`card-scenario-${s.id}`}>
    <div className="eyebrow">{s.id === 'gradual' ? 'Scenario A' : 'Scenario B'}</div>
    <h3>{s.title}</h3>
    <p>{s.description}</p>
    <div className="crash-block"><h4>What might change?</h4><ul data-testid={`list-changes-${s.id}`}>{s.changes.map((c, i) => <li key={i}>{c}</li>)}</ul></div>
    <div className="crash-block"><h4>Skills to develop</h4><div className="crash-skills" data-testid={`list-skills-${s.id}`}>{s.skills.map((c, i) => <span key={i}>{c}</span>)}</div></div>
    <div className="crash-block"><h4>Recommended actions</h4><ul data-testid={`list-actions-${s.id}`}>{s.actions.map((c, i) => <li key={i}>{c}</li>)}</ul></div>
  </article>;
}

export function CareerCrashTest() {
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const [taskType, setTaskType] = useState<TaskType | null>(null);
  const [result, setResult] = useState<CrashAnswers | null>(null);
  const [editing, setEditing] = useState(true);
  const ready = workType !== null && taskType !== null;
  const scenarios = result ? getCrashScenarios(result) : null;
  const submit = () => {
    if (!workType || !taskType) return;
    setResult({ workType, taskType });
    setEditing(false);
  };
  const workLabel = workOptions.find(o => o.id === result?.workType)?.label;
  const taskLabel = taskOptions.find(o => o.id === result?.taskType)?.label;

  return <div className="crash-test" data-testid="page-career-crash-test">
    <section className="panel">
      <div className="panel-head"><div><div className="eyebrow">Two what-if scenarios</div><h2>Career Crash Test</h2><p className="panel-sub">Answer two questions to compare how your work might evolve under different AI adoption paces.</p></div><Zap size={18} color="#16839c" /></div>
      {editing ? <form onSubmit={e => { e.preventDefault(); submit(); }} data-testid="form-crash-test">
        <WorkChoice name="work" legend="What type of work do you do?" options={workOptions} value={workType} onChange={setWorkType} />
        <TaskChoice name="tasks" legend="What tasks take up most of your time?" options={taskOptions} value={taskType} onChange={setTaskType} />
        <div className="crash-actions">
          <button type="submit" className="btn btn-primary" disabled={!ready} data-testid="button-compare-scenarios">Compare scenarios <ArrowRight size={14} /></button>
          {!ready && <span className="crash-hint" data-testid="text-crash-hint">Choose one answer for each question.</span>}
        </div>
      </form> : <div className="crash-context" data-testid="text-crash-context">
        <span>Based on: <strong>{workLabel}</strong> · <strong>{taskLabel}</strong></span>
        <button type="button" className="small-btn" onClick={() => setEditing(true)} data-testid="button-edit-answers"><Pencil size={11} /> Edit answers</button>
      </div>}
      <div className="notice" style={{ marginTop: 18, marginBottom: 0 }} data-testid="text-crash-disclaimer">{CRASH_DISCLAIMER}</div>
    </section>
    {editing && result && <div className="notice" data-testid="status-crash-editing">The comparison below still uses {workLabel} · {taskLabel}. Select Compare scenarios to apply your edits.</div>}
    {scenarios && <section className="crash-compare" aria-label="Scenario comparison" data-testid="section-crash-results">
      {scenarios.map(s => <Scenario key={s.id} s={s} />)}
    </section>}
  </div>;
}
