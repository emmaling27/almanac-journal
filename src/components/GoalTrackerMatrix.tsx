"use client";

import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, subDays, parseISO } from "date-fns";
import {
  TrendingUp,
  Award,
  Sparkles,
} from "lucide-react";

interface GoalTrackerMatrixProps {
  selectedDate: string;
  todayStr: string;
  onSelectDate: (date: string) => void;
}

export function GoalTrackerMatrix({
  selectedDate,
  todayStr,
  onSelectDate,
}: GoalTrackerMatrixProps) {
  const rawGoals = useQuery(api.goals.getGoals, {});
  const rawLogs = useQuery(api.journal.getAllGoalLogs, {});

  const goals = useMemo(() => rawGoals || [], [rawGoals]);
  const allLogs = useMemo(() => rawLogs || [], [rawLogs]);

  // Generate last 14 days dates array ending today (or selected date)
  const days = useMemo(() => {
    const list = [];
    const baseDate = todayStr ? parseISO(todayStr) : new Date(2026, 9, 21);
    for (let i = 13; i >= 0; i--) {
      const d = subDays(baseDate, i);
      list.push(format(d, "yyyy-MM-dd"));
    }
    return list;
  }, [todayStr]);

  // Map of date+goalId -> log
  const logsMap = useMemo(() => {
    const map = new Map<string, (typeof allLogs)[0]>();
    for (const log of allLogs) {
      map.set(`${log.date}_${log.goalId}`, log);
    }
    return map;
  }, [allLogs]);

  // Calculate streaks and completion rates per goal
  const goalStats = useMemo(() => {
    return goals.map((g) => {
      let metCount = 0;
      let loggedCount = 0;
      let streak = 0;
      let countingStreak = true;

      // Check days in reverse order for streak
      for (let i = days.length - 1; i >= 0; i--) {
        const d = days[i];
        const log = logsMap.get(`${d}_${g._id}`);
        if (log) {
          loggedCount++;
          if (log.met) {
            metCount++;
            if (countingStreak) streak++;
          } else {
            countingStreak = false;
          }
        } else {
          // If no log recorded, break current streak
          if (i === days.length - 1) {
            // today may not be filled yet, don't immediately kill streak if yesterday was met
            continue;
          }
          countingStreak = false;
        }
      }

      const rate = loggedCount > 0 ? Math.round((metCount / loggedCount) * 100) : 0;
      return {
        goalId: g._id,
        name: g.name,
        color: g.color || "#0A192F",
        streak,
        rate,
        metCount,
      };
    });
  }, [goals, days, logsMap]);

  return (
    <div className="tidelog-card rounded-lg p-5 sm:p-6 shadow-sm border border-[#D8CFBF] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3DAC9] gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#0A192F]" />
          <div>
            <h3 className="text-xl font-serif font-bold tracking-tight text-[#0A192F]">
              Navigational Rhythm & Habit Matrix
            </h3>
            <p className="text-xs text-[#5B6B7A] font-mono">
              14-Day Trajectory • Click any date column to review historical entry
            </p>
          </div>
        </div>

        {/* Stats Summary Chips */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 bg-[#FAF7F0] rounded border border-[#E3DAC9]">
            <Award className="w-3.5 h-3.5 text-[#B38F4D]" />
            <span className="text-[#5B6B7A]">Total Recorded:</span>
            <span className="font-bold text-[#0A192F]">{allLogs.length}</span>
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto pb-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="py-2.5 px-3 text-xs font-mono uppercase tracking-wider text-[#7A6B53] border-b border-[#E3DAC9] min-w-[140px]">
                Navigational Goal
              </th>
              {days.map((d) => {
                const dateObj = parseISO(d);
                const isSelected = d === selectedDate;
                const isToday = d === todayStr;

                return (
                  <th
                    key={d}
                    onClick={() => onSelectDate(d)}
                    className={`py-2 px-1 text-center cursor-pointer transition-colors border-b border-[#E3DAC9] ${
                      isSelected
                        ? "bg-[#0A192F] text-[#FAF7F0] rounded-t"
                        : "hover:bg-[#EAE2D2] text-[#5B6B7A]"
                    }`}
                    title={`Click to open journal for ${d}`}
                  >
                    <div className="text-[10px] font-mono uppercase">
                      {format(dateObj, "EEE")}
                    </div>
                    <div
                      className={`text-xs font-mono font-bold ${
                        isSelected
                          ? "text-[#DFC898]"
                          : isToday
                          ? "text-[#0A192F] underline decoration-[#B38F4D]"
                          : "text-[#5B6B7A]"
                      }`}
                    >
                      {format(dateObj, "d")}
                    </div>
                  </th>
                );
              })}
              <th className="py-2 px-3 text-right text-xs font-mono uppercase tracking-wider text-[#7A6B53] border-b border-[#E3DAC9]">
                Streak
              </th>
            </tr>
          </thead>
          <tbody>
            {goals.map((g) => {
              const stats = goalStats.find((s) => s.goalId === g._id);

              return (
                <tr
                  key={g._id}
                  className="hover:bg-[#F6F3EC]/70 transition-colors border-b border-[#EAE2D2]/60"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: g.color || "#0A192F" }}
                      />
                      <span className="font-serif font-bold text-sm text-[#0A192F]">
                        {g.name}
                      </span>
                    </div>
                  </td>

                  {days.map((d) => {
                    const log = logsMap.get(`${d}_${g._id}`);
                    const isSelected = d === selectedDate;

                    return (
                      <td
                        key={d}
                        onClick={() => onSelectDate(d)}
                        className={`py-2 px-1 text-center cursor-pointer transition-colors ${
                          isSelected ? "bg-[#0A192F]/5" : ""
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          {log ? (
                            log.met ? (
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-2xs hover:scale-125 transition-transform"
                                style={{ backgroundColor: g.color || "#10B981" }}
                                title={`${g.name} met on ${d}${
                                  log.note ? `: "${log.note}"` : ""
                                }`}
                              >
                                ✓
                              </div>
                            ) : (
                              <div
                                className="w-5 h-5 rounded-full border border-gray-300 bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] hover:scale-110 transition-transform"
                                title={`${g.name} not met on ${d}${
                                  log.note ? `: "${log.note}"` : ""
                                }`}
                              >
                                •
                              </div>
                            )
                          ) : (
                            <div
                              className="w-2 h-2 rounded-full bg-gray-200"
                              title={`No log for ${d}`}
                            />
                          )}
                        </div>
                      </td>
                    );
                  })}

                  <td className="py-3 px-3 text-right">
                    <span className="font-mono text-xs font-bold text-[#0A192F] bg-[#FAF7F0] px-2 py-0.5 rounded border border-[#E3DAC9]">
                      {stats?.streak ?? 0}d
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AI Readiness & Explanation Callout */}
      <div className="bg-[#FAF7F0] p-4 rounded-lg border border-[#E3DAC9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#5B6B7A]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#B38F4D] shrink-0" />
          <span>
            <strong className="text-[#0A192F] font-serif">
              Relational Storage Schema Active:
            </strong>{" "}
            Every daily outcome and explanation is indexed by <code className="font-mono text-[11px] text-[#0A192F]">goalId</code>, enabling contextual pattern analysis against tides, lunar cycles, and personal rhythms.
          </span>
        </div>
      </div>
    </div>
  );
}
