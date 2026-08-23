import React, { useState } from 'react';
import { Member } from '../types';
import { User, Phone, Lock, Eye, EyeOff, UserPlus, LogIn, Church, CheckCircle2, AlertCircle, Mail, Loader2, Sparkles } from 'lucide-react';

interface MemberAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onRegisterMember: (newMember: Member) => Promise<void> | void;
  onLoginMember: (memberId: string) => void;
  churchName?: string;
  pastorName?: string;
}

export const MemberAuthModal: React.FC<MemberAuthModalProps> = ({
  isOpen,
  onClose,
  members,
  onRegisterMember,
  onLoginMember,
  churchName = 'Assembleia de Deus Nacional',
  pastorName = 'Pr. Juscelino'
}) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptionalEmail, setShowOptionalEmail] = useState(false);

  // Formulário Cadastro
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  // Formulário Login
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  if (!isOpen) return null;

  // Formatar Telefone automaticamente
  const handlePhoneChange = (val: string, setter: (v: string) => void) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    setter(formatted);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Por favor, digite seu Nome Completo.');
      return;
    }

    const rawDigits = phone.replace(/\D/g, '');
    if (rawDigits.length < 8) {
      setErrorMessage('Por favor, informe seu número de Celular / WhatsApp com DDD (ex: 98 99999-9999).');
      return;
    }

    if (!password || password.trim().length < 3) {
      setErrorMessage('Crie uma senha de pelo menos 3 dígitos para proteger sua conta.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verifica se já existe um membro com este telefone
    const existing = members.find(m => {
      if (!m) return false;
      const mDigits = m.phone ? m.phone.replace(/\D/g, '') : '';
      if (rawDigits && mDigits && (mDigits === rawDigits || mDigits.endsWith(rawDigits) || rawDigits.endsWith(mDigits))) return true;
      if (cleanEmail && m.email && m.email.trim().toLowerCase() === cleanEmail) return true;
      return false;
    });

    if (existing) {
      setErrorMessage('Já existe uma conta com este número de celular. Você pode entrar usando sua senha!');
      setLoginPhone(phone);
      setMode('login');
      return;
    }

    try {
      setIsSubmitting(true);
      const memberId = 'm_' + Date.now();
      const generatedEmail = cleanEmail || `${rawDigits}@membro.ad.org`;
      
      const newMember: Member = {
        id: memberId,
        name: name.trim(),
        phone: phone.trim(),
        email: generatedEmail,
        password: password.trim(),
        role: 'Membro',
        accessStatus: 'PENDENTE_LIBERACAO',
        isBlocked: false,
        createdAt: new Date().toISOString().split('T')[0]
      };

      await onRegisterMember(newMember);
      setSuccessMessage(`🎉 Conta criada com sucesso! Entrando no aplicativo...`);

      setTimeout(() => {
        setIsSubmitting(false);
        onLoginMember(newMember.id);
        onClose();
      }, 1000);

    } catch (err: any) {
      console.error("Erro ao registrar membro:", err);
      setErrorMessage("Ocorreu um erro ao salvar o cadastro. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const rawInput = loginPhone.trim();
    const rawDigits = rawInput.replace(/\D/g, '');
    const cleanEmail = rawInput.toLowerCase();

    if (!rawInput) {
      setErrorMessage('Digite o número do seu Celular / WhatsApp de cadastro.');
      return;
    }

    if (!loginPassword.trim()) {
      setErrorMessage('Digite sua senha de acesso.');
      return;
    }

    setIsSubmitting(true);

    // 1. Busca na lista local em memória
    let found = members.find(m => {
      if (!m) return false;
      const mDigits = m.phone ? m.phone.replace(/\D/g, '') : '';
      if (rawDigits.length >= 8 && mDigits && (mDigits === rawDigits || mDigits.endsWith(rawDigits) || rawDigits.endsWith(mDigits))) return true;
      if (m.email && m.email.trim().toLowerCase() === cleanEmail) return true;
      if (m.name && m.name.trim().toLowerCase() === rawInput.toLowerCase()) return true;
      return false;
    });

    // 2. Se não encontrou, busca no localStorage
    if (!found) {
      try {
        const saved = localStorage.getItem('ad_members');
        if (saved) {
          const list: Member[] = JSON.parse(saved);
          if (Array.isArray(list)) {
            found = list.find(m => {
              if (!m) return false;
              const mDigits = m.phone ? m.phone.replace(/\D/g, '') : '';
              if (rawDigits.length >= 8 && mDigits && (mDigits === rawDigits || mDigits.endsWith(rawDigits) || rawDigits.endsWith(mDigits))) return true;
              if (m.email && m.email.trim().toLowerCase() === cleanEmail) return true;
              if (m.name && m.name.trim().toLowerCase() === rawInput.toLowerCase()) return true;
              return false;
            });
          }
        }
      } catch (e) {}
    }

    // 3. Se ainda não encontrou, busca na API do servidor
    if (!found) {
      try {
        const res = await fetch('/api/members');
        if (res.ok) {
          const remoteList = await res.json();
          if (Array.isArray(remoteList)) {
            found = remoteList.find((m: any) => {
              if (!m) return false;
              const mDigits = m.phone ? String(m.phone).replace(/\D/g, '') : '';
              if (rawDigits.length >= 8 && mDigits && (mDigits === rawDigits || mDigits.endsWith(rawDigits) || rawDigits.endsWith(mDigits))) return true;
              if (m.email && String(m.email).trim().toLowerCase() === cleanEmail) return true;
              if (m.name && String(m.name).trim().toLowerCase() === rawInput.toLowerCase()) return true;
              return false;
            });
          }
        }
      } catch (e) {}
    }

    setIsSubmitting(false);

    if (!found) {
      setErrorMessage('Nenhum cadastro encontrado com este celular. Clique em "Criar Conta" para se cadastrar em segundos!');
      return;
    }

    // Validação de senha: se o membro tem senha cadastrada, compara
    if (found.password && found.password.trim() !== loginPassword.trim()) {
      setErrorMessage('Senha incorreta. Verifique sua senha e tente novamente.');
      return;
    }

    if (found.isBlocked || found.accessStatus === 'BLOQUEADO') {
      setErrorMessage('Sua conta foi bloqueada pelo setor administrativo. Em breve você receberá informações sobre o motivo pelo seu WhatsApp.');
      return;
    }

    setSuccessMessage(`Paz do Senhor, ${found.name}! Entrando...`);
    setTimeout(() => {
      onLoginMember(found.id);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 sm:p-7 space-y-5 shadow-2xl animate-slide-up border border-slate-100 relative max-h-[92vh] overflow-y-auto">
        
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-3xl flex items-center justify-center mx-auto border border-purple-200 shadow-md">
            <Church size={28} />
          </div>

          <div>
            <span className="px-3 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-full inline-block border border-amber-200">
              {churchName}
            </span>
            <h3 className="text-xl font-black uppercase text-slate-900 mt-1.5">
              {mode === 'register' ? 'Criar Conta de Membro' : 'Acessar Minha Conta'}
            </h3>
            <p className="text-xs font-bold text-slate-500">
              {mode === 'register' 
                ? 'Cadastre-se com seu celular e crie uma senha simples' 
                : 'Digite seu número de celular e sua senha para entrar'}
            </p>
          </div>
        </div>

        {/* Abas Alternadoras Criar Conta / Entrar */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus size={15} /> Criar Conta
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn size={15} /> Entrar
          </button>
        </div>

        {/* Alertas */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-slide-down">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-slide-down">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulário de Cadastro */}
        {mode === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* Campo Nome */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Nome Completo <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-3.5 text-slate-400" />
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Irmão Manoel Pereira"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Campo Celular / WhatsApp */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Número do Celular (WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-3.5 text-emerald-600" />
                <input 
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value, setPhone)}
                  placeholder="(98) 99999-9999"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Crie uma Senha Fácil <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-3.5 text-slate-400" />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ex: 1234 ou sua senha"
                  className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 p-0.5"
                  title={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Opção E-mail Expansível */}
            <div className="pt-1">
              {!showOptionalEmail ? (
                <button
                  type="button"
                  onClick={() => setShowOptionalEmail(true)}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 ml-1"
                >
                  <Mail size={13} /> + Adicionar E-mail (Opcional)
                </button>
              ) : (
                <div className="space-y-1 animate-fade-in">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      E-mail (Opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowOptionalEmail(false); setEmail(''); }}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-xs text-slate-800 outline-none focus:border-purple-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Envio Cadastro */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black p-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-3 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Salvando Cadastro...
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Criar Minha Conta Agora
                </>
              )}
            </button>
          </form>
        ) : (
          /* Formulário de Login com Celular e Senha */
          <form onSubmit={handleLogin} className="space-y-3.5">
            {/* Campo Celular / WhatsApp */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Seu Celular (WhatsApp)
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-3.5 text-emerald-600" />
                <input 
                  type="tel"
                  required
                  value={loginPhone}
                  onChange={(e) => handlePhoneChange(e.target.value, setLoginPhone)}
                  placeholder="(98) 99999-9999 ou digite seu número"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Sua Senha
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-3.5 text-slate-400" />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Digite sua senha cadastrada"
                  className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 p-0.5"
                  title={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black p-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-3 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verificando Dados...
                </>
              ) : (
                <>
                  <LogIn size={16} /> Entrar na Minha Conta
                </>
              )}
            </button>

            {/* Botão para quem não tem conta */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMessage(''); }}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 underline"
              >
                Ainda não tem conta? Clique aqui para criar agora!
              </button>
            </div>
          </form>
        )}

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            Fechar
          </button>
          <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Sparkles size={11} /> Igreja Conectada
          </span>
        </div>
      </div>
    </div>
  );
};


