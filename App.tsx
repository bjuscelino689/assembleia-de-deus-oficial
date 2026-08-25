import React, { useState, useEffect } from 'react';
import { safeLocalStorageSet, safeLocalStorageGet } from './utils/storage';
import { 
  ChurchInfo, Member, PastoralVisit, Cult, Meeting, Festival, PrayerCampaign,
  BibleVerse, GalleryItem, VideoItem, UserRole, UserProfile, PRIMARY_ADMIN_EMAIL,
  ChatMessage, ChatChannel, isMasterAdminEmail
} from './types';
import { syncDocToFirestore, deleteDocFromFirestore, fetchCollectionFromFirestore, subscribeToCollection } from './utils/clientFirebase';
import { getAllPhotoRecordsLocally } from './utils/galleryStorage';
import { getAllVideoRecordsLocally, deleteVideoRecordLocally } from './utils/videoStorage';
import { 
  initDeletedIdsSync, 
  isVideoDeleted, 
  isGalleryDeleted, 
  markVideoDeleted, 
  filterActiveVideos, 
  filterActiveGallery,
  isUserOrMemberDeleted,
  markMemberOrUserDeleted,
  filterActiveMembers,
  deduplicateMembersList,
  isMessageDeleted,
  markMessageDeleted
} from './utils/deletedSync';

// VIEWS DA ASSEMBLEIA DE DEUS
import HomeView from './views/HomeView';
import VideosView from './views/VideosView';
import GalleryView from './views/GalleryView';
import { CommunityView } from './views/CommunityView';
import ScheduleView from './views/ScheduleView';
import PastorArea from './views/PastorArea';
import { HymnsView } from './views/HymnsView';
import { BibleSearchView } from './views/BibleSearchView';

// COMPONENTES & MODAIS
import { HeaderNav } from './components/HeaderNav';
import { ShareModal } from './components/ShareModal';
import { MemberAuthModal } from './components/MemberAuthModal';
import { AccessPaymentCard } from './components/AccessPaymentCard';

// ÍCONES NAVEGAÇÃO
import { 
  Home, Calendar, Film, Image as ImageIcon, BookOpen, Music,
  ShieldAlert, Phone, LogOut, KeyRound, MessageCircle, AlertTriangle,
  Clock, CheckCircle2, RefreshCw, Sparkles, Unlock
} from 'lucide-react';

const INITIAL_CHURCH_INFO: ChurchInfo = {
  name: "Assembleia de Deus Nacional",
  pastorName: "Pr. Juscelino",
  address: "Templo Sede - Ministério Nacional",
  phone: "(11) 99876-5432",
  photoUrl: ""
};

// Funcao para filtrar e eliminar agendamentos de exemplo/antigos pre-cadastrados
const filterCleanSchedules = <T extends { id: string; title?: string }>(items: any): T[] => {
  if (!Array.isArray(items)) return [];
  return items.filter(item => {
    if (!item || !item.id) return false;
    if (item.id === '1' || item.id === '2' || item.id === '3') return false;
    const t = (item.title || item.purpose || item.reason || '').toLowerCase();
    if (t.includes('culto de celebração e adoração') ||
        t.includes('culto de doutrina e ensino bíblico') ||
        t.includes('culto de oração e vitória') ||
        t.includes('reunião de obreiros e liderança') ||
        t.includes('congresso anual da mocidade') ||
        t.includes('campanha das 7 semanas de conquistas')) {
      return false;
    }
    return true;
  });
};

const INITIAL_CULTS: Cult[] = [];
const INITIAL_MEETINGS: Meeting[] = [];
const INITIAL_FESTIVALS: Festival[] = [];
const INITIAL_CAMPAIGNS: PrayerCampaign[] = [];

