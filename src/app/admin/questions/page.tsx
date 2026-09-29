"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Loader2,
  X,
  HelpCircle,
} from "lucide-react";

interface QuestionItem {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function QuestionsAdminPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<QuestionItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "A" as "A" | "B" | "C" | "D",
    explanation: "",
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "ALL") params.set("filter", filter);

      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions || []);
      } else {
        setError(data.error || "Failed to load questions.");
      }
    } catch (err) {
      console.error(err);
      setError("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuestions();
  };

  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormData({
      questionText: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "A",
      explanation: "",
      isActive: true,
    });
    setFormError(null);
    setIsEditorOpen(true);
  };

  const openEditModal = (q: QuestionItem) => {
    setEditingQuestion(q);
    setFormData({
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanation: q.explanation || "",
      isActive: q.isActive,
    });
    setFormError(null);
    setIsEditorOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.questionText.trim()) {
      setFormError("Question text cannot be empty.");
      return;
    }
    if (
      !formData.optionA.trim() ||
      !formData.optionB.trim() ||
      !formData.optionC.trim() ||
      !formData.optionD.trim()
    ) {
      setFormError("All 4 options (A, B, C, and D) must be filled.");
      return;
    }

    try {
      setSaving(true);
      const url = editingQuestion
        ? `/api/admin/questions/${editingQuestion.id}`
        : "/api/admin/questions";
      const method = editingQuestion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save question.");
        setSaving(false);
        return;
      }

      setIsEditorOpen(false);
      loadQuestions();
    } catch (err) {
      console.error(err);
      setFormError("Network error saving question.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (q: QuestionItem) => {
    try {
      const res = await fetch(`/api/admin/questions/${q.id}`, {
        method: "DELETE", // standard toggle
      });
      if (res.ok) {
        loadQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Question Management</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create, modify, preview, and activate/deactivate quiz questions.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Question</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or options..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "ALL"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "ACTIVE"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("INACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "INACTIVE"
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading questions from database...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-bold text-white text-base">No Questions Found</h3>
            <p className="text-xs text-slate-400">
              Try adjusting your search filter or click &quot;Add New Question&quot; above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Question Text</th>
                  <th className="py-3 px-4 w-32">Correct Key</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {questions.map((q, idx) => (
                  <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white line-clamp-2">
                        {q.questionText}
                      </div>
                      {q.explanation && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          💡 {q.explanation}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-xs">
                        Option {q.correctOption}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(q)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                          q.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            q.isActive ? "bg-emerald-400" : "bg-slate-500"
                          }`}
                        />
                        <span>{q.isActive ? "Active" : "Inactive"}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          title="Preview Question"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openEditModal(q)}
                          title="Edit Question"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleActive(q)}
                          title={q.isActive ? "Deactivate Question" : "Activate Question"}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            q.isActive
                              ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                              : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {q.isActive ? (
                            <ToggleRight className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-slate-500" />
                          )}
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

      {/* Editor Modal (Add/Edit) */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <h3 className="font-extrabold text-lg text-white">
                {editingQuestion ? "Edit Question" : "Create New Question"}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Question Text:
                </label>
                <textarea
                  rows={3}
                  value={formData.questionText}
                  onChange={(e) =>
                    setFormData({ ...formData, questionText: e.target.value })
                  }
                  placeholder="What is the time complexity of binary search?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Option A:
                  </label>
                  <input
                    type="text"
                    value={formData.optionA}
                    onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Option B:
                  </label>
                  <input
                    type="text"
                    value={formData.optionB}
                    onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Option C:
                  </label>
                  <input
                    type="text"
                    value={formData.optionC}
                    onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Option D:
                  </label>
                  <input
                    type="text"
                    value={formData.optionD}
                    onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Correct Answer:
                  </label>
                  <select
                    value={formData.correctOption}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        correctOption: e.target.value as "A" | "B" | "C" | "D",
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Status:
                  </label>
                  <select
                    value={formData.isActive ? "active" : "inactive"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isActive: e.target.value === "active",
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Explanation (optional):
                </label>
                <textarea
                  rows={2}
                  value={formData.explanation}
                  onChange={(e) =>
                    setFormData({ ...formData, explanation: e.target.value })
                  }
                  placeholder="Explains why this answer is correct..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingQuestion ? "Update Question" : "Create Question"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs uppercase tracking-wider font-extrabold text-indigo-400">
                Participant View Preview
              </span>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-white leading-relaxed">
              {previewQuestion.questionText}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { key: "A", text: previewQuestion.optionA },
                { key: "B", text: previewQuestion.optionB },
                { key: "C", text: previewQuestion.optionC },
                { key: "D", text: previewQuestion.optionD },
              ].map((opt) => (
                <div
                  key={opt.key}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    opt.key === previewQuestion.correctOption
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-800 bg-slate-800/40 text-slate-300"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                      opt.key === previewQuestion.correctOption
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {opt.key}
                  </span>
                  <span>{opt.text}</span>
                  {opt.key === previewQuestion.correctOption && (
                    <span className="ml-auto text-[10px] text-emerald-400 font-bold">
                      (Correct)
                    </span>
                  )}
                </div>
              ))}
            </div>

            {previewQuestion.explanation && (
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-xs text-slate-300">
                <span className="font-bold text-indigo-300">Explanation: </span>
                <span>{previewQuestion.explanation}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
