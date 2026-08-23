import React, { useState } from 'react';
import { Calculator, Droplets, Activity, ShieldAlert, HeartPulse, RefreshCw, Scale } from 'lucide-react';

interface CalculatorsViewProps {
  darkMode?: boolean;
}

export const CalculatorsView: React.FC<CalculatorsViewProps> = ({ darkMode }) => {
  const [activeTab, setActiveTab] = useState<'gotejamento' | 'glasgow' | 'braden' | 'fugulin'>('gotejamento');

  // GOTEJAMENTO STATE
  const [volume, setVolume] = useState<number>(1000); // ml
  const [tempoHoras, setTempoHoras] = useState<number>(8); // horas

  const gotasMin = Math.round(volume / (tempoHoras * 3));
  const microgotasMin = Math.round(volume / tempoHoras);

  // GLASGOW STATE
  const [aberturaOcular, setAberturaOcular] = useState<number>(4);
  const [respostaVerbal, setRespostaVerbal] = useState<number>(5);
  const [respostaMotora, setRespostaMotora] = useState<number>(6);
  const [reatividadePupilar, setReatividadePupilar] = useState<number>(0);

  const totalGlasgow = (aberturaOcular + respostaVerbal + respostaMotora) - reatividadePupilar;

  const getGlasgowClassification = (score: number) => {
    if (score <= 8) return { label: 'Coma Grave (Indicativo de Intubação/AOT)', color: 'text-rose-600 font-black' };
    if (score <= 12) return { label: 'Trauma / Rebaixamento Moderado', color: 'text-amber-600 font-black' };
    return { label: 'Trauma Leve / Consciente', color: 'text-emerald-600 font-black' };
  };

  // BRADEN STATE
  const [percepcaoSensorial, setPercepcaoSensorial] = useState<number>(3);
  const [umidade, setUmidade] = useState<number>(3);
  const [atividade, setAtividade] = useState<number>(3);
  const [mobilidade, setMobilidade] = useState<number>(3);
  const [nutricao, setNutricao] = useState<number>(3);
  const [friccao, setFriccao] = useState<number>(2);

  const totalBraden = percepcaoSensorial + umidade + atividade + mobilidade + nutricao + friccao;

  const getBradenRisk = (score: number) => {
    if (score <= 9) return { label: 'Risco Muito Alto de LPP', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
    if (score <= 12) return { label: 'Risco Alto de LPP', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
    if (score <= 14) return { label: 'Risco Moderado de LPP', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
    return { label: 'Risco Baixo / Ausente', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
  };

  return (
    <div className="space-y-6 animate-slide-up pb-24 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="text-amber-500" size={22} /> Calculadoras Clínicas & Escalas de Enfermagem
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Fórmulas oficiais permitidas pelo COFEN: Gotejamento de soro, Glasgow, Braden e Fugulin.
          </p>
        </div>
      </div>

      {/* ABAS DAS CALCULADORAS */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('gotejamento')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === 'gotejamento' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          💧 Gotejamento de Soro
        </button>
        <button
          onClick={() => setActiveTab('glasgow')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === 'glasgow' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🧠 Escala de Glasgow
        </button>
        <button
          onClick={() => setActiveTab('braden')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            activeTab === 'braden' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🛡️ Escala de Braden (LPP)
        </button>
      </div>

      {/* CALCULADORA 1: GOTEJAMENTO DE SORO */}
      {activeTab === 'gotejamento' && (
        <div className={`p-6 rounded-[2.5rem] border space-y-5 shadow-sm ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <Droplets size={20} className="text-blue-500" />
            <h3 className="font-black text-sm uppercase text-slate-900 dark:text-white">Cálculo de Gotejamento de Soro</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Volume da Solução (mL)</label>
              <input 
                type="number" 
                value={volume} 
                onChange={(e) => setVolume(Number(e.target.value))} 
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-amber-500 text-sm" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Tempo da Infusão (Horas)</label>
              <input 
                type="number" 
                value={tempoHoras} 
                onChange={(e) => setTempoHoras(Number(e.target.value))} 
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-amber-500 text-sm" 
              />
            </div>
          </div>

          {/* RESULTADO GOTEJAMENTO */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-center space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">Gotejamento em Gotas/min</span>
              <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{gotasMin} <span className="text-xs font-bold">gotas/min</span></p>
              <span className="text-[9px] text-slate-400 font-medium">(Fórmula: Volume ÷ [Tempo × 3])</span>
            </div>

            <div className="p-4 bg-teal-500/10 rounded-2xl border border-teal-500/20 text-center space-y-1">
              <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400">Microgotas/min</span>
              <p className="text-3xl font-black text-teal-600 dark:text-teal-400">{microgotasMin} <span className="text-xs font-bold">mcgotas/min</span></p>
              <span className="text-[9px] text-slate-400 font-medium">(Fórmula: Volume ÷ Tempo)</span>
            </div>
          </div>
        </div>
      )}

      {/* CALCULADORA 2: ESCALA DE GLASGOW */}
      {activeTab === 'glasgow' && (
        <div className={`p-6 rounded-[2.5rem] border space-y-5 shadow-sm ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-purple-500" />
            <h3 className="font-black text-sm uppercase text-slate-900 dark:text-white">Escala de Coma de Glasgow (Atualizada)</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Abertura Ocular (AO)</label>
              <select 
                value={aberturaOcular} 
                onChange={(e) => setAberturaOcular(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-purple-500"
              >
                <option value={4}>4 - Espontânea</option>
                <option value={3}>3 - Ao estímulo sonoro/voz</option>
                <option value={2}>2 - Ao estímulo de pressão/dor</option>
                <option value={1}>1 - Nenhuma</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Resposta Verbal (RV)</label>
              <select 
                value={respostaVerbal} 
                onChange={(e) => setRespostaVerbal(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-purple-500"
              >
                <option value={5}>5 - Orientada e conversando</option>
                <option value={4}>4 - Confusa</option>
                <option value={3}>3 - Palavras desconexas/inapropriadas</option>
                <option value={2}>2 - Sons ininteligíveis/gemidos</option>
                <option value={1}>1 - Nenhuma</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Resposta Motora (RM)</label>
              <select 
                value={respostaMotora} 
                onChange={(e) => setRespostaMotora(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-purple-500"
              >
                <option value={6}>6 - Obedece a comandos</option>
                <option value={5}>5 - Localiza a dor/estímulo</option>
                <option value={4}>4 - Flexão normal/retirada</option>
                <option value={3}>3 - Flexão anormal (Decorticação)</option>
                <option value={2}>2 - Extensão anormal (Descerebração)</option>
                <option value={1}>1 - Nenhuma</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Reatividade Pupilar (Subtração)</label>
              <select 
                value={reatividadePupilar} 
                onChange={(e) => setReatividadePupilar(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-purple-500"
              >
                <option value={0}>0 - Ambas as pupilas reagem à luz</option>
                <option value={1}>-1 - Apenas uma pupila reage</option>
                <option value={2}>-2 - Nenhuma pupila reage (Fixo-midriática)</option>
              </select>
            </div>
          </div>

          {/* RESULTADO GLASGOW */}
          <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-center space-y-1">
            <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400">Escore Total Glasgow</span>
            <p className="text-4xl font-black text-purple-600 dark:text-purple-400">{totalGlasgow} <span className="text-xs font-bold">pontos (Escala 3 a 15)</span></p>
            <p className={`text-xs ${getGlasgowClassification(totalGlasgow).color} mt-1`}>
              {getGlasgowClassification(totalGlasgow).label}
            </p>
          </div>
        </div>
      )}

      {/* CALCULADORA 3: ESCALA DE BRADEN */}
      {activeTab === 'braden' && (
        <div className={`p-6 rounded-[2.5rem] border space-y-5 shadow-sm ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-amber-500" />
            <h3 className="font-black text-sm uppercase text-slate-900 dark:text-white">Escala de Braden (Risco de Lesão por Pressão - LPP)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Percepção Sensorial</label>
              <select value={percepcaoSensorial} onChange={(e) => setPercepcaoSensorial(Number(e.target.value))} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl">
                <option value={1}>1 - Totalmente limitado</option>
                <option value={2}>2 - Muito limitado</option>
                <option value={3}>3 - Levemente limitado</option>
                <option value={4}>4 - Nenhuma limitação</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Umidade</label>
              <select value={umidade} onChange={(e) => setUmidade(Number(e.target.value))} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl">
                <option value={1}>1 - Completamente úmido</option>
                <option value={2}>2 - Muito úmido</option>
                <option value={3}>3 - Ocasionalmente úmido</option>
                <option value={4}>4 - Raramente úmido</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Atividade</label>
              <select value={atividade} onChange={(e) => setAtividade(Number(e.target.value))} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl">
                <option value={1}>1 - Acamado</option>
                <option value={2}>2 - Confinado à cadeira</option>
                <option value={3}>3 - Caminha ocasionalmente</option>
                <option value={4}>4 - Caminha frequentemente</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Mobilidade</label>
              <select value={mobilidade} onChange={(e) => setMobilidade(Number(e.target.value))} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl">
                <option value={1}>1 - Totalmente imóvel</option>
                <option value={2}>2 - Muito limitado</option>
                <option value={3}>3 - Levemente limitado</option>
                <option value={4}>4 - Sem limitações</option>
              </select>
            </div>
          </div>

          {/* RESULTADO BRADEN */}
          <div className={`p-4 rounded-2xl border text-center space-y-1 ${getBradenRisk(totalBraden).color}`}>
            <span className="text-[10px] font-black uppercase">Escore Total Braden</span>
            <p className="text-4xl font-black">{totalBraden} <span className="text-xs font-bold">pontos (Escala 6 a 23)</span></p>
            <p className="text-xs font-black uppercase mt-1">
              Classificação: {getBradenRisk(totalBraden).label}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
