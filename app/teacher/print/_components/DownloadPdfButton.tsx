"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface DownloadPdfButtonProps {
  targetRef: React.RefObject<HTMLDivElement>;
  fileName?: string;
  buttonText?: string;
}

export default function DownloadPdfButton({ 
  targetRef, 
  fileName = "Edify_Test_Document.pdf",
  buttonText = "PDF Yuklab Olish" 
}: DownloadPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!targetRef.current) return toast.error("Hujjat topilmadi!");

    setIsGenerating(true);
    const element = targetRef.current;

    // 1. Temporarily remove the UI zoom scale so the PDF captures at 100% quality
    const originalTransform = element.style.transform;
    element.style.transform = "none";

    try {
      // 2. Dynamically import the library (fixes Next.js SSR issues)
      const html2pdf = (await import("html2pdf.js")).default;

      // 3. Configure PDF settings
      const opt: any = {
        margin:       0, 
        filename:     fileName,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] } 
      };

      // 4. Generate and Save
      await html2pdf().set(opt).from(element).save();
      toast.success("PDF muvaffaqiyatli yuklandi!");

    } catch (error) {
      console.error("PDF avlodida xatolik:", error);
      toast.error("PDF yaratishda xatolik yuz berdi.");
    } finally {
      // 5. Restore the UI zoom scale
      element.style.transform = originalTransform;
      setIsGenerating(false);
    }
  };

  return (
    <button 
      onClick={handleDownload} 
      disabled={isGenerating}
      className="w-full py-3.5 bg-white border-2 border-slate-200 hover:border-indigo-500 text-slate-700 hover:text-indigo-600 font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
    >
      {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
      {isGenerating ? "PDF Yaratilmoqda..." : buttonText}
    </button>
  );
}