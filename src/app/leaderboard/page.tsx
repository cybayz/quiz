"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  Medal,
  Timer,
  Search,
  Sparkles,
  ArrowRight,
  Loader2,
  Award,
  Zap,
} from "lucide-react";
import { formatSecondsToTimer, formatDate } from "@/lib/utils";

interface LeaderboardItem {
  rank: number;
  id: string;
  participantName: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  totalTime: number;
  completedAt: string;
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [quizTitle, setQuizTitle] = useState("Knowledge Challenge");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard || []);
          setQuizTitle(data.quizTitle || "Knowledge Challenge");
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, []);

  const filtered = leaderboard.filter((item) =>
    item.participantName.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
            <Trophy className="w-3.5 h-3.5" />
            Global Hall of Fame
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Quiz Leaderboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Top performers in {quizTitle}. Ranked by highest score, then fastest completion time.
          </p>
        </div>

        <Link
          href="/"
          className="px-5 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 text-sm cursor-pointer"
        >
          <span>Take Challenge</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Top 3 Podium Cards (if enough participants) */}
      {!loading && leaderboard.length >= 3 && !searchTerm && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Silver #2 */}
          <div className="sm:order-1 order-2 p-5 rounded-3xl bg-slate-900 border border-slate-700/60 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-300 font-extrabold text-xl flex items-center justify-center mb-3 border border-slate-700">
              #2
            </div>
            <h3 className="font-bold text-lg text-white truncate max-w-full">
              {leaderboard[1].participantName}
            </h3>
            <div className="text-2xl font-black text-slate-200 mt-1">
              {leaderboard[1].totalScore} <span className="text-xs text-slate-500 font-normal">pts</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <span>{leaderboard[1].percentage}%</span>
              <span>&bull;</span>
              <span>{formatSecondsToTimer(leaderboard[1].totalTime)}</span>
            </div>
          </div>

          {/* Gold #1 */}
          <div className="sm:order-2 order-1 p-6 rounded-3xl bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/50 flex flex-col items-center text-center shadow-xl shadow-amber-500/10 relative sm:-translate-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center mb-3 shadow-lg shadow-amber-500/30">
              #1
            </div>
            <h3 className="font-extrabold text-xl text-white truncate max-w-full">
              {leaderboard[0].participantName}
            </h3>
            <div className="text-3xl font-black text-amber-400 mt-1">
              {leaderboard[0].totalScore} <span className="text-sm text-amber-400/80 font-normal">pts</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-2 font-medium">
              <span className="text-emerald-400">{leaderboard[0].percentage}%</span>
              <span>&bull;</span>
              <span>{formatSecondsToTimer(leaderboard[0].totalTime)}</span>
            </div>
          </div>

          {/* Bronze #3 */}
          <div className="sm:order-3 order-3 p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-amber-900/40 text-amber-600 font-extrabold text-xl flex items-center justify-center mb-3 border border-amber-800/40">
              #3
            </div>
            <h3 className="font-bold text-lg text-white truncate max-w-full">
              {leaderboard[2].participantName}
            </h3>
            <div className="text-2xl font-black text-slate-200 mt-1">
              {leaderboard[2].totalScore} <span className="text-xs text-slate-500 font-normal">pts</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <span>{leaderboard[2].percentage}%</span>
              <span>&bull;</span>
              <span>{formatSecondsToTimer(leaderboard[2].totalTime)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by participant name..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Leaderboard Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading standings...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-bold text-white text-base">No Records Found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {searchTerm
                ? "No participant matches your search query."
                : "No completed quiz attempts yet. Be the first to take the quiz!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 sm:px-6 w-20">Rank</th>
                  <th className="py-3.5 px-4">Participant</th>
                  <th className="py-3.5 px-4 text-right">Score</th>
                  <th className="py-3.5 px-4 text-right">Percentage</th>
                  <th className="py-3.5 px-4 text-right">Time</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filtered.map((entry) => {
                  const isTopThree = entry.rank <= 3;
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-4 px-4 sm:px-6 font-bold">
                        <div className="flex items-center gap-1.5">
                          {entry.rank === 1 ? (
                            <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs">
                              #1
                            </span>
                          ) : entry.rank === 2 ? (
                            <span className="w-7 h-7 rounded-lg bg-slate-300/20 text-slate-200 border border-slate-400/30 flex items-center justify-center text-xs">
                              #2
                            </span>
                          ) : entry.rank === 3 ? (
                            <span className="w-7 h-7 rounded-lg bg-amber-900/30 text-amber-600 border border-amber-800/30 flex items-center justify-center text-xs">
                              #3
                            </span>
                          ) : (
                            <span className="text-slate-400 pl-2">#{entry.rank}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-semibold text-white">
                        {entry.participantName}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-100">
                        {entry.totalScore}
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-emerald-400">
                        {entry.percentage}%
                      </td>

                      <td className="py-4 px-4 text-right font-mono text-slate-400 text-xs">
                        {formatSecondsToTimer(entry.totalTime)}
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right text-xs text-slate-500 hidden md:table-cell">
                        {formatDate(entry.completedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
