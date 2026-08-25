import React, { useState, useEffect } from 'react';
import { ChurchInfo, UserProfile, BibleVerse, isMasterAdminEmail } from '../types';
import { 
  BookOpen, Heart, Sparkles, Share2, MessageCircle, ChevronLeft, 
  Flame, Crown, Quote, Calendar, Star, Sun, ShieldCheck
} from 'lucide-react';
import { syncDocToFirestore, fetchDocumentFromFirestore } from '../utils/clientFirebase';

interface PastoralWordViewProps {
  churchInfo: ChurchInfo;
  user: UserProfile;
  verses: BibleVerse[];
  onNavigate: (view: string) => void;
  onBack?: () => void;
}

interface PastoralMessage {
  id: string;
  title: string;
  theme: string;
  verseReference: string;
  verseText: string;
  content: string;
  author: string;
  authorRole: string;
  date: string;
  prayerPoint: string;
}

const DEFAULT_PASTORAL_MESSAGE: PastoralMessage = {
  id: 'msg_atual',
  title: 'Tempo de Conquistas e Restauração',
  theme: 'Fé Inabalável e Confiança em Deus',
  verseReference: 'Isaías 41:10',
  verseText: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a destra da minha justiça.',
  content: `Amada igreja e queridos irmãos em Cristo,\n\nNeste tempo de desafios, a Palavra de Deus nos convida a fixar nossos olhos Naquele que é o Autor e Consumador da nossa fé. Não importa a tempestade que você esteja enfrentando, lembre-se de que o Senhor está no controle de todas as coisas.\n\nQuando colocamos nossa vida e nossa família nas mãos de Deus, Ele transforma o choro em alegria e abre portas onde não havia saída. Permaneça firme em oração, congregando e buscando a presença do Espírito Santo.\n\nQue a graça e a paz do Senhor Jesus transbordem em seu lar hoje e sempre!`,
  author: 'Pr. Juscelino',
  authorRole: 'Pastor Presidente',
  date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
  prayerPoint: 'Oração pela saúde dos enfermos, união das famílias e portas abertas para quem busca trabalho.'
};

