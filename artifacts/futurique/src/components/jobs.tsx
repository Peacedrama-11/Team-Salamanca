import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  matchJobs, refreshJobs, searchJobs,
  type JobMatchInput, type JobPosting, type JobSearchInput, type JobsStatus,
} from '@workspace/api-client-react';
import { ArrowRight, BriefcaseBusiness, Compass, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { getSessionEmail } from '../lib/session-email';
import { LoadingIndicator } from './loading-indicator';

const POLL_MS = 4000;
const MAX_POLLS = 30;

function pollingFor(status: JobsStatus | undefined, updates: number) {
  if (!status) return false;
  return (status.refreshing || status.state === 'pending') && updates < MAX_POLLS ? POLL_MS : 60_000;
}
function fmt(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}
function errText(e: unknown) {
  return e instanceof Error && e.message ? e.message : 'The job service could not be reached.';
}

// The email is never part of a query key; it is read at request time.
export function useJobSearch(filters: Omit<JobSearchInput, 'email'>, enabled = true) {
  return useQuery({
    queryKey: ['jobs', 'search', filters] as const,
    enabled,
    queryFn: ({ signal }) => searchJobs({ ...filters, email: getSessionEmail() }, { signal }),
    refetchInterval: (q) => pollingFor(q.state.data?.status, q.state.dataUpdateCount),
    staleTime: 30_000,
  });
}
export function useJobMatches(input: Omit<JobMatchInput, 'email'>, enabled: boolean) {
  return useQuery({
    queryKey: ['jobs', 'matches', input] as const,
    enabled,
    queryFn: ({ signal }) => matchJobs({ ...input, email: getSessionEmail() }, { signal }),
    refetchInterval: (q) => pollingFor(q.state.data?.status, q.state.dataUpdateCount),
    staleTime: 30_000,
  });
}

export function JobsStatusNotice({ status }: { status: JobsStatus }) {
  const qc = useQueryClient();
  const refresh = useMutation({
    mutationFn: () => refreshJobs({ email: getSessionEmail() }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['jobs'] }); },
  });
  const failed = status.boards.filter((b) => b.state === 'failed');
  const when = fmt(status.fetchedAt);
  const cacheWarn = status.state === 'partial' || status.stale || failed.length > 0;
  return (
    <div data-testid="status-jobs">
      {status.state === 'pending' || status.refreshing ? (
        <div className="notice" data-testid="status-jobs-collecting">
          <LoadingIndicator label="Collecting listings from public job boards." />
          This page checks again every few seconds.
        </div>
      ) : null}
      {status.state === 'unavailable' && (
        <div className="notice warning" role="alert" data-testid="status-jobs-unavailable">
          Job boards are currently unavailable. No listings are shown and none are substituted.
          {status.retryAfterSeconds > 0 ? ` Try again in about ${status.retryAfterSeconds} seconds.` : ''}
        </div>
      )}
      {cacheWarn && status.state !== 'unavailable' && (
        <div className="notice warning" role="status" data-testid="status-jobs-cache-warning">
          Showing cached listings{when ? ` last collected ${when}` : ''}.
          {failed.length > 0 ? ` ${failed.length} board${failed.length === 1 ? '' : 's'} could not be refreshed (${failed.map((b) => `${b.provider}/${b.company}`).join(', ')}).` : ''}
          {status.stale ? ' Some listings may be out of date.' : ''}
        </div>
      )}
      <div className="dashboard-demo-status">
        <span className={`data-status ${status.state === 'ready' ? 'live' : status.state === 'unavailable' ? 'unavailable' : 'loading'}`}>
          {status.state === 'ready' ? 'LIVE LISTINGS' : status.state === 'partial' ? 'PARTIAL COVERAGE' : status.state === 'pending' ? 'COLLECTING' : 'UNAVAILABLE'}
        </span>
        <span>{status.coverage}</span>
        <button className="small-btn" disabled={refresh.isPending || status.refreshing || status.retryAfterSeconds > 0} onClick={() => refresh.mutate()} data-testid="button-refresh-jobs">
          <RefreshCw size={11} className={refresh.isPending ? 'animate-spin' : undefined} /> {refresh.isPending ? 'Requesting refresh…' : 'Refresh listings'}
        </button>
        {!status.refreshing && status.retryAfterSeconds > 0 && <span>Refresh available in about {status.retryAfterSeconds} seconds.</span>}
        {refresh.isError && <span role="alert">Refresh failed: {errText(refresh.error)}</span>}
      </div>
    </div>
  );
}

