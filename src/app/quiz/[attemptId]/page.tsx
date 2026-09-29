"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer,
  Trophy,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Zap,
  Loader2,
} from "lucide-react";
import { fireSuccessConfetti, fireGrandCelebration } from "@/components/ConfettiEffect";
import { formatSecondsToTimer } from "@/lib/utils";

interface QuestionData {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

interface ScoringConfig {
  basePoints: number;
  gracePeriodSeconds: number;
  pointsPerSecond: number;
  minimumCorrectPoints: number;
  negativeMarkingEnabled: boolean;
  negativePoints: number;
  allowNegativeTotal: boolean;
}

interface AnswerFeedback {
  isCorrect: boolean;
  selectedOption: string;
  correctOption: string;
  pointsAwarded: number;
  timeTaken: number;
  explanation: string | null;
  updatedTotalScore: number;
  isQuizCompleted: boolean;
}

export default function QuizPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [participantName, setParticipantName] = useState("");
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<Date>(new Date());

  // Interactive timing & submission state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [countdownToNext, setCountdownToNext] = useState<number | null>(null);

  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load question and current attempt state
  const loadState = useCallback(async () => {
    if (!attemptId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/quiz/${attemptId}/state`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load quiz session.");
        setLoading(false);
        return;
      }

      if (data.isCompleted) {
        // Quiz is already done, forward to results
        router.push(`/results/${attemptId}`);
        return;
      }

      setParticipantName(data.participantName);
      setCurrentQuestionNumber(data.currentQuestionNumber);
      setTotalQuestions(data.totalQuestions);
      setScore(data.currentScore);
      setQuestion(data.question);
      setScoringConfig(data.scoringConfig);

      const serverStartTime = new Date(data.questionStartedAt);
      setQuestionStartedAt(serverStartTime);

      // Reset selection and feedback
      setSelectedOption(null);
      setFeedback(null);
      setCountdownToNext(null);
      setIsSubmitting(false);

      // Initialize elapsed time
      const initialElapsed = Math.max(
        0,
        (new Date().getTime() - serverStartTime.getTime()) / 1000
      );
      setElapsedSeconds(initialElapsed);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Network error loading quiz. Please check your connection.");
      setLoading(false);
    }
  }, [attemptId, router]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Live timer interval (runs continuously until answer submitted)
  useEffect(() => {
    if (loading || isSubmitting || feedback !== null || !question) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.max(0, (now.getTime() - questionStartedAt.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [loading, isSubmitting, feedback, question, questionStartedAt]);

  // Handle Answer Selection
  const handleSelectAnswer = async (optionKey: "A" | "B" | "C" | "D") => {
    if (isSubmitting || feedback !== null || !question) return;

    setSelectedOption(optionKey);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/quiz/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          selectedOption: optionKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to submit answer. Please retry.");
        setIsSubmitting(false);
        return;
      }

      setFeedback(data);
      setScore(data.updatedTotalScore);

      // Trigger celebratory animation on correct answer
      if (data.isCorrect) {
        fireSuccessConfetti();
        if (data.isQuizCompleted) {
          setTimeout(() => fireGrandCelebration(), 500);
        }
      }

      // Start countdown to next question
      let secondsRemaining = 4;
      setCountdownToNext(secondsRemaining);

      countdownIntervalRef.current = setInterval(() => {
        secondsRemaining -= 1;
        if (secondsRemaining <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          setCountdownToNext(null);
        } else {
          setCountdownToNext(secondsRemaining);
        }
      }, 1000);

      // Auto advance
      autoAdvanceTimerRef.current = setTimeout(() => {
        handleProceedNext(data.isQuizCompleted);
      }, 4000);
    } catch (err) {
      console.error(err);
      setError("Network timeout while submitting answer. You can retry clicking your choice.");
      setIsSubmitting(false);
    }
  };

  // Move to next question or complete
  const handleProceedNext = (isCompleted?: boolean) => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    const completed = isCompleted ?? feedback?.isQuizCompleted ?? false;
    if (completed) {
      router.push(`/results/${attemptId}`);
    } else {
      loadState();
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting || feedback !== null) {
        if (e.key === "Enter" || e.key === " ") {
          handleProceedNext();
        }
        return;
      }

      const key = e.key.toUpperCase();
      if (key === "A" || key === "1") handleSelectAnswer("A");
      else if (key === "B" || key === "2") handleSelectAnswer("B");
      else if (key === "C" || key === "3") handleSelectAnswer("C");
      else if (key === "D" || key === "4") handleSelectAnswer("D");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, feedback]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm">Preparing question...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Something Went Wrong</h2>
          <p className="text-sm text-slate-400">{error || "Question unavailable."}</p>
          <button
            onClick={() => loadState()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((currentQuestionNumber / totalQuestions) * 100);

  // Timer visual styling based on grace period and elapsed time
  const gracePeriod = scoringConfig?.gracePeriodSeconds ?? 5;
  const isWithinGrace = elapsedSeconds <= gracePeriod;
  const isHighElapsed = elapsedSeconds > 25;

  let timerColorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  if (!isWithinGrace && !isHighElapsed) {
    timerColorClass = "text-amber-400 bg-amber-500/10 border-amber-500/30";
  } else if (isHighElapsed) {
    timerColorClass = "text-rose-400 bg-rose-500/10 border-rose-500/30";
  }

  const options: Array<{ key: "A" | "B" | "C" | "D"; text: string }> = [
    { key: "A", text: question.optionA },
    { key: "B", text: question.optionB },
    { key: "C", text: question.optionC },
    { key: "D", text: question.optionD },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header bar: Participant, Question Progress, Timer, Live Score */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 backdrop-blur-md shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Participant Info & Question index */}
          <div>
            <div className="text-xs text-slate-400">
              Participant: <strong className="text-slate-200">{participantName}</strong>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <span>
                Question {currentQuestionNumber}{" "}
                <span className="text-slate-500 font-normal text-sm">of {totalQuestions}</span>
              </span>
            </div>
          </div>

          {/* Right badges: Timer & Score */}
          <div className="flex items-center gap-3">
            {/* Live Question Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-mono font-bold transition-colors ${timerColorClass}`}
            >
              <Timer className="w-4 h-4 animate-pulse" />
              <span>{formatSecondsToTimer(elapsedSeconds)}</span>
              {isWithinGrace && (
                <span className="hidden sm:inline text-[10px] font-sans font-semibold uppercase tracking-wider text-emerald-400/80 ml-1">
                  (Grace Period)
                </span>
              )}
            </div>

            {/* Live Score */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-sm">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{score} pts</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: `${((currentQuestionNumber - 1) / totalQuestions) * 100}%` }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-medium">
            <span>Progress: {progressPercent}%</span>
            <span>{totalQuestions - currentQuestionNumber} questions remaining</span>
          </div>
        </div>
      </div>

      {/* Main Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle top indicator */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Multiple Choice
            </span>
            <span className="text-xs text-slate-500">
              Select one option &bull; Hotkeys: A, B, C, D
            </span>
          </div>

          {/* Question Text */}
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed mb-8">
            {question.questionText}
          </h2>

          {/* 4 Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
            {options.map((opt) => {
              const isSelected = selectedOption === opt.key;
              const hasAnswered = feedback !== null;
              const isOptionCorrect = hasAnswered && feedback.correctOption === opt.key;
              const isOptionIncorrect =
                hasAnswered && isSelected && !feedback.isCorrect;

              let btnClasses =
                "relative flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl border text-left transition-all text-sm sm:text-base font-medium select-none ";

              if (!hasAnswered) {
                btnClasses +=
                  "border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 hover:border-indigo-500/50 hover:shadow-md cursor-pointer active:scale-[0.99] text-slate-200";
              } else if (isOptionCorrect) {
                // Highlight correct answer in green
                btnClasses +=
                  "border-emerald-500 bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20";
              } else if (isOptionIncorrect) {
                // Highlight user wrong selection in red with shake
                btnClasses +=
                  "border-rose-500 bg-rose-500/20 text-rose-200 ring-2 ring-rose-500 animate-shake";
              } else {
                // Dim other unselected options
                btnClasses += "border-slate-800/50 bg-slate-900/40 text-slate-500 opacity-60";
              }

              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={hasAnswered || isSubmitting}
                  onClick={() => handleSelectAnswer(opt.key)}
                  className={btnClasses}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${
                      isOptionCorrect
                        ? "bg-emerald-500 text-white"
                        : isOptionIncorrect
                        ? "bg-rose-500 text-white"
                        : isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400 group-hover:text-white"
                    }`}
                  >
                    {isOptionCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : isOptionIncorrect ? (
                      <XCircle className="w-5 h-5 text-white" />
                    ) : (
                      opt.key
                    )}
                  </div>

                  <span className="flex-1 leading-snug">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Submitting indicator */}
          {isSubmitting && !feedback && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-indigo-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking answer with server...</span>
            </div>
          )}

          {/* Immediate Feedback Banner */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-5 rounded-2xl border mb-6 ${
                feedback.isCorrect
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  {feedback.isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
                  )}
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg">
                      {feedback.isCorrect ? "Correct Answer!" : "Incorrect!"}
                    </h3>
                    {!feedback.isCorrect && (
                      <p className="text-xs text-rose-300">
                        The correct answer was: <strong>Option {feedback.correctOption}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Points Awarded/Deducted */}
                <div
                  className={`px-3 py-1.5 rounded-xl font-mono font-bold text-sm ${
                    feedback.pointsAwarded > 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : feedback.pointsAwarded < 0
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {feedback.pointsAwarded > 0
                    ? `+${feedback.pointsAwarded} pts`
                    : `${feedback.pointsAwarded} pts`}
                  <span className="text-xs font-normal opacity-75 ml-1.5">
                    ({feedback.timeTaken}s)
                  </span>
                </div>
              </div>

              {/* Optional Explanation */}
              {feedback.explanation && (
                <div className="mt-3 pt-3 border-t border-white/10 text-xs sm:text-sm text-slate-300 leading-relaxed flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200">Explanation: </span>
                    {feedback.explanation}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Continue / Next Button */}
          {feedback && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-400">
                {countdownToNext !== null && (
                  <span>
                    Auto-advancing in <strong className="text-indigo-400">{countdownToNext}s</strong>...
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleProceedNext()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <span>{feedback.isQuizCompleted ? "View Final Results" : "Next Question"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
