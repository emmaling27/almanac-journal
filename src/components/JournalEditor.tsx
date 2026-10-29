"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import {
  CheckCircle2,
  XCircle,
  Settings,
  Sparkles,
  Feather,
  Check,
  Loader2,
  Lock,
  LogIn,
  Compass,
  Plus,
} from "lucide-react";
import { GoalManagerModal } from "./GoalManagerModal";

interface JournalEditorProps {
  selectedDate: string; // "YYYY-MM-DD"
  onOpenAuth?: () => void;
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

  // Track the last state confirmed saved on the backend or initially loaded
  const lastCommittedRef = useRef<{
    reflection: string;
    goalLogs: Record<string, { met: boolean; note: string }>;
  }>({
    reflection: initialEntry?.reflection || "",
    goalLogs: (() => {
      const logsMap: Record<string, { met: boolean; note: string }> = {};
      for (const log of initialGoalLogs) {
        logsMap[log.goalId] = {
          met: log.met,
          note: log.note,
        };
      }
      return logsMap;
    })(),
  });

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "pending" | "error">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() =>
    initialEntry?.updatedAt
      ? new Date(initialEntry.updatedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Keep latest state in ref to avoid stale closures in timeouts and unmount cleanup
  const latestDataRef = useRef({
    date: selectedDate,
    reflection,
    goalLogs,
    activeGoals,
  });

  latestDataRef.current = {
    date: selectedDate,
    reflection,
    goalLogs,
    activeGoals,
  };

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  const checkHasUnsavedChanges = useCallback(() => {
    const current = latestDataRef.current;
    const committed = lastCommittedRef.current;

    if (current.reflection !== committed.reflection) {
      return true;
    }

    const allGoalIds = new Set([
      ...Object.keys(current.goalLogs),
      ...Object.keys(committed.goalLogs),
    ]);

    for (const id of allGoalIds) {
      const cur = current.goalLogs[id] || { met: false, note: "" };
      const com = committed.goalLogs[id] || { met: false, note: "" };
      if (cur.met !== com.met || cur.note !== com.note) {
        return true;
      }
    }

    return false;
  }, []);

  const performSave = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    if (!checkHasUnsavedChanges()) {
      setSaveStatus("saved");
      setHasUnsavedChanges(false);
      return;
    }

    // Freeze snapshot of what is being committed in this round
    const snapshotDate = latestDataRef.current.date;
    const snapshotReflection = latestDataRef.current.reflection;
    const snapshotGoalLogs = { ...latestDataRef.current.goalLogs };
    const snapshotActiveGoals = latestDataRef.current.activeGoals;

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      const goalIds = new Set<Id<"goals">>();
      snapshotActiveGoals.forEach((g) => goalIds.add(g._id));
      Object.keys(snapshotGoalLogs).forEach((id) => goalIds.add(id as Id<"goals">));

      const formattedGoalLogs = Array.from(goalIds).map((goalId) => {
        const current = snapshotGoalLogs[goalId];
        return {
          goalId,
          met: current?.met ?? false,
          note: current?.note ?? "",
        };
      });

      await saveEntryMutation({
        date: snapshotDate,
        reflection: snapshotReflection,
        goalLogs: formattedGoalLogs,
      });

      // Update committed state to reflect what the server now has
      lastCommittedRef.current = {
        reflection: snapshotReflection,
        goalLogs: snapshotGoalLogs,
      };

      const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastSavedTime(nowTime);

      // Check whether user continued typing while save was in flight
      const stillDirty = checkHasUnsavedChanges();
      if (stillDirty || pendingSaveRef.current) {
        setHasUnsavedChanges(true);
        setSaveStatus("pending");
        pendingSaveRef.current = false;
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          performSave();
        }, 800);
      } else {
        setHasUnsavedChanges(false);
        setSaveStatus("saved");
      }
    } catch (err) {
      console.error("Failed to auto-save journal entry:", err);
      setSaveStatus("error");
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        performSave();
      }
    }
  }, [checkHasUnsavedChanges, saveEntryMutation]);

  const scheduleDebouncedSave = useCallback(() => {
    setHasUnsavedChanges(true);
    setSaveStatus("pending");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      performSave();
    }, 800);
  }, [performSave]);

  const handleReflectionChange = (val: string) => {
    setReflection(val);
    latestDataRef.current.reflection = val;
    scheduleDebouncedSave();
  };

  const handleGoalToggle = (goalId: Id<"goals">, currentMet: boolean) => {
    const updated = {
      ...latestDataRef.current.goalLogs,
      [goalId]: {
        met: !currentMet,
        note: latestDataRef.current.goalLogs[goalId]?.note || "",
      },
    };
    setGoalLogs(updated);
    latestDataRef.current.goalLogs = updated;
    setHasUnsavedChanges(true);

    // Immediately save discrete goal toggle so updates reflect reactively
    performSave();
  };

  const handleGoalNoteChange = (goalId: Id<"goals">, note: string) => {
    const updated = {
      ...latestDataRef.current.goalLogs,
      [goalId]: {
        met: latestDataRef.current.goalLogs[goalId]?.met ?? false,
        note,
      },
    };
    setGoalLogs(updated);
    latestDataRef.current.goalLogs = updated;
    scheduleDebouncedSave();
  };

  const handleBlur = () => {
    if (checkHasUnsavedChanges() && !isSavingRef.current) {
      performSave();
    }
  };

  // Sync external changes ONLY when the field does not have uncommitted local changes
  // and the incoming server data is not just an echo of what we already saved.
  useEffect(() => {
    if (!initialEntry) return;

    const hasLocalReflectionEdits =
      latestDataRef.current.reflection !== lastCommittedRef.current.reflection;

    if (
      !hasLocalReflectionEdits &&
      initialEntry.reflection !== lastCommittedRef.current.reflection
    ) {
      setReflection(initialEntry.reflection);
      latestDataRef.current.reflection = initialEntry.reflection;
      lastCommittedRef.current.reflection = initialEntry.reflection;
    }

    if (initialEntry.updatedAt) {
      setLastSavedTime(
        new Date(initialEntry.updatedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
  }, [initialEntry]);

  useEffect(() => {
    if (!initialGoalLogs) return;

    // Only update individual goal logs from server if that specific goal log has NO uncommitted local edits
    setGoalLogs((prevLogs) => {
      let hasChanges = false;
      const nextLogs = { ...prevLogs };

      for (const log of initialGoalLogs) {
        const localLog = nextLogs[log.goalId] || { met: false, note: "" };
        const committedLog = lastCommittedRef.current.goalLogs[log.goalId] || {
          met: false,
          note: "",
        };

        const hasLocalEdits =
          localLog.met !== committedLog.met || localLog.note !== committedLog.note;
        const isServerDifferent =
          log.met !== committedLog.met || log.note !== committedLog.note;

        if (!hasLocalEdits && isServerDifferent) {
          nextLogs[log.goalId] = {
            met: log.met,
            note: log.note,
          };
          lastCommittedRef.current.goalLogs[log.goalId] = {
            met: log.met,
            note: log.note,
          };
          hasChanges = true;
        }
      }

      if (hasChanges) {
        latestDataRef.current.goalLogs = nextLogs;
        return nextLogs;
      }
      return prevLogs;
    });
  }, [initialGoalLogs]);

  // Flush unsaved changes on unmount or date change
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      const current = latestDataRef.current;
      const committed = lastCommittedRef.current;

      const hasReflectionDiff = current.reflection !== committed.reflection;
      const allGoalIds = new Set([
        ...Object.keys(current.goalLogs),
        ...Object.keys(committed.goalLogs),
      ]);
      let hasGoalsDiff = false;
      for (const id of allGoalIds) {
        const cur = current.goalLogs[id] || { met: false, note: "" };
        const com = committed.goalLogs[id] || { met: false, note: "" };
        if (cur.met !== com.met || cur.note !== com.note) {
          hasGoalsDiff = true;
          break;
        }
      }

      if (hasReflectionDiff || hasGoalsDiff) {
        const goalIds = new Set<Id<"goals">>();
        current.activeGoals.forEach((g) => goalIds.add(g._id));
        Object.keys(current.goalLogs).forEach((id) => goalIds.add(id as Id<"goals">));

        const formattedGoalLogs = Array.from(goalIds).map((goalId) => {
          const currentLog = current.goalLogs[goalId];
          return {
            goalId,
            met: currentLog?.met ?? false,
            note: currentLog?.note ?? "",
          };
        });

        saveEntryMutation({
          date: current.date,
          reflection: current.reflection,
          goalLogs: formattedGoalLogs,
        }).catch((err) => {
          console.error("Failed to flush journal entry on unmount:", err);
        });
      }
    };
  }, [saveEntryMutation]);

  return (
    <div className="space-y-6">
      {/* Editor Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Feather className="w-5 h-5 text-[#B38F4D]" />
          <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#0A192F]">
            Captain&apos;s Log
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#7A6B53] bg-[#EAE2D2]/60 rounded border border-[#D8CFBF]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B38F4D]" />
              <span>Inscribing...</span>
            </span>
          )}

          {saveStatus === "pending" && (
            <button
              type="button"
              onClick={() => performSave()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-amber-900 bg-amber-50 rounded border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
              title="Auto-saving in a moment (click to save immediately)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Saving changes...</span>
            </button>
          )}

          {saveStatus === "error" && (
            <button
              type="button"
              onClick={() => performSave()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-red-700 bg-red-50 rounded border border-red-300 hover:bg-red-100 transition-colors cursor-pointer"
              title="Click to retry saving"
            >
              <span>Save failed &bull; Click to retry</span>
            </button>
          )}

          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#5B6B7A] bg-[#FAF7F0] rounded border border-[#E3DAC9]">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lastSavedTime ? `Saved at ${lastSavedTime}` : "Auto-saved"}</span>
            </span>
          )}

          <button
            type="button"
            onClick={onOpenGoalModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-[#D8CFBF] hover:bg-[#EAE2D2] text-[#0A192F] transition-colors"
            title="Configure tracking goals"
          >
            <Settings className="w-3.5 h-3.5 text-[#7A6B53]" />
            <span>Manage Goals</span>
          </button>
        </div>
      </div>

      {/* Main Journal Reflection Card */}
      <div className="tidelog-card rounded-lg p-5 sm:p-6 shadow-sm border border-[#D8CFBF]">
        <div className="group space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#7A6B53] group-focus-within:text-[#0A192F] transition-colors">
            <span className="uppercase tracking-wider group-focus-within:font-semibold">
              General Daily Thoughts & Environmental Observations
            </span>
            <span>{reflection.length} characters</span>
          </div>

          <textarea
            value={reflection}
            onChange={(e) => handleReflectionChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="Record the currents of the day... What stirred your thoughts? How did the weather or rhythm of the Bay meet you today? Note any shifts in tide, spirit, or project work."
            rows={7}
            className="w-full p-4 rounded-md bg-[#FDFBF7] text-[#142334] font-serif text-base leading-relaxed border border-[#DFD7C7] hover:border-[#9A8F7D] placeholder:text-[#9A8F7D] focus:outline-none focus:border-[#0A192F] focus:ring-2 focus:ring-[#0A192F]/20 focus:bg-white resize-y shadow-inner transition-all"
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
        </div>

        {activeGoals.length === 0 ? (
          <div className="tidelog-card rounded-lg p-6 sm:p-8 text-center space-y-4 border border-dashed border-[#C8BEAE] bg-[#FAF8F3]">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#EAE2D2] flex items-center justify-center text-[#B38F4D]">
              <Compass className="w-5 h-5" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="font-serif font-bold text-base text-[#0A192F]">
                No Personal Goals Plotted Yet
              </h4>
              <p className="text-xs font-mono text-[#5B6B7A] leading-relaxed">
                Add your own goals, habits, or creative intentions to track alongside the daily tidal and lunar rhythms.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenGoalModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider rounded bg-[#0A192F] hover:bg-[#1E3A5F] text-[#FAF7F0] transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#DFC898]" />
              <span>Plot Your First Goal</span>
            </button>
          </div>
        ) : (
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
                    <div className="space-y-1 pt-1 group">
                      <label className="block text-[11px] font-mono text-[#7A6B53] group-focus-within:text-[#0A192F] group-focus-within:font-semibold uppercase tracking-wider transition-colors">
                        Observations & Context
                      </label>
                      <textarea
                        value={currentLog.note}
                        onChange={(e) =>
                          handleGoalNoteChange(goal._id, e.target.value)
                        }
                        onBlur={handleBlur}
                        placeholder={
                          isMet
                            ? `Detail how you practiced ${goal.name.toLowerCase()} today...`
                            : `What hindered or shifted your focus from ${goal.name.toLowerCase()}?`
                        }
                        rows={3}
                        className="w-full p-2.5 text-base sm:text-xs font-serif bg-white rounded border border-[#DFD7C7] hover:border-[#9A8F7D] text-[#0A192F] focus:outline-none focus:border-[#0A192F] focus:ring-2 focus:ring-[#0A192F]/20 resize-none placeholder:text-[#9A8F7D] shadow-2xs focus:shadow-sm transition-all"
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
        )}
      </div>
    </div>
  );
}

export function JournalEditor({ selectedDate, onOpenAuth }: JournalEditorProps) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const rawGoals = useQuery(api.goals.getGoals, { onlyActive: true });
  const activeGoals = useMemo(() => rawGoals || [], [rawGoals]);
  const entryData = useQuery(api.journal.getEntryByDate, { date: selectedDate });
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="tidelog-card rounded-lg p-8 text-center text-xs font-mono text-[#7A6B53] flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#B38F4D]" />
        <span>Verifying journal credentials...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="tidelog-card rounded-lg p-8 sm:p-12 shadow-sm border border-[#D8CFBF] text-center space-y-4 bg-[#FAF7F0]">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#EAE2D2] flex items-center justify-center text-[#B38F4D] border border-[#D8CFBF]">
          <Lock className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-xl font-serif font-bold text-[#0A192F]">
            Captain&apos;s Log & Goals Locked
          </h3>
          <p className="text-xs font-mono text-[#5B6B7A] leading-relaxed">
            Personal reflections and daily navigational goals are private to your journal. Sign in or create an account to record your reflections, log daily habits, and sync across your devices.
          </p>
        </div>
        {onOpenAuth && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A192F] hover:bg-[#1E3A5F] text-[#FAF7F0] text-xs font-mono font-semibold uppercase tracking-wider rounded transition-colors shadow-sm cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-[#DFC898]" />
            <span>Sign In / Create Account</span>
          </button>
        )}
      </div>
    );
  }

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
        key={selectedDate}
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
