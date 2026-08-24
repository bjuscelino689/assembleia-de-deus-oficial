
import React, { useState, useRef, useEffect } from 'react';
import { ChurchInfo, Member, PastoralVisit, Cult, Meeting, Festival, PrayerCampaign, UserProfile, PRIMARY_ADMIN_EMAIL, isMasterAdminEmail } from '../types';
import { 
  Lock, Save, User, ChevronLeft, Eye, EyeOff, ShieldCheck, KeyRound, 
  Users, UserCheck, UserX, Plus, Search, Trash2, Calendar, Clock, 
  MapPin, Heart, Sparkles, CheckCircle2, AlertCircle, X, Laptop, 
  UserPlus, Check, Star, ShieldAlert, FileText, ArrowRight,
  Camera, Upload, Image as ImageIcon, Building2, RefreshCw, MessageCircle
} from 'lucide-react';
import { syncDocToFirestore, deleteDocFromFirestore, fetchCollectionFromFirestore, subscribeToCollection } from '../utils/clientFirebase';
import { 
  isUserOrMemberDeleted, 
  markMemberOrUserDeleted, 
  filterActiveMembers,
  deduplicateMembersList 
} from '../utils/deletedSync';

interface PastorAreaProps {
  isAuthenticated: boolean;
  onLogin: (pass: string) => boolean;
  churchInfo?: ChurchInfo;
  setChurchInfo?: (info: ChurchInfo) => void;
  currentPassword?: string;
  setPastorPassword?: (pass: string) => void;
  onNavigate?: (view: string) => void;
  user?: UserProfile;
  
  // Membros
  members?: Member[];
  setMembers?: React.Dispatch<React.SetStateAction<Member[]>>;
  
  // Visitas Pastorais
  pastoralVisits?: PastoralVisit[];
  setPastoralVisits?: React.Dispatch<React.SetStateAction<PastoralVisit[]>>;
  
  // Cultos, Reuniões, Eventos, Campanhas
  cults?: Cult[];
  setCults?: React.Dispatch<React.SetStateAction<Cult[]>>;
  meetings?: Meeting[];
  setMeetings?: React.Dispatch<React.SetStateAction<Meeting[]>>;
  festivals?: Festival[];
  setFestivals?: React.Dispatch<React.SetStateAction<Festival[]>>;
  campaigns?: PrayerCampaign[];
  setCampaigns?: React.Dispatch<React.SetStateAction<PrayerCampaign[]>>;

  onRegisterMember?: (m: Partial<Member>) => void;
  onEditMember?: (id: string, updated: Partial<Member>) => void;
  onDeleteMember?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onBack?: () => void;
  
  // Simulação de membro atual
  currentMemberId?: string | null;
  setCurrentMemberId?: (id: string | null) => void;
}

