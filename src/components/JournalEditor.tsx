"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import {
  CheckCircle2,
  XCircle,
  Save,
  Settings,
  Sparkles,
  Feather,
  Check,
  Loader2,
} from "lucide-react";
import { GoalManagerModal } from "./GoalManagerModal";

interface JournalEditorProps {
  selectedDate: string; // "YYYY-MM-DD"
}

interface JournalEditorFormProps {
  selectedDate: string;
  initialEntry: Doc<"journal_entries"> | null;
  initialGoalLogs: Doc<"goal_logs">[];
  activeGoals: Doc<"goals">[];
  onOpenGoalModal: () => void;
}

function JournalEditorForm({
  selectedDate,
  initialEntry,
  initialGoalLogs,
  activeGoals,
  onOpenGoalModal,
}: JournalEditorFormProps) {
  const saveEntryMutation = useMutation(api.journal.saveEntry);

  const [reflection, setReflection] = useState(() => initialEntry?.reflection || "");
  const [goalLogs, setGoalLogs] = useState<
    Record<string, { met: boolean; note: string }>
  >(() => {
    const logsMap: Record<string, { met: boolean; note: string }> = {};
    for (const log of initialGoalLogs) {
      logsMap[log.goalId] = {
        met: log.met,
        note: log.note,
      };
    }
    return logsMap;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() =>
    initialEntry?.updatedAt
      ? new Date(initialEntry.updatedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleReflectionChange = (val: string) => {
    setReflection(val);
    setHasUnsavedChanges(true);
  };

  const handleGoalToggle = (goalId: Id<"goals">, currentMet: boolean) => {
    setGoalLogs((prev) => ({
      ...prev,
      [goalId]: {
        met: !currentMet,
        note: prev[goalId]?.note || "",
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleGoalNoteChange = (goalId: Id<"goals">, note: string) => {
    setGoalLogs((prev) => ({
      ...prev,
      [goalId]: {
        met: prev[goalId]?.met ?? false,
        note,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const formattedGoalLogs = activeGoals.map((g) => {
        const current = goalLogs[g._id];
        return {
          goalId: g._id,
          met: current?.met ?? false,
          note: current?.note ?? "",
        };
      });

      await saveEntryMutation({
        date: selectedDate,
        reflection,
        goalLogs: formattedGoalLogs,
      });

      setHasUnsavedChanges(false);
      setLastSavedTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (err) {
      console.error("Failed to save journal entry:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editor Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Feather className="w-5 h-5 text-[#B38F4D]" />
          <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#0A192F]">
            Captain&apos;s Log & Reflections
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {lastSavedTime && !hasUnsavedChanges && (
            <span className="text-xs font-mono text-[#5B6B7A] flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Recorded at {lastSavedTime}
            </span>
          )}

          {hasUnsavedChanges && (
            <span className="text-xs font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Unsaved changes
            </span>
          )}

          <button
            onClick={onOpenGoalModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-[#D8CFBF] hover:bg-[#EAE2D2] text-[#0A192F] transition-colors"
            title="Configure tracking goals"
          >
            <Settings className="w-3.5 h-3.5 text-[#7A6B53]" />
            <span>Manage Goals</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider rounded bg-[#0A192F] hover:bg-[#1E3A5F] text-[#FAF7F0] transition-colors disabled:opacity-50 shadow-xs"
          >
            <Save className="w-3.5 h-3.5 text-[#DFC898]" />
            <span>{isSaving ? "Inscribing..." : "Save Log"}</span>
          </button>
        </div>
      </div>

      {/* Main Journal Reflection Card */}
      <div className="tidelog-card rounded-lg p-5 sm:p-6 shadow-sm border border-[#D8CFBF]">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#7A6B53]">
            <span className="uppercase tracking-wider">
              General Daily Thoughts & Environmental Observations
            </span>
            <span>{reflection.length} characters</span>
          </div>

          <textarea
            value={reflection}
            onChange={(e) => handleReflectionChange(e.target.value)}
            placeholder="Record the currents of the day... What stirred your thoughts? How did the weather or rhythm of the Bay meet you today? Note any shifts in tide, spirit, or project work."
            rows={7}
            className="w-full p-4 rounded-md bg-[#FDFBF7] text-[#142334] font-serif text-base leading-relaxed border border-[#DFD7C7] placeholder:text-[#9A8F7D] focus:outline-none focus:ring-1 focus:ring-[#B38F4D] resize-y shadow-inner"
          />
        </div>
      </div>

      {/* Personal Goals Tracking Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E3DAC9] pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#B38F4D]" />
            <h3 className="text-lg font-serif font-bold text-[#0A192F]">
              Daily Navigational Goals
            </h3>
          </div>
          <span className="text-xs font-mono text-[#7A6B53]">
            Context notes stored for AI trajectory analysis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeGoals.map((goal) => {
            const currentLog = goalLogs[goal._id] || { met: false, note: "" };
            const isMet = currentLog.met;

            return (
              <div
                key={goal._id}
                className={`tidelog-card rounded-lg p-4 flex flex-col justify-between transition-all border ${
                  isMet
                    ? "border-emerald-700/40 bg-[#F6FBF7]"
                    : "border-[#DFD7C7] bg-[#FAF8F2]"
                }`}
              >
                <div className="space-y-3">
                  {/* Goal Header & Yes/No Toggle */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: goal.color || "#0A192F" }}
                        />
                        <h4 className="font-serif font-bold text-base text-[#0A192F]">
                          {goal.name}
                        </h4>
                      </div>
                      {goal.description && (
                        <p className="text-xs text-[#5B6B7A] leading-snug">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGoalToggle(goal._id, isMet)}
                      className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 transition-all shadow-2xs ${
                        isMet
                          ? "bg-emerald-800 text-emerald-50 hover:bg-emerald-900"
                          : "bg-[#EAE2D2] text-[#5B6B7A] hover:bg-[#DED4C0]"
                      }`}
                    >
                      {isMet ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Met</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 opacity-60" />
                          <span>Not Yet</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Context / Explanation Note */}
                  <div className="space-y-1 pt-1">
                    <label className="block text-[11px] font-mono text-[#7A6B53] uppercase tracking-wider">
                      Observations & Context (for AI analysis)
                    </label>
                    <textarea
                      value={currentLog.note}
                      onChange={(e) =>
                        handleGoalNoteChange(goal._id, e.target.value)
                      }
                      placeholder={
                        isMet
                          ? `Detail how you practiced ${goal.name.toLowerCase()} today...`
                          : `What hindered or shifted your focus from ${goal.name.toLowerCase()}?`
                      }
                      rows={3}
                      className="w-full p-2.5 text-xs font-serif bg-white rounded border border-[#DFD7C7] text-[#0A192F] focus:outline-none focus:ring-1 focus:ring-[#B38F4D] resize-none placeholder:text-[#9A8F7D]"
                    />
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-[#EAE2D2] flex justify-between items-center text-[10px] font-mono text-[#7A6B53]">
                  <span>Status: {isMet ? "Recorded" : "Pending"}</span>
                  <span className="italic">{goal.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function JournalEditor({ selectedDate }: JournalEditorProps) {
  const rawGoals = useQuery(api.goals.getGoals, { onlyActive: true });
  const activeGoals = useMemo(() => rawGoals || [], [rawGoals]);
  const entryData = useQuery(api.journal.getEntryByDate, { date: selectedDate });
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  if (entryData === undefined) {
    return (
      <div className="tidelog-card rounded-lg p-8 text-center text-xs font-mono text-[#7A6B53] flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#B38F4D]" />
        <span>Loading journal archives...</span>
      </div>
    );
  }

  return (
    <>
      <JournalEditorForm
        key={`${selectedDate}_${entryData.entry?._id ?? "none"}`}
        selectedDate={selectedDate}
        initialEntry={entryData.entry}
        initialGoalLogs={entryData.goalLogs}
        activeGoals={activeGoals}
        onOpenGoalModal={() => setIsGoalModalOpen(true)}
      />

      <GoalManagerModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
      />
    </>
  );
}
