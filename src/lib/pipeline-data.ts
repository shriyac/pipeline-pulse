// Seeded synthetic pipeline execution data — 500 records, deterministic.

export type PipelineStatus = "success" | "failed" | "slow";

export interface PipelineRun {
  run_id: string;
  pipeline_name: string;
  source_system: "Snowflake" | "Salesforce" | "Talend";
  execution_date: string; // YYYY-MM-DD
  status: PipelineStatus;
  duration_minutes: number;
  records_processed: number;
}

// Mulberry32 PRNG — fixed seed for reproducibility.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PIPELINES: { name: string; source: PipelineRun["source_system"] }[] = [
  { name: "orders_daily_load", source: "Snowflake" },
  { name: "customer_360_sync", source: "Snowflake" },
  { name: "inventory_refresh", source: "Snowflake" },
  { name: "finance_gl_export", source: "Snowflake" },
  { name: "leads_ingest", source: "Salesforce" },
  { name: "opportunities_sync", source: "Salesforce" },
  { name: "cases_hourly", source: "Salesforce" },
  { name: "marketing_campaigns", source: "Talend" },
  { name: "product_catalog_etl", source: "Talend" },
  { name: "clickstream_batch", source: "Talend" },
];

export const PIPELINE_NAMES = PIPELINES.map((p) => p.name);
export const SOURCE_SYSTEMS = ["Snowflake", "Salesforce", "Talend"] as const;

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function generateRuns(): PipelineRun[] {
  const rand = mulberry32(20261011);
  const runs: PipelineRun[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < 500; i++) {
    const pipeline = PIPELINES[Math.floor(rand() * PIPELINES.length)]!;
    // Spread over the last 60 days.
    const daysAgo = Math.floor(rand() * 60);
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - daysAgo);

    const roll = rand();
    const status: PipelineStatus =
      roll < 0.82 ? "success" : roll < 0.93 ? "failed" : "slow";

    // Base duration per pipeline varies; failures are short, slow runs are long.
    const base = 5 + rand() * 40;
    let duration: number;
    let records: number;
    if (status === "failed") {
      duration = Math.round((base * (0.1 + rand() * 0.3)) * 10) / 10;
      records = Math.floor(rand() * 500);
    } else if (status === "slow") {
      duration = Math.round((base * (2.5 + rand() * 2)) * 10) / 10;
      records = Math.floor(20_000 + rand() * 480_000);
    } else {
      duration = Math.round(base * 10) / 10;
      records = Math.floor(10_000 + rand() * 490_000);
    }

    runs.push({
      run_id: `RUN-${String(100000 + i)}`,
      pipeline_name: pipeline.name,
      source_system: pipeline.source,
      execution_date: toDateString(date),
      status,
      duration_minutes: duration,
      records_processed: records,
    });
  }

  // Newest first.
  return runs.sort((a, b) => b.execution_date.localeCompare(a.execution_date) || b.run_id.localeCompare(a.run_id));
}
