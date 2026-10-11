# Pipeline Pulse

Build a lightweight, beautiful, single-page web application called "PipelinePulse AI — Data Observability Dashboard".

Purpose: Help data engineers monitor ETL pipeline health, identify failures, and understand operational performance.

Technology:

- React, TypeScript, Tailwind CSS, and Recharts

- No Python, Streamlit, backend server, Supabase, database, authentication, or external APIs

- Everything should run in the browser

Data:

- Generate exactly 500 realistic synthetic pipeline execution records using a fixed seed

- Include run_id, pipeline_name, source_system, execution_date, status, duration_minutes, and records_processed

- Simulate 10 ETL pipelines across Snowflake, Salesforce, and Talend sources

- Include a mix of successful runs, failures, and unusually slow runs

- Ensure dates and numeric values are internally consistent

UI:

1. Dashboard title: PipelinePulse AI

2. Four KPI cards: Total Runs, Success Rate, Failed Runs, Average Runtime

3. Daily pipeline execution trend chart

4. Failures by pipeline bar chart

5. Source system and pipeline dropdown filters

6. Execution history table with the most recent 20 records

7. Simple responsive dark-mode design with professional styling

All KPIs and charts must calculate values from the currently filtered records. Use real data transformations, not hardcoded metrics.

Important: Keep the app extremely lightweight, responsive, and reliable. Do not add extra features or integrations. Ensure the preview runs successfully.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/01665417-dee8-4d4d-a267-ea5ed1ffb632).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
