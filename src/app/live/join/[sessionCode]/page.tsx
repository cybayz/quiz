"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Users, ArrowRight, Loader2, AlertCircle, Play } from "lucide-react";

export default function ParticipantJoinPage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = (params?.sessionCode as string)?.toUpperCase() || "";

  const [participantName, setParticipantName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("Live Presentation Quiz");
  const [checkingReconnect, setCheckingReconnect] = useState(true);

  // Check if participant has an existing session token saved in localStorage
  useEffect(() => {
    async function checkAutoReconnect() {
      if (!sessionCode) return;
      try {
        const savedToken = localStorage.getItem(`live_token_${sessionCode}`);
        if (savedToken) {
          const res = await fetch("/api/live/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionCode,
              participantToken: savedToken,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.sessionId && data.participant?.id) {
              localStorage.setItem(`live_participant_${data.sessionId}`, data.participant.id);
              sessionStorage.setItem(`live_participant_${data.sessionId}`, data.participant.id);
              router.push(`/live/${data.sessionId}?participantId=${data.participant.id}`);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Auto-reconnect error:", err);
      } finally {
        setCheckingReconnect(false);
      }
    }

    checkAutoReconnect();
  }, [sessionCode, router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = participantName.trim();
    if (!trimmed || trimmed.length < 2) {
      setError("Please enter your name (at least 2 characters) to join.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const savedToken = localStorage.getItem(`live_token_${sessionCode}`);
      const res = await fetch("/api/live/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode,
          participantName: trimmed,
          participantToken: savedToken || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join live quiz.");
        setLoading(false);
        return;
      }

      // Save token in localStorage and sessionStorage for seamless reconnection
      if (data.participant?.id) {
        localStorage.setItem(`live_token_${sessionCode}`, data.participant.token || "");
        localStorage.setItem(`live_name_${sessionCode}`, data.participant.name);
        localStorage.setItem(`live_pid_${sessionCode}`, data.participant.id);
        localStorage.setItem(`live_participant_${data.sessionId}`, data.participant.id);
        localStorage.setItem(`live_pname_${data.sessionId}`, data.participant.name);
        sessionStorage.setItem(`live_participant_${data.sessionId}`, data.participant.id);
        sessionStorage.setItem(`live_pname_${data.sessionId}`, data.participant.name);
      }

      router.push(`/live/${data.sessionId}?participantId=${data.participant.id}`);
    } catch (err) {
      console.error(err);
      setError("Network connection issue. Please check your internet and retry.");
      setLoading(false);
    }
  };

  if (checkingReconnect) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs text-slate-400">Connecting to session...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md"
        >
          {/* Header Badge */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Live Presentation Mode
            </span>
            <h1 className="text-2xl font-black text-white">Join Live Quiz</h1>
            <p className="text-xs text-slate-400 mt-1">
              Join Code: <strong className="font-mono text-indigo-400 tracking-wider text-sm">{sessionCode}</strong>
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
              >
                Enter Your Name:
              </label>
              <input
                id="name"
                type="text"
                required
                maxLength={40}
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Joining Session...</span>
                </>
              ) : (
                <>
                  <span>Join Quiz</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-500">
            No login required &bull; Answers will be submitted in real time from your device
          </div>
        </motion.div>
      </div>
    </div>
  );
}
