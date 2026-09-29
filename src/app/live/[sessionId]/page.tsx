"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer,
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Users,
  Award,
  Loader2,
  AlertCircle,
  Eye,
  RotateCcw,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { formatSecondsToTimer } from "@/lib/utils";
import CertificateModal from "@/components/CertificateModal";
import { fireSuccessConfetti, fireGrandCelebration } from "@/components/ConfettiEffect";

interface QuestionData {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

interface LeaderboardItem {
  rank: number;
  id: string;
  name: string;
  thisQuestionPoints: number;
  totalScore: number;
  rankShift: number;
  isNew: boolean;
}

interface ReviewItem {
  number: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  pointsAwarded: number;
  responseTime: number;
  explanation: string | null;
  wasAnswered: boolean;
}

function LiveRoomInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params?.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Participant info
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string>("");
  const [sessionCode, setSessionCode] = useState<string>("");

  // Inline Join state (if participant opens URL directly or storage is empty)
  const [inlineName, setInlineName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Live session state
  const [status, setStatus] = useState<
    "WAITING" | "QUESTION_READY" | "QUESTION_ACTIVE" | "LEADERBOARD" | "COMPLETED"
  >("WAITING");
  const [quizTitle, setQuizTitle] = useState("Live Presentation Quiz");
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [stateVersion, setStateVersion] = useState(0);

  // Question & Timer
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(30);

  // Answering state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Leaderboard data
  const [top10, setTop10] = useState<LeaderboardItem[]>([]);
  const [myPosition, setMyPosition] = useState<{
    rank: number;
    totalScore: number;
    thisQuestionPoints: number;
    inTop10: boolean;
  } | null>(null);

  // Completion review & certificate
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);

  // Reconnection & token recovery from searchParams, sessionStorage, or localStorage
  useEffect(() => {
    const queryPid = searchParams?.get("participantId");
    if (queryPid) {
      setParticipantId(queryPid);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`live_participant_${sessionId}`, queryPid);
        localStorage.setItem(`live_participant_${sessionId}`, queryPid);
      }
      return;
    }

