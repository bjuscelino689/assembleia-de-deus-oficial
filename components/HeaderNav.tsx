import React from 'react';
import { UserProfile, isMasterAdminEmail, ChurchInfo } from '../types';
import { ShieldCheck, Sun, Moon, Share2, Laptop, User, Star, Lock, LogOut, Building2, Crown, Calendar } from 'lucide-react';

interface HeaderNavProps {
  user: UserProfile;
  darkMode: boolean;
  churchInfo?: ChurchInfo;
  onToggleDarkMode: () => void;
  onOpenShare: () => void;
  onOpenAdmin: () => void;
  onOpenAuth: () => void;
  onNavigateHome: () => void;
  onLogout?: () => void;
  onOpenAi?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  user,
  darkMode,
  churchInfo,
  onToggleDarkMode,
  onOpenShare,
  onOpenAdmin,
  onOpenAuth,
  onNavigateHome,
  onLogout
}) => {
  const isMasterAdmin = Boolean(user && user.email && isMasterAdminEmail(user.email));
  const isDesignatedPastor = Boolean(
    user && 
    !isMasterAdmin && 
    (
      user.isPastorAdmin === true || 
      user.role === 'PASTOR' ||
      (churchInfo?.pastorAdminId && (user.id === churchInfo.pastorAdminId || (user.email && churchInfo.pastorAdminEmail && user.email.toLowerCase() === churchInfo.pastorAdminEmail.toLowerCase())))
    )
  );

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
      darkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/90 border-slate-200 text-slate-800'
    }`}>
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* LOGO & BRANDING ASSEMBLEIA DE DEUS */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0 shrink-1" onClick={onNavigateHome}>
          <div className="relative shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 font-black text-lg sm:text-xl">
              <Star size={18} className="fill-white sm:w-[22px] sm:h-[22px]" />
            </div>
            <span className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-white dark:border-slate-900 rounded-full ${
              user?.accessStatus === 'BLOQUEADO' ? 'bg-rose-500' : 'bg-emerald-500'
            }`} title="Status do Membro" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h1 className="font-title font-black text-xs sm:text-lg tracking-tight bg-gradient-to-r from-purple-700 via-indigo-600 to-amber-600 dark:from-purple-400 dark:to-amber-400 bg-clip-text text-transparent truncate">
                Assembleia de Deus<span className="text-amber-500 font-extrabold text-[9px] sm:text-xs ml-1 px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20 uppercase">Nacional</span>
              </h1>
            </div>

            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 min-w-0">
              <span className="truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[200px]">{user?.name || 'Membro / Visitante'}</span>
              
              {isMasterAdmin ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full font-black text-[9px] border border-purple-500/20 shrink-0">
                  <ShieldCheck size={10} /> Gabinete Pastoral
                </span>
              ) : isDesignatedPastor ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-black text-[9px] border border-amber-500/20 shrink-0">
                  <Crown size={10} /> Pastora Designada
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-black text-[9px] shrink-0">
                  <Building2 size={10} /> Templo Sede
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CONTROLES E AÇÕES */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* BOTÃO PAINEL PASTORAL ADM - EXCLUSIVO PARA O ADMINISTRADOR MASTER (Pr. Juscelino) */}
          {isMasterAdmin && (
            <button
              onClick={onOpenAdmin}
              className="p-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Painel Pastoral / Área do Pastor"
            >
              <Lock size={14} className="text-amber-300" />
              <span className="hidden md:inline">Painel ADM</span>
            </button>
          )}

          {/* BOTÃO AGENDA DA PASTORA - EXCLUSIVO PARA A PASTORA DESIGNADA (Irmã Francisca) */}
          {isDesignatedPastor && (
            <button
              onClick={onOpenAdmin}
              className="p-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer border border-amber-300/40"
              title="Acessar Agenda & Cultos da Igreja"
            >
              <Crown size={14} className="text-slate-950" />
              <span className="inline">Agenda da Pastora</span>
            </button>
          )}

          {/* BOTÃO MODO ESCURO / CLARO */}
          <button
            onClick={onToggleDarkMode}
            className={`p-1.5 sm:p-2 rounded-xl transition-all shrink-0 ${
              darkMode ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          >
            {darkMode ? <Sun size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Moon size={16} className="sm:w-[18px] sm:h-[18px]" />}
          </button>

          {/* BOTÃO COMPARTILHAR APP */}
          <button
            onClick={onOpenShare}
            className={`p-1.5 sm:p-2 rounded-xl transition-all shrink-0 ${
              darkMode ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            }`}
            title="Compartilhar Aplicativo da Igreja"
          >
            <Share2 size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>

          {/* PERFIL / LOGIN DO MEMBRO */}
          <button
            onClick={onOpenAuth}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border-2 border-purple-500/40 hover:border-purple-500 transition-all shrink-0"
            title="Perfil de Membro / Login"
          >
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-purple-100 dark:bg-slate-800 text-purple-700 dark:text-purple-400 flex items-center justify-center font-black">
                <User size={16} />
              </div>
            )}
          </button>

          {/* BOTÃO SAIR */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 sm:px-2.5 sm:py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl transition-all shrink-0 flex items-center gap-1 active:scale-95"
              title="Sair da Conta"
            >
              <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider">Sair</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
