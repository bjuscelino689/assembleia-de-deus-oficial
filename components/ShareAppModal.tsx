import React, { useState } from 'react';
import { X, Share2, Copy, Check, MessageCircle, Smartphone, Globe, Download, QrCode, ShieldCheck } from 'lucide-react';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ isOpen, onClose, darkMode }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = window.location.href;
  const shareText = `🏥 Olá, colega de Enfermagem! Convido você a utilizar o aplicativo Meu Plantão Pro para organizar seus plantões, gerenciar pacientes, realizar anotações clínicas com assinatura digital e tirar dúvidas com a IA Florence. Acesse pelo link: ${shareUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-[2.5rem] p-6 space-y-5 shadow-2xl border relative max-h-[90vh] overflow-y-auto animate-slide-up ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-emerald-500/20">
          <Share2 size={30} />
        </div>

        <div className="text-center space-y-1">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full inline-block">
            Compartilhar Aplicativo
          </span>
          <h3 className="text-xl font-black uppercase tracking-tight">
            Meu Plantão PRO
          </h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Envie o link para enfermeiros e técnicos da sua equipe hospitalar!
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black p-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5 active:scale-95 transition-all"
          >
            <MessageCircle size={18} /> Enviar Grupo de Enfermagem (WhatsApp)
          </button>

          <button
            onClick={handleCopy}
            className={`w-full ${copied ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'} font-black p-3.5 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-transparent`}
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            {copied ? 'Link Copiado com Sucesso!' : 'Copiar Link de Acesso'}
          </button>
        </div>

        {/* Caixinha do Link */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center gap-2">
          <Globe size={16} className="text-slate-400 shrink-0 ml-1" />
          <input 
            type="text" 
            readOnly 
            value={shareUrl} 
            className="bg-transparent text-xs font-medium text-slate-600 dark:text-slate-300 truncate flex-1 outline-none" 
          />
        </div>

        {/* Guia PWA para Celular */}
        <div className="bg-slate-900 text-white p-4.5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-emerald-400" />
            <h4 className="font-black text-xs uppercase text-emerald-400">Instalação no Celular (Web App / APK):</h4>
          </div>
          <ul className="text-[11px] font-medium text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>Android (Chrome):</strong> Toque nos 3 pontinhos no canto superior e escolha <em>"Adicionar à tela inicial"</em>.</li>
            <li><strong>iPhone / iOS (Safari):</strong> Abra o link no Safari, toque no ícone de <em>Compartilhar</em> (quadrado com seta) e selecione <em>"Adicionar à Tela de Início"</em>.</li>
          </ul>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 text-center">
          <ShieldCheck size={12} className="text-emerald-500" /> Criptografia AES-256 • Conforme LGPD & Normas COFEN/COREN
        </div>
      </div>
    </div>
  );
};
