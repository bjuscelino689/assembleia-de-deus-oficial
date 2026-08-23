import React, { useState } from 'react';
import { X, Share2, Copy, Check, MessageCircle, Smartphone, Globe, QrCode } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchName?: string;
  appName?: string;
  appUrl?: string;
}

export const OFFICIAL_PRODUCTION_URL = 'https://assembleia-de-deus-nacional.vercel.app';
export const CUSTOM_DOMAIN_URL = 'https://saaembleia-de-deus-nacional.app';

export const ShareModal: React.FC<ShareModalProps> = ({ 
  isOpen, 
  onClose, 
  churchName = 'Assembleia de Deus Nacional',
  appName,
  appUrl = OFFICIAL_PRODUCTION_URL
}) => {
  const [copied, setCopied] = useState(false);
  const displayName = appName || churchName;

  if (!isOpen) return null;

  // Garante que o link de compartilhamento seja sempre o link de produção oficial do Vercel/Domínio
  const shareUrl = appUrl || OFFICIAL_PRODUCTION_URL;
  const shareText = `Olá! Convido você para baixar e acompanhar o aplicativo da ${displayName}. Acesse a agenda de cultos, palavra diária, fotos e vídeos pelo link oficial: ${shareUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: displayName,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Compartilhamento cancelado ou não suportado');
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 space-y-5 shadow-2xl animate-slide-up border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        <div className="w-16 h-16 bg-app-purple/10 text-app-purple rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-app-purple/20">
          <Share2 size={30} />
        </div>

        <div className="text-center space-y-1">
          <span className="px-3 py-1 bg-app-purple/10 text-app-purple text-[10px] font-black uppercase tracking-widest rounded-full inline-block">
            Compartilhar Aplicativo
          </span>
          <h3 className="text-xl font-black uppercase text-slate-900">
            {churchName}
          </h3>
          <p className="text-xs font-bold text-slate-500">
            Envie o aplicativo para os membros da igreja e sua família no celular!
          </p>
        </div>

        {/* Botões de Ação Direta */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black p-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5 active:scale-95 transition-all"
          >
            <MessageCircle size={18} /> Enviar pelo WhatsApp
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 ${copied ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'} font-black p-3.5 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-transparent`}
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              {copied ? 'Link Copiado!' : 'Copiar Link'}
            </button>

            {navigator.share && (
              <button
                onClick={handleNativeShare}
                className="bg-app-purple hover:bg-app-purple/90 text-white font-black px-4 py-3.5 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-app-purple/20 active:scale-95 transition-all"
              >
                <Share2 size={16} /> Mais
              </button>
            )}
          </div>
        </div>

        {/* Caixinha do Link */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center gap-2">
          <Globe size={16} className="text-slate-400 shrink-0 ml-1" />
          <input 
            type="text" 
            readOnly 
            value={shareUrl} 
            className="bg-transparent text-xs font-medium text-slate-600 truncate flex-1 outline-none" 
          />
        </div>

        {/* Guia de Instalação no Celular */}
        <div className="bg-slate-900 text-white p-4.5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-app-yellow" />
            <h4 className="font-black text-xs uppercase text-app-yellow">Como instalar no Celular:</h4>
          </div>
          <ul className="text-[11px] font-medium text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>Android (Chrome):</strong> Abra o link, clique nos 3 pontinhos do navegador e escolha <em>"Adicionar à tela inicial"</em>.</li>
            <li><strong>iPhone (Safari):</strong> Abra o link no Safari, clique no botão <em>Compartilhar</em> (quadrado com seta) e escolha <em>"Adicionar à Tela de Início"</em>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