const PastorArea: React.FC<PastorAreaProps> = ({ 
  isAuthenticated = false, 
  onLogin = () => false, 
  churchInfo = { name: "Assembleia de Deus Nacional", pastorName: "Pr. Juscelino", address: "Templo Sede", phone: "(11) 99876-5432" }, 
  setChurchInfo = () => {}, 
  currentPassword = '1234',
  setPastorPassword = () => {},
  onNavigate = () => {},
  user,
  members = [],
  setMembers = () => {},
  pastoralVisits = [],
  setPastoralVisits = () => {},
  cults = [],
  setCults = () => {},
  meetings = [],
  setMeetings = () => {},
  festivals = [],
  setFestivals = () => {},
  campaigns = [],
  setCampaigns = () => {},
  currentMemberId = null,
  setCurrentMemberId = () => {},
  onBack
}) => {
  const isMasterAdmin = Boolean(
    (user && isMasterAdminEmail(user.email)) || 
    (() => {
      try {
        if (typeof window === 'undefined') return false;
        const e1 = (localStorage.getItem('nursecare_logged_user_email') || '').toLowerCase();
        const e2 = (localStorage.getItem('nursecare_user_session_email') || '').toLowerCase();
        const e3 = (localStorage.getItem('ad_user_email') || '').toLowerCase();
        return e1 === PRIMARY_ADMIN_EMAIL.toLowerCase() || e2 === PRIMARY_ADMIN_EMAIL.toLowerCase() || e3 === PRIMARY_ADMIN_EMAIL.toLowerCase();
      } catch (e) {
        return false;
      }
    })()
  );
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [activeTab, setActiveTab] = useState<'membros' | 'agendamentos' | 'config'>('membros');
  
  // Estado para Membros
  const [memberSearch, setMemberSearch] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Membro');
  const [blockingMember, setBlockingMember] = useState<Member | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Modal de Exclusão Sem `window.confirm` para Funcionamento em iFrames
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'member' | 'visit' | 'cult' | 'meeting' | 'campaign' | 'festival' | 'clear_all_schedules' | 'clear_category';
    id: string;
    title: string;
    categoryKey?: 'cultos' | 'meetings' | 'visits' | 'campaigns' | 'festivals';
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncingMembers, setIsSyncingMembers] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Atualiza timestamp corrente a cada 4 segundos para manter o status online dinâmico
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sincronização periódica com o servidor e Firestore para que novas contas apareçam em tempo real
  const syncMembersFromServer = async () => {
    try {
      setIsSyncingMembers(true);
      // 1. Busca da Nuvem Firestore
      let firestoreMembers: Member[] = [];
      try {
        firestoreMembers = await fetchCollectionFromFirestore<Member>('members');
      } catch (e) {}
      
      // 2. Busca do Servidor de Membros
      let serverList: Member[] = [];
      try {
        const res = await fetch('/api/members');
        if (res.ok) serverList = await res.json();
      } catch (e) {}

      // 3. Busca de Usuários Cadastrados no Servidor para Merge Cruzado
      let userList: any[] = [];
      try {
        const resUsers = await fetch('/api/users');
        if (resUsers.ok) userList = await resUsers.json();
      } catch (e) {}

      setMembers(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const map = new Map<string, Member>();
        
        // Membros do Firestore (ignora deletados)
        if (Array.isArray(firestoreMembers)) {
          firestoreMembers.forEach(m => { 
            if (m && m.id && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) {
              map.set(m.id, m); 
            }
          });
        }
        
        // Membros do Servidor (ignora deletados)
        if (Array.isArray(serverList)) {
          serverList.forEach(m => {
            if (m && m.id && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) {
              const existing = map.get(m.id);
              map.set(m.id, existing ? { ...existing, ...m } : m);
            }
          });
        }

        // Merge de Usuários Cadastrados (ignora deletados e ignora contas de admin master duplicadas)
        if (Array.isArray(userList)) {
          userList.forEach(u => {
            if (!u || !u.id || !u.name) return;
            const uId = String(u.id).toLowerCase().trim();
            const uEmail = (u.email || '').toLowerCase().trim();
            const uName = (u.name || '').toLowerCase().trim();
            
            // Nunca duplica a conta do Pastor / Admin Master
            if (
              uId === 'usr_admin_master' || 
              uId === 'm_pastor_master' || 
              uId === 'usr_pastor_master' || 
              uId === 'pastor_master_1' ||
              uId.includes('pastor_master') ||
              uId.includes('admin_master') ||
              uEmail.includes('bjuscelino33') ||
              uEmail === 'meuplantaopro@gmail.com' ||
              uName.includes('juscelino')
            ) {
              return;
            }

            if (!isUserOrMemberDeleted(u.id, u.email, u.phone, u.name)) {
              if (!map.has(u.id)) {
                map.set(u.id, {
                  id: u.id,
                  name: u.name,
                  phone: u.phone || '',
                  email: u.email || '',
                  role: u.specialty || (u.isAdmin ? 'PASTOR' : 'Membro'),
                  isBlocked: Boolean(u.isBlocked || u.accessStatus === 'BLOQUEADO'),
                  accessStatus: u.accessStatus || (u.isBlocked ? 'BLOQUEADO' : 'LIBERADO'),
                  createdAt: u.createdAt || new Date().toISOString().split('T')[0],
                  lastActiveAt: u.lastActiveAt ? Number(u.lastActiveAt) : undefined,
                  isOnline: Boolean(u.isOnline)
                });
              } else {
                const existing = map.get(u.id)!;
                map.set(u.id, {
                  ...existing,
                  lastActiveAt: u.lastActiveAt ? Number(u.lastActiveAt) : existing.lastActiveAt,
                  isOnline: Boolean(u.isOnline ?? existing.isOnline)
                });
              }
            }
          });
        }

        // Mantém os que foram criados localmente (e não foram deletados)
        safePrev.forEach(m => { 
          if (m && m.id && !map.has(m.id) && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) {
            map.set(m.id, m); 
          }
        });
        
        const merged = deduplicateMembersList(Array.from(map.values()));
        try {
          localStorage.setItem('ad_members', JSON.stringify(merged));
        } catch (e) {}
        return merged;
      });
    } catch (err) {
      console.error("Erro ao sincronizar membros com o servidor:", err);
    } finally {
      setIsSyncingMembers(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      syncMembersFromServer();
      
      // Assinatura em tempo real no Firestore
      let unsubscribe = () => {};
      try {
        unsubscribe = subscribeToCollection<Member>('members', (remoteList) => {
          if (Array.isArray(remoteList) && remoteList.length > 0) {
            setMembers(prev => {
              const safePrev = Array.isArray(prev) ? prev : [];
              const map = new Map<string, Member>();
              remoteList.forEach(m => { 
                if (m && m.id && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) {
                  map.set(m.id, m); 
                }
              });
              safePrev.forEach(m => { 
                if (m && m.id && !map.has(m.id) && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) {
                  map.set(m.id, m); 
                }
              });
              const merged = deduplicateMembersList(Array.from(map.values()));
              try {
                localStorage.setItem('ad_members', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
        });
      } catch (e) {}

      const interval = setInterval(syncMembersFromServer, 3000);
      return () => {
        clearInterval(interval);
        try { unsubscribe(); } catch (e) {}
      };
    }
  }, [isAuthenticated]);

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const { type, id, title, categoryKey } = itemToDelete;
    // Fecha o modal imediatamente para resposta instantânea na UI
    setItemToDelete(null);

    if (type === 'member') {
      const targetMember = members.find(m => String(m.id) === String(id) || (m.email && m.email === id) || (m.phone && m.phone === id));
      const targetEmail = (targetMember?.email || '').trim().toLowerCase();
      const targetPhone = (targetMember?.phone || '').trim();
      const targetName = (targetMember?.name || title || '').trim();

      // 1. Marca imediatamente em memória e localmente como excluído
      await markMemberOrUserDeleted(id, targetEmail, targetPhone, targetName);

      // 2. Atualiza estado da lista de membros local
      setMembers(prev => prev.filter(m => {
        if (!m) return false;
        if (String(m.id) === String(id)) return false;
        if (targetEmail && m.email && m.email.trim().toLowerCase() === targetEmail) return false;
        if (targetPhone && m.phone && m.phone.replace(/\D/g, '') === targetPhone.replace(/\D/g, '')) return false;
        if (targetName && m.name && m.name.trim().toLowerCase() === targetName.toLowerCase()) return false;
        return true;
      }));
      if (currentMemberId === id) setCurrentMemberId(null);

      // 3. Limpa storage local
      try {
        const saved = localStorage.getItem('ad_members');
        if (saved) {
          const arr = JSON.parse(saved);
          if (Array.isArray(arr)) {
            const filtered = arr.filter((m: any) => 
              String(m?.id) !== String(id) && 
              (!targetEmail || (m?.email && m.email.trim().toLowerCase() !== targetEmail)) &&
              (!targetPhone || (m?.phone && m.phone.replace(/\D/g, '') !== targetPhone.replace(/\D/g, '')))
            );
            localStorage.setItem('ad_members', JSON.stringify(filtered));
          }
        }
      } catch (e) {}

      // 4. Notifica App.tsx
      if (onDeleteMember) {
        try {
          onDeleteMember(id);
        } catch (e) {}
      }
      
      // 5. Remove do Firestore de ambas as coleções
      deleteDocFromFirestore('members', id).catch(() => {});
      deleteDocFromFirestore('users', id).catch(() => {});
      if (targetEmail) {
        deleteDocFromFirestore('members', targetEmail).catch(() => {});
        deleteDocFromFirestore('users', targetEmail).catch(() => {});
      }
      if (targetPhone) {
        const phoneDigits = targetPhone.replace(/\D/g, '');
        if (phoneDigits) {
          deleteDocFromFirestore('members', phoneDigits).catch(() => {});
          deleteDocFromFirestore('users', phoneDigits).catch(() => {});
        }
      }

      // 6. Remove do Servidor Node.js com parâmetros na query e no body
      try {
        const qParams = new URLSearchParams();
        if (targetEmail) qParams.set('email', targetEmail);
        if (targetPhone) qParams.set('phone', targetPhone);
        if (targetName) qParams.set('name', targetName);
        const qs = qParams.toString() ? `?${qParams.toString()}` : '';

        await Promise.allSettled([
          fetch(`/api/members/${encodeURIComponent(id)}${qs}`, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, memberId: id, email: targetEmail, phone: targetPhone, name: targetName })
          }),
          fetch(`/api/users/${encodeURIComponent(id)}${qs}`, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, userId: id, email: targetEmail, phone: targetPhone, name: targetName })
          }),
          fetch('/api/admin/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              id, 
              memberId: id, 
              userId: id, 
              email: targetEmail, 
              phone: targetPhone, 
              name: targetName 
            })
          }),
          fetch('/api/deleted-ids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              type: 'users', 
              id, 
              email: targetEmail, 
              phone: targetPhone, 
              name: targetName 
            })
          })
        ]);
      } catch (e) {
        console.error("Erro ao deletar membro no servidor:", e);
      }
      showToast(`Conta de "${title}" excluída definitivamente do sistema.`);
    } else if (type === 'visit') {
      setPastoralVisits(prev => {
        const next = prev.filter(v => v.id !== id);
        try { localStorage.setItem('ad_pastoral_visits', JSON.stringify(next)); } catch (e) {}
        return next;
      });
      deleteDocFromFirestore('pastoral_visits', id).catch(() => {});
      showToast(`Visita "${title}" foi apagada da agenda.`);
    } else if (type === 'cult') {
      setCults(prev => {
        const next = prev.filter(c => c.id !== id);
        try { localStorage.setItem('ad_cults', JSON.stringify(next)); } catch (e) {}
        return next;
      });
      deleteDocFromFirestore('cults', id).catch(() => {});
      showToast(`Culto "${title}" foi apagado da agenda.`);
    } else if (type === 'meeting') {
      setMeetings(prev => {
        const next = prev.filter(m => m.id !== id);
        try { localStorage.setItem('ad_meetings', JSON.stringify(next)); } catch (e) {}
        return next;
      });
      deleteDocFromFirestore('meetings', id).catch(() => {});
      showToast(`Reunião "${title}" foi apagada da agenda.`);
    } else if (type === 'campaign') {
      setCampaigns(prev => {
        const next = prev.filter(cp => cp.id !== id);
        try { localStorage.setItem('ad_campaigns', JSON.stringify(next)); } catch (e) {}
        return next;
      });
      deleteDocFromFirestore('campaigns', id).catch(() => {});
      showToast(`Campanha "${title}" foi apagada da agenda.`);
    } else if (type === 'festival') {
      setFestivals(prev => {
        const next = prev.filter(f => f.id !== id);
        try { localStorage.setItem('ad_festivals', JSON.stringify(next)); } catch (e) {}
        return next;
      });
      deleteDocFromFirestore('festivals', id).catch(() => {});
      showToast(`Evento "${title}" foi apagado da agenda.`);
    } else if (type === 'clear_all_schedules') {
      setCults([]);
      setMeetings([]);
      setPastoralVisits([]);
      setCampaigns([]);
      setFestivals([]);
      try {
        localStorage.setItem('ad_cults', JSON.stringify([]));
        localStorage.setItem('ad_meetings', JSON.stringify([]));
        localStorage.setItem('ad_pastoral_visits', JSON.stringify([]));
        localStorage.setItem('ad_campaigns', JSON.stringify([]));
        localStorage.setItem('ad_festivals', JSON.stringify([]));
      } catch (e) {}
      showToast("Todos os agendamentos da igreja foram apagados.");
    } else if (type === 'clear_category') {
      const cat = categoryKey;
      if (cat === 'cultos') {
        setCults([]);
        try { localStorage.setItem('ad_cults', JSON.stringify([])); } catch (e) {}
      } else if (cat === 'meetings') {
        setMeetings([]);
        try { localStorage.setItem('ad_meetings', JSON.stringify([])); } catch (e) {}
      } else if (cat === 'visits') {
        setPastoralVisits([]);
        try { localStorage.setItem('ad_pastoral_visits', JSON.stringify([])); } catch (e) {}
      } else if (cat === 'campaigns') {
        setCampaigns([]);
        try { localStorage.setItem('ad_campaigns', JSON.stringify([])); } catch (e) {}
      } else if (cat === 'festivals') {
        setFestivals([]);
        try { localStorage.setItem('ad_festivals', JSON.stringify([])); } catch (e) {}
      }
      showToast(`Todos os agendamentos de "${title}" foram apagados.`);
    }
  };

  // Estado para Agendamentos Exclusivos
  const [scheduleCategory, setScheduleCategory] = useState<'todos' | 'cultos' | 'meetings' | 'visits' | 'campaigns' | 'festivals'>('todos');
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [schedTitle, setSchedTitle] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedEndDate, setSchedEndDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedAddress, setSchedAddress] = useState('');
  const [schedMemberName, setSchedMemberName] = useState('');
  const [schedDesc, setSchedDesc] = useState('');

  // Estado para Configurações
  const [editName, setEditName] = useState(churchInfo?.pastorName || 'Pr. Juscelino');
  const [editPhotoUrl, setEditPhotoUrl] = useState(churchInfo?.photoUrl || '');
  const [newPass, setNewPass] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const churchFileInputRef = useRef<HTMLInputElement>(null);

  const handleLoginClick = () => {
    const entered = pass.trim();
    if (!entered) {
      alert('Por favor, digite a senha de acesso.');
      return;
    }
    const success = onLogin(entered);
    if (!success) {
      alert('Senha incorreta! A senha padrão é 123 ou 1234.');
      setPass('');
    }
  };

  // --- MÉTODOS DE MEMBROS ---
  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      alert("Informe o nome do membro.");
      return;
    }
    const newMember: Member = {
      id: 'm_' + Date.now(),
      name: newMemberName.trim(),
      phone: newMemberPhone.trim() || undefined,
      role: newMemberRole,
      isBlocked: false,
      accessStatus: 'LIBERADO',
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setMembers(prev => {
      const updated = [newMember, ...prev.filter(m => m.id !== newMember.id)];
      localStorage.setItem('ad_members', JSON.stringify(updated));
      return updated;
    });
    setNewMemberName('');
    setNewMemberPhone('');
    setNewMemberRole('Membro');
    setShowAddMember(false);

    // Salva no Firestore direto
    syncDocToFirestore('members', newMember.id, newMember).catch(() => {});

    try {
      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      showToast(`Membro "${newMember.name}" cadastrado e sincronizado com sucesso!`);
    } catch (e) {
      console.error("Erro ao salvar membro no servidor:", e);
    }
  };

  const handleToggleBlock = async (member: Member) => {
    if (!isMasterAdmin) {
      alert('Acesso Restrito: Apenas o Administrador Geral (bjuscelino33@gmail.com) tem permissão para bloquear ou desbloquear membros.');
      return;
    }
    if (member.isBlocked) {
      // Desbloquear
      const updatedMember: Member = { 
        ...member, 
        isBlocked: false, 
        blockedReason: undefined, 
        accessStatus: 'LIBERADO' 
      };
      setMembers(prev => {
        const list = prev.map(m => m.id === member.id ? updatedMember : m);
        localStorage.setItem('ad_members', JSON.stringify(list));
        return list;
      });

      // Salva no Firestore
      syncDocToFirestore('members', member.id, updatedMember).catch(() => {});

      try {
        await fetch(`/api/members/${member.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isBlocked: false, accessStatus: 'LIBERADO', blockedReason: '' })
        });
      } catch (e) {
        console.error("Erro ao atualizar status do membro:", e);
      }
      showToast(`O acesso de ${member.name} foi DESBLOQUEADO com sucesso.`);
    } else {
      // Abrir modal de motivo para bloquear
      setBlockingMember(member);
      setBlockReason('Acesso suspenso pelo sistema administrativo');
    }
  };

  const confirmBlock = async () => {
    if (!isMasterAdmin) {
      alert('Acesso Restrito: Apenas o Administrador Geral (bjuscelino33@gmail.com) tem permissão para bloquear membros.');
      return;
    }
    if (!blockingMember) return;
    const reason = blockReason.trim() || 'Acesso suspenso pelo sistema administrativo';
    const updatedMember: Member = { 
      ...blockingMember, 
      isBlocked: true, 
      blockedReason: reason,
      accessStatus: 'BLOQUEADO' 
    };

    setMembers(prev => {
      const list = prev.map(m => m.id === blockingMember.id ? updatedMember : m);
      localStorage.setItem('ad_members', JSON.stringify(list));
      return list;
    });

    // Salva no Firestore
    syncDocToFirestore('members', blockingMember.id, updatedMember).catch(() => {});

    try {
      await fetch(`/api/members/${blockingMember.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: true, accessStatus: 'BLOQUEADO', blockedReason: reason })
      });
    } catch (e) {
      console.error("Erro ao bloquear membro no servidor:", e);
    }

    showToast(`O acesso de ${blockingMember.name} foi BLOQUEADO.`);
    setBlockingMember(null);
    setBlockReason('');
  };

  const handleApproveMember = async (member: Member) => {
    if (!isMasterAdmin) {
      alert('Acesso Restrito: Apenas o Administrador Geral (bjuscelino33@gmail.com) tem permissão para liberar ou desbloquear membros.');
      return;
    }
    const updatedMember: Member = { 
      ...member, 
      isBlocked: false, 
      accessStatus: 'LIBERADO',
      blockedReason: ''
    };

    setMembers(prev => {
      const list = prev.map(m => m.id === member.id ? updatedMember : m);
      localStorage.setItem('ad_members', JSON.stringify(list));
      return list;
    });

    syncDocToFirestore('members', member.id, updatedMember).catch(() => {});

    try {
      await fetch(`/api/members/${member.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: false, accessStatus: 'LIBERADO', blockedReason: '' })
      });
    } catch (e) {
      console.error("Erro ao aprovar membro no servidor:", e);
    }
    showToast(`O acesso de "${member.name}" foi LIBERADO com sucesso!`);
  };

  const handleDeleteMember = async (id: string, name: string) => {
    setItemToDelete({ type: 'member', id, title: name });
  };

  // --- MÉTODOS DE AGENDAMENTO ---
  const handleCreateSchedule = () => {
    const id = Date.now().toString();

    if (scheduleCategory === 'visits') {
      if (!schedMemberName.trim() || !schedDate) {
        alert("Informe o nome do membro/família e a data da visita.");
        return;
      }
      const newVisit: PastoralVisit = {
        id,
        memberName: schedMemberName.trim(),
        date: schedDate,
        time: schedTime || '19:00',
        address: schedAddress.trim() || undefined,
        purpose: schedDesc.trim() || 'Visita e Oração Pastoral em Família',
        status: 'AGENDADA'
      };
      setPastoralVisits(prev => [newVisit, ...prev]);
      alert("Visita Pastoral agendada e publicada na agenda dos membros!");
    } else if (scheduleCategory === 'campaigns') {
      if (!schedTitle.trim() || !schedDate || !schedEndDate) {
        alert("Informe o título e as datas de início e término da campanha.");
        return;
      }
      const newCampaign: PrayerCampaign = {
        id,
        title: schedTitle.trim(),
        startDate: schedDate,
        endDate: schedEndDate,
        reason: schedDesc.trim() || 'Propósito Geral de Clamor e Intercessão'
      };
      setCampaigns(prev => [newCampaign, ...prev]);
      alert("Campanha de Oração agendada e publicada para toda a igreja!");
    } else {
      if (!schedTitle.trim() || !schedDate) {
        alert("Informe o título e a data.");
        return;
      }
      const newItem = {
        id,
        title: schedTitle.trim(),
        date: schedDate,
        time: schedTime || '19:30',
        description: schedDesc.trim()
      };
      if (scheduleCategory === 'cults') setCults(prev => [newItem as Cult, ...prev]);
      else if (scheduleCategory === 'meetings') setMeetings(prev => [newItem as Meeting, ...prev]);
      else if (scheduleCategory === 'festivals') setFestivals(prev => [newItem as Festival, ...prev]);
      alert("Agendamento criado e publicado para todos os membros!");
    }

    // Reset formulário
    setSchedTitle('');
    setSchedDate('');
    setSchedEndDate('');
    setSchedTime('');
    setSchedAddress('');
    setSchedMemberName('');
    setSchedDesc('');
    setShowAddSchedule(false);
  };

  // --- CONFIGURAÇÕES ---
  const handleChurchPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert("A imagem é muito grande! Escolha um arquivo menor que 15MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setEditPhotoUrl(result);
        setChurchInfo({ ...churchInfo, pastorName: editName.trim(), photoUrl: result });
        showToast("Foto da igreja atualizada no perfil!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveInfo = () => {
    if (!editName.trim()) return alert("O nome do pastor não pode estar vazio.");
    setChurchInfo({ 
      ...churchInfo, 
      pastorName: editName.trim(),
      photoUrl: editPhotoUrl.trim() || undefined
    });
    showToast('Informações e foto da igreja salvas com sucesso!');
  };

  const handleRemoveChurchPhoto = () => {
    setEditPhotoUrl('');
    setChurchInfo({ ...churchInfo, pastorName: editName.trim(), photoUrl: undefined });
    showToast('Foto da igreja removida.');
  };

  const handleChangePassword = () => {
    if (newPass.length < 3) return alert("A senha deve ter pelo menos 3 caracteres.");
    setPastorPassword(newPass);
    setNewPass('');
    setIsChangingPass(false);
    alert('Senha de acesso alterada com sucesso!');
  };

  // Calcula se o membro está online no aplicativo em tempo real
  const isMemberOnline = (m: Member | null | undefined): boolean => {
    if (!m) return false;
    if (m.isOnline) {
      if (m.lastActiveAt) {
        return (currentTime - Number(m.lastActiveAt)) < 45000;
      }
      return true;
    }
    if (m.lastActiveAt) {
      return (currentTime - Number(m.lastActiveAt)) < 30000;
    }
    return false;
  };

  const activeList = deduplicateMembersList(members);

  const filteredMembers = activeList.filter(m => {
    if (!m || !m.name) return false;
    const q = (memberSearch || '').toLowerCase().trim();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) || 
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.phone && m.phone.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  const pendingMembers = activeList.filter(m => m && m.accessStatus === 'PENDENTE_LIBERACAO' && !m.isBlocked);
  const totalPending = pendingMembers.length;
  const totalBlocked = activeList.filter(m => m && (m.isBlocked || m.accessStatus === 'BLOQUEADO')).length;
  const totalActive = activeList.filter(m => m && m.accessStatus === 'LIBERADO' && !m.isBlocked).length;
  const totalOnline = activeList.filter(m => isMemberOnline(m)).length;

  if (!isAuthenticated) {
    return (
      <div className="p-6 space-y-8 animate-slide-up max-w-md mx-auto text-center min-h-[75vh] flex flex-col justify-center">
        <div className="w-20 h-20 bg-app-purple rounded-[2.5rem] text-white flex items-center justify-center mx-auto shadow-2xl shadow-app-purple/30 mb-2">
          <Laptop size={40} />
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-title font-black text-slate-900 uppercase tracking-tight">Painel do Pastor</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Controle do Notebook & Gestão da Igreja</p>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-6 flex items-center text-slate-300 group-focus-within:text-app-purple transition-colors">
              <KeyRound size={20} />
            </div>
            <input 
              type={showPass ? "text" : "password"} 
              value={pass} 
              onChange={(e) => setPass(e.target.value)}
              placeholder="Digite a Senha do Pastor"
              className="w-full pl-14 pr-14 p-5 bg-white border-2 border-slate-100 rounded-[2rem] font-black text-lg outline-none focus:border-app-purple focus:ring-4 ring-app-purple/5 transition-all text-slate-800"
              onKeyDown={(e) => e.key === 'Enter' && handleLoginClick()}
            />
            <button 
              onClick={() => setShowPass(!showPass)}
              className="absolute inset-y-0 right-6 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
            >
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button 
            onClick={handleLoginClick} 
            className="w-full bg-app-purple text-white font-black p-5 rounded-[2rem] shadow-xl shadow-app-purple/20 uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 text-sm hover:bg-purple-700"
          >
            <ShieldCheck size={20} />
            Acessar Painel Exclusivo
          </button>

          {isMasterAdmin && (
            <button 
              type="button"
              onClick={() => onLogin('1234')} 
              className="w-full bg-gradient-to-r from-amber-500 to-purple-600 text-white font-black p-3.5 rounded-2xl shadow-md uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
            >
              <ShieldCheck size={16} className="text-amber-200" />
              Entrar como Administrador Master (Direto)
            </button>
          )}

          <div className="flex flex-col gap-2">
            <div className="p-3.5 bg-slate-100/90 rounded-2xl border border-slate-200 text-[11px] font-bold text-slate-600 leading-relaxed flex items-center justify-between gap-2">
              <span>🔑 Senha padrão: <strong className="text-purple-700 font-black">123</strong> ou <strong className="text-purple-700 font-black">1234</strong></span>
              <button 
                type="button" 
                onClick={() => { setPass('123'); onLogin('123'); }}
                className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0"
              >
                Preencher 123
              </button>
            </div>

            <button 
              type="button"
              onClick={() => {
                if (onBack) onBack();
                else onNavigate('home');
              }}
              className="w-full py-3 text-slate-500 hover:text-slate-800 font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <ChevronLeft size={16} />
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 px-2 sm:px-4 bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E1B4B] rounded-[2.75rem] shadow-2xl border border-indigo-500/20 relative overflow-hidden text-slate-100 animate-slide-up max-w-5xl mx-auto">
      {/* Luzes decorativas ambientais de fundo */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="space-y-6 relative z-10 p-2 sm:p-4">
        {/* Cabeçalho do Painel Pastoral */}
        <header className="bg-slate-900/90 backdrop-blur-md text-white p-6 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('home')} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl active:scale-90 transition-all text-white border border-white/10">
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-app-purple text-[9px] font-black uppercase tracking-widest rounded-md text-white shadow-sm">Painel ADM</span>
                <span className="text-xs font-bold text-slate-300">Notebook / Celular</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white mt-1">Pastor {churchInfo.pastorName}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center justify-end gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Acesso Autorizado</span>
              </p>
              <p className="text-xs text-slate-300 font-bold">{members.length} Membros Cadastrados</p>
            </div>
            <button 
              onClick={() => onNavigate('home')} 
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 active:scale-95 transition-all border border-white/10"
            >
              Sair do Painel
            </button>
          </div>
        </header>

        {/* Navegação por Abas do Painel */}
        <div className="flex bg-slate-900/80 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/10 shadow-lg gap-1">
          <button 
            onClick={() => setActiveTab('membros')}
            className={`flex-1 py-3 px-4 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'membros' ? 'bg-app-purple text-white shadow-lg shadow-app-purple/30' : 'text-slate-400 hover:text-white'}`}
          >
            <Users size={16} />
            <span>Controle de Membros</span>
            {totalBlocked > 0 && (
              <span className="w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {totalBlocked}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('agendamentos')}
            className={`flex-1 py-3 px-4 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'agendamentos' ? 'bg-app-purple text-white shadow-lg shadow-app-purple/30' : 'text-slate-400 hover:text-white'}`}
          >
            <Calendar size={16} />
            <span>Agendamentos Exclusivos</span>
          </button>

          <button 
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'config' ? 'bg-app-purple text-white shadow-lg shadow-app-purple/30' : 'text-slate-400 hover:text-white'}`}
          >
            <KeyRound size={16} />
            <span className="hidden sm:inline">Configurações</span>
          </button>
        </div>

        {/* --- ABA 1: CONTROLE E BLOQUEIO DE MEMBROS --- */}
        {activeTab === 'membros' && (
          <div className="space-y-6">
            {/* Métricas de Membros com Indicador de Membros Online no App */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white/95 text-slate-900 p-4 rounded-3xl border border-white/20 shadow-lg text-center backdrop-blur-md">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Total Membros</span>
                <span className="text-2xl font-black text-slate-900">{members.length}</span>
              </div>

              <div className="bg-emerald-950/80 p-4 rounded-3xl border border-emerald-500/50 shadow-lg shadow-emerald-950/40 text-center relative overflow-hidden ring-1 ring-emerald-400/40 backdrop-blur-md">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase text-emerald-300 tracking-widest">Online Agora</span>
                </div>
                <span className="text-2xl font-black text-emerald-400">{totalOnline}</span>
              </div>

              <div className={`p-4 rounded-3xl border shadow-lg text-center transition-all backdrop-blur-md ${totalPending > 0 ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/50 animate-pulse text-amber-200' : 'bg-amber-950/40 border-amber-500/30 text-amber-300'}`}>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest block">Aguardando</span>
                <span className="text-2xl font-black text-amber-300">{totalPending}</span>
              </div>

              <div className="bg-slate-900/80 text-emerald-400 p-4 rounded-3xl border border-emerald-500/30 shadow-lg text-center backdrop-blur-md">
                <span className="text-[10px] font-black uppercase text-emerald-300 tracking-widest block">Liberados</span>
                <span className="text-2xl font-black text-emerald-400">{totalActive}</span>
              </div>

              <div className="bg-slate-900/80 text-rose-400 p-4 rounded-3xl border border-rose-500/30 shadow-lg text-center col-span-2 sm:col-span-1 backdrop-blur-md">
                <span className="text-[10px] font-black uppercase text-rose-300 tracking-widest block">Bloqueados</span>
                <span className="text-2xl font-black text-rose-400">{totalBlocked}</span>
              </div>
            </div>

            {/* PAINEL: NOVA CONTA CRIADA AGUARDANDO LIBERAÇÃO */}
            {totalPending > 0 && (
              <div className="bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-orange-600/20 p-5 sm:p-6 rounded-[2.5rem] border-2 border-amber-400/60 shadow-2xl shadow-amber-950/40 space-y-4 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-lg shadow-amber-500/40 shrink-0">
                      <Clock size={24} className="animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-900/60 px-2.5 py-0.5 rounded-full inline-block border border-amber-500/30">
                        Sistema Administrativo
                      </span>
                      <h3 className="text-base sm:text-lg font-black uppercase text-amber-100 mt-0.5">
                        Nova Conta Criada Aguardando Liberação ({totalPending})
                      </h3>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-200 bg-amber-900/60 px-3 py-1.5 rounded-xl border border-amber-400/40 self-start sm:self-auto">
                    Liberação instantânea com 1 clique
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  {pendingMembers.map(member => {
                    const isOnline = isMemberOnline(member);
                    return (
                      <div 
                        key={member.id} 
                        className="bg-white text-slate-900 p-4 rounded-2xl border border-amber-300 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm">
                              {member.name.substring(0, 2).toUpperCase()}
                            </div>
                            {isOnline && (
                              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5" title="Online no App">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white"></span>
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-slate-900 text-sm truncate">{member.name}</h4>
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[9px] font-black uppercase tracking-wider">
                                Aguardando Liberação
                              </span>
                              {isOnline ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  <span>Online no App</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-400 bg-slate-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                  <span>Offline</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold mt-0.5 flex-wrap">
                              {member.phone && <span>WhatsApp: {member.phone}</span>}
                              {member.email && !member.email.endsWith('@igreja.com') && <span>• {member.email}</span>}
                              {member.createdAt && <span>• Criado em: {member.createdAt}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {member.phone && (
                            <a
                              href={`https://wa.me/55${member.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all border border-emerald-200"
                              title="Conversar com o novo membro no WhatsApp"
                            >
                              <MessageCircle size={16} />
                            </a>
                          )}

                          {isMasterAdmin ? (
                            <>
                              <button
                                onClick={() => handleToggleBlock(member)}
                                className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-all border border-amber-200"
                                title="Bloquear Acesso"
                              >
                                <UserX size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => setItemToDelete({ type: 'member', id: member.id, title: member.name })}
                                className="px-3 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-[10px] sm:text-xs uppercase tracking-wider shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
                                title="Excluir conta definitivamente do sistema"
                              >
                                <Trash2 size={15} />
                                <span>Excluir Definitivamente</span>
                              </button>
                              <button
                                onClick={() => handleApproveMember(member)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                              >
                                <CheckCircle2 size={16} />
                                <span>Liberar Acesso</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500">
                              <Lock size={12} className="text-amber-600" />
                              <span>Bloqueio/Liberação restrito à Administração Geral</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Banner Explicativo */}
            <div className="bg-amber-500/15 p-4 rounded-3xl border border-amber-500/30 flex items-start gap-3 backdrop-blur-md">
              <ShieldAlert size={22} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 font-medium leading-relaxed">
                <strong className="font-black uppercase tracking-tight block text-amber-300">Painel de Bloqueio do Sistema Administrativo:</strong>
                Ao bloquear um membro nesta lista, a tela do aplicativo no celular ou computador dele será restrita imediatamente com o aviso do sistema administrativo. A bolinha verde indica quando o membro está online no app em tempo real.
              </div>
            </div>

            {/* Barra de Busca, Atualização e Cadastrar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:w-80">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Buscar por nome, cargo ou telefone..."
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-900/90 border border-white/15 text-white rounded-2xl text-xs font-bold outline-none focus:border-app-purple shadow-lg backdrop-blur-md placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  type="button"
                  onClick={syncMembersFromServer}
                  disabled={isSyncingMembers}
                  className="px-4 py-3.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95 shadow-md"
                  title="Atualizar e sincronizar contas criadas no servidor"
                >
                  <RefreshCw size={15} className={isSyncingMembers ? "animate-spin text-app-purple" : ""} />
                  <span className="hidden sm:inline">Atualizar Lista</span>
                </button>

                <button 
                  onClick={() => setShowAddMember(true)}
                  className="flex-1 sm:flex-initial bg-app-purple hover:bg-app-purple/90 text-white font-black px-5 py-3.5 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-app-purple/30 flex items-center justify-center gap-2 active:scale-95 transition-all border border-purple-400/30"
                >
                  <UserPlus size={16} /> Cadastrar Novo Membro
                </button>
              </div>
            </div>

            {/* Modal Adicionar Membro */}
            {showAddMember && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 space-y-4 shadow-2xl animate-slide-up text-slate-900 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase text-slate-900">Novo Membro da Igreja</h3>
                    <button onClick={() => setShowAddMember(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={18}/></button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Nome Completo</label>
                      <input 
                        type="text" 
                        value={newMemberName} 
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="Ex: Irmão João Santos" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-app-purple"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Telefone / WhatsApp</label>
                      <input 
                        type="text" 
                        value={newMemberPhone} 
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        placeholder="(11) 99999-9999" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-app-purple"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Cargo / Função na Igreja</label>
                      <select 
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-app-purple"
                      >
                        <option value="Membro">Membro</option>
                        <option value="Diácono">Diácono</option>
                        <option value="Cooperador">Cooperador</option>
                        <option value="Obreiro">Obreiro</option>
                        <option value="Presbítero">Presbítero</option>
                        <option value="Evangelista">Evangelista</option>
                        <option value="Líder de Louvor">Líder de Louvor</option>
                        <option value="Professora da EBD">Professora da EBD</option>
                        <option value="Mocidade">Líder da Mocidade</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={handleAddMember}
                    className="w-full bg-app-purple text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest shadow-lg shadow-app-purple/20 active:scale-95 transition-all mt-2"
                  >
                    Confirmar Cadastro
                  </button>
                </div>
              </div>
            )}

            {/* Modal Bloquear Membro */}
            {blockingMember && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 space-y-4 shadow-2xl animate-slide-up border-2 border-rose-200 text-slate-900">
                  <div className="flex items-center justify-between text-rose-600">
                    <div className="flex items-center gap-2">
                      <UserX size={24} />
                      <h3 className="text-lg font-black uppercase">Bloquear Acesso</h3>
                    </div>
                    <button onClick={() => setBlockingMember(null)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={18}/></button>
                  </div>

                  <p className="text-xs font-bold text-slate-700">
                    Você está prestes a bloquear o acesso de <span className="font-black text-rose-700">{blockingMember.name}</span> ao aplicativo da igreja.
                  </p>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Motivo / Observação do Sistema Administrativo</label>
                    <textarea 
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Ex: Acesso suspenso pelo sistema administrativo..."
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs h-24 outline-none resize-none focus:bg-white focus:border-rose-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setBlockingMember(null)}
                      className="flex-1 bg-slate-100 text-slate-600 font-black p-4 rounded-2xl text-xs uppercase hover:bg-slate-200"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={confirmBlock}
                      className="flex-1 bg-rose-600 text-white font-black p-4 rounded-2xl text-xs uppercase shadow-lg shadow-rose-600/20 active:scale-95 hover:bg-rose-700"
                    >
                      Confirmar Bloqueio
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Membros */}
            <div className="space-y-3">
              {filteredMembers.length === 0 ? (
                <div className="bg-slate-900/80 p-12 text-center rounded-[2.5rem] border border-white/10 text-slate-400 space-y-2 backdrop-blur-md">
                  <Users size={32} className="mx-auto opacity-30 text-slate-400" />
                  <p className="font-black uppercase text-xs text-slate-300">Nenhum membro encontrado</p>
                </div>
              ) : (
                filteredMembers.map(member => {
                  const isOnline = isMemberOnline(member);
                  return (
                    <div 
                      key={member.id} 
                      className={`p-5 rounded-[2rem] border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md shadow-lg ${
                        member.isBlocked 
                          ? 'border-rose-500/40 bg-rose-950/40 text-rose-100' 
                          : isOnline
                            ? 'border-emerald-500/40 bg-slate-900/90 text-white ring-1 ring-emerald-500/30'
                            : 'border-white/10 bg-slate-900/80 text-white hover:border-app-purple/40'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Avatar do Membro com Bolinha Verde de Online */}
                        <div className="relative shrink-0">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-md ${
                            member.isBlocked 
                              ? 'bg-rose-900/80 text-rose-200 border border-rose-500/40' 
                              : isOnline
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                                : 'bg-app-purple/20 text-purple-200 border border-purple-500/30'
                          }`}>
                            {member.name.substring(0, 2).toUpperCase()}
                          </div>

                          {/* Bolinha Verde de Status Online */}
                          {isOnline && (
                            <span className="absolute -bottom-1 -right-1 flex h-4 w-4" title="Membro Online no App">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 ring-2 ring-slate-900 shadow-sm"></span>
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-white text-sm tracking-tight truncate">{member.name}</h4>
                            
                            {/* Bolinha Verde e Etiqueta de Presença */}
                            {isOnline ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow-xs">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>Online no App</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                <span>Offline</span>
                              </span>
                            )}

                            {member.isBlocked ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-950 text-rose-300 border border-rose-500/50">
                                BLOQUEADO
                              </span>
                            ) : member.accessStatus === 'PENDENTE_LIBERACAO' ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-500/50">
                                AGUARDANDO LIBERAÇÃO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                                LIBERADO
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-300 font-bold mt-1 flex-wrap">
                            <span className="text-purple-300 font-semibold">{member.role}</span>
                            {member.phone && <span>• {member.phone}</span>}
                            {member.email && !member.email.endsWith('@igreja.com') && <span>• {member.email}</span>}
                          </div>

                          {member.isBlocked && member.blockedReason && (
                            <p className="text-[10px] text-rose-300 font-bold mt-1 italic">
                              Motivo: "{member.blockedReason}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 flex-wrap">
                        {/* Botão Liberar Acesso rápido se pendente (exclusivo Administrador Master) */}
                        {isMasterAdmin && member.accessStatus === 'PENDENTE_LIBERACAO' && !member.isBlocked && (
                          <button 
                            onClick={() => handleApproveMember(member)}
                            className="px-3.5 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
                          >
                            <CheckCircle2 size={14} />
                            <span>Liberar Acesso</span>
                          </button>
                        )}

                        {/* Botão Testar Acesso desse membro */}
                        <button 
                          onClick={() => {
                            setCurrentMemberId(member.id);
                            alert(`Perfil de teste alterado para ${member.name}. ${member.isBlocked ? 'Este membro está BLOQUEADO e não conseguirá usar o app.' : member.accessStatus === 'PENDENTE_LIBERACAO' ? 'Este membro está AGUARDANDO LIBERAÇÃO.' : 'Acesso liberado.'}`);
                          }}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 border transition-all ${currentMemberId === member.id ? 'bg-app-purple text-white border-purple-400 shadow-md shadow-purple-900/40' : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'}`}
                          title="Simular uso do app como este membro"
                        >
                          {currentMemberId === member.id ? <Check size={12}/> : null}
                          {currentMemberId === member.id ? 'Membro Selecionado' : 'Simular Membro'}
                        </button>

                        {/* Se for a conta do Pastor Master, mostra identificação protegida */}
                        {member.id === 'm_pastor_master' || (member.email && (member.email.toLowerCase() === 'bjuscelino33@gmail.com' || member.email.toLowerCase() === 'meuplantaopro@gmail.com')) ? (
                          <span className="px-3 py-2 bg-purple-950/80 border border-purple-500/40 text-purple-300 font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                            <ShieldCheck size={14} className="text-purple-400" />
                            <span>Pastor Master (Oficial)</span>
                          </span>
                        ) : isMasterAdmin ? (
                          <>
                            {/* Botão Alternar Bloqueio */}
                            <button 
                              onClick={() => handleToggleBlock(member)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 shadow-md ${member.isBlocked ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'}`}
                            >
                              {member.isBlocked ? <UserCheck size={14} /> : <UserX size={14} />}
                              <span>{member.isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                            </button>

                            {/* Botão Excluir Definitivamente */}
                            <button 
                              type="button"
                              onClick={() => setItemToDelete({ type: 'member', id: member.id, title: member.name })}
                              className="px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-xl text-[10px] uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center gap-1.5 shrink-0 border border-rose-500/40"
                              title="Excluir conta definitivamente do sistema"
                            >
                              <Trash2 size={13} />
                              <span>Excluir</span>
                            </button>
                          </>
                        ) : (
                          <span className="px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] font-bold rounded-xl flex items-center gap-1">
                            <Lock size={12} className="text-amber-500" />
                            <span>Controle de Bloqueio Restrito</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      {/* --- ABA 2: PAINEL EXCLUSIVO DE AGENDAMENTOS DO PASTOR --- */}
      {activeTab === 'agendamentos' && (
        <div className="space-y-6">
          <div className="bg-app-purple/10 p-5 rounded-[2rem] border border-app-purple/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Calendar size={24} className="text-app-purple shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 font-medium leading-relaxed">
                <strong className="font-black uppercase text-app-purple block text-sm mb-0.5">Gerenciador da Agenda Oficial da Igreja</strong>
                Aqui o Pastor tem controle total: crie novos agendamentos ou use os botões <span className="text-rose-600 font-black">"Apagar"</span> para remover cultos, reuniões, visitas ou campanhas antigas.
              </div>
            </div>
            {((cults?.length || 0) + (meetings?.length || 0) + (pastoralVisits?.length || 0) + (campaigns?.length || 0) + (festivals?.length || 0)) > 0 && (
              <button 
                type="button"
                onClick={() => setItemToDelete({ 
                  type: 'clear_all_schedules', 
                  id: 'all', 
                  title: 'Todos os Agendamentos da Igreja' 
                })}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[11px] font-black uppercase tracking-wider border border-rose-200 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                title="Apagar todos os agendamentos de uma vez só"
              >
                <Trash2 size={14} />
                <span>Limpar Toda Agenda</span>
              </button>
            )}
          </div>

          {/* Sub-Aba de Categoria de Agendamento */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto gap-1">
            <button 
              onClick={() => setScheduleCategory('todos')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${scheduleCategory === 'todos' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Todos ({(cults?.length || 0) + (meetings?.length || 0) + (pastoralVisits?.length || 0) + (campaigns?.length || 0) + (festivals?.length || 0)})
            </button>
            <button 
              onClick={() => setScheduleCategory('cultos')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${scheduleCategory === 'cultos' ? 'bg-app-green text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Cultos ({cults.length})
            </button>
            <button 
              onClick={() => setScheduleCategory('meetings')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${scheduleCategory === 'meetings' ? 'bg-app-blue text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Reuniões ({meetings.length})
            </button>
            <button 
              onClick={() => setScheduleCategory('visits')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${scheduleCategory === 'visits' ? 'bg-app-purple text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Visitas ({pastoralVisits.length})
            </button>
            <button 
              onClick={() => setScheduleCategory('campaigns')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${scheduleCategory === 'campaigns' ? 'bg-app-red text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Campanhas ({campaigns.length})
            </button>
            <button 
              onClick={() => setScheduleCategory('festivals')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${scheduleCategory === 'festivals' ? 'bg-app-yellow text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Eventos ({festivals.length})
            </button>
          </div>

          {/* Botão Novo Agendamento */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button 
              onClick={() => setShowAddSchedule(true)}
              className="flex-1 bg-slate-900 text-white font-black p-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-slate-800"
            >
              <Plus size={18} /> Criar Novo Agendamento de {
                scheduleCategory === 'todos' ? 'Culto / Evento' :
                scheduleCategory === 'cultos' ? 'Culto' : 
                scheduleCategory === 'meetings' ? 'Reunião' : 
                scheduleCategory === 'visits' ? 'Visita Pastoral' : 
                scheduleCategory === 'campaigns' ? 'Campanha de Oração' : 'Evento Especial'
              }
            </button>
          </div>

          {/* Form Modal Agendamento */}
          {showAddSchedule && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-6 space-y-4 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-lg font-black uppercase text-slate-900">
                      Novo Agendamento: {
                        scheduleCategory === 'visits' ? 'Visita Pastoral' : 
                        scheduleCategory === 'cultos' ? 'Culto' : 
                        scheduleCategory === 'meetings' ? 'Reunião' : 
                        scheduleCategory === 'campaigns' ? 'Campanha de Oração' : 
                        scheduleCategory === 'festivals' ? 'Evento Especial' : 'Culto / Reunião'
                      }
                    </h3>
                    <p className="text-[10px] font-bold text-app-purple uppercase tracking-widest">Ficará visível para toda a igreja</p>
                  </div>
                  <button onClick={() => setShowAddSchedule(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={18}/></button>
                </div>

                <div className="space-y-3">
                  {scheduleCategory === 'todos' && (
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Tipo de Agendamento</label>
                      <select
                        defaultValue="cultos"
                        onChange={(e) => setScheduleCategory(e.target.value as any)}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-app-purple"
                      >
                        <option value="cultos">Culto</option>
                        <option value="meetings">Reunião de Liderança</option>
                        <option value="visits">Visita Pastoral</option>
                        <option value="campaigns">Campanha de Oração</option>
                        <option value="festivals">Evento Especial</option>
                      </select>
                    </div>
                  )}

                  {scheduleCategory === 'visits' ? (
                    <>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Nome do Membro ou Família a ser Visitada</label>
                        <input 
                          type="text" 
                          value={schedMemberName} 
                          onChange={(e) => setSchedMemberName(e.target.value)}
                          placeholder="Ex: Família do Irmão Pedro Silva" 
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-app-purple"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Data da Visita</label>
                          <input 
                            type="date" 
                            value={schedDate} 
                            onChange={(e) => setSchedDate(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-app-purple"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Horário</label>
                          <input 
                            type="time" 
                            value={schedTime} 
                            onChange={(e) => setSchedTime(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-app-purple"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Endereço / Local da Visita</label>
                        <input 
                          type="text" 
                          value={schedAddress} 
                          onChange={(e) => setSchedAddress(e.target.value)}
                          placeholder="Ex: Rua das Flores, 123 - Bairro Centro" 
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-app-purple"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Propósito da Visita / Oração</label>
                        <textarea 
                          value={schedDesc} 
                          onChange={(e) => setSchedDesc(e.target.value)}
                          placeholder="Ex: Oração de fortalecimento, unção da casa e aconselhamento..." 
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs h-24 outline-none resize-none focus:bg-white focus:border-app-purple"
                        />
                      </div>
                    </>
                  ) : scheduleCategory === 'campaigns' ? (
                    <>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Tema da Campanha de Oração</label>
                        <input 
                          type="text" 
                          value={schedTitle} 
                          onChange={(e) => setSchedTitle(e.target.value)}
                          placeholder="Ex: 7 Dias de Clamor pelas Famílias" 
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-app-purple"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Data de Início</label>
                          <input 
                            type="date" 
                            value={schedDate} 
                            onChange={(e) => setSchedDate(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs text-app-green outline-none focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Data de Término</label>
                          <input 
                            type="date" 
                            value={schedEndDate} 
                            onChange={(e) => setSchedEndDate(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs text-app-red outline-none focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Propósito do Clamor</label>
                        <textarea 
                          value={schedDesc} 
                          onChange={(e) => setSchedDesc(e.target.value)}
                          placeholder="Descreva detalhadamente o motivo da oração..." 
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs h-24 outline-none resize-none focus:bg-white focus:border-app-purple"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">
                          Título {scheduleCategory === 'cultos' ? 'do Culto' : scheduleCategory === 'meetings' ? 'da Reunião' : 'do Evento'}
                        </label>
                        <input 
                          type="text" 
                          value={schedTitle} 
                          onChange={(e) => setSchedTitle(e.target.value)}
                          placeholder={scheduleCategory === 'cultos' ? "Ex: Culto de Ensino e Doutrina" : scheduleCategory === 'meetings' ? "Ex: Reunião Geral de Obreiros" : "Ex: Congresso Anual"} 
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-app-purple"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Data</label>
                          <input 
                            type="date" 
                            value={schedDate} 
                            onChange={(e) => setSchedDate(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Horário</label>
                          <input 
                            type="time" 
                            value={schedTime} 
                            onChange={(e) => setSchedTime(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Observações / Detalhes</label>
                        <textarea 
                          value={schedDesc} 
                          onChange={(e) => setSchedDesc(e.target.value)}
                          placeholder="Mais detalhes sobre a programação..." 
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs h-24 outline-none resize-none focus:bg-white focus:border-app-purple"
                        />
                      </div>
                    </>
                  )}
                </div>

                <button 
                  onClick={handleCreateSchedule}
                  className="w-full bg-app-purple text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest shadow-lg shadow-app-purple/20 active:scale-95 transition-all mt-2"
                >
                  Salvar e Publicar para Membros
                </button>
              </div>
            </div>
          )}

          {/* Lista de Agendamentos com Botão Apagar Bem Destacado */}
          <div className="space-y-3">
            {/* Se for categoria Todos ou Cultos */}
            {(scheduleCategory === 'todos' || scheduleCategory === 'cultos') && cults.map(c => (
              <div key={`cult-${c.id}`} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-slate-200 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[9px] font-black uppercase tracking-wider">Culto</span>
                    <h4 className="font-black text-slate-900 text-sm">{c.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">📅 {c.date} • ⏰ {c.time}h</p>
                  {(c.desc || c.description) && (
                    <p className="text-xs text-slate-500 font-medium">{c.desc || c.description}</p>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setItemToDelete({ type: 'cult', id: c.id, title: c.title })}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 active:scale-95 flex items-center gap-1.5 shrink-0 font-black text-xs uppercase tracking-wider shadow-sm"
                  title="Apagar este culto da agenda"
                >
                  <Trash2 size={16} />
                  <span>Apagar</span>
                </button>
              </div>
            ))}

            {/* Se for categoria Todos ou Reuniões */}
            {(scheduleCategory === 'todos' || scheduleCategory === 'meetings') && meetings.map(m => (
              <div key={`meeting-${m.id}`} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-slate-200 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[9px] font-black uppercase tracking-wider">Reunião</span>
                    <h4 className="font-black text-slate-900 text-sm">{m.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">📅 {m.date} • ⏰ {m.time}h</p>
                  {(m.desc || m.description) && (
                    <p className="text-xs text-slate-500 font-medium">{m.desc || m.description}</p>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setItemToDelete({ type: 'meeting', id: m.id, title: m.title })}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 active:scale-95 flex items-center gap-1.5 shrink-0 font-black text-xs uppercase tracking-wider shadow-sm"
                  title="Apagar esta reunião da agenda"
                >
                  <Trash2 size={16} />
                  <span>Apagar</span>
                </button>
              </div>
            ))}

            {/* Se for categoria Todos ou Visitas */}
            {(scheduleCategory === 'todos' || scheduleCategory === 'visits') && pastoralVisits.map(visit => (
              <div key={`visit-${visit.id}`} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-slate-200 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-md text-[9px] font-black uppercase tracking-wider">Visita Pastoral</span>
                    <span className="text-sm font-black text-slate-900">{visit.memberName}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">📅 {visit.date} às {visit.time}h</p>
                  {visit.address && <p className="text-[11px] text-slate-500 font-medium">📍 {visit.address}</p>}
                  {visit.purpose && <p className="text-[11px] text-slate-600 italic">"{visit.purpose}"</p>}
                </div>
                <button 
                  type="button"
                  onClick={() => setItemToDelete({ type: 'visit', id: visit.id, title: `Visita: ${visit.memberName}` })}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 active:scale-95 flex items-center gap-1.5 shrink-0 font-black text-xs uppercase tracking-wider shadow-sm"
                  title="Apagar esta visita pastoral"
                >
                  <Trash2 size={16} />
                  <span>Apagar</span>
                </button>
              </div>
            ))}

            {/* Se for categoria Todos ou Campanhas */}
            {(scheduleCategory === 'todos' || scheduleCategory === 'campaigns') && campaigns.map(cp => (
              <div key={`camp-${cp.id}`} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-slate-200 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[9px] font-black uppercase tracking-wider">Campanha de Oração</span>
                    <h4 className="font-black text-slate-900 text-sm">{cp.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">📅 {cp.startDate} até {cp.endDate}</p>
                  {(cp.reason || cp.desc || cp.description) && (
                    <p className="text-xs text-slate-600 italic">"{cp.reason || cp.desc || cp.description}"</p>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setItemToDelete({ type: 'campaign', id: cp.id, title: cp.title })}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 active:scale-95 flex items-center gap-1.5 shrink-0 font-black text-xs uppercase tracking-wider shadow-sm"
                  title="Apagar esta campanha da agenda"
                >
                  <Trash2 size={16} />
                  <span>Apagar</span>
                </button>
              </div>
            ))}

            {/* Se for categoria Todos ou Eventos */}
            {(scheduleCategory === 'todos' || scheduleCategory === 'festivals') && festivals.map(f => (
              <div key={`fest-${f.id}`} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-slate-200 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[9px] font-black uppercase tracking-wider">Evento Especial</span>
                    <h4 className="font-black text-slate-900 text-sm">{f.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">📅 {f.date} {f.time ? `• ⏰ ${f.time}h` : ''}</p>
                  {(f.description || f.desc) && (
                    <p className="text-xs text-slate-500 font-medium">{f.description || f.desc}</p>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setItemToDelete({ type: 'festival', id: f.id, title: f.title })}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 active:scale-95 flex items-center gap-1.5 shrink-0 font-black text-xs uppercase tracking-wider shadow-sm"
                  title="Apagar este evento da agenda"
                >
                  <Trash2 size={16} />
                  <span>Apagar</span>
                </button>
              </div>
            ))}

            {/* Estado Vazio */}
            {((scheduleCategory === 'todos' && ((cults?.length || 0) + (meetings?.length || 0) + (pastoralVisits?.length || 0) + (campaigns?.length || 0) + (festivals?.length || 0) === 0)) ||
              (scheduleCategory === 'cultos' && cults.length === 0) ||
              (scheduleCategory === 'meetings' && meetings.length === 0) ||
              (scheduleCategory === 'visits' && pastoralVisits.length === 0) ||
              (scheduleCategory === 'campaigns' && campaigns.length === 0) ||
              (scheduleCategory === 'festivals' && festivals.length === 0)) && (
              <div className="bg-white p-12 text-center rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 space-y-2">
                <Calendar size={36} className="mx-auto text-slate-300 opacity-60" />
                <p className="font-black uppercase text-xs text-slate-600">Nenhum agendamento cadastrado nesta categoria</p>
                <p className="text-[11px] text-slate-400 font-medium">Clique no botão acima para adicionar um novo agendamento na agenda da igreja.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ABA 3: CONFIGURAÇÕES & SEGURANÇA --- */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* SEÇÃO: FOTO DE PERFIL DA IGREJA */}
          <section className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 text-slate-800">
              <div className="p-2.5 bg-app-purple/10 text-app-purple rounded-2xl"><Building2 size={22} /></div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-sm text-slate-900">Perfil & Foto da Igreja</h3>
                <p className="text-[10px] font-bold text-slate-400">Exibida no topo da tela inicial do aplicativo</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="relative group shrink-0">
                <div className="w-28 h-28 rounded-2xl overflow-hidden bg-slate-200 border-2 border-white shadow-md flex items-center justify-center">
                  {editPhotoUrl ? (
                    <img src={editPhotoUrl} alt="Foto da Igreja" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 gap-1 p-2 text-center">
                      <Building2 size={32} />
                      <span className="text-[9px] font-bold uppercase">Sem Foto</span>
                    </div>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => churchFileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-2.5 bg-app-purple text-white rounded-xl shadow-lg hover:bg-app-purple/90 transition-all active:scale-95"
                  title="Carregar Foto da Igreja"
                >
                  <Camera size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-3 w-full text-center sm:text-left">
                <div>
                  <h4 className="font-black text-slate-800 text-sm">Foto do Templo ou Fachada</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Escolha uma foto da igreja (fachada ou templo) para personalizar a tela inicial para todos os membros.
                  </p>
                </div>

                <input 
                  type="file" 
                  ref={churchFileInputRef} 
                  onChange={handleChurchPhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button 
                    type="button"
                    onClick={() => churchFileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-app-purple text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-app-purple/20 active:scale-95 transition-all"
                  >
                    <Upload size={14} /> Carregar Foto do Dispositivo
                  </button>

                  {editPhotoUrl && (
                    <button 
                      type="button"
                      onClick={handleRemoveChurchPhoto}
                      className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ou cole o link direto da Imagem (URL)</label>
              <div className="flex gap-2">
                <input 
                  type="url" 
                  value={editPhotoUrl} 
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto-igreja.jpg"
                  className="flex-1 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-xs text-slate-800 outline-none focus:border-app-purple"
                />
                <button 
                  type="button"
                  onClick={handleSaveInfo}
                  className="px-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-slate-800 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-slate-100 rounded-xl"><User size={20} /></div>
              <h3 className="font-black uppercase tracking-tight text-sm">Informações do Pastor Responsável</h3>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Nome Completo</label>
              <input 
                type="text" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-app-purple"
              />
            </div>
            <button 
              onClick={handleSaveInfo} 
              className="w-full bg-app-yellow text-white font-black p-4 rounded-2xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs active:scale-95 transition-all shadow-lg shadow-app-yellow/20"
            >
              <Save size={16}/> Salvar Alterações
            </button>
          </section>

          <section className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-slate-100 rounded-xl"><KeyRound size={20} /></div>
              <h3 className="font-black uppercase tracking-tight text-sm">Senha do Painel Administrativo</h3>
            </div>
            
            {!isChangingPass ? (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha Atual</span>
                  <span className="font-black text-slate-800 tracking-widest">••••••</span>
                </div>
                <button 
                  onClick={() => setIsChangingPass(true)}
                  className="text-app-purple font-black uppercase text-[10px] tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 active:scale-95"
                >
                  Alterar Senha
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Nova Senha de Acesso</label>
                  <div className="relative">
                    <input 
                      type={showPass ? "text" : "password"}
                      value={newPass} 
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Mínimo 3 caracteres"
                      className="w-full p-4 pr-12 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-app-purple"
                    />
                    <button 
                      onClick={() => setShowPass(!showPass)}
                      className="absolute inset-y-0 right-4 flex items-center text-slate-300"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsChangingPass(false)}
                    className="flex-1 bg-slate-100 text-slate-500 font-black p-4 rounded-2xl uppercase text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleChangePassword}
                    className="flex-[2] bg-app-purple text-white font-black p-4 rounded-2xl uppercase text-[10px] shadow-lg shadow-app-purple/20 active:scale-95"
                  >
                    Confirmar Nova Senha
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Teste de Membro Ativo */}
          <section className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-slate-100 rounded-xl"><Users size={20} /></div>
              <h3 className="font-black uppercase tracking-tight text-sm">Simulação de Perfil de Membro</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Escolha um membro cadastrado abaixo para simular o uso do app pela visão dele (útil para testar o recurso de bloqueio):
            </p>

            <select 
              value={currentMemberId || ''} 
              onChange={(e) => setCurrentMemberId(e.target.value || null)}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-app-purple"
            >
              <option value="">-- Sem membro específico selecionado (Acesso Geral) --</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role}) - {m.isBlocked ? '🚫 BLOQUEADO' : '✅ LIBERADO'}
                </option>
              ))}
            </select>
          </section>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Sem `window.confirm` */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm sm:max-w-md rounded-[2.5rem] p-6 sm:p-7 space-y-4 shadow-2xl animate-slide-up border-2 border-rose-200 text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-rose-200">
              <Trash2 size={32} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black uppercase text-slate-900">
                {itemToDelete.type === 'member' 
                  ? 'Excluir Conta Definitivamente?' 
                  : itemToDelete.type === 'clear_all_schedules'
                  ? 'Limpar Toda a Agenda?'
                  : 'Apagar Agendamento?'}
              </h3>
              <div className="text-sm font-bold text-slate-700">
                {itemToDelete.type === 'member' ? (
                  <>Tem certeza que deseja apagar definitivamente a conta de <span className="text-rose-600 font-black underline">"{itemToDelete.title}"</span>?</>
                ) : itemToDelete.type === 'clear_all_schedules' ? (
                  <>Tem certeza que deseja apagar <span className="text-rose-600 font-black">TODOS os agendamentos</span> cadastrados na igreja?</>
                ) : (
                  <>Tem certeza que deseja apagar <span className="text-rose-600 font-black">"{itemToDelete.title}"</span> da agenda?</>
                )}
              </div>
              <p className="text-xs font-semibold text-rose-600/90 bg-rose-50 p-2.5 rounded-xl border border-rose-200/60 leading-relaxed">
                {itemToDelete.type === 'member'
                  ? 'Atenção: Esta ação é permanente e irreversível. A conta será removida do servidor, do banco de dados na nuvem e o acesso será cancelado imediatamente.'
                  : itemToDelete.type === 'clear_all_schedules'
                  ? 'Todos os cultos, reuniões, visitas e eventos serão removidos da agenda dos membros permanentemente.'
                  : 'Este agendamento será removido imediatamente da visualização de todos os membros no aplicativo.'}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button 
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 bg-slate-100 text-slate-700 font-black p-3.5 rounded-2xl text-xs uppercase hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 bg-rose-600 text-white font-black p-3.5 rounded-2xl text-xs uppercase shadow-lg shadow-rose-600/25 active:scale-95 hover:bg-rose-700 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={16} /> 
                {itemToDelete.type === 'member' ? 'Sim, Excluir Conta' : itemToDelete.type === 'clear_all_schedules' ? 'Sim, Limpar Tudo' : 'Sim, Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Notificação de Exclusão */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[110] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-down border border-slate-700">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
      </div>
    </div>
  );
};

export default PastorArea;

