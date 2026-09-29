"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  Zap,
  Timer,
  Trophy,
  Award,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Radio,
} from "lucide-react";

interface SettingsInfo {
  quizTitle: string;
  quizDescription: string;
  basePoints: number;
  gracePeriodSeconds: number;
  pointsPerSecond: number;
  negativeMarkingEnabled: boolean;
  negativePoints: number;
  quizEnabled: boolean;
}

export default function LandingPage() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<"standard" | "live">("standard");
  const [participantName, setParticipantName] = useState("");
  const [liveCode, setLiveCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsInfo | null>(null);

  const handleJoinLive = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = liveCode.trim().toUpperCase();
    const trimmedName = participantName.trim();

    if (!trimmedCode || trimmedCode.length !== 6) {
      setErrorMessage("Please enter a valid 6-character session code.");
      return;
    }

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage("Please enter your name (at least 2 characters).");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/live/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode: trimmedCode,
          participantName: trimmedName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to join live quiz.");
        setLoading(false);
        return;
      }

      // Store reconnection token and participant ID
      if (typeof window !== "undefined" && data.participant) {
        localStorage.setItem(`live_quiz_token_${data.session.id}`, data.token || "");
        localStorage.setItem(`live_quiz_participant_${data.session.id}`, JSON.stringify(data.participant));
        localStorage.setItem(`live_participant_${data.session.id}`, data.participant.id);
        localStorage.setItem(`live_pname_${data.session.id}`, data.participant.name);
        sessionStorage.setItem(`live_participant_${data.session.id}`, data.participant.id);
        sessionStorage.setItem(`live_pname_${data.session.id}`, data.participant.name);
      }

      router.push(`/live/${data.session.id}?participantId=${data.participant.id}`);
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadQuizInfo() {
      try {
        const res = await fetch("/api/quiz/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setFetchingSettings(false);
      }
    }
    loadQuizInfo();
  }, []);

  const handleStartQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = participantName.trim();
    if (!trimmed || trimmed.length < 2) {
      setErrorMessage("Please enter your name (at least 2 characters) to begin.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantName: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to start quiz. Please try again.");
        setLoading(false);
        return;
      }

      // Route to dedicated quiz room
      router.push(`/quiz/${data.attemptId}`);
    } catch (err) {
      console.error(err);
      setErrorMessage("A network error occurred. Please check your connection and retry.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[500px] sm:h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl"
        >
          {/* Top Badge */}
          <div className="flex items-center justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Live Interactive Assessment
            </span>
          </div>

          {/* Title & Description */}
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              {settings?.quizTitle || "NextGen Knowledge Challenge"}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              {settings?.quizDescription ||
                "Test your speed, knowledge, and analytical thinking with real-time scoring and instant feedback!"}
            </p>
          </div>

          {/* Quick Rules Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 text-center">
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col items-center">
              <Zap className="w-5 h-5 text-amber-400 mb-1" />
              <span className="text-[11px] text-slate-400 uppercase tracking-wide">Base Score</span>
              <span className="font-bold text-slate-200 text-sm">
                {settings?.basePoints ?? 100} pts
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col items-center">
              <Timer className="w-5 h-5 text-indigo-400 mb-1" />
              <span className="text-[11px] text-slate-400 uppercase tracking-wide">Grace Period</span>
              <span className="font-bold text-slate-200 text-sm">
                {settings?.gracePeriodSeconds ?? 5} sec
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col items-center">
              <ShieldAlert className="w-5 h-5 text-rose-400 mb-1" />
              <span className="text-[11px] text-slate-400 uppercase tracking-wide">Wrong Answer</span>
              <span className="font-bold text-slate-200 text-sm">
                {settings?.negativeMarkingEnabled
                  ? `-${settings.negativePoints} pts`
                  : "0 pts"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col items-center">
              <Award className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-[11px] text-slate-400 uppercase tracking-wide">Reward</span>
              <span className="font-bold text-slate-200 text-sm">Certificate</span>
            </div>
          </div>

          {/* Instructions Box */}
          <div className="mb-8 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-indigo-400" />
              How Scoring Works:
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>
                Answer within the first <strong className="text-slate-200">{settings?.gracePeriodSeconds ?? 5} seconds</strong> to get the maximum <strong className="text-slate-200">{settings?.basePoints ?? 100} points</strong>.
              </li>
              <li>
                After {settings?.gracePeriodSeconds ?? 5} seconds, <strong className="text-slate-200">{settings?.pointsPerSecond ?? 1} point</strong> is deducted for each additional second.
              </li>
              <li>
                Scores are tracked and validated securely on the server. Answer carefully!
              </li>
            </ul>
          </div>

          {/* Quiz Mode Selector */}
          <div className="flex p-1 bg-slate-800/80 rounded-2xl mb-8 border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setActiveMode("standard");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === "standard"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Standard Quiz</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode("live");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === "live"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Radio className="w-4 h-4 animate-pulse text-emerald-300" />
              <span>Live Presentation Quiz</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Form depending on Active Mode */}
          {activeMode === "live" ? (
            <form onSubmit={handleJoinLive} className="space-y-4">
              <div>
                <label
                  htmlFor="joinCode"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
                >
                  Enter 6-Character Join Code:
                </label>
                <input
                  id="joinCode"
                  type="text"
                  disabled={loading}
                  value={liveCode}
                  onChange={(e) => setLiveCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 font-mono tracking-widest text-lg text-center uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                  maxLength={6}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="liveParticipantName"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
                >
                  Your Name:
                </label>
                <input
                  id="liveParticipantName"
                  type="text"
                  autoComplete="name"
                  disabled={loading}
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                  maxLength={50}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting to Live Presentation...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-5 h-5 animate-pulse" />
                    <span>Join Live Quiz Session</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleStartQuiz} className="space-y-4">
            <div>
              <label
                htmlFor="participantName"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
              >
                Enter Your Full Name to Begin:
              </label>
              <input
                id="participantName"
                type="text"
                autoComplete="name"
                disabled={loading}
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                maxLength={50}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || (settings !== null && !settings.quizEnabled)}
              className="w-full py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Preparing Your Quiz...</span>
                </>
              ) : settings && !settings.quizEnabled ? (
                <span>Quiz Currently Disabled</span>
              ) : (
                <>
                  <span>Start Quiz Now</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          )}

          {/* Bottom helper */}
          <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>No login or registration required</span>
            </div>
            <a
              href="/leaderboard"
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              View Leaderboard
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
