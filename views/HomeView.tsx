import React from 'react';
import { ChurchInfo, UserProfile } from '../types';
import { 
  Calendar, Users, Heart, BookOpen, Image as ImageIcon, Sparkles, 
  ChevronRight, Star, Film, Building2, UserCheck, UserPlus, LogIn, 
  Phone, Music, Headphones, Radio, Flame, ShieldCheck
} from 'lucide-react';

interface HomeViewProps {
  churchInfo: ChurchInfo;
  onNavigate: (view: string) => void;
  user?: UserProfile;
  onOpenAuth?: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ churchInfo, onNavigate, user, onOpenAuth }) => {
  const isVisitor = !user || !user.phone || user.name === 'Visitante' || user.id.startsWith('visitante_');

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 animate-slide-up max-w-2xl mx-auto">
      {/* BANNER BOAS-VINDAS / CRIAR CONTA E LOGIN */}
      {isVisitor ? (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950 text-white p-5 rounded-[2.2rem] shadow-xl border border-purple-800/40 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="px-3 py-0.5 bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-widest rounded-full inline-block border border-amber-400/30">
                Família da Fé • Acesso Oficial
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Identifique-se com Celular e Senha
              </h2>
              <p className="text-xs text-purple-200 font-medium max-w-md leading-relaxed">
                Cadastre seu WhatsApp para participar do Mural da Fé, interagir na comunidade e receber novidades da igreja.
              </p>
            </div>
            
            {onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <UserPlus size={16} className="shrink-0" />
                <span>Cadastrar / Entrar</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black shrink-0 border border-purple-200 dark:border-purple-800">
              <UserCheck size={22} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 block">
                Membro Conectado • Paz do Senhor!
              </span>
              <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                {user.name}
              </h4>
              {user.phone && (
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <Phone size={10} className="text-purple-500" /> {user.phone}
                </span>
              )}
            </div>
          </div>

          {onOpenAuth && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[11px] font-black uppercase rounded-xl transition-all shrink-0 cursor-pointer"
            >
              Minha Conta
            </button>
          )}
        </div>
      )}

      {/* CABEÇALHO DA IGREJA ASSEMBLEIA DE DEUS */}
      <section className="text-center py-2 space-y-4">
        <div className="inline-block p-4 bg-purple-500/15 dark:bg-purple-500/20 rounded-[2.5rem] shadow-xl shadow-purple-500/5">
          <Star className="text-purple-600 dark:text-purple-400 w-10 h-10 fill-purple-600 dark:fill-purple-400" />
        </div>

        <div className="pt-1">
          <h1 className="text-3xl sm:text-4xl font-title font-black text-slate-900 dark:text-white leading-none tracking-tight">
            Assembleia de Deus <span className="text-purple-600 dark:text-purple-400">Nacional</span>
          </h1>
          <div className="mt-3 bg-purple-500/10 py-1.5 px-5 rounded-full inline-block border border-purple-500/20">
            <span className="text-purple-800 dark:text-purple-200 text-xs font-black uppercase tracking-widest">
              Ministério de Madureira
            </span>
          </div>
        </div>
      </section>

      {/* DESTAQUE PESQUISA BÍBLICA */}
      <div 
        onClick={() => onNavigate('bible_search')}
        className="bg-gradient-to-r from-purple-700 via-indigo-700 to-amber-600 text-white p-5 rounded-[2.2rem] shadow-lg shadow-purple-500/15 flex items-center justify-between gap-4 cursor-pointer active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
            <BookOpen className="text-amber-300 w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400/25 text-amber-200 px-2 py-0.5 rounded-full border border-amber-300/30">
                Pesquisa Bíblica
              </span>
            </div>
            <h3 className="font-black text-base text-white mt-0.5">Encontre Versículos da Bíblia</h3>
            <p className="text-xs text-purple-100/90 font-medium">Digite o livro e versículo (Ex: Isaías 9:6)</p>
          </div>
        </div>
        <div className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl">
          <ChevronRight size={18} className="text-white" />
        </div>
      </div>

      {/* BOTÕES DE ACESSO RÁPIDO */}
      <div className="grid grid-cols-2 gap-4">
        <MenuBtn onClick={() => onNavigate('bible_search')} icon={<BookOpen />} label="Pesquisa Bíblica" color="bg-indigo-600" />
        <MenuBtn onClick={() => onNavigate('hymns')} icon={<Music />} label="Harpa Cristã" color="bg-purple-600" />
        <MenuBtn onClick={() => onNavigate('radios')} icon={<Radio />} label="Rádios Gospel" color="bg-amber-500" />
        <MenuBtn onClick={() => onNavigate('community')} icon={<Sparkles />} label="Mural da Fé" color="bg-emerald-600" />
      </div>

      {/* SEÇÃO DE LINKS E RECURSOS DA IGREJA */}
      <section className="space-y-4 pt-2">
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 ml-2">Vida na Igreja</h3>
        <div className="space-y-3">
          <QuickLink 
            onClick={() => onNavigate('bible_search')} 
            icon={<BookOpen className="text-indigo-600" />} 
            title="Pesquisa Bíblica" 
            desc="Encontre versículos por livro, capítulo e versículo (Ex: Isaías 9:6)" 
            color="border-l-indigo-600" 
          />
          <QuickLink 
            onClick={() => onNavigate('schedule')} 
            icon={<Calendar className="text-blue-600" />} 
            title="Agenda de Cultos" 
            desc="Horários de cultos da família, doutrina e eventos especiais" 
            color="border-l-blue-600" 
          />
          <QuickLink 
            onClick={() => onNavigate('community')} 
            icon={<Sparkles className="text-purple-600" />} 
            title="Mural da Comunidade" 
            desc="Compartilhe testemunhos, versículos e comunhão com os irmãos" 
            color="border-l-purple-600" 
          />
          <QuickLink 
            onClick={() => onNavigate('pastor')} 
            icon={<ShieldCheck className="text-amber-500" />} 
            title="Palavra Pastoral" 
            desc="Mensagens, avisos oficiais e orientações da liderança" 
            color="border-l-amber-500" 
          />
          <QuickLink 
            onClick={() => onNavigate('videos')} 
            icon={<Film className="text-indigo-600" />} 
            title="Vídeos & Pregações" 
            desc="Gravações de cultos, louvores e mensagens edificantes" 
            color="border-l-indigo-600" 
          />
          <QuickLink 
            onClick={() => onNavigate('gallery')} 
            icon={<ImageIcon className="text-teal-600" />} 
            title="Galeria de Fotos" 
            desc="Registros dos cultos, batismos, eventos e congressos" 
            color="border-l-teal-600" 
          />
          <QuickLink 
            onClick={() => onNavigate('prayer')} 
            icon={<Heart className="text-rose-600" />} 
            title="Pedidos de Oração" 
            desc="Envie seu pedido para intercessão dos pastores e da igreja" 
            color="border-l-rose-600" 
          />
        </div>
      </section>
    </div>
  );
};

const MenuBtn: React.FC<{ onClick: () => void; icon: React.ReactElement; label: string; color: string }> = ({ onClick, icon, label, color }) => (
  <button onClick={onClick} className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col items-center gap-4 active:scale-95 transition-all cursor-pointer">
    <div className={`p-4 ${color} text-white rounded-2xl shadow-lg`}>
      {React.cloneElement(icon, { size: 30 })}
    </div>
    <span className="font-black text-slate-800 dark:text-zinc-100 uppercase tracking-tight text-center">{label}</span>
  </button>
);

const QuickLink: React.FC<{ onClick: () => void; icon: React.ReactNode; title: string; desc: string; color: string }> = ({ onClick, icon, title, desc, color }) => (
  <button onClick={onClick} className={`w-full bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-slate-100 dark:border-zinc-800 flex items-center gap-4 active:scale-[0.98] transition-all border-l-[8px] ${color} cursor-pointer`}>
    <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl">{icon}</div>
    <div className="flex-1 text-left">
      <h4 className="font-black text-slate-900 dark:text-zinc-100 text-sm">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium line-clamp-1">{desc}</p>
    </div>
    <ChevronRight size={18} className="text-slate-400" />
  </button>
);

export default HomeView;
