import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, ShieldAlert, RefreshCw, Calculator, BookOpen, Clock, AlertCircle, Trash2 } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'florence';
  text: string;
  timestamp: string;
}

interface FlorenceAiViewProps {
  darkMode?: boolean;
}

export const FlorenceAiView: React.FC<FlorenceAiViewProps> = ({ darkMode }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm_welcome',
      sender: 'florence',
      text: 'Olá! Sou a Florence, sua Assistente Virtual Inteligente de Enfermagem. Posso ajudar você com organização de escalas, fórmulas de gotejamento, pesquisas em manuais e modelos de anotação de enfermagem.\n\n⚠️ Lembrete legal (COFEN): Não emito diagnósticos médicos, prescrições de medicamentos ou decisões clínicas restritas.',
      timestamp: new Date().toLocaleTimeString().substring(0, 5)
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const promptText = textToSend || input;
    if (!promptText.trim() || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString().substring(0, 5)
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/florence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          history: messages.slice(-6)
        })
      });

      const data = await response.json();

      const aiMsg: Message = {
        id: `flo_${Date.now()}`,
        sender: 'florence',
        text: data.reply || 'Desculpe, ocorreu um erro ao consultar o servidor.',
        timestamp: new Date().toLocaleTimeString().substring(0, 5)
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        sender: 'florence',
        text: 'Desculpe, a conexão com o servidor de IA falhou. Por favor, tente novamente em instantes.',
        timestamp: new Date().toLocaleTimeString().substring(0, 5)
      }]);
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    { label: '💧 Calcular Gotejamento de Soro', prompt: 'Como calcular o gotejamento para infundir 1000ml de Soro Fisiológico 0.9% em 8 horas (Gotas/min e Microgotas/min)?' },
    { label: '📊 Resumo Escala de Braden', prompt: 'Quais são as 6 subescalas da Escala de Braden e como avaliar o risco para Lesão por Pressão (LPP)?' },
    { label: '🧠 Escala de Glasgow Atualizada', prompt: 'Explique a Escala de Coma de Glasgow atualizada, seus parâmetros (Abertura Ocular, Resposta Verbal, Resposta Motora e Reatividade Pupilar) e pontuações.' },
    { label: '✍️ Modelo de Evolução de UTI', prompt: 'Forneça um modelo estruturado de Anotação/Evolução de Enfermagem no padrão SOAP para paciente de UTI hemodinamicamente estável.' }
  ];

  return (
    <div className="space-y-4 animate-slide-up pb-24 max-w-4xl mx-auto">
      {/* HEADER DA ASSISTENTE FLORENCE */}
      <div className={`p-6 rounded-[2.5rem] border relative overflow-hidden shadow-xl ${
        darkMode ? 'bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 border-slate-800 text-white' : 'bg-gradient-to-br from-emerald-600 via-teal-700 to-teal-900 text-white'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-yellow-300 shadow-inner border border-white/20">
            <Bot size={32} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black uppercase tracking-tight">Florence AI</h1>
              <span className="px-2.5 py-0.5 bg-yellow-400 text-slate-900 font-black rounded-full text-[9px] uppercase tracking-wider">
                Assistente Virtual de Enfermagem
              </span>
            </div>
            <p className="text-xs font-medium text-teal-100/90">
              Apoio organizacional, suporte a cálculos clínicos, busca em diretrizes COFEN e modelos de anotação.
            </p>
          </div>
        </div>
      </div>

      {/* AVISO LEGAL COFEN */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
        <ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="font-medium">
          <strong>Conformidade COFEN:</strong> A Florence AI é uma ferramenta de apoio educacional e de produtividade. Não prescreve medicamentos nem substitui a avaliação do Enfermeiro.
        </p>
      </div>

      {/* CHAT MESSAGES CONTAINER */}
      <div className={`p-4 rounded-[2.5rem] border min-h-[380px] max-h-[500px] overflow-y-auto space-y-4 shadow-sm ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
              m.sender === 'user' ? 'bg-emerald-600 text-white' : 'bg-teal-600 text-white'
            }`}>
              {m.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>

            <div className={`max-w-[82%] p-4 rounded-3xl text-xs space-y-1 leading-relaxed ${
              m.sender === 'user'
                ? 'bg-emerald-600 text-white font-medium rounded-tr-none'
                : darkMode ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700' : 'bg-slate-100 text-slate-800 rounded-tl-none'
            }`}>
              <div className="flex items-center justify-between gap-3 text-[10px] opacity-70 font-bold mb-1">
                <span>{m.sender === 'user' ? 'Você' : 'Florence AI'}</span>
                <div className="flex items-center gap-1.5">
                  <span>{m.timestamp}</span>
                  <button
                    onClick={() => setMessages(prev => prev.filter(item => item.id !== m.id))}
                    className="p-1 rounded-md hover:bg-rose-500 hover:text-white transition-all"
                    title="Excluir esta mensagem"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-line">{m.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 text-xs text-teal-600 font-bold animate-pulse p-2">
            <Bot size={20} className="animate-spin-slow" />
            <span>Florence AI está digitando a resposta...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* PRESETS DE PERGUNTAS */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-black uppercase text-slate-400 ml-2">Perguntas Frequentes de Plantão:</span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p.prompt)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* INPUT DO CHAT */}
      <div className="flex items-center gap-2">
        <input 
          type="text" 
          placeholder="Pergunte à Florence (ex: fórmula de dopamina, cuidados de curativo)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className={`flex-1 p-4 rounded-2xl text-xs font-medium border outline-none transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-teal-500' : 'bg-white border-slate-200 text-slate-800 focus:border-teal-500'
          }`}
        />

        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="p-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl shadow-lg shadow-teal-600/20 active:scale-95 transition-all disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