export function JobCard({ job, index, prefix = 'job' }: { job: JobPosting; index: number; prefix?: string }) {
  const meta = [job.location, job.employmentType, job.workplaceType, job.isRemote ? 'Remote' : null].filter(Boolean).join(' · ');
  const dept = job.team || job.department;
  const posted = fmt(job.postedAt);
  const fetched = fmt(job.fetchedAt);
  return (
    <article className="opportunity" data-testid={`card-${prefix}-${index}`} style={{ minHeight: 0 }}>
      <div className="opportunity-top" style={{ marginBottom: 16 }}>
        <div className="mini-logo">{job.company.slice(0, 1).toUpperCase()}</div>
        <span className="tag">{job.provider}</span>
      </div>
      <h3>{job.title}</h3>
      <p>{job.company}{dept ? ` · ${dept}` : ''}</p>
      <p style={{ marginTop: 6 }}>{meta || 'Location not stated'}</p>
      <div className="opportunity-foot" style={{ display: 'grid', gap: 4 }}>
        <span>{posted ? `Source posting/update date ${posted}` : 'Posting date not provided'}</span>
        <span>Source: {job.provider} board · fetched {fetched ?? 'time unknown'}</span>
        <a href={job.url} target="_blank" rel="noreferrer" style={{ color: '#176e83', fontWeight: 700 }} data-testid={`link-${prefix}-${index}`}>
          View original listing <ExternalLink size={10} style={{ display: 'inline' }} />
        </a>
      </div>
    </article>
  );
}

function ErrorBox({ error, onRetry, testId, loading = false }: { error: unknown; onRetry: () => void; testId: string; loading?: boolean }) {
  return (
    <div className="notice warning labour-error" role="alert" data-testid={testId}>
      <span>{errText(error)} No placeholder listings have been substituted.</span>
      <button className="small-btn primary" onClick={onRetry} disabled={loading}><RefreshCw size={13} className={loading ? 'animate-spin' : undefined} /> {loading ? 'Retrying…' : 'Retry'}</button>
    </div>
  );
}
function Skeleton({ n }: { n: number }) {
  return <div aria-busy="true"><LoadingIndicator label="Loading listings…" /><div className="opportunity-row">{Array.from({ length: n }, (_, i) => <div key={i} className="opportunity" style={{ minHeight: 150, opacity: 0.5 }} />)}</div></div>;
}

export function JobsPreview({ onOpen, openLabel = 'Explore listings' }: { onOpen?: () => void; openLabel?: string }) {
  const q = useJobSearch({ pageSize: 3 });
  return (
    <div data-testid="panel-jobs-preview">
      {q.isLoading ? <Skeleton n={3} /> : q.isError ? <ErrorBox error={q.error} onRetry={() => void q.refetch()} testId="status-jobs-error" loading={q.isFetching} /> : q.data && (
        <>
          {q.isFetching && <LoadingIndicator compact label="Updating listings…" />}
          <JobsStatusNotice status={q.data.status} />
          {q.data.jobs.length ? (
            <div className="opportunity-row">{q.data.jobs.map((j, i) => <JobCard key={j.id} job={j} index={i} prefix="preview" />)}</div>
          ) : (
            <div className="empty-state" data-testid="empty-jobs-preview">
              {q.data.status.state === 'pending' || q.data.status.refreshing ? 'Listings are still being collected.' : 'No listings are available right now.'}
            </div>
          )}
        </>
      )}
      {onOpen && <div style={{ marginTop: 16 }}><button className="small-btn primary" onClick={onOpen} data-testid="button-open-jobs">{openLabel} <ArrowRight size={12} /></button></div>}
    </div>
  );
}

export function JobTotalStat() {
  const q = useJobSearch({ pageSize: 1 });
  if (!q.data && q.isFetching) return <LoadingIndicator compact label="Loading job totals…" />;
  return <>{q.data ? new Intl.NumberFormat().format(q.data.total) : '—'}{q.isFetching && <LoadingIndicator compact label="Refreshing job totals…" />}</>;
}

const REGIONS = [['all', 'All regions'], ['apac', 'Asia Pacific'], ['anz', 'Australia & NZ'], ['remote', 'Remote']] as const;

