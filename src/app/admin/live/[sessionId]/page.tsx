"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Presentation,
  Users,
  Timer,
  Trophy,
  Play,
  SkipForward,
  Award,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  HelpCircle,
  Flame,
  Crown,
  Medal,
  RefreshCw,
  X,
} from "lucide-react";

interface ParticipantItem {
  id: string;
  participantName: string;
  totalScore: number;
  joinedAt: string;
}

interface QuestionData {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: string;
  explanation?: string;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  thisQuestionPoints: number;
  totalScore: number;
  rankShift: number;
  isNew: boolean;
}

interface LiveSessionState {
  sessionId: string;
  sessionCode: string;
  quizTitle: string;
  status: "WAITING" | "QUESTION_READY" | "QUESTION_ACTIVE" | "LEADERBOARD" | "COMPLETED";
  currentQuestionIndex: number;
  currentQuestionNumber: number;
  totalQuestions: number;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  stateVersion: number;
  participantsCount: number;
  participants?: ParticipantItem[];
  question?: QuestionData;
  answeredCount?: number;
  leaderboard?: {
    top10: LeaderboardEntry[];
    answeredCount: number;
    participantsCount: number;
    questionAverage: number;
  };
}

export default function AdminLivePresentationScreen() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const router = useRouter();

  const [state, setState] = useState<LiveSessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // QR Code
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string>("");
  const [copiedJoinUrl, setCopiedJoinUrl] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 30s Countdown
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audit modal & final results
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditData, setAuditData] = useState<any>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Confirm End Quiz modal
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  // Fetch full state from backend
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${sessionId}/state?admin=true`);
      if (res.ok) {
        const data = await res.json();
        setState(data);
      } else if (res.status === 404) {
        setError("Live session not found.");
      }
    } catch (err) {
      console.error("Failed to load session state:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Fetch QR Code data
  useEffect(() => {
    async function loadQr() {
      try {
        const res = await fetch(`/api/live/sessions/${sessionId}/qr`);
        if (res.ok) {
          const data = await res.json();
          setQrDataUrl(data.qrDataUrl);
          setJoinUrl(data.joinUrl);
        }
      } catch (err) {
        console.error("Failed to load QR code:", err);
      }
    }
    loadQr();
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Real-time synchronization: SSE + Fast Polling Fallback
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource(`/api/live/${sessionId}/stream`);

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === "participant_joined") {
            // Update participant count immediately
            setState((prev) => {
              if (!prev) return prev;
              const newCount = prev.participantsCount + 1;
              const existingParticipants = prev.participants || [];
              const exists = existingParticipants.some((p) => p.id === payload.participantId);
              const updatedParticipants = exists
                ? existingParticipants
                : [
                    ...existingParticipants,
                    {
                      id: payload.participantId,
                      participantName: payload.participantName,
                      totalScore: 0,
                      joinedAt: new Date().toISOString(),
                    },
                  ];
              return {
                ...prev,
                participantsCount: newCount,
                participants: updatedParticipants,
              };
            });
          } else if (payload.type === "answer_submitted") {
            // Increment answered count in active question
            setState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                answeredCount: (prev.answeredCount || 0) + 1,
              };
            });
          } else if (
            payload.type === "state_change" ||
            payload.type === "QUESTION_READY" ||
            payload.type === "QUESTION_ACTIVE" ||
            payload.type === "LEADERBOARD" ||
            payload.type === "COMPLETED"
          ) {
            fetchState();
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      eventSource.onerror = () => {
        // SSE disconnected, fallback polling takes over
        eventSource?.close();
      };
    } catch (err) {
      console.warn("SSE not available, relying on polling:", err);
    }

    // Adaptive micro-poll every 2 seconds
    pollInterval = setInterval(async () => {
      try {
        const syncRes = await fetch(
          `/api/live/${sessionId}/sync?version=${state?.stateVersion || 0}`
        );
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData.changed) {
            fetchState();
          }
        }
      } catch (err) {
        // Silent catch for background poll
      }
    }, 2000);

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, state?.stateVersion, fetchState]);

  // Synchronized 30s Countdown timer calculation
  useEffect(() => {
    if (state?.status === "QUESTION_ACTIVE" && state.questionEndsAt) {
      const updateTimer = () => {
        const now = Date.now();
        const end = new Date(state.questionEndsAt!).getTime();
        const diffMs = end - now;
        const secondsLeft = Math.max(0, Math.ceil(diffMs / 1000));
        setRemainingSeconds(secondsLeft);

        if (secondsLeft === 0) {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 500);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setRemainingSeconds(30);
    }
  }, [state?.status, state?.questionEndsAt]);

  // Trigger celebration confetti on COMPLETED
  useEffect(() => {
    if (state?.status === "COMPLETED") {
      const end = Date.now() + 3.5 * 1000;
      const colors = ["#6366f1", "#a855f7", "#ec4899", "#10b981", "#f59e0b"];

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [state?.status]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  // State Transitions
  const handleTransition = async (targetStatus: string) => {
    if (transitioning) return;
    setTransitioning(true);
    setError(null);

    try {
      const res = await fetch(`/api/live/sessions/${sessionId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update session state.");
      } else {
        await fetchState();
      }
    } catch (err) {
      console.error("Transition failed:", err);
      setError("Failed to execute state transition.");
    } finally {
      setTransitioning(false);
      setConfirmEndOpen(false);
    }
  };

  const copyJoinLink = () => {
    if (joinUrl) {
      navigator.clipboard.writeText(joinUrl);
      setCopiedJoinUrl(true);
      setTimeout(() => setCopiedJoinUrl(false), 2000);
    }
  };

  // Load audit data
  const handleOpenAudit = async () => {
    setLoadingAudit(true);
    setAuditModalOpen(true);
    try {
      const res = await fetch(`/api/live/${sessionId}/results`);
      if (res.ok) {
        const data = await res.json();
        setAuditData(data);
      }
    } catch (err) {
      console.error("Failed to load audit results:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const res = await fetch(`/api/live/${sessionId}/results`);
      if (!res.ok) return;
      const data = await res.json();

      const participants = data.participants || [];
      const headers = ["Rank", "Name", "Total Score", "Correct", "Wrong", "Unanswered", "Joined At"];
      const rows = participants.map((p: any) => [
        p.finalRank || "-",
        `"${p.participantName.replace(/"/g, '""')}"`,
        p.totalScore,
        p.correctCount,
        p.wrongCount,
        p.unansweredCount,
        new Date(p.joinedAt).toLocaleString(),
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `quiz-results-${state?.sessionCode || "live"}-${Date.now()}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-xl font-medium text-slate-300">Loading Live Presentation Session...</p>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Session Error</h2>
        <p className="text-slate-400 max-w-md mb-6">{error}</p>
        <button
          onClick={() => router.push("/admin/live-quiz")}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white transition-colors cursor-pointer"
        >
          Return to Live Sessions
        </button>
      </div>
    );
  }

  const status = state?.status || "WAITING";
  const questionNumber = state?.currentQuestionNumber || 1;
  const totalQuestions = state?.totalQuestions || 10;
  const isLastQuestion = questionNumber >= totalQuestions;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-indigo-500 selection:text-white select-none">
      {/* ============================================================ */}
      {/* PRESENTATION TOP BAR */}
      {/* ============================================================ */}
      <header className="w-full bg-slate-900/90 border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.push("/admin/live-quiz")}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Exit Presentation Mode"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-wide text-white">
                {state?.quizTitle || "Live Presentation Quiz"}
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  status === "WAITING"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : status === "QUESTION_ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse"
                    : status === "LEADERBOARD"
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                    : status === "COMPLETED"
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                {status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span>
                Code: <strong className="font-mono text-indigo-300 tracking-wider text-sm">{state?.sessionCode}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300 font-medium">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                {state?.participantsCount || 0} Joined
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={fetchState}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Force Refresh State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Projector Fullscreen</span>
              </>
            )}
          </button>

          {status !== "COMPLETED" && (
            <button
              onClick={() => setConfirmEndOpen(true)}
              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
            >
              End Session
            </button>
          )}
        </div>
      </header>

      {/* Error alert toast */}
      {error && (
        <div className="bg-rose-500/20 border-b border-rose-500/30 px-6 py-2.5 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* MAIN VIEW AREA (DRIVEN BY SESSION STATE) */}
      {/* ============================================================ */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto w-full justify-center">
        {/* ========================================== */}
        {/* 1. WAITING STATE: LOBBY & QR CODE */}
        {/* ========================================== */}
        {status === "WAITING" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            {/* Left Column: QR Code + Joining Instructions */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                Audience Waiting Room
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
                Join the Live Challenge!
              </h1>
              <p className="text-slate-400 text-base sm:text-lg max-w-md mb-8">
                Scan the QR code on your phone or tablet to join instantly.
              </p>

              {/* QR Code Container */}
              <div className="relative group">
                <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-indigo-500/20 inline-block transform hover:scale-105 transition-transform duration-300">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Join QR Code"
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-2xl"
                    />
                  ) : (
                    <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center text-slate-800 font-bold">
                      Generating QR...
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setQrModalOpen(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer mx-auto"
                >
                  <QrCode className="w-4 h-4 text-indigo-400" />
                  Show Fullscreen QR on Stage
                </button>
              </div>

              {/* Join Code Display */}
              <div className="mt-8 pt-8 border-t border-slate-800/80 w-full flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/60 p-5 rounded-2xl">
                <div className="text-left">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Or Visit On Your Browser:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm sm:text-base text-indigo-300 break-all">
                      {joinUrl || "Loading URL..."}
                    </span>
                    <button
                      onClick={copyJoinLink}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy join link"
                    >
                      {copiedJoinUrl ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-indigo-600/20 border border-indigo-500/30 px-5 py-2.5 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block">
                    Join Code
                  </span>
                  <span className="font-mono text-2xl sm:text-3xl font-black text-white tracking-widest">
                    {state?.sessionCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Participant Roster & Launch Button */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col h-[480px]">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-white">Connected Players</h2>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-sm font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    {state?.participantsCount || 0}
                  </span>
                </div>

                {/* Participant roster list */}
                <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-1">
                  {state?.participants && state.participants.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {state.participants.map((p, idx) => (
                        <motion.span
                          key={p.id}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-sm font-semibold shadow-sm"
                        >
                          <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          {p.participantName}
                        </motion.span>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                      <Users className="w-12 h-12 stroke-[1.5] mb-2 opacity-50" />
                      <p className="text-sm">Waiting for participants to join...</p>
                      <p className="text-xs text-slate-600 mt-1">Their names will pop up right here!</p>
                    </div>
                  )}
                </div>

                {/* Start Quiz Action */}
                <div className="pt-4 border-t border-slate-800">
                  <button
                    onClick={() => handleTransition("QUESTION_READY")}
                    disabled={transitioning}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-lg tracking-wide shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {transitioning ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-6 h-6 fill-white" />
                        <span>Start Quiz (Question 1)</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
                    Questions in this session: {totalQuestions}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* 2. QUESTION_READY STATE: PREVIEW */}
        {/* ========================================== */}
        {status === "QUESTION_READY" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl text-center space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Question {questionNumber} of {totalQuestions} Preview
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              {state?.question?.questionText || "Question preview loading..."}
            </h1>

            <p className="text-slate-400 text-base sm:text-lg">
              Introduce this question to your audience. When ready, click below to initiate the authoritative 30-second live timer!
            </p>

            {/* Admin Peek at correct answer */}
            {state?.question?.correctOption && (
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-left max-w-xl mx-auto text-xs text-indigo-300">
                <span className="font-bold block mb-1">Presenter Key:</span>
                Option {state.question.correctOption} is correct.
                {state.question.explanation && (
                  <p className="text-slate-400 mt-1 italic">{state.question.explanation}</p>
                )}
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={() => handleTransition("QUESTION_ACTIVE")}
                disabled={transitioning}
                className="w-full max-w-md mx-auto py-5 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xl tracking-wide shadow-2xl shadow-indigo-600/40 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {transitioning ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Timer className="w-6 h-6" />
                    <span>Launch 30s Countdown</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* 3. QUESTION_ACTIVE STATE: PROJECTOR SCREEN */}
        {/* ========================================== */}
        {status === "QUESTION_ACTIVE" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-8 w-full max-w-6xl mx-auto"
          >
            {/* Question Header & Live 30s Countdown Meter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-xl">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-400 block mb-1">
                  QUESTION {questionNumber} OF {totalQuestions}
                </span>
                <span className="text-sm text-slate-400">
                  Speed matters! Answering early awards maximum score.
                </span>
              </div>

              {/* Big Digital Countdown Clock */}
              <div className="flex items-center gap-6">
                <div
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl border font-mono font-black text-3xl sm:text-4xl shadow-lg transition-colors ${
                    remainingSeconds <= 5
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-bounce"
                      : remainingSeconds <= 15
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                  }`}
                >
                  <Timer className="w-7 h-7 sm:w-8 sm:h-8" />
                  <span>{remainingSeconds}s</span>
                </div>

                {/* Answer count pill */}
                <div className="bg-slate-800/80 border border-slate-700 px-5 py-3 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Answered
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">
                    {state?.answeredCount || 0} / {state?.participantsCount || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Prominent Question Text */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl text-center">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
                {state?.question?.questionText || "Question..."}
              </h1>
            </div>

            {/* 4 Large High-Contrast Answer Options (Projector Optimized) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Option A: Rose */}
              <div className="flex items-center gap-4 p-6 sm:p-8 rounded-3xl bg-rose-950/40 border-2 border-rose-600/40 hover:border-rose-500/80 transition-all shadow-xl">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-600 flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-lg shadow-rose-600/40 flex-shrink-0">
                  A
                </div>
                <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-100">
                  {state?.question?.optionA}
                </span>
              </div>

              {/* Option B: Sky */}
              <div className="flex items-center gap-4 p-6 sm:p-8 rounded-3xl bg-sky-950/40 border-2 border-sky-600/40 hover:border-sky-500/80 transition-all shadow-xl">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sky-600 flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-lg shadow-sky-600/40 flex-shrink-0">
                  B
                </div>
                <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-100">
                  {state?.question?.optionB}
                </span>
              </div>

              {/* Option C: Amber */}
              <div className="flex items-center gap-4 p-6 sm:p-8 rounded-3xl bg-amber-950/40 border-2 border-amber-600/40 hover:border-amber-500/80 transition-all shadow-xl">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-600 flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-lg shadow-amber-600/40 flex-shrink-0">
                  C
                </div>
                <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-100">
                  {state?.question?.optionC}
                </span>
              </div>

              {/* Option D: Emerald */}
              <div className="flex items-center gap-4 p-6 sm:p-8 rounded-3xl bg-emerald-950/40 border-2 border-emerald-600/40 hover:border-emerald-500/80 transition-all shadow-xl">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-lg shadow-emerald-600/40 flex-shrink-0">
                  D
                </div>
                <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-100">
                  {state?.question?.optionD}
                </span>
              </div>
            </div>

            {/* Presenter Controls Footer */}
            <div className="flex items-center justify-between pt-4">
              <div className="text-xs text-slate-400">
                Timer running. Once complete or audience has finished answering, advance to reveal leaderboard.
              </div>

              <button
                onClick={() => handleTransition("LEADERBOARD")}
                disabled={transitioning}
                className="py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg tracking-wide shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {transitioning ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>End Question / Show Leaderboard</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* 4. LEADERBOARD STATE: TOP 10 RANKINGS */}
        {/* ========================================== */}
        {status === "LEADERBOARD" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 max-w-5xl mx-auto w-full"
          >
            {/* Correct Answer Explanation Strip */}
            {state?.question?.correctOption && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg border border-emerald-500/40">
                    {state.question.correctOption}
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                      Correct Answer
                    </span>
                    <span className="text-base sm:text-lg font-bold text-white">
                      {state.question[
                        `option${state.question.correctOption}` as keyof QuestionData
                      ] || "Correct"}
                    </span>
                  </div>
                </div>

                {state.question.explanation && (
                  <div className="text-xs sm:text-sm text-slate-300 max-w-lg bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="font-semibold text-slate-400 block mb-0.5">Explanation:</span>
                    {state.question.explanation}
                  </div>
                )}
              </div>
            )}

            {/* Leaderboard Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-amber-400" />
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Top 10 Leaderboard
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    After Question {questionNumber} of {totalQuestions}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Question Avg
                    </span>
                    <span className="font-mono text-lg font-bold text-indigo-300">
                      {state?.leaderboard?.questionAverage || 0} pts
                    </span>
                  </div>

                  {/* Next Step Action Button */}
                  {isLastQuestion ? (
                    <button
                      onClick={() => handleTransition("COMPLETED")}
                      disabled={transitioning}
                      className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all transform hover:scale-[1.02] cursor-pointer"
                    >
                      {transitioning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Crown className="w-4 h-4 text-amber-400" />
                          <span>Show Final Results & Podium</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTransition("QUESTION_READY")}
                      disabled={transitioning}
                      className="py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm tracking-wide shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all transform hover:scale-[1.02] cursor-pointer"
                    >
                      {transitioning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Next Question ({questionNumber + 1})</span>
                          <SkipForward className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Top 10 Table */}
              <div className="divide-y divide-slate-800/80 mt-2">
                {state?.leaderboard?.top10 && state.leaderboard.top10.length > 0 ? (
                  state.leaderboard.top10.map((entry, idx) => {
                    const isGold = entry.rank === 1;
                    const isSilver = entry.rank === 2;
                    const isBronze = entry.rank === 3;

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`py-3.5 px-4 rounded-xl flex items-center justify-between transition-colors ${
                          isGold
                            ? "bg-amber-500/10 border border-amber-500/20"
                            : isSilver
                            ? "bg-slate-700/20"
                            : isBronze
                            ? "bg-amber-900/10"
                            : "hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-4 sm:gap-6">
                          {/* Rank badge */}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0">
                            {isGold ? (
                              <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/30">
                                <Crown className="w-4 h-4" />
                              </div>
                            ) : isSilver ? (
                              <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-950 flex items-center justify-center">
                                2
                              </div>
                            ) : isBronze ? (
                              <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center">
                                3
                              </div>
                            ) : (
                              <span className="text-slate-400 font-bold">{entry.rank}</span>
                            )}
                          </div>

                          {/* Participant Name */}
                          <div>
                            <span className="text-base sm:text-lg font-bold text-white block">
                              {entry.name}
                            </span>
                            {entry.thisQuestionPoints > 0 ? (
                              <span className="text-xs text-emerald-400 font-medium">
                                +{entry.thisQuestionPoints} pts this round
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">No points this round</span>
                            )}
                          </div>
                        </div>

                        {/* Rank Shift & Total Score */}
                        <div className="flex items-center gap-4 sm:gap-6">
                          {/* Movement */}
                          <div className="text-xs font-bold w-16 text-right">
                            {entry.rankShift > 0 ? (
                              <span className="inline-flex items-center text-emerald-400 gap-0.5">
                                <TrendingUp className="w-3.5 h-3.5" />
                                +{entry.rankShift}
                              </span>
                            ) : entry.rankShift < 0 ? (
                              <span className="inline-flex items-center text-rose-400 gap-0.5">
                                <TrendingDown className="w-3.5 h-3.5" />
                                {entry.rankShift}
                              </span>
                            ) : entry.isNew ? (
                              <span className="text-indigo-400 uppercase text-[10px] tracking-wide">
                                NEW
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-slate-500 gap-0.5">
                                <Minus className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>

                          {/* Total Score */}
                          <div className="w-24 text-right">
                            <span className="font-mono text-xl sm:text-2xl font-black text-indigo-300">
                              {entry.totalScore}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block -mt-1">
                              PTS
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-500">
                    No leaderboard data available yet.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* 5. COMPLETED STATE: GRAND PODIUM & FINALS */}
        {/* ========================================== */}
        {status === "COMPLETED" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-10 max-w-5xl mx-auto w-full py-6"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Crown className="w-4 h-4 text-amber-400" />
                Live Quiz Completed!
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
                Grand Champions Podium
              </h1>
              <p className="text-slate-400 text-base sm:text-lg max-w-md mx-auto">
                Congratulations to all participants! Let&apos;s celebrate our top 3 finalists.
              </p>
            </div>

            {/* 3D Visual Podium */}
            {state?.leaderboard?.top10 && state.leaderboard.top10.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end max-w-3xl mx-auto w-full pt-8 pb-4">
                {/* 2nd Place (Silver) */}
                {state.leaderboard.top10[1] && (
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-300 text-slate-950 font-black text-2xl flex items-center justify-center shadow-xl shadow-slate-300/20 mb-3 border-4 border-slate-400">
                      2
                    </div>
                    <span className="font-extrabold text-sm sm:text-base text-white text-center truncate max-w-full px-2">
                      {state.leaderboard.top10[1].name}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-400 mb-3">
                      {state.leaderboard.top10[1].totalScore} pts
                    </span>
                    <div className="w-full h-36 sm:h-48 rounded-t-3xl bg-gradient-to-t from-slate-800 to-slate-700/80 border-t-4 border-slate-300 flex items-center justify-center shadow-2xl">
                      <Medal className="w-8 h-8 text-slate-300 opacity-60" />
                    </div>
                  </motion.div>
                )}

                {/* 1st Place (Gold) - Elevated Center */}
                {state.leaderboard.top10[0] && (
                  <motion.div
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col items-center -mt-6"
                  >
                    <Crown className="w-10 h-10 text-amber-400 mb-1 animate-bounce" />
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-3xl flex items-center justify-center shadow-2xl shadow-amber-400/40 mb-3 border-4 border-amber-200">
                      1
                    </div>
                    <span className="font-black text-base sm:text-xl text-amber-300 text-center truncate max-w-full px-2">
                      {state.leaderboard.top10[0].name}
                    </span>
                    <span className="font-mono text-sm sm:text-base font-black text-amber-400 mb-3">
                      {state.leaderboard.top10[0].totalScore} pts
                    </span>
                    <div className="w-full h-48 sm:h-64 rounded-t-3xl bg-gradient-to-t from-amber-950/80 via-amber-900/60 to-amber-700/60 border-t-4 border-amber-400 flex items-center justify-center shadow-2xl shadow-amber-500/20">
                      <Trophy className="w-12 h-12 text-amber-400" />
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place (Bronze) */}
                {state.leaderboard.top10[2] && (
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-800 text-white font-black text-2xl flex items-center justify-center shadow-xl shadow-amber-800/20 mb-3 border-4 border-amber-700">
                      3
                    </div>
                    <span className="font-extrabold text-sm sm:text-base text-white text-center truncate max-w-full px-2">
                      {state.leaderboard.top10[2].name}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-amber-500 mb-3">
                      {state.leaderboard.top10[2].totalScore} pts
                    </span>
                    <div className="w-full h-28 sm:h-36 rounded-t-3xl bg-gradient-to-t from-slate-900 to-amber-950/60 border-t-4 border-amber-700 flex items-center justify-center shadow-2xl">
                      <Medal className="w-7 h-7 text-amber-700 opacity-60" />
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Post-Quiz Actions */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Session Archive & Reports</h3>
                  <p className="text-xs text-slate-400">
                    Audit individual responses, score progression, and export data.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Export Standings (CSV)</span>
                </button>

                <button
                  onClick={handleOpenAudit}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>View Detailed Audit</span>
                </button>

                <button
                  onClick={() => router.push("/admin/live-quiz")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-colors cursor-pointer"
                >
                  <span>Return to Live Hub</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* ============================================================ */}
      {/* FULLSCREEN QR CODE MODAL FOR AUDIENCE STAGE */}
      {/* ============================================================ */}
      <AnimatePresence>
        {qrModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-6 right-6 p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-3xl sm:text-5xl font-black text-white mb-2">
              Scan to Join Live Quiz
            </h2>
            <p className="text-slate-400 text-lg sm:text-xl max-w-md mb-8">
              Open your camera app or browser to enter the game!
            </p>

            <div className="p-6 bg-white rounded-3xl shadow-2xl shadow-indigo-500/30 inline-block mb-8">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Stage QR Code"
                  className="w-72 h-72 sm:w-96 sm:h-96 object-contain rounded-2xl"
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-900 border border-slate-800 px-8 py-4 rounded-2xl">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                  Or Join Online at
                </span>
                <span className="font-mono text-lg sm:text-2xl text-indigo-300 font-bold">
                  {joinUrl}
                </span>
              </div>
              <div className="h-10 w-[1px] bg-slate-800 hidden sm:block"></div>
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                  Enter Join Code
                </span>
                <span className="font-mono text-2xl sm:text-4xl font-black text-amber-400 tracking-widest">
                  {state?.sessionCode}
                </span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* DETAILED AUDIT MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {auditModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Full Session Audit & Standings</h3>
                  <span className="text-xs text-slate-400">
                    Session Code: {state?.sessionCode} • Total Questions: {totalQuestions}
                  </span>
                </div>
                <button
                  onClick={() => setAuditModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {loadingAudit ? (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                    <span>Loading session audit details...</span>
                  </div>
                ) : auditData ? (
                  <div className="space-y-6">
                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Participants
                        </span>
                        <span className="font-mono text-xl font-bold text-white">
                          {auditData.summary?.totalParticipants || 0}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Average Score
                        </span>
                        <span className="font-mono text-xl font-bold text-indigo-400">
                          {auditData.summary?.averageScore || 0} pts
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Highest Score
                        </span>
                        <span className="font-mono text-xl font-bold text-amber-400">
                          {auditData.summary?.highestScore || 0} pts
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Avg Response Time
                        </span>
                        <span className="font-mono text-xl font-bold text-emerald-400">
                          {auditData.summary?.averageResponseTime || 0}s
                        </span>
                      </div>
                    </div>

                    {/* Participants Full Roster */}
                    <div className="border border-slate-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800/60 text-slate-400 font-bold uppercase border-b border-slate-800">
                          <tr>
                            <th className="py-3 px-4">Rank</th>
                            <th className="py-3 px-4">Participant</th>
                            <th className="py-3 px-4 text-center">Correct</th>
                            <th className="py-3 px-4 text-center">Wrong</th>
                            <th className="py-3 px-4 text-center">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {(auditData.participants || []).map((p: any) => (
                            <tr key={p.id} className="hover:bg-slate-800/40">
                              <td className="py-3 px-4 font-mono font-bold text-slate-400">
                                #{p.finalRank || "-"}
                              </td>
                              <td className="py-3 px-4 font-semibold text-white">
                                {p.participantName}
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-emerald-400">
                                {p.correctCount}
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-rose-400">
                                {p.wrongCount}
                              </td>
                              <td className="py-3 px-4 text-center font-mono font-black text-indigo-300">
                                {p.totalScore}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">No audit data available.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* CONFIRM EARLY SESSION END MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {confirmEndOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">End Live Quiz Session?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to end this presentation session early? Final rankings and certificates will be computed immediately based on current scores.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setConfirmEndOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTransition("COMPLETED")}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Confirm End
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
