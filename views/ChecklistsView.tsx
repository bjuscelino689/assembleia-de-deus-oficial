import React, { useState } from 'react';
import { ChecklistItem } from '../types';
import { CheckSquare, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

interface ChecklistsViewProps {
  checklists: ChecklistItem[];
  onUpdateChecklist: (chk: ChecklistItem) => void;
  darkMode?: boolean;
}

export const ChecklistsView: React.FC<ChecklistsViewProps> = ({
  checklists,
  onUpdateChecklist,
  darkMode
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('TURNO');

  const activeChecklist = checklists.find(c => c.category === activeCategory) || checklists[0];

  const handleToggleItem = (itemId: string) => {
    if (!activeChecklist) return;

    const updatedItems = activeChecklist.items.map(i => {
      if (i.id === itemId) return { ...i, checked: !i.checked };
      return i;
    });

    const updatedChecklist: ChecklistItem = {
      ...activeChecklist,
      items: updatedItems,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    onUpdateChecklist(updatedChecklist);
  };

  const completedCount = activeChecklist?.items.filter(i => i.checked).length || 0;
  const totalCount = activeChecklist?.items.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-6 animate-slide-up pb-24 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="text-indigo-500" size={22} /> Checklists do Plantão & Segurança do Paciente
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Conferência estruturada para troca de turno (SBAR), Carrinho de Parada e UTI.
          </p>
        </div>
      </div>

      {/* FILTRO DE CATEGORIAS */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
        {[
          { key: 'TURNO', label: '📋 Passagem de Turno (SBAR)' },
          { key: 'CARRINHO_PARADA', label: '🚨 Carrinho de Parada (PCR)' },
          { key: 'UTI', label: '🏥 Checklist UTI' },
          { key: 'CENTRO_CIRURGICO', label: '🔪 Centro Cirúrgico' }
        ].map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
              activeCategory === cat.key ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* CHECKLIST ATIVO */}
      {activeChecklist && (
        <div className={`p-6 rounded-[2.5rem] border space-y-5 shadow-sm ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white uppercase">{activeChecklist.title}</h3>
              <p className="text-xs text-slate-500 font-medium">{activeChecklist.description}</p>
            </div>

            <div className="text-right">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{progressPercent}% Concluído</span>
              <div className="w-32 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1 border border-indigo-500/20">
                <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          {/* ITENS DO CHECKLIST */}
          <div className="space-y-2.5">
            {activeChecklist.items.map((item) => (
              <label
                key={item.id}
                onClick={() => handleToggleItem(item.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3.5 ${
                  item.checked 
                    ? darkMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200' : 'bg-indigo-50/60 border-indigo-200 text-indigo-900 font-bold'
                    : darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                  item.checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {item.checked && <CheckCircle2 size={14} />}
                </div>

                <span className="text-xs font-medium leading-relaxed">{item.label}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-3">
            <span>Última conferência por: {activeChecklist.lastCheckedBy || 'Enfª. Amanda'}</span>
            <span>Data: {activeChecklist.updatedAt}</span>
          </div>
        </div>
      )}
    </div>
  );
};
