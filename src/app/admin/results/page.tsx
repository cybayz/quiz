"use client";

import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Timer,
  Trophy,
  Loader2,
  X,
  Calendar,
} from "lucide-react";
import { formatSecondsToTimer, formatDateTime } from "@/lib/utils";

interface ResultItem {
  id: string;
  participantName: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  totalTime: number;
  correctCount: number;
  wrongCount: number;
  status: string;
  certificateId: string | null;
  rank: number | null;
  createdAt: string;
  _count: { answers: number };
}

interface AttemptDetail {
  attempt: {
    id: string;
    participantName: string;
    totalScore: number;
    maxScore: number;
    percentage: number;
    totalTime: number;
    correctCount: number;
    wrongCount: number;
    status: string;
    certificateId: string | null;
    rank: number | null;
    createdAt: string;
  };
  answers: Array<{
    number: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    pointsAwarded: number;
    timeTaken: number;
    explanation: string | null;
  }>;
}

export default function AdminResultsPage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Inspector modal
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<AttemptDetail | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const loadResults = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        status: statusFilter,
        sortBy,
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/results?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setResults(data.attempts || []);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [page, statusFilter, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadResults();
  };

  const handleInspectAttempt = async (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setInspectLoading(true);
    try {
      const res = await fetch(`/api/admin/results/${attemptId}`);
      const data = await res.json();
      if (res.ok) {
        setInspectData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInspectLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Quiz Attempts &amp; Results</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete audit trail of all sessions, participant timings, score breakdown, and answers.
          </p>
        </div>

        <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800">
          Total Attempts: <strong className="text-white">{totalCount}</strong>
        </div>
      </div>

      {/* Control Bar: Search, Status, Sort */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participant name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
            {["ALL", "COMPLETED", "IN_PROGRESS"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st === "IN_PROGRESS" ? "In Progress" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="date" className="bg-slate-900">Sort: Latest Date</option>
              <option value="score" className="bg-slate-900">Sort: Highest Score</option>
              <option value="time" className="bg-slate-900">Sort: Fastest Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading attempts record...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-bold text-white text-base">No Attempts Found</h3>
            <p className="text-xs text-slate-400">
              No quiz attempts match your current search or filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-3 text-center">Rank</th>
                  <th className="py-3 px-3 text-right">Score</th>
                  <th className="py-3 px-3 text-right">Accuracy</th>
                  <th className="py-3 px-3 text-center">Correct / Wrong</th>
                  <th className="py-3 px-3 text-right">Total Time</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Date / Time</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {r.participantName}
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold">
                      {r.rank ? (
                        <span className="text-amber-400 font-mono">#{r.rank}</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-200">
                      {r.totalScore}
                    </td>

                    <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                      {r.percentage}%
                    </td>

                    <td className="py-3.5 px-3 text-center text-xs">
                      <span className="text-emerald-400 font-semibold">{r.correctCount}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-rose-400 font-semibold">{r.wrongCount}</span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-400 text-xs">
                      {formatSecondsToTimer(r.totalTime)}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right text-xs text-slate-500">
                      {formatDateTime(r.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleInspectAttempt(r.id)}
                        className="p-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all cursor-pointer"
                        title="View Detailed Answers"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Modal: Question-by-Question Answers */}
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-white">
                  Participant Attempt Audit
                </h3>
                {inspectData && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Participant: <strong className="text-white">{inspectData.attempt.participantName}</strong> &bull; Score:{" "}
                    <strong className="text-indigo-400">{inspectData.attempt.totalScore} pts</strong> ({inspectData.attempt.percentage}%)
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedAttemptId(null);
                  setInspectData(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectLoading || !inspectData ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading detailed answer logs...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inspectData.answers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No questions answered yet in this attempt.
                  </p>
                ) : (
                  inspectData.answers.map((ans) => (
                    <div
                      key={ans.number}
                      className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs sm:text-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-400 uppercase tracking-wider text-xs">
                          Question {ans.number}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs">Time: {ans.timeTaken}s</span>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              ans.pointsAwarded > 0
                                ? "text-emerald-400 bg-emerald-500/10"
                                : ans.pointsAwarded < 0
                                ? "text-rose-400 bg-rose-500/10"
                                : "text-slate-400 bg-slate-800"
                            }`}
                          >
                            {ans.pointsAwarded > 0
                              ? `+${ans.pointsAwarded} pts`
                              : `${ans.pointsAwarded} pts`}
                          </span>
                        </div>
                      </div>

                      <div className="font-semibold text-white">{ans.questionText}</div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div
                          className={`p-2.5 rounded-xl border ${
                            ans.isCorrect
                              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                              : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                          }`}
                        >
                          Selected: <strong>Option {ans.selectedOption}</strong>{" "}
                          {ans.isCorrect ? "✅" : "❌"}
                        </div>

                        <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-200">
                          Correct: <strong>Option {ans.correctOption}</strong> ✅
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
