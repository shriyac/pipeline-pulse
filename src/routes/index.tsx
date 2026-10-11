import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Lightbulb,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { generateRuns, PIPELINE_NAMES, SOURCE_SYSTEMS, type PipelineRun, type PipelineStatus } from "@/lib/pipeline-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PipelinePulse AI — Data Observability Dashboard" },
      { name: "description", content: "Monitor ETL pipeline health, failures, and runtime performance." },
      { property: "og:title", content: "PipelinePulse AI — Data Observability Dashboard" },
      { property: "og:description", content: "Monitor ETL pipeline health, failures, and runtime performance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const ALL_RUNS = generateRuns();
const ALL = "All";

const C = {
  success: "var(--success)",
  failed: "var(--destructive)",
  slow: "var(--warning)",
  grid: "var(--border)",
  axis: "var(--muted-foreground)",
};

const statusClass: Record<PipelineStatus, string> = {
  success: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
  slow: "bg-warning/15 text-warning",
};

type Severity = "info" | "success" | "warning" | "critical";

interface Insight {
  severity: Severity;
  icon: "health" | "failure" | "clock" | "tip";
  title: string;
  body: string;
}

function buildInsights(runs: PipelineRun[]): Insight[] {
  if (runs.length === 0) return [];

  const failedRuns = runs.filter((r) => r.status === "failed");
  const successRate = ((runs.length - failedRuns.length) / runs.length) * 100;

  // Pipeline with the highest failure count.
  const failCount = new Map<string, number>();
  for (const r of failedRuns) failCount.set(r.pipeline_name, (failCount.get(r.pipeline_name) ?? 0) + 1);
  const topFailure = [...failCount.entries()].sort((a, b) => b[1] - a[1])[0];

  // Pipeline with the longest average successful execution time.
  const dur = new Map<string, { sum: number; n: number }>();
  for (const r of runs) {
    if (r.status === "failed") continue;
    const d = dur.get(r.pipeline_name) ?? { sum: 0, n: 0 };
    d.sum += r.duration_minutes;
    d.n++;
    dur.set(r.pipeline_name, d);
  }
  const slowest = [...dur.entries()]
    .map(([name, d]) => ({ name, avg: d.sum / d.n }))
    .sort((a, b) => b.avg - a.avg)[0];

  const health: Insight =
    successRate >= 95
      ? {
          severity: "success",
          icon: "health",
          title: "Overall pipeline health: Excellent",
          body: `The current selection has a ${successRate.toFixed(1)}% success rate across ${runs.length} runs. Pipelines are operating within a healthy range.`,
        }
      : successRate >= 85
        ? {
            severity: "warning",
            icon: "health",
            title: "Overall pipeline health: Needs attention",
            body: `The current selection has a ${successRate.toFixed(1)}% success rate across ${runs.length} runs. Failure levels are elevated and worth investigating.`,
          }
        : {
            severity: "critical",
            icon: "health",
            title: "Overall pipeline health: At risk",
            body: `The current selection has a ${successRate.toFixed(1)}% success rate across ${runs.length} runs. Failure levels are high and require immediate action.`,
          };

  const insights: Insight[] = [health];

  if (topFailure) {
    insights.push({
      severity: topFailure[1] >= 10 ? "critical" : "warning",
      icon: "failure",
      title: "Highest failure count",
      body: `${topFailure[0]} has the most failures with ${topFailure[1]} failed run${topFailure[1] === 1 ? "" : "s"} in the current selection.`,
    });
  }

  if (slowest) {
    insights.push({
      severity: slowest.avg >= 60 ? "warning" : "info",
      icon: "clock",
      title: "Longest average runtime",
      body: `${slowest.name} has the longest average successful execution time at ${slowest.avg.toFixed(1)} minutes per run.`,
    });
  }

  const recs: string[] = [];
  if (topFailure) recs.push(`Review recent error logs for ${topFailure[0]} and check for upstream schema or connectivity changes.`);
  if (slowest) recs.push(`Profile ${slowest.name} for slow transformations or unindexed joins; consider partitioning or incremental loads.`);
  if (successRate < 95) recs.push("Add alerting on failure spikes and retries with backoff for transient source errors.");
  recs.push("Track slow runs week over week to catch performance regressions before they become failures.");

  insights.push({
    severity: "info",
    icon: "tip",
    title: "Recommended next steps",
    body: recs.map((r) => `• ${r}`).join("\n"),
  });

  return insights;
}

const severityStyle: Record<Severity, string> = {
  success: "border-success/40 bg-success/5",
  info: "border-primary/40 bg-primary/5",
  warning: "border-warning/40 bg-warning/5",
  critical: "border-destructive/40 bg-destructive/5",
};

const iconStyle: Record<Severity, string> = {
  success: "text-success",
  info: "text-primary",
  warning: "text-warning",
  critical: "text-destructive",
};

function InsightIcon({ icon, severity }: { icon: Insight["icon"]; severity: Severity }) {
  const cls = `h-5 w-5 shrink-0 ${iconStyle[severity]}`;
  switch (icon) {
    case "health":
      return severity === "success" ? <CheckCircle2 className={cls} /> : severity === "critical" ? <XCircle className={cls} /> : <Activity className={cls} />;
    case "failure":
      return <AlertTriangle className={cls} />;
    case "clock":
      return <Clock className={cls} />;
    case "tip":
      return <Lightbulb className={cls} />;
  }
}

function exportCsv(runs: PipelineRun[]) {
  const header = "run_id,pipeline_name,source_system,execution_date,status,duration_minutes,records_processed";
  const rows = runs.map((r) =>
    [r.run_id, r.pipeline_name, r.source_system, r.execution_date, r.status, r.duration_minutes, r.records_processed].join(","),
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pipeline_runs.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function Dashboard() {
  const [source, setSource] = useState(ALL);
  const [pipeline, setPipeline] = useState(ALL);
  const [showInsights, setShowInsights] = useState(false);

  const pipelineOptions = useMemo(
    () =>
      source === ALL
        ? PIPELINE_NAMES
        : [...new Set(ALL_RUNS.filter((r) => r.source_system === source).map((r) => r.pipeline_name))],
    [source],
  );

  const runs = useMemo(
    () =>
      ALL_RUNS.filter(
        (r) => (source === ALL || r.source_system === source) && (pipeline === ALL || r.pipeline_name === pipeline),
      ),
    [source, pipeline],
  );

  const kpis = useMemo(() => {
    const total = runs.length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const ok = total - failed; // slow runs still completed
    const avg = total ? runs.reduce((s, r) => s + r.duration_minutes, 0) / total : 0;
    return { total, failed, rate: total ? (ok / total) * 100 : 0, avg };
  }, [runs]);

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; success: number; failed: number; slow: number }>();
    for (const r of runs) {
      const d = map.get(r.execution_date) ?? { date: r.execution_date, success: 0, failed: 0, slow: 0 };
      d[r.status]++;
      map.set(r.execution_date, d);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [runs]);

  const failures = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of runs) if (r.status === "failed") map.set(r.pipeline_name, (map.get(r.pipeline_name) ?? 0) + 1);
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [runs]);

  // Derived from the filtered runs, so insights always reflect current filters.
  const insights = useMemo(() => buildInsights(runs), [runs]);

  const cards = [
    { label: "Total Runs", value: kpis.total.toLocaleString() },
    { label: "Success Rate", value: `${kpis.rate.toFixed(1)}%` },
    { label: "Failed Runs", value: kpis.failed.toLocaleString() },
    { label: "Average Runtime", value: `${kpis.avg.toFixed(1)} min` },
  ];

  const tooltipStyle = {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--foreground)",
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            PipelinePulse <span className="text-primary">AI</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Data observability for your ETL pipelines</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Source system"
            value={source}
            options={[ALL, ...SOURCE_SYSTEMS]}
            onChange={(v) => {
              setSource(v);
              setPipeline(ALL);
            }}
          />
          <Select label="Pipeline" value={pipeline} options={[ALL, ...pipelineOptions]} onChange={setPipeline} />
          <button
            onClick={() => exportCsv(runs)}
            disabled={runs.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold sm:text-3xl">{c.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-5">
        <Panel title="Daily execution trend" className="lg:col-span-3">
          {daily.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={daily} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={C.axis} fontSize={11} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis stroke={C.axis} fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconSize={10} />
                <Line type="monotone" dataKey="success" stroke={C.success} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="failed" stroke={C.failed} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="slow" stroke={C.slow} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Failures by pipeline" className="lg:col-span-2">
          {failures.length === 0 ? (
            <EmptyChart message="No failures in the current selection." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={failures} layout="vertical" margin={{ top: 4, right: 8, left: 20, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke={C.axis} fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke={C.axis} fontSize={10} width={120} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="count" name="failures" fill={C.failed} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </section>

      <Panel title="Pipeline Insights" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Analyze the currently filtered runs with deterministic, rule-based logic.
          </p>
          <button
            onClick={() => setShowInsights(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            Generate Insights
          </button>
        </div>

        {showInsights && (
          <div className="mt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Rule-Based Operational Insights
            </p>
            {insights.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No runs match the current filters, so there is nothing to analyze. Adjust the filters and try again.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {insights.map((ins) => (
                  <div key={ins.title} className={`rounded-lg border p-4 ${severityStyle[ins.severity]}`}>
                    <div className="flex items-center gap-2">
                      <InsightIcon icon={ins.icon} severity={ins.severity} />
                      <h3 className="text-sm font-semibold">{ins.title}</h3>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{ins.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Execution history (latest 20)" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b">
                {["Run ID", "Pipeline", "Source", "Date", "Status", "Duration (min)", "Records"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 20).map((r) => (
                <tr key={r.run_id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.run_id}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.pipeline_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.source_system}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{r.execution_date}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusClass[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.duration_minutes.toFixed(1)}</td>
                  <td className="px-3 py-2 tabular-nums">{r.records_processed.toLocaleString()}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    No runs match the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </main>
  );
}

function Panel({ title, className = "", children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-xl border bg-card p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
