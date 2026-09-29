"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  Trophy,
  Timer,
  Award,
  Zap,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface ReviewItem {
  number: number;
  questionId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  pointsAwarded: number;
  timeTaken: number;
  explanation: string | null;
}

export default function ReviewAnswersPage() {
  const params = useParams();
  const attemptId = params?.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState("");
  const [totalScore, setTotalScore] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | "CORRECT" | "WRONG">("ALL");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    async function loadReview() {
      try {
        setLoading(true);
        const res = await fetch(`/api/quiz/${attemptId}/review`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load review.");
          setLoading(false);
          return;
        }

        setParticipantName(data.participantName);
        setTotalScore(data.totalScore);
        setPercentage(data.percentage);
        setReviews(data.reviews || []);
      } catch (err) {
        console.error(err);
        setError("Error loading answer reviews.");
      } finally {
        setLoading(false);
      }
    }

    if (attemptId) {
      loadReview();
    }
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading quiz review...</p>
      </div>
    );
  }

  if (error || reviews.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Review Unavailable</h2>
          <p className="text-sm text-slate-400">{error || "No review data available."}</p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const filteredReviews = reviews.filter((item) => {
    if (filter === "CORRECT") return item.isCorrect;
    if (filter === "WRONG") return !item.isCorrect;
    return true;
  });

  const currentItem = filteredReviews[selectedIndex] || filteredReviews[0];

  const getOptionText = (item: ReviewItem, key: string) => {
    if (key === "A") return item.optionA;
    if (key === "B") return item.optionB;
    if (key === "C") return item.optionC;
    if (key === "D") return item.optionD;
    return "";
  };

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Bar navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/results/${attemptId}`}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Results
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Performance Review: {participantName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Total Score: <strong className="text-white">{totalScore} pts</strong> &bull; Accuracy:{" "}
            <strong className="text-emerald-400">{percentage}%</strong>
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => {
              setFilter("ALL");
              setSelectedIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "ALL"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All ({reviews.length})
          </button>
          <button
            onClick={() => {
              setFilter("CORRECT");
              setSelectedIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "CORRECT"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Correct ({reviews.filter((r) => r.isCorrect).length})
          </button>
          <button
            onClick={() => {
              setFilter("WRONG");
              setSelectedIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "WRONG"
                ? "bg-rose-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Incorrect ({reviews.filter((r) => !r.isCorrect).length})
          </button>
        </div>
      </div>

      {/* Question Selector Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {filteredReviews.map((item, idx) => (
          <button
            key={item.questionId}
            onClick={() => setSelectedIndex(idx)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
              selectedIndex === idx
                ? "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : item.isCorrect
                ? "border-slate-800 bg-slate-900 text-emerald-400 hover:bg-slate-800"
                : "border-slate-800 bg-slate-900 text-rose-400 hover:bg-slate-800"
            }`}
          >
            {item.isCorrect ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>Q{item.number}</span>
          </button>
        ))}
      </div>

      {/* Main Review Card */}
      {currentItem && (
        <motion.div
          key={currentItem.questionId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm uppercase tracking-wider font-extrabold text-indigo-400">
                Question {currentItem.number} of {reviews.length}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                  currentItem.isCorrect
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {currentItem.isCorrect ? "Correct" : "Incorrect"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-slate-400">
                <Timer className="w-4 h-4 text-indigo-400" />
                <span>{currentItem.timeTaken} seconds</span>
              </div>
              <div
                className={`font-mono font-bold px-2.5 py-1 rounded-lg ${
                  currentItem.pointsAwarded > 0
                    ? "text-emerald-400 bg-emerald-500/10"
                    : currentItem.pointsAwarded < 0
                    ? "text-rose-400 bg-rose-500/10"
                    : "text-slate-400 bg-slate-800"
                }`}
              >
                {currentItem.pointsAwarded > 0
                  ? `+${currentItem.pointsAwarded} pts`
                  : `${currentItem.pointsAwarded} pts`}
              </div>
            </div>
          </div>

          {/* Question text */}
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
            {currentItem.questionText}
          </h2>

          {/* Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Participant Answer */}
            <div
              className={`p-4 rounded-2xl border ${
                currentItem.isCorrect
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                  : "bg-rose-950/20 border-rose-500/30 text-rose-200"
              }`}
            >
              <div className="text-xs uppercase tracking-wider font-semibold opacity-75 mb-1.5 flex items-center gap-1.5">
                {currentItem.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>Your Answer:</span>
              </div>
              <div className="font-bold text-base">
                Option {currentItem.selectedOption}:{" "}
                <span className="font-normal">
                  {currentItem.selectedOption ? getOptionText(currentItem, currentItem.selectedOption) : "None"}
                </span>
              </div>
            </div>

            {/* Correct Answer */}
            <div className="p-4 rounded-2xl border bg-emerald-950/20 border-emerald-500/30 text-emerald-200">
              <div className="text-xs uppercase tracking-wider font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Correct Answer:</span>
              </div>
              <div className="font-bold text-base text-white">
                Option {currentItem.correctOption}:{" "}
                <span className="font-normal text-slate-200">
                  {getOptionText(currentItem, currentItem.correctOption)}
                </span>
              </div>
            </div>
          </div>

          {/* Explanation */}
          {currentItem.explanation && (
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 text-xs sm:text-sm text-slate-300 space-y-1">
              <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span>Explanation &amp; Rationale:</span>
              </div>
              <p className="text-slate-400 leading-relaxed">{currentItem.explanation}</p>
            </div>
          )}

          {/* Stepper Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setSelectedIndex((prev) => Math.max(0, prev - 1))}
              disabled={selectedIndex === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-slate-500">
              {selectedIndex + 1} of {filteredReviews.length}
            </span>

            <button
              onClick={() =>
                setSelectedIndex((prev) => Math.min(filteredReviews.length - 1, prev + 1))
              }
              disabled={selectedIndex === filteredReviews.length - 1}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