export const PastoralWordView: React.FC<PastoralWordViewProps> = ({
  churchInfo,
  user,
  verses,
  onNavigate,
  onBack
}) => {
  const isMasterAdmin = Boolean(user && user.email && isMasterAdminEmail(user.email));
  const [message, setMessage] = useState<PastoralMessage>(() => {
    try {
      const saved = localStorage.getItem('ad_pastoral_message');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_PASTORAL_MESSAGE;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(message.title);
  const [editTheme, setEditTheme] = useState(message.theme);
  const [editRef, setEditRef] = useState(message.verseReference);
  const [editVerse, setEditVerse] = useState(message.verseText);
  const [editContent, setEditContent] = useState(message.content);
  const [editPrayer, setEditPrayer] = useState(message.prayerPoint);
  const [isCopied, setIsCopied] = useState(false);

  // Sincroniza do Firestore e Servidor
  useEffect(() => {
    fetchDocumentFromFirestore<PastoralMessage>('system_settings', 'pastoral_word').then(remote => {
      if (remote && remote.title) {
        setMessage(remote);
        try { localStorage.setItem('ad_pastoral_message', JSON.stringify(remote)); } catch (e) {}
      }
    }).catch(() => {});
  }, []);

  const handleSaveMessage = () => {
    const updated: PastoralMessage = {
      ...message,
      title: editTitle.trim() || 'Palavra Pastoral',
      theme: editTheme.trim() || 'Edificação e Fé',
      verseReference: editRef.trim() || 'Bíblia Sagrada',
      verseText: editVerse.trim(),
      content: editContent.trim(),
      prayerPoint: editPrayer.trim(),
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      author: churchInfo.pastorName || 'Pr. Juscelino'
    };

    setMessage(updated);
    try { localStorage.setItem('ad_pastoral_message', JSON.stringify(updated)); } catch (e) {}
    syncDocToFirestore('system_settings', 'pastoral_word', updated).catch(() => {});
    setIsEditing(false);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*Assembleia de Deus Nacional*\n` +
      `📖 *PALAVRA PASTORAL:* ${message.title}\n` +
      `_${message.verseReference}_: "${message.verseText}"\n\n` +
      `${message.content}\n\n` +
      `🙏 *Motivo de Oração:* ${message.prayerPoint}\n\n` +
      `— *${message.author}* (${message.authorRole})`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyText = () => {
    const text = `${message.title}\n${message.verseReference}: "${message.verseText}"\n\n${message.content}\n\nOração: ${message.prayerPoint}\n— ${message.author}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      });
    }
  };

  return (
    <div className="space-y-6 animate-slide-up pb-20 max-w-4xl mx-auto px-2 sm:px-4">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-purple-700 via-indigo-700 to-amber-600 text-white p-6 rounded-[2.5rem] shadow-xl shadow-purple-500/15">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack || (() => onNavigate('home'))}
            className="p-3 bg-white/15 hover:bg-white/25 rounded-2xl transition-all cursor-pointer"
            title="Voltar"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400/30 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300/40">
                Gabinete Pastoral
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Palavra Pastoral</h2>
            <p className="text-xs text-purple-100 font-medium">Orientação espiritual e edificação para a sua família</p>
          </div>
        </div>

        {isMasterAdmin && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 border border-white/20"
          >
            <Sparkles size={14} />
            <span>{isEditing ? 'Cancelar' : 'Editar Mensagem'}</span>
          </button>
        )}
      </div>

      {/* FORMULÁRIO DE EDIÇÃO PARA O PASTOR MASTER */}
      {isEditing && isMasterAdmin && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border-2 border-amber-500/40 shadow-xl space-y-4 animate-slide-up">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
              <Crown size={18} className="text-amber-500" />
              <span>Editar Mensagem Pastoral</span>
            </h3>
            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg">
              Pastor Presidente
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Título da Mensagem</label>
              <input 
                type="text" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold outline-none focus:border-purple-600 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Tema</label>
              <input 
                type="text" 
                value={editTheme} 
                onChange={(e) => setEditTheme(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold outline-none focus:border-purple-600 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Referência Bíblica (Ex: Salmos 23:1)</label>
              <input 
                type="text" 
                value={editRef} 
                onChange={(e) => setEditRef(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold outline-none focus:border-purple-600 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Texto do Versículo Bíblico</label>
              <input 
                type="text" 
                value={editVerse} 
                onChange={(e) => setEditVerse(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold outline-none focus:border-purple-600 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Conteúdo da Mensagem Pastoral</label>
            <textarea 
              rows={6}
              value={editContent} 
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-medium outline-none focus:border-purple-600 dark:text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Motivo / Ponto de Oração</label>
            <input 
              type="text" 
              value={editPrayer} 
              onChange={(e) => setEditPrayer(e.target.value)}
              className="w-full p-3.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-bold outline-none focus:border-purple-600 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveMessage}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              Publicar Palavra Pastoral
            </button>
          </div>
        </div>
      )}

      {/* CARD PRINCIPAL DA PALAVRA PASTORAL */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
        {/* CABEÇALHO DO CARD */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-amber-500 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-purple-500/20">
              <Crown size={28} className="text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {message.theme}
                </span>
                <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                  <Calendar size={12} /> {message.date}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                {message.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <Quote size={14} />
              <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <MessageCircle size={15} />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* VERSÍCULO EM DESTAQUE */}
        {message.verseText && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-600/10 to-indigo-600/10 border-l-4 border-amber-500 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black text-xs uppercase tracking-wider">
              <BookOpen size={16} />
              <span>{message.verseReference}</span>
            </div>
            <p className="text-sm sm:text-base font-bold italic text-slate-800 dark:text-slate-100 leading-relaxed">
              "{message.verseText}"
            </p>
          </div>
        )}

        {/* MENSAGEM DO PASTOR */}
        <div className="prose dark:prose-invert max-w-none">
          {message.content.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="text-slate-700 dark:text-zinc-200 text-sm sm:text-base leading-relaxed mb-4 font-medium">
              {paragraph}
            </p>
          ))}
        </div>

        {/* MOTIVO DE ORAÇÃO */}
        {message.prayerPoint && (
          <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 space-y-2">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-black text-xs uppercase tracking-wider">
              <Heart size={16} className="text-rose-500 fill-rose-500" />
              <span>Motivo de Oração da Igreja</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-purple-950 dark:text-purple-200 leading-relaxed">
              {message.prayerPoint}
            </p>
          </div>
        )}

        {/* ASSINATURA PASTORAL */}
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h5 className="font-black text-slate-900 dark:text-white text-sm">{message.author}</h5>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">{message.authorRole} • {churchInfo.name}</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('prayer')}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all"
          >
            <Heart size={14} />
            <span>Fazer Pedido de Oração</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default PastoralWordView;
