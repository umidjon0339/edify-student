'use client';

import { Phone, Send, Github, Linkedin } from 'lucide-react';

export default function AboutTab({ t }: { t: any }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* 🟢 PREMIUM HERO HEADER */}
      <div className="relative h-56 bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500 rounded-full mix-blend-screen filter blur-[64px] opacity-40 -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-500 rounded-full mix-blend-screen filter blur-[64px] opacity-40 translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white rounded-[1.2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-4 rotate-3 hover:rotate-0 transition-transform">
              <span className="text-3xl font-black bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-transparent">E</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Edify<span className="text-indigo-400">Teacher</span></h2>
          <p className="text-slate-400 text-[10px] font-black mt-1.5 uppercase tracking-widest">{t.about.title}</p>
        </div>
      </div>

      <div className="p-8 md:p-10">
        <div className="mb-12 text-center max-w-2xl mx-auto">
            <h3 className="text-[18px] font-black text-slate-800 mb-3">{t.about.descTitle}</h3>
            <p className="text-slate-500 font-medium text-[14px] leading-relaxed">{t.about.desc}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SUPPORT CONTACTS */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> {t.about.support}
              </h3>
              
              <a href="https://t.me/Umidjon0339" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-[0_8px_30px_rgb(59,130,246,0.08)] hover:border-blue-200 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white bg-gradient-to-br from-blue-400 to-blue-600 group-hover:scale-110 transition-transform duration-300">
                    <Send size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Telegram</p>
                    <p className="text-[14px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors">@Umidjon0339</p>
                  </div>
              </a>

              <div className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-[0_8px_30px_rgb(34,197,94,0.08)] hover:border-green-200 transition-all duration-300 cursor-default">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white bg-gradient-to-br from-green-400 to-green-600 group-hover:scale-110 transition-transform duration-300">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t.about.hotline}</p>
                    <p className="text-[14px] font-bold text-slate-800 group-hover:text-green-600 transition-colors">+998 33 860 20 06</p>
                  </div>
              </div>
            </div>

            {/* DEVELOPER LINKS */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> {t.about.dev}
              </h3>

              <a href="https://github.com/Wasp-2-AI" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-[0_8px_30px_rgb(15,23,42,0.08)] hover:border-slate-300 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white bg-gradient-to-br from-slate-700 to-slate-900 group-hover:scale-110 transition-transform duration-300">
                    <Github size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">GitHub</p>
                    <p className="text-[14px] font-bold text-slate-800 group-hover:text-slate-900 transition-colors">Wasp-2-AI</p>
                  </div>
              </a>

              <a href="https://www.linkedin.com/company/wasp-2-ai" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,119,181,0.1)] hover:border-blue-300 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white bg-gradient-to-br from-[#0077b5] to-[#005582] group-hover:scale-110 transition-transform duration-300">
                    <Linkedin size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">LinkedIn</p>
                    <p className="text-[14px] font-bold text-slate-800 group-hover:text-[#0077b5] transition-colors">WASP-2 AI Solutions</p>
                  </div>
              </a>
            </div>
        </div>

        <div className="mt-10 text-center pt-6 border-t border-slate-100">
            <p className="text-[12px] font-bold text-slate-500">{t.about.version}</p>
            <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">© 2026 WASP-2 AI Solutions. {t.about.rights}</p>
        </div>
      </div>
    </div>
  );
}