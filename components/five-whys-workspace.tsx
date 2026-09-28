"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  FileText,
  Target,
} from "lucide-react";
import { useState } from "react";
import {
  createFiveWhysWorkspace,
  type FiveWhysWorkspaceData,
} from "@/lib/five-whys";
import { type ProblemBrief } from "@/lib/problem-brief";

const whyPrompts = [
  "Why is this problem happening?",
  "Why does that happen?",
  "Why does that happen?",
  "Why does that happen?",
  "Why does that happen?",
];

type Props = {
  problemBrief: ProblemBrief;
  savedWorkspace?: FiveWhysWorkspaceData;
  onReturn: () => void;
  onSave: (workspace: FiveWhysWorkspaceData) => Promise<void>;
};

export function FiveWhysWorkspace({
  problemBrief,
  savedWorkspace,
  onReturn,
  onSave,
}: Props) {
  const [workspace, setWorkspace] = useState(() =>
    createFiveWhysWorkspace(problemBrief, savedWorkspace),
  );
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showBrief, setShowBrief] = useState(false);
  const confirmedBrief = workspace.problemBrief;

  const updateAnswer = (index: number, key: "answer" | "evidence", value: string) => {
    setWorkspace((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) =>
        answerIndex === index ? { ...answer, [key]: value } : answer,
      ),
    }));
  };

  const updatePlan = (
    key: "rootCause" | "countermeasure" | "owner" | "targetDate",
    value: string,
  ) => {
    setWorkspace((current) => ({ ...current, [key]: value }));
  };

  const saveAndReturn = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await onSave({ ...workspace, completedAt: new Date().toISOString() });
      onReturn();
    } catch {
      setSaveError("The 5 Whys could not be saved to this device. Try again.");
      setSaving(false);
    }
  };

  const isActionPlan = step === whyPrompts.length;
  const currentAnswer = workspace.answers[step];

  return (
    <div className="mx-auto max-w-[900px] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onReturn}
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-medium text-[#6f7d73] hover:bg-white"
        >
          <ArrowLeft size={14} /> Return to analysis
        </button>
        {workspace.completedAt && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5ef] px-2.5 py-1 text-[9px] font-semibold text-[#3f7950]">
            <Check size={12} /> Previously saved
          </span>
        )}
      </div>

      <section className="overflow-hidden rounded-[16px] border border-[#e3ebe4] bg-white shadow-[0_7px_26px_rgba(42,79,53,0.045)]">
        <header className="border-b border-[#e9ede9] bg-[#f0f5ef] px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e2efe5] text-[22px] font-semibold text-[#28734d]">↳</div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[1px] text-[#66836d]">Interactive framework workspace</p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.5px] text-[#2d4034]">5 Whys</h2>
              <p className="mt-1 text-[10px] leading-[1.6] text-[#718076]">Follow the evidence one step at a time. A cause is not established until you can support it.</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-[#dfe9e0] bg-white px-4 py-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.6px] text-[#66816d]">
              <Target size={12} /> Confirmed problem statement
            </div>
            <label htmlFor="five-whys-problem" className="sr-only">Problem statement for this 5 Whys</label>
            <textarea
              id="five-whys-problem"
              value={workspace.workingProblemStatement}
              onChange={(event) => setWorkspace((current) => ({ ...current, workingProblemStatement: event.target.value }))}
              rows={2}
              maxLength={2000}
              className="mt-1 w-full resize-y rounded-md border border-transparent bg-transparent p-1 text-[13px] font-medium leading-[1.6] text-[#35473b] outline-none hover:border-[#e4ebe4] focus:border-[#83ab8d] focus:bg-white"
            />
            <button
              onClick={() => setShowBrief((visible) => !visible)}
              aria-expanded={showBrief}
              className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-medium text-[#4d7d59] hover:underline"
            >
              <FileText size={12} /> {showBrief ? "Hide" : "View"} confirmed Problem Brief
            </button>
            {showBrief && (
              <dl className="mt-3 grid gap-x-5 gap-y-2 border-t border-[#edf0ed] pt-3 sm:grid-cols-2">
                {Object.entries(confirmedBrief).map(([key, value]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-[8px] font-semibold uppercase tracking-[0.45px] text-[#839087]">
                      {key.replace(/[A-Z]/g, (letter) => ` ${letter}`).trim()}
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-[9px] leading-[1.55] text-[#657369]">{value}</dd>
                  </div>
                ))}
                <p className="sm:col-span-2 text-[8px] text-[#9aa39c]">Original confirmed brief, kept with this analysis. Edit the working problem statement above if needed.</p>
              </dl>
            )}
          </div>
        </header>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-[9px] font-medium text-[#748178]">
              <span>{isActionPlan ? "Action plan" : `Why ${step + 1} of 5`}</span>
              <span>{isActionPlan ? "Finish the investigation" : `${step + 1} / 5`}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#edf1ed]">
              <div className="h-full rounded-full bg-[#4e8a5e] transition-all" style={{ width: `${((step + 1) / 6) * 100}%` }} />
            </div>
          </div>

          {!isActionPlan && currentAnswer && (
            <div className="fade-in">
              {step > 0 && workspace.answers[step - 1].answer.trim() && (
                <div className="mb-4 rounded-lg border border-[#e6ece6] bg-[#f8faf8] px-3 py-2.5">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.55px] text-[#839087]">Your previous answer · Why {step}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[10px] leading-[1.6] text-[#5f6e63]">{workspace.answers[step - 1].answer}</p>
                </div>
              )}
              <label htmlFor="five-whys-answer" className="block text-[15px] font-semibold text-[#35473b]">
                {whyPrompts[step]}
              </label>
              <p className="mt-1 text-[9px] text-[#8b968e]">Use an observed reason. If you are unsure, note what still needs checking.</p>
              <label htmlFor="five-whys-answer" className="mt-4 block text-[9px] font-semibold text-[#69786e]">Your answer</label>
              <textarea
                id="five-whys-answer"
                value={currentAnswer.answer}
                onChange={(event) => updateAnswer(step, "answer", event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Record what you know. Leave it blank if you don’t know yet."
                className="mt-1.5 w-full resize-y rounded-lg border border-[#dfe7df] bg-white p-3 text-[11px] leading-[1.7] text-[#46554b] outline-none focus:border-[#83ab8d]"
              />
              <label htmlFor="five-whys-evidence" className="mt-4 flex items-center gap-1.5 text-[9px] font-semibold text-[#69786e]">
                <ClipboardList size={12} /> Evidence or notes <span className="font-normal text-[#9aa39c]">· optional</span>
              </label>
              <textarea
                id="five-whys-evidence"
                value={currentAnswer.evidence}
                onChange={(event) => updateAnswer(step, "evidence", event.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="What observation, record, or example supports this answer?"
                className="mt-1.5 w-full resize-y rounded-lg border border-[#e6ebe6] bg-[#fbfcfb] p-3 text-[10px] leading-[1.65] text-[#59675e] outline-none focus:border-[#a4c2a9]"
              />
            </div>
          )}

          {isActionPlan && (
            <div className="fade-in">
              <h3 className="text-[15px] font-semibold text-[#35473b]">What will you do next?</h3>
              <p className="mt-1 text-[9px] leading-[1.6] text-[#8b968e]">Only record a root cause when your investigation supports it. These fields are your decisions, not system-generated suggestions.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-[9px] font-semibold text-[#69786e]">Root cause <span className="font-normal text-[#929d94]">· leave blank if not established</span></span>
                  <textarea value={workspace.rootCause} onChange={(event) => updatePlan("rootCause", event.target.value)} rows={2} maxLength={2000} placeholder="Not established" className="mt-1.5 w-full resize-y rounded-lg border border-[#dfe7df] bg-white p-3 text-[10px] leading-[1.65] text-[#46554b] outline-none focus:border-[#83ab8d]" />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-[9px] font-semibold text-[#69786e]">Countermeasure / action</span>
                  <textarea value={workspace.countermeasure} onChange={(event) => updatePlan("countermeasure", event.target.value)} rows={2} maxLength={2000} placeholder="What action will address the verified cause?" className="mt-1.5 w-full resize-y rounded-lg border border-[#dfe7df] bg-white p-3 text-[10px] leading-[1.65] text-[#46554b] outline-none focus:border-[#83ab8d]" />
                </label>
                <label>
                  <span className="text-[9px] font-semibold text-[#69786e]">Owner</span>
                  <input value={workspace.owner} onChange={(event) => updatePlan("owner", event.target.value)} maxLength={200} placeholder="Name or role" className="mt-1.5 h-10 w-full rounded-lg border border-[#dfe7df] bg-white px-3 text-[10px] text-[#46554b] outline-none focus:border-[#83ab8d]" />
                </label>
                <label>
                  <span className="text-[9px] font-semibold text-[#69786e]">Target date</span>
                  <input type="date" value={workspace.targetDate} onChange={(event) => updatePlan("targetDate", event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#dfe7df] bg-white px-3 text-[10px] text-[#46554b] outline-none focus:border-[#83ab8d]" />
                </label>
              </div>
              <p className="mt-3 rounded-lg bg-[#f7f9f7] px-3 py-2 text-[9px] leading-[1.6] text-[#78847b]">
                <strong className="font-semibold text-[#647267]">Your information:</strong> all answers and actions above are entered by you. The workspace does not infer or recommend a root cause.
              </p>
            </div>
          )}

          {saveError && <p role="alert" className="mt-4 rounded-lg bg-[#fff4f1] px-3 py-2 text-[9px] text-[#a14c43]">{saveError}</p>}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e9ede9] bg-[#fcfdfc] px-5 py-3.5 sm:px-7">
          <button
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0 || saving}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#e2e8e2] bg-white px-3 text-[10px] font-semibold text-[#68776d] hover:bg-[#f7f9f7] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ArrowLeft size={13} /> Back
          </button>
          {isActionPlan ? (
            <button onClick={saveAndReturn} disabled={saving} className="flex h-9 items-center gap-1.5 rounded-lg bg-[#28734d] px-3.5 text-[10px] font-semibold text-white hover:bg-[#1e603f] disabled:opacity-60">
              {saving ? "Saving…" : <>Save & return to analysis <Check size={13} /></>}
            </button>
          ) : (
            <button onClick={() => setStep((current) => Math.min(whyPrompts.length, current + 1))} className="flex h-9 items-center gap-1.5 rounded-lg bg-[#28734d] px-3.5 text-[10px] font-semibold text-white hover:bg-[#1e603f]">
              Continue <ArrowRight size={13} />
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
