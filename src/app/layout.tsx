import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "QuizMaster Pro | Real-Time Full-Stack Quiz Platform",
  description: "Dynamic quiz application with speed-based scoring, live timer, negative marking, instant animated feedback, verifiable certificates, and admin control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span>QuizMaster Pro &copy; {new Date().getFullYear()} &bull; Built with Next.js, PostgreSQL &amp; Prisma</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <a href="/leaderboard" className="hover:text-indigo-400 transition-colors">Leaderboard</a>
              <span className="text-slate-700">&bull;</span>
              <a href="/admin" className="hover:text-indigo-400 transition-colors">Admin Dashboard</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
