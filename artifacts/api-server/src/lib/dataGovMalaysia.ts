import {
  GetMalaysiaLabourMarketResponse,
  type LabourMarketData,
  type LabourMarketObservation,
} from "@workspace/api-zod";

const DATASET_API_URL =
  "https://api.data.gov.my/data-catalogue/?id=lfs_month&sort=-date&limit=12";
const CATALOGUE_URL = "https://data.gov.my/data-catalogue/lfs_month";
const CACHE_TTL_MS = 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 15_000;

type ApiRecord = Record<string, unknown>;

let cached: { expiresAt: number; value: LabourMarketData } | undefined;
let inFlight: Promise<LabourMarketData> | undefined;

function numberField(record: ApiRecord, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${key} value in lfs_month response`);
  }
  return value;
}

function parseObservation(value: unknown): LabourMarketObservation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid observation in lfs_month response");
  }

  const row = value as ApiRecord;
  if (typeof row.date !== "string" || !/^\d{4}-\d{2}-01$/.test(row.date)) {
    throw new Error("Invalid date value in lfs_month response");
  }

  return {
    date: row.date,
    labourForce: numberField(row, "lf"),
    employed: numberField(row, "lf_employed"),
    unemployed: numberField(row, "lf_unemployed"),
    outsideLabourForce: numberField(row, "lf_outside"),
    participationRate: numberField(row, "p_rate"),
    employmentPopulationRatio: numberField(row, "ep_ratio"),
    unemploymentRate: numberField(row, "u_rate"),
  };
}

async function fetchLatestObservations(): Promise<LabourMarketData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(DATASET_API_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`data.gov.my returned HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("Unexpected response shape from the lfs_month dataset");
    }

    const observations = payload.map(parseObservation).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const latest = observations.at(-1);
    const data = GetMalaysiaLabourMarketResponse.parse({
      datasetId: "lfs_month",
      dataType: "official-labour-market-statistics",
      country: "Malaysia",
      sourceName: "Department of Statistics Malaysia (DOSM)",
      sourceUrl: DATASET_API_URL,
      catalogueUrl: CATALOGUE_URL,
      reportingPeriod: latest ? latest.date.slice(0, 7) : null,
      retrievedAt: new Date().toISOString(),
      units: "People counts in thousands; rates in percent.",
      observations,
    });

    cached = { expiresAt: Date.now() + CACHE_TTL_MS, value: data };
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getMalaysiaLabourMarketData(): Promise<LabourMarketData> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (inFlight) return inFlight;

  inFlight = fetchLatestObservations();
  try {
    return await inFlight;
  } finally {
    inFlight = undefined;
  }
}
