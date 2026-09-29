"use client";

import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Zap,
  Timer,
  ShieldAlert,
  Loader2,
  Calculator,
} from "lucide-react";
import { calculateCorrectAnswerScore, calculateWrongAnswerScore } from "@/lib/scoring";

interface SettingsForm {
  quizTitle: string;
  quizDescription: string;
  basePoints: number;
  gracePeriodSeconds: number;
  pointsPerSecond: number;
  minimumCorrectPoints: number;
  negativeMarkingEnabled: boolean;
  negativePoints: number;
  allowNegativeTotal: boolean;
  quizEnabled: boolean;
}

export default function AdminSettingsPage() {
  const [formData, setFormData] = useState<SettingsForm>({
    quizTitle: "",
    quizDescription: "",
    basePoints: 100,
    gracePeriodSeconds: 5,
    pointsPerSecond: 1,
    minimumCorrectPoints: 0,
    negativeMarkingEnabled: false,
    negativePoints: 10,
    allowNegativeTotal: false,
    quizEnabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (res.ok && data.settings) {
          setFormData({
            quizTitle: data.settings.quizTitle,
            quizDescription: data.settings.quizDescription,
            basePoints: data.settings.basePoints,
            gracePeriodSeconds: data.settings.gracePeriodSeconds,
            pointsPerSecond: data.settings.pointsPerSecond,
            minimumCorrectPoints: data.settings.minimumCorrectPoints,
            negativeMarkingEnabled: data.settings.negativeMarkingEnabled,
            negativePoints: data.settings.negativePoints,
            allowNegativeTotal: data.settings.allowNegativeTotal,
            quizEnabled: data.settings.quizEnabled,
          });
        }
      } catch (err) {
        console.error(err);
        setErrorMessage("Failed to load current settings.");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update settings.");
      } else {
        setSuccessMessage("Settings updated successfully! Changes are live across the system.");
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error updating settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading system settings...</p>
      </div>
    );
  }

  // Live simulation table for current settings
  const simulatedTimes = [1, 3, 5, 6, 7, 10, 20, 50, 100];

  return (
    <div className="max-w-4xl space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Quiz &amp; Scoring Settings</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure quiz title, speed deduction parameters, and negative marking rules.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: General Info */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-indigo-400" />
            General Information
          </h2>

          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Quiz Title:
              </label>
              <input
                type="text"
                required
                value={formData.quizTitle}
                onChange={(e) => setFormData({ ...formData, quizTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Quiz Instructions &amp; Description:
              </label>
              <textarea
                rows={3}
                required
                value={formData.quizDescription}
                onChange={(e) =>
                  setFormData({ ...formData, quizDescription: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
              <div>
                <span className="font-bold text-white block">Quiz Availability</span>
                <span className="text-xs text-slate-400">
                  Allow participants to start new attempts
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.quizEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, quizEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Time-Based Scoring Config */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-400" />
            Speed &amp; Time-Based Scoring Rules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Base Points per Correct Answer:
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.basePoints}
                onChange={(e) =>
                  setFormData({ ...formData, basePoints: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Standard max points awarded for answering in grace period (Default: 100)
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Grace Period (Seconds):
              </label>
              <input
                type="number"
                min={0}
                required
                value={formData.gracePeriodSeconds}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gracePeriodSeconds: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Time window with zero deduction (Default: 5)
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Points Deducted per Second:
              </label>
              <input
                type="number"
                min={0}
                required
                value={formData.pointsPerSecond}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pointsPerSecond: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Points subtracted for each second beyond grace period (Default: 1)
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Minimum Points for Correct Answer:
              </label>
              <input
                type="number"
                min={0}
                required
                value={formData.minimumCorrectPoints}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minimumCorrectPoints: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Lowest points a correct answer can earn (Default: 0)
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Negative Marking */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Negative Marking Policies
          </h2>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
              <div>
                <span className="font-bold text-white block">Enable Negative Marking</span>
                <span className="text-xs text-slate-400">
                  Deduct points when a participant chooses an incorrect answer
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.negativeMarkingEnabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      negativeMarkingEnabled: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>

            {formData.negativeMarkingEnabled && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Penalty Points Deducted per Wrong Answer:
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={formData.negativePoints}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      negativePoints: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full max-w-xs px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Example: 10 means -10 points on wrong answer
                </span>
              </div>
            )}

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
              <div>
                <span className="font-bold text-white block">Allow Negative Total Score</span>
                <span className="text-xs text-slate-400">
                  If OFF, overall cumulative total score will never drop below 0 (Default: OFF)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowNegativeTotal}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allowNegativeTotal: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Live Simulation Sandbox */}
        <div className="p-6 rounded-3xl bg-indigo-950/20 border border-indigo-900/40 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">
              Live Scoring Simulator (Verification of Current Inputs)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Real-time projection showing exactly how answers will be scored based on your current inputs above:
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 text-center text-xs">
            {simulatedTimes.map((sec) => {
              const pts = calculateCorrectAnswerScore(sec, formData);
              return (
                <div
                  key={sec}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800"
                >
                  <div className="text-slate-400 text-[10px]">{sec}s</div>
                  <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                    +{pts}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 pt-1">
            Wrong Answer Penalty:{" "}
            <strong className="text-rose-400 font-mono">
              {calculateWrongAnswerScore(formData)} pts
            </strong>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
