"use client";

import { useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Award, Download, Printer, X, CheckCircle, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    participantName: string;
    quizTitle: string;
    totalScore: number;
    maxScore: number;
    percentage: number;
    completedAt: string | Date;
    rank?: number | null;
    certificateId: string;
  };
}

export default function CertificateModal({
  isOpen,
  onClose,
  data,
}: CertificateModalProps) {
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);

      // Create high-res vector PDF using jsPDF
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4", // 841.89 x 595.28
      });

      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();

      // Background Fill
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, width, height, "F");

      // Outer Decorative Border
      doc.setDrawColor(99, 102, 241); // indigo-500
      doc.setLineWidth(4);
      doc.roundedRect(25, 25, width - 50, height - 50, 10, 10, "S");

      // Inner Border
      doc.setDrawColor(217, 119, 6); // amber-600 gold
      doc.setLineWidth(1.5);
      doc.roundedRect(35, 35, width - 70, height - 70, 8, 8, "S");

      // Header Banner
      doc.setTextColor(165, 180, 252); // indigo-300
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("QUIZMASTER CERTIFICATION AUTHORITY", width / 2, 80, { align: "center" });

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.text("CERTIFICATE OF ACHIEVEMENT", width / 2, 130, { align: "center" });

      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.text("This prestigious award is proudly presented to", width / 2, 175, { align: "center" });

      // Participant Name
      doc.setTextColor(251, 191, 36); // amber-400
      doc.setFont("helvetica", "bold");
      doc.setFontSize(36);
      doc.text(data.participantName, width / 2, 230, { align: "center" });

      // Underline under name
      doc.setDrawColor(251, 191, 36);
      doc.setLineWidth(1.5);
      doc.line(width / 2 - 180, 245, width / 2 + 180, 245);

      // Quiz Details
      doc.setTextColor(226, 232, 240); // slate-200
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.text(
        `For outstanding performance in completing the challenge:`,
        width / 2,
        285,
        { align: "center" }
      );

      doc.setTextColor(129, 140, 248); // indigo-400
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(`"${data.quizTitle}"`, width / 2, 320, { align: "center" });

      // Score Stats
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      const scoreLine = `Score: ${data.totalScore} / ${data.maxScore}   |   Accuracy: ${data.percentage}%   |   Global Rank: #${data.rank || 1}`;
      doc.text(scoreLine, width / 2, 365, { align: "center" });

      // Date & Verification
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Awarded on: ${formatDate(data.completedAt)}`, 70, 480);
      doc.text(`Verification ID: ${data.certificateId}`, 70, 500);

      // Signatures
      doc.setTextColor(226, 232, 240);
      doc.setFont("helvetica", "bold");
      doc.text("Verified Official Assessment", width - 240, 480);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("Quiz Evaluation Committee", width - 240, 500);

      // Save PDF
      const cleanName = data.participantName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      doc.save(`Quiz-Certificate-${cleanName}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-4 sm:p-8 space-y-6 my-auto">
        {/* Top Actions */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-lg text-white">Certificate of Completion</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? "Generating..." : "Download PDF"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Printable Canvas Preview */}
        <div
          id="printable-certificate"
          ref={certRef}
          className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border-4 border-indigo-500/40 rounded-2xl p-6 sm:p-12 text-center shadow-inner overflow-hidden"
        >
          {/* Ornamental Inner Border */}
          <div className="absolute inset-2.5 sm:inset-4 border-2 border-amber-500/40 rounded-xl pointer-events-none" />

          {/* Watermark Logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Award className="w-96 h-96 text-indigo-400" />
          </div>

          <div className="relative z-10 space-y-4 sm:space-y-6">
            <div className="text-xs uppercase tracking-widest text-indigo-300 font-bold">
              QuizMaster Official Certification
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-wide">
              CERTIFICATE OF ACHIEVEMENT
            </h1>

            <p className="text-xs sm:text-sm text-slate-400">
              This certificate is proudly awarded to:
            </p>

            <div className="py-2">
              <span className="text-2xl sm:text-4xl font-extrabold text-amber-400 border-b-2 border-amber-400/60 pb-1.5 px-6 inline-block">
                {data.participantName}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              for successfully demonstrating proficiency and speed in the live examination:
            </p>

            <div className="text-lg sm:text-xl font-bold text-indigo-300">
              &ldquo;{data.quizTitle}&rdquo;
            </div>

            {/* Score Grid */}
            <div className="max-w-md mx-auto grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-medium">Final Score</div>
                <div className="text-sm sm:text-base font-extrabold text-white">
                  {data.totalScore} / {data.maxScore}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-medium">Accuracy</div>
                <div className="text-sm sm:text-base font-extrabold text-emerald-400">
                  {data.percentage}%
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-medium">Rank</div>
                <div className="text-sm sm:text-base font-extrabold text-amber-400">
                  #{data.rank || 1}
                </div>
              </div>
            </div>

            {/* Footer verification */}
            <div className="pt-6 mt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <div className="text-left space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticated Certificate</span>
                </div>
                <div>ID: <strong className="font-mono text-slate-300">{data.certificateId}</strong></div>
                <div>Issued on: {formatDate(data.completedAt)}</div>
              </div>

              <div className="text-center sm:text-right">
                <div className="font-serif italic text-base text-slate-200">
                  QuizMaster Board
                </div>
                <div className="text-[11px] text-slate-500">Autonomous Evaluation Engine</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
