"use client";

import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Compass,
  Filter,
  History,
  Layers3,
  Lightbulb,
  Menu,
  MessageSquareText,
  Plus,
  Type,
  Search,
  Settings2,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ThinkAloud } from "@/components/think-aloud";
import { FiveWhysWorkspace } from "@/components/five-whys-workspace";
import { DiagnosticPanel } from "@/components/diagnostic-panel";
import { analyzeProblem, type Recommendation } from "@/lib/analyzer";
import {
  attachFiveWhysWorkspace,
  browserHistoryRepository,
  type AnalysisHistoryEntry,
} from "@/lib/history";
import { categories, frameworks, getFramework, type Framework } from "@/lib/frameworks";
import { type FiveWhysWorkspaceData } from "@/lib/five-whys";
import { type OperationsDiagnostic } from "@/lib/diagnostic";
import { problemBriefFields, type ProblemBrief } from "@/lib/problem-brief";
import { problemBriefService } from "@/lib/problem-brief-service";

type PageName = "Home" | "Framework Library" | "Analysis History" | "About";

const navItems: Array<{ name: PageName; icon: typeof Compass }> = [
  { name: "Home", icon: Compass },
  { name: "Framework Library", icon: BookOpen },
  { name: "Analysis History", icon: History },
  { name: "About", icon: CircleHelp },
];

const examples = [
  "Our order fulfillment is taking too long",
  "We keep running out of our best-selling products",
  "Customer complaints have increased this quarter",
];

