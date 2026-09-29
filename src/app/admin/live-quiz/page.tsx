"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Presentation,
  Plus,
  Play,
  QrCode,
  Users,
  Trophy,
  Calendar,
  Trash2,
  ExternalLink,
  Loader2,
  X,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

interface LiveSessionItem {
  id: string;
  sessionCode: string;
  quizTitle: string;
  status: string;
  currentQuestionIndex: number;
  timePerQuestion?: number;
  questionSet?: string;
  createdAt: string;
  completedAt: string | null;
  _count: {
    participants: number;
    answers: number;
  };
}

export default function AdminLiveQuizManagementPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<LiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Question counts in bank
  const [mainCountInBank, setMainCountInBank] = useState(10);
  const [sampleCountInBank, setSampleCountInBank] = useState(5);

  // Form State
  const [questionSet, setQuestionSet] = useState<"MAIN" | "SAMPLE">("MAIN");
  const [quizTitle, setQuizTitle] = useState("Basilar Membrane Mechanics & Nonlinearity");
  const [questionCount, setQuestionCount] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(30);

  const handleSetChange = (newSet: "MAIN" | "SAMPLE") => {
    setQuestionSet(newSet);
    if (newSet === "SAMPLE") {
      setQuizTitle("Sample Practice Quiz (Demo & Pre-Test)");
      setQuestionCount(Math.min(sampleCountInBank, 5));
    } else {
      setQuizTitle("Basilar Membrane Mechanics & Nonlinearity");
      setQuestionCount(Math.min(mainCountInBank, 10));
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/live/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }

      // Check available questions count by category
      const qRes = await fetch("/api/admin/questions");
      if (qRes.ok) {
        const qData = await qRes.json();
        const activeMain = (qData.questions || []).filter(
          (q: any) => q.isActive && q.category !== "SAMPLE"
        ).length;
        const activeSample = (qData.questions || []).filter(
          (q: any) => q.isActive && q.category === "SAMPLE"
        ).length;
        setMainCountInBank(activeMain || 10);
        setSampleCountInBank(activeSample || 5);
        if (questionSet === "MAIN") {
          setQuestionCount(Math.min(10, activeMain || 10));
        } else {
          setQuestionCount(Math.min(5, activeSample || 5));
        }
      }

      // Check default timer from settings
      const sRes = await fetch("/api/admin/settings");
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.settings?.defaultQuestionTimer) {
          setTimePerQuestion(sData.settings.defaultQuestionTimer);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/live/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizTitle,
          questionCount,
          questionSet,
          timePerQuestion,
        }),
      });

      const data = await res.json();
      if (res.ok && data.session?.id) {
        router.push(`/admin/live/${data.session.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this live session?")) return;
    try {
      const res = await fetch(`/api/live/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
            <Presentation className="w-3.5 h-3.5" />
            Presentation Mode
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Live Presentation Quiz</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Host live interactive quizzes on a projector or TV with QR code joining, synchronized 30s timers, and live leaderboard.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Live Quiz Session</span>
        </button>
      </div>

      {/* Mode Comparison Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Standard Self-Paced Quiz</h3>
            <p className="text-xs text-slate-400 mt-1">
              Participants take the quiz individually at their own pace with randomized question orders.
            </p>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold mt-2.5"
            >
              <span>Launch Standard Quiz</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Live Presentation Quiz (Presenter Mode)</h3>
            <p className="text-xs text-slate-300 mt-1">
              Presenter controls questions on the projector; audience scans QR code to join and answer simultaneously on their phones.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-white font-semibold mt-2.5 cursor-pointer"
            >
              <span>Host New Presentation</span>
              <Play className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Sessions History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-base text-white">Live Quiz Sessions</h3>
          <span className="text-xs text-slate-500 font-mono">
            {sessions.length} sessions
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading live sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Presentation className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-bold text-white text-base">No Live Sessions Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click &quot;Create Live Quiz Session&quot; to launch an interactive presentation quiz for your audience.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Join Code</th>
                  <th className="py-3 px-4">Session Title</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Participants</th>
                  <th className="py-3 px-3 text-center">Answers</th>
                  <th className="py-3 px-4 text-right">Created</th>
                  <th className="py-3 px-4 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/admin/live/${s.id}`)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-black text-indigo-400 text-sm tracking-widest bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">
                        {s.sessionCode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{s.quizTitle}</span>
                        {s.questionSet === "SAMPLE" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Practice Demo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            MSc Exam
                          </span>
                        )}
                        {s.timePerQuestion && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            {s.timePerQuestion}s/Q
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          s.status === "COMPLETED"
                            ? "bg-slate-800 text-slate-400 border border-slate-700"
                            : s.status === "QUESTION_ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {s.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold text-white">
                      {s._count.participants}
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono text-slate-400">
                      {s._count.answers}
                    </td>

                    <td className="py-3.5 px-4 text-right text-xs text-slate-500">
                      {formatDateTime(s.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/live/${s.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-semibold text-xs flex items-center gap-1 transition-all"
                        >
                          <Play className="w-3 h-3" />
                          <span>Enter</span>
                        </Link>

                        <button
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          title="Delete Session"
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Presentation className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-white text-base">
                  Launch New Live Quiz
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs sm:text-sm">
              {/* Question Paper / Set Selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Select Question Paper / Set:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    onClick={() => handleSetChange("MAIN")}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      questionSet === "MAIN"
                        ? "bg-indigo-600/20 border-indigo-500 text-white ring-2 ring-indigo-500/50"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs sm:text-sm text-indigo-300">
                        MSc Audiology Exam
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        {mainCountInBank} Qs
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Actual exam on Basilar Membrane Mechanics &amp; Nonlinearity.
                    </p>
                  </div>

                  <div
                    onClick={() => handleSetChange("SAMPLE")}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      questionSet === "SAMPLE"
                        ? "bg-amber-600/20 border-amber-500 text-white ring-2 ring-amber-500/50"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs sm:text-sm text-amber-300">
                        🧪 Sample Practice Test
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        {sampleCountInBank} Qs
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Practice/demo questions to test connectivity without leaking real questions!
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Presentation Session Title:
                </label>
                <input
                  type="text"
                  required
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g. Q3 Live Knowledge Challenge"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Timer per Question and Question Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Timer per Question:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={300}
                      required
                      value={timePerQuestion}
                      onChange={(e) =>
                        setTimePerQuestion(
                          Math.max(5, Math.min(300, parseInt(e.target.value, 10) || 30))
                        )
                      }
                      className="w-24 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400">seconds</span>
                  </div>
                  {/* Quick selection chips */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {[15, 20, 30, 45, 60].map((sec) => (
                      <button
                        type="button"
                        key={sec}
                        onClick={() => setTimePerQuestion(sec)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                          timePerQuestion === sec
                            ? "bg-indigo-600 text-white font-bold"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Number of Questions:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={questionSet === "SAMPLE" ? sampleCountInBank : mainCountInBank}
                      value={questionCount}
                      onChange={(e) => {
                        const maxQ =
                          questionSet === "SAMPLE" ? sampleCountInBank : mainCountInBank;
                        setQuestionCount(
                          Math.max(1, Math.min(maxQ, parseInt(e.target.value, 10) || 1))
                        );
                      }}
                      className="w-24 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400">
                      out of {questionSet === "SAMPLE" ? sampleCountInBank : mainCountInBank} active
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 text-xs text-slate-400 space-y-1">
                <span className="font-bold text-indigo-300 block">Session Configuration:</span>
                <p>&bull; <strong>{timePerQuestion} seconds</strong> countdown per question enforced by server.</p>
                <p>&bull; Mode: <strong>{questionSet === "SAMPLE" ? "🧪 Sample Practice (Safe for testing)" : "🎓 Official Examination"}</strong></p>
                <p>&bull; Synchronized real-time leaderboards between questions.</p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Launch Presentation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