    if (typeof window !== "undefined") {
      const storedPid =
        sessionStorage.getItem(`live_participant_${sessionId}`) ||
        localStorage.getItem(`live_participant_${sessionId}`);
      const storedPname =
        sessionStorage.getItem(`live_pname_${sessionId}`) ||
        localStorage.getItem(`live_pname_${sessionId}`);

      if (storedPid) {
        setParticipantId(storedPid);
        if (storedPname) setParticipantName(storedPname);
        return;
      }

      // Fallback: check matching live_pid_ in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("live_pid_")) {
          const code = key.replace("live_pid_", "");
          const pid = localStorage.getItem(key);
          const name = localStorage.getItem(`live_name_${code}`);
          if (pid) {
            setParticipantId(pid);
            if (name) setParticipantName(name);
            setSessionCode(code);
            break;
          }
        }
      }
    }
  }, [searchParams, sessionId]);

  // Fetch Full State from Server
  const fetchState = useCallback(async () => {
    if (!sessionId) return;
    try {
      const pParam = participantId ? `?participantId=${participantId}` : "";
      const res = await fetch(`/api/live/${sessionId}/state${pParam}`);
      if (!res.ok) {
        if (res.status === 404) setError("Live session does not exist.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setStatus(data.status);
      setQuizTitle(data.quizTitle);
      setSessionCode(data.sessionCode);
      setCurrentQuestionNumber(data.currentQuestionNumber || 1);
      setTotalQuestions(data.totalQuestions || 10);
      setParticipantsCount(data.participantsCount || 0);
      setStateVersion(data.stateVersion || 1);

      if (data.participant) {
        setParticipantName(data.participant.name);
      } else if (participantId) {
        // Stale participant ID from another quiz session, clear it
        setParticipantId(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem(`live_participant_${sessionId}`);
          sessionStorage.removeItem(`live_participant_${sessionId}`);
        }
      }

      if (data.question) {
        setQuestion(data.question);
      }

      if (data.questionStartedAt) {
        const startTime = new Date(data.questionStartedAt);
        setQuestionStartedAt(startTime);
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setRemainingSeconds(Math.max(0, 30 - elapsed));
      } else {
        setQuestionStartedAt(null);
        setRemainingSeconds(30);
      }

      // Check answer status
      if (data.participantAnswer) {
        setHasAnswered(data.participantAnswer.hasAnswered);
        setSelectedOption(data.participantAnswer.selectedOption || null);
      } else {
        setHasAnswered(false);
        setSelectedOption(null);
      }

      // Leaderboard
      if (data.leaderboard) {
        setTop10(data.leaderboard.top10 || []);
      }
      if (data.myPosition) {
        setMyPosition(data.myPosition);
      }

      // If completed, fetch full review
      if (data.status === "COMPLETED" && participantId) {
        fetchReview();
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [sessionId, participantId]);

  const fetchReview = async () => {
    if (!sessionId || !participantId) return;
    try {
      const res = await fetch(`/api/live/${sessionId}/review?participantId=${participantId}`);
      if (res.ok) {
        const rev = await res.json();
        setReviewData(rev);
        fireGrandCelebration();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Real-time EventSource (SSE) connection with automatic reconnect
  useEffect(() => {
    if (!sessionId) return;

    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource(`/api/live/${sessionId}/stream`);

      eventSource.addEventListener("QUESTION_READY", () => {
        fetchState();
      });

      eventSource.addEventListener("QUESTION_ACTIVE", () => {
        fetchState();
      });

      eventSource.addEventListener("QUESTION_STARTED", () => {
        fetchState();
      });

      eventSource.addEventListener("LEADERBOARD", () => {
        fetchState();
      });

      eventSource.addEventListener("LEADERBOARD_UPDATED", () => {
        fetchState();
      });

      eventSource.addEventListener("COMPLETED", () => {
        fetchState();
      });

      eventSource.addEventListener("PARTICIPANT_JOINED", (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.participantsCount) setParticipantsCount(payload.participantsCount);
        } catch {}
      });

      eventSource.onerror = () => {
        // SSE error or timeout - will auto-reconnect or fallback
      };
    } catch (err) {
      console.error("SSE setup error:", err);
    }

    // Adaptive micro-polling fallback every 1.5s for rock-solid sync
    fallbackInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/live/${sessionId}/sync?version=${stateVersion}`
        );
        if (res.ok) {
          const syncData = await res.json();
          if (syncData.changed) {
            fetchState();
          } else if (syncData.participantsCount !== undefined) {
            setParticipantsCount(syncData.participantsCount);
          }
        }
      } catch {}
    }, 1500);

    return () => {
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [sessionId, stateVersion, fetchState]);

  // 30-Second countdown timer running off server timestamp
  useEffect(() => {
    if (status !== "QUESTION_ACTIVE" || !questionStartedAt) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartedAt.getTime()) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      setRemainingSeconds(remaining);
    }, 100);

    return () => clearInterval(timer);
  }, [status, questionStartedAt]);

  const handleInlineJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineName.trim()) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      const res = await fetch("/api/live/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sessionCode: sessionCode || undefined,
          participantName: inlineName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || "Failed to join quiz room.");
        return;
      }

      if (data.participant?.id) {
        setParticipantId(data.participant.id);
        setParticipantName(data.participant.name);
        if (typeof window !== "undefined") {
          localStorage.setItem(`live_participant_${sessionId}`, data.participant.id);
          sessionStorage.setItem(`live_participant_${sessionId}`, data.participant.id);
          localStorage.setItem(`live_pname_${sessionId}`, data.participant.name);
          sessionStorage.setItem(`live_pname_${sessionId}`, data.participant.name);
        }
      }
    } catch (err) {
      console.error(err);
      setJoinError("Network error. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  // Submit Answer handler
  const handleSelectOption = async (optionKey: "A" | "B" | "C" | "D") => {
    if (!participantId) {
      setError("Please join the quiz room with your name first.");
      return;
    }

    if (
      status !== "QUESTION_ACTIVE" ||
      hasAnswered ||
      isSubmitting ||
      remainingSeconds <= 0 ||
      !question
    ) {
      return;
    }

    setSelectedOption(optionKey);
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/live/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          questionId: question.id,
          selectedOption: optionKey,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setHasAnswered(true);
        // Answer submitted. Confetti is reserved for official leaderboard reveals or final completion.
      } else {
        if (data.hasAnswered) {
          setHasAnswered(true);
        } else {
          setError(data.error || "Failed to submit answer.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Network timeout submitting answer. Please tap again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm">Connecting to Live Quiz Room...</p>
      </div>
    );
  }

  // Fallback: If participant has not joined with a name yet
  if (!participantId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-lg shadow-indigo-500/20">
            <Users className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white">Join Live Quiz</h1>
            <p className="text-indigo-400 font-semibold text-sm mt-1">{quizTitle}</p>
            {sessionCode && (
              <span className="inline-block mt-2 font-mono text-xs px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300">
                Session Code: <strong className="text-indigo-300">{sessionCode}</strong>
              </span>
            )}
          </div>

          <form onSubmit={handleInlineJoin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter your name to participate:
              </label>
              <input
                type="text"
                required
                maxLength={40}
                value={inlineName}
                onChange={(e) => setInlineName(e.target.value)}
                placeholder="e.g. Dr. Priya Sharma"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-all"
                autoFocus
              />
            </div>

            {joinError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining || !inlineName.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-500/25 active:scale-[0.99]"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining Session...</span>
                </>
              ) : (
                <>
                  <span>Join Quiz Room</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (error && !question && status !== "WAITING") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Notice</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchState();
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 1: WAITING ROOM
  // -------------------------------------------------------------
  if (status === "WAITING") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-lg mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">You&apos;re in!</h1>
            <p className="text-indigo-400 font-semibold text-sm mt-1">{quizTitle}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 text-left space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Participant:</span>
              <strong className="text-white text-sm">{participantName || "Anonymous"}</strong>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Session Code:</span>
              <span className="font-mono font-bold text-indigo-400">{sessionCode}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Participants Joined:</span>
              <span className="font-bold text-emerald-400">{participantsCount}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>Waiting for presenter to start...</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Please keep this screen open. The quiz will start automatically.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 2: QUESTION READY / PREVIEW
  // -------------------------------------------------------------
  if (status === "QUESTION_READY") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-lg mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-indigo-400">
              Question {currentQuestionNumber} of {totalQuestions}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Get Ready...</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">
              The presenter is about to start the question. Answer as fast as you can for maximum points!
            </p>
          </div>

          <div className="py-2">
            <div className="w-12 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mx-auto animate-pulse"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 3: QUESTION ACTIVE
  // -------------------------------------------------------------
  if (status === "QUESTION_ACTIVE" && question) {
    const options: Array<{ key: "A" | "B" | "C" | "D"; text: string }> = [
      { key: "A", text: question.optionA },
      { key: "B", text: question.optionB },
      { key: "C", text: question.optionC },
      { key: "D", text: question.optionD },
    ];

    let timerColorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (remainingSeconds <= 10) {
      timerColorClass = "text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse";
    } else if (remainingSeconds <= 20) {
      timerColorClass = "text-amber-400 bg-amber-500/10 border-amber-500/30";
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
        {/* Top Header: Progress & Timer */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Question {currentQuestionNumber} of {totalQuestions}
            </span>
            <div className="font-extrabold text-white text-sm sm:text-base">
              {participantName}
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-black text-lg ${timerColorClass}`}
          >
            <Timer className="w-5 h-5" />
            <span>{remainingSeconds}s</span>
          </div>
        </div>

        {/* Question Text */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
            {question.questionText}
          </h2>

          {/* 4 Large Touch Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {options.map((opt) => {
              const isSelected = selectedOption === opt.key;
              let btnClass =
                "relative flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl border text-left font-semibold text-sm transition-all select-none ";

              if (hasAnswered) {
                if (isSelected) {
                  btnClass += "border-indigo-500 bg-indigo-600/30 text-white ring-2 ring-indigo-500";
                } else {
                  btnClass += "border-slate-800/40 bg-slate-900/40 text-slate-500 opacity-50";
                }
              } else if (remainingSeconds <= 0) {
                btnClass += "border-slate-800 bg-slate-900 text-slate-500 opacity-50";
              } else {
                btnClass +=
                  "border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-indigo-500/50 text-slate-200 active:scale-[0.98] cursor-pointer";
              }

              return (
                <button
                  key={opt.key}
                  disabled={hasAnswered || isSubmitting || remainingSeconds <= 0}
                  onClick={() => handleSelectOption(opt.key)}
                  className={btnClass}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {opt.key}
                  </div>
                  <span className="flex-1 leading-snug">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Answer Submitted Waiting Banner */}
          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-center space-y-1"
            >
              <div className="font-extrabold text-indigo-300 text-sm flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Answer Submitted!</span>
              </div>
              <p className="text-xs text-slate-400">
                Waiting for the presenter to reveal results and leaderboard...
              </p>
            </motion.div>
          )}

          {/* Time Expired without answering */}
          {!hasAnswered && remainingSeconds <= 0 && (
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-center space-y-1 text-rose-300 text-xs">
              <span className="font-bold">Time is up!</span>
              <p className="text-slate-400">Waiting for presenter...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 4: LEADERBOARD VIEW
  // -------------------------------------------------------------
  if (status === "LEADERBOARD") {
    return (
      <div className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 max-w-xl mx-auto w-full space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <span className="text-xs uppercase tracking-wider font-extrabold text-amber-400 flex items-center justify-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            Question {currentQuestionNumber} Results
          </span>
          <h1 className="text-2xl font-black text-white">Top 10 Leaderboard</h1>
        </div>

        {/* Top 10 Table */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800/60 text-xs sm:text-sm">
            {top10.map((entry) => {
              const isMe = entry.id === participantId;
              return (
                <div
                  key={entry.id}
                  className={`p-3.5 px-4 flex items-center justify-between transition-colors ${
                    isMe
                      ? "bg-indigo-600/20 border-l-4 border-indigo-500"
                      : "hover:bg-slate-800/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg font-mono font-bold flex items-center justify-center text-xs ${
                        entry.rank === 1
                          ? "bg-amber-500 text-slate-950"
                          : entry.rank === 2
                          ? "bg-slate-300 text-slate-950"
                          : entry.rank === 3
                          ? "bg-amber-900/60 text-amber-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      #{entry.rank}
                    </span>

                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{entry.name}</span>
                        {isMe && (
                          <span className="text-[10px] uppercase font-extrabold bg-indigo-500 text-white px-1.5 py-0.2 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        {entry.thisQuestionPoints > 0 && (
                          <span className="text-emerald-400 font-mono">
                            +{entry.thisQuestionPoints} this Q
                          </span>
                        )}
                        {entry.rankShift > 0 && (
                          <span className="text-emerald-400 font-bold">
                            &uarr; +{entry.rankShift}
                          </span>
                        )}
                        {entry.rankShift < 0 && (
                          <span className="text-rose-400 font-bold">
                            &darr; {entry.rankShift}
                          </span>
                        )}
                        {entry.isNew && (
                          <span className="text-amber-400 font-bold">NEW</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-base text-white">
                      {entry.totalScore}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Participant Outside Top 10 Pinned Banner */}
        {myPosition && !myPosition.inTop10 && (
          <div className="w-full p-4 rounded-2xl bg-indigo-950/40 border-2 border-indigo-500/50 flex items-center justify-between text-xs sm:text-sm shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center font-mono">
                #{myPosition.rank}
              </span>
              <div>
                <span className="font-bold text-white block">Your Position</span>
                <span className="text-[10px] text-indigo-300">
                  +{myPosition.thisQuestionPoints} this Q
                </span>
              </div>
            </div>
            <div className="font-mono font-black text-lg text-white">
              {myPosition.totalScore} pts
            </div>
          </div>
        )}

        <div className="text-center text-xs text-slate-500 pt-2">
          Waiting for presenter to move to the next question...
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 5: COMPLETED FINAL SCORECARD
  // -------------------------------------------------------------
  if (status === "COMPLETED") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 max-w-2xl mx-auto w-full space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Live Presentation Concluded
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white">
              Congratulations, {participantName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">{quizTitle}</p>
          </div>

          {/* Big Score Card */}
          {reviewData && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 border border-indigo-500/30 text-center">
              <div className="text-xs uppercase tracking-widest text-indigo-300 font-bold mb-1">
                Final Score
              </div>
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {reviewData.totalScore}{" "}
                <span className="text-xl sm:text-2xl text-slate-500 font-normal">
                  / {reviewData.maxScore}
                </span>
              </div>
              <div className="text-emerald-400 font-bold text-lg mt-1">
                {reviewData.percentage}% Accuracy
              </div>
            </div>
          )}

          {/* Stats Grid */}
          {reviewData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] uppercase text-slate-400 block">Correct</span>
                <span className="text-base font-bold text-white">{reviewData.correctCount}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
                <XCircle className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                <span className="text-[10px] uppercase text-slate-400 block">Wrong</span>
                <span className="text-base font-bold text-white">{reviewData.wrongCount}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
                <Timer className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                <span className="text-[10px] uppercase text-slate-400 block">Time</span>
                <span className="text-base font-bold text-white font-mono">
                  {reviewData.totalResponseTime}s
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
                <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="text-[10px] uppercase text-slate-400 block">Final Rank</span>
                <span className="text-base font-bold text-amber-400">#{reviewData.rank}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setShowCertModal(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
            >
              <Award className="w-5 h-5 text-slate-950" />
              <span>Download Official Certificate</span>
            </button>

            <button
              onClick={() => setShowReviewModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Review All 10 Questions</span>
            </button>
          </div>
        </motion.div>

        {/* Certificate Modal */}
        {reviewData && (
          <CertificateModal
            isOpen={showCertModal}
            onClose={() => setShowCertModal(false)}
            data={{
              participantName: reviewData.participantName,
              quizTitle: reviewData.quizTitle,
              totalScore: reviewData.totalScore,
              maxScore: reviewData.maxScore,
              percentage: reviewData.percentage,
              completedAt: reviewData.completedAt,
              rank: reviewData.rank,
              certificateId: reviewData.certificateId,
            }}
          />
        )}

        {/* Detailed Review Modal */}
        {showReviewModal && reviewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-white text-base">
                  Question-by-Question Review
                </h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                {reviewData.reviews?.map((r: ReviewItem) => (
                  <div
                    key={r.number}
                    className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-400">Question {r.number}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono">{r.responseTime}s</span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            r.isCorrect
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {r.pointsAwarded > 0 ? `+${r.pointsAwarded}` : r.pointsAwarded} pts
                        </span>
                      </div>
                    </div>

                    <div className="text-white font-medium">{r.questionText}</div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div
                        className={`p-2.5 rounded-xl border ${
                          r.isCorrect
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                            : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                        }`}
                      >
                        Your Answer: <strong>Option {r.selectedOption || "None"}</strong>{" "}
                        {r.isCorrect ? "✅" : "❌"}
                      </div>

                      <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-200">
                        Correct Answer: <strong>Option {r.correctOption}</strong> ✅
                      </div>
                    </div>

                    {r.explanation && (
                      <div className="text-slate-400 pt-1 text-[11px] leading-relaxed">
                        <span className="font-bold text-slate-300">Explanation: </span>
                        {r.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function ParticipantLiveRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Connecting to Live Quiz Room...</p>
        </div>
      }
    >
      <LiveRoomInner />
    </Suspense>
  );
}
