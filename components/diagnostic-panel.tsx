"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  CircleDot,
  Lightbulb,
  ShieldAlert,
  Target,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { OperationsDiagnostic } from "@/lib/diagnostic";

function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "orange" | "purple" | "red" }) {
  const colors = {
    green: "bg-[#eaf3ec] text-[#4d7c56]",
    orange: "bg-[#fff2e5] text-[#a66b31]",
    purple: "bg-[#f0ecf8] text-[#77609a]",
    red: "bg-[#fff0ed] text-[#a1534d]",
  };
  return <span className={`rounded-full px-2 py-1 text-[8px] font-bold tracking-[0.35px] ${colors[tone]}`}>{children}</span>;
}

function SectionTitle({ icon, title, detail }: { icon: ReactNode; title: string; detail?: string }) {
  return <div className="mb-3 flex items-start gap-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#edf4ee] text-[#4d8559]">{icon}</span><div><h3 className="text-[13px] font-semibold text-[#35473b]">{title}</h3>{detail && <p className="mt-0.5 text-[9px] text-[#89948c]">{detail}</p>}</div></div>;
}

export function DiagnosticPanel({ diagnostic }: { diagnostic: OperationsDiagnostic }) {
  const [expandedFactor, setExpandedFactor] = useState(0);
  const [showEvidence, setShowEvidence] = useState(false);
  return (
    <section className="fade-in mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#e8f3ec] px-2.5 py-1 text-[9px] font-semibold text-[#39784f]"><CircleDot size={11} /> AI OPERATIONS DIAGNOSTIC</div>
          <h2 className="text-[22px] font-semibold tracking-[-0.6px] text-[#293b30]">A clear place to investigate first</h2>
          <p className="mt-1 text-[10px] text-[#849087]">Frameworks were applied as analytical logic, not as worksheets.</p>
        </div>
        <Badge tone={diagnostic.mode === "LOCAL AI" ? "green" : "orange"}>{diagnostic.mode === "LOCAL AI" ? "LOCAL AI" : "DEMO / FALLBACK"}</Badge>
      </div>
      {diagnostic.notice && <p className="mb-3 rounded-lg border border-[#f0d9cf] bg-[#fff8f4] px-3 py-2 text-[10px] text-[#9a5b4d]">{diagnostic.notice}</p>}

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[13px] border border-[#dce9df] bg-white p-4 sm:p-5">
          <SectionTitle icon={<Target size={15} />} title="Problem identified" detail="Carried forward from the confirmed Problem Brief" />
          <p className="text-[14px] font-medium leading-[1.65] text-[#3c4d41]">{diagnostic.problemBrief.problemStatement}</p>
          <div className="mt-4 grid gap-x-4 gap-y-2 border-t border-[#edf0ed] pt-3 sm:grid-cols-2">
            <p className="text-[9px] leading-[1.55] text-[#77847b]"><strong className="text-[#53645a]">Time period: </strong>{diagnostic.operationalContext.timePeriod}</p>
            <p className="text-[9px] leading-[1.55] text-[#77847b]"><strong className="text-[#53645a]">Process: </strong>{diagnostic.operationalContext.processInvolved}</p>
            <p className="text-[9px] leading-[1.55] text-[#77847b] sm:col-span-2"><strong className="text-[#53645a]">Stakeholders: </strong>{diagnostic.operationalContext.stakeholders.join(", ") || "Unknown"}</p>
          </div>
        </article>
        <article className="rounded-[13px] border border-[#dce9df] bg-[#f0f5ef] p-4 sm:p-5">
          <SectionTitle icon={<ArrowRight size={15} />} title="What should be investigated first?" />
          <ol className="flex flex-col gap-2.5">
            {diagnostic.investigationPriorities.slice(0, 3).map((item) => <li key={item.order} className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-bold text-[#4d8559]">{item.order}</span><div><p className="text-[10px] font-semibold text-[#4b5e50]">{item.action}</p><p className="mt-0.5 text-[9px] leading-[1.55] text-[#7b897e]">{item.whyItMatters ?? item.reason}</p><p className="mt-1 text-[8px] leading-[1.5] text-[#8a968d]">Evidence: {item.evidenceRequired ?? item.reason}</p></div></li>)}
          </ol>
        </article>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[13px] border border-[#e8ede9] bg-white p-4 sm:p-5">
          <SectionTitle icon={<Lightbulb size={15} />} title="Possible root-cause areas" detail="Hypotheses only — validate before treating them as causes" />
          <div className="flex flex-col gap-2">
            {diagnostic.causalFactors.map((factor, index) => <div key={factor.title} className="rounded-lg border border-[#edf0ed] bg-[#fbfcfb]">
              <button onClick={() => setExpandedFactor(expandedFactor === index ? -1 : index)} className="flex w-full items-start gap-3 p-3 text-left">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fff2e5] text-[9px] font-bold text-[#a66b31]">{index + 1}</span>
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5"><span className="text-[11px] font-semibold text-[#48584d]">{factor.title}</span><Badge tone={factor.priority === "High" ? "orange" : "purple"}>{factor.priority} · {factor.confidence}</Badge></span><span className="mt-1 block text-[9px] leading-[1.6] text-[#7c8980]">{factor.description}</span></span>
                <ChevronDown size={14} className={`shrink-0 text-[#9da8a0] transition-transform ${expandedFactor === index ? "rotate-180" : ""}`} />
              </button>
              {expandedFactor === index && <div className="border-t border-[#edf0ed] px-3 pb-3 pt-2.5"><p className="text-[8px] font-bold uppercase tracking-[0.5px] text-[#829087]">Evidence mentioned</p><ul className="mt-1 space-y-1">{factor.evidence.map((item) => <li key={item} className="text-[9px] leading-[1.55] text-[#68776d]">• {item}</li>)}</ul><p className="mt-2 text-[8px] font-bold uppercase tracking-[0.5px] text-[#829087]">Validation required</p><ul className="mt-1 space-y-1">{factor.validationRequired.map((item) => <li key={item} className="text-[9px] leading-[1.55] text-[#68776d]">• {item}</li>)}</ul></div>}
            </div>)}
          </div>
        </article>

        <article className="rounded-[13px] border border-[#e8ede9] bg-white p-4 sm:p-5">
          <SectionTitle icon={<CircleDot size={15} />} title="Visual causal map" detail="A directional view of the current hypotheses" />
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="w-full rounded-lg bg-[#fff8f1] px-3 py-2 text-center text-[10px] font-semibold text-[#8f633c]">{diagnostic.visualNodes.find((node) => node.kind === "problem")?.label}</div>
            <div className="grid w-full gap-1.5 sm:grid-cols-2">{diagnostic.visualNodes.filter((node) => node.kind === "factor" || node.kind === "contributor").slice(0, 4).map((node) => <div key={node.id} className="rounded-lg border border-[#f0e4d5] bg-[#fffdf9] px-2 py-2 text-center text-[9px] text-[#7c6b59]"><span className="block text-[#c38a4c]">↓</span>{node.label}</div>)}</div>
            <div className="text-[10px] text-[#a3aca5]">↓ may contribute to ↓</div>
            <div className="w-full rounded-lg bg-[#edf4ee] px-3 py-2 text-center text-[10px] font-semibold text-[#4d7956]">{diagnostic.visualNodes.find((node) => node.kind === "outcome")?.label}</div>
          </div>
        </article>
      </div>

      <article className="mt-3 rounded-[13px] border border-[#e8ede9] bg-white p-4 sm:p-5">
        <SectionTitle icon={<ShieldAlert size={15} />} title="Evidence status" detail="Keep confirmed information separate from hypotheses." />
        <div className="grid gap-2 sm:grid-cols-3">
          {(["SUPPORTED", "HYPOTHESIS", "VALIDATION REQUIRED"] as const).map((status) => <div key={status} className="rounded-lg bg-[#fafbfa] p-3"><Badge tone={status === "SUPPORTED" ? "green" : status === "HYPOTHESIS" ? "orange" : "purple"}>{status}</Badge><p className="mt-2 text-[9px] leading-[1.6] text-[#748178]">{diagnostic.evidenceItems.filter((item) => item.status === status).slice(0, 2).map((item) => item.statement).join(" ") || "None recorded."}</p></div>)}
        </div>
        <button onClick={() => setShowEvidence((visible) => !visible)} className="mt-3 text-[9px] font-semibold text-[#4b8059] hover:underline">{showEvidence ? "Hide evidence list" : "View evidence list"}</button>
        {showEvidence && <div className="mt-2 border-t border-[#edf0ed] pt-2">{diagnostic.evidenceItems.map((item) => <p key={`${item.status}-${item.statement}`} className="py-1 text-[9px] leading-[1.55] text-[#748178]"><strong className="text-[#5c6d61]">{item.status}: </strong>{item.statement} <span className="text-[#9aa49d]">({item.source})</span></p>)}</div>}
      </article>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <article className="rounded-[13px] border border-[#e8ede9] bg-white p-4 sm:p-5">
          <SectionTitle icon={<Check size={15} />} title="Frameworks applied by AI" detail="Analytical evidence behind this diagnostic" />
          <div className="flex flex-wrap gap-2">{diagnostic.frameworksApplied.map((framework) => <div key={framework.name} className="rounded-lg border border-[#e5ece6] bg-[#fbfcfb] px-2.5 py-2"><p className="text-[10px] font-semibold text-[#506156]">{framework.name}</p><p className="mt-1 text-[8px] leading-[1.5] text-[#849087]">{framework.reasonSelected}</p></div>)}</div>
        </article>
        <article className="rounded-[13px] border border-[#e8ede9] bg-white p-4 sm:p-5">
          <SectionTitle icon={<AlertTriangle size={15} />} title="Recommended actions" />
          <div className="space-y-2">{diagnostic.recommendedActions.slice(0, 3).map((action) => <div key={action.action} className="rounded-lg bg-[#f8faf8] p-2.5"><p className="text-[10px] font-semibold text-[#506156]">{action.action}</p><p className="mt-1 text-[9px] leading-[1.5] text-[#7e8b81]">{action.reason} {action.evidenceRequired}</p></div>)}</div>
        </article>
      </div>

      <article className="mt-3 rounded-[13px] border border-[#cfe1d3] bg-[#edf5ef] p-4 sm:p-5">
        <p className="text-[8px] font-bold uppercase tracking-[0.7px] text-[#66816d]">Executive summary</p>
        <p className="mt-2 text-[11px] leading-[1.75] text-[#4f6255]">{diagnostic.executiveSummary}</p>
      </article>
    </section>
  );
}
