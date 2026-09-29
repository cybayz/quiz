"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  Award,
  CheckCircle2,
  XCircle,
  Timer,
  RotateCcw,
  Eye,
  Download,
  Printer,
  ChevronRight,
  Share2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatSecondsToTimer } from "@/lib/utils";
import CertificateModal from "@/components/CertificateModal";
import { fireGrandCelebration } from "@/components/ConfettiEffect";

interface ResultData {
  participantName: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  totalTime: number;
  correctCount: number;
  wrongCount: number;
  completedAt: string;
  certificateId: string;
  rank: number;
  quizTitle: string;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  useEffect(() => {
    async function fetchResult() {
      try {
        setLoading(true);
        const res = await fetch(`/api/quiz/${attemptId}/review`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load quiz results.");
          setLoading(false);
          return;
        }

        const settingsRes = await fetch("/api/quiz/settings");
        let quizTitle = "NextGen Knowledge Challenge";
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          quizTitle = s.settings.quizTitle;
        }

        setResult({
          participantName: data.participantName,
          totalScore: data.totalScore,
          maxScore: data.maxScore,
          percentage: data.percentage,
          totalTime: data.totalTime,
          correctCount: data.correctCount,
          wrongCount: data.wrongCount,
          completedAt: data.completedAt,
          certificateId: data.certificateId,
          rank: data.rank,
          quizTitle,
        });

        fireGrandCelebration();
      } catch (err) {
        console.error(err);
        setError("Error loading results.");
      } finally {
        setLoading(false);
      }
    }

    if (attemptId) {
      fetchResult();
    }
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm">Calculating final score and ranking...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Results Unavailable</h2>
          <p className="text-sm text-slate-400">{error || "Could not retrieve completed quiz."}</p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Performance Tier
  let gradeBadge = "Outstanding!";
  let gradeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (result.percentage < 50) {
    gradeBadge = "Needs Practice";
    gradeColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
  } else if (result.percentage < 75) {
    gradeBadge = "Proficient";
    gradeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
  } else if (result.percentage < 90) {
    gradeBadge = "Excellent";
    gradeColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md relative overflow-hidden"
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Celebration Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border mb-2 uppercase tracking-wider">
            <span className={gradeColor}>
              {gradeBadge} Performance
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Congratulations, {result.participantName}!
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            You have successfully completed the challenge. Here is your official report card.
          </p>
        </div>

        {/* Big Score Card */}
        <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 border border-indigo-500/30 text-center shadow-lg">
          <div className="text-xs uppercase tracking-widest text-indigo-300 font-bold mb-1">
            Your Final Score
          </div>
          <div className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-2">
            {result.totalScore}{" "}
            <span className="text-2xl sm:text-3xl font-semibold text-slate-500">
              / {result.maxScore}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
            {result.percentage}%
          </div>
        </div>

        {/* Breakdown Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col items-center text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Correct</span>
            <span className="text-lg font-bold text-white">{result.correctCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col items-center text-center">
            <XCircle className="w-5 h-5 text-rose-400 mb-1" />
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Wrong</span>
            <span className="text-lg font-bold text-white">{result.wrongCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col items-center text-center">
            <Timer className="w-5 h-5 text-indigo-400 mb-1" />
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Total Time</span>
            <span className="text-lg font-bold text-white font-mono">
              {formatSecondsToTimer(result.totalTime)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col items-center text-center">
            <Trophy className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Current Rank</span>
            <span className="text-lg font-bold text-amber-400">#{result.rank}</span>
          </div>
        </div>

        {/* Actions Button Bar */}
        <div className="space-y-3">
          {/* Certificate Action */}
          <button
            type="button"
            onClick={() => setShowCertModal(true)}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Award className="w-5 h-5 text-slate-950" />
            <span>Download &amp; Print Certificate</span>
          </button>

          {/* Secondary Actions Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href={`/review/${attemptId}`}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Review Answers</span>
            </Link>

            <Link
              href="/leaderboard"
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>View Leaderboard</span>
            </Link>
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Take Quiz Again with Fresh Questions</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Certificate Modal */}
      {result && (
        <CertificateModal
          isOpen={showCertModal}
          onClose={() => setShowCertModal(false)}
          data={{
            participantName: result.participantName,
            quizTitle: result.quizTitle,
            totalScore: result.totalScore,
            maxScore: result.maxScore,
            percentage: result.percentage,
            completedAt: result.completedAt,
            rank: result.rank,
            certificateId: result.certificateId,
          }}
        />
      )}
    </div>
  );
}