function getDateLabel(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function FrameworkMark({ framework, size = "md" }: { framework: Framework; size?: "sm" | "md" | "lg" }) {
  const classes = {
    emerald: "bg-[#e8f3ec] text-[#28764e]",
    blue: "bg-[#eaf1f9] text-[#4c75a7]",
    orange: "bg-[#fff1e3] text-[#c57b36]",
    purple: "bg-[#f0ebf8] text-[#8367a9]",
    teal: "bg-[#e4f2f0] text-[#408a7d]",
  }[framework.accent];
  const dimensions = size === "lg" ? "h-12 w-12 text-[22px]" : size === "sm" ? "h-9 w-9 text-lg" : "h-10 w-10 text-xl";
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-xl font-semibold ${classes} ${dimensions}`}>
      {framework.icon}
    </div>
  );
}

function AppLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#26734d] text-white">
        <Layers3 size={17} strokeWidth={2.5} />
      </div>
      <span className="text-[13px] font-semibold tracking-[-0.25px] text-[#22352b]">Operations Toolkit <span className="text-[#77857b]">AI</span></span>
    </div>
  );
}

function Sidebar({
  activePage,
  setActivePage,
  onClose,
}: {
  activePage: PageName;
  setActivePage: (page: PageName) => void;
  onClose?: () => void;
}) {
  return (
    <aside className="sidebar-scroll flex h-full w-[248px] shrink-0 flex-col border-r border-[#e9ede9] bg-white px-[18px] py-[22px]">
      <div className="mb-[39px] flex items-center justify-between px-1">
        <AppLogo />
        {onClose && <button aria-label="Close menu" onClick={onClose} className="rounded-lg p-1 text-[#69766e] hover:bg-gray-100"><X size={18} /></button>}
      </div>
      <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[1.35px] text-[#a0aaa3]">Workspace</div>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ name, icon: Icon }) => (
          <button
            key={name}
            onClick={() => {
              setActivePage(name);
              onClose?.();
            }}
            className={`flex h-[40px] items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors ${
              activePage === name
                ? "bg-[#edf5ef] font-semibold text-[#28734d]"
                : "font-medium text-[#68756d] hover:bg-[#f7f8f6] hover:text-[#27372e]"
            }`}
          >
            <Icon size={17} strokeWidth={1.8} />
            {name}
            {name === "Framework Library" && <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#829087]">{frameworks.length}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-9 px-2 text-[10px] font-bold uppercase tracking-[1.35px] text-[#a0aaa3]">Your workspace</div>
      <button
        onClick={() => setActivePage("Home")}
        className="mt-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] text-[#56635a] hover:bg-[#f7f8f6]"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f1eee7] text-[10px] font-bold text-[#a17b47]">OT</span>
        Operations team
        <ChevronDown size={14} className="ml-auto text-[#98a39b]" />
      </button>

      <div className="mt-auto rounded-[13px] border border-[#e8eee9] bg-[#f8faf8] p-3.5">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#33463a]">
          <Sparkles size={15} className="text-[#57946d]" />
          Thoughtful by design
        </div>
        <p className="text-[11px] leading-[1.6] text-[#758178]">Practical frameworks. Clear next steps. Your business context stays yours.</p>
        <div className="mt-3 flex items-center gap-1 text-[10px] font-medium text-[#47825a]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#64a578]" /> Local analysis · No API required
        </div>
      </div>
      <button className="mt-4 flex items-center gap-2.5 border-t border-[#edf0ed] px-2 pt-4 text-left">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf0eb] text-[11px] font-semibold text-[#537260]">OT</div>
        <div>
          <div className="text-[11px] font-semibold text-[#35443a]">Operations Team</div>
          <div className="mt-0.5 text-[10px] text-[#89938c]">Free workspace</div>
        </div>
        <Settings2 size={15} className="ml-auto text-[#929c95]" />
      </button>
    </aside>
  );
}

function Header({ title, subtitle, onMenu }: { title: string; subtitle?: string; onMenu: () => void }) {
  return (
    <header className="flex min-h-[72px] items-center justify-between border-b border-[#e9ede9] bg-white px-5 sm:px-8 lg:px-10">
      <div className="flex items-center gap-3">
        <button aria-label="Open menu" onClick={onMenu} className="rounded-lg p-2 text-[#59685e] hover:bg-[#f4f6f3] lg:hidden"><Menu size={19} /></button>
        <div>
          <h1 className="text-[14px] font-semibold tracking-[-0.2px] text-[#26372d]">{title}</h1>
          {subtitle && <p className="mt-1 hidden text-[11px] text-[#909a92] sm:block">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 rounded-full border border-[#e7ece8] bg-[#fafbfa] px-2.5 py-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#64a578]" />
          <span className="text-[10px] font-medium text-[#78847c]">All systems operational</span>
        </div>
        <button aria-label="Help and feedback" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e8ece8] text-[#78847e] hover:bg-[#f6f8f5]"><MessageSquareText size={15} /></button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf0eb] text-[10px] font-semibold text-[#537260]">OT</div>
      </div>
    </header>
  );
}

function RecommendationCard({
  recommendation,
  index,
  onApply,
}: {
  recommendation: Recommendation;
  index: number;
  onApply: (framework: Framework) => void;
}) {
  const { framework } = recommendation;
  return (
    <article className="fade-in flex flex-col rounded-[13px] border border-[#e8ede9] bg-white p-4 transition-all hover:border-[#c9ddcf] hover:shadow-[0_5px_18px_rgba(39,78,53,0.05)] sm:p-[18px]" style={{ animationDelay: `${index * 55}ms` }}>
      <div className="flex items-start gap-3">
        <FrameworkMark framework={framework} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[13px] font-semibold text-[#293930]">{framework.name}</h3>
            <span className="rounded-full bg-[#f2f5f2] px-2 py-[3px] text-[9px] font-medium text-[#77847a]">{framework.category}</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-[1.55] text-[#7c8880]">{framework.description}</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-[#f8faf8] px-3 py-2.5">
        <div className="flex gap-2">
          <Lightbulb size={14} className="mt-0.5 shrink-0 text-[#669276]" />
          <div>
            <span className="text-[10px] font-semibold text-[#425b49]">Why it fits </span>
            <span className="text-[10px] leading-[1.6] text-[#77837a]">{recommendation.matchReason}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Target size={13} className="mt-0.5 shrink-0 text-[#99a39b]" />
        <p className="text-[10px] leading-[1.6] text-[#77837a]"><span className="font-semibold text-[#66746a]">Best when </span>{framework.when}</p>
      </div>
      <button onClick={() => onApply(framework)} className="mt-4 flex h-[35px] items-center justify-center gap-2 rounded-lg border border-[#d8e7dc] bg-white text-[11px] font-semibold text-[#2c754e] transition-colors hover:border-[#26734d] hover:bg-[#f3f8f4]">
        Apply framework <ArrowRight size={13} />
      </button>
    </article>
  );
}

function RecommendationPanel({
  recommendations,
  problem,
  onApply,
  onNewAnalysis,
}: {
  recommendations: Recommendation[];
  problem: string;
  onApply: (framework: Framework) => void;
  onNewAnalysis: () => void;
}) {
  return (
    <div className="fade-in mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f3ec] text-[#368054]"><Sparkles size={13} /></span>
            <h2 className="text-[14px] font-semibold text-[#2b3b31]">Your recommended frameworks</h2>
          </div>
          <p className="ml-8 mt-1 text-[10px] text-[#8b968e]">Based on your challenge · {recommendations.length} useful places to start</p>
        </div>
        <button onClick={onNewAnalysis} className="flex items-center gap-1 text-[10px] font-semibold text-[#47805a] hover:text-[#235a3a]">New analysis <Plus size={13} /></button>
      </div>
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#e9ede9] bg-white px-3 py-2 text-[10px] text-[#758078]">
        <MessageSquareText size={13} className="shrink-0 text-[#9ba69e]" />
        <span className="truncate">“{problem}”</span>
        <Check size={13} className="ml-auto shrink-0 text-[#5d9a70]" />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {recommendations.map((recommendation, index) => (
          <RecommendationCard key={recommendation.framework.id} recommendation={recommendation} index={index} onApply={onApply} />
        ))}
      </div>
    </div>
  );
}

function FrameworkTile({ framework, onApply }: { framework: Framework; onApply: (framework: Framework) => void }) {
  return (
    <button onClick={() => onApply(framework)} className="group flex min-h-[85px] items-center gap-3 rounded-xl border border-[#e9ede9] bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#cbdccf] hover:shadow-[0_5px_14px_rgba(39,78,53,0.05)]">
      <FrameworkMark framework={framework} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold text-[#39473d]">{framework.name}</div>
        <div className="mt-1 truncate text-[9px] text-[#8a958d]">{framework.category}</div>
      </div>
      <ArrowUpRight size={14} className="shrink-0 text-[#a0aaa3] opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function HomePage({
  problem,
  setProblem,
  onAnalyze,
  onVoiceConfirm,
  loading,
  recommendations,
  analyzedProblem,
  onApply,
  onNavigate,
  diagnostic,
  diagnosticLoading,
  diagnosticStage,
  diagnosticError,
}: {
  problem: string;
  setProblem: (value: string) => void;
  onAnalyze: () => void;
  onVoiceConfirm: (brief: ProblemBrief, transcript?: { rawTranscript: string; cleanedTranscript: string }) => void;
  loading: boolean;
  recommendations: Recommendation[];
  analyzedProblem: string;
  onApply: (framework: Framework) => void;
  onNavigate: (page: PageName) => void;
  diagnostic: OperationsDiagnostic | null;
  diagnosticLoading: boolean;
  diagnosticStage: string;
  diagnosticError: string;
}) {
  const [inputMode, setInputMode] = useState<"type" | "voice">("type");
  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-8 sm:px-8 sm:pt-10 lg:px-10">
      <section className="relative overflow-hidden rounded-[19px] border border-[#e3ebe4] bg-[#f0f5ef] px-5 py-7 sm:px-8 sm:py-8 lg:px-10">
        <div className="pointer-events-none absolute -right-5 -top-16 h-64 w-64 rounded-full border border-[#deeadf] opacity-70" />
        <div className="pointer-events-none absolute right-[68px] -top-2 h-48 w-48 rounded-full border border-[#e0eade] opacity-70" />
        <div className="pointer-events-none absolute right-[90px] top-[10px] hidden h-28 w-28 rounded-full border border-[#e1ebe1] sm:block" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#dce8dd] bg-white/70 px-2.5 py-1 text-[9px] font-semibold tracking-[0.2px] text-[#548064]">
            <Sparkles size={12} /> YOUR PRACTICAL PROBLEM-SOLVING PARTNER
          </div>
          <h2 className="max-w-[620px] text-[28px] font-semibold leading-[1.16] tracking-[-1.1px] text-[#263a2c] sm:text-[34px]">
            Turn business problems<br className="hidden sm:block" /> into <span className="text-[#397b50]">structured solutions.</span>
          </h2>
          <p className="mt-3 max-w-[470px] text-[12px] leading-[1.7] text-[#76857a] sm:text-[13px]">Describe what’s getting in the way. Find the right framework, then take a clear next step.</p>

          <div className="mt-6 max-w-[740px]">
            <div role="group" aria-label="Choose how to explain your problem" className="mb-3 grid grid-cols-2 gap-2">
              <button aria-pressed={inputMode === "type"} onClick={() => setInputMode("type")} className={`flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-3 text-[11px] font-semibold transition-colors ${inputMode === "type" ? "border-[#bbd3c0] bg-white text-[#356747] shadow-sm" : "border-[#dfe8df] bg-white/55 text-[#708076] hover:bg-white"}`}>
                <Type size={15} /> Type your problem
              </button>
              <button aria-pressed={inputMode === "voice"} onClick={() => setInputMode("voice")} className={`relative flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-3 text-[11px] font-semibold transition-colors ${inputMode === "voice" ? "border-[#226541] bg-[#28734d] text-white shadow-[0_4px_12px_rgba(39,104,65,0.18)]" : "border-[#b9d0be] bg-[#e3efe5] text-[#2f6d45] hover:bg-[#edf5ef]"}`}>
                🎙️ <span>Think aloud</span><span className={`rounded-full px-1.5 py-0.5 text-[8px] ${inputMode === "voice" ? "bg-white/15 text-white/90" : "bg-white/75 text-[#5c7d64]"}`}>JUST SPEAK</span>
              </button>
            </div>
            {inputMode === "type" ? (
              <>
            <div className="rounded-[12px] border border-[#e4eae4] bg-white p-2 shadow-[0_5px_18px_rgba(52,83,59,0.045)] sm:p-2.5">
            <label htmlFor="business-problem" className="mb-1.5 block px-2 pt-1 text-[10px] font-semibold text-[#53645a]">What business problem are you working through?</label>
            <textarea
              id="business-problem"
              value={problem}
              onChange={(event) => setProblem(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onAnalyze();
              }}
              maxLength={500}
              placeholder="e.g. Our team spends too much time fixing order errors..."
              rows={2}
              className="w-full resize-none bg-transparent px-2 py-1 text-[12px] leading-[1.6] text-[#34433a] outline-none placeholder:text-[#a8b0aa]"
            />
            <div className="flex items-center justify-between border-t border-[#f0f2f0] px-1 pt-2">
              <div className="pl-1 text-[9px] text-[#a1aaa3]">{problem.length}/500 <span className="mx-1">·</span> Press ⌘ + Enter to analyze</div>
              <button
                onClick={onAnalyze}
                disabled={!problem.trim() || loading}
                className="flex h-[34px] items-center gap-2 rounded-lg bg-[#28734d] px-3.5 text-[10px] font-semibold text-white transition-colors hover:bg-[#1d5f3d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Understanding problem…" : <>Run AI Diagnostic <ArrowRight size={13} /></>}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
            <span className="mr-0.5 text-[9px] font-medium text-[#8a978d]">Try an example</span>
            {examples.map((example) => (
              <button key={example} onClick={() => setProblem(example)} className="rounded-full border border-[#dfe7df] bg-white/60 px-2.5 py-1.5 text-[9px] text-[#758278] transition-colors hover:border-[#a9c5af] hover:text-[#376e49]">{example}</button>
            ))}
          </div>
              </>
            ) : (
            <ThinkAloud
              onConfirm={onVoiceConfirm}
              onTypeInstead={() => setInputMode("type")}
            />
          )}
        </div>
        </div>
      </section>

      {diagnosticLoading && (
        <div className="fade-in mt-8 rounded-[13px] border border-[#dce9df] bg-white p-5 text-center">
          <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[#dce9df]" />
          <p className="mt-3 text-[11px] font-semibold text-[#4b5e50]">{diagnosticStage}</p>
          <p className="mt-1 text-[9px] text-[#8b968e]">Applying the relevant operations frameworks to your confirmed brief.</p>
        </div>
      )}
      {diagnosticError && <p role="alert" className="fade-in mt-8 rounded-lg border border-[#f0d9cf] bg-[#fff8f4] px-3 py-2.5 text-[10px] text-[#9a5b4d]">{diagnosticError}</p>}
      {diagnostic && <DiagnosticPanel diagnostic={diagnostic} />}

      {recommendations.length > 0 && (
        <RecommendationPanel
          recommendations={recommendations}
          problem={analyzedProblem}
          onApply={onApply}
          onNewAnalysis={() => {
            document.getElementById("business-problem")?.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      <section className={`${recommendations.length ? "mt-9" : "mt-8"}`}>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eff1eb] text-[#718065]"><BookOpen size={13} /></span>
              <h2 className="text-[13px] font-semibold text-[#344238]">Explore the framework library</h2>
            </div>
            <p className="ml-8 mt-1 text-[10px] text-[#909a92]">A practical toolkit for your everyday challenges</p>
          </div>
          <button onClick={() => onNavigate("Framework Library")} className="hidden items-center gap-1 text-[10px] font-semibold text-[#47805a] hover:text-[#235a3a] sm:flex">View all {frameworks.length} <ArrowRight size={12} /></button>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {frameworks.slice(0, 6).map((framework) => <FrameworkTile key={framework.id} framework={framework} onApply={onApply} />)}
        </div>
        <button onClick={() => onNavigate("Framework Library")} className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-semibold text-[#47805a] hover:bg-[#f0f5ef] sm:hidden">Browse all frameworks <ArrowRight size={12} /></button>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <FeatureNote icon={<Target size={15} />} title="The right tool, faster" detail="Find a framework that fits the problem in front of you." />
        <FeatureNote icon={<BookOpen size={15} />} title="Practical by nature" detail="Clear steps turn familiar ideas into useful action." />
        <FeatureNote icon={<Check size={15} />} title="Private by design" detail="Recommendations and voice transcription run locally on your device." />
      </section>
      <div className="mt-8 flex items-center justify-center gap-1.5 text-[9px] text-[#a0aaa2]"><span className="h-1.5 w-1.5 rounded-full bg-[#70a27b]" /> Thoughtful tools for better operations</div>
    </div>
  );
}

function FeatureNote({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#e9ede9] bg-white p-3.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#edf4ee] text-[#4b835b]">{icon}</div>
      <div><div className="text-[10px] font-semibold text-[#415046]">{title}</div><p className="mt-1 text-[9px] leading-[1.6] text-[#89948c]">{detail}</p></div>
    </div>
  );
}

function LibraryPage({ onApply }: { onApply: (framework: Framework) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All frameworks");
  const filtered = useMemo(() => frameworks.filter((framework) => {
    const matchesCategory = category === "All frameworks" || framework.category === category;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || [framework.name, framework.description, framework.category, ...framework.keywords].join(" ").toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  }), [category, query]);

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#edf4ee] px-2.5 py-1 text-[9px] font-semibold text-[#4a8059]"><BookOpen size={11} /> THE TOOLKIT</div>
          <h2 className="text-[24px] font-semibold tracking-[-0.7px] text-[#293b30]">Framework Library</h2>
          <p className="mt-1.5 text-[11px] text-[#849087]">Explore practical approaches for solving business and operations challenges.</p>
        </div>
        <span className="rounded-full border border-[#e7ece8] bg-white px-3 py-1.5 text-[10px] font-medium text-[#758078]">{filtered.length} frameworks</span>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa49c]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search frameworks, topics, or keywords..." className="h-10 w-full rounded-lg border border-[#e5eae6] bg-white pl-9 pr-3 text-[11px] text-[#34443a] outline-none placeholder:text-[#a2aaa3] focus:border-[#a5c3ad]" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter size={14} className="mr-1 shrink-0 text-[#929c94]" />
          {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3 py-2 text-[9px] font-medium transition-colors ${category === item ? "bg-[#28734d] text-white" : "border border-[#e5eae6] bg-white text-[#738077] hover:border-[#c5d7c9]"}`}>{item}</button>)}
        </div>
      </div>
      {filtered.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((framework) => <LibraryCard key={framework.id} framework={framework} onApply={onApply} />)}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#dce4de] bg-white py-14 text-center">
          <Search size={20} className="mx-auto text-[#9aa79d]" />
          <p className="mt-3 text-[12px] font-semibold text-[#526157]">No frameworks found</p>
          <p className="mt-1 text-[10px] text-[#8a958d]">Try another search or category.</p>
        </div>
      )}
    </div>
  );
}

