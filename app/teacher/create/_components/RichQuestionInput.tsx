'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Sigma, Check, X, Keyboard } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'react-quill-new/dist/quill.snow.css';
import MathInput from './MathInput';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false }) as any;

if (typeof window !== 'undefined') {
  (window as any).katex = katex;
}

interface Props {
  label: string;
  value?: string; 
  onChange: (databaseString: string) => void;
  placeholder?: string;
  compact?: boolean; 
}

export default function RichQuestionInput({ label, value = "", onChange, placeholder, compact = false }: Props) {
  const quillRef = useRef<any>(null);
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [tempMath, setTempMath] = useState('');
  
  const isInternalChange = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const applySavedText = () => {
      if (!isMounted) return;

      // Check if Quill has finished its dynamic load
      if (quillRef.current && value && !isInternalChange.current) {
        const quill = quillRef.current.getEditor();
        const parts = value.split('$');
        const deltaOps: any[] = [];

        parts.forEach((part, index) => {
          if (index % 2 === 0) {
            if (part) deltaOps.push({ insert: part });
          } else {
            deltaOps.push({ insert: { formula: part } });
          }
        });

        quill.setContents({ ops: deltaOps }, 'silent');
        isInternalChange.current = false;
      } 
      // 🟢 FIX: If Quill isn't ready yet, wait 50ms and try again
      else if (!quillRef.current && value) {
        setTimeout(applySavedText, 50);
      }
    };

    applySavedText();

    return () => { isMounted = false; };
  }, [value]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        ['bold', 'italic'],
        ['formula'], 
      ],
      handlers: {
        formula: function () {
          setTempMath(''); 
          setIsMathModalOpen(true); 
        }
      }
    }
  }), []);

  const insertMath = () => {
    if (!tempMath.trim()) {
      setIsMathModalOpen(false);
      return;
    }

    const quill = quillRef.current.getEditor();
    const range = quill.getSelection(true) || { index: quill.getLength() };
    
    quill.insertEmbed(range.index, 'formula', tempMath, 'user');
    quill.setSelection(range.index + 1, 0, 'user');
    quill.insertText(range.index + 1, ' ', 'user');
    
    setIsMathModalOpen(false);
    setTempMath('');
  };

  const handleEditorChange = (content: string, delta: any, source: string, editor: any) => {
    if (source !== 'user') return; 

    isInternalChange.current = true;
    const ops = editor.getContents().ops;
    let dbString = '';

    ops.forEach((op: any) => {
      if (typeof op.insert === 'string') {
        dbString += op.insert;
      } else if (op.insert && op.insert.formula) {
        dbString += `$${op.insert.formula}$`;
      }
    });

    onChange(dbString.replace(/\n$/, '')); 
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      
      <div className={`bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300 rich-wrapper ${compact ? 'is-compact' : 'is-standard'}`}>
        
        <style>{`
          .rich-wrapper .ql-toolbar { border: none !important; border-bottom: 1px solid #f1f5f9 !important; background: #f8fafc; padding: 10px 14px !important; }
          .rich-wrapper .ql-container { border: none !important; font-size: 0.95rem; font-family: inherit; color: #1e293b; font-weight: 500;}
          
          .rich-wrapper.is-standard .ql-editor { min-height: 120px; padding: 20px; line-height: 1.6; }
          
          .rich-wrapper.is-compact .ql-editor { 
            min-height: 52px; 
            max-height: 70px; 
            padding: 12px 16px; 
            line-height: 1.4; 
            overflow-y: auto; 
          }
          
          .rich-wrapper .ql-editor.ql-blank::before { color: #cbd5e1; font-style: normal; font-weight: 500; }
          .rich-wrapper .ql-formula { 
            background: #eef2ff; color: #4f46e5; padding: 4px 8px; border-radius: 8px; margin: 0 4px; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.1);
          }

          /* 🟢 FIX: Forces the MathLive virtual keyboard to sit ABOVE the modal overlay */
          :root {
            --keyboard-zindex: 9999 !important;
            --keyboard-background: #1e293b !important; /* Optional: gives it a solid premium dark slate color */
          }
        `}</style>

        <ReactQuill
          ref={quillRef}
          theme="snow"
          modules={modules}
          placeholder={placeholder || "Type here..."}
          onChange={handleEditorChange}
        />
      </div>

      {isMathModalOpen && (
        // 🟢 FIX 1: Changed `items-center` to `items-start pt-20`. This pins the modal to the TOP of the screen, away from the keyboard.
        // 🟢 FIX 2: Set z-[999] so the MathLive keyboard (which usually has a z-index of 1000+) stays on top.
        <div className="fixed inset-0 z-[999] flex items-start justify-center pt-16 md:pt-24 p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          
          {/* 🟢 FIX 3: Removed `mb-[25vh]` because we are top-aligning now. */}
          <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                  <Sigma size={18} strokeWidth={2.5} />
                </div>
                Equation Builder
              </h3>
              <button onClick={() => setIsMathModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">
                <Keyboard size={14} /> Virtual Keyboard Active
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ring-4 ring-indigo-500/10">
                <MathInput value={tempMath} onChange={(latex) => setTempMath(latex)} placeholder="Type or use the keyboard below..." />
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button onClick={() => setIsMathModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={insertMath} className="flex items-center gap-2 px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-lg shadow-indigo-600/20 transition-all">
                <Check size={18} /> Insert Equation
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}