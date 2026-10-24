import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useGetHeadcountLabsProviderStatus,
  useGetMalaysiaLabourMarket,
} from "@workspace/api-client-react";
import { Activity, BriefcaseBusiness, RefreshCw } from "lucide-react";
import type { Language } from "../localization";

const SOURCE_CATALOGUE_URL = "https://data.gov.my/data-catalogue/lfs_month";
const SOURCE_API_URL =
  "https://api.data.gov.my/data-catalogue/?id=lfs_month&sort=-date&limit=12";

function localeFor(language: Language) {
  return language === "zh" ? "zh-CN" : language === "ms" ? "ms-MY" : "en-MY";
}

function formatMonth(value: number | string, locale: string, options: Intl.DateTimeFormatOptions = { month: "short", year: "2-digit" }) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    new Date(typeof value === "number" ? value : `${value}-01T00:00:00Z`),
  );
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

export function LabourMarketPanel({ language }: { language: Language }) {
  const { data, isLoading, isError, refetch } = useGetMalaysiaLabourMarket();
  const locale = localeFor(language);
  const observations = data?.observations ?? [];
  const latest = observations.at(-1);
  const dataStatus =
    data && observations.length > 0
      ? isError ? "CACHED DATA" : "LIVE DATA"
      : isLoading ? "LOADING" : isError ? "DATA UNAVAILABLE" : "NO DATA";
  const dataStatusClass =
    dataStatus === "LIVE DATA" || dataStatus === "CACHED DATA"
      ? "live"
      : dataStatus === "DATA UNAVAILABLE"
        ? "unavailable"
        : "loading";
  const chartData = observations.map((observation) => ({
    timestamp: Date.parse(`${observation.date}T00:00:00Z`),
    unemploymentRate: observation.unemploymentRate,
  }));

  return (
    <section className="panel official-labour-panel" data-testid="panel-official-labour-data">
      <div className="panel-head labour-panel-head">
        <div>
          <div className="eyebrow">Official labour-market statistics</div>
          <h2>Monthly labour-market indicators</h2>
          <p className="panel-sub">
            {data?.reportingPeriod
              ? <><span>Latest period: </span>{formatMonth(data.reportingPeriod, locale, { month: "long", year: "numeric" })}</>
              : "Monthly official statistics for Malaysia"}
          </p>
        </div>
        <div className="labour-panel-status">
          <Activity size={17} color="#16839c" />
          <span className={`data-status ${dataStatusClass}`}>{dataStatus}</span>
        </div>
      </div>

      <p className="labour-disclaimer">
        Official labour-force statistics only — these are not job vacancies or future job forecasts.
      </p>

      {isLoading && !data ? (
        <div className="empty-state" role="status" data-testid="status-labour-loading">
          Loading official Malaysian labour-force data…
        </div>
      ) : isError && !data ? (
        <div className="notice warning labour-error" role="alert" data-testid="status-labour-error">
          <span>
            The official data source could not be reached. No sample figures have been substituted.
          </span>
          <button className="small-btn primary" onClick={() => void refetch()} data-testid="button-retry-labour">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : !data || observations.length === 0 ? (
        <div className="empty-state" role="status" data-testid="status-labour-empty">
          No observations are currently available from the official data source.
        </div>
      ) : (
        <>
          {isError && (
            <div className="notice warning" role="status">
              Could not refresh official data; showing the last cached observation.
            </div>
          )}
          {latest && (
            <div className="labour-metric-grid" data-testid="list-labour-indicators">
              <article className="labour-metric">
                <span>Unemployment rate</span>
                <strong>{formatNumber(latest.unemploymentRate, locale)}%</strong>
                <small>{data.reportingPeriod}</small>
              </article>
              <article className="labour-metric">
                <span>Employed people</span>
                <strong>{formatNumber(latest.employed, locale)}</strong>
                <small>thousand people</small>
              </article>
              <article className="labour-metric">
                <span>Labour force</span>
                <strong>{formatNumber(latest.labourForce, locale)}</strong>
                <small>thousand people</small>
              </article>
              <article className="labour-metric">
                <span>Participation rate</span>
                <strong>{formatNumber(latest.participationRate, locale)}%</strong>
                <small>{data.reportingPeriod}</small>
              </article>
            </div>
          )}

          <div className="labour-trend">
            <div className="labour-trend-heading">
              <h3>Unemployment rate · 12-month trend</h3>
              <span>Percent</span>
            </div>
            <div
              className="labour-chart"
              role="img"
              aria-label="Unemployment rate over the latest 12 monthly observations"
              data-testid="chart-unemployment-trend"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#e8edf2" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(value: number) => formatMonth(value, locale)}
                    tick={{ fill: "#6f7b8d", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "#dbe2e9" }}
                    minTickGap={22}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tickFormatter={(value: number) => `${value}%`}
                    tick={{ fill: "#6f7b8d", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={42}
                  />
                  <Tooltip
                    labelFormatter={(value) => formatMonth(Number(value), locale, { month: "long", year: "numeric" })}
                    formatter={(value) => [`${formatNumber(Number(value), locale)}%`, "Unemployment rate"]}
                    contentStyle={{ border: "1px solid #dbe2e9", borderRadius: 10, fontSize: 11 }}
                  />
                  <Line
                    type="linear"
                    dataKey="unemploymentRate"
                    stroke="#16839c"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: "#16839c", strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <footer className="labour-source">
        <span>
          <span>Source: </span>{data?.sourceName ?? "Department of Statistics Malaysia (DOSM)"}
        </span>
        <span>
          <span>Retrieved: </span>
          {data
            ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                new Date(data.retrievedAt),
              )
            : "—"}
        </span>
        <span>Counts in thousands of people; rates in percent.</span>
        <a href={data?.catalogueUrl ?? SOURCE_CATALOGUE_URL} target="_blank" rel="noreferrer">
          Official dataset
        </a>
        <a href={data?.sourceUrl ?? SOURCE_API_URL} target="_blank" rel="noreferrer">
          Open API records
        </a>
      </footer>
    </section>
  );
}

export function JobProviderSetup() {
  const { data, isLoading, isError, refetch } = useGetHeadcountLabsProviderStatus();

  return (
    <section className="panel job-provider-panel" data-testid="panel-jobs-provider">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Job listings integration</div>
          <h2>Headcount Labs · Malaysia</h2>
          <p className="panel-sub">
            Live job listings are separate from labour-force statistics and are not connected yet.
          </p>
        </div>
        <span className="data-status demo">DEMO DATA</span>
      </div>
      {isLoading ? (
        <p className="panel-sub" role="status">Checking job-listings provider…</p>
      ) : isError || !data ? (
        <div className="notice warning job-provider-notice" role="alert">
          <span>The job-listings integration status is unavailable.</span>
          <button className="small-btn primary" onClick={() => void refetch()} data-testid="button-retry-jobs-status">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : data.integrationStatus === "credentials_required" ? (
        <div className="notice job-provider-notice" data-testid="status-jobs-unconfigured">
          <BriefcaseBusiness size={15} />
          <span>
            Current career examples remain demo data, not current vacancies. Add HEADCOUNT_LABS_API_KEY through
            Replit Secrets, then validate the provider schema, terms and limits before connecting live listings.
            No authenticated job-listings request has been made.
          </span>
        </div>
      ) : (
        <div className="notice job-provider-notice" data-testid="status-jobs-provider-pending">
          <BriefcaseBusiness size={15} />
          <span>
            Credentials are present, but the provider API schema and live request have not been implemented or
            verified yet. Demo examples remain separate; no authenticated request has been made.
          </span>
        </div>
      )}
    </section>
  );
}