function LibraryCard({ framework, onApply }: { framework: Framework; onApply: (framework: Framework) => void }) {
  return (
    <article className="flex min-h-[208px] flex-col rounded-[13px] border border-[#e8ede9] bg-white p-4 transition-all hover:border-[#c9ddcf] hover:shadow-[0_5px_18px_rgba(39,78,53,0.05)]">
      <div className="flex items-start gap-3">
        <FrameworkMark framework={framework} />
        <div className="min-w-0 pt-0.5">
          <h3 className="text-[12px] font-semibold text-[#334238]">{framework.name}</h3>
          <span className="mt-1 inline-flex rounded-full bg-[#f3f5f3] px-2 py-0.5 text-[9px] text-[#7e8981]">{framework.category}</span>
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-[1.65] text-[#7f8a82]">{framework.description}</p>
      <div className="mt-2.5 border-l-2 border-[#dce9df] pl-2.5 text-[9px] leading-[1.6] text-[#7c877f]"><span className="font-semibold text-[#55685a]">Use when: </span>{framework.when}</div>
      <button onClick={() => onApply(framework)} className="mt-auto flex items-center justify-between pt-3 text-[10px] font-semibold text-[#39794f] hover:text-[#205c39]">
        Explore framework <ArrowRight size={13} />
      </button>
    </article>
  );
}

function HistoryPage({ history, onReopen, onClear }: { history: AnalysisHistoryEntry[]; onReopen: (entry: AnalysisHistoryEntry) => void; onClear: () => void }) {
  return (
    <div className="mx-auto max-w-[1000px] px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#eff1eb] px-2.5 py-1 text-[9px] font-semibold text-[#708064]"><History size={11} /> YOUR WORKSPACE</div>
          <h2 className="text-[24px] font-semibold tracking-[-0.7px] text-[#293b30]">Analysis History</h2>
          <p className="mt-1.5 text-[11px] text-[#849087]">Pick up where you left off with recent problem analyses.</p>
        </div>
        {history.length > 0 && <button onClick={onClear} className="rounded-lg border border-[#e5eae6] bg-white px-3 py-2 text-[10px] font-medium text-[#758078] hover:text-[#a44b4b]">Clear history</button>}
      </div>
      {history.length === 0 ? (
        <div className="mt-7 rounded-[14px] border border-dashed border-[#dce4de] bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#edf4ee] text-[#4a8059]"><Clock3 size={20} /></div>
          <h3 className="mt-4 text-[13px] font-semibold text-[#3c4c41]">Your next solution starts here</h3>
          <p className="mx-auto mt-1.5 max-w-[330px] text-[10px] leading-[1.65] text-[#879289]">Once you analyze a business problem, your recommendations will be saved here on this device.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2.5">
          {history.map((entry, index) => (
            <button key={`${entry.date}-${index}`} onClick={() => onReopen(entry)} className="group flex items-center gap-3 rounded-xl border border-[#e8ede9] bg-white p-4 text-left transition-colors hover:border-[#cbdccf]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1f4ef] text-[#75846f]"><MessageSquareText size={16} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-[#435046]">{entry.problem}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-[#929c94]">
                  <span>{getDateLabel(entry.date)}</span><span>·</span><span>{entry.recommendations.length} recommendations</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden truncate sm:inline">{entry.recommendations.map((id) => getFramework(id)?.shortName).filter(Boolean).join(", ")}</span>
                </div>
              </div>
              <ArrowRight size={15} className="shrink-0 text-[#9ba69d] transition-transform group-hover:translate-x-0.5 group-hover:text-[#45805a]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AboutPage() {
  return (
    <div className="mx-auto max-w-[950px] px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#edf4ee] px-2.5 py-1 text-[9px] font-semibold text-[#4a8059]"><Sparkles size={11} /> BUILT FOR BETTER OPERATIONS</div>
      <h2 className="text-[24px] font-semibold tracking-[-0.7px] text-[#293b30]">About Operations Toolkit AI</h2>
      <p className="mt-2 max-w-[580px] text-[12px] leading-[1.7] text-[#7d8981]">A practical companion for turning everyday business challenges into clear, structured next steps.</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <AboutCard icon={<Target size={17} />} title="A useful place to start" text="Describe a challenge in your own words and get a short list of frameworks matched to the language and themes in your problem." />
        <AboutCard icon={<BookOpen size={17} />} title="Practical frameworks" text={`Explore ${frameworks.length} established approaches, each with guidance on why and when it is useful and a step-by-step walkthrough.`} />
        <AboutCard icon={<Check size={17} />} title="Private by default" text="Recommendations are generated locally in your browser. Your problem isn't sent to a paid AI service or stored on a server." />
        <AboutCard icon={<Layers3 size={17} />} title="Designed to grow" text="The recommendation engine is separate from the interface, ready for a future AI provider or a shared data layer when you choose to add one." />
      </div>
      <div className="mt-6 rounded-xl border border-[#e7ece8] bg-white p-4 sm:p-5">
        <h3 className="text-[12px] font-semibold text-[#405046]">Built with intention</h3>
        <p className="mt-2 max-w-[700px] text-[10px] leading-[1.8] text-[#7f8a82]">Operations Toolkit AI is an educational starting point, not a substitute for domain expertise or decisions based on your own data. Use each framework to organize thinking, test assumptions, and involve the people closest to the work.</p>
      </div>
    </div>
  );
}

function AboutCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-[#e8ede9] bg-white p-4"><div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf4ee] text-[#4b835b]">{icon}</div><h3 className="text-[11px] font-semibold text-[#435046]">{title}</h3><p className="mt-1.5 text-[10px] leading-[1.7] text-[#808c84]">{text}</p></div>;
}

function FrameworkModal({
  framework,
  problem,
  problemBrief,
  onClose,
}: {
  framework: Framework;
  problem: string;
  problemBrief: ProblemBrief | null;
  onClose: () => void;
}) {
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  const personalizedSteps = framework.steps.map((step) => step.replaceAll("{{problem}}", problem || "your challenge"));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14231b]/40 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="framework-title" className="fade-in flex max-h-[92vh] w-full max-w-[610px] flex-col overflow-hidden rounded-[18px] border border-[#e5ebe6] bg-[#fbfcfa] shadow-[0_24px_90px_rgba(20,38,26,0.22)]">
        <header className="flex items-start gap-3 border-b border-[#e9ede9] bg-white px-5 py-5 sm:px-6">
          <FrameworkMark framework={framework} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[1px] text-[#7c8a80]">{framework.category} · FRAMEWORK GUIDE</div>
            <h2 id="framework-title" className="text-[18px] font-semibold tracking-[-0.5px] text-[#2d4034]">{framework.name}</h2>
            <p className="mt-1 text-[10px] leading-[1.6] text-[#7c8980]">{framework.description}</p>
          </div>
          <button onClick={onClose} aria-label="Close framework guide" className="rounded-lg p-1.5 text-[#89948c] hover:bg-[#f2f5f2]"><X size={17} /></button>
        </header>
        <div className="sidebar-scroll overflow-y-auto px-5 py-5 sm:px-6">
          {(problemBrief || problem) && <div className="mb-4 rounded-lg border border-[#e4ebe4] bg-white px-3.5 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.6px] text-[#75907b]"><Target size={12} /> YOUR CHALLENGE</div>
            <p className="text-[10px] leading-[1.65] text-[#647168]">{problemBrief?.problemStatement ?? problem}</p>
            {problemBrief && <div className="mt-2 grid gap-x-4 gap-y-1.5 border-t border-[#edf0ed] pt-2 sm:grid-cols-2">
              {problemBriefFields.filter(({ key }) => key !== "problemStatement" && key !== "assumptions" && problemBrief[key] !== "Unknown").map(({ key, label }) => (
                <p key={key} className="text-[9px] leading-[1.55] text-[#79857c]"><span className="font-semibold text-[#607064]">{label}: </span>{problemBrief[key]}</p>
              ))}
            </div>}
          </div>}
          <div className="rounded-lg bg-[#edf4ee] px-3.5 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.6px] text-[#4b7956]"><Lightbulb size={12} /> WHY USE THIS FRAMEWORK</div>
            <p className="text-[10px] leading-[1.7] text-[#63776a]">{framework.why}</p>
            <p className="mt-2 border-t border-[#dce9df] pt-2 text-[10px] leading-[1.7] text-[#63776a]"><span className="font-semibold text-[#4d6855]">Best when: </span>{framework.when}</p>
          </div>
          <div className="mb-3 mt-5 flex items-end justify-between">
            <div><div className="text-[12px] font-semibold text-[#3c4b40]">Work through it</div><div className="mt-1 text-[9px] text-[#8c978f]">Check off each step as you go</div></div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-medium text-[#78847b]">{checkedSteps.length} of {personalizedSteps.length} complete</span>
          </div>
          <ol className="flex flex-col gap-2">
            {personalizedSteps.map((step, index) => {
              const isChecked = checkedSteps.includes(index);
              return (
                <li key={step} className={`flex gap-3 rounded-lg border p-3 transition-colors ${isChecked ? "border-[#dce9df] bg-[#f4f8f4]" : "border-[#eaeeea] bg-white"}`}>
                  <button aria-label={`${isChecked ? "Uncheck" : "Complete"} step ${index + 1}`} aria-pressed={isChecked} onClick={() => setCheckedSteps((current) => isChecked ? current.filter((item) => item !== index) : [...current, index])} className={`mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold transition-colors ${isChecked ? "border-[#4b8c5e] bg-[#4b8c5e] text-white" : "border-[#d4ddd5] bg-white text-[#819087]"}`}>{isChecked ? <Check size={12} /> : index + 1}</button>
                  <p className={`text-[10px] leading-[1.7] ${isChecked ? "text-[#839087] line-through decoration-[#b8c7bb]" : "text-[#536157]"}`}>{step}</p>
                </li>
              );
            })}
          </ol>
          {checkedSteps.length === personalizedSteps.length && <div className="mt-4 rounded-lg border border-[#dce9df] bg-[#edf4ee] p-3 text-center text-[10px] font-medium text-[#42744f]">Nice work — you’ve completed this framework. Capture your decision and next action.</div>}
        </div>
        <footer className="flex items-center justify-between border-t border-[#e9ede9] bg-white px-5 py-3.5 sm:px-6">
          <span className="text-[9px] text-[#9ba49d]">Progress is kept in this guide while it’s open</span>
          <button onClick={onClose} className="flex h-8 items-center gap-1.5 rounded-lg bg-[#28734d] px-3 text-[10px] font-semibold text-white hover:bg-[#1d5f3d]">Done <Check size={13} /></button>
        </footer>
      </section>
    </div>
  );
}

export default function Home() {
  const [activePage, setActivePage] = useState<PageName>("Home");
  const [problem, setProblem] = useState("");
  const [analyzedProblem, setAnalyzedProblem] = useState("");
  const [activeProblemBrief, setActiveProblemBrief] = useState<ProblemBrief | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [storageWarning, setStorageWarning] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [fiveWhysOpen, setFiveWhysOpen] = useState(false);
  const [activeAnalysisDate, setActiveAnalysisDate] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [diagnostic, setDiagnostic] = useState<OperationsDiagnostic | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticStage, setDiagnosticStage] = useState("");
  const [diagnosticError, setDiagnosticError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    void browserHistoryRepository.load()
      .then((saved) => {
        if (isCurrent) setHistory(saved);
      })
      .catch(() => {
        if (isCurrent) setStorageWarning(true);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const saveHistory = (entries: AnalysisHistoryEntry[]) => {
    setHistory(entries);
    void browserHistoryRepository.save(entries).catch(() => setStorageWarning(true));
  };

  const runAnalysis = async (
    brief: ProblemBrief,
    transcript?: { rawTranscript: string; cleanedTranscript: string },
  ) => {
    const cleanedProblem = brief.problemStatement.trim();
    if (!cleanedProblem || loading) return;
    setLoading(true);
    setDiagnostic(null);
    setDiagnosticError("");
    setDiagnosticLoading(true);
    setDiagnosticStage("Understanding problem…");
    const analysisDate = new Date().toISOString();
    setActiveAnalysisDate(analysisDate);
    window.setTimeout(async () => {
      const nextRecommendations = analyzeProblem(brief);
      setRecommendations(nextRecommendations);
      setAnalyzedProblem(cleanedProblem);
      setActiveProblemBrief(brief);
      setLoading(false);
      setDiagnosticStage("Selecting analytical frameworks…");
      let nextDiagnostic: OperationsDiagnostic;
      try {
        const requestController = new AbortController();
        const requestTimeout = window.setTimeout(() => requestController.abort(), 55_000);
        const response = await fetch("/api/diagnostic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: requestController.signal,
          body: JSON.stringify({
            problemBrief: brief,
            rawProblem: transcript?.rawTranscript ?? cleanedProblem,
            cleanedTranscript: transcript?.cleanedTranscript ?? cleanedProblem,
          }),
        });
        window.clearTimeout(requestTimeout);
        if (!response.ok) {
          throw new Error("The local diagnostic could not be completed.");
        }
        nextDiagnostic = await response.json() as OperationsDiagnostic;
      } catch (error) {
        setDiagnosticError(error instanceof DOMException && error.name === "AbortError"
          ? "Local AI took too long to respond. Start Ollama and try again."
          : error instanceof Error ? error.message : "The local diagnostic could not be completed.");
        setDiagnosticLoading(false);
        return;
      }
      setDiagnosticStage("Building diagnostic…");
      setDiagnostic(nextDiagnostic);
      setDiagnosticLoading(false);
      const nextEntry: AnalysisHistoryEntry = {
        problem: cleanedProblem,
        date: analysisDate,
        recommendations: nextRecommendations.map(({ framework }) => framework.id),
        problemBrief: brief,
        diagnostic: nextDiagnostic,
      };
      saveHistory([nextEntry, ...history.filter((entry) => entry.problem !== cleanedProblem)].slice(0, 30));
    }, 240);
  };

  const handleAnalyze = () => {
    const cleanedProblem = problem.trim();
    if (!cleanedProblem || loading) return;
    void runAnalysis(problemBriefService.structure(cleanedProblem));
  };

  const handleVoiceConfirm = (brief: ProblemBrief, transcript?: { rawTranscript: string; cleanedTranscript: string }) => {
    setProblem(brief.problemStatement);
    void runAnalysis(brief, transcript);
  };

  const handleReopenHistory = (entry: AnalysisHistoryEntry) => {
    setProblem(entry.problem);
    setAnalyzedProblem(entry.problem);
    setActiveProblemBrief(entry.problemBrief ?? problemBriefService.structure(entry.problem));
    setActiveAnalysisDate(entry.date);
    setRecommendations(entry.recommendations.map((id) => {
      const framework = getFramework(id);
      return framework ? { framework, score: 1, matchReason: framework.description } : undefined;
    }).filter((item): item is Recommendation => Boolean(item)));
    setDiagnostic(entry.diagnostic ?? null);
    setDiagnosticLoading(false);
    setActivePage("Home");
  };

  const handleApplyFramework = (framework: Framework) => {
    setSelectedFramework(framework);
    const analysisExists = history.some(
      (entry) => entry.date === activeAnalysisDate && entry.problem === analyzedProblem,
    );
    if (framework.id === "five-whys" && activeProblemBrief && analysisExists) {
      setFiveWhysOpen(true);
    }
  };

  const handleSaveFiveWhys = async (workspace: FiveWhysWorkspaceData) => {
    const updatedHistory = attachFiveWhysWorkspace(history, activeAnalysisDate, workspace);
    if (!updatedHistory) {
      throw new Error("The original analysis could not be found in local history.");
    }
    setHistory(updatedHistory);
    await browserHistoryRepository.save(updatedHistory);
  };

  const closeFiveWhys = () => {
    setFiveWhysOpen(false);
    setSelectedFramework(null);
  };

  const handleNavigate = (page: PageName) => {
    if (fiveWhysOpen) closeFiveWhys();
    setActivePage(page);
  };

  const activeTitle = fiveWhysOpen
    ? "5 Whys Workspace"
    : activePage === "Home" ? "Operations Toolkit AI" : activePage;
  const activeSubtitle = fiveWhysOpen
    ? "Follow the evidence one step at a time."
    : activePage === "Home" ? "Turn business problems into structured solutions." : undefined;

  return (
    <div className="flex min-h-screen bg-[#f7f8f6]">
      <div className="hidden lg:block"><Sidebar activePage={activePage} setActivePage={handleNavigate} /></div>
      {mobileMenuOpen && <div className="fixed inset-0 z-40 bg-[#14231b]/35 lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileMenuOpen(false); }}><div className="h-full w-[min(82vw,280px)] shadow-xl"><Sidebar activePage={activePage} setActivePage={handleNavigate} onClose={() => setMobileMenuOpen(false)} /></div></div>}
      <div className="min-w-0 flex-1">
        <Header title={activeTitle} subtitle={activeSubtitle} onMenu={() => setMobileMenuOpen(true)} />
        <main>
          {storageWarning && <p role="status" className="border-b border-[#f0dfbf] bg-[#fff8e9] px-5 py-2.5 text-center text-[10px] text-[#80643a] sm:px-8">Browser storage is unavailable. Analysis still works, but history won’t persist after you close this page.</p>}
          {fiveWhysOpen && activeProblemBrief ? (
            <FiveWhysWorkspace
              key={activeAnalysisDate}
              problemBrief={activeProblemBrief}
              savedWorkspace={history.find((entry) => entry.date === activeAnalysisDate)?.fiveWhys}
              onReturn={closeFiveWhys}
              onSave={handleSaveFiveWhys}
            />
          ) : (
            <>
              {activePage === "Home" && <HomePage problem={problem} setProblem={setProblem} onAnalyze={handleAnalyze} onVoiceConfirm={handleVoiceConfirm} loading={loading} recommendations={recommendations} analyzedProblem={analyzedProblem} onApply={handleApplyFramework} onNavigate={handleNavigate} diagnostic={diagnostic} diagnosticLoading={diagnosticLoading} diagnosticStage={diagnosticStage} diagnosticError={diagnosticError} />}
              {activePage === "Framework Library" && <LibraryPage onApply={handleApplyFramework} />}
              {activePage === "Analysis History" && <HistoryPage history={history} onReopen={handleReopenHistory} onClear={() => saveHistory([])} />}
              {activePage === "About" && <AboutPage />}
            </>
          )}
        </main>
      </div>
      {selectedFramework && !fiveWhysOpen && <FrameworkModal key={selectedFramework.id} framework={selectedFramework} problem={analyzedProblem || problem.trim()} problemBrief={activeProblemBrief} onClose={() => setSelectedFramework(null)} />}
    </div>
  );
}
