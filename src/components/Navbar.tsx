"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Trophy, Shield, HelpCircle, Menu, X, Radio } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If in active quiz attempt or live presentation screen, show minimal distraction-free header
  const isTakingQuiz =
    pathname.startsWith("/quiz/") ||
    pathname.startsWith("/live/") ||
    pathname.startsWith("/admin/live/");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                QuizMaster
              </span>
              <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold -mt-1">
                Live Challenge
              </span>
            </div>
          </Link>

          {!isTakingQuiz && (
            <>
              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  href="/"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/"
                      ? "text-white bg-slate-800/80"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    Quiz Home
                  </span>
                </Link>

                <Link
                  href="/live/join"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith("/live/join")
                      ? "text-white bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                      : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    Join Live Quiz
                  </span>
                </Link>

                <Link
                  href="/leaderboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/leaderboard"
                      ? "text-white bg-slate-800/80"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Leaderboard
                  </span>
                </Link>

                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin")
                      ? "text-white bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-purple-400" />
                    Admin Panel
                  </span>
                </Link>
              </nav>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </>
          )}

          {isTakingQuiz && (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Session Active
            </div>
          )}
        </div>

        {/* Mobile dropdown */}
        {!isTakingQuiz && mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800/80 py-3 space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
            >
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              Quiz Home
            </Link>
            <Link
              href="/live/join"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-emerald-400 hover:bg-slate-800"
            >
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              Join Live Quiz
            </Link>
            <Link
              href="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
            >
              <Trophy className="w-5 h-5 text-amber-400" />
              Leaderboard
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800"
            >
              <Shield className="w-5 h-5 text-purple-400" />
              Admin Panel
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
