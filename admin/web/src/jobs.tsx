import { useEffect, useRef, useState } from "react";
import type { Job } from "../../server/builder";
import { api } from "./api";

/** Starts a job and polls it until it finishes. */
export function useJob(onDone?: (j: Job) => void) {
  const [job, setJob] = useState<Job | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const poll = (id: string) => {
    timer.current = window.setTimeout(async () => {
      const j = await api.get<Job>(`/api/jobs/${id}`).catch(() => null);
      if (!j) return;
      setJob(j);
      if (j.status === "succeeded" || j.status === "failed") done.current?.(j);
      else poll(id);
    }, 1000);
  };
  const start = async (url: string, body?: unknown) => {
    const j = await api.post<Job>(url, body);
    setJob(j);
    poll(j.id);
  };
  const running = job?.status === "queued" || job?.status === "running";
  return { job, start, running };
}

export function JobLog({ job }: { job: Job | null }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [job?.log.length]);
  if (!job) return null;
  const tone = job.status === "succeeded" ? "text-ok" : job.status === "failed" ? "text-danger" : "text-accent";
  return (
    <div className="mt-3">
      <p className={`text-[13px] font-semibold ${tone}`}>
        {job.kind} · {job.status}
        {job.error ? ` — ${job.error.split("\n")[0]}` : ""}
      </p>
      <pre ref={ref} className="mt-2 max-h-72 overflow-auto rounded-lg border bg-panel p-3 font-mono text-[11.5px] leading-relaxed">
        {job.log.join("\n") || "…"}
      </pre>
    </div>
  );
}
