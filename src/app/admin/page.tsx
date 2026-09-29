"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Users,
  CheckCircle,
  Trophy,
  Timer,
  TrendingUp,
  BarChart3,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { formatSecondsToTimer, formatDate } from "@/lib/utils";

interface DashboardStats {
  totalQuestions: number;
  activeQuestions: number;
  inactiveQuestions: number;
  totalAttempts: number;
  completedAttempts: number;
  inProgressAttempts: number;
  averageScore: number;
  highestScore: number;
  averageTime: number;
  averagePercentage: number;
  recentAttempts: Array<{
    id: string;
    participantName: string;
    totalScore: number;
    maxScore: number;
    percentage: number;
    totalTime: number;
    status: string;
    createdAt: string;
  }>;
  distribution: {
    "90-100%": number;
    "75-89%": number;
    "50-74%": number;
    "Below 50%": number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/stats");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load dashboard metrics.");
        } else {
          setStats(data);
        }
      } catch (err) {
        console.error(err);
        setError("Error connecting to server.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading platform analytics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-white font-bold">Failed to load statistics</h3>
        <p className="text-xs text-slate-400">{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Questions",
      value: stats.totalQuestions,
      subtext: `${stats.activeQuestions} active questions`,
      icon: HelpCircle,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
    },
    {
      title: "Quiz Attempts",
      value: stats.totalAttempts,
      subtext: `${stats.completedAttempts} completed attempts`,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Average Score",
      value: stats.averageScore,
      subtext: `Avg Accuracy: ${stats.averagePercentage}%`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Highest Score",
      value: stats.highestScore,
      subtext: "Top peak score achieved",
      icon: Trophy,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      title: "Average Time",
      value: formatSecondsToTimer(stats.averageTime),
      subtext: "Per completed attempt",
      icon: Timer,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      title: "Completion Rate",
      value:
        stats.totalAttempts > 0
          ? `${Math.round((stats.completedAttempts / stats.totalAttempts) * 100)}%`
          : "0%",
      subtext: `${stats.inProgressAttempts} currently in progress`,
      icon: CheckCircle,
      color: "text-teal-400",
      bg: "bg-teal-500/10",
    },
  ];

  const totalDist = Object.values(stats.distribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Platform Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time analytics, participant activity, and scoring distributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/questions"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Manage Questions</span>
          </Link>
          <Link
            href="/admin/settings"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-slate-700"
          >
            <span>Scoring Rules</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {c.title}
                </p>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {c.value}
                </div>
                <p className="text-xs text-slate-500 mt-1">{c.subtext}</p>
              </div>

              <div className={`p-3 rounded-2xl ${c.bg} ${c.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Distribution Chart */}
        <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Score Distribution
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {stats.completedAttempts} attempts
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {Object.entries(stats.distribution).map(([range, count]) => {
              const pct = Math.round((count / totalDist) * 100);
              let barColor = "bg-indigo-500";
              if (range === "90-100%") barColor = "bg-emerald-500";
              else if (range === "75-89%") barColor = "bg-blue-500";
              else if (range === "50-74%") barColor = "bg-amber-500";
              else barColor = "bg-rose-500";

              return (
                <div key={range} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">{range}</span>
                    <span className="text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Attempts Table */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white">Recent Quiz Attempts</h3>
            <Link
              href="/admin/results"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All Results</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">Participant</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3 text-right">Accuracy</th>
                  <th className="py-2.5 px-3 text-right">Duration</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stats.recentAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No attempts recorded yet.
                    </td>
                  </tr>
                ) : (
                  stats.recentAttempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-semibold text-white">
                        {att.participantName}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                        {att.totalScore}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-400">
                        {att.percentage}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {formatSecondsToTimer(att.totalTime)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            att.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {formatDate(att.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