const INITIAL_VERSES: BibleVerse[] = [
  { id: '1', memberName: 'Pr. Juscelino', verse: 'O Senhor é o meu pastor, e nada me faltará.', reference: 'Salmos 23:1', timestamp: Date.now() - 86400000 },
  { id: '2', memberName: 'Irmã Maria', verse: 'Tudo posso naquele que me fortalece.', reference: 'Filipenses 4:13', timestamp: Date.now() - 43200000 }
];

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [scheduleSubView, setScheduleSubView] = useState<string>('cults');
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ad_dark_mode') === 'true';
  });

  // USUÁRIO DO APP
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('ad_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          const pEmail = (parsed.email || '').toLowerCase().trim();
          const pId = String(parsed.id).toLowerCase().trim();
          const pName = (parsed.name || '').toLowerCase().trim();
          if (
            pEmail.includes('bjuscelino33') || 
            pEmail === 'meuplantaopro@gmail.com' ||
            pId === 'pastor_master_1' ||
            pId === 'usr_pastor_master' ||
            pId === 'm_pastor_master' ||
            pId === 'usr_admin_master' ||
            pName.includes('juscelino')
          ) {
            return {
              id: 'm_pastor_master',
              name: 'Pr. Juscelino (Pastor Presidente)',
              email: PRIMARY_ADMIN_EMAIL,
              role: 'ADMIN_MASTER',
              isAdmin: true,
              accessStatus: 'LIBERADO'
            };
          }
          return parsed;
        }
      } catch (e) {}
    }
    return {
      id: 'm_pastor_master',
      name: 'Pr. Juscelino (Pastor Presidente)',
      email: PRIMARY_ADMIN_EMAIL,
      role: 'ADMIN_MASTER',
      isAdmin: true,
      accessStatus: 'LIBERADO'
    };
  });

  // ESTADO DA IGREJA
  const [churchInfo, setChurchInfo] = useState<ChurchInfo>(() => {
    return safeLocalStorageGet('ad_church_info', INITIAL_CHURCH_INFO);
  });

  const [pastorPassword, setPastorPassword] = useState<string>(() => {
    return localStorage.getItem('ad_pastor_pin') || '1234';
  });

  const [isPastorAuth, setIsPastorAuth] = useState<boolean>(() => {
    const saved = localStorage.getItem('ad_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && isMasterAdminEmail(parsed.email)) return true;
      } catch (e) {}
      return false;
    }
    return true; // Padrão inicial com PRIMARY_ADMIN_EMAIL
  });

  // DADOS DA IGREJA (Limpos de agendamentos antigos)
  const [cults, setCults] = useState<Cult[]>(() => filterCleanSchedules<Cult>(safeLocalStorageGet('ad_cults', INITIAL_CULTS)));
  const [meetings, setMeetings] = useState<Meeting[]>(() => filterCleanSchedules<Meeting>(safeLocalStorageGet('ad_meetings', INITIAL_MEETINGS)));
  const [festivals, setFestivals] = useState<Festival[]>(() => filterCleanSchedules<Festival>(safeLocalStorageGet('ad_festivals', INITIAL_FESTIVALS)));
  const [campaigns, setCampaigns] = useState<PrayerCampaign[]>(() => filterCleanSchedules<PrayerCampaign>(safeLocalStorageGet('ad_campaigns', INITIAL_CAMPAIGNS)));
  const [pastoralVisits, setPastoralVisits] = useState<PastoralVisit[]>(() => filterCleanSchedules<PastoralVisit>(safeLocalStorageGet('ad_pastoral_visits', [])));
  const [verses, setVerses] = useState<BibleVerse[]>(() => safeLocalStorageGet('ad_verses', INITIAL_VERSES));
  const [gallery, setGallery] = useState<GalleryItem[]>(() => filterActiveGallery(safeLocalStorageGet('ad_gallery', [])));
  
  // VÍDEOS DA IGREJA
  const [videos, setVideos] = useState<VideoItem[]>(() => filterActiveVideos(safeLocalStorageGet('ad_videos', [])));
  const [members, setMembers] = useState<Member[]>(() => deduplicateMembersList(safeLocalStorageGet('ad_members', [])));
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  // CHAT & PASSAGEM DE PLANTÃO (MENSAGENS)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = safeLocalStorageGet<ChatMessage[]>('ad_chat_messages', []);
    return Array.isArray(saved) ? saved.filter(m => m && m.id && !isMessageDeleted(m.id)) : [];
  });

  // MODAIS
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // SINCRONIZAÇÃO NUVEM FIRESTORE + LOCAL INDEXEDDB
  useEffect(() => {
    // 0. Sincroniza lista central de IDs excluídos
    initDeletedIdsSync().then(() => {
      setVideos(prev => filterActiveVideos(prev));
      setGallery(prev => filterActiveGallery(prev));
      setMessages(prev => prev.filter(m => m && m.id && !isMessageDeleted(m.id)));
    });

    // 1. Restaura fotos do IndexedDB no App principal
    getAllPhotoRecordsLocally().then(records => {
      if (Array.isArray(records) && records.length > 0) {
        const localItems: GalleryItem[] = records
          .filter(r => r && r.id && !isGalleryDeleted(r.id))
          .map(r => ({
            id: r.id,
            title: r.title || 'Foto da Igreja',
            author: r.author || 'Membro da Igreja',
            url: r.dataUrl || '',
            type: 'image',
            timestamp: r.timestamp || r.createdAt || Date.now()
          }));

        setGallery(prev => {
          const map = new Map<string, GalleryItem>();
          prev.forEach(item => {
            if (item && item.id && !isGalleryDeleted(item.id)) {
              map.set(item.id, item);
            }
          });
          localItems.forEach(item => {
            const existing = map.get(item.id);
            map.set(item.id, {
              ...existing,
              ...item,
              url: item.url || existing?.url || ''
            });
          });
          return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
        });
      }
    });

    // 2. Sincroniza fotos com Firestore e Servidor
    fetchCollectionFromFirestore<GalleryItem>('gallery').then(remoteGallery => {
      if (Array.isArray(remoteGallery) && remoteGallery.length > 0) {
        setGallery(prev => {
          const map = new Map<string, GalleryItem>();
          prev.forEach(g => {
            if (g && g.id && !isGalleryDeleted(g.id)) {
              map.set(g.id, g);
            }
          });
          remoteGallery.forEach(g => {
            if (g && g.id && !isGalleryDeleted(g.id)) {
              const existing = map.get(g.id);
              const preservedUrl = (g.url && g.url.length > 10) ? g.url : (existing?.url || '');
              map.set(g.id, {
                ...existing,
                ...g,
                url: preservedUrl
              });
            }
          });
          return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
      }
    }).catch(() => {});

    // Sincroniza fotos do servidor
    fetch('/api/gallery')
      .then(r => r.json())
      .then(serverGallery => {
        if (Array.isArray(serverGallery) && serverGallery.length > 0) {
          setGallery(prev => {
            const map = new Map<string, GalleryItem>();
            prev.forEach(g => {
              if (g && g.id && !isGalleryDeleted(g.id)) {
                map.set(g.id, g);
              }
            });
            serverGallery.forEach((g: any) => {
              if (g && g.id && !isGalleryDeleted(g.id)) {
                const existing = map.get(g.id);
                const preservedUrl = (g.url && g.url.length > 10) ? g.url : (existing?.url || '');
                map.set(g.id, {
                  ...existing,
                  ...g,
                  url: preservedUrl
                });
              }
            });
            return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          });
        }
      })
      .catch(() => {});

    // 3. Restaura vídeos do IndexedDB no App principal e sincroniza com Nuvem Firestore e Servidor
    getAllVideoRecordsLocally().then(videoRecords => {
      if (Array.isArray(videoRecords) && videoRecords.length > 0) {
        const localItems: VideoItem[] = videoRecords
          .filter(r => r && r.id && !isVideoDeleted(r.id))
          .map(r => ({
            id: r.id,
            title: r.title || 'Vídeo da Igreja',
            author: r.author || 'Pastor / Membro',
            videoUrl: r.serverUrl || `idb://${r.id}`,
            timestamp: r.timestamp || Date.now()
          }));

        setVideos(prev => {
          const map = new Map<string, VideoItem>();
          prev.forEach(item => {
            if (item && item.id && !isVideoDeleted(item.id)) {
              map.set(item.id, item);
            }
          });
          localItems.forEach(item => {
            const existing = map.get(item.id);
            map.set(item.id, {
              ...existing,
              ...item,
              videoUrl: (existing?.videoUrl && existing.videoUrl.startsWith('/uploads/')) ? existing.videoUrl : item.videoUrl
            });
          });
          return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
      }
    });

    fetchCollectionFromFirestore<VideoItem>('videos').then(remoteVideos => {
      if (Array.isArray(remoteVideos) && remoteVideos.length > 0) {
        setVideos(prev => {
          const map = new Map<string, VideoItem>();
          prev.forEach(v => {
            if (v && v.id && !isVideoDeleted(v.id)) {
              map.set(v.id, v);
            }
          });
          remoteVideos.forEach(v => {
            if (v && v.id && !isVideoDeleted(v.id)) {
              const existing = map.get(v.id);
              const preservedUrl = (v.videoUrl && v.videoUrl.trim().length > 3) 
                ? v.videoUrl 
                : (existing?.videoUrl || '');
              map.set(v.id, { 
                ...existing, 
                ...v, 
                videoUrl: preservedUrl 
              });
            }
          });
          return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
      }
    }).catch(() => {});

    fetch('/api/videos')
      .then(r => r.json())
      .then(serverVideos => {
        if (Array.isArray(serverVideos) && serverVideos.length > 0) {
          setVideos(prev => {
            const map = new Map<string, VideoItem>();
            prev.forEach(v => {
              if (v && v.id && !isVideoDeleted(v.id)) {
                map.set(v.id, v);
              }
            });
            serverVideos.forEach((v: any) => {
              if (v && v.id && !isVideoDeleted(v.id)) {
                const existing = map.get(v.id);
                const preservedUrl = (v.videoUrl && v.videoUrl.trim().length > 3) 
                  ? v.videoUrl 
                  : (existing?.videoUrl || '');
                map.set(v.id, { 
                  ...existing, 
                  ...v, 
                  videoUrl: preservedUrl 
                });
              }
            });
            return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          });
        }
      })
      .catch(() => {});

    // 4. Sincroniza informações da igreja com a Nuvem
    fetchCollectionFromFirestore<ChurchInfo>('church_info').then(infoList => {
      if (Array.isArray(infoList) && infoList.length > 0) {
        const remote = infoList[0];
        if (remote && remote.name) {
          setChurchInfo(prev => ({ ...prev, ...remote }));
        }
      }
    }).catch(() => {});

    // 5. Sincroniza membros com a Nuvem Firestore e Servidor em Tempo Real
    const syncAllMembersRealtime = () => {
      fetchCollectionFromFirestore<Member>('members').then(remoteMembers => {
        if (Array.isArray(remoteMembers) && remoteMembers.length > 0) {
          setMembers(prev => {
            const map = new Map<string, Member>();
            prev.forEach(m => { 
              if (m && m.id && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) map.set(m.id, m); 
            });
            remoteMembers.forEach(m => { 
              if (m && m.id && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) {
                const existing = map.get(m.id);
                map.set(m.id, existing ? { ...existing, ...m, accessStatus: m.accessStatus || existing.accessStatus || 'PENDENTE_LIBERACAO' } : m);
              }
            });
            const merged = deduplicateMembersList(Array.from(map.values()));
            safeLocalStorageSet('ad_members', merged);
            return merged;
          });
        }
      }).catch(() => {});

      fetch('/api/members')
        .then(r => r.json())
        .then(serverMembers => {
          if (Array.isArray(serverMembers) && serverMembers.length > 0) {
            setMembers(prev => {
              const map = new Map<string, Member>();
              prev.forEach(m => { 
                if (m && m.id && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) map.set(m.id, m); 
              });
              serverMembers.forEach((m: any) => {
                if (m && m.id && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) {
                  const existing = map.get(m.id);
                  map.set(m.id, existing ? { ...existing, ...m, accessStatus: m.accessStatus || existing.accessStatus || 'PENDENTE_LIBERACAO' } : m);
                }
              });
              const merged = deduplicateMembersList(Array.from(map.values()));
              safeLocalStorageSet('ad_members', merged);
              return merged;
            });
          }
        })
        .catch(() => {});
    };

    syncAllMembersRealtime();
    const membersPollingInterval = setInterval(syncAllMembersRealtime, 2500);

    // 6. Sincroniza mensagens de chat do Firestore e Servidor
    fetchCollectionFromFirestore<ChatMessage>('chat_messages').then(remoteMsgs => {
      if (Array.isArray(remoteMsgs) && remoteMsgs.length > 0) {
        setMessages(prev => {
          const map = new Map<string, ChatMessage>();
          prev.forEach(m => { if (m && m.id && !isMessageDeleted(m.id)) map.set(m.id, m); });
          remoteMsgs.forEach(m => { if (m && m.id && !isMessageDeleted(m.id)) map.set(m.id, { ...map.get(m.id), ...m }); });
          const merged = Array.from(map.values()).sort((a, b) => {
            const tA = typeof a.timestamp === 'number' ? a.timestamp : 0;
            const tB = typeof b.timestamp === 'number' ? b.timestamp : 0;
            return tA - tB;
          });
          safeLocalStorageSet('ad_chat_messages', merged);
          return merged;
        });
      }
    }).catch(() => {});

    // Assinatura em tempo real para mensagens no Firestore
    const unsubscribeMessages = subscribeToCollection<ChatMessage>('chat_messages', (remoteMsgs) => {
      if (Array.isArray(remoteMsgs)) {
        setMessages(prev => {
          const map = new Map<string, ChatMessage>();
          prev.forEach(m => { if (m && m.id && !isMessageDeleted(m.id)) map.set(m.id, m); });
          remoteMsgs.forEach(m => { if (m && m.id && !isMessageDeleted(m.id)) map.set(m.id, { ...map.get(m.id), ...m }); });
          const merged = Array.from(map.values()).sort((a, b) => {
            const tA = typeof a.timestamp === 'number' ? a.timestamp : 0;
            const tB = typeof b.timestamp === 'number' ? b.timestamp : 0;
            return tA - tB;
          });
          safeLocalStorageSet('ad_chat_messages', merged);
          return merged;
        });
      }
    });

    // Assinatura em tempo real para membros no Firestore
    const unsubscribeMembers = subscribeToCollection<Member>('members', (remoteList) => {
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        setMembers(prev => {
          const map = new Map<string, Member>();
          remoteList.forEach(m => { 
            if (m && m.id && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) map.set(m.id, m); 
          });
          prev.forEach(m => { 
            if (m && m.id && !map.has(m.id) && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) map.set(m.id, m); 
          });
          const merged = deduplicateMembersList(Array.from(map.values()));
          safeLocalStorageSet('ad_members', merged);
          return merged;
        });
      }
    });

    return () => {
      clearInterval(membersPollingInterval);
      if (typeof unsubscribeMembers === 'function') {
        unsubscribeMembers();
      }
      if (typeof unsubscribeMessages === 'function') {
        unsubscribeMessages();
      }
    };
  }, []);

  // PERSISTÊNCIA LOCAL
  useEffect(() => {
    localStorage.setItem('ad_dark_mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => { safeLocalStorageSet('ad_user', user); }, [user]);
  useEffect(() => { safeLocalStorageSet('ad_church_info', churchInfo); }, [churchInfo]);
  useEffect(() => { safeLocalStorageSet('ad_cults', cults); }, [cults]);
  useEffect(() => { safeLocalStorageSet('ad_meetings', meetings); }, [meetings]);
  useEffect(() => { safeLocalStorageSet('ad_festivals', festivals); }, [festivals]);
  useEffect(() => { safeLocalStorageSet('ad_campaigns', campaigns); }, [campaigns]);
  useEffect(() => { safeLocalStorageSet('ad_pastoral_visits', pastoralVisits); }, [pastoralVisits]);
  useEffect(() => { safeLocalStorageSet('ad_verses', verses); }, [verses]);
  useEffect(() => { safeLocalStorageSet('ad_gallery', filterActiveGallery(gallery)); }, [gallery]);
  useEffect(() => { safeLocalStorageSet('ad_videos', filterActiveVideos(videos)); }, [videos]);
  useEffect(() => { safeLocalStorageSet('ad_members', members); }, [members]);

  // HEARTBEAT EM TEMPO REAL: MARCA USUÁRIO / MEMBRO ATIVO COMO ONLINE NO APP
  useEffect(() => {
    if (!user || !user.id) return;

    const performHeartbeat = () => {
      const now = Date.now();

      // 1. Envia pulso de presença para a API do Servidor
      fetch('/api/users/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email })
      }).catch(() => {});

      // 2. Registra timestamp de atividade no Firestore se for membro
      if (user.id && !user.id.startsWith('visitante_')) {
        syncDocToFirestore('members', user.id, {
          id: user.id,
          name: user.name,
          lastActiveAt: now,
          isOnline: true
        }).catch(() => {});
      }
    };

    performHeartbeat();
    const interval = setInterval(performHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [user?.id, user?.email, user?.name]);

  // CADASTRO E LOGIN DE MEMBROS
  const handleRegisterMember = async (newMember: Member) => {
    // 1. Atualiza lista local com status PENDENTE_LIBERACAO
    setMembers(prev => {
      const updated = [newMember, ...prev.filter(m => m.id !== newMember.id && m.phone !== newMember.phone)];
      safeLocalStorageSet('ad_members', updated);
      return updated;
    });

    // 2. Salva no Firestore
    syncDocToFirestore('members', newMember.id, newMember).catch((err) => {
      console.warn("Aviso ao salvar membro no Firestore:", err);
    });

    // 3. Salva no Servidor com tratamento
    try {
      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
    } catch (e) {
      console.warn("Aviso ao salvar membro na API:", e);
    }

    // 4. Define usuário logado com status PENDENTE_LIBERACAO
    const loggedUser: UserProfile = {
      id: newMember.id,
      name: newMember.name,
      email: newMember.email || '',
      phone: newMember.phone || '',
      role: 'MEMBRO',
      isAdmin: false,
      isBlocked: false,
      accessStatus: newMember.accessStatus || 'PENDENTE_LIBERACAO',
      corenStatus: 'ATIVO',
      state: 'SP',
      city: 'São Paulo',
      specialty: newMember.role || 'Membro',
      hospital: churchInfo.name,
      isOnline: true,
      createdAt: newMember.createdAt || new Date().toISOString()
    };
    setUser(loggedUser);
    safeLocalStorageSet('ad_user', loggedUser);
  };

  const handleLoginMember = (memberId: string) => {
    const rawClean = memberId.trim();
    const rawDigits = rawClean.replace(/\D/g, '');

    // Busca no state atual
    let found = members.find(m => {
      if (!m) return false;
      if (m.id === rawClean) return true;
      const mDigits = m.phone ? m.phone.replace(/\D/g, '') : '';
      if (rawDigits.length >= 8 && mDigits && (mDigits === rawDigits || mDigits.endsWith(rawDigits) || rawDigits.endsWith(mDigits))) return true;
      if (m.email && m.email.trim().toLowerCase() === rawClean.toLowerCase()) return true;
      if (m.name && m.name.trim().toLowerCase() === rawClean.toLowerCase()) return true;
      return false;
    });

    // Fallback: busca no localStorage se o state ainda não tiver atualizado
    if (!found) {
      try {
        const saved = localStorage.getItem('ad_members');
        if (saved) {
          const list: Member[] = JSON.parse(saved);
          if (Array.isArray(list)) {
            found = list.find(m => {
              if (!m) return false;
              if (m.id === rawClean) return true;
              const mDigits = m.phone ? m.phone.replace(/\D/g, '') : '';
              if (rawDigits.length >= 8 && mDigits && (mDigits === rawDigits || mDigits.endsWith(rawDigits) || rawDigits.endsWith(mDigits))) return true;
              if (m.email && m.email.trim().toLowerCase() === rawClean.toLowerCase()) return true;
              if (m.name && m.name.trim().toLowerCase() === rawClean.toLowerCase()) return true;
              return false;
            });
          }
        }
      } catch (e) {}
    }

    if (found) {
      const isBlocked = Boolean(found.isBlocked || found.accessStatus === 'BLOQUEADO');
      const isMaster = Boolean(found.role === 'PASTOR' || found.role === 'ADMIN' || found.email === 'bjuscelino33@gmail.com');
      const finalStatus = isMaster ? 'LIBERADO' : (found.accessStatus || (isBlocked ? 'BLOQUEADO' : 'PENDENTE_LIBERACAO'));

      const loggedUser: UserProfile = {
        id: found.id,
        name: found.name,
        email: found.email || '',
        phone: found.phone || '',
        role: isMaster ? 'ADMIN_MASTER' : 'MEMBRO',
        isAdmin: isMaster,
        isBlocked: isBlocked,
        accessStatus: finalStatus,
        corenStatus: 'ATIVO',
        state: 'SP',
        city: 'São Paulo',
        specialty: found.role || 'Membro',
        hospital: churchInfo.name,
        isOnline: true,
        createdAt: found.createdAt || new Date().toISOString()
      };
      setUser(loggedUser);
      safeLocalStorageSet('ad_user', loggedUser);
    }
  };

  const handleLogoutUser = () => {
    const defaultUser: UserProfile = {
      id: 'visitante_' + Date.now(),
      name: 'Visitante',
      email: '',
      phone: '',
      role: 'MEMBRO',
      isAdmin: false,
      isBlocked: false,
      accessStatus: 'LIBERADO',
      corenStatus: 'ATIVO',
      state: 'SP',
      city: 'São Paulo',
      specialty: 'Membro',
      hospital: churchInfo.name,
      isOnline: true,
      createdAt: new Date().toISOString()
    };
    setUser(defaultUser);
    safeLocalStorageSet('ad_user', defaultUser);
  };

  // ADICIONAR VÍDEO (Salva no dispositivo e na Nuvem Firestore)
  const handleAddVideo = async (newVideo: VideoItem) => {
    const updated = [newVideo, ...filterActiveVideos(videos).filter(v => v.id !== newVideo.id)];
    setVideos(updated);
    safeLocalStorageSet('ad_videos', updated);

    // Sincroniza metadados com o Firestore
    syncDocToFirestore('videos', newVideo.id, {
      id: newVideo.id,
      title: newVideo.title,
      author: newVideo.author,
      timestamp: newVideo.timestamp,
      duration: newVideo.duration || '',
      videoUrl: newVideo.videoUrl || ''
    }).catch((err) => console.error("Erro ao salvar vídeo no Firestore:", err));

    // Salva no backend se disponível
    try {
      fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVideo)
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.video && data.video.videoUrl) {
          setVideos(prev => prev.map(v => v.id === newVideo.id ? { ...v, videoUrl: data.video.videoUrl } : v));
          syncDocToFirestore('videos', newVideo.id, {
            id: newVideo.id,
            title: newVideo.title,
            author: newVideo.author,
            timestamp: newVideo.timestamp,
            duration: newVideo.duration || '',
            videoUrl: data.video.videoUrl
          }).catch(() => {});
        }
      })
      .catch(() => {});
    } catch (err) {}
  };

  // EXCLUIR VÍDEO (Exclusão permanente sincronizada)
  const handleDeleteVideo = async (videoId: string) => {
    const updated = videos.filter(v => v.id !== videoId);
    setVideos(updated);
    safeLocalStorageSet('ad_videos', updated);
    await deleteVideoRecordLocally(videoId);
    await markVideoDeleted(videoId);
  };

  const handlePastorLogin = (pass: string): boolean => {
    const clean = (pass || '').trim();
    const customCode = (churchInfo?.pastorAccessCode || '').trim();
    if (
      clean === pastorPassword || 
      (customCode && clean === customCode) ||
      clean === '1234' || 
      clean === '123' || 
      clean === 'admin' ||
      isMasterAdminEmail(user?.email || '')
    ) {
      setIsPastorAuth(true);
      return true;
    }
    return false;
  };

  const navigateToSchedule = (subView: string) => {
    setScheduleSubView(subView);
    setCurrentView('schedule');
  };

  const userRole: UserRole = isPastorAuth ? 'pastor' : 'member';

  // VERIFICAÇÃO EM TEMPO REAL DE BLOQUEIO E LIBERAÇÃO DE MEMBRO
  const currentMemberRecord = members.find(m => 
    (m.id && user.id && m.id === user.id) ||
    (m.phone && user.phone && m.phone.replace(/\D/g, '') === user.phone.replace(/\D/g, '')) ||
    (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
  );

  const isCurrentUserBlocked = !user.isAdmin && Boolean(
    user.isBlocked || 
    user.accessStatus === 'BLOQUEADO' || 
    currentMemberRecord?.isBlocked || 
    currentMemberRecord?.accessStatus === 'BLOQUEADO'
  );

  const isCurrentUserPending = !user.isAdmin && !isCurrentUserBlocked && Boolean(
    user.accessStatus === 'PENDENTE_LIBERACAO' ||
    currentMemberRecord?.accessStatus === 'PENDENTE_LIBERACAO'
  );

  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  const [approvalToast, setApprovalToast] = useState<string | null>(null);

  // Sincroniza em tempo real se o pastor liberou o membro
  useEffect(() => {
    if (currentMemberRecord && user.id === currentMemberRecord.id) {
      if (
        user.accessStatus !== currentMemberRecord.accessStatus || 
        user.isBlocked !== Boolean(currentMemberRecord.isBlocked)
      ) {
        setUser(prev => {
          const updated: UserProfile = {
            ...prev,
            accessStatus: currentMemberRecord.accessStatus || (currentMemberRecord.isBlocked ? 'BLOQUEADO' : (prev.isAdmin ? 'LIBERADO' : 'PENDENTE_LIBERACAO')),
            isBlocked: Boolean(currentMemberRecord.isBlocked)
          };
          safeLocalStorageSet('ad_user', updated);
          return updated;
        });
      }
    }
  }, [currentMemberRecord, user.id, user.accessStatus, user.isBlocked, user.isAdmin]);

  // Se a conta do usuário logado foi excluída permanentemente pelo pastor/admin em qualquer dispositivo, encerra a sessão imediatamente
  useEffect(() => {
    if (!user || !user.id || user.isAdmin || user.id === 'usr_admin_master' || user.email === 'bjuscelino33@gmail.com' || user.email === 'meuplantaopro@gmail.com') return;

    const checkIsDeleted = () => {
      if (isUserOrMemberDeleted(user.id, user.email, user.phone, user.name)) {
        handleLogoutUser();
      }
    };

    checkIsDeleted();
    const interval = setInterval(checkIsDeleted, 3000);
    return () => clearInterval(interval);
  }, [user.id, user.email, user.phone, user.name, user.isAdmin]);

  // Polling automático para membros aguardando liberação
  useEffect(() => {
    if (isCurrentUserPending) {
      const checkStatus = () => {
        // 1. Busca Firestore
        fetchCollectionFromFirestore<Member>('members').then(remoteMembers => {
          if (Array.isArray(remoteMembers)) {
            const found = remoteMembers.find(m => 
              (m.id && user.id && m.id === user.id) ||
              (m.phone && user.phone && m.phone.replace(/\D/g, '') === user.phone.replace(/\D/g, '')) ||
              (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
            );
            if (found && found.accessStatus === 'LIBERADO' && !found.isBlocked) {
              setUser(prev => {
                const updated: UserProfile = { ...prev, accessStatus: 'LIBERADO', isBlocked: false };
                safeLocalStorageSet('ad_user', updated);
                return updated;
              });
            }
          }
        }).catch(() => {});

        // 2. Busca Servidor
        fetch('/api/members').then(r => r.json()).then(serverMembers => {
          if (Array.isArray(serverMembers)) {
            const found = serverMembers.find((m: any) => 
              (m.id && user.id && m.id === user.id) ||
              (m.phone && user.phone && String(m.phone).replace(/\D/g, '') === user.phone.replace(/\D/g, '')) ||
              (m.email && user.email && String(m.email).toLowerCase() === user.email.toLowerCase())
            );
            if (found && found.accessStatus === 'LIBERADO' && !found.isBlocked) {
              setUser(prev => {
                const updated: UserProfile = { ...prev, accessStatus: 'LIBERADO', isBlocked: false };
                safeLocalStorageSet('ad_user', updated);
                return updated;
              });
            }
          }
        }).catch(() => {});
      };

      checkStatus();
      const interval = setInterval(checkStatus, 2500);
      return () => clearInterval(interval);
    }
  }, [isCurrentUserPending, user.id, user.phone, user.email]);

  const handleCheckApprovalStatus = async () => {
    setIsCheckingApproval(true);
    setApprovalToast(null);
    try {
      // 1. Busca Firestore
      const remoteMembers = await fetchCollectionFromFirestore<Member>('members');
      let found = Array.isArray(remoteMembers) ? remoteMembers.find(m => 
        (m.id && user.id && m.id === user.id) ||
        (m.phone && user.phone && m.phone.replace(/\D/g, '') === user.phone.replace(/\D/g, '')) ||
        (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
      ) : undefined;

      // 2. Busca Servidor se necessário
      if (!found) {
        const res = await fetch('/api/members');
        if (res.ok) {
          const sList: Member[] = await res.json();
          found = sList.find(m => 
            (m.id && user.id && m.id === user.id) ||
            (m.phone && user.phone && m.phone.replace(/\D/g, '') === user.phone.replace(/\D/g, '')) ||
            (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
          );
        }
      }

      if (found) {
        if (found.accessStatus === 'LIBERADO' && !found.isBlocked) {
          setUser(prev => {
            const updated: UserProfile = { ...prev, accessStatus: 'LIBERADO', isBlocked: false };
            safeLocalStorageSet('ad_user', updated);
            return updated;
          });
          setApprovalToast("Parabéns! Seu acesso foi liberado pelo sistema administrativo!");
        } else if (found.isBlocked || found.accessStatus === 'BLOQUEADO') {
          setUser(prev => {
            const updated: UserProfile = { ...prev, accessStatus: 'BLOQUEADO', isBlocked: true };
            safeLocalStorageSet('ad_user', updated);
            return updated;
          });
        } else {
          setApprovalToast("Sua conta ainda está aguardando liberação pelo sistema administrativo. Por favor, aguarde.");
        }
      } else {
        setApprovalToast("Status consultado. Aguarde a liberação do sistema administrativo.");
      }
    } catch (err) {
      setApprovalToast("Não foi possível verificar no momento. Tente novamente em instantes.");
    } finally {
      setIsCheckingApproval(false);
    }
  };

  // MANIPULADORES DO CHAT & PASSAGEM DE PLANTÃO
  const handleSendMessage = (msg: ChatMessage) => {
    setMessages(prev => {
      const updated = [...prev, msg];
      safeLocalStorageSet('ad_chat_messages', updated);
      return updated;
    });
    syncDocToFirestore('chat_messages', msg.id, msg).catch(() => {});
    fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    }).catch(() => {});
  };

  const handleListenMessage = (messageId: string, listenerName: string) => {
    setMessages(prev => {
      const updated = prev.map(m => {
        if (m.id === messageId) {
          const list = m.listenedBy || [];
          if (!list.includes(listenerName)) {
            const updatedMsg = { ...m, isListened: true, isRead: true, listenedBy: [...list, listenerName] };
            syncDocToFirestore('chat_messages', messageId, updatedMsg).catch(() => {});
            return updatedMsg;
          }
        }
        return m;
      });
      safeLocalStorageSet('ad_chat_messages', updated);
      return updated;
    });
  };

  const handleBatchListenMessages = (channelId: string, listenerName: string) => {
    setMessages(prev => {
      const updated = prev.map(m => {
        if (m.channelId === channelId && m.audioUrl) {
          const list = m.listenedBy || [];
          if (!list.includes(listenerName)) {
            const updatedMsg = { ...m, isListened: true, isRead: true, listenedBy: [...list, listenerName] };
            syncDocToFirestore('chat_messages', m.id, updatedMsg).catch(() => {});
            return updatedMsg;
          }
        }
        return m;
      });
      safeLocalStorageSet('ad_chat_messages', updated);
      return updated;
    });
  };

  const handleDeleteMessageForMe = (messageId: string) => {
    setMessages(prev => {
      const updated = prev.map(m => m.id === messageId ? { ...m, deletedForSelf: true } : m);
      safeLocalStorageSet('ad_chat_messages', updated);
      return updated;
    });
  };

  const handleDeleteMessageForEveryone = (messageId: string) => {
    markMessageDeleted(messageId);
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== messageId);
      safeLocalStorageSet('ad_chat_messages', updated);
      return updated;
    });
    deleteDocFromFirestore('chat_messages', messageId).catch(() => {});
    fetch(`/api/chat/messages/${encodeURIComponent(messageId)}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleClearChannel = (channelId: string) => {
    const toDelete = messages.filter(m => m.channelId === channelId);
    toDelete.forEach(m => {
      markMessageDeleted(m.id);
      deleteDocFromFirestore('chat_messages', m.id).catch(() => {});
    });
    setMessages(prev => {
      const updated = prev.filter(m => m.channelId !== channelId);
      safeLocalStorageSet('ad_chat_messages', updated);
      return updated;
    });
  };

  const handleClearAllMessages = () => {
    messages.forEach(m => {
      markMessageDeleted(m.id);
      deleteDocFromFirestore('chat_messages', m.id).catch(() => {});
    });
    setMessages([]);
    safeLocalStorageSet('ad_chat_messages', []);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-[#F8FAFC] text-slate-900'} flex flex-col font-sans transition-colors duration-200`}>
      {/* CABEÇALHO ASSEMBLEIA DE DEUS */}
      <HeaderNav
        user={user}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenShare={() => setShowShareModal(true)}
        onOpenAdmin={() => {
          setIsPastorAuth(true);
          setCurrentView('pastor');
        }}
        onOpenAuth={() => setShowAuthModal(true)}
        onNavigateHome={() => setCurrentView('home')}
      />

      {/* TELA DE CONTA CRIADA AGUARDANDO LIBERAÇÃO */}
      {isCurrentUserPending && currentView !== 'pastor' && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border-2 border-amber-500/30 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl animate-slide-up">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-amber-600/10">
              <Clock size={34} className="animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-3 py-1 rounded-full inline-block">
                Conta Criada com Sucesso
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Aguarde a Liberação pelo Sistema Administrativo
              </h2>
              <p className="text-xs font-bold text-slate-600 dark:text-zinc-300 leading-relaxed">
                Olá, <strong className="text-slate-900 dark:text-white">{user.name}</strong>! Sua conta foi criada com sucesso. Aguarde a liberação pelo sistema administrativo para ter acesso completo a todos os recursos da <strong className="text-slate-900 dark:text-white">{churchInfo.name}</strong>.
              </p>
            </div>

            {approvalToast && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs font-bold text-amber-900 dark:text-amber-200 animate-fade-in">
                {approvalToast}
              </div>
            )}

            <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl text-[11px] font-medium text-slate-500 dark:text-zinc-400 leading-relaxed border border-slate-100 dark:border-zinc-800">
              Assim que o pastor ou administrador aprovar o seu cadastro, seu acesso será liberado automaticamente. Caso precise agilizar, entre em contato pelo WhatsApp: <strong className="text-slate-900 dark:text-white font-black">(98) 97008-4240</strong>.
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleCheckApprovalStatus}
                disabled={isCheckingApproval}
                className="w-full bg-app-purple hover:bg-purple-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-app-purple/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={isCheckingApproval ? "animate-spin" : ""} />
                {isCheckingApproval ? "Verificando Liberação..." : "Verificar Liberação Agora"}
              </button>

              <a
                href="https://wa.me/5598970084240"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageCircle size={18} className="shrink-0" />
                  <span>Entrar em Contato com um Atendente do Sistema Administrativo</span>
                </div>
                <span className="bg-emerald-800/60 text-emerald-100 px-3 py-0.5 rounded-lg text-xs font-mono font-bold tracking-normal">
                  WhatsApp: (98) 97008-4240
                </span>
              </a>

              <button
                type="button"
                onClick={handleLogoutUser}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-black py-3.5 rounded-2xl text-xs uppercase flex items-center justify-center gap-2 transition-all"
              >
                <LogOut size={16} /> Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TELA DE BLOQUEIO DO SISTEMA ADMINISTRATIVO */}
      {isCurrentUserBlocked && currentView !== 'pastor' && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border-2 border-rose-500/30 rounded-[2.5rem] p-5 sm:p-7 max-w-xl w-full text-center space-y-5 shadow-2xl animate-slide-up my-auto max-h-[94vh] overflow-y-auto">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-rose-600/10">
              <ShieldAlert size={34} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full inline-block">
                Acesso Temporariamente Suspenso
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Conta Restrita pelo Sistema Administrativo
              </h2>
              <p className="text-xs font-bold text-slate-600 dark:text-zinc-300 leading-relaxed">
                Olá, <strong className="text-slate-900 dark:text-white">{user.name}</strong>. Seu acesso ao aplicativo foi temporariamente suspenso. Para regularizar seu cadastro e liberar seu acesso, efetue o pagamento abaixo ou fale com o setor administrativo.
              </p>
            </div>

            {currentMemberRecord?.blockedReason && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-left">
                <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 block mb-0.5">Observação Administrativa:</span>
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200 italic">
                  "{currentMemberRecord.blockedReason}"
                </p>
              </div>
            )}

            {/* ÁREA DE PAGAMENTO DO ACESSO / QR CODE PIX */}
            <div className="text-left">
              <AccessPaymentCard
                user={user}
                churchInfo={churchInfo}
                onOpenAuth={() => setShowAuthModal(true)}
              />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl text-[11px] font-medium text-slate-500 dark:text-zinc-400 leading-relaxed border border-slate-100 dark:border-zinc-800 text-center">
              Após efetuar o pagamento pelo QR Code ou Chave Pix acima, clique no botão para enviar o comprovante via WhatsApp para que seu acesso seja liberado imediatamente pelo setor administrativo.
            </div>

            <div className="space-y-2.5 pt-1">
              <a
                href="https://wa.me/5598970084240"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageCircle size={18} className="shrink-0" />
                  <span>Entrar em Contato com um Atendente do Sistema Administrativo</span>
                </div>
                <span className="bg-emerald-800/60 text-emerald-100 px-3 py-0.5 rounded-lg text-xs font-mono font-bold tracking-normal">
                  WhatsApp: (98) 97008-4240
                </span>
              </a>

              <button
                type="button"
                onClick={handleLogoutUser}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-black py-3.5 rounded-2xl text-xs uppercase flex items-center justify-center gap-2 transition-all"
              >
                <LogOut size={16} /> Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 pb-24">
        {currentView === 'home' && (
          <HomeView
            churchInfo={churchInfo}
            user={user}
            onOpenAuth={() => setShowAuthModal(true)}
            onNavigate={(target) => {
              if (['cults', 'meetings', 'festivals', 'campaigns'].includes(target)) {
                navigateToSchedule(target);
              } else {
                setCurrentView(target);
              }
            }}
          />
        )}

        {currentView === 'videos' && (
          <VideosView
            items={videos}
            setItems={setVideos}
            onAddVideo={handleAddVideo}
            onDeleteVideo={handleDeleteVideo}
            role={userRole}
            onBack={() => setCurrentView('home')}
          />
        )}

        {currentView === 'gallery' && (
          <GalleryView
            items={gallery}
            setItems={setGallery}
            role={userRole}
            onBack={() => setCurrentView('home')}
          />
        )}

        {currentView === 'bible_search' && (
          <BibleSearchView
            onBack={() => setCurrentView('home')}
            onShareToMural={(verseText, reference) => {
              const newVerse: BibleVerse = {
                id: `v_${Date.now()}`,
                memberName: user?.name || 'Membro da Igreja',
                verse: verseText,
                reference: reference,
                timestamp: Date.now()
              };
              setVerses(prev => [newVerse, ...prev]);
            }}
          />
        )}

        {(currentView === 'community' || currentView === 'prayer') && (
          <CommunityView
            verses={verses}
            setVerses={setVerses}
            initialTab={currentView === 'prayer' ? 'mural' : 'chat'}
            onBack={() => setCurrentView('home')}
          />
        )}

        {(currentView === 'hymns' || currentView === 'radios') && (
          <HymnsView
            user={user}
          />
        )}

        {currentView === 'schedule' && (
          <ScheduleView
            view={scheduleSubView}
            role={userRole}
            cults={cults}
            setCults={setCults}
            meetings={meetings}
            setMeetings={setMeetings}
            pastoralVisits={pastoralVisits}
            setPastoralVisits={setPastoralVisits}
            festivals={festivals}
            setFestivals={setFestivals}
            campaigns={campaigns}
            setCampaigns={setCampaigns}
            onBack={() => setCurrentView('home')}
          />
        )}

        {currentView === 'pastor' && (
          <PastorArea
            isAuthenticated={isPastorAuth}
            onLogin={handlePastorLogin}
            churchInfo={churchInfo}
            setChurchInfo={setChurchInfo}
            currentPassword={pastorPassword}
            setPastorPassword={(pass) => {
              setPastorPassword(pass);
              localStorage.setItem('ad_pastor_pin', pass);
            }}
            user={user}
            members={members}
            setMembers={setMembers}
            pastoralVisits={pastoralVisits}
            setPastoralVisits={setPastoralVisits}
            cults={cults}
            setCults={setCults}
            meetings={meetings}
            setMeetings={setMeetings}
            festivals={festivals}
            setFestivals={setFestivals}
            campaigns={campaigns}
            setCampaigns={setCampaigns}
            currentMemberId={currentMemberId}
            setCurrentMemberId={setCurrentMemberId}
            onNavigate={(view) => {
              if (view === 'members') setCurrentView('pastor');
              else setCurrentView(view);
            }}
            onBack={() => setCurrentView('home')}
            onRegisterMember={(m) => {
              const newM: Member = {
                id: `m_${Date.now()}`,
                name: m.name || '',
                email: m.email || '',
                phone: m.phone || '',
                role: m.role || 'MEMBRO',
                accessStatus: 'LIBERADO',
                isBlocked: false,
                createdAt: new Date().toISOString()
              };
              handleRegisterMember(newM);
            }}
            onEditMember={(id, updated) => {
              setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updated } : m));
            }}
            onDeleteMember={async (id) => {
              const target = members.find(m => m.id === id);
              await markMemberOrUserDeleted(id, target?.email, target?.phone, target?.name);

              setMembers(prev => {
                const updated = prev.filter(m => m.id !== id);
                safeLocalStorageSet('ad_members', updated);
                return updated;
              });

              // Deleta da nuvem Firestore e do Servidor
              deleteDocFromFirestore('members', id).catch(() => {});
              deleteDocFromFirestore('users', id).catch(() => {});
              fetch(`/api/members/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
              fetch(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
              fetch('/api/admin/delete-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, memberId: id, email: target?.email, phone: target?.phone, name: target?.name })
              }).catch(() => {});

              // Se a conta for do próprio usuário ativo, encerra a sessão
              if (user.id === id || (target?.phone && user.phone === target.phone) || (target?.email && user.email === target.email)) {
                handleLogoutUser();
              }
            }}
            onToggleStatus={(id) => {
              setMembers(prev => prev.map(m => {
                if (m.id === id) {
                  return { ...m, isBlocked: !m.isBlocked };
                }
                return m;
              }));
            }}
            members={members}
            setMembers={setMembers}
          />
        )}
      </main>

      {/* MODAL DE COMPARTILHAMENTO */}
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          appName="Assembleia de Deus Nacional"
          appUrl={window.location.origin}
        />
      )}

      {/* MODAL DE CADASTRO/LOGIN DO MEMBRO */}
      {showAuthModal && (
        <MemberAuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          members={members}
          onRegisterMember={handleRegisterMember}
          onLoginMember={handleLoginMember}
          churchName={churchInfo.name}
          pastorName={churchInfo.pastorName}
        />
      )}

      {/* BARRA INFERIOR DE NAVEGAÇÃO */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around py-2 px-3">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              currentView === 'home'
                ? 'text-app-purple dark:text-purple-400 font-black scale-105'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <Home size={20} />
            <span className="text-[10px] uppercase font-bold tracking-tight">Início</span>
          </button>

          <button
            onClick={() => setCurrentView('schedule')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              currentView === 'schedule'
                ? 'text-app-purple dark:text-purple-400 font-black scale-105'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <Calendar size={20} />
            <span className="text-[10px] uppercase font-bold tracking-tight">Agenda</span>
          </button>

          <button
            onClick={() => setCurrentView('videos')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              currentView === 'videos'
                ? 'text-app-purple dark:text-purple-400 font-black scale-105'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <Film size={20} />
            <span className="text-[10px] uppercase font-bold tracking-tight">Vídeos</span>
          </button>

          <button
            onClick={() => setCurrentView('gallery')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              currentView === 'gallery'
                ? 'text-app-purple dark:text-purple-400 font-black scale-105'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <ImageIcon size={20} />
            <span className="text-[10px] uppercase font-bold tracking-tight">Galeria</span>
          </button>

          <button
            onClick={() => setCurrentView('community')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              currentView === 'community'
                ? 'text-app-purple dark:text-purple-400 font-black scale-105'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <MessageCircle size={20} />
            <span className="text-[10px] uppercase font-bold tracking-tight">Comunidade</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