export function CareerExplorerLive() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [region, setRegion] = useState<'all' | 'apac' | 'anz' | 'remote'>('all');
  const [remote, setRemote] = useState(false);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const filters: Omit<JobSearchInput, 'email'> = {
    page, pageSize, region,
    ...(query.trim() ? { query: query.trim() } : {}),
    ...(location.trim() ? { location: location.trim() } : {}),
    ...(remote ? { remote: true } : {}),
    ...(type ? { employmentType: type } : {}),
  };
  const q = useJobSearch(filters);
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;
  return (
    <div className="panel" data-testid="panel-career-explorer">
      <div className="panel-head"><div><h2>Real openings from public job boards</h2><p className="panel-sub">Listings come from Ashby, Greenhouse and Lever boards. Each card shows when it was fetched.</p></div><Compass size={18} color="#16839c" /></div>
      <div className="toolbar">
        <div className="search-wrap"><Compass size={14} /><input className="control" placeholder="Search job titles" value={query} onChange={(e) => reset(setQuery)(e.target.value)} maxLength={150} data-testid="input-job-query" /></div>
        <input className="control" placeholder="Location" value={location} onChange={(e) => reset(setLocation)(e.target.value)} maxLength={100} data-testid="input-job-location" />
        <select className="control" value={region} onChange={(e) => reset(setRegion)(e.target.value as typeof region)} aria-label="Region" data-testid="filter-region">{REGIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select className="control" value={type} onChange={(e) => reset(setType)(e.target.value)} aria-label="Employment type" data-testid="filter-employment-type"><option value="">Any type</option>{(q.data?.employmentTypes ?? []).map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><input type="checkbox" checked={remote} onChange={(e) => reset(setRemote)(e.target.checked)} data-testid="check-remote" /> Remote only</label>
      </div>
      {q.isLoading ? <Skeleton n={6} /> : q.isError ? <ErrorBox error={q.error} onRetry={() => void q.refetch()} testId="status-jobs-error" loading={q.isFetching} /> : q.data && (
        <>
          {q.isFetching && <LoadingIndicator compact label="Updating listings…" />}
          <JobsStatusNotice status={q.data.status} />
          {q.data.jobs.length ? (
            <>
              <p className="panel-sub" style={{ marginBottom: 10 }} data-testid="text-job-total">{new Intl.NumberFormat().format(q.data.total)} listings · page {q.data.page} of {pages}</p>
              <div className="opportunity-row" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))' }}>{q.data.jobs.map((j, i) => <JobCard key={j.id} job={j} index={i} />)}</div>
              <Pager page={q.data.page} pages={pages} onPage={setPage} busy={q.isFetching} />
            </>
          ) : (
            <div className="empty-state" data-testid="empty-jobs">
              {q.data.status.state === 'pending' || q.data.status.refreshing ? 'Listings are still being collected. Results will appear here shortly.' : 'No listings match these filters. Try widening your search.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Pager({ page, pages, onPage, busy }: { page: number; pages: number; onPage: (p: number) => void; busy: boolean }) {
  if (pages <= 1) return null;
  return (
    <div className="modal-actions" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <button className="small-btn" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)} data-testid="button-page-prev">Previous</button>
      <span className="panel-sub">Page {page} of {pages}</span>
      <button className="small-btn" disabled={page >= pages || busy} onClick={() => onPage(page + 1)} data-testid="button-page-next">Next</button>
    </div>
  );
}

export function GraduateMatches({ skills, field, goal, location }: { skills: string; field: string; goal: string; location: string }) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [skills, field, goal, location]);
  const list = skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 40);
  const input = { skills: list, ...(field.trim() ? { field: field.trim() } : {}), ...(goal.trim() ? { goal: goal.trim() } : {}), ...(location.trim() ? { location: location.trim() } : {}), page, pageSize: 8 };
  const q = useJobMatches(input, list.length > 0);
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;
  return (
    <div className="panel" style={{ marginTop: 14 }} data-testid="panel-job-matches">
      <div className="panel-head"><div><h2>Listings related to your profile</h2><p className="panel-sub">Ranked using your entered skills, field, goal and location against listing titles and metadata only. Descriptions are not read, so this does not show what a role requires.</p></div><Sparkles size={17} color="#16839c" /></div>
      {list.length === 0 ? <div className="empty-state" data-testid="empty-match-skills">Add at least one skill in Profile & preferences to rank listings.</div>
        : q.isLoading ? <Skeleton n={3} />
        : q.isError ? <ErrorBox error={q.error} onRetry={() => void q.refetch()} testId="status-matches-error" loading={q.isFetching} />
        : q.data && (
          <>
            {q.isFetching && <LoadingIndicator compact label="Updating matched listings…" />}
            <JobsStatusNotice status={q.data.status} />
            {q.data.matches.length === 0 ? (
              <div className="empty-state" data-testid="empty-matches">
                {q.data.status.state === 'pending' || q.data.status.refreshing ? 'Listings are still being collected.' : 'None of the current listings matched your entered details. That is a valid result, not an error.'}
              </div>
            ) : (
              <>
                <p className="panel-sub" style={{ marginBottom: 6 }}>Method: {q.data.method}. Scores are relative metadata overlap, not a prediction of fit.</p>
                <div className="mini-list">{q.data.matches.map((m, i) => (
                  <div className="list-row" key={m.job.id} data-testid={`row-match-${i}`} style={{ alignItems: 'flex-start' }}>
                    <div className="list-main">
                      <strong>{m.job.title}</strong>
                      <span>{m.job.company} · {m.job.location ?? 'Location not stated'} · {m.job.provider}, fetched {fmt(m.job.fetchedAt) ?? 'time unknown'}</span>
                      {m.evidence.length > 0 && <span>Matched on: {m.evidence.join('; ')}</span>}
                      {m.unmatchedSkills.length > 0 && <span>Your entries not found in listing metadata: {m.unmatchedSkills.join(', ')}. This is not a list of the role's requirements.</span>}
                      {m.missingInformation.length > 0 && <span>Not available to compare: {m.missingInformation.join('; ')}</span>}
                      <a href={m.job.url} target="_blank" rel="noreferrer" style={{ color: '#176e83', fontWeight: 700, fontSize: 10, marginTop: 4 }}>View original listing</a>
                    </div>
                     <span className="pill">{Math.round(m.score)}/100 relevance</span>
                  </div>
                ))}</div>
                <Pager page={q.data.page} pages={pages} onPage={setPage} busy={q.isFetching} />
              </>
            )}
          </>
        )}
    </div>
  );
}

export function JobsIcon() { return <BriefcaseBusiness size={15} />; }
