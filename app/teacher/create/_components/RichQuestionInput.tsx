'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Sigma, Check, X, Keyboard } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'react-quill-new/dist/quill.snow.css';
import MathInput from './MathInput';
import { Button, IconButton } from '@/components/ui';
import { useTeacherLanguage } from '@/app/teacher/layout';

const TRANSLATIONS: Record<string, any> = {
  uz: {
    typeHere: "Bu yerga yozing...",
    close: "Yopish",
    equationBuilder: "Formula Muharriri",
    virtualKeyboardActive: "Virtual Klaviatura Faol",
    mathPlaceholder: "Yozing yoki quyidagi klaviaturadan foydalaning...",
    cancel: "Bekor qilish",
    insertEquation: "Formulani Qo'shish",
  },
  en: {
    typeHere: "Type here...",
    close: "Close",
    equationBuilder: "Equation Builder",
    virtualKeyboardActive: "Virtual Keyboard Active",
    mathPlaceholder: "Type or use the keyboard below...",
    cancel: "Cancel",
    insertEquation: "Insert Equation",
  },
  ru: {
    typeHere: "Введите здесь...",
    close: "Закрыть",
    equationBuilder: "Редактор формул",
    virtualKeyboardActive: "Виртуальная клавиатура активна",
    mathPlaceholder: "Введите или используйте клавиатуру ниже...",
    cancel: "Отмена",
    insertEquation: "Вставить формулу",
  },
};

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
  const { lang } = useTeacherLanguage();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.uz;
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
      {label && <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">{label}</label>}

      <div className={`bg-surface-container-lowest rounded-m3-lg overflow-hidden border border-outline-variant shadow-elev-1 focus-within:border-primary transition-all duration-300 rich-wrapper ${compact ? 'is-compact' : 'is-standard'}`}>

        <style>{`
          .rich-wrapper .ql-toolbar { border: none !important; border-bottom: 1px solid var(--m3-outline-variant) !important; background: var(--m3-surface-container); padding: 10px 14px !important; }
          .rich-wrapper .ql-container { border: none !important; font-size: 0.95rem; font-family: inherit; color: var(--m3-on-surface); font-weight: 500;}

          .rich-wrapper.is-standard .ql-editor { min-height: 120px; padding: 20px; line-height: 1.6; }

          .rich-wrapper.is-compact .ql-editor {
            min-height: 52px;
            max-height: 70px;
            padding: 12px 16px;
            line-height: 1.4;
            overflow-y: auto;
          }

          .rich-wrapper .ql-editor.ql-blank::before { color: var(--m3-outline); font-style: normal; font-weight: 500; }
          .rich-wrapper .ql-formula {
            background: var(--m3-primary-container); color: var(--m3-on-primary-container); padding: 4px 8px; border-radius: var(--m3-shape-sm); margin: 0 4px; cursor: pointer;
          }

          /* Forces the MathLive virtual keyboard to sit ABOVE the modal overlay */
          :root {
            --keyboard-zindex: 9999 !important;
            --keyboard-background: var(--m3-inverse-surface) !important;
          }
        `}</style>

        <ReactQuill
          ref={quillRef}
          theme="snow"
          modules={modules}
          placeholder={placeholder || t.typeHere}
          onChange={handleEditorChange}
        />
      </div>

      {isMathModalOpen && (
        // 🟢 FIX 1: Changed `items-center` to `items-start pt-20`. This pins the modal to the TOP of the screen, away from the keyboard.
        // 🟢 FIX 2: Set z-[999] so the MathLive keyboard (which usually has a z-index of 1000+) stays on top.
        <div className="fixed inset-0 z-[999] flex items-start justify-center pt-16 md:pt-24 p-4 bg-scrim backdrop-blur-sm animate-in fade-in duration-200">

          <div className="bg-surface-container-low rounded-m3-xl shadow-elev-3 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">

            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-container text-on-primary-container rounded-m3-sm flex items-center justify-center">
                  <Sigma size={18} strokeWidth={2.5} />
                </div>
                {t.equationBuilder}
              </h3>
              <IconButton aria-label={t.close} size="sm" onClick={() => setIsMathModalOpen(false)}>
                <X />
              </IconButton>
            </div>

            <div className="p-8 bg-surface-container">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-4">
                <Keyboard size={14} /> {t.virtualKeyboardActive}
              </div>
              <div className="rounded-m3-lg overflow-hidden ring-2 ring-primary shadow-elev-1">
                <MathInput value={tempMath} onChange={(latex) => setTempMath(latex)} placeholder={t.mathPlaceholder} />
              </div>
            </div>

            <div className="p-5 border-t border-outline-variant flex justify-end gap-3">
              <Button variant="text" onClick={() => setIsMathModalOpen(false)}>{t.cancel}</Button>
              <Button icon={<Check />} onClick={insertMath} className="px-8">{t.insertEquation}</Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}