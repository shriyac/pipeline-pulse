import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { generateRuns, PIPELINE_NAMES, SOURCE_SYSTEMS, type PipelineStatus } from "@/lib/pipeline-data";

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

function Dashboard() {
  const [source, setSource] = useState(ALL);
  const [pipeline, setPipeline] = useState(ALL);

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
        <div className="flex flex-wrap gap-3">
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
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={daily}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={C.axis} fontSize={11} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis stroke={C.axis} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="success" stroke={C.success} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="failed" stroke={C.failed} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="slow" stroke={C.slow} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Failures by pipeline" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={failures} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={C.axis} fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke={C.axis} fontSize={10} width={120} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="count" name="failures" fill={C.failed} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </section>

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

function Panel({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
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
