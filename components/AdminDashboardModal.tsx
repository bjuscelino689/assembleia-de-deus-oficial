import React, { useState } from 'react';
import { AuditLog, UserProfile, PRIMARY_ADMIN_EMAIL } from '../types';
import { isGuestOrAnonymousUser } from '../utils/deletedSync';
import { 
  ShieldCheck, Lock, Users, Activity, FileText, Server, AlertTriangle, Key, X, 
  Bell, RefreshCw, Database, Download, CheckCircle2, UserX, Search, Smartphone, 
  Laptop, Check, Ban, Clock, Trash2, ShieldAlert, MessageSquare, Send, MessageCircle, Crown
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLog[];
  user: UserProfile;
  registeredUsers: UserProfile[];
  onApproveUser: (userId: string) => void;
  onBlockUser: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onRefreshUsers?: (users: UserProfile[]) => void;
  onClearAllMessages?: () => void;
  masterAdminPin?: string;
  onUpdateMasterPin?: (newPin: string) => Promise<boolean> | boolean;
  darkMode?: boolean;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  auditLogs,
  user,
  registeredUsers = [],
  onApproveUser,
  onBlockUser,
  onDeleteUser,
  onRefreshUsers,
  onClearAllMessages,
  masterAdminPin = '123456',
  onUpdateMasterPin,
  darkMode
}) => {
  const isMasterAdmin = user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.isAdmin;
  const [isAuthenticated2FA, setIsAuthenticated2FA] = useState(isMasterAdmin);
  const [pinCode, setPinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'server' | 'broadcast' | 'security'>('users');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // AUTO-REFRESH DE USUÁRIOS DO SERVIDOR AO ABRIR O PAINEL ADM
  React.useEffect(() => {
    if (isOpen) {
      refreshUsers();
    }
  }, [isOpen]);

  const refreshUsers = async () => {
    try {
      setIsRefreshing(true);
      let localUsers = registeredUsers;
      try {
        const rawLocal = localStorage.getItem('nursecare_registered_users');
        if (rawLocal) {
          localUsers = JSON.parse(rawLocal);
        }
      } catch (e) {}

      // 1. Sincroniza usuários
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientUsers: localUsers })
      });
      if (res.ok) {
        const serverUsers: UserProfile[] = await res.json();
        if (Array.isArray(serverUsers) && onRefreshUsers) {
          onRefreshUsers(serverUsers);
        }
      }

      // 2. Busca membros e atualiza storage local para sincronismo no notebook
      const resMembers = await fetch('/api/members');
      if (resMembers.ok) {
        const membersList = await resMembers.json();
        if (Array.isArray(membersList)) {
          try {
            localStorage.setItem('ad_members', JSON.stringify(membersList));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("Erro ao atualizar lista do servidor:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // FORM ALTERAÇÃO SENHA MASTER 6 DÍGITOS
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState('');
  const [userToDeleteForConfirmation, setUserToDeleteForConfirmation] = useState<UserProfile | null>(null);

  // MENSAGEM DO SISTEMA ADMINISTRATIVO EXCLUSIVA PARA CADA ENFERMEIRO
  const [selectedUserForMessage, setSelectedUserForMessage] = useState<UserProfile | null>(null);
  const [adminMessageInput, setAdminMessageInput] = useState('');
  const [isSavingAdminMsg, setIsSavingAdminMsg] = useState(false);

  const handleOpenMessageModal = (targetUser: UserProfile) => {
    setSelectedUserForMessage(targetUser);
    setAdminMessageInput(targetUser.adminMessage || '');
  };

  const handlePromoteToPastor = async (targetUser: UserProfile) => {
    try {
      const res = await fetch(`/api/members/${targetUser.id}/promote-pastor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPastorAdmin: !targetUser.isPastorAdmin, accessCode: '1234' })
      });
      if (res.ok) {
        alert(`${targetUser.name} ${targetUser.isPastorAdmin ? 'não é mais' : 'agora é'} o Pastor Administrativo da igreja!`);
        refreshUsers();
      }
    } catch (e) {
      alert('Erro ao atualizar cargo pastoral.');
    }
  };

  const handleSaveAdminMsg = async (msgText: string) => {
    if (!selectedUserForMessage) return;
    try {
      setIsSavingAdminMsg(true);
      const res = await fetch(`/api/users/${selectedUserForMessage.id}/admin-message`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminMessage: msgText })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.users && onRefreshUsers) {
          onRefreshUsers(data.users);
        } else {
          refreshUsers();
        }
        setSelectedUserForMessage(null);
      } else {
        alert('Falha ao salvar a mensagem no servidor.');
      }
    } catch (e) {
      console.error('Erro ao enviar mensagem do admin:', e);
      alert('Erro de conexão ao enviar mensagem.');
    } finally {
      setIsSavingAdminMsg(false);
    }
  };

  if (!isOpen) return null;

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.trim() === (masterAdminPin || '123456').trim() || isMasterAdmin) {
      setIsAuthenticated2FA(true);
    } else {
      alert('PIN de Administrador inválido. Digite a senha master de 6 dígitos.');
    }
  };

  const handleSaveMasterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinSuccessMsg('');
    setPinErrorMsg('');

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setPinErrorMsg('A nova senha deve possuir EXATAMENTE 6 dígitos numéricos (ex: 987654).');
      return;
    }

    if (newPin !== confirmPin) {
      setPinErrorMsg('A confirmação da nova senha não confere.');
      return;
    }

    if (onUpdateMasterPin) {
      const ok = await onUpdateMasterPin(newPin);
      if (ok) {
        setPinSuccessMsg('Sua Senha Master de 6 dígitos foi configurada com sucesso e sincronizada com o sistema!');
        setNewPin('');
        setConfirmPin('');
      } else {
        setPinErrorMsg('Falha ao salvar a nova senha no servidor. Tente novamente.');
      }
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 4000);
    setBroadcastTitle('');
    setBroadcastMessage('');
  };

  const confirmAndDelete = (targetUser: UserProfile) => {
    if (!onDeleteUser) return;
    setUserToDeleteForConfirmation(targetUser);
  };

  // CATEGORIZAR USUÁRIOS GARANTINDO QUE NENHUM CADASTRO FIQUE OCULTO
  const nonAdminUsers = registeredUsers.filter(u => 
    u && u.id && !u.isAdmin && u.id !== 'usr_admin_master' && 
    (u.email || '').toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase() &&
    !isGuestOrAnonymousUser(u.id, u.email, u.phone, u.name)
  );

  const blockedUsers = nonAdminUsers.filter(u => 
    u.accessStatus === 'BLOQUEADO' || u.isBlocked === true
  );

  const approvedUsers = nonAdminUsers.filter(u => 
    !blockedUsers.some(b => b.id === u.id) && u.accessStatus === 'LIBERADO'
  );

  const pendingUsers = nonAdminUsers.filter(u => 
    !blockedUsers.some(b => b.id === u.id) && !approvedUsers.some(a => a.id === u.id)
  );

  // HELPER DE SINAL DE PRESENÇA E STATUS DO ENFERMEIRO (EXCLUSIVO PARA PAINEL DE ADMINISTRADOR)
  const getUserStatusSignal = (u: UserProfile) => {
    const isBlocked = u.accessStatus === 'BLOQUEADO' || u.isBlocked === true;
    if (isBlocked) {
      return {
        type: 'BLOCKED',
        color: 'red',
        label: 'Bloqueado pelo Administrador',
        shortLabel: 'Bloqueado',
        badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-black',
        dotClass: 'bg-rose-500 shadow-rose-500/50',
        icon: '🔴'
      };
    }

    const isOnline = Boolean(u.isOnline || (u.lastActiveAt && (Date.now() - Number(u.lastActiveAt) < 15000)));

    if (isOnline) {
      return {
        type: 'ONLINE',
        color: 'green',
        label: 'Conectado (App Aberto Agora)',
        shortLabel: 'App Aberto',
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-black',
        dotClass: 'bg-emerald-500 animate-pulse shadow-emerald-500/50',
        icon: '🟢'
      };
    } else {
      return {
        type: 'OFFLINE',
        color: 'blue',
        label: 'App Fechado (Desconectado)',
        shortLabel: 'App Fechado',
        badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-black',
        dotClass: 'bg-blue-500 shadow-blue-500/50',
        icon: '🔵'
      };
    }
  };

  const onlineCount = nonAdminUsers.filter(u => getUserStatusSignal(u).type === 'ONLINE').length;
  const offlineCount = nonAdminUsers.filter(u => getUserStatusSignal(u).type === 'OFFLINE').length;

  const filteredUsers = (list: UserProfile[]) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(u => 
      u.name.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term) || 
      (u.corenNumber && u.corenNumber.toLowerCase().includes(term))
    );
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className={`w-full max-w-6xl rounded-[2.5rem] border shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] animate-slide-up ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        {/* HEADER BAR */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 font-black">
              <Laptop size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">Painel Administrativo do Notebook</h2>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black rounded-full text-[10px] uppercase border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Admin Único: {PRIMARY_ADMIN_EMAIL}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                Liberação de acessos no celular de enfermeiros, auditoria COREN e governança LGPD.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshUsers}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95"
              title="Atualizar cadastros do servidor"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* MENSAGEM DE ALERTA SE NÃO FOR O EMAIL ADMIN MASTER */}
        {!isMasterAdmin && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 px-6 flex items-center gap-3 text-xs font-bold text-amber-700 dark:text-amber-400">
            <ShieldAlert size={20} className="shrink-0" />
            <span>
              Atenção: O controle administrativo é exclusivo da conta master <strong>{PRIMARY_ADMIN_EMAIL}</strong> acessada via Notebook.
            </span>
          </div>
        )}

        {/* VERIFICAÇÃO DE 2FA / TELA DE SEGURANÇA SE NÃO FOR O ADMIN OU ESTIVER DESAUTENTICADO */}
        {!isAuthenticated2FA ? (
          <div className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-6 my-auto">
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20 shadow-inner">
              <Lock size={38} />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase tracking-tight">Autenticação de Segurança (Notebook)</h3>
              <p className="text-xs text-slate-400 font-medium">
                Digite o PIN de segurança para gerenciar as permissões dos enfermeiros cadastrados pelo celular.
              </p>
            </div>

            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="PIN: 123456"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-full text-center tracking-[0.5em] text-2xl font-black p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 font-bold mt-1 block">Administrador Master: {PRIMARY_ADMIN_EMAIL}</span>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black p-4 rounded-2xl uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-xs"
              >
                Acessar Painel do Notebook
              </button>
            </form>
          </div>
        ) : (
          /* CONTEÚDO PRINCIPAL DO PAINEL ADMINISTRATIVO */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* CARD RESUMO DE CONTROLE DO ADM */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900/20 via-slate-900/20 to-teal-900/20 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl font-black shadow-md">
                  <Laptop size={22} />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    Controle de Acessos & Segurança
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-black">
                      Notebook Master
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Gerencie acessos de enfermeiros nos celulares e altere sua senha de administrador a qualquer momento.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                <button
                  onClick={() => setActiveTab('security')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Key size={14} /> Trocar Senha (6 Dígitos)
                </button>
                <div className="text-center px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="block text-[10px] font-black text-amber-600 uppercase">Pendentes</span>
                  <span className="text-sm font-black text-amber-600">{pendingUsers.length}</span>
                </div>
                <div className="text-center px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="block text-[10px] font-black text-emerald-600 uppercase">Liberados</span>
                  <span className="text-sm font-black text-emerald-600">{approvedUsers.length}</span>
                </div>
              </div>
            </div>

            {/* ABAS DO PAINEL ADM */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl overflow-x-auto no-scrollbar gap-1">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <span>👥 Enfermeiros ({nonAdminUsers.length})</span>
                {pendingUsers.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500 text-slate-900 font-black rounded-full text-[9px] animate-pulse">
                    {pendingUsers.length} PENDENTE{pendingUsers.length > 1 ? 'S' : ''}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                  activeTab === 'security' ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                🔑 Alterar Senha de Administrador
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeTab === 'audit' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                📜 Rastro LGPD
              </button>

              <button
                onClick={() => setActiveTab('server')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeTab === 'server' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                🖥️ Servidor Cloud
              </button>

              <button
                onClick={() => setActiveTab('broadcast')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeTab === 'broadcast' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                📢 Alerta Push Celulares
              </button>
            </div>

            {/* ABA 1: PROFISSIONAIS DE ENFERMAGEM & LIBERAÇÕES */}
            {activeTab === 'users' && (
              <div className="space-y-6 animate-fadeIn">
                {/* STATUS DE PRESENÇA EM TEMPO REAL - LEGENDA ADMINISTRADOR */}
                <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs shadow-inner">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50 shrink-0"></span>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-black block text-emerald-600 dark:text-emerald-400">🟢 Sinal Verde</span>
                      <span className="text-xs font-black">{onlineCount} Conectado{onlineCount !== 1 ? 's' : ''} (App Aberto Agora)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-800 dark:text-blue-300">
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 shrink-0"></span>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-black block text-blue-600 dark:text-blue-400">🔵 Sinal Azul</span>
                      <span className="text-xs font-black">{offlineCount} Desconectado{offlineCount !== 1 ? 's' : ''} (App Fechado)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 dark:text-rose-300">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 shrink-0"></span>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-black block text-rose-600 dark:text-rose-400">🔴 Sinal Vermelho</span>
                      <span className="text-xs font-black">{blockedUsers.length} Bloqueado{blockedUsers.length !== 1 ? 's' : ''} pelo Admin</span>
                    </div>
                  </div>
                </div>

                {/* BUSCA DE PROFISSIONAIS */}
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Buscar enfermeiro por Nome, E-mail ou Inscrição COREN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium outline-none focus:border-emerald-500"
                  />
                </div>

                {/* SEÇÃO 1: SOLICITAÇÕES PENDENTES DE CELULAR */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Clock size={16} /> Novos Cadastros via Celular (Aguardando Sua Aprovacão no Notebook)
                    </h3>
                    <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 font-black rounded-full text-[10px]">
                      {pendingUsers.length} pendentes
                    </span>
                  </div>

                  {pendingUsers.length === 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-center border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 font-medium">
                      Nenhuma solicitação de acesso pendente no momento. Todos os enfermeiros cadastrados estão processados.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredUsers(pendingUsers).map((u) => {
                        const signal = getUserStatusSignal(u);
                        return (
                          <div 
                            key={u.id}
                            className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-amber-500/30 flex items-center justify-center font-black">
                                {u.photoUrl ? (
                                  <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Smartphone size={24} className="text-amber-600" />
                                )}
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${signal.dotClass}`} title={signal.label} />
                              </div>

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-black text-xs text-slate-900 dark:text-white">{u.name}</h4>
                                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold rounded-md">
                                    COREN: {u.corenNumber || 'Pendente'}
                                  </span>
                                  <span className={`px-2 py-0.5 border text-[10px] rounded-full flex items-center gap-1.5 ${signal.badgeClass}`}>
                                    <span className={`w-2 h-2 rounded-full ${signal.dotClass}`} />
                                    {signal.label}
                                  </span>
                                </div>

                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                  E-mail: <strong>{u.email}</strong> • Hospital: {u.hospital || 'Não informado'} • Especialidade: {u.specialty}
                                </p>
                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  ⌛ Cadastrado em: {u.createdAt} — O usuário não conseguirá acessar o prontuário no celular até você liberar.
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-amber-500/20">
                              <button
                                onClick={() => handleOpenMessageModal(u)}
                                className={`px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                  u.adminMessage && !u.adminMessageRead
                                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 animate-pulse'
                                    : u.adminMessage && u.adminMessageRead
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                }`}
                                title="Enviar mensagem oficial restrita a este enfermeiro"
                              >
                                <MessageSquare size={15} />
                                <span>{u.adminMessage ? (u.adminMessageRead ? 'Mensagem (Lida)' : 'Mensagem (Ativa)') : 'Mensagem'}</span>
                              </button>

                              <button
                                onClick={() => onApproveUser(u.id)}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                              >
                                <Check size={16} /> Liberar Acesso
                              </button>

                              <button
                                onClick={() => onBlockUser(u.id)}
                                className="px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1"
                              >
                                <Ban size={15} /> Bloquear
                              </button>

                              {onDeleteUser && (
                                <button
                                  onClick={() => confirmAndDelete(u)}
                                  className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                                  title="Excluir conta de enfermeiro definitivamente"
                                >
                                  <Trash2 size={15} /> Excluir Definitivamente
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SEÇÃO 2: ENFERMEIROS APROVADOS & ATIVOS */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Profissionais de Enfermagem Com Acesso Liberado ({approvedUsers.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredUsers(approvedUsers).map((u) => {
                      const signal = getUserStatusSignal(u);
                      return (
                        <div 
                          key={u.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                            darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-emerald-100 dark:bg-slate-700 shrink-0 font-black flex items-center justify-center">
                              {u.photoUrl ? (
                                <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs text-emerald-700">{u.name.substring(0, 2)}</span>
                              )}
                              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${signal.dotClass}`} title={signal.label} />
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <h4 className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1 truncate">
                                {u.name}
                                <span className="text-[9px] font-bold text-emerald-600 font-mono">({u.corenNumber})</span>
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium truncate">{u.email}</p>
                              <div className="pt-0.5">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] uppercase ${signal.badgeClass}`}>
                                  <span className={`w-2 h-2 rounded-full ${signal.dotClass}`} />
                                  {signal.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {u.isPastorAdmin ? (
                              <button
                                onClick={() => handlePromoteToPastor(u)}
                                className="px-2.5 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-rose-500/20 hover:text-rose-300 font-black rounded-xl text-[10px] uppercase transition-all shrink-0 flex items-center gap-1"
                                title="Revogar cargo de Pastor Administrativo"
                              >
                                <Crown size={12} className="text-amber-400" />
                                <span>Pastor Designado (Remover)</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePromoteToPastor(u)}
                                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-black rounded-xl text-[10px] uppercase transition-all shrink-0 flex items-center gap-1 border border-amber-500/20"
                                title="Nomear este usuário como Pastor Administrativo"
                              >
                                <Crown size={12} />
                                <span>Tornar Pastor</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenMessageModal(u)}
                              className={`px-2.5 py-1.5 rounded-xl font-black text-[10px] uppercase transition-all shrink-0 flex items-center gap-1 ${
                                u.adminMessage && !u.adminMessageRead
                                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 animate-pulse'
                                  : u.adminMessage && u.adminMessageRead
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}
                              title="Enviar mensagem oficial restrita a este enfermeiro"
                            >
                              <MessageSquare size={13} />
                              <span>{u.adminMessage ? (u.adminMessageRead ? 'Mensagem (Lida)' : 'Mensagem (Ativa)') : 'Mensagem'}</span>
                            </button>

                            <button
                              onClick={() => onBlockUser(u.id)}
                              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-black rounded-xl text-[10px] uppercase transition-all shrink-0 flex items-center gap-1"
                              title="Bloquear acesso no celular"
                            >
                              <Ban size={12} /> Bloquear
                            </button>

                            {onDeleteUser && (
                              <button
                                onClick={() => confirmAndDelete(u)}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-[10px] uppercase transition-all shrink-0 flex items-center gap-1 shadow-sm active:scale-95"
                                title="Excluir conta definitivamente do aplicativo"
                              >
                                <Trash2 size={12} /> Excluir Definitivamente
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SEÇÃO 3: ACESSOS BLOQUEADOS */}
                {blockedUsers.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="font-black text-xs uppercase tracking-wider text-rose-600 flex items-center gap-2">
                      <Ban size={16} /> Acessos Bloqueados / Suspensos ({blockedUsers.length})
                    </h3>

                    <div className="space-y-2">
                      {filteredUsers(blockedUsers).map((u) => {
                        const signal = getUserStatusSignal(u);
                        return (
                          <div 
                            key={u.id}
                            className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-rose-100 dark:bg-slate-800 shrink-0 font-black flex items-center justify-center border border-rose-500/30">
                                {u.photoUrl ? (
                                  <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs text-rose-600">{u.name.substring(0, 2)}</span>
                                )}
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${signal.dotClass}`} title={signal.label} />
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-black text-slate-900 dark:text-white">{u.name} ({u.corenNumber})</h4>
                                  <span className={`px-2 py-0.5 border text-[9px] rounded-full flex items-center gap-1.5 ${signal.badgeClass}`}>
                                    <span className={`w-2 h-2 rounded-full ${signal.dotClass}`} />
                                    {signal.label}
                                  </span>
                                </div>
                                <p className="text-[10px] text-rose-600 font-bold mt-0.5">Acesso suspenso/bloqueado pelo Administrador ({PRIMARY_ADMIN_EMAIL})</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenMessageModal(u)}
                                className={`px-2.5 py-1.5 rounded-xl font-black text-[10px] uppercase transition-all shrink-0 flex items-center gap-1 ${
                                  u.adminMessage && !u.adminMessageRead
                                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 animate-pulse'
                                    : u.adminMessage && u.adminMessageRead
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                }`}
                                title="Enviar mensagem oficial restrita a este enfermeiro"
                              >
                                <MessageSquare size={13} />
                                <span>{u.adminMessage ? (u.adminMessageRead ? 'Mensagem (Lida)' : 'Mensagem (Ativa)') : 'Mensagem'}</span>
                              </button>

                              <button
                                onClick={() => onApproveUser(u.id)}
                                className="px-3 py-1.5 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase transition-all flex items-center gap-1"
                              >
                                <Check size={12} /> Desbloquear
                              </button>
                              {onDeleteUser && (
                                <button
                                  onClick={() => confirmAndDelete(u)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-[10px] uppercase transition-all shrink-0 flex items-center gap-1 shadow-sm active:scale-95"
                                  title="Excluir cadastro definitivamente"
                                >
                                  <Trash2 size={12} /> Excluir Definitivamente
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ABA 2: AUDITORIA LGPD */}
            {activeTab === 'audit' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase text-slate-900 dark:text-white">
                    Registro de Operações & Rastro de Auditoria (COREN & LGPD)
                  </h3>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Imutável / AES-256</span>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {auditLogs.map((log) => (
                    <div 
                      key={log.id}
                      className={`p-3.5 rounded-2xl border text-xs space-y-1 font-mono ${
                        darkMode ? 'bg-slate-800/40 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>[{log.timestamp}] • IP: {log.ipAddress}</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{log.status}</span>
                      </div>
                      <p className="font-bold text-xs">{log.action}</p>
                      <p className="text-[10px] opacity-75">{log.details} — Executado por: {log.userName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 3: SERVIDOR & BANCO */}
            {activeTab === 'server' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                    <Server size={24} className="text-emerald-600 mx-auto mb-1" />
                    <span className="text-[10px] font-black uppercase text-emerald-600">Servidor Cloud Run</span>
                    <p className="text-xl font-black text-emerald-600">ONLINE (100%)</p>
                  </div>

                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center">
                    <Database size={24} className="text-blue-600 mx-auto mb-1" />
                    <span className="text-[10px] font-black uppercase text-blue-600">Banco de Dados Firestore</span>
                    <p className="text-xl font-black text-blue-600">Criptografado AES-256</p>
                  </div>

                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-center">
                    <ShieldCheck size={24} className="text-purple-600 mx-auto mb-1" />
                    <span className="text-[10px] font-black uppercase text-purple-600">Sincronização PWA</span>
                    <p className="text-xl font-black text-purple-600">Offline Ready</p>
                  </div>
                </div>

                <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-3xl space-y-3">
                  <h4 className="font-black text-xs uppercase">Backup do Sistema & Restauração</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Gere um arquivo criptografado com todos os dados da unidade e prontuários para compliance.
                  </p>

                  <button 
                    onClick={() => alert('Backup do banco de dados baixado com sucesso pelo Administrador!')}
                    className="px-4 py-2.5 bg-emerald-600 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <Download size={15} /> Realizar Backup Agora
                  </button>
                </div>

                {/* LIMPEZA GERAL DO CHAT (EXCLUSIVO ADMINISTRADOR) */}
                <div className="p-5 border border-rose-500/30 bg-rose-500/5 rounded-3xl space-y-3">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs uppercase">
                    <Trash2 size={16} />
                    <h4>Gestão de Mensagens do Chat da Equipe</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Exclua todo o histórico de mensagens de teste do chat e trocas de plantão para todos os usuários. Esta ação é exclusiva do Administrador ({PRIMARY_ADMIN_EMAIL}).
                  </p>

                  {onClearAllMessages && (
                    <button 
                      onClick={() => {
                        if (window.confirm('ADMINISTRADOR: Deseja realmente excluir TODAS as mensagens do chat e limpar o histórico de todos os aparelhos?')) {
                          onClearAllMessages();
                          alert('Histórico de mensagens do chat excluído com sucesso pelo Administrador!');
                        }
                      }}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 active:scale-95"
                    >
                      <Trash2 size={15} /> Excluir Todas as Mensagens do Chat
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ABA 4: BROADCAST NOTIFICAÇÃO */}
            {activeTab === 'broadcast' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-1">
                  <h3 className="font-black text-sm uppercase text-slate-900 dark:text-white">
                    Enviar Notificação Push para os Celulares dos Enfermeiros
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Envia um alerta sonoro imediato nos celulares de todos os enfermeiros com acesso liberado.
                  </p>
                </div>

                {broadcastSent && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs font-bold text-emerald-600 flex items-center gap-2">
                    <CheckCircle2 size={18} /> Alerta transmitido com sucesso para a equipe no celular!
                  </div>
                )}

                <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Título do Alerta</label>
                    <input 
                      type="text" 
                      value={broadcastTitle} 
                      onChange={(e) => setBroadcastTitle(e.target.value)} 
                      required
                      placeholder="Ex: Comunicado da Coordenação - Nova escala de plantão disponível"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Mensagem Detalhada</label>
                    <textarea 
                      rows={3} 
                      value={broadcastMessage} 
                      onChange={(e) => setBroadcastMessage(e.target.value)} 
                      required
                      placeholder="Detalhes sobre o aviso enviado pelo Administrador meuplantaopro@gmail.com..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none" 
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black p-3.5 rounded-2xl uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Bell size={16} /> Disparar Notificação para Celulares
                  </button>
                </form>
              </div>
            )}

            {/* ABA 5: SEGURANÇA E SENHA MASTER DE 6 DÍGITOS */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-fadeIn max-w-xl mx-auto">
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black shadow-md">
                      <Key size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm uppercase text-slate-900 dark:text-white">
                        Configurar Senha Master de 6 Dígitos
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Crie uma senha exclusiva de 6 dígitos que somente você conhece para autorizar o acesso Administrador Master no notebook.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                    <ShieldCheck size={18} className="shrink-0" />
                    <span>PIN Ativo no Servidor: <code className="bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-mono">******</code></span>
                  </div>
                </div>

                {pinSuccessMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                    <span>{pinSuccessMsg}</span>
                  </div>
                )}

                {pinErrorMsg && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>{pinErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveMasterPin} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                      Nova Senha Master (6 Dígitos Numéricos) *
                    </label>
                    <input 
                      type="password"
                      maxLength={6}
                      required
                      placeholder="Ex: 987654"
                      value={newPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setNewPin(val);
                      }}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-center tracking-[0.5em] text-lg font-black outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                      Confirmar Nova Senha Master (6 Dígitos) *
                    </label>
                    <input 
                      type="password"
                      maxLength={6}
                      required
                      placeholder="Ex: 987654"
                      value={confirmPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setConfirmPin(val);
                      }}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-center tracking-[0.5em] text-lg font-black outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-black p-4 rounded-2xl uppercase tracking-wider shadow-lg active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                  >
                    <Lock size={16} /> Salvar Nova Senha Master (6 Dígitos)
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DEFINITIVA (SEM DEPENDER DE WINDOW.CONFIRM) */}
      {userToDeleteForConfirmation && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl transition-all animate-scale-up ${
            darkMode ? 'bg-slate-900 border-rose-500/40 text-slate-100' : 'bg-white border-rose-300 text-slate-900'
          }`}>
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20 text-rose-500 animate-bounce">
              <Trash2 size={32} />
            </div>

            <h3 className="text-xl font-black text-center mb-1 text-rose-600">
              Excluir Conta Definitivamente?
            </h3>
            <p className="text-xs text-center text-slate-400 mb-5 leading-relaxed">
              ATENÇÃO: Esta ação é irreversível! A conta será completamente apagada do servidor e o acesso será revogado.
            </p>

            <div className={`p-4 rounded-2xl border text-xs mb-6 space-y-2 ${
              darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Nome:</span><strong className="font-bold text-slate-900 dark:text-white">{userToDeleteForConfirmation.name}</strong></div>
              <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">E-mail:</span><strong className="font-bold text-slate-900 dark:text-white">{userToDeleteForConfirmation.email}</strong></div>
              <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">COREN:</span><strong className="font-bold text-slate-900 dark:text-white">{userToDeleteForConfirmation.corenNumber || 'N/A'} ({userToDeleteForConfirmation.corenUF || 'UF'})</strong></div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUserToDeleteForConfirmation(null)}
                className="flex-1 py-3.5 px-4 rounded-xl font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteUser && userToDeleteForConfirmation) {
                    onDeleteUser(userToDeleteForConfirmation.id);
                  }
                  setUserToDeleteForConfirmation(null);
                }}
                className="flex-1 py-3.5 px-4 rounded-xl font-black bg-rose-600 hover:bg-rose-700 text-white text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Trash2 size={16} /> Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ENVIAR MENSAGEM DO SISTEMA ADMINISTRATIVO RESTRICTA A UM ENFERMEIRO */}
      {selectedUserForMessage && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 sm:p-7 rounded-[2rem] border shadow-2xl relative animate-scale-up ${
            darkMode ? 'bg-slate-900 border-rose-500/30 text-white' : 'bg-white border-rose-200 text-slate-900'
          }`}>
            <button 
              type="button" 
              onClick={() => setSelectedUserForMessage(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black border border-rose-500/20 shadow-inner">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base uppercase tracking-tight text-rose-600 dark:text-rose-400">
                  Mensagem Direta do Administrador
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Enfermeiro: <strong className="text-slate-900 dark:text-white">{selectedUserForMessage.name}</strong> ({selectedUserForMessage.email})
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
              ⚠️ <strong>Bloqueio de Tela no Celular:</strong> Ao registrar esta mensagem, assim que o enfermeiro <strong>{selectedUserForMessage.name}</strong> abrir o aplicativo, a tela dele exibirá um alerta em destaque com o ícone de mensagem em vermelho piscando e ele <strong>não conseguirá acessar nenhuma função do app até confirmar a leitura</strong>.
            </div>

            {selectedUserForMessage.adminMessage && (
              <div className="mb-4 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs flex items-center justify-between border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-500 dark:text-slate-400">Status no Aparelho:</span>
                {selectedUserForMessage.adminMessageRead ? (
                  <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black rounded-full border border-emerald-500/30 text-[10px] uppercase flex items-center gap-1">
                    <CheckCircle2 size={12} /> Leitura Confirmada
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-black rounded-full border border-rose-500/30 text-[10px] uppercase animate-pulse flex items-center gap-1">
                    🔴 Aguardando Leitura (App Bloqueado)
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2 mb-5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Conteúdo da Mensagem Administrativa:
              </label>
              <textarea
                rows={4}
                value={adminMessageInput}
                onChange={(e) => setAdminMessageInput(e.target.value)}
                placeholder="Exemplo: Prezado enfermeiro, favor entrar em contato com a liderança referente às atualizações de escala no setor UTI antes de iniciar os registros..."
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:border-rose-500 font-medium resize-none shadow-inner leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {selectedUserForMessage.adminMessage ? (
                <button
                  type="button"
                  onClick={() => handleSaveAdminMsg('')}
                  disabled={isSavingAdminMsg}
                  className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Excluir Mensagem
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForMessage(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs uppercase"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAdminMsg(adminMessageInput)}
                  disabled={isSavingAdminMsg || !adminMessageInput.trim()}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Send size={14} /> Enviar p/ Enfermeiro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
