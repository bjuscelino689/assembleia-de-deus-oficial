import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Copy, Check, Upload, Image as ImageIcon, Calendar, 
  CreditCard, Maximize2, Download, Send, ShieldCheck, 
  AlertCircle, Edit3, Trash2, X, RefreshCw, Smartphone, 
  ExternalLink, Clock, HelpCircle, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { UserProfile, ChurchInfo, PaymentAccessInfo, PRIMARY_ADMIN_EMAIL, isMasterAdminEmail } from '../types';

interface AccessPaymentCardProps {
  user?: UserProfile;
  churchInfo?: ChurchInfo;
  onOpenAuth?: () => void;
}

const DEFAULT_PAYMENT_INFO: PaymentAccessInfo = {
  dueDay: 28,
  title: 'Pagamento do meu acesso',
  qrCodeUrl: '',
  pixKey: '',
  recipientName: 'Assembleia de Deus Nacional - Ministério de Madureira',
  amount: '',
  description: 'Mantenha sua contribuição e acesso ao aplicativo em dia. O vencimento ocorre todo dia 28 de cada mês.',
  updatedAt: Date.now(),
  updatedBy: 'Pastor Presidente'
};

export const AccessPaymentCard: React.FC<AccessPaymentCardProps> = ({ user, churchInfo, onOpenAuth }) => {
  const [paymentInfo, setPaymentInfo] = useState<PaymentAccessInfo>(() => {
    try {
      const saved = localStorage.getItem('ad_payment_access_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_PAYMENT_INFO, ...parsed, dueDay: 28, title: 'Pagamento do meu acesso' };
      }
    } catch (e) {}
    return DEFAULT_PAYMENT_INFO;
  });

  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulário de edição
  const [editForm, setEditForm] = useState<{
    qrCodeUrl: string;
    pixKey: string;
    recipientName: string;
    amount: string;
    description: string;
  }>({
    qrCodeUrl: '',
    pixKey: '',
    recipientName: '',
    amount: '',
    description: ''
  });

  // Verificação rigorosa se o usuário atual é o Administrador / Pastor
  const canEdit = Boolean(
    user && (
      user.isAdmin ||
      isMasterAdminEmail(user.email) ||
      (user.email && user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) ||
      user.id === 'usr_admin_master' ||
      user.id === 'm_pastor_master' ||
      user.specialty === 'Pastor Presidente' ||
      (user as any).role === 'PASTOR' ||
      (user as any).role === 'ADMIN'
    )
  );

  // Carrega informações do servidor
  const fetchPaymentInfo = async () => {
    try {
      const res = await fetch('/api/payment-access');
      if (res.ok) {
        const data = await res.json();
        if (data && data.paymentInfo) {
          const updated = {
            ...DEFAULT_PAYMENT_INFO,
            ...data.paymentInfo,
            dueDay: 28,
            title: 'Pagamento do meu acesso'
          };
          setPaymentInfo(updated);
          localStorage.setItem('ad_payment_access_info', JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.warn('Usando informações locais de pagamento:', e);
    }
  };

  useEffect(() => {
    fetchPaymentInfo();
  }, []);

  // Cálculos de data de vencimento (Todo dia 28)
  const getDueStatus = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentYear = today.getFullYear();

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let targetMonth = currentMonth;
    let targetYear = currentYear;

    if (currentDay > 28) {
      // Já passou do dia 28 deste mês, o próximo é no mês seguinte
      targetMonth = (currentMonth + 1) % 12;
      if (targetMonth === 0) targetYear += 1;
    }

    const nextDueDate = new Date(targetYear, targetMonth, 28);
    const diffTime = nextDueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedTarget = `28 de ${monthNames[targetMonth]}`;

    if (currentDay === 28) {
      return {
        badge: 'Vence Hoje!',
        badgeClass: 'bg-amber-500 text-slate-950 font-black animate-pulse',
        desc: `Hoje é dia 28 de ${monthNames[currentMonth]} • Dia de renovação do acesso`
      };
    } else if (currentDay > 28) {
      return {
        badge: `Próximo: ${formattedTarget}`,
        badgeClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
        desc: `Vencimento todo dia 28 • Próximo vencimento em ${formattedTarget} (${diffDays} dias)`
      };
    } else {
      return {
        badge: `Vence dia ${formattedTarget}`,
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        desc: `Vencimento todo dia 28 • Faltam ${diffDays} dias para o vencimento (${formattedTarget})`
      };
    }
  };

  const dueStatus = getDueStatus();

  // Copiar chave Pix
  const handleCopyPix = () => {
    const textToCopy = paymentInfo.pixKey || paymentInfo.qrCodeUrl || '';
    if (!textToCopy) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  // Abrir WhatsApp para enviar comprovante
  const handleSendWhatsAppReceipt = () => {
    const churchPhone = churchInfo?.phone || '(11) 99876-5432';
    const cleanPhone = churchPhone.replace(/\D/g, '');
    const memberName = user?.name && user.name !== 'Visitante' ? user.name : 'Membro da Igreja';

    const text = `🙏 *Paz do Senhor, Pastor!*\n\nEstou enviando o meu comprovante de *Pagamento do meu acesso* ao aplicativo da Assembleia de Deus (Vencimento todo dia 28).\n\n👤 *Nome:* ${memberName}\n📅 *Referência:* Vencimento Dia 28\n\nQue Deus abençoe grandemente o ministério!`;
    
    const url = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Iniciar edição pelo pastor
  const handleStartEdit = () => {
    setEditForm({
      qrCodeUrl: paymentInfo.qrCodeUrl || '',
      pixKey: paymentInfo.pixKey || '',
      recipientName: paymentInfo.recipientName || 'Assembleia de Deus Nacional - Ministério de Madureira',
      amount: paymentInfo.amount || '',
      description: paymentInfo.description || 'Mantenha sua contribuição e acesso ao aplicativo em dia. O vencimento ocorre todo dia 28 de cada mês.'
    });
    setIsEditing(true);
  };

  // Processar upload de imagem do QR Code
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem (PNG, JPG ou JPEG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        // Redimensiona / comprime a imagem para garantir tamanho ideal
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.9);
            setEditForm(prev => ({ ...prev, qrCodeUrl: compressed }));
          }
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  // Salvar formulário
  const handleSavePaymentInfo = async () => {
    setIsSaving(true);
    const updated: PaymentAccessInfo = {
      ...paymentInfo,
      ...editForm,
      dueDay: 28,
      title: 'Pagamento do meu acesso',
      updatedAt: Date.now(),
      updatedBy: user?.name || 'Pastor Presidente'
    };

    try {
      setPaymentInfo(updated);
      localStorage.setItem('ad_payment_access_info', JSON.stringify(updated));

      const res = await fetch('/api/payment-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (res.ok) {
        setIsEditing(false);
      } else {
        setIsEditing(false);
      }
    } catch (e) {
      console.error('Erro ao salvar no servidor:', e);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-[2.2rem] shadow-xl border border-indigo-800/40 overflow-hidden transition-all">
      {/* CABEÇALHO DO BLOCO */}
      <div className="p-5 sm:p-6 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 rounded-2xl shadow-lg shadow-amber-500/20 shrink-0 font-black">
              <QrCode size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm">
                  Vencimento todo dia 28
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${dueStatus.badgeClass}`}>
                  {dueStatus.badge}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1 tracking-tight">
                Pagamento do Meu Acesso
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* BOTÃO EXCLUSIVO DO PASTOR / ADMIN */}
            {canEdit && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border border-amber-300/30 cursor-pointer active:scale-95 shrink-0"
                title="Configurar QR Code (Apenas Pastor/Admin)"
              >
                <Edit3 size={14} />
                <span className="hidden sm:inline">Gerenciar QR Code</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl transition-all cursor-pointer"
              title={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        <p className="text-xs text-indigo-200/90 font-medium mt-2 leading-relaxed">
          {paymentInfo.description || 'Mantenha sua contribuição e acesso ao aplicativo em dia. O vencimento ocorre todo dia 28 de cada mês.'}
        </p>
      </div>

      {/* CONTEÚDO EXPANSÍVEL */}
      {isExpanded && (
        <div className="p-5 sm:p-6 pt-2 space-y-5 animate-fadeIn">
          {/* QUADRO DO QR CODE */}
          <div className="bg-white/5 backdrop-blur-md p-4 sm:p-5 rounded-[1.8rem] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* QUADRO DE EXIBIÇÃO DA IMAGEM DO QR CODE */}
            <div className="flex flex-col items-center shrink-0 w-full sm:w-auto">
              <div className="relative group bg-white p-3 sm:p-4 rounded-2xl shadow-xl shadow-purple-950/50 border-4 border-amber-400/80 flex items-center justify-center min-w-[210px] min-h-[210px] max-w-[240px] max-h-[240px]">
                {paymentInfo.qrCodeUrl ? (
                  <>
                    <img 
                      src={paymentInfo.qrCodeUrl} 
                      alt="QR Code Pix - Pagamento do meu acesso" 
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg select-none cursor-pointer"
                      onClick={() => setIsZoomed(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setIsZoomed(true)}
                      className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all rounded-xl flex items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-xs cursor-pointer"
                    >
                      <Maximize2 size={20} className="text-amber-300" />
                      <span>Clique para Ampliar</span>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                    <QrCode size={48} className="text-slate-300 stroke-1" />
                    <p className="text-[11px] font-bold text-slate-600 leading-tight">
                      {canEdit 
                        ? 'Nenhum QR Code configurado. Clique em "Gerenciar" para adicionar.' 
                        : 'O Pastor adicionará o QR Code Pix em breve.'}
                    </p>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="mt-1 px-3 py-1.5 bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider"
                      >
                        Adicionar Foto
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* BOTÕES DE BAIXAR / AMPLIAR */}
              {paymentInfo.qrCodeUrl && (
                <div className="flex items-center gap-2 mt-3 w-full justify-center">
                  <button
                    type="button"
                    onClick={() => setIsZoomed(true)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Maximize2 size={13} className="text-amber-400" />
                    <span>Ampliar QR Code</span>
                  </button>
                  <a
                    href={paymentInfo.qrCodeUrl}
                    download="qrcode-pagamento-acesso-igreja.png"
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download size={13} className="text-amber-400" />
                    <span>Baixar</span>
                  </a>
                </div>
              )}
            </div>

            {/* DETALHES DE PAGAMENTO, CHAVE PIX E AÇÕES */}
            <div className="flex-1 w-full space-y-3.5 text-left">
              {/* FAVORECIDO & VALOR */}
              <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                  Dados do Favorecido
                </span>
                <p className="text-sm font-black text-white">
                  {paymentInfo.recipientName || 'Assembleia de Deus Nacional'}
                </p>
                <div className="flex items-center justify-between text-xs text-indigo-200 font-medium pt-0.5">
                  <span>Vencimento Mensal:</span>
                  <span className="font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-md border border-amber-300/30">
                    Todo dia 28
                  </span>
                </div>
                {paymentInfo.amount && (
                  <div className="flex items-center justify-between text-xs text-indigo-200 font-medium pt-0.5">
                    <span>Valor Sugerido / Mensalidade:</span>
                    <span className="font-black text-emerald-300 text-sm">
                      {paymentInfo.amount}
                    </span>
                  </div>
                )}
              </div>

              {/* CHAVE PIX COPIA E COLA */}
              {paymentInfo.pixKey && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 block">
                    Chave Pix / Código Copia e Cola:
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-black/40 border border-white/15 px-3 py-2 rounded-xl text-xs font-mono text-amber-200 truncate select-all">
                      {paymentInfo.pixKey}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                        isCopied
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950'
                      }`}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* BOTÕES DE COMPROVANTE & AÇÃO */}
              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleSendWhatsAppReceipt}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Send size={15} />
                  <span>Enviar Comprovante (WhatsApp)</span>
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="px-4 py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Edit3 size={15} />
                    <span>Trocar QR Code</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE ZOOM / TELA CHEIA DO QR CODE */}
      {isZoomed && paymentInfo.qrCodeUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 max-w-sm w-full p-6 rounded-[2.5rem] shadow-2xl text-center space-y-4 relative border border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 rounded-full cursor-pointer transition-all"
            >
              <X size={20} />
            </button>

            <div className="pt-2">
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider rounded-full border border-amber-300/40 inline-block">
                Vencimento todo dia 28
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                Escaneie o QR Code
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Abra o aplicativo do seu banco e aponte a câmera para efetuar o pagamento.
              </p>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-inner border-2 border-slate-200 inline-block mx-auto">
              <img 
                src={paymentInfo.qrCodeUrl} 
                alt="QR Code Pix" 
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain mx-auto"
              />
            </div>

            {paymentInfo.pixKey && (
              <button
                type="button"
                onClick={handleCopyPix}
                className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                <span>{isCopied ? 'Chave Pix Copiada!' : 'Copiar Chave Pix'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="w-full py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-2xl"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO / UPLOAD EXCLUSIVO DO PASTOR */}
      {isEditing && canEdit && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 max-w-lg w-full p-6 rounded-[2.5rem] shadow-2xl space-y-5 my-8 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base">Gerenciar QR Code de Pagamento</h3>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    Área Exclusiva do Pastor • Vencimento Dia 28
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-500 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              {/* UPLOAD DA IMAGEM DO QR CODE */}
              <div>
                <label className="block text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider text-[11px]">
                  1. Imagem do QR Code Pix (Foto / Print)
                </label>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />

                {editForm.qrCodeUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-700">
                    <img 
                      src={editForm.qrCodeUrl} 
                      alt="Prévia QR Code" 
                      className="w-20 h-20 object-contain bg-white p-1 rounded-xl border"
                    />
                    <div className="flex-1 space-y-1.5">
                      <p className="text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center gap-1">
                        <CheckCircle2 size={14} /> Imagem Carregada com Sucesso
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 text-slate-800 dark:text-zinc-200 rounded-xl text-[11px] font-bold"
                        >
                          Trocar Foto
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, qrCodeUrl: '' }))}
                          className="px-3 py-1.5 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-[11px] font-bold flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-purple-500 rounded-2xl text-center cursor-pointer bg-slate-50/50 dark:bg-zinc-800/30 transition-all space-y-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto">
                      <Upload size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-zinc-200">
                        Clique para escolher a imagem do QR Code Pix
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Selecione o print ou arquivo da imagem gerada no seu banco (PNG ou JPG)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* CHAVE PIX OU COPIA E COLA */}
              <div>
                <label className="block text-slate-700 dark:text-zinc-300 mb-1 uppercase tracking-wider text-[11px]">
                  2. Chave Pix ou Código Copia e Cola (Opcional)
                </label>
                <input 
                  type="text"
                  value={editForm.pixKey}
                  onChange={(e) => setEditForm(prev => ({ ...prev, pixKey: e.target.value }))}
                  placeholder="Ex: 11998765432 ou chave aleatória ou código Pix copia e cola"
                  className="w-full p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-normal focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* NOME DO FAVORECIDO */}
              <div>
                <label className="block text-slate-700 dark:text-zinc-300 mb-1 uppercase tracking-wider text-[11px]">
                  3. Nome do Favorecido / Igreja
                </label>
                <input 
                  type="text"
                  value={editForm.recipientName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, recipientName: e.target.value }))}
                  placeholder="Ex: Assembleia de Deus Nacional - Pr. Juscelino"
                  className="w-full p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-normal focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* VALOR SUGERIDO / MENSALIDADE */}
              <div>
                <label className="block text-slate-700 dark:text-zinc-300 mb-1 uppercase tracking-wider text-[11px]">
                  4. Valor da Contribuição / Acesso (Opcional)
                </label>
                <input 
                  type="text"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Ex: R$ 20,00 (ou deixe em branco)"
                  className="w-full p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-normal focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* DESCRIÇÃO / INSTRUÇÕES */}
              <div>
                <label className="block text-slate-700 dark:text-zinc-300 mb-1 uppercase tracking-wider text-[11px]">
                  5. Mensagem de Orientação aos Membros
                </label>
                <textarea 
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Instruções para os membros..."
                  className="w-full p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-normal focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* BOTÕES DE SALVAR / CANCELAR */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSavePaymentInfo}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};
