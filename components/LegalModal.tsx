import React from 'react';
import { X, Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, darkMode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-2xl border relative max-h-[85vh] overflow-y-auto animate-slide-up ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <Shield size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">
              Termos de Uso & Política de Privacidade (LGPD)
            </h2>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Conformidade com a Lei nº 13.709/2018 e Resoluções COFEN/COREN
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs leading-relaxed font-medium text-slate-600 dark:text-slate-300">
          <section className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 space-y-2">
            <h3 className="font-black text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-2 text-xs">
              <CheckCircle2 size={16} /> 1. Isenção de Diagnóstico e Prescrição Médica
            </h3>
            <p className="text-[11px] leading-relaxed">
              <strong>AVISO IMPORTANTE:</strong> O aplicativo Meu Plantão Pro é exclusivamente um sistema de gestão documental, organização de escalas e apoio à rotina do Enfermeiro e Técnico de Enfermagem. <strong>O aplicativo JAMAIS emite diagnósticos médicos, prescreve medicamentos ou substitui a decisão e julgamento clínico do profissional habilitado.</strong>
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-black uppercase text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <Lock size={14} className="text-blue-500" /> 2. Proteção de Dados (LGPD)
            </h3>
            <p className="text-[11px]">
              Todos os dados dos profissionais de saúde e dos pacientes cadastrados são criptografados em trânsito e em repouso (AES-256). O sistema armazena informações com pseudonimização de identificadores de prontuários, cumprindo integralmente os requisitos da Lei Geral de Proteção de Dados Pessoais (LGPD).
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-black uppercase text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <FileText size={14} className="text-emerald-500" /> 3. Código de Ética de Enfermagem (COFEN)
            </h3>
            <p className="text-[11px]">
              As anotações clínicas, evoluções e assinaturas digitais registradas geram um código hash imutável com carimbo de data e hora para garantir o não-repúdio e a auditabilidade, respeitando o sigilo profissional resguardado pelo Código de Ética dos Profissionais de Enfermagem.
            </p>
          </section>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black p-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            Compreendo e Aceito os Termos
          </button>
        </div>
      </div>
    </div>
  );
};
