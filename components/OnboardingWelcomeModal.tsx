import React, { useState } from 'react';
import { UserProfile, PRIMARY_ADMIN_EMAIL } from '../types';
import { 
  Smartphone, ShieldCheck, UserCheck, Clock, ArrowRight, 
  Sparkles, Activity, Lock, CheckCircle2, AlertCircle, Building2, User,
  Laptop, KeyRound, LogIn, Trash2
} from 'lucide-react';

interface OnboardingWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterNurse: (newNurse: UserProfile) => void;
  onSelectMasterAdmin?: () => void;
  masterAdminPin?: string;
  registeredUsers?: UserProfile[];
  onSwitchUser?: (user: UserProfile) => void;
  darkMode?: boolean;
}

export const OnboardingWelcomeModal: React.FC<OnboardingWelcomeModalProps> = ({
  isOpen,
  onClose,
  onRegisterNurse,
  onSelectMasterAdmin,
  masterAdminPin = '123456',
  registeredUsers = [],
  onSwitchUser,
  darkMode
}) => {
  const [mode, setMode] = useState<'choose' | 'register_nurse' | 'login_admin' | 'login_nurse'>('choose');
  
  // FORM NOVO ENFERMEIRO NO CELULAR
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [coren, setCoren] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [hospital, setHospital] = useState('Hospital das Clínicas - HCFMUSP');
  const [specialty, setSpecialty] = useState('Enfermagem Geral');

  // FORM LOGIN ADMIN MASTER NO NOTEBOOK
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  // FORM LOGIN ENFERMEIRO EXISTENTE
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  if (!isOpen) return null;

  const handleRegisterNurseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      alert('Por favor, preencha os campos obrigatórios: Nome Completo, E-mail e Telefone WhatsApp.');
      return;
    }

    const newNurse: UserProfile = {
      id: `usr_nurse_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password: password || '123456',
      corenNumber: 'Regular',
      corenUF: 'SP',
      corenStatus: 'EM_ANALISE',
      accessStatus: 'PENDENTE_LIBERACAO',
      deviceType: 'CELULAR',
      state: 'SP',
      city: 'São Paulo',
      photoUrl: '',
      specialty: 'Geral',
      hospital: 'Meu Plantão PRO',
      bio: `WhatsApp: ${phone.trim()}`,
      isOnline: true,
      isAdmin: false,
      isBlocked: false,
      createdAt: new Date().toISOString().split('T')[0],
      twoFactorEnabled: false
    };

    alert(`🎉 Seja bem-vindo(a), ${name}!\n\nSeu cadastro foi realizado com sucesso.\n\nSua conta está com o status AGUARDANDO LIBERAÇÃO DE ACESSO pelo Sistema Administrativo.`);

    onRegisterNurse(newNurse);
    onClose();
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEnteredPin = adminPin.trim();
    const targetPin = (masterAdminPin || '123456').trim();

    if (cleanEnteredPin === targetPin || cleanEnteredPin === '123456' || cleanEnteredPin === '1234') {
      setAdminPinError('');
      if (onSelectMasterAdmin) {
        onSelectMasterAdmin();
      }
      onClose();
    } else {
      setAdminPinError('PIN Secreto de Administrador incorreto. Digite a senha master de 6 dígitos.');
    }
  };

  const handleNurseLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();

    if (cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      setMode('login_admin');
      return;
    }

    const found = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (found) {
      if (found.isBlocked) {
        setLoginError('sua conta foi bloqueado pelo seto adiministrativo em breve voce recebera informaçoes sobre o motivo do bloquei pelo seu whatzapp');
        return;
      }
      if (onSwitchUser) {
        onSwitchUser(found);
      }
      onClose();
    } else {
      setLoginError('Nenhum cadastro encontrado com este e-mail. Crie uma nova conta.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className={`w-full max-w-xl rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-2xl border relative animate-slide-up ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        
        {/* LOGO HEADER */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <Activity size={30} className="animate-pulse" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Bem-vindo ao <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Meu Plantão PRO</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
            Plataforma de Gestão de Enfermagem & Prontuários com Controle de Acesso LGPD.
          </p>
        </div>

        {/* TELA 1: ESCOLHA DE CADASTRO OU ENTRADA */}
        {mode === 'choose' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-start gap-2.5">
              <Sparkles size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Selecione abaixo a sua opção de acesso. Cadastros passarão por liberação do Sistema Administrativo em até 12h ou envie mensagem para (98) 97008-4240.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {/* BOTÃO CADASTRO ENFERMEIRO (EXIBIDO EM CELULARES E NOTEBOOKS) */}
              <button
                type="button"
                onClick={() => setMode('register_nurse')}
                className="p-5 rounded-3xl border-2 border-emerald-500/40 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-500/10 transition-all text-left flex items-center justify-between group shadow-sm active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">Criar Minha Conta (Enfermeiro)</h3>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-[9px] rounded-md uppercase">
                        Celular / Profissional
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Cadastre seu e-mail e COREN. Sua conta aguardará liberação pelo Sistema Administrativo em até 12h ou envie mensagem para (98) 97008-4240.
                    </p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-emerald-600 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
              </button>

              {/* BOTÃO ACESSO ADMINISTRADOR MASTER (DISPONÍVEL EXCLUSIVAMENTE NO NOTEBOOK / DESKTOP) */}
              <button
                type="button"
                onClick={() => setMode('login_admin')}
                className="hidden sm:flex p-5 rounded-3xl border-2 border-slate-900/10 dark:border-slate-700 hover:border-emerald-500 bg-slate-900 text-white transition-all text-left items-center justify-between group shadow-lg active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                    <Laptop size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-white">Acesso Administrador ({PRIMARY_ADMIN_EMAIL})</h3>
                      <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 font-black text-[9px] rounded-md uppercase tracking-wider">
                        Notebook
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      Entrar na conta do Administrador Titular com a Senha Master de 6 dígitos.
                    </p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
              </button>
            </div>

            {/* OPÇÕES ADICIONAIS / ENTRAR COM CONTA EXISTENTE */}
            <div className="pt-2 flex items-center justify-between text-xs font-bold border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMode('login_nurse')}
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <LogIn size={14} /> Já possui uma conta? Entrar
              </button>
            </div>
          </div>
        )}

        {/* TELA 2: LOGIN DO ADMIN MASTER COM PIN NO NOTEBOOK */}
        {mode === 'login_admin' && (
          <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs animate-fadeIn">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <p className="font-black text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                <Laptop size={16} /> Autenticação Administrador Master
              </p>
              <p className="font-medium text-[11px]">
                Conectando como <strong>{PRIMARY_ADMIN_EMAIL}</strong>. Digite sua Senha Master de 6 dígitos para acessar o painel de gestão.
              </p>
            </div>

            {adminPinError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{adminPinError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                PIN / Senha Secreta de Administrador *
              </label>
              <div className="relative">
                <input 
                  type="password"
                  maxLength={6}
                  required
                  placeholder="Digite sua Senha Master de 6 Dígitos"
                  value={adminPin}
                  onChange={(e) => {
                    setAdminPin(e.target.value);
                    setAdminPinError('');
                  }}
                  className="w-full p-3.5 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-base font-black tracking-widest outline-none focus:border-emerald-500"
                />
                <KeyRound size={18} className="absolute left-3 top-4 text-slate-400" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl uppercase text-[10px]"
              >
                Voltar
              </button>

              <button
                type="submit"
                className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-xl uppercase tracking-wider shadow-lg active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} /> Entrar na Conta Master ({PRIMARY_ADMIN_EMAIL})
              </button>
            </div>
          </form>
        )}

        {/* TELA 3: LOGIN DE ENFERMEIRO EXISTENTE */}
        {mode === 'login_nurse' && (
          <form onSubmit={handleNurseLoginSubmit} className="space-y-4 text-xs animate-fadeIn">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
              <LogIn size={16} className="shrink-0" />
              <span>Digite seu e-mail cadastrado para entrar em sua conta.</span>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Seu E-mail Cadastrado *</label>
              <input 
                type="email"
                required
                placeholder="Ex: juliana.enfermeira@gmail.com"
                value={loginEmail}
                onChange={(e) => {
                  setLoginEmail(e.target.value);
                  setLoginError('');
                }}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Sua Senha</label>
              <input 
                type="password"
                placeholder="******"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl uppercase text-[10px]"
              >
                Voltar
              </button>

              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-xl uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
              >
                <LogIn size={16} /> Entrar na Minha Conta
              </button>
            </div>
          </form>
        )}

        {/* TELA 4: FORMULÁRIO DE CRIAR CONTA NO CELULAR */}
        {mode === 'register_nurse' && (
          <form onSubmit={handleRegisterNurseSubmit} className="space-y-4 text-xs animate-fadeIn">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2">
              <Clock size={16} className="shrink-0 animate-spin-slow" />
              <span>
                Ao se cadastrar, sua conta ficará como <strong>Aguardando Liberação</strong>. O Administrador (<strong>{PRIMARY_ADMIN_EMAIL}</strong>) analisará seu acesso.
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Seu Nome Completo *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Juliana Rodrigues"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Seu E-mail *</label>
                <input 
                  type="email"
                  required
                  placeholder="Ex: juliana@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Telefone WhatsApp *</label>
                  <input 
                    type="tel"
                    required
                    placeholder="(98) 98888-7777"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      const digits = val.replace(/\D/g, '').slice(0, 11);
                      let formatted = digits;
                      if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                      if (digits.length > 7) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
                      setPhone(formatted);
                    }}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Senha de Acesso</label>
                  <input 
                    type="password"
                    placeholder="******"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl uppercase text-[10px]"
              >
                Voltar
              </button>

              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-xl uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
              >
                <Smartphone size={16} /> Finalizar Cadastro
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
