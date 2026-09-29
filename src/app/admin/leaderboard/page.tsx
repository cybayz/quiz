"use client";

import { useEffect, useState } from "react";
import {
  Trophy,
  Search,
  Timer,
  Award,
  Loader2,
  Calendar,
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

export default function AdminLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  const filtered = leaderboard.filter((item) =>
    item.participantName.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Global Leaderboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete ranking order: High Score &rarr; Fastest Completion Duration Tie-Breaker.
          </p>
        </div>

        <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800">
          Ranked Finishers: <strong className="text-amber-400">{leaderboard.length}</strong>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter ranked participant..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading standings...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-bold text-white text-base">No Entries</h3>
            <p className="text-xs text-slate-400">
              No completed attempts meet your filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 w-20">Rank</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                  <th className="py-3 px-4 text-right">Total Time</th>
                  <th className="py-3 px-4 text-right">Completed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-mono ${
                          item.rank === 1
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : item.rank === 2
                            ? "bg-slate-300/20 text-slate-200 border border-slate-400/30"
                            : item.rank === 3
                            ? "bg-amber-900/30 text-amber-600 border border-amber-800/30"
                            : "text-slate-400"
                        }`}
                      >
                        #{item.rank}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-white">
                      {item.participantName}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">
                      {item.totalScore}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      {item.percentage}%
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-xs">
                      {formatSecondsToTimer(item.totalTime)}
                    </td>

                    <td className="py-3.5 px-4 text-right text-xs text-slate-500">
                      {formatDate(item.completedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
