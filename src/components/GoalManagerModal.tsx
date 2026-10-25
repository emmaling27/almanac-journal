"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { X, Plus, Check, Compass } from "lucide-react";

interface GoalManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#2563EB", // Nautical Blue
  "#059669", // Seafoam Emerald
  "#D97706", // Amber / Brass
  "#7C3AED", // Royal Purple
  "#DC2626", // Port Wine Red
  "#0D9488", // Ocean Teal
];

export function GoalManagerModal({ isOpen, onClose }: GoalManagerModalProps) {
  const goals = useQuery(api.goals.getGoals, {}) || [];
  const addGoal = useMutation(api.goals.addGoal);
  const toggleGoalActive = useMutation(api.goals.toggleGoalActive);

  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await addGoal({
        name: newGoalName.trim(),
        description: newGoalDesc.trim() || undefined,
        color: selectedColor,
      });
      setNewGoalName("");
      setNewGoalDesc("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to add goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: Id<"goals">, currentActive: boolean) => {
    try {
      await toggleGoalActive({ id, active: !currentActive });
    } catch (err) {
      console.error("Failed to toggle goal:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-[#FAF7F0] border-2 border-[#B38F4D] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-6 text-[#0A192F]">
        <div className="flex items-center justify-between border-b border-[#E3DAC9] pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#B38F4D]" />
            <h3 className="text-xl font-serif font-bold text-[#0A192F]">
              Navigational Goals & Intentions
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#EAE2D2] text-[#5B6B7A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Goals List */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#7A6B53]">
            Active Tracking List ({goals.length})
          </h4>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {goals.map((g) => (
              <div
                key={g._id}
                className="flex items-center justify-between p-2.5 rounded bg-white border border-[#E3DAC9]"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: g.color || "#0A192F" }}
                  />
                  <div>
                    <span className="font-serif font-semibold text-sm text-[#0A192F]">
                      {g.name}
                    </span>
                    {g.description && (
                      <p className="text-xs text-[#5B6B7A] line-clamp-1">
                        {g.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(g._id, g.active)}
                  className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition-colors ${
                    g.active
                      ? "bg-[#EBF3FC] text-[#0E3D75] border border-[#B7D4F5]"
                      : "bg-gray-100 text-gray-500 border border-gray-200"
                  }`}
                >
                  {g.active ? "Active" : "Archived"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Goal Form */}
        <form onSubmit={handleAddGoal} className="border-t border-[#E3DAC9] pt-4 space-y-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#7A6B53]">
            Plot New Goal
          </h4>

          {errorMsg && (
            <p className="text-xs font-mono text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {errorMsg}
            </p>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-[#5B6B7A] mb-1">
                Goal Name
              </label>
              <input
                type="text"
                placeholder="e.g. Physical Vitality, Deep Reading, Mindfulness"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                required
                className="w-full px-3 py-2 text-base sm:text-sm bg-white border border-[#D8CFBF] rounded focus:outline-none focus:ring-1 focus:ring-[#B38F4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#5B6B7A] mb-1">
                Description / Practice Focus (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Taking time to exercise, compose music, or observe nature"
                value={newGoalDesc}
                onChange={(e) => setNewGoalDesc(e.target.value)}
                className="w-full px-3 py-2 text-base sm:text-sm bg-white border border-[#D8CFBF] rounded focus:outline-none focus:ring-1 focus:ring-[#B38F4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#5B6B7A] mb-1.5">
                Chart Accent Color
              </label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                  >
                    {selectedColor === color && (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider rounded border border-[#D8CFBF] hover:bg-[#EAE2D2] text-[#0A192F]"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newGoalName.trim()}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider font-semibold rounded bg-[#0A192F] hover:bg-[#1E3A5F] text-[#FAF7F0] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Goal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
