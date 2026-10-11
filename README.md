# PipelinePulse AI — Data Observability Dashboard

A lightweight, single-page web application that helps data engineers monitor ETL pipeline health, spot failures, and understand operational performance.

## Business problem

Data teams run many ETL pipelines across multiple source systems. When a pipeline fails or slows down, engineers need a fast way to answer: How healthy are our pipelines overall? Which pipeline fails the most? Which one is getting slower? PipelinePulse AI answers these questions at a glance with KPIs, trend charts, and rule-based operational insights — no backend required.

## Synthetic dataset

The app generates exactly **500 realistic pipeline execution records** in the browser using a seeded pseudo-random generator (fixed seed `20261011`), so the data is identical on every load. Records span the last 60 days across **10 ETL pipelines** reading from **Snowflake, Salesforce, and Talend**.

Each record contains:

| Field | Description |
| --- | --- |
| `run_id` | Unique run identifier (e.g. `RUN-100042`) |
| `pipeline_name` | One of 10 pipeline names |
| `source_system` | Snowflake, Salesforce, or Talend |
| `execution_date` | Run date (YYYY-MM-DD) |
| `status` | `success`, `failed`, or `slow` |
| `duration_minutes` | Run duration; failures are short, slow runs are long |
| `records_processed` | Rows processed; failures process very few rows |

The mix is roughly 82% successful, 11% failed, and 7% unusually slow runs, with internally consistent dates and values.

## Application features

- **KPI cards** — Total Runs, Success Rate, Failed Runs, Average Runtime
- **Daily execution trend** — line chart of success/failed/slow runs per day
- **Failures by pipeline** — horizontal bar chart ranked by failure count
- **Filters** — source system and pipeline dropdowns; every KPI, chart, table, and insight recalculates from the filtered records
- **Pipeline Insights** — a "Generate Insights" button produces deterministic, rule-based operational insights (clearly labeled, not LLM-generated) with severity-coded cards and practical recommendations
- **Execution history** — table of the 20 most recent runs
- **CSV export** — download the currently filtered records
- **Empty states** — graceful messages when filters match no data
- **Responsive dark-mode design** — works from mobile to desktop

## Technology stack

- React 19 + TypeScript
- TanStack Start (file-based routing, single route)
- Tailwind CSS v4 (semantic design tokens, dark theme)
- Recharts for charts
- lucide-react for icons
- No backend, database, authentication, or external APIs — everything runs in the browser

## How data-driven insights are calculated

Insights are pure, deterministic TypeScript functions over the filtered records (`buildInsights` in `src/routes/index.tsx`):

1. **Overall health** — success rate = (non-failed runs / total runs). ≥95% is "Excellent", ≥85% is "Needs attention", below that is "At risk".
2. **Highest failure count** — failures are grouped by pipeline and the maximum is reported with its exact count.
3. **Longest average runtime** — average `duration_minutes` over non-failed runs per pipeline; the maximum is reported.
4. **Recommendations** — natural-language templates are filled with the findings above (e.g. "Review recent error logs for \<pipeline\>").

Because insights derive from the same filtered array as the KPIs and charts, they always stay consistent with what is on screen.

## How to run the project

```bash
bun install   # or npm install
bun dev       # or npm run dev
```

Then open the local URL printed in the terminal (default `http://localhost:8080`). No environment variables or services are needed.

## Project limitations

- Data is synthetic and regenerated in memory on each page load; nothing is persisted.
- The seeded dataset is static — there is no way to upload real pipeline metadata.
- Insights are rule-based templates, not machine learning; they describe the data but do not predict future failures.
- The execution history table shows only the 20 most recent runs (the full filtered set is available via CSV export).
- Single-page app by design; there is no per-pipeline drill-down view.
